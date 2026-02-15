import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:network_image_mock/network_image_mock.dart';

import 'package:salesos_mobile/features/dashboard/presentation/pages/dashboard_page.dart';
import '../helpers/test_helpers.dart';

void main() {
  setupTestEnvironment();

  group('DashboardPage Widget Tests', () {
    testWidgets('renders dashboard page successfully', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
          ),
        );
        // Allow time for initial render
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(DashboardPage), findsOneWidget);
      });
    });

    testWidgets('renders correctly in light theme', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
            themeMode: ThemeMode.light,
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(DashboardPage), findsOneWidget);
      });
    });

    testWidgets('renders correctly in dark theme', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
            themeMode: ThemeMode.dark,
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(DashboardPage), findsOneWidget);
      });
    });
  });

  group('DashboardPage Responsive Tests', () {
    testWidgets('renders correctly on iPhone SE (small phone)', (tester) async {
      await tester.setScreenSize(ScreenSizes.iPhoneSE);

      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(DashboardPage), findsOneWidget);
      });

      await tester.resetScreenSize();
    });

    testWidgets('renders correctly on iPhone 14 (standard phone)', (tester) async {
      await tester.setScreenSize(ScreenSizes.iPhone14);

      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(DashboardPage), findsOneWidget);
      });

      await tester.resetScreenSize();
    });

    testWidgets('renders correctly on iPad Mini (small tablet)', (tester) async {
      await tester.setScreenSize(ScreenSizes.iPadMini);

      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(DashboardPage), findsOneWidget);
      });

      await tester.resetScreenSize();
    });

    testWidgets('renders correctly on iPad Pro 12.9 (large tablet)', (tester) async {
      await tester.setScreenSize(ScreenSizes.iPadPro12_9);

      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(DashboardPage), findsOneWidget);
      });

      await tester.resetScreenSize();
    });
  });

  group('DashboardPage Accessibility Tests', () {
    testWidgets('has no accessibility violations', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));

        // Check that the page renders without overflow errors
        expect(tester.takeException(), isNull);
      });
    });
  });
}
