import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// App bar variants for different luxury styles
enum IrisAppBarVariant {
  standard, // Clean minimal style
  premium, // With subtle gold accent
  transparent, // Floating transparent
  elevated, // With shadow
}

/// Luxury app bar with IRIS premium design
/// Inspired by high-end brand aesthetics
class IrisAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showBackButton;
  final bool centerTitle;
  final Color? backgroundColor;
  final double elevation;
  final VoidCallback? onBackPressed;
  final IrisAppBarVariant variant;
  final LuxuryTier tier;

  const IrisAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.actions,
    this.leading,
    this.showBackButton = false,
    this.centerTitle = false,
    this.backgroundColor,
    this.elevation = 0,
    this.onBackPressed,
    this.variant = IrisAppBarVariant.standard,
    this.tier = LuxuryTier.gold,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

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

    Color bgColor;
    double effectiveElevation = elevation;
    Border? bottomBorder;

    switch (variant) {
      case IrisAppBarVariant.premium:
        bgColor = backgroundColor ??
            (isDark ? LuxuryColors.obsidian : Colors.white);
        bottomBorder = Border(
          bottom: BorderSide(
            color: accentColor.withValues(alpha: 0.15),
            width: 1,
          ),
        );
        break;
      case IrisAppBarVariant.transparent:
        bgColor = Colors.transparent;
        effectiveElevation = 0;
        break;
      case IrisAppBarVariant.elevated:
        bgColor = backgroundColor ??
            (isDark ? LuxuryColors.obsidian : Colors.white);
        effectiveElevation = 4;
        break;
      case IrisAppBarVariant.standard:
        bgColor = backgroundColor ??
            (isDark ? LuxuryColors.richBlack : Colors.white);
        bottomBorder = Border(
          bottom: BorderSide(
            color: isDark
                ? LuxuryColors.champagneGold.withValues(alpha: 0.08)
                : LuxuryColors.champagneGold.withValues(alpha: 0.05),
            width: 1,
          ),
        );
    }

    Widget? leadingWidget;
    if (showBackButton) {
      leadingWidget = _LuxuryBackButton(
        onPressed: () {
          HapticFeedback.lightImpact();
          if (onBackPressed != null) {
            onBackPressed!();
          } else {
            Navigator.of(context).pop();
          }
        },
        accentColor: accentColor,
        isDark: isDark,
      );
    } else {
      leadingWidget = leading;
    }

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        border: bottomBorder,
        boxShadow: effectiveElevation > 0
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: effectiveElevation * 2,
                  offset: Offset(0, effectiveElevation / 2),
                ),
              ]
            : null,
      ),
      child: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: centerTitle,
        leading: leadingWidget,
        title: titleWidget ??
            (title != null
                ? Text(
                    title!,
                    style: IrisTheme.titleLarge.copyWith(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.3,
                    ),
                  )
                : null),
        actions: actions,
        systemOverlayStyle: isDark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
      ),
    );
  }
}

/// Premium back button with luxury styling
class _LuxuryBackButton extends StatelessWidget {
  final VoidCallback onPressed;
  final Color accentColor;
  final bool isDark;

  const _LuxuryBackButton({
    required this.onPressed,
    required this.accentColor,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: accentColor.withValues(alpha: 0.15),
                width: 1,
              ),
            ),
            child: Icon(
              Icons.arrow_back_ios_new,
              size: 18,
              color: accentColor,
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury sliver app bar for scrollable content
class IrisSliverAppBar extends StatelessWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? flexibleSpace;
  final double expandedHeight;
  final bool pinned;
  final bool floating;
  final LuxuryTier tier;
  final LinearGradient? backgroundGradient;

  const IrisSliverAppBar({
    super.key,
    required this.title,
    this.actions,
    this.flexibleSpace,
    this.expandedHeight = 140,
    this.pinned = true,
    this.floating = false,
    this.tier = LuxuryTier.gold,
    this.backgroundGradient,
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

    Widget? background = flexibleSpace;
    if (backgroundGradient != null) {
      background = Container(
        decoration: BoxDecoration(
          gradient: backgroundGradient,
        ),
        child: flexibleSpace,
      );
    }

    return SliverAppBar(
      expandedHeight: expandedHeight,
      pinned: pinned,
      floating: floating,
      backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          title,
          style: IrisTheme.titleLarge.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.3,
          ),
        ),
        titlePadding: const EdgeInsets.only(left: 20, bottom: 18),
        background: background ?? Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: isDark
                  ? [
                      LuxuryColors.richBlack,
                      LuxuryColors.obsidian,
                    ]
                  : [
                      Colors.white,
                      accentColor.withValues(alpha: 0.03),
                    ],
            ),
          ),
        ),
      ),
      actions: actions,
    );
  }
}

/// Luxury app bar action button
class IrisAppBarAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final LuxuryTier tier;
  final bool showBadge;
  final int? badgeCount;

  const IrisAppBarAction({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.tier = LuxuryTier.gold,
    this.showBadge = false,
    this.badgeCount,
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
    final accentColor = _getAccentColor();

    final button = IconButton(
      icon: Icon(
        icon,
        size: 22,
        color: accentColor,
      ),
      onPressed: onPressed != null
          ? () {
              HapticFeedback.lightImpact();
              onPressed!();
            }
          : null,
      tooltip: tooltip,
    );

    // Always use Stack to maintain stable widget tree structure
    // Use Clip.hardEdge instead of Clip.none to prevent semantics parent data dirty errors
    // Use AnimatedOpacity instead of conditional rendering for badge to keep tree stable
    return RepaintBoundary(
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          button,
          Positioned(
            right: 8,
            top: 8,
            child: IgnorePointer(
              ignoring: !showBadge,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 200),
                opacity: showBadge ? 1.0 : 0.0,
                child: Container(
                  padding: EdgeInsets.all(badgeCount != null ? 4 : 5),
                  decoration: BoxDecoration(
                    color: LuxuryColors.errorRuby,
                    shape: badgeCount != null ? BoxShape.rectangle : BoxShape.circle,
                    borderRadius:
                        badgeCount != null ? BorderRadius.circular(8) : null,
                    border: Border.all(
                      color: Colors.white,
                      width: 1.5,
                    ),
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: badgeCount != null
                      ? Text(
                          badgeCount! > 99 ? '99+' : '$badgeCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                          textAlign: TextAlign.center,
                        )
                      : null,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
