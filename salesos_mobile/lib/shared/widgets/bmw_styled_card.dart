import 'package:flutter/material.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Premium card with fluorescent glowing borders
/// Clean, professional design with smooth rounded corners
class PremiumGlowCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? glowColor;
  final double borderRadius;

  const PremiumGlowCard({
    super.key,
    required this.child,
    this.padding,
    this.glowColor,
    this.borderRadius = 20,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveGlowColor = glowColor ?? LuxuryColors.champagneGold;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          // Outer fluorescent glow
          BoxShadow(
            color: effectiveGlowColor.withValues(alpha: 0.35),
            blurRadius: 16,
            spreadRadius: -2,
          ),
          // Subtle inner glow
          BoxShadow(
            color: effectiveGlowColor.withValues(alpha: 0.15),
            blurRadius: 6,
            spreadRadius: -1,
          ),
        ],
      ),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : Colors.white,
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(
            color: effectiveGlowColor.withValues(alpha: 0.4),
            width: 1.5,
          ),
        ),
        child: Padding(
          padding: padding ?? const EdgeInsets.all(20),
          child: child,
        ),
      ),
    );
  }
}

/// Animated version with pulsing glow effect
class AnimatedPremiumGlowCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? glowColor;
  final double borderRadius;

  const AnimatedPremiumGlowCard({
    super.key,
    required this.child,
    this.padding,
    this.glowColor,
    this.borderRadius = 20,
  });

  @override
  State<AnimatedPremiumGlowCard> createState() => _AnimatedPremiumGlowCardState();
}

class _AnimatedPremiumGlowCardState extends State<AnimatedPremiumGlowCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 2500),
      vsync: this,
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 0.25, end: 0.5).animate(
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
    final effectiveGlowColor = widget.glowColor ?? LuxuryColors.champagneGold;

    return AnimatedBuilder(
      animation: _glowAnimation,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            boxShadow: [
              // Animated outer fluorescent glow
              BoxShadow(
                color: effectiveGlowColor.withValues(alpha: _glowAnimation.value),
                blurRadius: 20,
                spreadRadius: -2,
              ),
              // Subtle inner glow
              BoxShadow(
                color: effectiveGlowColor.withValues(alpha: _glowAnimation.value * 0.4),
                blurRadius: 8,
                spreadRadius: -1,
              ),
            ],
          ),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? IrisTheme.darkSurface : Colors.white,
              borderRadius: BorderRadius.circular(widget.borderRadius),
              border: Border.all(
                color: effectiveGlowColor.withValues(alpha: 0.3 + (_glowAnimation.value * 0.3)),
                width: 1.5,
              ),
            ),
            child: Padding(
              padding: widget.padding ?? const EdgeInsets.all(20),
              child: widget.child,
            ),
          ),
        );
      },
    );
  }
}

// Keep old names as aliases for backward compatibility
typedef BMWStyledCard = PremiumGlowCard;
typedef AnimatedBMWStyledCard = AnimatedPremiumGlowCard;
