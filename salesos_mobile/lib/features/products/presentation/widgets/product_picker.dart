import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/products_service.dart';

/// Product picker bottom sheet for use in quote/order forms.
///
/// Shows a searchable list of products and calls [onProductSelected]
/// when the user taps a product.
///
/// Usage:
/// ```dart
/// ProductPicker.show(
///   context: context,
///   ref: ref,
///   onProductSelected: (product) {
///     // Handle selected product
///   },
/// );
/// ```
class ProductPicker extends ConsumerStatefulWidget {
  final Function(ProductModel product) onProductSelected;

  const ProductPicker({
    super.key,
    required this.onProductSelected,
  });

  /// Show the product picker as a bottom sheet
  static Future<void> show({
    required BuildContext context,
    required WidgetRef ref,
    required Function(ProductModel product) onProductSelected,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ProductPicker(
        onProductSelected: (product) {
          onProductSelected(product);
          Navigator.of(ctx).pop();
        },
      ),
    );
  }

  @override
  ConsumerState<ProductPicker> createState() => _ProductPickerState();
}

class _ProductPickerState extends ConsumerState<ProductPicker> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
    });
  }

  List<ProductModel> _filterProducts(List<ProductModel> products) {
    if (_searchQuery.isEmpty) return products.where((p) => p.isActive).toList();

    return products.where((product) {
      if (!product.isActive) return false;
      return product.name.toLowerCase().contains(_searchQuery) ||
          (product.sku?.toLowerCase().contains(_searchQuery) ?? false) ||
          (product.category?.toLowerCase().contains(_searchQuery) ?? false) ||
          (product.family?.toLowerCase().contains(_searchQuery) ?? false);
    }).toList();
  }

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
    final productsAsync = ref.watch(productsProvider);
    final screenHeight = MediaQuery.of(context).size.height;

    return Container(
      height: screenHeight * 0.75,
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.richBlack : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
      ),
      child: Column(
        children: [
          // Handle bar
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.2)
                    : Colors.grey.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
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
                Expanded(
                  child: Text(
                    'Select Product',
                    style: IrisTheme.titleLarge.copyWith(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: Icon(
                    Iconsax.close_circle,
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ),

          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchController,
              style: TextStyle(
                fontSize: 15,
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
              ),
              decoration: InputDecoration(
                hintText: 'Search products...',
                hintStyle: TextStyle(color: LuxuryColors.textMuted),
                prefixIcon: Icon(
                  Iconsax.search_normal,
                  size: 20,
                  color: LuxuryColors.champagneGold,
                ),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withValues(alpha: 0.06)
                    : Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(
                    color: Colors.grey.withValues(alpha: 0.2),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(
                    color: Colors.grey.withValues(alpha: 0.2),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: LuxuryColors.champagneGold),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
            ),
          ).animate(delay: 100.ms).fadeIn(),

          const SizedBox(height: 12),

          // Product list
          Expanded(
            child: productsAsync.when(
              data: (products) {
                final filtered = _filterProducts(products);

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Iconsax.box_1,
                          size: 48,
                          color: LuxuryColors.textMuted.withValues(alpha: 0.4),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _searchQuery.isNotEmpty
                              ? 'No products match your search'
                              : 'No products available',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final product = filtered[index];
                    return _PickerProductItem(
                      product: product,
                      formatPrice: _formatPrice,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        widget.onProductSelected(product);
                      },
                    ).animate(delay: Duration(milliseconds: 30 * index))
                        .fadeIn()
                        .slideX(begin: 0.02);
                  },
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(
                  color: LuxuryColors.champagneGold,
                  strokeWidth: 2,
                ),
              ),
              error: (error, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.warning_2,
                      size: 48,
                      color: LuxuryColors.errorRuby,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Failed to load products',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Individual product item in the picker list
class _PickerProductItem extends StatelessWidget {
  final ProductModel product;
  final String Function(double) formatPrice;
  final VoidCallback onTap;

  const _PickerProductItem({
    required this.product,
    required this.formatPrice,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.grey.withValues(alpha: 0.15),
            ),
          ),
          child: Row(
            children: [
              // Product icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Iconsax.box_1,
                  size: 18,
                  color: isDark
                      ? LuxuryColors.champagneGold
                      : LuxuryColors.champagneGoldDark,
                ),
              ),
              const SizedBox(width: 12),

              // Product details
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
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        if (product.sku != null) ...[
                          Text(
                            product.sku!,
                            style: IrisTheme.bodySmall.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                          if (product.category != null)
                            Text(
                              '  |  ',
                              style: IrisTheme.bodySmall.copyWith(
                                color: LuxuryColors.textMuted.withValues(alpha: 0.5),
                              ),
                            ),
                        ],
                        if (product.category != null)
                          Flexible(
                            child: Text(
                              product.category!,
                              style: IrisTheme.bodySmall.copyWith(
                                color: LuxuryColors.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 12),

              // Price
              Text(
                formatPrice(product.unitPrice),
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
      ),
    );
  }
}
