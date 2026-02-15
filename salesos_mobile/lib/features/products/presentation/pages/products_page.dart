import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/products_service.dart';
import '../widgets/product_card.dart';

/// View mode for products display
enum _ViewMode { list, grid }

class ProductsPage extends ConsumerStatefulWidget {
  const ProductsPage({super.key});

  @override
  ConsumerState<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends ConsumerState<ProductsPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedFamily;
  String? _selectedCategory;
  _ViewMode _viewMode = _ViewMode.list;

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

  Future<void> _onRefresh() async {
    ref.invalidate(productsProvider);
  }

  List<ProductModel> _filterProducts(List<ProductModel> products) {
    var filtered = products;

    // Search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((product) {
        return product.name.toLowerCase().contains(_searchQuery) ||
            (product.sku?.toLowerCase().contains(_searchQuery) ?? false) ||
            (product.description?.toLowerCase().contains(_searchQuery) ?? false) ||
            (product.category?.toLowerCase().contains(_searchQuery) ?? false) ||
            (product.family?.toLowerCase().contains(_searchQuery) ?? false);
      }).toList();
    }

    // Family filter
    if (_selectedFamily != null) {
      filtered = filtered.where((p) => p.family == _selectedFamily).toList();
    }

    // Category filter
    if (_selectedCategory != null) {
      filtered = filtered.where((p) => p.category == _selectedCategory).toList();
    }

    // Sort alphabetically by name
    filtered.sort((a, b) => a.name.compareTo(b.name));
    return filtered;
  }

  void _onProductTap(ProductModel product) {
    HapticFeedback.lightImpact();
    context.push('/products/${product.id}');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final productsAsync = ref.watch(productsProvider);
    final isTablet = Responsive.shouldShowSplitView(context);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _PageHeader(
              onBack: () => context.pop(),
              viewMode: _viewMode,
              onToggleView: () {
                HapticFeedback.lightImpact();
                setState(() {
                  _viewMode = _viewMode == _ViewMode.list
                      ? _ViewMode.grid
                      : _ViewMode.list;
                });
              },
            ),

            // Summary section
            productsAsync.when(
              data: (products) => _SummarySection(products: products),
              loading: () => const SizedBox(height: 90),
              error: (_, _) => const SizedBox(height: 90),
            ),

            const SizedBox(height: 16),

            // Search field
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SearchField(
                controller: _searchController,
                hint: 'Search products...',
              ),
            ).animate(delay: 100.ms).fadeIn(),

            const SizedBox(height: 12),

            // Filter row
            productsAsync.when(
              data: (products) => _FilterRow(
                products: products,
                selectedFamily: _selectedFamily,
                selectedCategory: _selectedCategory,
                onFamilyChanged: (family) {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedFamily = family);
                },
                onCategoryChanged: (category) {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedCategory = category);
                },
              ),
              loading: () => const SizedBox(height: 40),
              error: (_, _) => const SizedBox(height: 40),
            ),

            const SizedBox(height: 12),

            // Product list/grid
            Expanded(
              child: productsAsync.when(
                data: (products) {
                  final filteredProducts = _filterProducts(products);

                  if (filteredProducts.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.box_1,
                      title: _searchQuery.isNotEmpty ||
                              _selectedFamily != null ||
                              _selectedCategory != null
                          ? 'No products found'
                          : 'No products yet',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search or filters'
                          : 'Products will appear here once added',
                      tier: LuxuryTier.gold,
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: LuxuryColors.champagneGold,
                    backgroundColor:
                        isDark ? LuxuryColors.obsidian : Colors.white,
                    child: _viewMode == _ViewMode.grid || isTablet
                        ? _ProductGrid(
                            products: filteredProducts,
                            onProductTap: _onProductTap,
                          )
                        : _ProductList(
                            products: filteredProducts,
                            onProductTap: _onProductTap,
                          ),
                  );
                },
                loading: () => const IrisListShimmer(
                  itemCount: 6,
                  itemHeight: 110,
                  tier: LuxuryTier.gold,
                ),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Iconsax.warning_2,
                          size: 48, color: LuxuryColors.errorRuby),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load products',
                        style: TextStyle(
                          fontSize: 16,
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextButton.icon(
                        onPressed: _onRefresh,
                        icon: const Icon(Iconsax.refresh),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Page header with back button, title, and view toggle
class _PageHeader extends StatelessWidget {
  final VoidCallback onBack;
  final _ViewMode viewMode;
  final VoidCallback onToggleView;

  const _PageHeader({
    required this.onBack,
    required this.viewMode,
    required this.onToggleView,
  });

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
              'Products',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
              ),
            ),
          ),
          IconButton(
            onPressed: onToggleView,
            icon: Icon(
              viewMode == _ViewMode.list
                  ? Iconsax.grid_2
                  : Iconsax.row_vertical,
              size: 22,
              color: LuxuryColors.champagneGold,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

/// Summary cards showing product counts
class _SummarySection extends StatelessWidget {
  final List<ProductModel> products;

  const _SummarySection({required this.products});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final totalCount = products.length;
    final activeCount = products.where((p) => p.isActive).length;
    final familyCount =
        products.map((p) => p.family).whereType<String>().toSet().length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Row(
        children: [
          Expanded(
            child: _SummaryCard(
              label: 'Total',
              value: '$totalCount',
              color: LuxuryColors.champagneGold,
              isDark: isDark,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _SummaryCard(
              label: 'Active',
              value: '$activeCount',
              color: LuxuryColors.successGreen,
              isDark: isDark,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _SummaryCard(
              label: 'Families',
              value: '$familyCount',
              color: LuxuryColors.infoCobalt,
              isDark: isDark,
            ),
          ),
        ],
      ),
    ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1);
  }
}

/// Summary card widget
class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _SummaryCard({
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
            ),
          ),
        ],
      ),
    );
  }
}

/// Search field
class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;

  const _SearchField({required this.controller, required this.hint});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TextField(
      controller: controller,
      style: TextStyle(
        fontSize: 15,
        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: LuxuryColors.textMuted),
        prefixIcon: Icon(
          Iconsax.search_normal,
          size: 20,
          color: LuxuryColors.champagneGold,
        ),
        filled: true,
        fillColor:
            isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: LuxuryColors.champagneGold),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}

/// Filter row with family and category dropdowns
class _FilterRow extends StatelessWidget {
  final List<ProductModel> products;
  final String? selectedFamily;
  final String? selectedCategory;
  final ValueChanged<String?> onFamilyChanged;
  final ValueChanged<String?> onCategoryChanged;

  const _FilterRow({
    required this.products,
    required this.selectedFamily,
    required this.selectedCategory,
    required this.onFamilyChanged,
    required this.onCategoryChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Build unique family and category lists
    final families =
        products.map((p) => p.family).whereType<String>().toSet().toList()
          ..sort();
    final categories =
        products.map((p) => p.category).whereType<String>().toSet().toList()
          ..sort();

    // Don't show filters if there's nothing to filter
    if (families.isEmpty && categories.isEmpty) {
      return const SizedBox.shrink();
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          // Family dropdown
          if (families.isNotEmpty)
            _FilterChip(
              label: selectedFamily ?? 'All Families',
              isActive: selectedFamily != null,
              isDark: isDark,
              onTap: () {
                _showFilterSheet(
                  context: context,
                  title: 'Product Family',
                  options: families,
                  selected: selectedFamily,
                  onSelected: onFamilyChanged,
                  isDark: isDark,
                );
              },
            ),

          if (families.isNotEmpty && categories.isNotEmpty)
            const SizedBox(width: 8),

          // Category dropdown
          if (categories.isNotEmpty)
            _FilterChip(
              label: selectedCategory ?? 'All Categories',
              isActive: selectedCategory != null,
              isDark: isDark,
              onTap: () {
                _showFilterSheet(
                  context: context,
                  title: 'Category',
                  options: categories,
                  selected: selectedCategory,
                  onSelected: onCategoryChanged,
                  isDark: isDark,
                );
              },
            ),

          // Clear filters button
          if (selectedFamily != null || selectedCategory != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                onFamilyChanged(null);
                onCategoryChanged(null);
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.close_circle,
                      size: 14,
                      color: LuxuryColors.errorRuby,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Clear',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: LuxuryColors.errorRuby,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    ).animate(delay: 150.ms).fadeIn();
  }

  void _showFilterSheet({
    required BuildContext context,
    required String title,
    required List<String> options,
    required String? selected,
    required ValueChanged<String?> onSelected,
    required bool isDark,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
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
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                title,
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                ),
              ),
            ),
            // "All" option
            ListTile(
              title: Text(
                'All',
                style: TextStyle(
                  fontWeight: selected == null
                      ? FontWeight.w600
                      : FontWeight.w400,
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                ),
              ),
              trailing: selected == null
                  ? Icon(Iconsax.tick_circle5,
                      color: LuxuryColors.champagneGold, size: 20)
                  : null,
              onTap: () {
                onSelected(null);
                Navigator.of(ctx).pop();
              },
            ),
            ...options.map((option) => ListTile(
                  title: Text(
                    option,
                    style: TextStyle(
                      fontWeight: selected == option
                          ? FontWeight.w600
                          : FontWeight.w400,
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                  trailing: selected == option
                      ? Icon(Iconsax.tick_circle5,
                          color: LuxuryColors.champagneGold, size: 20)
                      : null,
                  onTap: () {
                    onSelected(option);
                    Navigator.of(ctx).pop();
                  },
                )),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

/// Filter chip widget
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final bool isDark;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isActive,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
              : isDark
                  ? Colors.white.withValues(alpha: 0.06)
                  : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive
                ? LuxuryColors.champagneGold.withValues(alpha: 0.4)
                : isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.grey.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive
                    ? LuxuryColors.champagneGold
                    : LuxuryColors.textMuted,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Iconsax.arrow_down_1,
              size: 14,
              color: isActive
                  ? LuxuryColors.champagneGold
                  : LuxuryColors.textMuted,
            ),
          ],
        ),
      ),
    );
  }
}

/// Phone product list view
class _ProductList extends StatelessWidget {
  final List<ProductModel> products;
  final Function(ProductModel) onProductTap;

  const _ProductList({required this.products, required this.onProductTap});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
      itemCount: products.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: ProductCard(
            product: products[index],
            onTap: () => onProductTap(products[index]),
            animationIndex: index,
          ),
        );
      },
    );
  }
}

/// Grid view for tablets and grid mode
class _ProductGrid extends StatelessWidget {
  final List<ProductModel> products;
  final Function(ProductModel) onProductTap;

  const _ProductGrid({required this.products, required this.onProductTap});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
      itemCount: (products.length / 2).ceil(),
      itemBuilder: (context, rowIndex) {
        final leftIndex = rowIndex * 2;
        final rightIndex = leftIndex + 1;

        return Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left card
              Expanded(
                child: ProductCard(
                  product: products[leftIndex],
                  onTap: () => onProductTap(products[leftIndex]),
                  animationIndex: leftIndex,
                ),
              ),
              const SizedBox(width: 14),
              // Right card (or empty space)
              Expanded(
                child: rightIndex < products.length
                    ? ProductCard(
                        product: products[rightIndex],
                        onTap: () => onProductTap(products[rightIndex]),
                        animationIndex: rightIndex,
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        );
      },
    );
  }
}
