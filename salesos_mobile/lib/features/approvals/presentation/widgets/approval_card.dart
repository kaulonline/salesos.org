import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../data/approvals_service.dart';

/// Approval card widget for list display
/// Shows approval details, amount, requester, type badge, and approve/reject buttons
class ApprovalCard extends StatelessWidget {
  final ApprovalModel approval;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;
  final bool isProcessing;

  const ApprovalCard({
    super.key,
    required this.approval,
    this.onApprove,
    this.onReject,
    this.isProcessing = false,
  });

  Color _typeColor(ApprovalType type) {
    switch (type) {
      case ApprovalType.QUOTE:
        return LuxuryColors.infoCobalt;
      case ApprovalType.DISCOUNT:
        return LuxuryColors.warningAmber;
      case ApprovalType.ORDER:
        return LuxuryColors.jadePremium;
      case ApprovalType.CONTRACT:
        return LuxuryColors.socialPurple;
      case ApprovalType.EXPENSE:
        return LuxuryColors.roseGold;
      case ApprovalType.OTHER:
        return LuxuryColors.textMuted;
    }
  }

  IconData _typeIcon(ApprovalType type) {
    switch (type) {
      case ApprovalType.QUOTE:
        return Iconsax.document;
      case ApprovalType.DISCOUNT:
        return Iconsax.percentage_square;
      case ApprovalType.ORDER:
        return Iconsax.shopping_cart;
      case ApprovalType.CONTRACT:
        return Iconsax.document_text;
      case ApprovalType.EXPENSE:
        return Iconsax.wallet_money;
      case ApprovalType.OTHER:
        return Iconsax.task_square;
    }
  }

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${NumberFormat('#,##0').format(amount)}';
    } else {
      return '\$${amount.toStringAsFixed(2)}';
    }
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final typeCol = _typeColor(approval.type);

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: type badge, time, and amount
          Row(
            children: [
              // Type icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: typeCol.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _typeIcon(approval.type),
                  size: 20,
                  color: typeCol,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Entity name or description
                    Text(
                      approval.entityName ?? approval.description ?? 'Approval Request',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    // Requester and time
                    Row(
                      children: [
                        Icon(
                          Iconsax.user,
                          size: 12,
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          approval.requesterName,
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatTimeAgo(approval.createdAt),
                          style: IrisTheme.caption.copyWith(
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
              // Amount
              if (approval.amount != null) ...[
                const SizedBox(width: 8),
                Text(
                  _formatAmount(approval.amount!),
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),

          // Description (if different from entity name)
          if (approval.description != null &&
              approval.description != approval.entityName) ...[
            const SizedBox(height: 10),
            Text(
              approval.description!,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
                height: 1.4,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],

          const SizedBox(height: 12),

          // Type badge and action buttons row
          Row(
            children: [
              // Type badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: typeCol.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  approval.type.label,
                  style: IrisTheme.labelSmall.copyWith(
                    color: typeCol,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              // Reject button
              GestureDetector(
                onTap: isProcessing
                    ? null
                    : () {
                        HapticFeedback.mediumImpact();
                        onReject?.call();
                      },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: LuxuryColors.errorRuby.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.close_circle,
                        size: 16,
                        color: LuxuryColors.errorRuby,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Reject',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.errorRuby,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Approve button
              GestureDetector(
                onTap: isProcessing
                    ? null
                    : () {
                        HapticFeedback.mediumImpact();
                        onApprove?.call();
                      },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Iconsax.tick_circle,
                        size: 16,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Approve',
                        style: IrisTheme.labelSmall.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
