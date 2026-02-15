import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// Factory function to create an EngagementGauge widget
/// This workaround avoids a Dart analyzer issue with self-referencing classes
Widget _createEngagementGauge(int score, {double size = 100, double strokeWidth = 8}) {
  return EngagementGauge(score: score, size: size, strokeWidth: strokeWidth);
}

/// Influence level enum for contacts
enum InfluenceLevel { low, medium, high, critical }

/// Communication style enum
enum CommunicationStyle { formal, casual, technical, executive }

/// Extension to get display properties for InfluenceLevel
extension InfluenceLevelExtension on InfluenceLevel {
  String get displayName {
    switch (this) {
      case InfluenceLevel.low:
        return 'LOW';
      case InfluenceLevel.medium:
        return 'MEDIUM';
      case InfluenceLevel.high:
        return 'HIGH';
      case InfluenceLevel.critical:
        return 'CRITICAL';
    }
  }

  Color get color {
    switch (this) {
      case InfluenceLevel.low:
        return LuxuryColors.coolGray;
      case InfluenceLevel.medium:
        return LuxuryColors.champagneGold;
      case InfluenceLevel.high:
        return LuxuryColors.jadePremium;
      case InfluenceLevel.critical:
        return LuxuryColors.rolexGreen;
    }
  }

  IconData get icon {
    switch (this) {
      case InfluenceLevel.low:
        return Icons.person_outline;
      case InfluenceLevel.medium:
        return Icons.person;
      case InfluenceLevel.high:
        return Icons.star;
      case InfluenceLevel.critical:
        return Icons.diamond_outlined;
    }
  }
}

/// Extension to get display properties for CommunicationStyle
extension CommunicationStyleExtension on CommunicationStyle {
  String get displayName {
    switch (this) {
      case CommunicationStyle.formal:
        return 'Formal';
      case CommunicationStyle.casual:
        return 'Casual';
      case CommunicationStyle.technical:
        return 'Technical';
      case CommunicationStyle.executive:
        return 'Executive';
    }
  }

  IconData get icon {
    switch (this) {
      case CommunicationStyle.formal:
        return Icons.business_center_outlined;
      case CommunicationStyle.casual:
        return Icons.emoji_people_outlined;
      case CommunicationStyle.technical:
        return Icons.code_outlined;
      case CommunicationStyle.executive:
        return Icons.workspace_premium_outlined;
    }
  }

  String get hint {
    switch (this) {
      case CommunicationStyle.formal:
        return 'Use professional language';
      case CommunicationStyle.casual:
        return 'Friendly, relaxed tone';
      case CommunicationStyle.technical:
        return 'Focus on specifics & data';
      case CommunicationStyle.executive:
        return 'Brief, strategic focus';
    }
  }
}

/// Animated circular gauge for engagement score
/// Displays 0-100 score with gold/emerald gradient based on value
class EngagementGauge extends StatefulWidget {
  final int score; // 0-100
  final double size;
  final double strokeWidth;
  final bool animate;
  final Duration animationDuration;

  const EngagementGauge({
    super.key,
    required this.score,
    this.size = 120,
    this.strokeWidth = 10,
    this.animate = true,
    this.animationDuration = const Duration(milliseconds: 1200),
  });

  @override
  State<EngagementGauge> createState() => _EngagementGaugeState();
}

class _EngagementGaugeState extends State<EngagementGauge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scoreAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.animationDuration,
      vsync: this,
    );

    _scoreAnimation = Tween<double>(
      begin: 0,
      end: widget.score.toDouble(),
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    if (widget.animate) {
      _controller.forward();
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(EngagementGauge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.score != widget.score) {
      _scoreAnimation =
          Tween<double>(
            begin: _scoreAnimation.value,
            end: widget.score.toDouble(),
          ).animate(
            CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
          );
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getGaugeColor(double score) {
    // Red (low) -> Yellow (medium) -> Green (high)
    if (score < 30) {
      return const Color(0xFFDC2626); // Red for low engagement
    } else if (score < 50) {
      return const Color(0xFFF97316); // Orange for low-medium
    } else if (score < 70) {
      return const Color(0xFFFBBF24); // Yellow/Amber for medium
    } else if (score < 85) {
      return LuxuryColors.champagneGold; // Gold for high
    } else {
      return LuxuryColors.successGreen; // Success green for excellent
    }
  }

  String _getEngagementLabel(double score) {
    if (score < 30) return 'Low';
    if (score < 50) return 'Fair';
    if (score < 70) return 'Good';
    if (score < 85) return 'High';
    return 'Excellent';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _scoreAnimation,
      builder: (context, child) {
        final currentScore = _scoreAnimation.value;
        final gaugeColor = _getGaugeColor(currentScore);

        return SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Background track
              CustomPaint(
                size: Size(widget.size, widget.size),
                painter: _GaugeBackgroundPainter(
                  strokeWidth: widget.strokeWidth,
                  backgroundColor: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.black.withValues(alpha: 0.08),
                ),
              ),
              // Progress arc
              CustomPaint(
                size: Size(widget.size, widget.size),
                painter: _GaugeProgressPainter(
                  progress: currentScore / 100,
                  strokeWidth: widget.strokeWidth,
                  color: gaugeColor,
                  glowColor: gaugeColor.withValues(alpha: 0.4),
                ),
              ),
              // Center content
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    currentScore.round().toString(),
                    style: IrisTheme.headlineLarge.copyWith(
                      color: gaugeColor,
                      fontWeight: FontWeight.bold,
                      fontSize: widget.size * 0.28,
                    ),
                  ),
                  Text(
                    _getEngagementLabel(currentScore),
                    style: IrisTheme.labelSmall.copyWith(
                      color: isDark
                          ? LuxuryColors.textMuted
                          : LuxuryColors.coolGray,
                      fontSize: widget.size * 0.1,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Background arc painter for the gauge
class _GaugeBackgroundPainter extends CustomPainter {
  final double strokeWidth;
  final Color backgroundColor;

  _GaugeBackgroundPainter({
    required this.strokeWidth,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final paint = Paint()
      ..color = backgroundColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Draw 270 degree arc (3/4 circle)
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi * 0.75, // Start at 135 degrees
      math.pi * 1.5, // Sweep 270 degrees
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugeBackgroundPainter oldDelegate) {
    return oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.backgroundColor != backgroundColor;
  }
}

/// Progress arc painter for the gauge
class _GaugeProgressPainter extends CustomPainter {
  final double progress; // 0.0 to 1.0
  final double strokeWidth;
  final Color color;
  final Color glowColor;

  _GaugeProgressPainter({
    required this.progress,
    required this.strokeWidth,
    required this.color,
    required this.glowColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // Draw glow effect
    final glowPaint = Paint()
      ..color = glowColor
      ..strokeWidth = strokeWidth + 6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    final sweepAngle = math.pi * 1.5 * progress;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi * 0.75,
      sweepAngle,
      false,
      glowPaint,
    );

    // Draw main progress arc
    final progressPaint = Paint()
      ..shader = SweepGradient(
        startAngle: math.pi * 0.75,
        endAngle: math.pi * 0.75 + sweepAngle,
        colors: [color.withValues(alpha: 0.7), color],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi * 0.75,
      sweepAngle,
      false,
      progressPaint,
    );

    // Draw end dot for premium feel
    if (progress > 0.02) {
      final endAngle = math.pi * 0.75 + sweepAngle;
      final dotX = center.dx + radius * math.cos(endAngle);
      final dotY = center.dy + radius * math.sin(endAngle);

      final dotPaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(dotX, dotY), strokeWidth / 2 + 2, dotPaint);

      // Inner dot highlight
      final highlightPaint = Paint()
        ..color = Colors.white.withValues(alpha: 0.8)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(dotX, dotY), strokeWidth / 4, highlightPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GaugeProgressPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}

/// Influence level badge widget
class InfluenceLevelBadge extends StatelessWidget {
  final InfluenceLevel level;
  final bool compact;

  const InfluenceLevelBadge({
    super.key,
    required this.level,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: level.color.withValues(alpha: isDark ? 0.2 : 0.15),
        borderRadius: BorderRadius.circular(compact ? 6 : 8),
        border: Border.all(color: level.color.withValues(alpha: 0.4), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(level.icon, size: compact ? 12 : 14, color: level.color),
          SizedBox(width: compact ? 4 : 6),
          Text(
            level.displayName,
            style: IrisTheme.labelSmall.copyWith(
              color: level.color,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
              fontSize: compact ? 9 : 10,
            ),
          ),
        ],
      ),
    );
  }
}

/// Communication style hint card
class CommunicationStyleCard extends StatelessWidget {
  final CommunicationStyle style;
  final VoidCallback? onTap;

  const CommunicationStyleCard({super.key, required this.style, this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap != null
          ? () {
              HapticFeedback.lightImpact();
              onTap!();
            }
          : null,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.cream.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark
                ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                : LuxuryColors.champagneGold.withValues(alpha: 0.15),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                style.icon,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    style.displayName,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    style.hint,
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Response rate indicator with trend
class ResponseRateIndicator extends StatelessWidget {
  final double rate; // 0.0 to 1.0
  final double? previousRate; // For trend comparison
  final bool showTrend;

  const ResponseRateIndicator({
    super.key,
    required this.rate,
    this.previousRate,
    this.showTrend = true,
  });

  @override
  Widget build(BuildContext context) {
    final percentage = (rate * 100).round();
    final isImproving = previousRate != null ? rate > previousRate! : null;

    Color rateColor;
    if (rate < 0.3) {
      rateColor = LuxuryColors.errorRuby;
    } else if (rate < 0.6) {
      rateColor = LuxuryColors.warningAmber;
    } else {
      rateColor = LuxuryColors.successGreen;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Percentage
        Text(
          '$percentage%',
          style: IrisTheme.titleMedium.copyWith(
            color: rateColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        // Trend indicator
        if (showTrend && isImproving != null) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color:
                  (isImproving
                          ? LuxuryColors.successGreen
                          : LuxuryColors.errorRuby)
                      .withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Icon(
              isImproving ? Icons.trending_up : Icons.trending_down,
              size: 14,
              color: isImproving
                  ? LuxuryColors.successGreen
                  : LuxuryColors.errorRuby,
            ),
          ),
        ],
      ],
    );
  }
}

/// Interest tag chip
class InterestTagChip extends StatelessWidget {
  final String label;
  final Color? color;
  final VoidCallback? onTap;

  const InterestTagChip({
    super.key,
    required this.label,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final chipColor = color ?? LuxuryColors.rolexGreen;

    return GestureDetector(
      onTap: onTap != null
          ? () {
              HapticFeedback.lightImpact();
              onTap!();
            }
          : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: chipColor.withValues(alpha: isDark ? 0.2 : 0.12),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: chipColor.withValues(alpha: 0.3), width: 1),
        ),
        child: Text(
          label,
          style: IrisTheme.labelSmall.copyWith(
            color: chipColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

/// Last contacted timestamp display
class LastContactedDisplay extends StatelessWidget {
  final DateTime? lastContacted;

  const LastContactedDisplay({super.key, this.lastContacted});

  String _formatTimestamp(DateTime? timestamp) {
    if (timestamp == null) return 'Never';

    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        if (difference.inMinutes < 5) return 'Just now';
        return '${difference.inMinutes}m ago';
      }
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '$weeks week${weeks > 1 ? 's' : ''} ago';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return '$months month${months > 1 ? 's' : ''} ago';
    } else {
      final years = (difference.inDays / 365).floor();
      return '$years year${years > 1 ? 's' : ''} ago';
    }
  }

  Color _getUrgencyColor(DateTime? timestamp) {
    if (timestamp == null) return LuxuryColors.errorRuby;

    final daysSince = DateTime.now().difference(timestamp).inDays;

    if (daysSince < 7) return LuxuryColors.successGreen;
    if (daysSince < 30) return LuxuryColors.warningAmber;
    return LuxuryColors.errorRuby;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final urgencyColor = _getUrgencyColor(lastContacted);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: urgencyColor,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: urgencyColor.withValues(alpha: 0.4),
                blurRadius: 4,
                spreadRadius: 1,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          _formatTimestamp(lastContacted),
          style: IrisTheme.bodySmall.copyWith(
            color: isDark ? LuxuryColors.textMuted : LuxuryColors.coolGray,
          ),
        ),
      ],
    );
  }
}

/// Complete engagement metrics card for contact detail page
class EngagementMetricsCard extends StatelessWidget {
  final int engagementScore;
  final double responseRate;
  final double? previousResponseRate;
  final InfluenceLevel influenceLevel;
  final CommunicationStyle communicationStyle;
  final List<String> interests;
  final DateTime? lastContacted;
  final int? totalInteractions;
  final VoidCallback? onStyleTap;

  const EngagementMetricsCard({
    super.key,
    required this.engagementScore,
    required this.responseRate,
    this.previousResponseRate,
    required this.influenceLevel,
    required this.communicationStyle,
    this.interests = const [],
    this.lastContacted,
    this.totalInteractions,
    this.onStyleTap,
  });

  /// Determine the tier based on engagement score
  LuxuryTier _getTierForScore(int score) {
    if (score >= 70) return LuxuryTier.gold; // Gold accent for high engagement
    return LuxuryTier.gold; // Default emerald
  }

  /// Build the engagement gauge widget
  Widget _buildGauge(int score) {
    return _createEngagementGauge(score)
        .animate(delay: 200.ms)
        .fadeIn()
        .scale(begin: const Offset(0.8, 0.8));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tier = _getTierForScore(engagementScore);

    return LuxuryCard(
      tier: tier,
      variant: LuxuryCardVariant.bordered,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 4,
                height: 20,
                decoration: BoxDecoration(
                  color: tier == LuxuryTier.gold
                      ? LuxuryColors.champagneGold
                      : LuxuryColors.rolexGreen,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'ENGAGEMENT METRICS',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                ),
              ),
              const Spacer(),
              InfluenceLevelBadge(level: influenceLevel, compact: true),
            ],
          ),

          const SizedBox(height: 24),

          // Gauge and stats row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Engagement gauge
              _buildGauge(engagementScore),

              const SizedBox(width: 24),

              // Stats column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Response rate
                    Text(
                      'Response Rate',
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.textMuted,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    ResponseRateIndicator(
                      rate: responseRate,
                      previousRate: previousResponseRate,
                    ).animate(delay: 300.ms).fadeIn().slideX(begin: 0.1),

                    const SizedBox(height: 16),

                    // Last contacted
                    Text(
                      'Last Contacted',
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.textMuted,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    LastContactedDisplay(
                      lastContacted: lastContacted,
                    ).animate(delay: 400.ms).fadeIn().slideX(begin: 0.1),

                    // Total interactions
                    if (totalInteractions != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Total Interactions',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      _TotalInteractionsDisplay(
                        count: totalInteractions!,
                      ).animate(delay: 450.ms).fadeIn().slideX(begin: 0.1),
                    ],
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Communication style
          CommunicationStyleCard(
            style: communicationStyle,
            onTap: onStyleTap,
          ).animate(delay: 500.ms).fadeIn().slideY(begin: 0.1),

          // Interests
          if (interests.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Interests',
              style: IrisTheme.labelSmall.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: interests
                  .take(5)
                  .map((interest) => InterestTagChip(label: interest))
                  .toList()
                  .animate(interval: 50.ms)
                  .fadeIn()
                  .scale(begin: const Offset(0.9, 0.9)),
            ),
          ],
        ],
      ),
    );
  }
}

/// Total interactions count display widget
class _TotalInteractionsDisplay extends StatelessWidget {
  final int count;

  const _TotalInteractionsDisplay({required this.count});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: LuxuryColors.rolexGreen.withValues(
              alpha: isDark ? 0.2 : 0.12,
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.sync_alt_rounded,
                size: 14,
                color: LuxuryColors.rolexGreen,
              ),
              const SizedBox(width: 6),
              Text(
                count.toString(),
                style: IrisTheme.titleSmall.copyWith(
                  color: LuxuryColors.rolexGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Mini engagement indicator for list items
class MiniEngagementIndicator extends StatelessWidget {
  final int score;
  final double size;

  const MiniEngagementIndicator({
    super.key,
    required this.score,
    this.size = 32,
  });

  Color _getColor() {
    // Red (low) -> Yellow (medium) -> Green (high)
    if (score < 30) return const Color(0xFFDC2626); // Red
    if (score < 50) return const Color(0xFFF97316); // Orange
    if (score < 70) return const Color(0xFFFBBF24); // Yellow/Amber
    if (score < 85) return LuxuryColors.champagneGold; // Gold
    return LuxuryColors.successGreen; // Success green
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColor();

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.15),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 2),
      ),
      child: Center(
        child: Text(
          score.toString(),
          style: IrisTheme.labelSmall.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: size * 0.35,
          ),
        ),
      ),
    );
  }
}
