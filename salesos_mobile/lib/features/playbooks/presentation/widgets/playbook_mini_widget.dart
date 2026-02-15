import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/playbooks_service.dart';

/// Compact playbook widget for embedding in deal detail pages.
/// Shows current active playbook name and progress with a
/// small circular progress indicator. Taps navigate to full detail.
class PlaybookMiniWidget extends ConsumerWidget {
  final String? playbookId;

  const PlaybookMiniWidget({
    super.key,
    this.playbookId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // If a specific playbookId is provided, use the detail provider.
    // Otherwise, use the list provider and pick the first active playbook.
    if (playbookId != null) {
      return _buildWithProvider(
        context,
        ref,
        ref.watch(playbookDetailProvider(playbookId!)),
        isDark,
      );
    }

    final playbooksAsync = ref.watch(playbooksProvider);
    return playbooksAsync.when(
      loading: () => _buildShimmer(isDark),
      error: (_, _) => const SizedBox.shrink(),
      data: (playbooks) {
        final activePlaybooks = playbooks.where((p) => p.isActive).toList();
        if (activePlaybooks.isEmpty) return const SizedBox.shrink();
        final playbook = activePlaybooks.first;
        return _buildCard(context, playbook, isDark);
      },
    );
  }

  Widget _buildWithProvider(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<PlaybookModel?> asyncValue,
    bool isDark,
  ) {
    return asyncValue.when(
      loading: () => _buildShimmer(isDark),
      error: (_, _) => const SizedBox.shrink(),
      data: (playbook) {
        if (playbook == null) return const SizedBox.shrink();
        return _buildCard(context, playbook, isDark);
      },
    );
  }

  Widget _buildCard(
      BuildContext context, PlaybookModel playbook, bool isDark) {
    final progressPercent = playbook.progressPercent;
    final isComplete = progressPercent >= 1.0;
    final progressColor =
        isComplete ? LuxuryColors.jadePremium : LuxuryColors.champagneGold;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        context.push('/playbooks/${playbook.id}');
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? LuxuryColors.champagneGold.withValues(alpha: 0.08)
                : LuxuryColors.champagneGold.withValues(alpha: 0.1),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Circular progress indicator
            SizedBox(
              width: 38,
              height: 38,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CircularProgressIndicator(
                    value: progressPercent,
                    strokeWidth: 3,
                    backgroundColor: isDark
                        ? LuxuryColors.obsidian
                        : LuxuryColors.diamond.withValues(alpha: 0.6),
                    valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                  ),
                  Center(
                    child: isComplete
                        ? Icon(
                            Iconsax.tick_circle,
                            size: 16,
                            color: LuxuryColors.jadePremium,
                          )
                        : Text(
                            '${(progressPercent * 100).toInt()}%',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                            ),
                          ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Name and step count
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    playbook.name,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${playbook.completedSteps}/${playbook.totalSteps} steps',
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
            Icon(
              Iconsax.arrow_right_3,
              size: 14,
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmer(bool isDark) {
    return Container(
      height: 62,
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.obsidian
            : LuxuryColors.diamond.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
      ),
    );
  }
}
