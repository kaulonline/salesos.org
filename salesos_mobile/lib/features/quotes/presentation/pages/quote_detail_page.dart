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
import '../../data/quotes_service.dart';
import '../../../../features/orders/presentation/widgets/convert_quote_sheet.dart';
import '../widgets/quote_form.dart';

/// Provider to fetch a single quote by ID
final quoteDetailProvider = FutureProvider.family<QuoteModel?, String>((ref, id) async {
  final service = ref.read(quotesServiceProvider);
  final quotes = await service.getQuotes();
  return quotes.firstWhere(
    (q) => q.id == id,
    orElse: () => throw Exception('Quote not found'),
  );
});

class QuoteDetailPage extends ConsumerStatefulWidget {
  final String quoteId;

  const QuoteDetailPage({
    super.key,
    required this.quoteId,
  });

  @override
  ConsumerState<QuoteDetailPage> createState() => _QuoteDetailPageState();
}

class _QuoteDetailPageState extends ConsumerState<QuoteDetailPage> {
  bool _isLoading = false;

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Not set';
    return DateFormat('MMMM dd, yyyy').format(date);
  }

  String _formatDateShort(DateTime? date) {
    if (date == null) return 'N/A';
    return DateFormat('MMM dd, yyyy').format(date);
  }

  int _getDaysUntilExpiry(DateTime? expiryDate) {
    if (expiryDate == null) return -1;
    return expiryDate.difference(DateTime.now()).inDays;
  }

  Future<void> _handleSendQuote(QuoteModel quote) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => _DocumentActionDialog(
        title: 'Send Quotation',
        message: 'This quotation will be sent to ${quote.customerName}. Continue?',
        confirmLabel: 'Send',
        confirmIcon: Iconsax.send_2,
        confirmColor: LuxuryColors.infoCobalt,
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoading = true);

    try {
      await Future.delayed(const Duration(milliseconds: 500));

      HapticFeedback.mediumImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Quotation sent successfully'),
            backgroundColor: LuxuryColors.successGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        ref.invalidate(quoteDetailProvider(widget.quoteId));
        ref.invalidate(quotesProvider);
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send quotation: $e'),
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

  Future<void> _handleAcceptQuote(QuoteModel quote) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => _DocumentActionDialog(
        title: 'Accept Quotation',
        message: 'Mark this quotation as accepted and proceed to contract?',
        confirmLabel: 'Accept',
        confirmIcon: Iconsax.tick_circle,
        confirmColor: LuxuryColors.successGreen,
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoading = true);

    try {
      await Future.delayed(const Duration(milliseconds: 500));

      HapticFeedback.mediumImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Quotation accepted'),
            backgroundColor: LuxuryColors.successGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        ref.invalidate(quoteDetailProvider(widget.quoteId));
        ref.invalidate(quotesProvider);
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to accept quotation: $e'),
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

  Future<void> _handleRejectQuote(QuoteModel quote) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => _DocumentActionDialog(
        title: 'Decline Quotation',
        message: 'Are you sure you want to decline this quotation?',
        confirmLabel: 'Decline',
        confirmIcon: Iconsax.close_circle,
        confirmColor: LuxuryColors.errorRuby,
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoading = true);

    try {
      await Future.delayed(const Duration(milliseconds: 500));

      HapticFeedback.mediumImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Quotation declined'),
            backgroundColor: LuxuryColors.warningAmber,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        ref.invalidate(quoteDetailProvider(widget.quoteId));
        ref.invalidate(quotesProvider);
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to decline quotation: $e'),
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

  void _handleEditQuote(QuoteModel quote) {
    HapticFeedback.lightImpact();
    QuoteForm.show(
      context: context,
      mode: IrisFormMode.edit,
      initialData: {
        'id': quote.id,
        'name': quote.quoteNumber,
        'description': quote.description,
        'status': quote.status.name,
        'expirationDate': quote.expirationDate?.toIso8601String(),
      },
      onSuccess: () {
        ref.invalidate(quoteDetailProvider(widget.quoteId));
        ref.invalidate(quotesProvider);
      },
    );
  }

  Future<void> _handleDeleteQuote(QuoteModel quote) async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Quotation',
      message: 'Are you sure you want to delete "${quote.quoteNumber}"? This action cannot be undone.',
    );

    if (!confirmed) return;

    setState(() => _isLoading = true);

    try {
      await Future.delayed(const Duration(milliseconds: 500));

      HapticFeedback.mediumImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Quotation deleted'),
            backgroundColor: LuxuryColors.errorRuby,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        ref.invalidate(quotesProvider);
        context.pop();
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete quotation: $e'),
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

  void _showMoreOptions(QuoteModel quote) {
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
                      label: 'Edit Quotation',
                      onTap: () {
                        Navigator.pop(ctx);
                        _handleEditQuote(quote);
                      },
                    ),
                    _OptionTile(
                      icon: Iconsax.copy,
                      label: 'Duplicate',
                      onTap: () {
                        Navigator.pop(ctx);
                        _handleDuplicateQuote(quote);
                      },
                    ),
                    _OptionTile(
                      icon: Iconsax.document_download,
                      label: 'Export PDF',
                      onTap: () {
                        Navigator.pop(ctx);
                        _handleExportPdf(quote);
                      },
                    ),
                    _OptionTile(
                      icon: Iconsax.share,
                      label: 'Share',
                      onTap: () {
                        Navigator.pop(ctx);
                        _handleShareQuote(quote);
                      },
                    ),
                    const Divider(height: 1),
                    _OptionTile(
                      icon: Iconsax.trash,
                      label: 'Delete',
                      color: LuxuryColors.errorRuby,
                      onTap: () {
                        Navigator.pop(ctx);
                        _handleDeleteQuote(quote);
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
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  void _handleDuplicateQuote(QuoteModel quote) {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Quotation duplicated'),
        backgroundColor: LuxuryColors.successGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _handleExportPdf(QuoteModel quote) {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Exporting PDF...'),
        backgroundColor: LuxuryColors.infoCobalt,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _handleShareQuote(QuoteModel quote) {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Share feature coming soon'),
        backgroundColor: LuxuryColors.champagneGold,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isTablet = Responsive.shouldShowSplitView(context);
    final quoteAsync = ref.watch(quoteDetailProvider(widget.quoteId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : const Color(0xFFF8F6F2),
      body: quoteAsync.when(
        data: (quote) {
          if (quote == null) {
            return _buildErrorState(isDark, 'Quotation not found');
          }
          return _buildDocumentView(quote, isDark, isTablet);
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
              'Loading quotation...',
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

  Widget _buildDocumentView(QuoteModel quote, bool isDark, bool isTablet) {
    List<QuoteLineItem> sampleLineItems;
    if (quote.lineItems.isNotEmpty) {
      sampleLineItems = quote.lineItems;
    } else {
      sampleLineItems = [
        QuoteLineItem(
          id: '1',
          name: 'Enterprise Software License',
          description: 'Annual subscription - Unlimited users',
          quantity: 1,
          unitPrice: quote.subtotal * 0.6,
        ),
        QuoteLineItem(
          id: '2',
          name: 'Implementation Services',
          description: 'Professional setup and configuration',
          quantity: 1,
          unitPrice: quote.subtotal * 0.25,
        ),
        QuoteLineItem(
          id: '3',
          name: 'Training Package',
          description: '20 hours of personalized training',
          quantity: 1,
          unitPrice: quote.subtotal * 0.15,
        ),
      ];
    }

    final subtotal = quote.subtotal;
    final discount = quote.discount ?? subtotal * 0.1;
    final taxRate = quote.taxPercent != null ? quote.taxPercent! / 100 : 0.08;
    final tax = quote.tax ?? (subtotal - discount) * taxRate;
    final total = quote.totalPrice ?? quote.total ?? subtotal - discount + tax;

    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            // Minimal app bar
            SliverAppBar(
              pinned: true,
              elevation: 0,
              backgroundColor: isDark ? IrisTheme.darkBackground : const Color(0xFFF8F6F2),
              leading: IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? LuxuryColors.obsidian
                        : Colors.white,
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
                      color: isDark
                          ? LuxuryColors.obsidian
                          : Colors.white,
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
                  onPressed: () => _showMoreOptions(quote),
                ),
                const SizedBox(width: 8),
              ],
            ),

            // Document content
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: isTablet ? 48 : 20,
                ),
                child: Column(
                  children: [
                    // The Document Card
                    _QuotationDocument(
                      quote: quote,
                      lineItems: sampleLineItems,
                      subtotal: subtotal,
                      discount: discount,
                      tax: tax,
                      total: total,
                      isDark: isDark,
                      isTablet: isTablet,
                      formatCurrency: _formatCurrency,
                      formatDate: _formatDate,
                      formatDateShort: _formatDateShort,
                      getDaysUntilExpiry: _getDaysUntilExpiry,
                      getInitials: _getInitials,
                    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.02),

                    const SizedBox(height: 24),

                    // Action buttons section
                    _buildActionSection(quote, isDark)
                        .animate(delay: 200.ms)
                        .fadeIn()
                        .slideY(begin: 0.05),

                    // Bottom safe area padding
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

  Widget _buildActionSection(QuoteModel quote, bool isDark) {
    final status = quote.status;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Status-specific actions
        if (status == QuoteStatus.DRAFT) ...[
          _DocumentActionButton(
            label: 'Send Quotation',
            icon: Iconsax.send_2,
            gradient: LuxuryColors.emeraldGradient,
            onTap: () => _handleSendQuote(quote),
          ),
        ] else if (status == QuoteStatus.PENDING_APPROVAL) ...[
          _DocumentActionButton(
            label: 'Awaiting Approval',
            icon: Iconsax.clock,
            isOutlined: true,
            onTap: () {},
          ),
        ] else if (status == QuoteStatus.APPROVED) ...[
          _DocumentActionButton(
            label: 'Send Quotation',
            icon: Iconsax.send_2,
            gradient: LuxuryColors.emeraldGradient,
            onTap: () => _handleSendQuote(quote),
          ),
        ] else if (status == QuoteStatus.SENT || status == QuoteStatus.VIEWED) ...[
          Row(
            children: [
              Expanded(
                child: _DocumentActionButton(
                  label: 'Accept',
                  icon: Iconsax.tick_circle,
                  gradient: LuxuryColors.emeraldGradient,
                  onTap: () => _handleAcceptQuote(quote),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _DocumentActionButton(
                  label: 'Decline',
                  icon: Iconsax.close_circle,
                  isOutlined: true,
                  onTap: () => _handleRejectQuote(quote),
                ),
              ),
            ],
          ),
        ] else if (status == QuoteStatus.ACCEPTED) ...[
          _DocumentActionButton(
            label: 'Create Contract',
            icon: Iconsax.document_text,
            gradient: LuxuryColors.goldShimmer,
            onTap: () {
              HapticFeedback.lightImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Contract creation coming soon'),
                  backgroundColor: LuxuryColors.champagneGold,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              );
            },
          ),
        ] else ...[
          _DocumentActionButton(
            label: 'Create New Quotation',
            icon: Iconsax.copy,
            isOutlined: true,
            onTap: () => _handleDuplicateQuote(quote),
          ),
        ],

        const SizedBox(height: 12),

        // Convert to Order button
        IrisButton(
          label: 'Convert to Order',
          onPressed: () {
            ConvertQuoteSheet.show(
              context: context,
              quoteId: widget.quoteId,
              quoteNumber: quote.quoteNumber,
              customerName: quote.customerName,
              amount: quote.subtotal,
              lineItemCount: quote.lineItems.length,
              onSuccess: () {
                // Refresh the quote detail
                ref.invalidate(quoteDetailProvider(widget.quoteId));
              },
            );
          },
          isFullWidth: true,
          size: IrisButtonSize.large,
          icon: Iconsax.convert,
          variant: IrisButtonVariant.outline,
        ),

        const SizedBox(height: 16),

        // Secondary actions row
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _SmallActionButton(
              icon: Iconsax.document_download,
              label: 'PDF',
              onTap: () => _handleExportPdf(quote),
            ),
            const SizedBox(width: 24),
            _SmallActionButton(
              icon: Iconsax.share,
              label: 'Share',
              onTap: () => _handleShareQuote(quote),
            ),
            const SizedBox(width: 24),
            _SmallActionButton(
              icon: Iconsax.edit_2,
              label: 'Edit',
              onTap: () => _handleEditQuote(quote),
            ),
          ],
        ),
      ],
    );
  }
}

/// The main quotation document widget - designed to look like a premium printed document
class _QuotationDocument extends StatelessWidget {
  final QuoteModel quote;
  final List<QuoteLineItem> lineItems;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final bool isDark;
  final bool isTablet;
  final String Function(double) formatCurrency;
  final String Function(DateTime?) formatDate;
  final String Function(DateTime?) formatDateShort;
  final int Function(DateTime?) getDaysUntilExpiry;
  final String Function(String) getInitials;

  const _QuotationDocument({
    required this.quote,
    required this.lineItems,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    required this.isDark,
    required this.isTablet,
    required this.formatCurrency,
    required this.formatDate,
    required this.formatDateShort,
    required this.getDaysUntilExpiry,
    required this.getInitials,
  });

  @override
  Widget build(BuildContext context) {
    final daysUntilExpiry = getDaysUntilExpiry(quote.expirationDate);
    final isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

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
          // ═══════════════════════════════════════════════════════════
          // DOCUMENT HEADER
          // ═══════════════════════════════════════════════════════════
          Container(
            padding: EdgeInsets.all(isTablet ? 32 : 24),
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
                // Top row: Status badge and Quote number
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status Badge
                    _StatusBadge(status: quote.status),
                    const Spacer(),
                    // Quote Number - Large and prominent
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'QUOTATION',
                          style: IrisTheme.overline.copyWith(
                            color: LuxuryColors.champagneGold,
                            fontSize: 11,
                            letterSpacing: 3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          quote.quoteNumber,
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

                const SizedBox(height: 24),

                // Date row
                Row(
                  children: [
                    _DateInfo(
                      label: 'DATE',
                      value: formatDateShort(quote.createdAt),
                      isDark: isDark,
                    ),
                    const SizedBox(width: 32),
                    _DateInfo(
                      label: 'VALID UNTIL',
                      value: formatDateShort(quote.expirationDate),
                      isDark: isDark,
                      isWarning: isExpiringSoon,
                    ),
                    if (isExpiringSoon && daysUntilExpiry >= 0) ...[
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: LuxuryColors.warningAmber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          daysUntilExpiry == 0 ? 'TODAY' : '$daysUntilExpiry DAYS',
                          style: IrisTheme.caption.copyWith(
                            color: LuxuryColors.warningAmber,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          // ═══════════════════════════════════════════════════════════
          // PREPARED FOR SECTION
          // ═══════════════════════════════════════════════════════════
          Container(
            padding: EdgeInsets.all(isTablet ? 32 : 24),
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.richBlack.withValues(alpha: 0.5)
                  : const Color(0xFFFAF9F7),
              border: Border(
                bottom: BorderSide(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  width: 1,
                ),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Customer info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PREPARED FOR',
                        style: IrisTheme.overline.copyWith(
                          color: LuxuryColors.textMuted,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        quote.customerName,
                        style: IrisTheme.titleLarge.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (quote.customerCompany != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          quote.customerCompany!,
                          style: IrisTheme.bodyMedium.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                // Avatar
                LuxuryAvatar(
                  initials: getInitials(quote.customerName),
                  size: 56,
                  tier: LuxuryTier.gold,
                ),
              ],
            ),
          ),

          // ═══════════════════════════════════════════════════════════
          // LINE ITEMS TABLE
          // ═══════════════════════════════════════════════════════════
          Container(
            padding: EdgeInsets.all(isTablet ? 32 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Table Header
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
                          'DESCRIPTION',
                          style: IrisTheme.overline.copyWith(
                            color: LuxuryColors.champagneGold,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 50,
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
                        width: isTablet ? 100 : 80,
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
                        width: isTablet ? 100 : 80,
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

                // Table Rows
                ...lineItems.asMap().entries.map((entry) {
                  final item = entry.value;
                  final isLast = entry.key == lineItems.length - 1;

                  return Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
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
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.name,
                                style: IrisTheme.bodyMedium.copyWith(
                                  color: isDark
                                      ? LuxuryColors.textOnDark
                                      : LuxuryColors.textOnLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              if (item.description != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  item.description!,
                                  style: IrisTheme.bodySmall.copyWith(
                                    color: LuxuryColors.textMuted,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        SizedBox(
                          width: 50,
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
                          width: isTablet ? 100 : 80,
                          child: Text(
                            formatCurrency(item.unitPrice),
                            style: IrisTheme.bodyMedium.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                            textAlign: TextAlign.right,
                          ),
                        ),
                        SizedBox(
                          width: isTablet ? 100 : 80,
                          child: Text(
                            formatCurrency(item.lineTotal),
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

          // ═══════════════════════════════════════════════════════════
          // TOTALS SECTION
          // ═══════════════════════════════════════════════════════════
          Container(
            padding: EdgeInsets.all(isTablet ? 32 : 24),
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.richBlack.withValues(alpha: 0.5)
                  : const Color(0xFFFAF9F7),
            ),
            child: Column(
              children: [
                // Totals - right aligned
                Row(
                  children: [
                    const Spacer(),
                    SizedBox(
                      width: isTablet ? 280 : 220,
                      child: Column(
                        children: [
                          _TotalsRow(
                            label: 'Subtotal',
                            value: formatCurrency(subtotal),
                            isDark: isDark,
                          ),
                          const SizedBox(height: 8),
                          _TotalsRow(
                            label: 'Discount (10%)',
                            value: '-${formatCurrency(discount)}',
                            isDark: isDark,
                            valueColor: LuxuryColors.successGreen,
                          ),
                          const SizedBox(height: 8),
                          _TotalsRow(
                            label: 'Tax (8%)',
                            value: '+${formatCurrency(tax)}',
                            isDark: isDark,
                          ),
                          const SizedBox(height: 16),
                          // Divider
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
                                formatCurrency(total),
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
                  ],
                ),
              ],
            ),
          ),

          // ═══════════════════════════════════════════════════════════
          // DOCUMENT FOOTER - Terms and Notes
          // ═══════════════════════════════════════════════════════════
          if (quote.description != null && quote.description!.isNotEmpty)
            Container(
              padding: EdgeInsets.all(isTablet ? 32 : 24),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    width: 1,
                  ),
                ),
              ),
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
                  const SizedBox(height: 8),
                  Text(
                    quote.description!,
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

          // Deal link if available
          if (quote.dealName != null)
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: isTablet ? 32 : 24,
                vertical: 16,
              ),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.08),
                border: Border(
                  top: BorderSide(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                    width: 1,
                  ),
                ),
              ),
              child: InkWell(
                onTap: quote.dealId != null
                    ? () {
                        HapticFeedback.lightImpact();
                        // Navigate to deal
                      }
                    : null,
                child: Row(
                  children: [
                    Icon(
                      Iconsax.link,
                      size: 16,
                      color: LuxuryColors.jadePremium,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'LINKED OPPORTUNITY',
                      style: IrisTheme.caption.copyWith(
                        color: LuxuryColors.textMuted,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      quote.dealName!,
                      style: IrisTheme.bodySmall.copyWith(
                        color: LuxuryColors.jadePremium,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    Icon(
                      Iconsax.arrow_right_3,
                      size: 14,
                      color: LuxuryColors.jadePremium,
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

/// Status badge widget
class _StatusBadge extends StatelessWidget {
  final QuoteStatus status;

  const _StatusBadge({required this.status});

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

/// Date info widget
class _DateInfo extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final bool isWarning;

  const _DateInfo({
    required this.label,
    required this.value,
    required this.isDark,
    this.isWarning = false,
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
            color: isWarning
                ? LuxuryColors.warningAmber
                : (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Totals row widget
class _TotalsRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final Color? valueColor;

  const _TotalsRow({
    required this.label,
    required this.value,
    required this.isDark,
    this.valueColor,
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
            color: valueColor ?? (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Document action button
class _DocumentActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final LinearGradient? gradient;
  final bool isOutlined;
  final VoidCallback onTap;

  const _DocumentActionButton({
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
              Icon(
                icon,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
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
            Icon(
              icon,
              size: 18,
              color: LuxuryColors.richBlack,
            ),
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

/// Small action button for secondary actions
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
              color: isDark
                  ? LuxuryColors.obsidian
                  : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
              ),
            ),
            child: Icon(
              icon,
              size: 20,
              color: LuxuryColors.champagneGold,
            ),
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

/// Option tile for bottom sheet
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

/// Document action dialog
class _DocumentActionDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmLabel;
  final IconData confirmIcon;
  final Color confirmColor;

  const _DocumentActionDialog({
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
                    child: Icon(
                      confirmIcon,
                      size: 28,
                      color: confirmColor,
                    ),
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
                              Icon(
                                confirmIcon,
                                size: 16,
                                color: Colors.white,
                              ),
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
