import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Import job model
class ImportJobModel {
  final String id;
  final String fileName;
  final String entityType;
  final String status;
  final int totalRows;
  final int processedRows;
  final int errorCount;
  final DateTime createdAt;

  ImportJobModel({
    required this.id,
    required this.fileName,
    required this.entityType,
    required this.status,
    this.totalRows = 0,
    this.processedRows = 0,
    this.errorCount = 0,
    required this.createdAt,
  });

  factory ImportJobModel.fromJson(Map<String, dynamic> json) {
    return ImportJobModel(
      id: json['id'] as String? ?? '',
      fileName: json['fileName'] as String? ?? json['file'] as String? ?? '',
      entityType: json['entityType'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      totalRows: json['totalRows'] as int? ?? 0,
      processedRows: json['processedRows'] as int? ?? 0,
      errorCount: json['errorCount'] as int? ?? json['errors'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  double get progress =>
      totalRows > 0 ? (processedRows / totalRows).clamp(0.0, 1.0) : 0.0;

  bool get isComplete =>
      status.toUpperCase() == 'COMPLETED' || status.toUpperCase() == 'DONE';

  bool get isProcessing =>
      status.toUpperCase() == 'PROCESSING' || status.toUpperCase() == 'IN_PROGRESS';

  bool get hasFailed => status.toUpperCase() == 'FAILED';
}

/// Import service provider
final importServiceProvider = Provider<ImportService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return ImportService(api, authMode);
});

/// Import history provider
final importHistoryProvider =
    FutureProvider.autoDispose<List<ImportJobModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(importServiceProvider);
  return service.getHistory();
});

/// Import service
class ImportService {
  final ApiClient _api;

  ImportService(this._api, AuthMode _);

  /// Start an import
  Future<ImportJobModel?> startImport({
    required String filePath,
    required String entityType,
    Map<String, String>? fieldMapping,
  }) async {
    try {
      final response = await _api.uploadFile(
        '/imports',
        filePath: filePath,
        fieldName: 'file',
        data: {
          'entityType': entityType,
          'fieldMapping': ?fieldMapping,
        },
      );
      return ImportJobModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Get import status
  Future<ImportJobModel?> getStatus(String jobId) async {
    try {
      final response = await _api.get('/imports/$jobId');
      return ImportJobModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Get import history
  Future<List<ImportJobModel>> getHistory() async {
    try {
      final response = await _api.get('/imports');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }

      return items
          .map((item) => ImportJobModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }
}
