import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/quotes_service.dart';

/// Status badge colors and styling
extension QuoteStatusUI on QuoteStatus {
  Color get uiColor {
    switch (this) {
      case QuoteStatus.DRAFT:
        return LuxuryColors.warmGray;
      case QuoteStatus.PENDING_APPROVAL:
        return LuxuryColors.warningAmber;
      case QuoteStatus.APPROVED:
        return LuxuryColors.jadePremium;
      case QuoteStatus.SENT:
        return LuxuryColors.infoCobalt;
      case QuoteStatus.VIEWED:
        return LuxuryColors.infoCobalt;
      case QuoteStatus.ACCEPTED:
        return LuxuryColors.successGreen;
      case QuoteStatus.REJECTED:
        return LuxuryColors.errorRuby;
      case QuoteStatus.EXPIRED:
        return LuxuryColors.warningAmber;
      case QuoteStatus.CANCELLED:
        return LuxuryColors.textMuted;
    }
  }

  IconData get icon {
    switch (this) {
      case QuoteStatus.DRAFT:
        return Iconsax.document_text;
      case QuoteStatus.PENDING_APPROVAL:
        return Iconsax.clock;
      case QuoteStatus.APPROVED:
        return Iconsax.verify;
      case QuoteStatus.SENT:
        return Iconsax.send_2;
      case QuoteStatus.VIEWED:
        return Iconsax.eye;
      case QuoteStatus.ACCEPTED:
        return Iconsax.tick_circle;
      case QuoteStatus.REJECTED:
        return Iconsax.close_circle;
      case QuoteStatus.EXPIRED:
        return Iconsax.timer;
      case QuoteStatus.CANCELLED:
        return Iconsax.close_square;
    }
  }
}

/// Premium quote card widget with luxury design
class QuoteCard extends StatelessWidget {
  final QuoteModel quote;
  final VoidCallback? onTap;
  final int animationIndex;

  const QuoteCard({
    super.key,
    required this.quote,
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
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        variant: LuxuryCardVariant.standard,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header row - Quote number and status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Quote number
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.document_text,
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
                          quote.quoteNumber,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _formatDate(quote.createdAt),
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                // Status badge
                _StatusBadge(status: quote.status),
              ],
            ),

            const SizedBox(height: 16),

            // Customer info
            Row(
              children: [
                LuxuryAvatar(
                  initials: quote.customerName.isNotEmpty
                      ? quote.customerName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join()
                      : '?',
                  size: 40,
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        quote.customerName,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (quote.customerCompany != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          quote.customerCompany!,
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
              ],
            ),

            const SizedBox(height: 16),

            // Amount and expiry row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Amount with gold accent
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
                    _formatAmount(quote.subtotal),
                    style: IrisTheme.titleMedium.copyWith(
                      color: isDark
                          ? LuxuryColors.champagneGold
                          : LuxuryColors.champagneGoldDark,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),

                // Expiry info
                if (quote.expirationDate != null) _ExpiryIndicator(quote: quote),
              ],
            ),

            // Description if available
            if (quote.description != null) ...[
              const SizedBox(height: 12),
              Text(
                quote.description!,
                style: IrisTheme.bodySmall.copyWith(
                  color: LuxuryColors.textMuted,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            // Linked deal indicator
            if (quote.dealName != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.link,
                      size: 14,
                      color: LuxuryColors.rolexGreen,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        quote.dealName!,
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.rolexGreen,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}

/// Status badge widget
class _StatusBadge extends StatelessWidget {
  final QuoteStatus status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final statusColor = status.uiColor;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            status.icon,
            size: 14,
            color: statusColor,
          ),
          const SizedBox(width: 6),
          Text(
            status.label,
            style: IrisTheme.labelSmall.copyWith(
              color: statusColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Expiry indicator widget
class _ExpiryIndicator extends StatelessWidget {
  final QuoteModel quote;

  const _ExpiryIndicator({required this.quote});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final daysLeft = quote.daysUntilExpiry;
    final isExpired = quote.isExpired;

    Color color;
    String text;

    if (isExpired) {
      color = LuxuryColors.errorRuby;
      text = 'Expired';
    } else if (daysLeft <= 3) {
      color = LuxuryColors.errorRuby;
      text = daysLeft == 0 ? 'Expires today' : '$daysLeft days left';
    } else if (daysLeft <= 7) {
      color = LuxuryColors.warningAmber;
      text = '$daysLeft days left';
    } else {
      color = isDark ? LuxuryColors.textMuted : IrisTheme.lightTextTertiary;
      text = 'Expires ${DateFormat('MMM d').format(quote.expirationDate!)}';
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Iconsax.calendar,
          size: 14,
          color: color,
        ),
        const SizedBox(width: 6),
        Text(
          text,
          style: IrisTheme.labelSmall.copyWith(
            color: color,
            fontWeight: isExpired || daysLeft <= 7 ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Compact quote card for list views with less detail
class CompactQuoteCard extends StatelessWidget {
  final QuoteModel quote;
  final VoidCallback? onTap;
  final int animationIndex;

  const CompactQuoteCard({
    super.key,
    required this.quote,
    this.onTap,
    this.animationIndex = 0,
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
              height: 50,
              decoration: BoxDecoration(
                color: quote.status.uiColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 14),

            // Main content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          quote.quoteNumber,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                          ),
                        ),
                      ),
                      _StatusBadge(status: quote.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${quote.customerName}${quote.customerCompany != null ? ' - ${quote.customerCompany}' : ''}',
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            const SizedBox(width: 12),

            // Amount
            Text(
              _formatAmount(quote.subtotal),
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
