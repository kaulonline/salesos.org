import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Connection status enum for simplified connectivity state
enum ConnectionStatus {
  /// Device is connected to the internet
  connected,

  /// Device is offline
  disconnected,

  /// Connectivity status is being determined
  checking,
}

/// Service for monitoring network connectivity using connectivity_plus package.
/// Provides a stream of connectivity changes and utility methods to check connection status.
class ConnectivityService {
  final Connectivity _connectivity;
  StreamController<ConnectionStatus>? _statusController;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  ConnectionStatus _lastStatus = ConnectionStatus.checking;

  /// Creates a ConnectivityService instance.
  /// Optionally accepts a [Connectivity] instance for testing purposes.
  ConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  /// Stream of connection status changes.
  /// Emits [ConnectionStatus.connected] when online, [ConnectionStatus.disconnected] when offline.
  Stream<ConnectionStatus> get statusStream {
    _statusController ??= StreamController<ConnectionStatus>.broadcast(
      onListen: _startMonitoring,
      onCancel: _stopMonitoring,
    );
    return _statusController!.stream;
  }

  /// Returns the current connection status synchronously.
  ConnectionStatus get currentStatus => _lastStatus;

  /// Returns true if the device is currently connected to the internet.
  bool get isConnected => _lastStatus == ConnectionStatus.connected;

  /// Returns true if the device is currently offline.
  bool get isDisconnected => _lastStatus == ConnectionStatus.disconnected;

  /// Checks the current connectivity status asynchronously.
  /// Returns [ConnectionStatus.connected] if any network connection is available.
  Future<ConnectionStatus> checkConnectivity() async {
    try {
      final results = await _connectivity.checkConnectivity();
      final status = _mapResultsToStatus(results);
      _updateStatus(status);
      return status;
    } catch (e) {
      debugPrint('ConnectivityService: Error checking connectivity: $e');
      _updateStatus(ConnectionStatus.disconnected);
      return ConnectionStatus.disconnected;
    }
  }

  /// Maps a list of ConnectivityResult to a ConnectionStatus.
  ConnectionStatus _mapResultsToStatus(List<ConnectivityResult> results) {
    // Check if any connection type indicates we're online
    final hasConnection = results.any(
      (result) => result != ConnectivityResult.none,
    );
    return hasConnection
        ? ConnectionStatus.connected
        : ConnectionStatus.disconnected;
  }

  /// Updates the status and notifies listeners.
  void _updateStatus(ConnectionStatus status) {
    if (_lastStatus != status) {
      _lastStatus = status;
      _statusController?.add(status);
      debugPrint('ConnectivityService: Status changed to $status');
    }
  }

  /// Starts monitoring connectivity changes.
  void _startMonitoring() {
    debugPrint('ConnectivityService: Starting connectivity monitoring');

    // Perform initial check
    checkConnectivity();

    // Subscribe to connectivity changes
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (results) {
        final status = _mapResultsToStatus(results);
        _updateStatus(status);
      },
      onError: (error) {
        debugPrint('ConnectivityService: Stream error: $error');
        _updateStatus(ConnectionStatus.disconnected);
      },
    );
  }

  /// Stops monitoring connectivity changes.
  void _stopMonitoring() {
    debugPrint('ConnectivityService: Stopping connectivity monitoring');
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

  /// Disposes the service and releases resources.
  void dispose() {
    _stopMonitoring();
    _statusController?.close();
    _statusController = null;
  }

  /// Returns a human-readable description of the connection type.
  Future<String> getConnectionTypeDescription() async {
    try {
      final results = await _connectivity.checkConnectivity();
      if (results.isEmpty || results.contains(ConnectivityResult.none)) {
        return 'No connection';
      }

      final types = <String>[];
      for (final result in results) {
        switch (result) {
          case ConnectivityResult.wifi:
            types.add('WiFi');
            break;
          case ConnectivityResult.mobile:
            types.add('Mobile data');
            break;
          case ConnectivityResult.ethernet:
            types.add('Ethernet');
            break;
          case ConnectivityResult.vpn:
            types.add('VPN');
            break;
          case ConnectivityResult.bluetooth:
            types.add('Bluetooth');
            break;
          case ConnectivityResult.other:
            types.add('Other');
            break;
          case ConnectivityResult.none:
            break;
        }
      }

      return types.isEmpty ? 'Unknown' : types.join(', ');
    } catch (e) {
      return 'Unknown';
    }
  }
}
