import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'luxury_card.dart';

/// Premium splash screen inspired by luxury brand aesthetics
/// Features elegant animations, champagne gold accents, and SalesOS branding
class PremiumSplashScreen extends StatefulWidget {
  final String? statusText;
  final bool showBiometricPrompt;
  final bool biometricFailed;
  final String? biometricName;
  final VoidCallback? onRetryBiometric;
  final VoidCallback? onUsePassword;

  const PremiumSplashScreen({
    super.key,
    this.statusText,
    this.showBiometricPrompt = false,
    this.biometricFailed = false,
    this.biometricName,
    this.onRetryBiometric,
    this.onUsePassword,
  });

  @override
  State<PremiumSplashScreen> createState() => _PremiumSplashScreenState();
}

class _PremiumSplashScreenState extends State<PremiumSplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _rotateController;
  late AnimationController _shimmerController;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();

    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _rotateController.dispose();
    _shimmerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D0D0D), // Deep luxury black
        body: Stack(
          children: [
            // Animated gradient background
            _buildAnimatedBackground(size),

            // Rotating decorative ring
            _buildDecorativeRing(size),

            // Main content
            SafeArea(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Spacer(flex: 2),

                    // Premium logo with glow
                    _buildPremiumLogo(),

                    const SizedBox(height: 40),

                    // Brand name with luxury typography
                    _buildBrandName(),

                    const SizedBox(height: 12),

                    // Tagline
                    _buildTagline(),

                    const Spacer(),

                    // Status section
                    if (widget.showBiometricPrompt && widget.biometricFailed)
                      _buildBiometricFailedUI()
                    else if (widget.showBiometricPrompt)
                      _buildBiometricPromptUI()
                    else
                      _buildLoadingUI(),

                    const Spacer(),

                    // Bottom branding
                    _buildBottomBranding(),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnimatedBackground(Size size) {
    // Wrap continuous animations in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Stack(
          children: [
            // Base gradient
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF0D0D0D), // Deep black
                    Color(0xFF111111), // Dark charcoal
                    Color(0xFF0D0D0D), // Near black
                  ],
                ),
              ),
            ),

            // Animated emerald glow - top right
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                return Positioned(
                  top: -size.height * 0.15,
                  right: -size.width * 0.2,
                  child: Container(
                    width: size.width * 0.8,
                    height: size.width * 0.8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          LuxuryColors.champagneGold.withValues(
                            alpha: 0.15 + (_pulseController.value * 0.08),
                          ),
                          LuxuryColors.champagneGoldDark.withValues(
                            alpha: 0.05 + (_pulseController.value * 0.03),
                          ),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                  ),
                );
              },
            ),

            // Animated jade glow - bottom left
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final reverseValue = 1 - _pulseController.value;
                return Positioned(
                  bottom: -size.height * 0.1,
                  left: -size.width * 0.3,
                  child: Container(
                    width: size.width * 0.7,
                    height: size.width * 0.7,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          LuxuryColors.champagneGold.withValues(
                            alpha: 0.1 + (reverseValue * 0.06),
                          ),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),

            // Subtle noise texture overlay (luxury paper feel)
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.2),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDecorativeRing(Size size) {
    // Wrap continuous rotation animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _rotateController,
          builder: (context, child) {
            return Center(
              child: Transform.rotate(
                angle: _rotateController.value * 2 * math.pi,
                child: Container(
                  width: size.width * 0.85,
                  height: size.width * 0.85,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.08),
                      width: 1,
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Accent dot
                      Positioned(
                        top: 0,
                        left: size.width * 0.425 - 4,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: LuxuryColors.champagneGold.withValues(alpha: 0.6),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildPremiumLogo() {
    // Wrap pulse animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            return Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    LuxuryColors.champagneGold.withValues(alpha: 0.2),
                    Colors.transparent,
                  ],
                  stops: const [0.5, 1.0],
                ),
              ),
              child: Center(
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        LuxuryColors.champagneGold,
                        LuxuryColors.champagneGold,
                        LuxuryColors.champagneGoldDark,
                      ],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                      width: 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: LuxuryColors.champagneGold.withValues(
                          alpha: 0.3 + (_pulseController.value * 0.2),
                        ),
                        blurRadius: 30 + (_pulseController.value * 15),
                        spreadRadius: -5,
                      ),
                      BoxShadow(
                        color: LuxuryColors.champagneGold.withValues(
                          alpha: 0.2 + (_pulseController.value * 0.1),
                        ),
                        blurRadius: 50,
                        spreadRadius: -10,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.auto_awesome,
                    size: 48,
                    color: Colors.white,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    ).animate().fadeIn(duration: 800.ms).scale(
          begin: const Offset(0.5, 0.5),
          end: const Offset(1.0, 1.0),
          curve: Curves.elasticOut,
          duration: 1200.ms,
        );
  }

  Widget _buildBrandName() {
    return Column(
      children: [
        // Main brand name
        ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              colors: [
                Colors.white,
                LuxuryColors.platinum,
                Colors.white,
              ],
            ).createShader(bounds);
          },
          child: const Text(
            'SalesOS',
            style: TextStyle(
              fontSize: 52,
              fontWeight: FontWeight.w300,
              letterSpacing: 20,
              color: Colors.white,
              height: 1,
            ),
          ),
        ).animate(delay: 400.ms).fadeIn(duration: 600.ms).slideY(begin: 0.3),

        const SizedBox(height: 8),

        // Decorative line
        Container(
          width: 60,
          height: 2,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                LuxuryColors.champagneGold,
                Colors.transparent,
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                blurRadius: 8,
              ),
            ],
          ),
        ).animate(delay: 600.ms).fadeIn().scaleX(begin: 0),
      ],
    );
  }

  Widget _buildTagline() {
    return Text(
      'AI-POWERED SALES EXCELLENCE',
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 3,
        color: LuxuryColors.champagneGold.withValues(alpha: 0.8),
      ),
    ).animate(delay: 700.ms).fadeIn(duration: 500.ms);
  }

  Widget _buildLoadingUI() {
    return Column(
      children: [
        // Custom premium loader - wrapped to prevent semantics errors
        ExcludeSemantics(
          child: RepaintBoundary(
            child: SizedBox(
              width: 40,
              height: 40,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Outer ring
                  AnimatedBuilder(
                    animation: _shimmerController,
                    builder: (context, child) {
                      return Transform.rotate(
                        angle: _shimmerController.value * 2 * math.pi,
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                              width: 2,
                            ),
                          ),
                          child: Stack(
                            children: [
                              Positioned(
                                top: 0,
                                left: 16,
                                child: Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: LuxuryColors.champagneGold,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: LuxuryColors.champagneGold
                                            .withValues(alpha: 0.6),
                                        blurRadius: 6,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  // Inner dot
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: LuxuryColors.champagneGold,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          widget.statusText?.toUpperCase() ?? 'INITIALIZING',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 2,
            color: LuxuryColors.textMuted.withValues(alpha: 0.7),
          ),
        ),
      ],
    ).animate(delay: 1000.ms).fadeIn(duration: 400.ms);
  }

  Widget _buildBiometricPromptUI() {
    final isFaceId = widget.biometricName?.toLowerCase().contains('face') ?? false;

    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Icon(
            isFaceId ? Iconsax.scan : Iconsax.finger_scan,
            size: 36,
            color: LuxuryColors.champagneGold,
          ),
        ).animate().fadeIn().scale(),
        const SizedBox(height: 20),
        Text(
          widget.biometricName ?? 'Biometric',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w500,
            color: Colors.white,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          widget.statusText?.toUpperCase() ?? 'AUTHENTICATING',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 2,
            color: LuxuryColors.textMuted.withValues(alpha: 0.7),
          ),
        ),
      ],
    ).animate(delay: 800.ms).fadeIn();
  }

  Widget _buildBiometricFailedUI() {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: Colors.amber.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.amber.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: const Icon(
            Iconsax.warning_2,
            size: 36,
            color: Colors.amber,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          '${widget.biometricName ?? "Biometric"} Not Recognized',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 28),

        // Retry Button - Premium styled
        GestureDetector(
          onTap: widget.onRetryBiometric,
          child: Container(
            width: 220,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              gradient: LuxuryColors.goldShimmer,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
              ),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                  blurRadius: 16,
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Iconsax.refresh, size: 18, color: Colors.white),
                const SizedBox(width: 10),
                Text(
                  'Try ${widget.biometricName ?? "Again"}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Use Password - subtle
        GestureDetector(
          onTap: widget.onUsePassword,
          child: Text(
            'USE PASSWORD INSTEAD',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              letterSpacing: 1.5,
              color: LuxuryColors.textMuted.withValues(alpha: 0.6),
            ),
          ),
        ),
      ],
    ).animate().fadeIn();
  }

  Widget _buildBottomBranding() {
    return Column(
      children: [
        // Crown-inspired decorative element
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 20,
              height: 1,
              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            ),
            const SizedBox(width: 12),
            Icon(
              Icons.auto_awesome,
              size: 12,
              color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
            ),
            const SizedBox(width: 12),
            Container(
              width: 20,
              height: 1,
              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'CRAFTED FOR EXCELLENCE',
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w500,
            letterSpacing: 3,
            color: LuxuryColors.textMuted.withValues(alpha: 0.4),
          ),
        ),
      ],
    ).animate(delay: 1200.ms).fadeIn(duration: 600.ms);
  }
}

/// Standalone premium loading indicator
class PremiumLoadingIndicator extends StatefulWidget {
  final double size;
  final Color? color;

  const PremiumLoadingIndicator({
    super.key,
    this.size = 40,
    this.color,
  });

  @override
  State<PremiumLoadingIndicator> createState() => _PremiumLoadingIndicatorState();
}

class _PremiumLoadingIndicatorState extends State<PremiumLoadingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final effectiveColor = widget.color ?? LuxuryColors.champagneGold;

    // Wrap continuous animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return CustomPaint(
                painter: _PremiumLoaderPainter(
                  progress: _controller.value,
                  color: effectiveColor,
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _PremiumLoaderPainter extends CustomPainter {
  final double progress;
  final Color color;

  _PremiumLoaderPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 2;

    // Background ring
    final bgPaint = Paint()
      ..color = color.withValues(alpha: 0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawCircle(center, radius, bgPaint);

    // Progress arc
    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;

    final startAngle = -math.pi / 2 + (progress * 2 * math.pi);
    const sweepAngle = math.pi / 2;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      progressPaint,
    );

    // Glow dot
    final dotAngle = startAngle + sweepAngle;
    final dotX = center.dx + radius * math.cos(dotAngle);
    final dotY = center.dy + radius * math.sin(dotAngle);

    final dotPaint = Paint()
      ..color = color
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
    canvas.drawCircle(Offset(dotX, dotY), 4, dotPaint);

    final dotCorePaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(dotX, dotY), 2, dotCorePaint);
  }

  @override
  bool shouldRepaint(covariant _PremiumLoaderPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
