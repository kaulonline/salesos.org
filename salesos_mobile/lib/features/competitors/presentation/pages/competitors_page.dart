import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../data/competitors_service.dart';

class CompetitorsPage extends ConsumerStatefulWidget {
  const CompetitorsPage({super.key});

  @override
  ConsumerState<CompetitorsPage> createState() => _CompetitorsPageState();
}

class _CompetitorsPageState extends ConsumerState<CompetitorsPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(competitorsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final competitorsAsync = ref.watch(competitorsProvider);

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
                          'Battlecards',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Competitor intelligence & differentiators',
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

            // Search
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: IrisSearchField(
                controller: _searchController,
                hint: 'Search competitors...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),
            const SizedBox(height: 16),

            // List
            Expanded(
              child: competitorsAsync.when(
                data: (competitors) {
                  final filtered = _searchQuery.isEmpty
                      ? competitors
                      : competitors.where((c) =>
                          c.name.toLowerCase().contains(_searchQuery) ||
                          (c.description?.toLowerCase().contains(_searchQuery) ?? false) ||
                          (c.targetMarket?.toLowerCase().contains(_searchQuery) ?? false))
                          .toList();

                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.shield_cross,
                      title: 'No competitors found',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try a different search term'
                          : 'Add competitor battlecards to get started',
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                    backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        return _CompetitorCard(
                          competitor: filtered[index],
                          isDark: isDark,
                        ).animate(delay: (index * 60).ms).fadeIn().slideX(begin: 0.05);
                      },
                    ),
                  );
                },
                loading: () => Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: List.generate(4, (_) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: IrisShimmer(width: double.infinity, height: 100),
                    )),
                  ),
                ),
                error: (_, _) => Center(
                  child: IrisEmptyState(
                    icon: Iconsax.warning_2,
                    title: 'Unable to load competitors',
                    actionLabel: 'Retry',
                    onAction: _onRefresh,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompetitorCard extends StatelessWidget {
  final CompetitorModel competitor;
  final bool isDark;

  const _CompetitorCard({
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
    final wr = competitor.winRate;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: LuxuryCard(
        padding: const EdgeInsets.all(16),
        onTap: () {
          context.push('/competitors/${competitor.id}');
        },
        child: Row(
          children: [
            // Logo/initial
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  competitor.name.isNotEmpty
                      ? competitor.name.substring(0, 1).toUpperCase()
                      : '?',
                  style: IrisTheme.titleLarge.copyWith(
                    color: LuxuryColors.champagneGold,
                    fontWeight: FontWeight.w700,
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
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Tier + Status badges row
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _MiniPill(
                        text: competitor.tierLabel,
                        color: _tierColor(),
                        isDark: isDark,
                      ),
                      _MiniPill(
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
                  if (competitor.description != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      competitor.description!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  // Win rate indicator
                  if (wr != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Iconsax.chart_2,
                          size: 12,
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${wr.toStringAsFixed(0)}% win rate',
                          style: IrisTheme.bodySmall.copyWith(
                            fontSize: 11,
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${competitor.winsAgainst}W / ${competitor.lossesAgainst}L',
                          style: IrisTheme.bodySmall.copyWith(
                            fontSize: 11,
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
          ],
        ),
      ),
    );
  }
}

/// Small pill for tier/status badges on the list card.
class _MiniPill extends StatelessWidget {
  final String text;
  final Color color;
  final bool isDark;

  const _MiniPill({
    required this.text,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: IrisTheme.bodySmall.copyWith(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
