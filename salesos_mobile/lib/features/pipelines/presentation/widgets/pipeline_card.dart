import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/pipelines_service.dart';

class PipelineCard extends StatelessWidget {
  final Pipeline pipeline;
  final VoidCallback? onTap;
  final int animationIndex;

  const PipelineCard({
    super.key,
    required this.pipeline,
    this.onTap,
    this.animationIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        variant: LuxuryCardVariant.standard,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Iconsax.hierarchy_3, size: 20,
                      color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(pipeline.name,
                          style: IrisTheme.titleSmall.copyWith(
                              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                              fontWeight: FontWeight.w600),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      if (pipeline.description != null) ...[
                        const SizedBox(height: 2),
                        Text(pipeline.description!,
                            style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: (pipeline.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 6, height: 6,
                        decoration: BoxDecoration(
                            color: pipeline.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray,
                            shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    Text(pipeline.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                            color: pipeline.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray)),
                  ]),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // Stage pills
            if (pipeline.stages.isNotEmpty) ...[
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: pipeline.stages.take(5).map((stage) {
                    return Container(
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: stage.color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(stage.name,
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: stage.color)),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 8),
            ],
            Row(
              children: [
                if (pipeline.isDefault)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: LuxuryColors.champagneGold.withValues(alpha: 0.3)),
                    ),
                    child: Text('Default', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                        color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark)),
                  ),
                const Spacer(),
                Text('${pipeline.stages.length} stages',
                    style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted)),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}
