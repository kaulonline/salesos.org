import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../data/products_service.dart';

class ProductDetailPage extends ConsumerWidget {
  final String productId;

  const ProductDetailPage({
    super.key,
    required this.productId,
  });

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  String _formatDate(DateTime date) {
    return DateFormat('MMMM dd, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final productAsync = ref.watch(productDetailProvider(productId));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: productAsync.when(
          data: (product) {
            if (product == null) {
              return _buildNotFound(context, isDark);
            }
            return _buildContent(context, ref, product, isDark);
          },
          loading: () => _buildLoading(context, isDark),
          error: (error, _) => _buildError(context, ref, isDark),
        ),
      ),
    );
  }

  Widget _buildNotFound(BuildContext context, bool isDark) {
    return Column(
      children: [
        _DetailHeader(onBack: () => context.pop()),
        Expanded(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Iconsax.box_remove,
                  size: 64,
                  color: LuxuryColors.textMuted.withValues(alpha: 0.4),
                ),
                const SizedBox(height: 16),
                Text(
                  'Product not found',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This product may have been removed',
                  style: IrisTheme.bodySmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLoading(BuildContext context, bool isDark) {
    return Column(
      children: [
        _DetailHeader(onBack: () => context.pop()),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                IrisShimmer(
                  width: double.infinity,
                  height: 200,
                  borderRadius: 20,
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 16),
                IrisShimmer(
                  width: double.infinity,
                  height: 100,
                  borderRadius: 16,
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 16),
                IrisShimmer(
                  width: double.infinity,
                  height: 80,
                  borderRadius: 16,
                  tier: LuxuryTier.gold,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildError(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(
      children: [
        _DetailHeader(onBack: () => context.pop()),
        Expanded(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                const SizedBox(height: 16),
                Text(
                  'Failed to load product',
                  style: TextStyle(
                    fontSize: 16,
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                  ),
                ),
                const SizedBox(height: 16),
                TextButton.icon(
                  onPressed: () => ref.invalidate(productDetailProvider(productId)),
                  icon: const Icon(Iconsax.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    ProductModel product,
    bool isDark,
  ) {
    return Column(
      children: [
        _DetailHeader(onBack: () => context.pop()),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(productDetailProvider(productId));
            },
            color: LuxuryColors.champagneGold,
            backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product image placeholder
                  _ImagePlaceholder(product: product)
                      .animate(delay: 50.ms)
                      .fadeIn()
                      .slideY(begin: 0.05),

                  const SizedBox(height: 20),

                  // Product name and status
                  _NameSection(product: product, isDark: isDark)
                      .animate(delay: 100.ms)
                      .fadeIn()
                      .slideY(begin: 0.05),

                  const SizedBox(height: 16),

                  // Description
                  if (product.description != null)
                    _DescriptionSection(
                            description: product.description!, isDark: isDark)
                        .animate(delay: 150.ms)
                        .fadeIn()
                        .slideY(begin: 0.05),

                  if (product.description != null) const SizedBox(height: 16),

                  // Pricing section
                  _PricingSection(
                    product: product,
                    isDark: isDark,
                    formatCurrency: _formatCurrency,
                  ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.05),

                  const SizedBox(height: 16),

                  // Pricing tiers table
                  if (product.pricingTiers.isNotEmpty)
                    _PricingTiersSection(
                      tiers: product.pricingTiers,
                      isDark: isDark,
                      formatCurrency: _formatCurrency,
                    ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.05),

                  if (product.pricingTiers.isNotEmpty)
                    const SizedBox(height: 16),

                  // Category and family badges
                  _TagsSection(product: product, isDark: isDark)
                      .animate(delay: 300.ms)
                      .fadeIn()
                      .slideY(begin: 0.05),

                  const SizedBox(height: 16),

                  // Metadata
                  _MetadataSection(
                    product: product,
                    isDark: isDark,
                    formatDate: _formatDate,
                  ).animate(delay: 350.ms).fadeIn().slideY(begin: 0.05),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Detail page header with back button
class _DetailHeader extends StatelessWidget {
  final VoidCallback onBack;

  const _DetailHeader({required this.onBack});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              onBack();
            },
            icon: Icon(
              Iconsax.arrow_left,
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Product Details',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

/// Product image placeholder
class _ImagePlaceholder extends StatelessWidget {
  final ProductModel product;

  const _ImagePlaceholder({required this.product});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  LuxuryColors.obsidian,
                  LuxuryColors.champagneGold.withValues(alpha: 0.1),
                ]
              : [
                  LuxuryColors.diamond,
                  LuxuryColors.champagneGold.withValues(alpha: 0.15),
                ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Iconsax.box_1,
              size: 48,
              color: isDark
                  ? LuxuryColors.champagneGold
                  : LuxuryColors.champagneGoldDark,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            product.name,
            style: IrisTheme.titleMedium.copyWith(
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// Product name and active status section
class _NameSection extends StatelessWidget {
  final ProductModel product;
  final bool isDark;

  const _NameSection({required this.product, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  product.name,
                  style: IrisTheme.headlineSmall.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                  ),
                ),
              ),
              // Status indicator
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: product.isActive
                      ? LuxuryColors.successGreen.withValues(alpha: 0.12)
                      : LuxuryColors.warmGray.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: product.isActive
                            ? LuxuryColors.successGreen
                            : LuxuryColors.warmGray,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      product.isActive ? 'Active' : 'Inactive',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: product.isActive
                            ? LuxuryColors.successGreen
                            : LuxuryColors.warmGray,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (product.sku != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Iconsax.barcode,
                  size: 16,
                  color: LuxuryColors.textMuted,
                ),
                const SizedBox(width: 8),
                Text(
                  'SKU: ${product.sku}',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Description section
class _DescriptionSection extends StatelessWidget {
  final String description;
  final bool isDark;

  const _DescriptionSection({
    required this.description,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.document_text,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 8),
              Text(
                'Description',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            description,
            style: IrisTheme.bodyMedium.copyWith(
              color: LuxuryColors.textMuted,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

/// Pricing section showing unit price and list price
class _PricingSection extends StatelessWidget {
  final ProductModel product;
  final bool isDark;
  final String Function(double) formatCurrency;

  const _PricingSection({
    required this.product,
    required this.isDark,
    required this.formatCurrency,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.dollar_circle,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 8),
              Text(
                'Pricing',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Unit Price - prominent display
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  LuxuryColors.warmGold.withValues(alpha: 0.08),
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'UNIT PRICE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.0,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  formatCurrency(product.unitPrice),
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: isDark
                        ? LuxuryColors.champagneGold
                        : LuxuryColors.champagneGoldDark,
                  ),
                ),
                if (product.currency != null)
                  Text(
                    product.currency!,
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                  ),
              ],
            ),
          ),
          // List Price
          if (product.listPrice != null) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'List Price',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
                Text(
                  formatCurrency(product.listPrice!),
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            // Show discount if list price differs from unit price
            if (product.listPrice! > product.unitPrice) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Discount',
                    style: IrisTheme.bodyMedium.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color:
                          LuxuryColors.successGreen.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '-${((1 - product.unitPrice / product.listPrice!) * 100).toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: LuxuryColors.successGreen,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// Pricing tiers table
class _PricingTiersSection extends StatelessWidget {
  final List<PricingTier> tiers;
  final bool isDark;
  final String Function(double) formatCurrency;

  const _PricingTiersSection({
    required this.tiers,
    required this.isDark,
    required this.formatCurrency,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.chart_2,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 8),
              Text(
                'Volume Pricing',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Table header
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.04)
                  : LuxuryColors.diamond,
              borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(10)),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    'QUANTITY',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    'PRICE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                      color: LuxuryColors.textMuted,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          ),
          // Table rows
          ...tiers.asMap().entries.map((entry) {
            final index = entry.key;
            final tier = entry.value;
            final isLast = index == tiers.length - 1;
            final quantityRange = tier.maxQuantity != null
                ? '${tier.minQuantity} - ${tier.maxQuantity}'
                : '${tier.minQuantity}+';

            return Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                border: isLast
                    ? null
                    : Border(
                        bottom: BorderSide(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.06)
                              : Colors.grey.withValues(alpha: 0.1),
                        ),
                      ),
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      quantityRange,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Text(
                      formatCurrency(tier.price),
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.champagneGold
                            : LuxuryColors.champagneGoldDark,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

/// Tags section showing category and family
class _TagsSection extends StatelessWidget {
  final ProductModel product;
  final bool isDark;

  const _TagsSection({required this.product, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final hasTags = product.category != null || product.family != null;
    if (!hasTags) return const SizedBox.shrink();

    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.tag,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 8),
              Text(
                'Classification',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (product.category != null)
                _TagBadge(
                  icon: Iconsax.category,
                  label: product.category!,
                  color: LuxuryColors.infoCobalt,
                  isDark: isDark,
                ),
              if (product.family != null)
                _TagBadge(
                  icon: Iconsax.folder_2,
                  label: product.family!,
                  color: LuxuryColors.rolexGreen,
                  isDark: isDark,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Tag badge widget
class _TagBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isDark;

  const _TagBadge({
    required this.icon,
    required this.label,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Metadata section showing created/updated dates
class _MetadataSection extends StatelessWidget {
  final ProductModel product;
  final bool isDark;
  final String Function(DateTime) formatDate;

  const _MetadataSection({
    required this.product,
    required this.isDark,
    required this.formatDate,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.info_circle,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 8),
              Text(
                'Details',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _MetadataRow(
            label: 'Created',
            value: formatDate(product.createdAt),
            isDark: isDark,
          ),
          const SizedBox(height: 10),
          _MetadataRow(
            label: 'Last Updated',
            value: formatDate(product.updatedAt),
            isDark: isDark,
          ),
          if (product.id.isNotEmpty) ...[
            const SizedBox(height: 10),
            _MetadataRow(
              label: 'Product ID',
              value: product.id,
              isDark: isDark,
            ),
          ],
        ],
      ),
    );
  }
}

/// Metadata row widget
class _MetadataRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;

  const _MetadataRow({
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: IrisTheme.bodyMedium.copyWith(
            color: LuxuryColors.textMuted,
          ),
        ),
        Flexible(
          child: Text(
            value,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
