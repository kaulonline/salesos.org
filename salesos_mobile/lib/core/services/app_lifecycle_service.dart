import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'device_tracking_service.dart';
import 'websocket_service.dart';
import 'notification_socket_service.dart';
import 'notification_service.dart';
import 'push_notification_service.dart';
import 'feature_visibility_service.dart';
import 'app_content_service.dart';
import '../../features/auth/presentation/bloc/auth_provider.dart';
import '../../features/auth/data/repositories/auth_repository.dart';
import '../config/routes.dart';

/// App lifecycle state for tracking
enum AppLifecyclePhase {
  initializing,
  active,
  inactive,
  paused,
  detached,
}

/// App lifecycle service provider
final appLifecycleServiceProvider = Provider<AppLifecycleService>((ref) {
  return AppLifecycleService(ref);
});

/// Service to manage app lifecycle events and integrate with device tracking
class AppLifecycleService with WidgetsBindingObserver {
  final Ref _ref;
  final Logger _logger = Logger();

  AppLifecyclePhase _currentPhase = AppLifecyclePhase.initializing;
  bool _isInitialized = false;
  Timer? _heartbeatTimer;
  static const Duration _heartbeatInterval = Duration(minutes: 5);

  AppLifecycleService(this._ref);

  /// Get current lifecycle phase
  AppLifecyclePhase get currentPhase => _currentPhase;

  /// Check if service is initialized
  bool get isInitialized => _isInitialized;

  /// Initialize the lifecycle service
  Future<void> initialize() async {
    if (_isInitialized) return;

    _logger.i('Initializing AppLifecycleService');
    WidgetsBinding.instance.addObserver(this);
    _isInitialized = true;
    _currentPhase = AppLifecyclePhase.active;

    // Initialize notification service for local notifications
    try {
      final notificationService = _ref.read(notificationServiceProvider);
      await notificationService.initialize();
      await notificationService.requestPermissions();
      _logger.i('Notification service initialized');
    } catch (e) {
      _logger.e('Error initializing notification service: $e');
    }

    // Initialize push notification service (APNs/FCM) with deep link navigation
    try {
      final pushService = _ref.read(pushNotificationServiceProvider);
      await pushService.initialize(
        onNotificationTapped: _handleNotificationTap,
      );
      _logger.i('Push notification service initialized with deep link navigation');
    } catch (e) {
      _logger.e('Error initializing push notification service: $e');
    }

    // Initial device registration and session start if authenticated
    await _onAppStart();
  }

  /// Called when app starts
  Future<void> _onAppStart() async {
    final isAuthenticated = _ref.read(isAuthenticatedProvider);

    // Only proceed if user is authenticated
    if (!isAuthenticated) {
      _logger.d('User not authenticated, skipping device registration');
      return;
    }

    // Connect notification Socket.IO FIRST - this is critical for push notifications
    try {
      final authRepository = _ref.read(authRepositoryProvider);
      final token = await authRepository.getAccessToken();
      if (token != null) {
        _logger.i('Connecting notification Socket.IO with token...');
        final notificationSocketService = _ref.read(notificationSocketServiceProvider);
        await notificationSocketService.connect(token);
        _logger.i('Notification Socket.IO connection initiated');
      } else {
        _logger.w('No auth token available for notification socket');
      }
    } catch (e) {
      _logger.e('Error connecting notification socket: $e');
    }

    // Register device (non-blocking for notifications)
    try {
      final deviceTrackingService = _ref.read(deviceTrackingServiceProvider);
      _logger.i('Registering device on app start');
      final device = await deviceTrackingService.registerDevice();
      if (device != null) {
        _logger.i('Device registered: ${device.deviceType.value}');
      }

      // Start session
      _logger.i('Starting session on app start');
      final session = await deviceTrackingService.startSession();
      if (session != null) {
        _logger.i('Session started: ${session.id}');
      }
    } catch (e) {
      _logger.e('Error with device tracking: $e');
    }

    // Load feature config (non-blocking)
    try {
      final featureService = _ref.read(featureVisibilityServiceProvider);
      await featureService.getFeatureConfig();
      _logger.i('Feature config loaded');
    } catch (e) {
      _logger.e('Error loading feature config: $e');
    }

    // Connect general WebSocket (non-blocking)
    try {
      final authRepository = _ref.read(authRepositoryProvider);
      final token = await authRepository.getAccessToken();
      if (token != null) {
        final wsService = _ref.read(webSocketServiceProvider);
        await wsService.connect(token);
        _logger.i('General WebSocket connected');
      }
    } catch (e) {
      _logger.e('Error connecting general WebSocket: $e');
    }

    // Start heartbeat timer
    _startHeartbeatTimer();
  }

  /// Called when user logs in
  Future<void> onUserLogin() async {
    _logger.i('==================================================');
    _logger.i('onUserLogin() called - Starting service initialization');
    _logger.i('==================================================');
    await _onAppStart();

    // Refresh push token after login (now we can register with backend)
    try {
      final pushService = _ref.read(pushNotificationServiceProvider);
      await pushService.refreshToken();
      _logger.i('Push token refreshed after login');
    } catch (e) {
      _logger.e('Error refreshing push token: $e');
    }

    _logger.i('onUserLogin() completed');
  }

  /// Called when user logs out
  Future<void> onUserLogout() async {
    _logger.i('User logged out, cleaning up all caches');

    // Stop heartbeat
    _stopHeartbeatTimer();

    // End session
    try {
      final deviceTrackingService = _ref.read(deviceTrackingServiceProvider);
      await deviceTrackingService.endSession();
      deviceTrackingService.clearCache();
    } catch (e) {
      _logger.e('Error ending session on logout: $e');
    }

    // Clear feature config cache
    try {
      final featureService = _ref.read(featureVisibilityServiceProvider);
      featureService.clearCache();
    } catch (e) {
      _logger.e('Error clearing feature cache: $e');
    }

    // Clear app content cache (legal content, OSS licenses, etc.)
    try {
      final appContentService = _ref.read(appContentServiceProvider);
      await appContentService.clearCache();
      _logger.i('App content cache cleared');
    } catch (e) {
      _logger.e('Error clearing app content cache: $e');
    }

    // Disconnect WebSockets
    try {
      final wsService = _ref.read(webSocketServiceProvider);
      await wsService.disconnect();
    } catch (e) {
      _logger.e('Error disconnecting WebSocket: $e');
    }

    // Disconnect notification Socket.IO
    try {
      final notificationSocketService = _ref.read(notificationSocketServiceProvider);
      await notificationSocketService.disconnect();
    } catch (e) {
      _logger.e('Error disconnecting notification socket: $e');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _logger.d('App lifecycle state changed: $state');

    switch (state) {
      case AppLifecycleState.resumed:
        _onAppResumed();
        break;
      case AppLifecycleState.inactive:
        _currentPhase = AppLifecyclePhase.inactive;
        break;
      case AppLifecycleState.paused:
        _onAppPaused();
        break;
      case AppLifecycleState.detached:
        _onAppDetached();
        break;
      case AppLifecycleState.hidden:
        // Treat hidden same as paused for our purposes
        _currentPhase = AppLifecyclePhase.paused;
        break;
    }
  }

  /// Called when app is resumed (brought to foreground)
  Future<void> _onAppResumed() async {
    _currentPhase = AppLifecyclePhase.active;
    _logger.i('App resumed');

    final isAuthenticated = _ref.read(isAuthenticatedProvider);
    if (!isAuthenticated) return;

    // Reconnect notification Socket.IO FIRST - critical for push notifications
    try {
      final authRepository = _ref.read(authRepositoryProvider);
      final token = await authRepository.getAccessToken();
      if (token != null) {
        final notificationSocketService = _ref.read(notificationSocketServiceProvider);
        if (notificationSocketService.state == NotificationSocketState.disconnected ||
            notificationSocketService.state == NotificationSocketState.error) {
          _logger.i('Reconnecting notification Socket.IO...');
          await notificationSocketService.connect(token);
          _logger.i('Notification Socket.IO reconnected');
        }
      }
    } catch (e) {
      _logger.e('Error reconnecting notification socket: $e');
    }

    // Update device tracking (non-blocking)
    try {
      final deviceTrackingService = _ref.read(deviceTrackingServiceProvider);
      await deviceTrackingService.registerDevice();

      final currentSession = deviceTrackingService.currentSession;
      if (currentSession == null) {
        _logger.i('No current session, starting new one');
        await deviceTrackingService.startSession();
      } else {
        await deviceTrackingService.updateSessionActivity();
      }
    } catch (e) {
      _logger.e('Error with device tracking on resume: $e');
    }

    // Reconnect general WebSocket (non-blocking)
    try {
      final authRepository = _ref.read(authRepositoryProvider);
      final token = await authRepository.getAccessToken();
      if (token != null) {
        final wsService = _ref.read(webSocketServiceProvider);
        if (wsService.state == WebSocketState.disconnected) {
          await wsService.connect(token);
        }
      }
    } catch (e) {
      _logger.e('Error reconnecting general WebSocket: $e');
    }

    // Restart heartbeat timer
    _startHeartbeatTimer();

    // Refresh feature config (non-blocking)
    try {
      final featureService = _ref.read(featureVisibilityServiceProvider);
      await featureService.refreshConfig();
    } catch (e) {
      _logger.e('Error on app resumed: $e');
    }
  }

  /// Called when app is paused (sent to background)
  Future<void> _onAppPaused() async {
    _currentPhase = AppLifecyclePhase.paused;
    _logger.i('App paused');

    // Stop heartbeat timer when app is in background
    _stopHeartbeatTimer();

    try {
      final isAuthenticated = _ref.read(isAuthenticatedProvider);
      if (!isAuthenticated) return;

      // Update session activity one last time before backgrounding
      final deviceTrackingService = _ref.read(deviceTrackingServiceProvider);
      await deviceTrackingService.updateSessionActivity();
    } catch (e) {
      _logger.e('Error on app paused: $e');
    }
  }

  /// Called when app is detached (terminated)
  Future<void> _onAppDetached() async {
    _currentPhase = AppLifecyclePhase.detached;
    _logger.i('App detached');

    _stopHeartbeatTimer();

    try {
      final isAuthenticated = _ref.read(isAuthenticatedProvider);
      if (!isAuthenticated) return;

      // End session on app termination
      final deviceTrackingService = _ref.read(deviceTrackingServiceProvider);
      await deviceTrackingService.endSession();

      // Disconnect WebSockets
      final wsService = _ref.read(webSocketServiceProvider);
      await wsService.disconnect();

      // Disconnect notification Socket.IO
      final notificationSocketService = _ref.read(notificationSocketServiceProvider);
      await notificationSocketService.disconnect();
    } catch (e) {
      _logger.e('Error on app detached: $e');
    }
  }

  /// Start heartbeat timer for periodic session updates
  void _startHeartbeatTimer() {
    _stopHeartbeatTimer();
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (_) async {
      if (_currentPhase == AppLifecyclePhase.active) {
        try {
          final isAuthenticated = _ref.read(isAuthenticatedProvider);
          if (isAuthenticated) {
            final deviceTrackingService = _ref.read(deviceTrackingServiceProvider);
            await deviceTrackingService.updateSessionActivity();
            _logger.d('Heartbeat sent');
          }
        } catch (e) {
          _logger.e('Heartbeat error: $e');
        }
      }
    });
  }

  /// Stop heartbeat timer
  void _stopHeartbeatTimer() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  /// Handle notification tap for deep link navigation
  void _handleNotificationTap(NotificationPayload payload) {
    _logger.i('Handling notification tap: action=${payload.action}, entityType=${payload.entityType}');

    // Get the target route from the payload
    final targetRoute = payload.targetRoute;
    if (targetRoute == null) {
      _logger.w('No target route for notification, opening dashboard');
      _navigateToRoute(AppRoutes.dashboard);
      return;
    }

    _logger.i('Navigating to: $targetRoute');
    _navigateToRoute(targetRoute);
  }

  /// Navigate to a route using the root navigator
  void _navigateToRoute(String route) {
    try {
      // Use GoRouter for navigation
      final router = _ref.read(routerProvider);
      router.go(route);
      _logger.i('Navigated to: $route');
    } catch (e) {
      _logger.e('Error navigating to $route: $e');
      // Fallback: try using navigator key directly
      try {
        final navigatorState = rootNavigatorKey.currentState;
        if (navigatorState != null) {
          navigatorState.pushNamed(route);
        }
      } catch (e2) {
        _logger.e('Fallback navigation also failed: $e2');
      }
    }
  }

  /// Track feature usage
  Future<void> trackFeatureUsage(String featureKey) async {
    try {
      final isAuthenticated = _ref.read(isAuthenticatedProvider);
      if (!isAuthenticated) return;

      final deviceTrackingService = _ref.read(deviceTrackingServiceProvider);
      await deviceTrackingService.trackFeatureUsage(featureKey);
    } catch (e) {
      _logger.e('Error tracking feature usage: $e');
    }
  }

  /// Dispose resources
  void dispose() {
    _stopHeartbeatTimer();
    WidgetsBinding.instance.removeObserver(this);
    _isInitialized = false;
    _logger.i('AppLifecycleService disposed');
  }
}

/// Widget that initializes app lifecycle tracking
class AppLifecycleWrapper extends ConsumerStatefulWidget {
  final Widget child;

  const AppLifecycleWrapper({
    super.key,
    required this.child,
  });

  @override
  ConsumerState<AppLifecycleWrapper> createState() => _AppLifecycleWrapperState();
}

class _AppLifecycleWrapperState extends ConsumerState<AppLifecycleWrapper> {
  @override
  void initState() {
    super.initState();
    // Initialize lifecycle service after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final lifecycleService = ref.read(appLifecycleServiceProvider);
      lifecycleService.initialize();
    });
  }

  @override
  void dispose() {
    final lifecycleService = ref.read(appLifecycleServiceProvider);
    lifecycleService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
