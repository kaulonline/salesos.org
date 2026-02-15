import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../core/services/prefill_service.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Opportunity stage options - aligned with web OpportunityStage enum
const List<String> stageOptions = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Decision Makers Identified',
  'Perception Analysis',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
];

/// Lead source options for opportunities - aligned with web OpportunitySource enum
const List<String> opportunityLeadSourceOptions = [
  'Existing Customer',
  'New Customer',
  'Partner',
  'Employee Referral',
  'External Referral',
  'Advertisement',
  'Trade Show',
  'Web',
  'Word of Mouth',
  'Other',
];

/// Opportunity type options - aligned with web OpportunityType enum
const List<String> opportunityTypeOptions = [
  'New Business',
  'Existing Business',
  'Upsell',
  'Cross Sell',
  'Renewal',
];

/// Deal/Opportunity form widget for creating and editing deals
class DealForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;
  final String? accountId;
  final String? focusField; // Field to focus on when form opens (e.g., 'closeDate')

  const DealForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
    this.accountId,
    this.focusField,
  });

  @override
  ConsumerState<DealForm> createState() => _DealFormState();

  /// Show the deal form as a centered modal
  static Future<void> show({
    required BuildContext context,
    Map<String, dynamic>? initialData,
    IrisFormMode mode = IrisFormMode.create,
    VoidCallback? onSuccess,
    String? accountId,
    String? focusField,
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
          child: DealForm(
            initialData: initialData,
            mode: mode,
            onSuccess: onSuccess,
            accountId: accountId,
            focusField: focusField,
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

class _DealFormState extends ConsumerState<DealForm> {
  final _formKey = GlobalKey<FormState>();
  final _closeDateKey = GlobalKey(); // Key for close date field to scroll to
  final _scrollController = ScrollController();
  bool _isLoading = false;
  String? _errorMessage;
  bool _highlightCloseDate = false; // Whether to highlight the close date field

  // Form controllers
  late final TextEditingController _nameController;
  late final TextEditingController _amountController;
  late final TextEditingController _probabilityController;
  late final TextEditingController _nextStepController;
  late final TextEditingController _descriptionController;

  String? _stage;
  String? _type;
  String? _leadSource;
  String? _accountId;
  DateTime? _closeDate;

  @override
  void initState() {
    super.initState();
    _initializeForm();

    // Handle focusField for scrolling to specific field
    if (widget.focusField == 'closeDate') {
      _highlightCloseDate = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToCloseDate();
      });
    }
  }

  void _scrollToCloseDate() {
    // Wait for the form to be built, then scroll to close date
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_closeDateKey.currentContext != null && mounted) {
        Scrollable.ensureVisible(
          _closeDateKey.currentContext!,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
          alignment: 0.3, // Position the field at 30% from top
        );
        // Also trigger the date picker
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            _selectCloseDate();
          }
        });
      }
    });
  }

  void _initializeForm() {
    // Get prefill data for create mode
    Map<String, dynamic> data = {};
    if (widget.mode == IrisFormMode.create) {
      final prefillService = ref.read(prefillServiceProvider);
      data = prefillService.getDealPrefill();
    }
    // Merge with any provided initial data (initial data takes priority)
    if (widget.initialData != null) {
      data.addAll(widget.initialData!);
    }

    _nameController = TextEditingController(text: data['name'] ?? data['Name'] ?? '');
    _nextStepController = TextEditingController(text: data['nextStep'] ?? data['NextStep'] ?? '');
    _descriptionController = TextEditingController(text: data['description'] ?? data['Description'] ?? '');

    final amount = data['amount'] ?? data['Amount'];
    _amountController = TextEditingController(
      text: amount != null ? amount.toString() : '',
    );

    final probability = data['probability'] ?? data['Probability'];
    _probabilityController = TextEditingController(
      text: probability != null ? probability.toString() : '',
    );

    _stage = data['stageName'] ?? data['StageName'] ?? 'Prospecting';
    _type = data['type'] ?? data['Type'];
    _leadSource = data['leadSource'] ?? data['LeadSource'];
    _accountId = widget.accountId ?? data['accountId'] ?? data['AccountId'];

    final closeDateStr = data['closeDate'] ?? data['CloseDate'];
    if (closeDateStr != null) {
      _closeDate = DateTime.tryParse(closeDateStr.toString());
    }
    _closeDate ??= DateTime.now().add(const Duration(days: 30));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _probabilityController.dispose();
    _nextStepController.dispose();
    _descriptionController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// Build dropdown items for stage, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildStageDropdownItems() {
    final items = <String>{...stageOptions};
    if (_stage != null && !items.contains(_stage)) {
      items.add(_stage!);
    }
    return items.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList();
  }

  /// Build dropdown items for type, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildTypeDropdownItems() {
    final items = <String>{...opportunityTypeOptions};
    if (_type != null && !items.contains(_type)) {
      items.add(_type!);
    }
    return items.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList();
  }

  /// Build dropdown items for lead source, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildLeadSourceDropdownItems() {
    final items = <String>{...opportunityLeadSourceOptions};
    if (_leadSource != null && !items.contains(_leadSource)) {
      items.add(_leadSource!);
    }
    return items.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList();
  }

  Map<String, dynamic> _buildDealData() {
    final amount = double.tryParse(_amountController.text);
    final probability = int.tryParse(_probabilityController.text);

    return {
      'name': _nameController.text.trim(),
      'stageName': _stage,
      'nextStep': _nextStepController.text.trim(),
      'description': _descriptionController.text.trim(),
      if (_type != null) 'type': _type,
      if (_leadSource != null) 'leadSource': _leadSource,
      if (_accountId != null) 'accountId': _accountId,
      'amount': ?amount,
      'probability': ?probability,
      if (_closeDate != null) 'closeDate': _closeDate!.toIso8601String().split('T')[0],
    };
  }

  Future<void> _selectCloseDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _closeDate ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
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
        _closeDate = picked;
      });
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final data = _buildDealData();

      if (widget.mode == IrisFormMode.create) {
        await crmService.createOpportunity(data);
        HapticFeedback.mediumImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Deal created successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
          Navigator.of(context).pop();
          widget.onSuccess?.call();
        }
      } else if (widget.mode == IrisFormMode.edit) {
        final id = widget.initialData?['id'] ?? widget.initialData?['Id'];
        if (id != null) {
          await crmService.updateOpportunity(id, data);
          HapticFeedback.mediumImpact();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Deal updated successfully'),
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
        _errorMessage = 'Failed to save deal: ${e.toString()}';
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
      title: 'Delete Deal',
      message: 'Are you sure you want to delete this opportunity? This action cannot be undone.',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final id = widget.initialData?['id'] ?? widget.initialData?['Id'];

      if (id != null) {
        final success = await crmService.deleteOpportunity(id);
        if (success && mounted) {
          HapticFeedback.mediumImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Deal deleted'),
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return IrisFormDialog(
      title: widget.mode == IrisFormMode.create ? 'New Deal' : 'Edit Deal',
      mode: widget.mode,
      formKey: _formKey,
      isLoading: _isLoading,
      canDelete: widget.mode == IrisFormMode.edit,
      onSave: _handleSave,
      onDelete: widget.mode == IrisFormMode.edit ? _handleDelete : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
            title: 'Deal Information',
            children: [
              IrisTextField(
                controller: _nameController,
                label: 'Opportunity Name',
                hint: 'Enter deal name',
                prefixIcon: Icons.handshake_outlined,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Deal name is required';
                  }
                  return null;
                },
              ),
              IrisFormRow(
                children: [
                  LuxuryDropdown<String>(
                    label: 'Stage',
                    hint: 'Select stage',
                    value: _stage,
                    items: _buildStageDropdownItems(),
                    onChanged: (value) => setState(() => _stage = value),
                  ),
                  LuxuryDropdown<String>(
                    label: 'Type',
                    hint: 'Select type',
                    value: _type,
                    items: _buildTypeDropdownItems(),
                    onChanged: (value) => setState(() => _type = value),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Deal Value',
            children: [
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _amountController,
                    label: 'Amount',
                    hint: 'Deal value',
                    prefixIcon: Icons.attach_money,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                    ],
                  ),
                  IrisTextField(
                    controller: _probabilityController,
                    label: 'Probability (%)',
                    hint: '0-100',
                    prefixIcon: Icons.percent,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                    validator: (value) {
                      if (value != null && value.isNotEmpty) {
                        final prob = int.tryParse(value);
                        if (prob == null || prob < 0 || prob > 100) {
                          return 'Enter 0-100';
                        }
                      }
                      return null;
                    },
                  ),
                ],
              ),
              // Close date picker
              GestureDetector(
                key: _closeDateKey,
                onTap: _selectCloseDate,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? LuxuryColors.obsidian : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _highlightCloseDate
                          ? LuxuryColors.warningAmber
                          : (isDark
                              ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                              : LuxuryColors.champagneGold.withValues(alpha: 0.15)),
                      width: _highlightCloseDate ? 2 : 1,
                    ),
                    boxShadow: _highlightCloseDate
                        ? [
                            BoxShadow(
                              color: LuxuryColors.warningAmber.withValues(alpha: 0.3),
                              blurRadius: 8,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 20,
                        color: _highlightCloseDate
                            ? LuxuryColors.warningAmber
                            : LuxuryColors.champagneGold,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'CLOSE DATE',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1.2,
                                color: _highlightCloseDate
                                    ? LuxuryColors.warningAmber
                                    : LuxuryColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _closeDate != null
                                  ? DateFormat('MMM dd, yyyy').format(_closeDate!)
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
                        color: _highlightCloseDate
                            ? LuxuryColors.warningAmber
                            : LuxuryColors.textMuted,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Source',
            children: [
              LuxuryDropdown<String>(
                label: 'Lead Source',
                hint: 'Select source',
                value: _leadSource,
                items: _buildLeadSourceDropdownItems(),
                onChanged: (value) => setState(() => _leadSource = value),
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Next Steps',
            children: [
              IrisTextField(
                controller: _nextStepController,
                label: 'Next Step',
                hint: 'What is the next action?',
                prefixIcon: Icons.arrow_forward_outlined,
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
                hint: 'Add notes about this opportunity...',
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
