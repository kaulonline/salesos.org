import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Lead conversion funnel stage data
class ConversionStageData {
  final String name;
  final int count;
  final IconData icon;

  const ConversionStageData({
    required this.name,
    required this.count,
    required this.icon,
  });
}

/// Lead conversion funnel report
/// Shows: Leads -> Contacts -> Opportunities -> Closed Won with conversion rates
class LeadConversionReport extends StatelessWidget {
  final List<ConversionStageData> stages;

  const LeadConversionReport({
    super.key,
    required this.stages,
  });

  /// Default stages factory
  factory LeadConversionReport.withData({
    required int leads,
    required int contacts,
    required int opportunities,
    required int closedWon,
  }) {
    return LeadConversionReport(
      stages: [
        ConversionStageData(name: 'Leads', count: leads, icon: Iconsax.profile_2user),
        ConversionStageData(name: 'Contacts', count: contacts, icon: Iconsax.user),
        ConversionStageData(name: 'Opportunities', count: opportunities, icon: Iconsax.chart_2),
        ConversionStageData(name: 'Closed Won', count: closedWon, icon: Iconsax.tick_circle),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (stages.isEmpty) {
      return LuxuryCard(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: Text(
              'No conversion data available',
              style: IrisTheme.bodySmall.copyWith(
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
            ),
          ),
        ),
      );
    }

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Iconsax.convert_3d_cube, size: 20, color: LuxuryColors.champagneGold),
              const SizedBox(width: 10),
              Text(
                'Lead Conversion Funnel',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Funnel stages
          ...stages.asMap().entries.map((entry) {
            final index = entry.key;
            final stage = entry.value;

            // Calculate conversion rate from previous stage
            String? conversionRate;
            if (index > 0 && stages[index - 1].count > 0) {
              final rate = stage.count / stages[index - 1].count * 100;
              conversionRate = '${rate.toStringAsFixed(1)}%';
            }

            // Color gradation from warm to green
            final stageColors = [
              LuxuryColors.champagneGold,
              LuxuryColors.infoCobalt,
              LuxuryColors.jadePremium,
              LuxuryColors.rolexGreen,
            ];
            final color = stageColors[index % stageColors.length];

            return Column(
              children: [
                // Conversion rate arrow between stages
                if (index > 0)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Iconsax.arrow_down_1,
                          size: 16,
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                        if (conversionRate != null) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              conversionRate,
                              style: IrisTheme.caption.copyWith(
                                color: color,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                // Stage row
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: color.withValues(alpha: 0.25),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(stage.icon, size: 20, color: color),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          stage.name,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                      ),
                      Text(
                        '${stage.count}',
                        style: IrisTheme.numericSmall.copyWith(
                          color: color,
                        ),
                      ),
                    ],
                  ),
                ).animate(delay: (index * 100).ms).fadeIn().slideY(begin: 0.05),
              ],
            );
          }),

          // Overall conversion rate
          if (stages.length >= 2 && stages.first.count > 0) ...[
            const SizedBox(height: 20),
            const LuxuryDivider(),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Overall Conversion',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${(stages.last.count / stages.first.count * 100).toStringAsFixed(1)}%',
                    style: IrisTheme.titleSmall.copyWith(
                      color: LuxuryColors.rolexGreen,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
