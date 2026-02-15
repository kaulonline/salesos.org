import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import 'iris_button.dart';
import 'luxury_card.dart';

/// Luxury empty state widget with premium design
/// Inspired by high-end brand aesthetics
class IrisEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget? customAction;
  final LuxuryTier tier;

  const IrisEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.customAction,
    this.tier = LuxuryTier.gold,
  });

  /// Factory for leads empty state
  factory IrisEmptyState.leads({VoidCallback? onAdd, LuxuryTier tier = LuxuryTier.gold}) {
    return IrisEmptyState(
      icon: Iconsax.profile_2user,
      title: 'No leads yet',
      subtitle: 'Start adding leads to track your sales pipeline',
      actionLabel: 'Add Lead',
      onAction: onAdd,
      tier: tier,
    );
  }

  /// Factory for contacts empty state
  factory IrisEmptyState.contacts({VoidCallback? onAdd, LuxuryTier tier = LuxuryTier.gold}) {
    return IrisEmptyState(
      icon: Iconsax.user,
      title: 'No contacts found',
      subtitle: 'Add contacts to manage your relationships',
      actionLabel: 'Add Contact',
      onAction: onAdd,
      tier: tier,
    );
  }

  /// Factory for deals empty state
  factory IrisEmptyState.deals({VoidCallback? onAdd, LuxuryTier tier = LuxuryTier.gold}) {
    return IrisEmptyState(
      icon: Iconsax.dollar_circle,
      title: 'No deals in pipeline',
      subtitle: 'Create your first deal to start tracking revenue',
      actionLabel: 'Create Deal',
      onAction: onAdd,
      tier: tier,
    );
  }

  /// Factory for accounts empty state
  factory IrisEmptyState.accounts({VoidCallback? onAdd, LuxuryTier tier = LuxuryTier.gold}) {
    return IrisEmptyState(
      icon: Iconsax.building,
      title: 'No accounts yet',
      subtitle: 'Add your first account to start managing relationships',
      actionLabel: 'Add Account',
      onAction: onAdd,
      tier: tier,
    );
  }

  /// Factory for tasks empty state
  factory IrisEmptyState.tasks({VoidCallback? onAdd, LuxuryTier tier = LuxuryTier.gold}) {
    return IrisEmptyState(
      icon: Iconsax.tick_circle,
      title: 'All caught up!',
      subtitle: 'You have no pending tasks',
      actionLabel: 'Add Task',
      onAction: onAdd,
      tier: tier,
    );
  }

  /// Factory for search empty state
  factory IrisEmptyState.search({String? query, LuxuryTier tier = LuxuryTier.platinum}) {
    return IrisEmptyState(
      icon: Iconsax.search_normal,
      title: 'No results found',
      subtitle: query != null
          ? 'No matches for "$query"'
          : 'Try adjusting your search or filters',
      tier: tier,
    );
  }

  /// Factory for error state
  factory IrisEmptyState.error({
    String? message,
    VoidCallback? onRetry,
    LuxuryTier tier = LuxuryTier.gold,
  }) {
    return IrisEmptyState(
      icon: Iconsax.warning_2,
      title: 'Something went wrong',
      subtitle: message ?? 'Please try again later',
      actionLabel: 'Retry',
      onAction: onRetry,
      tier: tier,
    );
  }

  /// Factory for offline state
  factory IrisEmptyState.offline({VoidCallback? onRetry, LuxuryTier tier = LuxuryTier.platinum}) {
    return IrisEmptyState(
      icon: Iconsax.wifi_square,
      title: 'You\'re offline',
      subtitle: 'Check your internet connection and try again',
      actionLabel: 'Retry',
      onAction: onRetry,
      tier: tier,
    );
  }

  /// Factory for activity empty state
  factory IrisEmptyState.activity({LuxuryTier tier = LuxuryTier.gold}) {
    return IrisEmptyState(
      icon: Iconsax.activity,
      title: 'No recent activity',
      subtitle: 'Your activity will appear here',
      tier: tier,
    );
  }

  /// Factory for calendar empty state
  factory IrisEmptyState.calendar({VoidCallback? onAdd, LuxuryTier tier = LuxuryTier.roseGold}) {
    return IrisEmptyState(
      icon: Iconsax.calendar_tick,
      title: 'No events scheduled',
      subtitle: 'Add events to plan your day',
      actionLabel: 'Add Event',
      onAction: onAdd,
      tier: tier,
    );
  }

  /// Factory for quotes empty state
  factory IrisEmptyState.quotes({VoidCallback? onAdd, LuxuryTier tier = LuxuryTier.gold}) {
    return IrisEmptyState(
      icon: Iconsax.document_text,
      title: 'No quotes yet',
      subtitle: 'Create your first quote to start closing deals',
      actionLabel: 'Create Quote',
      onAction: onAdd,
      tier: tier,
    );
  }

  Color _getAccentColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
    }
  }

  IrisButtonVariant _getButtonVariant() {
    switch (tier) {
      case LuxuryTier.gold:
        return IrisButtonVariant.gold;
      case LuxuryTier.platinum:
        return IrisButtonVariant.platinum;
      case LuxuryTier.emerald:
        return IrisButtonVariant.emerald;
      default:
        return IrisButtonVariant.gold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = _getAccentColor();

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Luxury icon container with glow
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    accentColor.withValues(alpha: 0.15),
                    accentColor.withValues(alpha: 0.08),
                  ],
                ),
                shape: BoxShape.circle,
                border: Border.all(
                  color: accentColor.withValues(alpha: 0.25),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: accentColor.withValues(alpha: 0.15),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Icon(
                icon,
                size: 38,
                color: accentColor,
              ),
            )
                .animate()
                .fadeIn(duration: 400.ms)
                .scale(begin: const Offset(0.8, 0.8)),

            const SizedBox(height: 28),

            // Title
            Text(
              title,
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.3,
              ),
              textAlign: TextAlign.center,
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.2),

            if (subtitle != null) ...[
              const SizedBox(height: 10),
              Text(
                subtitle!,
                style: IrisTheme.bodyMedium.copyWith(
                  color: LuxuryColors.textMuted,
                  letterSpacing: 0.2,
                ),
                textAlign: TextAlign.center,
              ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.2),
            ],

            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 28),
              IrisButton(
                label: actionLabel!,
                onPressed: onAction,
                icon: Iconsax.add,
                variant: _getButtonVariant(),
              ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.2),
            ],

            if (customAction != null) ...[
              const SizedBox(height: 28),
              customAction!.animate(delay: 200.ms).fadeIn().slideY(begin: 0.2),
            ],
          ],
        ),
      ),
    );
  }
}

/// Premium empty state with illustration placeholder
class LuxuryEmptyState extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget? illustration;
  final String? actionLabel;
  final VoidCallback? onAction;
  final LuxuryTier tier;

  const LuxuryEmptyState({
    super.key,
    required this.title,
    required this.subtitle,
    this.illustration,
    this.actionLabel,
    this.onAction,
    this.tier = LuxuryTier.gold,
  });

  Color _getAccentColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = _getAccentColor();

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Illustration or placeholder
            if (illustration != null)
              illustration!
            else
              Container(
                width: 180,
                height: 140,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      accentColor.withValues(alpha: 0.12),
                      accentColor.withValues(alpha: 0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: accentColor.withValues(alpha: 0.2),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Icon(
                    Iconsax.document,
                    size: 48,
                    color: accentColor.withValues(alpha: 0.5),
                  ),
                ),
              )
                  .animate()
                  .fadeIn(duration: 400.ms)
                  .scale(begin: const Offset(0.9, 0.9)),

            const SizedBox(height: 32),

            // Title
            Text(
              title,
              style: IrisTheme.titleLarge.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.3,
              ),
              textAlign: TextAlign.center,
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.15),

            const SizedBox(height: 12),

            // Subtitle
            Text(
              subtitle,
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
                height: 1.5,
                letterSpacing: 0.2,
              ),
              textAlign: TextAlign.center,
            ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.15),

            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 32),
              LuxuryGradientButton(
                label: actionLabel!,
                onPressed: onAction,
                tier: tier,
                icon: Iconsax.add,
              ).animate(delay: 200.ms).fadeIn().scale(begin: const Offset(0.95, 0.95)),
            ],
          ],
        ),
      ),
    );
  }
}
