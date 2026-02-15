/// Application configuration constants
class AppConfig {
  AppConfig._();

  // App Info
  static const String appName = 'SalesOS';
  static const String appVersion = '1.0.0';
  static const String appBuildNumber = '1';

  // API Configuration
  // Use www.salesos.org to avoid 301 redirect from non-www (Cloudflare rule)
  static const String baseUrl = 'https://www.salesos.org/api';
  static const String devBaseUrl = 'http://localhost:3000/api';
  static const String wsUrl = 'wss://www.salesos.org';
  static const String devWsUrl = 'ws://localhost:3000';

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);

  // Cache Configuration
  static const Duration cacheMaxAge = Duration(hours: 24);
  static const int maxCacheSize = 100 * 1024 * 1024; // 100MB

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Session
  static const Duration sessionTimeout = Duration(hours: 24);
  static const Duration tokenRefreshThreshold = Duration(minutes: 5);

  // Offline Sync
  static const Duration syncInterval = Duration(minutes: 15);
  static const int maxOfflineQueueSize = 1000;

  // Feature Flags
  static const bool enableVoiceInput = true;
  static const bool enableBiometrics = true;
  static const bool enableOfflineMode = true;
  static const bool enablePushNotifications = true;
  static const bool enableAnalytics = true;

  // Environment
  // Set to true to use production API even in debug mode
  static const bool useProductionApi = true;

  static bool get isProduction => const bool.fromEnvironment('dart.vm.product');
  static String get apiBaseUrl => useProductionApi || isProduction ? baseUrl : devBaseUrl;
  static String get websocketUrl => useProductionApi || isProduction ? wsUrl : devWsUrl;
}
