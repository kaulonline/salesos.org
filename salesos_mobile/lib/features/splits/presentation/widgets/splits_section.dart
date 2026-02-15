import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../data/splits_service.dart';

/// Section widget for displaying revenue splits on deal detail pages.
/// Takes a dealId parameter and fetches splits for that deal.
class SplitsSection extends ConsumerWidget {
  final String dealId;

  const SplitsSection({super.key, required this.dealId});

  String _formatAmount(double amount) {
    if (amount >= 1000000) return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    if (amount >= 1000) return '\$${(amount / 1000).toStringAsFixed(1)}K';
    return '\$${amount.toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final splitsAsync = ref.watch(dealSplitsProvider(dealId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LuxurySectionHeader(
          title: 'Revenue Splits',
          subtitle: 'Team allocation',
          tier: LuxuryTier.gold,
        ),
        const SizedBox(height: 12),
        splitsAsync.when(
          loading: () => const IrisCardShimmer(height: 160),
          error: (err, _) => LuxuryCard(
            tier: LuxuryTier.gold,
            padding: const EdgeInsets.all(20),
            child: Center(
              child: Text(
                'Failed to load splits',
                style: IrisTheme.bodySmall.copyWith(
                  color: LuxuryColors.textMuted,
                ),
              ),
            ),
          ),
          data: (splits) {
            if (splits.isEmpty) {
              return LuxuryCard(
                tier: LuxuryTier.gold,
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Column(
                    children: [
                      Icon(
                        Iconsax.chart,
                        size: 32,
                        color: LuxuryColors.textMuted.withValues(alpha: 0.4),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'No revenue splits',
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return LuxuryCard(
              tier: LuxuryTier.gold,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pie chart
                  Center(
                    child: SizedBox(
                      width: 140,
                      height: 140,
                      child: CustomPaint(
                        painter: _SplitPieChartPainter(
                          splits: splits,
                          isDark: isDark,
                        ),
                      ),
                    ),
                  ).animate().fadeIn(delay: 100.ms).scale(
                        begin: const Offset(0.8, 0.8),
                        duration: 400.ms,
                      ),
                  const SizedBox(height: 20),

                  // Splits list
                  ...splits.asMap().entries.map((entry) {
                    final i = entry.key;
                    final split = entry.value;
                    final color = _splitColors[i % _splitColors.length];

                    return Padding(
                      padding: EdgeInsets.only(
                          bottom: i < splits.length - 1 ? 12 : 0),
                      child: Row(
                        children: [
                          // Color indicator
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Rep avatar
                          LuxuryAvatar(
                            initials: _initials(split.repName ?? 'Rep'),
                            size: 32,
                            tier: LuxuryTier.gold,
                          ),
                          const SizedBox(width: 10),
                          // Rep name
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  split.repName ?? 'Unknown Rep',
                                  style: IrisTheme.bodySmall.copyWith(
                                    color: isDark
                                        ? LuxuryColors.textOnDark
                                        : LuxuryColors.textOnLight,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                Text(
                                  _formatAmount(split.amount),
                                  style: IrisTheme.labelSmall.copyWith(
                                    color: LuxuryColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Percentage
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${split.percentage.toStringAsFixed(0)}%',
                              style: IrisTheme.bodySmall.copyWith(
                                color: color,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ).animate().fadeIn(
                            delay: Duration(milliseconds: 150 + (50 * i)),
                          ),
                    );
                  }),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  static const _splitColors = [
    LuxuryColors.champagneGold,
    LuxuryColors.rolexGreen,
    LuxuryColors.infoCobalt,
    LuxuryColors.roseGold,
    LuxuryColors.warningAmber,
    LuxuryColors.socialPurple,
  ];
}

/// Custom painter for the pie chart
class _SplitPieChartPainter extends CustomPainter {
  final List<SplitModel> splits;
  final bool isDark;

  _SplitPieChartPainter({required this.splits, required this.isDark});

  static const _colors = [
    LuxuryColors.champagneGold,
    LuxuryColors.rolexGreen,
    LuxuryColors.infoCobalt,
    LuxuryColors.roseGold,
    LuxuryColors.warningAmber,
    LuxuryColors.socialPurple,
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2;
    final innerRadius = radius * 0.55;

    double startAngle = -math.pi / 2; // Start from top

    final totalPercentage =
        splits.fold<double>(0, (sum, s) => sum + s.percentage);

    for (var i = 0; i < splits.length; i++) {
      final split = splits[i];
      final sweepAngle =
          totalPercentage > 0 ? (split.percentage / totalPercentage) * 2 * math.pi : 0.0;

      final paint = Paint()
        ..color = _colors[i % _colors.length]
        ..style = PaintingStyle.fill;

      // Draw arc
      final path = Path()
        ..moveTo(
          center.dx + innerRadius * math.cos(startAngle),
          center.dy + innerRadius * math.sin(startAngle),
        )
        ..lineTo(
          center.dx + radius * math.cos(startAngle),
          center.dy + radius * math.sin(startAngle),
        )
        ..arcTo(
          Rect.fromCircle(center: center, radius: radius),
          startAngle,
          sweepAngle,
          false,
        )
        ..lineTo(
          center.dx + innerRadius * math.cos(startAngle + sweepAngle),
          center.dy + innerRadius * math.sin(startAngle + sweepAngle),
        )
        ..arcTo(
          Rect.fromCircle(center: center, radius: innerRadius),
          startAngle + sweepAngle,
          -sweepAngle,
          false,
        )
        ..close();

      canvas.drawPath(path, paint);

      // Add a thin separator line
      final separatorPaint = Paint()
        ..color = isDark ? LuxuryColors.richBlack : Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;

      canvas.drawLine(
        Offset(
          center.dx + innerRadius * math.cos(startAngle),
          center.dy + innerRadius * math.sin(startAngle),
        ),
        Offset(
          center.dx + radius * math.cos(startAngle),
          center.dy + radius * math.sin(startAngle),
        ),
        separatorPaint,
      );

      startAngle += sweepAngle;
    }

    // Draw center circle (donut hole)
    final centerPaint = Paint()
      ..color = isDark ? LuxuryColors.obsidian : Colors.white
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, innerRadius - 1, centerPaint);
  }

  @override
  bool shouldRepaint(covariant _SplitPieChartPainter oldDelegate) {
    return oldDelegate.splits != splits || oldDelegate.isDark != isDark;
  }
}
