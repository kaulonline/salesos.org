import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/playbooks_service.dart';

/// Playbook list card showing name, description, category badge,
/// progress bar with percentage, and an onTap callback.
class PlaybookCard extends StatelessWidget {
  final PlaybookModel playbook;
  final VoidCallback? onTap;

  const PlaybookCard({
    super.key,
    required this.playbook,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progressPercent = playbook.progressPercent;
    final isComplete = progressPercent >= 1.0;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon container
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isComplete
                  ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
                  : LuxuryColors.champagneGold.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isComplete ? Iconsax.tick_circle : Iconsax.book_1,
              size: 22,
              color: isComplete
                  ? LuxuryColors.jadePremium
                  : LuxuryColors.champagneGold,
            ),
          ),
          const SizedBox(width: 14),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name and category row
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        playbook.name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (playbook.category != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: LuxuryColors.champagneGold
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          playbook.category!,
                          style: IrisTheme.labelSmall.copyWith(
                            color: LuxuryColors.champagneGold,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                // Description
                if (playbook.description != null &&
                    playbook.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    playbook.description!,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 10),
                // Progress bar and percentage
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: progressPercent,
                          minHeight: 6,
                          backgroundColor: isDark
                              ? LuxuryColors.obsidian
                              : LuxuryColors.diamond.withValues(alpha: 0.6),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            isComplete
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.champagneGold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '${(progressPercent * 100).toInt()}%',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isComplete
                            ? LuxuryColors.jadePremium
                            : (isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // Steps count
                Text(
                  '${playbook.completedSteps} of ${playbook.totalSteps} steps completed',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ),
          // Chevron
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Icon(
              Iconsax.arrow_right_3,
              size: 16,
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    );
  }
}
