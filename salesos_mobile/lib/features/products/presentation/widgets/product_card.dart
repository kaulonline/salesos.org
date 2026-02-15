import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/products_service.dart';

/// Premium product card widget with luxury design
class ProductCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback? onTap;
  final int animationIndex;

  const ProductCard({
    super.key,
    required this.product,
    this.onTap,
    this.animationIndex = 0,
  });

  String _formatPrice(double price) {
    if (price >= 1000000) {
      return '\$${(price / 1000000).toStringAsFixed(2)}M';
    } else if (price >= 1000) {
      return '\$${(price / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${price.toStringAsFixed(2)}';
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
            // Header row: Product icon + active status
            Row(
              children: [
                // Product icon container
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.box_1,
                    size: 20,
                    color: isDark
                        ? LuxuryColors.champagneGold
                        : LuxuryColors.champagneGoldDark,
                  ),
                ),
                const SizedBox(width: 12),
                // Product name and SKU
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (product.sku != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          'SKU: ${product.sku}',
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
                // Active/Inactive indicator
                _ActiveBadge(isActive: product.isActive),
              ],
            ),

            const SizedBox(height: 14),

            // Price row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Unit price with gold accent
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
                    _formatPrice(product.unitPrice),
                    style: IrisTheme.titleMedium.copyWith(
                      color: isDark
                          ? LuxuryColors.champagneGold
                          : LuxuryColors.champagneGoldDark,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                // Category badge
                if (product.category != null)
                  _CategoryBadge(category: product.category!),
              ],
            ),

            // Family tag
            if (product.family != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(
                    Iconsax.folder_2,
                    size: 14,
                    color: LuxuryColors.rolexGreen,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      product.family!,
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
            ],
          ],
        ),
      ),
    ).animate(delay: (animationIndex * 50).ms).fadeIn().slideY(begin: 0.05);
  }
}

/// Active/inactive status badge
class _ActiveBadge extends StatelessWidget {
  final bool isActive;

  const _ActiveBadge({required this.isActive});

  @override
  Widget build(BuildContext context) {
    final color = isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray;
    final label = isActive ? 'Active' : 'Inactive';

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
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Category badge widget
class _CategoryBadge extends StatelessWidget {
  final String category;

  const _CategoryBadge({required this.category});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.08)
            : LuxuryColors.diamond,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.grey.withValues(alpha: 0.2),
        ),
      ),
      child: Text(
        category,
        style: IrisTheme.labelSmall.copyWith(
          color: isDark ? LuxuryColors.textMuted : LuxuryColors.coolGray,
          fontWeight: FontWeight.w500,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
