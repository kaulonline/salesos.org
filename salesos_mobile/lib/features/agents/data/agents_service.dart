import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

// ============================================
// MODELS
// ============================================

/// Agent template model
class AgentTemplate {
  final String id;
  final String name;
  final String slug;
  final String description;
  final String? longDescription;
  final String category;
  final String icon;
  final String color;
  final String complexity;
  final String? estimatedSetupTime;
  final List<String> useCases;
  final List<String> tags;
  final int useCount;
  final bool isFeatured;

  AgentTemplate({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    this.longDescription,
    required this.category,
    required this.icon,
    required this.color,
    required this.complexity,
    this.estimatedSetupTime,
    required this.useCases,
    required this.tags,
    required this.useCount,
    required this.isFeatured,
  });

  factory AgentTemplate.fromJson(Map<String, dynamic> json) {
    return AgentTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String,
      longDescription: json['longDescription'] as String?,
      category: json['category'] as String? ?? 'custom',
      icon: json['icon'] as String? ?? 'Bot',
      color: json['color'] as String? ?? '#c9a882',
      complexity: json['complexity'] as String? ?? 'intermediate',
      estimatedSetupTime: json['estimatedSetupTime'] as String?,
      useCases: (json['useCases'] as List<dynamic>?)?.cast<String>() ?? [],
      tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      useCount: json['useCount'] as int? ?? 0,
      isFeatured: json['isFeatured'] as bool? ?? false,
    );
  }
}

/// Custom agent model
class CustomAgent {
  final String id;
  final String name;
  final String slug;
  final String description;
  final String category;
  final String? icon;
  final String? color;
  final String version;
  final bool isPublished;
  final bool isDraft;
  final bool isEnabled;
  final String systemPrompt;
  final String? analysisPrompt;
  final String? outputFormat;
  final String modelId;
  final double temperature;
  final int maxTokens;
  final List<String> enabledTools;
  final Map<String, dynamic>? triggerConfig;
  final List<String> targetEntityTypes;
  final List<String> alertTypes;
  final bool requiresApproval;
  final int? maxExecutionTimeMs;
  final int? maxLLMCalls;
  final bool? useExternalCrmData;
  final String? externalCrmProvider;
  final String? lastRunAt;
  final int runCount;
  final int successCount;

  CustomAgent({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.category,
    this.icon,
    this.color,
    required this.version,
    required this.isPublished,
    required this.isDraft,
    required this.isEnabled,
    required this.systemPrompt,
    this.analysisPrompt,
    this.outputFormat,
    required this.modelId,
    required this.temperature,
    required this.maxTokens,
    required this.enabledTools,
    this.triggerConfig,
    required this.targetEntityTypes,
    required this.alertTypes,
    required this.requiresApproval,
    this.maxExecutionTimeMs,
    this.maxLLMCalls,
    this.useExternalCrmData,
    this.externalCrmProvider,
    this.lastRunAt,
    required this.runCount,
    required this.successCount,
  });

  factory CustomAgent.fromJson(Map<String, dynamic> json) {
    return CustomAgent(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String,
      category: json['category'] as String? ?? 'custom',
      icon: json['icon'] as String?,
      color: json['color'] as String?,
      version: json['version'] as String? ?? '1.0.0',
      isPublished: json['isPublished'] as bool? ?? false,
      isDraft: json['isDraft'] as bool? ?? true,
      isEnabled: json['isEnabled'] as bool? ?? false,
      systemPrompt: json['systemPrompt'] as String? ?? '',
      analysisPrompt: json['analysisPrompt'] as String?,
      outputFormat: json['outputFormat'] as String?,
      modelId: json['modelId'] as String? ?? 'gpt-4o',
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.3,
      maxTokens: json['maxTokens'] as int? ?? 4000,
      enabledTools:
          (json['enabledTools'] as List<dynamic>?)?.cast<String>() ?? [],
      triggerConfig: json['triggerConfig'] as Map<String, dynamic>?,
      targetEntityTypes:
          (json['targetEntityTypes'] as List<dynamic>?)?.cast<String>() ?? [],
      alertTypes: (json['alertTypes'] as List<dynamic>?)?.cast<String>() ?? [],
      requiresApproval: json['requiresApproval'] as bool? ?? true,
      maxExecutionTimeMs: json['maxExecutionTimeMs'] as int?,
      maxLLMCalls: json['maxLLMCalls'] as int?,
      useExternalCrmData: json['useExternalCrmData'] as bool?,
      externalCrmProvider: json['externalCrmProvider'] as String?,
      lastRunAt: json['lastRunAt'] as String?,
      runCount: json['runCount'] as int? ?? 0,
      successCount: json['successCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'category': category,
      if (icon != null) 'icon': icon,
      if (color != null) 'color': color,
      'systemPrompt': systemPrompt,
      if (analysisPrompt != null) 'analysisPrompt': analysisPrompt,
      if (outputFormat != null) 'outputFormat': outputFormat,
      'modelId': modelId,
      'temperature': temperature,
      'maxTokens': maxTokens,
      'enabledTools': enabledTools,
      if (triggerConfig != null) 'triggerConfig': triggerConfig,
      'targetEntityTypes': targetEntityTypes,
      'alertTypes': alertTypes,
      'requiresApproval': requiresApproval,
      if (maxExecutionTimeMs != null) 'maxExecutionTimeMs': maxExecutionTimeMs,
      if (maxLLMCalls != null) 'maxLLMCalls': maxLLMCalls,
      if (useExternalCrmData != null) 'useExternalCrmData': useExternalCrmData,
      if (externalCrmProvider != null)
        'externalCrmProvider': externalCrmProvider,
    };
  }

  int get successRate =>
      runCount > 0 ? ((successCount / runCount) * 100).round() : 0;
}

/// Agent execution model
class AgentExecution {
  final String id;
  final String agentId;
  final String triggeredBy;
  final String? userId;
  final String? entityType;
  final String? entityId;
  final String status;
  final String startedAt;
  final String? completedAt;
  final int? executionTimeMs;
  final int llmCalls;
  final int inputTokens;
  final int outputTokens;
  final double estimatedCost;
  final int alertsCreated;
  final int insightsFound;
  final String? resultSummary;
  final Map<String, dynamic>? resultData;
  final String? errorMessage;
  final List<ExecutionLog>? logs;

  AgentExecution({
    required this.id,
    required this.agentId,
    required this.triggeredBy,
    this.userId,
    this.entityType,
    this.entityId,
    required this.status,
    required this.startedAt,
    this.completedAt,
    this.executionTimeMs,
    required this.llmCalls,
    required this.inputTokens,
    required this.outputTokens,
    required this.estimatedCost,
    required this.alertsCreated,
    required this.insightsFound,
    this.resultSummary,
    this.resultData,
    this.errorMessage,
    this.logs,
  });

  factory AgentExecution.fromJson(Map<String, dynamic> json) {
    return AgentExecution(
      id: json['id'] as String,
      agentId: json['agentId'] as String? ?? '',
      triggeredBy: json['triggeredBy'] as String? ?? 'USER_REQUEST',
      userId: json['userId'] as String?,
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      startedAt: json['startedAt'] as String,
      completedAt: json['completedAt'] as String?,
      executionTimeMs: json['executionTimeMs'] as int?,
      llmCalls: json['llmCalls'] as int? ?? 0,
      inputTokens: json['inputTokens'] as int? ?? 0,
      outputTokens: json['outputTokens'] as int? ?? 0,
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble() ?? 0,
      alertsCreated: json['alertsCreated'] as int? ?? 0,
      insightsFound: json['insightsFound'] as int? ?? 0,
      resultSummary: json['resultSummary'] as String?,
      resultData: json['resultData'] as Map<String, dynamic>?,
      errorMessage: json['errorMessage'] as String?,
      logs: (json['logs'] as List<dynamic>?)
          ?.map((l) => ExecutionLog.fromJson(l as Map<String, dynamic>))
          .toList(),
    );
  }

  double get durationSeconds =>
      executionTimeMs != null ? executionTimeMs! / 1000 : 0;
}

/// Execution log entry
class ExecutionLog {
  final String id;
  final String executionId;
  final String level;
  final String category;
  final String message;
  final Map<String, dynamic>? data;
  final int? latencyMs;
  final String? toolName;
  final String timestamp;

  ExecutionLog({
    required this.id,
    required this.executionId,
    required this.level,
    required this.category,
    required this.message,
    this.data,
    this.latencyMs,
    this.toolName,
    required this.timestamp,
  });

  factory ExecutionLog.fromJson(Map<String, dynamic> json) {
    return ExecutionLog(
      id: json['id'] as String,
      executionId: json['executionId'] as String? ?? '',
      level: json['level'] as String? ?? 'INFO',
      category: json['category'] as String? ?? 'GENERAL',
      message: json['message'] as String? ?? '',
      data: json['data'] as Map<String, dynamic>?,
      latencyMs: json['latencyMs'] as int?,
      toolName: json['toolName'] as String?,
      timestamp:
          json['timestamp'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}

/// Available tool model
class AvailableTool {
  final String name;
  final String description;
  final String category;

  AvailableTool({
    required this.name,
    required this.description,
    required this.category,
  });

  factory AvailableTool.fromJson(Map<String, dynamic> json) {
    return AvailableTool(
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? 'general',
    );
  }
}

/// Run agent result
class RunAgentResult {
  final String executionId;
  final String status;
  final String message;

  RunAgentResult({
    required this.executionId,
    required this.status,
    required this.message,
  });

  factory RunAgentResult.fromJson(Map<String, dynamic> json) {
    return RunAgentResult(
      executionId: json['executionId'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      message: json['message'] as String? ?? 'Agent execution started',
    );
  }
}

/// Suggested action from agent alert
class SuggestedAction {
  final String id;
  final String type;
  final String label;
  final String description;
  final String icon;
  final Map<String, dynamic> data;
  final bool executed;
  final String? executedAt;

  SuggestedAction({
    required this.id,
    required this.type,
    required this.label,
    required this.description,
    required this.icon,
    required this.data,
    this.executed = false,
    this.executedAt,
  });

  factory SuggestedAction.fromJson(Map<String, dynamic> json) {
    return SuggestedAction(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'UNKNOWN',
      label: json['label'] as String? ?? 'Action',
      description: json['description'] as String? ?? '',
      icon: json['icon'] as String? ?? 'task',
      data: json['data'] as Map<String, dynamic>? ?? {},
      executed: json['executed'] as bool? ?? false,
      executedAt: json['executedAt'] as String?,
    );
  }
}

/// Agent alert with suggested actions
class AgentAlert {
  final String id;
  final String agentType;
  final String alertType;
  final String priority;
  final String title;
  final String description;
  final String? recommendation;
  final String userId;
  final String entityType;
  final String entityId;
  final String status;
  final List<SuggestedAction> suggestedActions;
  final Map<String, dynamic>? metadata;
  final String createdAt;
  final String? acknowledgedAt;
  final String? actionedAt;
  final String? dismissedAt;

  AgentAlert({
    required this.id,
    required this.agentType,
    required this.alertType,
    required this.priority,
    required this.title,
    required this.description,
    this.recommendation,
    required this.userId,
    required this.entityType,
    required this.entityId,
    required this.status,
    required this.suggestedActions,
    this.metadata,
    required this.createdAt,
    this.acknowledgedAt,
    this.actionedAt,
    this.dismissedAt,
  });

  factory AgentAlert.fromJson(Map<String, dynamic> json) {
    final actionsJson = json['suggestedActions'] as List<dynamic>? ?? [];
    return AgentAlert(
      id: json['id'] as String? ?? '',
      agentType: json['agentType'] as String? ?? 'DEAL_HEALTH',
      alertType: json['alertType'] as String? ?? 'INFORMATION',
      priority: json['priority'] as String? ?? 'MEDIUM',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      recommendation: json['recommendation'] as String?,
      userId: json['userId'] as String? ?? '',
      entityType: json['entityType'] as String? ?? '',
      entityId: json['entityId'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      suggestedActions: actionsJson
          .map((a) => SuggestedAction.fromJson(a as Map<String, dynamic>))
          .toList(),
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] as String? ?? '',
      acknowledgedAt: json['acknowledgedAt'] as String?,
      actionedAt: json['actionedAt'] as String?,
      dismissedAt: json['dismissedAt'] as String?,
    );
  }

  String get entityName => metadata?['entityName'] as String? ?? entityId;
  String get agentName => metadata?['agentName'] as String? ?? 'Agent';

  bool get isPending => status == 'PENDING';
  bool get isActioned => status == 'ACTIONED';
  bool get isDismissed => status == 'DISMISSED';
  bool get isAcknowledged => status == 'ACKNOWLEDGED';
}

/// Result of executing a suggested action
class ActionExecutionResult {
  final bool success;
  final String actionType;
  final Map<String, dynamic>? result;
  final String message;

  ActionExecutionResult({
    required this.success,
    required this.actionType,
    this.result,
    required this.message,
  });

  factory ActionExecutionResult.fromJson(Map<String, dynamic> json) {
    return ActionExecutionResult(
      success: json['success'] as bool? ?? false,
      actionType: json['actionType'] as String? ?? '',
      result: json['result'] as Map<String, dynamic>?,
      message: json['message'] as String? ?? '',
    );
  }
}

// ============================================
// SERVICE
// ============================================

/// Agents service provider
final agentsServiceProvider = Provider<AgentsService>((ref) {
  final api = ref.watch(apiClientProvider);
  return AgentsService(api);
});

/// Service for agent management - reuses existing /agents/builder API
class AgentsService {
  final ApiClient _api;

  AgentsService(this._api);

  // ==================== TEMPLATES ====================

  /// Get all agent templates
  Future<List<AgentTemplate>> getTemplates({String? category}) async {
    try {
      final params = category != null ? '?category=$category' : '';
      final response = await _api.get('/agents/builder/templates$params');
      final data = response.data;
      if (data is List) {
        return data
            .map((t) => AgentTemplate.fromJson(t as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Create agent from template
  Future<CustomAgent?> createFromTemplate(
    String templateId, {
    String? name,
  }) async {
    try {
      final response = await _api.post(
        '/agents/builder/templates/$templateId/create',
        data: {'name': name ?? ''},
      );
      return CustomAgent.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  // ==================== CUSTOM AGENTS ====================

  /// Get all custom agents for user
  Future<List<CustomAgent>> getAgents({
    String? category,
    bool? isEnabled,
    String? search,
  }) async {
    try {
      final params = <String, String>{};
      if (category != null) params['category'] = category;
      if (isEnabled != null) params['isEnabled'] = isEnabled.toString();
      if (search != null) params['search'] = search;

      final queryString = params.isNotEmpty
          ? '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}'
          : '';

      final response = await _api.get('/agents/builder$queryString');
      final data = response.data;

      if (data is Map && data['agents'] is List) {
        return (data['agents'] as List)
            .map((a) => CustomAgent.fromJson(a as Map<String, dynamic>))
            .toList();
      }
      if (data is List) {
        return data
            .map((a) => CustomAgent.fromJson(a as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get agent by ID
  Future<CustomAgent?> getAgent(String agentId) async {
    try {
      final response = await _api.get('/agents/builder/$agentId');
      return CustomAgent.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Create a new custom agent
  Future<CustomAgent?> createAgent(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/agents/builder', data: data);
      return CustomAgent.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Update an agent
  Future<CustomAgent?> updateAgent(
    String agentId,
    Map<String, dynamic> data,
  ) async {
    try {
      final response = await _api.put('/agents/builder/$agentId', data: data);
      return CustomAgent.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Delete an agent
  Future<bool> deleteAgent(String agentId) async {
    try {
      await _api.delete('/agents/builder/$agentId');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Toggle agent enabled/disabled
  Future<CustomAgent?> toggleAgent(String agentId, bool enabled) async {
    try {
      final response = await _api.patch(
        '/agents/builder/$agentId/toggle',
        data: {'enabled': enabled},
      );
      return CustomAgent.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Publish an agent
  Future<CustomAgent?> publishAgent(String agentId) async {
    try {
      final response = await _api.post('/agents/builder/$agentId/publish');
      return CustomAgent.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  // ==================== EXECUTION ====================

  /// Run an agent
  Future<RunAgentResult?> runAgent(
    String agentId, {
    String? entityType,
    String? entityId,
    bool? useExternalCrmData,
    String? externalCrmProvider,
  }) async {
    try {
      final response = await _api.post(
        '/agents/builder/$agentId/run',
        data: {
          'entityType': ?entityType,
          'entityId': ?entityId,
          'useExternalCrmData': ?useExternalCrmData,
          'externalCrmProvider': ?externalCrmProvider,
        },
      );
      return RunAgentResult.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Get execution history for an agent
  Future<List<AgentExecution>> getExecutions(
    String agentId, {
    int? limit,
  }) async {
    try {
      final params = limit != null ? '?limit=$limit' : '';
      final response = await _api.get(
        '/agents/builder/$agentId/executions$params',
      );
      final data = response.data;
      if (data is List) {
        return data
            .map((e) => AgentExecution.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get execution details
  Future<AgentExecution?> getExecution(String executionId) async {
    try {
      final response = await _api.get(
        '/agents/builder/executions/$executionId',
      );
      return AgentExecution.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  // ==================== TOOLS ====================

  /// Get available tools
  Future<List<AvailableTool>> getAvailableTools({
    bool includeExternalCrm = false,
  }) async {
    try {
      final response = await _api.get(
        '/agents/builder/tools?includeExternalCrm=$includeExternalCrm',
      );
      final data = response.data;
      if (data is List) {
        return data
            .map((t) => AvailableTool.fromJson(t as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Check Salesforce connection status
  Future<bool> checkSalesforceConnection() async {
    try {
      final response = await _api.get('/agents/builder/salesforce-status');
      return response.data['connected'] == true;
    } catch (e) {
      return false;
    }
  }

  // ==================== AI GENERATION ====================

  /// Generate agent configuration from natural language description
  /// Returns the generated config without creating the agent
  Future<GeneratedAgentConfig?> generateAgentConfig(String description) async {
    try {
      final response = await _api.post(
        '/agents/builder/generate-config',
        data: {'description': description},
      );
      return GeneratedAgentConfig.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Create an agent directly from natural language description
  /// Uses AI to generate config and creates the agent in one step
  Future<CreateFromDescriptionResult?> createAgentFromDescription(
    String description,
  ) async {
    try {
      final response = await _api.post(
        '/agents/builder/create-from-description',
        data: {'description': description},
      );
      return CreateFromDescriptionResult.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  // ==================== EXECUTION LOGS ====================

  /// Get detailed execution logs
  Future<List<ExecutionLog>> getExecutionLogs(
    String executionId, {
    String? level,
    String? category,
    int? limit,
  }) async {
    try {
      final params = <String, String>{};
      if (level != null) params['level'] = level;
      if (category != null) params['category'] = category;
      if (limit != null) params['limit'] = limit.toString();

      final queryString = params.isNotEmpty
          ? '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}'
          : '';

      final response = await _api.get(
        '/agents/builder/executions/$executionId/logs$queryString',
      );
      final data = response.data;
      if (data is List) {
        return data
            .map((l) => ExecutionLog.fromJson(l as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ==================== ALERTS ====================

  /// Get all alerts for the current user
  Future<List<AgentAlert>> getAlerts({
    String? status,
    String? priority,
    int? limit,
  }) async {
    try {
      final params = <String, String>{};
      if (status != null) params['status'] = status;
      if (priority != null) params['priority'] = priority;
      if (limit != null) params['limit'] = limit.toString();

      final queryString = params.isNotEmpty
          ? '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}'
          : '';

      final response = await _api.get('/agents/builder/alerts$queryString');
      final data = response.data;
      if (data is List) {
        return data
            .map((a) => AgentAlert.fromJson(a as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get a single alert by ID
  Future<AgentAlert?> getAlert(String alertId) async {
    try {
      final response = await _api.get('/agents/builder/alerts/$alertId');
      return AgentAlert.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Execute a suggested action from an alert
  Future<ActionExecutionResult?> executeAlertAction(
    String alertId,
    String actionId, {
    Map<String, dynamic>? modifications,
  }) async {
    try {
      final response = await _api.post(
        '/agents/builder/alerts/$alertId/execute-action',
        data: {
          'actionId': actionId,
          'modifications': ?modifications,
        },
      );
      return ActionExecutionResult.fromJson(
        response.data as Map<String, dynamic>,
      );
    } catch (e) {
      return null;
    }
  }

  /// Dismiss an alert
  Future<bool> dismissAlert(String alertId) async {
    try {
      await _api.patch('/agents/builder/alerts/$alertId/dismiss');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Acknowledge an alert
  Future<bool> acknowledgeAlert(String alertId) async {
    try {
      await _api.patch('/agents/builder/alerts/$alertId/acknowledge');
      return true;
    } catch (e) {
      return false;
    }
  }
}

// ============================================
// AI GENERATION MODELS
// ============================================

/// Generated agent configuration from AI
class GeneratedAgentConfig {
  final String name;
  final String description;
  final String category;
  final String icon;
  final String color;
  final String systemPrompt;
  final String? analysisPrompt;
  final List<String> enabledTools;
  final List<String> alertTypes;
  final bool requiresApproval;
  final double temperature;
  final String modelId;
  final int maxTokens;
  final Map<String, dynamic>? suggestedTriggers;
  final String? generatedFromDescription;
  final String? error;

  GeneratedAgentConfig({
    required this.name,
    required this.description,
    required this.category,
    required this.icon,
    required this.color,
    required this.systemPrompt,
    this.analysisPrompt,
    required this.enabledTools,
    required this.alertTypes,
    required this.requiresApproval,
    required this.temperature,
    required this.modelId,
    required this.maxTokens,
    this.suggestedTriggers,
    this.generatedFromDescription,
    this.error,
  });

  factory GeneratedAgentConfig.fromJson(Map<String, dynamic> json) {
    return GeneratedAgentConfig(
      name: json['name'] as String? ?? 'Custom Agent',
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? 'custom',
      icon: json['icon'] as String? ?? 'cpu',
      color: json['color'] as String? ?? '#C9A882',
      systemPrompt: json['systemPrompt'] as String? ?? '',
      analysisPrompt: json['analysisPrompt'] as String?,
      enabledTools:
          (json['enabledTools'] as List<dynamic>?)?.cast<String>() ?? [],
      alertTypes: (json['alertTypes'] as List<dynamic>?)?.cast<String>() ?? [],
      requiresApproval: json['requiresApproval'] as bool? ?? true,
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.3,
      modelId: json['modelId'] as String? ?? 'gpt-4o',
      maxTokens: json['maxTokens'] as int? ?? 4000,
      suggestedTriggers: json['suggestedTriggers'] as Map<String, dynamic>?,
      generatedFromDescription: json['generatedFromDescription'] as String?,
      error: json['error'] as String?,
    );
  }

  Map<String, dynamic> toCreateAgentJson() {
    return {
      'name': name,
      'description': description,
      'category': category,
      'icon': icon,
      'color': color,
      'systemPrompt': systemPrompt,
      if (analysisPrompt != null) 'analysisPrompt': analysisPrompt,
      'enabledTools': enabledTools,
      'alertTypes': alertTypes,
      'requiresApproval': requiresApproval,
      'temperature': temperature,
      'modelId': modelId,
      'maxTokens': maxTokens,
    };
  }
}

/// Result of creating an agent from description
class CreateFromDescriptionResult {
  final CustomAgent agent;
  final GeneratedAgentConfig generatedConfig;
  final String message;

  CreateFromDescriptionResult({
    required this.agent,
    required this.generatedConfig,
    required this.message,
  });

  factory CreateFromDescriptionResult.fromJson(Map<String, dynamic> json) {
    return CreateFromDescriptionResult(
      agent: CustomAgent.fromJson(json['agent'] as Map<String, dynamic>),
      generatedConfig: GeneratedAgentConfig.fromJson(
        json['generatedConfig'] as Map<String, dynamic>,
      ),
      message: json['message'] as String? ?? 'Agent created successfully',
    );
  }
}
