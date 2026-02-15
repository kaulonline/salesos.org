import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/config/theme.dart';
import '../../data/orders_service.dart';

/// Order status options for the dropdown
const List<String> orderStatusOptions = [
  'Draft',
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Completed',
  'Cancelled',
  'Returned',
];

/// Order form widget for creating and editing orders
class OrderForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;

  const OrderForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
  });

  @override
  ConsumerState<OrderForm> createState() => _OrderFormState();

  /// Show the order form as a centered modal
  static Future<void> show({
    required BuildContext context,
    Map<String, dynamic>? initialData,
    IrisFormMode mode = IrisFormMode.create,
    VoidCallback? onSuccess,
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
          child: OrderForm(
            initialData: initialData,
            mode: mode,
            onSuccess: onSuccess,
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

class _OrderFormState extends ConsumerState<OrderForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  // Form controllers
  late final TextEditingController _nameController;
  late final TextEditingController _notesController;
  late final TextEditingController _shippingAddressController;
  late final TextEditingController _billingAddressController;
  late final TextEditingController _accountNameController;
  late final TextEditingController _contactNameController;

  DateTime? _expectedDeliveryDate;
  String? _status;

  // Line items
  final List<_LineItemData> _lineItems = [];

  @override
  void initState() {
    super.initState();
    _initializeForm();
  }

  void _initializeForm() {
    final data = widget.initialData ?? {};

    _nameController = TextEditingController(text: data['name'] as String? ?? '');
    _notesController = TextEditingController(text: data['notes'] as String? ?? '');
    _shippingAddressController = TextEditingController(text: data['shippingAddress'] as String? ?? '');
    _billingAddressController = TextEditingController(text: data['billingAddress'] as String? ?? '');
    _accountNameController = TextEditingController(text: data['accountName'] as String? ?? '');
    _contactNameController = TextEditingController(text: data['contactName'] as String? ?? '');

    _status = data['status'] as String? ?? 'Draft';

    final deliveryDateStr = data['expectedDeliveryDate'] as String?;
    if (deliveryDateStr != null) {
      _expectedDeliveryDate = DateTime.tryParse(deliveryDateStr);
    }

    // Initialize line items from existing data
    final existingItems = data['lineItems'] as List<dynamic>?;
    if (existingItems != null) {
      for (final item in existingItems) {
        final map = item as Map<String, dynamic>;
        _lineItems.add(_LineItemData(
          productNameController: TextEditingController(text: map['productName'] as String? ?? ''),
          quantityController: TextEditingController(text: '${(map['quantity'] as num?)?.toInt() ?? 1}'),
          unitPriceController: TextEditingController(text: '${(map['unitPrice'] as num?)?.toDouble() ?? 0}'),
        ));
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _notesController.dispose();
    _shippingAddressController.dispose();
    _billingAddressController.dispose();
    _accountNameController.dispose();
    _contactNameController.dispose();
    for (final item in _lineItems) {
      item.dispose();
    }
    super.dispose();
  }

  void _addLineItem() {
    setState(() {
      _lineItems.add(_LineItemData(
        productNameController: TextEditingController(),
        quantityController: TextEditingController(text: '1'),
        unitPriceController: TextEditingController(),
      ));
    });
  }

  void _removeLineItem(int index) {
    setState(() {
      _lineItems[index].dispose();
      _lineItems.removeAt(index);
    });
  }

  Future<void> _selectDeliveryDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expectedDeliveryDate ?? DateTime.now().add(const Duration(days: 14)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
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
        _expectedDeliveryDate = picked;
      });
    }
  }

  Map<String, dynamic> _buildOrderData() {
    final lineItemsData = _lineItems.map((item) {
      final qty = int.tryParse(item.quantityController.text) ?? 1;
      final price = double.tryParse(item.unitPriceController.text) ?? 0;
      return {
        'productName': item.productNameController.text.trim(),
        'quantity': qty,
        'unitPrice': price,
        'totalPrice': qty * price,
      };
    }).toList();

    final shippingText = _shippingAddressController.text.trim();
    final billingText = _billingAddressController.text.trim();

    return {
      'name': _nameController.text.trim(),
      'status': _status ?? 'Draft',
      'notes': _notesController.text.trim(),
      if (shippingText.isNotEmpty)
        'shippingAddress': {'street': shippingText},
      if (billingText.isNotEmpty)
        'billingAddress': {'street': billingText},
      'lineItems': lineItemsData,
      if (_expectedDeliveryDate != null)
        'expectedDeliveryDate': _expectedDeliveryDate!.toIso8601String(),
    };
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final service = ref.read(ordersServiceProvider);
      final data = _buildOrderData();

      if (widget.mode == IrisFormMode.create) {
        final result = await service.createOrder(data);
        if (result != null) {
          HapticFeedback.mediumImpact();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Order created successfully'),
                backgroundColor: LuxuryColors.rolexGreen,
              ),
            );
            Navigator.of(context).pop();
            widget.onSuccess?.call();
          }
        } else {
          setState(() {
            _errorMessage = 'Failed to create order. Please try again.';
          });
        }
      } else if (widget.mode == IrisFormMode.edit) {
        final id = widget.initialData?['id'] as String?;
        if (id != null) {
          final result = await service.updateOrder(id, data);
          if (result != null) {
            HapticFeedback.mediumImpact();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Order updated successfully'),
                  backgroundColor: LuxuryColors.rolexGreen,
                ),
              );
              Navigator.of(context).pop();
              widget.onSuccess?.call();
            }
          } else {
            setState(() {
              _errorMessage = 'Failed to update order. Please try again.';
            });
          }
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to save order: ${e.toString()}';
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
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final service = ref.read(ordersServiceProvider);
      final id = widget.initialData?['id'] as String?;

      if (id != null) {
        final success = await service.deleteOrder(id);
        if (success && mounted) {
          HapticFeedback.mediumImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Order deleted'),
              backgroundColor: LuxuryColors.errorRuby,
            ),
          );
          Navigator.of(context).pop();
          widget.onSuccess?.call();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete: ${e.toString()}'),
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisFormDialog(
      title: widget.mode == IrisFormMode.create ? 'New Order' : 'Edit Order',
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
                border: Border.all(color: LuxuryColors.errorRuby.withValues(alpha: 0.3)),
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

          // Order Information
          IrisFormSection(
            title: 'Order Information',
            children: [
              IrisTextField(
                controller: _nameController,
                label: 'Order Name',
                hint: 'Enter order name or description',
                prefixIcon: Iconsax.box,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Order name is required';
                  }
                  return null;
                },
              ),
              if (widget.mode == IrisFormMode.edit)
                LuxuryDropdown<String>(
                  label: 'Status',
                  hint: 'Select status',
                  value: _status,
                  items: orderStatusOptions
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (value) => setState(() => _status = value),
                ),
            ],
          ),

          const SizedBox(height: 24),

          // Customer Information
          IrisFormSection(
            title: 'Customer',
            children: [
              IrisTextField(
                controller: _accountNameController,
                label: 'Account',
                hint: 'Account name',
                prefixIcon: Iconsax.building,
              ),
              IrisTextField(
                controller: _contactNameController,
                label: 'Contact',
                hint: 'Contact name',
                prefixIcon: Iconsax.user,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Delivery Date
          IrisFormSection(
            title: 'Delivery',
            children: [
              GestureDetector(
                onTap: _selectDeliveryDate,
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
                  child: Row(
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 20,
                        color: LuxuryColors.champagneGold,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'EXPECTED DELIVERY DATE',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1.2,
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _expectedDeliveryDate != null
                                  ? DateFormat('MMM dd, yyyy').format(_expectedDeliveryDate!)
                                  : 'Select date',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.chevron_right,
                        color: LuxuryColors.textMuted,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Line Items
          IrisFormSection(
            title: 'Line Items',
            children: [
              ..._lineItems.asMap().entries.map((entry) {
                final index = entry.key;
                final item = entry.value;
                return _LineItemRow(
                  index: index,
                  item: item,
                  onRemove: () => _removeLineItem(index),
                  isDark: isDark,
                );
              }),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _addLineItem,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Iconsax.add,
                        size: 18,
                        color: LuxuryColors.rolexGreen,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Add Line Item',
                        style: IrisTheme.labelMedium.copyWith(
                          color: LuxuryColors.rolexGreen,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Addresses
          IrisFormSection(
            title: 'Addresses',
            children: [
              LuxuryTextArea(
                controller: _shippingAddressController,
                label: 'Shipping Address',
                hint: 'Enter shipping address...',
                minLines: 2,
                maxLines: 4,
              ),
              LuxuryTextArea(
                controller: _billingAddressController,
                label: 'Billing Address',
                hint: 'Enter billing address...',
                minLines: 2,
                maxLines: 4,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Notes
          IrisFormSection(
            title: 'Notes',
            children: [
              LuxuryTextArea(
                controller: _notesController,
                label: 'Order Notes',
                hint: 'Add notes about this order...',
                minLines: 3,
                maxLines: 6,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Internal line item data holder
class _LineItemData {
  final TextEditingController productNameController;
  final TextEditingController quantityController;
  final TextEditingController unitPriceController;

  _LineItemData({
    required this.productNameController,
    required this.quantityController,
    required this.unitPriceController,
  });

  void dispose() {
    productNameController.dispose();
    quantityController.dispose();
    unitPriceController.dispose();
  }
}

/// Row widget for a single line item in the form
class _LineItemRow extends StatelessWidget {
  final int index;
  final _LineItemData item;
  final VoidCallback onRemove;
  final bool isDark;

  const _LineItemRow({
    required this.index,
    required this.item,
    required this.onRemove,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.richBlack.withValues(alpha: 0.5)
            : const Color(0xFFFAF9F7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
              : LuxuryColors.champagneGold.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with item number and remove button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Item ${index + 1}',
                style: IrisTheme.labelMedium.copyWith(
                  color: LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w600,
                ),
              ),
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  onRemove();
                },
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(
                    Iconsax.trash,
                    size: 16,
                    color: LuxuryColors.errorRuby,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Product name
          IrisTextField(
            controller: item.productNameController,
            label: 'Product Name',
            hint: 'Enter product name',
            prefixIcon: Iconsax.box_1,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Product name is required';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          // Quantity and Price row
          IrisFormRow(
            children: [
              IrisTextField(
                controller: item.quantityController,
                label: 'Quantity',
                hint: '1',
                prefixIcon: Iconsax.hashtag,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                ],
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Required';
                  }
                  final qty = int.tryParse(value);
                  if (qty == null || qty <= 0) {
                    return 'Invalid';
                  }
                  return null;
                },
              ),
              IrisTextField(
                controller: item.unitPriceController,
                label: 'Unit Price',
                hint: '0.00',
                prefixIcon: Icons.attach_money,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                ],
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Required';
                  }
                  final price = double.tryParse(value);
                  if (price == null || price < 0) {
                    return 'Invalid';
                  }
                  return null;
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
