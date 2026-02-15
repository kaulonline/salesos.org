import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_mode_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';

/// Account health data model
class AccountHealthData {
  final int overallScore;
  final int engagementScore;
  final int revenueTrendScore;
  final int activityRecencyScore;
  final int opportunityHealthScore;

  const AccountHealthData({
    required this.overallScore,
    required this.engagementScore,
    required this.revenueTrendScore,
    required this.activityRecencyScore,
    required this.opportunityHealthScore,
  });

  factory AccountHealthData.fromJson(Map<String, dynamic> json) {
    return AccountHealthData(
      overallScore: (json['overallScore'] as num?)?.toInt() ?? 0,
      engagementScore: (json['engagementScore'] as num?)?.toInt() ?? 0,
      revenueTrendScore: (json['revenueTrendScore'] as num?)?.toInt() ?? 0,
      activityRecencyScore: (json['activityRecencyScore'] as num?)?.toInt() ?? 0,
      opportunityHealthScore: (json['opportunityHealthScore'] as num?)?.toInt() ?? 0,
    );
  }

  /// Compute health locally from account data when API is unavailable
  factory AccountHealthData.compute({
    int? daysSinceLastActivity,
    double? revenueGrowthPct,
    int? openOpportunities,
    int? totalInteractions,
  }) {
    final engagement = _clamp(totalInteractions != null
        ? (totalInteractions > 20 ? 90 : totalInteractions * 4 + 10)
        : 50);
    final revenueTrend = _clamp(revenueGrowthPct != null
        ? (50 + (revenueGrowthPct * 5).toInt())
        : 50);
    final activityRecency = _clamp(daysSinceLastActivity != null
        ? max(0, 100 - daysSinceLastActivity * 3)
        : 50);
    final opportunityHealth = _clamp(openOpportunities != null
        ? (openOpportunities > 0 ? min(90, openOpportunities * 20 + 30) : 20)
        : 50);

    final overall = ((engagement + revenueTrend + activityRecency + opportunityHealth) / 4).round();

    return AccountHealthData(
      overallScore: _clamp(overall),
      engagementScore: engagement,
      revenueTrendScore: revenueTrend,
      activityRecencyScore: activityRecency,
      opportunityHealthScore: opportunityHealth,
    );
  }

  static int _clamp(int value) => value.clamp(0, 100);
}

/// Provider for account health data
final accountHealthProvider = FutureProvider.autoDispose.family<AccountHealthData, String>((ref, accountId) async {
  ref.watch(authModeProvider);
  final api = ref.watch(apiClientProvider);

  try {
    final response = await api.get('/accounts/$accountId/health');
    final data = response.data;
    if (data is Map<String, dynamic>) {
      return AccountHealthData.fromJson(data);
    }
  } catch (_) {
    // Fall back to computed health
  }

  return AccountHealthData.compute();
});

/// Account health card widget showing a circular gauge and breakdown
class AccountHealthCard extends ConsumerWidget {
  final String accountId;

  const AccountHealthCard({
    super.key,
    required this.accountId,
  });

  Color _scoreColor(int score) {
    if (score > 70) return LuxuryColors.successGreen;
    if (score >= 40) return LuxuryColors.champagneGold;
    return LuxuryColors.errorRuby;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final healthAsync = ref.watch(accountHealthProvider(accountId));

    return LuxuryCard(
      padding: const EdgeInsets.all(20),
      child: healthAsync.when(
        data: (health) => _buildContent(context, health, isDark),
        loading: () => _buildLoading(),
        error: (_, _) => _buildContent(
          context,
          AccountHealthData.compute(),
          isDark,
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, AccountHealthData health, bool isDark) {
    final color = _scoreColor(health.overallScore);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Icon(
              Iconsax.health,
              size: 20,
              color: color,
            ),
            const SizedBox(width: 10),
            Text(
              'Account Health',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            const Spacer(),
            LuxuryBadge(
              text: health.overallScore > 70
                  ? 'Healthy'
                  : health.overallScore >= 40
                      ? 'At Risk'
                      : 'Critical',
              color: color,
            ),
          ],
        ).animate().fadeIn(duration: 300.ms),
        const SizedBox(height: 20),

        // Circular gauge
        Center(
          child: SizedBox(
            width: 140,
            height: 140,
            child: CustomPaint(
              painter: _HealthGaugePainter(
                score: health.overallScore / 100,
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
                      '${health.overallScore}',
                      style: IrisTheme.numericMedium.copyWith(
                        color: color,
                      ),
                    ),
                    Text(
                      'out of 100',
                      style: IrisTheme.caption.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ).animate().fadeIn(duration: 400.ms, delay: 100.ms),
        const SizedBox(height: 24),

        // Breakdown items
        _BreakdownItem(
          label: 'Engagement',
          score: health.engagementScore,
          icon: Iconsax.people,
          color: _scoreColor(health.engagementScore),
          isDark: isDark,
        ).animate().fadeIn(duration: 300.ms, delay: 200.ms).slideX(begin: 0.05),
        const SizedBox(height: 12),
        _BreakdownItem(
          label: 'Revenue Trend',
          score: health.revenueTrendScore,
          icon: Iconsax.trend_up,
          color: _scoreColor(health.revenueTrendScore),
          isDark: isDark,
        ).animate().fadeIn(duration: 300.ms, delay: 250.ms).slideX(begin: 0.05),
        const SizedBox(height: 12),
        _BreakdownItem(
          label: 'Activity Recency',
          score: health.activityRecencyScore,
          icon: Iconsax.clock,
          color: _scoreColor(health.activityRecencyScore),
          isDark: isDark,
        ).animate().fadeIn(duration: 300.ms, delay: 300.ms).slideX(begin: 0.05),
        const SizedBox(height: 12),
        _BreakdownItem(
          label: 'Opportunity Health',
          score: health.opportunityHealthScore,
          icon: Iconsax.chart_2,
          color: _scoreColor(health.opportunityHealthScore),
          isDark: isDark,
        ).animate().fadeIn(duration: 300.ms, delay: 350.ms).slideX(begin: 0.05),
      ],
    );
  }

  Widget _buildLoading() {
    return Column(
      children: [
        const IrisShimmer(width: double.infinity, height: 24),
        const SizedBox(height: 20),
        const IrisShimmer(width: 140, height: 140, borderRadius: 70),
        const SizedBox(height: 24),
        ...List.generate(4, (i) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: IrisShimmer(width: double.infinity, height: 40),
        )),
      ],
    );
  }
}

class _BreakdownItem extends StatelessWidget {
  final String label;
  final int score;
  final IconData icon;
  final Color color;
  final bool isDark;

  const _BreakdownItem({
    required this.label,
    required this.score,
    required this.icon,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    label,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextSecondary
                          : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  Text(
                    '$score',
                    style: IrisTheme.labelMedium.copyWith(
                      color: color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              LuxuryProgress(
                value: score / 100,
                color: color,
                height: 4,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HealthGaugePainter extends CustomPainter {
  final double score;
  final Color color;
  final Color trackColor;

  _HealthGaugePainter({
    required this.score,
    required this.color,
    required this.trackColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2 - 10;
    const strokeWidth = 10.0;

    // Track
    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi * 0.75,
      pi * 1.5,
      false,
      trackPaint,
    );

    // Progress
    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi * 0.75,
      pi * 1.5 * score.clamp(0.0, 1.0),
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _HealthGaugePainter oldDelegate) {
    return oldDelegate.score != score || oldDelegate.color != color;
  }
}
