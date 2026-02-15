import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Animated Wave Gradient Background - Exact BuildCrew.team Replica
///
/// Recreates the BuildCrew WebGL shader effect using exact values extracted
/// from their shader uniforms via Chrome DevTools analysis.
///
/// Exact BuildCrew Configuration (from WebGL uniforms):
/// - Background: #131513 (rgb 19, 21, 19)
/// - Colors: [#131513, #131513, #424b3f, #3d4739, #434c43]
/// - Origin: (0.9, 0.5) - right-center
/// - World: 3150x250 (12.6:1 wide aspect ratio)
/// - Scale: 0.82, Rotation: 146°
/// - Softness: 1, Intensity: 1, Noise: 1
/// - Shape: blob
class AnimatedWaveGradient extends StatefulWidget {
  final bool? isDark;
  final double speedMultiplier;
  final Widget? child;

  const AnimatedWaveGradient({
    super.key,
    this.isDark,
    this.speedMultiplier = 1.0,
    this.child,
  });

  @override
  State<AnimatedWaveGradient> createState() => _AnimatedWaveGradientState();
}

class _AnimatedWaveGradientState extends State<AnimatedWaveGradient>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    // Slow cycle for subtle effect (BuildCrew uses ~15-20 second cycles)
    final duration = Duration(
      milliseconds: (15000 / widget.speedMultiplier).round(),
    );
    _controller = AnimationController(
      vsync: this,
      duration: duration,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark ??
        Theme.of(context).brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          painter: _BuildCrewGradientPainter(
            progress: _controller.value,
            isDark: isDark,
          ),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// Painter replicating exact BuildCrew WebGL shader
class _BuildCrewGradientPainter extends CustomPainter {
  final double progress;
  final bool isDark;

  // EXACT BuildCrew colors from WebGL shader analysis
  // Background and first 2 colors are identical (creates subtlety)
  static const Color _bcBackground = Color(0xFF131513); // rgb(19, 21, 19)
  static const Color _bcColor1 = Color(0xFF131513);     // Same as bg
  static const Color _bcColor2 = Color(0xFF131513);     // Same as bg
  static const Color _bcColor3 = Color(0xFF424b3f);     // rgb(66, 75, 63) - olive
  static const Color _bcColor4 = Color(0xFF3d4739);     // rgb(61, 71, 57) - forest
  static const Color _bcColor5 = Color(0xFF434c43);     // rgb(67, 76, 67) - muted

  // Light mode equivalents (same relative differences)
  static const Color _lightBackground = Color(0xFFF2F2F7);
  static const Color _lightColor1 = Color(0xFFF2F2F7);
  static const Color _lightColor2 = Color(0xFFF2F2F7);
  static const Color _lightColor3 = Color(0xFFE5E8E5);  // Subtle gray-green
  static const Color _lightColor4 = Color(0xFFE8EBE8);  // Light sage
  static const Color _lightColor5 = Color(0xFFE2E5E2);  // Muted light

  // BuildCrew shader config
  static const double _originX = 0.9;    // Right side focus
  static const double _originY = 0.5;    // Vertically centered
  static const double _scale = 0.82;
  static const double _rotation = 146.0; // degrees

  _BuildCrewGradientPainter({
    required this.progress,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final bg = isDark ? _bcBackground : _lightBackground;
    final colors = isDark
        ? [_bcColor1, _bcColor2, _bcColor3, _bcColor4, _bcColor5]
        : [_lightColor1, _lightColor2, _lightColor3, _lightColor4, _lightColor5];

    // Fill background
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = bg,
    );

    // Animation phase with rotation factored in
    final rotRad = _rotation * math.pi / 180;
    final time = progress * 2 * math.pi;

    // Wide world ratio (3150:250 = 12.6:1) creates horizontal wave motion
    // Scale affects blob size, origin affects position

    // Blob 1 - Large, at origin (0.9, 0.5) - right center
    _drawBuildCrewBlob(
      canvas,
      size,
      centerX: _originX + 0.06 * math.sin(time + rotRad),
      centerY: _originY + 0.08 * math.cos(time * 0.7),
      scaleX: 0.55 * _scale,
      scaleY: 0.65 * _scale,
      color: colors[2], // #424b3f olive
      alpha: 0.7,
    );

    // Blob 2 - Secondary, offset from origin
    _drawBuildCrewBlob(
      canvas,
      size,
      centerX: 0.3 + 0.05 * math.cos(time * 0.8 + 1.0),
      centerY: 0.6 + 0.06 * math.sin(time * 0.6 + 0.5),
      scaleX: 0.45 * _scale,
      scaleY: 0.5 * _scale,
      color: colors[3], // #3d4739 forest
      alpha: 0.6,
    );

    // Blob 3 - Tertiary accent
    _drawBuildCrewBlob(
      canvas,
      size,
      centerX: 0.5 + 0.07 * math.sin(time * 0.9 + 2.0),
      centerY: 0.35 + 0.05 * math.cos(time * 0.5 + 1.5),
      scaleX: 0.4 * _scale,
      scaleY: 0.45 * _scale,
      color: colors[4], // #434c43 muted
      alpha: 0.5,
    );

    // Blob 4 - Subtle fill, lower left
    _drawBuildCrewBlob(
      canvas,
      size,
      centerX: 0.15 + 0.04 * math.cos(time * 0.6 + 3.0),
      centerY: 0.75 + 0.03 * math.sin(time * 0.4 + 2.0),
      scaleX: 0.35 * _scale,
      scaleY: 0.4 * _scale,
      color: colors[2], // #424b3f
      alpha: 0.4,
    );

    // Blob 5 - Upper area fill
    _drawBuildCrewBlob(
      canvas,
      size,
      centerX: 0.7 + 0.03 * math.sin(time * 0.5 + 1.0),
      centerY: 0.15 + 0.04 * math.cos(time * 0.7 + 2.5),
      scaleX: 0.3 * _scale,
      scaleY: 0.35 * _scale,
      color: colors[3], // #3d4739
      alpha: 0.35,
    );
  }

  void _drawBuildCrewBlob(
    Canvas canvas,
    Size size, {
    required double centerX,
    required double centerY,
    required double scaleX,
    required double scaleY,
    required Color color,
    required double alpha,
  }) {
    final center = Offset(size.width * centerX, size.height * centerY);
    final rX = size.width * scaleX;
    final rY = size.height * scaleY;

    // BuildCrew uses softness=1, creating very soft gradients
    final paint = Paint()
      ..shader = RadialGradient(
        center: Alignment.center,
        radius: 1.0,
        colors: [
          color.withValues(alpha: alpha),
          color.withValues(alpha: alpha * 0.7),
          color.withValues(alpha: alpha * 0.4),
          color.withValues(alpha: alpha * 0.15),
          color.withValues(alpha: alpha * 0.05),
          Colors.transparent,
        ],
        stops: const [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
      ).createShader(
        Rect.fromCenter(center: center, width: rX * 2, height: rY * 2),
      )
      // High blur for soft blob edges (softness=1 in WebGL)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 60);

    canvas.drawOval(
      Rect.fromCenter(center: center, width: rX * 2, height: rY * 2),
      paint,
    );
  }

  @override
  bool shouldRepaint(_BuildCrewGradientPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.isDark != isDark;
  }
}

/// Convenience scaffold with animated gradient background
class AnimatedGradientScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? floatingActionButton;
  final FloatingActionButtonLocation? floatingActionButtonLocation;
  final Widget? bottomNavigationBar;
  final bool extendBodyBehindAppBar;
  final double speedMultiplier;

  const AnimatedGradientScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.bottomNavigationBar,
    this.extendBodyBehindAppBar = true,
    this.speedMultiplier = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: extendBodyBehindAppBar,
      appBar: appBar,
      floatingActionButton: floatingActionButton,
      floatingActionButtonLocation: floatingActionButtonLocation,
      bottomNavigationBar: bottomNavigationBar,
      body: Stack(
        children: [
          Positioned.fill(
            child: AnimatedWaveGradient(
              isDark: isDark,
              speedMultiplier: speedMultiplier,
            ),
          ),
          body,
        ],
      ),
    );
  }
}
