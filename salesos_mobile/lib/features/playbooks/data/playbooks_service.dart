import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

class PlaybookStep {
  final String id;
  final String title;
  final String? description;
  final int order;
  final bool isCompleted;
  final String? completedAt;

  PlaybookStep({
    required this.id,
    required this.title,
    this.description,
    required this.order,
    this.isCompleted = false,
    this.completedAt,
  });

  factory PlaybookStep.fromJson(Map<String, dynamic> json) => PlaybookStep(
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? '',
    description: json['description'] as String?,
    order: (json['order'] as num?)?.toInt() ?? 0,
    isCompleted: json['isCompleted'] as bool? ?? json['completed'] as bool? ?? false,
    completedAt: json['completedAt'] as String?,
  );
}

class PlaybookModel {
  final String id;
  final String name;
  final String? description;
  final String? category;
  final String? stage;
  final List<PlaybookStep> steps;
  final int totalSteps;
  final int completedSteps;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  PlaybookModel({
    required this.id,
    required this.name,
    this.description,
    this.category,
    this.stage,
    this.steps = const [],
    required this.totalSteps,
    this.completedSteps = 0,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  double get progressPercent => totalSteps > 0 ? completedSteps / totalSteps : 0;

  factory PlaybookModel.fromJson(Map<String, dynamic> json) {
    final stepsList = (json['steps'] as List<dynamic>?)
        ?.map((s) => PlaybookStep.fromJson(s as Map<String, dynamic>))
        .toList() ?? [];

    return PlaybookModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Untitled Playbook',
      description: json['description'] as String?,
      category: json['category'] as String?,
      stage: json['stage'] as String?,
      steps: stepsList,
      totalSteps: (json['totalSteps'] as num?)?.toInt() ?? stepsList.length,
      completedSteps: (json['completedSteps'] as num?)?.toInt() ?? stepsList.where((s) => s.isCompleted).length,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'] as String) : DateTime.now(),
    );
  }
}

// Providers
final playbooksServiceProvider = Provider<PlaybooksService>((ref) {
  final api = ref.watch(apiClientProvider);
  return PlaybooksService(api);
});

final playbooksProvider = FutureProvider.autoDispose<List<PlaybookModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(playbooksServiceProvider);
  return service.getPlaybooks();
});

final playbookDetailProvider = FutureProvider.autoDispose.family<PlaybookModel?, String>((ref, playbookId) async {
  final service = ref.watch(playbooksServiceProvider);
  return service.getPlaybook(playbookId);
});

class PlaybooksService {
  final ApiClient _api;
  PlaybooksService(this._api);

  Future<List<PlaybookModel>> getPlaybooks() async {
    try {
      final response = await _api.get('/admin/playbooks');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => PlaybookModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<PlaybookModel?> getPlaybook(String id) async {
    try {
      final response = await _api.get('/admin/playbooks/$id');
      return PlaybookModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<bool> toggleStepCompletion(String playbookId, String stepId, bool completed) async {
    try {
      await _api.post('/admin/playbooks/$playbookId/steps', data: {
        'stepId': stepId,
        'completed': completed,
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}
