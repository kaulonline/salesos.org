import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/tax_rates_service.dart';

class TaxRateCard extends StatelessWidget {
  final TaxRate taxRate;
  final VoidCallback? onTap;
  final int animationIndex;

  const TaxRateCard({
    super.key,
    required this.taxRate,
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
                  child: Icon(Iconsax.receipt_2, size: 20,
                      color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(taxRate.name,
                          style: IrisTheme.titleSmall.copyWith(
                              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                              fontWeight: FontWeight.w600),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Text(taxRate.locationDisplay,
                          style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: (taxRate.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 6, height: 6,
                        decoration: BoxDecoration(
                            color: taxRate.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray,
                            shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    Text(taxRate.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                            color: taxRate.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray)),
                  ]),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [
                      LuxuryColors.champagneGold.withValues(alpha: 0.15),
                      LuxuryColors.warmGold.withValues(alpha: 0.1),
                    ]),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: LuxuryColors.champagneGold.withValues(alpha: 0.3)),
                  ),
                  child: Text(taxRate.rateDisplay,
                      style: IrisTheme.titleMedium.copyWith(
                          color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark,
                          fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: LuxuryColors.infoCobalt.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(taxRate.typeLabel,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: LuxuryColors.infoCobalt)),
                ),
                const Spacer(),
                if (taxRate.isDefault)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('Default', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                        color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark)),
                  ),
                if (taxRate.isCompound)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: Icon(Iconsax.layer, size: 16, color: LuxuryColors.textMuted),
                  ),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}
