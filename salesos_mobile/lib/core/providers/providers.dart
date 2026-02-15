import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Export auth mode provider
export 'auth_mode_provider.dart';

// Export connectivity provider
export 'connectivity_provider.dart';

/// Secure storage provider
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
});

/// Shared preferences provider
final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) {
  return SharedPreferences.getInstance();
});

/// Theme mode provider (stored preference)
final themeModeProvider = NotifierProvider<ThemeModeNotifier, bool>(ThemeModeNotifier.new);

class ThemeModeNotifier extends Notifier<bool> {
  @override
  bool build() => true; // Default to dark mode

  void toggle() => state = !state;
  void setDarkMode() => state = true;
  void setLightMode() => state = false;
}

/// App initialization state provider
final appInitializedProvider = NotifierProvider<AppInitializedNotifier, bool>(AppInitializedNotifier.new);

class AppInitializedNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void setInitialized(bool value) => state = value;
}

/// Current user ID provider
final currentUserIdProvider = NotifierProvider<CurrentUserIdNotifier, String?>(CurrentUserIdNotifier.new);

class CurrentUserIdNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void setUserId(String? id) => state = id;
}
