import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';

import '../../../../core/config/theme.dart';
import '../../../../core/services/biometric_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../auth/data/repositories/auth_repository.dart';

/// Dialog for changing user password
class ChangePasswordDialog extends ConsumerStatefulWidget {
  const ChangePasswordDialog({super.key});

  static Future<bool?> show(BuildContext context) {
    HapticFeedback.mediumImpact();
    return showGeneralDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: const Center(
            child: ChangePasswordDialog(),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  @override
  ConsumerState<ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends ConsumerState<ChangePasswordDialog> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isLoading = false;
  bool _obscureCurrentPassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String? _validateCurrentPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your current password';
    }
    return null;
  }

  String? _validateNewPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter a new password';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!value.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!value.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!value.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain at least one number';
    }
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please confirm your new password';
    }
    if (value != _newPasswordController.text) {
      return 'Passwords do not match';
    }
    return null;
  }

  Future<void> _handleChangePassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authRepo = ref.read(authRepositoryProvider);
      await authRepo.changePassword(
        _currentPasswordController.text,
        _newPasswordController.text,
      );

      // Update biometric stored password if enabled
      final biometricService = ref.read(biometricServiceProvider);
      final isEnabled = await biometricService.isBiometricEnabled();
      if (isEnabled) {
        await biometricService.updateStoredPassword(_newPasswordController.text);
      }

      if (mounted) {
        HapticFeedback.heavyImpact();
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Password changed successfully'),
            backgroundColor: LuxuryColors.rolexGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().contains('incorrect')
            ? 'Current password is incorrect'
            : 'Failed to change password. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Material(
      color: Colors.transparent,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 420),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        padding: EdgeInsets.only(bottom: bottomInset > 0 ? bottomInset : 0),
        child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: LuxuryColors.emeraldGradient,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Iconsax.key,
                        size: 24,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Change Password',
                            style: IrisTheme.titleMedium.copyWith(
                              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Enter your current and new password',
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

                // Error message
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Iconsax.warning_2,
                          size: 18,
                          color: LuxuryColors.errorRuby,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: IrisTheme.bodySmall.copyWith(
                              color: LuxuryColors.errorRuby,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Current Password
                IrisTextField(
                  label: 'Current Password',
                  hint: 'Enter your current password',
                  controller: _currentPasswordController,
                  prefixIcon: Iconsax.lock,
                  tier: LuxuryTier.gold,
                  obscureText: _obscureCurrentPassword,
                  suffixIcon: _obscureCurrentPassword ? Iconsax.eye : Iconsax.eye_slash,
                  onSuffixTap: () {
                    setState(() => _obscureCurrentPassword = !_obscureCurrentPassword);
                  },
                  validator: _validateCurrentPassword,
                ),
                const SizedBox(height: 16),

                // New Password
                IrisTextField(
                  label: 'New Password',
                  hint: 'Enter your new password',
                  controller: _newPasswordController,
                  prefixIcon: Iconsax.key,
                  tier: LuxuryTier.gold,
                  obscureText: _obscureNewPassword,
                  suffixIcon: _obscureNewPassword ? Iconsax.eye : Iconsax.eye_slash,
                  onSuffixTap: () {
                    setState(() => _obscureNewPassword = !_obscureNewPassword);
                  },
                  validator: _validateNewPassword,
                ),
                const SizedBox(height: 8),
                Text(
                  'Password must be at least 8 characters with uppercase, lowercase, and number',
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
                const SizedBox(height: 16),

                // Confirm Password
                IrisTextField(
                  label: 'Confirm New Password',
                  hint: 'Re-enter your new password',
                  controller: _confirmPasswordController,
                  prefixIcon: Iconsax.key,
                  tier: LuxuryTier.gold,
                  obscureText: _obscureConfirmPassword,
                  suffixIcon: _obscureConfirmPassword ? Iconsax.eye : Iconsax.eye_slash,
                  onSuffixTap: () {
                    setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
                  },
                  validator: _validateConfirmPassword,
                ),
                const SizedBox(height: 24),

                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isLoading ? null : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: BorderSide(color: LuxuryColors.textMuted.withValues(alpha: 0.3)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          'Cancel',
                          style: IrisTheme.labelLarge.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleChangePassword,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: LuxuryColors.rolexGreen,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation(Colors.white),
                                ),
                              )
                            : Text(
                                'Change Password',
                                style: IrisTheme.labelLarge.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
        ),
      ),
    );
  }
}
