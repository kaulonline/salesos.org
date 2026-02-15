import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// AI deal score display card with circular progress indicator and breakdown
class DealScoreCard extends StatelessWidget {
  final int score;
  final Map<String, dynamic> breakdown;
  final VoidCallback? onTap;

  const DealScoreCard({
    super.key,
    required this.score,
    this.breakdown = const {},
    this.onTap,
  });

  Color _getScoreColor(int value) {
    if (value > 70) return LuxuryColors.rolexGreen;
    if (value >= 40) return LuxuryColors.champagneGold;
    return LuxuryColors.errorRuby;
  }

  String _getScoreLabel(int value) {
    if (value > 70) return 'Strong';
    if (value >= 40) return 'Moderate';
    return 'At Risk';
  }

  IconData _getScoreIcon(int value) {
    if (value > 70) return Iconsax.tick_circle;
    if (value >= 40) return Iconsax.warning_2;
    return Iconsax.danger;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scoreColor = _getScoreColor(score);

    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.accent,
      padding: const EdgeInsets.all(20),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Center(
                  child: Icon(
                    Iconsax.chart_2,
                    size: 18,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Deal Score',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                    ),
                    Text(
                      'Probability of closing',
                      style: IrisTheme.caption.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: scoreColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: scoreColor.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_getScoreIcon(score), size: 12, color: scoreColor),
                    const SizedBox(width: 4),
                    Text(
                      _getScoreLabel(score),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: scoreColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Circular score indicator
          Center(
            child: SizedBox(
              width: 120,
              height: 120,
              child: CustomPaint(
                painter: _DealScoreGaugePainter(
                  score: score / 100,
                  color: scoreColor,
                  backgroundColor: isDark
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
                          color: scoreColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'Score',
                        style: IrisTheme.caption.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ).animate(delay: 200.ms).scale(
                  begin: const Offset(0.8, 0.8),
                  curve: Curves.easeOutBack,
                ),
          ),

          // Breakdown items
          if (breakdown.isNotEmpty) ...[
            const SizedBox(height: 24),

            // Divider
            Container(
              height: 0.5,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    isDark
                        ? Colors.white.withValues(alpha: 0.12)
                        : Colors.black.withValues(alpha: 0.08),
                    isDark
                        ? Colors.white.withValues(alpha: 0.12)
                        : Colors.black.withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.2, 0.8, 1.0],
                ),
              ),
            ),

            const SizedBox(height: 16),

            Text(
              'Score Breakdown',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 12),

            ...breakdown.entries.toList().asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              final label = item.key;
              final value = item.value;
              final numericValue = (value is num)
                  ? value.toInt()
                  : int.tryParse(value.toString()) ?? 0;
              final itemColor = _getScoreColor(numericValue);

              return _buildBreakdownItem(
                context,
                label,
                numericValue,
                itemColor,
                isDark,
                index,
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildBreakdownItem(
    BuildContext context,
    String label,
    int value,
    Color color,
    bool isDark,
    int index,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          // Label
          Expanded(
            flex: 3,
            child: Text(
              _formatLabel(label),
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          // Progress bar
          Expanded(
            flex: 4,
            child: Container(
              height: 6,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(3),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: (value / 100).clamp(0.0, 1.0),
                child: Container(
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(3),
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: 0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          // Value
          SizedBox(
            width: 32,
            child: Text(
              '$value',
              style: IrisTheme.labelSmall.copyWith(
                color: color,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    ).animate(delay: (100 + index * 60).ms).fadeIn().slideX(begin: 0.02);
  }

  String _formatLabel(String raw) {
    // Convert camelCase or snake_case to human-readable
    return raw
        .replaceAllMapped(
          RegExp(r'([a-z])([A-Z])'),
          (match) => '${match.group(1)} ${match.group(2)}',
        )
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) =>
            w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : w)
        .join(' ');
  }
}

/// Custom painter for the circular deal score gauge
class _DealScoreGaugePainter extends CustomPainter {
  final double score;
  final Color color;
  final Color backgroundColor;

  _DealScoreGaugePainter({
    required this.score,
    required this.color,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 16) / 2;
    const strokeWidth = 10.0;
    const startAngle = -math.pi * 0.75;
    const sweepAngle = math.pi * 1.5;

    // Background arc
    final bgPaint = Paint()
      ..color = backgroundColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      bgPaint,
    );

    // Score arc
    final scorePaint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle * score.clamp(0.0, 1.0),
      false,
      scorePaint,
    );

    // Glow effect
    final glowPaint = Paint()
      ..color = color.withValues(alpha: 0.25)
      ..strokeWidth = strokeWidth + 6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle * score.clamp(0.0, 1.0),
      false,
      glowPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _DealScoreGaugePainter oldDelegate) {
    return oldDelegate.score != score || oldDelegate.color != color;
  }
}
