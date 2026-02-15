import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/orders_service.dart';

/// Status color and icon mappings for order statuses
extension OrderStatusUI on OrderStatus {
  Color get color {
    switch (this) {
      case OrderStatus.DRAFT:
        return LuxuryColors.warmGray;
      case OrderStatus.PENDING:
        return LuxuryColors.champagneGold;
      case OrderStatus.CONFIRMED:
        return LuxuryColors.infoCobalt;
      case OrderStatus.PROCESSING:
        return LuxuryColors.warningAmber;
      case OrderStatus.SHIPPED:
        return LuxuryColors.jadePremium;
      case OrderStatus.DELIVERED:
        return LuxuryColors.successGreen;
      case OrderStatus.COMPLETED:
        return LuxuryColors.rolexGreen;
      case OrderStatus.CANCELLED:
        return LuxuryColors.errorRuby;
      case OrderStatus.RETURNED:
        return LuxuryColors.warningAmber;
    }
  }

  IconData get icon {
    switch (this) {
      case OrderStatus.DRAFT:
        return Iconsax.document_text;
      case OrderStatus.PENDING:
        return Iconsax.timer;
      case OrderStatus.CONFIRMED:
        return Iconsax.tick_circle;
      case OrderStatus.PROCESSING:
        return Iconsax.box;
      case OrderStatus.SHIPPED:
        return Iconsax.truck;
      case OrderStatus.DELIVERED:
        return Iconsax.tick_square;
      case OrderStatus.COMPLETED:
        return Iconsax.shield_tick;
      case OrderStatus.CANCELLED:
        return Iconsax.close_circle;
      case OrderStatus.RETURNED:
        return Iconsax.undo;
    }
  }
}

extension FulfillmentStatusUI on FulfillmentStatus {
  Color get color {
    switch (this) {
      case FulfillmentStatus.UNFULFILLED:
        return LuxuryColors.warmGray;
      case FulfillmentStatus.PARTIAL:
        return LuxuryColors.warningAmber;
      case FulfillmentStatus.FULFILLED:
        return LuxuryColors.successGreen;
      case FulfillmentStatus.RETURNED:
        return LuxuryColors.warningAmber;
    }
  }
}

extension PaymentStatusUI on PaymentStatus {
  Color get color {
    switch (this) {
      case PaymentStatus.PENDING:
        return LuxuryColors.warmGray;
      case PaymentStatus.PARTIAL:
        return LuxuryColors.warningAmber;
      case PaymentStatus.PAID:
        return LuxuryColors.successGreen;
      case PaymentStatus.REFUNDED:
        return LuxuryColors.infoCobalt;
      case PaymentStatus.FAILED:
        return LuxuryColors.errorRuby;
    }
  }
}

/// Premium order card widget with luxury design
class OrderCard extends StatelessWidget {
  final OrderModel order;
  final VoidCallback? onTap;
  final int animationIndex;

  const OrderCard({
    super.key,
    required this.order,
    this.onTap,
    this.animationIndex = 0,
  });

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(2)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  String _formatDate(DateTime date) {
    return DateFormat('MMM d, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
                : LuxuryColors.champagneGold.withValues(alpha: 0.2),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.3)
                  : Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Status color indicator
            Container(
              width: 4,
              height: 56,
              decoration: BoxDecoration(
                color: order.status.color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 14),

            // Main content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Order number and status row
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          order.orderNumber.isNotEmpty ? order.orderNumber : (order.name ?? 'Order'),
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      _OrderStatusBadge(status: order.status),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Account name
                  Text(
                    order.accountName ?? order.contactName ?? 'No account',
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),

                  // Bottom row: payment/fulfillment badges and date
                  Row(
                    children: [
                      // Payment status
                      _MiniStatusBadge(
                        label: order.paymentStatus.label,
                        color: order.paymentStatus.color,
                      ),
                      const SizedBox(width: 6),
                      // Fulfillment status
                      _MiniStatusBadge(
                        label: order.fulfillmentStatus.label,
                        color: order.fulfillmentStatus.color,
                      ),
                      const Spacer(),
                      // Date
                      Icon(
                        Iconsax.calendar,
                        size: 12,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDate(order.orderDate ?? order.createdAt),
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 12),

            // Amount
            Text(
              _formatAmount(order.total),
              style: IrisTheme.titleSmall.copyWith(
                color: isDark
                    ? LuxuryColors.champagneGold
                    : LuxuryColors.champagneGoldDark,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 40).ms).fadeIn().slideX(begin: 0.03);
  }
}

/// Status badge widget for order status
class _OrderStatusBadge extends StatelessWidget {
  final OrderStatus status;

  const _OrderStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: status.color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            status.icon,
            size: 12,
            color: status.color,
          ),
          const SizedBox(width: 4),
          Text(
            status.label,
            style: IrisTheme.labelSmall.copyWith(
              color: status.color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Mini status badge for payment and fulfillment
class _MiniStatusBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _MiniStatusBadge({
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: IrisTheme.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w500,
          fontSize: 10,
        ),
      ),
    );
  }
}

/// Full order card widget (expanded view, used in detail references)
class FullOrderCard extends StatelessWidget {
  final OrderModel order;
  final VoidCallback? onTap;
  final int animationIndex;

  const FullOrderCard({
    super.key,
    required this.order,
    this.onTap,
    this.animationIndex = 0,
  });

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(2)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

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
            // Header row - Order number and status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.box,
                        size: 18,
                        color: isDark
                            ? LuxuryColors.champagneGold
                            : LuxuryColors.champagneGoldDark,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.orderNumber,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          DateFormat('MMM d, yyyy').format(order.createdAt),
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                _OrderStatusBadge(status: order.status),
              ],
            ),
            const SizedBox(height: 16),

            // Account info
            if (order.accountName != null) ...[
              Row(
                children: [
                  Icon(
                    Iconsax.building,
                    size: 16,
                    color: LuxuryColors.textMuted,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      order.accountName!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],

            // Amount row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        LuxuryColors.warmGold.withValues(alpha: 0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    _formatAmount(order.total),
                    style: IrisTheme.titleMedium.copyWith(
                      color: isDark
                          ? LuxuryColors.champagneGold
                          : LuxuryColors.champagneGoldDark,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                // Line items count
                Row(
                  children: [
                    Icon(
                      Iconsax.box_1,
                      size: 14,
                      color: LuxuryColors.textMuted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${order.lineItems.length} item${order.lineItems.length != 1 ? 's' : ''}',
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}
