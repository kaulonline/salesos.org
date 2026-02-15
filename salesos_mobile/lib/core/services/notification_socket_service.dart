import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';
import 'notification_service.dart';

/// Connection state for notification socket
enum NotificationSocketState { disconnected, connecting, connected, error }

/// Notification model from server
class PushNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final String priority;
  final String? action;
  final Map<String, dynamic>? actionData;
  final DateTime createdAt;

  PushNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.priority,
    this.action,
    this.actionData,
    required this.createdAt,
  });

  factory PushNotification.fromJson(Map<String, dynamic> json) {
    return PushNotification(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Notification',
      body: json['body'] ?? '',
      type: json['type'] ?? 'CUSTOM',
      priority: json['priority'] ?? 'NORMAL',
      action: json['action'],
      actionData: json['actionData'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'].toString())
          : DateTime.now(),
    );
  }
}

/// Socket.IO based notification service for real-time push notifications
class NotificationSocketService {
  final Logger _logger = Logger();
  final NotificationService _notificationService;

  io.Socket? _socket;
  String? _authToken;
  NotificationSocketState _state = NotificationSocketState.disconnected;

  // Stream controllers
  final _stateController = StreamController<NotificationSocketState>.broadcast();
  final _notificationController = StreamController<PushNotification>.broadcast();
  final _pendingNotificationsController = StreamController<List<PushNotification>>.broadcast();

  Stream<NotificationSocketState> get stateStream => _stateController.stream;
  Stream<PushNotification> get notificationStream => _notificationController.stream;
  Stream<List<PushNotification>> get pendingNotificationsStream => _pendingNotificationsController.stream;
  NotificationSocketState get state => _state;

  NotificationSocketService(this._notificationService);

  /// Connect to the notifications namespace
  Future<void> connect(String authToken) async {
    _logger.i('NotificationSocketService.connect() called');
    _logger.i('Token received (first 20 chars): ${authToken.substring(0, authToken.length > 20 ? 20 : authToken.length)}...');
    _authToken = authToken;
    await _connect();
  }

  Future<void> _connect() async {
    // Prevent duplicate connections
    if (_state == NotificationSocketState.connecting) {
      _logger.w('Already connecting, skipping duplicate connect call');
      return;
    }
    if (_state == NotificationSocketState.connected && _socket != null) {
      _logger.w('Already connected, skipping duplicate connect call');
      return;
    }

    // Clean up existing socket if any
    if (_socket != null) {
      _logger.i('Cleaning up existing socket before reconnecting');
      _socket!.dispose();
      _socket = null;
    }

    _updateState(NotificationSocketState.connecting);
    _logger.i('Connecting to Notifications Socket.IO...');

    try {
      // Build the Socket.IO URL - use websocket URL but convert to https for Socket.IO
      // Socket.IO handles the WebSocket upgrade automatically
      // The namespace /notifications is appended to the URL
      String baseUrl = AppConfig.websocketUrl;

      // Convert wss:// to https:// for Socket.IO (it handles the upgrade)
      if (baseUrl.startsWith('wss://')) {
        baseUrl = baseUrl.replaceFirst('wss://', 'https://');
      } else if (baseUrl.startsWith('ws://')) {
        baseUrl = baseUrl.replaceFirst('ws://', 'http://');
      }

      _logger.i('Socket.IO Base URL: $baseUrl');
      _logger.i('Socket.IO Full URL: $baseUrl/notifications');
      _logger.i('Socket.IO Path: /socket.io/');
      _logger.i('Socket.IO Transports: websocket, polling');

      _socket = io.io(
        '$baseUrl/notifications',  // URL with namespace appended
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setPath('/socket.io/')  // Default Socket.IO path
            .setQuery({'token': _authToken})
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(5)
            .setReconnectionDelay(2000)
            .setReconnectionDelayMax(10000)
            .build(),
      );

      _setupEventListeners();

      _socket!.connect();
    } catch (e) {
      _logger.e('Socket.IO connection failed: $e');
      _updateState(NotificationSocketState.error);
    }
  }

  void _setupEventListeners() {
    if (_socket == null) return;

    // Connection events
    _socket!.onConnect((_) {
      _logger.i('Notifications Socket.IO connected');
      _updateState(NotificationSocketState.connected);
    });

    _socket!.onDisconnect((_) {
      _logger.w('Notifications Socket.IO disconnected');
      _updateState(NotificationSocketState.disconnected);
    });

    _socket!.onConnectError((error) {
      _logger.e('Socket.IO connection error: $error');
      _updateState(NotificationSocketState.error);
    });

    _socket!.onError((error) {
      _logger.e('Socket.IO error: $error');
    });

    _socket!.onReconnect((_) {
      _logger.i('Socket.IO reconnected');
      _updateState(NotificationSocketState.connected);
    });

    _socket!.onReconnectAttempt((attempt) {
      _logger.i('Socket.IO reconnection attempt: $attempt');
      _updateState(NotificationSocketState.connecting);
    });

    _socket!.onReconnectFailed((_) {
      _logger.e('Socket.IO reconnection failed');
      _updateState(NotificationSocketState.error);
    });

    // Notification events
    _socket!.on('notification', (data) {
      _logger.i('Received notification: $data');
      _handleNotification(data);
    });

    _socket!.on('pendingNotifications', (data) {
      _logger.i('Received pending notifications: ${(data as List).length} items');
      _handlePendingNotifications(data);
    });

    _socket!.on('featureUpdate', (data) {
      _logger.i('Received feature update: $data');
      // Emit for other services to handle
    });

    _socket!.on('licenseUpdate', (data) {
      _logger.i('Received license update: $data');
      // Emit for other services to handle
    });
  }

  Future<void> _handleNotification(dynamic data) async {
    _logger.i('_handleNotification called with data: $data');
    try {
      final notification = PushNotification.fromJson(
        data is Map<String, dynamic> ? data : jsonDecode(data.toString()),
      );
      _logger.i('Parsed notification: id=${notification.id}, title=${notification.title}');

      _notificationController.add(notification);

      // Show local notification
      await _showLocalNotification(notification);

      // Mark as delivered
      markAsDelivered(notification.id);
    } catch (e, stackTrace) {
      _logger.e('Error handling notification: $e');
      _logger.e('Stack trace: $stackTrace');
    }
  }

  void _handlePendingNotifications(dynamic data) {
    try {
      final list = (data as List)
          .map((item) => PushNotification.fromJson(
                item is Map<String, dynamic> ? item : jsonDecode(item.toString()),
              ))
          .toList();

      _pendingNotificationsController.add(list);

      // Show local notifications for pending items
      for (final notification in list) {
        _showLocalNotification(notification);
        markAsDelivered(notification.id);
      }
    } catch (e) {
      _logger.e('Error parsing pending notifications: $e');
    }
  }

  Future<void> _showLocalNotification(PushNotification notification) async {
    _logger.i('Showing local notification: ${notification.title}');
    try {
      switch (notification.type) {
        case 'DEAL_UPDATE':
          await _notificationService.showDealNotification(
            title: notification.title,
            body: notification.body,
            payload: jsonEncode(notification.actionData ?? {}),
          );
          break;
        case 'TASK_REMINDER':
          await _notificationService.showTaskNotification(
            title: notification.title,
            body: notification.body,
            payload: jsonEncode(notification.actionData ?? {}),
          );
          break;
        case 'AI_INSIGHT':
          await _notificationService.showAIInsightNotification(
            title: notification.title,
            body: notification.body,
            payload: jsonEncode(notification.actionData ?? {}),
          );
          break;
        default:
          await _notificationService.showNotification(
            title: notification.title,
            body: notification.body,
            payload: jsonEncode(notification.actionData ?? {}),
          );
      }
      _logger.i('Local notification shown successfully');
    } catch (e, stackTrace) {
      _logger.e('Error showing local notification: $e');
      _logger.e('Stack trace: $stackTrace');
    }
  }

  void _updateState(NotificationSocketState newState) {
    _state = newState;
    _stateController.add(newState);
  }

  // ==================== Socket.IO Emit Methods ====================

  /// Mark notification as delivered
  void markAsDelivered(String notificationId) {
    if (_socket != null && _state == NotificationSocketState.connected) {
      _socket!.emit('markAsDelivered', notificationId);
      _logger.d('Marked notification $notificationId as delivered');
    }
  }

  /// Mark notification as read
  void markAsRead(String notificationId) {
    if (_socket != null && _state == NotificationSocketState.connected) {
      _socket!.emit('markAsRead', notificationId);
      _logger.d('Marked notification $notificationId as read');
    }
  }

  /// Get unread count
  Future<int> getUnreadCount() async {
    if (_socket == null || _state != NotificationSocketState.connected) {
      return 0;
    }

    final completer = Completer<int>();

    _socket!.emitWithAck('getUnreadCount', null, ack: (data) {
      if (data != null && data['count'] != null) {
        completer.complete(data['count'] as int);
      } else {
        completer.complete(0);
      }
    });

    return completer.future.timeout(
      const Duration(seconds: 5),
      onTimeout: () => 0,
    );
  }

  /// Disconnect from server
  Future<void> disconnect() async {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _updateState(NotificationSocketState.disconnected);
    _logger.i('Notifications Socket.IO disconnected');
  }

  /// Dispose resources
  void dispose() {
    disconnect();
    _stateController.close();
    _notificationController.close();
    _pendingNotificationsController.close();
  }
}

/// Notification socket service provider
final notificationSocketServiceProvider = Provider<NotificationSocketService>((ref) {
  final notificationService = ref.watch(notificationServiceProvider);
  return NotificationSocketService(notificationService);
});

/// Notification socket state provider
final notificationSocketStateProvider = StreamProvider<NotificationSocketState>((ref) {
  final service = ref.watch(notificationSocketServiceProvider);
  return service.stateStream;
});

/// Push notifications stream provider
final pushNotificationsProvider = StreamProvider<PushNotification>((ref) {
  final service = ref.watch(notificationSocketServiceProvider);
  return service.notificationStream;
});

/// Pending notifications stream provider
final pendingNotificationsProvider = StreamProvider<List<PushNotification>>((ref) {
  final service = ref.watch(notificationSocketServiceProvider);
  return service.pendingNotificationsStream;
});
