import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../core/services/prefill_service.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/smart_fill_button.dart';

/// Account type options
const List<String> accountTypeOptions = [
  'Customer',
  'Prospect',
  'Partner',
  'Competitor',
  'Other',
];

/// Industry options for accounts
const List<String> accountIndustryOptions = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Professional Services',
  'Government',
  'Other',
];

/// Account form widget for creating and editing accounts
class AccountForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;

  const AccountForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
  });

  @override
  ConsumerState<AccountForm> createState() => _AccountFormState();

  /// Show the account form as a centered modal
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
          child: AccountForm(
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

class _AccountFormState extends ConsumerState<AccountForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  // Form controllers
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _faxController;
  late final TextEditingController _websiteController;
  late final TextEditingController _billingStreetController;
  late final TextEditingController _billingCityController;
  late final TextEditingController _billingStateController;
  late final TextEditingController _billingPostalCodeController;
  late final TextEditingController _annualRevenueController;
  late final TextEditingController _employeesController;
  late final TextEditingController _descriptionController;

  String? _accountType;
  String? _industry;

  @override
  void initState() {
    super.initState();
    _initializeForm();
  }

  void _initializeForm() {
    // Get prefill data for create mode
    Map<String, dynamic> data = {};
    if (widget.mode == IrisFormMode.create) {
      final prefillService = ref.read(prefillServiceProvider);
      data = prefillService.getAccountPrefill();
    }
    // Merge with any provided initial data (initial data takes priority)
    if (widget.initialData != null) {
      data.addAll(widget.initialData!);
    }

    _nameController = TextEditingController(text: data['name'] ?? data['Name'] ?? '');
    _phoneController = TextEditingController(text: data['phone'] ?? data['Phone'] ?? '');
    _faxController = TextEditingController(text: data['fax'] ?? data['Fax'] ?? '');
    _websiteController = TextEditingController(text: data['website'] ?? data['Website'] ?? '');
    _billingStreetController = TextEditingController(text: data['billingStreet'] ?? data['BillingStreet'] ?? '');
    _billingCityController = TextEditingController(text: data['billingCity'] ?? data['BillingCity'] ?? '');
    _billingStateController = TextEditingController(text: data['billingState'] ?? data['BillingState'] ?? '');
    _billingPostalCodeController = TextEditingController(text: data['billingPostalCode'] ?? data['BillingPostalCode'] ?? '');
    _descriptionController = TextEditingController(text: data['description'] ?? data['Description'] ?? '');

    final revenue = data['annualRevenue'] ?? data['AnnualRevenue'];
    _annualRevenueController = TextEditingController(
      text: revenue != null ? revenue.toString() : '',
    );

    final employees = data['numberOfEmployees'] ?? data['NumberOfEmployees'];
    _employeesController = TextEditingController(
      text: employees != null ? employees.toString() : '',
    );

    _accountType = data['type'] ?? data['Type'];
    _industry = data['industry'] ?? data['Industry'];
  }

  /// Apply smart fill data to form controllers
  void _applySmartFillData(Map<String, dynamic> data) {
    setState(() {
      if (data['name'] != null) _nameController.text = data['name'];
      if (data['phone'] != null) _phoneController.text = data['phone'];
      if (data['website'] != null) _websiteController.text = data['website'];
      if (data['billingStreet'] != null) _billingStreetController.text = data['billingStreet'];
      if (data['billingCity'] != null) _billingCityController.text = data['billingCity'];
      if (data['billingState'] != null) _billingStateController.text = data['billingState'];
      if (data['billingPostalCode'] != null) _billingPostalCodeController.text = data['billingPostalCode'];
      if (data['description'] != null) _descriptionController.text = data['description'];
      if (data['annualRevenue'] != null) {
        _annualRevenueController.text = data['annualRevenue'].toString();
      }
      if (data['numberOfEmployees'] != null) {
        _employeesController.text = data['numberOfEmployees'].toString();
      }
      if (data['type'] != null && accountTypeOptions.contains(data['type'])) {
        _accountType = data['type'];
      }
      if (data['industry'] != null && accountIndustryOptions.contains(data['industry'])) {
        _industry = data['industry'];
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _faxController.dispose();
    _websiteController.dispose();
    _billingStreetController.dispose();
    _billingCityController.dispose();
    _billingStateController.dispose();
    _billingPostalCodeController.dispose();
    _annualRevenueController.dispose();
    _employeesController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  /// Build dropdown items for account type, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildTypeDropdownItems() {
    final items = <String>{...accountTypeOptions};
    // Add current value if it's not in the predefined list (e.g., Salesforce values)
    if (_accountType != null && !items.contains(_accountType)) {
      items.add(_accountType!);
    }
    return items.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList();
  }

  /// Build dropdown items for industry, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildIndustryDropdownItems() {
    final items = <String>{...accountIndustryOptions};
    // Add current value if it's not in the predefined list (e.g., Salesforce values)
    if (_industry != null && !items.contains(_industry)) {
      items.add(_industry!);
    }
    return items.map((i) => DropdownMenuItem(value: i, child: Text(i))).toList();
  }

  Map<String, dynamic> _buildAccountData() {
    final revenue = double.tryParse(_annualRevenueController.text);
    final employees = int.tryParse(_employeesController.text);

    return {
      'name': _nameController.text.trim(),
      'phone': _phoneController.text.trim(),
      'fax': _faxController.text.trim(),
      'website': _websiteController.text.trim(),
      'billingStreet': _billingStreetController.text.trim(),
      'billingCity': _billingCityController.text.trim(),
      'billingState': _billingStateController.text.trim(),
      'billingPostalCode': _billingPostalCodeController.text.trim(),
      'description': _descriptionController.text.trim(),
      if (_accountType != null) 'type': _accountType,
      if (_industry != null) 'industry': _industry,
      'annualRevenue': ?revenue,
      'numberOfEmployees': ?employees,
    };
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final data = _buildAccountData();

      if (widget.mode == IrisFormMode.create) {
        await crmService.createAccount(data);
        HapticFeedback.mediumImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Account created successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
          Navigator.of(context).pop();
          widget.onSuccess?.call();
        }
      } else if (widget.mode == IrisFormMode.edit) {
        final id = widget.initialData?['id'] ?? widget.initialData?['Id'];
        if (id != null) {
          await crmService.updateAccount(id, data);
          HapticFeedback.mediumImpact();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Account updated successfully'),
                backgroundColor: LuxuryColors.rolexGreen,
              ),
            );
            Navigator.of(context).pop();
            widget.onSuccess?.call();
          }
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to save account: ${e.toString()}';
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
      title: 'Delete Account',
      message: 'Are you sure you want to delete this account? All related contacts and opportunities will be affected.',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final id = widget.initialData?['id'] ?? widget.initialData?['Id'];

      if (id != null) {
        final success = await crmService.deleteAccount(id);
        if (success && mounted) {
          HapticFeedback.mediumImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Account deleted'),
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
    return IrisFormDialog(
      title: widget.mode == IrisFormMode.create ? 'New Account' : 'Edit Account',
      mode: widget.mode,
      formKey: _formKey,
      isLoading: _isLoading,
      canDelete: widget.mode == IrisFormMode.edit,
      onSave: _handleSave,
      onDelete: widget.mode == IrisFormMode.edit ? _handleDelete : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Smart Fill button (only in create mode)
          if (widget.mode == IrisFormMode.create) ...[
            SmartFillButton(
              entityType: SmartFillEntityType.account,
              onDataExtracted: _applySmartFillData,
            ),
            const SizedBox(height: 20),
          ],

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

          IrisFormSection(
            title: 'Account Information',
            children: [
              IrisTextField(
                controller: _nameController,
                label: 'Account Name',
                hint: 'Enter account name',
                prefixIcon: Icons.business_outlined,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Account name is required';
                  }
                  return null;
                },
              ),
              IrisFormRow(
                children: [
                  LuxuryDropdown<String>(
                    label: 'Type',
                    hint: 'Select type',
                    value: _accountType,
                    items: _buildTypeDropdownItems(),
                    onChanged: (value) => setState(() => _accountType = value),
                  ),
                  LuxuryDropdown<String>(
                    label: 'Industry',
                    hint: 'Select industry',
                    value: _industry,
                    items: _buildIndustryDropdownItems(),
                    onChanged: (value) => setState(() => _industry = value),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Contact Information',
            children: [
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _phoneController,
                    label: 'Phone',
                    hint: 'Phone number',
                    prefixIcon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                  ),
                  IrisTextField(
                    controller: _faxController,
                    label: 'Fax',
                    hint: 'Fax number',
                    prefixIcon: Icons.fax_outlined,
                    keyboardType: TextInputType.phone,
                  ),
                ],
              ),
              IrisTextField(
                controller: _websiteController,
                label: 'Website',
                hint: 'https://example.com',
                prefixIcon: Icons.language_outlined,
                keyboardType: TextInputType.url,
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Company Details',
            children: [
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _annualRevenueController,
                    label: 'Annual Revenue',
                    hint: 'Enter amount',
                    prefixIcon: Icons.attach_money,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                    ],
                  ),
                  IrisTextField(
                    controller: _employeesController,
                    label: 'Employees',
                    hint: 'Number of employees',
                    prefixIcon: Icons.people_outline,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Billing Address',
            children: [
              IrisTextField(
                controller: _billingStreetController,
                label: 'Street',
                hint: 'Street address',
                prefixIcon: Icons.location_on_outlined,
              ),
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _billingCityController,
                    label: 'City',
                    hint: 'City',
                  ),
                  IrisTextField(
                    controller: _billingStateController,
                    label: 'State/Province',
                    hint: 'State',
                  ),
                ],
              ),
              IrisTextField(
                controller: _billingPostalCodeController,
                label: 'Postal Code',
                hint: 'Postal code',
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Description',
            children: [
              LuxuryTextArea(
                controller: _descriptionController,
                label: 'Description',
                hint: 'Add notes about this account...',
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
