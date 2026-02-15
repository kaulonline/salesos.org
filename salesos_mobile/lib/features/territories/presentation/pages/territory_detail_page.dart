import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/territories_service.dart';

class TerritoryDetailPage extends ConsumerWidget {
  final String territoryId;

  const TerritoryDetailPage({super.key, required this.territoryId});

  String _formatValue(double value) {
    if (value >= 1000000) return '\$${(value / 1000000).toStringAsFixed(1)}M';
    if (value >= 1000) return '\$${(value / 1000).toStringAsFixed(1)}K';
    return '\$${value.toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(territoryDetailProvider(territoryId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Territory Details',
        showBackButton: true,
        tier: LuxuryTier.gold,
      ),
      body: detailAsync.when(
        loading: () => const IrisDashboardShimmer(),
        error: (err, _) => IrisEmptyState.error(
          message: 'Failed to load territory',
          onRetry: () => ref.invalidate(territoryDetailProvider(territoryId)),
        ),
        data: (territory) {
          if (territory == null) {
            return IrisEmptyState(
              icon: Iconsax.map,
              title: 'Territory not found',
              subtitle: 'This territory may have been removed.',
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header card
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  variant: LuxuryCardVariant.accent,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: LuxuryColors.champagneGold
                                  .withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Icon(
                              Iconsax.map,
                              color: LuxuryColors.champagneGold,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              territory.name,
                              style: IrisTheme.titleLarge.copyWith(
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (territory.description != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          territory.description!,
                          style: IrisTheme.bodyMedium.copyWith(
                            color: LuxuryColors.textMuted,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1),
                const SizedBox(height: 20),

                // Stats row
                Row(
                  children: [
                    Expanded(
                      child: LuxuryCard(
                        tier: LuxuryTier.gold,
                        padding: const EdgeInsets.all(16),
                        child: LuxuryMetric(
                          value: '${territory.memberCount}',
                          label: 'Members',
                          tier: LuxuryTier.gold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: LuxuryCard(
                        tier: LuxuryTier.gold,
                        padding: const EdgeInsets.all(16),
                        child: LuxuryMetric(
                          value: '${territory.accountCount}',
                          label: 'Accounts',
                          tier: LuxuryTier.gold,
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1),
                const SizedBox(height: 12),

                // Deal value card
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  variant: LuxuryCardVariant.premium,
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Iconsax.dollar_circle,
                          color: LuxuryColors.rolexGreen,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 16),
                      LuxuryMetric(
                        value: _formatValue(territory.dealValue),
                        label: 'Total Deal Value',
                        tier: LuxuryTier.gold,
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                const SizedBox(height: 24),

                // Members section
                LuxurySectionHeader(
                  title: 'Members',
                  subtitle: '${territory.memberCount} team members',
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 12),
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  padding: const EdgeInsets.all(20),
                  child: territory.memberCount > 0
                      ? Column(
                          children: List.generate(
                            territory.memberCount.clamp(0, 5),
                            (i) => Padding(
                              padding: EdgeInsets.only(
                                  bottom: i < territory.memberCount - 1 ? 12 : 0),
                              child: Row(
                                children: [
                                  LuxuryAvatar(
                                    initials: 'M${i + 1}',
                                    tier: LuxuryTier.gold,
                                    size: 36,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Team Member ${i + 1}',
                                      style: IrisTheme.bodyMedium.copyWith(
                                        color: isDark
                                            ? LuxuryColors.textOnDark
                                            : LuxuryColors.textOnLight,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            'No members assigned',
                            style: IrisTheme.bodySmall.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                        ),
                ).animate().fadeIn(delay: 250.ms).slideY(begin: 0.1),
                const SizedBox(height: 24),

                // Accounts section
                LuxurySectionHeader(
                  title: 'Accounts',
                  subtitle: '${territory.accountCount} assigned accounts',
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 12),
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  padding: const EdgeInsets.all(20),
                  child: territory.accountCount > 0
                      ? Column(
                          children: List.generate(
                            territory.accountCount.clamp(0, 5),
                            (i) => Padding(
                              padding: EdgeInsets.only(
                                  bottom: i < territory.accountCount - 1 ? 12 : 0),
                              child: Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: LuxuryColors.rolexGreen
                                          .withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      Iconsax.building,
                                      size: 18,
                                      color: LuxuryColors.rolexGreen,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Account ${i + 1}',
                                      style: IrisTheme.bodyMedium.copyWith(
                                        color: isDark
                                            ? LuxuryColors.textOnDark
                                            : LuxuryColors.textOnLight,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            'No accounts assigned',
                            style: IrisTheme.bodySmall.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                        ),
                ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
              ],
            ),
          );
        },
      ),
    );
  }
}
