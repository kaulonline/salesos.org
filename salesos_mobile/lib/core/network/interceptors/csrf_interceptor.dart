import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// CSRF Protection interceptor for SalesOS backend
///
/// The SalesOS backend requires an X-CSRF-Token header on all
/// state-changing requests (POST, PUT, PATCH, DELETE).
/// The CSRF token is returned in the login response and can be
/// refreshed via GET /auth/csrf-token.
class CsrfInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;
  final Dio _dio;

  static const String _csrfTokenKey = 'csrf_token';

  /// HTTP methods that require CSRF token
  static const _stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  /// Paths exempt from CSRF (auth endpoints handled before session exists)
  static const _exemptPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/magic-link',
    '/auth/refresh',
    '/health',
  ];

  CsrfInterceptor(this._storage, this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final method = options.method.toUpperCase();

    // Only add CSRF token for state-changing methods
    if (!_stateChangingMethods.contains(method)) {
      return handler.next(options);
    }

    // Skip exempt paths
    if (_isExemptPath(options.path)) {
      return handler.next(options);
    }

    // Add CSRF token header
    final csrfToken = await _storage.read(key: _csrfTokenKey);
    if (csrfToken != null) {
      options.headers['X-CSRF-Token'] = csrfToken;
    }

    return handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // If we get a 403 with "CSRF" in the message, try refreshing the token
    if (err.response?.statusCode == 403) {
      final responseData = err.response?.data;
      final message = responseData is Map ? responseData['message'] ?? '' : '';

      if (message.toString().toLowerCase().contains('csrf')) {
        // Try to refresh CSRF token
        final refreshed = await _refreshCsrfToken();

        if (refreshed) {
          // Retry the original request with new CSRF token
          final csrfToken = await _storage.read(key: _csrfTokenKey);
          final options = err.requestOptions;
          options.headers['X-CSRF-Token'] = csrfToken;

          try {
            final response = await _dio.fetch(options);
            return handler.resolve(response);
          } catch (_) {
            // Retry failed, pass through original error
          }
        }
      }
    }

    return handler.next(err);
  }

  bool _isExemptPath(String path) {
    return _exemptPaths.any(
      (p) => path == p || path.startsWith('$p?') || path.startsWith('$p/'),
    );
  }

  Future<bool> _refreshCsrfToken() async {
    try {
      final response = await _dio.get('/auth/csrf-token');

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          final newToken = data['csrf_token'] as String?;
          if (newToken != null) {
            await _storage.write(key: _csrfTokenKey, value: newToken);
            return true;
          }
        }
      }
    } catch (_) {
      // CSRF refresh failed
    }
    return false;
  }

  /// Store a CSRF token (called after login)
  static Future<void> storeCsrfToken(
    FlutterSecureStorage storage,
    String token,
  ) async {
    await storage.write(key: _csrfTokenKey, value: token);
  }

  /// Clear stored CSRF token (called on logout)
  static Future<void> clearCsrfToken(FlutterSecureStorage storage) async {
    await storage.delete(key: _csrfTokenKey);
  }
}
