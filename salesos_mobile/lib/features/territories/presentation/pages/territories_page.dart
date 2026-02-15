import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../data/territories_service.dart';
import 'territory_detail_page.dart';

class TerritoriesPage extends ConsumerStatefulWidget {
  const TerritoriesPage({super.key});

  @override
  ConsumerState<TerritoriesPage> createState() => _TerritoriesPageState();
}

class _TerritoriesPageState extends ConsumerState<TerritoriesPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<TerritoryModel> _filter(List<TerritoryModel> territories) {
    if (_searchQuery.isEmpty) return territories;
    return territories.where((t) {
      final query = _searchQuery.toLowerCase();
      return t.name.toLowerCase().contains(query) ||
          (t.description?.toLowerCase().contains(query) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final territoriesAsync = ref.watch(territoriesProvider);

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Territories',
        showBackButton: true,
        tier: LuxuryTier.gold,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: IrisSearchField(
              controller: _searchController,
              hint: 'Search territories...',
              tier: LuxuryTier.gold,
              onChanged: (value) {
                setState(() => _searchQuery = value);
              },
              onClear: () {
                setState(() => _searchQuery = '');
              },
            ),
          ),
          Expanded(
            child: territoriesAsync.when(
              loading: () => const IrisListShimmer(),
              error: (err, _) => IrisEmptyState.error(
                message: 'Failed to load territories',
                onRetry: () => ref.invalidate(territoriesProvider),
              ),
              data: (territories) {
                final filtered = _filter(territories);

                if (filtered.isEmpty) {
                  if (_searchQuery.isNotEmpty) {
                    return IrisEmptyState.search(query: _searchQuery);
                  }
                  return IrisEmptyState(
                    icon: Iconsax.map,
                    title: 'No territories',
                    subtitle: 'Territories will appear here when created.',
                  );
                }

                return RefreshIndicator(
                  color: LuxuryColors.champagneGold,
                  onRefresh: () async => ref.invalidate(territoriesProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final territory = filtered[index];
                      return _TerritoryCard(
                        territory: territory,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  TerritoryDetailPage(territoryId: territory.id),
                            ),
                          );
                        },
                      ).animate().fadeIn(delay: Duration(milliseconds: 50 * index));
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TerritoryCard extends StatelessWidget {
  final TerritoryModel territory;
  final VoidCallback? onTap;

  const _TerritoryCard({required this.territory, this.onTap});

  String _formatValue(double value) {
    if (value >= 1000000) return '\$${(value / 1000000).toStringAsFixed(1)}M';
    if (value >= 1000) return '\$${(value / 1000).toStringAsFixed(1)}K';
    return '\$${value.toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        padding: const EdgeInsets.all(16),
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.map,
                    color: LuxuryColors.champagneGold,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        territory.name,
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (territory.description != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          territory.description!,
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.6),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _MetricChip(
                  icon: Iconsax.profile_2user,
                  value: '${territory.memberCount}',
                  label: 'Members',
                ),
                const SizedBox(width: 12),
                _MetricChip(
                  icon: Iconsax.building,
                  value: '${territory.accountCount}',
                  label: 'Accounts',
                ),
                const SizedBox(width: 12),
                _MetricChip(
                  icon: Iconsax.dollar_circle,
                  value: _formatValue(territory.dealValue),
                  label: 'Deal Value',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _MetricChip({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, size: 14, color: LuxuryColors.champagneGold),
            const SizedBox(height: 4),
            Text(
              value,
              style: IrisTheme.bodySmall.copyWith(
                fontWeight: FontWeight.w600,
                color: LuxuryColors.textOnLight,
              ),
            ),
            Text(
              label,
              style: IrisTheme.labelSmall.copyWith(
                color: LuxuryColors.textMuted,
                fontSize: 9,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
