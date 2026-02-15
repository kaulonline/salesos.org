import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/email_service.dart';

/// Template picker bottom sheet
/// Shows templates with search and category filter
class TemplatePicker extends ConsumerStatefulWidget {
  final void Function(EmailTemplateModel template) onSelect;

  const TemplatePicker({
    super.key,
    required this.onSelect,
  });

  /// Show the template picker as a modal bottom sheet
  static Future<EmailTemplateModel?> show(BuildContext context) async {
    EmailTemplateModel? selected;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          builder: (_, scrollController) {
            final isDark = Theme.of(ctx).brightness == Brightness.dark;
            return Container(
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                ),
              ),
              child: TemplatePicker(
                onSelect: (template) {
                  selected = template;
                  Navigator.of(ctx).pop();
                },
              ),
            );
          },
        );
      },
    );

    return selected;
  }

  @override
  ConsumerState<TemplatePicker> createState() => _TemplatePickerState();
}

class _TemplatePickerState extends ConsumerState<TemplatePicker> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedCategory;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
            t.subject.toLowerCase().contains(_searchQuery) ||
            (t.category?.toLowerCase().contains(_searchQuery) ?? false);
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

    return Column(
      children: [
        // Handle bar
        Center(
          child: Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: LuxuryColors.textMuted.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),

        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Row(
            children: [
              Icon(Iconsax.document_text, size: 20,
                  color: LuxuryColors.champagneGold),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Select Template',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Icon(
                  Icons.close,
                  size: 20,
                  color: LuxuryColors.textMuted,
                ),
              ),
            ],
          ),
        ),

        // Search
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: IrisSearchField(
            controller: _searchController,
            hint: 'Search templates...',
            onChanged: (value) {
              setState(() => _searchQuery = value.toLowerCase());
            },
          ),
        ),

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
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          setState(() => _selectedCategory = null);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: isActive
                                ? LuxuryColors.rolexGreen
                                : (isDark
                                    ? IrisTheme.darkSurfaceElevated
                                    : IrisTheme.lightSurfaceElevated),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'All',
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
                  final category = categories[index - 1];
                  final isActive = _selectedCategory == category;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        setState(() => _selectedCategory =
                            isActive ? null : category);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: isActive
                              ? LuxuryColors.rolexGreen
                              : (isDark
                                  ? IrisTheme.darkSurfaceElevated
                                  : IrisTheme.lightSurfaceElevated),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          category,
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
                  icon: Iconsax.document,
                  title: 'No templates found',
                  subtitle: 'Try adjusting your search or filters',
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final template = filtered[index];
                  return _TemplatePreviewCard(
                    template: template,
                    onTap: () => widget.onSelect(template),
                  ).animate(delay: (index * 40).ms).fadeIn().slideY(
                        begin: 0.05,
                      );
                },
              );
            },
            loading: () => const IrisListShimmer(
              itemCount: 4,
              itemHeight: 80,
            ),
            error: (error, _) => Center(
              child: Text(
                'Failed to load templates',
                style: IrisTheme.bodyMedium.copyWith(color: IrisTheme.error),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Template preview card
class _TemplatePreviewCard extends StatelessWidget {
  final EmailTemplateModel template;
  final VoidCallback onTap;

  const _TemplatePreviewCard({
    required this.template,
    required this.onTap,
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
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Iconsax.document_text_1,
                  size: 18,
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
                    if (template.category != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        template.category!,
                        style: IrisTheme.caption.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Iconsax.arrow_right_3,
                size: 16,
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Subject: ${template.subject}',
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
    );
  }
}
