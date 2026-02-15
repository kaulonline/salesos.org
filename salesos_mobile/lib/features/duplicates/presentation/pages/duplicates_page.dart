import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/duplicates_service.dart';

class DuplicatesPage extends ConsumerWidget {
  const DuplicatesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupsAsync = ref.watch(duplicateGroupsProvider);

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Duplicate Detection',
        showBackButton: true,
        tier: LuxuryTier.gold,
        actions: [
          IrisAppBarAction(
            icon: Iconsax.refresh,
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(duplicateGroupsProvider),
          ),
        ],
      ),
      body: groupsAsync.when(
        loading: () => const IrisListShimmer(),
        error: (err, _) => IrisEmptyState.error(
          message: 'Failed to load duplicates',
          onRetry: () => ref.invalidate(duplicateGroupsProvider),
        ),
        data: (groups) {
          if (groups.isEmpty) {
            return IrisEmptyState(
              icon: Iconsax.copy,
              title: 'No duplicates found',
              subtitle: 'Your data looks clean! No potential duplicates detected.',
            );
          }

          return RefreshIndicator(
            color: LuxuryColors.champagneGold,
            onRefresh: () async => ref.invalidate(duplicateGroupsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: groups.length,
              itemBuilder: (context, index) {
                final group = groups[index];
                return _DuplicateGroupCard(
                  group: group,
                  onMerge: () async {
                    HapticFeedback.mediumImpact();
                    final service = ref.read(duplicatesServiceProvider);
                    final success = await service.merge(group.id);
                    if (success) {
                      ref.invalidate(duplicateGroupsProvider);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Records merged successfully')),
                        );
                      }
                    } else {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to merge records')),
                        );
                      }
                    }
                  },
                ).animate().fadeIn(delay: Duration(milliseconds: 60 * index));
              },
            ),
          );
        },
      ),
    );
  }
}

class _DuplicateGroupCard extends StatelessWidget {
  final DuplicateGroupModel group;
  final VoidCallback? onMerge;

  const _DuplicateGroupCard({required this.group, this.onMerge});

  Color _confidenceColor(double confidence) {
    if (confidence >= 0.9) return LuxuryColors.errorRuby;
    if (confidence >= 0.7) return LuxuryColors.warningAmber;
    return LuxuryColors.textMuted;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confColor = _confidenceColor(group.confidence);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: LuxuryColors.warningAmber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.copy,
                    color: LuxuryColors.warningAmber,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${group.recordCount} Potential Duplicates',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      LuxuryBadge(
                        text: group.entityType,
                        tier: LuxuryTier.gold,
                      ),
                    ],
                  ),
                ),
                // Confidence badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: confColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: confColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${(group.confidence * 100).toStringAsFixed(0)}%',
                        style: IrisTheme.bodySmall.copyWith(
                          color: confColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        group.confidenceLabel,
                        style: IrisTheme.labelSmall.copyWith(
                          color: confColor,
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Records list (side-by-side comparison)
            ...group.records.asMap().entries.map((entry) {
              final i = entry.key;
              final record = entry.value;
              final recordName =
                  record['name'] as String? ?? record['email'] as String? ?? 'Record ${i + 1}';

              return Container(
                margin: EdgeInsets.only(bottom: i < group.records.length - 1 ? 8 : 0),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.03)
                      : LuxuryColors.champagneGold.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.06)
                        : Colors.black.withValues(alpha: 0.05),
                  ),
                ),
                child: Row(
                  children: [
                    LuxuryAvatar(
                      initials: recordName.isNotEmpty
                          ? recordName[0].toUpperCase()
                          : '?',
                      size: 32,
                      tier: LuxuryTier.gold,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            recordName,
                            style: IrisTheme.bodySmall.copyWith(
                              fontWeight: FontWeight.w500,
                              color: isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight,
                            ),
                          ),
                          if (record['email'] != null)
                            Text(
                              record['email'] as String,
                              style: IrisTheme.labelSmall.copyWith(
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (record['id'] != null)
                      Text(
                        '#${(record['id'] as String).substring(0, 6)}',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.textMuted,
                          fontFamily: 'monospace',
                        ),
                      ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 16),

            // Merge button
            Center(
              child: IrisButton(
                label: 'Merge Records',
                onPressed: onMerge,
                variant: IrisButtonVariant.gold,
                icon: Iconsax.convert_3d_cube,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
