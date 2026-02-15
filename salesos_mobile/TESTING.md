# IRIS Mobile Testing Guide

## Test Credentials

```
Email: jchen@iriseller.com
Password: Password1234
```

---

## Human-Like E2E Testing (NEW)

We have a comprehensive human-like E2E testing framework that simulates real user behavior:

### Key Features

1. **Simulates Real User Behavior**: Tests launch the app, wait for splash, type credentials, navigate through menus, scroll lists, and interact with buttons exactly like a human would.

2. **Captures Screenshots**: At each step, screenshots are captured to document the state of the app.

3. **Tracks Issues**: Any failures or unexpected behavior are logged with severity levels (critical, high, medium, low).

4. **Generates Reports**: JSON and Markdown reports are generated after each test run.

### Running Human E2E Tests

#### On iOS/Android Device or Simulator:

```bash
# List available devices
flutter devices

# Run human E2E test
flutter drive \
  --driver=test_driver/integration_test.dart \
  --target=integration_test/human_e2e_test.dart \
  -d "iPhone 15"  # or your device ID
```

#### Test Journey Steps:

1. Launch app and watch splash screen
2. Navigate to login screen
3. Enter email: jchen@iriseller.com
4. Enter password: Password1234
5. Tap login button
6. Verify dashboard loaded
7. Navigate to Leads and scroll
8. Navigate to Accounts
9. Navigate to Deals
10. Navigate to Tasks
11. Open AI Chat
12. Navigate to Settings
13. Check profile info

### API Testing (No Device Required)

```bash
./scripts/test_sales_journey_api.sh
```

### Reports Location

```
test_reports/
├── human_e2e_latest.json      # Latest test results (JSON)
├── human_e2e_issues_latest.md # Latest issues (Markdown)
├── screenshots/               # Test screenshots
└── test_output.log           # Raw test output
```

---

## Quick Start

```bash
# Install dependencies
flutter pub get

# Run all tests
flutter test

# Run specific test suites
./scripts/run_tests.sh smoke      # Smoke tests (all screens render)
./scripts/run_tests.sh widget     # Widget component tests
./scripts/run_tests.sh screen     # Screen-level tests
./scripts/run_tests.sh coverage   # Tests with coverage report
```

## Test Structure

```
iris_mobile/
├── test/
│   ├── helpers/
│   │   └── test_helpers.dart      # Mocks, fixtures, test utilities
│   ├── widgets/
│   │   └── luxury_card_test.dart  # Widget component tests
│   ├── screens/
│   │   ├── login_page_test.dart   # Individual screen tests
│   │   ├── dashboard_page_test.dart
│   │   └── all_screens_smoke_test.dart  # Tests all 58 screens
│   ├── golden/
│   │   └── golden_test.dart       # Visual regression tests
│   ├── flutter_test_config.dart   # Test configuration
│   └── widget_test.dart           # Basic app smoke test
└── integration_test/
    └── app_test.dart              # Full app integration tests
```

## Test Types

### 1. Smoke Tests (Recommended First)
Verifies all screens can render without crashing.

```bash
flutter test test/screens/all_screens_smoke_test.dart
```

### 2. Widget Tests
Tests individual components in isolation.

```bash
flutter test test/widgets/
```

### 3. Screen Tests
Tests complete screens with interactions.

```bash
flutter test test/screens/
```

### 4. Integration Tests
Tests full app flows on device/emulator.

```bash
flutter test integration_test/
```

### 5. Golden Tests (Visual Regression)
Compares screenshots against saved "golden" files.

```bash
# Update golden files (first time or after intentional changes)
flutter test --update-goldens test/golden/

# Run golden comparisons
flutter test test/golden/
```

### 6. Coverage Report
```bash
flutter test --coverage
# View: coverage/lcov.info
```

## Test Utilities

### TestFixtures
Pre-built test data for common entities:

```dart
import '../helpers/test_helpers.dart';

final user = TestFixtures.testUser;
final lead = TestFixtures.testLead;
final account = TestFixtures.testAccount;
```

### ScreenSizes
Test responsive layouts:

```dart
await tester.setScreenSize(ScreenSizes.iPhone14);
await tester.setScreenSize(ScreenSizes.iPadPro12_9);
await tester.resetScreenSize();
```

Available sizes:
- Phone: `iPhoneSE`, `iPhone14`, `iPhone14ProMax`, `pixel7`, `samsungS23`
- Tablet: `iPadMini`, `iPad`, `iPadPro11`, `iPadPro12_9`

### createTestableWidget
Wraps widgets with providers for testing:

```dart
await tester.pumpWidget(
  createTestableWidget(
    child: const MyWidget(),
    themeMode: ThemeMode.dark,
    overrides: [/* provider overrides */],
  ),
);
```

### pumpTestWidget
Helper for widget tests with network image mocking:

```dart
await pumpTestWidget(tester, const MyWidget());
```

## Writing New Tests

### Screen Test Template

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:network_image_mock/network_image_mock.dart';
import '../helpers/test_helpers.dart';
import 'package:iris_mobile/features/my_feature/presentation/pages/my_page.dart';

void main() {
  setupTestEnvironment();

  group('MyPage Tests', () {
    testWidgets('renders successfully', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(child: const MyPage()),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(MyPage), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    });

    testWidgets('renders on tablet', (tester) async {
      await tester.setScreenSize(ScreenSizes.iPadPro11);

      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(child: const MyPage()),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(tester.takeException(), isNull);
      });

      await tester.resetScreenSize();
    });
  });
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Flutter Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'

      - name: Install dependencies
        run: flutter pub get
        working-directory: iris_mobile

      - name: Run tests
        run: flutter test --coverage
        working-directory: iris_mobile

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: iris_mobile/coverage/lcov.info
```

## Best Practices

1. **Always use `mockNetworkImagesFor`** when testing widgets with network images
2. **Use `pump()` not `pumpAndSettle()`** for pages with background services
3. **Reset screen size** after responsive tests
4. **Mock external services** to avoid network calls in tests
5. **Run smoke tests** before pushing changes
6. **Update golden files** only when visual changes are intentional

## Troubleshooting

### "Timer still pending" error
Use `pump()` with a duration instead of `pumpAndSettle()`:
```dart
await tester.pump(const Duration(milliseconds: 100));
```

### Network image errors
Wrap tests with `mockNetworkImagesFor`:
```dart
await mockNetworkImagesFor(() async {
  // your test code
});
```

### Golden test failures on CI
Generate golden files on the same platform as CI (usually Linux).
