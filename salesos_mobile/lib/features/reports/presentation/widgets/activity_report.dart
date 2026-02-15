import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Activity type data
class ActivityTypeData {
  final String type;
  final int count;
  final IconData icon;
  final Color color;

  const ActivityTypeData({
    required this.type,
    required this.count,
    required this.icon,
    required this.color,
  });
}

/// Activity report with bar chart showing activity types
class ActivityReport extends StatelessWidget {
  final List<ActivityTypeData> activities;

  const ActivityReport({
    super.key,
    required this.activities,
  });

  /// Factory with default activity types
  factory ActivityReport.withCounts({
    required int calls,
    required int emails,
    required int meetings,
    required int tasks,
  }) {
    return ActivityReport(
      activities: [
        ActivityTypeData(
          type: 'Calls',
          count: calls,
          icon: Iconsax.call,
          color: LuxuryColors.infoCobalt,
        ),
        ActivityTypeData(
          type: 'Emails',
          count: emails,
          icon: Iconsax.sms,
          color: LuxuryColors.champagneGold,
        ),
        ActivityTypeData(
          type: 'Meetings',
          count: meetings,
          icon: Iconsax.calendar_1,
          color: LuxuryColors.rolexGreen,
        ),
        ActivityTypeData(
          type: 'Tasks',
          count: tasks,
          icon: Iconsax.task_square,
          color: LuxuryColors.socialPurple,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (activities.isEmpty) {
      return LuxuryCard(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: Column(
              children: [
                Icon(
                  Iconsax.activity,
                  size: 48,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(height: 12),
                Text(
                  'No activity data available',
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

    final maxCount = activities.fold<int>(0, (max, a) => a.count > max ? a.count : max);
    final totalActivities = activities.fold<int>(0, (sum, a) => sum + a.count);

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Iconsax.activity, size: 20, color: LuxuryColors.champagneGold),
              const SizedBox(width: 10),
              Text(
                'Activity Summary',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const Spacer(),
              Text(
                '$totalActivities total',
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Bar chart
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: (maxCount * 1.3).toDouble(),
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) =>
                        isDark ? LuxuryColors.obsidian : Colors.white,
                    tooltipBorder: BorderSide(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                    ),
                    tooltipBorderRadius: BorderRadius.circular(8),
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final activity = activities[group.x.toInt()];
                      return BarTooltipItem(
                        '${activity.type}: ${activity.count}',
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
                      reservedSize: 36,
                      getTitlesWidget: (value, meta) {
                        return Text(
                          '${value.toInt()}',
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
                        if (idx < 0 || idx >= activities.length) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            activities[idx].type,
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
                  horizontalInterval: maxCount > 0 ? (maxCount / 4).ceilToDouble() : 1,
                  getDrawingHorizontalLine: (value) {
                    return FlLine(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.06)
                          : Colors.black.withValues(alpha: 0.06),
                      strokeWidth: 1,
                    );
                  },
                ),
                barGroups: List.generate(activities.length, (index) {
                  final activity = activities[index];
                  return BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: activity.count.toDouble(),
                        color: activity.color,
                        width: 32,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(8),
                        ),
                      ),
                    ],
                  );
                }),
              ),
            ),
          ).animate().fadeIn(duration: 500.ms, delay: 200.ms),

          // Activity type cards
          const SizedBox(height: 20),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: activities.asMap().entries.map((entry) {
              final activity = entry.value;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: activity.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: activity.color.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(activity.icon, size: 16, color: activity.color),
                    const SizedBox(width: 6),
                    Text(
                      '${activity.count}',
                      style: IrisTheme.labelMedium.copyWith(
                        color: activity.color,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      activity.type,
                      style: IrisTheme.caption.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ).animate().fadeIn(duration: 300.ms, delay: 400.ms),
        ],
      ),
    );
  }
}
