import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'dart:math' as math;
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// Factory function to create LuxuryCard - workaround for analyzer issue
Widget _createLuxuryCard({
  required Widget child,
  LuxuryTier tier = LuxuryTier.gold,
  LuxuryCardVariant variant = LuxuryCardVariant.standard,
  EdgeInsetsGeometry padding = const EdgeInsets.all(16),
  VoidCallback? onTap,
}) {
  return LuxuryCard(
    tier: tier,
    variant: variant,
    padding: padding,
    onTap: onTap,
    child: child,
  );
}

/// Deal health status classification
enum DealHealthStatus {
  healthy('Healthy', 'On Track'),
  atRisk('At Risk', 'Needs Attention'),
  stalled('Stalled', 'No Activity'),
  critical('Critical', 'Immediate Action');

  final String label;
  final String description;
  const DealHealthStatus(this.label, this.description);
}

/// Deal velocity classification
enum DealVelocity {
  fast('Fast', 'Ahead of schedule'),
  normal('Normal', 'On schedule'),
  slow('Slow', 'Behind schedule');

  final String label;
  final String description;
  const DealVelocity(this.label, this.description);
}

/// Risk factor for a deal
class DealRiskFactor {
  final String title;
  final String description;
  final IconData icon;
  final DealHealthStatus severity;

  const DealRiskFactor({
    required this.title,
    required this.description,
    required this.icon,
    required this.severity,
  });
}

/// Model for deal health data
class DealHealthData {
  final int healthScore; // 0-100
  final DealHealthStatus status;
  final DealVelocity velocity;
  final int daysInStage;
  final int averageDaysInStage;
  final int daysSinceLastActivity;
  final DateTime? predictedCloseDate;
  final DateTime? originalCloseDate;
  final List<DealRiskFactor> riskFactors;

  const DealHealthData({
    required this.healthScore,
    required this.status,
    required this.velocity,
    required this.daysInStage,
    required this.averageDaysInStage,
    this.daysSinceLastActivity = 0,
    this.predictedCloseDate,
    this.originalCloseDate,
    this.riskFactors = const [],
  });

  /// Calculate health data from deal information
  factory DealHealthData.fromDeal(Map<String, dynamic> deal) {
    // Parse dates
    final createdAt = deal['createdAt'] as String? ??
        deal['CreatedDate'] as String? ??
        DateTime.now().toIso8601String();
    final updatedAt = deal['updatedAt'] as String? ??
        deal['LastModifiedDate'] as String? ??
        createdAt;
    final closeDate = deal['closeDate'] as String? ?? deal['CloseDate'] as String?;
    final stageChangedAt = deal['stageChangedAt'] as String? ?? updatedAt;

    final createdDate = DateTime.tryParse(createdAt) ?? DateTime.now();
    final lastModified = DateTime.tryParse(updatedAt) ?? DateTime.now();
    final stageChangeDate = DateTime.tryParse(stageChangedAt) ?? createdDate;
    final expectedClose = closeDate != null ? DateTime.tryParse(closeDate) : null;

    // Calculate days
    final now = DateTime.now();
    final daysInStage = now.difference(stageChangeDate).inDays;
    final daysSinceActivity = now.difference(lastModified).inDays;

    // Get stage for average days calculation
    final stage = deal['stage'] as String? ?? deal['StageName'] as String? ?? '';
    final averageDays = _getAverageDaysForStage(stage);

    // Calculate health score
    int score = 100;
    final riskFactors = <DealRiskFactor>[];

    // Deduct for stalled activity (7+ days)
    if (daysSinceActivity >= 7) {
      score -= (daysSinceActivity - 6) * 5;
      riskFactors.add(DealRiskFactor(
        title: 'No Recent Activity',
        description: '$daysSinceActivity days since last update',
        icon: Iconsax.timer_pause,
        severity: daysSinceActivity >= 14 ? DealHealthStatus.critical : DealHealthStatus.atRisk,
      ));
    }

    // Deduct for being over average time in stage
    if (daysInStage > averageDays) {
      final overDays = daysInStage - averageDays;
      score -= overDays * 3;
      riskFactors.add(DealRiskFactor(
        title: 'Extended Stage Duration',
        description: '$overDays days over average',
        icon: Iconsax.clock,
        severity: overDays > 7 ? DealHealthStatus.atRisk : DealHealthStatus.stalled,
      ));
    }

    // Deduct for approaching/past close date
    if (expectedClose != null) {
      final daysToClose = expectedClose.difference(now).inDays;
      if (daysToClose < 0) {
        score -= 20;
        riskFactors.add(DealRiskFactor(
          title: 'Past Close Date',
          description: '${-daysToClose} days overdue',
          icon: Iconsax.calendar_remove,
          severity: DealHealthStatus.critical,
        ));
      } else if (daysToClose <= 7) {
        score -= 5;
        riskFactors.add(DealRiskFactor(
          title: 'Close Date Approaching',
          description: '$daysToClose days remaining',
          icon: Iconsax.calendar_tick,
          severity: DealHealthStatus.atRisk,
        ));
      }
    }

    // Clamp score
    score = score.clamp(0, 100);

    // Determine status
    DealHealthStatus status;
    if (daysSinceActivity >= 7) {
      status = daysSinceActivity >= 14 ? DealHealthStatus.critical : DealHealthStatus.stalled;
    } else if (score >= 80) {
      status = DealHealthStatus.healthy;
    } else if (score >= 50) {
      status = DealHealthStatus.atRisk;
    } else {
      status = DealHealthStatus.critical;
    }

    // Determine velocity
    DealVelocity velocity;
    if (daysInStage < averageDays * 0.7) {
      velocity = DealVelocity.fast;
    } else if (daysInStage <= averageDays * 1.3) {
      velocity = DealVelocity.normal;
    } else {
      velocity = DealVelocity.slow;
    }

    // Calculate predicted close date
    DateTime? predictedClose;
    if (expectedClose != null) {
      if (velocity == DealVelocity.slow) {
        // Add extra days based on slowdown
        final delayDays = ((daysInStage - averageDays) * 1.5).toInt();
        predictedClose = expectedClose.add(Duration(days: delayDays));
      } else {
        predictedClose = expectedClose;
      }
    }

    return DealHealthData(
      healthScore: score,
      status: status,
      velocity: velocity,
      daysInStage: daysInStage,
      averageDaysInStage: averageDays,
      daysSinceLastActivity: daysSinceActivity,
      predictedCloseDate: predictedClose,
      originalCloseDate: expectedClose,
      riskFactors: riskFactors,
    );
  }

  static int _getAverageDaysForStage(String stage) {
    final normalized = stage.toLowerCase().replaceAll(' ', '').replaceAll('_', '').replaceAll('/', '');
    if (normalized.contains('prospecting')) return 14;
    if (normalized.contains('qualification') || normalized.contains('qualified')) return 10;
    if (normalized.contains('needsanalysis')) return 10;
    if (normalized.contains('valueproposition')) return 7;
    if (normalized.contains('decisionmakers')) return 10;
    if (normalized.contains('perceptionanalysis')) return 7;
    if (normalized.contains('proposal')) return 7;
    if (normalized.contains('negotiat')) return 14;
    return 10; // Default
  }
}

/// Circular health score gauge widget
class DealHealthGauge extends StatelessWidget {
  final int score;
  final double size;
  final bool showLabel;
  final bool animate;

  const DealHealthGauge({
    super.key,
    required this.score,
    this.size = 80,
    this.showLabel = true,
    this.animate = true,
  });

  Color _getScoreColor(int score) {
    if (score >= 80) return LuxuryColors.rolexGreen;
    if (score >= 60) return LuxuryColors.jadePremium;
    if (score >= 40) return LuxuryColors.champagneGold;
    if (score >= 20) return LuxuryColors.warningAmber;
    return const Color(0xFFB91C1C); // Muted red
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scoreColor = _getScoreColor(score);

    Widget gauge = SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _GaugePainter(
          score: score / 100,
          color: scoreColor,
          backgroundColor: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.black.withValues(alpha: 0.1),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$score',
                style: IrisTheme.headlineMedium.copyWith(
                  color: scoreColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (showLabel)
                Text(
                  'Health',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
            ],
          ),
        ),
      ),
    );

    if (animate) {
      gauge = gauge.animate(delay: 200.ms).scale(begin: const Offset(0.8, 0.8));
    }

    return gauge;
  }
}

/// Custom painter for the circular gauge
class _GaugePainter extends CustomPainter {
  final double score;
  final Color color;
  final Color backgroundColor;

  _GaugePainter({
    required this.score,
    required this.color,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 12) / 2;
    const strokeWidth = 8.0;
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
      sweepAngle * score,
      false,
      scorePaint,
    );

    // Glow effect
    final glowPaint = Paint()
      ..color = color.withValues(alpha: 0.3)
      ..strokeWidth = strokeWidth + 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle * score,
      false,
      glowPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) {
    return oldDelegate.score != score || oldDelegate.color != color;
  }
}

/// Health status badge for deal cards
class DealHealthBadge extends StatelessWidget {
  final DealHealthStatus status;
  final bool compact;
  final bool showIcon;

  const DealHealthBadge({
    super.key,
    required this.status,
    this.compact = false,
    this.showIcon = true,
  });

  Color _getStatusColor() {
    switch (status) {
      case DealHealthStatus.healthy:
        return LuxuryColors.rolexGreen;
      case DealHealthStatus.atRisk:
        return LuxuryColors.champagneGold;
      case DealHealthStatus.stalled:
        return LuxuryColors.warningAmber;
      case DealHealthStatus.critical:
        return const Color(0xFFB91C1C);
    }
  }

  IconData _getStatusIcon() {
    switch (status) {
      case DealHealthStatus.healthy:
        return Iconsax.tick_circle;
      case DealHealthStatus.atRisk:
        return Iconsax.warning_2;
      case DealHealthStatus.stalled:
        return Iconsax.timer_pause;
      case DealHealthStatus.critical:
        return Iconsax.danger;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor();

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 10,
        vertical: compact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(compact ? 4 : 6),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(
              _getStatusIcon(),
              size: compact ? 10 : 12,
              color: color,
            ),
            SizedBox(width: compact ? 3 : 5),
          ],
          Text(
            status.label,
            style: (compact ? IrisTheme.caption : IrisTheme.labelSmall).copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Velocity indicator badge
class DealVelocityBadge extends StatelessWidget {
  final DealVelocity velocity;
  final bool compact;

  const DealVelocityBadge({
    super.key,
    required this.velocity,
    this.compact = false,
  });

  Color _getVelocityColor() {
    switch (velocity) {
      case DealVelocity.fast:
        return LuxuryColors.rolexGreen;
      case DealVelocity.normal:
        return LuxuryColors.jadePremium;
      case DealVelocity.slow:
        return LuxuryColors.warningAmber;
    }
  }

  IconData _getVelocityIcon() {
    switch (velocity) {
      case DealVelocity.fast:
        return Iconsax.flash_1;
      case DealVelocity.normal:
        return Iconsax.arrow_right_1;
      case DealVelocity.slow:
        return Iconsax.timer_1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _getVelocityColor();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          _getVelocityIcon(),
          size: compact ? 12 : 14,
          color: color,
        ),
        SizedBox(width: compact ? 3 : 5),
        Text(
          velocity.label,
          style: (compact ? IrisTheme.caption : IrisTheme.labelSmall).copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Days in stage indicator with comparison to average
class DaysInStageIndicator extends StatelessWidget {
  final int daysInStage;
  final int averageDays;
  final bool compact;

  const DaysInStageIndicator({
    super.key,
    required this.daysInStage,
    required this.averageDays,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isOverAverage = daysInStage > averageDays;
    final progressRatio = (daysInStage / averageDays).clamp(0.0, 2.0) / 2.0;

    Color progressColor;
    if (daysInStage <= averageDays * 0.7) {
      progressColor = LuxuryColors.rolexGreen;
    } else if (daysInStage <= averageDays) {
      progressColor = LuxuryColors.jadePremium;
    } else if (daysInStage <= averageDays * 1.5) {
      progressColor = LuxuryColors.champagneGold;
    } else {
      progressColor = LuxuryColors.warningAmber;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '$daysInStage days',
              style: (compact ? IrisTheme.labelMedium : IrisTheme.titleSmall).copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              'avg: $averageDays',
              style: IrisTheme.labelSmall.copyWith(
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          height: compact ? 4 : 6,
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(3),
          ),
          child: Stack(
            children: [
              // Average marker
              Positioned(
                left: (1.0 / 2.0) * MediaQuery.of(context).size.width * 0.3, // Approximate
                child: Container(
                  width: 2,
                  height: compact ? 4 : 6,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.3)
                      : Colors.black.withValues(alpha: 0.3),
                ),
              ),
              // Progress
              FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: progressRatio.clamp(0.0, 1.0),
                child: Container(
                  decoration: BoxDecoration(
                    color: progressColor,
                    borderRadius: BorderRadius.circular(3),
                    boxShadow: [
                      BoxShadow(
                        color: progressColor.withValues(alpha: 0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        if (isOverAverage) ...[
          const SizedBox(height: 4),
          Text(
            '+${daysInStage - averageDays} days over average',
            style: IrisTheme.caption.copyWith(
              color: LuxuryColors.warningAmber,
            ),
          ),
        ],
      ],
    );
  }
}

/// Complete health card for deal detail page
class DealHealthCard extends StatelessWidget {
  final DealHealthData health;
  final VoidCallback? onTap;

  const DealHealthCard({
    super.key,
    required this.health,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _createLuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.accent,
      onTap: onTap != null
          ? () {
              HapticFeedback.lightImpact();
              onTap!();
            }
          : null,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            children: [
              // Health Gauge
              DealHealthGauge(
                score: health.healthScore,
                size: 72,
              ),
              const SizedBox(width: 16),
              // Status and Velocity
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DealHealthBadge(status: health.status),
                    const SizedBox(height: 8),
                    DealVelocityBadge(velocity: health.velocity),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Days in Stage
          Text(
            'Time in Current Stage',
            style: IrisTheme.labelMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          DaysInStageIndicator(
            daysInStage: health.daysInStage,
            averageDays: health.averageDaysInStage,
          ),

          // Predicted Close Date
          if (health.predictedCloseDate != null) ...[
            const SizedBox(height: 16),
            _buildDateRow(
              context,
              'Predicted Close',
              health.predictedCloseDate!,
              health.originalCloseDate,
            ),
          ],

          // Risk Factors
          if (health.riskFactors.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'Risk Factors',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 8),
            ...health.riskFactors.map((risk) => _buildRiskFactor(context, risk)),
          ],

          // Last Activity
          if (health.daysSinceLastActivity > 0) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: (health.daysSinceLastActivity >= 7
                        ? LuxuryColors.warningAmber
                        : LuxuryColors.jadePremium)
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    health.daysSinceLastActivity >= 7
                        ? Iconsax.timer_pause
                        : Iconsax.clock,
                    size: 16,
                    color: health.daysSinceLastActivity >= 7
                        ? LuxuryColors.warningAmber
                        : LuxuryColors.jadePremium,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Last activity ${health.daysSinceLastActivity} day${health.daysSinceLastActivity == 1 ? '' : 's'} ago',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05);
  }

  Widget _buildDateRow(
    BuildContext context,
    String label,
    DateTime date,
    DateTime? originalDate,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDelayed = originalDate != null && date.isAfter(originalDate);
    final now = DateTime.now();
    final isPast = date.isBefore(now);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: IrisTheme.bodySmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        Row(
          children: [
            if (isDelayed)
              Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: LuxuryColors.warningAmber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Delayed',
                  style: IrisTheme.caption.copyWith(
                    color: LuxuryColors.warningAmber,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            Icon(
              Iconsax.calendar,
              size: 14,
              color: isPast
                  ? const Color(0xFFB91C1C)
                  : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
            ),
            const SizedBox(width: 4),
            Text(
              _formatDate(date),
              style: IrisTheme.bodySmall.copyWith(
                color: isPast
                    ? const Color(0xFFB91C1C)
                    : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRiskFactor(BuildContext context, DealRiskFactor risk) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color severityColor;
    switch (risk.severity) {
      case DealHealthStatus.healthy:
        severityColor = LuxuryColors.rolexGreen;
        break;
      case DealHealthStatus.atRisk:
        severityColor = LuxuryColors.champagneGold;
        break;
      case DealHealthStatus.stalled:
        severityColor = LuxuryColors.warningAmber;
        break;
      case DealHealthStatus.critical:
        severityColor = const Color(0xFFB91C1C);
        break;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(top: 5),
            decoration: BoxDecoration(
              color: severityColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  risk.title,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  risk.description,
                  style: IrisTheme.caption.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Compact health indicator for list cards
class CompactDealHealthIndicator extends StatelessWidget {
  final DealHealthData health;
  final bool showVelocity;

  const CompactDealHealthIndicator({
    super.key,
    required this.health,
    this.showVelocity = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        DealHealthBadge(
          status: health.status,
          compact: true,
          showIcon: true,
        ),
        if (showVelocity) ...[
          const SizedBox(width: 8),
          DealVelocityBadge(
            velocity: health.velocity,
            compact: true,
          ),
        ],
      ],
    );
  }
}

/// Stalled badge (quick access for 7+ days no activity)
class StalledBadge extends StatelessWidget {
  final int daysSinceActivity;

  const StalledBadge({
    super.key,
    required this.daysSinceActivity,
  });

  @override
  Widget build(BuildContext context) {
    if (daysSinceActivity < 7) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: LuxuryColors.warningAmber.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: LuxuryColors.warningAmber.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Iconsax.timer_pause,
            size: 10,
            color: LuxuryColors.warningAmber,
          ),
          const SizedBox(width: 3),
          Text(
            'Stalled',
            style: IrisTheme.caption.copyWith(
              color: LuxuryColors.warningAmber,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Recommended action model for deal health
class DealRecommendedAction {
  final String title;
  final String description;
  final IconData icon;
  final DealHealthStatus priority;
  final String? actionRoute;

  const DealRecommendedAction({
    required this.title,
    required this.description,
    required this.icon,
    required this.priority,
    this.actionRoute,
  });

  /// Generate recommended actions based on deal health data
  static List<DealRecommendedAction> generateActions(DealHealthData health, Map<String, dynamic> deal) {
    final actions = <DealRecommendedAction>[];

    // Check for stalled activity
    if (health.daysSinceLastActivity >= 14) {
      actions.add(const DealRecommendedAction(
        title: 'Schedule Follow-up Call',
        description: 'No activity for 14+ days. Re-engage with the contact immediately.',
        icon: Iconsax.call,
        priority: DealHealthStatus.critical,
        actionRoute: '/activity/new?type=call',
      ));
    } else if (health.daysSinceLastActivity >= 7) {
      actions.add(const DealRecommendedAction(
        title: 'Send Check-in Email',
        description: 'Touch base with the prospect to maintain momentum.',
        icon: Iconsax.sms,
        priority: DealHealthStatus.atRisk,
        actionRoute: '/activity/new?type=email',
      ));
    }

    // Get deal ID for navigation routes
    final dealId = deal['id'] as String? ?? deal['Id'] as String? ?? '';

    // Check for extended stage duration
    if (health.daysInStage > health.averageDaysInStage * 1.5) {
      actions.add(DealRecommendedAction(
        title: 'Review Deal Blockers',
        description: 'Deal is taking longer than usual. Identify and address any obstacles.',
        icon: Iconsax.warning_2,
        priority: DealHealthStatus.atRisk,
        actionRoute: dealId.isNotEmpty ? '/iris?context=deal_blockers&dealId=$dealId' : null,
      ));
    }

    // Check for past close date
    if (health.originalCloseDate != null && health.originalCloseDate!.isBefore(DateTime.now())) {
      actions.add(DealRecommendedAction(
        title: 'Update Close Date',
        description: 'Expected close date has passed. Set a new realistic target.',
        icon: Iconsax.calendar_edit,
        priority: DealHealthStatus.critical,
        actionRoute: dealId.isNotEmpty ? '/deals/$dealId?action=edit_close_date' : null,
      ));
    }

    // Check for approaching close date
    if (health.originalCloseDate != null) {
      final daysToClose = health.originalCloseDate!.difference(DateTime.now()).inDays;
      if (daysToClose > 0 && daysToClose <= 7) {
        actions.add(const DealRecommendedAction(
          title: 'Prepare Final Proposal',
          description: 'Close date approaching. Ensure all stakeholders are aligned.',
          icon: Iconsax.document_text,
          priority: DealHealthStatus.atRisk,
        ));
      }
    }

    // Stage-specific recommendations
    final stage = deal['stage'] as String? ?? deal['StageName'] as String? ?? '';
    final normalizedStage = stage.toLowerCase().replaceAll(' ', '');

    if (normalizedStage.contains('prospecting') && health.daysInStage > 10) {
      actions.add(const DealRecommendedAction(
        title: 'Qualify the Lead',
        description: 'Time to assess budget, authority, need, and timeline.',
        icon: Iconsax.tick_circle,
        priority: DealHealthStatus.stalled,
      ));
    } else if (normalizedStage.contains('proposal') && health.daysInStage > 5) {
      actions.add(const DealRecommendedAction(
        title: 'Follow Up on Proposal',
        description: 'Check if the proposal was reviewed and address questions.',
        icon: Iconsax.message_question,
        priority: DealHealthStatus.atRisk,
      ));
    } else if (normalizedStage.contains('negotiat') && health.daysInStage > 10) {
      actions.add(const DealRecommendedAction(
        title: 'Schedule Decision Meeting',
        description: 'Negotiations extended. Push for a final decision meeting.',
        icon: Iconsax.calendar,
        priority: DealHealthStatus.critical,
      ));
    }

    // If healthy but no other actions, suggest maintaining momentum
    if (actions.isEmpty && health.status == DealHealthStatus.healthy) {
      actions.add(const DealRecommendedAction(
        title: 'Continue Engagement',
        description: 'Deal is on track. Maintain regular communication.',
        icon: Iconsax.tick_square,
        priority: DealHealthStatus.healthy,
      ));
    }

    // Sort by priority (critical first)
    actions.sort((a, b) {
      const priorityOrder = {
        DealHealthStatus.critical: 0,
        DealHealthStatus.atRisk: 1,
        DealHealthStatus.stalled: 2,
        DealHealthStatus.healthy: 3,
      };
      return (priorityOrder[a.priority] ?? 3).compareTo(priorityOrder[b.priority] ?? 3);
    });

    return actions;
  }
}

/// Next best action widget - prominent CTA based on deal health
class NextBestActionCard extends StatelessWidget {
  final DealRecommendedAction action;
  final VoidCallback? onTap;

  const NextBestActionCard({
    super.key,
    required this.action,
    this.onTap,
  });

  Color _getPriorityColor() {
    switch (action.priority) {
      case DealHealthStatus.healthy:
        return LuxuryColors.rolexGreen;
      case DealHealthStatus.atRisk:
        return LuxuryColors.champagneGold;
      case DealHealthStatus.stalled:
        return LuxuryColors.warningAmber;
      case DealHealthStatus.critical:
        return const Color(0xFFB91C1C);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _getPriorityColor();

    return GestureDetector(
      onTap: onTap != null
          ? () {
              HapticFeedback.lightImpact();
              onTap!();
            }
          : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withValues(alpha: isDark ? 0.2 : 0.1),
              color.withValues(alpha: isDark ? 0.1 : 0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                action.icon,
                size: 22,
                color: color,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'NEXT BEST ACTION',
                        style: IrisTheme.caption.copyWith(
                          color: color,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          action.priority.label.toUpperCase(),
                          style: IrisTheme.caption.copyWith(
                            color: color,
                            fontWeight: FontWeight.w600,
                            fontSize: 9,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    action.title,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    action.description,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 8),
              Icon(
                Iconsax.arrow_right_3,
                size: 20,
                color: color,
              ),
            ],
          ],
        ),
      ),
    ).animate(delay: 150.ms).fadeIn().slideX(begin: 0.05);
  }
}

/// Recommended actions list widget
class RecommendedActionsList extends StatelessWidget {
  final List<DealRecommendedAction> actions;
  final Function(DealRecommendedAction)? onActionTap;
  final int maxItems;

  const RecommendedActionsList({
    super.key,
    required this.actions,
    this.onActionTap,
    this.maxItems = 3,
  });

  Color _getPriorityColor(DealHealthStatus priority) {
    switch (priority) {
      case DealHealthStatus.healthy:
        return LuxuryColors.rolexGreen;
      case DealHealthStatus.atRisk:
        return LuxuryColors.champagneGold;
      case DealHealthStatus.stalled:
        return LuxuryColors.warningAmber;
      case DealHealthStatus.critical:
        return const Color(0xFFB91C1C);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final displayActions = actions.take(maxItems).toList();

    if (displayActions.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recommended Actions',
          style: IrisTheme.labelMedium.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 10),
        ...displayActions.asMap().entries.map((entry) {
          final index = entry.key;
          final action = entry.value;
          final color = _getPriorityColor(action.priority);

          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: onActionTap != null
                  ? () {
                      HapticFeedback.lightImpact();
                      onActionTap!(action);
                    }
                  : null,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark
                      ? LuxuryColors.obsidian.withValues(alpha: 0.5)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : Colors.black.withValues(alpha: 0.05),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: color.withValues(alpha: 0.4),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Icon(
                      action.icon,
                      size: 18,
                      color: color,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            action.title,
                            style: IrisTheme.bodySmall.copyWith(
                              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            action.description,
                            style: IrisTheme.caption.copyWith(
                              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    if (onActionTap != null)
                      Icon(
                        Iconsax.arrow_right_3,
                        size: 16,
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                  ],
                ),
              ),
            ).animate(delay: (100 + index * 50).ms).fadeIn().slideX(begin: 0.03),
          );
        }),
      ],
    );
  }
}

/// Enhanced health card with recommended actions
class EnhancedDealHealthCard extends StatelessWidget {
  final DealHealthData health;
  final Map<String, dynamic> deal;
  final VoidCallback? onTap;
  final Function(DealRecommendedAction)? onActionTap;
  final bool showNextBestAction;
  final bool showRecommendedActions;

  const EnhancedDealHealthCard({
    super.key,
    required this.health,
    required this.deal,
    this.onTap,
    this.onActionTap,
    this.showNextBestAction = true,
    this.showRecommendedActions = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final recommendedActions = DealRecommendedAction.generateActions(health, deal);
    final nextBestAction = recommendedActions.isNotEmpty ? recommendedActions.first : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Next Best Action (prominent CTA)
        if (showNextBestAction && nextBestAction != null && health.status != DealHealthStatus.healthy) ...[
          NextBestActionCard(
            action: nextBestAction,
            onTap: onActionTap != null ? () => onActionTap!(nextBestAction) : null,
          ),
          const SizedBox(height: 16),
        ],

        // Health Overview Card
        _createLuxuryCard(
          tier: LuxuryTier.gold,
          variant: LuxuryCardVariant.accent,
          onTap: onTap != null
              ? () {
                  HapticFeedback.lightImpact();
                  onTap!();
                }
              : null,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  // Health Gauge
                  DealHealthGauge(
                    score: health.healthScore,
                    size: 72,
                  ),
                  const SizedBox(width: 16),
                  // Status and Velocity
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        DealHealthBadge(status: health.status),
                        const SizedBox(height: 8),
                        DealVelocityBadge(velocity: health.velocity),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Days in Stage
              Text(
                'Time in Current Stage',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 8),
              DaysInStageIndicator(
                daysInStage: health.daysInStage,
                averageDays: health.averageDaysInStage,
              ),

              // Predicted Close Date
              if (health.predictedCloseDate != null) ...[
                const SizedBox(height: 16),
                _buildDateRow(
                  context,
                  'Predicted Close',
                  health.predictedCloseDate!,
                  health.originalCloseDate,
                ),
              ],

              // Risk Factors
              if (health.riskFactors.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text(
                  'Risk Factors',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                ...health.riskFactors.map((risk) => _buildRiskFactor(context, risk)),
              ],

              // Last Activity
              if (health.daysSinceLastActivity > 0) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: (health.daysSinceLastActivity >= 7
                            ? LuxuryColors.warningAmber
                            : LuxuryColors.jadePremium)
                        .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        health.daysSinceLastActivity >= 7
                            ? Iconsax.timer_pause
                            : Iconsax.clock,
                        size: 16,
                        color: health.daysSinceLastActivity >= 7
                            ? LuxuryColors.warningAmber
                            : LuxuryColors.jadePremium,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Last activity ${health.daysSinceLastActivity} day${health.daysSinceLastActivity == 1 ? '' : 's'} ago',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

        // Recommended Actions (below health card)
        if (showRecommendedActions && recommendedActions.length > 1) ...[
          const SizedBox(height: 20),
          RecommendedActionsList(
            actions: recommendedActions.skip(1).toList(), // Skip first since it's shown as Next Best Action
            onActionTap: onActionTap,
            maxItems: 2,
          ),
        ],
      ],
    );
  }

  Widget _buildDateRow(
    BuildContext context,
    String label,
    DateTime date,
    DateTime? originalDate,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDelayed = originalDate != null && date.isAfter(originalDate);
    final now = DateTime.now();
    final isPast = date.isBefore(now);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: IrisTheme.bodySmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        Row(
          children: [
            if (isDelayed)
              Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: LuxuryColors.warningAmber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Delayed',
                  style: IrisTheme.caption.copyWith(
                    color: LuxuryColors.warningAmber,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            Icon(
              Iconsax.calendar,
              size: 14,
              color: isPast
                  ? const Color(0xFFB91C1C)
                  : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
            ),
            const SizedBox(width: 4),
            Text(
              _formatDate(date),
              style: IrisTheme.bodySmall.copyWith(
                color: isPast
                    ? const Color(0xFFB91C1C)
                    : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRiskFactor(BuildContext context, DealRiskFactor risk) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color severityColor;
    switch (risk.severity) {
      case DealHealthStatus.healthy:
        severityColor = LuxuryColors.rolexGreen;
        break;
      case DealHealthStatus.atRisk:
        severityColor = LuxuryColors.champagneGold;
        break;
      case DealHealthStatus.stalled:
        severityColor = LuxuryColors.warningAmber;
        break;
      case DealHealthStatus.critical:
        severityColor = const Color(0xFFB91C1C);
        break;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(top: 5),
            decoration: BoxDecoration(
              color: severityColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  risk.title,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  risk.description,
                  style: IrisTheme.caption.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Small health dot indicator for compact card views
class DealHealthDot extends StatelessWidget {
  final DealHealthStatus status;
  final double size;
  final bool animated;

  const DealHealthDot({
    super.key,
    required this.status,
    this.size = 8,
    this.animated = false,
  });

  Color _getStatusColor() {
    switch (status) {
      case DealHealthStatus.healthy:
        return LuxuryColors.rolexGreen;
      case DealHealthStatus.atRisk:
        return LuxuryColors.champagneGold;
      case DealHealthStatus.stalled:
        return LuxuryColors.warningAmber;
      case DealHealthStatus.critical:
        return const Color(0xFFB91C1C);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor();

    Widget dot = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.4),
            blurRadius: 4,
            spreadRadius: 1,
          ),
        ],
      ),
    );

    if (animated && (status == DealHealthStatus.critical || status == DealHealthStatus.atRisk)) {
      // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
      dot = ExcludeSemantics(
        child: RepaintBoundary(
          child: dot
              .animate(onPlay: (controller) => controller.repeat(reverse: true))
              .scale(
                begin: const Offset(1.0, 1.0),
                end: const Offset(1.2, 1.2),
                duration: 800.ms,
              ),
        ),
      );
    }

    return dot;
  }
}
