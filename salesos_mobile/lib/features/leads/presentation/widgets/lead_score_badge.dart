import 'package:flutter/material.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Visual lead score indicator badge
///
/// Displays a small badge with a numeric score (0-100) and a
/// color gradient that transitions from red (low) through gold (medium)
/// to green (high).
class LeadScoreBadge extends StatelessWidget {
  final int score;
  final bool compact;
  final bool showLabel;

  const LeadScoreBadge({
    super.key,
    required this.score,
    this.compact = false,
    this.showLabel = false,
  });

  Color _getScoreColor(int value) {
    if (value >= 80) return LuxuryColors.rolexGreen;
    if (value >= 60) return LuxuryColors.jadePremium;
    if (value >= 40) return LuxuryColors.champagneGold;
    if (value >= 20) return LuxuryColors.warningAmber;
    return LuxuryColors.errorRuby;
  }

  String _getScoreLabel(int value) {
    if (value >= 80) return 'Hot';
    if (value >= 60) return 'Warm';
    if (value >= 40) return 'Medium';
    if (value >= 20) return 'Cool';
    return 'Cold';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _getScoreColor(score);
    final clampedScore = score.clamp(0, 100);

    if (compact) {
      return _buildCompactBadge(color, clampedScore, isDark);
    }

    return _buildStandardBadge(color, clampedScore, isDark);
  }

  Widget _buildCompactBadge(Color color, int value, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Text(
        '$value',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }

  Widget _buildStandardBadge(Color color, int value, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: isDark ? 0.2 : 0.12),
            color.withValues(alpha: isDark ? 0.1 : 0.06),
          ],
        ),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Score number
          Text(
            '$value',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          if (showLabel) ...[
            const SizedBox(width: 6),
            // Score dot (mini progress indicator)
            Container(
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.4),
                    blurRadius: 3,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            // Label
            Text(
              _getScoreLabel(value),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Inline lead score indicator for list items
///
/// Shows a thin color bar proportional to the score
class LeadScoreBar extends StatelessWidget {
  final int score;
  final double width;
  final double height;

  const LeadScoreBar({
    super.key,
    required this.score,
    this.width = 40,
    this.height = 4,
  });

  Color _getScoreColor(int value) {
    if (value >= 80) return LuxuryColors.rolexGreen;
    if (value >= 60) return LuxuryColors.jadePremium;
    if (value >= 40) return LuxuryColors.champagneGold;
    if (value >= 20) return LuxuryColors.warningAmber;
    return LuxuryColors.errorRuby;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _getScoreColor(score);
    final fraction = (score / 100).clamp(0.0, 1.0);

    return SizedBox(
      width: width,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: height,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(height / 2),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: fraction,
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(height / 2),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.3),
                      blurRadius: 3,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
