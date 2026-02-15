import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import '../config/app_config.dart';
import '../providers/providers.dart';

/// Biometric authentication types
enum BiometricType {
  fingerprint,
  faceId,
  iris,
  none,
}

/// Biometric service provider
final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService(ref.watch(secureStorageProvider));
});

/// Biometric enabled state provider
final biometricEnabledProvider = FutureProvider<bool>((ref) async {
  final service = ref.watch(biometricServiceProvider);
  return service.isBiometricEnabled();
});

/// Available biometrics provider
final availableBiometricsProvider = FutureProvider<List<BiometricType>>((ref) async {
  final service = ref.watch(biometricServiceProvider);
  return service.getAvailableBiometrics();
});

/// Biometric Service for Face ID / Touch ID authentication
class BiometricService {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterSecureStorage _storage;

  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _biometricEmailKey = 'biometric_email';
  static const String _biometricPasswordKey = 'biometric_password';

  BiometricService(this._storage);

  /// Check if device supports biometric authentication
  Future<bool> isDeviceSupported() async {
    try {
      return await _localAuth.isDeviceSupported();
    } on PlatformException {
      return false;
    }
  }

  /// Check if biometrics are available and enrolled
  Future<bool> canCheckBiometrics() async {
    try {
      return await _localAuth.canCheckBiometrics;
    } on PlatformException {
      return false;
    }
  }

  /// Get list of available biometric types
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      final availableBiometrics = await _localAuth.getAvailableBiometrics();
      final List<BiometricType> result = [];

      for (final bio in availableBiometrics) {
        if (bio.name == 'fingerprint') {
          result.add(BiometricType.fingerprint);
        } else if (bio.name == 'face') {
          result.add(BiometricType.faceId);
        } else if (bio.name == 'iris') {
          result.add(BiometricType.iris);
        }
      }

      return result;
    } on PlatformException {
      return [];
    }
  }

  /// Get friendly name for biometric type
  String getBiometricName(List<BiometricType> types) {
    if (types.contains(BiometricType.faceId)) {
      return 'Face ID';
    } else if (types.contains(BiometricType.fingerprint)) {
      return 'Touch ID';
    } else if (types.contains(BiometricType.iris)) {
      return 'Iris';
    }
    return 'Biometrics';
  }

  /// Authenticate using biometrics
  Future<bool> authenticate({
    String reason = 'Authenticate to access SalesOS',
    bool biometricOnly = false,
  }) async {
    if (!AppConfig.enableBiometrics) {
      return false;
    }

    try {
      final isSupported = await isDeviceSupported();
      if (!isSupported) {
        return false;
      }

      final canCheck = await canCheckBiometrics();
      if (!canCheck) {
        return false;
      }

      final authenticated = await _localAuth.authenticate(
        localizedReason: reason,
        biometricOnly: biometricOnly,
        persistAcrossBackgrounding: true,
      );

      if (authenticated) {
        HapticFeedback.heavyImpact();
      }

      return authenticated;
    } on PlatformException catch (e) {
      // Handle specific errors
      if (e.code == 'NotAvailable') {
        // Biometrics not available
        return false;
      } else if (e.code == 'NotEnrolled') {
        // No biometrics enrolled
        return false;
      } else if (e.code == 'LockedOut') {
        // Too many failed attempts
        return false;
      } else if (e.code == 'PermanentlyLockedOut') {
        // Device requires password/PIN
        return false;
      }
      return false;
    }
  }

  /// Check if biometric login is enabled for this app
  Future<bool> isBiometricEnabled() async {
    final enabled = await _storage.read(key: _biometricEnabledKey);
    return enabled == 'true';
  }

  /// Enable biometric login
  /// Stores email and password securely for re-authentication
  /// Password is encrypted by Flutter Secure Storage (Keychain/Keystore)
  Future<void> enableBiometric(String email, String password) async {
    await _storage.write(key: _biometricEnabledKey, value: 'true');
    await _storage.write(key: _biometricEmailKey, value: email);
    await _storage.write(key: _biometricPasswordKey, value: password);
  }

  /// Disable biometric login and clear stored credentials
  Future<void> disableBiometric() async {
    await _storage.write(key: _biometricEnabledKey, value: 'false');
    await _storage.delete(key: _biometricEmailKey);
    await _storage.delete(key: _biometricPasswordKey);
  }

  /// Get stored credentials for biometric login
  /// Returns email and password for re-authentication
  Future<Map<String, String>?> getStoredCredentials() async {
    final email = await _storage.read(key: _biometricEmailKey);
    final password = await _storage.read(key: _biometricPasswordKey);

    if (email == null || email.isEmpty || password == null || password.isEmpty) {
      return null;
    }

    return {'email': email, 'password': password};
  }

  /// Update stored password (e.g., after password change)
  Future<void> updateStoredPassword(String password) async {
    final isEnabled = await isBiometricEnabled();
    if (isEnabled) {
      await _storage.write(key: _biometricPasswordKey, value: password);
    }
  }

  /// Cancel any ongoing authentication
  Future<void> cancelAuthentication() async {
    try {
      await _localAuth.stopAuthentication();
    } on PlatformException {
      // Ignore errors when canceling
    }
  }
}
