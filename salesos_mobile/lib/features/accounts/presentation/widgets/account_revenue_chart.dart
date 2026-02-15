import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Account revenue chart widget
/// Displays a bar chart showing revenue breakdown by product or quarter.
class AccountRevenueChart extends StatefulWidget {
  /// Revenue data map. Keys are labels (e.g., product names or quarters),
  /// values are revenue amounts.
  final Map<String, double> revenueData;

  /// Optional title override
  final String title;

  const AccountRevenueChart({
    super.key,
    required this.revenueData,
    this.title = 'Revenue Breakdown',
  });

  @override
  State<AccountRevenueChart> createState() => _AccountRevenueChartState();
}

class _AccountRevenueChartState extends State<AccountRevenueChart> {
  int _touchedIndex = -1;

  static const List<Color> _barColors = [
    LuxuryColors.rolexGreen,
    LuxuryColors.champagneGold,
    LuxuryColors.infoCobalt,
    LuxuryColors.roseGold,
    LuxuryColors.jadePremium,
    LuxuryColors.warningAmber,
    LuxuryColors.socialPurple,
    LuxuryColors.tealAccent,
  ];

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
    final entries = widget.revenueData.entries.toList();

    if (entries.isEmpty) {
      return LuxuryCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Icon(Iconsax.chart_2, size: 20, color: LuxuryColors.champagneGold),
                const SizedBox(width: 10),
                Text(
                  widget.title,
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),
            Icon(
              Iconsax.chart_1,
              size: 48,
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
            const SizedBox(height: 12),
            Text(
              'No revenue data available',
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      );
    }

    final maxValue = entries.fold<double>(
      0,
      (max, e) => e.value > max ? e.value : max,
    );

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                Iconsax.chart_2,
                size: 20,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 10),
              Text(
                widget.title,
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ).animate().fadeIn(duration: 300.ms),
          const SizedBox(height: 24),

          // Bar chart
          SizedBox(
            height: 220,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: maxValue * 1.2,
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) => isDark
                        ? LuxuryColors.obsidian
                        : Colors.white,
                    tooltipBorder: BorderSide(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                    ),
                    tooltipBorderRadius: BorderRadius.circular(8),
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      return BarTooltipItem(
                        '${entries[group.x.toInt()].key}\n',
                        IrisTheme.labelSmall.copyWith(
                          color: isDark ? Colors.white : LuxuryColors.textOnLight,
                        ),
                        children: [
                          TextSpan(
                            text: _formatAmount(entries[group.x.toInt()].value),
                            style: IrisTheme.titleSmall.copyWith(
                              color: _barColors[group.x.toInt() % _barColors.length],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  touchCallback: (event, response) {
                    setState(() {
                      if (response != null && response.spot != null) {
                        _touchedIndex = response.spot!.touchedBarGroupIndex;
                      } else {
                        _touchedIndex = -1;
                      }
                    });
                  },
                ),
                titlesData: FlTitlesData(
                  show: true,
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 50,
                      getTitlesWidget: (value, meta) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Text(
                            _formatAmount(value),
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextTertiary
                                  : IrisTheme.lightTextTertiary,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 36,
                      getTitlesWidget: (value, meta) {
                        final index = value.toInt();
                        if (index < 0 || index >= entries.length) {
                          return const SizedBox.shrink();
                        }
                        final label = entries[index].key;
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            label.length > 8 ? '${label.substring(0, 7)}...' : label,
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                            textAlign: TextAlign.center,
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
                barGroups: List.generate(entries.length, (index) {
                  final isTouched = index == _touchedIndex;
                  final color = _barColors[index % _barColors.length];
                  return BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: entries[index].value,
                        color: isTouched ? color : color.withValues(alpha: 0.8),
                        width: entries.length > 6 ? 16 : 28,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(6),
                        ),
                        backDrawRodData: BackgroundBarChartRodData(
                          show: true,
                          toY: maxValue * 1.2,
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.03)
                              : Colors.black.withValues(alpha: 0.03),
                        ),
                      ),
                    ],
                  );
                }),
              ),
            ),
          ).animate().fadeIn(duration: 500.ms, delay: 200.ms),

          // Legend
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: List.generate(entries.length, (index) {
              final color = _barColors[index % _barColors.length];
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    entries[index].key,
                    style: IrisTheme.caption.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              );
            }),
          ).animate().fadeIn(duration: 300.ms, delay: 400.ms),
        ],
      ),
    );
  }
}
