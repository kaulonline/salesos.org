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
import '../../data/automations_service.dart';

class AutomationDetailPage extends ConsumerWidget {
  final String automationId;

  const AutomationDetailPage({super.key, required this.automationId});

  String _formatDate(DateTime? dt) {
    if (dt == null) return 'Never';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(automationDetailProvider(automationId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Automation Details',
        showBackButton: true,
        tier: LuxuryTier.gold,
      ),
      body: detailAsync.when(
        loading: () => const IrisDashboardShimmer(),
        error: (err, _) => IrisEmptyState.error(
          message: 'Failed to load automation',
          onRetry: () =>
              ref.invalidate(automationDetailProvider(automationId)),
        ),
        data: (workflow) {
          if (workflow == null) {
            return IrisEmptyState(
              icon: Iconsax.flash,
              title: 'Automation not found',
              subtitle: 'This automation may have been removed.',
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
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
                              color: (workflow.isEnabled
                                      ? LuxuryColors.successGreen
                                      : LuxuryColors.textMuted)
                                  .withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Icon(
                              Iconsax.flash,
                              color: workflow.isEnabled
                                  ? LuxuryColors.successGreen
                                  : LuxuryColors.textMuted,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  workflow.name,
                                  style: IrisTheme.titleLarge.copyWith(
                                    color: isDark
                                        ? LuxuryColors.textOnDark
                                        : LuxuryColors.textOnLight,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                LuxuryBadge(
                                  text:
                                      workflow.isEnabled ? 'Enabled' : 'Disabled',
                                  color: workflow.isEnabled
                                      ? LuxuryColors.successGreen
                                      : LuxuryColors.textMuted,
                                  tier: LuxuryTier.gold,
                                ),
                              ],
                            ),
                          ),
                          Switch.adaptive(
                            value: workflow.isEnabled,
                            activeThumbColor: LuxuryColors.successGreen,
                            onChanged: (value) async {
                              HapticFeedback.lightImpact();
                              final service =
                                  ref.read(automationsServiceProvider);
                              final success = await service.toggle(
                                  workflow.id, value);
                              if (success) {
                                ref.invalidate(
                                    automationDetailProvider(automationId));
                              }
                            },
                          ),
                        ],
                      ),
                      if (workflow.description != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          workflow.description!,
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

                // Run stats
                Row(
                  children: [
                    Expanded(
                      child: LuxuryCard(
                        tier: LuxuryTier.gold,
                        padding: const EdgeInsets.all(16),
                        child: LuxuryMetric(
                          value: '${workflow.runCount}',
                          label: 'Total Runs',
                          tier: LuxuryTier.gold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: LuxuryCard(
                        tier: LuxuryTier.gold,
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _formatDate(workflow.lastRunAt),
                              style: IrisTheme.titleMedium.copyWith(
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'LAST RUN',
                              style: IrisTheme.labelSmall.copyWith(
                                color: LuxuryColors.rolexGreen,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1),
                const SizedBox(height: 24),

                // Trigger section
                LuxurySectionHeader(
                  title: 'Trigger',
                  subtitle: 'What starts this automation',
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 12),
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: LuxuryColors.warningAmber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Iconsax.flash_circle,
                          color: LuxuryColors.warningAmber,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          workflow.trigger,
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                const SizedBox(height: 24),

                // Conditions section
                LuxurySectionHeader(
                  title: 'Conditions',
                  subtitle: '${workflow.conditions.length} conditions',
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 12),
                if (workflow.conditions.isEmpty)
                  LuxuryCard(
                    tier: LuxuryTier.gold,
                    padding: const EdgeInsets.all(20),
                    child: Center(
                      child: Text(
                        'No conditions set - runs on all triggers',
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ),
                  )
                else
                  ...workflow.conditions.asMap().entries.map((entry) {
                    final i = entry.key;
                    final condition = entry.value;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: LuxuryCard(
                        tier: LuxuryTier.gold,
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: LuxuryColors.rolexGreen
                                    .withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Text(
                                  '${i + 1}',
                                  style: IrisTheme.labelSmall.copyWith(
                                    color: LuxuryColors.rolexGreen,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                condition['description'] as String? ??
                                    '${condition['field'] ?? ''} ${condition['operator'] ?? ''} ${condition['value'] ?? ''}',
                                style: IrisTheme.bodySmall.copyWith(
                                  color: isDark
                                      ? LuxuryColors.textOnDark
                                      : LuxuryColors.textOnLight,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 24),

                // Actions section
                LuxurySectionHeader(
                  title: 'Actions',
                  subtitle: '${workflow.actions.length} actions',
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 12),
                if (workflow.actions.isEmpty)
                  LuxuryCard(
                    tier: LuxuryTier.gold,
                    padding: const EdgeInsets.all(20),
                    child: Center(
                      child: Text(
                        'No actions configured',
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ),
                  )
                else
                  ...workflow.actions.asMap().entries.map((entry) {
                    final i = entry.key;
                    final action = entry.value;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: LuxuryCard(
                        tier: LuxuryTier.gold,
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: LuxuryColors.champagneGold
                                    .withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Text(
                                  '${i + 1}',
                                  style: IrisTheme.labelSmall.copyWith(
                                    color: LuxuryColors.champagneGold,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    action['type'] as String? ?? 'Action',
                                    style: IrisTheme.bodySmall.copyWith(
                                      color: isDark
                                          ? LuxuryColors.textOnDark
                                          : LuxuryColors.textOnLight,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  if (action['description'] != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      action['description'] as String,
                                      style: IrisTheme.labelSmall.copyWith(
                                        color: LuxuryColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}
