import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import '../network/api_client.dart';

/// Privacy preferences model
class PrivacyPreferences {
  final bool analyticsEnabled;
  final bool personalizationEnabled;
  final bool crashReportingEnabled;
  final bool aiTrainingConsent;
  final bool contextRetentionEnabled;
  final bool marketingEmailsEnabled;
  final bool productUpdatesEnabled;
  final int? retentionPeriodDays;
  final DateTime lastConsentUpdate;
  final String consentVersion;

  const PrivacyPreferences({
    this.analyticsEnabled = false,
    this.personalizationEnabled = true,
    this.crashReportingEnabled = true,
    this.aiTrainingConsent = false,
    this.contextRetentionEnabled = true,
    this.marketingEmailsEnabled = false,
    this.productUpdatesEnabled = true,
    this.retentionPeriodDays,
    required this.lastConsentUpdate,
    this.consentVersion = '1.0',
  });

  factory PrivacyPreferences.fromJson(Map<String, dynamic> json) {
    return PrivacyPreferences(
      analyticsEnabled: json['analyticsEnabled'] ?? false,
      personalizationEnabled: json['personalizationEnabled'] ?? true,
      crashReportingEnabled: json['crashReportingEnabled'] ?? true,
      aiTrainingConsent: json['aiTrainingConsent'] ?? false,
      contextRetentionEnabled: json['contextRetentionEnabled'] ?? true,
      marketingEmailsEnabled: json['marketingEmailsEnabled'] ?? false,
      productUpdatesEnabled: json['productUpdatesEnabled'] ?? true,
      retentionPeriodDays: json['retentionPeriodDays'],
      lastConsentUpdate: json['lastConsentUpdate'] != null
          ? DateTime.parse(json['lastConsentUpdate'])
          : DateTime.now(),
      consentVersion: json['consentVersion'] ?? '1.0',
    );
  }

  PrivacyPreferences copyWith({
    bool? analyticsEnabled,
    bool? personalizationEnabled,
    bool? crashReportingEnabled,
    bool? aiTrainingConsent,
    bool? contextRetentionEnabled,
    bool? marketingEmailsEnabled,
    bool? productUpdatesEnabled,
    int? retentionPeriodDays,
    DateTime? lastConsentUpdate,
    String? consentVersion,
  }) {
    return PrivacyPreferences(
      analyticsEnabled: analyticsEnabled ?? this.analyticsEnabled,
      personalizationEnabled:
          personalizationEnabled ?? this.personalizationEnabled,
      crashReportingEnabled:
          crashReportingEnabled ?? this.crashReportingEnabled,
      aiTrainingConsent: aiTrainingConsent ?? this.aiTrainingConsent,
      contextRetentionEnabled:
          contextRetentionEnabled ?? this.contextRetentionEnabled,
      marketingEmailsEnabled:
          marketingEmailsEnabled ?? this.marketingEmailsEnabled,
      productUpdatesEnabled:
          productUpdatesEnabled ?? this.productUpdatesEnabled,
      retentionPeriodDays: retentionPeriodDays ?? this.retentionPeriodDays,
      lastConsentUpdate: lastConsentUpdate ?? this.lastConsentUpdate,
      consentVersion: consentVersion ?? this.consentVersion,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'analyticsEnabled': analyticsEnabled,
      'personalizationEnabled': personalizationEnabled,
      'crashReportingEnabled': crashReportingEnabled,
      'aiTrainingConsent': aiTrainingConsent,
      'contextRetentionEnabled': contextRetentionEnabled,
      'marketingEmailsEnabled': marketingEmailsEnabled,
      'productUpdatesEnabled': productUpdatesEnabled,
      'retentionPeriodDays': retentionPeriodDays,
    };
  }
}

/// Data request model
class DataRequest {
  final String id;
  final String type;
  final String status;
  final String? reason;
  final String? downloadUrl;
  final DateTime? downloadExpiresAt;
  final DateTime createdAt;
  final DateTime? processedAt;

  const DataRequest({
    required this.id,
    required this.type,
    required this.status,
    this.reason,
    this.downloadUrl,
    this.downloadExpiresAt,
    required this.createdAt,
    this.processedAt,
  });

  factory DataRequest.fromJson(Map<String, dynamic> json) {
    return DataRequest(
      id: json['id'],
      type: json['type'],
      status: json['status'],
      reason: json['reason'],
      downloadUrl: json['downloadUrl'],
      downloadExpiresAt: json['downloadExpiresAt'] != null
          ? DateTime.parse(json['downloadExpiresAt'])
          : null,
      createdAt: DateTime.parse(json['createdAt']),
      processedAt: json['processedAt'] != null
          ? DateTime.parse(json['processedAt'])
          : null,
    );
  }

  bool get isPending => status == 'PENDING';
  bool get isProcessing => status == 'PROCESSING';
  bool get isCompleted => status == 'COMPLETED';
  bool get isFailed => status == 'FAILED';
  bool get isCancelled => status == 'CANCELLED';

  String get statusDisplayName {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PROCESSING':
        return 'Processing';
      case 'COMPLETED':
        return 'Completed';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  String get typeDisplayName {
    switch (type) {
      case 'EXPORT':
        return 'Data Export';
      case 'DELETION':
        return 'Data Deletion';
      case 'RECTIFICATION':
        return 'Data Correction';
      default:
        return type;
    }
  }
}

/// Data category info for retention display
class DataCategoryInfo {
  final String category;
  final String description;
  final int retentionDays;
  final bool canDelete;

  const DataCategoryInfo({
    required this.category,
    required this.description,
    required this.retentionDays,
    required this.canDelete,
  });

  factory DataCategoryInfo.fromJson(Map<String, dynamic> json) {
    return DataCategoryInfo(
      category: json['category'],
      description: json['description'],
      retentionDays: json['retentionDays'],
      canDelete: json['canDelete'] ?? false,
    );
  }

  String get retentionDisplayName {
    if (retentionDays < 0) {
      return 'Until account deletion';
    } else if (retentionDays >= 365) {
      final years = retentionDays ~/ 365;
      return years == 1 ? '1 year' : '$years years';
    } else {
      return '$retentionDays days';
    }
  }
}

/// Data retention info response
class DataRetentionInfo {
  final int defaultRetentionDays;
  final int? userRetentionDays;
  final List<DataCategoryInfo> dataCategories;

  const DataRetentionInfo({
    required this.defaultRetentionDays,
    this.userRetentionDays,
    required this.dataCategories,
  });

  factory DataRetentionInfo.fromJson(Map<String, dynamic> json) {
    return DataRetentionInfo(
      defaultRetentionDays: json['defaultRetentionDays'] ?? 365,
      userRetentionDays: json['userRetentionDays'],
      dataCategories: (json['dataCategories'] as List?)
              ?.map((e) => DataCategoryInfo.fromJson(e))
              .toList() ??
          [],
    );
  }
}

/// Storage usage response
class StorageUsage {
  final int chatMessages;
  final int cachedFiles;
  final int documents;
  final int totalBytes;

  const StorageUsage({
    required this.chatMessages,
    required this.cachedFiles,
    required this.documents,
    required this.totalBytes,
  });

  factory StorageUsage.fromJson(Map<String, dynamic> json) {
    return StorageUsage(
      chatMessages: json['chatMessages'] ?? 0,
      cachedFiles: json['cachedFiles'] ?? 0,
      documents: json['documents'] ?? 0,
      totalBytes: json['totalBytes'] ?? 0,
    );
  }

  String formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String get chatMessagesFormatted => formatBytes(chatMessages);
  String get cachedFilesFormatted => formatBytes(cachedFiles);
  String get documentsFormatted => formatBytes(documents);
  String get totalFormatted => formatBytes(totalBytes);
}

/// Data privacy service provider
final dataPrivacyServiceProvider = Provider<DataPrivacyService>((ref) {
  return DataPrivacyService(ref.watch(apiClientProvider));
});

/// Privacy preferences state provider
final privacyPreferencesProvider =
    AsyncNotifierProvider<PrivacyPreferencesNotifier, PrivacyPreferences>(
        PrivacyPreferencesNotifier.new);

/// Data requests provider
final dataRequestsProvider =
    AsyncNotifierProvider<DataRequestsNotifier, List<DataRequest>>(
        DataRequestsNotifier.new);

/// Storage usage provider
final storageUsageProvider = FutureProvider<StorageUsage>((ref) async {
  final service = ref.watch(dataPrivacyServiceProvider);
  return service.getStorageUsage();
});

/// Data retention info provider
final dataRetentionInfoProvider =
    FutureProvider<DataRetentionInfo>((ref) async {
  final service = ref.watch(dataPrivacyServiceProvider);
  return service.getDataRetentionInfo();
});

/// Data privacy service for managing user data privacy settings
class DataPrivacyService {
  final ApiClient _apiClient;

  DataPrivacyService(this._apiClient);

  // ============================================
  // Privacy Preferences
  // ============================================

  Future<PrivacyPreferences> getPrivacyPreferences() async {
    try {
      final response = await _apiClient.get('/users/me/privacy');
      return PrivacyPreferences.fromJson(response.data);
    } catch (e) {
      // Return default preferences on error
      return PrivacyPreferences(lastConsentUpdate: DateTime.now());
    }
  }

  Future<PrivacyPreferences> updatePrivacyPreferences(
      Map<String, dynamic> updates) async {
    try {
      final response = await _apiClient.put(
        '/users/me/privacy',
        data: updates,
      );
      return PrivacyPreferences.fromJson(response.data);
    } catch (e) {
      // Return current state with updates applied locally if API fails
      // This allows the UI to remain functional even without backend support
      final current = await getPrivacyPreferences();
      return current.copyWith(
        analyticsEnabled: updates['analyticsEnabled'] as bool? ?? current.analyticsEnabled,
        personalizationEnabled: updates['personalizationEnabled'] as bool? ?? current.personalizationEnabled,
        crashReportingEnabled: updates['crashReportingEnabled'] as bool? ?? current.crashReportingEnabled,
        aiTrainingConsent: updates['aiTrainingConsent'] as bool? ?? current.aiTrainingConsent,
        contextRetentionEnabled: updates['contextRetentionEnabled'] as bool? ?? current.contextRetentionEnabled,
        marketingEmailsEnabled: updates['marketingEmailsEnabled'] as bool? ?? current.marketingEmailsEnabled,
        productUpdatesEnabled: updates['productUpdatesEnabled'] as bool? ?? current.productUpdatesEnabled,
        retentionPeriodDays: updates['retentionPeriodDays'] as int? ?? current.retentionPeriodDays,
        lastConsentUpdate: DateTime.now(),
      );
    }
  }

  // ============================================
  // Data Requests
  // ============================================

  Future<List<DataRequest>> getDataRequests() async {
    try {
      final response = await _apiClient.get('/users/me/data-requests');
      return (response.data as List)
          .map((e) => DataRequest.fromJson(e))
          .toList();
    } catch (e) {
      // Return empty list if API fails
      return [];
    }
  }

  Future<DataRequest> requestDataExport({String? reason}) async {
    final response = await _apiClient.post(
      '/users/me/data-requests/export',
      data: {'reason': reason},
    );
    return DataRequest.fromJson(response.data);
  }

  Future<DataRequest> requestDataDeletion({
    required String confirmationPhrase,
    String? reason,
  }) async {
    final response = await _apiClient.post(
      '/users/me/data-requests/deletion',
      data: {
        'confirmationPhrase': confirmationPhrase,
        'reason': reason,
      },
    );
    return DataRequest.fromJson(response.data);
  }

  Future<DataRequest> requestAccountDeletion({
    required String password,
    required String confirmationPhrase,
    String? reason,
  }) async {
    final response = await _apiClient.post(
      '/users/me/data-requests/account-deletion',
      data: {
        'password': password,
        'confirmationPhrase': confirmationPhrase,
        'reason': reason,
      },
    );
    return DataRequest.fromJson(response.data);
  }

  Future<DataRequest> cancelDataRequest(String requestId) async {
    final response =
        await _apiClient.delete('/users/me/data-requests/$requestId');
    return DataRequest.fromJson(response.data);
  }

  // ============================================
  // Storage & Retention
  // ============================================

  Future<StorageUsage> getStorageUsage() async {
    try {
      final response = await _apiClient.get('/users/me/storage');
      return StorageUsage.fromJson(response.data);
    } catch (e) {
      return const StorageUsage(
        chatMessages: 0,
        cachedFiles: 0,
        documents: 0,
        totalBytes: 0,
      );
    }
  }

  Future<DataRetentionInfo> getDataRetentionInfo() async {
    try {
      final response = await _apiClient.get('/users/me/data-retention');
      return DataRetentionInfo.fromJson(response.data);
    } catch (e) {
      return const DataRetentionInfo(
        defaultRetentionDays: 365,
        dataCategories: [],
      );
    }
  }

  Future<int> clearConversationHistory() async {
    final response = await _apiClient.delete('/users/me/conversations');
    return response.data['deleted'] ?? 0;
  }

  Future<bool> clearCache() async {
    final response = await _apiClient.delete('/users/me/cache');
    return response.data['success'] ?? false;
  }
}

/// Privacy preferences notifier
class PrivacyPreferencesNotifier extends AsyncNotifier<PrivacyPreferences> {
  late final DataPrivacyService _service;

  @override
  Future<PrivacyPreferences> build() async {
    try {
      _service = ref.watch(dataPrivacyServiceProvider);
      final prefs = await _service.getPrivacyPreferences();

      // Sync crash reporting preference to Firebase Crashlytics
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(prefs.crashReportingEnabled);

      return prefs;
    } catch (e) {
      // Return default preferences if service initialization fails
      return PrivacyPreferences(lastConsentUpdate: DateTime.now());
    }
  }

  Future<void> setAnalyticsEnabled(bool value) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service.updatePrivacyPreferences({'analyticsEnabled': value});
    });
  }

  Future<void> setPersonalizationEnabled(bool value) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service
          .updatePrivacyPreferences({'personalizationEnabled': value});
    });
  }

  Future<void> setCrashReportingEnabled(bool value) async {
    // Update Firebase Crashlytics collection preference immediately
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(value);

    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service
          .updatePrivacyPreferences({'crashReportingEnabled': value});
    });
  }

  Future<void> setAiTrainingConsent(bool value) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service.updatePrivacyPreferences({'aiTrainingConsent': value});
    });
  }

  Future<void> setContextRetentionEnabled(bool value) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service
          .updatePrivacyPreferences({'contextRetentionEnabled': value});
    });
  }

  Future<void> setMarketingEmailsEnabled(bool value) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service
          .updatePrivacyPreferences({'marketingEmailsEnabled': value});
    });
  }

  Future<void> setProductUpdatesEnabled(bool value) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service
          .updatePrivacyPreferences({'productUpdatesEnabled': value});
    });
  }

  Future<void> setRetentionPeriodDays(int? value) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      return _service.updatePrivacyPreferences({'retentionPeriodDays': value});
    });
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _service.getPrivacyPreferences());
  }
}

/// Data requests notifier
class DataRequestsNotifier extends AsyncNotifier<List<DataRequest>> {
  late final DataPrivacyService _service;

  @override
  Future<List<DataRequest>> build() async {
    try {
      _service = ref.watch(dataPrivacyServiceProvider);
      return await _service.getDataRequests();
    } catch (e) {
      // Return empty list if service initialization fails
      return [];
    }
  }

  Future<DataRequest> requestDataExport({String? reason}) async {
    final request = await _service.requestDataExport(reason: reason);
    // Refresh the list
    state = await AsyncValue.guard(() => _service.getDataRequests());
    return request;
  }

  Future<DataRequest> requestDataDeletion({
    required String confirmationPhrase,
    String? reason,
  }) async {
    final request = await _service.requestDataDeletion(
      confirmationPhrase: confirmationPhrase,
      reason: reason,
    );
    state = await AsyncValue.guard(() => _service.getDataRequests());
    return request;
  }

  Future<DataRequest> requestAccountDeletion({
    required String password,
    required String confirmationPhrase,
    String? reason,
  }) async {
    final request = await _service.requestAccountDeletion(
      password: password,
      confirmationPhrase: confirmationPhrase,
      reason: reason,
    );
    state = await AsyncValue.guard(() => _service.getDataRequests());
    return request;
  }

  Future<void> cancelRequest(String requestId) async {
    await _service.cancelDataRequest(requestId);
    state = await AsyncValue.guard(() => _service.getDataRequests());
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _service.getDataRequests());
  }
}
