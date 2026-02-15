import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../services/connectivity_service.dart';

/// Provider for the ConnectivityService singleton instance.
/// This service handles all network connectivity monitoring logic.
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();

  // Dispose the service when the provider is disposed
  ref.onDispose(() {
    service.dispose();
  });

  return service;
});

/// StreamProvider that exposes the connectivity status stream.
/// Use this provider to reactively respond to connectivity changes.
///
/// Example:
/// ```dart
/// final status = ref.watch(connectivityStatusProvider);
/// status.when(
///   data: (status) => status == ConnectionStatus.connected ? ... : ...,
///   loading: () => ...,
///   error: (e, s) => ...,
/// );
/// ```
final connectivityStatusProvider = StreamProvider<ConnectionStatus>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.statusStream;
});

/// Provider that returns a simple boolean indicating if the device is online.
/// This is a convenience provider that watches the connectivity status stream.
///
/// Example:
/// ```dart
/// final isOnline = ref.watch(isOnlineProvider);
/// if (!isOnline) {
///   showOfflineBanner();
/// }
/// ```
final isOnlineProvider = Provider<bool>((ref) {
  final status = ref.watch(connectivityStatusProvider);
  return status.when(
    data: (status) => status == ConnectionStatus.connected,
    loading: () => true, // Assume online while checking
    error: (_, _) => false, // Assume offline on error
  );
});

/// Provider that returns true when the device is offline.
/// Inverse of [isOnlineProvider] for convenience.
final isOfflineProvider = Provider<bool>((ref) {
  return !ref.watch(isOnlineProvider);
});

/// Provider for the raw connectivity_plus stream.
/// Use this if you need access to the detailed ConnectivityResult list.
final rawConnectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

/// FutureProvider that performs a one-time connectivity check.
/// Useful for checking connectivity on app startup or specific user actions.
final connectivityCheckProvider = FutureProvider<ConnectionStatus>((ref) async {
  final service = ref.watch(connectivityServiceProvider);
  return await service.checkConnectivity();
});

/// Provider that returns the connection type description.
/// Useful for displaying the type of connection (WiFi, Mobile, etc.) to the user.
final connectionTypeProvider = FutureProvider<String>((ref) async {
  final service = ref.watch(connectivityServiceProvider);
  return await service.getConnectionTypeDescription();
});

/// Notifier for managing connectivity-aware actions.
/// Provides methods for checking connectivity before performing actions.
class ConnectivityNotifier extends Notifier<ConnectionStatus> {
  @override
  ConnectionStatus build() {
    final service = ref.watch(connectivityServiceProvider);

    // Listen to status changes and update state
    ref.listen(connectivityStatusProvider, (previous, next) {
      next.whenData((status) {
        state = status;
      });
    });

    return service.currentStatus;
  }

  /// Returns true if the device is currently online.
  bool get isOnline => state == ConnectionStatus.connected;

  /// Returns true if the device is currently offline.
  bool get isOffline => state == ConnectionStatus.disconnected;

  /// Performs a manual connectivity check and updates the state.
  Future<ConnectionStatus> checkConnectivity() async {
    final service = ref.read(connectivityServiceProvider);
    final status = await service.checkConnectivity();
    state = status;
    return status;
  }

  /// Executes the given action only if the device is online.
  /// Returns null if offline.
  Future<T?> executeIfOnline<T>(Future<T> Function() action) async {
    if (isOnline) {
      return await action();
    }
    return null;
  }

  /// Executes the given action, with an offline fallback.
  Future<T> executeWithFallback<T>({
    required Future<T> Function() onlineAction,
    required T Function() offlineFallback,
  }) async {
    if (isOnline) {
      return await onlineAction();
    }
    return offlineFallback();
  }
}

/// Provider for the ConnectivityNotifier.
final connectivityNotifierProvider =
    NotifierProvider<ConnectivityNotifier, ConnectionStatus>(
  ConnectivityNotifier.new,
);
