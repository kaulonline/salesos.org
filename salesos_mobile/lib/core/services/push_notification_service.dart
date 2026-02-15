import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'device_tracking_service.dart';
import 'notification_service.dart';

/// Provider for push notification service
final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(
    ref.watch(deviceTrackingServiceProvider),
    ref.watch(notificationServiceProvider),
  );
});

/// Callback for handling notification tap navigation
typedef NotificationTapCallback = void Function(NotificationPayload payload);

/// Parsed notification payload for deep linking
class NotificationPayload {
  final String? notificationId;
  final String? type;
  final String? action;
  final String? entityType;
  final String? salesforceRecordId;
  final String? source;
  // Local DB record IDs
  final String? opportunityId;
  final String? leadId;
  final String? accountId;
  final String? contactId;
  final String? taskId;
  final String? quoteId;
  final String? contractId;
  final Map<String, dynamic> raw;

  NotificationPayload({
    this.notificationId,
    this.type,
    this.action,
    this.entityType,
    this.salesforceRecordId,
    this.source,
    this.opportunityId,
    this.leadId,
    this.accountId,
    this.contactId,
    this.taskId,
    this.quoteId,
    this.contractId,
    required this.raw,
  });

  factory NotificationPayload.fromMap(Map<String, dynamic> map) {
    // Record IDs are spread at root level of push payload (not nested in actionData)
    // The backend spreads actionData fields into the root of the push data
    return NotificationPayload(
      notificationId: map['notificationId'] as String?,
      type: map['type'] as String?,
      action: map['action'] as String?,
      entityType: map['entityType'] as String?,
      salesforceRecordId: map['salesforceRecordId'] as String?,
      source: map['source'] as String?,
      // Local DB record IDs (spread at root level by backend)
      opportunityId: map['opportunityId'] as String?,
      leadId: map['leadId'] as String?,
      accountId: map['accountId'] as String?,
      contactId: map['contactId'] as String?,
      taskId: map['taskId'] as String?,
      quoteId: map['quoteId'] as String?,
      contractId: map['contractId'] as String?,
      raw: map,
    );
  }

  /// Get the record ID for the current entity type
  String? get recordId {
    return opportunityId ?? leadId ?? accountId ?? contactId ??
           taskId ?? quoteId ?? contractId ?? salesforceRecordId;
  }

  /// Check if this is a Salesforce-related notification
  bool get isSalesforceNotification => source == 'salesforce_cdc';

  /// Get the route to navigate to based on action/entityType
  /// Returns detail page route if record ID is available, otherwise list page
  String? get targetRoute {
    String? baseRoute;
    String? id;

    switch (action) {
      // Salesforce CDC actions - use salesforceRecordId for detail pages
      case 'VIEW_SALESFORCE_LEAD':
        baseRoute = '/leads';
        id = salesforceRecordId;
        break;
      case 'VIEW_SALESFORCE_OPPORTUNITY':
        baseRoute = '/deals';
        id = salesforceRecordId;
        break;
      case 'VIEW_SALESFORCE_ACCOUNT':
        baseRoute = '/accounts';
        id = salesforceRecordId;
        break;
      case 'VIEW_SALESFORCE_CONTACT':
        baseRoute = '/contacts';
        id = salesforceRecordId;
        break;
      case 'VIEW_SALESFORCE_CAMPAIGN':
        baseRoute = '/campaigns';
        id = salesforceRecordId;
        break;

      // Local IRIS DB actions - use specific record IDs
      case 'VIEW_OPPORTUNITY':
        baseRoute = '/deals';
        id = opportunityId;
        break;
      case 'VIEW_LEAD':
        baseRoute = '/leads';
        id = leadId;
        break;
      case 'VIEW_ACCOUNT':
        baseRoute = '/accounts';
        id = accountId;
        break;
      case 'VIEW_CONTACT':
        baseRoute = '/contacts';
        id = contactId;
        break;
      case 'VIEW_TASK':
        baseRoute = '/tasks';
        id = taskId;
        break;
      case 'VIEW_QUOTE':
        baseRoute = '/quotes';
        id = quoteId;
        break;
      case 'VIEW_CONTRACT':
        baseRoute = '/contracts';
        id = contractId;
        break;

      default:
        // Fallback based on entityType
        switch (entityType) {
          case 'Lead':
            baseRoute = '/leads';
            id = leadId ?? salesforceRecordId;
            break;
          case 'Opportunity':
            baseRoute = '/deals';
            id = opportunityId ?? salesforceRecordId;
            break;
          case 'Account':
            baseRoute = '/accounts';
            id = accountId ?? salesforceRecordId;
            break;
          case 'Contact':
            baseRoute = '/contacts';
            id = contactId ?? salesforceRecordId;
            break;
          case 'Campaign':
            baseRoute = '/campaigns';
            id = salesforceRecordId;
            break;
          case 'Task':
            baseRoute = '/tasks';
            id = taskId;
            break;
          case 'Quote':
            baseRoute = '/quotes';
            id = quoteId;
            break;
          case 'Contract':
            baseRoute = '/contracts';
            id = contractId;
            break;
        }
    }

    if (baseRoute == null) return null;

    // Return detail route if ID is available, otherwise list route
    return id != null ? '$baseRoute/$id' : baseRoute;
  }
}

/// Service for handling remote push notifications (APNs/FCM)
class PushNotificationService {
  final DeviceTrackingService _deviceTrackingService;
  final NotificationService _notificationService;
  final Logger _logger = Logger();

  // Method channel for native iOS APNs communication
  static const MethodChannel _channel = MethodChannel('com.salesos.mobile/push');

  String? _apnsToken;
  bool _initialized = false;

  // Callback for notification tap navigation
  NotificationTapCallback? _onNotificationTapped;

  PushNotificationService(
    this._deviceTrackingService,
    this._notificationService,
  );

  /// Get current APNs token
  String? get apnsToken => _apnsToken;

  /// Check if push notifications are initialized
  bool get isInitialized => _initialized;

  /// Initialize push notification service
  /// [onNotificationTapped] - callback for handling notification tap navigation
  Future<void> initialize({NotificationTapCallback? onNotificationTapped}) async {
    if (_initialized) return;

    _onNotificationTapped = onNotificationTapped;

    try {
      // Initialize local notifications first
      await _notificationService.initialize();

      if (Platform.isIOS) {
        // Set up method channel handler for APNs token updates and notification taps
        _channel.setMethodCallHandler(_handleMethodCall);

        // Request APNs token
        await _requestAPNsToken();

        // Check for pending notification from cold start
        await _checkPendingNotification();
      } else if (Platform.isAndroid) {
        // For Android, we would integrate Firebase Cloud Messaging here
        // Currently not implemented - can be added later
        _logger.i('Android push notifications not yet implemented');
      }

      _initialized = true;
      _logger.i('Push notification service initialized');
    } catch (e) {
      _logger.e('Failed to initialize push notification service: $e');
    }
  }

  /// Check for pending notification from cold start
  Future<void> _checkPendingNotification() async {
    try {
      final pending = await _channel.invokeMethod<Map<dynamic, dynamic>>('getPendingNotification');
      if (pending != null) {
        _logger.i('Found pending notification from cold start');
        final payload = NotificationPayload.fromMap(pending.cast<String, dynamic>());
        _onNotificationTapped?.call(payload);
      }
    } catch (e) {
      _logger.e('Failed to check pending notification: $e');
    }
  }

  /// Set notification tap callback (can be called after initialization)
  void setNotificationTapCallback(NotificationTapCallback callback) {
    _onNotificationTapped = callback;
  }

  /// Handle method calls from native code
  Future<dynamic> _handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'onAPNsTokenReceived':
        final token = call.arguments as String?;
        if (token != null) {
          await _handleAPNsToken(token);
        }
        break;
      case 'onAPNsTokenFailed':
        final error = call.arguments as String?;
        _logger.e('APNs token registration failed: $error');
        break;
      case 'onRemoteNotificationReceived':
        final payload = call.arguments as Map<dynamic, dynamic>?;
        if (payload != null) {
          await _handleRemoteNotification(payload.cast<String, dynamic>());
        }
        break;
      case 'onNotificationTapped':
        final payload = call.arguments as Map<dynamic, dynamic>?;
        if (payload != null) {
          _logger.i('Notification tapped: $payload');
          final notificationPayload = NotificationPayload.fromMap(payload.cast<String, dynamic>());
          _onNotificationTapped?.call(notificationPayload);
        }
        break;
      default:
        _logger.w('Unknown method call: ${call.method}');
    }
  }

  /// Request APNs token from iOS
  Future<void> _requestAPNsToken() async {
    if (!Platform.isIOS) return;

    try {
      // Request permission first
      final granted = await _notificationService.requestPermissions();
      if (!granted) {
        _logger.w('Notification permissions not granted');
        return;
      }

      // Request APNs token via method channel
      final token = await _channel.invokeMethod<String>('requestAPNsToken');
      if (token != null) {
        await _handleAPNsToken(token);
      }
    } on PlatformException catch (e) {
      _logger.e('Failed to request APNs token: ${e.message}');
    }
  }

  /// Handle received APNs token
  Future<void> _handleAPNsToken(String token) async {
    _apnsToken = token;
    _logger.i('Received APNs token: ${token.substring(0, 16)}...');

    // Register token with backend
    final success = await _deviceTrackingService.updatePushToken(
      token,
      PushTokenType.apns,
    );

    if (success) {
      _logger.i('APNs token registered with backend');
    } else {
      _logger.e('Failed to register APNs token with backend');
    }
  }

  /// Handle received remote notification
  Future<void> _handleRemoteNotification(Map<String, dynamic> payload) async {
    _logger.d('Remote notification received: $payload');

    // Extract notification data
    final aps = payload['aps'] as Map<String, dynamic>?;
    if (aps == null) return;

    final alert = aps['alert'];
    String? title;
    String? body;

    if (alert is Map) {
      title = alert['title'] as String?;
      body = alert['body'] as String?;
    } else if (alert is String) {
      body = alert;
    }

    // Show local notification if app is in foreground
    if (title != null || body != null) {
      await _notificationService.showNotification(
        title: title ?? 'SalesOS',
        body: body ?? '',
        payload: payload.toString(),
      );
    }
  }

  /// Refresh APNs token (call after user login)
  Future<void> refreshToken() async {
    if (!Platform.isIOS) return;

    try {
      await _requestAPNsToken();
    } catch (e) {
      _logger.e('Failed to refresh APNs token: $e');
    }
  }

  /// Update push notification preferences
  Future<bool> updatePreferences(bool enabled) async {
    return _deviceTrackingService.updatePushPreferences(enabled);
  }

  /// Test push notification
  Future<bool> testPush() async {
    final result = await _deviceTrackingService.testPushNotification();
    return result?['success'] == true;
  }

  /// Get push status from backend
  Future<Map<String, dynamic>?> getStatus() async {
    return _deviceTrackingService.getPushStatus();
  }

  /// Clear push token (call on logout)
  Future<void> clearToken() async {
    _apnsToken = null;
    // The backend will handle token invalidation when the device is deactivated
  }
}
