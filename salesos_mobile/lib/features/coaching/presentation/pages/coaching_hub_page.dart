import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/coaching_service.dart';

class CoachingHubPage extends ConsumerStatefulWidget {
  const CoachingHubPage({super.key});

  @override
  ConsumerState<CoachingHubPage> createState() => _CoachingHubPageState();
}

class _CoachingHubPageState extends ConsumerState<CoachingHubPage> {
  Future<void> _onRefresh() async {
    ref.invalidate(coachingProgressProvider);
    ref.invalidate(coachingScenariosProvider);
    ref.invalidate(coachingSessionsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progressAsync = ref.watch(coachingProgressProvider);
    final scenariosAsync = ref.watch(coachingScenariosProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Coaching Hub',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'AI-powered sales coaching',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Content
            Expanded(
              child: RefreshIndicator(
                onRefresh: _onRefresh,
                color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    // Progress card
                    progressAsync.when(
                      data: (progress) => _ProgressCard(
                        progress: progress,
                        isDark: isDark,
                      ),
                      loading: () => const IrisShimmer(
                        width: double.infinity,
                        height: 140,
                      ),
                      error: (_, _) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 20),

                    // Scenarios section
                    LuxurySectionHeader(
                      title: 'Practice Scenarios',
                      subtitle: 'Choose a scenario to start coaching',
                    ).animate(delay: 200.ms).fadeIn(),
                    const SizedBox(height: 12),

                    scenariosAsync.when(
                      data: (scenarios) {
                        if (scenarios.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 40),
                            child: IrisEmptyState(
                              icon: Iconsax.teacher,
                              title: 'No scenarios available',
                              subtitle: 'Check back later for new coaching scenarios',
                            ),
                          );
                        }
                        return Column(
                          children: scenarios.asMap().entries.map((entry) {
                            return _ScenarioCard(
                              scenario: entry.value,
                              isDark: isDark,
                              onStart: () => _startSession(context, entry.value),
                            ).animate(delay: ((entry.key * 80) + 300).ms)
                                .fadeIn()
                                .slideY(begin: 0.05);
                          }).toList(),
                        );
                      },
                      loading: () => Column(
                        children: List.generate(3, (_) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: IrisShimmer(width: double.infinity, height: 100),
                        )),
                      ),
                      error: (_, _) => const SizedBox.shrink(),
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _startSession(BuildContext context, CoachingScenarioModel scenario) async {
    HapticFeedback.mediumImpact();
    final service = ref.read(coachingServiceProvider);
    final session = await service.createSession(scenario.id);
    if (session != null && context.mounted) {
      context.push('/coaching/session/${session.id}');
    }
  }
}

class _ProgressCard extends StatelessWidget {
  final CoachingProgressModel progress;
  final bool isDark;

  const _ProgressCard({
    required this.progress,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      variant: LuxuryCardVariant.accent,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.cup,
                size: 20,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 10),
              Text(
                'Your Progress',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Stats row
          Row(
            children: [
              _ProgressStat(
                label: 'Sessions',
                value: '${progress.totalSessions}',
                icon: Iconsax.microphone,
                color: LuxuryColors.infoCobalt,
                isDark: isDark,
              ),
              const SizedBox(width: 12),
              _ProgressStat(
                label: 'Avg Score',
                value: progress.avgScore > 0
                    ? progress.avgScore.toStringAsFixed(0)
                    : '--',
                icon: Iconsax.chart_2,
                color: LuxuryColors.champagneGold,
                isDark: isDark,
              ),
              const SizedBox(width: 12),
              _ProgressStat(
                label: 'Completed',
                value: '${progress.completedScenarios}',
                icon: Iconsax.tick_circle,
                color: LuxuryColors.rolexGreen,
                isDark: isDark,
              ),
              const SizedBox(width: 12),
              _ProgressStat(
                label: 'Streak',
                value: '${progress.streak}d',
                icon: Iconsax.flash_1,
                color: LuxuryColors.warningAmber,
                isDark: isDark,
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms, delay: 100.ms);
  }
}

class _ProgressStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool isDark;

  const _ProgressStat({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 6),
            Text(
              value,
              style: IrisTheme.titleSmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              label,
              style: IrisTheme.caption.copyWith(
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScenarioCard extends StatelessWidget {
  final CoachingScenarioModel scenario;
  final bool isDark;
  final VoidCallback onStart;

  const _ScenarioCard({
    required this.scenario,
    required this.isDark,
    required this.onStart,
  });

  Color _difficultyColor(String difficulty) {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return LuxuryColors.successGreen;
      case 'intermediate':
        return LuxuryColors.champagneGold;
      case 'advanced':
        return LuxuryColors.errorRuby;
      default:
        return LuxuryColors.warmGray;
    }
  }

  @override
  Widget build(BuildContext context) {
    final diffColor = _difficultyColor(scenario.difficulty);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: LuxuryCard(
        padding: const EdgeInsets.all(16),
        onTap: onStart,
        child: Row(
          children: [
            // Icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: LuxuryColors.infoCobalt.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Iconsax.teacher,
                size: 22,
                color: LuxuryColors.infoCobalt,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    scenario.name,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  if (scenario.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      scenario.description!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      LuxuryBadge(
                        text: scenario.difficulty,
                        color: diffColor,
                      ),
                      if (scenario.category != null) ...[
                        const SizedBox(width: 8),
                        LuxuryBadge(
                          text: scenario.category!,
                          color: LuxuryColors.warmGray,
                          outlined: true,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Iconsax.play,
                size: 18,
                color: LuxuryColors.rolexGreen,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
