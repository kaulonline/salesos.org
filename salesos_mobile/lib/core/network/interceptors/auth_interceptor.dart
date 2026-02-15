import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Authentication interceptor for adding JWT tokens to requests
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;
  final Dio _dio;

  static const String _tokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  AuthInterceptor(this._storage, this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth for public endpoints
    if (_isPublicEndpoint(options.path)) {
      return handler.next(options);
    }

    // Get stored token
    final token = await _storage.read(key: _tokenKey);

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    return handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Handle 401 Unauthorized - attempt token refresh
    if (err.response?.statusCode == 401) {
      // Don't retry refresh token calls to prevent infinite loop
      if (err.requestOptions.path.contains('/auth/refresh')) {
        await _clearTokens();
        return handler.next(err);
      }

      final refreshToken = await _storage.read(key: _refreshTokenKey);

      if (refreshToken != null) {
        try {
          final newToken = await _refreshToken(refreshToken);

          if (newToken != null) {
            // Update stored token
            await _storage.write(key: _tokenKey, value: newToken);

            // Retry the original request
            final options = err.requestOptions;
            options.headers['Authorization'] = 'Bearer $newToken';

            final response = await _dio.fetch(options);
            return handler.resolve(response);
          }
        } catch (e) {
          // Refresh failed, clear tokens
          await _clearTokens();
        }
      }
    }

    return handler.next(err);
  }

  bool _isPublicEndpoint(String path) {
    final publicPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh',
      '/health',
    ];

    // Use exact match or match with query params to avoid false positives
    // e.g., '/auth/login-history' should NOT match '/auth/login'
    return publicPaths.any((p) => path == p || path.startsWith('$p?') || path.startsWith('$p/'));
  }

  Future<String?> _refreshToken(String refreshToken) async {
    try {
      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(
          headers: {'Authorization': ''},
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is! Map<String, dynamic>) return null;

        final newAccessToken = data['accessToken'] as String?;
        final newRefreshToken = data['refreshToken'] as String?;

        if (newRefreshToken != null) {
          await _storage.write(key: _refreshTokenKey, value: newRefreshToken);
        }

        return newAccessToken;
      }
    } catch (e) {
      // Token refresh failed - this is expected when refresh token is expired
      // Clear tokens and let the user re-authenticate
      await _clearTokens();
    }

    return null;
  }

  Future<void> _clearTokens() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
