import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/license_service.dart';
import '../../core/services/app_lifecycle_service.dart';
import '../../features/auth/presentation/bloc/auth_provider.dart';
import '../../core/config/routes.dart';
import 'license_locked_screen.dart';
import 'luxury_card.dart';

/// License gate widget that wraps content and shows locked screen if no valid license
///
/// This widget checks the user's license status and either:
/// - Shows the child content if license is valid
/// - Shows the locked screen if license is invalid/missing/expired
class LicenseGate extends ConsumerWidget {
  final Widget child;

  const LicenseGate({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final licenseValidation = ref.watch(licenseValidationProvider);
    final user = ref.watch(currentUserProvider);

    return licenseValidation.when(
      data: (validation) {
        if (validation.isLocked) {
          return LicenseLockedScreen(
            message: validation.message ??
                'No active enterprise license found. Please contact your organization administrator to obtain a license key.',
            adminEmail: 'support@salesos.org',
            userName: user?.name ?? user?.email,
            onEnterLicenseKey: () => _showLicenseKeyDialog(context, ref),
            onLogout: () => _handleLogout(context, ref),
          );
        }
        return child;
      },
      loading: () => _buildLoadingState(context),
      error: (error, stack) {
        // On error, show the locked screen with error message
        return LicenseLockedScreen(
          message: 'Unable to verify your enterprise license. Please check your connection and try again.',
          adminEmail: 'support@salesos.org',
          userName: user?.name ?? user?.email,
          onEnterLicenseKey: () => _showLicenseKeyDialog(context, ref),
          onLogout: () => _handleLogout(context, ref),
        );
      },
    );
  }

  Widget _buildLoadingState(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.cream,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Animated logo
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LuxuryColors.emeraldGradient,
                boxShadow: [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: const Center(
                child: Text(
                  'I',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    fontFamily: 'PlusJakartaSans',
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
            // Loading indicator
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: isDark ? LuxuryColors.champagneGold : LuxuryColors.rolexGreen,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Verifying enterprise license...',
              style: TextStyle(
                fontSize: 14,
                color: isDark
                    ? LuxuryColors.textOnDark.withValues(alpha: 0.6)
                    : LuxuryColors.textOnLight.withValues(alpha: 0.6),
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLicenseKeyDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => LicenseKeyEntryDialog(
        onSubmit: (licenseKey) async {
          // Close dialog first
          Navigator.of(dialogContext).pop();

          // Show loading indicator
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Row(
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(width: 12),
                  Text('Activating license...'),
                ],
              ),
              duration: const Duration(seconds: 10),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );

          try {
            final licenseService = ref.read(licenseServiceProvider);
            final result = await licenseService.activateLicense(licenseKey);

            if (!context.mounted) return;
            ScaffoldMessenger.of(context).hideCurrentSnackBar();

            if (result != null) {
              // License activated successfully, refresh the provider
              ref.invalidate(currentLicenseProvider);
              ref.invalidate(licenseValidationProvider);

              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('License activated successfully!'),
                  backgroundColor: LuxuryColors.rolexGreen,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            } else {
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Invalid license key. Please try again.'),
                  backgroundColor: Colors.red,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          } catch (e) {
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Error activating license: ${e.toString()}'),
                backgroundColor: Colors.red,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    // Show confirmation dialog
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        final isDark = Theme.of(dialogContext).brightness == Brightness.dark;

        return AlertDialog(
          backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            'Sign Out',
            style: TextStyle(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          content: Text(
            'Are you sure you want to sign out?',
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
                backgroundColor: isDark ? LuxuryColors.champagneGold : LuxuryColors.rolexGreen,
                foregroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Sign Out'),
            ),
          ],
        );
      },
    );

    if (shouldLogout == true) {
      // Clean up caches before logout
      final lifecycleService = ref.read(appLifecycleServiceProvider);
      await lifecycleService.onUserLogout();

      // Perform logout
      await ref.read(authProvider.notifier).logout();

      // Navigate to auth mode page
      if (context.mounted) {
        context.go(AppRoutes.authMode);
      }
    }
  }
}
