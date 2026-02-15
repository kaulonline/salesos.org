import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/data_privacy_service.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../auth/presentation/bloc/auth_provider.dart';

/// Privacy Preferences Page
/// Allows users to control their data privacy settings with clear explanations
class PrivacyPreferencesPage extends ConsumerStatefulWidget {
  const PrivacyPreferencesPage({super.key});

  @override
  ConsumerState<PrivacyPreferencesPage> createState() =>
      _PrivacyPreferencesPageState();
}

class _PrivacyPreferencesPageState
    extends ConsumerState<PrivacyPreferencesPage> {
  bool _isExporting = false;
  bool _isRequestingDeletion = false;
  bool _isClearingHistory = false;
  bool _isClearingCache = false;
  bool _isDeletingAccount = false;

  // Danger color
  static const Color _dangerColor = Color(0xFFDC2626);

  @override
  void initState() {
    super.initState();
    // Refresh privacy preferences on page load
    Future.microtask(() {
      ref.invalidate(privacyPreferencesProvider);
      ref.invalidate(dataRetentionInfoProvider);
      ref.invalidate(storageUsageProvider);
    });
  }

  Future<void> _downloadMyData() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Iconsax.document_download, color: LuxuryColors.jadePremium),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Download Your Data',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'We will compile a complete export of your personal data including:',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 12),
            _buildExportItem('Profile information', isDark),
            _buildExportItem('Conversation history', isDark),
            _buildExportItem('Contacts and leads', isDark),
            _buildExportItem('Documents and files', isDark),
            _buildExportItem('Activity logs', isDark),
            const SizedBox(height: 12),
            Text(
              'You will receive an email with a download link when your data export is ready (usually within a few minutes).',
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Request Export',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.jadePremium,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isExporting = true);
      HapticFeedback.lightImpact();

      try {
        await ref
            .read(dataRequestsProvider.notifier)
            .requestDataExport(reason: 'User requested data export from privacy preferences');

        if (mounted) {
          setState(() => _isExporting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content:
                  Text('Data export requested. Check your email for the download link.'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isExporting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to request data export: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  Widget _buildExportItem(String text, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            Iconsax.tick_circle,
            size: 16,
            color: LuxuryColors.jadePremium,
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _requestDataDeletion() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirmController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Iconsax.trash, color: IrisTheme.error),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Delete My Data',
                style: IrisTheme.titleMedium.copyWith(
                  color: IrisTheme.error,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'This will permanently delete all your CRM data including:',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 12),
            _buildDeletionItem('All conversation history', isDark),
            _buildDeletionItem('Contacts, leads, and accounts', isDark),
            _buildDeletionItem('Documents and files', isDark),
            _buildDeletionItem('Activity logs and preferences', isDark),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: IrisTheme.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: IrisTheme.warning.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(Iconsax.warning_2, size: 20, color: IrisTheme.warning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your account will remain active but all CRM data will be deleted.',
                      style: IrisTheme.bodySmall.copyWith(
                        color: IrisTheme.warning,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Type "DELETE MY DATA" to confirm:',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: confirmController,
              style: TextStyle(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'DELETE MY DATA',
                hintStyle: TextStyle(
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                filled: true,
                fillColor:
                    isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              if (confirmController.text == 'DELETE MY DATA') {
                Navigator.pop(context, true);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please type the confirmation phrase exactly'),
                    backgroundColor: IrisTheme.error,
                  ),
                );
              }
            },
            child: Text(
              'Delete Data',
              style: IrisTheme.labelMedium.copyWith(
                color: IrisTheme.error,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isRequestingDeletion = true);
      HapticFeedback.heavyImpact();

      try {
        await ref.read(dataRequestsProvider.notifier).requestDataDeletion(
              confirmationPhrase: 'DELETE MY DATA',
              reason: 'User requested data deletion from privacy preferences',
            );

        if (mounted) {
          setState(() => _isRequestingDeletion = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                  'Data deletion requested. This process may take up to 30 days.'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isRequestingDeletion = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  Widget _buildDeletionItem(String text, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            Iconsax.minus_cirlce,
            size: 16,
            color: IrisTheme.error,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openPrivacyPolicy() async {
    HapticFeedback.selectionClick();
    context.push(AppRoutes.privacySecurity);
  }

  Future<void> _clearConversationHistory() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Clear Conversation History',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
        content: Text(
          'This will permanently delete all your chat conversations with SalesOS. This action cannot be undone.',
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Clear History',
              style: IrisTheme.labelMedium.copyWith(
                color: _dangerColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isClearingHistory = true);
      HapticFeedback.mediumImpact();

      try {
        final service = ref.read(dataPrivacyServiceProvider);
        final deletedCount = await service.clearConversationHistory();

        if (mounted) {
          setState(() => _isClearingHistory = false);
          ref.invalidate(storageUsageProvider);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cleared $deletedCount conversations successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isClearingHistory = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to clear history: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  Future<void> _clearCache() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Clear Cache',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
        content: Text(
          'This will clear all cached data including images and temporary files. You may need to re-download some data.',
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Clear Cache',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.jadePremium,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isClearingCache = true);
      HapticFeedback.lightImpact();

      try {
        final service = ref.read(dataPrivacyServiceProvider);
        await service.clearCache();

        if (mounted) {
          setState(() => _isClearingCache = false);
          ref.invalidate(storageUsageProvider);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Cache cleared successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isClearingCache = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to clear cache: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  Future<void> _confirmDeleteAccount() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final passwordController = TextEditingController();

    // First confirmation dialog
    final firstConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Iconsax.danger, color: _dangerColor, size: 24),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Delete Account',
                style: IrisTheme.titleMedium.copyWith(
                  color: _dangerColor,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'This action will permanently delete:',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 12),
            _buildDeletionItem('Your account and profile', isDark),
            _buildDeletionItem('All CRM data (contacts, leads, deals)', isDark),
            _buildDeletionItem('All conversation history', isDark),
            _buildDeletionItem('All settings and preferences', isDark),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _dangerColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _dangerColor.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(Iconsax.warning_2, size: 20, color: _dangerColor),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This action cannot be undone.',
                      style: IrisTheme.bodySmall.copyWith(
                        color: _dangerColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Continue',
              style: IrisTheme.labelMedium.copyWith(
                color: _dangerColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (firstConfirm != true || !mounted) return;

    // Second confirmation with password and confirmation phrase
    final confirmController = TextEditingController();
    final secondConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Confirm Account Deletion',
          style: IrisTheme.titleMedium.copyWith(
            color: _dangerColor,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter your password to confirm:',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: passwordController,
              obscureText: true,
              style: TextStyle(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Password',
                hintStyle: TextStyle(
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                filled: true,
                fillColor:
                    isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Type "DELETE" to confirm:',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: confirmController,
              style: TextStyle(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'DELETE',
                hintStyle: TextStyle(
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                filled: true,
                fillColor:
                    isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              if (confirmController.text.toUpperCase() == 'DELETE' &&
                  passwordController.text.isNotEmpty) {
                Navigator.pop(context, true);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter your password and type DELETE to confirm'),
                    backgroundColor: IrisTheme.error,
                  ),
                );
              }
            },
            child: Text(
              'Delete Account',
              style: IrisTheme.labelMedium.copyWith(
                color: _dangerColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    final password = passwordController.text;
    passwordController.dispose();
    confirmController.dispose();

    if (secondConfirm != true || !mounted) return;

    setState(() => _isDeletingAccount = true);
    HapticFeedback.heavyImpact();

    try {
      await ref.read(dataRequestsProvider.notifier).requestAccountDeletion(
            password: password,
            confirmationPhrase: 'DELETE',
            reason: 'User requested account deletion from privacy preferences',
          );

      if (mounted) {
        setState(() => _isDeletingAccount = false);
        // Log user out and redirect to login
        ref.read(authProvider.notifier).logout();
        context.go(AppRoutes.login);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDeletingAccount = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete account: $e'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  void _showRetentionPeriodPicker(PrivacyPreferences prefs, bool isDark) {
    final options = [
      {'value': 30, 'label': '30 days'},
      {'value': 90, 'label': '90 days'},
      {'value': 180, 'label': '6 months'},
      {'value': 365, 'label': '1 year'},
      {'value': -1, 'label': 'Until account deletion'},
    ];

    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black54,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                width: 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Data Retention Period',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Choose how long your conversation data is retained',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                ...options.map((option) {
                  final isSelected = prefs.retentionPeriodDays == option['value'];
                  return InkWell(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      ref
                          .read(privacyPreferencesProvider.notifier)
                          .setRetentionPeriodDays(
                            option['value'] == -1 ? null : option['value'] as int,
                          );
                      Navigator.pop(context);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? LuxuryColors.jadePremium
                              : (isDark
                                  ? IrisTheme.darkBorder
                                  : IrisTheme.lightBorder),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              option['label'] as String,
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary,
                                fontWeight:
                                    isSelected ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ),
                          if (isSelected)
                            Icon(
                              Iconsax.tick_circle,
                              color: LuxuryColors.jadePremium,
                              size: 20,
                            ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final privacyPrefs = ref.watch(privacyPreferencesProvider);
    final storageUsage = ref.watch(storageUsageProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              color:
                  isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Privacy Preferences',
          style: IrisTheme.titleLarge.copyWith(
              color: isDark
                  ? IrisTheme.darkTextPrimary
                  : IrisTheme.lightTextPrimary),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              IrisCard(
                variant: IrisCardVariant.premium,
                tier: LuxuryTier.gold,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            gradient: LuxuryColors.emeraldGradient,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Iconsax.security_user,
                            color: Colors.white,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Your Privacy, Your Control',
                                style: IrisTheme.titleMedium.copyWith(
                                  color: isDark
                                      ? IrisTheme.darkTextPrimary
                                      : IrisTheme.lightTextPrimary,
                                ),
                              ),
                              Text(
                                'Manage how your data is collected and used',
                                style: IrisTheme.bodySmall.copyWith(
                                  color: isDark
                                      ? IrisTheme.darkTextSecondary
                                      : IrisTheme.lightTextSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Analytics & Tracking Section
              Text(
                'Analytics & Tracking',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              privacyPrefs.when(
                data: (prefs) => IrisCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      _PrivacyToggleTile(
                        icon: Iconsax.chart_2,
                        title: 'Usage Analytics',
                        subtitle:
                            'Help us improve SalesOS by sharing anonymous usage data. No personal information is collected.',
                        value: prefs.analyticsEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setAnalyticsEnabled(value);
                        },
                        isDark: isDark,
                      ),
                      _PrivacyToggleTile(
                        icon: Iconsax.danger,
                        title: 'Crash Reporting',
                        subtitle:
                            'Automatically send crash reports to help us fix bugs and improve stability.',
                        value: prefs.crashReportingEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setCrashReportingEnabled(value);
                        },
                        isDark: isDark,
                        showDivider: false,
                      ),
                    ],
                  ),
                ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),
                loading: () => _buildLoadingCard(),
                error: (e, st) => _buildErrorCard(e, isDark),
              ),

              const SizedBox(height: 24),

              // Personalization Section
              Text(
                'Personalization',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              privacyPrefs.when(
                data: (prefs) => IrisCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      _PrivacyToggleTile(
                        icon: Iconsax.personalcard,
                        title: 'Personalized Experience',
                        subtitle:
                            'Allow SalesOS to learn your preferences and provide tailored recommendations.',
                        value: prefs.personalizationEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setPersonalizationEnabled(value);
                        },
                        isDark: isDark,
                      ),
                      _PrivacyToggleTile(
                        icon: Iconsax.message_programming,
                        title: 'Context Retention',
                        subtitle:
                            'Remember conversation context across sessions for more relevant AI responses.',
                        value: prefs.contextRetentionEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setContextRetentionEnabled(value);
                        },
                        isDark: isDark,
                        showDivider: false,
                      ),
                    ],
                  ),
                ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),
                loading: () => _buildLoadingCard(),
                error: (e, st) => _buildErrorCard(e, isDark),
              ),

              const SizedBox(height: 24),

              // AI Training Section
              Text(
                'AI Training',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              privacyPrefs.when(
                data: (prefs) => IrisCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      _PrivacyToggleTile(
                        icon: Iconsax.cpu,
                        title: 'AI Model Training',
                        subtitle:
                            'Allow your anonymized data to help improve AI models. Your data is never shared with third parties.',
                        value: prefs.aiTrainingConsent,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setAiTrainingConsent(value);
                        },
                        isDark: isDark,
                        showDivider: false,
                      ),
                    ],
                  ),
                ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),
                loading: () => _buildLoadingCard(),
                error: (e, st) => _buildErrorCard(e, isDark),
              ),

              const SizedBox(height: 24),

              // Data Retention Section
              Text(
                'Data Retention',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              privacyPrefs.when(
                data: (prefs) => IrisCard(
                  onTap: () => _showRetentionPeriodPicker(prefs, isDark),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Iconsax.timer_1,
                          color: LuxuryColors.jadePremium,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Retention Period',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary,
                              ),
                            ),
                            Text(
                              'How long your conversation data is stored',
                              style: IrisTheme.bodySmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _getRetentionDisplayText(prefs.retentionPeriodDays),
                          style: IrisTheme.labelSmall.copyWith(
                            color: LuxuryColors.jadePremium,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        Iconsax.arrow_right_3,
                        size: 16,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ],
                  ),
                ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),
                loading: () => _buildLoadingCard(),
                error: (e, st) => _buildErrorCard(e, isDark),
              ),

              const SizedBox(height: 24),

              // Marketing Communications Section
              Text(
                'Marketing Communications',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              privacyPrefs.when(
                data: (prefs) => IrisCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      _PrivacyToggleTile(
                        icon: Iconsax.sms,
                        title: 'Marketing Emails',
                        subtitle:
                            'Receive promotional offers, tips, and updates about SalesOS features.',
                        value: prefs.marketingEmailsEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setMarketingEmailsEnabled(value);
                        },
                        isDark: isDark,
                      ),
                      _PrivacyToggleTile(
                        icon: Iconsax.notification,
                        title: 'Product Updates',
                        subtitle:
                            'Get notified about new features, improvements, and important announcements.',
                        value: prefs.productUpdatesEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setProductUpdatesEnabled(value);
                        },
                        isDark: isDark,
                      ),
                      _PrivacyToggleTile(
                        icon: Iconsax.lamp_on,
                        title: 'Tips & Tutorials',
                        subtitle:
                            'Receive helpful tips and tutorials to get the most out of SalesOS.',
                        value: prefs.productUpdatesEnabled, // Use same setting for now
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setProductUpdatesEnabled(value);
                        },
                        isDark: isDark,
                        showDivider: false,
                      ),
                    ],
                  ),
                ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1),
                loading: () => _buildLoadingCard(),
                error: (e, st) => _buildErrorCard(e, isDark),
              ),

              const SizedBox(height: 24),

              // Data Usage Breakdown
              Text(
                'Your Data Usage',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              storageUsage.when(
                data: (usage) => IrisCard(
                  child: Column(
                    children: [
                      _DataUsageRow(
                        icon: Iconsax.message_text,
                        label: 'Conversations',
                        value: usage.chatMessagesFormatted,
                        isDark: isDark,
                      ),
                      const SizedBox(height: 12),
                      _DataUsageRow(
                        icon: Iconsax.document,
                        label: 'Documents',
                        value: usage.documentsFormatted,
                        isDark: isDark,
                      ),
                      const SizedBox(height: 12),
                      _DataUsageRow(
                        icon: Iconsax.folder_open,
                        label: 'Cached Files',
                        value: usage.cachedFilesFormatted,
                        isDark: isDark,
                      ),
                      const SizedBox(height: 16),
                      Divider(
                        color: isDark
                            ? IrisTheme.darkBorder
                            : IrisTheme.lightBorder,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Total Storage Used',
                            style: IrisTheme.titleSmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                            ),
                          ),
                          Text(
                            usage.totalFormatted,
                            style: IrisTheme.titleSmall.copyWith(
                              color: LuxuryColors.jadePremium,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ).animate(delay: 350.ms).fadeIn().slideY(begin: 0.1),
                loading: () => _buildLoadingCard(),
                error: (e, st) => _buildErrorCard(e, isDark),
              ),

              const SizedBox(height: 24),

              // Your Rights Section
              Text(
                'Your Rights',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    // Download My Data
                    _ActionTile(
                      icon: Iconsax.document_download,
                      title: 'Download My Data',
                      subtitle: 'Get a copy of all your personal data',
                      isLoading: _isExporting,
                      onTap: _downloadMyData,
                      isDark: isDark,
                    ),
                    Divider(
                      height: 1,
                      indent: 70,
                      color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                    ),
                    // Delete My Data
                    _ActionTile(
                      icon: Iconsax.trash,
                      iconColor: IrisTheme.warning,
                      title: 'Delete My Data',
                      subtitle: 'Request deletion of your CRM data',
                      isLoading: _isRequestingDeletion,
                      onTap: _requestDataDeletion,
                      isDark: isDark,
                    ),
                    Divider(
                      height: 1,
                      indent: 70,
                      color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                    ),
                    // Privacy Policy
                    _ActionTile(
                      icon: Iconsax.document_text,
                      title: 'Privacy Policy',
                      subtitle: 'Read our full privacy policy',
                      isLoading: false,
                      onTap: _openPrivacyPolicy,
                      isDark: isDark,
                      showDivider: false,
                    ),
                  ],
                ),
              ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Account Section
              Text(
                'Account',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    // Clear Conversation History
                    _ActionTile(
                      icon: Iconsax.message_remove,
                      title: 'Clear Conversation History',
                      subtitle: 'Delete all chat history with SalesOS',
                      isLoading: _isClearingHistory,
                      onTap: _clearConversationHistory,
                      isDark: isDark,
                    ),
                    Divider(
                      height: 1,
                      indent: 70,
                      color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                    ),
                    // Clear Cache
                    _ActionTile(
                      icon: Iconsax.broom,
                      title: 'Clear Cache',
                      subtitle: 'Free up storage by clearing cached data',
                      isLoading: _isClearingCache,
                      onTap: _clearCache,
                      isDark: isDark,
                      showDivider: false,
                    ),
                  ],
                ),
              ).animate(delay: 450.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Danger Zone
              Text(
                'Danger Zone',
                style: IrisTheme.titleSmall.copyWith(
                  color: _dangerColor,
                ),
              ),
              const SizedBox(height: 12),

              Container(
                decoration: BoxDecoration(
                  color: isDark ? LuxuryColors.obsidian : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _dangerColor.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Column(
                  children: [
                    // Warning message
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: _dangerColor.withValues(alpha: isDark ? 0.1 : 0.05),
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(15),
                          topRight: Radius.circular(15),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Iconsax.danger,
                            size: 22,
                            color: _dangerColor,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Actions in this section cannot be undone. Please proceed with caution.',
                              style: IrisTheme.bodySmall.copyWith(
                                color: _dangerColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Delete Account
                    _ActionTile(
                      icon: Iconsax.profile_delete,
                      iconColor: _dangerColor,
                      title: 'Delete Account',
                      subtitle: 'Permanently delete your account and all data',
                      isLoading: _isDeletingAccount,
                      onTap: _confirmDeleteAccount,
                      isDark: isDark,
                      showDivider: false,
                    ),
                  ],
                ),
              ).animate(delay: 500.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  String _getRetentionDisplayText(int? days) {
    if (days == null || days < 0) {
      return 'Unlimited';
    } else if (days == 30) {
      return '30 days';
    } else if (days == 90) {
      return '90 days';
    } else if (days == 180) {
      return '6 months';
    } else if (days == 365) {
      return '1 year';
    } else {
      return '$days days';
    }
  }

  Widget _buildLoadingCard() {
    return const IrisCard(
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorCard(Object error, bool isDark) {
    return IrisCard(
      child: Row(
        children: [
          Icon(Iconsax.warning_2, color: IrisTheme.error, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Failed to load preferences',
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () => ref.invalidate(privacyPreferencesProvider),
            child: Text(
              'Retry',
              style: IrisTheme.labelSmall.copyWith(
                color: LuxuryColors.jadePremium,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PrivacyToggleTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool showDivider;
  final bool isDark;

  const _PrivacyToggleTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.showDivider = true,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: LuxuryColors.jadePremium),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Switch(
                value: value,
                onChanged: onChanged,
                activeTrackColor: LuxuryColors.rolexGreen,
                thumbColor: WidgetStateProperty.resolveWith((states) =>
                    states.contains(WidgetState.selected) ? Colors.white : null),
              ),
            ],
          ),
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 70,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
      ],
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String title;
  final String subtitle;
  final bool isLoading;
  final VoidCallback onTap;
  final bool isDark;
  final bool showDivider;

  const _ActionTile({
    required this.icon,
    this.iconColor,
    required this.title,
    required this.subtitle,
    required this.isLoading,
    required this.onTap,
    required this.isDark,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: isLoading ? null : onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: (iconColor ?? LuxuryColors.rolexGreen)
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: iconColor ?? LuxuryColors.jadePremium,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: iconColor ??
                          (isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary),
                    ),
                  ),
                  Text(
                    subtitle,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isLoading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor:
                      AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                ),
              )
            else
              Icon(
                Iconsax.arrow_right_3,
                size: 16,
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
          ],
        ),
      ),
    );
  }
}

class _DataUsageRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;

  const _DataUsageRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: isDark
              ? IrisTheme.darkTextSecondary
              : IrisTheme.lightTextSecondary,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
        ),
        Text(
          value,
          style: IrisTheme.bodySmall.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
