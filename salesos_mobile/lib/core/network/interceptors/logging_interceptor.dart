import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

/// Logging interceptor for debugging API calls
class LoggingInterceptor extends Interceptor {
  final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 5,
      lineLength: 80,
      colors: true,
      printEmojis: true,
    ),
  );

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final buffer = StringBuffer();
    buffer.writeln('┌──────────────────────────────────────────────────────────────');
    buffer.writeln('│ REQUEST');
    buffer.writeln('├──────────────────────────────────────────────────────────────');
    buffer.writeln('│ ${options.method} ${options.uri}');

    if (options.headers.isNotEmpty) {
      buffer.writeln('│ Headers:');
      options.headers.forEach((key, value) {
        if (key.toLowerCase() != 'authorization') {
          buffer.writeln('│   $key: $value');
        } else {
          buffer.writeln('│   $key: [REDACTED]');
        }
      });
    }

    if (options.queryParameters.isNotEmpty) {
      buffer.writeln('│ Query: ${options.queryParameters}');
    }

    if (options.data != null) {
      buffer.writeln('│ Body:');
      final prettyData = _prettyJson(options.data);
      for (final line in prettyData.split('\n')) {
        buffer.writeln('│   $line');
      }
    }

    buffer.writeln('└──────────────────────────────────────────────────────────────');

    _logger.d(buffer.toString());
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final buffer = StringBuffer();
    buffer.writeln('┌──────────────────────────────────────────────────────────────');
    buffer.writeln('│ RESPONSE');
    buffer.writeln('├──────────────────────────────────────────────────────────────');
    buffer.writeln('│ ${response.statusCode} ${response.requestOptions.method} ${response.requestOptions.uri}');
    buffer.writeln('│ Duration: ${response.requestOptions.extra['start_time'] != null ? DateTime.now().difference(response.requestOptions.extra['start_time'] as DateTime).inMilliseconds : 'N/A'}ms');

    if (response.data != null) {
      buffer.writeln('│ Data:');
      final prettyData = _prettyJson(response.data);
      final lines = prettyData.split('\n');
      // Limit output for large responses
      final maxLines = 50;
      for (var i = 0; i < lines.length && i < maxLines; i++) {
        buffer.writeln('│   ${lines[i]}');
      }
      if (lines.length > maxLines) {
        buffer.writeln('│   ... (${lines.length - maxLines} more lines)');
      }
    }

    buffer.writeln('└──────────────────────────────────────────────────────────────');

    _logger.i(buffer.toString());
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final buffer = StringBuffer();
    buffer.writeln('┌──────────────────────────────────────────────────────────────');
    buffer.writeln('│ ERROR');
    buffer.writeln('├──────────────────────────────────────────────────────────────');
    buffer.writeln('│ ${err.type}');
    buffer.writeln('│ ${err.requestOptions.method} ${err.requestOptions.uri}');

    if (err.response != null) {
      buffer.writeln('│ Status: ${err.response?.statusCode}');
      if (err.response?.data != null) {
        buffer.writeln('│ Response:');
        final prettyData = _prettyJson(err.response?.data);
        for (final line in prettyData.split('\n')) {
          buffer.writeln('│   $line');
        }
      }
    }

    buffer.writeln('│ Message: ${err.message}');
    buffer.writeln('└──────────────────────────────────────────────────────────────');

    _logger.e(buffer.toString());
    handler.next(err);
  }

  String _prettyJson(dynamic data) {
    try {
      if (data is String) {
        return data;
      }
      const encoder = JsonEncoder.withIndent('  ');
      return encoder.convert(data);
    } catch (e) {
      return data.toString();
    }
  }
}
