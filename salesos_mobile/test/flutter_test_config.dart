import 'dart:async';
import 'dart:io';

import 'package:flutter_animate/flutter_animate.dart';
import 'package:golden_toolkit/golden_toolkit.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Global test configuration for Flutter tests
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  // Disable flutter_animate's hot-reload restart timer to prevent
  // "Pending timers" test failures in the test environment
  Animate.restartOnHotReload = false;

  // Initialize Hive with a temp directory for tests
  final tempDir = await Directory.systemTemp.createTemp('salesos_test_');
  Hive.init(tempDir.path);

  // Initialize SharedPreferences with empty values for tests
  SharedPreferences.setMockInitialValues({});

  // Load app fonts before running golden tests
  await loadAppFonts();

  return testMain();
}
