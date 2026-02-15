import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/forecast_service.dart';

/// Forecast bar chart showing target vs committed vs closed
class ForecastChart extends StatelessWidget {
  final ForecastModel forecast;

  const ForecastChart({
    super.key,
    required this.forecast,
  });

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

    final bars = [
      _BarInfo('Quota', forecast.quota ?? forecast.target, LuxuryColors.champagneGold),
      _BarInfo('Committed', forecast.committed, LuxuryColors.infoCobalt),
      _BarInfo('Best Case', forecast.bestCase, LuxuryColors.jadePremium),
      _BarInfo('Pipeline', forecast.pipeline, LuxuryColors.warmGray),
      _BarInfo('Closed', forecast.closed, LuxuryColors.rolexGreen),
    ];

    final maxValue = bars.fold<double>(0, (max, b) => b.value > max ? b.value : max);

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Forecast vs Actual',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 20),

          SizedBox(
            height: 200,
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
                        '${bars[group.x.toInt()].label}\n${_formatAmount(bars[group.x.toInt()].value)}',
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
                        if (idx < 0 || idx >= bars.length) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            bars[idx].label,
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                              fontSize: 9,
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
                barGroups: List.generate(bars.length, (index) {
                  return BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: bars[index].value,
                        color: bars[index].color,
                        width: 24,
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

          // Legend
          const SizedBox(height: 16),
          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: bars.map((bar) => Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: bar.color,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  bar.label,
                  style: IrisTheme.caption.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            )).toList(),
          ),
        ],
      ),
    );
  }
}

class _BarInfo {
  final String label;
  final double value;
  final Color color;
  const _BarInfo(this.label, this.value, this.color);
}
