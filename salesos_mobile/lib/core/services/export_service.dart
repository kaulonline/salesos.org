import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import 'package:csv/csv.dart' as csv_lib;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

/// Export format options
enum ExportFormat {
  csv,
  pdf,
}

/// Export data type for different CRM entities
enum ExportDataType {
  leads,
  contacts,
  opportunities,
  activities,
  reports,
  deals,
}

/// Export options configuration
class ExportOptions {
  final ExportFormat format;
  final DateTime? startDate;
  final DateTime? endDate;
  final Set<ExportDataType> entityTypes;
  final String? customTitle;
  final bool includeHeaders;
  final bool includeSummary;

  const ExportOptions({
    required this.format,
    this.startDate,
    this.endDate,
    this.entityTypes = const {},
    this.customTitle,
    this.includeHeaders = true,
    this.includeSummary = true,
  });

  ExportOptions copyWith({
    ExportFormat? format,
    DateTime? startDate,
    DateTime? endDate,
    Set<ExportDataType>? entityTypes,
    String? customTitle,
    bool? includeHeaders,
    bool? includeSummary,
  }) {
    return ExportOptions(
      format: format ?? this.format,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      entityTypes: entityTypes ?? this.entityTypes,
      customTitle: customTitle ?? this.customTitle,
      includeHeaders: includeHeaders ?? this.includeHeaders,
      includeSummary: includeSummary ?? this.includeSummary,
    );
  }
}

/// Result of an export operation
class ExportResult {
  final bool success;
  final String? filePath;
  final String? error;
  final String? fileName;

  ExportResult({
    required this.success,
    this.filePath,
    this.error,
    this.fileName,
  });

  factory ExportResult.success(String filePath, String fileName) {
    return ExportResult(
      success: true,
      filePath: filePath,
      fileName: fileName,
    );
  }

  factory ExportResult.failure(String error) {
    return ExportResult(
      success: false,
      error: error,
    );
  }
}

/// Service for exporting CRM data to CSV and PDF formats
class ExportService {
  /// Callback for progress updates
  void Function(double progress, String operation)? onProgress;

  /// Export data to CSV format using the csv package
  Future<ExportResult> exportToCsv({
    required List<Map<String, dynamic>> data,
    required String filename,
    required ExportDataType dataType,
    List<String>? columns,
    ExportOptions? options,
  }) async {
    try {
      if (data.isEmpty) {
        return ExportResult.failure('No data to export');
      }

      onProgress?.call(0.1, 'Preparing data...');

      // Filter data by date range if specified
      final filteredData = _filterByDateRange(data, options);

      // Determine columns based on data type or use provided columns
      final exportColumns = columns ?? _getColumnsForDataType(dataType);
      final columnHeaders = _getColumnHeaders(dataType, exportColumns);

      onProgress?.call(0.3, 'Building CSV...');

      // Build CSV data using the csv package
      final List<List<dynamic>> rows = [];

      // Add header row if specified
      if (options?.includeHeaders ?? true) {
        rows.add(columnHeaders);
      }

      // Add data rows
      for (int i = 0; i < filteredData.length; i++) {
        final row = filteredData[i];
        final values = exportColumns.map((col) => _extractValue(row, col)).toList();
        rows.add(values);

        // Update progress for large datasets
        if (i % 100 == 0) {
          onProgress?.call(0.3 + (0.5 * i / filteredData.length), 'Processing records...');
        }
      }

      // Convert to CSV string using the csv package
      final csvContent = const csv_lib.CsvEncoder().convert(rows);

      onProgress?.call(0.85, 'Saving file...');

      // Save to file
      final directory = await getApplicationDocumentsDirectory();
      final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final fullFilename = '${filename}_$timestamp.csv';
      final file = File('${directory.path}/$fullFilename');
      await file.writeAsString(csvContent);

      onProgress?.call(1.0, 'Complete');

      return ExportResult.success(file.path, fullFilename);
    } catch (e) {
      return ExportResult.failure('Failed to export CSV: $e');
    }
  }

  /// Legacy method for backward compatibility
  Future<ExportResult> exportToCSV({
    required List<Map<String, dynamic>> data,
    required String filename,
    required ExportDataType dataType,
    List<String>? columns,
  }) async {
    return exportToCsv(
      data: data,
      filename: filename,
      dataType: dataType,
      columns: columns,
    );
  }

  /// Export data to PDF format using the pdf package
  Future<ExportResult> exportToPdf({
    required List<Map<String, dynamic>> data,
    required String filename,
    required ExportDataType dataType,
    String? title,
    List<String>? columns,
    ExportOptions? options,
  }) async {
    try {
      if (data.isEmpty) {
        return ExportResult.failure('No data to export');
      }

      onProgress?.call(0.1, 'Preparing PDF...');

      // Filter data by date range if specified
      final filteredData = _filterByDateRange(data, options);

      // Determine columns based on data type or use provided columns
      final exportColumns = columns ?? _getColumnsForDataType(dataType);
      final columnHeaders = _getColumnHeaders(dataType, exportColumns);
      final reportTitle = title ?? options?.customTitle ?? _getTitleForDataType(dataType);

      onProgress?.call(0.3, 'Generating PDF document...');

      // Build PDF using the pdf package
      final pdfBytes = await _generatePdfWithPackage(
        title: reportTitle,
        headers: columnHeaders,
        data: filteredData,
        columns: exportColumns,
        dataType: dataType,
        options: options,
      );

      onProgress?.call(0.85, 'Saving file...');

      // Save to file
      final directory = await getApplicationDocumentsDirectory();
      final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final fullFilename = '${filename}_$timestamp.pdf';
      final file = File('${directory.path}/$fullFilename');
      await file.writeAsBytes(pdfBytes);

      onProgress?.call(1.0, 'Complete');

      return ExportResult.success(file.path, fullFilename);
    } catch (e) {
      return ExportResult.failure('Failed to export PDF: $e');
    }
  }

  /// Legacy method for backward compatibility
  Future<ExportResult> exportToPDF({
    required List<Map<String, dynamic>> data,
    required String filename,
    required ExportDataType dataType,
    String? title,
    List<String>? columns,
  }) async {
    return exportToPdf(
      data: data,
      filename: filename,
      dataType: dataType,
      title: title,
      columns: columns,
    );
  }

  /// Generate PDF using the pdf package for professional layouts
  Future<Uint8List> _generatePdfWithPackage({
    required String title,
    required List<String> headers,
    required List<Map<String, dynamic>> data,
    required List<String> columns,
    required ExportDataType dataType,
    ExportOptions? options,
  }) async {
    final pdf = pw.Document();

    // Define colors for the PDF
    const primaryColor = PdfColor.fromInt(0xFFEAD07D); // SalesOS gold
    const headerBgColor = PdfColor.fromInt(0xFFF5F5F5);
    const borderColor = PdfColor.fromInt(0xFFE0E0E0);

    // Create styled table headers
    final tableHeaders = headers.map((h) => pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Text(
        h,
        style: pw.TextStyle(
          fontWeight: pw.FontWeight.bold,
          fontSize: 9,
          color: PdfColors.white,
        ),
      ),
    )).toList();

    // Create table rows
    final tableRows = data.asMap().entries.map((entry) {
      final index = entry.key;
      final row = entry.value;
      final bgColor = index % 2 == 0 ? PdfColors.white : headerBgColor;

      return pw.TableRow(
        decoration: pw.BoxDecoration(color: bgColor),
        children: columns.map((col) {
          final value = _extractValue(row, col);
          // Truncate long values
          final displayValue = value.length > 30 ? '${value.substring(0, 27)}...' : value;
          return pw.Padding(
            padding: const pw.EdgeInsets.all(6),
            child: pw.Text(
              displayValue,
              style: const pw.TextStyle(fontSize: 8),
            ),
          );
        }).toList(),
      );
    }).toList();

    // Calculate column widths based on content
    final columnWidths = <int, pw.TableColumnWidth>{};
    for (int i = 0; i < columns.length; i++) {
      columnWidths[i] = const pw.FlexColumnWidth();
    }

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        header: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'SalesOS CRM',
                  style: pw.TextStyle(
                    fontSize: 20,
                    fontWeight: pw.FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
                pw.Text(
                  DateFormat('MMMM d, yyyy').format(DateTime.now()),
                  style: const pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey600,
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Text(
              title,
              style: pw.TextStyle(
                fontSize: 16,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            if (options?.startDate != null && options?.endDate != null) ...[
              pw.SizedBox(height: 4),
              pw.Text(
                'Period: ${DateFormat('MMM d, yyyy').format(options!.startDate!)} - ${DateFormat('MMM d, yyyy').format(options.endDate!)}',
                style: const pw.TextStyle(
                  fontSize: 10,
                  color: PdfColors.grey700,
                ),
              ),
            ],
            pw.SizedBox(height: 4),
            pw.Text(
              'Total Records: ${data.length}',
              style: const pw.TextStyle(
                fontSize: 10,
                color: PdfColors.grey700,
              ),
            ),
            pw.SizedBox(height: 12),
            pw.Divider(color: borderColor, thickness: 1),
            pw.SizedBox(height: 12),
          ],
        ),
        footer: (context) => pw.Column(
          children: [
            pw.Divider(color: borderColor, thickness: 0.5),
            pw.SizedBox(height: 8),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'Generated by SalesOS Sales GPT',
                  style: const pw.TextStyle(
                    fontSize: 8,
                    color: PdfColors.grey600,
                  ),
                ),
                pw.Text(
                  'Page ${context.pageNumber} of ${context.pagesCount}',
                  style: const pw.TextStyle(
                    fontSize: 8,
                    color: PdfColors.grey600,
                  ),
                ),
              ],
            ),
          ],
        ),
        build: (context) => [
          pw.Table(
            border: pw.TableBorder.all(color: borderColor, width: 0.5),
            columnWidths: columnWidths,
            children: [
              // Header row
              pw.TableRow(
                decoration: const pw.BoxDecoration(color: primaryColor),
                children: tableHeaders,
              ),
              // Data rows
              ...tableRows,
            ],
          ),
          if (options?.includeSummary ?? true) ...[
            pw.SizedBox(height: 20),
            _buildPdfSummary(data, dataType),
          ],
        ],
      ),
    );

    return pdf.save();
  }

  /// Build summary section for PDF
  pw.Widget _buildPdfSummary(List<Map<String, dynamic>> data, ExportDataType dataType) {
    String summaryText = '';

    switch (dataType) {
      case ExportDataType.opportunities:
      case ExportDataType.deals:
        final totalAmount = data.fold<double>(0, (sum, row) {
          final amount = row['Amount'] ?? row['amount'] ?? 0;
          return sum + (amount is num ? amount.toDouble() : 0);
        });
        summaryText = 'Total Value: \$${NumberFormat('#,##0.00').format(totalAmount)}';
        break;
      case ExportDataType.leads:
        final avgScore = data.isNotEmpty
            ? data.fold<double>(0, (sum, row) {
                final score = row['score'] ?? row['Score'] ?? 0;
                return sum + (score is num ? score.toDouble() : 0);
              }) / data.length
            : 0;
        summaryText = 'Average Lead Score: ${avgScore.toStringAsFixed(1)}';
        break;
      default:
        summaryText = 'Total Records: ${data.length}';
    }

    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: const PdfColor.fromInt(0xFFFAF8F0),
        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
        border: pw.Border.all(
          color: const PdfColor.fromInt(0xFFEAD07D),
          width: 0.5,
        ),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            'Summary',
            style: pw.TextStyle(
              fontSize: 12,
              fontWeight: pw.FontWeight.bold,
              color: const PdfColor.fromInt(0xFFEAD07D),
            ),
          ),
          pw.SizedBox(height: 6),
          pw.Text(
            summaryText,
            style: const pw.TextStyle(fontSize: 10),
          ),
        ],
      ),
    );
  }

  /// Share a file using the system share sheet
  Future<bool> shareFile(String filePath, {String? subject}) async {
    try {
      final file = File(filePath);
      if (!await file.exists()) {
        return false;
      }

      final xFile = XFile(filePath);
      await SharePlus.instance.share(
        ShareParams(
          files: [xFile],
          subject: subject ?? 'SalesOS CRM Export',
        ),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Delete a temporary export file
  Future<bool> deleteExportFile(String filePath) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Save file to the device's downloads folder
  /// Returns the path where the file was saved, or null on failure
  Future<String?> saveToDevice(String filePath, {String? customFilename}) async {
    try {
      final sourceFile = File(filePath);
      if (!await sourceFile.exists()) {
        return null;
      }

      // Get the downloads directory
      Directory? downloadsDir;

      if (Platform.isAndroid) {
        // On Android, use external storage downloads directory
        downloadsDir = Directory('/storage/emulated/0/Download');
        if (!await downloadsDir.exists()) {
          // Fallback to app documents directory
          downloadsDir = await getApplicationDocumentsDirectory();
        }
      } else if (Platform.isIOS) {
        // On iOS, use the documents directory (accessible via Files app)
        downloadsDir = await getApplicationDocumentsDirectory();
      } else {
        // Desktop platforms
        final docsDir = await getApplicationDocumentsDirectory();
        downloadsDir = Directory('${docsDir.parent.path}/Downloads');
        if (!await downloadsDir.exists()) {
          downloadsDir = docsDir;
        }
      }

      // Generate destination filename
      final sourceFilename = filePath.split('/').last;
      final filename = customFilename ?? sourceFilename;
      final destPath = '${downloadsDir.path}/$filename';

      // Copy file to downloads
      final destFile = await sourceFile.copy(destPath);

      return destFile.path;
    } catch (e) {
      debugPrint('Error saving file to device: $e');
      return null;
    }
  }

  /// Get the downloads directory path
  Future<String?> getDownloadsPath() async {
    try {
      if (Platform.isAndroid) {
        final dir = Directory('/storage/emulated/0/Download');
        if (await dir.exists()) {
          return dir.path;
        }
      }
      final docsDir = await getApplicationDocumentsDirectory();
      return docsDir.path;
    } catch (e) {
      return null;
    }
  }

  // Helper methods

  /// Filter data by date range from options
  List<Map<String, dynamic>> _filterByDateRange(
    List<Map<String, dynamic>> data,
    ExportOptions? options,
  ) {
    if (options?.startDate == null || options?.endDate == null) {
      return data;
    }

    return data.where((row) {
      // Try multiple date field names
      final dateFields = [
        'createdAt', 'CreatedDate', 'createdDate',
        'closeDate', 'CloseDate',
        'activityDate', 'ActivityDate',
        'date', 'Date',
        'updatedAt', 'LastModifiedDate',
      ];

      for (final field in dateFields) {
        final dateValue = row[field];
        if (dateValue != null) {
          DateTime? date;
          if (dateValue is DateTime) {
            date = dateValue;
          } else if (dateValue is String) {
            date = DateTime.tryParse(dateValue);
          }

          if (date != null) {
            return !date.isBefore(options!.startDate!) &&
                   !date.isAfter(options.endDate!);
          }
        }
      }

      // If no date field found, include the record
      return true;
    }).toList();
  }

  List<String> _getColumnsForDataType(ExportDataType dataType) {
    switch (dataType) {
      case ExportDataType.leads:
        return [
          'name',
          'company',
          'email',
          'phone',
          'status',
          'score',
          'createdAt',
        ];
      case ExportDataType.contacts:
        return [
          'name',
          'company',
          'email',
          'phone',
          'role',
          'createdAt',
        ];
      case ExportDataType.opportunities:
      case ExportDataType.deals:
        return [
          'name',
          'accountName',
          'stage',
          'amount',
          'probability',
          'closeDate',
        ];
      case ExportDataType.activities:
        return [
          'subject',
          'type',
          'status',
          'relatedTo',
          'dueDate',
          'createdAt',
        ];
      case ExportDataType.reports:
        return [
          'metric',
          'value',
          'period',
        ];
    }
  }

  List<String> _getColumnHeaders(
      ExportDataType dataType, List<String> columns) {
    final headerMap = {
      'name': 'Name',
      'company': 'Company',
      'email': 'Email',
      'phone': 'Phone',
      'status': 'Status',
      'score': 'Lead Score',
      'createdAt': 'Created Date',
      'role': 'Job Title',
      'accountName': 'Account',
      'stage': 'Stage',
      'amount': 'Amount',
      'probability': 'Probability',
      'closeDate': 'Close Date',
      'metric': 'Metric',
      'value': 'Value',
      'period': 'Period',
      'subject': 'Subject',
      'type': 'Type',
      'relatedTo': 'Related To',
      'dueDate': 'Due Date',
    };

    return columns.map((col) => headerMap[col] ?? col).toList();
  }

  String _getTitleForDataType(ExportDataType dataType) {
    switch (dataType) {
      case ExportDataType.leads:
        return 'Leads Export';
      case ExportDataType.contacts:
        return 'Contacts Export';
      case ExportDataType.opportunities:
        return 'Opportunities Export';
      case ExportDataType.deals:
        return 'Deals Export';
      case ExportDataType.activities:
        return 'Activities Export';
      case ExportDataType.reports:
        return 'Reports Export';
    }
  }

  String _extractValue(Map<String, dynamic> row, String column) {
    // Handle nested properties and various key formats
    dynamic value;

    // Try direct key
    value = row[column];

    // Try PascalCase (Salesforce format)
    if (value == null) {
      final pascalKey = column[0].toUpperCase() + column.substring(1);
      value = row[pascalKey];
    }

    // Handle special cases
    if (column == 'name') {
      // Try FirstName + LastName combination
      final firstName = row['FirstName'] ?? row['firstName'] ?? '';
      final lastName = row['LastName'] ?? row['lastName'] ?? '';
      if (firstName.toString().isNotEmpty || lastName.toString().isNotEmpty) {
        value = '$firstName $lastName'.trim();
      } else {
        value = row['name'] ?? row['Name'] ?? '';
      }
    } else if (column == 'company') {
      value = row['Company'] ?? row['company'] ?? '';
    } else if (column == 'accountName') {
      final account = row['Account'] as Map<String, dynamic>?;
      value = account?['Name'] ?? row['accountName'] ?? row['AccountName'] ?? '';
    } else if (column == 'stage') {
      value = row['StageName'] ?? row['stageName'] ?? row['stage'] ?? '';
    } else if (column == 'createdAt') {
      value = row['CreatedDate'] ?? row['createdAt'] ?? row['createdDate'] ?? '';
    } else if (column == 'closeDate') {
      value = row['CloseDate'] ?? row['closeDate'] ?? '';
    } else if (column == 'subject') {
      value = row['Subject'] ?? row['subject'] ?? row['title'] ?? '';
    } else if (column == 'type') {
      value = row['Type'] ?? row['type'] ?? row['activityType'] ?? '';
    } else if (column == 'relatedTo') {
      // Try to get related object name
      final related = row['WhatId'] ?? row['WhoId'] ?? row['relatedTo'] ?? '';
      if (related is Map) {
        value = related['Name'] ?? related['name'] ?? '';
      } else {
        value = row['relatedToName'] ?? row['RelatedToName'] ?? related;
      }
    } else if (column == 'dueDate') {
      value = row['DueDate'] ?? row['dueDate'] ?? row['ActivityDate'] ?? '';
    }

    // Format value
    if (value == null) return '';
    if (value is DateTime) {
      return DateFormat('yyyy-MM-dd').format(value);
    }
    if (value is double) {
      return value.toStringAsFixed(2);
    }
    return value.toString();
  }

}

/// Provider for the export service
final exportServiceProvider = Provider<ExportService>((ref) {
  return ExportService();
});

/// Export state for tracking export progress
class ExportState {
  final bool isExporting;
  final double progress;
  final String? currentOperation;
  final ExportResult? result;

  const ExportState({
    this.isExporting = false,
    this.progress = 0,
    this.currentOperation,
    this.result,
  });

  ExportState copyWith({
    bool? isExporting,
    double? progress,
    String? currentOperation,
    ExportResult? result,
  }) {
    return ExportState(
      isExporting: isExporting ?? this.isExporting,
      progress: progress ?? this.progress,
      currentOperation: currentOperation ?? this.currentOperation,
      result: result ?? this.result,
    );
  }
}

/// Notifier for managing export state
class ExportNotifier extends Notifier<ExportState> {
  @override
  ExportState build() => const ExportState();

  Future<ExportResult> exportData({
    required List<Map<String, dynamic>> data,
    required String filename,
    required ExportDataType dataType,
    required ExportFormat format,
    String? title,
    ExportOptions? options,
  }) async {
    state = state.copyWith(
      isExporting: true,
      progress: 0,
      currentOperation: 'Preparing export...',
    );

    try {
      final exportService = ref.read(exportServiceProvider);

      // Set up progress callback
      exportService.onProgress = (progress, operation) {
        state = state.copyWith(
          progress: progress,
          currentOperation: operation,
        );
      };

      ExportResult result;
      if (format == ExportFormat.csv) {
        result = await exportService.exportToCsv(
          data: data,
          filename: filename,
          dataType: dataType,
          options: options,
        );
      } else {
        result = await exportService.exportToPdf(
          data: data,
          filename: filename,
          dataType: dataType,
          title: title,
          options: options,
        );
      }

      // Clear progress callback
      exportService.onProgress = null;

      state = state.copyWith(
        progress: 1.0,
        currentOperation: 'Complete',
        result: result,
        isExporting: false,
      );

      return result;
    } catch (e) {
      final result = ExportResult.failure(e.toString());
      state = state.copyWith(
        isExporting: false,
        result: result,
      );
      return result;
    }
  }

  Future<bool> shareExport(String filePath) async {
    final exportService = ref.read(exportServiceProvider);
    return exportService.shareFile(filePath);
  }

  Future<String?> saveToDevice(String filePath, {String? customFilename}) async {
    final exportService = ref.read(exportServiceProvider);
    state = state.copyWith(
      currentOperation: 'Saving to device...',
    );
    final savedPath = await exportService.saveToDevice(filePath, customFilename: customFilename);
    if (savedPath != null) {
      state = state.copyWith(
        currentOperation: 'Saved successfully',
      );
    }
    return savedPath;
  }

  void reset() {
    state = const ExportState();
  }
}

/// Provider for export state management
final exportNotifierProvider =
    NotifierProvider<ExportNotifier, ExportState>(ExportNotifier.new);
