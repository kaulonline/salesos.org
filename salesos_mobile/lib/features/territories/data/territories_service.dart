import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Territory model
class TerritoryModel {
  final String id;
  final String name;
  final String? description;
  final int memberCount;
  final int accountCount;
  final double dealValue;
  final DateTime createdAt;

  TerritoryModel({
    required this.id,
    required this.name,
    this.description,
    this.memberCount = 0,
    this.accountCount = 0,
    this.dealValue = 0,
    required this.createdAt,
  });

  factory TerritoryModel.fromJson(Map<String, dynamic> json) {
    return TerritoryModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      memberCount: json['memberCount'] as int? ??
          (json['members'] is List ? (json['members'] as List).length : 0),
      accountCount: json['accountCount'] as int? ??
          (json['accounts'] is List ? (json['accounts'] as List).length : 0),
      dealValue: (json['dealValue'] as num?)?.toDouble() ??
          (json['totalDealValue'] as num?)?.toDouble() ??
          0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
    };
  }
}

/// Territories service provider
final territoriesServiceProvider = Provider<TerritoriesService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return TerritoriesService(api, authMode);
});

/// Territories list provider
final territoriesProvider =
    FutureProvider.autoDispose<List<TerritoryModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(territoriesServiceProvider);
  return service.getAll();
});

/// Territory detail provider (family by id)
final territoryDetailProvider =
    FutureProvider.autoDispose.family<TerritoryModel?, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(territoriesServiceProvider);
  return service.getById(id);
});

/// Territories service
class TerritoriesService {
  final ApiClient _api;

  TerritoriesService(this._api, AuthMode _);

  /// Get all territories
  Future<List<TerritoryModel>> getAll() async {
    try {
      final response = await _api.get('/territories');
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
          .map((item) => TerritoryModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get territory by ID
  Future<TerritoryModel?> getById(String id) async {
    try {
      final response = await _api.get('/territories/$id');
      return TerritoryModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Create a territory
  Future<TerritoryModel?> create(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/territories', data: data);
      return TerritoryModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Update a territory
  Future<TerritoryModel?> update(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/territories/$id', data: data);
      return TerritoryModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }
}
