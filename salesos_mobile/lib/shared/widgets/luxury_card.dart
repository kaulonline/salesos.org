import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// SalesOS Design System — Brand-Aligned Color Palette
///
/// Design Principles (matching website):
/// - Clean, warm, modern SaaS aesthetic
/// - Warm beige background (#F2F1EA), white cards, gold accent (#EAD07D)
/// - Dark buttons (#1A1A1A), subtle shadows
/// - Generous whitespace and refined typography

/// Brand-aligned color palette
class LuxuryColors {
  // ═══════════════════════════════════════════════════════════════
  // PRIMARY BRAND PALETTE — aligned to SalesOS website
  // ═══════════════════════════════════════════════════════════════

  // Gold Collection — website primary accent #EAD07D
  static const Color champagneGold = Color(0xFFEAD07D);
  static const Color champagneGoldDark = Color(0xFFD4B85C);
  static const Color champagneGoldLight = Color(0xFFF0E5B8);
  static const Color antiqueGold = Color(0xFFD4B85C);
  static const Color roseGold = Color(0xFFB76E79);
  static const Color warmGold = Color(0xFFEAD07D);
  static const Color lightGold = Color(0xFFF0E5B8);

  // Platinum Collection - Exclusive tier
  static const Color platinum = Color(0xFFE5E4E2);
  static const Color silverPlatinum = Color(0xFFD4D4D8);
  static const Color coolPlatinum = Color(0xFFBFC0C5);

  // Diamond/Crystal Collection - Ultra premium
  static const Color diamond = Color(0xFFF5F5F5);
  static const Color crystalWhite = Color(0xFFFAFAFA);
  static const Color pearlWhite = Color(0xFFF8F6F0);

  // ═══════════════════════════════════════════════════════════════
  // DEEP TONES - Dark backgrounds
  // ═══════════════════════════════════════════════════════════════

  static const Color richBlack = Color(0xFF0D0D0D);
  static const Color obsidian = Color(0xFF1A1A1A);
  static const Color onyx = Color(0xFF121212);
  static const Color deepNavy = Color(0xFF0D1B2A);
  static const Color midnightBlue = Color(0xFF1B263B);
  static const Color royalNavy = Color(0xFF1A1F3D);

  // ═══════════════════════════════════════════════════════════════
  // LEGACY GREEN ALIASES — remapped to gold for brand alignment
  // These constants are kept so 181+ files don't break, but now return gold
  // ═══════════════════════════════════════════════════════════════

  static const Color rolexGreen = Color(0xFFEAD07D);      // → champagneGold
  static const Color deepEmerald = Color(0xFFD4B85C);     // → champagneGoldDark
  static const Color jadePremium = Color(0xFFEAD07D);     // → champagneGold

  // ═══════════════════════════════════════════════════════════════
  // NEUTRAL TONES — website-aligned
  // ═══════════════════════════════════════════════════════════════

  static const Color ivory = Color(0xFFFFFFF0);
  static const Color cream = Color(0xFFF2F1EA);       // Website background
  static const Color champagne = Color(0xFFF0E5B8);
  static const Color warmGray = Color(0xFF999999);    // Website muted text
  static const Color coolGray = Color(0xFF666666);    // Website body text

  // ═══════════════════════════════════════════════════════════════
  // TEXT COLORS - Refined typography
  // ═══════════════════════════════════════════════════════════════

  static const Color textOnDark = Color(0xFFF5F5F5);
  static const Color textOnLight = Color(0xFF1A1A1A);
  static const Color textMuted = Color(0xFF666666);    // Website body text #666
  static const Color textGold = Color(0xFFEAD07D);     // Website gold accent
  static const Color textPlatinum = Color(0xFFD4D4D8);

  // ═══════════════════════════════════════════════════════════════
  // STATUS COLORS - Premium status indicators
  // ═══════════════════════════════════════════════════════════════

  static const Color successGreen = Color(0xFF93C01F);   // Website success
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color errorRuby = Color(0xFFEF4444);     // Website red-500
  static const Color infoCobalt = Color(0xFF3B82F6);

  // ═══════════════════════════════════════════════════════════════
  // CAMPAIGN TYPE COLORS - Marketing channels
  // ═══════════════════════════════════════════════════════════════

  static const Color emailBlue = Color(0xFF3B82F6);
  static const Color socialPurple = Color(0xFF8B5CF6);
  static const Color webinarPink = Color(0xFFEC4899);
  static const Color eventOrange = Color(0xFFF59E0B);
  static const Color advertisingGreen = Color(0xFF10B981);
  static const Color referralIndigo = Color(0xFF6366F1);

  // ═══════════════════════════════════════════════════════════════
  // UI ACCENT COLORS - Additional semantic colors
  // ═══════════════════════════════════════════════════════════════

  static const Color neutralGray = Color(0xFF8E8E93);
  static const Color tealAccent = Color(0xFF008080);
  static const Color linkBlue = Color(0xFF0066CC);
  static const Color cancelledRed = Color(0xFF7A4440);
  static const Color cancelledRedDark = Color(0xFF592E2A);

  // Dark theme sidebar colors
  static const Color sidebarDark = Color(0xFF1A1D21);
  static const Color sidebarDarkHover = Color(0xFF2A2D32);
  static const Color sidebarDarkActive = Color(0xFF3A3D42);
  static const Color sidebarDarkBorder = Color(0xFF252830);
  static const Color sidebarSubtleHover = Color(0xFF222529);

  // ═══════════════════════════════════════════════════════════════
  // BRAND COLORS - Third-party service colors
  // ═══════════════════════════════════════════════════════════════

  static const Color googleMeetTeal = Color(0xFF00897B);
  static const Color zoomBlue = Color(0xFF2D8CFF);
  static const Color faceTimeGreen = Color(0xFF34C759);
  static const Color salesforceBlue = Color(0xFF00A1E0);

  // ═══════════════════════════════════════════════════════════════
  // GRADIENTS - Premium gradient presets
  // ═══════════════════════════════════════════════════════════════

  static const LinearGradient goldShimmer = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [champagneGoldLight, champagneGold, champagneGoldDark],
  );

  static const LinearGradient platinumShimmer = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [diamond, platinum, silverPlatinum],
  );

  static const LinearGradient royalGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [deepNavy, midnightBlue, royalNavy],
  );

  /// Legacy alias — now identical to goldShimmer
  static const LinearGradient emeraldGradient = goldShimmer;

  static const LinearGradient roseGoldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFEDC9AF), roseGold, Color(0xFF9E6B6B)],
  );
}

/// Premium card tier for different levels of luxury
enum LuxuryTier {
  gold,      // Standard premium - warm gold accents (default)
  platinum,  // Elite tier - cool platinum accents
  diamond,   // Ultra exclusive - crystalline accents
  royal,     // VIP tier - deep navy with gold
  emerald,   // Legacy — now maps to gold for brand alignment
  roseGold,  // Elegant feminine - rose gold accents
}

/// Luxury card variants for different visual styles
enum LuxuryCardVariant {
  standard,    // Clean, minimal
  elevated,    // Subtle gradient background
  accent,      // Top accent line
  premium,     // Corner dot accent
  bordered,    // Elegant thin border all around
  glassmorphic, // Frosted glass effect
  embossed,    // Subtle embossed effect
}

/// Legacy texture overlay — now a passthrough (texture removed for clean website aesthetic)
class LuxuryTextureOverlay extends StatelessWidget {
  final Widget child;
  final double opacity;
  final bool enabled;

  const LuxuryTextureOverlay({
    super.key,
    required this.child,
    this.opacity = 0.025,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return child;
  }
}

/// Luxury card with refined, understated elegance
class LuxuryCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? accentColor;
  final bool showAccentBorder;
  final double borderRadius;
  final LuxuryCardVariant variant;
  final LuxuryTier tier;
  final VoidCallback? onTap;
  final bool enableAnimation;
  final bool showTexture; // Legacy texture option (now disabled)
  final double textureOpacity;
  final String? semanticLabel; // Accessibility label for screen readers

  const LuxuryCard({
    super.key,
    required this.child,
    this.padding,
    this.accentColor,
    this.showAccentBorder = true,
    this.borderRadius = 24,
    this.variant = LuxuryCardVariant.standard,
    this.tier = LuxuryTier.gold,
    this.onTap,
    this.enableAnimation = false,
    this.showTexture = false,
    this.textureOpacity = 0.08,
    this.semanticLabel,
  });

  Color _getAccentForTier(bool isDark) {
    switch (tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:  // emerald now maps to gold
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return accentColor ?? LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return accentColor ?? LuxuryColors.diamond;
      case LuxuryTier.royal:
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return accentColor ?? LuxuryColors.roseGold;
    }
  }

  Color _getBackgroundForTier(bool isDark) {
    if (tier == LuxuryTier.royal) {
      return isDark ? LuxuryColors.deepNavy : Colors.white;
    }
    return isDark ? LuxuryColors.obsidian : Colors.white;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveAccent = _getAccentForTier(isDark);
    final backgroundColor = _getBackgroundForTier(isDark);

    Widget cardContent = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: _buildVariant(isDark, effectiveAccent, backgroundColor),
    );

    // Apply texture overlay (legacy, now a passthrough)
    if (showTexture) {
      cardContent = LuxuryTextureOverlay(
        opacity: textureOpacity,
        child: cardContent,
      );
    }

    Widget card = Container(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: showAccentBorder
            ? Border.all(
                color: isDark
                    ? effectiveAccent.withValues(alpha: 0.2)
                    : Colors.black.withValues(alpha: 0.05),  // Website: border-black/5
                width: 1,
              )
            : null,
        boxShadow: [
          // Matches website shadow-sm: blur 4, offset (0,2), alpha 0.05
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
            spreadRadius: 0,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: cardContent,
      ),
    );

    if (onTap != null) {
      card = Semantics(
        label: semanticLabel,
        button: true,
        enabled: true,
        child: GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            onTap!();
          },
          child: card,
        ),
      );
    }

    return card;
  }

  Widget _buildVariant(bool isDark, Color accent, Color bgColor) {
    switch (variant) {
      case LuxuryCardVariant.standard:
        return Padding(
          padding: padding ?? const EdgeInsets.all(20),
          child: child,
        );

      case LuxuryCardVariant.elevated:
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [
                      LuxuryColors.obsidian,
                      LuxuryColors.obsidian.withValues(alpha: 0.95),
                    ]
                  : [
                      Colors.white,
                      LuxuryColors.cream.withValues(alpha: 0.3),
                    ],
            ),
          ),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(20),
            child: child,
          ),
        );

      case LuxuryCardVariant.accent:
        return Stack(
          children: [
            // Subtle accent gradient at top
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      accent.withValues(alpha: 0.9),
                      accent.withValues(alpha: 0.5),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: padding ?? const EdgeInsets.all(20),
              child: child,
            ),
          ],
        );

      case LuxuryCardVariant.premium:
        return Stack(
          children: [
            // Corner accent dot
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.5),
                      blurRadius: 6,
                      spreadRadius: 1,
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: padding ?? const EdgeInsets.all(20),
              child: child,
            ),
          ],
        );

      case LuxuryCardVariant.bordered:
        return Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: accent.withValues(alpha: 0.4),
              width: 1.5,
            ),
            borderRadius: BorderRadius.circular(borderRadius - 1),
          ),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(20),
            child: child,
          ),
        );

      case LuxuryCardVariant.glassmorphic:
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [
                      Colors.white.withValues(alpha: 0.08),
                      Colors.white.withValues(alpha: 0.03),
                    ]
                  : [
                      Colors.white.withValues(alpha: 0.9),
                      Colors.white.withValues(alpha: 0.7),
                    ],
            ),
          ),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(20),
            child: child,
          ),
        );

      case LuxuryCardVariant.embossed:
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: isDark
                  ? [
                      bgColor.withValues(alpha: 1),
                      Color.lerp(bgColor, Colors.black, 0.1)!,
                    ]
                  : [
                      Colors.white,
                      Color.lerp(Colors.white, LuxuryColors.cream, 0.3)!,
                    ],
            ),
          ),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(20),
            child: child,
          ),
        );
    }
  }
}

/// Animated luxury card with subtle shimmer effect
class AnimatedLuxuryCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final LuxuryTier tier;
  final LuxuryCardVariant variant;
  final double borderRadius;
  final VoidCallback? onTap;
  final bool showTexture;
  final double textureOpacity;

  const AnimatedLuxuryCard({
    super.key,
    required this.child,
    this.padding,
    this.tier = LuxuryTier.gold,
    this.variant = LuxuryCardVariant.standard,
    this.borderRadius = 24,
    this.onTap,
    this.showTexture = false,
    this.textureOpacity = 0.02,
  });

  @override
  State<AnimatedLuxuryCard> createState() => _AnimatedLuxuryCardState();
}

class _AnimatedLuxuryCardState extends State<AnimatedLuxuryCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _shimmerAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    )..repeat(reverse: true);

    _shimmerAnimation = Tween<double>(begin: 0.15, end: 0.35).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color accentColor;
    switch (widget.tier) {
      case LuxuryTier.gold:
      case LuxuryTier.emerald:  // emerald now maps to gold
        accentColor = LuxuryColors.champagneGold;
        break;
      case LuxuryTier.platinum:
        accentColor = LuxuryColors.platinum;
        break;
      case LuxuryTier.diamond:
        accentColor = LuxuryColors.diamond;
        break;
      case LuxuryTier.royal:
        accentColor = LuxuryColors.champagneGold;
        break;
      case LuxuryTier.roseGold:
        accentColor = LuxuryColors.roseGold;
        break;
    }

    return AnimatedBuilder(
      animation: _shimmerAnimation,
      builder: (context, child) {
        Widget content = Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.onTap != null
                ? () {
                    HapticFeedback.lightImpact();
                    widget.onTap!();
                  }
                : null,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            child: Padding(
              padding: widget.padding ?? const EdgeInsets.all(20),
              child: widget.child,
            ),
          ),
        );

        // Apply texture overlay
        if (widget.showTexture) {
          content = LuxuryTextureOverlay(
            opacity: widget.textureOpacity,
            child: content,
          );
        }

        return Container(
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: accentColor.withValues(alpha: _shimmerAnimation.value),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: accentColor.withValues(alpha: _shimmerAnimation.value * 0.3),
                blurRadius: 25,
                spreadRadius: -5,
              ),
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.4)
                    : Colors.black.withValues(alpha: 0.06),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            child: content,
          ),
        );
      },
    );
  }
}

/// Luxury section header with elegant typography
class LuxurySectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Color? accentColor;
  final LuxuryTier tier;
  final bool showAccent;

  const LuxurySectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    this.accentColor,
    this.tier = LuxuryTier.gold,
    this.showAccent = true,
  });

  Color _getAccentForTier() {
    switch (tier) {
      case LuxuryTier.gold:
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return accentColor ?? LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return accentColor ?? LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return accentColor ?? LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = _getAccentForTier();

    return Row(
      children: [
        // Subtle accent line
        if (showAccent) ...[
          Container(
            width: 3,
            height: 24,
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(2),
              boxShadow: [
                BoxShadow(
                  color: accent.withValues(alpha: 0.3),
                  blurRadius: 4,
                  spreadRadius: 0,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title.toUpperCase(),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.5,
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: LuxuryColors.textMuted,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}

/// Luxury divider with optional accent
class LuxuryDivider extends StatelessWidget {
  final Color? color;
  final double thickness;
  final double indent;
  final double endIndent;
  final LuxuryTier tier;

  const LuxuryDivider({
    super.key,
    this.color,
    this.thickness = 0.5,
    this.indent = 0,
    this.endIndent = 0,
    this.tier = LuxuryTier.gold,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: thickness,
      margin: EdgeInsets.only(left: indent, right: endIndent),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.transparent,
            (color ?? (isDark ? Colors.white12 : Colors.black12)),
            (color ?? (isDark ? Colors.white12 : Colors.black12)),
            Colors.transparent,
          ],
          stops: const [0.0, 0.2, 0.8, 1.0],
        ),
      ),
    );
  }
}

/// Luxury badge/chip with refined styling
class LuxuryBadge extends StatelessWidget {
  final String text;
  final Color? color;
  final bool outlined;
  final LuxuryTier tier;

  const LuxuryBadge({
    super.key,
    required this.text,
    this.color,
    this.outlined = false,
    this.tier = LuxuryTier.gold,
  });

  Color _getColorForTier() {
    switch (tier) {
      case LuxuryTier.gold:
        return color ?? LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return color ?? LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return color ?? LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return color ?? LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return color ?? LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return color ?? LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final effectiveColor = _getColorForTier();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : effectiveColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: effectiveColor.withValues(alpha: outlined ? 0.5 : 0.3),
          width: 1,
        ),
      ),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.0,
          color: effectiveColor,
        ),
      ),
    );
  }
}

/// Luxury metric display - clean, elegant number presentation
class LuxuryMetric extends StatelessWidget {
  final String value;
  final String label;
  final Color? accentColor;
  final bool large;
  final LuxuryTier tier;
  final String? prefix;
  final String? suffix;

  const LuxuryMetric({
    super.key,
    required this.value,
    required this.label,
    this.accentColor,
    this.large = false,
    this.tier = LuxuryTier.gold,
    this.prefix,
    this.suffix,
  });

  Color _getAccentForTier() {
    switch (tier) {
      case LuxuryTier.gold:
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return accentColor ?? LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return accentColor ?? LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return accentColor ?? LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return accentColor ?? LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = _getAccentForTier();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (prefix != null)
              Text(
                prefix!,
                style: TextStyle(
                  fontSize: large ? 18 : 14,
                  fontWeight: FontWeight.w300,
                  color: accent,
                ),
              ),
            Text(
              value,
              style: TextStyle(
                fontSize: large ? 36 : 28,
                fontWeight: FontWeight.w300,
                letterSpacing: -0.5,
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
              ),
            ),
            if (suffix != null)
              Text(
                suffix!,
                style: TextStyle(
                  fontSize: large ? 18 : 14,
                  fontWeight: FontWeight.w300,
                  color: accent,
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 1.2,
            color: accent,
          ),
        ),
      ],
    );
  }
}

/// Luxury icon button with refined styling
class LuxuryIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final double size;
  final LuxuryTier tier;
  final bool filled;
  final String? semanticLabel; // Accessibility label for screen readers

  const LuxuryIconButton({
    super.key,
    required this.icon,
    this.onTap,
    this.size = 40,
    this.tier = LuxuryTier.gold,
    this.filled = false,
    this.semanticLabel,
  });

  Color _getColorForTier() {
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

  // Minimum touch target size for accessibility (48dp)
  static const double _minTouchTarget = 48.0;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _getColorForTier();

    Widget button = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: filled
            ? color.withValues(alpha: 0.15)
            : (isDark ? LuxuryColors.obsidian : Colors.white),
        borderRadius: BorderRadius.circular(size / 4),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Center(
        child: Icon(
          icon,
          size: size * 0.5,
          color: color,
        ),
      ),
    );

    // Ensure minimum touch target of 48dp for accessibility
    final effectiveSize = size < _minTouchTarget ? _minTouchTarget : size;

    return Semantics(
      label: semanticLabel,
      button: true,
      enabled: onTap != null,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap != null
            ? () {
                HapticFeedback.lightImpact();
                onTap!();
              }
            : null,
        child: SizedBox(
          width: effectiveSize,
          height: effectiveSize,
          child: Center(child: button),
        ),
      ),
    );
  }
}

/// Luxury progress indicator
class LuxuryProgress extends StatelessWidget {
  final double value; // 0.0 to 1.0
  final Color? color;
  final double height;
  final LuxuryTier tier;

  const LuxuryProgress({
    super.key,
    required this.value,
    this.color,
    this.height = 4,
    this.tier = LuxuryTier.gold,
  });

  Color _getColorForTier() {
    switch (tier) {
      case LuxuryTier.gold:
        return color ?? LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return color ?? LuxuryColors.platinum;
      case LuxuryTier.diamond:
        return color ?? LuxuryColors.coolGray;
      case LuxuryTier.royal:
        return color ?? LuxuryColors.champagneGold;
      case LuxuryTier.emerald:
        return color ?? LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return color ?? LuxuryColors.roseGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progressColor = _getColorForTier();

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(height / 2),
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: value.clamp(0.0, 1.0),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                progressColor.withValues(alpha: 0.7),
                progressColor,
              ],
            ),
            borderRadius: BorderRadius.circular(height / 2),
            boxShadow: [
              BoxShadow(
                color: progressColor.withValues(alpha: 0.3),
                blurRadius: 4,
                spreadRadius: 0,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Luxury avatar with elegant border
class LuxuryAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? initials;
  final double size;
  final LuxuryTier tier;

  const LuxuryAvatar({
    super.key,
    this.imageUrl,
    this.initials,
    this.size = 48,
    this.tier = LuxuryTier.gold,
  });

  Color _getColorForTier() {
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
    final color = _getColorForTier();

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: color.withValues(alpha: 0.5),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.2),
            blurRadius: 8,
            spreadRadius: 0,
          ),
        ],
      ),
      child: ClipOval(
        child: imageUrl != null
            ? Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => _buildInitials(isDark, color),
              )
            : _buildInitials(isDark, color),
      ),
    );
  }

  Widget _buildInitials(bool isDark, Color color) {
    return Container(
      color: color.withValues(alpha: 0.15),
      child: Center(
        child: Text(
          initials ?? '?',
          style: TextStyle(
            fontSize: size * 0.4,
            fontWeight: FontWeight.w500,
            letterSpacing: 1,
            color: color,
          ),
        ),
      ),
    );
  }
}

/// Luxury chip/tag for categories or status
class LuxuryChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  final bool selected;
  final LuxuryTier tier;
  final String? semanticLabel; // Accessibility label for screen readers

  const LuxuryChip({
    super.key,
    required this.label,
    this.icon,
    this.onTap,
    this.selected = false,
    this.tier = LuxuryTier.gold,
    this.semanticLabel,
  });

  Color _getColorForTier() {
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
    final color = _getColorForTier();

    Widget chip = AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: selected
            ? color.withValues(alpha: 0.2)
            : (isDark ? LuxuryColors.obsidian : Colors.white),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: selected ? color : color.withValues(alpha: 0.3),
          width: selected ? 1.5 : 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 14,
              color: selected
                  ? color
                  : (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              letterSpacing: 0.5,
              color: selected
                  ? color
                  : (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
            ),
          ),
        ],
      ),
    );

    return Semantics(
      label: semanticLabel ?? label,
      button: true,
      enabled: onTap != null,
      selected: selected,
      child: GestureDetector(
        onTap: onTap != null
            ? () {
                HapticFeedback.lightImpact();
                onTap!();
              }
            : null,
        child: chip,
      ),
    );
  }
}

/// Luxury list tile for settings and menus
class LuxuryListTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? leadingIcon;
  final Widget? trailing;
  final VoidCallback? onTap;
  final LuxuryTier tier;
  final String? semanticLabel; // Accessibility label for screen readers

  const LuxuryListTile({
    super.key,
    required this.title,
    this.subtitle,
    this.leadingIcon,
    this.trailing,
    this.onTap,
    this.tier = LuxuryTier.gold,
    this.semanticLabel,
  });

  Color _getColorForTier() {
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
    final color = _getColorForTier();

    Widget tile = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.08),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          if (leadingIcon != null) ...[
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Icon(
                  leadingIcon,
                  size: 20,
                  color: color,
                ),
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
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      fontSize: 13,
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null)
            trailing!
          else if (onTap != null)
            Icon(
              Icons.chevron_right,
              size: 20,
              color: color.withValues(alpha: 0.6),
            ),
        ],
      ),
    );

    return Semantics(
      label: semanticLabel ?? title,
      button: onTap != null,
      enabled: onTap != null,
      child: GestureDetector(
        onTap: onTap != null
            ? () {
                HapticFeedback.lightImpact();
                onTap!();
              }
            : null,
        child: tile,
      ),
    );
  }
}
