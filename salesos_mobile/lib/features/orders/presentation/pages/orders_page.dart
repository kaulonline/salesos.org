import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../../../core/services/export_service.dart';
import '../../../reports/presentation/widgets/export_dialog.dart';
import '../../data/orders_service.dart';
import '../widgets/order_card.dart';
import '../widgets/order_form.dart';

class OrdersPage extends ConsumerStatefulWidget {
  const OrdersPage({super.key});

  @override
  ConsumerState<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends ConsumerState<OrdersPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  // Tab mapping: All, Draft, Pending, Confirmed, Shipped, Delivered, Cancelled
  static const _tabLabels = [
    'All',
    'Draft',
    'Pending',
    'Confirmed',
    'Shipped',
    'Delivered',
    'Cancelled',
  ];

  static const _tabStatuses = [
    null, // All
    OrderStatus.DRAFT,
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabLabels.length, vsync: this);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _tabController.dispose();
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
    ref.invalidate(ordersProvider);
  }

  List<OrderModel> _filterOrders(List<OrderModel> orders) {
    var filtered = orders;

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((order) {
        return order.orderNumber.toLowerCase().contains(_searchQuery) ||
            (order.name?.toLowerCase().contains(_searchQuery) ?? false) ||
            (order.accountName?.toLowerCase().contains(_searchQuery) ?? false) ||
            (order.contactName?.toLowerCase().contains(_searchQuery) ?? false);
      }).toList();
    }

    // Apply tab filter
    final statusFilter = _tabStatuses[_tabController.index];
    if (statusFilter != null) {
      filtered = filtered.where((o) => o.status == statusFilter).toList();
    }

    return filtered;
  }

  String _formatTotalValue(List<OrderModel> orders) {
    final total = orders.fold<double>(0, (sum, order) => sum + order.total);
    if (total >= 1000000) {
      return '\$${(total / 1000000).toStringAsFixed(2)}M total';
    } else if (total >= 1000) {
      return '\$${(total / 1000).toStringAsFixed(0)}K total';
    } else {
      return '\$${total.toStringAsFixed(0)} total';
    }
  }

  void _showExportDialog(BuildContext context, List<OrderModel> orders) {
    if (orders.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No orders to export')),
      );
      return;
    }

    final filteredOrders = _filterOrders(orders);
    final exportData = filteredOrders.map((order) => {
      'orderNumber': order.orderNumber,
      'name': order.name ?? '',
      'accountName': order.accountName ?? '',
      'contactName': order.contactName ?? '',
      'status': order.status.label,
      'paymentStatus': order.paymentStatus.label,
      'fulfillmentStatus': order.fulfillmentStatus.label,
      'total': order.total,
      'subtotal': order.subtotal,
      'orderDate': order.orderDate?.toIso8601String() ?? '',
      'createdAt': order.createdAt.toIso8601String(),
    }).toList();

    HapticFeedback.mediumImpact();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Container(
              margin: const EdgeInsets.all(24),
              constraints: const BoxConstraints(maxWidth: 400),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: ExportDialog(
                title: 'Export Orders',
                subtitle: '${filteredOrders.length} orders will be exported',
                dataType: ExportDataType.deals,
                data: exportData,
                filename: 'salesos_orders_export',
                exportTitle: 'SalesOS CRM - Orders Export',
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ordersAsync = ref.watch(ordersProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: _onRefresh,
            ),

            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Orders',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        ordersAsync.when(
                          data: (orders) => Text(
                            '${orders.length} order${orders.length != 1 ? 's' : ''} ${_formatTotalValue(orders)}',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (error, stackTrace) => Text(
                            'Error loading orders',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Export Button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      final orders = ref.read(ordersProvider).value ?? [];
                      _showExportDialog(context, orders);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? IrisTheme.darkSurfaceHigh
                            : IrisTheme.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.export_1,
                        size: 20,
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Add Order Button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      OrderForm.show(
                        context: context,
                        mode: IrisFormMode.create,
                        onSuccess: () {
                          ref.invalidate(ordersProvider);
                        },
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.add,
                        size: 20,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: IrisSearchField(
                controller: _searchController,
                hint: 'Search orders...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Status Tabs
            TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: isDark
                  ? LuxuryColors.jadePremium
                  : LuxuryColors.rolexGreen,
              unselectedLabelColor: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              indicatorColor: isDark
                  ? LuxuryColors.jadePremium
                  : LuxuryColors.rolexGreen,
              indicatorWeight: 3,
              labelStyle:
                  IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
              onTap: (_) => setState(() {}),
              tabs: _tabLabels.map((label) => Tab(text: label)).toList(),
            ).animate(delay: 150.ms).fadeIn(),

            const SizedBox(height: 8),

            // Content
            Expanded(
              child: ordersAsync.when(
                data: (orders) {
                  final filteredOrders = _filterOrders(orders);
                  if (filteredOrders.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.box,
                      title: 'No orders found',
                      subtitle: _searchQuery.isNotEmpty || _tabController.index != 0
                          ? 'Try adjusting your search or filters'
                          : 'Create your first order to start tracking fulfillment',
                      actionLabel: 'Create Order',
                      onAction: () {
                        HapticFeedback.lightImpact();
                        OrderForm.show(
                          context: context,
                          mode: IrisFormMode.create,
                          onSuccess: () {
                            ref.invalidate(ordersProvider);
                          },
                        );
                      },
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    backgroundColor:
                        isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      itemCount: filteredOrders.length,
                      itemBuilder: (context, index) {
                        final order = filteredOrders[index];
                        return OrderCard(
                          order: order,
                          animationIndex: index,
                          onTap: () => context.push('/orders/${order.id}'),
                        );
                      },
                    ),
                  );
                },
                loading: () =>
                    const IrisListShimmer(itemCount: 5, itemHeight: 100),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Iconsax.warning_2,
                        size: 48,
                        color: IrisTheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load orders',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _onRefresh,
                        child: Text(
                          'Retry',
                          style: TextStyle(
                            color: isDark
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.rolexGreen,
                          ),
                        ),
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
