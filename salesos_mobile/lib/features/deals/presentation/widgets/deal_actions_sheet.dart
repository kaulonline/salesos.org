import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/network/api_client.dart';

/// Action definition for deal actions sheet
class _DealActionItem {
  final String label;
  final String description;
  final IconData icon;
  final Color color;
  final Future<void> Function(BuildContext context, WidgetRef ref) action;

  const _DealActionItem({
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
    required this.action,
  });
}

/// Bottom sheet with deal actions: Advance Stage, Close Won, Close Lost, Analyze (AI)
class DealActionsSheet extends ConsumerWidget {
  final String dealId;
  final String currentStage;
  final VoidCallback? onActionComplete;

  const DealActionsSheet({
    super.key,
    required this.dealId,
    required this.currentStage,
    this.onActionComplete,
  });

  /// Show the deal actions bottom sheet
  static Future<void> show({
    required BuildContext context,
    required String dealId,
    required String currentStage,
    VoidCallback? onActionComplete,
  }) {
    HapticFeedback.mediumImpact();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => DealActionsSheet(
        dealId: dealId,
        currentStage: currentStage,
        onActionComplete: onActionComplete,
      ),
    );
  }

  String _getNextStage(String current) {
    const stages = [
      'Prospecting',
      'Qualification',
      'Needs Analysis',
      'Value Proposition',
      'Decision Makers Identified',
      'Perception Analysis',
      'Proposal/Price Quote',
      'Negotiation/Review',
    ];

    final normalized = current.toLowerCase().trim();
    for (int i = 0; i < stages.length - 1; i++) {
      if (stages[i].toLowerCase() == normalized) {
        return stages[i + 1];
      }
    }
    // Backward compat: handle old "Id. Decision Makers" label
    if (normalized == 'id. decision makers') {
      return 'Perception Analysis';
    }
    return stages.last;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nextStage = _getNextStage(currentStage);

    final actions = <_DealActionItem>[
      // Advance Stage
      _DealActionItem(
        label: 'Advance Stage',
        description: 'Move to $nextStage',
        icon: Iconsax.arrow_right_1,
        color: LuxuryColors.infoCobalt,
        action: (ctx, r) => _advanceStage(ctx, r, nextStage),
      ),
      // Close Won
      _DealActionItem(
        label: 'Close Won',
        description: 'Mark this deal as won',
        icon: Iconsax.tick_circle,
        color: LuxuryColors.rolexGreen,
        action: (ctx, r) => _closeWon(ctx, r),
      ),
      // Close Lost
      _DealActionItem(
        label: 'Close Lost',
        description: 'Mark this deal as lost',
        icon: Iconsax.close_circle,
        color: LuxuryColors.errorRuby,
        action: (ctx, r) => _closeLost(ctx, r),
      ),
      // AI Analyze
      _DealActionItem(
        label: 'Analyze with AI',
        description: 'Get AI insights on this deal',
        icon: Iconsax.magic_star,
        color: LuxuryColors.champagneGold,
        action: (ctx, r) => _analyzeDeal(ctx, r),
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.2)
                        : Colors.black.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Icon(
                        Iconsax.flash_1,
                        size: 20,
                        color: LuxuryColors.champagneGold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Deal Actions',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                          ),
                        ),
                        Text(
                          'Current stage: $currentStage',
                          style: IrisTheme.caption.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Action items
              ...actions.asMap().entries.map((entry) {
                final index = entry.key;
                final action = entry.value;
                return _buildActionTile(context, ref, action, isDark, index);
              }),

              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionTile(
    BuildContext context,
    WidgetRef ref,
    _DealActionItem action,
    bool isDark,
    int index,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () async {
            HapticFeedback.lightImpact();
            Navigator.of(context).pop();
            await action.action(context, ref);
          },
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.black.withValues(alpha: 0.02),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.06),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: action.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Icon(
                      action.icon,
                      size: 22,
                      color: action.color,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        action.label,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        action.description,
                        style: IrisTheme.caption.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Iconsax.arrow_right_3,
                  size: 18,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.3)
                      : Colors.black.withValues(alpha: 0.2),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate(delay: (50 + index * 40).ms).fadeIn().slideX(begin: 0.03);
  }

  Future<void> _advanceStage(
      BuildContext context, WidgetRef ref, String nextStage) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(
        '/opportunities/$dealId',
        data: {'stage': nextStage},
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Deal advanced to $nextStage'),
            backgroundColor: LuxuryColors.infoCobalt,
          ),
        );
        onActionComplete?.call();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to advance stage: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Future<void> _closeWon(BuildContext context, WidgetRef ref) async {
    final confirmed = await _showConfirmation(
      context,
      'Close Deal as Won?',
      'This will mark the deal as successfully closed.',
      LuxuryColors.rolexGreen,
    );
    if (confirmed != true) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.patch(
        '/opportunities/$dealId',
        data: {'stage': 'Closed Won'},
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Deal closed as Won!'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
        onActionComplete?.call();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to close deal: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Future<void> _closeLost(BuildContext context, WidgetRef ref) async {
    final confirmed = await _showConfirmation(
      context,
      'Close Deal as Lost?',
      'This will mark the deal as lost. You can reopen it later if needed.',
      LuxuryColors.errorRuby,
    );
    if (confirmed != true) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.patch(
        '/opportunities/$dealId',
        data: {'stage': 'Closed Lost'},
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Deal closed as Lost'),
            backgroundColor: LuxuryColors.warningAmber,
          ),
        );
        onActionComplete?.call();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to close deal: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Future<void> _analyzeDeal(BuildContext context, WidgetRef ref) async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post('/ai/deals/$dealId/analyze');

      if (context.mounted) {
        final insights = response.data is Map
            ? response.data['insights'] as String? ?? 'Analysis complete.'
            : 'Analysis complete.';

        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (sheetContext) {
            final isDark =
                Theme.of(sheetContext).brightness == Brightness.dark;
            return Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(sheetContext).size.height * 0.6,
              ),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.obsidian : Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 36,
                          height: 4,
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.2)
                                : Colors.black.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          const Icon(
                            Iconsax.magic_star,
                            size: 20,
                            color: LuxuryColors.champagneGold,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'AI Deal Analysis',
                            style: IrisTheme.titleMedium.copyWith(
                              color: isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Flexible(
                        child: SingleChildScrollView(
                          child: Text(
                            insights,
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                              height: 1.6,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => Navigator.of(sheetContext).pop(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: LuxuryColors.champagneGold,
                            foregroundColor: LuxuryColors.richBlack,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Close',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI analysis failed: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Future<bool?> _showConfirmation(
    BuildContext context,
    String title,
    String message,
    Color accentColor,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          message,
          style: TextStyle(
            color: isDark
                ? LuxuryColors.textOnDark.withValues(alpha: 0.7)
                : LuxuryColors.textOnLight.withValues(alpha: 0.7),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isDark
                    ? LuxuryColors.textOnDark.withValues(alpha: 0.6)
                    : LuxuryColors.textOnLight.withValues(alpha: 0.6),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: accentColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }
}
