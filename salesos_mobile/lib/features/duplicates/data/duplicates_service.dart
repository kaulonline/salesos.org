import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Duplicate group model containing potential duplicate records
class DuplicateGroupModel {
  final String id;
  final String entityType;
  final List<Map<String, dynamic>> records;
  final double confidence;
  final DateTime createdAt;

  DuplicateGroupModel({
    required this.id,
    required this.entityType,
    required this.records,
    this.confidence = 0,
    required this.createdAt,
  });

  factory DuplicateGroupModel.fromJson(Map<String, dynamic> json) {
    return DuplicateGroupModel(
      id: json['id'] as String? ?? '',
      entityType: json['entityType'] as String? ?? '',
      records: (json['records'] as List<dynamic>?)
              ?.map((r) => r as Map<String, dynamic>)
              .toList() ??
          [],
      confidence: (json['confidence'] as num?)?.toDouble() ??
          (json['score'] as num?)?.toDouble() ??
          0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  int get recordCount => records.length;

  String get confidenceLabel {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  }
}

/// Duplicates service provider
final duplicatesServiceProvider = Provider<DuplicatesService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return DuplicatesService(api, authMode);
});

/// Duplicate groups provider
final duplicateGroupsProvider =
    FutureProvider.autoDispose<List<DuplicateGroupModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(duplicatesServiceProvider);
  return service.getGroups();
});

/// Duplicates service
class DuplicatesService {
  final ApiClient _api;

  DuplicatesService(this._api, AuthMode _);

  /// Get all duplicate groups
  Future<List<DuplicateGroupModel>> getGroups() async {
    try {
      final response = await _api.get('/duplicates');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['groups'] is List) {
        items = data['groups'] as List;
      }

      return items
          .map((item) =>
              DuplicateGroupModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Merge a duplicate group
  Future<bool> merge(String groupId, {String? primaryRecordId}) async {
    try {
      await _api.post('/duplicates/$groupId/merge', data: {
        'primaryRecordId': ?primaryRecordId,
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}
