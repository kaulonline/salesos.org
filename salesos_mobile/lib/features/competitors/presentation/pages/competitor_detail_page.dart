import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../data/competitors_service.dart';

class CompetitorDetailPage extends ConsumerWidget {
  final String competitorId;

  const CompetitorDetailPage({
    super.key,
    required this.competitorId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final competitorAsync = ref.watch(competitorDetailProvider(competitorId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Battlecard',
        showBackButton: true,
        onBackPressed: () => context.pop(),
      ),
      body: competitorAsync.when(
        data: (competitor) {
          if (competitor == null) {
            return Center(
              child: Text(
                'Competitor not found',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
            );
          }
          return _BattlecardContent(competitor: competitor, isDark: isDark);
        },
        loading: () => _buildLoading(),
        error: (_, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text(
                'Failed to load battlecard',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(competitorDetailProvider(competitorId)),
                child: Text(
                  'Retry',
                  style: TextStyle(
                    color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const IrisShimmer(width: double.infinity, height: 80),
          const SizedBox(height: 16),
          const IrisShimmer(width: double.infinity, height: 160),
          const SizedBox(height: 16),
          const IrisShimmer(width: double.infinity, height: 160),
        ],
      ),
    );
  }
}

class _BattlecardContent extends StatelessWidget {
  final CompetitorModel competitor;
  final bool isDark;

  const _BattlecardContent({
    required this.competitor,
    required this.isDark,
  });

  Color _tierColor() {
    switch (competitor.tier) {
      case CompetitorTier.PRIMARY:
        return LuxuryColors.errorRuby;
      case CompetitorTier.SECONDARY:
        return LuxuryColors.warningAmber;
      case CompetitorTier.EMERGING:
        return LuxuryColors.infoCobalt;
      case CompetitorTier.INDIRECT:
        return isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary;
    }
  }

  Color _statusColor() {
    switch (competitor.status) {
      case CompetitorStatus.ACTIVE:
        return LuxuryColors.successGreen;
      case CompetitorStatus.INACTIVE:
        return isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary;
      case CompetitorStatus.ACQUIRED:
        return LuxuryColors.warningAmber;
      case CompetitorStatus.MERGED:
        return LuxuryColors.infoCobalt;
    }
  }

  @override
  Widget build(BuildContext context) {
    int delayIndex = 0;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // ── Overview card ──────────────────────────────────────────
        LuxuryCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Center(
                      child: Text(
                        competitor.name.isNotEmpty
                            ? competitor.name.substring(0, 1).toUpperCase()
                            : '?',
                        style: IrisTheme.headlineSmall.copyWith(
                          color: LuxuryColors.champagneGold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          competitor.name,
                          style: IrisTheme.titleLarge.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        // Tier + Status badges
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _DetailBadge(
                              text: competitor.tierLabel,
                              color: _tierColor(),
                              isDark: isDark,
                            ),
                            _DetailBadge(
                              text: competitor.statusLabel,
                              color: _statusColor(),
                              isDark: isDark,
                            ),
                            if (competitor.targetMarket != null)
                              LuxuryBadge(
                                text: competitor.targetMarket!,
                                color: LuxuryColors.infoCobalt,
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (competitor.description != null) ...[
                const SizedBox(height: 14),
                Text(
                  competitor.description!,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ],
          ),
        ).animate().fadeIn(duration: 300.ms),
        const SizedBox(height: 16),

        // ── Win/Loss stats card ───────────────────────────────────
        if (competitor.winsAgainst > 0 || competitor.lossesAgainst > 0) ...[
          _WinLossCard(competitor: competitor, isDark: isDark)
              .animate(delay: (++delayIndex * 100).ms).fadeIn().slideY(begin: 0.05),
          const SizedBox(height: 16),
        ],

        // ── Strengths ─────────────────────────────────────────────
        if (competitor.strengths.isNotEmpty) ...[
          _BattlecardSection(
            title: 'Strengths',
            icon: Iconsax.medal_star,
            iconColor: LuxuryColors.successGreen,
            items: competitor.strengths,
            itemColor: LuxuryColors.successGreen,
            isDark: isDark,
          ).animate(delay: (++delayIndex * 100).ms).fadeIn().slideY(begin: 0.05),
          const SizedBox(height: 16),
        ],

        // ── Weaknesses ────────────────────────────────────────────
        if (competitor.weaknesses.isNotEmpty) ...[
          _BattlecardSection(
            title: 'Weaknesses',
            icon: Iconsax.warning_2,
            iconColor: LuxuryColors.errorRuby,
            items: competitor.weaknesses,
            itemColor: LuxuryColors.errorRuby,
            isDark: isDark,
          ).animate(delay: (++delayIndex * 100).ms).fadeIn().slideY(begin: 0.05),
          const SizedBox(height: 16),
        ],

        // ── Differentiators (was Talk Tracks) ─────────────────────
        if (competitor.differentiators.isNotEmpty) ...[
          _BattlecardSection(
            title: 'Differentiators',
            icon: Iconsax.message_text,
            iconColor: LuxuryColors.infoCobalt,
            items: competitor.differentiators,
            itemColor: LuxuryColors.infoCobalt,
            isDark: isDark,
            isQuoted: true,
          ).animate(delay: (++delayIndex * 100).ms).fadeIn().slideY(begin: 0.05),
          const SizedBox(height: 16),
        ],

        // ── Pricing Model (was Pricing) ───────────────────────────
        if (competitor.pricingModel != null) ...[
          LuxuryCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.dollar_circle,
                        size: 18,
                        color: LuxuryColors.champagneGold,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Pricing Model',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  competitor.pricingModel!,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ).animate(delay: (++delayIndex * 100).ms).fadeIn().slideY(begin: 0.05),
          const SizedBox(height: 16),
        ],

        // ── Battlecards section ───────────────────────────────────
        if (competitor.battlecards != null && competitor.battlecards!.isNotEmpty) ...[
          ...competitor.battlecards!.map((bc) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _BattlecardDetailCard(battlecard: bc, isDark: isDark)
                .animate(delay: (++delayIndex * 100).ms).fadeIn().slideY(begin: 0.05),
          )),
        ],

        const SizedBox(height: 24),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Win / Loss stats card
// ═══════════════════════════════════════════════════════════════

class _WinLossCard extends StatelessWidget {
  final CompetitorModel competitor;
  final bool isDark;

  const _WinLossCard({required this.competitor, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final wr = competitor.winRate;
    final total = competitor.winsAgainst + competitor.lossesAgainst;

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Iconsax.chart_2, size: 18, color: LuxuryColors.champagneGold),
              ),
              const SizedBox(width: 10),
              Text(
                'Win/Loss Record',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Wins
              Expanded(
                child: _StatBox(
                  label: 'Wins',
                  value: '${competitor.winsAgainst}',
                  color: LuxuryColors.successGreen,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 10),
              // Losses
              Expanded(
                child: _StatBox(
                  label: 'Losses',
                  value: '${competitor.lossesAgainst}',
                  color: LuxuryColors.errorRuby,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 10),
              // Win rate
              Expanded(
                child: _StatBox(
                  label: 'Win Rate',
                  value: wr != null ? '${wr.toStringAsFixed(0)}%' : '--',
                  color: LuxuryColors.champagneGold,
                  isDark: isDark,
                ),
              ),
            ],
          ),
          if (total > 0) ...[
            const SizedBox(height: 12),
            // Win rate progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: SizedBox(
                height: 6,
                child: Row(
                  children: [
                    Expanded(
                      flex: competitor.winsAgainst,
                      child: Container(color: LuxuryColors.successGreen),
                    ),
                    if (competitor.lossesAgainst > 0)
                      Expanded(
                        flex: competitor.lossesAgainst,
                        child: Container(color: LuxuryColors.errorRuby.withValues(alpha: 0.5)),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _StatBox({
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: IrisTheme.titleLarge.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: IrisTheme.bodySmall.copyWith(
              fontSize: 11,
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Battlecard detail card (for embedded battlecards list)
// ═══════════════════════════════════════════════════════════════

class _BattlecardDetailCard extends StatelessWidget {
  final Battlecard battlecard;
  final bool isDark;

  const _BattlecardDetailCard({required this.battlecard, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Iconsax.document_text, size: 18, color: LuxuryColors.champagneGold),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      battlecard.title,
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          'v${battlecard.version}',
                          style: IrisTheme.bodySmall.copyWith(
                            fontSize: 11,
                            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        _DetailBadge(
                          text: battlecard.isActive ? 'Active' : 'Inactive',
                          color: battlecard.isActive
                              ? LuxuryColors.successGreen
                              : (isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Overview
          if (battlecard.overview != null) ...[
            const SizedBox(height: 12),
            Text(
              battlecard.overview!,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],

          // Key Talking Points
          if (battlecard.keyTalkingPoints.isNotEmpty) ...[
            const SizedBox(height: 14),
            _InlineBulletList(
              label: 'Key Talking Points',
              items: battlecard.keyTalkingPoints,
              color: LuxuryColors.infoCobalt,
              isDark: isDark,
            ),
          ],

          // Win Themes
          if (battlecard.winThemes.isNotEmpty) ...[
            const SizedBox(height: 12),
            _InlineBulletList(
              label: 'Win Themes',
              items: battlecard.winThemes,
              color: LuxuryColors.successGreen,
              isDark: isDark,
            ),
          ],

          // Lose Themes
          if (battlecard.loseThemes.isNotEmpty) ...[
            const SizedBox(height: 12),
            _InlineBulletList(
              label: 'Lose Themes',
              items: battlecard.loseThemes,
              color: LuxuryColors.errorRuby,
              isDark: isDark,
            ),
          ],

          // Trap Questions
          if (battlecard.trapQuestions.isNotEmpty) ...[
            const SizedBox(height: 12),
            _InlineBulletList(
              label: 'Trap Questions',
              items: battlecard.trapQuestions,
              color: LuxuryColors.warningAmber,
              isDark: isDark,
            ),
          ],

          // Objection Handling
          if (battlecard.objectionHandling != null && battlecard.objectionHandling!.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              'Objection Handling',
              style: IrisTheme.bodySmall.copyWith(
                fontWeight: FontWeight.w600,
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            ...battlecard.objectionHandling!.map((oh) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: LuxuryColors.warningAmber.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border(
                    left: BorderSide(
                      color: LuxuryColors.warningAmber.withValues(alpha: 0.4),
                      width: 3,
                    ),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Objection: ${oh['objection'] ?? ''}',
                      style: IrisTheme.bodySmall.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      oh['response'] ?? '',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            )),
          ],

          // Pricing Comparison
          if (battlecard.pricingComparison != null) ...[
            const SizedBox(height: 12),
            Text(
              'Pricing Comparison',
              style: IrisTheme.bodySmall.copyWith(
                fontWeight: FontWeight.w600,
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              battlecard.pricingComparison!,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Compact inline bullet list used inside battlecard detail cards.
class _InlineBulletList extends StatelessWidget {
  final String label;
  final List<String> items;
  final Color color;
  final bool isDark;

  const _InlineBulletList({
    required this.label,
    required this.items,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: IrisTheme.bodySmall.copyWith(
            fontWeight: FontWeight.w600,
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        const SizedBox(height: 6),
        ...items.map((item) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 5,
                height: 5,
                margin: const EdgeInsets.only(top: 5),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.6),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  item,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Shared small widgets
// ═══════════════════════════════════════════════════════════════

/// Small colored badge for tier/status on detail page.
class _DetailBadge extends StatelessWidget {
  final String text;
  final Color color;
  final bool isDark;

  const _DetailBadge({
    required this.text,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: IrisTheme.bodySmall.copyWith(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _BattlecardSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final List<String> items;
  final Color itemColor;
  final bool isDark;
  final bool isQuoted;

  const _BattlecardSection({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.items,
    required this.itemColor,
    required this.isDark,
    this.isQuoted = false,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...items.asMap().entries.map((entry) {
            final item = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    margin: const EdgeInsets.only(top: 6),
                    decoration: BoxDecoration(
                      color: itemColor.withValues(alpha: 0.6),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: isQuoted
                        ? Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: itemColor.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(10),
                              border: Border(
                                left: BorderSide(
                                  color: itemColor.withValues(alpha: 0.4),
                                  width: 3,
                                ),
                              ),
                            ),
                            child: Text(
                              '"$item"',
                              style: IrisTheme.bodySmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          )
                        : Text(
                            item,
                            style: IrisTheme.bodySmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
