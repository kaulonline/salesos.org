import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/pipelines_service.dart';
import '../widgets/pipeline_card.dart';

class PipelinesPage extends ConsumerStatefulWidget {
  const PipelinesPage({super.key});

  @override
  ConsumerState<PipelinesPage> createState() => _PipelinesPageState();
}

class _PipelinesPageState extends ConsumerState<PipelinesPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

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
    ref.invalidate(pipelinesProvider);
  }

  List<Pipeline> _filter(List<Pipeline> items) {
    if (_searchQuery.isEmpty) return items;
    return items.where((item) =>
        item.name.toLowerCase().contains(_searchQuery) ||
        (item.description?.toLowerCase().contains(_searchQuery) ?? false)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(pipelinesProvider);

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
                Expanded(child: Text('Pipelines',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
              ]),
            ).animate().fadeIn(duration: 300.ms),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                style: TextStyle(fontSize: 15, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                decoration: InputDecoration(
                  hintText: 'Search pipelines...',
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

            Expanded(
              child: asyncData.when(
                data: (items) {
                  final filtered = _filter(items);
                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.hierarchy_3,
                      title: _searchQuery.isNotEmpty ? 'No pipelines found' : 'No pipelines yet',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search' : 'Create a pipeline to manage your deals',
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
                        child: PipelineCard(
                          pipeline: filtered[index],
                          onTap: () => context.push('/settings/pipelines/${filtered[index].id}'),
                          animationIndex: index,
                        ),
                      ),
                    ),
                  );
                },
                loading: () => const IrisListShimmer(itemCount: 6, itemHeight: 130, tier: LuxuryTier.gold),
                error: (error, _) => Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                    const SizedBox(height: 16),
                    Text('Failed to load pipelines',
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
}
