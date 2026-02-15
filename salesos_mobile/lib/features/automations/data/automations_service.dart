import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Workflow automation model
class WorkflowModel {
  final String id;
  final String name;
  final String? description;
  final String trigger;
  final List<Map<String, dynamic>> conditions;
  final List<Map<String, dynamic>> actions;
  final bool isEnabled;
  final DateTime? lastRunAt;
  final int runCount;
  final DateTime createdAt;

  WorkflowModel({
    required this.id,
    required this.name,
    this.description,
    required this.trigger,
    this.conditions = const [],
    this.actions = const [],
    this.isEnabled = false,
    this.lastRunAt,
    this.runCount = 0,
    required this.createdAt,
  });

  factory WorkflowModel.fromJson(Map<String, dynamic> json) {
    return WorkflowModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      trigger: json['trigger'] as String? ?? json['triggerType'] as String? ?? '',
      conditions: (json['conditions'] as List<dynamic>?)
              ?.map((c) => c as Map<String, dynamic>)
              .toList() ??
          [],
      actions: (json['actions'] as List<dynamic>?)
              ?.map((a) => a as Map<String, dynamic>)
              .toList() ??
          [],
      isEnabled: json['isEnabled'] as bool? ?? json['enabled'] as bool? ?? false,
      lastRunAt: json['lastRunAt'] != null
          ? DateTime.parse(json['lastRunAt'] as String)
          : null,
      runCount: json['runCount'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'trigger': trigger,
      'conditions': conditions,
      'actions': actions,
      'isEnabled': isEnabled,
    };
  }
}

/// Automations service provider
final automationsServiceProvider = Provider<AutomationsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return AutomationsService(api, authMode);
});

/// Automations list provider
final automationsProvider =
    FutureProvider.autoDispose<List<WorkflowModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(automationsServiceProvider);
  return service.getAll();
});

/// Automation detail provider (family by id)
final automationDetailProvider =
    FutureProvider.autoDispose.family<WorkflowModel?, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(automationsServiceProvider);
  return service.getById(id);
});

/// Automations service
class AutomationsService {
  final ApiClient _api;

  AutomationsService(this._api, AuthMode _);

  /// Get all workflows
  Future<List<WorkflowModel>> getAll() async {
    try {
      final response = await _api.get('/automations');
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
          .map((item) => WorkflowModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get a workflow by ID
  Future<WorkflowModel?> getById(String id) async {
    try {
      final response = await _api.get('/automations/$id');
      return WorkflowModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Create a workflow
  Future<WorkflowModel?> create(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/automations', data: data);
      return WorkflowModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Update a workflow
  Future<WorkflowModel?> update(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/automations/$id', data: data);
      return WorkflowModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Toggle a workflow on/off
  Future<bool> toggle(String id, bool enabled) async {
    try {
      await _api.patch('/automations/$id', data: {'isEnabled': enabled});
      return true;
    } catch (e) {
      return false;
    }
  }
}
