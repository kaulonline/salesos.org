import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import '../config/theme.dart';
import '../providers/auth_mode_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';
import 'crm_data_service.dart';

/// Alert priority levels
enum AlertPriority { high, medium, low }

/// Alert types
enum AlertType {
  overdueTasks,
  overdueFollowUp,
  dealAtRisk,
  dealStalled,
  upcomingMeeting,
  leadNoActivity,
  contractExpiring,
  quotaWarning,
}

/// An alert/notification item
class AppAlert {
  final String id;
  final AlertType type;
  final AlertPriority priority;
  final String title;
  final String description;
  final String? entityId;
  final String? entityType;
  final DateTime createdAt;
  final bool isRead;

  AppAlert({
    required this.id,
    required this.type,
    required this.priority,
    required this.title,
    required this.description,
    this.entityId,
    this.entityType,
    required this.createdAt,
    this.isRead = false,
  });

  IconData get icon {
    switch (type) {
      case AlertType.overdueTasks:
        return Iconsax.task_square;
      case AlertType.overdueFollowUp:
        return Iconsax.call;
      case AlertType.dealAtRisk:
        return Iconsax.warning_2;
      case AlertType.dealStalled:
        return Iconsax.timer_pause;
      case AlertType.upcomingMeeting:
        return Iconsax.calendar;
      case AlertType.leadNoActivity:
        return Iconsax.profile_2user;
      case AlertType.contractExpiring:
        return Iconsax.document;
      case AlertType.quotaWarning:
        return Iconsax.chart;
    }
  }

  Color get color {
    switch (priority) {
      case AlertPriority.high:
        return IrisTheme.irisBrown;     // Deep brown for high priority
      case AlertPriority.medium:
        return LuxuryColors.champagneGoldDark;  // Terracotta for medium
      case AlertPriority.low:
        return LuxuryColors.champagneGold;      // Warm tan for low
    }
  }

  String get priorityLabel {
    switch (priority) {
      case AlertPriority.high:
        return 'High';
      case AlertPriority.medium:
        return 'Medium';
      case AlertPriority.low:
        return 'Low';
    }
  }
}

/// Provider for alerts
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final alertsProvider = FutureProvider<List<AppAlert>>((ref) async {
  // Watch authMode to force rebuild when mode changes
  ref.watch(authModeProvider);
  final alertsService = ref.watch(alertsServiceProvider);
  return alertsService.getAlerts();
});

/// Provider for unread alert count
final unreadAlertsCountProvider = Provider<int>((ref) {
  final alertsAsync = ref.watch(alertsProvider);
  return alertsAsync.maybeWhen(
    data: (alerts) => alerts.where((a) => !a.isRead).length,
    orElse: () => 0,
  );
});

/// Alerts service provider
final alertsServiceProvider = Provider<AlertsService>((ref) {
  return AlertsService(ref);
});

/// Service for generating and managing alerts
class AlertsService {
  final Ref _ref;

  AlertsService(this._ref);

  CrmDataService get _crmService => _ref.read(crmDataServiceProvider);

  /// Get all alerts based on CRM data
  Future<List<AppAlert>> getAlerts() async {
    final alerts = <AppAlert>[];

    try {
      // Fetch data in parallel
      final results = await Future.wait([
        _crmService.getTasks(),
        _crmService.getOpportunities(),
        _crmService.getLeads(),
        _crmService.getActivities(limit: 50),
      ]);

      final tasks = results[0];
      final opportunities = results[1];
      final leads = results[2];
      final activities = results[3];

      // Check for overdue tasks
      alerts.addAll(_checkOverdueTasks(tasks));

      // Check for deals at risk (stalled, no recent activity)
      alerts.addAll(_checkDealsAtRisk(opportunities, activities));

      // Check for leads needing follow-up
      alerts.addAll(_checkLeadsNeedingFollowUp(leads, activities));

      // Check for upcoming meetings (within 24 hours)
      alerts.addAll(_checkUpcomingMeetings(activities));

      // Sort by priority (high first) then by date (newest first)
      alerts.sort((a, b) {
        final priorityCompare = a.priority.index.compareTo(b.priority.index);
        if (priorityCompare != 0) return priorityCompare;
        return b.createdAt.compareTo(a.createdAt);
      });

      return alerts;
    } catch (e) {
      return [];
    }
  }

  /// Check for overdue tasks
  List<AppAlert> _checkOverdueTasks(List<Map<String, dynamic>> tasks) {
    final alerts = <AppAlert>[];
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    for (final task in tasks) {
      // Skip completed tasks
      final status = (task['Status'] as String? ?? task['status'] as String? ?? '').toLowerCase();
      if (status == 'completed' || status == 'done' || task['IsClosed'] == true) {
        continue;
      }

      // Check due date
      final dueDateStr = task['ActivityDate'] as String? ??
          task['activityDate'] as String? ??
          task['dueDate'] as String?;

      if (dueDateStr != null) {
        final dueDate = DateTime.tryParse(dueDateStr);
        if (dueDate != null) {
          final dueDay = DateTime(dueDate.year, dueDate.month, dueDate.day);
          if (dueDay.isBefore(today)) {
            final daysOverdue = today.difference(dueDay).inDays;
            final taskName = task['Subject'] as String? ??
                task['subject'] as String? ??
                task['title'] as String? ??
                'Task';

            alerts.add(AppAlert(
              id: 'task_overdue_${task['Id'] ?? task['id']}',
              type: AlertType.overdueTasks,
              priority: daysOverdue > 7 ? AlertPriority.high : AlertPriority.medium,
              title: 'Overdue Task',
              description: '$taskName is $daysOverdue day${daysOverdue > 1 ? 's' : ''} overdue',
              entityId: task['Id'] as String? ?? task['id'] as String?,
              entityType: 'task',
              createdAt: DateTime.now(),
            ));
          }
        }
      }
    }

    return alerts;
  }

  /// Check for deals at risk (no activity in last 14 days, or stuck in stage)
  List<AppAlert> _checkDealsAtRisk(
    List<Map<String, dynamic>> opportunities,
    List<Map<String, dynamic>> activities,
  ) {
    final alerts = <AppAlert>[];
    final now = DateTime.now();
    final twoWeeksAgo = now.subtract(const Duration(days: 14));

    // Create a map of opportunity IDs to their last activity date
    final oppActivityMap = <String, DateTime>{};
    for (final activity in activities) {
      final oppId = activity['WhatId'] as String? ?? activity['opportunityId'] as String?;
      if (oppId != null) {
        final activityDateStr = activity['CreatedDate'] as String? ??
            activity['createdAt'] as String? ??
            activity['activityDate'] as String?;
        if (activityDateStr != null) {
          final activityDate = DateTime.tryParse(activityDateStr);
          if (activityDate != null) {
            if (!oppActivityMap.containsKey(oppId) || activityDate.isAfter(oppActivityMap[oppId]!)) {
              oppActivityMap[oppId] = activityDate;
            }
          }
        }
      }
    }

    for (final opp in opportunities) {
      // Skip closed opportunities
      if (opp['IsClosed'] == true || opp['isClosed'] == true) continue;

      final oppId = opp['Id'] as String? ?? opp['id'] as String?;
      final oppName = opp['Name'] as String? ?? opp['name'] as String? ?? 'Deal';

      // Check for no recent activity
      final lastActivity = oppId != null ? oppActivityMap[oppId] : null;
      final lastModifiedStr = opp['LastModifiedDate'] as String? ?? opp['updatedAt'] as String?;
      final lastModified = lastModifiedStr != null ? DateTime.tryParse(lastModifiedStr) : null;

      final latestDate = lastActivity ?? lastModified;

      if (latestDate != null && latestDate.isBefore(twoWeeksAgo)) {
        final daysSinceActivity = now.difference(latestDate).inDays;
        alerts.add(AppAlert(
          id: 'deal_stalled_$oppId',
          type: AlertType.dealStalled,
          priority: daysSinceActivity > 30 ? AlertPriority.high : AlertPriority.medium,
          title: 'Deal Needs Attention',
          description: '$oppName has no activity in $daysSinceActivity days',
          entityId: oppId,
          entityType: 'opportunity',
          createdAt: DateTime.now(),
        ));
      }

      // Check for deals with close date approaching but low probability
      final closeDateStr = opp['CloseDate'] as String? ?? opp['closeDate'] as String?;
      final probability = (opp['Probability'] as num?)?.toInt() ?? 0;

      if (closeDateStr != null && probability < 50) {
        final closeDate = DateTime.tryParse(closeDateStr);
        if (closeDate != null) {
          final daysUntilClose = closeDate.difference(now).inDays;
          if (daysUntilClose <= 30 && daysUntilClose >= 0) {
            alerts.add(AppAlert(
              id: 'deal_at_risk_$oppId',
              type: AlertType.dealAtRisk,
              priority: daysUntilClose <= 7 ? AlertPriority.high : AlertPriority.medium,
              title: 'Deal at Risk',
              description: '$oppName closes in $daysUntilClose days at $probability% probability',
              entityId: oppId,
              entityType: 'opportunity',
              createdAt: DateTime.now(),
            ));
          }
        }
      }
    }

    return alerts;
  }

  /// Check for leads needing follow-up
  List<AppAlert> _checkLeadsNeedingFollowUp(
    List<Map<String, dynamic>> leads,
    List<Map<String, dynamic>> activities,
  ) {
    final alerts = <AppAlert>[];
    final now = DateTime.now();
    final oneWeekAgo = now.subtract(const Duration(days: 7));

    // Create a map of lead IDs to their last activity date
    final leadActivityMap = <String, DateTime>{};
    for (final activity in activities) {
      final leadId = activity['WhoId'] as String? ?? activity['leadId'] as String?;
      if (leadId != null) {
        final activityDateStr = activity['CreatedDate'] as String? ??
            activity['createdAt'] as String?;
        if (activityDateStr != null) {
          final activityDate = DateTime.tryParse(activityDateStr);
          if (activityDate != null) {
            if (!leadActivityMap.containsKey(leadId) || activityDate.isAfter(leadActivityMap[leadId]!)) {
              leadActivityMap[leadId] = activityDate;
            }
          }
        }
      }
    }

    for (final lead in leads) {
      // Skip converted leads
      final status = (lead['Status'] as String? ?? lead['status'] as String? ?? '').toLowerCase();
      if (status.contains('converted') || status.contains('disqualified')) {
        continue;
      }

      final leadId = lead['Id'] as String? ?? lead['id'] as String?;
      final leadName = lead['Name'] as String? ??
          '${lead['FirstName'] ?? lead['firstName'] ?? ''} ${lead['LastName'] ?? lead['lastName'] ?? ''}'.trim();
      final company = lead['Company'] as String? ?? lead['company'] as String?;

      // Check for no recent activity
      final lastActivity = leadId != null ? leadActivityMap[leadId] : null;
      final createdAtStr = lead['CreatedDate'] as String? ?? lead['createdAt'] as String?;
      final createdAt = createdAtStr != null ? DateTime.tryParse(createdAtStr) : null;

      final latestDate = lastActivity ?? createdAt;

      if (latestDate != null && latestDate.isBefore(oneWeekAgo)) {
        final daysSinceActivity = now.difference(latestDate).inDays;

        // Only alert for leads that are worth following up on (hot or warm)
        final rating = (lead['Rating'] as String? ?? lead['rating'] as String? ?? '').toLowerCase();
        if (rating.contains('hot') || rating.contains('warm') || daysSinceActivity > 14) {
          alerts.add(AppAlert(
            id: 'lead_followup_$leadId',
            type: AlertType.leadNoActivity,
            priority: rating.contains('hot') ? AlertPriority.high : AlertPriority.low,
            title: 'Lead Needs Follow-up',
            description: '${leadName.isNotEmpty ? leadName : company ?? 'Lead'} - no contact in $daysSinceActivity days',
            entityId: leadId,
            entityType: 'lead',
            createdAt: DateTime.now(),
          ));
        }
      }
    }

    return alerts;
  }

  /// Check for upcoming meetings (within 24 hours)
  List<AppAlert> _checkUpcomingMeetings(List<Map<String, dynamic>> activities) {
    final alerts = <AppAlert>[];
    final now = DateTime.now();
    final tomorrow = now.add(const Duration(hours: 24));

    for (final activity in activities) {
      final type = (activity['type'] as String? ?? activity['Type'] as String? ?? '').toLowerCase();

      // Only check meetings/events
      if (!type.contains('meeting') && !type.contains('event') && !type.contains('call')) {
        continue;
      }

      final startDateStr = activity['StartDateTime'] as String? ??
          activity['startTime'] as String? ??
          activity['scheduledDate'] as String?;

      if (startDateStr != null) {
        final startDate = DateTime.tryParse(startDateStr);
        if (startDate != null && startDate.isAfter(now) && startDate.isBefore(tomorrow)) {
          final subject = activity['Subject'] as String? ??
              activity['subject'] as String? ??
              activity['title'] as String? ??
              'Meeting';
          final hoursUntil = startDate.difference(now).inHours;
          final minutesUntil = startDate.difference(now).inMinutes % 60;

          String timeUntil;
          if (hoursUntil > 0) {
            timeUntil = '$hoursUntil hour${hoursUntil > 1 ? 's' : ''}';
          } else {
            timeUntil = '$minutesUntil min${minutesUntil > 1 ? 's' : ''}';
          }

          alerts.add(AppAlert(
            id: 'meeting_upcoming_${activity['Id'] ?? activity['id']}',
            type: AlertType.upcomingMeeting,
            priority: hoursUntil < 2 ? AlertPriority.high : AlertPriority.medium,
            title: 'Upcoming Meeting',
            description: '$subject in $timeUntil',
            entityId: activity['Id'] as String? ?? activity['id'] as String?,
            entityType: 'event',
            createdAt: DateTime.now(),
          ));
        }
      }
    }

    return alerts;
  }
}
