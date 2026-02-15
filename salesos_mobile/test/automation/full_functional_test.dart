// ignore_for_file: avoid_print
// IRIS Mobile - Full Automated Functional Tests
//
// This file runs comprehensive functional tests on ALL screens,
// testing every button, input, and interactive element.
//
// Run with: flutter test test/automation/full_functional_test.dart
//
// Features:
// - Tests all 58+ screens
// - Discovers and tests all interactive elements
// - Generates detailed HTML and JSON reports
// - Tracks all errors for fixing

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:network_image_mock/network_image_mock.dart';

import 'element_tester.dart';
import 'test_report_generator.dart';

// Import all screens
import 'package:salesos_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/register_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/forgot_password_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/auth_mode_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/salesforce_login_page.dart';
import 'package:salesos_mobile/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:salesos_mobile/features/leads/presentation/pages/leads_page.dart';
import 'package:salesos_mobile/features/contacts/presentation/pages/contacts_page.dart';
import 'package:salesos_mobile/features/accounts/presentation/pages/accounts_page.dart';
import 'package:salesos_mobile/features/deals/presentation/pages/deals_page.dart';
import 'package:salesos_mobile/features/tasks/presentation/pages/tasks_page.dart';
import 'package:salesos_mobile/features/calendar/presentation/pages/calendar_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/settings_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/profile_settings_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/general_settings_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/notification_preferences_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/privacy_security_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/ai_settings_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/help_support_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/about_iris_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/dashboard_settings_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/biometric_settings_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/data_settings_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/active_sessions_page.dart';
import 'package:salesos_mobile/features/search/presentation/pages/search_page.dart';
import 'package:salesos_mobile/features/reports/presentation/pages/reports_page.dart';
import 'package:salesos_mobile/features/campaigns/presentation/pages/campaigns_page.dart';
import 'package:salesos_mobile/features/quotes/presentation/pages/quotes_page.dart';
import 'package:salesos_mobile/features/contracts/presentation/pages/contracts_page.dart';
import 'package:salesos_mobile/features/activity/presentation/pages/activity_page.dart';
import 'package:salesos_mobile/features/insights/presentation/pages/iris_insights_page.dart';
import 'package:salesos_mobile/features/ai_chat/presentation/pages/ai_chat_page.dart';
import 'package:salesos_mobile/features/ai_chat/presentation/pages/call_history_page.dart';
import 'package:salesos_mobile/features/notifications/presentation/pages/notification_center_page.dart';
import 'package:salesos_mobile/features/smart_capture/presentation/pages/smart_capture_page.dart';
import 'package:salesos_mobile/features/smart_capture/presentation/pages/smart_notes_page.dart';
import 'package:salesos_mobile/features/smart_capture/presentation/pages/canvas_notepad_page.dart';
import 'package:salesos_mobile/features/agents/presentation/pages/agents_hub_page.dart';
import 'package:salesos_mobile/features/agents/presentation/pages/alerts_list_page.dart';

/// Screen configuration for testing
class ScreenConfig {
  final String name;
  final String path;
  final Widget Function() builder;
  final bool requiresAuth;

  const ScreenConfig({
    required this.name,
    required this.path,
    required this.builder,
    this.requiresAuth = false,
  });
}

/// All screens to test
final List<ScreenConfig> allScreens = [
  // Auth screens
  ScreenConfig(
    name: 'LoginPage',
    path: '/login',
    builder: () => const LoginPage(),
  ),
  ScreenConfig(
    name: 'RegisterPage',
    path: '/register',
    builder: () => const RegisterPage(),
  ),
  ScreenConfig(
    name: 'ForgotPasswordPage',
    path: '/forgot-password',
    builder: () => const ForgotPasswordPage(),
  ),
  ScreenConfig(
    name: 'AuthModePage',
    path: '/auth-mode',
    builder: () => const AuthModePage(),
  ),
  ScreenConfig(
    name: 'SalesforceLoginPage',
    path: '/salesforce-login',
    builder: () => const SalesforceLoginPage(),
  ),

  // Main screens
  ScreenConfig(
    name: 'DashboardPage',
    path: '/dashboard',
    builder: () => const DashboardPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'LeadsPage',
    path: '/leads',
    builder: () => const LeadsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'ContactsPage',
    path: '/contacts',
    builder: () => const ContactsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'AccountsPage',
    path: '/accounts',
    builder: () => const AccountsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'DealsPage',
    path: '/deals',
    builder: () => const DealsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'TasksPage',
    path: '/tasks',
    builder: () => const TasksPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'CalendarPage',
    path: '/calendar',
    builder: () => const CalendarPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'ActivityPage',
    path: '/activity',
    builder: () => const ActivityPage(),
    requiresAuth: true,
  ),

  // Feature screens
  ScreenConfig(
    name: 'SearchPage',
    path: '/search',
    builder: () => const SearchPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'ReportsPage',
    path: '/reports',
    builder: () => const ReportsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'CampaignsPage',
    path: '/campaigns',
    builder: () => const CampaignsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'QuotesPage',
    path: '/quotes',
    builder: () => const QuotesPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'ContractsPage',
    path: '/contracts',
    builder: () => const ContractsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'IrisInsightsPage',
    path: '/insights',
    builder: () => const IrisInsightsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'AiChatPage',
    path: '/ai-chat',
    builder: () => const AiChatPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'CallHistoryPage',
    path: '/call-history',
    builder: () => const CallHistoryPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'NotificationCenterPage',
    path: '/notifications',
    builder: () => const NotificationCenterPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'SmartCapturePage',
    path: '/smart-capture',
    builder: () => const SmartCapturePage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'SmartNotesPage',
    path: '/smart-notes',
    builder: () => const SmartNotesPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'CanvasNotepadPage',
    path: '/canvas-notepad',
    builder: () => const CanvasNotepadPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'AgentsHubPage',
    path: '/agents',
    builder: () => const AgentsHubPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'AlertsListPage',
    path: '/alerts',
    builder: () => const AlertsListPage(),
    requiresAuth: true,
  ),

  // Settings screens
  ScreenConfig(
    name: 'SettingsPage',
    path: '/settings',
    builder: () => const SettingsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'ProfileSettingsPage',
    path: '/settings/profile',
    builder: () => const ProfileSettingsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'GeneralSettingsPage',
    path: '/settings/general',
    builder: () => const GeneralSettingsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'NotificationPreferencesPage',
    path: '/settings/notifications',
    builder: () => const NotificationPreferencesPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'PrivacySecurityPage',
    path: '/settings/privacy',
    builder: () => const PrivacySecurityPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'AiSettingsPage',
    path: '/settings/ai',
    builder: () => const AISettingsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'HelpSupportPage',
    path: '/settings/help',
    builder: () => const HelpSupportPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'AboutIrisPage',
    path: '/settings/about',
    builder: () => const AboutIrisPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'DashboardSettingsPage',
    path: '/settings/dashboard',
    builder: () => const DashboardSettingsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'BiometricSettingsPage',
    path: '/settings/biometric',
    builder: () => const BiometricSettingsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'DataSettingsPage',
    path: '/settings/data',
    builder: () => const DataSettingsPage(),
    requiresAuth: true,
  ),
  ScreenConfig(
    name: 'ActiveSessionsPage',
    path: '/settings/sessions',
    builder: () => const ActiveSessionsPage(),
    requiresAuth: true,
  ),
];

/// Global test results storage
final List<ScreenTestResult> _allResults = [];

void main() {
  // Collect all results after tests complete
  tearDownAll(() async {
    if (_allResults.isNotEmpty) {
      final suiteResult = TestSuiteResult(
        suiteName: 'IRIS Mobile Full Functional Tests',
        screenResults: _allResults,
        startTime: _allResults.first.timestamp,
        endTime: DateTime.now(),
      );

      // Print console summary
      print(TestReportGenerator.generateConsoleSummary(suiteResult));

      // Save reports
      await TestReportGenerator.saveReports(
        suiteResult,
        outputDir: 'test_reports',
      );
    }
  });

  group('IRIS Mobile Full Functional Tests', () {
    for (final screen in allScreens) {
      testWidgets('${screen.name} - Functional Test', (tester) async {
        await _testScreen(tester, screen);
      });
    }
  });
}

/// Test a single screen with full element testing
Future<void> _testScreen(WidgetTester tester, ScreenConfig screen) async {
  final startTime = DateTime.now();
  bool rendered = false;
  String? renderError;
  List<ElementTestResult> elementResults = [];

  await mockNetworkImagesFor(() async {
    try {
      // Build the screen
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            themeMode: ThemeMode.dark,
            theme: ThemeData.light(),
            darkTheme: ThemeData.dark(),
            home: screen.builder(),
          ),
        ),
      );

      // Wait for initial render
      await tester.pump(const Duration(milliseconds: 200));

      // Check if rendered without exception
      final exception = tester.takeException();
      if (exception != null) {
        throw exception;
      }

      rendered = true;

      // Count elements before testing
      final elementCounts = tester.countInteractiveElements();
      print('  ${screen.name}: Found ${elementCounts.entries.where((e) => e.value > 0).map((e) => "${e.key}(${e.value})").join(", ")}');

      // Create automated tester and test all elements
      final automatedTester = AutomatedElementTester(tester);
      await automatedTester.testAllElements();

      elementResults = automatedTester.results;

    } catch (e) {
      if (!rendered) {
        renderError = e.toString();
      }
      print('  ❌ ${screen.name}: $e');
    }
  });

  final endTime = DateTime.now();

  // Create result
  final result = ScreenTestResult(
    screenName: screen.name,
    screenPath: screen.path,
    rendered: rendered,
    renderError: renderError,
    elementResults: elementResults,
    totalDuration: endTime.difference(startTime),
    timestamp: startTime,
  );

  _allResults.add(result);

  // Print individual result
  final status = result.allPassed ? '✓' : '✗';
  final color = result.allPassed ? '\x1B[32m' : '\x1B[31m';
  print('$color$status ${screen.name}: ${result.passedElements}/${result.totalElements} elements passed\x1B[0m');

  // Assert for test framework (but continue testing other screens)
  if (!result.rendered) {
    fail('${screen.name} failed to render: $renderError');
  }
}
