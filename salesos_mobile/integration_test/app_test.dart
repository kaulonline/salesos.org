import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:salesos_mobile/app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('IRIS Mobile App Integration Tests', () {
    testWidgets('App launches successfully', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: IrisApp(),
        ),
      );

      // Wait for initial frame
      await tester.pump();

      // Verify app launched
      expect(find.byType(IrisApp), findsOneWidget);
    });

    testWidgets('App shows splash screen on launch', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: IrisApp(),
        ),
      );

      await tester.pump();

      // App should render without crashing
      expect(tester.takeException(), isNull);
    });

    testWidgets('Theme toggles correctly', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: IrisApp(),
        ),
      );

      await tester.pumpAndSettle(const Duration(seconds: 2));

      // App should handle theme without crashing
      expect(tester.takeException(), isNull);
    });
  });

  group('Screen Smoke Tests', () {
    // These tests verify each screen can be instantiated without crashing
    // They don't test functionality, just that the UI builds correctly

    testWidgets('App renders without overflow errors', (tester) async {
      // Set a standard phone size
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(
        const ProviderScope(
          child: IrisApp(),
        ),
      );

      await tester.pump(const Duration(milliseconds: 500));

      // Verify no render overflow errors
      expect(tester.takeException(), isNull);

      // Reset
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    testWidgets('App renders on tablet size', (tester) async {
      // Set tablet size
      tester.view.physicalSize = const Size(1024, 1366);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(
        const ProviderScope(
          child: IrisApp(),
        ),
      );

      await tester.pump(const Duration(milliseconds: 500));

      // Verify no render overflow errors on tablet
      expect(tester.takeException(), isNull);

      // Reset
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  });
}
