// Test Driver for Integration Tests
//
// This file enables the flutter drive command to run integration tests.
//
// Usage:
//   flutter drive --driver=test_driver/integration_test.dart --target=integration_test/human_e2e_test.dart -d <device_id>
//
// Or for web:
//   flutter drive --driver=test_driver/integration_test.dart --target=integration_test/human_e2e_test.dart -d chrome

import 'package:integration_test/integration_test_driver.dart';

Future<void> main() => integrationDriver();
