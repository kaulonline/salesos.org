import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/orders_service.dart';

/// Bottom sheet for converting a quote to an order.
/// Shows a quote summary and a confirm conversion button.
class ConvertQuoteSheet extends ConsumerStatefulWidget {
  final String quoteId;
  final String quoteNumber;
  final String customerName;
  final double amount;
  final int lineItemCount;
  final VoidCallback? onSuccess;

  const ConvertQuoteSheet({
    super.key,
    required this.quoteId,
    required this.quoteNumber,
    required this.customerName,
    required this.amount,
    this.lineItemCount = 0,
    this.onSuccess,
  });

  /// Show as a modal bottom sheet
  static Future<void> show({
    required BuildContext context,
    required String quoteId,
    required String quoteNumber,
    required String customerName,
    required double amount,
    int lineItemCount = 0,
    VoidCallback? onSuccess,
  }) async {
    HapticFeedback.mediumImpact();
    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => ConvertQuoteSheet(
        quoteId: quoteId,
        quoteNumber: quoteNumber,
        customerName: customerName,
        amount: amount,
        lineItemCount: lineItemCount,
        onSuccess: onSuccess,
      ),
    );
  }

  @override
  ConsumerState<ConvertQuoteSheet> createState() => _ConvertQuoteSheetState();
}

class _ConvertQuoteSheetState extends ConsumerState<ConvertQuoteSheet> {
  bool _isLoading = false;

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  Future<void> _handleConvert() async {
    setState(() => _isLoading = true);

    try {
      final service = ref.read(ordersServiceProvider);
      final order = await service.convertFromQuote(widget.quoteId);

      HapticFeedback.mediumImpact();

      if (order != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order ${order.orderNumber} created from quote'),
            backgroundColor: LuxuryColors.successGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        Navigator.of(context).pop();
        widget.onSuccess?.call();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to convert quote to order'),
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
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.richBlack : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(24, 16, 24, 24 + bottomPadding),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark
                      ? LuxuryColors.champagneGold.withValues(alpha: 0.3)
                      : Colors.black.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Title
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.convert_3d_cube,
                    size: 22,
                    color: LuxuryColors.rolexGreen,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Convert to Order',
                        style: IrisTheme.titleLarge.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Create an order from this quotation',
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ).animate().fadeIn(duration: 200.ms),

            const SizedBox(height: 24),

            // Quote summary card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark
                    ? LuxuryColors.obsidian
                    : const Color(0xFFFAF9F7),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                children: [
                  // Quote number
                  _SummaryRow(
                    icon: Iconsax.document_text,
                    label: 'Quote',
                    value: widget.quoteNumber,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 14),
                  // Customer
                  _SummaryRow(
                    icon: Iconsax.user,
                    label: 'Customer',
                    value: widget.customerName,
                    isDark: isDark,
                  ),
                  if (widget.lineItemCount > 0) ...[
                    const SizedBox(height: 14),
                    _SummaryRow(
                      icon: Iconsax.box_1,
                      label: 'Items',
                      value: '${widget.lineItemCount} line item${widget.lineItemCount != 1 ? 's' : ''}',
                      isDark: isDark,
                    ),
                  ],
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
                  const SizedBox(height: 16),
                  // Total amount
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'ORDER TOTAL',
                        style: IrisTheme.overline.copyWith(
                          color: LuxuryColors.champagneGold,
                          letterSpacing: 2,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        _formatCurrency(widget.amount),
                        style: IrisTheme.headlineSmall.copyWith(
                          color: LuxuryColors.champagneGold,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

            const SizedBox(height: 16),

            // Info text
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: LuxuryColors.infoCobalt.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: LuxuryColors.infoCobalt.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Iconsax.info_circle,
                    size: 18,
                    color: LuxuryColors.infoCobalt,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'All line items and customer details will be transferred to the new order.',
                      style: IrisTheme.bodySmall.copyWith(
                        color: LuxuryColors.infoCobalt,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate(delay: 150.ms).fadeIn(),

            const SizedBox(height: 24),

            // Action buttons
            Row(
              children: [
                Expanded(
                  child: IrisButton(
                    label: 'Cancel',
                    variant: IrisButtonVariant.outline,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: IrisButton(
                    label: _isLoading ? 'Converting...' : 'Create Order',
                    icon: Iconsax.convert_3d_cube,
                    variant: IrisButtonVariant.emerald,
                    isLoading: _isLoading,
                    onPressed: _isLoading ? null : _handleConvert,
                  ),
                ),
              ],
            ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;

  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: LuxuryColors.textMuted,
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 80,
          child: Text(
            label,
            style: IrisTheme.bodySmall.copyWith(
              color: LuxuryColors.textMuted,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
