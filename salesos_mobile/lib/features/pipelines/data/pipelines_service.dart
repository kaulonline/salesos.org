import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

class PipelineStage {
  final String id;
  final String name;
  final String displayName;
  final double probability;
  final int sortOrder;
  final Color color;
  final String? description;
  final bool isClosedWon;
  final bool isClosedLost;
  final String pipelineId;
  final List<String> requirements;

  PipelineStage({
    required this.id,
    required this.name,
    this.displayName = '',
    this.probability = 0,
    this.sortOrder = 0,
    this.color = const Color(0xFF6366F1),
    this.description,
    this.isClosedWon = false,
    this.isClosedLost = false,
    this.pipelineId = '',
    this.requirements = const [],
  });

  factory PipelineStage.fromJson(Map<String, dynamic> json) {
    final name = json['name'] as String? ?? 'Stage';
    return PipelineStage(
      id: json['id'] as String? ?? '',
      name: name,
      displayName: (json['displayName'] as String?) ?? name,
      probability: (json['probability'] as num?)?.toDouble() ?? 0,
      sortOrder: ((json['sortOrder'] ?? json['order']) as num?)?.toInt() ?? 0,
      color: _parseColor(json['color'] as String?),
      description: json['description'] as String?,
      isClosedWon: (json['isClosedWon'] ?? json['isWon']) as bool? ?? false,
      isClosedLost: (json['isClosedLost'] ?? json['isLost']) as bool? ?? false,
      pipelineId: (json['pipelineId'] as String?) ?? '',
      requirements: (json['requirements'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'displayName': displayName,
    'probability': probability,
    'sortOrder': sortOrder,
    'color': '#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}',
    'description': description,
    'isClosedWon': isClosedWon,
    'isClosedLost': isClosedLost,
    'pipelineId': pipelineId,
    'requirements': requirements,
  };

  static Color _parseColor(String? hex) {
    if (hex == null || hex.isEmpty) return const Color(0xFF6366F1);
    try {
      final cleaned = hex.replaceFirst('#', '');
      return Color(int.parse('FF$cleaned', radix: 16));
    } catch (_) {
      return const Color(0xFF6366F1);
    }
  }
}

class Pipeline {
  final String id;
  final String name;
  final String? description;
  final String? color;
  final int sortOrder;
  final bool isDefault;
  final bool isActive;
  final List<PipelineStage> stages;
  final DateTime createdAt;
  final DateTime updatedAt;

  Pipeline({
    required this.id,
    required this.name,
    this.description,
    this.color,
    this.sortOrder = 0,
    this.isDefault = false,
    this.isActive = true,
    this.stages = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory Pipeline.fromJson(Map<String, dynamic> json) {
    final stagesJson = json['stages'] as List<dynamic>? ?? [];
    final stages = stagesJson.map((s) => PipelineStage.fromJson(s as Map<String, dynamic>)).toList();
    stages.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return Pipeline(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unnamed Pipeline',
      description: json['description'] as String?,
      color: json['color'] as String?,
      sortOrder: ((json['sortOrder'] ?? json['order']) as num?)?.toInt() ?? 0,
      isDefault: json['isDefault'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      stages: stages,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'] as String) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': description,
    'color': color,
    'sortOrder': sortOrder,
    'isDefault': isDefault,
    'isActive': isActive,
  };
}

// Providers
final pipelinesServiceProvider = Provider<PipelinesService>((ref) {
  final api = ref.watch(apiClientProvider);
  return PipelinesService(api);
});

final pipelinesProvider = FutureProvider.autoDispose<List<Pipeline>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(pipelinesServiceProvider);
  return service.getPipelines();
});

final pipelineDetailProvider = FutureProvider.autoDispose.family<Pipeline?, String>((ref, id) async {
  final service = ref.watch(pipelinesServiceProvider);
  return service.getPipeline(id);
});

class PipelinesService {
  final ApiClient _api;
  PipelinesService(this._api);

  Future<List<Pipeline>> getPipelines() async {
    try {
      final response = await _api.get('/pipelines');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => Pipeline.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<Pipeline?> getPipeline(String id) async {
    try {
      final response = await _api.get('/pipelines/$id');
      return Pipeline.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<Pipeline?> createPipeline(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/pipelines', data: data);
      return Pipeline.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<Pipeline?> updatePipeline(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/pipelines/$id', data: data);
      return Pipeline.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<bool> deletePipeline(String id) async {
    try {
      await _api.delete('/pipelines/$id');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> reorderStages(String pipelineId, List<String> stageIds) async {
    try {
      await _api.put('/pipelines/$pipelineId/stages/reorder', data: {'stageIds': stageIds});
      return true;
    } catch (e) {
      return false;
    }
  }
}
