import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Donut chart showing wins vs losses with win rate percentage in center
class WinLossChart extends StatefulWidget {
  final int wins;
  final int losses;
  final String? title;

  const WinLossChart({
    super.key,
    required this.wins,
    required this.losses,
    this.title,
  });

  @override
  State<WinLossChart> createState() => _WinLossChartState();
}

class _WinLossChartState extends State<WinLossChart> {
  int _touchedIndex = -1;

  double get _winRate {
    final total = widget.wins + widget.losses;
    if (total == 0) return 0;
    return widget.wins / total * 100;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final total = widget.wins + widget.losses;

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.title != null)
            Text(
              widget.title!,
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          if (widget.title != null) const SizedBox(height: 20),

          SizedBox(
            height: 220,
            child: total == 0
                ? Center(
                    child: Text(
                      'No data available',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  )
                : Stack(
                    alignment: Alignment.center,
                    children: [
                      PieChart(
                        PieChartData(
                          pieTouchData: PieTouchData(
                            touchCallback: (event, response) {
                              setState(() {
                                if (response != null &&
                                    response.touchedSection != null) {
                                  _touchedIndex = response
                                      .touchedSection!.touchedSectionIndex;
                                } else {
                                  _touchedIndex = -1;
                                }
                              });
                            },
                          ),
                          borderData: FlBorderData(show: false),
                          sectionsSpace: 3,
                          centerSpaceRadius: 60,
                          sections: [
                            // Wins
                            PieChartSectionData(
                              color: LuxuryColors.rolexGreen,
                              value: widget.wins.toDouble(),
                              title: _touchedIndex == 0
                                  ? '${widget.wins}'
                                  : '',
                              radius: _touchedIndex == 0 ? 40 : 32,
                              titleStyle: IrisTheme.labelSmall.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                              badgePositionPercentageOffset: 1.3,
                            ),
                            // Losses
                            PieChartSectionData(
                              color: LuxuryColors.errorRuby,
                              value: widget.losses.toDouble(),
                              title: _touchedIndex == 1
                                  ? '${widget.losses}'
                                  : '',
                              radius: _touchedIndex == 1 ? 40 : 32,
                              titleStyle: IrisTheme.labelSmall.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                              badgePositionPercentageOffset: 1.3,
                            ),
                          ],
                        ),
                      ),
                      // Center text
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${_winRate.toStringAsFixed(0)}%',
                            style: IrisTheme.numericMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                            ),
                          ),
                          Text(
                            'Win Rate',
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextTertiary
                                  : IrisTheme.lightTextTertiary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
          ).animate().fadeIn(duration: 500.ms, delay: 200.ms),

          // Legend
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _LegendItem(
                color: LuxuryColors.rolexGreen,
                label: 'Won (${widget.wins})',
                isDark: isDark,
              ),
              const SizedBox(width: 24),
              _LegendItem(
                color: LuxuryColors.errorRuby,
                label: 'Lost (${widget.losses})',
                isDark: isDark,
              ),
            ],
          ).animate().fadeIn(duration: 300.ms, delay: 400.ms),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  final bool isDark;

  const _LegendItem({
    required this.color,
    required this.label,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: IrisTheme.labelSmall.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),
      ],
    );
  }
}
