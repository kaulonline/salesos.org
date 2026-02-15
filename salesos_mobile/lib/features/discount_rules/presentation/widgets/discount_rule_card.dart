import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/discount_rules_service.dart';

class DiscountRuleCard extends StatelessWidget {
  final DiscountRule rule;
  final VoidCallback? onTap;
  final int animationIndex;

  const DiscountRuleCard({
    super.key,
    required this.rule,
    this.onTap,
    this.animationIndex = 0,
  });

  Color _typeColor() {
    switch (rule.type) {
      case DiscountRuleType.VOLUME: return LuxuryColors.infoCobalt;
      case DiscountRuleType.PROMO_CODE: return LuxuryColors.champagneGold;
      case DiscountRuleType.CUSTOMER_SEGMENT: return LuxuryColors.rolexGreen;
      case DiscountRuleType.TIME_LIMITED: return LuxuryColors.warningAmber;
      case DiscountRuleType.BUNDLE: return const Color(0xFF9C27B0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final typeColor = _typeColor();

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
                    color: typeColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Iconsax.ticket_discount, size: 20, color: typeColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rule.name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        rule.typeLabel,
                        style: IrisTheme.bodySmall.copyWith(color: typeColor, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: (rule.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(width: 6, height: 6,
                          decoration: BoxDecoration(
                              color: rule.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray,
                              shape: BoxShape.circle)),
                      const SizedBox(width: 5),
                      Text(rule.isActive ? 'Active' : 'Inactive',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                              color: rule.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray)),
                    ],
                  ),
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
                      typeColor.withValues(alpha: 0.15),
                      typeColor.withValues(alpha: 0.08),
                    ]),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: typeColor.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    rule.valueDisplay,
                    style: IrisTheme.titleMedium.copyWith(
                        color: typeColor, fontWeight: FontWeight.w700),
                  ),
                ),
                const Spacer(),
                if (rule.code != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withValues(alpha: 0.08) : LuxuryColors.diamond,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Iconsax.ticket, size: 12, color: LuxuryColors.textMuted),
                        const SizedBox(width: 4),
                        Text(rule.code!, style: IrisTheme.labelSmall.copyWith(
                            color: LuxuryColors.textMuted, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                if (rule.maxUses != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: Text('${rule.currentUses}/${rule.maxUses}',
                        style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted)),
                  ),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}
