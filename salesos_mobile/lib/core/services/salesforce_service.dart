import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../network/api_client.dart';
import '../providers/providers.dart';

/// Storage keys for Salesforce credentials
const String _sfAccessTokenKey = 'sf_access_token';
const String _sfRefreshTokenKey = 'sf_refresh_token';
const String _sfInstanceUrlKey = 'sf_instance_url';
const String _sfOrgIdKey = 'sf_org_id';
const String _sfOrgNameKey = 'sf_org_name';
const String _sfDisplayNameKey = 'sf_display_name';
const String _sfConnectedAtKey = 'sf_connected_at';
const String _sfExpiresAtKey = 'sf_expires_at';

/// Salesforce service provider
final salesforceServiceProvider = Provider<SalesforceService>((ref) {
  return SalesforceService(
    ref.watch(apiClientProvider),
    ref.watch(secureStorageProvider),
  );
});

/// Enhanced Salesforce connection status provider
final salesforceStatusProvider = FutureProvider<SalesforceConnectionStatus>((ref) async {
  final service = ref.watch(salesforceServiceProvider);
  return service.getConnectionStatus();
});

/// Service for Salesforce OAuth and CRM integration
class SalesforceService {
  final ApiClient _apiClient;
  final FlutterSecureStorage _storage;

  SalesforceService(this._apiClient, this._storage);

  /// Check if Salesforce integration is enabled on the server
  Future<bool> isEnabled() async {
    try {
      final response = await _apiClient.get('/salesforce/status');
      return response.data['enabled'] ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Get the OAuth authorization URL from the backend
  Future<String?> getAuthUrl() async {
    try {
      final response = await _apiClient.get('/salesforce/auth/url');
      return response.data['authUrl'] as String?;
    } catch (e) {
      return null;
    }
  }

  /// Get current connection status
  Future<SalesforceConnectionStatus> getConnectionStatus() async {
    try {
      // First check local storage
      final accessToken = await _storage.read(key: _sfAccessTokenKey);
      if (accessToken == null) {
        return SalesforceConnectionStatus.disconnected();
      }

      // Verify with server
      final response = await _apiClient.get('/salesforce/status');
      return SalesforceConnectionStatus.fromJson(response.data);
    } catch (e) {
      return SalesforceConnectionStatus.disconnected();
    }
  }

  /// Store Salesforce connection details after OAuth callback
  Future<void> storeConnection({
    required String accessToken,
    String? refreshToken,
    required String instanceUrl,
    required String orgId,
    String? orgName,
    String? displayName,
    DateTime? expiresAt,
  }) async {
    await _storage.write(key: _sfAccessTokenKey, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _sfRefreshTokenKey, value: refreshToken);
    }
    await _storage.write(key: _sfInstanceUrlKey, value: instanceUrl);
    await _storage.write(key: _sfOrgIdKey, value: orgId);
    if (orgName != null) {
      await _storage.write(key: _sfOrgNameKey, value: orgName);
    }
    if (displayName != null) {
      await _storage.write(key: _sfDisplayNameKey, value: displayName);
    }
    await _storage.write(
      key: _sfConnectedAtKey,
      value: DateTime.now().toIso8601String(),
    );
    if (expiresAt != null) {
      await _storage.write(key: _sfExpiresAtKey, value: expiresAt.toIso8601String());
    }
  }

  /// Disconnect from Salesforce
  Future<void> disconnect() async {
    try {
      await _apiClient.post('/salesforce/disconnect');
    } catch (e) {
      // Continue with local cleanup even if server call fails
    }

    // Clear local storage
    await _storage.delete(key: _sfAccessTokenKey);
    await _storage.delete(key: _sfRefreshTokenKey);
    await _storage.delete(key: _sfInstanceUrlKey);
    await _storage.delete(key: _sfOrgIdKey);
    await _storage.delete(key: _sfOrgNameKey);
    await _storage.delete(key: _sfDisplayNameKey);
    await _storage.delete(key: _sfConnectedAtKey);
    await _storage.delete(key: _sfExpiresAtKey);
  }

  /// Refresh the access token
  Future<bool> refreshToken() async {
    try {
      final response = await _apiClient.post('/salesforce/refresh');
      return response.data['success'] ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Test the Salesforce connection
  Future<Map<String, dynamic>> testConnection() async {
    try {
      final response = await _apiClient.get('/salesforce/test');
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Get stored Salesforce access token
  Future<String?> getAccessToken() async {
    return _storage.read(key: _sfAccessTokenKey);
  }

  /// Get stored instance URL
  Future<String?> getInstanceUrl() async {
    return _storage.read(key: _sfInstanceUrlKey);
  }

  /// Check if locally connected (has stored credentials)
  Future<bool> isLocallyConnected() async {
    final token = await _storage.read(key: _sfAccessTokenKey);
    return token != null && token.isNotEmpty;
  }
}
