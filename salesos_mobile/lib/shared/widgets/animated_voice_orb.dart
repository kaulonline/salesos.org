import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'luxury_card.dart';

/// A beautiful 3D-style animated orb for voice interactions
/// Inspired by premium AI assistant interfaces with SalesOS Gold branding
class AnimatedVoiceOrb extends StatefulWidget {
  final bool isListening;
  final bool isSpeaking;
  final bool isProcessing;
  final bool isConnecting;
  final double audioLevel;
  final VoidCallback? onTap;
  final double size;
  final String? semanticLabel; // Accessibility label for screen readers

  const AnimatedVoiceOrb({
    super.key,
    this.isListening = false,
    this.isSpeaking = false,
    this.isProcessing = false,
    this.isConnecting = false,
    this.audioLevel = 0.0,
    this.onTap,
    this.size = 200,
    this.semanticLabel,
  });

  @override
  State<AnimatedVoiceOrb> createState() => _AnimatedVoiceOrbState();
}

class _AnimatedVoiceOrbState extends State<AnimatedVoiceOrb>
    with TickerProviderStateMixin {
  late AnimationController _rotationController;
  late AnimationController _pulseController;
  late AnimationController _glowController;
  late AnimationController _waveController;

  @override
  void initState() {
    super.initState();

    // Main rotation for the swirl effect
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();

    // Pulse animation for breathing effect
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    // Glow intensity animation
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    // Wave animation for audio visualization
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    _glowController.dispose();
    _waveController.dispose();
    super.dispose();
  }

  bool get _isActive =>
      widget.isListening || widget.isSpeaking || widget.isProcessing;

  Color get _primaryColor {
    if (widget.isSpeaking) return LuxuryColors.champagneGold;
    if (widget.isListening) return LuxuryColors.jadePremium;
    if (widget.isProcessing) return LuxuryColors.champagneGold;
    if (widget.isConnecting) return LuxuryColors.platinum;
    return LuxuryColors.rolexGreen;
  }

  Color get _secondaryColor {
    if (widget.isSpeaking) return LuxuryColors.warmGold;
    if (widget.isListening) return LuxuryColors.rolexGreen;
    if (widget.isProcessing) return LuxuryColors.roseGold;
    return LuxuryColors.deepEmerald;
  }

  String get _stateDescription {
    if (widget.isConnecting) return 'Connecting';
    if (widget.isListening) return 'Listening';
    if (widget.isSpeaking) return 'Speaking';
    if (widget.isProcessing) return 'Processing';
    return 'Voice assistant';
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: widget.semanticLabel ?? _stateDescription,
      button: widget.onTap != null,
      enabled: widget.onTap != null,
      liveRegion: true, // Announce state changes
      child: GestureDetector(
        onTap: widget.onTap,
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: AnimatedBuilder(
            animation: Listenable.merge([
              _rotationController,
              _pulseController,
              _glowController,
              _waveController,
            ]),
            builder: (context, child) {
              return CustomPaint(
                painter: _VoiceOrbPainter(
                  rotationValue: _rotationController.value,
                  pulseValue: _pulseController.value,
                  glowValue: _glowController.value,
                  waveValue: _waveController.value,
                  primaryColor: _primaryColor,
                  secondaryColor: _secondaryColor,
                  isActive: _isActive,
                  audioLevel: widget.audioLevel,
                  isConnecting: widget.isConnecting,
                ),
                size: Size(widget.size, widget.size),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _VoiceOrbPainter extends CustomPainter {
  final double rotationValue;
  final double pulseValue;
  final double glowValue;
  final double waveValue;
  final Color primaryColor;
  final Color secondaryColor;
  final bool isActive;
  final double audioLevel;
  final bool isConnecting;

  _VoiceOrbPainter({
    required this.rotationValue,
    required this.pulseValue,
    required this.glowValue,
    required this.waveValue,
    required this.primaryColor,
    required this.secondaryColor,
    required this.isActive,
    required this.audioLevel,
    required this.isConnecting,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width / 2 * 0.65;

    // Draw outer glow rings
    _drawGlowRings(canvas, center, baseRadius, size);

    // Draw the main orb with 3D swirl effect
    _drawMainOrb(canvas, center, baseRadius);

    // Draw swirling light trails
    _drawSwirlEffect(canvas, center, baseRadius);

    // Draw inner glow/core
    _drawInnerCore(canvas, center, baseRadius * 0.4);

    // Draw audio wave visualization if active
    if (isActive) {
      _drawAudioWaves(canvas, center, baseRadius);
    }
  }

  void _drawGlowRings(
      Canvas canvas, Offset center, double radius, Size size) {
    final glowIntensity = isActive ? 0.3 + glowValue * 0.2 : 0.15 + glowValue * 0.1;
    final expandedRadius = radius * (1.3 + pulseValue * 0.15 + audioLevel * 0.3);

    // Outer glow
    final outerGlowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          primaryColor.withValues(alpha: glowIntensity * 0.8),
          primaryColor.withValues(alpha: glowIntensity * 0.4),
          primaryColor.withValues(alpha: glowIntensity * 0.1),
          Colors.transparent,
        ],
        stops: const [0.0, 0.4, 0.7, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: expandedRadius));

    canvas.drawCircle(center, expandedRadius, outerGlowPaint);

    // Secondary color glow (offset for depth)
    final secondaryGlowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          secondaryColor.withValues(alpha: glowIntensity * 0.5),
          secondaryColor.withValues(alpha: glowIntensity * 0.2),
          Colors.transparent,
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(Rect.fromCircle(
        center: Offset(
          center.dx + math.sin(rotationValue * 2 * math.pi) * 20,
          center.dy + math.cos(rotationValue * 2 * math.pi) * 20,
        ),
        radius: expandedRadius * 0.8,
      ));

    canvas.drawCircle(center, expandedRadius * 0.8, secondaryGlowPaint);

    // Pulsing ring borders
    if (isActive) {
      for (int i = 0; i < 3; i++) {
        final ringProgress = (waveValue + i * 0.33) % 1.0;
        final ringRadius = radius * (0.8 + ringProgress * 0.6);
        final ringOpacity = (1.0 - ringProgress) * 0.4 * (isActive ? 1.0 : 0.3);

        final ringPaint = Paint()
          ..color = primaryColor.withValues(alpha: ringOpacity)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0;

        canvas.drawCircle(center, ringRadius, ringPaint);
      }
    }
  }

  void _drawMainOrb(Canvas canvas, Offset center, double radius) {
    final orbRadius = radius * (1.0 + pulseValue * 0.05 + audioLevel * 0.1);

    // Main orb gradient
    final orbPaint = Paint()
      ..shader = RadialGradient(
        center: Alignment(
          -0.3 + math.sin(rotationValue * 2 * math.pi) * 0.2,
          -0.3 + math.cos(rotationValue * 2 * math.pi) * 0.2,
        ),
        radius: 1.2,
        colors: [
          primaryColor.withValues(alpha: 0.9),
          primaryColor.withValues(alpha: 0.6),
          secondaryColor.withValues(alpha: 0.4),
          secondaryColor.withValues(alpha: 0.2),
        ],
        stops: const [0.0, 0.3, 0.6, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: orbRadius));

    canvas.drawCircle(center, orbRadius, orbPaint);

    // Add a subtle dark edge for 3D depth
    final edgePaint = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.transparent,
          Colors.black.withValues(alpha: 0.3),
        ],
        stops: const [0.7, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: orbRadius));

    canvas.drawCircle(center, orbRadius, edgePaint);
  }

  void _drawSwirlEffect(Canvas canvas, Offset center, double radius) {
    final swirlPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;

    // Draw multiple swirl trails
    for (int trail = 0; trail < 3; trail++) {
      final trailOffset = trail * (2 * math.pi / 3);
      final path = Path();

      for (double t = 0; t <= 1.0; t += 0.02) {
        final angle = rotationValue * 2 * math.pi + t * math.pi * 1.5 + trailOffset;
        final spiralRadius = radius * (0.3 + t * 0.5);
        final wobble = math.sin(t * math.pi * 4 + rotationValue * 4 * math.pi) * 10;

        final x = center.dx + math.cos(angle) * (spiralRadius + wobble);
        final y = center.dy + math.sin(angle) * (spiralRadius + wobble * 0.5);

        if (t == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }

      // Gradient along the trail
      final trailColor = trail == 0
          ? primaryColor
          : trail == 1
              ? secondaryColor
              : LuxuryColors.platinum;

      swirlPaint.shader = SweepGradient(
        center: Alignment.center,
        startAngle: rotationValue * 2 * math.pi,
        endAngle: rotationValue * 2 * math.pi + math.pi * 2,
        colors: [
          trailColor.withValues(alpha: 0.0),
          trailColor.withValues(alpha: isActive ? 0.8 : 0.4),
          trailColor.withValues(alpha: isActive ? 0.8 : 0.4),
          trailColor.withValues(alpha: 0.0),
        ],
        stops: const [0.0, 0.3, 0.7, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));

      canvas.drawPath(path, swirlPaint);
    }
  }

  void _drawInnerCore(Canvas canvas, Offset center, double radius) {
    final coreIntensity = isActive ? 0.9 + audioLevel * 0.1 : 0.6 + glowValue * 0.2;

    // Bright inner core
    final corePaint = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.white.withValues(alpha: coreIntensity),
          primaryColor.withValues(alpha: coreIntensity * 0.8),
          primaryColor.withValues(alpha: coreIntensity * 0.3),
          Colors.transparent,
        ],
        stops: const [0.0, 0.3, 0.6, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));

    canvas.drawCircle(center, radius, corePaint);

    // Add shimmer highlight
    final highlightOffset = Offset(
      center.dx - radius * 0.3,
      center.dy - radius * 0.3,
    );
    final highlightPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.white.withValues(alpha: 0.6),
          Colors.white.withValues(alpha: 0.0),
        ],
      ).createShader(
          Rect.fromCircle(center: highlightOffset, radius: radius * 0.4));

    canvas.drawCircle(highlightOffset, radius * 0.4, highlightPaint);
  }

  void _drawAudioWaves(Canvas canvas, Offset center, double radius) {
    final wavePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    // Draw frequency bars around the orb
    const numBars = 48;
    for (int i = 0; i < numBars; i++) {
      final angle = (i / numBars) * 2 * math.pi - math.pi / 2;

      // Create varied bar heights based on audio level and animation
      final barVariation = math.sin(waveValue * 2 * math.pi + i * 0.3);
      final barHeight = 8 + audioLevel * 30 * (0.5 + barVariation * 0.5);

      final innerRadius = radius * 0.95;
      final outerRadius = innerRadius + barHeight;

      final startPoint = Offset(
        center.dx + innerRadius * math.cos(angle),
        center.dy + innerRadius * math.sin(angle),
      );
      final endPoint = Offset(
        center.dx + outerRadius * math.cos(angle),
        center.dy + outerRadius * math.sin(angle),
      );

      // Color varies around the circle
      final colorProgress = (i / numBars + waveValue) % 1.0;
      final barColor = Color.lerp(
        primaryColor,
        secondaryColor,
        colorProgress,
      )!;

      wavePaint.color = barColor.withValues(alpha: 0.6 + audioLevel * 0.4);
      canvas.drawLine(startPoint, endPoint, wavePaint);
    }
  }

  @override
  bool shouldRepaint(_VoiceOrbPainter oldDelegate) {
    return oldDelegate.rotationValue != rotationValue ||
        oldDelegate.pulseValue != pulseValue ||
        oldDelegate.glowValue != glowValue ||
        oldDelegate.waveValue != waveValue ||
        oldDelegate.primaryColor != primaryColor ||
        oldDelegate.isActive != isActive ||
        oldDelegate.audioLevel != audioLevel;
  }
}
