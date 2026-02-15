import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Revenue data point
class RevenueDataPoint {
  final String label;
  final double value;

  const RevenueDataPoint({
    required this.label,
    required this.value,
  });
}

/// Revenue breakdown item
class RevenueBreakdownItem {
  final String name;
  final double value;
  final Color color;

  const RevenueBreakdownItem({
    required this.name,
    required this.value,
    required this.color,
  });
}

/// Revenue report with bar chart and breakdown
class RevenueReport extends StatefulWidget {
  final List<RevenueDataPoint> periodData;
  final List<RevenueBreakdownItem> breakdown;
  final String? title;

  const RevenueReport({
    super.key,
    required this.periodData,
    this.breakdown = const [],
    this.title,
  });

  @override
  State<RevenueReport> createState() => _RevenueReportState();
}

class _RevenueReportState extends State<RevenueReport> {
  int _touchedIndex = -1;

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(0)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (widget.periodData.isEmpty) {
      return LuxuryCard(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: Column(
              children: [
                Icon(
                  Iconsax.dollar_circle,
                  size: 48,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(height: 12),
                Text(
                  'No revenue data available',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final maxValue = widget.periodData.fold<double>(
      0,
      (max, p) => p.value > max ? p.value : max,
    );
    final totalRevenue = widget.periodData.fold<double>(0, (sum, p) => sum + p.value);

    return Column(
      children: [
        // Revenue by period chart
        LuxuryCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Iconsax.dollar_circle, size: 20, color: LuxuryColors.champagneGold),
                  const SizedBox(width: 10),
                  Text(
                    widget.title ?? 'Revenue by Period',
                    style: IrisTheme.titleMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatAmount(totalRevenue),
                    style: IrisTheme.labelMedium.copyWith(
                      color: LuxuryColors.rolexGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              SizedBox(
                height: 200,
                child: BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: maxValue * 1.2,
                    barTouchData: BarTouchData(
                      touchCallback: (event, response) {
                        setState(() {
                          if (response != null && response.spot != null) {
                            _touchedIndex = response.spot!.touchedBarGroupIndex;
                          } else {
                            _touchedIndex = -1;
                          }
                        });
                      },
                      touchTooltipData: BarTouchTooltipData(
                        getTooltipColor: (_) =>
                            isDark ? LuxuryColors.obsidian : Colors.white,
                        tooltipBorder: BorderSide(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                        ),
                        tooltipBorderRadius: BorderRadius.circular(8),
                        getTooltipItem: (group, groupIndex, rod, rodIndex) {
                          final dp = widget.periodData[group.x.toInt()];
                          return BarTooltipItem(
                            '${dp.label}\n${_formatAmount(dp.value)}',
                            IrisTheme.labelSmall.copyWith(
                              color: isDark ? Colors.white : LuxuryColors.textOnLight,
                            ),
                          );
                        },
                      ),
                    ),
                    titlesData: FlTitlesData(
                      show: true,
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 48,
                          getTitlesWidget: (value, meta) {
                            return Text(
                              _formatAmount(value),
                              style: IrisTheme.caption.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextTertiary
                                    : IrisTheme.lightTextTertiary,
                              ),
                            );
                          },
                        ),
                      ),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 32,
                          getTitlesWidget: (value, meta) {
                            final idx = value.toInt();
                            if (idx < 0 || idx >= widget.periodData.length) {
                              return const SizedBox.shrink();
                            }
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                widget.periodData[idx].label,
                                style: IrisTheme.caption.copyWith(
                                  color: isDark
                                      ? IrisTheme.darkTextSecondary
                                      : IrisTheme.lightTextSecondary,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: maxValue > 0 ? maxValue / 4 : 1,
                      getDrawingHorizontalLine: (value) {
                        return FlLine(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.06)
                              : Colors.black.withValues(alpha: 0.06),
                          strokeWidth: 1,
                        );
                      },
                    ),
                    barGroups: List.generate(widget.periodData.length, (index) {
                      final isTouched = index == _touchedIndex;
                      return BarChartGroupData(
                        x: index,
                        barRods: [
                          BarChartRodData(
                            toY: widget.periodData[index].value,
                            color: isTouched
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.rolexGreen,
                            width: widget.periodData.length > 8 ? 16 : 28,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(6),
                            ),
                          ),
                        ],
                      );
                    }),
                  ),
                ),
              ).animate().fadeIn(duration: 500.ms, delay: 200.ms),
            ],
          ),
        ),

        // Breakdown section
        if (widget.breakdown.isNotEmpty) ...[
          const SizedBox(height: 16),
          LuxuryCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Iconsax.chart_2, size: 20, color: LuxuryColors.champagneGold),
                    const SizedBox(width: 10),
                    Text(
                      'Revenue Breakdown',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ...widget.breakdown.asMap().entries.map((entry) {
                  final item = entry.value;
                  final pct = totalRevenue > 0 ? item.value / totalRevenue : 0.0;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: item.color,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  item.name,
                                  style: IrisTheme.bodySmall.copyWith(
                                    color: isDark
                                        ? IrisTheme.darkTextPrimary
                                        : IrisTheme.lightTextPrimary,
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              _formatAmount(item.value),
                              style: IrisTheme.labelSmall.copyWith(
                                color: item.color,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        LuxuryProgress(
                          value: pct,
                          color: item.color,
                          height: 4,
                        ),
                      ],
                    ),
                  ).animate(delay: (entry.key * 80).ms).fadeIn().slideX(begin: 0.05);
                }),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
