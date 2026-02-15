/// Error category for classification
enum ErrorCategory {
  /// Network connectivity issues (retryable)
  network,

  /// Server-side errors (retryable)
  server,

  /// Client-side errors (not retryable)
  client,

  /// Authentication/authorization errors (not retryable)
  auth,

  /// Rate limiting (retryable after delay)
  rateLimit,

  /// Validation errors (not retryable)
  validation,

  /// Unknown errors
  unknown,
}

/// Base exception class for app errors
abstract class AppException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  const AppException({
    required this.message,
    this.code,
    this.originalError,
  });

  /// Returns the error category for retry logic classification
  ErrorCategory get category;

  /// Whether this error type can be retried
  bool get isRetryable => category == ErrorCategory.network ||
      category == ErrorCategory.server ||
      category == ErrorCategory.rateLimit;

  /// Whether this is a transient error that may resolve on retry
  bool get isTransient => category == ErrorCategory.network ||
      category == ErrorCategory.server;

  @override
  String toString() => 'AppException: $message (code: $code)';
}

/// Network related exceptions (retryable)
class NetworkException extends AppException {
  /// Whether this is a timeout error
  final bool isTimeout;

  /// Whether this is a connection error
  final bool isConnectionError;

  const NetworkException({
    required super.message,
    super.code,
    super.originalError,
    this.isTimeout = false,
    this.isConnectionError = false,
  });

  @override
  ErrorCategory get category => ErrorCategory.network;
}

/// Authentication related exceptions (not retryable)
class AuthException extends AppException {
  const AuthException({
    required super.message,
    super.code,
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.auth;
}

/// Validation related exceptions (not retryable)
class ValidationException extends AppException {
  final Map<String, dynamic>? errors;

  const ValidationException({
    required super.message,
    super.code,
    this.errors,
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.validation;

  String? getFieldError(String field) {
    if (errors == null) return null;
    final fieldErrors = errors![field];
    if (fieldErrors is List && fieldErrors.isNotEmpty) {
      return fieldErrors.first.toString();
    }
    if (fieldErrors is String) {
      return fieldErrors;
    }
    return null;
  }
}

/// Resource not found exception (not retryable)
class NotFoundException extends AppException {
  const NotFoundException({
    required super.message,
    super.code,
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.client;
}

/// Conflict exception (e.g., duplicate resource) (not retryable)
class ConflictException extends AppException {
  const ConflictException({
    required super.message,
    super.code,
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.client;
}

/// Rate limit exceeded exception (retryable after delay)
class RateLimitException extends AppException {
  final Duration? retryAfter;

  const RateLimitException({
    required super.message,
    super.code,
    this.retryAfter,
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.rateLimit;

  @override
  bool get isRetryable => true;
}

/// Server error exception (retryable)
class ServerException extends AppException {
  /// HTTP status code (5xx)
  final int? statusCode;

  const ServerException({
    required super.message,
    super.code,
    super.originalError,
    this.statusCode,
  });

  @override
  ErrorCategory get category => ErrorCategory.server;
}

/// Cache related exceptions (not retryable)
class CacheException extends AppException {
  const CacheException({
    required super.message,
    super.code,
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.client;
}

/// Local storage exceptions (not retryable)
class StorageException extends AppException {
  const StorageException({
    required super.message,
    super.code,
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.client;
}

/// Offline mode exceptions (retryable when back online)
class OfflineException extends AppException {
  const OfflineException({
    super.message = 'You are currently offline. This action will be synced when you reconnect.',
    super.code = 'OFFLINE',
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.network;
}

/// Request timeout exception (retryable)
class TimeoutException extends AppException {
  /// The type of timeout (connection, send, receive)
  final String timeoutType;

  const TimeoutException({
    required super.message,
    super.code = 'TIMEOUT',
    super.originalError,
    this.timeoutType = 'unknown',
  });

  @override
  ErrorCategory get category => ErrorCategory.network;
}

/// Request cancelled exception (not retryable)
class CancelledException extends AppException {
  const CancelledException({
    super.message = 'Request was cancelled',
    super.code = 'CANCELLED',
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.client;

  @override
  bool get isRetryable => false;
}

/// Bad request exception (not retryable - 400 errors)
class BadRequestException extends AppException {
  const BadRequestException({
    required super.message,
    super.code = 'BAD_REQUEST',
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.client;
}

/// Forbidden exception (not retryable - 403 errors)
class ForbiddenException extends AppException {
  const ForbiddenException({
    required super.message,
    super.code = 'FORBIDDEN',
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.auth;
}

/// Unknown/unexpected exception
class UnknownException extends AppException {
  const UnknownException({
    super.message = 'An unexpected error occurred',
    super.code = 'UNKNOWN',
    super.originalError,
  });

  @override
  ErrorCategory get category => ErrorCategory.unknown;
}
