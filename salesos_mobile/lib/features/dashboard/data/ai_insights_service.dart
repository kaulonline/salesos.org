import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/providers.dart';
import '../../../core/services/crm_data_service.dart';
import '../../../core/services/error_reporting_service.dart';
import '../../../core/utils/exceptions.dart';

/// Types of AI insights
enum InsightType {
  hotLead,
  atRiskDeal,
  followUpNeeded,
  meetingReminder,
  dealProgress,
  inactiveAccount,
  urgentTask,
  opportunity,
}

/// Priority levels for insights
enum InsightPriority { high, medium, low }

/// AI Insight model
class AiInsight {
  final String id;
  final InsightType type;
  final InsightPriority priority;
  final String title;
  final String description;
  final String actionLabel;
  final String? entityId;
  final String? entityType;
  final Map<String, dynamic>? metadata;

  AiInsight({
    required this.id,
    required this.type,
    required this.priority,
    required this.title,
    required this.description,
    required this.actionLabel,
    this.entityId,
    this.entityType,
    this.metadata,
  });

  /// Get icon name based on insight type
  String get iconName {
    switch (type) {
      case InsightType.hotLead:
        return 'flash';
      case InsightType.atRiskDeal:
        return 'warning';
      case InsightType.followUpNeeded:
        return 'call';
      case InsightType.meetingReminder:
        return 'calendar';
      case InsightType.dealProgress:
        return 'chart';
      case InsightType.inactiveAccount:
        return 'user_remove';
      case InsightType.urgentTask:
        return 'task';
      case InsightType.opportunity:
        return 'dollar';
    }
  }
}

/// AI Insights service provider
final aiInsightsServiceProvider = Provider<AiInsightsService>((ref) {
  final crmService = ref.watch(crmDataServiceProvider);
  final errorService = ref.watch(errorReportingServiceProvider);
  return AiInsightsService(crmService, errorService);
});

/// AI Insights provider
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final aiInsightsProvider =
    FutureProvider.autoDispose<List<AiInsight>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(aiInsightsServiceProvider);
  return service.getInsights();
});

/// Service for generating AI insights from CRM data
class AiInsightsService {
  final CrmDataService _crmService;
  final ErrorReportingService _errorService;

  AiInsightsService(this._crmService, this._errorService);

  /// Report error with context but don't throw - used for graceful degradation
  void _reportError(dynamic error, String context) {
    final appError = error is AppException
        ? error
        : UnknownException(message: 'AI Insights error during $context', originalError: error);
    _errorService.reportError(
      appError,
      stackTrace: StackTrace.current,
      context: ErrorContext(screenName: 'AiInsightsService', action: context),
    );
  }

  /// Get AI-generated insights from various data sources
  Future<List<AiInsight>> getInsights() async {
    final List<AiInsight> insights = [];

    try {
      // Fetch data in parallel
      final results = await Future.wait([
        _fetchOpportunities(),
        _fetchLeads(),
        _fetchActivities(),
        _fetchTasks(),
      ]);

      final opportunities = results[0];
      final leads = results[1];
      final activities = results[2];
      final tasks = results[3];

      // Generate insights from opportunities
      for (final opp in opportunities) {
        // Check for at-risk deals - support both local and Salesforce field names
        final riskFactors = opp['riskFactors'] as List<dynamic>? ?? [];
        final recommendedActions = opp['recommendedActions'] as List<dynamic>? ?? [];
        final amount = (opp['amount'] as num?)?.toDouble() ??
            (opp['Amount'] as num?)?.toDouble() ?? 0;
        final name = opp['name'] as String? ?? opp['Name'] as String? ?? 'Deal';
        final stage = opp['stage'] as String? ?? opp['StageName'] as String? ?? '';
        final accountName = (opp['account'] as Map?)?['name'] as String? ??
            (opp['Account'] as Map?)?['Name'] as String? ?? '';

        if (riskFactors.isNotEmpty && amount > 0) {
          insights.add(AiInsight(
            id: 'opp_risk_${opp['id'] ?? opp['Id']}',
            type: InsightType.atRiskDeal,
            priority: InsightPriority.high,
            title: 'Deal at Risk',
            description: '$name${accountName.isNotEmpty ? ' ($accountName)' : ''} - ${_formatCurrency(amount)}. ${riskFactors.first}',
            actionLabel: recommendedActions.isNotEmpty
                ? _extractAction(recommendedActions.first as String)
                : 'Review Deal',
            entityId: opp['id'] as String? ?? opp['Id'] as String?,
            entityType: 'opportunity',
            metadata: {'amount': amount, 'stage': stage},
          ));
        }

        // Check for deals needing follow-up
        final lastActivityDate = opp['lastActivityDate'] as String? ?? opp['LastActivityDate'] as String?;
        if (lastActivityDate == null && amount > 100000) {
          insights.add(AiInsight(
            id: 'opp_followup_${opp['id'] ?? opp['Id']}',
            type: InsightType.followUpNeeded,
            priority: InsightPriority.medium,
            title: 'Follow-up Needed',
            description: '$name needs attention - no recent activity on ${_formatCurrency(amount)} deal.',
            actionLabel: 'Schedule Call',
            entityId: opp['id'] as String? ?? opp['Id'] as String?,
            entityType: 'opportunity',
          ));
        }
      }

      // Generate insights from leads - support both local and Salesforce field names
      for (final lead in leads) {
        final leadScore = lead['leadScore'] as int? ?? (lead['Rating'] == 'Hot' ? 80 : 50);
        final buyingIntent = lead['buyingIntent'] as String? ?? lead['Rating'] as String? ?? '';
        final firstName = lead['firstName'] as String? ?? lead['FirstName'] as String? ?? '';
        final lastName = lead['lastName'] as String? ?? lead['LastName'] as String? ?? '';
        final company = lead['company'] as String? ?? lead['Company'] as String? ?? '';
        final status = lead['status'] as String? ?? lead['Status'] as String? ?? '';
        final lastContactedAt = lead['lastContactedAt'] as String?;

        // Hot leads with high score or Hot rating
        final isHot = leadScore >= 70 || buyingIntent.toUpperCase() == 'HIGH' || buyingIntent.toUpperCase() == 'HOT';
        if (isHot) {
          insights.add(AiInsight(
            id: 'lead_hot_${lead['id'] ?? lead['Id']}',
            type: InsightType.hotLead,
            priority: InsightPriority.high,
            title: 'Hot Lead Alert',
            description: '$firstName $lastName at $company shows high buying intent. Act now!',
            actionLabel: 'Contact Lead',
            entityId: lead['id'] as String? ?? lead['Id'] as String?,
            entityType: 'lead',
            metadata: {'leadScore': leadScore, 'buyingIntent': buyingIntent},
          ));
        }

        // Leads needing follow-up - check for new status
        final isNewLead = status.toUpperCase() == 'NEW' || status.toUpperCase() == 'OPEN - NOT CONTACTED';
        if (isNewLead && lastContactedAt == null) {
          insights.add(AiInsight(
            id: 'lead_new_${lead['id'] ?? lead['Id']}',
            type: InsightType.followUpNeeded,
            priority: InsightPriority.medium,
            title: 'New Lead - No Contact',
            description: '$firstName $lastName at $company is waiting for your first contact.',
            actionLabel: 'Reach Out',
            entityId: lead['id'] as String? ?? lead['Id'] as String?,
            entityType: 'lead',
          ));
        }
      }

      // Generate insights from tasks - support both local and Salesforce field names
      for (final task in tasks) {
        final dueDate = task['dueDate'] as String? ?? task['ActivityDate'] as String?;
        final title = task['title'] as String? ?? task['Subject'] as String? ?? 'Task';
        final priority = task['priority'] as String? ?? task['Priority'] as String? ?? '';
        final taskStatus = task['status'] as String? ?? task['Status'] as String? ?? '';

        // Skip completed tasks
        if (taskStatus.toUpperCase() == 'COMPLETED' || taskStatus.toUpperCase() == 'CLOSED') {
          continue;
        }

        if (dueDate != null) {
          final due = DateTime.tryParse(dueDate);
          if (due != null) {
            final now = DateTime.now();
            final daysUntilDue = due.difference(now).inDays;

            if (daysUntilDue <= 0) {
              insights.add(AiInsight(
                id: 'task_overdue_${task['id'] ?? task['Id']}',
                type: InsightType.urgentTask,
                priority: InsightPriority.high,
                title: 'Overdue Task',
                description: '"$title" is ${-daysUntilDue} day(s) overdue. Complete it now!',
                actionLabel: 'Complete Task',
                entityId: task['id'] as String? ?? task['Id'] as String?,
                entityType: 'task',
              ));
            } else if (daysUntilDue <= 2 && priority.toUpperCase() == 'HIGH') {
              insights.add(AiInsight(
                id: 'task_urgent_${task['id'] ?? task['Id']}',
                type: InsightType.urgentTask,
                priority: InsightPriority.high,
                title: 'Urgent Task Due Soon',
                description: '"$title" is due in $daysUntilDue day(s). High priority!',
                actionLabel: 'View Task',
                entityId: task['id'] as String? ?? task['Id'] as String?,
                entityType: 'task',
              ));
            }
          }
        }
      }

      // Generate insights from activities - support both local and Salesforce field names
      if (activities.isNotEmpty) {
        final recentEmailCount = activities.where((a) {
          final type = a['type']?.toString().toUpperCase() ?? a['Type']?.toString().toUpperCase() ?? '';
          return type == 'EMAIL';
        }).length;

        if (recentEmailCount > 5) {
          insights.add(AiInsight(
            id: 'activity_emails',
            type: InsightType.dealProgress,
            priority: InsightPriority.low,
            title: 'Active Engagement',
            description: 'You have $recentEmailCount email interactions recently. Keep up the momentum!',
            actionLabel: 'View Activity',
            entityType: 'activity',
          ));
        }
      }

      // Sort by priority
      insights.sort((a, b) {
        final priorityOrder = {
          InsightPriority.high: 0,
          InsightPriority.medium: 1,
          InsightPriority.low: 2,
        };
        return priorityOrder[a.priority]!.compareTo(priorityOrder[b.priority]!);
      });

      // Return top insights (limit to 5)
      return insights.take(5).toList();
    } catch (e) {
      _reportError(e, 'getInsights');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> _fetchOpportunities() async {
    try {
      return await _crmService.getOpportunities();
    } catch (e) {
      _reportError(e, '_fetchOpportunities');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> _fetchLeads() async {
    try {
      return await _crmService.getLeads();
    } catch (e) {
      _reportError(e, '_fetchLeads');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> _fetchActivities() async {
    try {
      return await _crmService.getActivities(limit: 20);
    } catch (e) {
      _reportError(e, '_fetchActivities');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> _fetchTasks() async {
    try {
      return await _crmService.getTasks();
    } catch (e) {
      _reportError(e, '_fetchTasks');
      return [];
    }
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(0)}K';
    }
    return '\$${value.toStringAsFixed(0)}';
  }

  String _extractAction(String recommendation) {
    // Extract a short action from recommendation text
    if (recommendation.toLowerCase().contains('close')) return 'Review Deal';
    if (recommendation.toLowerCase().contains('call')) return 'Schedule Call';
    if (recommendation.toLowerCase().contains('email')) return 'Send Email';
    if (recommendation.toLowerCase().contains('meeting')) return 'Book Meeting';
    if (recommendation.toLowerCase().contains('contact')) return 'Contact Now';
    if (recommendation.toLowerCase().contains('assign')) return 'Assign Owner';
    if (recommendation.toLowerCase().contains('audit')) return 'Run Audit';
    return 'Take Action';
  }
}
