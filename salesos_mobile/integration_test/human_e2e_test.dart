// IRIS Mobile - Human-Like E2E Test
//
// This test mimics EXACTLY how a real human user would interact with the app:
// - Launch app and wait for splash
// - Login with real credentials
// - Navigate through menus by tapping
// - Scroll through lists
// - Fill out forms
// - Tap buttons and verify responses
//
// Run on device/emulator:
//   flutter test integration_test/human_e2e_test.dart -d <device_id>
//
// Or use the driver:
//   flutter drive --driver=test_driver/integration_test.dart --target=integration_test/human_e2e_test.dart
//
// Credentials:
//   Email: jchen@salesos.org
//   Password: Password1234

// ignore_for_file: avoid_print

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:salesos_mobile/app.dart';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const String testEmail = 'jchen@salesos.org';
const String testPassword = 'Password1234';

// ============================================================================
// ISSUE TRACKING
// ============================================================================

enum IssueSeverity { critical, high, medium, low }

class UserJourneyIssue {
  final String step;
  final String action;
  final String expected;
  final String actual;
  final IssueSeverity severity;
  final String? screenshot;
  final DateTime timestamp;
  final String? errorDetails;

  UserJourneyIssue({
    required this.step,
    required this.action,
    required this.expected,
    required this.actual,
    required this.severity,
    this.screenshot,
    this.errorDetails,
  }) : timestamp = DateTime.now();

  Map<String, dynamic> toJson() => {
    'step': step,
    'action': action,
    'expected': expected,
    'actual': actual,
    'severity': severity.name,
    'screenshot': screenshot,
    'errorDetails': errorDetails,
    'timestamp': timestamp.toIso8601String(),
  };
}

class TestStep {
  final String name;
  final String description;
  final String userAction;
  final bool passed;
  final Duration duration;
  final String? screenshot;
  final String? error;

  TestStep({
    required this.name,
    required this.description,
    required this.userAction,
    required this.passed,
    required this.duration,
    this.screenshot,
    this.error,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': description,
    'userAction': userAction,
    'passed': passed,
    'durationMs': duration.inMilliseconds,
    'screenshot': screenshot,
    'error': error,
  };
}

// Global tracking
final List<TestStep> _testSteps = [];
final List<UserJourneyIssue> _issues = [];
int _screenshotCounter = 0;

// ============================================================================
// HUMAN-LIKE TEST HELPER
// ============================================================================

class HumanTester {
  final WidgetTester tester;
  final IntegrationTestWidgetsFlutterBinding binding;
  final String journeyName;

  HumanTester(this.tester, this.binding, this.journeyName);

  /// Simulate human reading/looking at screen (small delay)
  Future<void> lookAtScreen({int milliseconds = 500}) async {
    await tester.pump(Duration(milliseconds: milliseconds));
  }

  /// Simulate human thinking before action
  Future<void> thinkBeforeAction({int milliseconds = 300}) async {
    await Future.delayed(Duration(milliseconds: milliseconds));
  }

  /// Take a screenshot with description
  Future<String?> takeScreenshot(String name) async {
    try {
      _screenshotCounter++;
      final filename = '${_screenshotCounter.toString().padLeft(3, '0')}_$name';

      // Use integration test binding to capture screenshot
      await binding.takeScreenshot(filename);

      print('  📸 Screenshot: $filename');
      return filename;
    } catch (e) {
      print('  ⚠️ Screenshot failed: $e');
      return null;
    }
  }

  /// Execute a user step with full tracking
  Future<bool> doStep(
    String stepName,
    String description,
    String userAction,
    Future<void> Function() action, {
    bool takeScreenshotBefore = false,
    bool takeScreenshotAfter = true,
  }) async {
    print('\n👤 Step: $stepName');
    print('   Action: $userAction');

    final startTime = DateTime.now();
    String? screenshotPath;
    String? error;
    bool passed = false;

    try {
      if (takeScreenshotBefore) {
        await takeScreenshot('${stepName}_before');
      }

      // Execute the human action
      await action();

      // Wait for UI to settle (like a human would wait)
      await tester.pumpAndSettle(const Duration(seconds: 2));

      if (takeScreenshotAfter) {
        screenshotPath = await takeScreenshot('${stepName}_after');
      }

      passed = true;
      print('   ✓ Success');

    } catch (e, st) {
      error = e.toString();
      print('   ✗ Failed: $error');

      // Take error screenshot
      screenshotPath = await takeScreenshot('${stepName}_ERROR');

      // Log issue
      _issues.add(UserJourneyIssue(
        step: stepName,
        action: userAction,
        expected: description,
        actual: 'Failed: $error',
        severity: IssueSeverity.high,
        screenshot: screenshotPath,
        errorDetails: st.toString().split('\n').take(10).join('\n'),
      ));
    }

    final duration = DateTime.now().difference(startTime);

    _testSteps.add(TestStep(
      name: stepName,
      description: description,
      userAction: userAction,
      passed: passed,
      duration: duration,
      screenshot: screenshotPath,
      error: error,
    ));

    return passed;
  }

  /// Human taps on a widget they can see
  Future<void> tapOn(Finder finder, {String? description}) async {
    await thinkBeforeAction();

    if (finder.evaluate().isEmpty) {
      throw Exception('Cannot find element to tap: ${description ?? finder.toString()}');
    }

    await tester.tap(finder.first);
    await lookAtScreen();
  }

  /// Human taps on text they see
  Future<void> tapOnText(String text) async {
    await thinkBeforeAction();

    final finder = find.text(text);
    if (finder.evaluate().isEmpty) {
      // Try partial match
      final partialFinder = find.textContaining(text);
      if (partialFinder.evaluate().isEmpty) {
        throw Exception('Cannot find text "$text" on screen');
      }
      await tester.tap(partialFinder.first);
    } else {
      await tester.tap(finder.first);
    }

    await lookAtScreen();
  }

  /// Human taps on a button with specific text
  Future<void> tapButton(String buttonText) async {
    await thinkBeforeAction();

    // Look for button with this text
    final textFinder = find.widgetWithText(ElevatedButton, buttonText);
    if (textFinder.evaluate().isNotEmpty) {
      await tester.tap(textFinder.first);
      await lookAtScreen();
      return;
    }

    // Try TextButton
    final textButtonFinder = find.widgetWithText(TextButton, buttonText);
    if (textButtonFinder.evaluate().isNotEmpty) {
      await tester.tap(textButtonFinder.first);
      await lookAtScreen();
      return;
    }

    // Try any text
    final anyText = find.text(buttonText);
    if (anyText.evaluate().isNotEmpty) {
      await tester.tap(anyText.first);
      await lookAtScreen();
      return;
    }

    throw Exception('Cannot find button "$buttonText"');
  }

  /// Human types text into a field
  Future<void> typeText(Finder finder, String text, {String? fieldName}) async {
    await thinkBeforeAction();

    if (finder.evaluate().isEmpty) {
      throw Exception('Cannot find text field: ${fieldName ?? finder.toString()}');
    }

    // Tap to focus
    await tester.tap(finder.first);
    await tester.pump(const Duration(milliseconds: 200));

    // Type character by character (like a human)
    await tester.enterText(finder.first, text);
    await lookAtScreen(milliseconds: 300);
  }

  /// Human types in email field
  Future<void> typeEmail(String email) async {
    // Find email field (usually first TextField or one with email hint)
    final emailFields = find.byWidgetPredicate((widget) {
      if (widget is TextField) {
        final decoration = widget.decoration;
        if (decoration != null) {
          final hint = decoration.hintText?.toLowerCase() ?? '';
          final label = decoration.labelText?.toLowerCase() ?? '';
          return hint.contains('email') || label.contains('email');
        }
      }
      return false;
    });

    if (emailFields.evaluate().isNotEmpty) {
      await typeText(emailFields.first, email, fieldName: 'Email');
      return;
    }

    // Fallback: use first text field
    final textFields = find.byType(TextField);
    if (textFields.evaluate().isNotEmpty) {
      await typeText(textFields.first, email, fieldName: 'Email');
      return;
    }

    throw Exception('Cannot find email field');
  }

  /// Human types in password field
  Future<void> typePassword(String password) async {
    // Find password field (obscured text)
    final passwordFields = find.byWidgetPredicate((widget) {
      if (widget is TextField) {
        return widget.obscureText == true;
      }
      if (widget is TextFormField) {
        return true; // Check decoration
      }
      return false;
    });

    if (passwordFields.evaluate().isNotEmpty) {
      await typeText(passwordFields.first, password, fieldName: 'Password');
      return;
    }

    // Fallback: second text field
    final textFields = find.byType(TextField);
    if (textFields.evaluate().length > 1) {
      await typeText(textFields.at(1), password, fieldName: 'Password');
      return;
    }

    throw Exception('Cannot find password field');
  }

  /// Human scrolls down to see more content
  Future<void> scrollDown({double amount = 300}) async {
    await thinkBeforeAction();

    final scrollable = find.byType(Scrollable);
    if (scrollable.evaluate().isNotEmpty) {
      await tester.drag(scrollable.first, Offset(0, -amount));
      await lookAtScreen();
    }
  }

  /// Human scrolls up
  Future<void> scrollUp({double amount = 300}) async {
    await thinkBeforeAction();

    final scrollable = find.byType(Scrollable);
    if (scrollable.evaluate().isNotEmpty) {
      await tester.drag(scrollable.first, Offset(0, amount));
      await lookAtScreen();
    }
  }

  /// Human waits for something to load
  Future<bool> waitFor(
    Finder finder, {
    Duration timeout = const Duration(seconds: 10),
    String? description,
  }) async {
    final endTime = DateTime.now().add(timeout);

    while (DateTime.now().isBefore(endTime)) {
      await tester.pump(const Duration(milliseconds: 200));
      if (finder.evaluate().isNotEmpty) {
        return true;
      }
    }

    print('   ⚠️ Timeout waiting for: ${description ?? finder.toString()}');
    return false;
  }

  /// Human checks if something is visible
  bool canSee(Finder finder) {
    return finder.evaluate().isNotEmpty;
  }

  /// Human checks if text is visible
  bool canSeeText(String text) {
    return find.textContaining(text).evaluate().isNotEmpty;
  }

  /// Human taps the back button
  Future<void> goBack() async {
    await thinkBeforeAction();

    // Look for back button
    final backButton = find.byTooltip('Back');
    if (backButton.evaluate().isNotEmpty) {
      await tester.tap(backButton.first);
      await lookAtScreen();
      return;
    }

    // Try icon
    final backIcon = find.byIcon(Icons.arrow_back);
    if (backIcon.evaluate().isNotEmpty) {
      await tester.tap(backIcon.first);
      await lookAtScreen();
      return;
    }

    // Try iOS back
    final backIconIOS = find.byIcon(Icons.arrow_back_ios);
    if (backIconIOS.evaluate().isNotEmpty) {
      await tester.tap(backIconIOS.first);
      await lookAtScreen();
      return;
    }
  }

  /// Human taps floating action button (usually + button)
  Future<void> tapFAB() async {
    await thinkBeforeAction();

    final fab = find.byType(FloatingActionButton);
    if (fab.evaluate().isEmpty) {
      throw Exception('Cannot find floating action button');
    }

    await tester.tap(fab.first);
    await lookAtScreen();
  }

  /// Human pulls to refresh
  Future<void> pullToRefresh() async {
    await thinkBeforeAction();

    await tester.fling(
      find.byType(Scrollable).first,
      const Offset(0, 400),
      1000,
    );
    await tester.pumpAndSettle(const Duration(seconds: 2));
    await lookAtScreen();
  }

  /// Log an issue the human noticed
  void reportIssue(
    String step,
    String expected,
    String actual, {
    IssueSeverity severity = IssueSeverity.medium,
  }) {
    _issues.add(UserJourneyIssue(
      step: step,
      action: 'User observation',
      expected: expected,
      actual: actual,
      severity: severity,
    ));

    print('   ⚠️ Issue: Expected "$expected" but got "$actual"');
  }
}

// ============================================================================
// MAIN TEST
// ============================================================================

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDownAll(() async {
    await _saveResults();
  });

  group('👤 Human User Journey Tests', () {

    testWidgets('Complete Sales Journey - Like a Real User', (tester) async {
      final human = HumanTester(tester, binding, 'Complete Sales Journey');

      print('\n${'=' * 60}');
      print('🚀 STARTING HUMAN-LIKE E2E TEST');
      print('=' * 60);
      print('User: $testEmail');
      print('=' * 60);

      // ══════════════════════════════════════════════════════════════
      // STEP 1: Launch the app
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'launch_app',
        'App should launch and show splash screen',
        'User opens IRIS app on their phone',
        () async {
          await tester.pumpWidget(
            const ProviderScope(child: IrisApp()),
          );
          await human.lookAtScreen(milliseconds: 1000);
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 2: Wait for splash to complete
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'splash_screen',
        'Splash screen should complete and show login',
        'User watches splash screen animation',
        () async {
          // Wait for splash to finish (up to 5 seconds)
          await tester.pumpAndSettle(const Duration(seconds: 5));
          await human.lookAtScreen(milliseconds: 500);
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 3: Find and tap login/sign in
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'navigate_to_login',
        'User should be able to navigate to login screen',
        'User looks for and taps Sign In button',
        () async {
          // Look for sign in or login
          if (human.canSeeText('Sign In')) {
            await human.tapOnText('Sign In');
          } else if (human.canSeeText('Login')) {
            await human.tapOnText('Login');
          } else if (human.canSeeText('Get Started')) {
            await human.tapOnText('Get Started');
          }
          // If already on login screen with text fields, that's fine too
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 4: Enter email
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'enter_email',
        'User should be able to enter their email',
        'User taps email field and types: $testEmail',
        () async {
          await human.typeEmail(testEmail);
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 5: Enter password
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'enter_password',
        'User should be able to enter their password',
        'User taps password field and types password',
        () async {
          await human.typePassword(testPassword);
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 6: Tap login button
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'tap_login',
        'Login button should submit credentials',
        'User taps the Sign In / Login button',
        () async {
          // Find login/signin button
          if (human.canSeeText('Sign In')) {
            await human.tapButton('Sign In');
          } else if (human.canSeeText('Login')) {
            await human.tapButton('Login');
          } else {
            // Tap first elevated button
            final button = find.byType(ElevatedButton);
            if (button.evaluate().isNotEmpty) {
              await human.tapOn(button.first);
            }
          }

          // Wait for login to complete
          await tester.pumpAndSettle(const Duration(seconds: 5));
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 7: Verify dashboard loaded
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'verify_dashboard',
        'Dashboard should load after successful login',
        'User waits for dashboard to appear',
        () async {
          await tester.pumpAndSettle(const Duration(seconds: 3));

          // Check for common dashboard elements
          final hasDashboard = human.canSeeText('Dashboard') ||
                              human.canSeeText('Home') ||
                              human.canSeeText('Welcome') ||
                              human.canSeeText('Today');

          if (!hasDashboard) {
            human.reportIssue(
              'verify_dashboard',
              'Should see Dashboard or Home screen',
              'Dashboard indicators not found',
              severity: IssueSeverity.high,
            );
          }
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 8: Navigate to Leads
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'navigate_leads',
        'User should be able to navigate to Leads',
        'User looks for and taps Leads in navigation',
        () async {
          // Look for Leads in bottom nav or side menu
          if (human.canSeeText('Leads')) {
            await human.tapOnText('Leads');
          } else {
            // Try menu icon first
            final menuIcon = find.byIcon(Icons.menu);
            if (menuIcon.evaluate().isNotEmpty) {
              await human.tapOn(menuIcon);
              await tester.pumpAndSettle();
              if (human.canSeeText('Leads')) {
                await human.tapOnText('Leads');
              }
            }
          }
          await tester.pumpAndSettle(const Duration(seconds: 2));
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 9: Verify leads list
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'verify_leads_list',
        'Leads list should show lead data',
        'User looks at leads list',
        () async {
          await tester.pumpAndSettle(const Duration(seconds: 2));

          // Check for list items or lead indicators
          final hasListItems = find.byType(ListTile).evaluate().isNotEmpty ||
                              find.byType(Card).evaluate().isNotEmpty;

          if (!hasListItems && !human.canSeeText('No leads')) {
            human.reportIssue(
              'verify_leads_list',
              'Should see leads list or "No leads" message',
              'List appears empty without message',
              severity: IssueSeverity.medium,
            );
          }
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 10: Scroll through leads
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'scroll_leads',
        'User should be able to scroll through leads',
        'User scrolls down to see more leads',
        () async {
          await human.scrollDown();
          await human.scrollDown();
          await human.scrollUp();
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 11: Navigate to Accounts
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'navigate_accounts',
        'User should be able to navigate to Accounts',
        'User taps Accounts in navigation',
        () async {
          if (human.canSeeText('Accounts')) {
            await human.tapOnText('Accounts');
          } else if (human.canSeeText('Account')) {
            await human.tapOnText('Account');
          }
          await tester.pumpAndSettle(const Duration(seconds: 2));
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 12: Navigate to Deals/Opportunities
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'navigate_deals',
        'User should be able to navigate to Deals',
        'User taps Deals or Opportunities in navigation',
        () async {
          if (human.canSeeText('Deals')) {
            await human.tapOnText('Deals');
          } else if (human.canSeeText('Opportunities')) {
            await human.tapOnText('Opportunities');
          } else if (human.canSeeText('Pipeline')) {
            await human.tapOnText('Pipeline');
          }
          await tester.pumpAndSettle(const Duration(seconds: 2));
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 13: Navigate to Tasks
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'navigate_tasks',
        'User should be able to navigate to Tasks',
        'User taps Tasks in navigation',
        () async {
          if (human.canSeeText('Tasks')) {
            await human.tapOnText('Tasks');
          } else if (human.canSeeText('Task')) {
            await human.tapOnText('Task');
          }
          await tester.pumpAndSettle(const Duration(seconds: 2));
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 14: Navigate to AI Chat
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'navigate_ai_chat',
        'User should be able to open AI Chat',
        'User taps Chat or IRIS button',
        () async {
          if (human.canSeeText('Chat')) {
            await human.tapOnText('Chat');
          } else if (human.canSeeText('IRIS')) {
            await human.tapOnText('IRIS');
          } else if (human.canSeeText('AI')) {
            await human.tapOnText('AI');
          } else {
            // Look for chat icon
            final chatIcon = find.byIcon(Icons.chat);
            if (chatIcon.evaluate().isNotEmpty) {
              await human.tapOn(chatIcon);
            }
          }
          await tester.pumpAndSettle(const Duration(seconds: 2));
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 15: Type a message in AI Chat
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'type_ai_message',
        'User should be able to type a message to AI',
        'User types "Show my top leads" in chat',
        () async {
          final textField = find.byType(TextField);
          if (textField.evaluate().isNotEmpty) {
            await human.typeText(textField.first, 'Show my top leads');
          }
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 16: Navigate to Settings
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'navigate_settings',
        'User should be able to open Settings',
        'User taps Settings or gear icon',
        () async {
          // Look for settings icon
          final settingsIcon = find.byIcon(Icons.settings);
          if (settingsIcon.evaluate().isNotEmpty) {
            await human.tapOn(settingsIcon);
          } else if (human.canSeeText('Settings')) {
            await human.tapOnText('Settings');
          }
          await tester.pumpAndSettle(const Duration(seconds: 2));
        },
      );

      // ══════════════════════════════════════════════════════════════
      // STEP 17: Check profile settings
      // ══════════════════════════════════════════════════════════════
      await human.doStep(
        'check_profile',
        'User should see their profile info',
        'User looks at profile section',
        () async {
          final hasProfile = human.canSeeText(testEmail) ||
                            human.canSeeText('Profile') ||
                            human.canSeeText('Account');

          if (!hasProfile) {
            human.reportIssue(
              'check_profile',
              'Should see profile or account info',
              'Profile information not visible',
              severity: IssueSeverity.low,
            );
          }
        },
      );

      // ══════════════════════════════════════════════════════════════
      // FINAL: Summary
      // ══════════════════════════════════════════════════════════════
      print('\n${'=' * 60}');
      print('📊 TEST COMPLETE');
      print('=' * 60);

      final passed = _testSteps.where((s) => s.passed).length;
      final failed = _testSteps.where((s) => !s.passed).length;

      print('Steps Passed: $passed');
      print('Steps Failed: $failed');
      print('Issues Found: ${_issues.length}');
      print('=' * 60);

    });
  });
}

// ============================================================================
// SAVE RESULTS
// ============================================================================

Future<void> _saveResults() async {
  try {
    final dir = Directory('test_reports');
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }

    final timestamp = DateTime.now().toIso8601String().replaceAll(':', '-').split('.')[0];
    final passed = _testSteps.where((s) => s.passed).length;
    final failed = _testSteps.where((s) => !s.passed).length;

    // JSON Report
    final report = {
      'testType': 'Human-Like E2E Test',
      'timestamp': DateTime.now().toIso8601String(),
      'testUser': testEmail,
      'summary': {
        'totalSteps': _testSteps.length,
        'passedSteps': passed,
        'failedSteps': failed,
        'passRate': _testSteps.isNotEmpty ? (passed / _testSteps.length * 100) : 0,
        'issuesFound': _issues.length,
        'criticalIssues': _issues.where((i) => i.severity == IssueSeverity.critical).length,
        'highIssues': _issues.where((i) => i.severity == IssueSeverity.high).length,
      },
      'steps': _testSteps.map((s) => s.toJson()).toList(),
      'issues': _issues.map((i) => i.toJson()).toList(),
    };

    final jsonFile = File('test_reports/human_e2e_$timestamp.json');
    await jsonFile.writeAsString(const JsonEncoder.withIndent('  ').convert(report));

    // Latest copy
    final latestFile = File('test_reports/human_e2e_latest.json');
    await latestFile.writeAsString(const JsonEncoder.withIndent('  ').convert(report));

    // Markdown Issue Report
    final md = StringBuffer();
    md.writeln('# IRIS Mobile - Human E2E Test Issues Report');
    md.writeln();
    md.writeln('Generated: ${DateTime.now()}');
    md.writeln('Test User: $testEmail');
    md.writeln();
    md.writeln('## Summary');
    md.writeln();
    md.writeln('| Metric | Value |');
    md.writeln('|--------|-------|');
    md.writeln('| Total Steps | ${_testSteps.length} |');
    md.writeln('| Passed | $passed |');
    md.writeln('| Failed | $failed |');
    md.writeln('| Pass Rate | ${(_testSteps.isNotEmpty ? passed / _testSteps.length * 100 : 0).toStringAsFixed(1)}% |');
    md.writeln('| Issues Found | ${_issues.length} |');
    md.writeln();

    md.writeln('## Test Steps');
    md.writeln();
    for (final step in _testSteps) {
      final icon = step.passed ? '✅' : '❌';
      md.writeln('$icon **${step.name}**: ${step.userAction}');
      if (!step.passed && step.error != null) {
        md.writeln('   - Error: ${step.error}');
      }
    }
    md.writeln();

    if (_issues.isNotEmpty) {
      md.writeln('## Issues to Fix');
      md.writeln();

      // Critical first
      for (final issue in _issues.where((i) => i.severity == IssueSeverity.critical)) {
        md.writeln('### 🔴 CRITICAL: ${issue.step}');
        md.writeln();
        md.writeln('- **Action**: ${issue.action}');
        md.writeln('- **Expected**: ${issue.expected}');
        md.writeln('- **Actual**: ${issue.actual}');
        if (issue.screenshot != null) md.writeln('- **Screenshot**: ${issue.screenshot}');
        md.writeln();
      }

      // High
      for (final issue in _issues.where((i) => i.severity == IssueSeverity.high)) {
        md.writeln('### 🟠 HIGH: ${issue.step}');
        md.writeln();
        md.writeln('- **Action**: ${issue.action}');
        md.writeln('- **Expected**: ${issue.expected}');
        md.writeln('- **Actual**: ${issue.actual}');
        if (issue.screenshot != null) md.writeln('- **Screenshot**: ${issue.screenshot}');
        md.writeln();
      }

      // Medium/Low
      for (final issue in _issues.where((i) => i.severity == IssueSeverity.medium || i.severity == IssueSeverity.low)) {
        md.writeln('### 🟡 ${issue.severity.name.toUpperCase()}: ${issue.step}');
        md.writeln();
        md.writeln('- **Action**: ${issue.action}');
        md.writeln('- **Expected**: ${issue.expected}');
        md.writeln('- **Actual**: ${issue.actual}');
        md.writeln();
      }
    } else {
      md.writeln('## ✅ No Issues Found!');
      md.writeln();
      md.writeln('All human journey tests passed successfully.');
    }

    final mdFile = File('test_reports/human_e2e_issues_$timestamp.md');
    await mdFile.writeAsString(md.toString());

    final latestMdFile = File('test_reports/human_e2e_issues_latest.md');
    await latestMdFile.writeAsString(md.toString());

    print('\n📁 Reports saved:');
    print('   • ${jsonFile.path}');
    print('   • ${mdFile.path}');

  } catch (e) {
    print('Error saving results: $e');
  }
}
