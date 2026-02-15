import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// Glassmorphism container with frosted glass effect
class IrisGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final double blur;
  final double opacity;
  final Color? borderColor;
  final Color? backgroundColor;
  final VoidCallback? onTap;
  final bool showBorder;

  const IrisGlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius = 16,
    this.blur = 10,
    this.opacity = 0.1,
    this.borderColor,
    this.backgroundColor,
    this.onTap,
    this.showBorder = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bgColor = backgroundColor ??
        (isDark
            ? Colors.white.withValues(alpha: opacity)
            : Colors.white.withValues(alpha: opacity * 3));

    final border = borderColor ??
        (isDark
            ? Colors.white.withValues(alpha: 0.2)
            : Colors.white.withValues(alpha: 0.5));

    Widget card = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          margin: margin,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(borderRadius),
            border: showBorder
                ? Border.all(color: border, width: 1.5)
                : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 20,
                spreadRadius: -5,
              ),
            ],
          ),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(16),
            child: child,
          ),
        ),
      ),
    );

    if (onTap != null) {
      card = GestureDetector(
        onTap: onTap,
        child: card,
      );
    }

    return card;
  }
}

/// Glassmorphism app bar
class IrisGlassAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool showBackButton;
  final List<Widget>? actions;
  final double blur;

  const IrisGlassAppBar({
    super.key,
    required this.title,
    this.showBackButton = false,
    this.actions,
    this.blur = 15,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          decoration: BoxDecoration(
            color: isDark
                ? Colors.black.withValues(alpha: 0.5)
                : Colors.white.withValues(alpha: 0.7),
            border: Border(
              bottom: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.black.withValues(alpha: 0.05),
              ),
            ),
          ),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  if (showBackButton)
                    IconButton(
                      icon: Icon(
                        Icons.arrow_back_ios_new,
                        size: 20,
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                    )
                  else
                    const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      title,
                      style: IrisTheme.titleLarge.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (actions != null) ...actions!,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Glassmorphism bottom sheet
class IrisGlassBottomSheet extends StatelessWidget {
  final Widget child;
  final double blur;
  final double borderRadius;

  const IrisGlassBottomSheet({
    super.key,
    required this.child,
    this.blur = 20,
    this.borderRadius = 24,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ClipRRect(
      borderRadius: BorderRadius.vertical(top: Radius.circular(borderRadius)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          decoration: BoxDecoration(
            color: isDark
                ? Colors.black.withValues(alpha: 0.6)
                : Colors.white.withValues(alpha: 0.8),
            borderRadius: BorderRadius.vertical(top: Radius.circular(borderRadius)),
            border: Border(
              top: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.2)
                    : Colors.white.withValues(alpha: 0.8),
                width: 1.5,
              ),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Glassmorphism button
class IrisGlassButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isFullWidth;
  final double blur;

  const IrisGlassButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isFullWidth = false,
    this.blur = 10,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final button = ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: GestureDetector(
          onTap: onPressed,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: LuxuryColors.champagneGold),
                  const SizedBox(width: 8),
                ],
                Text(
                  label,
                  style: IrisTheme.labelLarge.copyWith(
                    color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    return isFullWidth ? SizedBox(width: double.infinity, child: button) : button;
  }
}

/// Glassmorphism floating action button
class IrisGlassFAB extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final double size;
  final double blur;
  final String? tooltip;

  const IrisGlassFAB({
    super.key,
    required this.icon,
    required this.onPressed,
    this.size = 56,
    this.blur = 15,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final fab = ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: GestureDetector(
          onTap: onPressed,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  LuxuryColors.champagneGold.withValues(alpha: 0.8),
                  LuxuryColors.champagneGoldLight.withValues(alpha: 0.6),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.3),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Builder(
              builder: (context) {
                final isDark = Theme.of(context).brightness == Brightness.dark;
                return Icon(
                  icon,
                  color: isDark ? Colors.black : Colors.black87,
                  size: size * 0.45,
                );
              },
            ),
          ),
        ),
      ),
    );

    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: fab);
    }
    return fab;
  }
}

/// Glassmorphism pill/chip
class IrisGlassPill extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color? color;
  final VoidCallback? onTap;
  final double blur;

  const IrisGlassPill({
    super.key,
    required this.label,
    this.icon,
    this.color,
    this.onTap,
    this.blur = 8,
  });

  @override
  Widget build(BuildContext context) {
    final pillColor = color ?? LuxuryColors.champagneGold;

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: pillColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: pillColor.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 14, color: pillColor),
                  const SizedBox(width: 6),
                ],
                Text(
                  label,
                  style: IrisTheme.labelSmall.copyWith(
                    color: pillColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Glassmorphism notification badge
class IrisGlassBadge extends StatelessWidget {
  final int count;
  final Color? color;

  const IrisGlassBadge({
    super.key,
    required this.count,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();

    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: (color ?? IrisTheme.error).withValues(alpha: 0.9),
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Text(
            count > 99 ? '99+' : count.toString(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
