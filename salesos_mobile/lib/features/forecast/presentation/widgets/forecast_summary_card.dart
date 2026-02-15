import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Compact card showing a forecast metric with progress bar
class ForecastSummaryCard extends StatelessWidget {
  final String label;
  final double value;
  final double? target;
  final Color color;
  final IconData icon;
  final int delayMs;

  const ForecastSummaryCard({
    super.key,
    required this.label,
    required this.value,
    this.target,
    required this.color,
    required this.icon,
    this.delayMs = 0,
  });

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(0)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pct = (target != null && target! > 0) ? (value / target!).clamp(0.0, 1.0) : 0.0;
    final pctLabel = (target != null && target! > 0)
        ? '${(value / target! * 100).toStringAsFixed(0)}%'
        : '--';

    return LuxuryCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
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
                    Text(
                      label,
                      style: IrisTheme.caption.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatAmount(value),
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              if (target != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    pctLabel,
                    style: IrisTheme.labelSmall.copyWith(
                      color: color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          if (target != null) ...[
            const SizedBox(height: 12),
            LuxuryProgress(
              value: pct,
              color: color,
              height: 5,
            ),
            const SizedBox(height: 4),
            Text(
              'of ${_formatAmount(target!)} target',
              style: IrisTheme.caption.copyWith(
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
            ),
          ],
        ],
      ),
    ).animate(delay: delayMs.ms).fadeIn(duration: 400.ms).slideY(begin: 0.1);
  }
}
