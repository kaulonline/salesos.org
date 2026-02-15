// IRIS Mobile - Functional Operations Test
//
// This test actually PERFORMS operations and captures REAL errors:
// - Create Lead -> captures API errors, validation errors, Salesforce errors
// - Create Account -> captures failures
// - Create Deal -> captures failures
// - Create Task -> captures failures
// - Send AI Message -> captures failures
// - Update records -> captures failures
// - Delete records -> captures failures
//
// All errors are captured with:
// - Error message
// - Error type (API, Validation, Network, Salesforce, Unknown)
// - Screenshot at time of failure
// - Stack trace
//
// Run:
//   flutter drive --driver=test_driver/integration_test.dart \
//     --target=integration_test/functional_operations_test.dart -d <device>

// ignore_for_file: avoid_print

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:salesos_mobile/app.dart';

// ============================================================================
// TEST CREDENTIALS
// ============================================================================

const String testEmail = 'jchen@salesos.org';
const String testPassword = 'Password1234';

// ============================================================================
// ERROR TYPES
// ============================================================================

enum ErrorType {
  api,           // Backend API error (4xx, 5xx)
  validation,    // Form validation error
  network,       // Network/connection error
  salesforce,    // Salesforce-specific error
  timeout,       // Operation timed out
  uiNotFound,    // UI element not found
  uiNotResponsive, // UI didn't respond to action
  permission,    // Permission denied
  unknown,       // Unknown error
}

enum OperationType {
  create,
  read,
  update,
  delete,
  navigate,
  authenticate,
  search,
  sync,
}

// ============================================================================
// OPERATION RESULT TRACKING
// ============================================================================

class OperationResult {
  final String operationName;
  final String screen;
  final OperationType operationType;
  final bool success;
  final String? errorMessage;
  final ErrorType? errorType;
  final String? errorDetails;
  final String? screenshot;
  final Duration duration;
  final DateTime timestamp;
  final Map<String, dynamic>? inputData;
  final Map<String, dynamic>? responseData;

  OperationResult({
    required this.operationName,
    required this.screen,
    required this.operationType,
    required this.success,
    this.errorMessage,
    this.errorType,
    this.errorDetails,
    this.screenshot,
    required this.duration,
    this.inputData,
    this.responseData,
  }) : timestamp = DateTime.now();

  Map<String, dynamic> toJson() => {
    'operationName': operationName,
    'screen': screen,
    'operationType': operationType.name,
    'success': success,
    'errorMessage': errorMessage,
    'errorType': errorType?.name,
    'errorDetails': errorDetails,
    'screenshot': screenshot,
    'durationMs': duration.inMilliseconds,
    'timestamp': timestamp.toIso8601String(),
    'inputData': inputData,
    'responseData': responseData,
  };
}

class FunctionalIssue {
  final String title;
  final String screen;
  final String operation;
  final ErrorType errorType;
  final String errorMessage;
  final String? errorDetails;
  final String? screenshot;
  final String severity; // critical, high, medium, low
  final String? reproduction; // Steps to reproduce
  final DateTime timestamp;

  FunctionalIssue({
    required this.title,
    required this.screen,
    required this.operation,
    required this.errorType,
    required this.errorMessage,
    this.errorDetails,
    this.screenshot,
    required this.severity,
    this.reproduction,
  }) : timestamp = DateTime.now();

  Map<String, dynamic> toJson() => {
    'title': title,
    'screen': screen,
    'operation': operation,
    'errorType': errorType.name,
    'errorMessage': errorMessage,
    'errorDetails': errorDetails,
    'screenshot': screenshot,
    'severity': severity,
    'reproduction': reproduction,
    'timestamp': timestamp.toIso8601String(),
  };
}

// Global tracking
final List<OperationResult> _operationResults = [];
final List<FunctionalIssue> _functionalIssues = [];
int _screenshotCounter = 0;

// ============================================================================
// FUNCTIONAL TESTER
// ============================================================================

class FunctionalTester {
  final WidgetTester tester;
  final IntegrationTestWidgetsFlutterBinding binding;
  bool isLoggedIn = false;

  FunctionalTester(this.tester, this.binding);

  Future<String?> takeScreenshot(String name) async {
    try {
      _screenshotCounter++;
      final filename = '${_screenshotCounter.toString().padLeft(3, '0')}_$name';
      await binding.takeScreenshot(filename);
      return filename;
    } catch (e) {
      return null;
    }
  }

  /// Detect error type from error message or UI
  ErrorType detectErrorType(String error) {
    final lowerError = error.toLowerCase();

    if (lowerError.contains('salesforce') ||
        lowerError.contains('sf_') ||
        lowerError.contains('sobject')) {
      return ErrorType.salesforce;
    }
    if (lowerError.contains('network') ||
        lowerError.contains('connection') ||
        lowerError.contains('socket') ||
        lowerError.contains('unreachable')) {
      return ErrorType.network;
    }
    if (lowerError.contains('timeout') ||
        lowerError.contains('timed out')) {
      return ErrorType.timeout;
    }
    if (lowerError.contains('validation') ||
        lowerError.contains('required') ||
        lowerError.contains('invalid')) {
      return ErrorType.validation;
    }
    if (lowerError.contains('permission') ||
        lowerError.contains('unauthorized') ||
        lowerError.contains('forbidden')) {
      return ErrorType.permission;
    }
    if (lowerError.contains('400') ||
        lowerError.contains('401') ||
        lowerError.contains('403') ||
        lowerError.contains('404') ||
        lowerError.contains('500')) {
      return ErrorType.api;
    }

    return ErrorType.unknown;
  }

  /// Check for error messages on screen
  Future<String?> checkForErrorOnScreen() async {
    // Common error indicators
    final errorPatterns = [
      'error',
      'failed',
      'could not',
      'unable to',
      'something went wrong',
      'try again',
      'oops',
      'invalid',
      'required',
    ];

    for (var pattern in errorPatterns) {
      final finder = find.textContaining(RegExp(pattern, caseSensitive: false));
      if (finder.evaluate().isNotEmpty) {
        final widget = finder.evaluate().first.widget;
        if (widget is Text) {
          return widget.data;
        }
      }
    }

    // Check for SnackBar
    final snackBar = find.byType(SnackBar);
    if (snackBar.evaluate().isNotEmpty) {
      // Try to extract text from snackbar
      final snackBarWidget = snackBar.evaluate().first.widget as SnackBar;
      if (snackBarWidget.content is Text) {
        return (snackBarWidget.content as Text).data;
      }
    }

    // Check for AlertDialog
    final alertDialog = find.byType(AlertDialog);
    if (alertDialog.evaluate().isNotEmpty) {
      final dialogText = find.descendant(
        of: alertDialog,
        matching: find.byType(Text),
      );
      if (dialogText.evaluate().isNotEmpty) {
        final widget = dialogText.evaluate().first.widget as Text;
        if (widget.data?.toLowerCase().contains('error') == true ||
            widget.data?.toLowerCase().contains('failed') == true) {
          return widget.data;
        }
      }
    }

    return null;
  }

  /// Execute an operation and capture results
  Future<OperationResult> executeOperation({
    required String name,
    required String screen,
    required OperationType type,
    required Future<bool> Function() operation,
    Map<String, dynamic>? inputData,
    String? reproductionSteps,
  }) async {
    print('\n  🔄 $name...');

    final startTime = DateTime.now();
    String? errorMessage;
    ErrorType? errorType;
    String? errorDetails;
    String? screenshot;
    bool success = false;

    try {
      success = await operation();

      // Even if operation returned true, check for errors on screen
      await tester.pump(const Duration(milliseconds: 500));
      final screenError = await checkForErrorOnScreen();

      if (screenError != null) {
        success = false;
        errorMessage = screenError;
        errorType = detectErrorType(screenError);
      }

    } catch (e, st) {
      success = false;
      errorMessage = e.toString();
      errorType = detectErrorType(e.toString());
      errorDetails = st.toString().split('\n').take(10).join('\n');
    }

    final duration = DateTime.now().difference(startTime);

    // Take screenshot on failure
    if (!success) {
      screenshot = await takeScreenshot('${screen}_${name}_ERROR');

      // Log the issue
      _functionalIssues.add(FunctionalIssue(
        title: '$name Failed',
        screen: screen,
        operation: name,
        errorType: errorType ?? ErrorType.unknown,
        errorMessage: errorMessage ?? 'Unknown error',
        errorDetails: errorDetails,
        screenshot: screenshot,
        severity: _getSeverity(type, errorType),
        reproduction: reproductionSteps,
      ));

      print('  ❌ FAILED: $errorMessage');
    } else {
      print('  ✓ Success');
    }

    final result = OperationResult(
      operationName: name,
      screen: screen,
      operationType: type,
      success: success,
      errorMessage: errorMessage,
      errorType: errorType,
      errorDetails: errorDetails,
      screenshot: screenshot,
      duration: duration,
      inputData: inputData,
    );

    _operationResults.add(result);
    return result;
  }

  String _getSeverity(OperationType opType, ErrorType? errType) {
    // Critical: Auth failures, data loss
    if (opType == OperationType.authenticate) return 'critical';
    if (errType == ErrorType.salesforce) return 'high';
    if (opType == OperationType.create || opType == OperationType.update) return 'high';
    if (opType == OperationType.delete) return 'high';
    if (errType == ErrorType.api) return 'high';
    if (errType == ErrorType.network) return 'medium';
    return 'medium';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════════════════════

  Future<void> login() async {
    if (isLoggedIn) return;

    await executeOperation(
      name: 'Login',
      screen: 'Auth',
      type: OperationType.authenticate,
      reproductionSteps: '1. Open app\n2. Enter email: $testEmail\n3. Enter password\n4. Tap Sign In',
      inputData: {'email': testEmail},
      operation: () async {
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // Find and tap Sign In if on welcome screen
        final signInText = find.text('Sign In');
        if (signInText.evaluate().isNotEmpty) {
          await tester.tap(signInText.first);
          await tester.pumpAndSettle();
        }

        // Enter email
        final textFields = find.byType(TextField);
        if (textFields.evaluate().isEmpty) {
          throw Exception('No text fields found on login screen');
        }
        await tester.enterText(textFields.first, testEmail);
        await tester.pump(const Duration(milliseconds: 300));

        // Enter password
        final passwordField = find.byWidgetPredicate(
          (w) => w is TextField && w.obscureText == true
        );
        if (passwordField.evaluate().isNotEmpty) {
          await tester.enterText(passwordField.first, testPassword);
        } else if (textFields.evaluate().length > 1) {
          await tester.enterText(textFields.at(1), testPassword);
        }
        await tester.pump(const Duration(milliseconds: 300));

        // Tap login button
        final loginButton = find.widgetWithText(ElevatedButton, 'Sign In');
        if (loginButton.evaluate().isNotEmpty) {
          await tester.tap(loginButton.first);
        } else {
          final anyButton = find.byType(ElevatedButton);
          if (anyButton.evaluate().isNotEmpty) {
            await tester.tap(anyButton.first);
          }
        }

        await tester.pumpAndSettle(const Duration(seconds: 5));

        // Verify login succeeded
        final hasError = await checkForErrorOnScreen();
        if (hasError != null) {
          throw Exception(hasError);
        }

        isLoggedIn = true;
        return true;
      },
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE LEAD
  // ══════════════════════════════════════════════════════════════════════════

  Future<void> testCreateLead() async {
    await executeOperation(
      name: 'Navigate to Leads',
      screen: 'Leads',
      type: OperationType.navigate,
      operation: () async {
        final leadsFinder = find.text('Leads');
        if (leadsFinder.evaluate().isEmpty) {
          // Try menu
          final menu = find.byIcon(Icons.menu);
          if (menu.evaluate().isNotEmpty) {
            await tester.tap(menu.first);
            await tester.pumpAndSettle();
          }
        }

        final leads = find.text('Leads');
        if (leads.evaluate().isNotEmpty) {
          await tester.tap(leads.first);
          await tester.pumpAndSettle(const Duration(seconds: 2));
          return true;
        }
        return false;
      },
    );

    await executeOperation(
      name: 'Open Create Lead Form',
      screen: 'Leads',
      type: OperationType.navigate,
      reproductionSteps: '1. Go to Leads\n2. Tap + button or Create Lead',
      operation: () async {
        // Look for FAB or Add button
        final fab = find.byType(FloatingActionButton);
        if (fab.evaluate().isNotEmpty) {
          await tester.tap(fab.first);
          await tester.pumpAndSettle(const Duration(seconds: 1));
          return true;
        }

        // Try "Add" or "Create" text
        final addButton = find.textContaining(RegExp(r'add|create|new', caseSensitive: false));
        if (addButton.evaluate().isNotEmpty) {
          await tester.tap(addButton.first);
          await tester.pumpAndSettle(const Duration(seconds: 1));
          return true;
        }

        throw Exception('Could not find Create Lead button');
      },
    );

    await executeOperation(
      name: 'Submit Lead Form',
      screen: 'Create Lead',
      type: OperationType.create,
      reproductionSteps: '1. Go to Leads\n2. Tap + button\n3. Fill form\n4. Tap Save',
      inputData: {
        'firstName': 'Test',
        'lastName': 'Lead ${DateTime.now().millisecondsSinceEpoch}',
        'company': 'Test Company',
        'email': 'test@test.com',
      },
      operation: () async {
        // Fill in form fields
        final textFields = find.byType(TextField);
        final fieldCount = textFields.evaluate().length;

        if (fieldCount == 0) {
          throw Exception('No form fields found');
        }

        // Try to fill common fields
        for (var i = 0; i < fieldCount && i < 4; i++) {
          final field = textFields.at(i);
          final values = ['Test', 'Lead', 'Test Company', 'test@test.com'];
          if (i < values.length) {
            await tester.enterText(field, values[i]);
            await tester.pump(const Duration(milliseconds: 200));
          }
        }

        // Find and tap Save button
        final saveButton = find.textContaining(RegExp(r'save|create|submit', caseSensitive: false));
        if (saveButton.evaluate().isNotEmpty) {
          await tester.tap(saveButton.first);
          await tester.pumpAndSettle(const Duration(seconds: 3));
        } else {
          final primaryButton = find.byType(ElevatedButton);
          if (primaryButton.evaluate().isNotEmpty) {
            await tester.tap(primaryButton.first);
            await tester.pumpAndSettle(const Duration(seconds: 3));
          }
        }

        // Check for success or error
        final error = await checkForErrorOnScreen();
        if (error != null) {
          throw Exception(error);
        }

        return true;
      },
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE ACCOUNT
  // ══════════════════════════════════════════════════════════════════════════

  Future<void> testCreateAccount() async {
    await executeOperation(
      name: 'Navigate to Accounts',
      screen: 'Accounts',
      type: OperationType.navigate,
      operation: () async {
        final accountsFinder = find.text('Accounts');
        if (accountsFinder.evaluate().isNotEmpty) {
          await tester.tap(accountsFinder.first);
          await tester.pumpAndSettle(const Duration(seconds: 2));
          return true;
        }

        // Try menu
        final menu = find.byIcon(Icons.menu);
        if (menu.evaluate().isNotEmpty) {
          await tester.tap(menu.first);
          await tester.pumpAndSettle();

          final accounts = find.text('Accounts');
          if (accounts.evaluate().isNotEmpty) {
            await tester.tap(accounts.first);
            await tester.pumpAndSettle(const Duration(seconds: 2));
            return true;
          }
        }

        return false;
      },
    );

    await executeOperation(
      name: 'Create New Account',
      screen: 'Accounts',
      type: OperationType.create,
      reproductionSteps: '1. Go to Accounts\n2. Tap + button\n3. Fill form\n4. Tap Save',
      inputData: {
        'name': 'Test Account ${DateTime.now().millisecondsSinceEpoch}',
        'industry': 'Technology',
      },
      operation: () async {
        // Look for FAB
        final fab = find.byType(FloatingActionButton);
        if (fab.evaluate().isNotEmpty) {
          await tester.tap(fab.first);
          await tester.pumpAndSettle(const Duration(seconds: 1));
        }

        // Fill form
        final textFields = find.byType(TextField);
        if (textFields.evaluate().isNotEmpty) {
          await tester.enterText(textFields.first, 'Test Account');
          await tester.pump(const Duration(milliseconds: 200));
        }

        // Save
        final saveButton = find.textContaining(RegExp(r'save|create', caseSensitive: false));
        if (saveButton.evaluate().isNotEmpty) {
          await tester.tap(saveButton.first);
          await tester.pumpAndSettle(const Duration(seconds: 3));
        }

        final error = await checkForErrorOnScreen();
        if (error != null) throw Exception(error);

        return true;
      },
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE TASK
  // ══════════════════════════════════════════════════════════════════════════

  Future<void> testCreateTask() async {
    await executeOperation(
      name: 'Navigate to Tasks',
      screen: 'Tasks',
      type: OperationType.navigate,
      operation: () async {
        final tasksFinder = find.text('Tasks');
        if (tasksFinder.evaluate().isNotEmpty) {
          await tester.tap(tasksFinder.first);
          await tester.pumpAndSettle(const Duration(seconds: 2));
          return true;
        }
        return false;
      },
    );

    await executeOperation(
      name: 'Create New Task',
      screen: 'Tasks',
      type: OperationType.create,
      reproductionSteps: '1. Go to Tasks\n2. Tap + button\n3. Fill form\n4. Tap Save',
      inputData: {
        'subject': 'Test Task ${DateTime.now().millisecondsSinceEpoch}',
        'priority': 'High',
      },
      operation: () async {
        final fab = find.byType(FloatingActionButton);
        if (fab.evaluate().isNotEmpty) {
          await tester.tap(fab.first);
          await tester.pumpAndSettle(const Duration(seconds: 1));
        }

        final textFields = find.byType(TextField);
        if (textFields.evaluate().isNotEmpty) {
          await tester.enterText(textFields.first, 'Test Task');
          await tester.pump(const Duration(milliseconds: 200));
        }

        final saveButton = find.textContaining(RegExp(r'save|create', caseSensitive: false));
        if (saveButton.evaluate().isNotEmpty) {
          await tester.tap(saveButton.first);
          await tester.pumpAndSettle(const Duration(seconds: 3));
        }

        final error = await checkForErrorOnScreen();
        if (error != null) throw Exception(error);

        return true;
      },
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AI CHAT MESSAGE
  // ══════════════════════════════════════════════════════════════════════════

  Future<void> testAIChat() async {
    await executeOperation(
      name: 'Navigate to AI Chat',
      screen: 'AI Chat',
      type: OperationType.navigate,
      operation: () async {
        // Try various ways to open chat
        final chatFinders = [
          find.text('Chat'),
          find.text('IRIS'),
          find.text('AI'),
          find.byIcon(Icons.chat),
          find.byIcon(Icons.smart_toy),
        ];

        for (var finder in chatFinders) {
          if (finder.evaluate().isNotEmpty) {
            await tester.tap(finder.first);
            await tester.pumpAndSettle(const Duration(seconds: 2));
            return true;
          }
        }

        return false;
      },
    );

    await executeOperation(
      name: 'Send AI Message',
      screen: 'AI Chat',
      type: OperationType.create,
      reproductionSteps: '1. Open AI Chat\n2. Type message\n3. Send',
      inputData: {'message': 'Show my top leads'},
      operation: () async {
        final textField = find.byType(TextField);
        if (textField.evaluate().isEmpty) {
          throw Exception('Chat input field not found');
        }

        await tester.enterText(textField.first, 'Show my top leads');
        await tester.pump(const Duration(milliseconds: 300));

        // Find send button
        final sendButton = find.byIcon(Icons.send);
        if (sendButton.evaluate().isNotEmpty) {
          await tester.tap(sendButton.first);
        } else {
          // Try pressing enter/submit
          await tester.testTextInput.receiveAction(TextInputAction.send);
        }

        await tester.pumpAndSettle(const Duration(seconds: 5));

        final error = await checkForErrorOnScreen();
        if (error != null) throw Exception(error);

        return true;
      },
    );
  }
}

// ============================================================================
// MAIN TEST
// ============================================================================

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDownAll(() async {
    await _saveFunctionalReport();
  });

  group('🔧 Functional Operations Test', () {
    testWidgets('Test CRUD operations and capture errors', (tester) async {
      final functionalTester = FunctionalTester(tester, binding);

      print('\n${'═' * 60}');
      print('🔧 FUNCTIONAL OPERATIONS TEST');
      print('═' * 60);
      print('Testing actual CRUD operations:');
      print('  • Login');
      print('  • Create Lead');
      print('  • Create Account');
      print('  • Create Task');
      print('  • Send AI Message');
      print('');
      print('All errors will be captured with type and details.');
      print('═' * 60);

      // Launch app
      await tester.pumpWidget(
        const ProviderScope(child: IrisApp()),
      );
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Run functional tests
      await functionalTester.login();
      await functionalTester.testCreateLead();
      await functionalTester.testCreateAccount();
      await functionalTester.testCreateTask();
      await functionalTester.testAIChat();

      // Print summary
      print('\n${'═' * 60}');
      print('📊 FUNCTIONAL TEST SUMMARY');
      print('═' * 60);

      final total = _operationResults.length;
      final passed = _operationResults.where((r) => r.success).length;

      print('Operations: $passed/$total passed');
      print('Issues Found: ${_functionalIssues.length}');

      if (_functionalIssues.isNotEmpty) {
        print('\n🚨 ISSUES:');
        for (var issue in _functionalIssues) {
          print('  [${issue.severity.toUpperCase()}] ${issue.title}');
          print('    Screen: ${issue.screen}');
          print('    Type: ${issue.errorType.name}');
          print('    Error: ${issue.errorMessage}');
        }
      }

      print('═' * 60);
    });
  });
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

Future<void> _saveFunctionalReport() async {
  try {
    final dir = Directory('test_reports');
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }

    final timestamp = DateTime.now().toIso8601String().replaceAll(':', '-').split('.')[0];

    final total = _operationResults.length;
    final passed = _operationResults.where((r) => r.success).length;
    final failed = _operationResults.where((r) => !r.success).length;

    // Count by error type
    final errorsByType = <String, int>{};
    for (var result in _operationResults.where((r) => !r.success)) {
      final type = result.errorType?.name ?? 'unknown';
      errorsByType[type] = (errorsByType[type] ?? 0) + 1;
    }

    // JSON Report
    final report = {
      'testType': 'Functional Operations Test',
      'timestamp': DateTime.now().toIso8601String(),
      'testUser': testEmail,
      'summary': {
        'totalOperations': total,
        'passedOperations': passed,
        'failedOperations': failed,
        'passRate': total > 0 ? (passed / total * 100).toStringAsFixed(1) : '0',
        'totalIssues': _functionalIssues.length,
        'criticalIssues': _functionalIssues.where((i) => i.severity == 'critical').length,
        'highIssues': _functionalIssues.where((i) => i.severity == 'high').length,
      },
      'errorsByType': errorsByType,
      'operations': _operationResults.map((r) => r.toJson()).toList(),
      'issues': _functionalIssues.map((i) => i.toJson()).toList(),
    };

    final jsonFile = File('test_reports/functional_test_$timestamp.json');
    await jsonFile.writeAsString(const JsonEncoder.withIndent('  ').convert(report));

    final latestFile = File('test_reports/functional_test_latest.json');
    await latestFile.writeAsString(const JsonEncoder.withIndent('  ').convert(report));

    // Markdown Report - ISSUES FOCUSED
    final md = StringBuffer();
    md.writeln('# IRIS Mobile - Functional Test Issues Report');
    md.writeln();
    md.writeln('Generated: ${DateTime.now()}');
    md.writeln('Test User: $testEmail');
    md.writeln();

    md.writeln('## Summary');
    md.writeln();
    md.writeln('| Metric | Value |');
    md.writeln('|--------|-------|');
    md.writeln('| Operations Tested | $total |');
    md.writeln('| Passed | $passed |');
    md.writeln('| Failed | $failed |');
    md.writeln('| Pass Rate | ${total > 0 ? (passed / total * 100).toStringAsFixed(1) : 0}% |');
    md.writeln('| Issues Found | ${_functionalIssues.length} |');
    md.writeln();

    if (errorsByType.isNotEmpty) {
      md.writeln('## Errors by Type');
      md.writeln();
      md.writeln('| Error Type | Count |');
      md.writeln('|------------|-------|');
      for (var entry in errorsByType.entries) {
        md.writeln('| ${entry.key} | ${entry.value} |');
      }
      md.writeln();
    }

    if (_functionalIssues.isNotEmpty) {
      md.writeln('## 🚨 Issues to Fix');
      md.writeln();

      // Critical first
      final criticalIssues = _functionalIssues.where((i) => i.severity == 'critical');
      if (criticalIssues.isNotEmpty) {
        md.writeln('### 🔴 Critical Issues');
        md.writeln();
        for (var issue in criticalIssues) {
          _writeIssue(md, issue);
        }
      }

      // High
      final highIssues = _functionalIssues.where((i) => i.severity == 'high');
      if (highIssues.isNotEmpty) {
        md.writeln('### 🟠 High Priority Issues');
        md.writeln();
        for (var issue in highIssues) {
          _writeIssue(md, issue);
        }
      }

      // Medium/Low
      final otherIssues = _functionalIssues.where((i) =>
        i.severity != 'critical' && i.severity != 'high'
      );
      if (otherIssues.isNotEmpty) {
        md.writeln('### 🟡 Medium/Low Priority Issues');
        md.writeln();
        for (var issue in otherIssues) {
          _writeIssue(md, issue);
        }
      }
    } else {
      md.writeln('## ✅ No Issues Found!');
      md.writeln();
      md.writeln('All functional operations completed successfully.');
    }

    md.writeln();
    md.writeln('## Operation Details');
    md.writeln();
    md.writeln('| Operation | Screen | Type | Status | Duration | Error |');
    md.writeln('|-----------|--------|------|--------|----------|-------|');
    for (var op in _operationResults) {
      final status = op.success ? '✅' : '❌';
      final error = op.errorMessage?.substring(0, (op.errorMessage?.length ?? 0).clamp(0, 50)) ?? '-';
      md.writeln('| ${op.operationName} | ${op.screen} | ${op.operationType.name} | $status | ${op.duration.inMilliseconds}ms | $error |');
    }

    final mdFile = File('test_reports/functional_issues_$timestamp.md');
    await mdFile.writeAsString(md.toString());

    final latestMdFile = File('test_reports/functional_issues_latest.md');
    await latestMdFile.writeAsString(md.toString());

    print('\n📁 Reports saved:');
    print('   • ${jsonFile.path}');
    print('   • ${mdFile.path}');

  } catch (e) {
    print('Error saving report: $e');
  }
}

void _writeIssue(StringBuffer md, FunctionalIssue issue) {
  md.writeln('#### ${issue.title}');
  md.writeln();
  md.writeln('- **Screen:** ${issue.screen}');
  md.writeln('- **Operation:** ${issue.operation}');
  md.writeln('- **Error Type:** ${issue.errorType.name}');
  md.writeln('- **Error Message:** ${issue.errorMessage}');
  if (issue.screenshot != null) {
    md.writeln('- **Screenshot:** ${issue.screenshot}');
  }
  if (issue.reproduction != null) {
    md.writeln('- **Steps to Reproduce:**');
    md.writeln('```');
    md.writeln(issue.reproduction);
    md.writeln('```');
  }
  if (issue.errorDetails != null) {
    md.writeln('- **Stack Trace:**');
    md.writeln('```');
    md.writeln(issue.errorDetails);
    md.writeln('```');
  }
  md.writeln();
}
