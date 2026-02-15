import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/app_config.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/providers/providers.dart';
import '../../../../core/services/biometric_service.dart';
import '../../../../core/services/salesforce_service.dart';
import '../../../../core/services/license_service.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/crm_mode_toggle.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../../auth/presentation/bloc/auth_provider.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../notifications/data/notification_repository.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  String _biometricName = 'Biometrics';

  @override
  void initState() {
    super.initState();
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    final biometricService = ref.read(biometricServiceProvider);
    final canCheck = await biometricService.canCheckBiometrics();
    final isEnabled = await biometricService.isBiometricEnabled();
    final biometrics = await biometricService.getAvailableBiometrics();

    if (mounted) {
      setState(() {
        _biometricAvailable = canCheck && biometrics.isNotEmpty;
        _biometricEnabled = isEnabled;
        _biometricName = biometricService.getBiometricName(biometrics);
      });
    }
  }

  Future<void> _toggleBiometric(bool enable) async {
    final biometricService = ref.read(biometricServiceProvider);

    if (enable) {
      // First, prompt for password to store with biometric
      final password = await _promptForPassword();
      if (password == null || password.isEmpty) return;

      // Verify the password is correct by attempting login
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      // Verify password with server
      final authRepo = ref.read(authRepositoryProvider);
      try {
        await authRepo.login(user.email, password);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Incorrect password'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
        return;
      }

      // Now authenticate with biometric
      final authenticated = await biometricService.authenticate(
        reason: 'Verify your identity to enable $_biometricName',
      );

      if (authenticated) {
        // Store credentials (email + password) for biometric re-authentication
        await biometricService.enableBiometric(user.email, password);
        HapticFeedback.heavyImpact();
        if (mounted) {
          setState(() => _biometricEnabled = true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$_biometricName enabled'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      }
    } else {
      await biometricService.disableBiometric();
      HapticFeedback.lightImpact();
      if (mounted) {
        setState(() => _biometricEnabled = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$_biometricName disabled'),
            backgroundColor: IrisTheme.darkSurface,
          ),
        );
      }
    }
  }

  /// Prompt user to enter their password for biometric setup
  Future<String?> _promptForPassword() async {
    final passwordController = TextEditingController();
    final isDark = ref.read(themeModeProvider);

    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Enter Password',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter your password to enable $_biometricName login.',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: passwordController,
              obscureText: true,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Password',
                hintStyle: TextStyle(
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: isDark
                    ? IrisTheme.darkBackground
                    : IrisTheme.lightBackground,
              ),
              style: TextStyle(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(null),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(passwordController.text),
            child: Text(
              'Continue',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.jadePremium,
                fontWeight: IrisTheme.weightSemiBold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCrmConnectionSection(bool isDark) {
    final authMode = ref.watch(authModeProvider);
    final sfStatus = ref.watch(salesforceStatusProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CRM Connection',
          style: IrisTheme.titleSmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 12),

        // CRM Mode Toggle
        IrisCard(
          child: Column(
            children: [
              // Mode selector with logos
              const CrmModeSelector(),
              const SizedBox(height: 16),

              // Salesforce Connection Status (only show in Salesforce mode)
              if (authMode == AuthMode.salesforce) ...[
                Divider(color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
                const SizedBox(height: 12),
                sfStatus.when(
                  data: (status) => Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: status.isConnected ? IrisTheme.success : IrisTheme.error,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              status.isConnected
                                  ? 'Connected to ${status.orgName ?? 'Salesforce'}'
                                  : 'Not Connected',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                              ),
                            ),
                            if (status.isConnected && status.displayName != null)
                              Text(
                                status.displayName!,
                                style: IrisTheme.labelSmall.copyWith(
                                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: () async {
                          if (status.isConnected) {
                            // Disconnect
                            final service = ref.read(salesforceServiceProvider);
                            await service.disconnect();
                            ref.invalidate(salesforceStatusProvider);
                          } else {
                            // Go to Salesforce login
                            context.go(AppRoutes.salesforceLogin);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: (status.isConnected ? IrisTheme.error : LuxuryColors.salesforceBlue).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            status.isConnected ? 'Disconnect' : 'Connect',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: status.isConnected ? IrisTheme.error : LuxuryColors.salesforceBlue,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  loading: () => Row(
                    children: [
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.salesforceBlue),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Checking connection...',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                  error: (e, st) => Row(
                    children: [
                      Icon(Iconsax.warning_2, size: 16, color: IrisTheme.error),
                      const SizedBox(width: 10),
                      Text(
                        'Connection check failed',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: IrisTheme.error,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ).animate(delay: 220.ms).fadeIn().slideY(begin: 0.1),
      ],
    );
  }

  /// Perform logout with premium overlay animation
  Future<void> _performLogout() async {

    // Store navigator reference before any async operations
    final navigator = GoRouter.of(context);

    // Show confirmation dialog
    final shouldLogout = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        final isDarkDialog = Theme.of(dialogContext).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: isDarkDialog ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Log Out',
            style: IrisTheme.titleMedium.copyWith(
              color: isDarkDialog ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          content: Text(
            'Are you sure you want to log out?',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDarkDialog ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(
                'Cancel',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDarkDialog ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(
                'Log Out',
                style: IrisTheme.labelMedium.copyWith(
                  color: IrisTheme.error,
                  fontWeight: IrisTheme.weightSemiBold,
                ),
              ),
            ),
          ],
        );
      },
    );

    if (shouldLogout != true) return;

    HapticFeedback.mediumImpact();

    // Show premium logout overlay
    if (!mounted) return;
    _showLogoutOverlay(navigator);
  }

  /// Show the premium logout overlay with glassmorphic effect
  void _showLogoutOverlay(GoRouter navigator) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => _LogoutOverlayWidget(
        onLogoutComplete: () async {
          // Perform actual logout
          try {
            await ref.read(authProvider.notifier).logout();
          } catch (e) {
            // Silently ignore
          }
        },
        onAnimationComplete: () {
          overlayEntry.remove();
          navigator.go(AppRoutes.login);
        },
      ),
    );

    overlay.insert(overlayEntry);
  }

  Widget _buildLicenseBadge() {
    final licenseAsync = ref.watch(currentLicenseProvider);

    return licenseAsync.when(
      data: (license) {
        if (license == null) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: IrisTheme.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'No License',
              style: IrisTheme.labelSmall.copyWith(
                color: IrisTheme.warning,
              ),
            ),
          );
        }

        Color badgeColor;
        String badgeText;

        switch (license.status) {
          case LicenseStatus.active:
            badgeColor = IrisTheme.success;
            badgeText = license.licenseType.tier;
            break;
          case LicenseStatus.trial:
            badgeColor = IrisTheme.warning;
            badgeText = 'Trial';
            break;
          case LicenseStatus.expired:
            badgeColor = IrisTheme.error;
            badgeText = 'Expired';
            break;
          default:
            badgeColor = IrisTheme.darkTextTertiary;
            badgeText = 'Unknown';
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: badgeColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            badgeText,
            style: IrisTheme.labelSmall.copyWith(
              color: badgeColor,
            ),
          ),
        );
      },
      loading: () => const SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
        ),
      ),
      error: (e, st) => const Icon(
        Iconsax.warning_2,
        size: 16,
        color: IrisTheme.error,
      ),
    );
  }

  Widget _buildNotificationBadge() {
    final unreadCount = ref.watch(unreadNotificationsCountProvider);
    final isDark = ref.watch(themeModeProvider);

    if (unreadCount == 0) {
      return Icon(
        Iconsax.arrow_right_3,
        size: 16,
        color: isDark
            ? IrisTheme.darkTextTertiary
            : IrisTheme.lightTextTertiary,
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Text(
            unreadCount > 99 ? '99+' : unreadCount.toString(),
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.jadePremium,
              fontWeight: IrisTheme.weightSemiBold,
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final isDark = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
              },
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Settings',
                      style: IrisTheme.headlineMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ).animate().fadeIn(duration: 400.ms),

                    const SizedBox(height: 24),

                    // Profile Section
                    IrisCard(
                      onTap: () => context.push(AppRoutes.profile),
                      child: Row(
                        children: [
                          // Show avatar image if available, otherwise show initials
                          user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty
                              ? CircleAvatar(
                                  radius: 28,
                                  backgroundColor: LuxuryColors.rolexGreen,
                                  child: ClipOval(
                                    child: CachedNetworkImage(
                                      imageUrl: user.avatarUrl!.startsWith('http')
                                          ? user.avatarUrl!
                                          : '${AppConfig.apiBaseUrl}${user.avatarUrl!}',
                                      width: 56,
                                      height: 56,
                                      fit: BoxFit.cover,
                                      placeholder: (context, url) => Center(
                                        child: Text(
                                          user.initials,
                                          style: IrisTheme.titleMedium.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      errorWidget: (context, url, error) => Center(
                                        child: Text(
                                          user.initials,
                                          style: IrisTheme.titleMedium.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                )
                              : CircleAvatar(
                                  radius: 28,
                                  backgroundColor: LuxuryColors.rolexGreen,
                                  child: Text(
                                    user?.initials ?? 'U',
                                    style: IrisTheme.titleMedium.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user?.fullName ?? 'User',
                                  style: IrisTheme.titleMedium.copyWith(
                                    color: isDark
                                        ? IrisTheme.darkTextPrimary
                                        : IrisTheme.lightTextPrimary,
                                  ),
                                ),
                                Text(
                                  user?.email ?? 'email@example.com',
                                  style: IrisTheme.bodySmall.copyWith(
                                    color: isDark
                                        ? IrisTheme.darkTextSecondary
                                        : IrisTheme.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            Iconsax.arrow_right_3,
                            size: 18,
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                          ),
                        ],
                      ),
                    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

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
                          _SettingsItem(
                            icon: Iconsax.medal_star,
                            title: 'License & Subscription',
                            trailing: _buildLicenseBadge(),
                            onTap: () => context.push(AppRoutes.licenseSettings),
                          ),
                          _SettingsItem(
                            icon: Iconsax.cpu,
                            title: 'AI Settings',
                            onTap: () => context.push(AppRoutes.aiSettings),
                          ),
                          _SettingsItem(
                            icon: Iconsax.setting_2,
                            title: 'General',
                            onTap: () => context.push(AppRoutes.generalSettings),
                          ),
                          _SettingsItem(
                            icon: Iconsax.element_4,
                            title: 'Dashboard Layout',
                            onTap: () {
                              HapticFeedback.lightImpact();
                              context.push(AppRoutes.dashboardSettings);
                            },
                          ),
                          _SettingsItem(
                            icon: Iconsax.shield_tick,
                            title: 'Data & Privacy',
                            onTap: () => context.push(AppRoutes.dataSettings),
                            showDivider: false,
                          ),
                        ],
                      ),
                    ).animate(delay: 120.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // Quick Access
                    Text(
                      'Quick Access',
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
                          _SettingsItem(
                            icon: Iconsax.cpu_setting,
                            title: 'AI Agents',
                            onTap: () => context.push(AppRoutes.agents),
                          ),
                          _SettingsItem(
                            icon: Iconsax.calendar,
                            title: 'Calendar',
                            onTap: () => context.push(AppRoutes.calendar),
                          ),
                          _SettingsItem(
                            icon: Iconsax.chart_2,
                            title: 'Reports & Analytics',
                            onTap: () => context.push(AppRoutes.reports),
                          ),
                          _SettingsItem(
                            icon: Iconsax.activity,
                            title: 'Activity Feed',
                            onTap: () => context.push(AppRoutes.activity),
                          ),
                          _SettingsItem(
                            icon: Iconsax.call,
                            title: 'Call History',
                            onTap: () => context.push(AppRoutes.callHistory),
                            showDivider: false,
                          ),
                        ],
                      ),
                    ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // CRM Section
                    Text(
                      'CRM',
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
                          _SettingsItem(
                            icon: Iconsax.user_search,
                            title: 'Contacts',
                            onTap: () => context.go(AppRoutes.contacts),
                          ),
                          _SettingsItem(
                            icon: Iconsax.profile_2user,
                            title: 'Leads',
                            onTap: () => context.go(AppRoutes.leads),
                          ),
                          _SettingsItem(
                            icon: Iconsax.building,
                            title: 'Accounts',
                            onTap: () => context.push(AppRoutes.accounts),
                          ),
                          _SettingsItem(
                            icon: Iconsax.document_text,
                            title: 'Quotes',
                            onTap: () => context.push(AppRoutes.quotes),
                          ),
                          _SettingsItem(
                            icon: Iconsax.receipt_item,
                            title: 'Contracts',
                            onTap: () => context.push(AppRoutes.contracts),
                          ),
                          _SettingsItem(
                            icon: Iconsax.flash_1,
                            title: 'Campaigns',
                            onTap: () => context.push(AppRoutes.campaigns),
                            showDivider: false,
                          ),
                        ],
                      ),
                    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // CPQ Configuration Section
                    Text(
                      'CPQ Configuration',
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
                          _SettingsItem(
                            icon: Iconsax.book,
                            title: 'Price Books',
                            onTap: () => context.push(AppRoutes.priceBooks),
                          ),
                          _SettingsItem(
                            icon: Iconsax.ticket_discount,
                            title: 'Discount Rules',
                            onTap: () => context.push(AppRoutes.discountRules),
                          ),
                          _SettingsItem(
                            icon: Iconsax.receipt_2,
                            title: 'Tax Rates',
                            onTap: () => context.push(AppRoutes.taxRates),
                          ),
                          _SettingsItem(
                            icon: Iconsax.hierarchy_3,
                            title: 'Pipelines',
                            onTap: () => context.push(AppRoutes.pipelines),
                            showDivider: false,
                          ),
                        ],
                      ),
                    ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // Organization Section
                    Text(
                      'Organization',
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
                          _SettingsItem(
                            icon: Iconsax.people,
                            title: 'Team',
                            onTap: () => context.push(AppRoutes.team),
                          ),
                          _SettingsItem(
                            icon: Iconsax.link,
                            title: 'Integrations',
                            onTap: () => context.push(AppRoutes.integrations),
                            showDivider: false,
                          ),
                        ],
                      ),
                    ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // Preferences Section
                    Text(
                      'Preferences',
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
                          _SettingsItem(
                            icon: isDark ? Iconsax.moon : Iconsax.sun_1,
                            title: 'Dark Mode',
                            trailing: Switch(
                              value: isDark,
                              onChanged: (_) =>
                                  ref.read(themeModeProvider.notifier).toggle(),
                              activeTrackColor: LuxuryColors.rolexGreen,
                              thumbColor: WidgetStateProperty.resolveWith((states) =>
                                  states.contains(WidgetState.selected)
                                      ? Colors.white
                                      : null),
                            ),
                          ),
                          if (_biometricAvailable)
                            _SettingsItem(
                              icon: _biometricName == 'Face ID'
                                  ? Iconsax.scan
                                  : Iconsax.finger_scan,
                              title: _biometricName,
                              trailing: Switch(
                                value: _biometricEnabled,
                                onChanged: _toggleBiometric,
                                activeTrackColor: LuxuryColors.rolexGreen,
                                thumbColor: WidgetStateProperty.resolveWith((states) =>
                                    states.contains(WidgetState.selected)
                                        ? Colors.white
                                        : null),
                              ),
                            ),
                          _SettingsItem(
                            icon: Iconsax.notification,
                            title: 'Notifications',
                            trailing: _buildNotificationBadge(),
                            onTap: () => context.push(AppRoutes.notifications),
                          ),
                          _SettingsItem(
                            icon: Iconsax.notification_bing,
                            title: 'Notification Preferences',
                            onTap: () => context.push(AppRoutes.notificationPreferences),
                          ),
                          _SettingsItem(
                            icon: Iconsax.security_safe,
                            title: 'Privacy & Security',
                            onTap: () => context.push(AppRoutes.privacyPreferences),
                            showDivider: false,
                          ),
                        ],
                      ),
                    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // CRM Connection Section
                    _buildCrmConnectionSection(isDark),

                    const SizedBox(height: 24),

                    // Support Section
                    Text(
                      'Support',
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
                          _SettingsItem(
                            icon: Iconsax.message_question,
                            title: 'Help & Support',
                            onTap: () => context.push(AppRoutes.helpSupport),
                          ),
                          _SettingsItem(
                            icon: Iconsax.document_text,
                            title: 'Terms of Service',
                            onTap: () => context.push(AppRoutes.termsOfService),
                          ),
                          _SettingsItem(
                            icon: Iconsax.info_circle,
                            title: 'About SalesOS',
                            onTap: () => context.push(AppRoutes.aboutIris),
                            showDivider: false,
                          ),
                        ],
                      ),
                    ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // Logout - Using Material InkWell for reliable tap handling
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () async {
                          await _performLogout();
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: IrisTheme.error.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Iconsax.logout,
                                size: 18,
                                color: IrisTheme.error,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Log Out',
                                style: IrisTheme.titleSmall.copyWith(
                                  color: IrisTheme.error,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // Version
                    Center(
                      child: Text(
                        'SalesOS Mobile v1.0.0',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ).animate(delay: 350.ms).fadeIn(),

                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool showDivider;

  const _SettingsItem({
    required this.icon,
    required this.title,
    this.onTap,
    this.trailing,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                ),
                trailing ??
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
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 48,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
      ],
    );
  }
}

/// Premium logout overlay with glassmorphic effect and animations
class _LogoutOverlayWidget extends StatefulWidget {
  final Future<void> Function() onLogoutComplete;
  final VoidCallback onAnimationComplete;

  const _LogoutOverlayWidget({
    required this.onLogoutComplete,
    required this.onAnimationComplete,
  });

  @override
  State<_LogoutOverlayWidget> createState() => _LogoutOverlayWidgetState();
}

class _LogoutOverlayWidgetState extends State<_LogoutOverlayWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    // Fade animation controller
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );

    // Start the sequence
    _startLogoutSequence();
  }

  Future<void> _startLogoutSequence() async {
    // Fade in the overlay
    await _fadeController.forward();

    // Wait a moment to show the signing out state
    await Future.delayed(const Duration(milliseconds: 600));

    // Perform logout (with timeout already handled in auth_provider)
    await widget.onLogoutComplete();

    // Small delay to show completion
    await Future.delayed(const Duration(milliseconds: 400));

    // Fade out
    await _fadeController.reverse();

    // Complete
    widget.onAnimationComplete();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return AnimatedBuilder(
      animation: _fadeAnimation,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value,
          child: _buildOverlayContent(size, _fadeAnimation.value),
        );
      },
    );
  }

  Widget _buildOverlayContent(Size size, double progress) {
    return Material(
      color: Colors.transparent,
      child: Stack(
        children: [
          // Glassmorphic background with blur
          BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: 25 * progress,
              sigmaY: 25 * progress,
            ),
            child: Container(
              width: size.width,
              height: size.height,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    IrisTheme.darkBackground.withValues(alpha: 0.92),
                    IrisTheme.darkSurface.withValues(alpha: 0.95),
                  ],
                ),
              ),
            ),
          ),

          // Content
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Animated IRIS logo with pulsing glow
                _buildAnimatedLogo(),

                const SizedBox(height: 36),

                // "Signing out" text
                Text(
                  'Signing out',
                  style: IrisTheme.headlineSmall.copyWith(
                    color: IrisTheme.darkTextPrimary,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1,
                  ),
                )
                    .animate()
                    .fadeIn(delay: 200.ms, duration: 400.ms)
                    .slideY(begin: 0.2, curve: Curves.easeOut),

                const SizedBox(height: 12),

                // Animated dots
                _buildAnimatedDots()
                    .animate()
                    .fadeIn(delay: 400.ms, duration: 300.ms),

                const SizedBox(height: 24),

                // Farewell message
                Text(
                  'See you soon!',
                  style: IrisTheme.bodyLarge.copyWith(
                    color: IrisTheme.darkTextSecondary,
                  ),
                )
                    .animate()
                    .fadeIn(delay: 600.ms, duration: 400.ms)
                    .slideY(begin: 0.2, curve: Curves.easeOut),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedLogo() {
    return Container(
      width: 110,
      height: 110,
      decoration: BoxDecoration(
        gradient: LuxuryColors.emeraldGradient,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
            blurRadius: 40,
            spreadRadius: 15,
          ),
          BoxShadow(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
            blurRadius: 60,
            spreadRadius: 25,
          ),
        ],
      ),
      child: const Icon(
        Icons.auto_awesome,
        size: 52,
        color: Colors.white,
      ),
    )
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .scale(
          begin: const Offset(1.0, 1.0),
          end: const Offset(1.08, 1.08),
          duration: 1200.ms,
          curve: Curves.easeInOut,
        )
        .shimmer(
          delay: 500.ms,
          duration: 1800.ms,
          color: Colors.white.withValues(alpha: 0.25),
        );
  }

  Widget _buildAnimatedDots() {
    // Wrap continuous animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: LuxuryColors.jadePremium,
                  shape: BoxShape.circle,
                ),
              )
                  .animate(
                    onPlay: (controller) => controller.repeat(),
                  )
                  .scale(
                    begin: const Offset(0.5, 0.5),
                    end: const Offset(1.0, 1.0),
                    delay: Duration(milliseconds: index * 200),
                    duration: 600.ms,
                    curve: Curves.easeInOut,
                  )
                  .then()
                  .scale(
                    begin: const Offset(1.0, 1.0),
                    end: const Offset(0.5, 0.5),
                    duration: 600.ms,
                    curve: Curves.easeInOut,
                  ),
            );
          }),
        ),
      ),
    );
  }
}
