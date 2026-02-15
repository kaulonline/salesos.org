import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import 'crm_data_service.dart';

/// IRISRank v2.0 - Proprietary AI-Powered Entity Ranking Algorithm
/// Combines network importance, activity signals, query relevance, and momentum
/// to intelligently rank and predict CRM entity engagement.

// ============================================================================
// DATA MODELS
// ============================================================================

/// Momentum metrics for predictive engagement
class MomentumMetrics {
  final double velocity;
  final double acceleration;
  final double momentumScore;
  final String trend; // accelerating, steady, decelerating, at_risk, churning
  final int daysSinceLastActivity;
  final Map<String, int> periodCounts;

  MomentumMetrics({
    required this.velocity,
    required this.acceleration,
    required this.momentumScore,
    required this.trend,
    required this.daysSinceLastActivity,
    required this.periodCounts,
  });

  factory MomentumMetrics.fromJson(Map<String, dynamic> json) {
    return MomentumMetrics(
      velocity: (json['velocity'] as num?)?.toDouble() ?? 0,
      acceleration: (json['acceleration'] as num?)?.toDouble() ?? 0,
      momentumScore: (json['momentumScore'] as num?)?.toDouble() ?? 0.5,
      trend: json['trend'] as String? ?? 'steady',
      daysSinceLastActivity: json['daysSinceLastActivity'] as int? ?? 0,
      periodCounts: {
        'currentPeriod': (json['periodCounts']?['currentPeriod'] as num?)?.toInt() ?? 0,
        'previousPeriod': (json['periodCounts']?['previousPeriod'] as num?)?.toInt() ?? 0,
        'twoPeriodsAgo': (json['periodCounts']?['twoPeriodsAgo'] as num?)?.toInt() ?? 0,
      },
    );
  }

  /// Check if entity is "hot" (accelerating engagement)
  bool get isHot => trend == 'accelerating' || (trend == 'steady' && velocity > 0.2);

  /// Check if entity needs attention
  bool get needsAttention => trend == 'at_risk' || trend == 'churning';

  /// Get emoji for trend
  String get trendEmoji {
    switch (trend) {
      case 'accelerating':
        return '🔥';
      case 'steady':
        return '➡️';
      case 'decelerating':
        return '📉';
      case 'at_risk':
        return '⚠️';
      case 'churning':
        return '🚨';
      default:
        return '•';
    }
  }

  /// Get human-readable trend label
  String get trendLabel {
    switch (trend) {
      case 'accelerating':
        return 'Hot';
      case 'steady':
        return 'Steady';
      case 'decelerating':
        return 'Slowing';
      case 'at_risk':
        return 'At Risk';
      case 'churning':
        return 'Needs Attention';
      default:
        return 'Unknown';
    }
  }
}

/// Individual ranked entity result
class IRISRankResult {
  final String id;
  final String name;
  final String type;
  final double rank;
  final Map<String, double> scores;
  final MomentumMetrics momentum;
  final List<String> insights;
  final Map<String, dynamic>? properties;

  IRISRankResult({
    required this.id,
    required this.name,
    required this.type,
    required this.rank,
    required this.scores,
    required this.momentum,
    required this.insights,
    this.properties,
  });

  factory IRISRankResult.fromJson(Map<String, dynamic> json) {
    final scoresJson = json['scores'] as Map<String, dynamic>? ?? {};
    return IRISRankResult(
      id: json['id'] as String? ?? json['entityId'] as String? ?? '',
      name: json['name'] as String? ?? json['entityName'] as String? ?? 'Unknown',
      type: json['type'] as String? ?? json['entityType'] as String? ?? 'Entity',
      rank: (json['rank'] as num?)?.toDouble() ?? 0,
      scores: {
        'network': (scoresJson['network'] as num?)?.toDouble() ?? (json['networkScore'] as num?)?.toDouble() ?? 0,
        'activity': (scoresJson['activity'] as num?)?.toDouble() ?? (json['activityScore'] as num?)?.toDouble() ?? 0,
        'relevance': (scoresJson['relevance'] as num?)?.toDouble() ?? (json['relevanceScore'] as num?)?.toDouble() ?? 0,
        'momentum': (scoresJson['momentum'] as num?)?.toDouble() ?? (json['momentumScore'] as num?)?.toDouble() ?? 0,
      },
      momentum: MomentumMetrics.fromJson(json['momentum'] as Map<String, dynamic>? ?? {}),
      insights: (json['insights'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          (json['explanation'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          [],
      properties: json['properties'] as Map<String, dynamic>?,
    );
  }

  /// Get the percentage score (0-100)
  int get rankPercentage => (rank * 100).round();

  /// Get initials for avatar
  String get initials {
    final words = name.split(' ').where((w) => w.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words[0][0].toUpperCase();
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }
}

/// Portfolio insights summary
class PortfolioInsights {
  final int totalEntities;
  final double avgRank;
  final double avgMomentum;
  final Map<String, int> distributionByTrend;
  final Map<String, int> distributionByType;
  final List<String> recommendations;

  PortfolioInsights({
    required this.totalEntities,
    required this.avgRank,
    required this.avgMomentum,
    required this.distributionByTrend,
    required this.distributionByType,
    required this.recommendations,
  });

  factory PortfolioInsights.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? {};
    final distribution = json['distribution'] as Map<String, dynamic>? ?? {};

    return PortfolioInsights(
      totalEntities: summary['totalEntities'] as int? ?? 0,
      avgRank: (summary['avgRank'] as num?)?.toDouble() ?? 0,
      avgMomentum: (summary['avgMomentum'] as num?)?.toDouble() ?? 0,
      distributionByTrend: (distribution['byTrend'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, (v as num).toInt()),
          ) ??
          {},
      distributionByType: (distribution['byType'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, (v as num).toInt()),
          ) ??
          {},
      recommendations: (json['recommendations'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  /// Get count of hot entities
  int get hotCount => distributionByTrend['accelerating'] ?? 0;

  /// Get count of at-risk entities
  int get atRiskCount => (distributionByTrend['at_risk'] ?? 0) + (distributionByTrend['churning'] ?? 0);

  /// Get count of steady entities
  int get steadyCount => distributionByTrend['steady'] ?? 0;

  /// Get health score (0-100)
  int get healthScore {
    if (totalEntities == 0) return 50;
    final healthy = (distributionByTrend['accelerating'] ?? 0) + (distributionByTrend['steady'] ?? 0);
    return ((healthy / totalEntities) * 100).round();
  }
}

// ============================================================================
// IRIS RANK SERVICE
// ============================================================================

/// Service for interacting with the IRISRank API
class IRISRankService {
  final ApiClient _api;
  final CrmDataService _crmService;

  IRISRankService(this._api, this._crmService);

  /// Check if IRISRank API is available
  Future<bool> checkHealth() async {
    try {
      final response = await _api.get('/iris-rank/health');
      return response.statusCode == 200 && response.data['status'] == 'healthy';
    } catch (e) {
      return false;
    }
  }

  /// Score entities using IRISRank algorithm
  Future<List<IRISRankResult>> scoreEntities({
    required List<Map<String, dynamic>> entities,
    String? query,
    List<String>? entityTypes,
    int limit = 20,
  }) async {
    try {
      final response = await _api.post(
        '/iris-rank/score',
        data: {
          'entities': entities,
          'query': ?query,
          'entityTypes': ?entityTypes,
          'limit': limit,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final results = response.data['results'] as List<dynamic>? ?? [];
        return results.map((r) => IRISRankResult.fromJson(r as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get hot leads/contacts with accelerating momentum
  Future<List<IRISRankResult>> getHotLeads({int limit = 10}) async {
    try {
      // Fetch leads and contacts from CRM
      final leads = await _crmService.getLeads(limit: 50);
      final contacts = await _crmService.getContacts(limit: 50);

      // Transform to entities with activities
      final entities = [
        ...leads.map((l) => _transformToEntity(l, 'Lead')),
        ...contacts.map((c) => _transformToEntity(c, 'Contact')),
      ];

      if (entities.isEmpty) return [];

      final response = await _api.post(
        '/iris-rank/momentum',
        data: {
          'entities': entities,
          'limit': limit,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final results = response.data['results'] as List<dynamic>? ?? [];
        return results.map((r) => IRISRankResult.fromJson(r as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get at-risk entities that need attention
  Future<List<IRISRankResult>> getAtRiskEntities({int limit = 10}) async {
    try {
      // Fetch accounts and opportunities from CRM
      final accounts = await _crmService.getAccounts(limit: 50);
      final opportunities = await _crmService.getOpportunities(limit: 50);

      // Transform to entities
      final entities = [
        ...accounts.map((a) => _transformToEntity(a, 'Account')),
        ...opportunities.map((o) => _transformToEntity(o, 'Opportunity')),
      ];

      if (entities.isEmpty) return [];

      final response = await _api.post(
        '/iris-rank/at-risk',
        data: {
          'entities': entities,
          'limit': limit,
          'inactivityThreshold': 30,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final results = response.data['results'] as List<dynamic>? ?? [];
        return results.map((r) => IRISRankResult.fromJson(r as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get portfolio insights and recommendations
  Future<PortfolioInsights?> getPortfolioInsights() async {
    try {
      // Fetch all entity types
      final leads = await _crmService.getLeads(limit: 100);
      final contacts = await _crmService.getContacts(limit: 100);
      final accounts = await _crmService.getAccounts(limit: 100);
      final opportunities = await _crmService.getOpportunities(limit: 100);

      final entities = [
        ...leads.map((l) => _transformToEntity(l, 'Lead')),
        ...contacts.map((c) => _transformToEntity(c, 'Contact')),
        ...accounts.map((a) => _transformToEntity(a, 'Account')),
        ...opportunities.map((o) => _transformToEntity(o, 'Opportunity')),
      ];

      if (entities.isEmpty) return null;

      final response = await _api.post(
        '/iris-rank/insights',
        data: {
          'entities': entities,
          'insightTypes': ['distribution', 'trends', 'recommendations'],
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return PortfolioInsights.fromJson(response.data['insights'] as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Get top ranked entities across all types
  Future<List<IRISRankResult>> getTopRanked({
    String? query,
    List<String>? entityTypes,
    int limit = 10,
  }) async {
    try {
      // Fetch entities based on types
      final List<Map<String, dynamic>> allEntities = [];

      final typesToFetch = entityTypes ?? ['Lead', 'Contact', 'Account', 'Opportunity'];

      if (typesToFetch.contains('Lead')) {
        final leads = await _crmService.getLeads(limit: 50);
        allEntities.addAll(leads.map((l) => _transformToEntity(l, 'Lead')));
      }
      if (typesToFetch.contains('Contact')) {
        final contacts = await _crmService.getContacts(limit: 50);
        allEntities.addAll(contacts.map((c) => _transformToEntity(c, 'Contact')));
      }
      if (typesToFetch.contains('Account')) {
        final accounts = await _crmService.getAccounts(limit: 50);
        allEntities.addAll(accounts.map((a) => _transformToEntity(a, 'Account')));
      }
      if (typesToFetch.contains('Opportunity')) {
        final opportunities = await _crmService.getOpportunities(limit: 50);
        allEntities.addAll(opportunities.map((o) => _transformToEntity(o, 'Opportunity')));
      }

      if (allEntities.isEmpty) return [];

      return scoreEntities(
        entities: allEntities,
        query: query,
        entityTypes: entityTypes,
        limit: limit,
      );
    } catch (e) {
      return [];
    }
  }

  /// Transform CRM data to IRISRank entity format
  Map<String, dynamic> _transformToEntity(Map<String, dynamic> record, String type) {
    // Extract common fields - handle both PascalCase (Salesforce) and camelCase (local API)
    final id = record['Id'] as String? ?? record['id'] as String? ?? '';

    // Build name from various possible field combinations
    final firstName = record['FirstName'] as String? ?? record['firstName'] as String? ?? '';
    final lastName = record['LastName'] as String? ?? record['lastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();

    final name = record['Name'] as String? ??
        record['name'] as String? ??
        (fullName.isNotEmpty ? fullName : record['Company'] as String? ?? record['company'] as String? ?? '');

    // Build activities from available data - expanded to capture more signals
    final activities = <Map<String, dynamic>>[];

    // Get dates for proper time decay
    final createdDate = record['CreatedDate'] as String? ?? record['createdAt'] as String?;
    final lastActivityDate = record['LastActivityDate'] as String? ?? record['lastActivityDate'] as String?;
    final lastModifiedDate = record['LastModifiedDate'] as String? ?? record['updatedAt'] as String?;

    // Entity creation - initial engagement signal
    if (createdDate != null) {
      activities.add({
        'type': 'lead_created',
        'date': createdDate,
        'outcome': 'positive',
      });
    }

    // Last activity date - engagement signal
    if (lastActivityDate != null) {
      activities.add({
        'type': 'task_completed',
        'date': lastActivityDate,
        'outcome': 'positive',
      });
    }

    // Record update - shows active management
    if (lastModifiedDate != null && lastModifiedDate != createdDate) {
      activities.add({
        'type': 'profile_updated',
        'date': lastModifiedDate,
        'outcome': 'positive',
      });
    }

    // Lead-specific activities
    if (type == 'Lead') {
      final status = (record['Status'] as String? ?? record['status'] as String? ?? '').toLowerCase();
      final convertedDate = record['ConvertedDate'] as String?;

      // Lead conversion - strong positive signal
      if (convertedDate != null || status.contains('converted')) {
        activities.add({
          'type': 'deal_won',
          'date': convertedDate ?? lastModifiedDate ?? DateTime.now().toIso8601String(),
          'outcome': 'positive',
        });
      }
      // Lead qualified
      else if (status.contains('qualified') || status.contains('working')) {
        activities.add({
          'type': 'lead_qualified',
          'date': lastModifiedDate ?? createdDate ?? DateTime.now().toIso8601String(),
          'outcome': 'positive',
        });
      }
      // Lead disqualified/lost
      else if (status.contains('disqualified') || status.contains('unqualified') || status.contains('closed')) {
        activities.add({
          'type': 'deal_lost',
          'date': lastModifiedDate ?? DateTime.now().toIso8601String(),
          'outcome': 'negative',
        });
      }

      // Email opt-out - negative signal
      final hasOptedOut = record['HasOptedOutOfEmail'] as bool? ?? record['emailOptOut'] as bool? ?? false;
      if (hasOptedOut) {
        activities.add({
          'type': 'unsubscribed',
          'date': lastModifiedDate ?? DateTime.now().toIso8601String(),
          'outcome': 'negative',
        });
      }
    }

    // Contact-specific activities
    if (type == 'Contact') {
      final hasOptedOut = record['HasOptedOutOfEmail'] as bool? ?? record['emailOptOut'] as bool? ?? false;
      if (hasOptedOut) {
        activities.add({
          'type': 'unsubscribed',
          'date': lastModifiedDate ?? DateTime.now().toIso8601String(),
          'outcome': 'negative',
        });
      }

      // Check for email bounces
      final emailBounced = record['EmailBouncedDate'] as String?;
      if (emailBounced != null) {
        activities.add({
          'type': 'email_bounced',
          'date': emailBounced,
          'outcome': 'negative',
        });
      }
    }

    // Opportunity-specific activities
    if (type == 'Opportunity') {
      final stage = (record['StageName'] as String? ?? record['stage'] as String? ?? '').toLowerCase();
      final closeDate = record['CloseDate'] as String? ?? record['closeDate'] as String?;
      final isClosed = record['IsClosed'] as bool? ?? stage.contains('closed');
      final isWon = record['IsWon'] as bool? ?? stage.contains('won');

      if (isClosed) {
        if (isWon) {
          activities.add({
            'type': 'deal_won',
            'date': closeDate ?? lastModifiedDate ?? DateTime.now().toIso8601String(),
            'outcome': 'positive',
          });
        } else {
          activities.add({
            'type': 'deal_lost',
            'date': closeDate ?? lastModifiedDate ?? DateTime.now().toIso8601String(),
            'outcome': 'negative',
          });
        }
      } else {
        // Active opportunity - show stage progression
        if (stage.contains('negotiation') || stage.contains('proposal')) {
          activities.add({
            'type': 'meeting_attended',
            'date': lastModifiedDate ?? createdDate ?? DateTime.now().toIso8601String(),
            'outcome': 'positive',
          });
        } else if (stage.contains('qualification') || stage.contains('discovery')) {
          activities.add({
            'type': 'call_answered',
            'date': lastModifiedDate ?? createdDate ?? DateTime.now().toIso8601String(),
            'outcome': 'positive',
          });
        }
      }
    }

    // Account-specific activities
    if (type == 'Account') {
      final accountType = (record['Type'] as String? ?? '').toLowerCase();
      // Customer accounts show strong engagement
      if (accountType.contains('customer') || accountType.contains('partner')) {
        activities.add({
          'type': 'deal_won',
          'date': createdDate ?? DateTime.now().toIso8601String(),
          'outcome': 'positive',
        });
      }
    }

    // Build connections based on type
    final connections = <Map<String, dynamic>>[];

    if (type == 'Lead' || type == 'Contact') {
      final accountId = record['AccountId'] as String? ?? record['accountId'] as String?;
      if (accountId != null) {
        connections.add({
          'targetId': accountId,
          'targetType': 'Account',
          'relationshipType': 'works_at',
          'strength': 0.9,
          'createdDate': createdDate,
        });
      }

      // Contact can have a reports-to relationship
      if (type == 'Contact') {
        final reportsToId = record['ReportsToId'] as String?;
        if (reportsToId != null) {
          connections.add({
            'targetId': reportsToId,
            'targetType': 'Contact',
            'relationshipType': 'reports_to',
            'strength': 0.7,
            'createdDate': createdDate,
          });
        }
      }
    }

    if (type == 'Opportunity') {
      final accountId = record['AccountId'] as String? ?? record['accountId'] as String?;
      if (accountId != null) {
        connections.add({
          'targetId': accountId,
          'targetType': 'Account',
          'relationshipType': 'associated_to',
          'strength': 1.0,
          'createdDate': createdDate,
        });
      }

      // Primary contact on opportunity
      final contactId = record['ContactId'] as String? ?? record['primaryContactId'] as String?;
      if (contactId != null) {
        connections.add({
          'targetId': contactId,
          'targetType': 'Contact',
          'relationshipType': 'primary_contact',
          'strength': 0.95,
          'createdDate': createdDate,
        });
      }
    }

    // Account connections to parent account
    if (type == 'Account') {
      final parentId = record['ParentId'] as String?;
      if (parentId != null) {
        connections.add({
          'targetId': parentId,
          'targetType': 'Account',
          'relationshipType': 'subsidiary_of',
          'strength': 0.8,
          'createdDate': createdDate,
        });
      }
    }

    return {
      'id': id,
      'type': type,
      'name': name.isNotEmpty ? name : 'Unknown',
      'properties': record,
      'activities': activities,
      'connections': connections,
      'createdDate': createdDate,
      'lastModifiedDate': lastModifiedDate,
    };
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for IRISRank service
final irisRankServiceProvider = Provider<IRISRankService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final crmService = ref.watch(crmDataServiceProvider);
  return IRISRankService(apiClient, crmService);
});

/// Provider for hot leads with momentum
final hotLeadsProvider = FutureProvider<List<IRISRankResult>>((ref) async {
  final service = ref.watch(irisRankServiceProvider);
  return service.getHotLeads(limit: 5);
});

/// Provider for at-risk entities
final atRiskEntitiesProvider = FutureProvider<List<IRISRankResult>>((ref) async {
  final service = ref.watch(irisRankServiceProvider);
  return service.getAtRiskEntities(limit: 5);
});

/// Provider for portfolio insights
final portfolioInsightsProvider = FutureProvider<PortfolioInsights?>((ref) async {
  final service = ref.watch(irisRankServiceProvider);
  return service.getPortfolioInsights();
});

/// Provider for top ranked entities with query
final topRankedProvider = FutureProvider.family<List<IRISRankResult>, String?>((ref, query) async {
  final service = ref.watch(irisRankServiceProvider);
  return service.getTopRanked(query: query, limit: 10);
});

