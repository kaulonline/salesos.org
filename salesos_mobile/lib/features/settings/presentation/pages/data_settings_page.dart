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
import '../../../../shared/widgets/iris_button.dart';

class DataSettingsPage extends ConsumerStatefulWidget {
  const DataSettingsPage({super.key});

  @override
  ConsumerState<DataSettingsPage> createState() => _DataSettingsPageState();
}

class _DataSettingsPageState extends ConsumerState<DataSettingsPage> {
  bool _isClearing = false;
  bool _isExporting = false;
  bool _isClearingCache = false;

  @override
  void initState() {
    super.initState();
    // Refresh data on page load
    Future.microtask(() {
      ref.invalidate(storageUsageProvider);
      ref.invalidate(privacyPreferencesProvider);
      ref.invalidate(dataRetentionInfoProvider);
    });
  }

  Future<void> _clearAllChats() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Iconsax.warning_2, color: IrisTheme.error),
            const SizedBox(width: 12),
            Flexible(
              child: Text(
                'Clear All Chats',
                style: IrisTheme.titleMedium.copyWith(
                  color: IrisTheme.error,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          'This will permanently delete all your chat history. This action cannot be undone.',
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
              'Clear All',
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
      setState(() => _isClearing = true);
      HapticFeedback.heavyImpact();

      try {
        final service = ref.read(dataPrivacyServiceProvider);
        final count = await service.clearConversationHistory();

        if (mounted) {
          setState(() => _isClearing = false);
          ref.invalidate(storageUsageProvider);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cleared $count conversations'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isClearing = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to clear chats: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  Future<void> _exportData() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Iconsax.export_1, color: LuxuryColors.jadePremium),
            const SizedBox(width: 12),
            Text(
              'Export Your Data',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          ],
        ),
        content: Text(
          'We will compile all your data including conversations, contacts, leads, and documents. You will receive a download link when ready (usually within a few minutes).',
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
            .requestDataExport(reason: 'User requested data export');

        if (mounted) {
          setState(() => _isExporting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content:
                  Text('Data export requested. You will be notified when ready.'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isExporting = false);
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
            Flexible(
              child: Text(
                'Delete Your Data',
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
              'This will permanently delete all your CRM data including conversations, contacts, leads, accounts, and documents. Your account will remain active.',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
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
      HapticFeedback.heavyImpact();
      try {
        await ref.read(dataRequestsProvider.notifier).requestDataDeletion(
              confirmationPhrase: 'DELETE MY DATA',
              reason: 'User requested data deletion',
            );

        if (mounted) {
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

  Future<void> _requestAccountDeletion() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirmController = TextEditingController();
    final passwordController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Iconsax.user_remove, color: IrisTheme.error),
            const SizedBox(width: 12),
            Flexible(
              child: Text(
                'Delete Account',
                style: IrisTheme.titleMedium.copyWith(
                  color: IrisTheme.error,
                ),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This will permanently delete your account and all associated data. This action cannot be undone.',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Enter your password:',
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
                  fillColor: isDark
                      ? IrisTheme.darkBackground
                      : IrisTheme.lightBackground,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Type "DELETE MY ACCOUNT" to confirm:',
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
                  hintText: 'DELETE MY ACCOUNT',
                  hintStyle: TextStyle(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  filled: true,
                  fillColor: isDark
                      ? IrisTheme.darkBackground
                      : IrisTheme.lightBackground,
                ),
              ),
            ],
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
            onPressed: () {
              if (confirmController.text == 'DELETE MY ACCOUNT' &&
                  passwordController.text.isNotEmpty) {
                Navigator.pop(context, true);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                        'Please enter your password and type the confirmation phrase'),
                    backgroundColor: IrisTheme.error,
                  ),
                );
              }
            },
            child: Text(
              'Delete Account',
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
      HapticFeedback.heavyImpact();
      try {
        await ref.read(dataRequestsProvider.notifier).requestAccountDeletion(
              password: passwordController.text,
              confirmationPhrase: 'DELETE MY ACCOUNT',
              reason: 'User requested account deletion',
            );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                  'Account deletion requested. You will receive a confirmation email.'),
              backgroundColor: IrisTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
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

  Future<void> _clearCache() async {
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

  Future<void> _openLegalDocument(String type) async {
    HapticFeedback.selectionClick();

    // Navigate to appropriate legal page
    switch (type) {
      case 'privacy':
        context.push(AppRoutes.privacySecurity);
        break;
      case 'terms':
        context.push(AppRoutes.termsOfService);
        break;
      case 'dpa':
        context.push(AppRoutes.dpa);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final privacyPrefs = ref.watch(privacyPreferencesProvider);
    final storageUsage = ref.watch(storageUsageProvider);
    final retentionInfo = ref.watch(dataRetentionInfoProvider);

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
          'Data & Privacy',
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
              // Data Management Section
              Text(
                'Data Management',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                child: Column(
                  children: [
                    // Clear All Chats
                    _DataActionTile(
                      icon: Iconsax.message_remove,
                      iconColor: IrisTheme.warning,
                      title: 'Clear All Chats',
                      subtitle: 'Delete all conversation history',
                      isLoading: _isClearing,
                      onTap: _clearAllChats,
                      isDark: isDark,
                    ),
                    Divider(
                        color: isDark
                            ? IrisTheme.darkBorder
                            : IrisTheme.lightBorder),

                    // Export Data
                    _DataActionTile(
                      icon: Iconsax.export_1,
                      title: 'Export My Data',
                      subtitle: 'Download all your data (GDPR)',
                      isLoading: _isExporting,
                      onTap: _exportData,
                      isDark: isDark,
                    ),
                    Divider(
                        color: isDark
                            ? IrisTheme.darkBorder
                            : IrisTheme.lightBorder),

                    // Request Data Deletion
                    _DataActionTile(
                      icon: Iconsax.trash,
                      iconColor: IrisTheme.error,
                      title: 'Delete My Data',
                      subtitle: 'Request deletion of all your data',
                      isLoading: false,
                      onTap: _requestDataDeletion,
                      isDark: isDark,
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Privacy Settings Section
              Text(
                'Privacy Settings',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              // Privacy Preferences Link Card
              IrisCard(
                onTap: () {
                  HapticFeedback.selectionClick();
                  context.push(AppRoutes.privacyPreferences);
                },
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.security_user,
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
                            'Privacy Preferences',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            'Control analytics, personalization, AI training & more',
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

              const SizedBox(height: 16),

              // Quick Privacy Toggles
              privacyPrefs.when(
                data: (prefs) => IrisCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      // Analytics Quick Toggle
                      _PrivacyToggleTile(
                        icon: Iconsax.chart_2,
                        title: 'Usage Analytics',
                        subtitle: 'Share anonymous usage data to improve the app',
                        value: prefs.analyticsEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setAnalyticsEnabled(value);
                        },
                        isDark: isDark,
                      ),

                      // Crash Reporting Quick Toggle
                      _PrivacyToggleTile(
                        icon: Iconsax.danger,
                        title: 'Crash Reporting',
                        subtitle: 'Send crash reports to improve stability',
                        value: prefs.crashReportingEnabled,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          ref
                              .read(privacyPreferencesProvider.notifier)
                              .setCrashReportingEnabled(value);
                        },
                        showDivider: false,
                        isDark: isDark,
                      ),
                    ],
                  ),
                ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (e, st) => IrisCard(
                  child: Text('Failed to load privacy preferences: $e'),
                ),
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

              retentionInfo.when(
                data: (info) => IrisCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Iconsax.timer_1,
                              size: 20,
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Default Retention: ${info.defaultRetentionDays} days',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ...info.dataCategories.map((category) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    category.description,
                                    style: IrisTheme.bodySmall.copyWith(
                                      color: isDark
                                          ? IrisTheme.darkTextSecondary
                                          : IrisTheme.lightTextSecondary,
                                    ),
                                  ),
                                ),
                                Text(
                                  category.retentionDisplayName,
                                  style: IrisTheme.labelSmall.copyWith(
                                    color: LuxuryColors.jadePremium,
                                  ),
                                ),
                              ],
                            ),
                          )),
                    ],
                  ),
                ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),
                loading: () => const SizedBox.shrink(),
                error: (e, st) => const SizedBox.shrink(),
              ),

              const SizedBox(height: 24),

              // Storage Info Section
              Text(
                'Storage',
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
                      _buildStorageRow(
                          'Chat Messages', usage.chatMessagesFormatted, isDark),
                      const SizedBox(height: 12),
                      _buildStorageRow(
                          'Cached Files', usage.cachedFilesFormatted, isDark),
                      const SizedBox(height: 12),
                      _buildStorageRow(
                          'Documents', usage.documentsFormatted, isDark),
                      const SizedBox(height: 16),
                      Divider(
                          color: isDark
                              ? IrisTheme.darkBorder
                              : IrisTheme.lightBorder),
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
                      const SizedBox(height: 16),
                      IrisButton(
                        label: _isClearingCache ? 'Clearing...' : 'Clear Cache',
                        onPressed: _isClearingCache ? null : _clearCache,
                        variant: IrisButtonVariant.outline,
                        isFullWidth: true,
                        size: IrisButtonSize.small,
                      ),
                    ],
                  ),
                ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),
                loading: () => IrisCard(
                  child: Column(
                    children: [
                      _buildStorageRow('Chat Messages', '...', isDark),
                      const SizedBox(height: 12),
                      _buildStorageRow('Cached Files', '...', isDark),
                      const SizedBox(height: 12),
                      _buildStorageRow('Documents', '...', isDark),
                    ],
                  ),
                ),
                error: (e, st) => IrisCard(
                  child: Text('Failed to load storage info'),
                ),
              ),

              const SizedBox(height: 24),

              // Legal Section
              Text(
                'Legal',
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
                    _LegalTile(
                      icon: Iconsax.document_text,
                      title: 'Privacy Policy',
                      onTap: () => _openLegalDocument('privacy'),
                      isDark: isDark,
                    ),
                    _LegalTile(
                      icon: Iconsax.document,
                      title: 'Terms of Service',
                      onTap: () => _openLegalDocument('terms'),
                      isDark: isDark,
                    ),
                    _LegalTile(
                      icon: Iconsax.shield_tick,
                      title: 'Data Processing Agreement',
                      onTap: () => _openLegalDocument('dpa'),
                      showDivider: false,
                      isDark: isDark,
                    ),
                  ],
                ),
              ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Danger Zone Section
              Text(
                'Danger Zone',
                style: IrisTheme.titleSmall.copyWith(
                  color: IrisTheme.error,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                child: Column(
                  children: [
                    _DataActionTile(
                      icon: Iconsax.user_remove,
                      iconColor: IrisTheme.error,
                      title: 'Delete Account',
                      subtitle:
                          'Permanently delete your account and all data',
                      isLoading: false,
                      onTap: _requestAccountDeletion,
                      isDark: isDark,
                    ),
                  ],
                ),
              ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStorageRow(String label, String size, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: IrisTheme.bodySmall.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),
        Text(
          size,
          style: IrisTheme.bodySmall.copyWith(
            color:
                isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
      ],
    );
  }
}

class _DataActionTile extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String title;
  final String subtitle;
  final bool isLoading;
  final VoidCallback onTap;
  final bool isDark;

  const _DataActionTile({
    required this.icon,
    this.iconColor,
    required this.title,
    required this.subtitle,
    required this.isLoading,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: isLoading ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: (iconColor ?? LuxuryColors.rolexGreen)
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child:
                  Icon(icon, color: iconColor ?? LuxuryColors.jadePremium, size: 22),
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
              Icon(Iconsax.arrow_right_3,
                  size: 16,
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary),
          ],
        ),
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
            children: [
              Icon(icon,
                  size: 22,
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary),
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
              indent: 48,
              color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
      ],
    );
  }
}

class _LegalTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool showDivider;
  final bool isDark;

  const _LegalTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.showDivider = true,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon,
                    size: 20,
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary),
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
                Icon(Iconsax.arrow_right_3,
                    size: 16,
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary),
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(
              height: 1,
              indent: 48,
              color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
      ],
    );
  }
}
