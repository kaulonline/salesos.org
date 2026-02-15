import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/integrations_service.dart';

class IntegrationCard extends StatelessWidget {
  final Integration integration;
  final VoidCallback? onTap;
  final int animationIndex;

  const IntegrationCard({
    super.key,
    required this.integration,
    this.onTap,
    this.animationIndex = 0,
  });

  IconData _categoryIcon() {
    switch (integration.category) {
      case IntegrationCategory.EMAIL: return Iconsax.sms;
      case IntegrationCategory.CALENDAR: return Iconsax.calendar;
      case IntegrationCategory.CRM: return Iconsax.people;
      case IntegrationCategory.ANALYTICS: return Iconsax.chart_2;
      case IntegrationCategory.COMMUNICATION: return Iconsax.message;
      case IntegrationCategory.STORAGE: return Iconsax.folder_2;
      case IntegrationCategory.PAYMENT: return Iconsax.card;
      case IntegrationCategory.MARKETING: return Iconsax.send_2;
    }
  }

  Color _statusColor() {
    switch (integration.status) {
      case ConnectionStatus.ACTIVE: return LuxuryColors.successGreen;
      case ConnectionStatus.INACTIVE: return LuxuryColors.warmGray;
      case ConnectionStatus.EXPIRED: return LuxuryColors.warningAmber;
      case ConnectionStatus.ERROR: return LuxuryColors.errorRuby;
      case ConnectionStatus.SYNCING: return LuxuryColors.infoCobalt;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sColor = _statusColor();

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        variant: LuxuryCardVariant.standard,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (integration.isConnected
                    ? LuxuryColors.rolexGreen
                    : LuxuryColors.champagneGold).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(_categoryIcon(), size: 24,
                  color: integration.isConnected
                      ? LuxuryColors.rolexGreen
                      : isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(integration.name,
                      style: IrisTheme.titleSmall.copyWith(
                          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(integration.categoryLabel,
                      style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted)),
                  if (integration.description != null) ...[
                    const SizedBox(height: 2),
                    Text(integration.description!,
                        style: IrisTheme.labelSmall.copyWith(color: LuxuryColors.textMuted),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ],
              ),
            ),
            // Status indicator
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: sColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 6, height: 6,
                        decoration: BoxDecoration(color: sColor, shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    Text(integration.statusLabel,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: sColor)),
                  ]),
                ),
                if (!integration.isAvailable)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('Coming Soon',
                        style: IrisTheme.labelSmall.copyWith(color: LuxuryColors.textMuted)),
                  ),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}
