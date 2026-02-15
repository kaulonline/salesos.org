import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// Card variants for different luxury styles
enum IrisCardVariant {
  standard, // Clean minimal style
  elevated, // With subtle shadow
  bordered, // With thin elegant border
  premium, // Gold accent
  glassmorphic, // Frosted glass effect
}

/// Styled card component with IRIS luxury design
/// SalesOS premium luxury aesthetics
class IrisCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderRadius;
  final List<BoxShadow>? boxShadow;
  final bool showBorder;
  final LinearGradient? gradient;
  final LinearGradient? accentGradient;
  final double accentWidth;
  final IrisCardVariant variant;
  final LuxuryTier tier;

  final bool showTexture; // Premium leather texture
  final double textureOpacity;

  const IrisCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.onLongPress,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius = 16,
    this.boxShadow,
    this.showBorder = true,
    this.gradient,
    this.accentGradient,
    this.accentWidth = 3,
    this.variant = IrisCardVariant.bordered,
    this.tier = LuxuryTier.gold, // Default to SalesOS gold
    this.showTexture = false,
    this.textureOpacity = 0.08,
  });

  Color _getAccentColor() {
    switch (tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
    }
  }

  BoxDecoration _getDecoration(bool isDark) {
    final accentColor = _getAccentColor();
    final cardColor = backgroundColor ??
        (isDark ? LuxuryColors.obsidian : Colors.white);

    switch (variant) {
      case IrisCardVariant.elevated:
        return BoxDecoration(
          color: gradient == null ? cardColor : null,
          gradient: gradient,
          borderRadius: BorderRadius.circular(borderRadius),
          boxShadow: boxShadow ??
              [
                BoxShadow(
                  color: accentColor.withValues(alpha: 0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
        );
      case IrisCardVariant.bordered:
        return BoxDecoration(
          color: gradient == null ? cardColor : null,
          gradient: gradient,
          borderRadius: BorderRadius.circular(borderRadius),
          border: showBorder
              ? Border.all(
                  color: borderColor ??
                      (isDark
                          ? accentColor.withValues(alpha: 0.15)
                          : accentColor.withValues(alpha: 0.1)),
                  width: 1,
                )
              : null,
        );
      case IrisCardVariant.premium:
        return BoxDecoration(
          color: gradient == null ? cardColor : null,
          gradient: gradient,
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(
            color: accentColor.withValues(alpha: 0.3),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: accentColor.withValues(alpha: 0.15),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        );
      case IrisCardVariant.glassmorphic:
        return BoxDecoration(
          color: (isDark ? LuxuryColors.obsidian : Colors.white)
              .withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(
            color: accentColor.withValues(alpha: 0.2),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        );
      case IrisCardVariant.standard:
        return BoxDecoration(
          color: gradient == null ? cardColor : null,
          gradient: gradient,
          borderRadius: BorderRadius.circular(borderRadius),
          border: showBorder && gradient == null
              ? Border.all(
                  color: borderColor ??
                      (isDark
                          ? LuxuryColors.champagneGold.withValues(alpha: 0.1)
                          : LuxuryColors.champagneGold.withValues(alpha: 0.08)),
                  width: 1,
                )
              : null,
          boxShadow: gradient != null
              ? [
                  BoxShadow(
                    color: gradient!.colors.first.withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    Widget cardContent = Padding(
      padding: padding ?? const EdgeInsets.all(18),
      child: child,
    );

    // Add accent gradient line if specified
    if (accentGradient != null) {
      cardContent = Row(
        children: [
          Container(
            width: accentWidth,
            decoration: BoxDecoration(
              gradient: accentGradient,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(borderRadius),
                bottomLeft: Radius.circular(borderRadius),
              ),
            ),
          ),
          Expanded(child: cardContent),
        ],
      );
    }

    // Apply texture overlay
    if (showTexture) {
      cardContent = LuxuryTextureOverlay(
        opacity: textureOpacity,
        child: cardContent,
      );
    }

    Widget card = Container(
      margin: margin,
      decoration: _getDecoration(isDark),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: cardContent,
      ),
    );

    if (onTap != null || onLongPress != null) {
      card = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap != null
              ? () {
                  HapticFeedback.lightImpact();
                  onTap!();
                }
              : null,
          onLongPress: onLongPress != null
              ? () {
                  HapticFeedback.mediumImpact();
                  onLongPress!();
                }
              : null,
          borderRadius: BorderRadius.circular(borderRadius),
          child: card,
        ),
      );
    }

    return card;
  }
}

/// Luxury gradient card with premium styling
class IrisGradientCard extends StatelessWidget {
  final Widget child;
  final LinearGradient gradient;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final VoidCallback? onTap;
  final LuxuryTier tier;

  final bool showTexture;
  final double textureOpacity;

  const IrisGradientCard({
    super.key,
    required this.child,
    required this.gradient,
    this.padding,
    this.margin,
    this.borderRadius = 16,
    this.onTap,
    this.tier = LuxuryTier.gold, // Default to SalesOS gold
    this.showTexture = false,
    this.textureOpacity = 0.03,
  });

  Color _getBorderColor() {
    switch (tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold.withValues(alpha: 0.4);
      case LuxuryTier.platinum:
        return LuxuryColors.platinum.withValues(alpha: 0.4);
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold.withValues(alpha: 0.4);
      default:
        return LuxuryColors.champagneGold.withValues(alpha: 0.4);
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget content = Padding(
      padding: padding ?? const EdgeInsets.all(22),
      child: child,
    );

    // Apply texture overlay
    if (showTexture) {
      content = LuxuryTextureOverlay(
        opacity: textureOpacity,
        child: content,
      );
    }

    Widget card = Container(
      margin: margin,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: _getBorderColor(),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: gradient.colors.first.withValues(alpha: 0.25),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: gradient.colors.last.withValues(alpha: 0.15),
            blurRadius: 40,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: content,
      ),
    );

    if (onTap != null) {
      card = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            onTap!();
          },
          borderRadius: BorderRadius.circular(borderRadius),
          child: card,
        ),
      );
    }

    return card;
  }
}

/// Luxury stat card for dashboard metrics
class IrisStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? iconColor;
  final LinearGradient? iconGradient;
  final Widget? trailing;
  final VoidCallback? onTap;
  final LuxuryTier tier;

  const IrisStatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.iconColor,
    this.iconGradient,
    this.trailing,
    this.onTap,
    this.tier = LuxuryTier.gold, // Default to SalesOS gold
  });

  LinearGradient _getDefaultGradient() {
    switch (tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
        return LuxuryColors.goldShimmer;
      case LuxuryTier.platinum:
        return LuxuryColors.platinumShimmer;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGoldGradient;
      case LuxuryTier.royal:
        return LuxuryColors.royalGradient;
      case LuxuryTier.diamond:
        return LuxuryColors.platinumShimmer;
    }
  }

  Color _getIconForeground() {
    switch (tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
      case LuxuryTier.royal:
        return LuxuryColors.diamond;
      default:
        return LuxuryColors.richBlack;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final effectiveGradient = iconGradient ??
        (iconColor != null
            ? LinearGradient(colors: [iconColor!, iconColor!.withValues(alpha: 0.8)])
            : _getDefaultGradient());

    return IrisCard(
      onTap: onTap,
      variant: IrisCardVariant.elevated,
      tier: tier,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: effectiveGradient,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: effectiveGradient.colors.first.withValues(alpha: 0.3),
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: effectiveGradient.colors.first.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: _getIconForeground(),
                ),
              ),
              const Spacer(),
              ?trailing,
            ],
          ),
          const SizedBox(height: 16),
          Text(
            value,
            style: IrisTheme.headlineMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
              fontWeight: FontWeight.w500,
              letterSpacing: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}

/// Premium action button with gradient
class IrisGradientButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final LinearGradient gradient;
  final VoidCallback? onTap;
  final double? width;
  final double height;
  final LuxuryTier tier;

  const IrisGradientButton({
    super.key,
    required this.label,
    required this.icon,
    required this.gradient,
    this.onTap,
    this.width,
    this.height = 52,
    this.tier = LuxuryTier.gold,
  });

  Color _getForegroundColor() {
    switch (tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
      case LuxuryTier.royal:
        return LuxuryColors.diamond;
      default:
        return LuxuryColors.richBlack;
    }
  }

  @override
  Widget build(BuildContext context) {
    final foreground = _getForegroundColor();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap != null
            ? () {
                HapticFeedback.lightImpact();
                onTap!();
              }
            : null,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: width,
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: gradient.colors.first.withValues(alpha: 0.3),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: gradient.colors.first.withValues(alpha: 0.3),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: foreground, size: 20),
              const SizedBox(width: 10),
              Text(
                label.toUpperCase(),
                style: IrisTheme.labelMedium.copyWith(
                  color: foreground,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Premium info card with subtle luxury styling
class LuxuryInfoCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Widget? trailing;
  final VoidCallback? onTap;
  final LuxuryTier tier;

  const LuxuryInfoCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.trailing,
    this.onTap,
    this.tier = LuxuryTier.gold,
  });

  Color _getAccentColor() {
    switch (tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accent = _getAccentColor();

    return IrisCard(
      onTap: onTap,
      variant: IrisCardVariant.bordered,
      tier: tier,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: accent.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
              child: Icon(
                icon,
                size: 20,
                color: accent,
              ),
            ),
            const SizedBox(width: 14),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          ?trailing,
          if (trailing == null && onTap != null)
            Icon(
              Icons.chevron_right,
              size: 20,
              color: accent.withValues(alpha: 0.6),
            ),
        ],
      ),
    );
  }
}
