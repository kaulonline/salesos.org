import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/admin_service.dart';

class UserEditSheet extends ConsumerStatefulWidget {
  final AdminUserModel user;
  final VoidCallback? onSaved;

  const UserEditSheet({
    super.key,
    required this.user,
    this.onSaved,
  });

  @override
  ConsumerState<UserEditSheet> createState() => _UserEditSheetState();
}

class _UserEditSheetState extends ConsumerState<UserEditSheet> {
  late TextEditingController _nameController;
  late String _systemRole;
  late String _orgRole;
  late bool _isActive;
  bool _isSaving = false;

  static const _systemRoles = ['USER', 'MANAGER', 'ADMIN', 'VIEWER'];
  static const _orgRoles = ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.user.name ?? '');
    _systemRole = widget.user.role.toUpperCase();
    if (!_systemRoles.contains(_systemRole)) _systemRole = 'USER';
    _orgRole = (widget.user.orgRole ?? 'MEMBER').toUpperCase();
    if (!_orgRoles.contains(_orgRole)) _orgRole = 'MEMBER';
    _isActive = widget.user.isActive;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);

    final service = ref.read(adminServiceProvider);
    final result = await service.updateUser(widget.user.id, {
      'name': _nameController.text.trim(),
      'role': _systemRole,
      'orgRole': _orgRole,
      'status': _isActive ? 'ACTIVE' : 'SUSPENDED',
    });

    setState(() => _isSaving = false);

    if (mounted) {
      if (result != null) {
        widget.onSaved?.call();
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User updated successfully')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update user')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.richBlack : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.12)
              : LuxuryColors.champagneGold.withValues(alpha: 0.2),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomPadding),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: LuxuryColors.textMuted.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              // Title
              Row(
                children: [
                  LuxuryAvatar(
                    initials: _initials(widget.user.displayName),
                    tier: LuxuryTier.gold,
                    size: 44,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Edit User',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.user.email,
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Name field
              IrisTextField(
                label: 'Name',
                controller: _nameController,
                prefixIcon: Iconsax.user,
                tier: LuxuryTier.gold,
              ),
              const SizedBox(height: 16),
              // Email (read-only)
              IrisTextField(
                label: 'Email',
                controller: TextEditingController(text: widget.user.email),
                prefixIcon: Iconsax.sms,
                readOnly: true,
                enabled: false,
                tier: LuxuryTier.gold,
              ),
              const SizedBox(height: 16),
              // System role dropdown
              LuxuryDropdown<String>(
                label: 'System Role',
                value: _systemRole,
                tier: LuxuryTier.gold,
                items: _systemRoles.map((role) {
                  return DropdownMenuItem(
                    value: role,
                    child: Text(role),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _systemRole = value);
                },
              ),
              const SizedBox(height: 16),
              // Org role dropdown
              LuxuryDropdown<String>(
                label: 'Organization Role',
                value: _orgRole,
                tier: LuxuryTier.gold,
                items: _orgRoles.map((role) {
                  return DropdownMenuItem(
                    value: role,
                    child: Text(role),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _orgRole = value);
                },
              ),
              const SizedBox(height: 16),
              // Status toggle
              LuxuryCard(
                tier: LuxuryTier.gold,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'STATUS',
                          style: IrisTheme.labelSmall.copyWith(
                            color: LuxuryColors.textMuted,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _isActive ? 'Active' : 'Suspended',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: _isActive
                                ? LuxuryColors.successGreen
                                : LuxuryColors.errorRuby,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    Switch.adaptive(
                      value: _isActive,
                      activeThumbColor: LuxuryColors.successGreen,
                      onChanged: (value) {
                        HapticFeedback.lightImpact();
                        setState(() => _isActive = value);
                      },
                    ),
                  ],
                ),
              ),
              if (widget.user.organizationName != null) ...[
                const SizedBox(height: 16),
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        Iconsax.building,
                        size: 20,
                        color: LuxuryColors.rolexGreen,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'ORGANIZATION',
                              style: IrisTheme.labelSmall.copyWith(
                                color: LuxuryColors.textMuted,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.user.organizationName!,
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 28),
              // Save button
              IrisButton(
                label: 'Save Changes',
                onPressed: _isSaving ? null : _save,
                variant: IrisButtonVariant.primary,
                isLoading: _isSaving,
                isFullWidth: true,
                icon: Iconsax.tick_circle,
              ),
            ],
          ).animate().fadeIn(duration: 200.ms).slideY(begin: 0.05),
        ),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}
