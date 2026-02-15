import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../data/orders_service.dart';
import '../widgets/order_card.dart';
import '../widgets/order_status_tracker.dart';
import '../widgets/order_form.dart';

class OrderDetailPage extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailPage({
    super.key,
    required this.orderId,
  });

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage> {
  bool _isLoading = false;

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  String _formatDateShort(DateTime? date) {
    if (date == null) return 'N/A';
    return DateFormat('MMM dd, yyyy').format(date);
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return '?';
  }

  // ───────────────────────────────────────────────────────
  // ACTION HANDLERS
  // ───────────────────────────────────────────────────────

  Future<void> _handleConfirmOrder(OrderModel order) async {
    final confirmed = await _showConfirmDialog(
      title: 'Confirm Order',
      message: 'Mark this order as confirmed? This will start the fulfillment process.',
      confirmLabel: 'Confirm',
      confirmIcon: Iconsax.tick_circle,
      confirmColor: LuxuryColors.infoCobalt,
    );
    if (confirmed != true) return;
    await _executeAction(() => ref.read(ordersServiceProvider).confirmOrder(order.id), 'Order confirmed');
  }

  Future<void> _handleShipOrder(OrderModel order) async {
    final confirmed = await _showConfirmDialog(
      title: 'Ship Order',
      message: 'Mark this order as shipped?',
      confirmLabel: 'Ship',
      confirmIcon: Iconsax.truck,
      confirmColor: LuxuryColors.jadePremium,
    );
    if (confirmed != true) return;
    await _executeAction(() => ref.read(ordersServiceProvider).shipOrder(order.id), 'Order shipped');
  }

  Future<void> _handleDeliverOrder(OrderModel order) async {
    final confirmed = await _showConfirmDialog(
      title: 'Mark Delivered',
      message: 'Confirm that the order has been delivered?',
      confirmLabel: 'Delivered',
      confirmIcon: Iconsax.tick_square,
      confirmColor: LuxuryColors.successGreen,
    );
    if (confirmed != true) return;
    await _executeAction(() => ref.read(ordersServiceProvider).deliverOrder(order.id), 'Order delivered');
  }

  Future<void> _handleCancelOrder(OrderModel order) async {
    final confirmed = await _showConfirmDialog(
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order? This action cannot be undone.',
      confirmLabel: 'Cancel Order',
      confirmIcon: Iconsax.close_circle,
      confirmColor: LuxuryColors.errorRuby,
    );
    if (confirmed != true) return;
    await _executeAction(() => ref.read(ordersServiceProvider).cancelOrder(order.id), 'Order cancelled');
  }

  Future<void> _handleDeleteOrder(OrderModel order) async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Order',
      message: 'Are you sure you want to delete "${order.orderNumber}"? This action cannot be undone.',
    );
    if (!confirmed) return;

    setState(() => _isLoading = true);
    try {
      final success = await ref.read(ordersServiceProvider).deleteOrder(order.id);
      HapticFeedback.mediumImpact();
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Order deleted'),
            backgroundColor: LuxuryColors.errorRuby,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        ref.invalidate(ordersProvider);
        context.pop();
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete order: $e'),
            backgroundColor: LuxuryColors.errorRuby,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _handleEditOrder(OrderModel order) {
    HapticFeedback.lightImpact();
    OrderForm.show(
      context: context,
      mode: IrisFormMode.edit,
      initialData: {
        'id': order.id,
        'name': order.name ?? order.orderNumber,
        'status': order.status.label,
        'notes': order.notes,
        'shippingAddress': order.shippingAddress?.displayString ?? '',
        'billingAddress': order.billingAddress?.displayString ?? '',
        'accountName': order.accountName,
        'contactName': order.contactName,
        'expectedDeliveryDate': order.expectedDeliveryDate?.toIso8601String(),
        'lineItems': order.lineItems.map((e) => e.toJson()).toList(),
      },
      onSuccess: () {
        ref.invalidate(orderDetailProvider(widget.orderId));
        ref.invalidate(ordersProvider);
      },
    );
  }

  Future<bool?> _showConfirmDialog({
    required String title,
    required String message,
    required String confirmLabel,
    required IconData confirmIcon,
    required Color confirmColor,
  }) async {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => _OrderActionDialog(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        confirmIcon: confirmIcon,
        confirmColor: confirmColor,
      ),
    );
  }

  Future<void> _executeAction(Future<bool> Function() action, String successMessage) async {
    setState(() => _isLoading = true);
    try {
      final success = await action();
      HapticFeedback.mediumImpact();
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(successMessage),
            backgroundColor: LuxuryColors.successGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        ref.invalidate(orderDetailProvider(widget.orderId));
        ref.invalidate(ordersProvider);
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Action failed. Please try again.'),
            backgroundColor: LuxuryColors.errorRuby,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: LuxuryColors.errorRuby,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showMoreOptions(OrderModel order) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    HapticFeedback.mediumImpact();
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
            child: Material(
              color: Colors.transparent,
              child: Container(
                width: MediaQuery.of(ctx).size.width * 0.9,
                constraints: const BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  color: isDark ? LuxuryColors.richBlack : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(height: 16),
                    _OptionTile(
                      icon: Iconsax.edit_2,
                      label: 'Edit Order',
                      onTap: () {
                        Navigator.pop(ctx);
                        _handleEditOrder(order);
                      },
                    ),
                    _OptionTile(
                      icon: Iconsax.document_download,
                      label: 'Export PDF',
                      onTap: () {
                        Navigator.pop(ctx);
                        HapticFeedback.lightImpact();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Exporting PDF...'),
                            backgroundColor: LuxuryColors.infoCobalt,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        );
                      },
                    ),
                    _OptionTile(
                      icon: Iconsax.share,
                      label: 'Share',
                      onTap: () {
                        Navigator.pop(ctx);
                        HapticFeedback.lightImpact();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Share feature coming soon'),
                            backgroundColor: LuxuryColors.champagneGold,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        );
                      },
                    ),
                    const Divider(height: 1),
                    _OptionTile(
                      icon: Iconsax.trash,
                      label: 'Delete',
                      color: LuxuryColors.errorRuby,
                      onTap: () {
                        Navigator.pop(ctx);
                        _handleDeleteOrder(order);
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(opacity: animation, child: child);
      },
    );
  }

  // ───────────────────────────────────────────────────────
  // BUILD
  // ───────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isTablet = Responsive.shouldShowSplitView(context);
    final orderAsync = ref.watch(orderDetailProvider(widget.orderId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : const Color(0xFFF8F6F2),
      body: orderAsync.when(
        data: (order) {
          if (order == null) {
            return _buildErrorState(isDark, 'Order not found');
          }
          return _buildOrderView(order, isDark, isTablet);
        },
        loading: () => _buildLoadingState(isDark),
        error: (error, _) => _buildErrorState(isDark, error.toString()),
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return SafeArea(
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: LuxuryColors.champagneGold,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Loading order...',
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(bool isDark, String error) {
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Iconsax.warning_2,
                  size: 40,
                  color: LuxuryColors.errorRuby,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Unable to Load',
                style: IrisTheme.titleLarge.copyWith(
                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                error,
                style: IrisTheme.bodyMedium.copyWith(
                  color: LuxuryColors.textMuted,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              IrisButton(
                label: 'Go Back',
                icon: Iconsax.arrow_left,
                onPressed: () => context.pop(),
                variant: IrisButtonVariant.secondary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrderView(OrderModel order, bool isDark, bool isTablet) {
    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            // App Bar
            SliverAppBar(
              pinned: true,
              elevation: 0,
              backgroundColor: isDark ? IrisTheme.darkBackground : const Color(0xFFF8F6F2),
              leading: IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark ? LuxuryColors.obsidian : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Icon(
                    Iconsax.arrow_left,
                    size: 18,
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  ),
                ),
                onPressed: () => context.pop(),
              ),
              actions: [
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark ? LuxuryColors.obsidian : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Icon(
                      Iconsax.more,
                      size: 18,
                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    ),
                  ),
                  onPressed: () => _showMoreOptions(order),
                ),
                const SizedBox(width: 8),
              ],
            ),

            // Content
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: isTablet ? 48 : 20,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ═══════════════════════════════════════════════
                    // ORDER HEADER CARD
                    // ═══════════════════════════════════════════════
                    _buildHeaderCard(order, isDark)
                        .animate()
                        .fadeIn(duration: 400.ms)
                        .slideY(begin: 0.02),

                    const SizedBox(height: 20),

                    // ═══════════════════════════════════════════════
                    // STATUS TRACKER
                    // ═══════════════════════════════════════════════
                    _buildSection(
                      isDark: isDark,
                      child: OrderStatusTracker(currentStatus: order.status),
                    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.03),

                    const SizedBox(height: 20),

                    // ═══════════════════════════════════════════════
                    // FULFILLMENT & PAYMENT STATUS
                    // ═══════════════════════════════════════════════
                    _buildStatusCards(order, isDark)
                        .animate(delay: 150.ms)
                        .fadeIn()
                        .slideY(begin: 0.03),

                    const SizedBox(height: 20),

                    // ═══════════════════════════════════════════════
                    // LINE ITEMS
                    // ═══════════════════════════════════════════════
                    _buildLineItemsSection(order, isDark, isTablet)
                        .animate(delay: 200.ms)
                        .fadeIn()
                        .slideY(begin: 0.03),

                    const SizedBox(height: 20),

                    // ═══════════════════════════════════════════════
                    // ORDER SUMMARY (TOTALS)
                    // ═══════════════════════════════════════════════
                    _buildTotalsSection(order, isDark)
                        .animate(delay: 250.ms)
                        .fadeIn()
                        .slideY(begin: 0.03),

                    const SizedBox(height: 20),

                    // ═══════════════════════════════════════════════
                    // ADDRESSES
                    // ═══════════════════════════════════════════════
                    if (order.shippingAddress != null || order.billingAddress != null)
                      _buildAddressesSection(order, isDark)
                          .animate(delay: 300.ms)
                          .fadeIn()
                          .slideY(begin: 0.03),

                    if (order.shippingAddress != null || order.billingAddress != null)
                      const SizedBox(height: 20),

                    // ═══════════════════════════════════════════════
                    // NOTES
                    // ═══════════════════════════════════════════════
                    if (order.notes != null && order.notes!.isNotEmpty)
                      _buildNotesSection(order, isDark)
                          .animate(delay: 350.ms)
                          .fadeIn()
                          .slideY(begin: 0.03),

                    if (order.notes != null && order.notes!.isNotEmpty)
                      const SizedBox(height: 20),

                    // ═══════════════════════════════════════════════
                    // TIMELINE
                    // ═══════════════════════════════════════════════
                    _buildTimelineSection(isDark)
                        .animate(delay: 400.ms)
                        .fadeIn()
                        .slideY(begin: 0.03),

                    const SizedBox(height: 24),

                    // ═══════════════════════════════════════════════
                    // ACTION BUTTONS
                    // ═══════════════════════════════════════════════
                    _buildActionButtons(order, isDark)
                        .animate(delay: 450.ms)
                        .fadeIn()
                        .slideY(begin: 0.05),

                    SizedBox(height: MediaQuery.of(context).padding.bottom + 32),
                  ],
                ),
              ),
            ),
          ],
        ),

        // Loading overlay
        if (_isLoading)
          Container(
            color: Colors.black.withValues(alpha: 0.4),
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? LuxuryColors.richBlack : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      strokeWidth: 2,
                      color: LuxuryColors.champagneGold,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Processing...',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────
  // SECTION BUILDERS
  // ───────────────────────────────────────────────────────

  Widget _buildSection({required bool isDark, required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
              : const Color(0xFFE8E0D8),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildHeaderCard(OrderModel order, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
              : const Color(0xFFE8E0D8),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top section: Status badge and order number
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status badge
                    _OrderDetailStatusBadge(status: order.status),
                    const Spacer(),
                    // Order number
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'ORDER',
                          style: IrisTheme.overline.copyWith(
                            color: LuxuryColors.champagneGold,
                            fontSize: 11,
                            letterSpacing: 3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          order.orderNumber,
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // Date row
                Row(
                  children: [
                    _DateInfo(
                      label: 'ORDER DATE',
                      value: _formatDateShort(order.orderDate ?? order.createdAt),
                      isDark: isDark,
                    ),
                    const SizedBox(width: 32),
                    _DateInfo(
                      label: 'DELIVERY DATE',
                      value: _formatDateShort(order.expectedDeliveryDate),
                      isDark: isDark,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Customer section
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.richBlack.withValues(alpha: 0.5)
                  : const Color(0xFFFAF9F7),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CUSTOMER',
                        style: IrisTheme.overline.copyWith(
                          color: LuxuryColors.textMuted,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (order.accountName != null)
                        Text(
                          order.accountName!,
                          style: IrisTheme.titleLarge.copyWith(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      if (order.contactName != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          order.contactName!,
                          style: IrisTheme.bodyMedium.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                LuxuryAvatar(
                  initials: _getInitials(order.accountName ?? order.contactName ?? '?'),
                  size: 56,
                  tier: LuxuryTier.gold,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCards(OrderModel order, bool isDark) {
    return Row(
      children: [
        // Fulfillment Status
        Expanded(
          child: _buildSection(
            isDark: isDark,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'FULFILLMENT',
                    style: IrisTheme.overline.copyWith(
                      color: LuxuryColors.textMuted,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: order.fulfillmentStatus.color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: order.fulfillmentStatus.color.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: order.fulfillmentStatus.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          order.fulfillmentStatus.label,
                          style: IrisTheme.labelSmall.copyWith(
                            color: order.fulfillmentStatus.color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Payment Status
        Expanded(
          child: _buildSection(
            isDark: isDark,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PAYMENT',
                    style: IrisTheme.overline.copyWith(
                      color: LuxuryColors.textMuted,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: order.paymentStatus.color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: order.paymentStatus.color.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: order.paymentStatus.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          order.paymentStatus.label,
                          style: IrisTheme.labelSmall.copyWith(
                            color: order.paymentStatus.color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLineItemsSection(OrderModel order, bool isDark, bool isTablet) {
    if (order.lineItems.isEmpty) {
      return _buildSection(
        isDark: isDark,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: Column(
              children: [
                Icon(
                  Iconsax.box_1,
                  size: 32,
                  color: LuxuryColors.textMuted.withValues(alpha: 0.5),
                ),
                const SizedBox(height: 12),
                Text(
                  'No line items',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return _buildSection(
      isDark: isDark,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 4,
                    child: Text(
                      'ITEM',
                      style: IrisTheme.overline.copyWith(
                        color: LuxuryColors.champagneGold,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 40,
                    child: Text(
                      'QTY',
                      style: IrisTheme.overline.copyWith(
                        color: LuxuryColors.champagneGold,
                        letterSpacing: 1.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  SizedBox(
                    width: isTablet ? 100 : 70,
                    child: Text(
                      'PRICE',
                      style: IrisTheme.overline.copyWith(
                        color: LuxuryColors.champagneGold,
                        letterSpacing: 1.5,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                  SizedBox(
                    width: isTablet ? 100 : 70,
                    child: Text(
                      'TOTAL',
                      style: IrisTheme.overline.copyWith(
                        color: LuxuryColors.champagneGold,
                        letterSpacing: 1.5,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            ),

            // Rows
            ...order.lineItems.asMap().entries.map((entry) {
              final item = entry.value;
              final isLast = entry.key == order.lineItems.length - 1;

              return Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isLast
                          ? Colors.transparent
                          : LuxuryColors.champagneGold.withValues(alpha: 0.1),
                      width: 1,
                    ),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text(
                        item.productName,
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 40,
                      child: Text(
                        '${item.quantity}',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    SizedBox(
                      width: isTablet ? 100 : 70,
                      child: Text(
                        _formatCurrency(item.unitPrice),
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                    SizedBox(
                      width: isTablet ? 100 : 70,
                      child: Text(
                        _formatCurrency(item.totalPrice),
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
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalsSection(OrderModel order, bool isDark) {
    return _buildSection(
      isDark: isDark,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark
              ? LuxuryColors.richBlack.withValues(alpha: 0.5)
              : const Color(0xFFFAF9F7),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Text(
              'ORDER SUMMARY',
              style: IrisTheme.overline.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 16),
            _TotalsRow(
              label: 'Subtotal',
              value: _formatCurrency(order.subtotal),
              isDark: isDark,
            ),
            const SizedBox(height: 8),
            if (order.tax != null && order.tax! > 0) ...[
              _TotalsRow(
                label: 'Tax',
                value: '+${_formatCurrency(order.tax!)}',
                isDark: isDark,
              ),
              const SizedBox(height: 8),
            ],
            if (order.shippingCost != null && order.shippingCost! > 0) ...[
              _TotalsRow(
                label: 'Shipping',
                value: '+${_formatCurrency(order.shippingCost!)}',
                isDark: isDark,
              ),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 8),
            // Gold divider
            Container(
              height: 2,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    LuxuryColors.champagneGold,
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Grand Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'TOTAL',
                  style: IrisTheme.labelMedium.copyWith(
                    color: LuxuryColors.champagneGold,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2,
                  ),
                ),
                Text(
                  _formatCurrency(order.total),
                  style: IrisTheme.headlineMedium.copyWith(
                    color: LuxuryColors.champagneGold,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressesSection(OrderModel order, bool isDark) {
    return _buildSection(
      isDark: isDark,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ADDRESSES',
              style: IrisTheme.overline.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 16),
            if (order.shippingAddress != null && order.shippingAddress!.isNotEmpty) ...[
              _AddressBlock(
                icon: Iconsax.truck,
                label: 'Shipping Address',
                address: order.shippingAddress!.displayString ?? '',
                isDark: isDark,
              ),
              if (order.billingAddress != null && order.billingAddress!.isNotEmpty) const SizedBox(height: 16),
            ],
            if (order.billingAddress != null && order.billingAddress!.isNotEmpty)
              _AddressBlock(
                icon: Iconsax.receipt,
                label: 'Billing Address',
                address: order.billingAddress!.displayString ?? '',
                isDark: isDark,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotesSection(OrderModel order, bool isDark) {
    return _buildSection(
      isDark: isDark,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'NOTES',
              style: IrisTheme.overline.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              order.notes!,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark.withValues(alpha: 0.8)
                    : LuxuryColors.textOnLight.withValues(alpha: 0.8),
                height: 1.6,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineSection(bool isDark) {
    final timelineAsync = ref.watch(orderTimelineProvider(widget.orderId));

    return _buildSection(
      isDark: isDark,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'TIMELINE',
              style: IrisTheme.overline.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 16),
            timelineAsync.when(
              data: (entries) {
                if (entries.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        'No timeline entries yet',
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ),
                  );
                }
                return Column(
                  children: entries.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final item = entry.value;
                    final isLast = idx == entries.length - 1;

                    return _TimelineRow(
                      entry: item,
                      isLast: isLast,
                      isDark: isDark,
                      formatDate: _formatDateShort,
                    );
                  }).toList(),
                );
              },
              loading: () => const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
              error: (_, _) => Center(
                child: Text(
                  'Could not load timeline',
                  style: IrisTheme.bodySmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(OrderModel order, bool isDark) {
    final status = order.status;

    if (status == OrderStatus.CANCELLED || status == OrderStatus.COMPLETED) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Primary action based on status
        if (status == OrderStatus.DRAFT || status == OrderStatus.PENDING)
          _ActionButton(
            label: 'Confirm Order',
            icon: Iconsax.tick_circle,
            gradient: LuxuryColors.emeraldGradient,
            onTap: () => _handleConfirmOrder(order),
          ),
        if (status == OrderStatus.CONFIRMED || status == OrderStatus.PROCESSING)
          _ActionButton(
            label: 'Ship Order',
            icon: Iconsax.truck,
            gradient: LuxuryColors.emeraldGradient,
            onTap: () => _handleShipOrder(order),
          ),
        if (status == OrderStatus.SHIPPED)
          _ActionButton(
            label: 'Mark Delivered',
            icon: Iconsax.tick_square,
            gradient: LuxuryColors.emeraldGradient,
            onTap: () => _handleDeliverOrder(order),
          ),
        if (status == OrderStatus.DELIVERED)
          _ActionButton(
            label: 'Complete Order',
            icon: Iconsax.shield_tick,
            gradient: LuxuryColors.goldShimmer,
            onTap: () async {
              await _executeAction(
                () => ref.read(ordersServiceProvider).updateOrder(
                    order.id, {'status': 'COMPLETED'}).then((_) => true),
                'Order completed',
              );
            },
          ),

        const SizedBox(height: 12),

        // Cancel button (available unless cancelled/completed/delivered)
        if (status != OrderStatus.DELIVERED)
          _ActionButton(
            label: 'Cancel Order',
            icon: Iconsax.close_circle,
            isOutlined: true,
            onTap: () => _handleCancelOrder(order),
          ),

        const SizedBox(height: 16),

        // Secondary actions row
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _SmallActionButton(
              icon: Iconsax.document_download,
              label: 'PDF',
              onTap: () {
                HapticFeedback.lightImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Exporting PDF...'),
                    backgroundColor: LuxuryColors.infoCobalt,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              },
            ),
            const SizedBox(width: 24),
            _SmallActionButton(
              icon: Iconsax.share,
              label: 'Share',
              onTap: () {
                HapticFeedback.lightImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Share feature coming soon'),
                    backgroundColor: LuxuryColors.champagneGold,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              },
            ),
            const SizedBox(width: 24),
            _SmallActionButton(
              icon: Iconsax.edit_2,
              label: 'Edit',
              onTap: () => _handleEditOrder(order),
            ),
          ],
        ),
      ],
    );
  }
}

// ───────────────────────────────────────────────────────────
// HELPER WIDGETS
// ───────────────────────────────────────────────────────────

class _OrderDetailStatusBadge extends StatelessWidget {
  final OrderStatus status;

  const _OrderDetailStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: status.color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: status.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            status.label.toUpperCase(),
            style: IrisTheme.labelSmall.copyWith(
              color: status.color,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

class _DateInfo extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;

  const _DateInfo({
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: IrisTheme.caption.copyWith(
            color: LuxuryColors.textMuted,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _TotalsRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;

  const _TotalsRow({
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
        Text(
          value,
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _AddressBlock extends StatelessWidget {
  final IconData icon;
  final String label;
  final String address;
  final bool isDark;

  const _AddressBlock({
    required this.icon,
    required this.label,
    required this.address,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            size: 18,
            color: LuxuryColors.champagneGold,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: IrisTheme.overline.copyWith(
                  color: LuxuryColors.textMuted,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                address,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark.withValues(alpha: 0.8)
                      : LuxuryColors.textOnLight.withValues(alpha: 0.8),
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final OrderTimelineEntry entry;
  final bool isLast;
  final bool isDark;
  final String Function(DateTime?) formatDate;

  const _TimelineRow({
    required this.entry,
    required this.isLast,
    required this.isDark,
    required this.formatDate,
  });

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Dot and line
          Column(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold,
                  shape: BoxShape.circle,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          // Content
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.action,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (entry.description != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      entry.description!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (entry.userName != null) ...[
                        Text(
                          entry.userName!,
                          style: IrisTheme.caption.copyWith(
                            color: LuxuryColors.champagneGold,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          ' -- ',
                          style: IrisTheme.caption.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                      Text(
                        DateFormat('MMM d, yyyy h:mm a').format(entry.timestamp),
                        style: IrisTheme.caption.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final LinearGradient? gradient;
  final bool isOutlined;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    this.gradient,
    this.isOutlined = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (isOutlined) {
      return GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: LuxuryColors.champagneGold),
              const SizedBox(width: 10),
              Text(
                label,
                style: IrisTheme.labelLarge.copyWith(
                  color: LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: BoxDecoration(
          gradient: gradient ?? LuxuryColors.goldShimmer,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: (gradient?.colors.first ?? LuxuryColors.champagneGold)
                  .withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: LuxuryColors.richBlack),
            const SizedBox(width: 10),
            Text(
              label,
              style: IrisTheme.labelLarge.copyWith(
                color: LuxuryColors.richBlack,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmallActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SmallActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
              ),
            ),
            child: Icon(icon, size: 20, color: LuxuryColors.champagneGold),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: IrisTheme.caption.copyWith(
              color: LuxuryColors.textMuted,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _OptionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveColor = color ??
        (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight);

    return ListTile(
      leading: Icon(icon, color: effectiveColor),
      title: Text(
        label,
        style: IrisTheme.bodyMedium.copyWith(color: effectiveColor),
      ),
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
    );
  }
}

class _OrderActionDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmLabel;
  final IconData confirmIcon;
  final Color confirmColor;

  const _OrderActionDialog({
    required this.title,
    required this.message,
    required this.confirmLabel,
    required this.confirmIcon,
    required this.confirmColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 380),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header with icon
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  ),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: confirmColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(confirmIcon, size: 28, color: confirmColor),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: IrisTheme.titleLarge.copyWith(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                ],
              ),
            ),
            // Message
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                message,
                style: IrisTheme.bodyMedium.copyWith(
                  color: LuxuryColors.textMuted,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            // Actions
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(context, false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: isDark
                              ? LuxuryColors.obsidian
                              : LuxuryColors.diamond,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Text(
                            'Cancel',
                            style: IrisTheme.labelLarge.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(context, true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: confirmColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(confirmIcon, size: 16, color: Colors.white),
                              const SizedBox(width: 6),
                              Text(
                                confirmLabel,
                                style: IrisTheme.labelLarge.copyWith(
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
