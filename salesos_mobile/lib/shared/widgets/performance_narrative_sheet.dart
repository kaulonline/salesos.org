import 'dart:ui';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/theme.dart';
import '../../core/services/voice_output_service.dart';
import '../models/performance_narrative.dart';
import 'luxury_card.dart';

/// Premium bottom sheet for AI performance narrative
/// Styled with luxury watchmaking aesthetics - gold accents, precision details
class PerformanceNarrativeSheet extends ConsumerStatefulWidget {
  final PerformanceNarrative narrative;
  final VoidCallback onClose;

  const PerformanceNarrativeSheet({
    super.key,
    required this.narrative,
    required this.onClose,
  });

  @override
  ConsumerState<PerformanceNarrativeSheet> createState() =>
      _PerformanceNarrativeSheetState();
}

class _PerformanceNarrativeSheetState
    extends ConsumerState<PerformanceNarrativeSheet>
    with TickerProviderStateMixin {
  late AnimationController _entryController;
  late AnimationController _waveController;
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    _entryController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    )..forward();

    _waveController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _entryController.dispose();
    _waveController.dispose();
    // Stop TTS if playing
    if (_isPlaying) {
      ref.read(voiceOutputServiceProvider).stop();
    }
    super.dispose();
  }

  void _togglePlayback() {
    HapticFeedback.lightImpact();
    setState(() {
      _isPlaying = !_isPlaying;
      if (_isPlaying) {
        _waveController.repeat();
        // Trigger TTS
        ref.read(voiceOutputServiceProvider).speak(widget.narrative.fullNarrative);
      } else {
        _waveController.stop();
        ref.read(voiceOutputServiceProvider).stop();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenSize = MediaQuery.of(context).size;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    // Listen to voice output state
    final voiceState = ref.watch(voiceOutputStateProvider);

    // Update playing state based on TTS completion
    final isIdle = voiceState.maybeWhen(
      data: (state) => state == VoiceOutputState.idle,
      orElse: () => false,
    );
    if (isIdle && _isPlaying) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() {
            _isPlaying = false;
            _waveController.stop();
          });
        }
      });
    }

    return AnimatedBuilder(
      animation: _entryController,
      builder: (context, child) {
        final scaleValue =
            Curves.easeOutCubic.transform(_entryController.value);
        final fadeValue = Curves.easeOut.transform(_entryController.value);

        return Stack(
          children: [
            // Frosted backdrop
            GestureDetector(
              onTap: widget.onClose,
              child: BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: 8 * fadeValue,
                  sigmaY: 8 * fadeValue,
                ),
                child: Container(
                  color: Colors.black.withValues(alpha: 0.5 * fadeValue),
                ),
              ),
            ),

            // Centered dialog content
            Center(
              child: Transform.scale(
                scale: 0.9 + (0.1 * scaleValue),
                child: Opacity(
                  opacity: fadeValue,
                  child: Dialog(
                    backgroundColor: Colors.transparent,
                    insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                    child: Container(
                      constraints: BoxConstraints(
                        maxWidth: 500,
                        maxHeight: screenSize.height * 0.85 - bottomInset,
                      ),
                      decoration: BoxDecoration(
                        color: isDark ? LuxuryColors.richBlack : Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          ),
                          // Gold ambient glow
                          BoxShadow(
                            color: LuxuryColors.champagneGold.withValues(alpha: 0.08),
                            blurRadius: 40,
                            spreadRadius: -10,
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _buildHeader(isDark),
                            _buildVoicePlayback(isDark),
                            Flexible(
                              child: SingleChildScrollView(
                                padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                                physics: const BouncingScrollPhysics(),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildHighlights(isDark),
                                    const SizedBox(height: 24),
                                    _buildFullNarrative(isDark),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
            width: 1,
          ),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              // IRIS logo/icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      LuxuryColors.rolexGreen,
                      LuxuryColors.deepEmerald,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SalesOS Performance Narrative',
                      style: IrisTheme.titleSmall.copyWith(
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.3,
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.narrative.periodLabel} Analysis',
                      style: IrisTheme.labelSmall.copyWith(
                        fontWeight: FontWeight.w500,
                        color: LuxuryColors.champagneGold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              // Close button
              GestureDetector(
                onTap: widget.onClose,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.close,
                    size: 18,
                    color: isDark
                        ? LuxuryColors.textMuted
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    )
        .animate(controller: _entryController)
        .fadeIn(delay: 200.ms, duration: 400.ms);
  }

  Widget _buildVoicePlayback(bool isDark) {
    return Container(
      margin: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            LuxuryColors.champagneGold.withValues(alpha: 0.08),
            LuxuryColors.warmGold.withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Play/Pause button
          GestureDetector(
            onTap: _togglePlayback,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: _isPlaying
                      ? [
                          LuxuryColors.rolexGreen,
                          LuxuryColors.deepEmerald,
                        ]
                      : [
                          LuxuryColors.champagneGold,
                          LuxuryColors.warmGold,
                        ],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: (_isPlaying
                            ? LuxuryColors.rolexGreen
                            : LuxuryColors.champagneGold)
                        .withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(
                _isPlaying ? Icons.pause : Icons.play_arrow,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Waveform visualization
          Expanded(
            child: SizedBox(
              height: 32,
              child: AnimatedBuilder(
                animation: _waveController,
                builder: (context, child) {
                  return CustomPaint(
                    painter: _WaveformPainter(
                      progress: 0.0, // Visual waveform doesn't track actual progress
                      animationValue: _waveController.value,
                      isPlaying: _isPlaying,
                      activeColor: LuxuryColors.champagneGold,
                      inactiveColor: isDark
                          ? Colors.white.withValues(alpha: 0.15)
                          : Colors.black.withValues(alpha: 0.1),
                    ),
                    size: Size.infinite,
                  );
                },
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Duration
          Text(
            widget.narrative.formattedDuration,
            style: IrisTheme.labelSmall.copyWith(
              fontWeight: FontWeight.w500,
              color: LuxuryColors.textMuted,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    )
        .animate(controller: _entryController)
        .fadeIn(delay: 300.ms, duration: 400.ms)
        .slideY(begin: 0.1, curve: Curves.easeOut);
  }

  Widget _buildHighlights(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section label
        Row(
          children: [
            Container(
              width: 3,
              height: 14,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'KEY HIGHLIGHTS',
              style: IrisTheme.labelSmall.copyWith(
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5,
                color: LuxuryColors.textMuted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Highlight items
        ...widget.narrative.highlights.asMap().entries.map((entry) {
          final index = entry.key;
          final highlight = entry.value;
          return _buildHighlightItem(highlight, isDark, index);
        }),
      ],
    )
        .animate(controller: _entryController)
        .fadeIn(delay: 400.ms, duration: 400.ms);
  }

  Widget _buildHighlightItem(
      NarrativeHighlight highlight, bool isDark, int index) {
    // Color based on type
    final Color accentColor;
    switch (highlight.type) {
      case HighlightType.positive:
        accentColor = LuxuryColors.rolexGreen;
        break;
      case HighlightType.attention:
        accentColor = LuxuryColors.champagneGold;
        break;
      case HighlightType.insight:
        accentColor = LuxuryColors.jadePremium;
        break;
      case HighlightType.neutral:
        accentColor = LuxuryColors.platinum;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Diamond index marker (watch dial style)
          Container(
            width: 24,
            height: 24,
            margin: const EdgeInsets.only(top: 2),
            child: CustomPaint(
              painter: _DiamondIndexPainter(
                color: accentColor,
                isDark: isDark,
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  highlight.text,
                  style: IrisTheme.bodySmall.copyWith(
                    fontWeight: FontWeight.w500,
                    height: 1.5,
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                  ),
                ),
                if (highlight.metric != null ||
                    highlight.changePercent != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(
                      children: [
                        if (highlight.changePercent != null) ...[
                          Icon(
                            highlight.changePercent! >= 0
                                ? Icons.arrow_upward
                                : Icons.arrow_downward,
                            size: 12,
                            color: highlight.changePercent! >= 0
                                ? LuxuryColors.rolexGreen
                                : LuxuryColors.champagneGold,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${highlight.changePercent!.abs().toStringAsFixed(0)}%',
                            style: IrisTheme.labelSmall.copyWith(
                              fontWeight: FontWeight.w600,
                              color: highlight.changePercent! >= 0
                                  ? LuxuryColors.rolexGreen
                                  : LuxuryColors.champagneGold,
                            ),
                          ),
                        ],
                        if (highlight.metric != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: accentColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              highlight.metric!,
                              style: IrisTheme.caption.copyWith(
                                fontWeight: FontWeight.w600,
                                color: accentColor,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: Duration(milliseconds: 450 + index * 80));
  }

  Widget _buildFullNarrative(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.06)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.format_quote,
                size: 16,
                color: LuxuryColors.champagneGold.withValues(alpha: 0.6),
              ),
              const SizedBox(width: 8),
              Text(
                'Full Analysis',
                style: IrisTheme.labelSmall.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                  color: LuxuryColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.narrative.fullNarrative,
            style: IrisTheme.bodySmall.copyWith(
              fontWeight: FontWeight.w400,
              height: 1.7,
              color: isDark
                  ? LuxuryColors.textOnDark.withValues(alpha: 0.85)
                  : LuxuryColors.textOnLight.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    )
        .animate(controller: _entryController)
        .fadeIn(delay: 600.ms, duration: 400.ms);
  }
}

/// Custom painter for waveform visualization
class _WaveformPainter extends CustomPainter {
  final double progress;
  final double animationValue;
  final bool isPlaying;
  final Color activeColor;
  final Color inactiveColor;

  _WaveformPainter({
    required this.progress,
    required this.animationValue,
    required this.isPlaying,
    required this.activeColor,
    required this.inactiveColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const barCount = 40;
    final barWidth = size.width / barCount - 2;
    final maxHeight = size.height;

    for (int i = 0; i < barCount; i++) {
      // Generate pseudo-random heights based on index
      final baseHeight = (0.3 + 0.7 * _pseudoRandom(i)) * maxHeight;

      // Animate height when playing
      double height;
      if (isPlaying) {
        final phase = (i / barCount + animationValue) * math.pi * 2;
        height = baseHeight * (0.5 + 0.5 * math.sin(phase).abs());
      } else {
        height = baseHeight * 0.6;
      }

      final x = i * (barWidth + 2);
      final y = (size.height - height) / 2;

      final isActive = i / barCount <= progress || isPlaying;

      final paint = Paint()
        ..color = isActive ? activeColor : inactiveColor
        ..style = PaintingStyle.fill;

      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, y, barWidth, height),
        const Radius.circular(2),
      );

      canvas.drawRRect(rect, paint);
    }
  }

  double _pseudoRandom(int seed) {
    return ((seed * 1103515245 + 12345) % (1 << 31)) / (1 << 31);
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.progress != progress ||
        oldDelegate.isPlaying != isPlaying;
  }
}

/// Diamond-shaped index marker painter (watch dial style)
class _DiamondIndexPainter extends CustomPainter {
  final Color color;
  final bool isDark;

  _DiamondIndexPainter({required this.color, required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final halfSize = size.width * 0.35;

    final path = Path()
      ..moveTo(center.dx, center.dy - halfSize) // Top
      ..lineTo(center.dx + halfSize, center.dy) // Right
      ..lineTo(center.dx, center.dy + halfSize) // Bottom
      ..lineTo(center.dx - halfSize, center.dy) // Left
      ..close();

    // Gradient fill
    final gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        color,
        color.withValues(alpha: 0.7),
      ],
    );

    final paint = Paint()
      ..shader = gradient.createShader(
        Rect.fromCenter(center: center, width: size.width, height: size.height),
      );

    canvas.drawPath(path, paint);

    // Subtle border
    final borderPaint = Paint()
      ..color = color.withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Show the performance narrative sheet as a centered dialog
Future<void> showPerformanceNarrativeSheet(
  BuildContext context, {
  required PerformanceNarrative narrative,
}) {
  HapticFeedback.mediumImpact();
  return showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.transparent, // We handle our own backdrop
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (context, animation, secondaryAnimation) {
      return PerformanceNarrativeSheet(
        narrative: narrative,
        onClose: () => Navigator.pop(context),
      );
    },
  );
}
