import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';

import '../../../../core/config/theme.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';

/// Contract form for creating and editing contracts
class ContractForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;

  const ContractForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
  });

  /// Show the contract form as a centered modal
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
          child: ContractForm(
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

  @override
  ConsumerState<ContractForm> createState() => _ContractFormState();
}

class _ContractFormState extends ConsumerState<ContractForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  // Form controllers
  final _nameController = TextEditingController();
  final _contractNumberController = TextEditingController();
  final _valueController = TextEditingController();
  final _termsController = TextEditingController();
  final _descriptionController = TextEditingController();

  // Selected values
  String? _selectedAccountId;
  String? _selectedAccountName;
  String? _selectedContactId;
  String? _selectedContactName;
  DateTime? _startDate;
  DateTime? _endDate;
  bool _autoRenewal = false;
  String _paymentTerms = 'Net 30';

  // Loaded accounts and contacts from API
  List<Map<String, String>> _accounts = [];
  List<Map<String, String>> _contacts = [];
  bool _isLoadingData = true;

  // Payment terms options
  final List<String> _paymentTermsOptions = [
    'Net 15',
    'Net 30',
    'Net 45',
    'Net 60',
    'Net 90',
    'Annual',
    'Monthly',
    'Quarterly',
    'Milestone',
    'Upon Delivery',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialData != null) {
      _loadInitialData();
    } else {
      // Generate contract number for new contracts
      _contractNumberController.text =
          'CTR-${DateTime.now().year}-${DateTime.now().millisecond.toString().padLeft(3, '0')}';
    }
    // Load accounts and contacts from API
    _loadAccountsAndContacts();
  }

  Future<void> _loadAccountsAndContacts() async {
    try {
      final crmService = ref.read(crmDataServiceProvider);

      // Fetch accounts and contacts in parallel
      final results = await Future.wait([
        crmService.getAccounts(limit: 100),
        crmService.getContacts(limit: 100),
      ]);

      final accountsData = results[0];
      final contactsData = results[1];

      // Map accounts to selector format
      _accounts = accountsData.map((acc) {
        final id = acc['Id'] as String? ?? acc['id'] as String? ?? '';
        final name = acc['Name'] as String? ?? acc['name'] as String? ?? 'Unnamed';
        return {'id': id, 'name': name};
      }).toList();

      // Map contacts to selector format
      _contacts = contactsData.map((contact) {
        final id = contact['Id'] as String? ?? contact['id'] as String? ?? '';
        final firstName = contact['FirstName'] as String? ?? contact['firstName'] as String? ?? '';
        final lastName = contact['LastName'] as String? ?? contact['lastName'] as String? ?? '';
        final name = '$firstName $lastName'.trim();
        return {'id': id, 'name': name.isNotEmpty ? name : 'Unnamed'};
      }).toList();

      if (mounted) {
        setState(() {
          _isLoadingData = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingData = false;
        });
      }
    }
  }

  void _loadInitialData() {
    final data = widget.initialData!;
    _nameController.text = data['name'] ?? '';
    _contractNumberController.text = data['contractNumber'] ?? '';
    _valueController.text = data['value']?.toString() ?? '';
    _termsController.text = data['terms'] ?? '';
    _descriptionController.text = data['description'] ?? '';
    _selectedAccountId = data['accountId'];
    _selectedAccountName = data['accountName'];
    _selectedContactId = data['contactId'];
    _selectedContactName = data['contactName'];
    _paymentTerms = data['paymentTerms'] ?? 'Net 30';
    _autoRenewal = data['autoRenewal'] ?? false;

    if (data['startDate'] != null) {
      _startDate = DateTime.tryParse(data['startDate']);
    }
    if (data['endDate'] != null) {
      _endDate = DateTime.tryParse(data['endDate']);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _contractNumberController.dispose();
    _valueController.dispose();
    _termsController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _selectDate({required bool isStartDate}) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final initialDate = isStartDate
        ? (_startDate ?? DateTime.now())
        : (_endDate ?? DateTime.now().add(const Duration(days: 365)));

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: isStartDate ? DateTime(2020) : (_startDate ?? DateTime(2020)),
      lastDate: DateTime(2100),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme(
              brightness: isDark ? Brightness.dark : Brightness.light,
              primary: LuxuryColors.rolexGreen,
              onPrimary: Colors.white,
              secondary: LuxuryColors.champagneGold,
              onSecondary: Colors.white,
              error: LuxuryColors.errorRuby,
              onError: Colors.white,
              surface: isDark ? LuxuryColors.richBlack : Colors.white,
              onSurface: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedDate != null) {
      HapticFeedback.lightImpact();
      setState(() {
        if (isStartDate) {
          _startDate = pickedDate;
          // Auto-adjust end date if it's before start date
          if (_endDate != null && _endDate!.isBefore(pickedDate)) {
            _endDate = pickedDate.add(const Duration(days: 365));
          }
        } else {
          _endDate = pickedDate;
        }
      });
    }
  }

  void _showAccountSelector() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (_accounts.isEmpty && !_isLoadingData) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No accounts available')),
      );
      return;
    }
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
              constraints: const BoxConstraints(maxWidth: 400, maxHeight: 500),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: _SelectorSheet(
                title: 'Select Account',
                items: _accounts,
                selectedId: _selectedAccountId,
                isLoading: _isLoadingData,
                onSelect: (id, name) {
                  setState(() {
                    _selectedAccountId = id;
                    _selectedAccountName = name;
                  });
                  Navigator.pop(ctx);
                },
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

  void _showContactSelector() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (_contacts.isEmpty && !_isLoadingData) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No contacts available')),
      );
      return;
    }
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
              constraints: const BoxConstraints(maxWidth: 400, maxHeight: 500),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: _SelectorSheet(
                title: 'Select Contact',
                items: _contacts,
                selectedId: _selectedContactId,
                isLoading: _isLoadingData,
                onSelect: (id, name) {
                  setState(() {
                    _selectedContactId = id;
                    _selectedContactName = name;
                  });
                  Navigator.pop(ctx);
                },
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

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Build contract data - will be used when API is implemented
      // ignore: unused_local_variable
      final _ = {
        'name': _nameController.text.trim(),
        'contractNumber': _contractNumberController.text.trim(),
        'accountId': _selectedAccountId,
        'accountName': _selectedAccountName,
        'contactId': _selectedContactId,
        'contactName': _selectedContactName,
        'value': double.tryParse(_valueController.text.trim()),
        'startDate': _startDate?.toIso8601String(),
        'endDate': _endDate?.toIso8601String(),
        'paymentTerms': _paymentTerms,
        'autoRenewal': _autoRenewal,
        'terms': _termsController.text.trim(),
        'description': _descriptionController.text.trim(),
        'status': 'draft',
      };

      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));

      if (mounted) {
        Navigator.pop(context);
        widget.onSuccess?.call();
        _showSuccessSnackBar();
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar(e.toString());
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSuccessSnackBar() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          widget.mode == IrisFormMode.create
              ? 'Contract created successfully'
              : 'Contract updated successfully',
        ),
        backgroundColor: isDark ? IrisTheme.darkSurface : LuxuryColors.rolexGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Error: $message'),
        backgroundColor: IrisTheme.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dateFormat = DateFormat('MMM d, yyyy');
    final screenHeight = MediaQuery.of(context).size.height;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.richBlack : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      constraints: BoxConstraints(maxHeight: screenHeight * 0.9),
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 16, 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: LuxuryColors.emeraldGradient,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Icon(
                    widget.mode == IrisFormMode.create
                        ? Iconsax.document_text
                        : Iconsax.edit_2,
                    size: 20,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.mode == IrisFormMode.create
                            ? 'NEW CONTRACT'
                            : 'EDIT CONTRACT',
                        style: IrisTheme.headlineSmall.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.mode == IrisFormMode.create
                            ? 'Create a new agreement'
                            : 'Update contract details',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(
                    Icons.close_rounded,
                    color: LuxuryColors.textMuted,
                  ),
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),

          // Divider
          Container(
            height: 1,
            margin: const EdgeInsets.symmetric(horizontal: 24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                  Colors.transparent,
                ],
              ),
            ),
          ),

          // Form content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              physics: const BouncingScrollPhysics(),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Account Selector
                    _buildSelectorField(
                      label: 'Account',
                      value: _selectedAccountName,
                      hint: 'Select an account',
                      icon: Iconsax.building,
                      onTap: _showAccountSelector,
                      isRequired: true,
                    ),

                    const SizedBox(height: 20),

                    // Contact Selector
                    _buildSelectorField(
                      label: 'Contact',
                      value: _selectedContactName,
                      hint: 'Select a contact (optional)',
                      icon: Iconsax.user,
                      onTap: _showContactSelector,
                    ),

                    const SizedBox(height: 20),

                    // Contract Name
                    IrisTextField(
                      label: 'Contract Name',
                      hint: 'Enter contract name',
                      controller: _nameController,
                      prefixIcon: Iconsax.document_text,
                      tier: LuxuryTier.gold,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter a contract name';
                        }
                        return null;
                      },
                    ),

                    const SizedBox(height: 20),

                    // Contract Number
                    IrisTextField(
                      label: 'Contract Number',
                      hint: 'Auto-generated',
                      controller: _contractNumberController,
                      prefixIcon: Iconsax.tag,
                      tier: LuxuryTier.gold,
                      readOnly: widget.mode == IrisFormMode.edit,
                    ),

                    const SizedBox(height: 20),

                    // Date Row
                    Row(
                      children: [
                        Expanded(
                          child: _buildDateField(
                            label: 'Start Date',
                            value: _startDate,
                            hint: 'Select start date',
                            onTap: () => _selectDate(isStartDate: true),
                            dateFormat: dateFormat,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildDateField(
                            label: 'End Date',
                            value: _endDate,
                            hint: 'Select end date',
                            onTap: () => _selectDate(isStartDate: false),
                            dateFormat: dateFormat,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Contract Value
                    IrisTextField(
                      label: 'Contract Value',
                      hint: 'Enter contract value',
                      controller: _valueController,
                      prefixIcon: Iconsax.dollar_circle,
                      tier: LuxuryTier.gold,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Payment Terms Dropdown
                    _buildDropdownField(
                      label: 'Payment Terms',
                      value: _paymentTerms,
                      items: _paymentTermsOptions,
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _paymentTerms = value);
                        }
                      },
                    ),

                    const SizedBox(height: 20),

                    // Auto-renewal Toggle
                    _buildToggleField(
                      label: 'Auto-Renewal',
                      value: _autoRenewal,
                      description: 'Automatically renew this contract upon expiration',
                      onChanged: (value) {
                        HapticFeedback.lightImpact();
                        setState(() => _autoRenewal = value);
                      },
                    ),

                    const SizedBox(height: 20),

                    // Terms and Conditions
                    LuxuryTextArea(
                      label: 'Terms and Conditions',
                      hint: 'Enter special terms or conditions...',
                      controller: _termsController,
                      tier: LuxuryTier.gold,
                      minLines: 3,
                      maxLines: 5,
                    ),

                    const SizedBox(height: 20),

                    // Description
                    LuxuryTextArea(
                      label: 'Description',
                      hint: 'Enter contract description...',
                      controller: _descriptionController,
                      tier: LuxuryTier.gold,
                      minLines: 2,
                      maxLines: 4,
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.obsidian
                  : LuxuryColors.rolexGreen.withValues(alpha: 0.05),
              border: Border(
                top: BorderSide(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                ),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: _buildFormButton(
                      label: 'Cancel',
                      onTap: () {
                        HapticFeedback.lightImpact();
                        Navigator.pop(context);
                      },
                      isPrimary: false,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: _buildFormButton(
                      label: widget.mode == IrisFormMode.create
                          ? 'Create Contract'
                          : 'Save Changes',
                      onTap: _isLoading ? null : _handleSave,
                      isPrimary: true,
                      isLoading: _isLoading,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectorField({
    required String label,
    required String? value,
    required String hint,
    required IconData icon,
    required VoidCallback onTap,
    bool isRequired = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase() + (isRequired ? ' *' : ''),
          style: IrisTheme.labelSmall.copyWith(
            color: LuxuryColors.textMuted,
            fontWeight: FontWeight.w500,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            onTap();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark
                    ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                    : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: LuxuryColors.textMuted,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    value ?? hint,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: value != null
                          ? (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)
                          : LuxuryColors.textMuted,
                    ),
                  ),
                ),
                Icon(
                  Iconsax.arrow_down_1,
                  size: 18,
                  color: LuxuryColors.textMuted,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime? value,
    required String hint,
    required VoidCallback onTap,
    required DateFormat dateFormat,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: IrisTheme.labelSmall.copyWith(
            color: LuxuryColors.textMuted,
            fontWeight: FontWeight.w500,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            onTap();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark
                    ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                    : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Iconsax.calendar_1,
                  size: 20,
                  color: LuxuryColors.textMuted,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    value != null ? dateFormat.format(value) : hint,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: value != null
                          ? (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)
                          : LuxuryColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: IrisTheme.labelSmall.copyWith(
            color: LuxuryColors.textMuted,
            fontWeight: FontWeight.w500,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                  : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              items: items.map((item) {
                return DropdownMenuItem(
                  value: item,
                  child: Text(item),
                );
              }).toList(),
              onChanged: (val) {
                HapticFeedback.lightImpact();
                onChanged(val);
              },
              isExpanded: true,
              icon: Icon(
                Iconsax.arrow_down_1,
                size: 18,
                color: LuxuryColors.textMuted,
              ),
              dropdownColor: isDark ? LuxuryColors.obsidian : Colors.white,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildToggleField({
    required String label,
    required bool value,
    required String description,
    required ValueChanged<bool> onChanged,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
              : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: IrisTheme.bodySmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: LuxuryColors.rolexGreen,
          ),
        ],
      ),
    );
  }

  Widget _buildFormButton({
    required String label,
    required VoidCallback? onTap,
    required bool isPrimary,
    bool isLoading = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isPrimary
              ? (onTap == null
                  ? LuxuryColors.rolexGreen.withValues(alpha: 0.5)
                  : LuxuryColors.rolexGreen)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: isPrimary
              ? null
              : Border.all(
                  color: LuxuryColors.textMuted.withValues(alpha: 0.3),
                ),
        ),
        child: Center(
          child: isLoading
              ? SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(
                      isPrimary ? Colors.white : LuxuryColors.rolexGreen,
                    ),
                  ),
                )
              : Text(
                  label,
                  style: IrisTheme.labelLarge.copyWith(
                    color: isPrimary ? Colors.white : LuxuryColors.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      ),
    );
  }
}

/// Selector sheet for choosing accounts/contacts
class _SelectorSheet extends StatelessWidget {
  final String title;
  final List<Map<String, String>> items;
  final String? selectedId;
  final Function(String id, String name) onSelect;
  final bool isLoading;

  const _SelectorSheet({
    required this.title,
    required this.items,
    required this.selectedId,
    required this.onSelect,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Handle
        Center(
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        // Title
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            title,
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Divider(
          height: 1,
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
        // Items or loading indicator
        if (isLoading)
          Padding(
            padding: const EdgeInsets.all(32),
            child: CircularProgressIndicator(
              color: LuxuryColors.rolexGreen,
            ),
          )
        else if (items.isEmpty)
          Padding(
            padding: const EdgeInsets.all(32),
            child: Text(
              'No items available',
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
          )
        else
        ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.5,
          ),
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              final isSelected = item['id'] == selectedId;

              return ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                        : (isDark
                            ? IrisTheme.darkSurfaceElevated
                            : IrisTheme.lightSurface),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      item['name']![0].toUpperCase(),
                      style: IrisTheme.titleMedium.copyWith(
                        color: isSelected
                            ? LuxuryColors.rolexGreen
                            : (isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                title: Text(
                  item['name']!,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
                trailing: isSelected
                    ? Icon(
                        Iconsax.tick_circle5,
                        color: LuxuryColors.rolexGreen,
                        size: 20,
                      )
                    : null,
                onTap: () {
                  HapticFeedback.lightImpact();
                  onSelect(item['id']!, item['name']!);
                },
              );
            },
          ),
        ),
        SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
      ],
    );
  }
}
