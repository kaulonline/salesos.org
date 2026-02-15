import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/providers/providers.dart';
import '../../../../core/services/preferences_service.dart';
import '../../../../shared/widgets/iris_card.dart';

class GeneralSettingsPage extends ConsumerWidget {
  const GeneralSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferences = ref.watch(userPreferencesProvider);
    final prefsNotifier = ref.read(userPreferencesProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'General Settings',
          style: IrisTheme.titleLarge.copyWith(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Appearance Section
              Text(
                'Appearance',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    // Dark Mode
                    _SettingsTile(
                      icon: preferences.darkMode ? Iconsax.moon : Iconsax.sun_1,
                      title: 'Dark Mode',
                      subtitle: 'Use dark theme throughout the app',
                      trailing: Switch(
                        value: preferences.darkMode,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          prefsNotifier.setDarkMode(value);
                          if (value) {
                            ref.read(themeModeProvider.notifier).setDarkMode();
                          } else {
                            ref.read(themeModeProvider.notifier).setLightMode();
                          }
                        },
                        activeTrackColor: LuxuryColors.rolexGreen,
                        thumbColor: WidgetStateProperty.resolveWith((states) =>
                            states.contains(WidgetState.selected)
                                ? Colors.white
                                : null),
                      ),
                    ),

                    // Font Size
                    _SettingsTile(
                      icon: Iconsax.text,
                      title: 'Font Size',
                      subtitle: preferences.fontSize.displayName,
                      onTap: () => _showFontSizeDialog(context, ref, preferences, prefsNotifier),
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Language & Region Section
              Text(
                'Language & Region',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    // Language
                    _SettingsTile(
                      icon: Iconsax.global,
                      title: 'Language',
                      subtitle: preferences.language.displayName,
                      onTap: () => _showLanguageDialog(context, ref, preferences, prefsNotifier),
                    ),

                    // Timezone
                    _SettingsTile(
                      icon: Iconsax.clock,
                      title: 'Timezone',
                      subtitle: preferences.timezone.displayName,
                      onTap: () => _showTimezoneDialog(context, ref, preferences, prefsNotifier),
                      showDivider: false,
                    ),
                  ],
                ),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 24),

              // Notifications Section
              Text(
                'Notifications',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),

              IrisCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    // Push Notifications
                    _SettingsTile(
                      icon: Iconsax.notification,
                      title: 'Push Notifications',
                      subtitle: 'Receive notifications on your device',
                      trailing: Switch(
                        value: preferences.pushNotifications,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          prefsNotifier.setPushNotifications(value);
                        },
                        activeTrackColor: LuxuryColors.rolexGreen,
                        thumbColor: WidgetStateProperty.resolveWith((states) =>
                            states.contains(WidgetState.selected)
                                ? Colors.white
                                : null),
                      ),
                    ),

                    // Email Notifications
                    _SettingsTile(
                      icon: Iconsax.sms,
                      title: 'Email Notifications',
                      subtitle: 'Receive updates via email',
                      trailing: Switch(
                        value: preferences.emailNotifications,
                        onChanged: (value) {
                          HapticFeedback.selectionClick();
                          prefsNotifier.setEmailNotifications(value);
                        },
                        activeTrackColor: LuxuryColors.rolexGreen,
                        thumbColor: WidgetStateProperty.resolveWith((states) =>
                            states.contains(WidgetState.selected)
                                ? Colors.white
                                : null),
                      ),
                      showDivider: false,
                    ),
                  ],
                ),
              ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  void _showFontSizeDialog(
    BuildContext context,
    WidgetRef ref,
    UserPreferences preferences,
    UserPreferencesNotifier notifier,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
                  'Font Size',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                ...FontSize.values.map((size) => _buildOptionTile(
                  title: size.displayName,
                  subtitle: 'Scale: ${(size.scaleFactor * 100).toInt()}%',
                  isSelected: preferences.fontSize == size,
                  isDark: isDark,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    notifier.setFontSize(size);
                    Navigator.pop(context);
                  },
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showLanguageDialog(
    BuildContext context,
    WidgetRef ref,
    UserPreferences preferences,
    UserPreferencesNotifier notifier,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
                  'Language',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                ...AppLanguage.values.map((lang) => _buildOptionTile(
                  title: lang.displayName,
                  isSelected: preferences.language == lang,
                  isDark: isDark,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    notifier.setLanguage(lang);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Language changed to ${lang.displayName}'),
                        backgroundColor: IrisTheme.success,
                      ),
                    );
                  },
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showTimezoneDialog(
    BuildContext context,
    WidgetRef ref,
    UserPreferences preferences,
    UserPreferencesNotifier notifier,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
                  'Timezone',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                ...AppTimezone.values.map((tz) => _buildOptionTile(
                  title: tz.displayName,
                  subtitle: 'UTC${tz.offset}',
                  isSelected: preferences.timezone == tz,
                  isDark: isDark,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    notifier.setTimezone(tz);
                    Navigator.pop(context);
                  },
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOptionTile({
    required String title,
    String? subtitle,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? LuxuryColors.rolexGreen.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: isSelected
              ? Border.all(color: LuxuryColors.rolexGreen, width: 1)
              : null,
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isSelected ? LuxuryColors.rolexGreen : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Iconsax.tick_circle, color: LuxuryColors.rolexGreen, size: 20),
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showDivider;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.onTap,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        InkWell(
          onTap: trailing == null ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, size: 22, color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                trailing ??
                    Icon(
                      Iconsax.arrow_right_3,
                      size: 16,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(height: 1, indent: 48, color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
      ],
    );
  }
}
