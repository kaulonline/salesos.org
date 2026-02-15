import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'luxury_card.dart';

enum IrisButtonVariant { primary, secondary, outline, ghost, danger, gold, platinum, emerald }

enum IrisButtonSize { small, medium, large }

/// Luxury styled button component with IRIS premium design
/// SalesOS premium luxury aesthetics
/// Ensures minimum 48dp touch target per Material Design guidelines
class IrisButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IrisButtonVariant variant;
  final IrisButtonSize size;
  final IconData? icon;
  final IconData? trailingIcon;
  final bool isLoading;
  final bool isFullWidth;
  final bool isDisabled;
  final String? semanticLabel;

  const IrisButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = IrisButtonVariant.primary,
    this.size = IrisButtonSize.medium,
    this.icon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.isDisabled = false,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final buttonPadding = _getPadding();
    final fontSize = _getFontSize();
    final iconSize = _getIconSize();

    final colors = _getColors(isDark);
    final backgroundColor = colors['background']!;
    final foregroundColor = colors['foreground']!;
    final borderColor = colors['border'];
    final gradient = colors['gradient'] as Gradient?;

    final enabled = !isDisabled && !isLoading && onPressed != null;

    Widget buttonContent = Row(
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading) ...[
          SizedBox(
            width: iconSize,
            height: iconSize,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
            ),
          ),
          const SizedBox(width: 8),
        ] else if (icon != null) ...[
          Icon(icon, size: iconSize, color: foregroundColor),
          const SizedBox(width: 8),
        ],
        Text(
          _shouldUppercase() ? label.toUpperCase() : label,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: _getFontWeight(),
            letterSpacing: _getLetterSpacing(),
            color: foregroundColor,
          ),
        ),
        if (trailingIcon != null && !isLoading) ...[
          const SizedBox(width: 8),
          Icon(trailingIcon, size: iconSize, color: foregroundColor),
        ],
      ],
    );

    // Wrap with Semantics for accessibility
    return Semantics(
      label: semanticLabel ?? label,
      button: true,
      enabled: enabled,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: enabled ? 1.0 : 0.5,
        child: Container(
          decoration: BoxDecoration(
            gradient: gradient,
            color: gradient == null ? backgroundColor : null,
            borderRadius: BorderRadius.circular(12),
            border: borderColor != null
                ? Border.all(color: borderColor, width: 1)
                : null,
            boxShadow: _getBoxShadow(isDark),
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: enabled
                  ? () {
                      HapticFeedback.lightImpact();
                      onPressed!();
                    }
                  : null,
              borderRadius: BorderRadius.circular(12),
              // Ensure minimum 48dp touch target
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Padding(
                  padding: buttonPadding,
                  child: buttonContent,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  bool _shouldUppercase() {
    return variant == IrisButtonVariant.gold ||
        variant == IrisButtonVariant.platinum ||
        variant == IrisButtonVariant.emerald ||
        variant == IrisButtonVariant.primary;
  }

  FontWeight _getFontWeight() {
    switch (variant) {
      case IrisButtonVariant.gold:
      case IrisButtonVariant.platinum:
      case IrisButtonVariant.emerald:
      case IrisButtonVariant.primary:
        return FontWeight.w600;
      default:
        return FontWeight.w500;
    }
  }

  double _getLetterSpacing() {
    if (_shouldUppercase()) {
      return size == IrisButtonSize.large ? 1.5 : 1.0;
    }
    return 0.3;
  }

  List<BoxShadow>? _getBoxShadow(bool isDark) {
    switch (variant) {
      case IrisButtonVariant.primary:
        // Primary uses champagne gold glow
        return [
          BoxShadow(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ];
      case IrisButtonVariant.gold:
        return [
          BoxShadow(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ];
      case IrisButtonVariant.platinum:
        return [
          BoxShadow(
            color: LuxuryColors.platinum.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ];
      case IrisButtonVariant.emerald:
        return [
          BoxShadow(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ];
      case IrisButtonVariant.danger:
        return [
          BoxShadow(
            color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ];
      default:
        return null;
    }
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case IrisButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: 14, vertical: 10);
      case IrisButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: 20, vertical: 14);
      case IrisButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: 28, vertical: 18);
    }
  }

  double _getFontSize() {
    switch (size) {
      case IrisButtonSize.small:
        return 11;
      case IrisButtonSize.medium:
        return 13;
      case IrisButtonSize.large:
        return 14;
    }
  }

  double _getIconSize() {
    switch (size) {
      case IrisButtonSize.small:
        return 16;
      case IrisButtonSize.medium:
        return 18;
      case IrisButtonSize.large:
        return 20;
    }
  }

  Map<String, dynamic> _getColors(bool isDark) {
    switch (variant) {
      case IrisButtonVariant.primary:
        // Primary uses champagne gold for interactive elements
        return {
          'background': Colors.transparent,
          'foreground': LuxuryColors.diamond,
          'border': null,
          'gradient': LuxuryColors.goldShimmer,
        };
      case IrisButtonVariant.gold:
        return {
          'background': Colors.transparent,
          'foreground': LuxuryColors.richBlack,
          'border': null,
          'gradient': LuxuryColors.goldShimmer,
        };
      case IrisButtonVariant.platinum:
        return {
          'background': Colors.transparent,
          'foreground': LuxuryColors.richBlack,
          'border': null,
          'gradient': LuxuryColors.platinumShimmer,
        };
      case IrisButtonVariant.emerald:
        return {
          'background': Colors.transparent,
          'foreground': LuxuryColors.diamond,
          'border': null,
          'gradient': LuxuryColors.goldShimmer,
        };
      case IrisButtonVariant.secondary:
        return {
          'background': isDark ? LuxuryColors.obsidian : Colors.white,
          'foreground': isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          'border': isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
              : LuxuryColors.champagneGold.withValues(alpha: 0.15),
          'gradient': null,
        };
      case IrisButtonVariant.outline:
        // Outline uses champagne gold for interactive elements
        return {
          'background': Colors.transparent,
          'foreground': LuxuryColors.champagneGold,
          'border': LuxuryColors.champagneGold.withValues(alpha: 0.5),
          'gradient': null,
        };
      case IrisButtonVariant.ghost:
        return {
          'background': Colors.transparent,
          'foreground': isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          'border': null,
          'gradient': null,
        };
      case IrisButtonVariant.danger:
        return {
          'background': LuxuryColors.errorRuby,
          'foreground': Colors.white,
          'border': null,
          'gradient': null,
        };
    }
  }
}

/// Luxury icon button with minimum 48dp touch target
class IrisIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? color;
  final Color? backgroundColor;
  final double size;
  final String? tooltip;
  final String? semanticLabel;
  final LuxuryTier tier;

  const IrisIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.color,
    this.backgroundColor,
    this.size = 48, // Minimum 48dp for accessibility
    this.tooltip,
    this.semanticLabel,
    this.tier = LuxuryTier.gold,
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accentColor = _getAccentColor();

    final iconColor = color ?? accentColor;
    final bgColor = backgroundColor ??
        (isDark ? LuxuryColors.obsidian : Colors.white);

    // Ensure minimum 48dp touch target
    final effectiveSize = size < 48 ? 48.0 : size;

    Widget button = Semantics(
      label: semanticLabel ?? tooltip,
      button: true,
      enabled: onPressed != null,
      child: Container(
        width: effectiveSize,
        height: effectiveSize,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(effectiveSize / 4),
          border: Border.all(
            color: accentColor.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(effectiveSize / 4),
          child: InkWell(
            onTap: onPressed != null
                ? () {
                    HapticFeedback.lightImpact();
                    onPressed!();
                  }
                : null,
            borderRadius: BorderRadius.circular(effectiveSize / 4),
            child: Center(
              child: Icon(
                icon,
                size: effectiveSize * 0.5,
                color: iconColor,
              ),
            ),
          ),
        ),
      ),
    );

    if (tooltip != null) {
      button = Tooltip(
        message: tooltip!,
        child: button,
      );
    }

    return button;
  }
}

/// Premium gradient button with shimmer effect
class LuxuryGradientButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final LuxuryTier tier;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;

  const LuxuryGradientButton({
    super.key,
    required this.label,
    this.onPressed,
    this.tier = LuxuryTier.gold,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
  });

  @override
  State<LuxuryGradientButton> createState() => _LuxuryGradientButtonState();
}

class _LuxuryGradientButtonState extends State<LuxuryGradientButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _shimmerAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _shimmerAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  LinearGradient _getGradient() {
    switch (widget.tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
        return LuxuryColors.goldShimmer;
      case LuxuryTier.platinum:
        return LuxuryColors.platinumShimmer;
      case LuxuryTier.royal:
        return LuxuryColors.royalGradient;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGoldGradient;
      case LuxuryTier.diamond:
        return LuxuryColors.platinumShimmer;
    }
  }

  Color _getForegroundColor() {
    switch (widget.tier) {
      case LuxuryTier.royal:
      case LuxuryTier.emerald:
      case LuxuryTier.gold:
        return LuxuryColors.diamond;
      default:
        return LuxuryColors.richBlack;
    }
  }

  Color _getAccentColor() {
    switch (widget.tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.royal:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      case LuxuryTier.diamond:
        return LuxuryColors.coolGray;
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = !widget.isLoading && widget.onPressed != null;
    final foregroundColor = _getForegroundColor();
    final accentColor = _getAccentColor();

    return AnimatedBuilder(
      animation: _shimmerAnimation,
      builder: (context, child) {
        return Semantics(
          label: widget.label,
          button: true,
          enabled: enabled,
          child: GestureDetector(
            onTap: enabled
                ? () {
                    HapticFeedback.mediumImpact();
                    widget.onPressed!();
                  }
                : null,
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: enabled ? 1.0 : 0.5,
              child: Container(
                width: widget.isFullWidth ? double.infinity : null,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                decoration: BoxDecoration(
                  gradient: _getGradient(),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: accentColor.withValues(
                      alpha: 0.3 + (_shimmerAnimation.value * 0.2),
                    ),
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: accentColor.withValues(
                        alpha: 0.2 + (_shimmerAnimation.value * 0.15),
                      ),
                      blurRadius: 16 + (_shimmerAnimation.value * 8),
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (widget.isLoading) ...[
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ] else if (widget.icon != null) ...[
                      Icon(widget.icon, size: 18, color: foregroundColor),
                      const SizedBox(width: 10),
                    ],
                    Text(
                      widget.label.toUpperCase(),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                        color: foregroundColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
