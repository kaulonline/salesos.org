import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/playbooks_service.dart';
import '../widgets/playbook_card.dart';

class PlaybooksPage extends ConsumerStatefulWidget {
  const PlaybooksPage({super.key});

  @override
  ConsumerState<PlaybooksPage> createState() => _PlaybooksPageState();
}

class _PlaybooksPageState extends ConsumerState<PlaybooksPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
    });
  }

  Future<void> _onRefresh() async {
    ref.invalidate(playbooksProvider);
  }

  List<PlaybookModel> _filterPlaybooks(List<PlaybookModel> playbooks) {
    if (_searchQuery.isEmpty) return playbooks;
    return playbooks.where((p) {
      return p.name.toLowerCase().contains(_searchQuery) ||
          (p.description?.toLowerCase().contains(_searchQuery) ?? false) ||
          (p.category?.toLowerCase().contains(_searchQuery) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final playbooksAsync = ref.watch(playbooksProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
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
                          'Playbooks',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        playbooksAsync.when(
                          data: (playbooks) {
                            final activeCount =
                                playbooks.where((p) => p.isActive).length;
                            return Text(
                              '$activeCount active playbook${activeCount == 1 ? '' : 's'}',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            );
                          },
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (_, _) => Text(
                            'Error loading playbooks',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? IrisTheme.darkSurfaceElevated
                          : IrisTheme.lightSurfaceElevated,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Iconsax.book_1,
                      size: 20,
                      color: isDark
                          ? LuxuryColors.jadePremium
                          : LuxuryColors.rolexGreen,
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: IrisSearchField(
                controller: _searchController,
                hint: 'Search playbooks...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Content
            Expanded(
              child: playbooksAsync.when(
                data: (playbooks) {
                  final filtered = _filterPlaybooks(playbooks);
                  if (filtered.isEmpty) {
                    if (_searchQuery.isNotEmpty) {
                      return IrisEmptyState.search(query: _searchQuery);
                    }
                    return IrisEmptyState(
                      icon: Iconsax.book_1,
                      title: 'No playbooks yet',
                      subtitle:
                          'Playbooks help guide your team through sales processes step by step',
                      tier: LuxuryTier.gold,
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    backgroundColor:
                        isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final playbook = filtered[index];
                        return PlaybookCard(
                          playbook: playbook,
                          onTap: () {
                            HapticFeedback.lightImpact();
                            context.push('/playbooks/${playbook.id}');
                          },
                        )
                            .animate(delay: (index * 50).ms)
                            .fadeIn()
                            .slideX(begin: 0.05);
                      },
                    ),
                  );
                },
                loading: () =>
                    const IrisListShimmer(itemCount: 5, itemHeight: 110),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Iconsax.warning_2,
                        size: 48,
                        color: IrisTheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load playbooks',
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
                          style: TextStyle(
                            color: isDark
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.rolexGreen,
                          ),
                        ),
                      ),
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
}
