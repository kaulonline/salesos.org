import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import 'preferences_service.dart';

/// Notification channels for Android
class NotificationChannels {
  static const String general = 'iris_general';
  static const String deals = 'iris_deals';
  static const String tasks = 'iris_tasks';
  static const String aiInsights = 'iris_ai_insights';
  static const String reminders = 'iris_reminders';
}

/// Local notification service
class NotificationService {
  final Logger _logger = Logger();
  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  final Ref? _ref;

  bool _initialized = false;
  Function(String?)? _onNotificationTapped;

  NotificationService([this._ref]);

  /// Check if push notifications are enabled in user preferences
  bool get _pushEnabled {
    if (_ref == null) return true; // Default to enabled if no ref
    try {
      final prefs = _ref.read(userPreferencesProvider);
      return prefs.pushNotifications;
    } catch (e) {
      return true; // Default to enabled on error
    }
  }

  /// Get user's timezone preference
  tz.Location get _userTimezone {
    if (_ref == null) return tz.local;
    try {
      final prefs = _ref.read(userPreferencesProvider);
      // Map app timezone to tz database location
      switch (prefs.timezone) {
        case AppTimezone.pst:
          return tz.getLocation('America/Los_Angeles');
        case AppTimezone.mst:
          return tz.getLocation('America/Denver');
        case AppTimezone.cst:
          return tz.getLocation('America/Chicago');
        case AppTimezone.est:
          return tz.getLocation('America/New_York');
        case AppTimezone.utc:
          return tz.UTC;
      }
    } catch (e) {
      return tz.local;
    }
  }

  /// Initialize notification service
  Future<void> initialize({Function(String?)? onNotificationTapped}) async {
    if (_initialized) return;

    _onNotificationTapped = onNotificationTapped;

    // Android settings
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    // Initialize timezone
    tz.initializeTimeZones();

    // iOS settings
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    final settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
      onDidReceiveBackgroundNotificationResponse: _onBackgroundNotificationResponse,
    );

    // Create Android notification channels
    if (Platform.isAndroid) {
      await _createNotificationChannels();
    }

    _initialized = true;
    _logger.i('Notification service initialized');
  }

  Future<void> _createNotificationChannels() async {
    final androidPlugin =
        _notifications.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin == null) return;

    // General notifications
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        NotificationChannels.general,
        'General',
        description: 'General notifications from SalesOS',
        importance: Importance.defaultImportance,
      ),
    );

    // Deal notifications
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        NotificationChannels.deals,
        'Deals',
        description: 'Deal updates and alerts',
        importance: Importance.high,
      ),
    );

    // Task notifications
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        NotificationChannels.tasks,
        'Tasks',
        description: 'Task reminders and updates',
        importance: Importance.high,
      ),
    );

    // AI Insights notifications
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        NotificationChannels.aiInsights,
        'AI Insights',
        description: 'AI-powered insights and recommendations',
        importance: Importance.defaultImportance,
      ),
    );

    // Reminder notifications
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        NotificationChannels.reminders,
        'Reminders',
        description: 'Scheduled reminders',
        importance: Importance.high,
        enableVibration: true,
        playSound: true,
      ),
    );
  }

  void _onNotificationResponse(NotificationResponse response) {
    _logger.d('Notification tapped: ${response.payload}');
    _onNotificationTapped?.call(response.payload);
  }

  @pragma('vm:entry-point')
  static void _onBackgroundNotificationResponse(NotificationResponse response) {
    // Handle background notification tap
  }

  /// Request notification permissions
  Future<bool> requestPermissions() async {
    if (Platform.isIOS) {
      final iosPlugin = _notifications.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final granted = await iosPlugin?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    } else if (Platform.isAndroid) {
      final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      final granted = await androidPlugin?.requestNotificationsPermission();
      return granted ?? false;
    }
    return false;
  }

  /// Show a general notification
  Future<void> showNotification({
    required String title,
    required String body,
    String? payload,
    int? id,
  }) async {
    if (!_pushEnabled) {
      _logger.d('Push notifications disabled, skipping: $title');
      return;
    }
    await _notifications.show(
      id: id ?? DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          NotificationChannels.general,
          'General',
          importance: Importance.defaultImportance,
          priority: Priority.defaultPriority,
          icon: '@mipmap/ic_launcher',
          color: const Color(0xFFC9A882),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  /// Show a deal notification
  Future<void> showDealNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_pushEnabled) {
      _logger.d('Push notifications disabled, skipping deal: $title');
      return;
    }
    await _notifications.show(
      id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          NotificationChannels.deals,
          'Deals',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          color: const Color(0xFFC9A882),
          category: AndroidNotificationCategory.status,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  /// Show a task notification
  Future<void> showTaskNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_pushEnabled) {
      _logger.d('Push notifications disabled, skipping task: $title');
      return;
    }
    await _notifications.show(
      id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          NotificationChannels.tasks,
          'Tasks',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          color: const Color(0xFFC9A882),
          category: AndroidNotificationCategory.reminder,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  /// Show an AI insight notification
  Future<void> showAIInsightNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_pushEnabled) {
      _logger.d('Push notifications disabled, skipping AI insight: $title');
      return;
    }
    await _notifications.show(
      id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          NotificationChannels.aiInsights,
          'AI Insights',
          importance: Importance.defaultImportance,
          priority: Priority.defaultPriority,
          icon: '@mipmap/ic_launcher',
          color: const Color(0xFFC9A882),
          styleInformation: BigTextStyleInformation(body),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  /// Schedule a notification
  Future<void> scheduleNotification({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledDate,
    String? payload,
  }) async {
    if (!_pushEnabled) {
      _logger.d('Push notifications disabled, skipping scheduled: $title');
      return;
    }
    await _notifications.zonedSchedule(
      id: id,
      title: title,
      body: body,
      scheduledDate: tz.TZDateTime.from(scheduledDate, _userTimezone),
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          NotificationChannels.reminders,
          'Reminders',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          color: const Color(0xFFC9A882),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      payload: payload,
    );
  }

  /// Cancel a notification
  Future<void> cancelNotification(int id) async {
    await _notifications.cancel(id: id);
  }

  /// Cancel all notifications
  Future<void> cancelAllNotifications() async {
    await _notifications.cancelAll();
  }

  /// Get pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return _notifications.pendingNotificationRequests();
  }
}

/// Notification service provider
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref);
});
