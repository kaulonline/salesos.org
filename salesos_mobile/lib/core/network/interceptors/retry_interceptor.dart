import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

/// Configuration for retry behavior with exponential backoff
class RetryConfig {
  /// Maximum number of retry attempts (default: 3)
  final int maxRetries;

  /// Initial delay for exponential backoff in milliseconds (default: 1000ms = 1s)
  final int initialDelayMs;

  /// Maximum delay cap in milliseconds (default: 30000ms = 30s)
  final int maxDelayMs;

  /// Exponential backoff factor (default: 2)
  final double backoffFactor;

  /// Jitter factor (0.0 to 1.0) to randomize delays and prevent thundering herd
  /// A value of 0.25 means +/- 25% randomization on the calculated delay
  final double jitterFactor;

  /// HTTP methods that should be retried (idempotent methods by default)
  final Set<String> retryableMethods;

  /// Status codes that should trigger a retry (5xx server errors by default)
  /// Note: 4xx client errors are NOT retried (except 408 Request Timeout and 429 Rate Limit)
  final Set<int> retryableStatusCodes;

  const RetryConfig({
    this.maxRetries = 3,
    this.initialDelayMs = 1000,
    this.maxDelayMs = 30000,
    this.backoffFactor = 2.0,
    this.jitterFactor = 0.25,
    this.retryableMethods = const {'GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'},
    this.retryableStatusCodes = const {408, 429, 500, 502, 503, 504},
  });

  /// Default configuration with production-ready settings:
  /// - 3 max retries
  /// - 1 second initial delay
  /// - 30 second max delay
  /// - Factor of 2 for exponential backoff
  /// - 25% jitter to prevent thundering herd
  static const RetryConfig defaultConfig = RetryConfig();

  /// Creates a copy of this config with the specified overrides
  RetryConfig copyWith({
    int? maxRetries,
    int? initialDelayMs,
    int? maxDelayMs,
    double? backoffFactor,
    double? jitterFactor,
    Set<String>? retryableMethods,
    Set<int>? retryableStatusCodes,
  }) {
    return RetryConfig(
      maxRetries: maxRetries ?? this.maxRetries,
      initialDelayMs: initialDelayMs ?? this.initialDelayMs,
      maxDelayMs: maxDelayMs ?? this.maxDelayMs,
      backoffFactor: backoffFactor ?? this.backoffFactor,
      jitterFactor: jitterFactor ?? this.jitterFactor,
      retryableMethods: retryableMethods ?? this.retryableMethods,
      retryableStatusCodes: retryableStatusCodes ?? this.retryableStatusCodes,
    );
  }
}

/// Key used to track retry count in request options extra data
const String _retryCountKey = '_retryCount';

/// Key used to track total retry time in request options extra data
const String _retryStartTimeKey = '_retryStartTime';

/// Retry interceptor with exponential backoff and jitter
///
/// This interceptor automatically retries failed requests based on configurable
/// rules. It implements exponential backoff with jitter to prevent thundering
/// herd problems when multiple clients retry simultaneously.
///
/// Default behavior:
/// - Max 3 retry attempts
/// - Initial delay of 1 second, doubling each retry (1s, 2s, 4s)
/// - Maximum delay capped at 30 seconds
/// - 25% jitter added to prevent thundering herd
/// - Only retries on network errors and 5xx server errors
/// - Does NOT retry on 4xx client errors (except 408, 429)
class RetryInterceptor extends Interceptor {
  final Dio _dio;
  final RetryConfig config;
  final Random _random = Random();
  final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 0,
      lineLength: 80,
      colors: true,
      printEmojis: false,
      noBoxingByDefault: true,
    ),
  );

  RetryInterceptor(
    this._dio, {
    this.config = RetryConfig.defaultConfig,
  });

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final requestOptions = err.requestOptions;

    // Get current retry count from request options
    final retryCount = requestOptions.extra[_retryCountKey] as int? ?? 0;

    // Check if we should retry this request
    if (!_shouldRetry(err, retryCount)) {
      // Log final failure if we exhausted retries
      if (retryCount > 0) {
        _logRetryExhausted(requestOptions, retryCount, err);
      }
      return handler.next(err);
    }

    // Track when retries started for total time logging
    if (retryCount == 0) {
      requestOptions.extra[_retryStartTimeKey] = DateTime.now();
    }

    // Calculate delay with exponential backoff and jitter
    final delay = _calculateDelay(err, retryCount);

    // Log retry attempt
    _logRetryAttempt(
      requestOptions: requestOptions,
      retryCount: retryCount,
      delay: delay,
      error: err,
    );

    // Wait before retrying
    await Future.delayed(delay);

    // Update retry count in request options
    requestOptions.extra[_retryCountKey] = retryCount + 1;

    try {
      // Retry the request
      final response = await _dio.fetch(requestOptions);

      // Log successful retry
      _logRetrySuccess(requestOptions, retryCount + 1);

      return handler.resolve(response);
    } on DioException catch (e) {
      // If retry also fails, pass to error handler (which may trigger another retry)
      return handler.reject(e);
    }
  }

  /// Determines if the request should be retried
  bool _shouldRetry(DioException err, int retryCount) {
    // Check max retries
    if (retryCount >= config.maxRetries) {
      return false;
    }

    // Check if request was cancelled
    if (err.type == DioExceptionType.cancel) {
      return false;
    }

    // Check if method is retryable (skip non-idempotent by default)
    final method = err.requestOptions.method.toUpperCase();
    if (!config.retryableMethods.contains(method)) {
      // Allow POST retry only for specific network errors
      if (method == 'POST' && !_isNetworkError(err)) {
        return false;
      }
    }

    // Check if error type is retryable
    return _isRetryableError(err);
  }

  /// Checks if the error is a network-level error
  bool _isNetworkError(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError;
  }

  /// Checks if the error type allows retrying
  bool _isRetryableError(DioException err) {
    // Network errors are always retryable
    if (_isNetworkError(err)) {
      return true;
    }

    // Check response status code
    if (err.type == DioExceptionType.badResponse) {
      final statusCode = err.response?.statusCode;
      if (statusCode == null) {
        return false;
      }

      // Skip 4xx errors except 429 (rate limiting) and 408 (request timeout)
      if (statusCode >= 400 && statusCode < 500) {
        return statusCode == 429 || statusCode == 408;
      }

      // Retry 5xx server errors
      return config.retryableStatusCodes.contains(statusCode);
    }

    return false;
  }

  /// Calculates the delay before the next retry attempt using exponential backoff with jitter
  ///
  /// The formula is: delay = min(initialDelay * backoffFactor^retryCount, maxDelay) +/- jitter
  ///
  /// Example with defaults (1s initial, factor 2, max 30s):
  /// - Retry 1: ~1s (1000ms +/- jitter)
  /// - Retry 2: ~2s (2000ms +/- jitter)
  /// - Retry 3: ~4s (4000ms +/- jitter)
  Duration _calculateDelay(DioException err, int retryCount) {
    // Check for Retry-After header (429 rate limiting)
    if (err.response?.statusCode == 429) {
      final retryAfter = _parseRetryAfterHeader(err.response);
      if (retryAfter != null) {
        return retryAfter;
      }
    }

    // Exponential backoff: initialDelay * backoffFactor^retryCount
    final exponentialDelay =
        config.initialDelayMs * pow(config.backoffFactor, retryCount);

    // Apply max delay cap
    final cappedDelay = min(exponentialDelay.toInt(), config.maxDelayMs);

    // Add jitter to prevent thundering herd
    final jitter = _calculateJitter(cappedDelay);

    return Duration(milliseconds: cappedDelay + jitter);
  }

  /// Parses the Retry-After header from a 429 response
  Duration? _parseRetryAfterHeader(Response? response) {
    if (response == null) return null;

    final retryAfterHeader = response.headers.value('retry-after');
    if (retryAfterHeader == null) return null;

    // Try to parse as seconds (integer)
    final seconds = int.tryParse(retryAfterHeader);
    if (seconds != null) {
      // Cap at max delay for safety
      final cappedSeconds = min(seconds * 1000, config.maxDelayMs);
      return Duration(milliseconds: cappedSeconds);
    }

    // Try to parse as HTTP date
    try {
      final date = HttpDate.parse(retryAfterHeader);
      final delay = date.difference(DateTime.now());
      if (delay.isNegative) {
        return Duration(milliseconds: config.initialDelayMs);
      }
      // Cap at max delay
      final cappedMs = min(delay.inMilliseconds, config.maxDelayMs);
      return Duration(milliseconds: cappedMs);
    } catch (_) {
      return null;
    }
  }

  /// Calculates random jitter to add to the delay
  ///
  /// Jitter helps prevent the "thundering herd" problem where many clients
  /// retry at the exact same time after a server failure.
  int _calculateJitter(int delay) {
    if (config.jitterFactor <= 0) return 0;

    final maxJitter = (delay * config.jitterFactor).toInt();
    // Random jitter between -maxJitter and +maxJitter
    return _random.nextInt(maxJitter * 2 + 1) - maxJitter;
  }

  /// Logs a retry attempt with relevant context
  void _logRetryAttempt({
    required RequestOptions requestOptions,
    required int retryCount,
    required Duration delay,
    required DioException error,
  }) {
    final errorType = _getErrorDescription(error);
    _logger.w(
      '[RetryInterceptor] Retry ${retryCount + 1}/${config.maxRetries} '
      'for ${requestOptions.method} ${requestOptions.path} '
      'after ${delay.inMilliseconds}ms delay. '
      'Reason: $errorType',
    );
  }

  /// Logs when a retry succeeds after previous failures
  void _logRetrySuccess(RequestOptions requestOptions, int attemptNumber) {
    final startTime = requestOptions.extra[_retryStartTimeKey] as DateTime?;
    final totalTime = startTime != null
        ? DateTime.now().difference(startTime).inMilliseconds
        : 0;

    _logger.i(
      '[RetryInterceptor] Request succeeded on attempt $attemptNumber '
      'for ${requestOptions.method} ${requestOptions.path} '
      '(total retry time: ${totalTime}ms)',
    );
  }

  /// Logs when all retry attempts have been exhausted
  void _logRetryExhausted(
    RequestOptions requestOptions,
    int retryCount,
    DioException error,
  ) {
    final startTime = requestOptions.extra[_retryStartTimeKey] as DateTime?;
    final totalTime = startTime != null
        ? DateTime.now().difference(startTime).inMilliseconds
        : 0;
    final errorType = _getErrorDescription(error);

    _logger.e(
      '[RetryInterceptor] All $retryCount retries exhausted '
      'for ${requestOptions.method} ${requestOptions.path} '
      '(total retry time: ${totalTime}ms). '
      'Final error: $errorType',
    );
  }

  /// Returns a human-readable description of the error
  String _getErrorDescription(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        return 'Connection timeout';
      case DioExceptionType.sendTimeout:
        return 'Send timeout';
      case DioExceptionType.receiveTimeout:
        return 'Receive timeout';
      case DioExceptionType.connectionError:
        return 'Connection error';
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        return 'HTTP $statusCode';
      case DioExceptionType.cancel:
        return 'Request cancelled';
      case DioExceptionType.badCertificate:
        return 'Bad certificate';
      case DioExceptionType.unknown:
        return error.message ?? 'Unknown error';
    }
  }

  /// Returns the current retry count for a request (useful for external logging)
  static int getRetryCount(RequestOptions options) {
    return options.extra[_retryCountKey] as int? ?? 0;
  }
}

/// HTTP Date parser helper for Retry-After header parsing
class HttpDate {
  /// Parses an HTTP date string into a DateTime
  /// Supports ISO 8601 format
  static DateTime parse(String date) {
    return DateTime.parse(date);
  }
}
