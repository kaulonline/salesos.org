import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/discount_rules_service.dart';
import '../widgets/discount_rule_card.dart';

class DiscountRulesPage extends ConsumerStatefulWidget {
  const DiscountRulesPage({super.key});

  @override
  ConsumerState<DiscountRulesPage> createState() => _DiscountRulesPageState();
}

class _DiscountRulesPageState extends ConsumerState<DiscountRulesPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  DiscountRuleType? _selectedType;

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
    ref.invalidate(discountRulesProvider);
  }

  List<DiscountRule> _filter(List<DiscountRule> items) {
    var filtered = items;
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((item) =>
          item.name.toLowerCase().contains(_searchQuery) ||
          (item.code?.toLowerCase().contains(_searchQuery) ?? false)).toList();
    }
    if (_selectedType != null) {
      filtered = filtered.where((item) => item.type == _selectedType).toList();
    }
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(discountRulesProvider);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () { HapticFeedback.lightImpact(); context.pop(); },
                    icon: Icon(Iconsax.arrow_left,
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Discount Rules',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
                            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                style: TextStyle(fontSize: 15, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                decoration: InputDecoration(
                  hintText: 'Search discount rules...',
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

            // Type filter tabs
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _buildFilterChip('All', _selectedType == null, isDark, () {
                    HapticFeedback.lightImpact();
                    setState(() => _selectedType = null);
                  }),
                  const SizedBox(width: 8),
                  ...DiscountRuleType.values.map((type) {
                    final label = DiscountRule(id: '', name: '', discount: 0, type: type, createdAt: DateTime.now()).typeLabel;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _buildFilterChip(label, _selectedType == type, isDark, () {
                        HapticFeedback.lightImpact();
                        setState(() => _selectedType = type);
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
                      icon: Iconsax.ticket_discount,
                      title: _searchQuery.isNotEmpty || _selectedType != null
                          ? 'No discount rules found' : 'No discount rules yet',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search' : 'Create rules to manage pricing discounts',
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
                        child: DiscountRuleCard(
                          rule: filtered[index],
                          onTap: () => context.push('/settings/discount-rules/${filtered[index].id}'),
                          animationIndex: index,
                        ),
                      ),
                    ),
                  );
                },
                loading: () => const IrisListShimmer(itemCount: 6, itemHeight: 110, tier: LuxuryTier.gold),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                      const SizedBox(height: 16),
                      Text('Failed to load discount rules',
                          style: TextStyle(fontSize: 16, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                      const SizedBox(height: 16),
                      TextButton.icon(onPressed: _onRefresh, icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isActive, bool isDark, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
              : isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive
                ? LuxuryColors.champagneGold.withValues(alpha: 0.4)
                : isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.2),
          ),
        ),
        child: Text(label,
            style: TextStyle(fontSize: 12,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? LuxuryColors.champagneGold : LuxuryColors.textMuted)),
      ),
    );
  }
}
