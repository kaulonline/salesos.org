import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart' show Options;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'package:logger/logger.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

import 'package:firebase_crashlytics/firebase_crashlytics.dart';

import '../network/api_client.dart';
import '../providers/connectivity_provider.dart';
import '../services/connectivity_service.dart';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/// Error severity levels for categorization
enum ErrorSeverity {
  /// Non-critical errors that don't affect user experience
  low,

  /// Errors that may affect some functionality
  medium,

  /// Critical errors that significantly impact user experience
  high,

  /// Fatal errors that crash the app
  fatal,
}

/// Breadcrumb categories for contextual logging
enum BreadcrumbCategory {
  /// Navigation events (screen changes, route changes)
  navigation,

  /// User interactions (taps, gestures, form submissions)
  ui,

  /// Network requests and responses
  network,

  /// Data operations (CRUD, sync)
  data,

  /// Authentication events (login, logout, token refresh)
  auth,

  /// App lifecycle events (foreground, background, resume)
  lifecycle,

  /// Custom application events
  custom,
}

/// Constants for error reporting configuration
class _ErrorReportingConfig {
  static const int maxBreadcrumbs = 50;
  static const int maxErrorHistory = 100;
  static const int maxOfflineErrors = 500;
  static const String offlineErrorsBoxName = 'offline_errors';
  static const Duration syncInterval = Duration(minutes: 5);
  static const Duration errorReportTimeout = Duration(seconds: 10);
}

// ============================================================================
// DATA MODELS
// ============================================================================

/// Breadcrumb entry for tracking user actions leading to an error
class Breadcrumb {
  final String message;
  final BreadcrumbCategory category;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  Breadcrumb({
    required this.message,
    required this.category,
    this.metadata,
  }) : timestamp = DateTime.now();

  factory Breadcrumb.fromJson(Map<String, dynamic> json) => Breadcrumb._fromJson(json);

  Breadcrumb._fromJson(Map<String, dynamic> json)
      : message = json['message'] as String,
        category = BreadcrumbCategory.values.firstWhere(
          (e) => e.name == json['category'],
          orElse: () => BreadcrumbCategory.custom,
        ),
        timestamp = DateTime.parse(json['timestamp'] as String),
        metadata = json['metadata'] as Map<String, dynamic>?;

  Map<String, dynamic> toJson() => {
        'message': message,
        'category': category.name,
        'timestamp': timestamp.toIso8601String(),
        if (metadata != null) 'metadata': metadata,
      };
}

/// User context for error reports
class UserContext {
  final String? userId;
  final String? email;
  final Map<String, dynamic>? additionalData;

  const UserContext({
    this.userId,
    this.email,
    this.additionalData,
  });

  bool get isAuthenticated => userId != null;

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'email': email,
        if (additionalData != null) 'additionalData': additionalData,
      };

  UserContext copyWith({
    String? userId,
    String? email,
    Map<String, dynamic>? additionalData,
  }) =>
      UserContext(
        userId: userId ?? this.userId,
        email: email ?? this.email,
        additionalData: additionalData ?? this.additionalData,
      );
}

/// Error context information for better debugging
class ErrorContext {
  final String? screenName;
  final String? action;
  final Map<String, dynamic>? metadata;
  final DateTime timestamp;

  ErrorContext({
    this.screenName,
    this.action,
    this.metadata,
  }) : timestamp = DateTime.now();

  factory ErrorContext.fromJson(Map<String, dynamic> json) => ErrorContext._fromJson(json);

  ErrorContext._fromJson(Map<String, dynamic> json)
      : screenName = json['screenName'] as String?,
        action = json['action'] as String?,
        metadata = json['metadata'] as Map<String, dynamic>?,
        timestamp = DateTime.parse(json['timestamp'] as String);

  Map<String, dynamic> toJson() => {
        'screenName': screenName,
        'action': action,
        'metadata': metadata,
        'timestamp': timestamp.toIso8601String(),
      };
}

/// Device information for error context
class DeviceInfo {
  final String? deviceId;
  final String? deviceModel;
  final String platform;
  final String? osVersion;
  final String? appVersion;
  final String? buildNumber;

  const DeviceInfo({
    this.deviceId,
    this.deviceModel,
    required this.platform,
    this.osVersion,
    this.appVersion,
    this.buildNumber,
  });

  Map<String, dynamic> toJson() => {
        'deviceId': deviceId,
        'deviceModel': deviceModel,
        'platform': platform,
        'osVersion': osVersion,
        'appVersion': appVersion,
        'buildNumber': buildNumber,
      };
}

/// Recorded error entry for history tracking and offline storage
class ErrorRecord {
  final String id;
  final String errorMessage;
  final String? errorType;
  final String? stackTrace;
  final ErrorSeverity severity;
  final ErrorContext? context;
  final UserContext? userContext;
  final DeviceInfo? deviceInfo;
  final List<Breadcrumb> breadcrumbs;
  final DateTime timestamp;
  final bool isFatal;
  final bool isReported;

  ErrorRecord({
    required this.errorMessage,
    this.errorType,
    this.stackTrace,
    required this.severity,
    this.context,
    this.userContext,
    this.deviceInfo,
    List<Breadcrumb>? breadcrumbs,
    this.isFatal = false,
    this.isReported = false,
  })  : id = '${DateTime.now().millisecondsSinceEpoch}_${errorMessage.hashCode.abs()}',
        breadcrumbs = breadcrumbs ?? [],
        timestamp = DateTime.now();

  factory ErrorRecord.fromJson(Map<String, dynamic> json) => ErrorRecord._fromJson(json);

  ErrorRecord._fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        errorMessage = json['errorMessage'] as String,
        errorType = json['errorType'] as String?,
        stackTrace = json['stackTrace'] as String?,
        severity = ErrorSeverity.values.firstWhere(
          (e) => e.name == json['severity'],
          orElse: () => ErrorSeverity.medium,
        ),
        context = json['context'] != null
            ? ErrorContext.fromJson(json['context'] as Map<String, dynamic>)
            : null,
        userContext = json['userContext'] != null
            ? UserContext(
                userId: json['userContext']['userId'] as String?,
                email: json['userContext']['email'] as String?,
                additionalData: json['userContext']['additionalData'] as Map<String, dynamic>?,
              )
            : null,
        deviceInfo = json['deviceInfo'] != null
            ? DeviceInfo(
                deviceId: json['deviceInfo']['deviceId'] as String?,
                deviceModel: json['deviceInfo']['deviceModel'] as String?,
                platform: json['deviceInfo']['platform'] as String? ?? 'unknown',
                osVersion: json['deviceInfo']['osVersion'] as String?,
                appVersion: json['deviceInfo']['appVersion'] as String?,
                buildNumber: json['deviceInfo']['buildNumber'] as String?,
              )
            : null,
        breadcrumbs = (json['breadcrumbs'] as List<dynamic>?)
                ?.map((e) => Breadcrumb.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        timestamp = DateTime.parse(json['timestamp'] as String),
        isFatal = json['isFatal'] as bool? ?? false,
        isReported = json['isReported'] as bool? ?? false;

  Map<String, dynamic> toJson() => {
        'id': id,
        'errorMessage': errorMessage,
        'errorType': errorType,
        'stackTrace': stackTrace,
        'severity': severity.name,
        'context': context?.toJson(),
        'userContext': userContext?.toJson(),
        'deviceInfo': deviceInfo?.toJson(),
        'breadcrumbs': breadcrumbs.map((b) => b.toJson()).toList(),
        'timestamp': timestamp.toIso8601String(),
        'isFatal': isFatal,
        'isReported': isReported,
      };

  ErrorRecord copyWith({bool? isReported}) => ErrorRecord._copyWith(this, isReported: isReported);

  static ErrorRecord _copyWith(ErrorRecord original, {bool? isReported}) {
    final json = original.toJson();
    json['isReported'] = isReported ?? original.isReported;
    return ErrorRecord.fromJson(json);
  }
}

/// Warning record for non-error issues
class WarningRecord {
  final String id;
  final String message;
  final ErrorContext? context;
  final UserContext? userContext;
  final DeviceInfo? deviceInfo;
  final DateTime timestamp;
  final bool isReported;

  WarningRecord({
    required this.message,
    this.context,
    this.userContext,
    this.deviceInfo,
    this.isReported = false,
  })  : id = '${DateTime.now().millisecondsSinceEpoch}_${message.hashCode.abs()}',
        timestamp = DateTime.now();

  factory WarningRecord.fromJson(Map<String, dynamic> json) => WarningRecord._fromJson(json);

  WarningRecord._fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        message = json['message'] as String,
        context = json['context'] != null
            ? ErrorContext.fromJson(json['context'] as Map<String, dynamic>)
            : null,
        userContext = json['userContext'] != null
            ? UserContext(
                userId: json['userContext']['userId'] as String?,
                email: json['userContext']['email'] as String?,
              )
            : null,
        deviceInfo = json['deviceInfo'] != null
            ? DeviceInfo(
                deviceId: json['deviceInfo']['deviceId'] as String?,
                deviceModel: json['deviceInfo']['deviceModel'] as String?,
                platform: json['deviceInfo']['platform'] as String? ?? 'unknown',
                osVersion: json['deviceInfo']['osVersion'] as String?,
                appVersion: json['deviceInfo']['appVersion'] as String?,
                buildNumber: json['deviceInfo']['buildNumber'] as String?,
              )
            : null,
        timestamp = DateTime.parse(json['timestamp'] as String),
        isReported = json['isReported'] as bool? ?? false;

  Map<String, dynamic> toJson() => {
        'id': id,
        'message': message,
        'type': 'warning',
        'context': context?.toJson(),
        'userContext': userContext?.toJson(),
        'deviceInfo': deviceInfo?.toJson(),
        'timestamp': timestamp.toIso8601String(),
        'isReported': isReported,
      };
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for the error reporting service
final errorReportingServiceProvider = Provider<ErrorReportingService>((ref) {
  final service = ErrorReportingService(ref);

  // Listen for connectivity changes to trigger sync
  ref.listen(connectivityStatusProvider, (previous, next) {
    next.whenData((status) {
      if (status == ConnectionStatus.connected) {
        service._syncOfflineErrors();
      }
    });
  });

  ref.onDispose(() {
    service.dispose();
  });

  return service;
});

// ============================================================================
// ERROR REPORTING SERVICE
// ============================================================================

/// Centralized error reporting service for the SalesOS mobile app
///
/// This service provides:
/// - Structured error logging to console
/// - Error categorization by severity
/// - Breadcrumb tracking for context
/// - User context management
/// - Offline error storage with automatic sync
/// - Backend error reporting
/// - Future integration support for Firebase Crashlytics, Sentry, etc.
class ErrorReportingService {
  final Ref _ref;

  final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 5,
      errorMethodCount: 10,
      lineLength: 100,
      colors: true,
      printEmojis: true,
      dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
    ),
  );

  /// Device information for error context
  DeviceInfo? _deviceInfo;

  /// Current user context
  UserContext _userContext = const UserContext();

  /// Current screen name for context
  String? _currentScreenName;

  /// Breadcrumb trail for error context
  final List<Breadcrumb> _breadcrumbs = [];

  /// Error history for debugging (keeps last N errors)
  final List<ErrorRecord> _errorHistory = [];

  /// Hive box for offline error storage
  Box<String>? _offlineErrorsBox;

  /// Timer for periodic sync attempts
  Timer? _syncTimer;

  /// Flag indicating if the service is initialized
  bool _isInitialized = false;

  /// Flag indicating if sync is in progress
  bool _isSyncing = false;

  /// Create an ErrorReportingService instance
  ErrorReportingService(this._ref);

  /// Check if the service is initialized
  bool get isInitialized => _isInitialized;

  /// Get error history for debugging
  List<ErrorRecord> get errorHistory => List.unmodifiable(_errorHistory);

  /// Get current breadcrumbs
  List<Breadcrumb> get breadcrumbs => List.unmodifiable(_breadcrumbs);

  /// Get device info
  DeviceInfo? get deviceInfo => _deviceInfo;

  /// Get user context
  UserContext get userContext => _userContext;

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /// Initialize the error reporting service
  /// Collects device and app information for error context
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Initialize Hive box for offline storage
      await _initializeOfflineStorage();

      // Collect device information
      await _collectDeviceInfo();

      // Set Crashlytics custom keys for device context
      if (_deviceInfo != null) {
        await FirebaseCrashlytics.instance.setCustomKey('device_model', _deviceInfo!.deviceModel ?? 'unknown');
        await FirebaseCrashlytics.instance.setCustomKey('os_version', _deviceInfo!.osVersion ?? 'unknown');
        await FirebaseCrashlytics.instance.setCustomKey('app_version', _deviceInfo!.appVersion ?? 'unknown');
        await FirebaseCrashlytics.instance.setCustomKey('build_number', _deviceInfo!.buildNumber ?? 'unknown');
        await FirebaseCrashlytics.instance.setCustomKey('platform', _deviceInfo!.platform);
      }

      // Start periodic sync timer
      _startSyncTimer();

      _isInitialized = true;
      _logger.i('ErrorReportingService initialized with Firebase Crashlytics');

      if (_deviceInfo != null) {
        _logger.d(
          'Device: ${_deviceInfo!.deviceModel}, '
          'OS: ${_deviceInfo!.osVersion}, '
          'App: ${_deviceInfo!.appVersion}+${_deviceInfo!.buildNumber}',
        );
      }

      // Attempt to sync any offline errors from previous sessions
      _syncOfflineErrors();
    } catch (e, stack) {
      // Don't let initialization errors prevent app from working
      _logger.e('Failed to initialize ErrorReportingService', error: e, stackTrace: stack);
      _isInitialized = true; // Mark as initialized anyway
    }
  }

  Future<void> _initializeOfflineStorage() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final path = '${directory.path}/error_reporting';

      // Ensure directory exists
      final dir = Directory(path);
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }

      // Open Hive box for offline errors
      if (!Hive.isBoxOpen(_ErrorReportingConfig.offlineErrorsBoxName)) {
        _offlineErrorsBox = await Hive.openBox<String>(
          _ErrorReportingConfig.offlineErrorsBoxName,
          path: path,
        );
      } else {
        _offlineErrorsBox = Hive.box<String>(_ErrorReportingConfig.offlineErrorsBoxName);
      }
    } catch (e) {
      _logger.w('Failed to initialize offline storage: $e');
    }
  }

  Future<void> _collectDeviceInfo() async {
    try {
      final deviceInfoPlugin = DeviceInfoPlugin();
      String? deviceId;
      String? deviceModel;
      String? osVersion;
      String platform;

      if (Platform.isIOS) {
        final iosInfo = await deviceInfoPlugin.iosInfo;
        deviceId = iosInfo.identifierForVendor;
        deviceModel = iosInfo.utsname.machine;
        osVersion = 'iOS ${iosInfo.systemVersion}';
        platform = 'ios';
      } else if (Platform.isAndroid) {
        final androidInfo = await deviceInfoPlugin.androidInfo;
        deviceId = androidInfo.id;
        deviceModel = '${androidInfo.manufacturer} ${androidInfo.model}';
        osVersion = 'Android ${androidInfo.version.release}';
        platform = 'android';
      } else {
        platform = Platform.operatingSystem;
      }

      // Collect app information
      final packageInfo = await PackageInfo.fromPlatform();

      _deviceInfo = DeviceInfo(
        deviceId: deviceId,
        deviceModel: deviceModel,
        platform: platform,
        osVersion: osVersion,
        appVersion: packageInfo.version,
        buildNumber: packageInfo.buildNumber,
      );
    } catch (e) {
      _logger.w('Failed to collect device info: $e');
      _deviceInfo = const DeviceInfo(platform: 'unknown');
    }
  }

  void _startSyncTimer() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(_ErrorReportingConfig.syncInterval, (_) {
      _syncOfflineErrors();
    });
  }

  // ==========================================================================
  // USER CONTEXT
  // ==========================================================================

  /// Set the user context for error reports
  ///
  /// Call this when a user logs in or when user information changes
  void setUserContext(String? userId, String? email, {Map<String, dynamic>? additionalData}) {
    _userContext = UserContext(
      userId: userId,
      email: email,
      additionalData: additionalData,
    );

    _logger.d('User context set: ${userId != null ? 'authenticated' : 'anonymous'}');

    // Log breadcrumb for context change
    if (userId != null) {
      logBreadcrumb('User logged in', BreadcrumbCategory.auth);
    }

    // Configure Firebase Crashlytics user context
    if (userId != null) {
      FirebaseCrashlytics.instance.setUserIdentifier(userId);
    }
    if (email != null) {
      FirebaseCrashlytics.instance.setCustomKey('user_email', email);
    }
    if (additionalData != null) {
      for (final entry in additionalData.entries) {
        if (entry.value != null) {
          FirebaseCrashlytics.instance.setCustomKey(entry.key, entry.value.toString());
        }
      }
    }
  }

  /// Clear user context (call on logout)
  void clearUserContext() {
    _userContext = const UserContext();
    _logger.d('User context cleared');
    logBreadcrumb('User logged out', BreadcrumbCategory.auth);

    // Clear Firebase Crashlytics user context
    FirebaseCrashlytics.instance.setUserIdentifier('');
    FirebaseCrashlytics.instance.setCustomKey('user_email', '');
  }

  /// Set the current screen name for error context
  void setCurrentScreen(String screenName) {
    if (_currentScreenName != screenName) {
      _currentScreenName = screenName;
      logBreadcrumb('Navigated to $screenName', BreadcrumbCategory.navigation);
    }
  }

  // ==========================================================================
  // BREADCRUMB TRACKING
  // ==========================================================================

  /// Add a breadcrumb for context tracking
  ///
  /// Breadcrumbs provide a trail of events leading up to an error,
  /// helping with debugging and understanding the user's journey.
  ///
  /// [message] - Description of the action or event
  /// [category] - Category of the breadcrumb for filtering
  /// [metadata] - Optional additional data about the event
  void logBreadcrumb(
    String message,
    BreadcrumbCategory category, {
    Map<String, dynamic>? metadata,
  }) {
    final breadcrumb = Breadcrumb(
      message: message,
      category: category,
      metadata: metadata,
    );

    _breadcrumbs.add(breadcrumb);

    // Keep only the last N breadcrumbs
    while (_breadcrumbs.length > _ErrorReportingConfig.maxBreadcrumbs) {
      _breadcrumbs.removeAt(0);
    }

    // Log to console in debug mode
    if (kDebugMode) {
      _logger.t('Breadcrumb [${category.name}]: $message');
    }

    // Add breadcrumb to Firebase Crashlytics
    FirebaseCrashlytics.instance.log('[${category.name}] $message');
  }

  /// Clear all breadcrumbs (useful after handling an error)
  void clearBreadcrumbs() {
    _breadcrumbs.clear();
    _logger.d('Breadcrumbs cleared');
  }

  // ==========================================================================
  // ERROR REPORTING
  // ==========================================================================

  /// Report an error with optional context
  ///
  /// [error] - The error or exception that occurred
  /// [stackTrace] - The stack trace (if available)
  /// [severity] - The severity level of the error
  /// [context] - Additional context about where/why the error occurred
  Future<void> reportError(
    dynamic error, {
    StackTrace? stackTrace,
    ErrorSeverity severity = ErrorSeverity.medium,
    ErrorContext? context,
    bool isFatal = false,
  }) async {
    // Create error record
    final effectiveContext = context ??
        ErrorContext(
          screenName: _currentScreenName,
        );

    final record = ErrorRecord(
      errorMessage: error.toString(),
      errorType: error.runtimeType.toString(),
      stackTrace: stackTrace?.toString(),
      severity: isFatal ? ErrorSeverity.fatal : severity,
      context: effectiveContext,
      userContext: _userContext,
      deviceInfo: _deviceInfo,
      breadcrumbs: List.from(_breadcrumbs),
      isFatal: isFatal,
    );

    // Add to history
    _addToHistory(record);

    // Log to console based on severity
    _logError(record);

    // Send to backend or store offline
    await _reportToBackend(record);

    // Report to Firebase Crashlytics
    await FirebaseCrashlytics.instance.setCustomKey('severity', severity.name);
    await FirebaseCrashlytics.instance.setCustomKey('is_fatal', isFatal.toString());
    if (effectiveContext.screenName != null) {
      await FirebaseCrashlytics.instance.setCustomKey('screen', effectiveContext.screenName!);
    }
    if (effectiveContext.action != null) {
      await FirebaseCrashlytics.instance.setCustomKey('action', effectiveContext.action!);
    }

    await FirebaseCrashlytics.instance.recordError(
      error,
      stackTrace,
      reason: effectiveContext.action ?? 'Error in ${effectiveContext.screenName ?? "app"}',
      fatal: isFatal,
    );
  }

  /// Report a Flutter framework error
  void reportFlutterError(FlutterErrorDetails details) {
    final context = ErrorContext(
      screenName: _currentScreenName,
      action: 'Flutter framework error',
      metadata: {
        'library': details.library,
        'context': details.context?.toString(),
        'informationCollector': details.informationCollector?.call().join('\n'),
      },
    );

    reportError(
      details.exception,
      stackTrace: details.stack,
      severity: ErrorSeverity.high,
      context: context,
    );
  }

  /// Report an uncaught async error
  void reportAsyncError(Object error, StackTrace stackTrace) {
    final context = ErrorContext(
      screenName: _currentScreenName,
      action: 'Uncaught async error',
    );

    reportError(
      error,
      stackTrace: stackTrace,
      severity: ErrorSeverity.fatal,
      context: context,
      isFatal: true,
    );
  }

  // ==========================================================================
  // WARNING REPORTING
  // ==========================================================================

  /// Report a warning (non-fatal issue that should be tracked)
  ///
  /// Use this for issues that don't crash the app but should be monitored,
  /// such as deprecated API usage, slow operations, or data inconsistencies.
  Future<void> reportWarning(
    String message, {
    ErrorContext? context,
    Map<String, dynamic>? metadata,
  }) async {
    final effectiveContext = context ??
        ErrorContext(
          screenName: _currentScreenName,
          metadata: metadata,
        );

    final warning = WarningRecord(
      message: message,
      context: effectiveContext,
      userContext: _userContext,
      deviceInfo: _deviceInfo,
    );

    // Log to console
    _logger.w('Warning: $message');
    if (metadata != null) {
      _logger.d('Warning metadata: $metadata');
    }

    // Send to backend or store offline
    await _reportWarningToBackend(warning);

    // Log warning to Firebase Crashlytics
    FirebaseCrashlytics.instance.log('WARNING: $message');
    if (effectiveContext.screenName != null) {
      FirebaseCrashlytics.instance.log('Screen: ${effectiveContext.screenName}');
    }
  }

  // ==========================================================================
  // LOGGING METHODS (Local only, no backend reporting)
  // ==========================================================================

  /// Log a warning (local only, not sent to backend)
  void logWarning(String message, {Map<String, dynamic>? metadata}) {
    _logger.w(message);
    if (metadata != null) {
      _logger.d('Warning metadata: $metadata');
    }
  }

  /// Log an info message
  void logInfo(String message, {Map<String, dynamic>? metadata}) {
    _logger.i(message);
  }

  /// Log a debug message (only in debug mode)
  void logDebug(String message, {Map<String, dynamic>? metadata}) {
    if (kDebugMode) {
      _logger.d(message);
    }
  }

  // ==========================================================================
  // BACKEND REPORTING & OFFLINE SYNC
  // ==========================================================================

  Future<void> _reportToBackend(ErrorRecord record) async {
    final isOnline = _isOnline();

    if (isOnline) {
      try {
        final apiClient = _ref.read(apiClientProvider);
        await apiClient.post(
          '/errors',
          data: record.toJson(),
          options: Options(
            sendTimeout: _ErrorReportingConfig.errorReportTimeout,
            receiveTimeout: _ErrorReportingConfig.errorReportTimeout,
          ),
        );

        _logger.d('Error reported to backend: ${record.id}');
      } catch (e) {
        // Failed to report, store offline
        _logger.w('Failed to report error to backend, storing offline: $e');
        await _storeErrorOffline(record);
      }
    } else {
      // Offline, store for later
      await _storeErrorOffline(record);
    }
  }

  Future<void> _reportWarningToBackend(WarningRecord warning) async {
    final isOnline = _isOnline();

    if (isOnline) {
      try {
        final apiClient = _ref.read(apiClientProvider);
        await apiClient.post(
          '/errors',
          data: warning.toJson(),
          options: Options(
            sendTimeout: _ErrorReportingConfig.errorReportTimeout,
            receiveTimeout: _ErrorReportingConfig.errorReportTimeout,
          ),
        );

        _logger.d('Warning reported to backend: ${warning.id}');
      } catch (e) {
        // Failed to report, store offline
        _logger.w('Failed to report warning to backend: $e');
        await _storeWarningOffline(warning);
      }
    } else {
      // Offline, store for later
      await _storeWarningOffline(warning);
    }
  }

  Future<void> _storeErrorOffline(ErrorRecord record) async {
    try {
      if (_offlineErrorsBox == null) {
        await _initializeOfflineStorage();
      }

      if (_offlineErrorsBox != null) {
        // Limit offline storage size
        if (_offlineErrorsBox!.length >= _ErrorReportingConfig.maxOfflineErrors) {
          // Remove oldest entries
          final keysToRemove = _offlineErrorsBox!.keys.take(10).toList();
          for (final key in keysToRemove) {
            await _offlineErrorsBox!.delete(key);
          }
        }

        await _offlineErrorsBox!.put(
          'error_${record.id}',
          jsonEncode(record.toJson()),
        );
        _logger.d('Error stored offline: ${record.id}');
      }
    } catch (e) {
      _logger.e('Failed to store error offline: $e');
    }
  }

  Future<void> _storeWarningOffline(WarningRecord warning) async {
    try {
      if (_offlineErrorsBox == null) {
        await _initializeOfflineStorage();
      }

      if (_offlineErrorsBox != null) {
        await _offlineErrorsBox!.put(
          'warning_${warning.id}',
          jsonEncode(warning.toJson()),
        );
        _logger.d('Warning stored offline: ${warning.id}');
      }
    } catch (e) {
      _logger.e('Failed to store warning offline: $e');
    }
  }

  Future<void> _syncOfflineErrors() async {
    if (_isSyncing || !_isOnline()) return;

    _isSyncing = true;

    try {
      if (_offlineErrorsBox == null || _offlineErrorsBox!.isEmpty) {
        return;
      }

      _logger.i('Syncing ${_offlineErrorsBox!.length} offline errors to backend');

      final apiClient = _ref.read(apiClientProvider);
      final keysToRemove = <dynamic>[];

      for (final key in _offlineErrorsBox!.keys) {
        try {
          final jsonStr = _offlineErrorsBox!.get(key);
          if (jsonStr == null) continue;

          final data = jsonDecode(jsonStr) as Map<String, dynamic>;

          await apiClient.post(
            '/errors',
            data: data,
            options: Options(
              sendTimeout: _ErrorReportingConfig.errorReportTimeout,
              receiveTimeout: _ErrorReportingConfig.errorReportTimeout,
            ),
          );

          keysToRemove.add(key);
        } catch (e) {
          _logger.w('Failed to sync offline error $key: $e');
          // Continue with other errors
        }
      }

      // Remove successfully synced errors
      for (final key in keysToRemove) {
        await _offlineErrorsBox!.delete(key);
      }

      if (keysToRemove.isNotEmpty) {
        _logger.i('Synced ${keysToRemove.length} errors to backend');
      }
    } catch (e) {
      _logger.e('Error during offline sync: $e');
    } finally {
      _isSyncing = false;
    }
  }

  bool _isOnline() {
    try {
      final connectivityService = _ref.read(connectivityServiceProvider);
      return connectivityService.isConnected;
    } catch (e) {
      // If we can't determine connectivity, assume online
      return true;
    }
  }

  // ==========================================================================
  // HISTORY MANAGEMENT
  // ==========================================================================

  void _addToHistory(ErrorRecord record) {
    _errorHistory.insert(0, record);
    while (_errorHistory.length > _ErrorReportingConfig.maxErrorHistory) {
      _errorHistory.removeLast();
    }
  }

  void _logError(ErrorRecord record) {
    final contextInfo = record.context != null
        ? '\nContext: screen=${record.context!.screenName}, action=${record.context!.action}'
        : '';

    switch (record.severity) {
      case ErrorSeverity.low:
        _logger.d('Low severity error: ${record.errorMessage}$contextInfo');
        break;
      case ErrorSeverity.medium:
        _logger.w('Medium severity error: ${record.errorMessage}$contextInfo');
        if (record.stackTrace != null && kDebugMode) {
          _logger.w(record.stackTrace!);
        }
        break;
      case ErrorSeverity.high:
        _logger.e('High severity error: ${record.errorMessage}$contextInfo');
        if (record.stackTrace != null) {
          _logger.e(record.stackTrace!);
        }
        break;
      case ErrorSeverity.fatal:
        _logger.f('FATAL ERROR: ${record.errorMessage}$contextInfo');
        if (record.stackTrace != null) {
          _logger.f(record.stackTrace!);
        }
        break;
    }
  }

  /// Clear error history (useful for testing or cleanup)
  void clearHistory() {
    _errorHistory.clear();
    _logger.d('Error history cleared');
  }

  // ==========================================================================
  // DIAGNOSTIC METHODS
  // ==========================================================================

  /// Get a summary of recent errors for debugging
  Map<String, dynamic> getErrorSummary() {
    final now = DateTime.now();
    final last24Hours = now.subtract(const Duration(hours: 24));

    final recentErrors = _errorHistory.where((e) => e.timestamp.isAfter(last24Hours)).toList();

    return {
      'deviceInfo': _deviceInfo?.toJson(),
      'userContext': {
        'isAuthenticated': _userContext.isAuthenticated,
        'userId': _userContext.userId,
      },
      'totalErrors': _errorHistory.length,
      'errorsLast24Hours': recentErrors.length,
      'offlineErrorsCount': _offlineErrorsBox?.length ?? 0,
      'breadcrumbsCount': _breadcrumbs.length,
      'errorsBySeverity': {
        'fatal': recentErrors.where((e) => e.severity == ErrorSeverity.fatal).length,
        'high': recentErrors.where((e) => e.severity == ErrorSeverity.high).length,
        'medium': recentErrors.where((e) => e.severity == ErrorSeverity.medium).length,
        'low': recentErrors.where((e) => e.severity == ErrorSeverity.low).length,
      },
      'recentErrors': recentErrors.take(10).map((e) => e.toJson()).toList(),
      'recentBreadcrumbs': _breadcrumbs.reversed.take(10).map((b) => b.toJson()).toList(),
    };
  }

  /// Get the count of offline errors pending sync
  int get pendingOfflineErrorsCount => _offlineErrorsBox?.length ?? 0;

  /// Force sync offline errors (call manually if needed)
  Future<void> forceSyncOfflineErrors() async {
    await _syncOfflineErrors();
  }

  // ==========================================================================
  // DISPOSAL
  // ==========================================================================

  /// Dispose resources
  void dispose() {
    _syncTimer?.cancel();
    _errorHistory.clear();
    _breadcrumbs.clear();
    _offlineErrorsBox?.close();
    _logger.i('ErrorReportingService disposed');
  }
}

