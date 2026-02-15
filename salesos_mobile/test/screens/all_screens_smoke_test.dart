// IRIS Mobile - Comprehensive Screen Smoke Tests
//
// This file tests that ALL screens in the app can render without crashing.
// It doesn't test functionality - just that the UI builds correctly.
//
// Run with: flutter test test/screens/all_screens_smoke_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:network_image_mock/network_image_mock.dart';

import '../helpers/test_helpers.dart';

// Import all pages
import 'package:salesos_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/register_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/forgot_password_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/auth_mode_page.dart';
import 'package:salesos_mobile/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:salesos_mobile/features/leads/presentation/pages/leads_page.dart';
import 'package:salesos_mobile/features/contacts/presentation/pages/contacts_page.dart';
import 'package:salesos_mobile/features/accounts/presentation/pages/accounts_page.dart';
import 'package:salesos_mobile/features/deals/presentation/pages/deals_page.dart';
import 'package:salesos_mobile/features/tasks/presentation/pages/tasks_page.dart';
import 'package:salesos_mobile/features/calendar/presentation/pages/calendar_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/settings_page.dart';
import 'package:salesos_mobile/features/search/presentation/pages/search_page.dart';
import 'package:salesos_mobile/features/reports/presentation/pages/reports_page.dart';
import 'package:salesos_mobile/features/campaigns/presentation/pages/campaigns_page.dart';
import 'package:salesos_mobile/features/quotes/presentation/pages/quotes_page.dart';
import 'package:salesos_mobile/features/contracts/presentation/pages/contracts_page.dart';
import 'package:salesos_mobile/features/activity/presentation/pages/activity_page.dart';
import 'package:salesos_mobile/features/insights/presentation/pages/iris_insights_page.dart';
import 'package:salesos_mobile/features/ai_chat/presentation/pages/ai_chat_page.dart';
import 'package:salesos_mobile/features/notifications/presentation/pages/notification_center_page.dart';
import 'package:salesos_mobile/features/smart_capture/presentation/pages/smart_capture_page.dart';
import 'package:salesos_mobile/features/smart_capture/presentation/pages/smart_notes_page.dart';
import 'package:salesos_mobile/features/agents/presentation/pages/agents_hub_page.dart';

void main() {
  setupTestEnvironment();

  /// Helper to test a single screen
  Future<void> testScreen(
    WidgetTester tester,
    String name,
    Widget screen, {
    Size? screenSize,
  }) async {
    if (screenSize != null) {
      await tester.setScreenSize(screenSize);
    }

    // Use a phone-sized viewport instead of the default 800x600 to avoid
    // layout overflow errors on mobile-designed screens
    final needsPhoneSize = screenSize == null;
    if (needsPhoneSize) {
      await tester.setScreenSize(ScreenSizes.iPhone14);
    }

    await mockNetworkImagesFor(() async {
      await tester.pumpWidget(
        createTestableWidget(child: screen),
      );
      // Pump enough time to clear flutter_animate delayed timers (300ms+)
      // and let animations run to completion
      await tester.pump(const Duration(seconds: 2));
      await tester.pump(const Duration(seconds: 2));
    });

    // Test passes if no exception is thrown
    expect(tester.takeException(), isNull, reason: '$name threw an exception');

    if (needsPhoneSize) {
      await tester.resetScreenSize();
    }

    if (screenSize != null) {
      await tester.resetScreenSize();
    }
  }

  group('Auth Screens Smoke Tests', () {
    testWidgets('LoginPage renders', (tester) async {
      await testScreen(tester, 'LoginPage', const LoginPage());
    });

    testWidgets('RegisterPage renders', (tester) async {
      await testScreen(tester, 'RegisterPage', const RegisterPage());
    });

    testWidgets('ForgotPasswordPage renders', (tester) async {
      await testScreen(tester, 'ForgotPasswordPage', const ForgotPasswordPage());
    });

    testWidgets('AuthModePage renders', (tester) async {
      await testScreen(tester, 'AuthModePage', const AuthModePage());
    });
  });

  group('Main Screens Smoke Tests', () {
    testWidgets('DashboardPage renders', (tester) async {
      await testScreen(tester, 'DashboardPage', const DashboardPage());
    });

    testWidgets('LeadsPage renders', (tester) async {
      await testScreen(tester, 'LeadsPage', const LeadsPage());
    });

    testWidgets('ContactsPage renders', (tester) async {
      await testScreen(tester, 'ContactsPage', const ContactsPage());
    });

    testWidgets('AccountsPage renders', (tester) async {
      await testScreen(tester, 'AccountsPage', const AccountsPage());
    });

    testWidgets('DealsPage renders', (tester) async {
      await testScreen(tester, 'DealsPage', const DealsPage());
    });

    testWidgets('TasksPage renders', (tester) async {
      await testScreen(tester, 'TasksPage', const TasksPage());
    });

    testWidgets('CalendarPage renders', (tester) async {
      await testScreen(tester, 'CalendarPage', const CalendarPage());
    });

    testWidgets('ActivityPage renders', (tester) async {
      await testScreen(tester, 'ActivityPage', const ActivityPage());
    });
  });

  group('Feature Screens Smoke Tests', () {
    testWidgets('SearchPage renders', (tester) async {
      await testScreen(tester, 'SearchPage', const SearchPage());
    });

    testWidgets('ReportsPage renders', (tester) async {
      await testScreen(tester, 'ReportsPage', const ReportsPage());
    });

    testWidgets('CampaignsPage renders', (tester) async {
      await testScreen(tester, 'CampaignsPage', const CampaignsPage());
    });

    testWidgets('QuotesPage renders', (tester) async {
      await testScreen(tester, 'QuotesPage', const QuotesPage());
    });

    testWidgets('ContractsPage renders', (tester) async {
      await testScreen(tester, 'ContractsPage', const ContractsPage());
    });

    testWidgets('IrisInsightsPage renders', (tester) async {
      await testScreen(tester, 'IrisInsightsPage', const IrisInsightsPage());
    });

    testWidgets('AiChatPage renders', (tester) async {
      await testScreen(tester, 'AiChatPage', const AiChatPage());
    });

    testWidgets('NotificationCenterPage renders', (tester) async {
      await testScreen(tester, 'NotificationCenterPage', const NotificationCenterPage());
    });

    testWidgets('SmartCapturePage renders', (tester) async {
      await testScreen(tester, 'SmartCapturePage', const SmartCapturePage());
    });

    testWidgets('SmartNotesPage renders', (tester) async {
      await testScreen(tester, 'SmartNotesPage', const SmartNotesPage());
    });

    testWidgets('AgentsHubPage renders', (tester) async {
      await testScreen(tester, 'AgentsHubPage', const AgentsHubPage());
    });
  });

  group('Settings Screens Smoke Tests', () {
    testWidgets('SettingsPage renders', (tester) async {
      await testScreen(tester, 'SettingsPage', const SettingsPage());
    });
  });

  group('Responsive Tests - Phone Sizes', () {
    final phoneSizes = {
      'iPhone SE': ScreenSizes.iPhoneSE,
      'iPhone 14': ScreenSizes.iPhone14,
      'iPhone 14 Pro Max': ScreenSizes.iPhone14ProMax,
      'Pixel 7': ScreenSizes.pixel7,
      'Samsung S23': ScreenSizes.samsungS23,
    };

    for (final entry in phoneSizes.entries) {
      testWidgets('DashboardPage renders on ${entry.key}', (tester) async {
        await testScreen(
          tester,
          'DashboardPage on ${entry.key}',
          const DashboardPage(),
          screenSize: entry.value,
        );
      });
    }
  });

  group('Responsive Tests - Tablet Sizes', () {
    final tabletSizes = {
      'iPad Mini': ScreenSizes.iPadMini,
      'iPad': ScreenSizes.iPad,
      'iPad Pro 11"': ScreenSizes.iPadPro11,
      'iPad Pro 12.9"': ScreenSizes.iPadPro12_9,
    };

    for (final entry in tabletSizes.entries) {
      testWidgets('DashboardPage renders on ${entry.key}', (tester) async {
        await testScreen(
          tester,
          'DashboardPage on ${entry.key}',
          const DashboardPage(),
          screenSize: entry.value,
        );
      });
    }
  });

  group('Theme Tests', () {
    testWidgets('DashboardPage renders in light theme', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
            themeMode: ThemeMode.light,
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));
      });

      expect(tester.takeException(), isNull);
    });

    testWidgets('DashboardPage renders in dark theme', (tester) async {
      await mockNetworkImagesFor(() async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const DashboardPage(),
            themeMode: ThemeMode.dark,
          ),
        );
        await tester.pump(const Duration(milliseconds: 100));
      });

      expect(tester.takeException(), isNull);
    });
  });
}
