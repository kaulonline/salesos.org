import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import 'device_tracking_service.dart';

/// Visible feature model
class VisibleFeature {
  final String featureKey;
  final String name;
  final String category;
  final bool isVisible;
  final bool isEnabled;
  final String? upgradeMessage;
  final int? uiPosition;

  const VisibleFeature({
    required this.featureKey,
    required this.name,
    required this.category,
    required this.isVisible,
    required this.isEnabled,
    this.upgradeMessage,
    this.uiPosition,
  });

  factory VisibleFeature.fromJson(Map<String, dynamic> json) {
    return VisibleFeature(
      featureKey: json['featureKey'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      isVisible: json['isVisible'] as bool? ?? true,
      isEnabled: json['isEnabled'] as bool? ?? false,
      upgradeMessage: json['upgradeMessage'] as String?,
      uiPosition: json['uiPosition'] as int?,
    );
  }
}

/// Feature access result model
class FeatureAccessResult {
  final bool allowed;
  final String? reason;
  final bool upgradeRequired;
  final String? minTierRequired;

  const FeatureAccessResult({
    required this.allowed,
    this.reason,
    this.upgradeRequired = false,
    this.minTierRequired,
  });

  factory FeatureAccessResult.fromJson(Map<String, dynamic> json) {
    return FeatureAccessResult(
      allowed: json['allowed'] as bool? ?? false,
      reason: json['reason'] as String?,
      upgradeRequired: json['upgradeRequired'] as bool? ?? false,
      minTierRequired: json['minTierRequired'] as String?,
    );
  }
}

/// License info model
class LicenseInfo {
  final String tier;
  final String name;
  final DateTime? expiresAt;

  const LicenseInfo({
    required this.tier,
    required this.name,
    this.expiresAt,
  });

  factory LicenseInfo.fromJson(Map<String, dynamic> json) {
    return LicenseInfo(
      tier: json['tier'] as String,
      name: json['name'] as String,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }
}

/// Feature config model
class FeatureConfig {
  final List<VisibleFeature> features;
  final LicenseInfo? license;
  final DeviceType deviceType;

  const FeatureConfig({
    required this.features,
    this.license,
    required this.deviceType,
  });

  factory FeatureConfig.fromJson(Map<String, dynamic> json) {
    return FeatureConfig(
      features: (json['features'] as List<dynamic>?)
              ?.map((f) => VisibleFeature.fromJson(f as Map<String, dynamic>))
              .toList() ??
          [],
      license: json['license'] != null
          ? LicenseInfo.fromJson(json['license'] as Map<String, dynamic>)
          : null,
      deviceType: DeviceType.fromString(json['deviceType'] as String),
    );
  }

  /// Get feature by key
  VisibleFeature? getFeature(String featureKey) {
    try {
      return features.firstWhere((f) => f.featureKey == featureKey);
    } catch (e) {
      return null;
    }
  }

  /// Check if feature is visible
  bool isFeatureVisible(String featureKey) {
    final feature = getFeature(featureKey);
    return feature?.isVisible ?? false;
  }

  /// Check if feature is enabled
  bool isFeatureEnabled(String featureKey) {
    final feature = getFeature(featureKey);
    return feature?.isEnabled ?? false;
  }

  /// Get features by category
  List<VisibleFeature> getFeaturesByCategory(String category) {
    return features.where((f) => f.category == category).toList();
  }

  /// Get enabled features
  List<VisibleFeature> get enabledFeatures {
    return features.where((f) => f.isEnabled).toList();
  }

  /// Get visible features (sorted by position)
  List<VisibleFeature> get visibleFeatures {
    final visible = features.where((f) => f.isVisible).toList();
    visible.sort((a, b) => (a.uiPosition ?? 999).compareTo(b.uiPosition ?? 999));
    return visible;
  }
}

/// Feature visibility service provider
final featureVisibilityServiceProvider = Provider<FeatureVisibilityService>((ref) {
  return FeatureVisibilityService(
    ref.watch(apiClientProvider),
    ref.watch(deviceTrackingServiceProvider),
  );
});

/// Feature config provider - loads visible features for current device
final featureConfigProvider = FutureProvider<FeatureConfig?>((ref) async {
  final service = ref.watch(featureVisibilityServiceProvider);
  return service.getFeatureConfig();
});

/// Visible features provider - just the list of visible features
final visibleFeaturesProvider = FutureProvider<List<VisibleFeature>>((ref) async {
  final service = ref.watch(featureVisibilityServiceProvider);
  return service.getVisibleFeatures();
});

/// Feature visibility service for managing feature visibility per device
class FeatureVisibilityService {
  final ApiClient _apiClient;
  final DeviceTrackingService _deviceTrackingService;
  FeatureConfig? _cachedConfig;
  final Map<String, FeatureAccessResult> _accessCache = {};

  FeatureVisibilityService(this._apiClient, this._deviceTrackingService);

  /// Get cached feature config
  FeatureConfig? get cachedConfig => _cachedConfig;

  /// Get the current device type
  Future<String> _getDeviceTypeParam() async {
    final deviceType = await _deviceTrackingService.getDeviceType();
    return deviceType.value;
  }

  /// Get visible features for current device
  Future<List<VisibleFeature>> getVisibleFeatures() async {
    try {
      final deviceType = await _getDeviceTypeParam();
      final response = await _apiClient.get(
        '/features/visible',
        queryParameters: {'deviceType': deviceType},
      );

      if (response.data != null && response.data is List) {
        return (response.data as List)
            .map((f) => VisibleFeature.fromJson(f as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get full feature config for current device
  Future<FeatureConfig?> getFeatureConfig() async {
    try {
      final deviceType = await _getDeviceTypeParam();
      final response = await _apiClient.get(
        '/features/config',
        queryParameters: {'deviceType': deviceType},
      );

      if (response.data != null) {
        _cachedConfig = FeatureConfig.fromJson(response.data);
        return _cachedConfig;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Check if a feature is visible (uses cache if available)
  Future<bool> isFeatureVisible(String featureKey) async {
    // Check cached config first
    if (_cachedConfig != null) {
      return _cachedConfig!.isFeatureVisible(featureKey);
    }

    // Fetch fresh config
    final config = await getFeatureConfig();
    return config?.isFeatureVisible(featureKey) ?? false;
  }

  /// Check if a feature is enabled (uses cache if available)
  Future<bool> isFeatureEnabled(String featureKey) async {
    // Check cached config first
    if (_cachedConfig != null) {
      return _cachedConfig!.isFeatureEnabled(featureKey);
    }

    // Fetch fresh config
    final config = await getFeatureConfig();
    return config?.isFeatureEnabled(featureKey) ?? false;
  }

  /// Check feature access - combines visibility and licensing
  Future<FeatureAccessResult> checkFeatureAccess(String featureKey) async {
    // Check cache first
    if (_accessCache.containsKey(featureKey)) {
      return _accessCache[featureKey]!;
    }

    try {
      final deviceType = await _getDeviceTypeParam();
      final response = await _apiClient.get(
        '/features/check/$featureKey',
        queryParameters: {'deviceType': deviceType},
      );

      if (response.data != null) {
        final result = FeatureAccessResult.fromJson(response.data);
        _accessCache[featureKey] = result;
        return result;
      }
      return const FeatureAccessResult(allowed: false, reason: 'Feature not found');
    } catch (e) {
      return const FeatureAccessResult(allowed: false, reason: 'Failed to check access');
    }
  }

  /// Get upgrade message for a feature
  Future<String?> getUpgradeMessage(String featureKey) async {
    final result = await checkFeatureAccess(featureKey);
    if (result.upgradeRequired) {
      // Check cached config for custom message
      final feature = _cachedConfig?.getFeature(featureKey);
      return feature?.upgradeMessage ??
          'Upgrade to ${result.minTierRequired ?? 'a higher tier'} to access this feature';
    }
    return null;
  }

  /// Refresh the feature config cache
  Future<void> refreshConfig() async {
    _accessCache.clear();
    await getFeatureConfig();
  }

  /// Clear all caches
  void clearCache() {
    _cachedConfig = null;
    _accessCache.clear();
  }

  /// Check multiple features at once
  Future<Map<String, FeatureAccessResult>> checkMultipleFeatures(
    List<String> featureKeys,
  ) async {
    final results = <String, FeatureAccessResult>{};
    for (final key in featureKeys) {
      results[key] = await checkFeatureAccess(key);
    }
    return results;
  }

  /// Get features that require upgrade
  Future<List<VisibleFeature>> getUpgradeRequiredFeatures() async {
    final config = _cachedConfig ?? await getFeatureConfig();
    if (config == null) return [];

    return config.features
        .where((f) => f.isVisible && !f.isEnabled && f.upgradeMessage != null)
        .toList();
  }
}
