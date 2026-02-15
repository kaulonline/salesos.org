import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/services.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_error_boundary.dart';
import '../../../../shared/widgets/date_range_picker.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../../../core/providers/connectivity_provider.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../core/services/export_service.dart';
import '../widgets/report_detail_sheets.dart';
import '../widgets/export_dialog.dart';

/// Date range selection state provider - replaces the old period provider
final reportDateRangeProvider = NotifierProvider<ReportDateRangeNotifier, DateRangeSelection>(
  ReportDateRangeNotifier.new,
);

class ReportDateRangeNotifier extends Notifier<DateRangeSelection> {
  @override
  DateRangeSelection build() => DateRangeSelection.fromPreset(DateRangePreset.thisMonth);

  void setDateRange(DateRangeSelection selection) => state = selection;
}

/// Legacy period provider for backward compatibility
final reportPeriodProvider = Provider<String>((ref) {
  final dateRange = ref.watch(reportDateRangeProvider);
  return dateRange.preset.label;
});

/// Get date range from DateRangeSelection
(DateTime start, DateTime end) _getDateRangeFromSelection(DateRangeSelection selection) {
  return (selection.startDate, selection.endDate);
}

/// Check if a date string falls within the given range
bool _isDateInRange(String? dateStr, DateTime start, DateTime end) {
  if (dateStr == null) return false;
  final date = DateTime.tryParse(dateStr);
  if (date == null) return false;
  return !date.isBefore(start) && !date.isAfter(end);
}

/// Provider for report metrics data with date range filtering
final reportMetricsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final crmService = ref.watch(crmDataServiceProvider);
  final dateRangeSelection = ref.watch(reportDateRangeProvider);
  final (startDate, endDate) = _getDateRangeFromSelection(dateRangeSelection);
  final period = dateRangeSelection.formattedRange;

  // Fetch pipeline data and opportunities
  final pipeline = await crmService.getPipelineStats();
  final opportunities = await crmService.getOpportunities();
  final activities = await crmService.getActivities(limit: 200);

  // Filter opportunities by close date or created date within the period
  final filteredOpportunities = opportunities.where((o) {
    final closeDate = o['CloseDate'] as String? ?? o['closeDate'] as String?;
    final createdDate = o['CreatedDate'] as String? ?? o['createdAt'] as String?;
    return _isDateInRange(closeDate, startDate, endDate) ||
           _isDateInRange(createdDate, startDate, endDate);
  }).toList();

  // Filter activities by date within the period
  final filteredActivities = activities.where((a) {
    final activityDate = a['CreatedDate'] as String? ??
                         a['createdAt'] as String? ??
                         a['activityDate'] as String?;
    return _isDateInRange(activityDate, startDate, endDate);
  }).toList();

  // Calculate won deals and revenue from filtered opportunities
  // Handle various boolean formats from Salesforce (true, "true", 1)
  bool isWon(dynamic value) {
    if (value == null) return false;
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    if (value is num) return value == 1;
    return false;
  }

  final wonDeals = filteredOpportunities.where((o) {
    final stageName = (o['StageName'] as String? ?? o['stageName'] as String? ?? '').toLowerCase();
    return isWon(o['IsWon']) || stageName == 'closed won';
  }).toList();


  final totalRevenue = wonDeals.fold<double>(0, (sum, o) => sum + ((o['Amount'] as num?)?.toDouble() ?? 0));
  final totalDeals = filteredOpportunities.length;
  final winRate = totalDeals > 0 ? (wonDeals.length / totalDeals * 100).round() : 0;
  final avgDealSize = wonDeals.isNotEmpty ? totalRevenue / wonDeals.length : 0.0;

  // Count activities by type from filtered activities
  // Activity types: CALL, EMAIL, MEETING, TASK
  int calls = 0;
  int emails = 0;
  int meetings = 0;
  int tasks = 0;
  for (final activity in filteredActivities) {
    final type = (activity['type'] as String?)?.toUpperCase() ?? '';
    final subject = (activity['subject'] as String? ?? activity['title'] as String? ?? '').toLowerCase();

    // First check the type
    if (type == 'MEETING' || type == 'EVENT') {
      meetings++;
    } else if (type == 'CALL' || subject.contains('call')) {
      calls++;
    } else if (type == 'EMAIL' || subject.contains('email')) {
      emails++;
    } else if (subject.contains('meeting')) {
      meetings++;
    } else {
      // Count as task (general activities)
      tasks++;
    }
  }

  // If we have unclassified tasks, we still show them as "Tasks" activity
  // The Activity tab will show the breakdown


  return {
    'totalRevenue': totalRevenue,
    'wonDeals': wonDeals.length,
    'winRate': winRate,
    'avgDealSize': avgDealSize,
    'pipeline': pipeline,
    'opportunities': filteredOpportunities,
    'calls': calls,
    'emails': emails,
    'meetings': meetings,
    'tasks': tasks,
    'period': period,
    'startDate': startDate.toIso8601String(),
    'endDate': endDate.toIso8601String(),
    'dateRangeSelection': dateRangeSelection,
    'compareToPrevious': dateRangeSelection.compareToPrevious,
  };
});

class ReportsPage extends ConsumerStatefulWidget {
  const ReportsPage({super.key});

  @override
  ConsumerState<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends ConsumerState<ReportsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(reportMetricsProvider);
    ref.invalidate(crmPipelineStatsProvider);
    ref.invalidate(crmOpportunitiesProvider);
  }

  void _setDateRange(DateRangeSelection selection) {
    ref.read(reportDateRangeProvider.notifier).setDateRange(selection);
  }

  Future<void> _showDateRangePicker(BuildContext context) async {
    HapticFeedback.lightImpact();
    final currentSelection = ref.read(reportDateRangeProvider);
    final result = await showPremiumDateRangePicker(
      context: context,
      initialSelection: currentSelection,
      showCompareToggle: true,
      showAllTimeOption: true,
      presets: [
        DateRangePreset.today,
        DateRangePreset.yesterday,
        DateRangePreset.thisWeek,
        DateRangePreset.lastWeek,
        DateRangePreset.thisMonth,
        DateRangePreset.lastMonth,
        DateRangePreset.thisQuarter,
        DateRangePreset.yearToDate,
        DateRangePreset.allTime,
      ],
    );
    if (result != null) {
      _setDateRange(result);
    }
  }

  void _showExportDialog(BuildContext context) {
    final metricsAsync = ref.read(reportMetricsProvider);
    final dateRangeSelection = ref.read(reportDateRangeProvider);

    metricsAsync.whenData((metrics) {
      // Prepare report data for export
      final opportunities = metrics['opportunities'] as List<Map<String, dynamic>>? ?? [];
      final period = metrics['period'] as String? ?? 'This Month';

      HapticFeedback.mediumImpact();
      showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
        barrierColor: Colors.black54,
        transitionDuration: const Duration(milliseconds: 200),
        pageBuilder: (ctx, animation, secondaryAnimation) {
          return BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
            child: Center(
              child: ExportDialog(
                title: 'Export Report',
                subtitle: 'Export your $period report data',
                dataType: ExportDataType.opportunities,
                data: opportunities,
                filename: 'iris_report_${period.toLowerCase().replaceAll(' ', '_')}',
                exportTitle: 'SalesOS Sales Report - $period',
                initialStartDate: dateRangeSelection.startDate,
                initialEndDate: dateRangeSelection.endDate,
                showDateRangePicker: true,
                showEntityTypes: false,
              ),
            ),
          );
        },
        transitionBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final metricsAsync = ref.watch(reportMetricsProvider);
    final dateRangeSelection = ref.watch(reportDateRangeProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Reports',
        showBackButton: true,
        actions: [
          IrisAppBarAction(
            icon: Iconsax.export_1,
            tooltip: 'Export Report',
            tier: LuxuryTier.gold,
            onPressed: () {
              HapticFeedback.lightImpact();
              _showExportDialog(context);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        color: LuxuryColors.jadePremium,
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
              },
            ),

            // Date Range Header with Selected Range Display
            _buildDateRangeHeader(context, isDark, dateRangeSelection),

            // Tabs
            TabBar(
              controller: _tabController,
              labelColor: LuxuryColors.jadePremium,
              unselectedLabelColor: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              indicatorColor: LuxuryColors.rolexGreen,
              indicatorWeight: 3,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Pipeline'),
                Tab(text: 'Activity'),
              ],
            ).animate(delay: 100.ms).fadeIn(),

            // Tab Content
            Expanded(
              child: metricsAsync.when(
                loading: () => const IrisDashboardShimmer(),
                error: (e, _) => IrisErrorStateFactory.forAsyncError(e, _onRefresh),
                data: (metrics) => TabBarView(
                  controller: _tabController,
                  children: [
                    _OverviewTab(metrics: metrics),
                    _PipelineTab(metrics: metrics),
                    _ActivityTab(metrics: metrics),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateRangeHeader(BuildContext context, bool isDark, DateRangeSelection selection) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Date Range Picker Button
          Expanded(
            child: GestureDetector(
              onTap: () => _showDateRangePicker(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark
                      ? LuxuryColors.deepEmerald.withValues(alpha: 0.2)
                      : LuxuryColors.jadePremium.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: LuxuryColors.jadePremium.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Iconsax.calendar_1,
                        size: 18,
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Date Range',
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            selection.formattedRange,
                            style: IrisTheme.titleSmall.copyWith(
                              color: isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Iconsax.arrow_down_1,
                      size: 16,
                      color: LuxuryColors.jadePremium,
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Compare indicator (if enabled)
          if (selection.compareToPrevious) ...[
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Iconsax.chart_success5,
                    size: 14,
                    color: LuxuryColors.jadePremium,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'vs Prev',
                    style: IrisTheme.labelSmall.copyWith(
                      color: LuxuryColors.jadePremium,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _OverviewTab extends StatelessWidget {
  final Map<String, dynamic> metrics;

  const _OverviewTab({required this.metrics});

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final totalRevenue = (metrics['totalRevenue'] as num?)?.toDouble() ?? 0;
    final wonDeals = (metrics['wonDeals'] as num?)?.toInt() ?? 0;
    final winRate = (metrics['winRate'] as num?)?.toInt() ?? 0;
    final avgDealSize = (metrics['avgDealSize'] as num?)?.toDouble() ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary Cards
          Row(
            children: [
              Expanded(
                child: _SummaryCard(
                  title: 'Revenue',
                  value: _formatCurrency(totalRevenue),
                  icon: Iconsax.dollar_circle,
                  color: IrisTheme.success,
                  onTap: () => showRevenueDetails(context, metrics),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryCard(
                  title: 'Deals Won',
                  value: wonDeals.toString(),
                  icon: Iconsax.medal_star,
                  color: LuxuryColors.jadePremium,
                  onTap: () => showWonDealsDetails(context, metrics),
                ),
              ),
            ],
          ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _SummaryCard(
                  title: 'Win Rate',
                  value: '$winRate%',
                  icon: Iconsax.chart_2,
                  color: IrisTheme.info,
                  onTap: () => showWinRateDetails(context, metrics),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryCard(
                  title: 'Avg Deal Size',
                  value: _formatCurrency(avgDealSize),
                  icon: Iconsax.receipt,
                  color: IrisTheme.warning,
                  onTap: () => showAvgDealSizeDetails(context, metrics),
                ),
              ),
            ],
          ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),

          const SizedBox(height: 24),

          // Revenue Chart
          Text(
            'Pipeline Distribution',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),
          IrisCard(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 200,
              child: _buildPipelineChart(metrics, isDark),
            ),
          ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1),
        ],
      ),
    );
  }

  Widget _buildPipelineChart(Map<String, dynamic> metrics, bool isDark) {
    final pipeline = metrics['pipeline'] as Map<String, dynamic>? ?? {};
    final byStage = pipeline['byStage'] as Map<String, dynamic>? ?? {};

    if (byStage.isEmpty) {
      return Center(
        child: Text(
          'No pipeline data available',
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
      );
    }

    final spots = <FlSpot>[];
    final labels = <String>[];
    int index = 0;

    for (final entry in byStage.entries) {
      final value = (entry.value['value'] as num?)?.toDouble() ?? 0;
      spots.add(FlSpot(index.toDouble(), value / 1000)); // Convert to K
      labels.add(entry.key.substring(0, entry.key.length > 5 ? 5 : entry.key.length));
      index++;
    }

    if (spots.isEmpty) {
      return Center(
        child: Text(
          'No data to display',
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
      );
    }

    final maxY = spots.map((s) => s.y).reduce((a, b) => a > b ? a : b) * 1.2;

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY / 4,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                return Text(
                  '\$${value.toInt()}K',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < labels.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      labels[idx],
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        fontSize: 9,
                      ),
                    ),
                  );
                }
                return const SizedBox();
              },
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: LuxuryColors.jadePremium,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(
              show: true,
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
            ),
          ),
        ],
        minY: 0,
        maxY: maxY > 0 ? maxY : 100,
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap != null ? () {
        HapticFeedback.lightImpact();
        onTap!();
      } : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: color),
              ),
              if (onTap != null)
                Icon(
                  Iconsax.arrow_right_3,
                  size: 14,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: IrisTheme.headlineSmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _PipelineTab extends StatelessWidget {
  final Map<String, dynamic> metrics;

  const _PipelineTab({required this.metrics});

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pipeline = metrics['pipeline'] as Map<String, dynamic>? ?? {};
    final byStage = pipeline['byStage'] as Map<String, dynamic>? ?? {};
    final opportunities = metrics['opportunities'] as List<Map<String, dynamic>>? ?? [];

    // Build stages from actual data
    final stages = <Map<String, dynamic>>[];
    final stageColors = [
      IrisTheme.stageProspecting,
      IrisTheme.stageQualified,
      IrisTheme.stageProposal,
      IrisTheme.stageNegotiation,
      IrisTheme.stageClosedWon,
    ];

    int colorIndex = 0;
    for (final entry in byStage.entries) {
      final stageData = entry.value as Map<String, dynamic>? ?? {};
      final stageName = entry.key;

      // Get deals for this stage
      final stageDeals = opportunities.where((o) {
        final oStage = o['StageName'] as String? ?? o['stageName'] as String? ?? '';
        return oStage == stageName;
      }).toList();

      stages.add({
        'name': stageName,
        'count': stageData['count'] ?? 0,
        'value': _formatCurrency((stageData['value'] as num?)?.toDouble() ?? 0),
        'color': stageColors[colorIndex % stageColors.length],
        'deals': stageDeals,
      });
      colorIndex++;
    }

    final totalValue = (pipeline['totalPipelineValue'] as num?)?.toDouble() ?? 0;
    final totalDeals = (pipeline['openOpportunities'] as num?)?.toInt() ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Pipeline Summary
          IrisCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Pipeline',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatCurrency(totalValue),
                        style: IrisTheme.headlineMedium.copyWith(
                          color: LuxuryColors.jadePremium,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: IrisTheme.info.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$totalDeals deals',
                    style: IrisTheme.labelMedium.copyWith(
                      color: IrisTheme.info,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),

          const SizedBox(height: 20),

          // Pipeline Funnel
          Text(
            'Pipeline Stages',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),

          if (stages.isEmpty)
            IrisCard(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No pipeline data available',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
            )
          else
            ...stages.asMap().entries.map((entry) {
              final index = entry.key;
              final stage = entry.value;
              final stageName = stage['name'] as String;
              final stageDeals = stage['deals'] as List<Map<String, dynamic>>;
              return _PipelineStageCard(
                name: stageName,
                count: stage['count'] as int,
                value: stage['value'] as String,
                color: stage['color'] as Color,
                widthFactor: 1 - (index * 0.08).clamp(0, 0.5),
                onTap: () => showPipelineStageDetails(context, stageName, stageDeals),
              ).animate(delay: (200 + index * 50).ms).fadeIn().slideX(begin: 0.05);
            }),
        ],
      ),
    );
  }
}

class _PipelineStageCard extends StatelessWidget {
  final String name;
  final int count;
  final String value;
  final Color color;
  final double widthFactor;
  final VoidCallback? onTap;

  const _PipelineStageCard({
    required this.name,
    required this.count,
    required this.value,
    required this.color,
    required this.widthFactor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: FractionallySizedBox(
        widthFactor: widthFactor,
        child: GestureDetector(
          onTap: onTap != null ? () {
            HapticFeedback.lightImpact();
            onTap!();
          } : null,
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '$count deals',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      value,
                      style: IrisTheme.titleSmall.copyWith(
                        color: color,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (onTap != null) ...[
                      const SizedBox(width: 8),
                      Icon(
                        Iconsax.arrow_right_3,
                        size: 14,
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActivityTab extends StatelessWidget {
  final Map<String, dynamic> metrics;

  const _ActivityTab({required this.metrics});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final calls = (metrics['calls'] as num?)?.toInt() ?? 0;
    final emails = (metrics['emails'] as num?)?.toInt() ?? 0;
    final meetings = (metrics['meetings'] as num?)?.toInt() ?? 0;
    final tasks = (metrics['tasks'] as num?)?.toInt() ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Activity Summary - Row 1
          Row(
            children: [
              Expanded(
                child: _ActivityMetricCard(
                  icon: Iconsax.call,
                  label: 'Calls',
                  value: calls.toString(),
                  color: IrisTheme.info,
                  onTap: () => showActivityDetails(context, 'calls', calls, metrics),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActivityMetricCard(
                  icon: Iconsax.sms,
                  label: 'Emails',
                  value: emails.toString(),
                  color: IrisTheme.success,
                  onTap: () => showActivityDetails(context, 'emails', emails, metrics),
                ),
              ),
            ],
          ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),

          const SizedBox(height: 12),

          // Activity Summary - Row 2
          Row(
            children: [
              Expanded(
                child: _ActivityMetricCard(
                  icon: Iconsax.people,
                  label: 'Meetings',
                  value: meetings.toString(),
                  color: IrisTheme.warning,
                  onTap: () => showActivityDetails(context, 'meetings', meetings, metrics),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActivityMetricCard(
                  icon: Iconsax.task_square,
                  label: 'Tasks',
                  value: tasks.toString(),
                  color: LuxuryColors.jadePremium,
                  onTap: () => showActivityDetails(context, 'tasks', tasks, metrics),
                ),
              ),
            ],
          ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),

          const SizedBox(height: 24),

          // Activity Chart
          Text(
            'Activity Distribution',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),
          IrisCard(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 200,
              child: _buildActivityChart(calls, emails, meetings, tasks, isDark),
            ),
          ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1),

          const SizedBox(height: 16),

          // Legend
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 16,
            runSpacing: 8,
            children: [
              _LegendItem(color: IrisTheme.info, label: 'Calls'),
              _LegendItem(color: IrisTheme.success, label: 'Emails'),
              _LegendItem(color: IrisTheme.warning, label: 'Meetings'),
              _LegendItem(color: LuxuryColors.jadePremium, label: 'Tasks'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActivityChart(int calls, int emails, int meetings, int tasks, bool isDark) {
    final total = calls + emails + meetings + tasks;
    if (total == 0) {
      return Center(
        child: Text(
          'No activity data available',
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
      );
    }

    final sections = <PieChartSectionData>[];

    if (calls > 0) {
      sections.add(PieChartSectionData(
        value: calls.toDouble(),
        title: '${(calls / total * 100).toInt()}%',
        color: IrisTheme.info,
        radius: 40,
        titleStyle: IrisTheme.labelSmall.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ));
    }

    if (emails > 0) {
      sections.add(PieChartSectionData(
        value: emails.toDouble(),
        title: '${(emails / total * 100).toInt()}%',
        color: IrisTheme.success,
        radius: 40,
        titleStyle: IrisTheme.labelSmall.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ));
    }

    if (meetings > 0) {
      sections.add(PieChartSectionData(
        value: meetings.toDouble(),
        title: '${(meetings / total * 100).toInt()}%',
        color: IrisTheme.warning,
        radius: 40,
        titleStyle: IrisTheme.labelSmall.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ));
    }

    if (tasks > 0) {
      sections.add(PieChartSectionData(
        value: tasks.toDouble(),
        title: '${(tasks / total * 100).toInt()}%',
        color: LuxuryColors.jadePremium,
        radius: 40,
        titleStyle: IrisTheme.labelSmall.copyWith(
          color: Colors.black,
          fontWeight: FontWeight.w600,
        ),
      ));
    }

    return PieChart(
      PieChartData(
        sectionsSpace: 2,
        centerSpaceRadius: 50,
        sections: sections,
      ),
    );
  }
}

class _ActivityMetricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final VoidCallback? onTap;

  const _ActivityMetricCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      padding: const EdgeInsets.all(12),
      onTap: onTap != null ? () {
        HapticFeedback.lightImpact();
        onTap!();
      } : null,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: IrisTheme.headlineSmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: IrisTheme.labelSmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
      ],
    );
  }
}
