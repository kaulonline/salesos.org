import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/performance_narrative.dart';
import '../network/api_client.dart';

/// Provider for the performance narrative service
final performanceNarrativeServiceProvider =
    Provider<PerformanceNarrativeService>((ref) {
  final api = ref.watch(apiClientProvider);
  return PerformanceNarrativeService(api);
});

/// Service for generating AI-powered sales performance narratives
class PerformanceNarrativeService {
  final ApiClient _api;

  PerformanceNarrativeService(this._api);

  /// Generate AI narrative for sales performance data
  ///
  /// [period] - The time period label (e.g., "Q3 2024", "FY 2024")
  /// [pipelineValue] - Total pipeline value
  /// [wonValue] - Total won/closed value
  /// [dealCount] - Number of active deals
  /// [quotaAttainment] - Quota attainment as decimal (0.0 - 1.0)
  /// [pipelineData] - Pipeline stage breakdown
  /// [trendData] - Revenue trend data by month
  Future<PerformanceNarrative> generateNarrative({
    required String period,
    required double pipelineValue,
    required double wonValue,
    required int dealCount,
    required double quotaAttainment,
    required List<Map<String, dynamic>> pipelineData,
    required List<Map<String, dynamic>> trendData,
  }) async {
    try {
      final response = await _api.post(
        '/ai/performance-narrative',
        data: {
          'period': period,
          'metrics': {
            'pipelineValue': pipelineValue,
            'wonValue': wonValue,
            'dealCount': dealCount,
            'quotaAttainment': quotaAttainment,
          },
          'pipelineStages': pipelineData,
          'revenueTrend': trendData,
        },
      );

      final data = response.data as Map<String, dynamic>;
      return PerformanceNarrative.fromJson(data);
    } catch (e) {
      // Fall back to locally generated narrative if API fails
      return _generateLocalNarrative(
        period: period,
        pipelineValue: pipelineValue,
        wonValue: wonValue,
        dealCount: dealCount,
        quotaAttainment: quotaAttainment,
        pipelineData: pipelineData,
        trendData: trendData,
      );
    }
  }

  /// Generate a local narrative when API is unavailable
  /// This provides a reasonable fallback with basic analysis
  PerformanceNarrative _generateLocalNarrative({
    required String period,
    required double pipelineValue,
    required double wonValue,
    required int dealCount,
    required double quotaAttainment,
    required List<Map<String, dynamic>> pipelineData,
    required List<Map<String, dynamic>> trendData,
  }) {
    final highlights = <NarrativeHighlight>[];

    // Pipeline analysis
    if (pipelineValue > 0) {
      highlights.add(NarrativeHighlight(
        text:
            'Your pipeline is valued at ${_formatCurrency(pipelineValue)} across $dealCount active deals',
        type: HighlightType.neutral,
        metric: _formatCurrency(pipelineValue),
      ));
    }

    // Won value analysis
    if (wonValue > 0) {
      final winRate = pipelineValue > 0 ? (wonValue / pipelineValue * 100) : 0.0;
      highlights.add(NarrativeHighlight(
        text:
            'Closed-won revenue of ${_formatCurrency(wonValue)} represents a ${winRate.toStringAsFixed(0)}% conversion rate',
        type: HighlightType.positive,
        metric: _formatCurrency(wonValue),
        changePercent: winRate,
      ));
    }

    // Quota analysis
    final quotaPercent = (quotaAttainment * 100).round();
    if (quotaAttainment >= 0.8) {
      highlights.add(NarrativeHighlight(
        text: 'Quota attainment at $quotaPercent% — on track to meet target',
        type: HighlightType.positive,
        metric: '$quotaPercent%',
      ));
    } else if (quotaAttainment >= 0.5) {
      highlights.add(NarrativeHighlight(
        text:
            'Quota attainment at $quotaPercent% — focus on advancing deals in negotiation',
        type: HighlightType.attention,
        metric: '$quotaPercent%',
      ));
    } else {
      highlights.add(NarrativeHighlight(
        text:
            'Quota attainment at $quotaPercent% — consider pipeline acceleration strategies',
        type: HighlightType.attention,
        metric: '$quotaPercent%',
      ));
    }

    // Pipeline stage analysis
    if (pipelineData.isNotEmpty) {
      final negotiationDeals = pipelineData
          .where((s) =>
              s['stageName']?.toString().toLowerCase().contains('negotiation') ==
              true)
          .fold<int>(0, (sum, s) => sum + ((s['count'] as num?) ?? 0).toInt());

      if (negotiationDeals > 0) {
        highlights.add(NarrativeHighlight(
          text:
              '$negotiationDeals deal${negotiationDeals > 1 ? 's' : ''} in negotiation stage — prioritize for closure',
          type: HighlightType.insight,
        ));
      }
    }

    // Trend analysis
    if (trendData.length >= 2) {
      final recent = (trendData.last['value'] as num?)?.toDouble() ?? 0;
      final previous =
          (trendData[trendData.length - 2]['value'] as num?)?.toDouble() ?? 0;

      if (previous > 0) {
        final trendChange = ((recent - previous) / previous * 100);
        if (trendChange > 0) {
          highlights.add(NarrativeHighlight(
            text:
                'Revenue trend shows ${trendChange.toStringAsFixed(0)}% growth month-over-month',
            type: HighlightType.positive,
            changePercent: trendChange,
          ));
        } else if (trendChange < -10) {
          highlights.add(NarrativeHighlight(
            text:
                'Revenue trend declined ${trendChange.abs().toStringAsFixed(0)}% — review pipeline health',
            type: HighlightType.attention,
            changePercent: trendChange,
          ));
        }
      }
    }

    // Build full narrative
    final narrativeParts = <String>[];

    narrativeParts.add(
        'Your $period performance shows a pipeline valued at ${_formatCurrency(pipelineValue)} with $dealCount active opportunities.');

    if (wonValue > 0) {
      narrativeParts.add(
          'You have closed ${_formatCurrency(wonValue)} in revenue this period.');
    }

    if (quotaAttainment >= 0.8) {
      narrativeParts.add(
          'Quota attainment is strong at $quotaPercent%, keeping you on track for your targets.');
    } else {
      narrativeParts.add(
          'Quota attainment sits at $quotaPercent%. Focus on advancing deals through the pipeline to improve this metric.');
    }

    if (pipelineData.isNotEmpty) {
      final topStage = pipelineData.reduce((a, b) =>
          ((a['value'] as num?) ?? 0) > ((b['value'] as num?) ?? 0) ? a : b);
      narrativeParts.add(
          'The ${topStage['stageName'] ?? 'early'} stage holds the most value in your pipeline.');
    }

    narrativeParts.add(
        'Continue focusing on high-value opportunities and maintain regular engagement with prospects in later stages.');

    return PerformanceNarrative(
      periodLabel: period,
      summary: quotaAttainment >= 0.8
          ? 'Strong performance with on-track quota attainment'
          : 'Steady progress with opportunity for acceleration',
      highlights: highlights,
      fullNarrative: narrativeParts.join(' '),
      generatedAt: DateTime.now(),
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(0)}K';
    }
    return '\$${value.toStringAsFixed(0)}';
  }
}
