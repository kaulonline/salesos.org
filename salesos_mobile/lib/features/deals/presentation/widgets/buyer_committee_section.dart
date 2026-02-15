import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Provider for buyer committee contacts on a deal
final buyerCommitteeProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, String>((ref, dealId) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/opportunities/$dealId/contacts');
  final data = response.data;
  if (data is List) {
    return data.cast<Map<String, dynamic>>();
  }
  if (data is Map && data['data'] is List) {
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }
  return [];
});

/// Buyer committee role types with display metadata
class BuyerCommitteeRole {
  final String key;
  final String label;
  final Color color;
  final IconData icon;

  const BuyerCommitteeRole({
    required this.key,
    required this.label,
    required this.color,
    required this.icon,
  });

  static const List<BuyerCommitteeRole> allRoles = [
    BuyerCommitteeRole(
      key: 'DECISION_MAKER',
      label: 'Decision Maker',
      color: LuxuryColors.champagneGold,
      icon: Iconsax.crown_1,
    ),
    BuyerCommitteeRole(
      key: 'CHAMPION',
      label: 'Champion',
      color: LuxuryColors.rolexGreen,
      icon: Iconsax.medal_star,
    ),
    BuyerCommitteeRole(
      key: 'INFLUENCER',
      label: 'Influencer',
      color: LuxuryColors.infoCobalt,
      icon: Iconsax.magicpen,
    ),
    BuyerCommitteeRole(
      key: 'BLOCKER',
      label: 'Blocker',
      color: LuxuryColors.errorRuby,
      icon: Iconsax.shield_cross,
    ),
    BuyerCommitteeRole(
      key: 'END_USER',
      label: 'End User',
      color: LuxuryColors.warmGray,
      icon: Iconsax.user,
    ),
    BuyerCommitteeRole(
      key: 'EVALUATOR',
      label: 'Evaluator',
      color: LuxuryColors.socialPurple,
      icon: Iconsax.search_normal_1,
    ),
  ];

  static BuyerCommitteeRole fromKey(String key) {
    return allRoles.firstWhere(
      (r) => r.key == key.toUpperCase(),
      orElse: () => allRoles.last,
    );
  }
}

/// Shows buyer committee contacts on a deal detail page
class BuyerCommitteeSection extends ConsumerWidget {
  final String dealId;

  const BuyerCommitteeSection({
    super.key,
    required this.dealId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final contactsAsync = ref.watch(buyerCommitteeProvider(dealId));

    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Center(
                  child: Icon(
                    Iconsax.people,
                    size: 18,
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
                      'Buyer Committee',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                    ),
                    Text(
                      'Key stakeholders in this deal',
                      style: IrisTheme.caption.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              // Add contact button
              GestureDetector(
                onTap: () => _showAddContactSheet(context, ref),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Iconsax.add,
                        size: 14,
                        color: LuxuryColors.champagneGold,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Add',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.champagneGold,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Contact list
          contactsAsync.when(
            data: (contacts) {
              if (contacts.isEmpty) {
                return _buildEmptyState(isDark);
              }
              return Column(
                children: contacts.asMap().entries.map((entry) {
                  final index = entry.key;
                  final contact = entry.value;
                  return _buildContactRow(context, ref, contact, isDark, index);
                }).toList(),
              );
            },
            loading: () => _buildLoadingState(isDark),
            error: (error, _) => _buildErrorState(isDark, error.toString()),
          ),
        ],
      ),
    );
  }

  Widget _buildContactRow(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> contact,
    bool isDark,
    int index,
  ) {
    final name = contact['name'] as String? ??
        '${contact['firstName'] ?? ''} ${contact['lastName'] ?? ''}'.trim();
    final roleKey = contact['committeeRole'] as String? ??
        contact['role'] as String? ??
        'END_USER';
    final role = BuyerCommitteeRole.fromKey(roleKey);
    final title = contact['title'] as String? ?? '';
    final contactId = contact['id'] as String? ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.black.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          children: [
            // Avatar with role-colored border
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: role.color.withValues(alpha: 0.5),
                  width: 2,
                ),
                color: role.color.withValues(alpha: 0.1),
              ),
              child: Center(
                child: Text(
                  _getInitials(name),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: role.color,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Contact info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name.isNotEmpty ? name : 'Unknown Contact',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (title.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      title,
                      style: IrisTheme.caption.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Role badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: role.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: role.color.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(role.icon, size: 10, color: role.color),
                  const SizedBox(width: 4),
                  Text(
                    role.label,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: role.color,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            // Remove button
            GestureDetector(
              onTap: () => _removeContact(context, ref, contactId),
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Icon(
                    Iconsax.close_circle,
                    size: 14,
                    color: LuxuryColors.errorRuby,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: (50 * index).ms).fadeIn().slideX(begin: 0.03);
  }

  Widget _buildEmptyState(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Column(
          children: [
            Icon(
              Iconsax.people,
              size: 36,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.2)
                  : Colors.black.withValues(alpha: 0.15),
            ),
            const SizedBox(height: 8),
            Text(
              'No contacts added yet',
              style: IrisTheme.bodySmall.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Add key stakeholders to track the buyer committee',
              style: IrisTheme.caption.copyWith(
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Column(
      children: List.generate(
        2,
        (index) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.black.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState(bool isDark, String error) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Column(
          children: [
            const Icon(
              Iconsax.warning_2,
              size: 28,
              color: LuxuryColors.warningAmber,
            ),
            const SizedBox(height: 8),
            Text(
              'Failed to load contacts',
              style: IrisTheme.bodySmall.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    if (name.isEmpty) return '?';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  void _showAddContactSheet(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final titleController = TextEditingController();
    String selectedRole = 'END_USER';

    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (stateContext, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(stateContext).viewInsets.bottom,
              ),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.obsidian : Colors.white,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
              ),
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

                    Text(
                      'Add to Buyer Committee',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Name field
                    TextField(
                      controller: nameController,
                      style: TextStyle(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Contact Name',
                        hintText: 'John Smith',
                        prefixIcon: const Icon(Iconsax.user, size: 18),
                        labelStyle: TextStyle(color: LuxuryColors.textMuted),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Email field
                    TextField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      style: TextStyle(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Email',
                        hintText: 'john@company.com',
                        prefixIcon: const Icon(Iconsax.sms, size: 18),
                        labelStyle: TextStyle(color: LuxuryColors.textMuted),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Title field
                    TextField(
                      controller: titleController,
                      style: TextStyle(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Job Title',
                        hintText: 'VP of Engineering',
                        prefixIcon: const Icon(Iconsax.briefcase, size: 18),
                        labelStyle: TextStyle(color: LuxuryColors.textMuted),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Role selection
                    Text(
                      'Committee Role',
                      style: IrisTheme.labelMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: BuyerCommitteeRole.allRoles.map((role) {
                        final isSelected = selectedRole == role.key;
                        return GestureDetector(
                          onTap: () {
                            setSheetState(() => selectedRole = role.key);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? role.color.withValues(alpha: 0.2)
                                  : (isDark
                                      ? Colors.white.withValues(alpha: 0.05)
                                      : Colors.black.withValues(alpha: 0.03)),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected
                                    ? role.color
                                    : (isDark
                                        ? Colors.white.withValues(alpha: 0.1)
                                        : Colors.black.withValues(alpha: 0.08)),
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  role.icon,
                                  size: 14,
                                  color: isSelected
                                      ? role.color
                                      : LuxuryColors.textMuted,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  role.label,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
                                        : FontWeight.w400,
                                    color: isSelected
                                        ? role.color
                                        : LuxuryColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),

                    // Add button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          if (nameController.text.trim().isEmpty) return;

                          try {
                            final api = ref.read(apiClientProvider);
                            await api.post(
                              '/opportunities/$dealId/contacts',
                              data: {
                                'name': nameController.text.trim(),
                                'email': emailController.text.trim(),
                                'title': titleController.text.trim(),
                                'committeeRole': selectedRole,
                              },
                            );

                            ref.invalidate(buyerCommitteeProvider(dealId));

                            if (sheetContext.mounted) {
                              Navigator.of(sheetContext).pop();
                            }
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Contact added to committee'),
                                  backgroundColor: LuxuryColors.rolexGreen,
                                ),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Failed to add contact: $e'),
                                  backgroundColor: LuxuryColors.errorRuby,
                                ),
                              );
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: LuxuryColors.champagneGold,
                          foregroundColor: LuxuryColors.richBlack,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Add Contact',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _removeContact(
    BuildContext context,
    WidgetRef ref,
    String contactId,
  ) async {
    if (contactId.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        final isDark = Theme.of(dialogContext).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            'Remove Contact',
            style: TextStyle(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          content: Text(
            'Remove this contact from the buyer committee?',
            style: TextStyle(
              color: isDark
                  ? LuxuryColors.textOnDark.withValues(alpha: 0.7)
                  : LuxuryColors.textOnLight.withValues(alpha: 0.7),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
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
              child: const Text('Remove'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      try {
        final api = ref.read(apiClientProvider);
        await api.delete('/opportunities/$dealId/contacts/$contactId');
        ref.invalidate(buyerCommitteeProvider(dealId));
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Contact removed from committee'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to remove contact: $e'),
              backgroundColor: LuxuryColors.errorRuby,
            ),
          );
        }
      }
    }
  }
}
