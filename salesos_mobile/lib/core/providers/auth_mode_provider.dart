import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'providers.dart';
import '../network/api_client.dart';
import '../services/cache_service.dart';

/// Authentication mode - Local (IRIS Backend) vs Salesforce CRM
enum AuthMode {
  /// Local authentication using IRIS backend database
  local,

  /// Salesforce CRM authentication via OAuth
  salesforce,
}

/// Extension methods for AuthMode
extension AuthModeExtension on AuthMode {
  String get displayName {
    switch (this) {
      case AuthMode.local:
        return 'SalesOS Local';
      case AuthMode.salesforce:
        return 'Salesforce CRM';
    }
  }

  String get description {
    switch (this) {
      case AuthMode.local:
        return 'Use SalesOS standalone database for CRM data';
      case AuthMode.salesforce:
        return 'Connect to your Salesforce org for CRM data';
    }
  }

  String get icon {
    switch (this) {
      case AuthMode.local:
        return 'assets/icons/iris_logo.svg';
      case AuthMode.salesforce:
        return 'assets/icons/salesforce_logo.svg';
    }
  }
}

/// Storage key for auth mode persistence
const String _authModeKey = 'auth_mode';

/// Provider for the current authentication mode
final authModeProvider = NotifierProvider<AuthModeNotifier, AuthMode>(AuthModeNotifier.new);

/// Notifier for managing authentication mode state
class AuthModeNotifier extends Notifier<AuthMode> {
  late final FlutterSecureStorage _storage;

  @override
  AuthMode build() {
    _storage = ref.watch(secureStorageProvider);
    _loadAuthMode();
    return AuthMode.local;
  }

  /// Load the saved auth mode from storage
  Future<void> _loadAuthMode() async {
    final savedMode = await _storage.read(key: _authModeKey);
    if (savedMode != null) {
      state = AuthMode.values.firstWhere(
        (mode) => mode.name == savedMode,
        orElse: () => AuthMode.local,
      );
    }
  }

  /// Set the authentication mode
  /// Clears all CRM caches - providers will automatically rebuild when they
  /// detect the authModeProvider state change via ref.watch(authModeProvider)
  Future<void> setMode(AuthMode mode) async {
    final previousMode = state;

    await _storage.write(key: _authModeKey, value: mode.name);
    state = mode;

    // If mode changed, clear all CRM caches
    // Note: We don't invalidate providers here because they watch authModeProvider
    // and will automatically rebuild when the state changes
    if (previousMode != mode) {
      // Clear all caches
      try {
        final cacheService = ref.read(cacheServiceProvider);
        await cacheService.clearAllCache();
      } catch (_) {
        // Cache clear may fail if not initialized
      }
    }
  }

  /// Check if currently in Salesforce mode
  bool get isSalesforceMode => state == AuthMode.salesforce;

  /// Check if currently in local mode
  bool get isLocalMode => state == AuthMode.local;
}

/// Salesforce connection status
class SalesforceConnectionStatus {
  final bool isConnected;
  final String? orgName;
  final String? orgId;
  final String? username;
  final String? instanceUrl;
  final String? displayName;
  final String? email;
  final bool isSandbox;
  final DateTime? connectedAt;
  final DateTime? expiresAt;

  const SalesforceConnectionStatus({
    this.isConnected = false,
    this.orgName,
    this.orgId,
    this.username,
    this.instanceUrl,
    this.displayName,
    this.email,
    this.isSandbox = false,
    this.connectedAt,
    this.expiresAt,
  });

  factory SalesforceConnectionStatus.disconnected() {
    return const SalesforceConnectionStatus(isConnected: false);
  }

  factory SalesforceConnectionStatus.fromJson(Map<String, dynamic> json) {
    // Check root level 'connected' first
    final isConnected = json['connected'] == true;

    // Handle case where no connection exists
    final connection = json['connection'] as Map<String, dynamic>?;
    if (!isConnected || connection == null) {
      return const SalesforceConnectionStatus(isConnected: false);
    }

    // Parse dates - handle both String and DateTime formats
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      if (value is String) return DateTime.tryParse(value);
      return null;
    }

    return SalesforceConnectionStatus(
      isConnected: true,
      orgId: connection['orgId'] as String?,
      username: connection['username'] as String?,
      // Use username as orgName fallback for display
      orgName: connection['username'] as String?,
      instanceUrl: connection['instanceUrl'] as String?,
      displayName: connection['displayName'] as String?,
      email: connection['email'] as String?,
      isSandbox: connection['isSandbox'] == true,
      connectedAt: parseDate(connection['connectedAt']),
      expiresAt: parseDate(connection['expiresAt']),
    );
  }
}

/// Provider for Salesforce connection status
final salesforceConnectionProvider = FutureProvider<SalesforceConnectionStatus>((ref) async {
  final authMode = ref.watch(authModeProvider);

  // If not in Salesforce mode, return disconnected
  if (authMode != AuthMode.salesforce) {
    return SalesforceConnectionStatus.disconnected();
  }

  try {
    // Import API client to fetch connection status
    final apiClient = ref.watch(apiClientProvider);
    final response = await apiClient.get('/salesforce/status');

    if (response.data is Map<String, dynamic>) {
      return SalesforceConnectionStatus.fromJson(response.data);
    }
    return SalesforceConnectionStatus.disconnected();
  } catch (e) {
    // If API call fails, return disconnected
    return SalesforceConnectionStatus.disconnected();
  }
});
