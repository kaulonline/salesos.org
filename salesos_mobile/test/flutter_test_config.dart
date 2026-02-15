import 'dart:async';

import 'package:golden_toolkit/golden_toolkit.dart';

/// Global test configuration for Flutter tests
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  // Load app fonts before running golden tests
  await loadAppFonts();

  return testMain();
}
