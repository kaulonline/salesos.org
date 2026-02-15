import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'iris_rank_service.dart';
import 'crm_data_service.dart';
import 'notification_service.dart';

/// Morning brief data model
class MorningBrief {
  final DateTime generatedAt;
  final String greeting;
  final String summary;
  final List<BriefSection> sections;
  final List<QuickAction> quickActions;
  final int priorityContactsCount;
  final int atRiskDealsCount;
  final int pendingTasksCount;
  final double pipelineValue;

  const MorningBrief({
    required this.generatedAt,
    required this.greeting,
    required this.summary,
    required this.sections,
    required this.quickActions,
    required this.priorityContactsCount,
    required this.atRiskDealsCount,
    required this.pendingTasksCount,
    required this.pipelineValue,
  });

  factory MorningBrief.fromJson(Map<String, dynamic> json) {
    return MorningBrief(
      generatedAt: DateTime.parse(json['generatedAt']),
      greeting: json['greeting'] ?? '',
      summary: json['summary'] ?? '',
      sections: (json['sections'] as List?)
              ?.map((s) => BriefSection.fromJson(s))
              .toList() ??
          [],
      quickActions: (json['quickActions'] as List?)
              ?.map((a) => QuickAction.fromJson(a))
              .toList() ??
          [],
      priorityContactsCount: json['priorityContactsCount'] ?? 0,
      atRiskDealsCount: json['atRiskDealsCount'] ?? 0,
      pendingTasksCount: json['pendingTasksCount'] ?? 0,
      pipelineValue: (json['pipelineValue'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'generatedAt': generatedAt.toIso8601String(),
        'greeting': greeting,
        'summary': summary,
        'sections': sections.map((s) => s.toJson()).toList(),
        'quickActions': quickActions.map((a) => a.toJson()).toList(),
        'priorityContactsCount': priorityContactsCount,
        'atRiskDealsCount': atRiskDealsCount,
        'pendingTasksCount': pendingTasksCount,
        'pipelineValue': pipelineValue,
      };

  bool get isStale {
    final now = DateTime.now();
    return now.day != generatedAt.day ||
        now.difference(generatedAt).inHours > 12;
  }
}

/// Section of the morning brief
class BriefSection {
  final String title;
  final String icon;
  final String content;
  final BriefPriority priority;
  final String? actionRoute;
  final Map<String, dynamic>? metadata;

  const BriefSection({
    required this.title,
    required this.icon,
    required this.content,
    required this.priority,
    this.actionRoute,
    this.metadata,
  });

  factory BriefSection.fromJson(Map<String, dynamic> json) {
    return BriefSection(
      title: json['title'] ?? '',
      icon: json['icon'] ?? 'star',
      content: json['content'] ?? '',
      priority: BriefPriority.values.firstWhere(
        (p) => p.name == json['priority'],
        orElse: () => BriefPriority.normal,
      ),
      actionRoute: json['actionRoute'],
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'icon': icon,
        'content': content,
        'priority': priority.name,
        'actionRoute': actionRoute,
        'metadata': metadata,
      };
}

/// Quick action for the morning brief
class QuickAction {
  final String label;
  final String icon;
  final String route;
  final Map<String, dynamic>? params;

  const QuickAction({
    required this.label,
    required this.icon,
    required this.route,
    this.params,
  });

  factory QuickAction.fromJson(Map<String, dynamic> json) {
    return QuickAction(
      label: json['label'] ?? '',
      icon: json['icon'] ?? 'arrow_right',
      route: json['route'] ?? '',
      params: json['params'],
    );
  }

  Map<String, dynamic> toJson() => {
        'label': label,
        'icon': icon,
        'route': route,
        'params': params,
      };
}

enum BriefPriority { high, normal, low }

/// Morning brief service for AI-synthesized daily summaries
class MorningBriefService {
  final Ref _ref;
  static const String _cacheKey = 'morning_brief_cache';
  static const String _settingsKey = 'morning_brief_settings';
  static const String _cacheVersionKey = 'morning_brief_cache_version';
  static const int _morningBriefNotificationId = 9001;
  // Increment this when code changes require cache invalidation
  static const int _currentCacheVersion = 2;

  MorningBriefService(this._ref);

  /// Generate a new morning brief from current CRM data
  Future<MorningBrief> generateBrief({String? userName}) async {

    try {
      // Fetch data from various sources
      final irisRankService = _ref.read(irisRankServiceProvider);
      final crmDataService = _ref.read(crmDataServiceProvider);

      // Get hot leads and at-risk entities
      final hotLeads = await irisRankService.getHotLeads(limit: 5);
      final atRiskEntities = await irisRankService.getAtRiskEntities(limit: 5);

      // Get pipeline and metrics
      final pipelineStats = await crmDataService.getPipelineStats();
      final dashboardMetrics = await crmDataService.getDashboardMetrics();

      // Extract metrics
      final pipelineValue =
          (pipelineStats['totalPipelineValue'] as num?)?.toDouble() ?? 0.0;
      final pendingTasks =
          (dashboardMetrics['pendingTasks'] as num?)?.toInt() ?? 0;
      final todayMeetings =
          (dashboardMetrics['todayMeetings'] as num?)?.toInt() ?? 0;

      // Generate greeting based on time of day
      final greeting = _generateGreeting(userName);

      // Build sections
      final sections = <BriefSection>[];

      // Priority contacts section
      if (hotLeads.isNotEmpty) {
        final topLead = hotLeads.first;
        // Route based on entity type - Lead vs Contact
        // Salesforce ID prefixes: Lead = 00Q, Contact = 003
        final isLead = topLead.type == 'Lead' || topLead.id.startsWith('00Q');
        final entityRoute = isLead
            ? '/leads/${topLead.id}'
            : '/contacts/${topLead.id}';
        final entityLabel = isLead ? 'Lead' : 'Contact';
        sections.add(BriefSection(
          title: 'Priority $entityLabel',
          icon: 'user_check',
          content:
              '${topLead.name} is your top priority today. ${topLead.insights.isNotEmpty ? topLead.insights.first : "High engagement momentum detected."}',
          priority: BriefPriority.high,
          actionRoute: entityRoute,
          metadata: {
            'entityId': topLead.id,
            'entityName': topLead.name,
            'entityType': isLead ? 'Lead' : 'Contact',
            'momentum': topLead.momentum.trend,
          },
        ));
      }

      // At-risk deals section
      if (atRiskEntities.isNotEmpty) {
        final atRiskDeals =
            atRiskEntities.where((e) => e.type == 'Opportunity').toList();
        if (atRiskDeals.isNotEmpty) {
          sections.add(BriefSection(
            title: 'Deals Need Attention',
            icon: 'warning',
            content: atRiskDeals.length == 1
                ? 'You have 1 deal at risk that needs immediate attention.'
                : 'You have ${atRiskDeals.length} deals at risk that need immediate attention.',
            priority: BriefPriority.high,
            actionRoute: 'priorities://at_risk_deals',
            metadata: {
              'dealCount': atRiskDeals.length,
              'deals': atRiskDeals.take(5).map((d) => <String, dynamic>{
                'id': d.id,
                'name': d.name,
                'trend': d.momentum.trend,
                'insights': d.insights,
              }).toList(),
            },
          ));
        }
      }

      // Tasks section
      if (pendingTasks > 0) {
        sections.add(BriefSection(
          title: 'Tasks Due Today',
          icon: 'task',
          content: pendingTasks == 1
              ? 'You have 1 task due today.'
              : 'You have $pendingTasks tasks due today. Stay on track!',
          priority:
              pendingTasks > 3 ? BriefPriority.high : BriefPriority.normal,
          actionRoute: 'priorities://tasks_due_today',
          metadata: {
            'taskCount': pendingTasks,
            'filter': 'due_today',
          },
        ));
      }

      // Meetings section
      if (todayMeetings > 0) {
        sections.add(BriefSection(
          title: 'Meetings Today',
          icon: 'calendar',
          content: todayMeetings == 1
              ? 'You have 1 meeting scheduled today.'
              : 'You have $todayMeetings meetings scheduled today.',
          priority: BriefPriority.normal,
          actionRoute: '/meetings',
        ));
      }

      // Pipeline health section
      sections.add(BriefSection(
        title: 'Pipeline Health',
        icon: 'trending_up',
        content: _formatPipelineHealth(pipelineValue, pipelineStats),
        priority: BriefPriority.normal,
        actionRoute: '/deals',
      ));

      // Generate summary
      final summary = _generateSummary(
        hotLeads.length,
        atRiskEntities.where((e) => e.type == 'Opportunity').length,
        pendingTasks,
        todayMeetings,
      );

      // Quick actions
      final quickActions = [
        const QuickAction(
          label: 'View Contacts',
          icon: 'people',
          route: '/contacts',
        ),
        const QuickAction(
          label: 'Open Deals',
          icon: 'briefcase',
          route: '/deals',
        ),
        const QuickAction(
          label: 'Check Tasks',
          icon: 'task_square',
          route: '/tasks',
        ),
      ];

      final brief = MorningBrief(
        generatedAt: DateTime.now(),
        greeting: greeting,
        summary: summary,
        sections: sections,
        quickActions: quickActions,
        priorityContactsCount: hotLeads.length,
        atRiskDealsCount:
            atRiskEntities.where((e) => e.type == 'Opportunity').length,
        pendingTasksCount: pendingTasks,
        pipelineValue: pipelineValue,
      );

      // Cache the brief
      await _cacheBrief(brief);

      return brief;
    } catch (e) {
      rethrow;
    }
  }

  /// Get the cached morning brief
  Future<MorningBrief?> getCachedBrief() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Check cache version - invalidate if outdated
      final cachedVersion = prefs.getInt(_cacheVersionKey) ?? 0;
      if (cachedVersion < _currentCacheVersion) {
        await prefs.remove(_cacheKey);
        await prefs.setInt(_cacheVersionKey, _currentCacheVersion);
        return null;
      }

      final cached = prefs.getString(_cacheKey);
      if (cached != null) {
        final brief = MorningBrief.fromJson(jsonDecode(cached));
        // Check if brief is still fresh (same day)
        if (!brief.isStale) {
          return brief;
        }
      }
    } catch (e) {
      // Silently ignore
    }
    return null;
  }

  /// Get brief (from cache or generate new)
  Future<MorningBrief> getBrief({String? userName, bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cached = await getCachedBrief();
      if (cached != null) {
        return cached;
      }
    }
    return generateBrief(userName: userName);
  }

  Future<void> _cacheBrief(MorningBrief brief) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(brief.toJson()));
      await prefs.setInt(_cacheVersionKey, _currentCacheVersion);
    } catch (e) {
      // Silently ignore
    }
  }

  String _generateGreeting(String? userName) {
    final hour = DateTime.now().hour;
    final name = userName ?? 'there';

    if (hour < 12) {
      return 'Good morning, $name';
    } else if (hour < 17) {
      return 'Good afternoon, $name';
    } else {
      return 'Good evening, $name';
    }
  }

  String _generateSummary(
    int priorityContacts,
    int atRiskDeals,
    int pendingTasks,
    int meetings,
  ) {
    final parts = <String>[];

    if (atRiskDeals > 0) {
      parts.add(
          '$atRiskDeals deal${atRiskDeals == 1 ? '' : 's'} need${atRiskDeals == 1 ? 's' : ''} attention');
    }

    if (priorityContacts > 0) {
      parts.add(
          '$priorityContacts priority contact${priorityContacts == 1 ? '' : 's'} to reach');
    }

    if (pendingTasks > 0) {
      parts.add('$pendingTasks task${pendingTasks == 1 ? '' : 's'} due');
    }

    if (meetings > 0) {
      parts.add('$meetings meeting${meetings == 1 ? '' : 's'} scheduled');
    }

    if (parts.isEmpty) {
      return "Your schedule looks clear today. Great time to focus on prospecting!";
    }

    return "Today you have ${parts.join(', ')}.";
  }

  String _formatPipelineHealth(
      double pipelineValue, Map<String, dynamic> stats) {
    final formatted = _formatCurrency(pipelineValue);
    final openDeals = (stats['openOpportunities'] as num?)?.toInt() ?? 0;

    if (openDeals == 0) {
      return 'Your pipeline is empty. Time to create some opportunities!';
    }

    return 'Your pipeline is valued at $formatted with $openDeals open deal${openDeals == 1 ? '' : 's'}.';
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }

  /// Schedule daily morning brief notification
  Future<void> scheduleMorningNotification({
    int hour = 8,
    int minute = 0,
  }) async {
    final notificationService = _ref.read(notificationServiceProvider);

    // Calculate next occurrence
    var scheduledDate = DateTime.now();
    scheduledDate = DateTime(
      scheduledDate.year,
      scheduledDate.month,
      scheduledDate.day,
      hour,
      minute,
    );

    // If time has passed today, schedule for tomorrow
    if (scheduledDate.isBefore(DateTime.now())) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }

    await notificationService.scheduleNotification(
      id: _morningBriefNotificationId,
      title: 'Good Morning! Your Daily Brief is Ready',
      body: 'Tap to see your priorities for today',
      scheduledDate: scheduledDate,
      payload: jsonEncode({'type': 'morning_brief'}),
    );

  }

  /// Cancel morning brief notification
  Future<void> cancelMorningNotification() async {
    final notificationService = _ref.read(notificationServiceProvider);
    await notificationService.cancelNotification(_morningBriefNotificationId);
  }

  /// Show morning brief notification immediately
  Future<void> showMorningBriefNotification(MorningBrief brief) async {
    final notificationService = _ref.read(notificationServiceProvider);

    await notificationService.showAIInsightNotification(
      title: brief.greeting,
      body: brief.summary,
      payload: jsonEncode({'type': 'morning_brief'}),
    );
  }

  /// Get/save morning brief settings
  Future<Map<String, dynamic>> getSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final settings = prefs.getString(_settingsKey);
      if (settings != null) {
        return jsonDecode(settings);
      }
    } catch (e) {
      // Silently ignore
    }
    // Default settings
    return {
      'enabled': true,
      'notificationHour': 8,
      'notificationMinute': 0,
      'showOnDashboard': true,
    };
  }

  Future<void> saveSettings(Map<String, dynamic> settings) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_settingsKey, jsonEncode(settings));
    } catch (e) {
      // Silently ignore
    }
  }
}

/// Morning brief service provider
final morningBriefServiceProvider = Provider<MorningBriefService>((ref) {
  return MorningBriefService(ref);
});

/// Morning brief data provider
final morningBriefProvider = FutureProvider<MorningBrief>((ref) async {
  final service = ref.watch(morningBriefServiceProvider);
  return service.getBrief();
});

/// Morning brief refresh provider (force refresh)
final morningBriefRefreshProvider =
    FutureProvider.family<MorningBrief, String?>((ref, userName) async {
  final service = ref.watch(morningBriefServiceProvider);
  return service.getBrief(userName: userName, forceRefresh: true);
});
