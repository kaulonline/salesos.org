import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/playbooks_service.dart';

/// Individual step tile with checkbox, title, description, order number,
/// completed timestamp, and onToggle callback.
class PlaybookStepTile extends StatelessWidget {
  final PlaybookStep step;
  final int stepNumber;
  final bool isLast;
  final ValueChanged<bool>? onToggle;

  const PlaybookStepTile({
    super.key,
    required this.step,
    required this.stepNumber,
    this.isLast = false,
    this.onToggle,
  });

  String _formatCompletedAt(String? completedAt) {
    if (completedAt == null) return '';
    try {
      final date = DateTime.parse(completedAt);
      return 'Completed ${DateFormat('MMM d, yyyy').format(date)}';
    } catch (e) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline indicator
          Column(
            children: [
              // Step number circle / completion indicator
              GestureDetector(
                onTap: () => onToggle?.call(!step.isCompleted),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: step.isCompleted
                        ? LuxuryColors.jadePremium
                        : (isDark
                            ? LuxuryColors.obsidian
                            : Colors.white),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: step.isCompleted
                          ? LuxuryColors.jadePremium
                          : (isDark
                              ? LuxuryColors.champagneGold
                                  .withValues(alpha: 0.3)
                              : LuxuryColors.champagneGold
                                  .withValues(alpha: 0.4)),
                      width: 2,
                    ),
                    boxShadow: step.isCompleted
                        ? [
                            BoxShadow(
                              color: LuxuryColors.jadePremium
                                  .withValues(alpha: 0.25),
                              blurRadius: 8,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: step.isCompleted
                        ? const Icon(
                            Icons.check,
                            size: 16,
                            color: Colors.white,
                          )
                        : Text(
                            '$stepNumber',
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.champagneGold,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ),
              // Connecting line
              if (!isLast)
                Container(
                  width: 2,
                  height: 40,
                  color: step.isCompleted
                      ? LuxuryColors.jadePremium.withValues(alpha: 0.3)
                      : (isDark
                          ? IrisTheme.darkBorder
                          : IrisTheme.lightBorder),
                ),
            ],
          ),
          const SizedBox(width: 14),
          // Step content
          Expanded(
            child: Container(
              margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.obsidian : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: step.isCompleted
                      ? LuxuryColors.jadePremium.withValues(alpha: 0.2)
                      : (isDark
                          ? LuxuryColors.champagneGold
                              .withValues(alpha: 0.08)
                          : LuxuryColors.champagneGold
                              .withValues(alpha: 0.1)),
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          step.title,
                          style: IrisTheme.titleSmall.copyWith(
                            color: step.isCompleted
                                ? (isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary)
                                : (isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary),
                            decoration: step.isCompleted
                                ? TextDecoration.lineThrough
                                : null,
                          ),
                        ),
                      ),
                      // Checkbox
                      GestureDetector(
                        onTap: () => onToggle?.call(!step.isCompleted),
                        child: Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: step.isCompleted
                                ? LuxuryColors.jadePremium
                                    .withValues(alpha: 0.15)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: step.isCompleted
                                  ? LuxuryColors.jadePremium
                                  : (isDark
                                      ? IrisTheme.darkBorder
                                      : IrisTheme.lightBorder),
                              width: 1.5,
                            ),
                          ),
                          child: step.isCompleted
                              ? Icon(
                                  Icons.check,
                                  size: 14,
                                  color: LuxuryColors.jadePremium,
                                )
                              : null,
                        ),
                      ),
                    ],
                  ),
                  if (step.description != null &&
                      step.description!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      step.description!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                  if (step.isCompleted && step.completedAt != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Iconsax.tick_circle,
                          size: 12,
                          color: LuxuryColors.jadePremium,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatCompletedAt(step.completedAt),
                          style: IrisTheme.labelSmall.copyWith(
                            color: LuxuryColors.jadePremium,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
