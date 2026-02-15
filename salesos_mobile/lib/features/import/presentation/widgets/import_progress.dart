import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/import_service.dart';

class ImportProgress extends StatelessWidget {
  final ImportJobModel job;

  const ImportProgress({super.key, required this.job});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.accent,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _statusIcon,
                  color: _statusColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job.fileName,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _statusText,
                      style: IrisTheme.bodySmall.copyWith(
                        color: _statusColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              LuxuryBadge(
                text: job.status,
                color: _statusColor,
                tier: LuxuryTier.gold,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: job.progress),
              duration: const Duration(milliseconds: 800),
              curve: Curves.easeOutCubic,
              builder: (context, value, _) {
                return LinearProgressIndicator(
                  value: value,
                  minHeight: 8,
                  backgroundColor:
                      isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.08),
                  valueColor: AlwaysStoppedAnimation<Color>(_statusColor),
                );
              },
            ),
          ),
          const SizedBox(height: 14),

          // Stats row
          Row(
            children: [
              _StatChip(
                label: 'Total',
                value: '${job.totalRows}',
                icon: Iconsax.document,
                color: LuxuryColors.textMuted,
              ),
              const SizedBox(width: 12),
              _StatChip(
                label: 'Processed',
                value: '${job.processedRows}',
                icon: Iconsax.tick_circle,
                color: LuxuryColors.successGreen,
              ),
              const SizedBox(width: 12),
              _StatChip(
                label: 'Errors',
                value: '${job.errorCount}',
                icon: Iconsax.close_circle,
                color: job.errorCount > 0
                    ? LuxuryColors.errorRuby
                    : LuxuryColors.textMuted,
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Color get _statusColor {
    if (job.isComplete) return LuxuryColors.successGreen;
    if (job.hasFailed) return LuxuryColors.errorRuby;
    if (job.isProcessing) return LuxuryColors.champagneGold;
    return LuxuryColors.warningAmber;
  }

  IconData get _statusIcon {
    if (job.isComplete) return Iconsax.tick_circle;
    if (job.hasFailed) return Iconsax.close_circle;
    if (job.isProcessing) return Iconsax.refresh;
    return Iconsax.clock;
  }

  String get _statusText {
    if (job.isComplete) return 'Import completed successfully';
    if (job.hasFailed) return 'Import failed';
    if (job.isProcessing) {
      return 'Processing ${job.processedRows} of ${job.totalRows} rows...';
    }
    return 'Pending...';
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatChip({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 4),
            Text(
              value,
              style: IrisTheme.bodySmall.copyWith(
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
            Text(
              label,
              style: IrisTheme.labelSmall.copyWith(
                color: LuxuryColors.textMuted,
                fontSize: 9,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
