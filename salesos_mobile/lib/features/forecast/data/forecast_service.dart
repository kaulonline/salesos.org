// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Forecast period options - UPPERCASE to match web conventions
enum ForecastPeriod {
  THIS_QUARTER('This Quarter', 'THIS_QUARTER'),
  NEXT_QUARTER('Next Quarter', 'NEXT_QUARTER'),
  THIS_YEAR('This Year', 'THIS_YEAR');

  final String label;
  final String value;
  const ForecastPeriod(this.label, this.value);

  static ForecastPeriod fromString(String? value) {
    if (value == null) return ForecastPeriod.THIS_QUARTER;
    final upper = value.toUpperCase().replaceAll(' ', '_');
    switch (upper) {
      case 'THIS_QUARTER':
      case 'THISQUARTER':
      case 'THIS QUARTER':
        return ForecastPeriod.THIS_QUARTER;
      case 'NEXT_QUARTER':
      case 'NEXTQUARTER':
      case 'NEXT QUARTER':
        return ForecastPeriod.NEXT_QUARTER;
      case 'THIS_YEAR':
      case 'THISYEAR':
      case 'THIS YEAR':
        return ForecastPeriod.THIS_YEAR;
      default:
        return ForecastPeriod.THIS_QUARTER;
    }
  }
}

/// Forecast model - aligned with web SalesForecast type
class ForecastModel {
  // Existing fields (kept for backward compatibility)
  final String period;
  final double target;
  final double committed;
  final double bestCase;
  final double pipeline;
  final double closed;
  final String? ownerName;

  // New web-aligned fields
  final double? quarterRevenue;
  final double? quarterBestCase;
  final double? quarterCommit;
  final String? confidence;
  final String? quarterName;
  final int? opportunityCount;
  final double? quota;
  final List<Map<String, dynamic>>? monthly;

  const ForecastModel({
    required this.period,
    required this.target,
    required this.committed,
    required this.bestCase,
    required this.pipeline,
    required this.closed,
    this.ownerName,
    this.quarterRevenue,
    this.quarterBestCase,
    this.quarterCommit,
    this.confidence,
    this.quarterName,
    this.opportunityCount,
    this.quota,
    this.monthly,
  });

  factory ForecastModel.fromJson(Map<String, dynamic> json) {
    // Parse monthly data if present
    List<Map<String, dynamic>>? monthly;
    if (json['monthly'] is List) {
      monthly = (json['monthly'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
    } else if (json['byMonth'] is List) {
      // Backward compat: old mobile 'byMonth' field
      monthly = (json['byMonth'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
    }

    // Backward compat: quota maps to target
    final quota = (json['quota'] as num?)?.toDouble() ??
        (json['target'] as num?)?.toDouble() ??
        0;

    return ForecastModel(
      // period: prefer web's quarterName, fallback to old mobile's period
      period: json['quarterName'] as String? ?? json['period'] as String? ?? '',
      // target: prefer web's quota, fallback to old mobile's target
      target: quota,
      committed: (json['committed'] as num?)?.toDouble() ??
          (json['quarterCommit'] as num?)?.toDouble() ??
          0,
      bestCase: (json['bestCase'] as num?)?.toDouble() ??
          (json['quarterBestCase'] as num?)?.toDouble() ??
          0,
      pipeline: (json['pipeline'] as num?)?.toDouble() ?? 0,
      closed: (json['closed'] as num?)?.toDouble() ??
          (json['quarterRevenue'] as num?)?.toDouble() ??
          0,
      ownerName: json['ownerName'] as String?,
      // New web fields
      quarterRevenue: (json['quarterRevenue'] as num?)?.toDouble(),
      quarterBestCase: (json['quarterBestCase'] as num?)?.toDouble(),
      quarterCommit: (json['quarterCommit'] as num?)?.toDouble(),
      confidence: json['confidence'] as String?,
      quarterName: json['quarterName'] as String?,
      opportunityCount: json['opportunityCount'] as int?,
      quota: quota,
      monthly: monthly,
    );
  }

  /// toJson emits web-compatible field names
  Map<String, dynamic> toJson() {
    return {
      // Emit web field names
      'quarterName': quarterName ?? period,
      'quota': quota ?? target,
      'committed': committed,
      'bestCase': bestCase,
      'pipeline': pipeline,
      'closed': closed,
      'ownerName': ownerName,
      'quarterRevenue': quarterRevenue ?? closed,
      'quarterBestCase': quarterBestCase ?? bestCase,
      'quarterCommit': quarterCommit ?? committed,
      'confidence': confidence,
      'opportunityCount': opportunityCount,
      'monthly': monthly,
    };
  }

  double get attainmentPct => quota != null && quota! > 0
      ? (closed / quota! * 100)
      : (target > 0 ? (closed / target * 100) : 0);
  double get commitPct => quota != null && quota! > 0
      ? (committed / quota! * 100)
      : (target > 0 ? (committed / target * 100) : 0);
  double get gapToTarget => (quota ?? target) - closed;
}

/// Forecast service provider
final forecastServiceProvider = Provider<ForecastService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return ForecastService(api, authMode);
});

/// Selected forecast period notifier
class SelectedForecastPeriodNotifier extends Notifier<ForecastPeriod> {
  @override
  ForecastPeriod build() => ForecastPeriod.THIS_QUARTER;

  void select(ForecastPeriod period) => state = period;
}

/// Selected forecast period provider
final selectedForecastPeriodProvider =
    NotifierProvider<SelectedForecastPeriodNotifier, ForecastPeriod>(
  SelectedForecastPeriodNotifier.new,
);

/// Forecast data provider
final forecastProvider = FutureProvider.autoDispose<ForecastModel>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(forecastServiceProvider);
  final period = ref.watch(selectedForecastPeriodProvider);
  return service.getForecast(period);
});

/// Rep forecasts provider
final repForecastsProvider = FutureProvider.autoDispose<List<ForecastModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(forecastServiceProvider);
  return service.getRepForecasts();
});

/// Service for forecast data
class ForecastService {
  final ApiClient _api;

  ForecastService(this._api, AuthMode _);

  /// Get forecast for a given period
  Future<ForecastModel> getForecast(ForecastPeriod period) async {
    try {
      final response = await _api.get(
        '/forecast',
        queryParameters: {'period': period.value},
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return ForecastModel.fromJson(data);
      }
    } catch (_) {
      // Return default
    }
    return ForecastModel(
      period: period.label,
      target: 500000,
      committed: 320000,
      bestCase: 420000,
      pipeline: 680000,
      closed: 185000,
      quota: 500000,
      quarterName: period.label,
    );
  }

  /// Get forecasts broken down by sales rep
  Future<List<ForecastModel>> getRepForecasts() async {
    try {
      final response = await _api.get('/forecast/reps');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      }

      return items
          .map((item) => ForecastModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
