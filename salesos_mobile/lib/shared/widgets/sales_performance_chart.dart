import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/theme.dart';
import '../../core/services/performance_narrative_service.dart';
import 'ai_insights_crown_button.dart';
import 'luxury_card.dart';
import 'performance_narrative_sheet.dart';

/// Sales Performance Chart Widget
/// A beautiful, animated chart showing key sales KPIs with luxury styling
/// Includes AI-powered performance narrative feature
class SalesPerformanceChart extends ConsumerStatefulWidget {
  final List<PipelineStageData> pipelineData;
  final List<SalesTrendData> trendData;
  final double quotaAttainment;
  final double totalPipelineValue;
  final double wonValue;
  final int activeDeals;

  const SalesPerformanceChart({
    super.key,
    required this.pipelineData,
    required this.trendData,
    this.quotaAttainment = 0.75,
    this.totalPipelineValue = 0,
    this.wonValue = 0,
    this.activeDeals = 0,
  });

  @override
  ConsumerState<SalesPerformanceChart> createState() =>
      _SalesPerformanceChartState();
}

/// Time period options for the chart
enum ChartTimePeriod { q1, q2, q3, q4, fy }

class _SalesPerformanceChartState extends ConsumerState<SalesPerformanceChart>
    with SingleTickerProviderStateMixin {
  int touchedIndex = -1;
  late AnimationController _animationController;
  late Animation<double> _animation;
  ChartTimePeriod _selectedPeriod = ChartTimePeriod.fy;
  late int _selectedYear;

  // AI Narrative state
  bool _isLoadingNarrative = false;

  @override
  void initState() {
    super.initState();
    _selectedYear = DateTime.now().year;
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    );
    _animationController.forward();
  }

  /// Get filtered trend data based on selected period and year
  List<SalesTrendData> get _filteredTrendData {
    if (widget.trendData.isEmpty) return [];

    // Define quarter month ranges
    const quarterMonths = {
      ChartTimePeriod.q1: [1, 2, 3],
      ChartTimePeriod.q2: [4, 5, 6],
      ChartTimePeriod.q3: [7, 8, 9],
      ChartTimePeriod.q4: [10, 11, 12],
    };

    // First filter by year if year data is available
    var filteredData = widget.trendData.where((data) {
      // If no year data, include all (backwards compatible)
      if (data.year == null) return true;
      return data.year == _selectedYear;
    }).toList();

    if (_selectedPeriod == ChartTimePeriod.fy) {
      return filteredData;
    }

    final months = quarterMonths[_selectedPeriod] ?? [];
    return filteredData.where((data) {
      // Match by month label (Jan, Feb, etc.)
      final monthIndex = _getMonthIndex(data.label);
      return months.contains(monthIndex);
    }).toList();
  }

  int _getMonthIndex(String label) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final index = months.indexOf(label);
    return index >= 0 ? index + 1 : 0;
  }

  String _getPeriodLabel(ChartTimePeriod period, {bool includeYear = false}) {
    final periodName = switch (period) {
      ChartTimePeriod.q1 => 'Q1',
      ChartTimePeriod.q2 => 'Q2',
      ChartTimePeriod.q3 => 'Q3',
      ChartTimePeriod.q4 => 'Q4',
      ChartTimePeriod.fy => 'FY',
    };
    if (includeYear) {
      return '$periodName $_selectedYear';
    }
    return periodName;
  }

  /// Get the available years from trend data
  List<int> get _availableYears {
    final years = widget.trendData
        .where((d) => d.year != null)
        .map((d) => d.year!)
        .toSet()
        .toList();
    if (years.isEmpty) {
      // Default to current year if no year data
      return [DateTime.now().year];
    }
    years.sort();
    return years;
  }

  /// Check if we can navigate to previous year
  bool get _canGoPreviousYear {
    final years = _availableYears;
    return years.isNotEmpty && _selectedYear > years.first;
  }

  /// Check if we can navigate to next year
  bool get _canGoNextYear {
    final years = _availableYears;
    return years.isNotEmpty && _selectedYear < years.last;
  }

  Widget _buildYearSelector(bool isDark) {
    return Container(
      height: 36,
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.richBlack.withValues(alpha: 0.5)
            : LuxuryColors.platinum.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Previous year button
          GestureDetector(
            onTap: _canGoPreviousYear
                ? () {
                    HapticFeedback.lightImpact();
                    setState(() => _selectedYear--);
                  }
                : null,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Icon(
                Icons.chevron_left_rounded,
                size: 20,
                color: _canGoPreviousYear
                    ? (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary)
                    : (isDark
                        ? IrisTheme.darkTextSecondary.withValues(alpha: 0.3)
                        : IrisTheme.lightTextSecondary.withValues(alpha: 0.3)),
              ),
            ),
          ),
          // Year display
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              '$_selectedYear',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.champagneGold,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          // Next year button
          GestureDetector(
            onTap: _canGoNextYear
                ? () {
                    HapticFeedback.lightImpact();
                    setState(() => _selectedYear++);
                  }
                : null,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: _canGoNextYear
                    ? (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary)
                    : (isDark
                        ? IrisTheme.darkTextSecondary.withValues(alpha: 0.3)
                        : IrisTheme.lightTextSecondary.withValues(alpha: 0.3)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodToggle(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Year selector on the left
        _buildYearSelector(isDark),
        const SizedBox(width: 12),
        // Period toggle on the right (Q1, Q2, etc.)
        Flexible(
          child: Container(
            height: 36,
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.richBlack.withValues(alpha: 0.5)
                  : LuxuryColors.platinum.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: ChartTimePeriod.values.map((period) {
                final isSelected = _selectedPeriod == period;
                return GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() {
                      _selectedPeriod = period;
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? LuxuryColors.rolexGreen
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _getPeriodLabel(period),
                      style: IrisTheme.labelSmall.copyWith(
                        color: isSelected
                            ? Colors.white
                            : isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  /// Show the AI-generated performance narrative
  Future<void> _showNarrativeSheet() async {
    if (_isLoadingNarrative) return;

    setState(() => _isLoadingNarrative = true);
    HapticFeedback.lightImpact();

    try {
      final narrativeService = ref.read(performanceNarrativeServiceProvider);

      // Convert pipeline data to API format
      final pipelineDataMaps = widget.pipelineData
          .map<Map<String, dynamic>>((stage) => <String, dynamic>{
                'stageName': stage.stageName,
                'shortName': stage.shortName,
                'value': stage.value,
                'count': stage.count,
              })
          .toList();

      // Convert trend data to API format
      final trendDataMaps = widget.trendData
          .map<Map<String, dynamic>>((trend) => <String, dynamic>{
                'label': trend.label,
                'value': trend.value,
              })
          .toList();

      // Generate the narrative
      final narrative = await narrativeService.generateNarrative(
        period: _getPeriodLabel(_selectedPeriod, includeYear: true),
        pipelineValue: widget.totalPipelineValue,
        wonValue: widget.wonValue,
        dealCount: widget.activeDeals,
        quotaAttainment: widget.quotaAttainment,
        pipelineData: pipelineDataMaps,
        trendData: trendDataMaps,
      );

      if (mounted) {
        setState(() => _isLoadingNarrative = false);

        // Show the narrative sheet
        await showPerformanceNarrativeSheet(
          context,
          narrative: narrative,
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingNarrative = false);
        // Optionally show error snackbar
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Unable to generate narrative: $e'),
            backgroundColor: LuxuryColors.champagneGold,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Handle case where there's no pipeline data
    if (widget.pipelineData.isEmpty) {
      return LuxuryCard(
        variant: LuxuryCardVariant.elevated,
        tier: LuxuryTier.gold,
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Sales Performance',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'No pipeline data available yet. Close some deals to see your performance chart!',
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return LuxuryCard(
      variant: LuxuryCardVariant.elevated,
      tier: LuxuryTier.gold,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sales Performance',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Pipeline & Revenue Trends',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AiInsightsCrownButton(
                      onTap: _showNarrativeSheet,
                      isLoading: _isLoadingNarrative,
                      periodLabel: _getPeriodLabel(_selectedPeriod, includeYear: true),
                    ),
                    const SizedBox(width: 12),
                    _buildQuotaIndicator(isDark),
                  ],
                ),
              ],
            ),
          ).animate().fadeIn(delay: 100.ms),

          const SizedBox(height: 12),

          // Time Period Toggle
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _buildPeriodToggle(isDark),
          ).animate().fadeIn(delay: 150.ms),

          const SizedBox(height: 16),

          // Key Metrics Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                _buildMetricChip(
                  label: 'Pipeline',
                  value: _formatCurrency(widget.totalPipelineValue),
                  color: LuxuryColors.rolexGreen,
                  isDark: isDark,
                ),
                const SizedBox(width: 12),
                _buildMetricChip(
                  label: 'Won',
                  value: _formatCurrency(widget.wonValue),
                  color: LuxuryColors.champagneGold,
                  isDark: isDark,
                ),
                const SizedBox(width: 12),
                _buildMetricChip(
                  label: 'Deals',
                  value: '${widget.activeDeals}',
                  color: LuxuryColors.jadePremium,
                  isDark: isDark,
                ),
              ],
            ),
          ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.1),

          const SizedBox(height: 24),

          // Pipeline Funnel Chart
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: SizedBox(
              height: 200,
              child: AnimatedBuilder(
                animation: _animation,
                builder: (context, child) {
                  return BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: _getMaxPipelineValue() * 1.2,
                      barTouchData: BarTouchData(
                        enabled: true,
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipColor: (_) => isDark
                              ? LuxuryColors.obsidian
                              : Colors.white,
                          tooltipPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          tooltipMargin: 8,
                          getTooltipItem: (group, groupIndex, rod, rodIndex) {
                            final stage = widget.pipelineData[group.x.toInt()];
                            return BarTooltipItem(
                              '${stage.stageName}\n',
                              IrisTheme.labelSmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                              children: [
                                TextSpan(
                                  text: _formatCurrency(stage.value),
                                  style: IrisTheme.titleSmall.copyWith(
                                    color: LuxuryColors.rolexGreen,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                TextSpan(
                                  text: '\n${stage.count} deals',
                                  style: IrisTheme.labelSmall.copyWith(
                                    color: isDark
                                        ? IrisTheme.darkTextSecondary
                                        : IrisTheme.lightTextSecondary,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        touchCallback: (event, response) {
                          setState(() {
                            if (response == null || response.spot == null) {
                              touchedIndex = -1;
                              return;
                            }
                            touchedIndex = response.spot!.touchedBarGroupIndex;
                          });
                        },
                      ),
                      titlesData: FlTitlesData(
                        show: true,
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (value, meta) {
                              if (value.toInt() >= widget.pipelineData.length) {
                                return const SizedBox();
                              }
                              final stage =
                                  widget.pipelineData[value.toInt()];
                              return Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  stage.shortName,
                                  style: IrisTheme.labelSmall.copyWith(
                                    color: isDark
                                        ? IrisTheme.darkTextSecondary
                                        : IrisTheme.lightTextSecondary,
                                    fontSize: 10,
                                  ),
                                ),
                              );
                            },
                            reservedSize: 32,
                          ),
                        ),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 50,
                            getTitlesWidget: (value, meta) {
                              return Text(
                                _formatShortCurrency(value),
                                style: IrisTheme.labelSmall.copyWith(
                                  color: isDark
                                      ? IrisTheme.darkTextSecondary
                                          .withValues(alpha: 0.5)
                                      : IrisTheme.lightTextSecondary
                                          .withValues(alpha: 0.5),
                                  fontSize: 9,
                                ),
                              );
                            },
                          ),
                        ),
                        topTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                      ),
                      borderData: FlBorderData(show: false),
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: (_getMaxPipelineValue() / 4).clamp(1, double.infinity),
                        getDrawingHorizontalLine: (value) {
                          return FlLine(
                            color: isDark
                                ? LuxuryColors.platinum.withValues(alpha: 0.08)
                                : LuxuryColors.richBlack.withValues(alpha: 0.05),
                            strokeWidth: 1,
                          );
                        },
                      ),
                      barGroups: _buildBarGroups(isDark),
                    ),
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeOutCubic,
                  );
                },
              ),
            ),
          ).animate().fadeIn(delay: 300.ms),

          const SizedBox(height: 24),

          // Sales Trend Line Chart (filtered by selected period)
          if (_filteredTrendData.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Revenue Trend (${_getPeriodLabel(_selectedPeriod, includeYear: true)})',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ).animate().fadeIn(delay: 400.ms),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: SizedBox(
                height: 120,
                child: LineChart(
                  LineChartData(
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: (_getMaxTrendValue() / 3).clamp(1, double.infinity),
                      getDrawingHorizontalLine: (value) {
                        return FlLine(
                          color: isDark
                              ? LuxuryColors.platinum.withValues(alpha: 0.05)
                              : LuxuryColors.richBlack.withValues(alpha: 0.03),
                          strokeWidth: 1,
                        );
                      },
                    ),
                    titlesData: FlTitlesData(
                      show: true,
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 24,
                          interval: (_filteredTrendData.length / 4)
                              .ceilToDouble()
                              .clamp(1, double.infinity),
                          getTitlesWidget: (value, meta) {
                            final index = value.toInt();
                            if (index >= _filteredTrendData.length || index < 0) {
                              return const SizedBox();
                            }
                            return Text(
                              _filteredTrendData[index].displayLabel,
                              style: IrisTheme.labelSmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                        .withValues(alpha: 0.6)
                                    : IrisTheme.lightTextSecondary
                                        .withValues(alpha: 0.6),
                                fontSize: 9,
                              ),
                            );
                          },
                        ),
                      ),
                      leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                    ),
                    borderData: FlBorderData(show: false),
                    lineBarsData: [
                      LineChartBarData(
                        spots: _filteredTrendData.asMap().entries.map((e) {
                          return FlSpot(e.key.toDouble(), e.value.value);
                        }).toList(),
                        isCurved: true,
                        curveSmoothness: 0.3,
                        color: LuxuryColors.rolexGreen,
                        barWidth: 3,
                        isStrokeCapRound: true,
                        dotData: FlDotData(
                          show: true,
                          getDotPainter: (spot, percent, barData, index) {
                            return FlDotCirclePainter(
                              radius: 4,
                              color: LuxuryColors.rolexGreen,
                              strokeWidth: 2,
                              strokeColor: isDark
                                  ? LuxuryColors.obsidian
                                  : Colors.white,
                            );
                          },
                        ),
                        belowBarData: BarAreaData(
                          show: true,
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                              LuxuryColors.rolexGreen.withValues(alpha: 0.0),
                            ],
                          ),
                        ),
                      ),
                    ],
                    lineTouchData: LineTouchData(
                      enabled: true,
                      touchTooltipData: LineTouchTooltipData(
                        getTooltipColor: (_) =>
                            isDark ? LuxuryColors.obsidian : Colors.white,
                        tooltipPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        getTooltipItems: (touchedSpots) {
                          return touchedSpots.map((spot) {
                            return LineTooltipItem(
                              _formatCurrency(spot.y),
                              IrisTheme.labelMedium.copyWith(
                                color: LuxuryColors.rolexGreen,
                                fontWeight: FontWeight.bold,
                              ),
                            );
                          }).toList();
                        },
                      ),
                    ),
                  ),
                  duration: const Duration(milliseconds: 800),
                  curve: Curves.easeOutCubic,
                ),
              ),
            ).animate().fadeIn(delay: 500.ms),
          ],

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildQuotaIndicator(bool isDark) {
    final percentage = (widget.quotaAttainment * 100).round();
    final isOnTrack = widget.quotaAttainment >= 0.8;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isOnTrack
              ? [
                  LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                  LuxuryColors.deepEmerald.withValues(alpha: 0.1),
                ]
              : [
                  LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  LuxuryColors.warmGold.withValues(alpha: 0.1),
                ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isOnTrack
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.3)
              : LuxuryColors.champagneGold.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 36,
            height: 36,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: widget.quotaAttainment.clamp(0, 1),
                  strokeWidth: 3,
                  backgroundColor: isDark
                      ? LuxuryColors.platinum.withValues(alpha: 0.1)
                      : LuxuryColors.richBlack.withValues(alpha: 0.05),
                  valueColor: AlwaysStoppedAnimation(
                    isOnTrack
                        ? LuxuryColors.rolexGreen
                        : LuxuryColors.champagneGold,
                  ),
                ),
                Text(
                  '$percentage%',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isOnTrack
                        ? LuxuryColors.rolexGreen
                        : LuxuryColors.champagneGold,
                    fontWeight: FontWeight.bold,
                    fontSize: 9,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Quota',
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                  fontSize: 10,
                ),
              ),
              Text(
                isOnTrack ? 'On Track' : 'Behind',
                style: IrisTheme.labelSmall.copyWith(
                  color: isOnTrack
                      ? LuxuryColors.rolexGreen
                      : LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricChip({
    required String label,
    required String value,
    required Color color,
    required bool isDark,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.2),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: IrisTheme.labelSmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
                fontSize: 10,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: IrisTheme.titleSmall.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<BarChartGroupData> _buildBarGroups(bool isDark) {
    return widget.pipelineData.asMap().entries.map((entry) {
      final index = entry.key;
      final data = entry.value;
      final isTouched = touchedIndex == index;

      // Gradient colors for the bars - getting progressively darker
      final colors = [
        LuxuryColors.jadePremium,
        LuxuryColors.rolexGreen,
        LuxuryColors.deepEmerald,
        const Color(0xFF054D35),
        const Color(0xFF043D2A),
      ];

      final barColor = colors[index % colors.length];

      return BarChartGroupData(
        x: index,
        barRods: [
          BarChartRodData(
            toY: data.value * _animation.value,
            width: isTouched ? 24 : 20,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [
                barColor,
                barColor.withValues(alpha: 0.8),
              ],
            ),
            backDrawRodData: BackgroundBarChartRodData(
              show: true,
              toY: _getMaxPipelineValue() * 1.2,
              color: isDark
                  ? LuxuryColors.platinum.withValues(alpha: 0.05)
                  : LuxuryColors.richBlack.withValues(alpha: 0.03),
            ),
          ),
        ],
      );
    }).toList();
  }

  double _getMaxPipelineValue() {
    if (widget.pipelineData.isEmpty) return 100000;
    return widget.pipelineData
        .map((e) => e.value)
        .reduce((a, b) => a > b ? a : b);
  }

  double _getMaxTrendValue() {
    if (_filteredTrendData.isEmpty) return 100000;
    return _filteredTrendData.map((e) => e.value).reduce((a, b) => a > b ? a : b);
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(0)}K';
    }
    return '\$${value.toStringAsFixed(0)}';
  }

  String _formatShortCurrency(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(0)}K';
    }
    return value.toStringAsFixed(0);
  }
}

/// Data class for pipeline stage information
class PipelineStageData {
  final String stageName;
  final String shortName;
  final double value;
  final int count;

  const PipelineStageData({
    required this.stageName,
    required this.shortName,
    required this.value,
    required this.count,
  });
}

/// Data class for sales trend information
class SalesTrendData {
  final String label;
  final double value;
  final int? year;

  const SalesTrendData({
    required this.label,
    required this.value,
    this.year,
  });

  /// Returns label with year suffix when year differs from current year
  /// e.g., "Aug '25" for August 2025 when current year is 2026
  String get displayLabel {
    if (year == null) return label;
    final currentYear = DateTime.now().year;
    if (year == currentYear) return label;
    // Show abbreviated year for previous/future years
    return "$label '${year! % 100}";
  }
}

/// Default mock data for preview/demo purposes
class SalesPerformanceChartDefaults {
  static List<PipelineStageData> get pipelineData => const [
        PipelineStageData(
          stageName: 'Qualification',
          shortName: 'Qual',
          value: 450000,
          count: 24,
        ),
        PipelineStageData(
          stageName: 'Discovery',
          shortName: 'Disc',
          value: 380000,
          count: 18,
        ),
        PipelineStageData(
          stageName: 'Proposal',
          shortName: 'Prop',
          value: 290000,
          count: 12,
        ),
        PipelineStageData(
          stageName: 'Negotiation',
          shortName: 'Nego',
          value: 175000,
          count: 7,
        ),
        PipelineStageData(
          stageName: 'Closed Won',
          shortName: 'Won',
          value: 125000,
          count: 5,
        ),
      ];

  static List<SalesTrendData> get trendData => const [
        SalesTrendData(label: 'Jan', value: 85000),
        SalesTrendData(label: 'Feb', value: 92000),
        SalesTrendData(label: 'Mar', value: 78000),
        SalesTrendData(label: 'Apr', value: 110000),
        SalesTrendData(label: 'May', value: 125000),
        SalesTrendData(label: 'Jun', value: 145000),
      ];
}
