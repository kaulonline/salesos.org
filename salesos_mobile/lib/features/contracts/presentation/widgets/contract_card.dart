import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';

import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/contracts_service.dart';

/// Contract status badge widget
class ContractStatusBadge extends StatelessWidget {
  final ContractStatus status;
  final bool compact;

  const ContractStatusBadge({
    super.key,
    required this.status,
    this.compact = false,
  });

  Color _getBackgroundColor(bool isDark) {
    switch (status) {
      case ContractStatus.DRAFT:
        return isDark
            ? IrisTheme.darkTextTertiary.withValues(alpha: 0.15)
            : IrisTheme.lightTextTertiary.withValues(alpha: 0.15);
      case ContractStatus.PENDING:
        return IrisTheme.irisGold.withValues(alpha: 0.15);
      case ContractStatus.ACTIVE:
        return LuxuryColors.rolexGreen.withValues(alpha: 0.15);
      case ContractStatus.EXPIRED:
        return IrisTheme.irisGoldDark.withValues(alpha: 0.15);
      case ContractStatus.TERMINATED:
        return IrisTheme.irisBrown.withValues(alpha: 0.15);
    }
  }

  Color _getTextColor(bool isDark) {
    switch (status) {
      case ContractStatus.DRAFT:
        return isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary;
      case ContractStatus.PENDING:
        return IrisTheme.irisGold;
      case ContractStatus.ACTIVE:
        return LuxuryColors.rolexGreen;
      case ContractStatus.EXPIRED:
        return IrisTheme.irisGoldDark;
      case ContractStatus.TERMINATED:
        return IrisTheme.irisBrown;
    }
  }

  IconData _getIcon() {
    switch (status) {
      case ContractStatus.DRAFT:
        return Iconsax.edit_2;
      case ContractStatus.PENDING:
        return Iconsax.clock;
      case ContractStatus.ACTIVE:
        return Iconsax.tick_circle;
      case ContractStatus.EXPIRED:
        return Iconsax.timer;
      case ContractStatus.TERMINATED:
        return Iconsax.close_circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = _getBackgroundColor(isDark);
    final textColor = _getTextColor(isDark);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(compact ? 6 : 8),
        border: Border.all(
          color: textColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getIcon(),
            size: compact ? 12 : 14,
            color: textColor,
          ),
          SizedBox(width: compact ? 4 : 6),
          Text(
            status.label,
            style: (compact ? IrisTheme.labelSmall : IrisTheme.labelMedium).copyWith(
              color: textColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Contract card widget for list view
class ContractCard extends StatelessWidget {
  final ContractModel contract;
  final VoidCallback? onTap;
  final int animationIndex;

  const ContractCard({
    super.key,
    required this.contract,
    this.onTap,
    this.animationIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 0);
    final dateFormat = DateFormat('MMM d, yyyy');

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: LuxuryCard(
        variant: LuxuryCardVariant.bordered,
        tier: contract.status == ContractStatus.ACTIVE
            ? LuxuryTier.gold
            : LuxuryTier.gold,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header row with contract number and status
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Contract icon
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: contract.status == ContractStatus.ACTIVE
                        ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                        : LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.document_text,
                    size: 22,
                    color: contract.status == ContractStatus.ACTIVE
                        ? LuxuryColors.rolexGreen
                        : LuxuryColors.champagneGold,
                  ),
                ),
                const SizedBox(width: 12),
                // Contract info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        contract.contractNumber,
                        style: IrisTheme.labelMedium.copyWith(
                          color: contract.status == ContractStatus.ACTIVE
                              ? LuxuryColors.rolexGreen
                              : LuxuryColors.champagneGold,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        contract.name ?? 'Contract',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                ContractStatusBadge(status: contract.status, compact: true),
              ],
            ),

            const SizedBox(height: 14),

            // Account name row
            if (contract.accountName != null) ...[
              Row(
                children: [
                  Icon(
                    Iconsax.building,
                    size: 14,
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      contract.accountName!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],

            // Divider
            Container(
              height: 1,
              color: isDark
                  ? IrisTheme.darkBorder.withValues(alpha: 0.5)
                  : IrisTheme.lightBorder,
            ),

            const SizedBox(height: 12),

            // Bottom row with value and dates
            Row(
              children: [
                // Contract value
                if (contract.value != null) ...[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VALUE',
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          currencyFormat.format(contract.value),
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Start date
                if (contract.startDate != null) ...[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'START',
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          dateFormat.format(contract.startDate!),
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // End date with expiring soon indicator
                if (contract.endDate != null) ...[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'END',
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextTertiary
                                : IrisTheme.lightTextTertiary,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Text(
                              dateFormat.format(contract.endDate!),
                              style: IrisTheme.bodySmall.copyWith(
                                color: contract.isExpiringSoon
                                    ? IrisTheme.irisGoldDark
                                    : (isDark
                                        ? IrisTheme.darkTextSecondary
                                        : IrisTheme.lightTextSecondary),
                                fontWeight: contract.isExpiringSoon
                                    ? FontWeight.w600
                                    : FontWeight.normal,
                              ),
                            ),
                            if (contract.isExpiringSoon) ...[
                              const SizedBox(width: 4),
                              Icon(
                                Iconsax.warning_2,
                                size: 12,
                                color: IrisTheme.irisGoldDark,
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),

            // Expiring soon warning
            if (contract.isExpiringSoon && contract.daysUntilExpiry != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: IrisTheme.irisGoldDark.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: IrisTheme.irisGoldDark.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.timer_1,
                      size: 14,
                      color: IrisTheme.irisGoldDark,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Expires in ${contract.daysUntilExpiry} days',
                      style: IrisTheme.labelSmall.copyWith(
                        color: IrisTheme.irisGoldDark,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 60).ms).fadeIn().slideY(begin: 0.05);
  }
}

/// Compact contract card for related lists
class CompactContractCard extends StatelessWidget {
  final ContractModel contract;
  final VoidCallback? onTap;

  const CompactContractCard({
    super.key,
    required this.contract,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Iconsax.document_text,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
            ),
            const SizedBox(width: 10),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contract.contractNumber,
                    style: IrisTheme.labelMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (contract.value != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      currencyFormat.format(contract.value),
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            ContractStatusBadge(status: contract.status, compact: true),
          ],
        ),
      ),
    );
  }
}
