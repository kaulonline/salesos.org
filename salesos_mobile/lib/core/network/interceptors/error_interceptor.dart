import 'package:dio/dio.dart';
import '../../utils/exceptions.dart';

/// Error handling interceptor
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final exception = _handleError(err);
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        error: exception,
        response: err.response,
        type: err.type,
      ),
    );
  }

  AppException _handleError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return NetworkException(
          message: 'Connection timed out. Please check your internet connection.',
          code: 'TIMEOUT',
        );

      case DioExceptionType.connectionError:
        return NetworkException(
          message: 'Unable to connect. Please check your internet connection.',
          code: 'CONNECTION_ERROR',
        );

      case DioExceptionType.badResponse:
        return _handleResponseError(error.response);

      case DioExceptionType.cancel:
        return NetworkException(
          message: 'Request cancelled',
          code: 'CANCELLED',
        );

      default:
        return NetworkException(
          message: 'An unexpected error occurred',
          code: 'UNKNOWN',
        );
    }
  }

  AppException _handleResponseError(Response? response) {
    final statusCode = response?.statusCode ?? 0;
    final data = response?.data;

    String message = 'An error occurred';
    String? code;

    if (data is Map<String, dynamic>) {
      message = data['message'] as String? ?? message;
      code = data['error'] as String?;
    }

    switch (statusCode) {
      case 400:
        return ValidationException(
          message: message,
          code: code ?? 'BAD_REQUEST',
          errors: data is Map<String, dynamic>
              ? data['errors'] as Map<String, dynamic>?
              : null,
        );

      case 401:
        return AuthException(
          message: 'Please login to continue',
          code: 'UNAUTHORIZED',
        );

      case 403:
        return AuthException(
          message: 'You do not have permission to access this resource',
          code: 'FORBIDDEN',
        );

      case 404:
        return NotFoundException(
          message: message,
          code: code ?? 'NOT_FOUND',
        );

      case 409:
        return ConflictException(
          message: message,
          code: code ?? 'CONFLICT',
        );

      case 422:
        return ValidationException(
          message: message,
          code: code ?? 'UNPROCESSABLE_ENTITY',
          errors: data is Map<String, dynamic>
              ? data['errors'] as Map<String, dynamic>?
              : null,
        );

      case 429:
        return RateLimitException(
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return ServerException(
          message: 'Server error. Please try again later.',
          code: 'SERVER_ERROR',
        );

      default:
        return NetworkException(
          message: message,
          code: 'HTTP_$statusCode',
        );
    }
  }
}
