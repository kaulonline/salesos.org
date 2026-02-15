import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/interceptors/csrf_interceptor.dart';
import '../../../../core/providers/providers.dart';
import '../../../../core/utils/exceptions.dart';
import '../../domain/entities/user.dart';
import '../models/auth_response.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(secureStorageProvider),
  );
});

class AuthRepository {
  final ApiClient _apiClient;
  final FlutterSecureStorage _storage;

  static const String _tokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'current_user';

  AuthRepository(this._apiClient, this._storage);

  /// Extract AppException from DioException or wrap unknown errors
  AppException _handleError(dynamic error, String context) {
    if (error is DioException && error.error is AppException) {
      return error.error as AppException;
    }
    if (error is AppException) {
      return error;
    }
    return UnknownException(
      message: 'An error occurred during $context',
      originalError: error,
    );
  }

  /// Login with email and password
  Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await _apiClient.post(
        '/auth/login',
        data: LoginRequest(email: email, password: password).toJson(),
      );

      final authResponse = AuthResponse.fromJson(response.data);

      // Store tokens
      await _storage.write(key: _tokenKey, value: authResponse.accessToken);
      if (authResponse.refreshToken != null) {
        await _storage.write(key: _refreshTokenKey, value: authResponse.refreshToken);
      }
      // Store CSRF token for state-changing requests
      if (authResponse.csrfToken != null) {
        await CsrfInterceptor.storeCsrfToken(_storage, authResponse.csrfToken!);
      }

      return authResponse;
    } catch (e) {
      throw _handleError(e, 'login');
    }
  }

  /// Register new user with organization code for B2B enterprise access
  Future<AuthResponse> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
    String? company,
    String? organizationCode,
  }) async {
    try {
      final response = await _apiClient.post(
        '/auth/register',
        data: RegisterRequest(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
          company: company,
          organizationCode: organizationCode,
        ).toJson(),
      );

      final authResponse = AuthResponse.fromJson(response.data);

      // Store tokens
      await _storage.write(key: _tokenKey, value: authResponse.accessToken);
      if (authResponse.refreshToken != null) {
        await _storage.write(key: _refreshTokenKey, value: authResponse.refreshToken);
      }
      // Store CSRF token for state-changing requests
      if (authResponse.csrfToken != null) {
        await CsrfInterceptor.storeCsrfToken(_storage, authResponse.csrfToken!);
      }

      return authResponse;
    } catch (e) {
      throw _handleError(e, 'registration');
    }
  }

  /// Get current user profile
  Future<User> getCurrentUser() async {
    try {
      final response = await _apiClient.get('/auth/me');
      return User.fromJson(response.data);
    } catch (e) {
      throw _handleError(e, 'fetching user profile');
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      await _apiClient.post('/auth/logout');
    } catch (_) {
      // Ignore errors on logout
    } finally {
      await _clearStorage();
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: _tokenKey);
    return token != null && token.isNotEmpty;
  }

  /// Get stored access token
  Future<String?> getAccessToken() async {
    return _storage.read(key: _tokenKey);
  }

  /// Get stored refresh token
  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  /// Refresh tokens using a refresh token
  /// Returns true if successful, false otherwise
  Future<bool> refreshTokens(String refreshToken) async {
    try {
      final response = await _apiClient.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final newAccessToken = data['accessToken'] as String?;
        final newRefreshToken = data['refreshToken'] as String?;

        if (newAccessToken != null) {
          await _storage.write(key: _tokenKey, value: newAccessToken);
        }
        if (newRefreshToken != null) {
          await _storage.write(key: _refreshTokenKey, value: newRefreshToken);
        }
        return newAccessToken != null;
      }
    } catch (e) {
      // Refresh failed
    }
    return false;
  }

  /// Clear stored auth data
  Future<void> _clearStorage() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshTokenKey);
    await _storage.delete(key: _userKey);
    await CsrfInterceptor.clearCsrfToken(_storage);
  }

  /// Request password reset
  Future<void> requestPasswordReset(String email) async {
    try {
      await _apiClient.post(
        '/auth/forgot-password',
        data: {'email': email},
      );
    } catch (e) {
      throw _handleError(e, 'password reset request');
    }
  }

  /// Reset password with token
  Future<void> resetPassword(String token, String newPassword) async {
    try {
      await _apiClient.post(
        '/auth/reset-password',
        data: {
          'token': token,
          'password': newPassword,
        },
      );
    } catch (e) {
      throw _handleError(e, 'password reset');
    }
  }

  /// Change password (requires current password)
  Future<void> changePassword(String currentPassword, String newPassword) async {
    try {
      await _apiClient.post(
        '/auth/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    } catch (e) {
      throw _handleError(e, 'password change');
    }
  }

  /// Update user profile
  Future<User> updateProfile({String? name, String? avatarUrl}) async {
    try {
      final response = await _apiClient.post(
        '/auth/update-profile',
        data: {
          'name': ?name,
          'avatarUrl': ?avatarUrl,
        },
      );
      return User.fromJson(response.data);
    } catch (e) {
      throw _handleError(e, 'profile update');
    }
  }

  /// Request account deletion
  /// Requires password re-authentication and typing "DELETE MY ACCOUNT" confirmation
  Future<void> requestAccountDeletion({
    required String password,
    required String confirmationPhrase,
    String? reason,
  }) async {
    try {
      await _apiClient.post(
        '/users/me/data-requests/account-deletion',
        data: {
          'password': password,
          'confirmationPhrase': confirmationPhrase,
          'reason': ?reason,
        },
      );
      // Clear local storage after account deletion request is submitted
      await _clearStorage();
    } catch (e) {
      throw _handleError(e, 'account deletion request');
    }
  }
}
