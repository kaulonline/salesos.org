import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/quotes_service.dart';

/// Premium line item card for quotes
class LineItemCard extends StatelessWidget {
  final QuoteLineItem lineItem;
  final int index;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final bool isEditable;
  final bool showIndex;

  const LineItemCard({
    super.key,
    required this.lineItem,
    required this.index,
    this.onEdit,
    this.onDelete,
    this.isEditable = false,
    this.showIndex = true,
  });

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      borderRadius: 12,
      padding: const EdgeInsets.all(16),
      onTap: isEditable ? onEdit : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Item index badge
              if (showIndex)
                Container(
                  width: 28,
                  height: 28,
                  margin: const EdgeInsets.only(right: 12),
                  decoration: BoxDecoration(
                    gradient: LuxuryColors.goldShimmer,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '${index + 1}',
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.richBlack,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              // Item name and description
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lineItem.name,
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (lineItem.description != null &&
                        lineItem.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        lineItem.description!,
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              // Action buttons
              if (isEditable)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _ActionIconButton(
                      icon: Iconsax.edit_2,
                      onTap: onEdit,
                      color: LuxuryColors.jadePremium,
                    ),
                    const SizedBox(width: 8),
                    _ActionIconButton(
                      icon: Iconsax.trash,
                      onTap: onDelete,
                      color: LuxuryColors.errorRuby,
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 16),
          // Divider
          Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  LuxuryColors.champagneGold.withValues(alpha: 0.3),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Quantity, unit price, discount, and line total
          Row(
            children: [
              _MetricChip(
                label: 'Qty',
                value: '${lineItem.quantity}',
                isDark: isDark,
              ),
              const SizedBox(width: 12),
              _MetricChip(
                label: 'Unit',
                value: _formatCurrency(lineItem.unitPrice),
                isDark: isDark,
              ),
              if (lineItem.discount != null && lineItem.discount! > 0) ...[
                const SizedBox(width: 12),
                _MetricChip(
                  label: 'Disc',
                  value: '${lineItem.discount!.toStringAsFixed(0)}%',
                  isDark: isDark,
                  isDiscount: true,
                ),
              ],
              const Spacer(),
              // Line total
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'LINE TOTAL',
                    style: IrisTheme.caption.copyWith(
                      color: LuxuryColors.textMuted,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatCurrency(lineItem.lineTotal),
                    style: IrisTheme.titleMedium.copyWith(
                      color: LuxuryColors.champagneGold,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Small action icon button for edit/delete
class _ActionIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final Color color;

  const _ActionIconButton({
    required this.icon,
    this.onTap,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Center(
          child: Icon(
            icon,
            size: 16,
            color: color,
          ),
        ),
      ),
    );
  }
}

/// Small metric chip for displaying quantity, unit price, etc.
class _MetricChip extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final bool isDiscount;

  const _MetricChip({
    required this.label,
    required this.value,
    required this.isDark,
    this.isDiscount = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDiscount
            ? LuxuryColors.successGreen.withValues(alpha: 0.1)
            : (isDark
                ? LuxuryColors.obsidian
                : LuxuryColors.cream.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDiscount
              ? LuxuryColors.successGreen.withValues(alpha: 0.3)
              : (isDark
                  ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
                  : LuxuryColors.champagneGold.withValues(alpha: 0.1)),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            style: IrisTheme.caption.copyWith(
              color: LuxuryColors.textMuted,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            value,
            style: IrisTheme.labelSmall.copyWith(
              color: isDiscount
                  ? LuxuryColors.successGreen
                  : (isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact line item row for summary view
class CompactLineItemRow extends StatelessWidget {
  final QuoteLineItem lineItem;
  final bool isDark;

  const CompactLineItemRow({
    super.key,
    required this.lineItem,
    required this.isDark,
  });

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              lineItem.name,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 40,
            child: Text(
              '${lineItem.quantity}',
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 80,
            child: Text(
              _formatCurrency(lineItem.unitPrice),
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
              ),
              textAlign: TextAlign.right,
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 90,
            child: Text(
              _formatCurrency(lineItem.lineTotal),
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

/// Empty state for line items
class EmptyLineItemsState extends StatelessWidget {
  final VoidCallback? onAddItem;
  final bool isEditable;

  const EmptyLineItemsState({
    super.key,
    this.onAddItem,
    this.isEditable = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
              : LuxuryColors.champagneGold.withValues(alpha: 0.15),
          width: 1,
          strokeAlign: BorderSide.strokeAlignCenter,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Iconsax.box_1,
              size: 32,
              color: LuxuryColors.champagneGold,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'No Line Items',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isEditable
                ? 'Add products or services to this quote'
                : 'This quote has no line items yet',
            style: IrisTheme.bodyMedium.copyWith(
              color: LuxuryColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
          if (isEditable && onAddItem != null) ...[
            const SizedBox(height: 20),
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                onAddItem?.call();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  gradient: LuxuryColors.emeraldGradient,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.add,
                      size: 18,
                      color: LuxuryColors.diamond,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'ADD ITEM',
                      style: IrisTheme.labelMedium.copyWith(
                        color: LuxuryColors.diamond,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
