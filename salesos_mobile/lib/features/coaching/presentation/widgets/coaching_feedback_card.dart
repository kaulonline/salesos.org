import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// AI coaching feedback display card
class CoachingFeedbackCard extends StatelessWidget {
  final int score;
  final String? feedback;
  final List<String> strengths;
  final List<String> weaknesses;
  final List<String> suggestions;

  const CoachingFeedbackCard({
    super.key,
    required this.score,
    this.feedback,
    this.strengths = const [],
    this.weaknesses = const [],
    this.suggestions = const [],
  });

  Color _scoreColor(int score) {
    if (score >= 80) return LuxuryColors.rolexGreen;
    if (score >= 60) return LuxuryColors.champagneGold;
    if (score >= 40) return LuxuryColors.warningAmber;
    return LuxuryColors.errorRuby;
  }

  String _scoreLabel(int score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _scoreColor(score);

    return Column(
      children: [
        // Score gauge
        LuxuryCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Text(
                'AI Analysis',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 20),
              // Score circle
              SizedBox(
                width: 120,
                height: 120,
                child: CustomPaint(
                  painter: _ScoreGaugePainter(
                    score: score / 100,
                    color: color,
                    trackColor: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : Colors.black.withValues(alpha: 0.08),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$score',
                          style: IrisTheme.numericMedium.copyWith(
                            color: color,
                          ),
                        ),
                        Text(
                          _scoreLabel(score),
                          style: IrisTheme.caption.copyWith(
                            color: color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (feedback != null) ...[
                const SizedBox(height: 16),
                Text(
                  feedback!,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ).animate().fadeIn(duration: 400.ms),

        // Strengths
        if (strengths.isNotEmpty) ...[
          const SizedBox(height: 16),
          LuxuryCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.medal_star,
                        size: 18,
                        color: LuxuryColors.rolexGreen,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Strengths',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...strengths.map((s) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Iconsax.tick_circle,
                            size: 16,
                            color: LuxuryColors.rolexGreen,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              s,
                              style: IrisTheme.bodySmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.05),
        ],

        // Weaknesses
        if (weaknesses.isNotEmpty) ...[
          const SizedBox(height: 16),
          LuxuryCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: LuxuryColors.errorRuby.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.warning_2,
                        size: 18,
                        color: LuxuryColors.errorRuby,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Areas to Improve',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...weaknesses.map((w) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Iconsax.minus_cirlce,
                            size: 16,
                            color: LuxuryColors.errorRuby,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              w,
                              style: IrisTheme.bodySmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.05),
        ],

        // Suggestions
        if (suggestions.isNotEmpty) ...[
          const SizedBox(height: 16),
          LuxuryCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: LuxuryColors.infoCobalt.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.lamp_on,
                        size: 18,
                        color: LuxuryColors.infoCobalt,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Suggestions',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...suggestions.asMap().entries.map((entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: LuxuryColors.infoCobalt.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Center(
                              child: Text(
                                '${entry.key + 1}',
                                style: IrisTheme.caption.copyWith(
                                  color: LuxuryColors.infoCobalt,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              entry.value,
                              style: IrisTheme.bodySmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.05),
        ],
      ],
    );
  }
}

class _ScoreGaugePainter extends CustomPainter {
  final double score;
  final Color color;
  final Color trackColor;

  _ScoreGaugePainter({
    required this.score,
    required this.color,
    required this.trackColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2 - 8;
    const strokeWidth = 8.0;

    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2,
      2 * pi * score.clamp(0.0, 1.0),
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScoreGaugePainter oldDelegate) {
    return oldDelegate.score != score || oldDelegate.color != color;
  }
}
