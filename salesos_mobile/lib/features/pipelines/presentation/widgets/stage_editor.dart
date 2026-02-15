import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/pipelines_service.dart';

class StageEditor extends StatelessWidget {
  final List<PipelineStage> stages;
  final Function(int oldIndex, int newIndex)? onReorder;

  const StageEditor({
    super.key,
    required this.stages,
    this.onReorder,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (stages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Iconsax.hierarchy_3, size: 48, color: LuxuryColors.textMuted.withValues(alpha: 0.4)),
            const SizedBox(height: 12),
            Text('No stages defined', style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
          ]),
        ),
      );
    }

    return ReorderableListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: stages.length,
      onReorder: onReorder ?? (a, b) {},
      proxyDecorator: (child, index, animation) {
        return AnimatedBuilder(
          animation: animation,
          builder: (context, child) => Material(
            elevation: 4,
            borderRadius: BorderRadius.circular(12),
            color: Colors.transparent,
            child: child,
          ),
          child: child,
        );
      },
      itemBuilder: (context, index) {
        final stage = stages[index];
        return Container(
          key: ValueKey(stage.id),
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.grey.withValues(alpha: 0.15)),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            leading: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: stage.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text('${index + 1}',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: stage.color)),
              ),
            ),
            title: Text(stage.name,
                style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w600)),
            subtitle: Row(children: [
              Text('${stage.probability.toStringAsFixed(0)}%',
                  style: IrisTheme.bodySmall.copyWith(color: stage.color, fontWeight: FontWeight.w500)),
              if (stage.isClosedWon) ...[
                const SizedBox(width: 8),
                Icon(Iconsax.cup, size: 14, color: LuxuryColors.successGreen),
              ],
              if (stage.isClosedLost) ...[
                const SizedBox(width: 8),
                Icon(Iconsax.close_circle, size: 14, color: LuxuryColors.errorRuby),
              ],
            ]),
            trailing: Icon(Iconsax.menu_1, size: 20, color: LuxuryColors.textMuted),
          ),
        );
      },
    );
  }
}
