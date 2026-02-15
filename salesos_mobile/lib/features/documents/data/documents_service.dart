import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Document model
class DocumentModel {
  final String id;
  final String name;
  final String type;
  final int size;
  final String? url;
  final String? entityType;
  final String? entityId;
  final String? createdBy;
  final DateTime createdAt;

  DocumentModel({
    required this.id,
    required this.name,
    required this.type,
    this.size = 0,
    this.url,
    this.entityType,
    this.entityId,
    this.createdBy,
    required this.createdAt,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    return DocumentModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? json['fileName'] as String? ?? '',
      type: json['type'] as String? ?? json['mimeType'] as String? ?? 'OTHER',
      size: json['size'] as int? ?? json['fileSize'] as int? ?? 0,
      url: json['url'] as String? ?? json['fileUrl'] as String?,
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
      createdBy: json['createdBy'] as String? ??
          json['uploadedBy']?['name'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  String get formattedSize {
    if (size >= 1048576) {
      return '${(size / 1048576).toStringAsFixed(1)} MB';
    } else if (size >= 1024) {
      return '${(size / 1024).toStringAsFixed(1)} KB';
    }
    return '$size B';
  }

  String get typeCategory {
    final lower = type.toLowerCase();
    if (lower.contains('pdf')) return 'PDF';
    if (lower.contains('doc') || lower.contains('word')) return 'DOC';
    if (lower.contains('image') ||
        lower.contains('png') ||
        lower.contains('jpg') ||
        lower.contains('jpeg')) {
      return 'IMAGE';
    }
    if (lower.contains('xls') || lower.contains('spreadsheet')) return 'SHEET';
    return 'OTHER';
  }
}

/// Documents service provider
final documentsServiceProvider = Provider<DocumentsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return DocumentsService(api, authMode);
});

/// Documents list provider
final documentsProvider =
    FutureProvider.autoDispose<List<DocumentModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(documentsServiceProvider);
  return service.getAll();
});

/// Document detail provider (family by id)
final documentDetailProvider =
    FutureProvider.autoDispose.family<DocumentModel?, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(documentsServiceProvider);
  return service.getById(id);
});

/// Documents service
class DocumentsService {
  final ApiClient _api;

  DocumentsService(this._api, AuthMode _);

  /// Get all documents
  Future<List<DocumentModel>> getAll() async {
    try {
      final response = await _api.get('/documents');
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
          .map((item) => DocumentModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get a document by ID
  Future<DocumentModel?> getById(String id) async {
    try {
      final response = await _api.get('/documents/$id');
      return DocumentModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Upload a document
  Future<DocumentModel?> upload({
    required String filePath,
    String? entityType,
    String? entityId,
  }) async {
    try {
      final response = await _api.uploadFile(
        '/documents',
        filePath: filePath,
        fieldName: 'file',
        data: {
          'entityType': ?entityType,
          'entityId': ?entityId,
        },
      );
      return DocumentModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Delete a document
  Future<bool> delete(String id) async {
    try {
      await _api.delete('/documents/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
