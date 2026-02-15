import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:logger/logger.dart';
import '../config/app_config.dart';
import 'notification_service.dart';

/// WebSocket connection state
enum WebSocketState { disconnected, connecting, connected, reconnecting }

/// WebSocket message types from server
enum WebSocketMessageType {
  notification,
  dealUpdate,
  taskReminder,
  aiInsight,
  syncRequired,
  chatMessage,
  pushNotification,   // Server-initiated push notification
  featureUpdate,      // Feature visibility changed
  licenseUpdate,      // License status changed
  systemAlert,        // System-wide alert
  adminBroadcast,     // Broadcast from admin
}

/// WebSocket message model
class WebSocketMessage {
  final WebSocketMessageType type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final DateTime timestamp;

  WebSocketMessage({
    required this.type,
    required this.title,
    required this.body,
    this.data,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  factory WebSocketMessage.fromJson(Map<String, dynamic> json) {
    return WebSocketMessage(
      type: WebSocketMessageType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => WebSocketMessageType.notification,
      ),
      title: json['title'] ?? 'Notification',
      body: json['body'] ?? '',
      data: json['data'],
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
    );
  }
}

/// WebSocket service for real-time communication using Socket.IO
class WebSocketService {
  final Logger _logger = Logger();
  final NotificationService _notificationService;

  io.Socket? _socket;
  String? _authToken;
  WebSocketState _state = WebSocketState.disconnected;
  static const int _maxReconnectAttempts = 5;

  // Stream controllers
  final _stateController = StreamController<WebSocketState>.broadcast();
  final _messageController = StreamController<WebSocketMessage>.broadcast();

  Stream<WebSocketState> get stateStream => _stateController.stream;
  Stream<WebSocketMessage> get messageStream => _messageController.stream;
  WebSocketState get state => _state;

  WebSocketService(this._notificationService);

  /// Connect to WebSocket server using Socket.IO
  Future<void> connect(String authToken) async {
    _authToken = authToken;
    await _connect();
  }

  Future<void> _connect() async {
    if (_state == WebSocketState.connecting) return;

    _updateState(WebSocketState.connecting);
    _logger.i('Connecting to Socket.IO...');

    try {
      // Build the Socket.IO URL
      // For production: https://salesos.org
      // For dev: http://localhost:4000
      final baseUrl = AppConfig.apiBaseUrl.replaceAll('/api', '');

      _logger.i('Socket.IO base URL: $baseUrl');

      _socket = io.io(
        '$baseUrl/notifications',
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setQuery({'token': _authToken})
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(_maxReconnectAttempts)
            .setReconnectionDelay(5000)
            .build(),
      );

      // Connection events
      _socket!.onConnect((_) {
        _updateState(WebSocketState.connected);
        _logger.i('Socket.IO connected');
      });

      _socket!.onConnectError((error) {
        _logger.e('Socket.IO connect error: $error');
        _updateState(WebSocketState.reconnecting);
      });

      _socket!.onDisconnect((_) {
        _logger.w('Socket.IO disconnected');
        _updateState(WebSocketState.disconnected);
      });

      _socket!.onReconnect((_) {
        _logger.i('Socket.IO reconnected');
        _updateState(WebSocketState.connected);
      });

      _socket!.onReconnectAttempt((attempt) {
        _logger.i('Reconnecting... attempt $attempt');
        _updateState(WebSocketState.reconnecting);
      });

      _socket!.onReconnectFailed((_) {
        _logger.e('Socket.IO max reconnect attempts reached');
        _updateState(WebSocketState.disconnected);
      });

      _socket!.onError((error) {
        _logger.e('Socket.IO error: $error');
      });

      // Message handlers
      _socket!.on('notification', (data) {
        _handleNotification(data);
      });

      _socket!.on('pendingNotifications', (data) {
        _handlePendingNotifications(data);
      });

      _socket!.on('featureUpdate', (data) {
        _handleFeatureUpdate(data);
      });

      _socket!.on('licenseUpdate', (data) {
        _handleLicenseUpdate(data);
      });

      // Connect
      _socket!.connect();
    } catch (e) {
      _logger.e('Socket.IO connection failed: $e');
      _updateState(WebSocketState.disconnected);
    }
  }

  void _handleNotification(dynamic data) {
    try {
      final json = data is Map<String, dynamic> ? data : jsonDecode(data.toString());
      final message = WebSocketMessage(
        type: WebSocketMessageType.notification,
        title: json['title'] ?? 'Notification',
        body: json['body'] ?? '',
        data: json,
      );
      _messageController.add(message);
      _showNotification(message);
      _logger.d('Received notification: ${message.title}');

      // Mark as delivered
      if (json['id'] != null) {
        _socket?.emit('markAsDelivered', json['id']);
      }
    } catch (e) {
      _logger.e('Error parsing notification: $e');
    }
  }

  void _handlePendingNotifications(dynamic data) {
    try {
      if (data is List) {
        for (final item in data) {
          _handleNotification(item);
        }
      }
    } catch (e) {
      _logger.e('Error handling pending notifications: $e');
    }
  }

  void _handleFeatureUpdate(dynamic data) {
    final message = WebSocketMessage(
      type: WebSocketMessageType.featureUpdate,
      title: 'Feature Update',
      body: 'Features have been updated',
      data: data is Map<String, dynamic> ? data : {'refresh': true},
    );
    _messageController.add(message);
    _logger.i('Feature update received');
  }

  void _handleLicenseUpdate(dynamic data) {
    final message = WebSocketMessage(
      type: WebSocketMessageType.licenseUpdate,
      title: 'License Update',
      body: 'License status changed',
      data: data is Map<String, dynamic> ? data : {'refresh': true},
    );
    _messageController.add(message);
    _logger.i('License update received');
  }

  void _showNotification(WebSocketMessage message) {
    switch (message.type) {
      case WebSocketMessageType.dealUpdate:
        _notificationService.showDealNotification(
          title: message.title,
          body: message.body,
          payload: jsonEncode(message.data ?? {}),
        );
        break;
      case WebSocketMessageType.taskReminder:
        _notificationService.showTaskNotification(
          title: message.title,
          body: message.body,
          payload: jsonEncode(message.data ?? {}),
        );
        break;
      case WebSocketMessageType.aiInsight:
        _notificationService.showAIInsightNotification(
          title: message.title,
          body: message.body,
          payload: jsonEncode(message.data ?? {}),
        );
        break;
      case WebSocketMessageType.pushNotification:
      case WebSocketMessageType.adminBroadcast:
      case WebSocketMessageType.systemAlert:
      case WebSocketMessageType.notification:
        _notificationService.showNotification(
          title: message.title,
          body: message.body,
          payload: jsonEncode(message.data ?? {}),
        );
        break;
      case WebSocketMessageType.featureUpdate:
      case WebSocketMessageType.licenseUpdate:
        // These don't show notifications but trigger state updates
        _logger.i('Received ${message.type}: ${message.data}');
        break;
      default:
        _notificationService.showNotification(
          title: message.title,
          body: message.body,
          payload: jsonEncode(message.data ?? {}),
        );
    }
  }

  void _updateState(WebSocketState newState) {
    _state = newState;
    _stateController.add(newState);
  }

  /// Send a message through Socket.IO
  void sendMessage(String event, Map<String, dynamic> data) {
    if (_socket != null && _state == WebSocketState.connected) {
      _socket!.emit(event, data);
    }
  }

  /// Mark notification as read
  void markAsRead(String notificationId) {
    _socket?.emit('markAsRead', notificationId);
  }

  /// Get unread count
  void requestUnreadCount() {
    _socket?.emitWithAck('getUnreadCount', null, ack: (data) {
      _logger.d('Unread count: ${data?['count']}');
    });
  }

  /// Disconnect from Socket.IO server
  Future<void> disconnect() async {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _updateState(WebSocketState.disconnected);
    _logger.i('Socket.IO disconnected');
  }

  /// Dispose resources
  void dispose() {
    disconnect();
    _stateController.close();
    _messageController.close();
  }
}

/// WebSocket service provider
final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  final notificationService = ref.watch(notificationServiceProvider);
  return WebSocketService(notificationService);
});

/// WebSocket state provider
final webSocketStateProvider = StreamProvider<WebSocketState>((ref) {
  final service = ref.watch(webSocketServiceProvider);
  return service.stateStream;
});

/// WebSocket messages provider
final webSocketMessagesProvider = StreamProvider<WebSocketMessage>((ref) {
  final service = ref.watch(webSocketServiceProvider);
  return service.messageStream;
});
