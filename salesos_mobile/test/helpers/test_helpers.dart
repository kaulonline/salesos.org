import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:network_image_mock/network_image_mock.dart';

import 'package:salesos_mobile/core/network/api_client.dart';
import 'package:salesos_mobile/features/auth/data/repositories/auth_repository.dart';
import 'package:salesos_mobile/features/auth/domain/entities/user.dart';

// ============================================================================
// MOCK CLASSES
// ============================================================================

class MockApiClient extends Mock implements ApiClient {}

class MockAuthRepository extends Mock implements AuthRepository {}

class MockNavigatorObserver extends Mock implements NavigatorObserver {}

// ============================================================================
// FAKE CLASSES (for registerFallbackValue)
// ============================================================================

class FakeRoute extends Fake implements Route<dynamic> {}

class FakeUser extends Fake implements User {}

// ============================================================================
// TEST FIXTURES
// ============================================================================

class TestFixtures {
  static User get testUser => User(
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

  static Map<String, dynamic> get testUserJson => {
        'id': 'test-user-123',
        'email': 'test@example.com',
        'name': 'Test User',
        'role': 'USER',
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };

  static Map<String, dynamic> get testLead => {
        'id': 'lead-123',
        'firstName': 'John',
        'lastName': 'Doe',
        'email': 'john@example.com',
        'company': 'Acme Corp',
        'status': 'NEW',
        'score': 85,
      };

  static Map<String, dynamic> get testAccount => {
        'id': 'account-123',
        'name': 'Acme Corporation',
        'industry': 'Technology',
        'website': 'https://acme.com',
        'annualRevenue': 1000000,
      };

  static Map<String, dynamic> get testContact => {
        'id': 'contact-123',
        'firstName': 'Jane',
        'lastName': 'Smith',
        'email': 'jane@acme.com',
        'phone': '+1234567890',
        'title': 'CEO',
      };

  static Map<String, dynamic> get testOpportunity => {
        'id': 'opp-123',
        'name': 'Big Deal',
        'amount': 50000,
        'stage': 'Proposal',
        'probability': 60,
        'closeDate': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
      };

  static Map<String, dynamic> get testTask => {
        'id': 'task-123',
        'subject': 'Follow up call',
        'status': 'PENDING',
        'priority': 'HIGH',
        'dueDate': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
      };
}

// ============================================================================
// WIDGET TEST WRAPPER
// ============================================================================

/// Wraps a widget with all necessary providers and material app for testing
Widget createTestableWidget({
  required Widget child,
  List<Override>? overrides,
  ThemeMode themeMode = ThemeMode.dark,
  NavigatorObserver? navigatorObserver,
  String? initialRoute,
}) {
  return ProviderScope(
    overrides: overrides ?? [],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: ThemeData.light(),
      darkTheme: ThemeData.dark(),
      home: child,
      navigatorObservers: navigatorObserver != null ? [navigatorObserver] : [],
      initialRoute: initialRoute,
    ),
  );
}

/// Wraps a widget for testing with network image mocking
Future<void> pumpTestWidget(
  WidgetTester tester,
  Widget widget, {
  List<Override>? overrides,
  Duration? duration,
}) async {
  await mockNetworkImagesFor(() async {
    await tester.pumpWidget(
      createTestableWidget(
        child: widget,
        overrides: overrides,
      ),
    );
    if (duration != null) {
      await tester.pump(duration);
    } else {
      await tester.pumpAndSettle();
    }
  });
}

// ============================================================================
// COMMON TEST SETUP
// ============================================================================

void setupTestEnvironment() {
  setUpAll(() {
    // Register fallback values for mocktail
    registerFallbackValue(FakeRoute());
    registerFallbackValue(FakeUser());
  });
}

// ============================================================================
// CUSTOM MATCHERS
// ============================================================================

/// Matcher for finding widgets by semantic label
Finder findBySemanticsLabel(String label) {
  return find.bySemanticsLabel(label);
}

/// Matcher for finding widgets containing specific text (partial match)
Finder findTextContaining(String text) {
  return find.byWidgetPredicate(
    (widget) => widget is Text && widget.data?.contains(text) == true,
  );
}

/// Matcher for finding RichText containing specific text
Finder findRichTextContaining(String text) {
  return find.byWidgetPredicate(
    (widget) => widget is RichText && widget.text.toPlainText().contains(text),
  );
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

extension WidgetTesterExtensions on WidgetTester {
  /// Enters text in a text field identified by key
  Future<void> enterTextByKey(Key key, String text) async {
    await tap(find.byKey(key));
    await pumpAndSettle();
    await enterText(find.byKey(key), text);
    await pumpAndSettle();
  }

  /// Scrolls until a widget is visible
  Future<void> scrollUntilVisible(
    Finder finder, {
    double delta = 100,
    int maxScrolls = 50,
    Duration duration = const Duration(milliseconds: 50),
  }) async {
    int scrolls = 0;
    while (scrolls < maxScrolls && finder.evaluate().isEmpty) {
      await drag(find.byType(Scrollable).first, Offset(0, -delta));
      await pump(duration);
      scrolls++;
    }
  }

  /// Waits for animations to complete
  Future<void> waitForAnimations() async {
    await pumpAndSettle(const Duration(milliseconds: 500));
  }

  /// Simulates pull-to-refresh gesture
  Future<void> pullToRefresh() async {
    await fling(
      find.byType(RefreshIndicator),
      const Offset(0, 300),
      1000,
    );
    await pumpAndSettle();
  }
}

// ============================================================================
// SCREEN SIZE HELPERS
// ============================================================================

class ScreenSizes {
  // Phone sizes
  static const Size iPhoneSE = Size(375, 667);
  static const Size iPhone14 = Size(390, 844);
  static const Size iPhone14ProMax = Size(430, 932);
  static const Size pixel7 = Size(412, 915);
  static const Size samsungS23 = Size(360, 780);

  // Tablet sizes
  static const Size iPadMini = Size(744, 1133);
  static const Size iPad = Size(810, 1080);
  static const Size iPadPro11 = Size(834, 1194);
  static const Size iPadPro12_9 = Size(1024, 1366);
}

extension WidgetTesterScreenSize on WidgetTester {
  /// Sets the screen size for testing different device sizes
  Future<void> setScreenSize(Size size) async {
    await binding.setSurfaceSize(size);
    view.physicalSize = size;
    view.devicePixelRatio = 1.0;
  }

  /// Resets screen size to default
  Future<void> resetScreenSize() async {
    await binding.setSurfaceSize(null);
    view.resetPhysicalSize();
    view.resetDevicePixelRatio();
  }
}
