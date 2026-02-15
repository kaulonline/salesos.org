import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/playbooks_service.dart';
import '../widgets/playbook_step_tile.dart';

class PlaybookDetailPage extends ConsumerStatefulWidget {
  final String playbookId;

  const PlaybookDetailPage({super.key, required this.playbookId});

  @override
  ConsumerState<PlaybookDetailPage> createState() => _PlaybookDetailPageState();
}

class _PlaybookDetailPageState extends ConsumerState<PlaybookDetailPage> {
  Future<void> _onRefresh() async {
    ref.invalidate(playbookDetailProvider(widget.playbookId));
  }

  Future<void> _onToggleStep(PlaybookStep step, bool completed) async {
    HapticFeedback.mediumImpact();
    final service = ref.read(playbooksServiceProvider);
    final success = await service.toggleStepCompletion(
      widget.playbookId,
      step.id,
      completed,
    );
    if (success) {
      ref.invalidate(playbookDetailProvider(widget.playbookId));
      ref.invalidate(playbooksProvider);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to update step'),
            backgroundColor: IrisTheme.error,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final playbookAsync = ref.watch(playbookDetailProvider(widget.playbookId));

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Playbook',
        showBackButton: true,
      ),
      body: playbookAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text(
                'Failed to load playbook',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _onRefresh,
                child: Text(
                  'Retry',
                  style: TextStyle(color: LuxuryColors.jadePremium),
                ),
              ),
            ],
          ),
        ),
        data: (playbook) {
          if (playbook == null) {
            return Center(
              child: Text(
                'Playbook not found',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _onRefresh,
            color: LuxuryColors.jadePremium,
            backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
            child: _buildContent(context, playbook, isDark),
          );
        },
      ),
    );
  }

  Widget _buildContent(
      BuildContext context, PlaybookModel playbook, bool isDark) {
    final sortedSteps = List<PlaybookStep>.from(playbook.steps)
      ..sort((a, b) => a.order.compareTo(b.order));

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          IrisCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Iconsax.book_1,
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            playbook.name,
                            style: IrisTheme.titleLarge.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                            ),
                          ),
                          if (playbook.category != null) ...[
                            const SizedBox(height: 4),
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
                    ),
                  ],
                ),
                if (playbook.description != null &&
                    playbook.description!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(
                    playbook.description!,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                // Progress Section
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Progress',
                                style: IrisTheme.labelMedium.copyWith(
                                  color: isDark
                                      ? IrisTheme.darkTextSecondary
                                      : IrisTheme.lightTextSecondary,
                                ),
                              ),
                              Text(
                                '${playbook.completedSteps}/${playbook.totalSteps} steps',
                                style: IrisTheme.labelMedium.copyWith(
                                  color: isDark
                                      ? LuxuryColors.jadePremium
                                      : LuxuryColors.rolexGreen,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: playbook.progressPercent,
                              minHeight: 8,
                              backgroundColor: isDark
                                  ? LuxuryColors.obsidian
                                  : LuxuryColors.diamond
                                      .withValues(alpha: 0.6),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                playbook.progressPercent >= 1.0
                                    ? LuxuryColors.jadePremium
                                    : LuxuryColors.champagneGold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Percentage circle
                    SizedBox(
                      width: 52,
                      height: 52,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CircularProgressIndicator(
                            value: playbook.progressPercent,
                            strokeWidth: 4,
                            backgroundColor: isDark
                                ? LuxuryColors.obsidian
                                : LuxuryColors.diamond
                                    .withValues(alpha: 0.6),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              playbook.progressPercent >= 1.0
                                  ? LuxuryColors.jadePremium
                                  : LuxuryColors.champagneGold,
                            ),
                          ),
                          Center(
                            child: Text(
                              '${(playbook.progressPercent * 100).toInt()}%',
                              style: IrisTheme.labelSmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ).animate().fadeIn(duration: 300.ms),

          const SizedBox(height: 24),

          // Steps Section Title
          Text(
            'Steps',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ).animate(delay: 100.ms).fadeIn(),

          const SizedBox(height: 12),

          // Steps List
          if (sortedSteps.isEmpty)
            IrisCard(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Icon(
                        Iconsax.task_square,
                        size: 32,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'No steps defined',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            ...sortedSteps.asMap().entries.map((entry) {
              final index = entry.key;
              final step = entry.value;
              final isLast = index == sortedSteps.length - 1;
              return PlaybookStepTile(
                step: step,
                stepNumber: index + 1,
                isLast: isLast,
                onToggle: (completed) => _onToggleStep(step, completed),
              )
                  .animate(delay: ((index + 2) * 50).ms)
                  .fadeIn()
                  .slideX(begin: 0.03);
            }),

          const SizedBox(height: 100),
        ],
      ),
    );
  }
}
