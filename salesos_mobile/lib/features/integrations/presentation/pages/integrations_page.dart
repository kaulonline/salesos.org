import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/integrations_service.dart';
import '../widgets/integration_card.dart';

class IntegrationsPage extends ConsumerStatefulWidget {
  const IntegrationsPage({super.key});

  @override
  ConsumerState<IntegrationsPage> createState() => _IntegrationsPageState();
}

class _IntegrationsPageState extends ConsumerState<IntegrationsPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  IntegrationCategory? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text.toLowerCase());
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(integrationsProvider);
  }

  List<Integration> _filter(List<Integration> items) {
    var filtered = items;
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((item) =>
          item.name.toLowerCase().contains(_searchQuery) ||
          (item.description?.toLowerCase().contains(_searchQuery) ?? false) ||
          item.categoryLabel.toLowerCase().contains(_searchQuery)).toList();
    }
    if (_selectedCategory != null) {
      filtered = filtered.where((item) => item.category == _selectedCategory).toList();
    }
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(integrationsProvider);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(children: [
                IconButton(
                  onPressed: () { HapticFeedback.lightImpact(); context.pop(); },
                  icon: Icon(Iconsax.arrow_left,
                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                ),
                const SizedBox(width: 8),
                Expanded(child: Text('Integrations',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
              ]),
            ).animate().fadeIn(duration: 300.ms),

            // Summary
            asyncData.when(
              data: (items) {
                final connected = items.where((i) => i.isConnected).length;
                return Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                  child: Row(children: [
                    _SummaryChip(label: 'Available', value: '${items.length}', color: LuxuryColors.champagneGold, isDark: isDark),
                    const SizedBox(width: 12),
                    _SummaryChip(label: 'Connected', value: '$connected', color: LuxuryColors.successGreen, isDark: isDark),
                  ]),
                ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1);
              },
              loading: () => const SizedBox(height: 60),
              error: (e, s) => const SizedBox(height: 60),
            ),

            const SizedBox(height: 16),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                style: TextStyle(fontSize: 15, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                decoration: InputDecoration(
                  hintText: 'Search integrations...',
                  hintStyle: TextStyle(color: LuxuryColors.textMuted),
                  prefixIcon: Icon(Iconsax.search_normal, size: 20, color: LuxuryColors.champagneGold),
                  filled: true,
                  fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: LuxuryColors.champagneGold)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ).animate(delay: 100.ms).fadeIn(),

            const SizedBox(height: 12),

            // Category filter
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _chip('All', _selectedCategory == null, isDark, () {
                    HapticFeedback.lightImpact();
                    setState(() => _selectedCategory = null);
                  }),
                  const SizedBox(width: 8),
                  ...IntegrationCategory.values.map((cat) {
                    final label = Integration(id: '', name: '', category: cat).categoryLabel;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _chip(label, _selectedCategory == cat, isDark, () {
                        HapticFeedback.lightImpact();
                        setState(() => _selectedCategory = cat);
                      }),
                    );
                  }),
                ],
              ),
            ).animate(delay: 150.ms).fadeIn(),

            const SizedBox(height: 12),

            Expanded(
              child: asyncData.when(
                data: (items) {
                  final filtered = _filter(items);
                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.link,
                      title: _searchQuery.isNotEmpty || _selectedCategory != null
                          ? 'No integrations found' : 'No integrations available',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search' : 'Integrations will appear here',
                      tier: LuxuryTier.gold,
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: LuxuryColors.champagneGold,
                    backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: IntegrationCard(
                          integration: filtered[index],
                          onTap: () => context.push('/settings/integrations/${filtered[index].id}'),
                          animationIndex: index,
                        ),
                      ),
                    ),
                  );
                },
                loading: () => const IrisListShimmer(itemCount: 6, itemHeight: 90, tier: LuxuryTier.gold),
                error: (error, _) => Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                    const SizedBox(height: 16),
                    Text('Failed to load integrations',
                        style: TextStyle(fontSize: 16, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                    const SizedBox(height: 16),
                    TextButton.icon(onPressed: _onRefresh, icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, bool isActive, bool isDark, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
              : isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isActive ? LuxuryColors.champagneGold.withValues(alpha: 0.4)
              : isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.2)),
        ),
        child: Text(label, style: TextStyle(fontSize: 12,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
            color: isActive ? LuxuryColors.champagneGold : LuxuryColors.textMuted)),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _SummaryChip({required this.label, required this.value, required this.color, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: color)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
          ],
        ),
      ),
    );
  }
}
