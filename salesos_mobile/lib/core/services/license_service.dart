import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

/// License status enum
enum LicenseStatus {
  active,
  expired,
  suspended,
  cancelled,
  pending,
  trial,
  none,
}

/// License feature model
class LicenseFeature {
  final String id;
  final String featureKey;
  final String name;
  final String? description;
  final String category;
  final bool isEnabled;

  const LicenseFeature({
    required this.id,
    required this.featureKey,
    required this.name,
    this.description,
    required this.category,
    required this.isEnabled,
  });

  factory LicenseFeature.fromJson(Map<String, dynamic> json) {
    return LicenseFeature(
      id: json['id'] as String,
      featureKey: json['featureKey'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      category: json['category'] as String,
      isEnabled: json['isEnabled'] as bool? ?? true,
    );
  }
}

/// License entitlement model
class LicenseEntitlement {
  final String id;
  final String featureId;
  final bool isEnabled;
  final int? usageLimit;
  final int currentUsage;
  final LicenseFeature feature;

  const LicenseEntitlement({
    required this.id,
    required this.featureId,
    required this.isEnabled,
    this.usageLimit,
    required this.currentUsage,
    required this.feature,
  });

  factory LicenseEntitlement.fromJson(Map<String, dynamic> json) {
    return LicenseEntitlement(
      id: json['id'] as String,
      featureId: json['featureId'] as String,
      isEnabled: json['isEnabled'] as bool? ?? false,
      usageLimit: json['usageLimit'] as int?,
      currentUsage: json['currentUsage'] as int? ?? 0,
      feature: LicenseFeature.fromJson(json['feature'] as Map<String, dynamic>),
    );
  }
}

/// License type model
class LicenseType {
  final String id;
  final String name;
  final String? description;
  final String tier;
  final double price;
  final String billingCycle;

  const LicenseType({
    required this.id,
    required this.name,
    this.description,
    required this.tier,
    required this.price,
    required this.billingCycle,
  });

  factory LicenseType.fromJson(Map<String, dynamic> json) {
    return LicenseType(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      tier: json['tier'] as String? ?? 'FREE',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      billingCycle: json['billingCycle'] as String? ?? 'MONTHLY',
    );
  }
}

/// User license details model
class UserLicense {
  final String id;
  final String userId;
  final String licenseTypeId;
  final DateTime startDate;
  final DateTime endDate;
  final LicenseStatus status;
  final String licenseKey;
  final bool isTrial;
  final DateTime? trialEndDate;
  final bool autoRenew;
  final LicenseType licenseType;
  final List<LicenseEntitlement> entitlements;

  const UserLicense({
    required this.id,
    required this.userId,
    required this.licenseTypeId,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.licenseKey,
    required this.isTrial,
    this.trialEndDate,
    required this.autoRenew,
    required this.licenseType,
    required this.entitlements,
  });

  factory UserLicense.fromJson(Map<String, dynamic> json) {
    return UserLicense(
      id: json['id'] as String,
      userId: json['userId'] as String,
      licenseTypeId: json['licenseTypeId'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      status: _parseStatus(json['status'] as String?),
      licenseKey: json['licenseKey'] as String,
      isTrial: json['isTrial'] as bool? ?? false,
      trialEndDate: json['trialEndDate'] != null
          ? DateTime.parse(json['trialEndDate'] as String)
          : null,
      autoRenew: json['autoRenew'] as bool? ?? false,
      licenseType: LicenseType.fromJson(json['licenseType'] as Map<String, dynamic>),
      entitlements: (json['entitlements'] as List<dynamic>?)
              ?.map((e) => LicenseEntitlement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  static LicenseStatus _parseStatus(String? status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return LicenseStatus.active;
      case 'EXPIRED':
        return LicenseStatus.expired;
      case 'SUSPENDED':
        return LicenseStatus.suspended;
      case 'CANCELLED':
        return LicenseStatus.cancelled;
      case 'PENDING':
        return LicenseStatus.pending;
      case 'TRIAL':
        return LicenseStatus.trial;
      default:
        return LicenseStatus.none;
    }
  }

  /// Get masked license key (show first 4 and last 4 characters)
  String get maskedLicenseKey {
    if (licenseKey.length <= 8) return licenseKey;
    return '${licenseKey.substring(0, 4)}****${licenseKey.substring(licenseKey.length - 4)}';
  }

  /// Get enabled features count
  int get enabledFeaturesCount {
    return entitlements.where((e) => e.isEnabled).length;
  }

  /// Check if license is valid
  bool get isValid {
    return status == LicenseStatus.active || status == LicenseStatus.trial;
  }

  /// Get days until expiration
  int get daysUntilExpiration {
    return endDate.difference(DateTime.now()).inDays;
  }
}

/// License service provider
final licenseServiceProvider = Provider<LicenseService>((ref) {
  return LicenseService(ref.watch(apiClientProvider));
});

/// Current license provider - autoDispose ensures fresh data on user change
final currentLicenseProvider = FutureProvider.autoDispose<UserLicense?>((ref) async {
  final service = ref.watch(licenseServiceProvider);
  return service.getMyLicense();
});

/// License validation state
enum LicenseValidationState {
  loading,
  valid,
  expired,
  noLicense,
  error,
}

/// License validation result with details
class LicenseValidation {
  final LicenseValidationState state;
  final UserLicense? license;
  final String? message;

  const LicenseValidation({
    required this.state,
    this.license,
    this.message,
  });

  bool get isValid => state == LicenseValidationState.valid;
  bool get isLocked => state == LicenseValidationState.noLicense ||
                       state == LicenseValidationState.expired;
}

/// License validation provider - checks and returns validation state
final licenseValidationProvider = FutureProvider.autoDispose<LicenseValidation>((ref) async {
  try {
    final license = await ref.watch(currentLicenseProvider.future);

    if (license == null) {
      return const LicenseValidation(
        state: LicenseValidationState.noLicense,
        message: 'No active license found. Please contact your administrator.',
      );
    }

    if (!license.isValid) {
      if (license.status == LicenseStatus.expired) {
        return LicenseValidation(
          state: LicenseValidationState.expired,
          license: license,
          message: 'Your license has expired. Please contact your administrator to renew.',
        );
      }
      return LicenseValidation(
        state: LicenseValidationState.noLicense,
        license: license,
        message: 'Your license is ${license.status.name}. Please contact your administrator.',
      );
    }

    return LicenseValidation(
      state: LicenseValidationState.valid,
      license: license,
    );
  } catch (e) {
    return LicenseValidation(
      state: LicenseValidationState.error,
      message: 'Unable to verify license. Please check your connection.',
    );
  }
});

/// License service for managing user licenses
class LicenseService {
  final ApiClient _apiClient;

  LicenseService(this._apiClient);

  /// Get current user's license
  Future<UserLicense?> getMyLicense() async {
    try {
      final response = await _apiClient.get('/licensing/my-license');
      if (response.data != null) {
        return UserLicense.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Activate a license key
  Future<UserLicense?> activateLicense(String licenseKey) async {
    try {
      final response = await _apiClient.post(
        '/licensing/apply-key',
        data: {'licenseKey': licenseKey},
      );
      if (response.data != null) {
        return UserLicense.fromJson(response.data);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  /// Validate a license key without applying
  Future<bool> validateLicenseKey(String licenseKey) async {
    try {
      final response = await _apiClient.get(
        '/licensing/validate/${Uri.encodeComponent(licenseKey)}',
      );
      return response.data['valid'] ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Check if a feature is enabled
  Future<bool> isFeatureEnabled(String featureKey) async {
    try {
      final license = await getMyLicense();
      if (license == null) return false;

      return license.entitlements.any(
        (e) => e.feature.featureKey == featureKey && e.isEnabled,
      );
    } catch (e) {
      return false;
    }
  }
}
