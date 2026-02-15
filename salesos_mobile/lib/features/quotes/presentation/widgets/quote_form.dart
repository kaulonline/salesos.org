import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/models/quote.dart' hide QuoteLineItem;
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/quotes_service.dart' show QuoteLineItem;
import 'line_item_card.dart';

/// Quote form widget for creating and editing quotes
class QuoteForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final List<QuoteLineItem>? initialLineItems;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;
  final String? opportunityId;

  const QuoteForm({
    super.key,
    this.initialData,
    this.initialLineItems,
    this.mode = IrisFormMode.create,
    this.onSuccess,
    this.opportunityId,
  });

  @override
  ConsumerState<QuoteForm> createState() => _QuoteFormState();

  /// Show the quote form as a centered modal
  static Future<void> show({
    required BuildContext context,
    Map<String, dynamic>? initialData,
    List<QuoteLineItem>? initialLineItems,
    IrisFormMode mode = IrisFormMode.create,
    VoidCallback? onSuccess,
    String? opportunityId,
  }) async {
    HapticFeedback.mediumImpact();
    await showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: QuoteForm(
            initialData: initialData,
            initialLineItems: initialLineItems,
            mode: mode,
            onSuccess: onSuccess,
            opportunityId: opportunityId,
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
}

class _QuoteFormState extends ConsumerState<QuoteForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  // Form controllers
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _notesController;
  late final TextEditingController _discountController;
  late final TextEditingController _taxController;
  late final TextEditingController _termsController;

  QuoteStatus _status = QuoteStatus.DRAFT;
  DateTime? _expiryDate;
  List<QuoteLineItem> _lineItems = [];

  @override
  void initState() {
    super.initState();
    _initializeForm();
  }

  void _initializeForm() {
    final data = widget.initialData ?? {};

    _nameController = TextEditingController(
      text: data['name'] as String? ?? data['Name'] as String? ?? '',
    );
    _descriptionController = TextEditingController(
      text: data['description'] as String? ?? data['Description'] as String? ?? '',
    );
    _notesController = TextEditingController(
      text: data['notes'] as String? ?? data['Notes'] as String? ?? '',
    );

    final discount = data['discount'] as num? ?? data['Discount'] as num?;
    _discountController = TextEditingController(
      text: discount != null ? discount.toString() : '',
    );

    final tax = data['tax'] as num? ?? data['Tax'] as num?;
    _taxController = TextEditingController(
      text: tax != null ? tax.toString() : '',
    );

    _termsController = TextEditingController(
      text: data['terms'] as String? ?? data['Terms'] as String? ?? '',
    );

    _status = QuoteStatus.fromString(
      data['status'] as String? ?? data['Status'] as String?,
    );

    final expiryStr = data['expirationDate'] as String? ??
        data['validUntil'] as String? ??
        data['expiryDate'] as String? ??
        data['ExpirationDate'] as String?;
    if (expiryStr != null) {
      _expiryDate = DateTime.tryParse(expiryStr);
    }
    _expiryDate ??= DateTime.now().add(const Duration(days: 30));

    // Initialize line items
    if (widget.initialLineItems != null) {
      _lineItems = List.from(widget.initialLineItems!);
    } else {
      final lineItemsData = data['lineItems'] as List? ??
          data['QuoteLineItems'] as List? ?? [];
      _lineItems = lineItemsData
          .map((item) => QuoteLineItem.fromJson(item as Map<String, dynamic>))
          .toList();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _notesController.dispose();
    _discountController.dispose();
    _taxController.dispose();
    _termsController.dispose();
    super.dispose();
  }

  double get _subtotal {
    return _lineItems.fold(0.0, (sum, item) => sum + item.lineTotal);
  }

  double get _discountAmount {
    final discountPercent = double.tryParse(_discountController.text) ?? 0;
    return _subtotal * (discountPercent / 100);
  }

  double get _taxAmount {
    final taxPercent = double.tryParse(_taxController.text) ?? 0;
    return (_subtotal - _discountAmount) * (taxPercent / 100);
  }

  double get _grandTotal {
    return _subtotal - _discountAmount + _taxAmount;
  }

  Future<void> _selectExpiryDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiryDate ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
              primary: LuxuryColors.rolexGreen,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _expiryDate = picked;
      });
    }
  }

  void _addLineItem() {
    _showLineItemDialog();
  }

  void _editLineItem(int index) {
    _showLineItemDialog(
      lineItem: _lineItems[index],
      index: index,
    );
  }

  void _deleteLineItem(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => _DeleteLineItemDialog(),
    );

    if (confirmed == true) {
      setState(() {
        _lineItems.removeAt(index);
      });
      HapticFeedback.mediumImpact();
    }
  }

  void _showLineItemDialog({QuoteLineItem? lineItem, int? index}) {
    final isEdit = lineItem != null;
    final nameController = TextEditingController(text: lineItem?.name ?? '');
    final descController = TextEditingController(text: lineItem?.description ?? '');
    final qtyController = TextEditingController(
      text: lineItem?.quantity.toString() ?? '1',
    );
    final priceController = TextEditingController(
      text: lineItem?.unitPrice.toString() ?? '',
    );
    final discountController = TextEditingController(
      text: lineItem?.discount?.toString() ?? '',
    );

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
              child: SingleChildScrollView(
                padding: EdgeInsets.only(
                  left: 24,
                  right: 24,
                  top: 24,
                  bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            gradient: LuxuryColors.emeraldGradient,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            isEdit ? Iconsax.edit_2 : Iconsax.add,
                            size: 20,
                            color: LuxuryColors.diamond,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            isEdit ? 'EDIT LINE ITEM' : 'ADD LINE ITEM',
                            style: IrisTheme.headlineSmall.copyWith(
                              color: isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight,
                              letterSpacing: 1.2,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close, color: LuxuryColors.textMuted),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    // Form fields
                    IrisTextField(
                      controller: nameController,
                      label: 'Item Name',
                      hint: 'Product or service name',
                      prefixIcon: Iconsax.box_1,
                    ),
                    const SizedBox(height: 16),
                    IrisTextField(
                      controller: descController,
                      label: 'Description',
                      hint: 'Optional description',
                      prefixIcon: Iconsax.document_text,
                      maxLines: 2,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: IrisTextField(
                            controller: qtyController,
                            label: 'Quantity',
                            hint: '1',
                            prefixIcon: Iconsax.hashtag,
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: IrisTextField(
                            controller: priceController,
                            label: 'Unit Price',
                            hint: '0.00',
                            prefixIcon: Icons.attach_money,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            inputFormatters: [
                              FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    IrisTextField(
                      controller: discountController,
                      label: 'Discount %',
                      hint: '0',
                      prefixIcon: Iconsax.percentage_square,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                      ],
                    ),
                    const SizedBox(height: 24),
                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: IrisButton(
                            label: 'Cancel',
                            variant: IrisButtonVariant.secondary,
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: IrisButton(
                            label: isEdit ? 'Update' : 'Add',
                            variant: IrisButtonVariant.primary,
                            icon: isEdit ? Iconsax.tick_circle : Iconsax.add,
                            onPressed: () {
                              final name = nameController.text.trim();
                              if (name.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Item name is required')),
                                );
                                return;
                              }

                              final qty = int.tryParse(qtyController.text) ?? 1;
                              final price = double.tryParse(priceController.text) ?? 0;
                              final discount = double.tryParse(discountController.text);

                              final newItem = QuoteLineItem(
                                id: lineItem?.id,
                                name: name,
                                description: descController.text.trim().isNotEmpty
                                    ? descController.text.trim()
                                    : null,
                                quantity: qty,
                                unitPrice: price,
                                discount: discount,
                                productId: lineItem?.productId,
                              );

                              setState(() {
                                if (isEdit && index != null) {
                                  _lineItems[index] = newItem;
                                } else {
                                  _lineItems.add(newItem);
                                }
                              });

                              HapticFeedback.mediumImpact();
                              Navigator.pop(ctx);
                            },
                          ),
                        ),
                      ],
                    ),
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

  /// Build quote data for API submission
  Map<String, dynamic> _buildQuoteData() {
    final discount = double.tryParse(_discountController.text);
    final tax = double.tryParse(_taxController.text);

    return {
      'name': _nameController.text.trim(),
      'description': _descriptionController.text.trim(),
      'notes': _notesController.text.trim(),
      'terms': _termsController.text.trim(),
      'status': _status.name,
      'discount': ?discount,
      'tax': ?tax,
      if (_expiryDate != null)
        'expirationDate': _expiryDate!.toIso8601String().split('T')[0],
      if (widget.opportunityId != null) 'opportunityId': widget.opportunityId,
      'lineItems': _lineItems.map((item) => item.toJson()).toList(),
      'subtotal': _subtotal,
      'totalPrice': _grandTotal,
    };
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    if (_nameController.text.trim().isEmpty) {
      setState(() {
        _errorMessage = 'Quote name is required';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final data = _buildQuoteData();

      if (widget.mode == IrisFormMode.create) {
        await crmService.createQuote(data);
      } else {
        final id = widget.initialData?['id'] as String? ??
            widget.initialData?['Id'] as String?;
        if (id != null) {
          await crmService.updateQuote(id, data);
        }
      }

      HapticFeedback.mediumImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.mode == IrisFormMode.create
                ? 'Quote created successfully'
                : 'Quote updated successfully'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
        Navigator.of(context).pop();
        widget.onSuccess?.call();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('QuoteForm._handleSave error: $e');
      }
      setState(() {
        _errorMessage = 'Failed to save quote: ${e.toString().replaceAll('Exception: ', '')}';
      });
      HapticFeedback.heavyImpact();
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleDelete() async {
    final confirmed = await IrisDeleteConfirmation.show(
      context: context,
      title: 'Delete Quote',
      message: 'Are you sure you want to delete this quote? This action cannot be undone.',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final id = widget.initialData?['id'] as String? ??
          widget.initialData?['Id'] as String?;

      if (id != null) {
        final success = await crmService.deleteQuote(id);
        if (!success) {
          throw Exception('Failed to delete quote');
        }
      }

      HapticFeedback.mediumImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Quote deleted'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
        Navigator.of(context).pop();
        widget.onSuccess?.call();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('QuoteForm._handleDelete error: $e');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: LuxuryColors.errorRuby,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisFormDialog(
      title: widget.mode == IrisFormMode.create ? 'New Quote' : 'Edit Quote',
      mode: widget.mode,
      formKey: _formKey,
      isLoading: _isLoading,
      canDelete: widget.mode == IrisFormMode.edit,
      onSave: _handleSave,
      onDelete: widget.mode == IrisFormMode.edit ? _handleDelete : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Error message
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: LuxuryColors.errorRuby, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: LuxuryColors.errorRuby, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Quote Information Section
          IrisFormSection(
            title: 'Quote Information',
            children: [
              IrisTextField(
                controller: _nameController,
                label: 'Quote Name',
                hint: 'Enter quote name',
                prefixIcon: Iconsax.document,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Quote name is required';
                  }
                  return null;
                },
              ),
              IrisFormRow(
                children: [
                  LuxuryDropdown<QuoteStatus>(
                    label: 'Status',
                    hint: 'Select status',
                    value: _status,
                    items: QuoteStatus.values
                        .map((s) => DropdownMenuItem(
                              value: s,
                              child: Text(s.label),
                            ))
                        .toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _status = value);
                      }
                    },
                  ),
                  // Expiry date
                  GestureDetector(
                    onTap: _selectExpiryDate,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? LuxuryColors.obsidian : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark
                              ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                              : LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'EXPIRY DATE',
                            style: IrisTheme.caption.copyWith(
                              color: LuxuryColors.textMuted,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(
                                Iconsax.calendar,
                                size: 18,
                                color: LuxuryColors.champagneGold,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _expiryDate != null
                                      ? DateFormat('MMM dd, yyyy').format(_expiryDate!)
                                      : 'Select date',
                                  style: IrisTheme.bodyMedium.copyWith(
                                    color: isDark
                                        ? LuxuryColors.textOnDark
                                        : LuxuryColors.textOnLight,
                                  ),
                                ),
                              ),
                              Icon(
                                Icons.chevron_right,
                                size: 20,
                                color: LuxuryColors.textMuted,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              LuxuryTextArea(
                controller: _descriptionController,
                label: 'Description',
                hint: 'Brief description of the quote...',
                minLines: 2,
                maxLines: 4,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Line Items Section
          IrisFormSection(
            title: 'Line Items',
            children: [
              if (_lineItems.isEmpty)
                EmptyLineItemsState(
                  isEditable: true,
                  onAddItem: _addLineItem,
                )
              else ...[
                ..._lineItems.asMap().entries.map((entry) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: LineItemCard(
                      lineItem: entry.value,
                      index: entry.key,
                      isEditable: true,
                      onEdit: () => _editLineItem(entry.key),
                      onDelete: () => _deleteLineItem(entry.key),
                    ),
                  );
                }),
                const SizedBox(height: 8),
                // Add item button
                GestureDetector(
                  onTap: _addLineItem,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
                          : LuxuryColors.rolexGreen.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                        width: 1,
                        strokeAlign: BorderSide.strokeAlignCenter,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Iconsax.add_circle,
                          size: 20,
                          color: LuxuryColors.jadePremium,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'ADD LINE ITEM',
                          style: IrisTheme.labelMedium.copyWith(
                            color: LuxuryColors.jadePremium,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),

          if (_lineItems.isNotEmpty) ...[
            const SizedBox(height: 24),

            // Totals Section
            IrisFormSection(
              title: 'Pricing',
              children: [
                IrisFormRow(
                  children: [
                    IrisTextField(
                      controller: _discountController,
                      label: 'Discount %',
                      hint: '0',
                      prefixIcon: Iconsax.discount_shape,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                      ],
                      onChanged: (_) => setState(() {}),
                    ),
                    IrisTextField(
                      controller: _taxController,
                      label: 'Tax %',
                      hint: '0',
                      prefixIcon: Iconsax.receipt_2,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                      ],
                      onChanged: (_) => setState(() {}),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Totals display
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  variant: LuxuryCardVariant.elevated,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _TotalRow(
                        label: 'Subtotal',
                        value: _formatCurrency(_subtotal),
                        isDark: isDark,
                      ),
                      if (_discountAmount > 0) ...[
                        const SizedBox(height: 8),
                        _TotalRow(
                          label: 'Discount',
                          value: '-${_formatCurrency(_discountAmount)}',
                          isDark: isDark,
                          isDiscount: true,
                        ),
                      ],
                      if (_taxAmount > 0) ...[
                        const SizedBox(height: 8),
                        _TotalRow(
                          label: 'Tax',
                          value: '+${_formatCurrency(_taxAmount)}',
                          isDark: isDark,
                        ),
                      ],
                      const SizedBox(height: 12),
                      Container(
                        height: 1,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              LuxuryColors.champagneGold.withValues(alpha: 0.4),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      _TotalRow(
                        label: 'Grand Total',
                        value: _formatCurrency(_grandTotal),
                        isDark: isDark,
                        isGrandTotal: true,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],

          const SizedBox(height: 24),

          // Terms & Notes Section
          IrisFormSection(
            title: 'Terms & Notes',
            children: [
              LuxuryTextArea(
                controller: _termsController,
                label: 'Terms & Conditions',
                hint: 'Payment terms, delivery conditions, etc.',
                minLines: 2,
                maxLines: 4,
              ),
              LuxuryTextArea(
                controller: _notesController,
                label: 'Internal Notes',
                hint: 'Notes for internal use only...',
                minLines: 2,
                maxLines: 4,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Total row widget for displaying subtotal, discount, tax, and grand total
class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final bool isDiscount;
  final bool isGrandTotal;

  const _TotalRow({
    required this.label,
    required this.value,
    required this.isDark,
    this.isDiscount = false,
    this.isGrandTotal = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label.toUpperCase(),
          style: isGrandTotal
              ? IrisTheme.labelMedium.copyWith(
                  color: LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.0,
                )
              : IrisTheme.labelSmall.copyWith(
                  color: LuxuryColors.textMuted,
                  letterSpacing: 0.8,
                ),
        ),
        Text(
          value,
          style: isGrandTotal
              ? IrisTheme.headlineSmall.copyWith(
                  color: LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w700,
                )
              : IrisTheme.titleSmall.copyWith(
                  color: isDiscount
                      ? LuxuryColors.successGreen
                      : (isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight),
                  fontWeight: FontWeight.w600,
                ),
        ),
      ],
    );
  }
}

/// Delete line item confirmation dialog
class _DeleteLineItemDialog extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
          ),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Iconsax.trash,
                size: 24,
                color: LuxuryColors.errorRuby,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Remove Item?',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This line item will be removed from the quote.',
              style: IrisTheme.bodySmall.copyWith(
                color: LuxuryColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: IrisButton(
                    label: 'Cancel',
                    variant: IrisButtonVariant.secondary,
                    size: IrisButtonSize.small,
                    onPressed: () => Navigator.pop(context, false),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: IrisButton(
                    label: 'Remove',
                    variant: IrisButtonVariant.danger,
                    size: IrisButtonSize.small,
                    icon: Iconsax.trash,
                    onPressed: () => Navigator.pop(context, true),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
