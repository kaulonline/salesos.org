import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/price_books_service.dart';

class PriceBookCard extends StatelessWidget {
  final PriceBook priceBook;
  final VoidCallback? onTap;
  final int animationIndex;

  const PriceBookCard({
    super.key,
    required this.priceBook,
    this.onTap,
    this.animationIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        variant: LuxuryCardVariant.standard,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.book,
                    size: 20,
                    color: isDark
                        ? LuxuryColors.champagneGold
                        : LuxuryColors.champagneGoldDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        priceBook.name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (priceBook.description != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          priceBook.description!,
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                _StatusBadge(isActive: priceBook.isActive),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                if (priceBook.isStandard)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Text(
                      'Standard',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? LuxuryColors.champagneGold
                            : LuxuryColors.champagneGoldDark,
                      ),
                    ),
                  ),
                if (priceBook.isStandard) const SizedBox(width: 8),
                if (priceBook.currency != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : LuxuryColors.diamond,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      priceBook.currency!,
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                const Spacer(),
                Text(
                  '${priceBook.entries.length} entries',
                  style: IrisTheme.bodySmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}

class _StatusBadge extends StatelessWidget {
  final bool isActive;
  const _StatusBadge({required this.isActive});

  @override
  Widget build(BuildContext context) {
    final color = isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6, height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            isActive ? 'Active' : 'Inactive',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
          ),
        ],
      ),
    );
  }
}
