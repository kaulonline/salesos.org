import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Pipeline stage data
class PipelineStageData {
  final String name;
  final int count;
  final double value;
  final Color color;

  const PipelineStageData({
    required this.name,
    required this.count,
    required this.value,
    required this.color,
  });
}

/// Funnel visualization of pipeline stages
class PipelineReport extends StatelessWidget {
  final List<PipelineStageData> stages;

  const PipelineReport({
    super.key,
    required this.stages,
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

    if (stages.isEmpty) {
      return LuxuryCard(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: Column(
              children: [
                Icon(
                  Iconsax.chart_1,
                  size: 48,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(height: 12),
                Text(
                  'No pipeline data available',
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

    final maxCount = stages.fold<int>(0, (max, s) => s.count > max ? s.count : max);
    final totalValue = stages.fold<double>(0, (sum, s) => sum + s.value);

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Iconsax.chart_1, size: 20, color: LuxuryColors.champagneGold),
              const SizedBox(width: 10),
              Text(
                'Pipeline Funnel',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const Spacer(),
              Text(
                _formatAmount(totalValue),
                style: IrisTheme.labelMedium.copyWith(
                  color: LuxuryColors.rolexGreen,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Funnel bars
          ...stages.asMap().entries.map((entry) {
            final index = entry.key;
            final stage = entry.value;
            final widthFraction = maxCount > 0
                ? (stage.count / maxCount).clamp(0.15, 1.0)
                : 0.5;

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        stage.name,
                        style: IrisTheme.labelMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Row(
                        children: [
                          Text(
                            '${stage.count} deals',
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatAmount(stage.value),
                            style: IrisTheme.labelSmall.copyWith(
                              color: stage.color,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Funnel bar
                  Center(
                    child: FractionallySizedBox(
                      widthFactor: widthFraction,
                      child: Container(
                        height: 28,
                        decoration: BoxDecoration(
                          color: stage.color.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: stage.color.withValues(alpha: 0.4),
                            width: 1,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(7),
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        stage.color.withValues(alpha: 0.3),
                                        stage.color.withValues(alpha: 0.1),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ).animate(delay: (index * 80).ms).fadeIn().slideX(begin: 0.05);
          }),
        ],
      ),
    );
  }
}
