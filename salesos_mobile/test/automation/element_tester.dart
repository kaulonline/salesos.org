// IRIS Mobile - Automated Element Testing Framework
//
// This framework automatically discovers and tests all interactive elements
// on each screen, tracking errors and generating detailed reports.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Result of testing a single element
class ElementTestResult {
  final String elementType;
  final String? elementKey;
  final String? elementText;
  final String testAction;
  final bool passed;
  final String? errorMessage;
  final String? stackTrace;
  final Duration duration;

  ElementTestResult({
    required this.elementType,
    this.elementKey,
    this.elementText,
    required this.testAction,
    required this.passed,
    this.errorMessage,
    this.stackTrace,
    required this.duration,
  });

  Map<String, dynamic> toJson() => {
        'elementType': elementType,
        'elementKey': elementKey,
        'elementText': elementText,
        'testAction': testAction,
        'passed': passed,
        'errorMessage': errorMessage,
        'stackTrace': stackTrace,
        'durationMs': duration.inMilliseconds,
      };

  @override
  String toString() {
    final status = passed ? '✓' : '✗';
    final identifier = elementKey ?? elementText ?? 'unknown';
    return '$status $elementType ($identifier): $testAction ${!passed ? "- $errorMessage" : ""}';
  }
}

/// Result of testing a complete screen
class ScreenTestResult {
  final String screenName;
  final String screenPath;
  final bool rendered;
  final String? renderError;
  final List<ElementTestResult> elementResults;
  final Duration totalDuration;
  final DateTime timestamp;

  ScreenTestResult({
    required this.screenName,
    required this.screenPath,
    required this.rendered,
    this.renderError,
    required this.elementResults,
    required this.totalDuration,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  int get totalElements => elementResults.length;
  int get passedElements => elementResults.where((e) => e.passed).length;
  int get failedElements => elementResults.where((e) => !e.passed).length;
  double get passRate =>
      totalElements > 0 ? (passedElements / totalElements) * 100 : 0;

  bool get allPassed => rendered && failedElements == 0;

  List<ElementTestResult> get failures =>
      elementResults.where((e) => !e.passed).toList();

  Map<String, dynamic> toJson() => {
        'screenName': screenName,
        'screenPath': screenPath,
        'rendered': rendered,
        'renderError': renderError,
        'totalElements': totalElements,
        'passedElements': passedElements,
        'failedElements': failedElements,
        'passRate': passRate,
        'totalDurationMs': totalDuration.inMilliseconds,
        'timestamp': timestamp.toIso8601String(),
        'elementResults': elementResults.map((e) => e.toJson()).toList(),
      };

  String toSummary() {
    final buffer = StringBuffer();
    buffer.writeln('═' * 60);
    buffer.writeln('Screen: $screenName');
    buffer.writeln('Path: $screenPath');
    buffer.writeln('─' * 60);

    if (!rendered) {
      buffer.writeln('❌ RENDER FAILED: $renderError');
    } else {
      buffer.writeln('✓ Rendered successfully');
      buffer.writeln('Elements tested: $totalElements');
      buffer.writeln('Passed: $passedElements | Failed: $failedElements');
      buffer.writeln('Pass rate: ${passRate.toStringAsFixed(1)}%');

      if (failures.isNotEmpty) {
        buffer.writeln('\nFailures:');
        for (final failure in failures) {
          buffer.writeln('  $failure');
        }
      }
    }

    buffer.writeln('Duration: ${totalDuration.inMilliseconds}ms');
    buffer.writeln('═' * 60);
    return buffer.toString();
  }
}

/// Automated element tester that discovers and tests all interactive elements
class AutomatedElementTester {
  final WidgetTester tester;
  final List<ElementTestResult> _results = [];

  AutomatedElementTester(this.tester);

  List<ElementTestResult> get results => List.unmodifiable(_results);

  /// Clear previous results
  void reset() => _results.clear();

  /// Test all discoverable elements on the current screen
  Future<void> testAllElements() async {
    await _testButtons();
    await _testIconButtons();
    await _testTextButtons();
    await _testInkWells();
    await _testGestureDetectors();
    await _testTextFields();
    await _testCheckboxes();
    await _testSwitches();
    await _testDropdowns();
    await _testSliders();
    await _testTabs();
    await _testListTiles();
    await _testCards();
    await _testFloatingActionButtons();
    await _testNavigationElements();
  }

  /// Test all ElevatedButton, FilledButton, OutlinedButton widgets
  Future<void> _testButtons() async {
    final buttons = find.byWidgetPredicate(
      (widget) =>
          widget is ElevatedButton ||
          widget is FilledButton ||
          widget is OutlinedButton,
    );

    for (int i = 0; i < buttons.evaluate().length; i++) {
      await _testTappable(
        buttons.at(i),
        'Button',
        _getButtonText(buttons.at(i)),
      );
    }
  }

  /// Test all IconButton widgets
  Future<void> _testIconButtons() async {
    final iconButtons = find.byType(IconButton);

    for (int i = 0; i < iconButtons.evaluate().length; i++) {
      await _testTappable(
        iconButtons.at(i),
        'IconButton',
        _getIconButtonTooltip(iconButtons.at(i)),
      );
    }
  }

  /// Test all TextButton widgets
  Future<void> _testTextButtons() async {
    final textButtons = find.byType(TextButton);

    for (int i = 0; i < textButtons.evaluate().length; i++) {
      await _testTappable(
        textButtons.at(i),
        'TextButton',
        _getButtonText(textButtons.at(i)),
      );
    }
  }

  /// Test all InkWell widgets
  Future<void> _testInkWells() async {
    final inkWells = find.byType(InkWell);

    for (int i = 0; i < inkWells.evaluate().length; i++) {
      final inkWell = tester.widget<InkWell>(inkWells.at(i));
      if (inkWell.onTap != null) {
        await _testTappable(
          inkWells.at(i),
          'InkWell',
          'InkWell #$i',
        );
      }
    }
  }

  /// Test all GestureDetector widgets with onTap
  Future<void> _testGestureDetectors() async {
    final detectors = find.byType(GestureDetector);

    for (int i = 0; i < detectors.evaluate().length; i++) {
      final detector = tester.widget<GestureDetector>(detectors.at(i));
      if (detector.onTap != null) {
        await _testTappable(
          detectors.at(i),
          'GestureDetector',
          'GestureDetector #$i',
        );
      }
    }
  }

  /// Test all TextField and TextFormField widgets
  Future<void> _testTextFields() async {
    final textFields = find.byType(TextField);
    final formFields = find.byType(TextFormField);

    for (int i = 0; i < textFields.evaluate().length; i++) {
      await _testTextField(textFields.at(i), 'TextField #$i');
    }

    for (int i = 0; i < formFields.evaluate().length; i++) {
      await _testTextField(formFields.at(i), 'TextFormField #$i');
    }
  }

  /// Test all Checkbox widgets
  Future<void> _testCheckboxes() async {
    final checkboxes = find.byType(Checkbox);

    for (int i = 0; i < checkboxes.evaluate().length; i++) {
      await _testTappable(
        checkboxes.at(i),
        'Checkbox',
        'Checkbox #$i',
      );
    }
  }

  /// Test all Switch widgets
  Future<void> _testSwitches() async {
    final switches = find.byType(Switch);

    for (int i = 0; i < switches.evaluate().length; i++) {
      await _testTappable(
        switches.at(i),
        'Switch',
        'Switch #$i',
      );
    }
  }

  /// Test all DropdownButton widgets
  Future<void> _testDropdowns() async {
    final dropdowns = find.byWidgetPredicate(
      (widget) => widget.runtimeType.toString().contains('DropdownButton'),
    );

    for (int i = 0; i < dropdowns.evaluate().length; i++) {
      await _testTappable(
        dropdowns.at(i),
        'Dropdown',
        'Dropdown #$i',
      );
    }
  }

  /// Test all Slider widgets
  Future<void> _testSliders() async {
    final sliders = find.byType(Slider);

    for (int i = 0; i < sliders.evaluate().length; i++) {
      await _testSlider(sliders.at(i), 'Slider #$i');
    }
  }

  /// Test all Tab widgets
  Future<void> _testTabs() async {
    final tabs = find.byType(Tab);

    for (int i = 0; i < tabs.evaluate().length; i++) {
      await _testTappable(
        tabs.at(i),
        'Tab',
        _getTabText(tabs.at(i)),
      );
    }
  }

  /// Test all ListTile widgets
  Future<void> _testListTiles() async {
    final listTiles = find.byType(ListTile);

    for (int i = 0; i < listTiles.evaluate().length; i++) {
      final listTile = tester.widget<ListTile>(listTiles.at(i));
      if (listTile.onTap != null) {
        await _testTappable(
          listTiles.at(i),
          'ListTile',
          _getListTileTitle(listTiles.at(i)),
        );
      }
    }
  }

  /// Test all Card widgets that are tappable
  Future<void> _testCards() async {
    final cards = find.byType(Card);

    for (int i = 0; i < cards.evaluate().length; i++) {
      // Check if card has InkWell parent
      final cardElement = cards.at(i).evaluate().first;
      final hasOnTap = _hasAncestorWithOnTap(cardElement);
      if (hasOnTap) {
        await _testTappable(
          cards.at(i),
          'Card',
          'Card #$i',
        );
      }
    }
  }

  /// Test all FloatingActionButton widgets
  Future<void> _testFloatingActionButtons() async {
    final fabs = find.byType(FloatingActionButton);

    for (int i = 0; i < fabs.evaluate().length; i++) {
      await _testTappable(
        fabs.at(i),
        'FloatingActionButton',
        _getFabTooltip(fabs.at(i)),
      );
    }
  }

  /// Test navigation elements (BottomNavigationBar, NavigationRail, etc.)
  Future<void> _testNavigationElements() async {
    // Bottom navigation bar items
    final bottomNavItems = find.byType(BottomNavigationBarItem);
    for (int i = 0; i < bottomNavItems.evaluate().length; i++) {
      await _testTappable(
        bottomNavItems.at(i),
        'BottomNavItem',
        'NavItem #$i',
      );
    }

    // Navigation destinations
    final navDestinations = find.byType(NavigationDestination);
    for (int i = 0; i < navDestinations.evaluate().length; i++) {
      await _testTappable(
        navDestinations.at(i),
        'NavigationDestination',
        'NavDest #$i',
      );
    }
  }

  /// Test a tappable element
  Future<void> _testTappable(
    Finder finder,
    String elementType,
    String? identifier,
  ) async {
    final startTime = DateTime.now();
    String? errorMessage;
    String? stackTrace;
    bool passed = true;

    try {
      // Check if element exists and is visible
      if (finder.evaluate().isEmpty) {
        throw TestFailure('Element not found');
      }

      // Check if element is visible in viewport
      final element = finder.evaluate().first;
      final renderObject = element.renderObject;
      if (renderObject == null) {
        throw TestFailure('Element has no render object');
      }

      // Try to tap the element
      await tester.tap(finder, warnIfMissed: false);
      await tester.pump(const Duration(milliseconds: 100));

      // Check for any exceptions after tap
      final exception = tester.takeException();
      if (exception != null) {
        throw exception;
      }
    } catch (e, st) {
      passed = false;
      errorMessage = e.toString();
      stackTrace = st.toString().split('\n').take(5).join('\n');
    }

    final duration = DateTime.now().difference(startTime);
    _results.add(ElementTestResult(
      elementType: elementType,
      elementText: identifier,
      testAction: 'tap',
      passed: passed,
      errorMessage: errorMessage,
      stackTrace: stackTrace,
      duration: duration,
    ));
  }

  /// Test a text field element
  Future<void> _testTextField(Finder finder, String identifier) async {
    final startTime = DateTime.now();
    String? errorMessage;
    String? stackTrace;
    bool passed = true;

    try {
      if (finder.evaluate().isEmpty) {
        throw TestFailure('TextField not found');
      }

      // Try to tap and enter text
      await tester.tap(finder, warnIfMissed: false);
      await tester.pump(const Duration(milliseconds: 100));

      await tester.enterText(finder, 'Test input');
      await tester.pump(const Duration(milliseconds: 100));

      // Clear the text
      await tester.enterText(finder, '');
      await tester.pump(const Duration(milliseconds: 100));

      final exception = tester.takeException();
      if (exception != null) {
        throw exception;
      }
    } catch (e, st) {
      passed = false;
      errorMessage = e.toString();
      stackTrace = st.toString().split('\n').take(5).join('\n');
    }

    final duration = DateTime.now().difference(startTime);
    _results.add(ElementTestResult(
      elementType: 'TextField',
      elementText: identifier,
      testAction: 'tap and enter text',
      passed: passed,
      errorMessage: errorMessage,
      stackTrace: stackTrace,
      duration: duration,
    ));
  }

  /// Test a slider element
  Future<void> _testSlider(Finder finder, String identifier) async {
    final startTime = DateTime.now();
    String? errorMessage;
    String? stackTrace;
    bool passed = true;

    try {
      if (finder.evaluate().isEmpty) {
        throw TestFailure('Slider not found');
      }

      // Try to drag the slider
      await tester.drag(finder, const Offset(50, 0));
      await tester.pump(const Duration(milliseconds: 100));

      final exception = tester.takeException();
      if (exception != null) {
        throw exception;
      }
    } catch (e, st) {
      passed = false;
      errorMessage = e.toString();
      stackTrace = st.toString().split('\n').take(5).join('\n');
    }

    final duration = DateTime.now().difference(startTime);
    _results.add(ElementTestResult(
      elementType: 'Slider',
      elementText: identifier,
      testAction: 'drag',
      passed: passed,
      errorMessage: errorMessage,
      stackTrace: stackTrace,
      duration: duration,
    ));
  }

  // Helper methods to extract element identifiers

  String? _getButtonText(Finder finder) {
    try {
      final textFinder = find.descendant(of: finder, matching: find.byType(Text));
      if (textFinder.evaluate().isNotEmpty) {
        final textWidget = tester.widget<Text>(textFinder.first);
        return textWidget.data;
      }
    } catch (_) {}
    return null;
  }

  String? _getIconButtonTooltip(Finder finder) {
    try {
      final iconButton = tester.widget<IconButton>(finder);
      return iconButton.tooltip;
    } catch (_) {}
    return null;
  }

  String? _getTabText(Finder finder) {
    try {
      final tab = tester.widget<Tab>(finder);
      return tab.text;
    } catch (_) {}
    return null;
  }

  String? _getListTileTitle(Finder finder) {
    try {
      final listTile = tester.widget<ListTile>(finder);
      if (listTile.title is Text) {
        return (listTile.title as Text).data;
      }
    } catch (_) {}
    return null;
  }

  String? _getFabTooltip(Finder finder) {
    try {
      final fab = tester.widget<FloatingActionButton>(finder);
      return fab.tooltip;
    } catch (_) {}
    return null;
  }

  bool _hasAncestorWithOnTap(Element element) {
    bool hasTap = false;
    element.visitAncestorElements((ancestor) {
      final widget = ancestor.widget;
      if (widget is InkWell && widget.onTap != null) {
        hasTap = true;
        return false; // Stop visiting
      }
      if (widget is GestureDetector && widget.onTap != null) {
        hasTap = true;
        return false; // Stop visiting
      }
      return true; // Continue visiting
    });
    return hasTap;
  }
}

/// Extension to get element counts
extension ElementCounter on WidgetTester {
  /// Count all interactive elements on screen
  Map<String, int> countInteractiveElements() {
    return {
      'ElevatedButton': find.byType(ElevatedButton).evaluate().length,
      'TextButton': find.byType(TextButton).evaluate().length,
      'IconButton': find.byType(IconButton).evaluate().length,
      'FloatingActionButton': find.byType(FloatingActionButton).evaluate().length,
      'TextField': find.byType(TextField).evaluate().length,
      'TextFormField': find.byType(TextFormField).evaluate().length,
      'Checkbox': find.byType(Checkbox).evaluate().length,
      'Switch': find.byType(Switch).evaluate().length,
      'Slider': find.byType(Slider).evaluate().length,
      'ListTile': find.byType(ListTile).evaluate().length,
      'Card': find.byType(Card).evaluate().length,
      'Tab': find.byType(Tab).evaluate().length,
      'InkWell': find.byType(InkWell).evaluate().length,
      'GestureDetector': find.byType(GestureDetector).evaluate().length,
    };
  }
}
