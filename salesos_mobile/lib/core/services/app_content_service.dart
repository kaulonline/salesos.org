import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';

// =============================================================================
// App Info Models
// =============================================================================

/// App version and build information
class AppVersionInfo {
  final String version;
  final String buildNumber;
  final String packageName;
  final String appName;

  const AppVersionInfo({
    required this.version,
    required this.buildNumber,
    required this.packageName,
    required this.appName,
  });

  String get fullVersion => '$version ($buildNumber)';
}

/// App feature description
class AppFeature {
  final String title;
  final String description;
  final String icon;

  const AppFeature({
    required this.title,
    required this.description,
    required this.icon,
  });
}

/// Company and social links information
class CompanyInfo {
  final String name;
  final String tagline;
  final String website;
  final String supportEmail;
  final String privacyEmail;
  final String copyright;

  const CompanyInfo({
    required this.name,
    required this.tagline,
    required this.website,
    required this.supportEmail,
    required this.privacyEmail,
    required this.copyright,
  });
}

// =============================================================================
// Content Types (matches backend AppContentType enum)
// =============================================================================

/// Content types from API: GET /api/app-content/public/:type
enum ContentType {
  termsOfService('terms-of-service', 'Terms of Service'),
  privacySecurity('privacy-security', 'Privacy Policy'),
  security('security', 'Security'),
  dataProcessingAgreement('data-processing-agreement', 'Data Processing Agreement'),
  ossLicenses('oss-licenses', 'Open Source Licenses'),
  aboutIris('about-iris', 'About SalesOS'),
  helpSupport('help-support', 'Help & Support'),
  releaseNotes('release-notes', 'Release Notes');

  final String apiPath;
  final String displayName;

  const ContentType(this.apiPath, this.displayName);

  String get cacheKey => 'content_$apiPath';
}

// =============================================================================
// Legal Content Model
// =============================================================================

/// Legal content model for Terms, Privacy, Licenses, etc.
class LegalContent {
  final String id;
  final String title;
  final String content;
  final String? version;
  final DateTime? lastUpdated;
  final bool isFromApi;

  const LegalContent({
    this.id = '',
    required this.title,
    required this.content,
    this.version,
    this.lastUpdated,
    this.isFromApi = false,
  });

  factory LegalContent.fromJson(Map<String, dynamic> json) {
    return LegalContent(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      version: json['version'] as String?,
      lastUpdated: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
      isFromApi: true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'content': content,
    'version': version,
    'updatedAt': lastUpdated?.toIso8601String(),
  };

  /// Fallback content when API is unavailable
  static LegalContent unavailable(String title) => LegalContent(
    title: title,
    content: '''
# $title

This content is currently unavailable offline.

Please check back when you have an internet connection, or contact support@salesos.org for assistance.
''',
    isFromApi: false,
  );
}

// =============================================================================
// Providers
// =============================================================================

/// App content service provider
final appContentServiceProvider = Provider<AppContentService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AppContentService(apiClient);
});

/// Provider for Terms of Service
final termsOfServiceProvider = FutureProvider<LegalContent>((ref) async {
  final service = ref.watch(appContentServiceProvider);
  return service.getContent(ContentType.termsOfService);
});

/// Provider for Privacy Policy
final privacyPolicyProvider = FutureProvider<LegalContent>((ref) async {
  final service = ref.watch(appContentServiceProvider);
  return service.getContent(ContentType.privacySecurity);
});

/// Provider for OSS Licenses
final ossLicensesProvider = FutureProvider<LegalContent>((ref) async {
  final service = ref.watch(appContentServiceProvider);
  return service.getContent(ContentType.ossLicenses);
});

/// Provider for About content
final aboutContentProvider = FutureProvider<LegalContent>((ref) async {
  final service = ref.watch(appContentServiceProvider);
  return service.getContent(ContentType.aboutIris);
});

/// Provider for app version info
final appVersionProvider = FutureProvider<AppVersionInfo>((ref) async {
  final packageInfo = await PackageInfo.fromPlatform();
  return AppVersionInfo(
    version: packageInfo.version,
    buildNumber: packageInfo.buildNumber,
    packageName: packageInfo.packageName,
    appName: packageInfo.appName,
  );
});

/// Static company info - these rarely change
const companyInfo = CompanyInfo(
  name: 'SalesOS',
  tagline: 'AI-First Conversational CRM',
  website: 'https://salesos.org',
  supportEmail: 'support@salesos.org',
  privacyEmail: 'privacy@salesos.org',
  copyright: '2024 Iriseller. All rights reserved.',
);

// =============================================================================
// App Content Service
// =============================================================================

/// Service for fetching legal and app content from the backend API
///
/// Fetches from: GET /api/app-content/public/:type
///
/// Features:
/// - Caches content locally for offline access
/// - Falls back to cached content when offline
/// - Provides minimal fallback when no content available
class AppContentService {
  final ApiClient _apiClient;

  AppContentService(this._apiClient);

  /// Get content by type
  ///
  /// Tries to fetch from API first, falls back to cache,
  /// then to minimal fallback content.
  Future<LegalContent> getContent(
    ContentType type, {
    bool forceRefresh = false,
  }) async {
    // Try cache first if not forcing refresh
    if (!forceRefresh) {
      final cached = await _getCachedContent(type);
      if (cached != null && !_isStale(cached)) {
        return cached;
      }
    }

    // Try to fetch from API
    try {
      final fresh = await _fetchFromApi(type);
      if (fresh != null) {
        await _cacheContent(type, fresh);
        return fresh;
      }
    } catch (e) {
      // API call failed, try cache
    }

    // Fall back to cache (even if stale)
    final cached = await _getCachedContent(type);
    if (cached != null) {
      return cached;
    }

    // Return unavailable fallback
    return LegalContent.unavailable(type.displayName);
  }

  /// Fetch content from API
  Future<LegalContent?> _fetchFromApi(ContentType type) async {
    try {
      final response = await _apiClient.get('/app-content/public/${type.apiPath}');

      if (response.data != null && response.data is Map<String, dynamic>) {
        return LegalContent.fromJson(response.data);
      }
    } catch (e) {
      // Silently fail - will use cache or fallback
    }
    return null;
  }

  /// Get cached content
  Future<LegalContent?> _getCachedContent(ContentType type) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(type.cacheKey);

      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        return LegalContent.fromJson(data);
      }
    } catch (e) {
      // Silently fail
    }
    return null;
  }

  /// Cache content locally
  Future<void> _cacheContent(ContentType type, LegalContent content) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(type.cacheKey, jsonEncode(content.toJson()));
    } catch (e) {
      // Silently fail
    }
  }

  /// Check if content is stale (older than 24 hours)
  bool _isStale(LegalContent content) {
    if (content.lastUpdated == null) return true;
    return DateTime.now().difference(content.lastUpdated!).inHours > 24;
  }

  /// Clear all cached content
  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      for (final type in ContentType.values) {
        await prefs.remove(type.cacheKey);
      }
    } catch (e) {
      // Silently fail
    }
  }

  /// Prefetch all content for offline use
  Future<void> prefetchAll() async {
    for (final type in ContentType.values) {
      await getContent(type, forceRefresh: true);
    }
  }
}
