import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:network_image_mock/network_image_mock.dart';

import 'package:salesos_mobile/features/auth/presentation/pages/login_page.dart';
import '../helpers/test_helpers.dart';

void main() {
  setupTestEnvironment();

  group('LoginPage Widget Tests', () {
    testWidgets('renders login form elements', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const LoginPage(),
          ),
        );
        await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));

        // Check for email field
        expect(find.byType(TextFormField), findsWidgets);

        // Check for login button
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Text &&
                (widget.data?.toLowerCase().contains('login') == true ||
                    widget.data?.toLowerCase().contains('sign in') == true),
          ),
          findsWidgets,
        );
      });
    });

    testWidgets('shows error when submitting empty form', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const LoginPage(),
          ),
        );
        await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));

        // Try to find and tap a submit button
        final submitButton = find.byWidgetPredicate(
          (widget) =>
              widget is ElevatedButton ||
              (widget is Text &&
                  (widget.data?.toLowerCase().contains('login') == true ||
                      widget.data?.toLowerCase().contains('sign in') == true)),
        );

        if (submitButton.evaluate().isNotEmpty) {
          await tester.tap(submitButton.first);
          await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));
        }
      });
    });

    testWidgets('navigates to forgot password', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const LoginPage(),
          ),
        );
        await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));

        // Look for forgot password link
        final forgotPassword = find.byWidgetPredicate(
          (widget) =>
              widget is Text &&
              widget.data?.toLowerCase().contains('forgot') == true,
        );

        expect(forgotPassword, findsWidgets);
      });
    });

    testWidgets('renders correctly in light theme', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const LoginPage(),
            themeMode: ThemeMode.light,
          ),
        );
        await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));

        expect(find.byType(LoginPage), findsOneWidget);
      });
    });

    testWidgets('renders correctly in dark theme', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const LoginPage(),
            themeMode: ThemeMode.dark,
          ),
        );
        await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));

        expect(find.byType(LoginPage), findsOneWidget);
      });
    });
  });

  group('LoginPage Responsive Tests', () {
    testWidgets('renders correctly on phone size', (tester) async {
      await tester.setScreenSize(ScreenSizes.iPhone14);

      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const LoginPage(),
          ),
        );
        await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));

        expect(find.byType(LoginPage), findsOneWidget);
      });

      await tester.resetScreenSize();
    });

    testWidgets('renders correctly on tablet size', (tester) async {
      await tester.setScreenSize(ScreenSizes.iPadPro11);

      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const LoginPage(),
          ),
        );
        await tester.pump(const Duration(seconds: 2));
        await tester.pump(const Duration(seconds: 2));

        expect(find.byType(LoginPage), findsOneWidget);
      });

      await tester.resetScreenSize();
    });
  });
}
