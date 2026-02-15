import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// A luxury watch-crown inspired button that triggers AI insights
/// Styled with premium gold crown aesthetics and subtle pulsing glow
class AiInsightsCrownButton extends StatefulWidget {
  final VoidCallback onTap;
  final bool isLoading;
  final String periodLabel;

  const AiInsightsCrownButton({
    super.key,
    required this.onTap,
    this.isLoading = false,
    required this.periodLabel,
  });

  @override
  State<AiInsightsCrownButton> createState() => _AiInsightsCrownButtonState();
}

class _AiInsightsCrownButtonState extends State<AiInsightsCrownButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.isLoading
          ? null
          : () {
              HapticFeedback.lightImpact();
              widget.onTap();
            },
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          final pulseValue = _pulseController.value;

          return AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: EdgeInsets.symmetric(
              horizontal: _isPressed ? 10 : 12,
              vertical: _isPressed ? 6 : 8,
            ),
            decoration: BoxDecoration(
              // Subtle radial gradient like polished metal
              gradient: RadialGradient(
                center: const Alignment(-0.3, -0.5),
                radius: 1.5,
                colors: [
                  LuxuryColors.champagneGold
                      .withValues(alpha: 0.15 + pulseValue * 0.05),
                  LuxuryColors.warmGold.withValues(alpha: 0.08),
                  Colors.transparent,
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(
                  alpha: 0.4 + pulseValue * 0.2,
                ),
                width: 1,
              ),
              boxShadow: [
                // Outer glow
                BoxShadow(
                  color: LuxuryColors.champagneGold.withValues(
                    alpha: 0.1 + pulseValue * 0.1,
                  ),
                  blurRadius: 12 + pulseValue * 4,
                  spreadRadius: -2,
                ),
                // Inner shadow for depth
                BoxShadow(
                  color: (isDark ? Colors.black : LuxuryColors.richBlack)
                      .withValues(alpha: 0.3),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Crown icon with sparkle
                SizedBox(
                  width: 16,
                  height: 16,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Sparkle effect behind
                      if (!widget.isLoading)
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Icon(
                            Icons.auto_awesome,
                            size: 8,
                            color: LuxuryColors.champagneGold.withValues(
                              alpha: 0.4 + pulseValue * 0.4,
                            ),
                          ),
                        ),
                      // Main icon or loading indicator
                      widget.isLoading
                          ? SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.5,
                                valueColor: AlwaysStoppedAnimation(
                                  LuxuryColors.champagneGold,
                                ),
                              ),
                            )
                          : Icon(
                              Icons.insights_outlined,
                              size: 14,
                              color: LuxuryColors.champagneGold,
                            ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                // Label
                Text(
                  'AI',
                  style: IrisTheme.labelSmall.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
