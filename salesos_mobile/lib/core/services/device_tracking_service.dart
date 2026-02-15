import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../network/api_client.dart';

/// Device type enum matching backend
enum DeviceType {
  mobileIos('MOBILE_IOS'),
  mobileAndroid('MOBILE_ANDROID'),
  tabletIpad('TABLET_IPAD'),
  tabletAndroid('TABLET_ANDROID'),
  desktopWeb('DESKTOP_WEB'),
  unknown('UNKNOWN');

  final String value;
  const DeviceType(this.value);

  static DeviceType fromString(String value) {
    return DeviceType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => DeviceType.unknown,
    );
  }
}

/// Session status enum
enum SessionStatus {
  active('ACTIVE'),
  ended('ENDED'),
  expired('EXPIRED');

  final String value;
  const SessionStatus(this.value);

  static SessionStatus fromString(String value) {
    return SessionStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => SessionStatus.ended,
    );
  }
}

/// Push token type enum matching backend
enum PushTokenType {
  apns('APNS'),
  fcm('FCM');

  final String value;
  const PushTokenType(this.value);
}

/// User device model
class UserDevice {
  final String id;
  final String userId;
  final DeviceType deviceType;
  final String deviceId;
  final String? deviceName;
  final String? deviceModel;
  final String? osVersion;
  final String? appVersion;
  final bool isActive;
  final bool pushEnabled;
  final bool hasPushToken;
  final DateTime lastSeenAt;
  final DateTime createdAt;

  const UserDevice({
    required this.id,
    required this.userId,
    required this.deviceType,
    required this.deviceId,
    this.deviceName,
    this.deviceModel,
    this.osVersion,
    this.appVersion,
    required this.isActive,
    this.pushEnabled = true,
    this.hasPushToken = false,
    required this.lastSeenAt,
    required this.createdAt,
  });

  factory UserDevice.fromJson(Map<String, dynamic> json) {
    return UserDevice(
      id: json['id'] as String,
      userId: json['userId'] as String,
      deviceType: DeviceType.fromString(json['deviceType'] as String),
      deviceId: json['deviceId'] as String,
      deviceName: json['deviceName'] as String?,
      deviceModel: json['deviceModel'] as String?,
      osVersion: json['osVersion'] as String?,
      appVersion: json['appVersion'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      pushEnabled: json['pushEnabled'] as bool? ?? true,
      hasPushToken: json['hasPushToken'] as bool? ?? false,
      lastSeenAt: DateTime.parse(json['lastSeenAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// User session model
class UserSession {
  final String id;
  final String userId;
  final String? deviceId;
  final String sessionToken;
  final SessionStatus status;
  final DateTime startedAt;
  final DateTime? endedAt;
  final DateTime lastActivityAt;
  final int? durationSeconds;
  final int apiCallCount;

  const UserSession({
    required this.id,
    required this.userId,
    this.deviceId,
    required this.sessionToken,
    required this.status,
    required this.startedAt,
    this.endedAt,
    required this.lastActivityAt,
    this.durationSeconds,
    required this.apiCallCount,
  });

  factory UserSession.fromJson(Map<String, dynamic> json) {
    return UserSession(
      id: json['id'] as String,
      userId: json['userId'] as String,
      deviceId: json['deviceId'] as String?,
      sessionToken: json['sessionToken'] as String,
      status: SessionStatus.fromString(json['status'] as String),
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: json['endedAt'] != null
          ? DateTime.parse(json['endedAt'] as String)
          : null,
      lastActivityAt: DateTime.parse(json['lastActivityAt'] as String),
      durationSeconds: json['durationSeconds'] as int?,
      apiCallCount: json['apiCallCount'] as int? ?? 0,
    );
  }
}

/// Device tracking service provider
final deviceTrackingServiceProvider = Provider<DeviceTrackingService>((ref) {
  return DeviceTrackingService(ref.watch(apiClientProvider));
});

/// Current device provider
final currentDeviceProvider = FutureProvider<UserDevice?>((ref) async {
  final service = ref.watch(deviceTrackingServiceProvider);
  return service.getCurrentDevice();
});

/// Current session provider
final currentSessionProvider = FutureProvider<UserSession?>((ref) async {
  final service = ref.watch(deviceTrackingServiceProvider);
  return service.getCurrentSession();
});

/// Device tracking service for managing device registration and sessions
class DeviceTrackingService {
  final ApiClient _apiClient;
  UserDevice? _currentDevice;
  UserSession? _currentSession;
  String? _deviceId;

  DeviceTrackingService(this._apiClient);

  /// Get current registered device
  UserDevice? get currentDevice => _currentDevice;

  /// Get current session
  UserSession? get currentSession => _currentSession;

  /// Get the unique device identifier
  Future<String> _getDeviceId() async {
    if (_deviceId != null) return _deviceId!;

    final deviceInfo = DeviceInfoPlugin();
    if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      _deviceId = iosInfo.identifierForVendor ?? 'unknown-ios';
    } else if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      _deviceId = androidInfo.id;
    } else {
      _deviceId = 'unknown-device';
    }
    return _deviceId!;
  }

  /// Get the device type based on platform and form factor
  Future<DeviceType> getDeviceType() async {
    if (kIsWeb) {
      return DeviceType.desktopWeb;
    }

    final deviceInfo = DeviceInfoPlugin();
    if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      // Check if iPad
      if (iosInfo.model.toLowerCase().contains('ipad')) {
        return DeviceType.tabletIpad;
      }
      return DeviceType.mobileIos;
    } else if (Platform.isAndroid) {
      // For Android, we'll use a simple approach - check screen dimensions
      // via the flutter framework instead of device_info_plus
      // Default to mobile for now, can be enhanced with MediaQuery in widget context
      return DeviceType.mobileAndroid;
    }
    return DeviceType.unknown;
  }

  /// Get device info for registration
  Future<Map<String, dynamic>> _getDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    final packageInfo = await PackageInfo.fromPlatform();
    final deviceId = await _getDeviceId();
    final deviceType = await getDeviceType();

    String? deviceName;
    String? deviceModel;
    String? osVersion;

    if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      deviceName = iosInfo.name;
      deviceModel = iosInfo.model;
      osVersion = '${iosInfo.systemName} ${iosInfo.systemVersion}';
    } else if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      deviceName = androidInfo.model;
      deviceModel = androidInfo.brand;
      osVersion = 'Android ${androidInfo.version.release}';
    }

    return {
      'deviceId': deviceId,
      'deviceType': deviceType.value,
      'deviceName': deviceName,
      'deviceModel': deviceModel,
      'osVersion': osVersion,
      'appVersion': packageInfo.version,
    };
  }

  /// Register or update device with the backend
  Future<UserDevice?> registerDevice() async {
    try {
      final deviceInfo = await _getDeviceInfo();
      final response = await _apiClient.post(
        '/devices/register',
        data: deviceInfo,
      );

      if (response.data != null) {
        _currentDevice = UserDevice.fromJson(response.data);
        return _currentDevice;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Get current device from cached value
  UserDevice? getCurrentDevice() => _currentDevice;

  /// Get user's devices from API
  Future<List<UserDevice>> getUserDevices() async {
    try {
      final response = await _apiClient.get('/devices');
      if (response.data != null && response.data is List) {
        return (response.data as List)
            .map((d) => UserDevice.fromJson(d as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Start a new session
  Future<UserSession?> startSession() async {
    try {
      // Ensure device is registered first
      if (_currentDevice == null) {
        await registerDevice();
      }

      final response = await _apiClient.post(
        '/sessions/start',
        data: {
          'deviceId': _currentDevice?.id,
        },
      );

      if (response.data != null) {
        _currentSession = UserSession.fromJson(response.data);
        return _currentSession;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Get current session from cached value
  UserSession? getCurrentSession() => _currentSession;

  /// Update session activity (heartbeat)
  Future<UserSession?> updateSessionActivity() async {
    if (_currentSession == null) return null;

    try {
      final response = await _apiClient.post(
        '/sessions/${_currentSession!.id}/heartbeat',
      );

      if (response.data != null) {
        _currentSession = UserSession.fromJson(response.data);
        return _currentSession;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// End the current session
  Future<UserSession?> endSession() async {
    if (_currentSession == null) return null;

    try {
      final response = await _apiClient.post(
        '/sessions/${_currentSession!.id}/end',
      );

      UserSession? endedSession;
      if (response.data != null) {
        endedSession = UserSession.fromJson(response.data);
      }
      _currentSession = null;
      return endedSession;
    } catch (e) {
      _currentSession = null;
      return null;
    }
  }

  /// Get active sessions for current user
  Future<List<UserSession>> getActiveSessions() async {
    try {
      final response = await _apiClient.get('/sessions/active');
      if (response.data != null && response.data is List) {
        return (response.data as List)
            .map((s) => UserSession.fromJson(s as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Track feature usage
  Future<void> trackFeatureUsage(String featureKey) async {
    if (_currentDevice == null) return;

    try {
      await _apiClient.post(
        '/usage/track',
        data: {
          'deviceId': _currentDevice!.id,
          'featureKey': featureKey,
        },
      );
    } catch (e) {
      // Silently fail - don't interrupt user experience for tracking
    }
  }

  /// Get feature usage for device
  Future<List<Map<String, dynamic>>> getDeviceFeatureUsage({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    if (_currentDevice == null) return [];

    try {
      final queryParams = <String, String>{};
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }

      final response = await _apiClient.get(
        '/usage/device/${_currentDevice!.id}',
        queryParameters: queryParams,
      );

      if (response.data != null && response.data is List) {
        return (response.data as List).cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Deactivate device
  Future<bool> deactivateDevice(String deviceId) async {
    try {
      await _apiClient.delete('/devices/$deviceId');
      if (_currentDevice?.id == deviceId) {
        _currentDevice = null;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Clear cached data (e.g., on logout)
  void clearCache() {
    _currentDevice = null;
    _currentSession = null;
  }

  // ==================== PUSH NOTIFICATION METHODS ====================

  /// Update push token for the current device
  Future<bool> updatePushToken(String pushToken, PushTokenType tokenType) async {
    try {
      final deviceId = await _getDeviceId();
      final response = await _apiClient.post(
        '/devices/push-token',
        data: {
          'deviceId': deviceId,
          'pushToken': pushToken,
          'pushTokenType': tokenType.value,
        },
      );

      if (response.data != null && response.data['success'] == true) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Update push notification preferences
  Future<bool> updatePushPreferences(bool enabled) async {
    try {
      final deviceId = await _getDeviceId();
      final response = await _apiClient.post(
        '/devices/push-preferences',
        data: {
          'deviceId': deviceId,
          'pushEnabled': enabled,
        },
      );

      if (response.data != null && response.data['success'] == true) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Test push notification
  Future<Map<String, dynamic>?> testPushNotification() async {
    try {
      final response = await _apiClient.post('/devices/test-push');
      return response.data as Map<String, dynamic>?;
    } catch (e) {
      return null;
    }
  }

  /// Get push notification status
  Future<Map<String, dynamic>?> getPushStatus() async {
    try {
      final response = await _apiClient.get('/devices/push-status');
      return response.data as Map<String, dynamic>?;
    } catch (e) {
      return null;
    }
  }

  /// Register device with push token included
  Future<UserDevice?> registerDeviceWithPushToken(String? pushToken, PushTokenType? tokenType) async {
    try {
      final deviceInfo = await _getDeviceInfo();
      if (pushToken != null && tokenType != null) {
        deviceInfo['pushToken'] = pushToken;
        deviceInfo['pushTokenType'] = tokenType.value;
      }

      final response = await _apiClient.post(
        '/devices/register',
        data: deviceInfo,
      );

      if (response.data != null) {
        _currentDevice = UserDevice.fromJson(response.data);
        return _currentDevice;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
