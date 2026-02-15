// ignore_for_file: avoid_print
// IRIS Mobile - Individual Screen Tester
//
// Use this to test individual screens and get detailed reports.
// More practical for fixing issues one screen at a time.
//
// Run: flutter test test/automation/screen_tester.dart

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:network_image_mock/network_image_mock.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:salesos_mobile/core/services/user_preferences_service.dart';

import 'element_tester.dart';

// Import screens to test
import 'package:salesos_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/register_page.dart';
import 'package:salesos_mobile/features/auth/presentation/pages/forgot_password_page.dart';
import 'package:salesos_mobile/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:salesos_mobile/features/leads/presentation/pages/leads_page.dart';
import 'package:salesos_mobile/features/contacts/presentation/pages/contacts_page.dart';
import 'package:salesos_mobile/features/accounts/presentation/pages/accounts_page.dart';
import 'package:salesos_mobile/features/deals/presentation/pages/deals_page.dart';
import 'package:salesos_mobile/features/tasks/presentation/pages/tasks_page.dart';
import 'package:salesos_mobile/features/settings/presentation/pages/settings_page.dart';
import 'package:salesos_mobile/features/search/presentation/pages/search_page.dart';
import 'package:salesos_mobile/features/ai_chat/presentation/pages/ai_chat_page.dart';

void main() {
  final List<ScreenTestResult> results = [];

  setUpAll(() async {
    Animate.restartOnHotReload = false;
    final tempDir = await Directory.systemTemp.createTemp('salesos_test_');
    Hive.init(tempDir.path);
    SharedPreferences.setMockInitialValues({});
  });

  tearDownAll(() {
    // Print summary
    _printSummary(results);

    // Save quick report
    _saveQuickReport(results);
  });

  group('Auth Screens', () {
    testWidgets('LoginPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'LoginPage',
        '/login',
        const LoginPage(),
      );
      results.add(result);
    });

    testWidgets('RegisterPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'RegisterPage',
        '/register',
        const RegisterPage(),
      );
      results.add(result);
    });

    testWidgets('ForgotPasswordPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'ForgotPasswordPage',
        '/forgot-password',
        const ForgotPasswordPage(),
      );
      results.add(result);
    });
  });

  group('Main Screens', () {
    testWidgets('DashboardPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'DashboardPage',
        '/dashboard',
        const DashboardPage(),
      );
      results.add(result);
    });

    testWidgets('LeadsPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'LeadsPage',
        '/leads',
        const LeadsPage(),
      );
      results.add(result);
    });

    testWidgets('ContactsPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'ContactsPage',
        '/contacts',
        const ContactsPage(),
      );
      results.add(result);
    });

    testWidgets('AccountsPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'AccountsPage',
        '/accounts',
        const AccountsPage(),
      );
      results.add(result);
    });

    testWidgets('DealsPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'DealsPage',
        '/deals',
        const DealsPage(),
      );
      results.add(result);
    });

    testWidgets('TasksPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'TasksPage',
        '/tasks',
        const TasksPage(),
      );
      results.add(result);
    });
  });

  group('Feature Screens', () {
    testWidgets('SearchPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'SearchPage',
        '/search',
        const SearchPage(),
      );
      results.add(result);
    });

    testWidgets('SettingsPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'SettingsPage',
        '/settings',
        const SettingsPage(),
      );
      results.add(result);
    });

    testWidgets('AiChatPage functional test', (tester) async {
      final result = await _testScreenFunctionally(
        tester,
        'AiChatPage',
        '/ai-chat',
        const AiChatPage(),
      );
      results.add(result);
    });
  });
}

/// Test a screen and all its interactive elements
Future<ScreenTestResult> _testScreenFunctionally(
  WidgetTester tester,
  String screenName,
  String screenPath,
  Widget screen,
) async {
  final startTime = DateTime.now();
  bool rendered = false;
  String? renderError;
  List<ElementTestResult> elementResults = [];

  await mockNetworkImagesFor(() async {
    try {
      // Build screen with GoRouter so context.push/go works
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => screen,
          ),
          GoRoute(
            path: '/:rest(.*)',
            builder: (context, state) => const SizedBox.shrink(),
          ),
        ],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(
              await SharedPreferences.getInstance(),
            ),
          ],
          child: MaterialApp.router(
            debugShowCheckedModeBanner: false,
            themeMode: ThemeMode.dark,
            theme: ThemeData.light(),
            darkTheme: ThemeData.dark(),
            routerConfig: router,
          ),
        ),
      );

      await tester.pump(const Duration(seconds: 2));
      await tester.pump(const Duration(seconds: 2));

      // Check for render exception (ignore overflow in test viewport)
      Object? exception;
      while ((exception = tester.takeException()) != null) {
        if (!exception.toString().contains('overflowed')) {
          throw exception!;
        }
      }

      rendered = true;

      // Log element counts
      final counts = tester.countInteractiveElements();
      final nonZeroCounts = counts.entries.where((e) => e.value > 0);
      print('  📱 $screenName elements: ${nonZeroCounts.map((e) => "${e.key}(${e.value})").join(", ")}');

      // Test all elements
      final automatedTester = AutomatedElementTester(tester);
      await automatedTester.testAllElements();
      elementResults = automatedTester.results;

    } catch (e) {
      if (!rendered) {
        renderError = e.toString();
        print('  ❌ $screenName render error: $e');
      }
    }
  });

  final result = ScreenTestResult(
    screenName: screenName,
    screenPath: screenPath,
    rendered: rendered,
    renderError: renderError,
    elementResults: elementResults,
    totalDuration: DateTime.now().difference(startTime),
    timestamp: startTime,
  );

  // Print result
  _printScreenResult(result);

  return result;
}

void _printScreenResult(ScreenTestResult result) {
  if (!result.rendered) {
    print('  ❌ ${result.screenName}: RENDER FAILED');
    return;
  }

  final status = result.allPassed ? '✓' : '⚠';
  final statusColor = result.allPassed ? '\x1B[32m' : '\x1B[33m';

  print('$statusColor  $status ${result.screenName}: ${result.passedElements}/${result.totalElements} elements OK\x1B[0m');

  if (result.failures.isNotEmpty) {
    for (final failure in result.failures.take(5)) {
      print('     └─ ✗ ${failure.elementType}: ${failure.errorMessage}');
    }
    if (result.failures.length > 5) {
      print('     └─ ... and ${result.failures.length - 5} more failures');
    }
  }
}

void _printSummary(List<ScreenTestResult> results) {
  final passed = results.where((r) => r.allPassed).length;
  final failed = results.where((r) => !r.allPassed).length;
  final totalElements = results.fold<int>(0, (sum, r) => sum + r.totalElements);
  final passedElements = results.fold<int>(0, (sum, r) => sum + r.passedElements);

  print('\n');
  print('═' * 60);
  print('SUMMARY');
  print('─' * 60);
  print('Screens: $passed/${results.length} passed');
  print('Elements: $passedElements/$totalElements passed');

  if (failed > 0) {
    print('\nFailed screens:');
    for (final result in results.where((r) => !r.allPassed)) {
      print('  • ${result.screenName}: ${result.failedElements} failures');
    }
  }
  print('═' * 60);
}

void _saveQuickReport(List<ScreenTestResult> results) {
  try {
    final dir = Directory('test_reports');
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }

    final report = {
      'timestamp': DateTime.now().toIso8601String(),
      'totalScreens': results.length,
      'passedScreens': results.where((r) => r.allPassed).length,
      'failedScreens': results.where((r) => !r.allPassed).length,
      'screens': results.map((r) => {
        'name': r.screenName,
        'path': r.screenPath,
        'rendered': r.rendered,
        'renderError': r.renderError,
        'totalElements': r.totalElements,
        'passedElements': r.passedElements,
        'failedElements': r.failedElements,
        'failures': r.failures.map((f) => {
          'type': f.elementType,
          'identifier': f.elementText,
          'action': f.testAction,
          'error': f.errorMessage,
        }).toList(),
      }).toList(),
    };

    final file = File('test_reports/quick_report.json');
    file.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(report));
    print('\n📁 Report saved to: test_reports/quick_report.json');
  } catch (e) {
    print('Could not save report: $e');
  }
}
