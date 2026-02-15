import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/network/api_client.dart';

/// Bulk actions bottom sheet for leads
///
/// Provides actions that operate on one or more selected leads:
/// - Assign to user
/// - Update status
/// - Score leads
/// - Delete leads
class LeadActionsSheet extends ConsumerWidget {
  final List<String> selectedLeadIds;
  final VoidCallback? onActionComplete;

  const LeadActionsSheet({
    super.key,
    required this.selectedLeadIds,
    this.onActionComplete,
  });

  /// Show the lead actions bottom sheet
  static Future<void> show({
    required BuildContext context,
    required List<String> selectedLeadIds,
    VoidCallback? onActionComplete,
  }) {
    HapticFeedback.mediumImpact();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => LeadActionsSheet(
        selectedLeadIds: selectedLeadIds,
        onActionComplete: onActionComplete,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final count = selectedLeadIds.length;

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

              // Header
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
                          'Lead Actions',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                          ),
                        ),
                        Text(
                          '$count lead${count == 1 ? '' : 's'} selected',
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

              // Actions
              _buildActionTile(
                context,
                ref,
                label: 'Assign',
                description: 'Assign leads to a team member',
                icon: Iconsax.user_add,
                color: LuxuryColors.infoCobalt,
                index: 0,
                onTap: () => _handleAssign(context, ref, isDark),
              ),
              _buildActionTile(
                context,
                ref,
                label: 'Update Status',
                description: 'Change lead status in bulk',
                icon: Iconsax.refresh_circle,
                color: LuxuryColors.champagneGold,
                index: 1,
                onTap: () => _handleUpdateStatus(context, ref, isDark),
              ),
              _buildActionTile(
                context,
                ref,
                label: 'Score Leads',
                description: 'Run AI scoring on selected leads',
                icon: Iconsax.magic_star,
                color: LuxuryColors.rolexGreen,
                index: 2,
                onTap: () => _handleScore(context, ref),
              ),
              _buildActionTile(
                context,
                ref,
                label: 'Delete',
                description: 'Permanently remove selected leads',
                icon: Iconsax.trash,
                color: LuxuryColors.errorRuby,
                index: 3,
                onTap: () => _handleDelete(context, ref, isDark),
              ),

              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionTile(
    BuildContext context,
    WidgetRef ref, {
    required String label,
    required String description,
    required IconData icon,
    required Color color,
    required int index,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            Navigator.of(context).pop();
            onTap();
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
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Icon(icon, size: 22, color: color),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        description,
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

  // ─── Action Handlers ───────────────────────────────────────────

  Future<void> _handleAssign(
    BuildContext context,
    WidgetRef ref,
    bool isDark,
  ) async {
    final assigneeController = TextEditingController();

    final assignee = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Assign Leads',
          style: TextStyle(
            color:
                isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: TextField(
          controller: assigneeController,
          autofocus: true,
          style: TextStyle(
            color:
                isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
          decoration: InputDecoration(
            hintText: 'Enter user email or name',
            prefixIcon: const Icon(Iconsax.user, size: 18),
            hintStyle: TextStyle(color: LuxuryColors.textMuted),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(assigneeController.text.trim()),
            style: ElevatedButton.styleFrom(
              backgroundColor: LuxuryColors.infoCobalt,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Assign'),
          ),
        ],
      ),
    );

    if (assignee == null || assignee.isEmpty) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.post('/leads/bulk/assign', data: {
        'leadIds': selectedLeadIds,
        'assignee': assignee,
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${selectedLeadIds.length} lead${selectedLeadIds.length == 1 ? '' : 's'} assigned to $assignee'),
            backgroundColor: LuxuryColors.infoCobalt,
          ),
        );
        onActionComplete?.call();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to assign leads: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Future<void> _handleUpdateStatus(
    BuildContext context,
    WidgetRef ref,
    bool isDark,
  ) async {
    const statuses = [
      'New',
      'Contacted',
      'Qualified',
      'Unqualified',
      'Nurturing',
    ];

    final selectedStatus = await showDialog<String>(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Select Status',
          style: TextStyle(
            color:
                isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        children: statuses.map((status) {
          return SimpleDialogOption(
            onPressed: () => Navigator.of(dialogContext).pop(status),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _getStatusColor(status),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    status,
                    style: TextStyle(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );

    if (selectedStatus == null) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.post('/leads/bulk/status', data: {
        'leadIds': selectedLeadIds,
        'status': selectedStatus,
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${selectedLeadIds.length} lead${selectedLeadIds.length == 1 ? '' : 's'} updated to $selectedStatus'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
        onActionComplete?.call();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Future<void> _handleScore(BuildContext context, WidgetRef ref) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/leads/bulk/score', data: {
        'leadIds': selectedLeadIds,
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Scoring ${selectedLeadIds.length} lead${selectedLeadIds.length == 1 ? '' : 's'}...'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
        onActionComplete?.call();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to score leads: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Future<void> _handleDelete(
    BuildContext context,
    WidgetRef ref,
    bool isDark,
  ) async {
    final count = selectedLeadIds.length;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Delete Leads',
          style: TextStyle(
            color:
                isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          'Are you sure you want to delete $count lead${count == 1 ? '' : 's'}? This action cannot be undone.',
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
              backgroundColor: LuxuryColors.errorRuby,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.post('/leads/bulk/delete', data: {
        'leadIds': selectedLeadIds,
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '$count lead${count == 1 ? '' : 's'} deleted'),
            backgroundColor: LuxuryColors.warningAmber,
          ),
        );
        onActionComplete?.call();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete leads: $e'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'new':
        return LuxuryColors.infoCobalt;
      case 'contacted':
        return LuxuryColors.champagneGold;
      case 'qualified':
        return LuxuryColors.rolexGreen;
      case 'unqualified':
        return LuxuryColors.errorRuby;
      case 'nurturing':
        return LuxuryColors.socialPurple;
      default:
        return LuxuryColors.warmGray;
    }
  }
}
