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
import 'automation_detail_page.dart';

class AutomationsPage extends ConsumerStatefulWidget {
  const AutomationsPage({super.key});

  @override
  ConsumerState<AutomationsPage> createState() => _AutomationsPageState();
}

class _AutomationsPageState extends ConsumerState<AutomationsPage> {
  String _filter = 'ALL'; // ALL, ENABLED, DISABLED

  List<WorkflowModel> _filterWorkflows(List<WorkflowModel> workflows) {
    if (_filter == 'ENABLED') {
      return workflows.where((w) => w.isEnabled).toList();
    }
    if (_filter == 'DISABLED') {
      return workflows.where((w) => !w.isEnabled).toList();
    }
    return workflows;
  }

  @override
  Widget build(BuildContext context) {
    final automationsAsync = ref.watch(automationsProvider);

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Automations',
        showBackButton: true,
        tier: LuxuryTier.gold,
      ),
      body: Column(
        children: [
          // Filter chips
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Row(
              children: [
                for (final filter in ['ALL', 'ENABLED', 'DISABLED'])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: LuxuryChip(
                      label: filter,
                      selected: _filter == filter,
                      tier: LuxuryTier.gold,
                      onTap: () => setState(() => _filter = filter),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: automationsAsync.when(
              loading: () => const IrisListShimmer(),
              error: (err, _) => IrisEmptyState.error(
                message: 'Failed to load automations',
                onRetry: () => ref.invalidate(automationsProvider),
              ),
              data: (workflows) {
                final filtered = _filterWorkflows(workflows);

                if (filtered.isEmpty) {
                  return IrisEmptyState(
                    icon: Iconsax.flash,
                    title: 'No automations',
                    subtitle: _filter != 'ALL'
                        ? 'No $_filter automations found.'
                        : 'Create workflows to automate your sales processes.',
                  );
                }

                return RefreshIndicator(
                  color: LuxuryColors.champagneGold,
                  onRefresh: () async => ref.invalidate(automationsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final workflow = filtered[index];
                      return _WorkflowCard(
                        workflow: workflow,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  AutomationDetailPage(automationId: workflow.id),
                            ),
                          );
                        },
                        onToggle: (enabled) async {
                          final service = ref.read(automationsServiceProvider);
                          final success =
                              await service.toggle(workflow.id, enabled);
                          if (success) {
                            ref.invalidate(automationsProvider);
                          }
                        },
                      ).animate().fadeIn(
                            delay: Duration(milliseconds: 50 * index),
                          );
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

class _WorkflowCard extends StatelessWidget {
  final WorkflowModel workflow;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onToggle;

  const _WorkflowCard({
    required this.workflow,
    this.onTap,
    this.onToggle,
  });

  String _formatDate(DateTime? dt) {
    if (dt == null) return 'Never';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
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
                    color: (workflow.isEnabled
                            ? LuxuryColors.successGreen
                            : LuxuryColors.textMuted)
                        .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.flash,
                    color: workflow.isEnabled
                        ? LuxuryColors.successGreen
                        : LuxuryColors.textMuted,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        workflow.name,
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      LuxuryBadge(
                        text: workflow.trigger,
                        tier: LuxuryTier.gold,
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: workflow.isEnabled,
                  activeThumbColor: LuxuryColors.successGreen,
                  onChanged: (value) {
                    HapticFeedback.lightImpact();
                    onToggle?.call(value);
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Iconsax.clock, size: 14, color: LuxuryColors.textMuted),
                const SizedBox(width: 6),
                Text(
                  'Last run: ${_formatDate(workflow.lastRunAt)}',
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
                const Spacer(),
                Icon(Iconsax.repeat, size: 14, color: LuxuryColors.textMuted),
                const SizedBox(width: 6),
                Text(
                  '${workflow.runCount} runs',
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
