// ignore_for_file: avoid_print
// IRIS Mobile - Test Report Generator
//
// Generates comprehensive HTML and JSON reports from automated test results.

import 'dart:convert';
import 'dart:io';

import 'element_tester.dart';

/// Complete test suite result
class TestSuiteResult {
  final String suiteName;
  final List<ScreenTestResult> screenResults;
  final DateTime startTime;
  final DateTime endTime;

  TestSuiteResult({
    required this.suiteName,
    required this.screenResults,
    required this.startTime,
    required this.endTime,
  });

  Duration get totalDuration => endTime.difference(startTime);

  int get totalScreens => screenResults.length;
  int get passedScreens => screenResults.where((s) => s.allPassed).length;
  int get failedScreens => screenResults.where((s) => !s.allPassed).length;
  int get renderedScreens => screenResults.where((s) => s.rendered).length;

  int get totalElements =>
      screenResults.fold(0, (sum, s) => sum + s.totalElements);
  int get passedElements =>
      screenResults.fold(0, (sum, s) => sum + s.passedElements);
  int get failedElements =>
      screenResults.fold(0, (sum, s) => sum + s.failedElements);

  double get screenPassRate =>
      totalScreens > 0 ? (passedScreens / totalScreens) * 100 : 0;
  double get elementPassRate =>
      totalElements > 0 ? (passedElements / totalElements) * 100 : 0;

  List<ScreenTestResult> get failedScreensList =>
      screenResults.where((s) => !s.allPassed).toList();

  Map<String, dynamic> toJson() => {
        'suiteName': suiteName,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime.toIso8601String(),
        'totalDurationMs': totalDuration.inMilliseconds,
        'summary': {
          'totalScreens': totalScreens,
          'passedScreens': passedScreens,
          'failedScreens': failedScreens,
          'renderedScreens': renderedScreens,
          'screenPassRate': screenPassRate,
          'totalElements': totalElements,
          'passedElements': passedElements,
          'failedElements': failedElements,
          'elementPassRate': elementPassRate,
        },
        'screenResults': screenResults.map((s) => s.toJson()).toList(),
      };
}

/// Generates test reports in various formats
class TestReportGenerator {
  /// Generate JSON report
  static String generateJsonReport(TestSuiteResult result) {
    return const JsonEncoder.withIndent('  ').convert(result.toJson());
  }

  /// Generate console summary
  static String generateConsoleSummary(TestSuiteResult result) {
    final buffer = StringBuffer();

    buffer.writeln('\n');
    buffer.writeln('╔══════════════════════════════════════════════════════════════╗');
    buffer.writeln('║           IRIS MOBILE AUTOMATED TEST REPORT                  ║');
    buffer.writeln('╠══════════════════════════════════════════════════════════════╣');
    buffer.writeln('║ Suite: ${result.suiteName.padRight(52)}║');
    buffer.writeln('║ Date: ${result.startTime.toString().substring(0, 19).padRight(53)}║');
    buffer.writeln('║ Duration: ${result.totalDuration.toString().split('.')[0].padRight(49)}║');
    buffer.writeln('╠══════════════════════════════════════════════════════════════╣');
    buffer.writeln('║                        SUMMARY                               ║');
    buffer.writeln('╠══════════════════════════════════════════════════════════════╣');

    final screenStatus = result.passedScreens == result.totalScreens ? '✓' : '✗';
    buffer.writeln('${'║ $screenStatus Screens: ${result.passedScreens}/${result.totalScreens} passed (${result.screenPassRate.toStringAsFixed(1)}%)'.padRight(62)}║');

    final elementStatus = result.failedElements == 0 ? '✓' : '✗';
    buffer.writeln('${'║ $elementStatus Elements: ${result.passedElements}/${result.totalElements} passed (${result.elementPassRate.toStringAsFixed(1)}%)'.padRight(62)}║');

    buffer.writeln('${'║ Rendered: ${result.renderedScreens}/${result.totalScreens} screens'.padRight(60)}║');

    if (result.failedScreensList.isNotEmpty) {
      buffer.writeln('╠══════════════════════════════════════════════════════════════╣');
      buffer.writeln('║                     FAILED SCREENS                           ║');
      buffer.writeln('╠══════════════════════════════════════════════════════════════╣');

      for (final screen in result.failedScreensList) {
        final name = screen.screenName.length > 40
            ? '${screen.screenName.substring(0, 37)}...'
            : screen.screenName;

        if (!screen.rendered) {
          buffer.writeln('${'║ ✗ $name'.padRight(62)}║');
          buffer.writeln('${'║   └─ RENDER FAILED: ${screen.renderError?.substring(0, 35) ?? "Unknown"}...'.padRight(62)}║');
        } else {
          buffer.writeln('${'║ ✗ $name'.padRight(62)}║');
          buffer.writeln('${'║   └─ ${screen.failedElements} element(s) failed'.padRight(60)}║');

          // Show first 3 failures
          for (final failure in screen.failures.take(3)) {
            final failureDesc = '${failure.elementType}: ${failure.errorMessage ?? "Unknown error"}';
            final truncated = failureDesc.length > 50
                ? '${failureDesc.substring(0, 47)}...'
                : failureDesc;
            buffer.writeln('${'║      • $truncated'.padRight(62)}║');
          }

          if (screen.failures.length > 3) {
            buffer.writeln('${'║      ... and ${screen.failures.length - 3} more'.padRight(60)}║');
          }
        }
      }
    }

    buffer.writeln('╚══════════════════════════════════════════════════════════════╝');

    // Final status
    if (result.failedScreensList.isEmpty) {
      buffer.writeln('\n🎉 ALL TESTS PASSED!\n');
    } else {
      buffer.writeln('\n❌ ${result.failedScreens} SCREEN(S) FAILED - See report for details\n');
    }

    return buffer.toString();
  }

  /// Generate detailed HTML report
  static String generateHtmlReport(TestSuiteResult result) {
    return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IRIS Mobile Test Report - ${result.startTime.toString().substring(0, 10)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0D0D0D;
            color: #F5F5F5;
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }

        header {
            background: linear-gradient(135deg, #1A1A1A 0%, #0D1B2A 100%);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 24px;
            border: 1px solid #333;
        }
        header h1 {
            color: #D4AF37;
            font-size: 28px;
            margin-bottom: 8px;
        }
        header .meta {
            color: #9CA3AF;
            font-size: 14px;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .summary-card {
            background: #1A1A1A;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #333;
        }
        .summary-card.success { border-left: 4px solid #10B981; }
        .summary-card.error { border-left: 4px solid #EF4444; }
        .summary-card.info { border-left: 4px solid #3B82F6; }
        .summary-card .value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .summary-card .label {
            color: #9CA3AF;
            font-size: 14px;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-badge.passed { background: #064E3B; color: #10B981; }
        .status-badge.failed { background: #7F1D1D; color: #EF4444; }

        .screens-section {
            background: #1A1A1A;
            border-radius: 12px;
            border: 1px solid #333;
            overflow: hidden;
        }
        .screens-section h2 {
            padding: 20px;
            border-bottom: 1px solid #333;
            font-size: 18px;
        }

        .screen-item {
            border-bottom: 1px solid #333;
            padding: 16px 20px;
        }
        .screen-item:last-child { border-bottom: none; }
        .screen-item.failed { background: rgba(239, 68, 68, 0.1); }

        .screen-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }
        .screen-name {
            font-weight: 600;
            font-size: 16px;
        }
        .screen-stats {
            display: flex;
            gap: 16px;
            color: #9CA3AF;
            font-size: 14px;
        }

        .screen-details {
            display: none;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #333;
        }
        .screen-details.open { display: block; }

        .element-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        .element-table th {
            text-align: left;
            padding: 8px;
            background: #0D0D0D;
            color: #9CA3AF;
            font-weight: 500;
        }
        .element-table td {
            padding: 8px;
            border-top: 1px solid #333;
        }
        .element-table tr.failed td { color: #EF4444; }
        .element-table tr.passed td:first-child::before { content: '✓ '; color: #10B981; }
        .element-table tr.failed td:first-child::before { content: '✗ '; color: #EF4444; }

        .error-message {
            background: #1F1F1F;
            padding: 12px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            color: #EF4444;
            margin-top: 8px;
            overflow-x: auto;
        }

        .progress-bar {
            height: 8px;
            background: #333;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-bar .fill {
            height: 100%;
            background: linear-gradient(90deg, #10B981, #006039);
            transition: width 0.3s ease;
        }

        .filter-buttons {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            padding: 0 20px;
        }
        .filter-btn {
            padding: 8px 16px;
            border: 1px solid #333;
            background: transparent;
            color: #F5F5F5;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
        }
        .filter-btn:hover { background: #333; }
        .filter-btn.active { background: #006039; border-color: #006039; }

        footer {
            text-align: center;
            padding: 24px;
            color: #6B7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 IRIS Mobile Test Report</h1>
            <div class="meta">
                <span>Suite: ${result.suiteName}</span> •
                <span>Generated: ${result.startTime}</span> •
                <span>Duration: ${result.totalDuration.toString().split('.')[0]}</span>
            </div>
        </header>

        <div class="summary-cards">
            <div class="summary-card ${result.screenPassRate == 100 ? 'success' : 'error'}">
                <div class="value">${result.screenPassRate.toStringAsFixed(0)}%</div>
                <div class="label">Screen Pass Rate</div>
                <div class="progress-bar">
                    <div class="fill" style="width: ${result.screenPassRate}%"></div>
                </div>
            </div>
            <div class="summary-card ${result.elementPassRate == 100 ? 'success' : 'error'}">
                <div class="value">${result.elementPassRate.toStringAsFixed(0)}%</div>
                <div class="label">Element Pass Rate</div>
                <div class="progress-bar">
                    <div class="fill" style="width: ${result.elementPassRate}%"></div>
                </div>
            </div>
            <div class="summary-card info">
                <div class="value">${result.totalScreens}</div>
                <div class="label">Total Screens Tested</div>
            </div>
            <div class="summary-card info">
                <div class="value">${result.totalElements}</div>
                <div class="label">Total Elements Tested</div>
            </div>
            <div class="summary-card success">
                <div class="value" style="color: #10B981;">${result.passedScreens}</div>
                <div class="label">Screens Passed</div>
            </div>
            <div class="summary-card error">
                <div class="value" style="color: #EF4444;">${result.failedScreens}</div>
                <div class="label">Screens Failed</div>
            </div>
        </div>

        <div class="screens-section">
            <h2>📱 Screen Test Results</h2>

            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filterScreens('all')">All (${result.totalScreens})</button>
                <button class="filter-btn" onclick="filterScreens('passed')">Passed (${result.passedScreens})</button>
                <button class="filter-btn" onclick="filterScreens('failed')">Failed (${result.failedScreens})</button>
            </div>

            ${result.screenResults.map((screen) => _generateScreenHtml(screen)).join('\n')}
        </div>

        <footer>
            Generated by IRIS Mobile Automated Testing Framework<br>
            © ${DateTime.now().year} IRIS Sales GPT
        </footer>
    </div>

    <script>
        function toggleDetails(screenId) {
            const details = document.getElementById('details-' + screenId);
            details.classList.toggle('open');
        }

        function filterScreens(filter) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            document.querySelectorAll('.screen-item').forEach(item => {
                if (filter === 'all') {
                    item.style.display = 'block';
                } else if (filter === 'passed') {
                    item.style.display = item.classList.contains('failed') ? 'none' : 'block';
                } else {
                    item.style.display = item.classList.contains('failed') ? 'block' : 'none';
                }
            });
        }
    </script>
</body>
</html>
''';
  }

  static String _generateScreenHtml(ScreenTestResult screen) {
    final screenId = screen.screenName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
    final statusClass = screen.allPassed ? 'passed' : 'failed';
    final failedClass = screen.allPassed ? '' : 'failed';

    return '''
            <div class="screen-item $failedClass" data-status="$statusClass">
                <div class="screen-header" onclick="toggleDetails('$screenId')">
                    <div>
                        <span class="screen-name">${screen.screenName}</span>
                        <span class="status-badge $statusClass">${screen.allPassed ? 'PASSED' : 'FAILED'}</span>
                    </div>
                    <div class="screen-stats">
                        <span>Elements: ${screen.passedElements}/${screen.totalElements}</span>
                        <span>Duration: ${screen.totalDuration.inMilliseconds}ms</span>
                    </div>
                </div>
                <div class="screen-details" id="details-$screenId">
                    ${!screen.rendered ? '<div class="error-message">Render Error: ${screen.renderError}</div>' : ''}
                    ${screen.elementResults.isNotEmpty ? '''
                    <table class="element-table">
                        <thead>
                            <tr>
                                <th>Element</th>
                                <th>Type</th>
                                <th>Action</th>
                                <th>Duration</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${screen.elementResults.map((e) => '''
                            <tr class="${e.passed ? 'passed' : 'failed'}">
                                <td>${e.elementText ?? 'Unknown'}</td>
                                <td>${e.elementType}</td>
                                <td>${e.testAction}</td>
                                <td>${e.duration.inMilliseconds}ms</td>
                                <td>${e.errorMessage ?? '-'}</td>
                            </tr>
                            ''').join('')}
                        </tbody>
                    </table>
                    ''' : '<p style="color: #9CA3AF; padding: 12px;">No interactive elements found</p>'}
                </div>
            </div>
    ''';
  }

  /// Save reports to files
  static Future<void> saveReports(
    TestSuiteResult result, {
    String outputDir = 'test_reports',
  }) async {
    final dir = Directory(outputDir);
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }

    final timestamp = result.startTime.toIso8601String().replaceAll(':', '-').split('.')[0];

    // Save JSON report
    final jsonFile = File('$outputDir/report_$timestamp.json');
    await jsonFile.writeAsString(generateJsonReport(result));

    // Save HTML report
    final htmlFile = File('$outputDir/report_$timestamp.html');
    await htmlFile.writeAsString(generateHtmlReport(result));

    // Save latest report links
    final latestJsonFile = File('$outputDir/latest.json');
    await latestJsonFile.writeAsString(generateJsonReport(result));

    final latestHtmlFile = File('$outputDir/latest.html');
    await latestHtmlFile.writeAsString(generateHtmlReport(result));

    print('\n📁 Reports saved to:');
    print('   JSON: ${jsonFile.path}');
    print('   HTML: ${htmlFile.path}');
    print('   Latest: $outputDir/latest.html');
  }
}
