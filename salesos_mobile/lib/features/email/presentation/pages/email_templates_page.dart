import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/email_service.dart';

class EmailTemplatesPage extends ConsumerStatefulWidget {
  const EmailTemplatesPage({super.key});

  @override
  ConsumerState<EmailTemplatesPage> createState() =>
      _EmailTemplatesPageState();
}

class _EmailTemplatesPageState extends ConsumerState<EmailTemplatesPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedCategory;

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
    ref.invalidate(emailTemplatesProvider);
  }

  List<EmailTemplateModel> _filterTemplates(
      List<EmailTemplateModel> templates) {
    var filtered = templates;

    // Apply category filter
    if (_selectedCategory != null) {
      filtered = filtered
          .where((t) =>
              t.category?.toLowerCase() == _selectedCategory!.toLowerCase())
          .toList();
    }

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((t) {
        return t.name.toLowerCase().contains(_searchQuery) ||
            t.subject.toLowerCase().contains(_searchQuery);
      }).toList();
    }

    return filtered;
  }

  List<String> _getCategories(List<EmailTemplateModel> templates) {
    final categories = <String>{};
    for (final t in templates) {
      if (t.category != null && t.category!.isNotEmpty) {
        categories.add(t.category!);
      }
    }
    return categories.toList()..sort();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final templatesAsync = ref.watch(emailTemplatesProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          HapticFeedback.mediumImpact();
          context.push('/email/compose');
        },
        backgroundColor: LuxuryColors.rolexGreen,
        child: const Icon(Iconsax.edit, color: Colors.white),
      ),
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
                          'Email Templates',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        templatesAsync.when(
                          data: (templates) => Text(
                            '${templates.length} templates available',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (_, _) => Text(
                            'Error loading templates',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
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
                hint: 'Search templates...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 12),

            // Category chips
            templatesAsync.when(
              data: (templates) {
                final categories = _getCategories(templates);
                if (categories.isEmpty) return const SizedBox.shrink();
                return SizedBox(
                  height: 36,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: categories.length + 1,
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        final isActive = _selectedCategory == null;
                        return _CategoryChip(
                          label: 'All',
                          isActive: isActive,
                          onTap: () {
                            HapticFeedback.lightImpact();
                            setState(() => _selectedCategory = null);
                          },
                        );
                      }
                      final category = categories[index - 1];
                      final isActive = _selectedCategory == category;
                      return _CategoryChip(
                        label: category,
                        isActive: isActive,
                        onTap: () {
                          HapticFeedback.lightImpact();
                          setState(() => _selectedCategory =
                              isActive ? null : category);
                        },
                      );
                    },
                  ),
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (_, _) => const SizedBox.shrink(),
            ),

            const SizedBox(height: 12),

            // Template list
            Expanded(
              child: templatesAsync.when(
                data: (templates) {
                  final filtered = _filterTemplates(templates);
                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.sms,
                      title: 'No templates found',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search'
                          : 'Email templates will appear here',
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    backgroundColor: isDark
                        ? IrisTheme.darkSurface
                        : IrisTheme.lightSurface,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final template = filtered[index];
                        return _TemplateCard(
                          template: template,
                          onTap: () => context.push(
                            '/email/compose',
                            extra: template,
                          ),
                        ).animate(delay: (index * 50).ms).fadeIn().slideX(
                              begin: 0.05,
                            );
                      },
                    ),
                  );
                },
                loading: () => const IrisListShimmer(
                  itemCount: 5,
                  itemHeight: 100,
                ),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.warning_2,
                          size: 48, color: IrisTheme.error),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load templates',
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

/// Category filter chip
class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isActive
                ? LuxuryColors.rolexGreen
                : (isDark
                    ? IrisTheme.darkSurfaceElevated
                    : IrisTheme.lightSurfaceElevated),
            borderRadius: BorderRadius.circular(20),
            border: isActive
                ? null
                : Border.all(
                    color: isDark
                        ? IrisTheme.darkBorder
                        : IrisTheme.lightBorder,
                  ),
          ),
          child: Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: isActive
                  ? Colors.white
                  : (isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

/// Template preview card
class _TemplateCard extends StatelessWidget {
  final EmailTemplateModel template;
  final VoidCallback? onTap;

  const _TemplateCard({
    required this.template,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
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
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Iconsax.sms,
                  size: 20,
                  color: LuxuryColors.champagneGold,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      template.name,
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      template.subject,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (template.category != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDark
                        ? IrisTheme.darkSurfaceElevated
                        : IrisTheme.lightSurfaceElevated,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    template.category!,
                    style: IrisTheme.caption.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(
            template.body,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
              height: 1.4,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
