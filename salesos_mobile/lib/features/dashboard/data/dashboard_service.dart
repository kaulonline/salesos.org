import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/error_reporting_service.dart';
import '../../../core/utils/exceptions.dart';

/// Dashboard data models
class PipelineStats {
  final double totalValue;
  final int totalDeals;
  final double avgDealSize;
  final double winRate;
  final Map<String, StageStats> byStage;

  PipelineStats({
    required this.totalValue,
    required this.totalDeals,
    required this.avgDealSize,
    required this.winRate,
    required this.byStage,
  });

  factory PipelineStats.fromJson(Map<String, dynamic> json) {
    // Handle byStage as either List (from API) or Map
    final Map<String, StageStats> stageMap = {};
    final byStageData = json['byStage'];
    if (byStageData is List) {
      // API returns array format: [{stage: "QUALIFICATION", _count: 1, _sum: {...}}, ...]
      for (final item in byStageData) {
        if (item is Map<String, dynamic>) {
          final stageName = item['stage'] as String? ?? 'Unknown';
          final count = item['_count'] as int? ?? 0;
          final sumData = item['_sum'] as Map<String, dynamic>?;
          final amount = (sumData?['amount'] as num?)?.toDouble() ?? 0;
          stageMap[stageName] = StageStats(count: count, value: amount);
        }
      }
    } else if (byStageData is Map<String, dynamic>) {
      for (final entry in byStageData.entries) {
        stageMap[entry.key] = StageStats.fromJson(entry.value as Map<String, dynamic>);
      }
    }

    return PipelineStats(
      totalValue: (json['totalPipelineValue'] as num?)?.toDouble() ??
          (json['totalValue'] as num?)?.toDouble() ??
          0,
      totalDeals: json['openOpportunities'] as int? ??
          json['totalDeals'] as int? ??
          0,
      avgDealSize: (json['avgDealSize'] as num?)?.toDouble() ?? 0,
      winRate: (json['winRate'] as num?)?.toDouble() ?? 0,
      byStage: stageMap,
    );
  }

  factory PipelineStats.empty() => PipelineStats(
        totalValue: 0,
        totalDeals: 0,
        avgDealSize: 0,
        winRate: 0,
        byStage: {},
      );
}

class StageStats {
  final int count;
  final double value;

  StageStats({required this.count, required this.value});

  factory StageStats.fromJson(Map<String, dynamic> json) {
    return StageStats(
      count: json['count'] as int? ?? 0,
      value: (json['value'] as num?)?.toDouble() ?? 0,
    );
  }
}

class DashboardMetrics {
  final int totalLeads;
  final int totalContacts;
  final int totalOpportunities;
  final int pendingTasks;
  final int todayMeetings;
  final int todayCalls;
  final double pipelineValue;
  final double quotaProgress;

  DashboardMetrics({
    required this.totalLeads,
    required this.totalContacts,
    required this.totalOpportunities,
    required this.pendingTasks,
    required this.todayMeetings,
    required this.todayCalls,
    required this.pipelineValue,
    required this.quotaProgress,
  });

  factory DashboardMetrics.empty() => DashboardMetrics(
        totalLeads: 0,
        totalContacts: 0,
        totalOpportunities: 0,
        pendingTasks: 0,
        todayMeetings: 0,
        todayCalls: 0,
        pipelineValue: 0,
        quotaProgress: 0,
      );
}

class RecentActivity {
  final String id;
  final String type;
  final String title;
  final String subtitle;
  final DateTime timestamp;

  RecentActivity({
    required this.id,
    required this.type,
    required this.title,
    required this.subtitle,
    required this.timestamp,
  });

  factory RecentActivity.fromJson(Map<String, dynamic> json) {
    return RecentActivity(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'activity',
      title: json['title'] as String? ?? json['subject'] as String? ?? 'Activity',
      subtitle: json['description'] as String? ?? json['notes'] as String? ?? '',
      timestamp: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

/// Dashboard service for fetching real data from the backend API.
///
/// This service provides methods to fetch dashboard metrics including:
/// - Today's meetings count (from GET /activities/count?date=today&type=MEETING)
/// - Today's calls count (from GET /activities/count?date=today&type=CALL)
/// - User quota progress (from GET /users/me/quota)
/// - Pipeline statistics (from GET /opportunities/pipeline/stats)
///
/// Note: The primary dashboard data source is [CrmDataService] via [crmDashboardMetricsProvider].
/// This service is kept for backward compatibility and direct API access patterns.
class DashboardService {
  final ApiClient _api;
  final ErrorReportingService _errorService;

  /// Cached metrics for offline fallback
  DashboardMetrics? _cachedMetrics;
  DateTime? _lastFetchTime;

  /// Cache duration before data is considered stale
  static const Duration _cacheDuration = Duration(minutes: 5);

  DashboardService(this._api, this._errorService);

  /// Report error with context but don't throw - used for graceful degradation
  void _reportError(dynamic error, String context) {
    final appError = error is AppException
        ? error
        : UnknownException(message: 'Dashboard error during $context', originalError: error);
    _errorService.reportError(
      appError,
      stackTrace: StackTrace.current,
      context: ErrorContext(screenName: 'DashboardService', action: context),
    );
  }

  /// Check if cached data is still valid
  bool get _isCacheValid {
    if (_cachedMetrics == null || _lastFetchTime == null) return false;
    return DateTime.now().difference(_lastFetchTime!) < _cacheDuration;
  }

  /// Fetch pipeline statistics from GET /opportunities/pipeline/stats
  Future<PipelineStats> getPipelineStats() async {
    try {
      final response = await _api.get('/opportunities/pipeline/stats');
      return PipelineStats.fromJson(response.data);
    } catch (e) {
      _reportError(e, 'getPipelineStats');
      return PipelineStats.empty();
    }
  }

  /// Fetch dashboard metrics aggregated from various endpoints.
  ///
  /// This method fetches data in parallel for optimal performance:
  /// - Leads, contacts, opportunities counts
  /// - Pending tasks count
  /// - Pipeline statistics
  /// - Today's meetings count (GET /activities/count?date=today&type=MEETING)
  /// - Today's calls count (GET /activities/count?date=today&type=CALL)
  /// - User quota progress (GET /users/me/quota)
  ///
  /// On error, returns cached data if available, otherwise returns empty metrics.
  Future<DashboardMetrics> getMetrics({bool forceRefresh = false}) async {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && _isCacheValid && _cachedMetrics != null) {
      return _cachedMetrics!;
    }

    try {
      // Fetch data in parallel with proper error handling
      final results = await Future.wait([
        _safeGet('/leads'),
        _safeGet('/contacts'),
        _safeGet('/opportunities'),
        _safeGet('/tasks?status=pending'),
        _safeGet('/opportunities/pipeline/stats'),
        _safeGet('/activities/count?date=today&type=MEETING'),
        _safeGet('/activities/count?date=today&type=CALL'),
        _safeGet('/users/me/quota'),
      ]);

      final leadsResult = results[0];
      final contactsResult = results[1];
      final opportunitiesResult = results[2];
      final tasksResult = results[3];
      final pipelineResult = results[4];
      final meetingsResult = results[5];
      final callsResult = results[6];
      final quotaResult = results[7];

      // Extract today's meetings count from API response
      // API returns: { count: int, date: string, type: string }
      final todayMeetings = _extractCount(meetingsResult);

      // Extract today's calls count from API response
      final todayCalls = _extractCount(callsResult);

      // Extract quota progress from API response
      // API returns: { salesQuota, currentValue, quotaProgress, quotaPeriod, periodStart, periodEnd }
      final quotaProgress = _extractQuotaProgress(quotaResult);

      // Extract pipeline value - API returns totalPipelineValue
      final pipelineValue = _extractPipelineValue(pipelineResult);

      final metrics = DashboardMetrics(
        totalLeads: _getListLength(leadsResult),
        totalContacts: _getListLength(contactsResult),
        totalOpportunities: _getListLength(opportunitiesResult),
        pendingTasks: _getListLength(tasksResult),
        todayMeetings: todayMeetings,
        todayCalls: todayCalls,
        pipelineValue: pipelineValue,
        quotaProgress: quotaProgress,
      );

      // Update cache
      _cachedMetrics = metrics;
      _lastFetchTime = DateTime.now();

      return metrics;
    } catch (e) {
      _reportError(e, 'getMetrics');
      // Return cached data on error if available
      if (_cachedMetrics != null) {
        return _cachedMetrics!;
      }
      return DashboardMetrics.empty();
    }
  }

  /// Extract count from activity count API response
  /// Expected format: { count: int, date: string, type: string | null }
  int _extractCount(dynamic result) {
    if (result is Map) {
      return (result['count'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }

  /// Extract quota progress from user quota API response
  /// Expected format: { salesQuota, currentValue, quotaProgress, quotaPeriod, periodStart, periodEnd }
  double _extractQuotaProgress(dynamic result) {
    if (result is Map) {
      return (result['quotaProgress'] as num?)?.toDouble() ?? 0.0;
    }
    return 0.0;
  }

  /// Extract pipeline value from pipeline stats API response
  /// Expected format: { totalPipelineValue, openOpportunities, byStage, winRate }
  double _extractPipelineValue(dynamic result) {
    if (result is Map) {
      // Try totalPipelineValue first (primary field), then totalValue as fallback
      return (result['totalPipelineValue'] as num?)?.toDouble() ??
             (result['totalValue'] as num?)?.toDouble() ??
             0.0;
    }
    return 0.0;
  }

  /// Get activity count by date and type.
  ///
  /// [date] - Date filter. Use 'today' for current day or ISO date string.
  /// [type] - Activity type: 'MEETING', 'CALL', 'EMAIL', 'TASK', 'NOTE', etc.
  ///
  /// Returns: Count of activities matching the criteria.
  Future<int> getActivityCountByType(String date, String type) async {
    try {
      final response = await _api.get('/activities/count?date=$date&type=$type');
      final data = response.data;
      if (data is Map) {
        return (data['count'] as num?)?.toInt() ?? 0;
      }
      return 0;
    } catch (e) {
      _reportError(e, 'getActivityCountByType($date, $type)');
      return 0;
    }
  }

  /// Get user quota information from GET /users/me/quota.
  ///
  /// Returns quota data including:
  /// - salesQuota: Target quota amount
  /// - currentValue: Current closed won value in the period
  /// - quotaProgress: Progress as decimal (0.0 to 1.0)
  /// - quotaPeriod: 'monthly', 'quarterly', or 'yearly'
  /// - periodStart: Start date of current quota period
  /// - periodEnd: End date of current quota period
  Future<Map<String, dynamic>> getUserQuota() async {
    try {
      final response = await _api.get('/users/me/quota');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data;
      }
      return _defaultQuotaData;
    } catch (e) {
      _reportError(e, 'getUserQuota');
      return _defaultQuotaData;
    }
  }

  /// Default quota data returned when API is unavailable
  static final Map<String, dynamic> _defaultQuotaData = {
    'salesQuota': 0,
    'currentValue': 0,
    'quotaProgress': 0.0,
    'quotaPeriod': 'monthly',
  };

  /// Safe GET request that returns null on error.
  /// Used for parallel fetching where individual failures shouldn't fail the whole request.
  /// Errors are still reported for monitoring.
  Future<dynamic> _safeGet(String path) async {
    try {
      final response = await _api.get(path);
      return response.data;
    } catch (e) {
      _reportError(e, '_safeGet($path)');
      return null;
    }
  }

  /// Fetch recent activities with optional limit
  Future<List<RecentActivity>> getRecentActivities({int limit = 10}) async {
    try {
      final response = await _api.get('/activities?limit=$limit');
      final data = response.data;
      if (data is List) {
        return data.map((e) => RecentActivity.fromJson(e)).toList();
      }
      return [];
    } catch (e) {
      _reportError(e, 'getRecentActivities');
      return [];
    }
  }

  /// Invalidate cached data to force refresh on next fetch
  void invalidateCache() {
    _cachedMetrics = null;
    _lastFetchTime = null;
  }

  /// Get length of a list response, handling various API response formats
  int _getListLength(dynamic data) {
    if (data is List) return data.length;
    if (data is Map && data['data'] is List) return (data['data'] as List).length;
    if (data is Map && data['items'] is List) return (data['items'] as List).length;
    return 0;
  }
}

// =============================================================================
// PROVIDERS
// =============================================================================

/// Dashboard service provider - provides DashboardService instance
/// Note: For CRM-aware dashboard data, use [crmDashboardMetricsProvider] from
/// crm_data_service.dart instead, as it handles Salesforce/Local mode switching.
final dashboardServiceProvider = Provider<DashboardService>((ref) {
  final api = ref.watch(apiClientProvider);
  final errorService = ref.watch(errorReportingServiceProvider);
  return DashboardService(api, errorService);
});

/// Pipeline statistics provider using DashboardService
/// Consider using [crmPipelineStatsProvider] for CRM-aware data fetching.
final pipelineStatsProvider = FutureProvider<PipelineStats>((ref) async {
  final service = ref.watch(dashboardServiceProvider);
  return service.getPipelineStats();
});

/// Dashboard metrics provider using DashboardService
/// This provider fetches real data from the API:
/// - Today's meetings from GET /activities/count?date=today&type=MEETING
/// - Today's calls from GET /activities/count?date=today&type=CALL
/// - Quota progress from GET /users/me/quota
///
/// For CRM-aware data (Salesforce/Local switching), use [crmDashboardMetricsProvider].
final dashboardMetricsProvider = FutureProvider<DashboardMetrics>((ref) async {
  final service = ref.watch(dashboardServiceProvider);
  return service.getMetrics();
});

/// Recent activities provider
final recentActivitiesProvider = FutureProvider<List<RecentActivity>>((ref) async {
  final service = ref.watch(dashboardServiceProvider);
  return service.getRecentActivities();
});

/// Provider for user quota information from GET /users/me/quota
/// Returns: { salesQuota, currentValue, quotaProgress, quotaPeriod, periodStart, periodEnd }
final userQuotaProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final service = ref.watch(dashboardServiceProvider);
  return service.getUserQuota();
});

/// Provider for today's meeting count from GET /activities/count?date=today&type=MEETING
/// Returns the count of meetings scheduled for today.
final todayMeetingsCountProvider = FutureProvider<int>((ref) async {
  final service = ref.watch(dashboardServiceProvider);
  return service.getActivityCountByType('today', 'MEETING');
});

/// Provider for today's call count from GET /activities/count?date=today&type=CALL
/// Returns the count of calls scheduled for today.
final todayCallsCountProvider = FutureProvider<int>((ref) async {
  final service = ref.watch(dashboardServiceProvider);
  return service.getActivityCountByType('today', 'CALL');
});

/// Provider for refreshing all dashboard data
/// Call ref.invalidate(dashboardRefreshProvider) to trigger a full refresh
final dashboardRefreshProvider = FutureProvider<void>((ref) async {
  // Invalidate service cache first
  final service = ref.read(dashboardServiceProvider);
  service.invalidateCache();

  // Refresh all dashboard providers by reading them
  await Future.wait([
    ref.refresh(pipelineStatsProvider.future),
    ref.refresh(dashboardMetricsProvider.future),
    ref.refresh(recentActivitiesProvider.future),
    ref.refresh(userQuotaProvider.future),
    ref.refresh(todayMeetingsCountProvider.future),
    ref.refresh(todayCallsCountProvider.future),
  ]);
});
