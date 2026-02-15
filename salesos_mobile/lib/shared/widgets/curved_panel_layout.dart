import 'package:flutter/material.dart';
import 'luxury_card.dart';

/// Curved panel layout inspired by Payoneer dashboard
/// Creates a split-panel design with curved intersection between panels
class CurvedPanelLayout extends StatelessWidget {
  final Widget leftPanel;
  final Widget rightPanel;
  final double curveDepth;
  final Color? leftPanelColor;
  final Gradient? leftPanelGradient;
  final Color? rightPanelColor;
  final double leftPanelWidth;

  const CurvedPanelLayout({
    super.key,
    required this.leftPanel,
    required this.rightPanel,
    this.curveDepth = 40,
    this.leftPanelColor,
    this.leftPanelGradient,
    this.rightPanelColor,
    this.leftPanelWidth = 0.38, // 38% of screen width
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final leftWidth = screenWidth * leftPanelWidth;

    final effectiveLeftGradient = leftPanelGradient ??
        LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark
              ? [
                  const Color(0xFF2D2A28),
                  const Color(0xFF1F1D1B),
                ]
              : [
                  const Color(0xFFFAF5F2), // Light cream
                  const Color(0xFFF5EBE6), // Warm cream
                  const Color(0xFFEFE0D8), // Coral tint
                ],
        );

    final effectiveRightColor = rightPanelColor ??
        (isDark ? LuxuryColors.richBlack : Colors.white);

    return Stack(
      children: [
        // Right panel (background)
        Positioned.fill(
          child: Container(
            color: effectiveRightColor,
          ),
        ),

        // Left panel with curved edge
        Positioned(
          left: 0,
          top: 0,
          bottom: 0,
          width: leftWidth + curveDepth,
          child: ClipPath(
            clipper: _CurvedRightEdgeClipper(curveDepth: curveDepth),
            child: Container(
              decoration: BoxDecoration(
                color: leftPanelColor,
                gradient: leftPanelColor == null ? effectiveLeftGradient : null,
              ),
              child: Padding(
                padding: EdgeInsets.only(right: curveDepth),
                child: leftPanel,
              ),
            ),
          ),
        ),

        // Right panel content
        Positioned(
          left: leftWidth,
          top: 0,
          bottom: 0,
          right: 0,
          child: rightPanel,
        ),
      ],
    );
  }
}

/// Custom clipper for curved right edge
class _CurvedRightEdgeClipper extends CustomClipper<Path> {
  final double curveDepth;

  _CurvedRightEdgeClipper({this.curveDepth = 40});

  @override
  Path getClip(Size size) {
    final path = Path();

    path.moveTo(0, 0);
    path.lineTo(size.width - curveDepth, 0);

    // Curved right edge - smooth S-curve
    path.quadraticBezierTo(
      size.width,
      size.height * 0.25,
      size.width - curveDepth * 0.5,
      size.height * 0.5,
    );
    path.quadraticBezierTo(
      size.width - curveDepth,
      size.height * 0.75,
      size.width - curveDepth,
      size.height,
    );

    path.lineTo(0, size.height);
    path.close();

    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Curved section container - wraps content in a curved container
/// Can be used for individual sections with curved edges
class CurvedSection extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final Gradient? gradient;
  final double borderRadius;
  final CurvedSectionStyle style;
  final List<BoxShadow>? shadows;

  const CurvedSection({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.gradient,
    this.borderRadius = 24,
    this.style = CurvedSectionStyle.standard,
    this.shadows,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final effectiveBgColor = backgroundColor ??
        (isDark ? LuxuryColors.obsidian : Colors.white);

    final defaultShadows = [
      BoxShadow(
        color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
        blurRadius: 20,
        offset: const Offset(0, 4),
        spreadRadius: -4,
      ),
    ];

    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: gradient == null ? effectiveBgColor : null,
        gradient: gradient,
        borderRadius: _getBorderRadius(),
        boxShadow: shadows ?? defaultShadows,
      ),
      child: ClipRRect(
        borderRadius: _getBorderRadius(),
        child: Padding(
          padding: padding ?? const EdgeInsets.all(20),
          child: child,
        ),
      ),
    );
  }

  BorderRadius _getBorderRadius() {
    switch (style) {
      case CurvedSectionStyle.standard:
        return BorderRadius.circular(borderRadius);
      case CurvedSectionStyle.topOnly:
        return BorderRadius.vertical(top: Radius.circular(borderRadius));
      case CurvedSectionStyle.bottomOnly:
        return BorderRadius.vertical(bottom: Radius.circular(borderRadius));
      case CurvedSectionStyle.leftOnly:
        return BorderRadius.horizontal(left: Radius.circular(borderRadius));
      case CurvedSectionStyle.rightOnly:
        return BorderRadius.horizontal(right: Radius.circular(borderRadius));
      case CurvedSectionStyle.topLeft:
        return BorderRadius.only(topLeft: Radius.circular(borderRadius));
      case CurvedSectionStyle.topRight:
        return BorderRadius.only(topRight: Radius.circular(borderRadius));
      case CurvedSectionStyle.bottomLeft:
        return BorderRadius.only(bottomLeft: Radius.circular(borderRadius));
      case CurvedSectionStyle.bottomRight:
        return BorderRadius.only(bottomRight: Radius.circular(borderRadius));
    }
  }
}

enum CurvedSectionStyle {
  standard,
  topOnly,
  bottomOnly,
  leftOnly,
  rightOnly,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}

/// Warm panel background - the left panel style from Payoneer
/// Creates a warm cream/coral gradient panel with decorative elements
class WarmCurvedPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final bool showDecorations;

  const WarmCurvedPanel({
    super.key,
    required this.child,
    this.padding,
    this.showDecorations = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        gradient: isDark
            ? const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFF2D2A28),
                  Color(0xFF1F1D1B),
                ],
              )
            : const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFFAF5F2), // Light cream
                  Color(0xFFF5EBE6), // Warm cream
                  Color(0xFFEFE0D8), // Coral tint
                ],
              ),
      ),
      child: Stack(
        children: [
          // Decorative circles
          if (showDecorations) ...[
            Positioned(
              top: -60,
              right: -40,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      (isDark ? Colors.white : const Color(0xFFE8C4B8))
                          .withValues(alpha: 0.15),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: -40,
              left: -30,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      (isDark ? Colors.white : const Color(0xFFD4A69A))
                          .withValues(alpha: 0.12),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ],
          // Content
          Padding(
            padding: padding ?? const EdgeInsets.all(20),
            child: child,
          ),
        ],
      ),
    );
  }
}

/// Curved card with wave edge - individual card with one curved side
class WaveEdgeCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? backgroundColor;
  final Gradient? gradient;
  final WaveEdgeSide waveSide;
  final double waveDepth;
  final double borderRadius;

  const WaveEdgeCard({
    super.key,
    required this.child,
    this.padding,
    this.backgroundColor,
    this.gradient,
    this.waveSide = WaveEdgeSide.right,
    this.waveDepth = 20,
    this.borderRadius = 20,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final effectiveBgColor = backgroundColor ??
        (isDark ? LuxuryColors.obsidian : Colors.white);

    return ClipPath(
      clipper: _WaveEdgeClipper(side: waveSide, depth: waveDepth),
      child: Container(
        decoration: BoxDecoration(
          color: gradient == null ? effectiveBgColor : null,
          gradient: gradient,
          borderRadius: BorderRadius.circular(borderRadius),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: padding ?? const EdgeInsets.all(20),
          child: child,
        ),
      ),
    );
  }
}

enum WaveEdgeSide { left, right, top, bottom }

class _WaveEdgeClipper extends CustomClipper<Path> {
  final WaveEdgeSide side;
  final double depth;

  _WaveEdgeClipper({this.side = WaveEdgeSide.right, this.depth = 20});

  @override
  Path getClip(Size size) {
    final path = Path();

    switch (side) {
      case WaveEdgeSide.right:
        path.moveTo(0, 0);
        path.lineTo(size.width - depth, 0);
        _addWaveCurve(path, size.width - depth, 0, size.width, size.height, true);
        path.lineTo(0, size.height);
        break;
      case WaveEdgeSide.left:
        path.moveTo(depth, 0);
        path.lineTo(size.width, 0);
        path.lineTo(size.width, size.height);
        path.lineTo(depth, size.height);
        _addWaveCurve(path, depth, size.height, 0, 0, false);
        break;
      case WaveEdgeSide.top:
        path.moveTo(0, depth);
        _addHorizontalWave(path, 0, depth, size.width, 0, true);
        path.lineTo(size.width, size.height);
        path.lineTo(0, size.height);
        break;
      case WaveEdgeSide.bottom:
        path.moveTo(0, 0);
        path.lineTo(size.width, 0);
        path.lineTo(size.width, size.height - depth);
        _addHorizontalWave(path, size.width, size.height - depth, 0, size.height, false);
        break;
    }

    path.close();
    return path;
  }

  void _addWaveCurve(Path path, double startX, double startY, double endX, double endY, bool forward) {
    final midY = (startY + endY) / 2;
    if (forward) {
      path.quadraticBezierTo(endX, startY + (endY - startY) * 0.25, startX + depth * 0.5, midY);
      path.quadraticBezierTo(startX, startY + (endY - startY) * 0.75, startX, endY);
    } else {
      path.quadraticBezierTo(startX - depth, startY - (startY - endY) * 0.25, startX - depth * 0.5, midY);
      path.quadraticBezierTo(startX, endY + (startY - endY) * 0.25, startX, endY);
    }
  }

  void _addHorizontalWave(Path path, double startX, double startY, double endX, double endY, bool forward) {
    final midX = (startX + endX) / 2;
    if (forward) {
      path.quadraticBezierTo(startX + (endX - startX) * 0.25, endY, midX, startY - depth * 0.5);
      path.quadraticBezierTo(startX + (endX - startX) * 0.75, startY, endX, startY);
    } else {
      path.quadraticBezierTo(startX - (startX - endX) * 0.25, endY, midX, startY + depth * 0.5);
      path.quadraticBezierTo(endX + (startX - endX) * 0.25, startY, endX, startY);
    }
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Scrollable curved section - for mobile layouts
/// Creates a vertically scrollable page with curved section headers
class CurvedScrollSection extends StatelessWidget {
  final String? title;
  final Widget child;
  final Color? headerColor;
  final Gradient? headerGradient;
  final double headerHeight;
  final double curveHeight;
  final Widget? headerContent;

  const CurvedScrollSection({
    super.key,
    this.title,
    required this.child,
    this.headerColor,
    this.headerGradient,
    this.headerHeight = 200,
    this.curveHeight = 30,
    this.headerContent,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final effectiveHeaderGradient = headerGradient ??
        LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF2D2A28),
                  const Color(0xFF1F1D1B),
                ]
              : [
                  const Color(0xFFE8C4B8),
                  const Color(0xFFD4A69A),
                  const Color(0xFFB8867A),
                ],
        );

    return Stack(
      children: [
        // Background
        Container(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
        ),

        // Curved header
        ClipPath(
          clipper: _CurvedBottomClipper(curveHeight: curveHeight),
          child: Container(
            height: headerHeight + curveHeight,
            decoration: BoxDecoration(
              color: headerColor,
              gradient: headerColor == null ? effectiveHeaderGradient : null,
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: headerContent ??
                    (title != null
                        ? Text(
                            title!,
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : Colors.white,
                              letterSpacing: -0.5,
                            ),
                          )
                        : const SizedBox.shrink()),
              ),
            ),
          ),
        ),

        // Content with top padding
        Positioned.fill(
          top: headerHeight,
          child: child,
        ),
      ],
    );
  }
}

class _CurvedBottomClipper extends CustomClipper<Path> {
  final double curveHeight;

  _CurvedBottomClipper({this.curveHeight = 30});

  @override
  Path getClip(Size size) {
    final path = Path();

    path.moveTo(0, 0);
    path.lineTo(0, size.height - curveHeight);

    // Smooth curve at bottom
    path.quadraticBezierTo(
      size.width * 0.5,
      size.height + curveHeight * 0.5,
      size.width,
      size.height - curveHeight,
    );

    path.lineTo(size.width, 0);
    path.close();

    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Floating curved card - card that appears to float with curved shadow
class FloatingCurvedCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final Gradient? gradient;
  final double borderRadius;
  final double elevation;
  final VoidCallback? onTap;

  const FloatingCurvedCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.gradient,
    this.borderRadius = 24,
    this.elevation = 8,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final effectiveBgColor = backgroundColor ??
        (isDark ? LuxuryColors.obsidian : Colors.white);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: margin ?? const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: gradient == null ? effectiveBgColor : null,
          gradient: gradient,
          borderRadius: BorderRadius.circular(borderRadius),
          boxShadow: [
            // Main shadow
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.08),
              blurRadius: elevation * 2,
              offset: Offset(0, elevation * 0.5),
              spreadRadius: -2,
            ),
            // Soft ambient shadow
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: elevation * 4,
              offset: Offset(0, elevation),
              spreadRadius: -4,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(borderRadius),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(20),
            child: child,
          ),
        ),
      ),
    );
  }
}
