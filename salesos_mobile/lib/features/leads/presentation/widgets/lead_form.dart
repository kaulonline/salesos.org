import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../core/services/form_draft_service.dart';
import '../../../../core/services/prefill_service.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/smart_fill_button.dart';

/// Lead status options
const List<String> leadStatusOptions = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Converted',
  'Closed',
];

/// Lead rating options
const List<String> leadRatingOptions = [
  'Hot',
  'Warm',
  'Cold',
];

/// Lead source options
const List<String> leadSourceOptions = [
  'Web',
  'Phone',
  'Partner Referral',
  'Purchased List',
  'Employee Referral',
  'Trade Show',
  'Other',
];

/// Industry options
const List<String> industryOptions = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Other',
];

/// Lead form widget for creating and editing leads
class LeadForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;

  const LeadForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
  });

  @override
  ConsumerState<LeadForm> createState() => _LeadFormState();

  /// Show the lead form as a centered modal
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
          child: LeadForm(
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

class _LeadFormState extends ConsumerState<LeadForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;
  bool _isDirty = false;
  bool _isRestoringDraft = false;
  Timer? _autoSaveTimer;

  // Form controllers
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _companyController;
  late final TextEditingController _titleController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _mobileController;
  late final TextEditingController _websiteController;
  late final TextEditingController _streetController;
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _postalCodeController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _annualRevenueController;
  late final TextEditingController _employeesController;

  // Dropdown values
  String? _status;
  String? _rating;
  String? _leadSource;
  String? _industry;

  // Draft management
  late String _formId;
  late FormDraftService _draftService;

  @override
  void initState() {
    super.initState();
    _draftService = ref.read(formDraftServiceProvider);
    _initializeFormId();
    _initializeForm();
    _checkForExistingDraft();
    _setupAutoSave();
  }

  void _initializeFormId() {
    final entityId = widget.initialData?['id'] ?? widget.initialData?['Id'];
    _formId = FormDraftService.generateFormId('lead', entityId: entityId);
  }

  void _initializeForm() {
    // Get prefill data for create mode
    Map<String, dynamic> data = {};
    if (widget.mode == IrisFormMode.create) {
      final prefillService = ref.read(prefillServiceProvider);
      data = prefillService.getLeadPrefill();
    }
    // Merge with any provided initial data (initial data takes priority)
    if (widget.initialData != null) {
      data.addAll(widget.initialData!);
    }

    _firstNameController = TextEditingController(text: data['firstName'] ?? data['FirstName'] ?? '');
    _lastNameController = TextEditingController(text: data['lastName'] ?? data['LastName'] ?? '');
    _companyController = TextEditingController(text: data['company'] ?? data['Company'] ?? '');
    _titleController = TextEditingController(text: data['title'] ?? data['Title'] ?? '');
    _emailController = TextEditingController(text: data['email'] ?? data['Email'] ?? '');
    _phoneController = TextEditingController(text: data['phone'] ?? data['Phone'] ?? '');
    _mobileController = TextEditingController(text: data['mobilePhone'] ?? data['MobilePhone'] ?? '');
    _websiteController = TextEditingController(text: data['website'] ?? data['Website'] ?? '');
    _streetController = TextEditingController(text: data['street'] ?? data['Street'] ?? '');
    _cityController = TextEditingController(text: data['city'] ?? data['City'] ?? '');
    _stateController = TextEditingController(text: data['state'] ?? data['State'] ?? '');
    _postalCodeController = TextEditingController(text: data['postalCode'] ?? data['PostalCode'] ?? '');
    _descriptionController = TextEditingController(text: data['description'] ?? data['Description'] ?? '');

    final revenue = data['annualRevenue'] ?? data['AnnualRevenue'];
    _annualRevenueController = TextEditingController(
      text: revenue != null ? revenue.toString() : '',
    );

    final employees = data['numberOfEmployees'] ?? data['NumberOfEmployees'];
    _employeesController = TextEditingController(
      text: employees != null ? employees.toString() : '',
    );

    _status = data['status'] ?? data['Status'] ?? 'New';
    _rating = data['rating'] ?? data['Rating'];
    _leadSource = data['leadSource'] ?? data['LeadSource'];
    _industry = data['industry'] ?? data['Industry'];

    // Add listeners for dirty tracking
    _addDirtyListeners();
  }

  void _addDirtyListeners() {
    final controllers = [
      _firstNameController,
      _lastNameController,
      _companyController,
      _titleController,
      _emailController,
      _phoneController,
      _mobileController,
      _websiteController,
      _streetController,
      _cityController,
      _stateController,
      _postalCodeController,
      _descriptionController,
      _annualRevenueController,
      _employeesController,
    ];

    for (final controller in controllers) {
      controller.addListener(_onFormChanged);
    }
  }

  void _onFormChanged() {
    if (!_isRestoringDraft && !_isDirty) {
      setState(() {
        _isDirty = true;
      });
    }
  }

  void _setupAutoSave() {
    // Auto-save every 30 seconds when dirty (as per requirements)
    _autoSaveTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_isDirty && !_isLoading) {
        _saveDraft();
      }
    });
  }

  Future<void> _checkForExistingDraft() async {
    if (widget.mode == IrisFormMode.edit) {
      // Don't restore drafts for edit mode - use the actual data
      return;
    }

    final draftService = _draftService;
    final draft = await draftService.getDraft(_formId);

    if (draft != null && mounted) {
      _showDraftRestoreDialog(draft);
    }
  }

  void _showDraftRestoreDialog(FormDraft draft) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
          ),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.restore_rounded,
                color: LuxuryColors.champagneGold,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Restore Draft?',
                style: TextStyle(
                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'You have an unsaved draft from ${draft.timeAgo}.',
              style: TextStyle(
                color: LuxuryColors.textMuted,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? LuxuryColors.obsidian
                    : LuxuryColors.champagneGold.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.description_outlined,
                    color: LuxuryColors.champagneGold,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      draft.preview,
                      style: TextStyle(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _discardDraft();
            },
            child: Text(
              'Discard',
              style: TextStyle(color: LuxuryColors.errorRuby),
            ),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _restoreDraft(draft);
            },
            style: FilledButton.styleFrom(
              backgroundColor: LuxuryColors.rolexGreen,
            ),
            child: const Text('Restore'),
          ),
        ],
      ),
    );
  }

  void _restoreDraft(FormDraft draft) {
    setState(() {
      _isRestoringDraft = true;
    });

    final data = draft.data;

    _firstNameController.text = data['firstName'] ?? '';
    _lastNameController.text = data['lastName'] ?? '';
    _companyController.text = data['company'] ?? '';
    _titleController.text = data['title'] ?? '';
    _emailController.text = data['email'] ?? '';
    _phoneController.text = data['phone'] ?? '';
    _mobileController.text = data['mobilePhone'] ?? '';
    _websiteController.text = data['website'] ?? '';
    _streetController.text = data['street'] ?? '';
    _cityController.text = data['city'] ?? '';
    _stateController.text = data['state'] ?? '';
    _postalCodeController.text = data['postalCode'] ?? '';
    _descriptionController.text = data['description'] ?? '';

    if (data['annualRevenue'] != null) {
      _annualRevenueController.text = data['annualRevenue'].toString();
    }
    if (data['numberOfEmployees'] != null) {
      _employeesController.text = data['numberOfEmployees'].toString();
    }

    setState(() {
      _status = data['status'] ?? 'New';
      _rating = data['rating'];
      _leadSource = data['leadSource'];
      _industry = data['industry'];
      _isRestoringDraft = false;
      _isDirty = true;
    });

    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Draft restored'),
        backgroundColor: LuxuryColors.rolexGreen,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _discardDraft() async {
    final draftService = _draftService;
    await draftService.deleteDraft(_formId);
  }

  Future<void> _saveDraft() async {
    final draftService = _draftService;
    final data = _buildLeadData();

    await draftService.saveDraft(
      _formId,
      data,
      entityType: 'lead',
    );
  }

  /// Apply smart fill data to form controllers
  void _applySmartFillData(Map<String, dynamic> data) {
    setState(() {
      if (data['firstName'] != null) _firstNameController.text = data['firstName'];
      if (data['lastName'] != null) _lastNameController.text = data['lastName'];
      if (data['company'] != null) _companyController.text = data['company'];
      if (data['title'] != null) _titleController.text = data['title'];
      if (data['email'] != null) _emailController.text = data['email'];
      if (data['phone'] != null) _phoneController.text = data['phone'];
      if (data['mobilePhone'] != null) _mobileController.text = data['mobilePhone'];
      if (data['website'] != null) _websiteController.text = data['website'];
      if (data['street'] != null) _streetController.text = data['street'];
      if (data['city'] != null) _cityController.text = data['city'];
      if (data['state'] != null) _stateController.text = data['state'];
      if (data['postalCode'] != null) _postalCodeController.text = data['postalCode'];
      if (data['description'] != null || data['notes'] != null) {
        _descriptionController.text = data['description'] ?? data['notes'] ?? '';
      }
      if (data['annualRevenue'] != null) {
        _annualRevenueController.text = data['annualRevenue'].toString();
      }
      if (data['numberOfEmployees'] != null) {
        _employeesController.text = data['numberOfEmployees'].toString();
      }
      if (data['leadSource'] != null && leadSourceOptions.contains(data['leadSource'])) {
        _leadSource = data['leadSource'];
      }
      if (data['industry'] != null && industryOptions.contains(data['industry'])) {
        _industry = data['industry'];
      }
      if (data['rating'] != null && leadRatingOptions.contains(data['rating'])) {
        _rating = data['rating'];
      }
      _isDirty = true;
    });
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();

    // Save draft on dispose if dirty (use stored reference, not ref.read)
    if (_isDirty && !_isLoading) {
      _draftService.saveDraftNow(_formId, _buildLeadData(), entityType: 'lead');
    }

    _firstNameController.dispose();
    _lastNameController.dispose();
    _companyController.dispose();
    _titleController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _mobileController.dispose();
    _websiteController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _postalCodeController.dispose();
    _descriptionController.dispose();
    _annualRevenueController.dispose();
    _employeesController.dispose();
    super.dispose();
  }

  /// Build dropdown items for status, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildStatusDropdownItems() {
    final items = <String>{...leadStatusOptions};
    if (_status != null && !items.contains(_status)) {
      items.add(_status!);
    }
    return items.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList();
  }

  /// Build dropdown items for rating, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildRatingDropdownItems() {
    final items = <String>{...leadRatingOptions};
    if (_rating != null && !items.contains(_rating)) {
      items.add(_rating!);
    }
    return items.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList();
  }

  /// Build dropdown items for lead source, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildLeadSourceDropdownItems() {
    final items = <String>{...leadSourceOptions};
    if (_leadSource != null && !items.contains(_leadSource)) {
      items.add(_leadSource!);
    }
    return items.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList();
  }

  /// Build dropdown items for industry, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildIndustryDropdownItems() {
    final items = <String>{...industryOptions};
    if (_industry != null && !items.contains(_industry)) {
      items.add(_industry!);
    }
    return items.map((i) => DropdownMenuItem(value: i, child: Text(i))).toList();
  }

  Map<String, dynamic> _buildLeadData() {
    final revenue = double.tryParse(_annualRevenueController.text);
    final employees = int.tryParse(_employeesController.text);

    return {
      'firstName': _firstNameController.text.trim(),
      'lastName': _lastNameController.text.trim(),
      'company': _companyController.text.trim(),
      'title': _titleController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'mobilePhone': _mobileController.text.trim(),
      'website': _websiteController.text.trim(),
      'street': _streetController.text.trim(),
      'city': _cityController.text.trim(),
      'state': _stateController.text.trim(),
      'postalCode': _postalCodeController.text.trim(),
      'description': _descriptionController.text.trim(),
      'status': _status,
      'rating': _rating,
      'leadSource': _leadSource,
      'industry': _industry,
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
      final data = _buildLeadData();

      if (widget.mode == IrisFormMode.create) {
        await crmService.createLead(data);
        HapticFeedback.mediumImpact();

        // Clear draft on successful save
        final draftService = _draftService;
        await draftService.deleteDraft(_formId);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Lead created successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
          Navigator.of(context).pop();
          widget.onSuccess?.call();
        }
      } else if (widget.mode == IrisFormMode.edit) {
        final id = widget.initialData?['id'] ?? widget.initialData?['Id'];
        if (id != null) {
          await crmService.updateLead(id, data);
          HapticFeedback.mediumImpact();

          // Clear draft on successful save
          final draftService = _draftService;
          await draftService.deleteDraft(_formId);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Lead updated successfully'),
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
        _errorMessage = 'Failed to save lead: ${e.toString()}';
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
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final id = widget.initialData?['id'] ?? widget.initialData?['Id'];

      if (id != null) {
        final success = await crmService.deleteLead(id);
        if (success && mounted) {
          HapticFeedback.mediumImpact();

          // Clear draft on successful delete
          final draftService = _draftService;
          await draftService.deleteDraft(_formId);

          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Lead deleted'),
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
      title: widget.mode == IrisFormMode.create ? 'New Lead' : 'Edit Lead',
      mode: widget.mode,
      formKey: _formKey,
      isLoading: _isLoading,
      canDelete: widget.mode == IrisFormMode.edit,
      onSave: _handleSave,
      onDelete: widget.mode == IrisFormMode.edit ? _handleDelete : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Dirty state indicator
          if (_isDirty && widget.mode == IrisFormMode.create) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.save_outlined,
                    size: 16,
                    color: LuxuryColors.champagneGold,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Draft auto-saved',
                    style: TextStyle(
                      color: LuxuryColors.champagneGold,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Smart Fill button (only in create mode)
          if (widget.mode == IrisFormMode.create) ...[
            SmartFillButton(
              entityType: SmartFillEntityType.lead,
              onDataExtracted: _applySmartFillData,
            ),
            const SizedBox(height: 20),
          ],

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

          // Basic Information
          IrisFormSection(
            title: 'Basic Information',
            children: [
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _firstNameController,
                    label: 'First Name',
                    hint: 'Enter first name',
                    prefixIcon: Icons.person_outline,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'First name is required';
                      }
                      return null;
                    },
                  ),
                  IrisTextField(
                    controller: _lastNameController,
                    label: 'Last Name',
                    hint: 'Enter last name',
                    prefixIcon: Icons.person_outline,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Last name is required';
                      }
                      return null;
                    },
                  ),
                ],
              ),
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _companyController,
                    label: 'Company',
                    hint: 'Enter company name',
                    prefixIcon: Icons.business_outlined,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Company is required';
                      }
                      return null;
                    },
                  ),
                  IrisTextField(
                    controller: _titleController,
                    label: 'Title',
                    hint: 'Enter job title',
                    prefixIcon: Icons.badge_outlined,
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Contact Information
          IrisFormSection(
            title: 'Contact Information',
            children: [
              IrisTextField(
                controller: _emailController,
                label: 'Email',
                hint: 'Enter email address',
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value != null && value.isNotEmpty) {
                    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                    if (!emailRegex.hasMatch(value)) {
                      return 'Enter a valid email';
                    }
                  }
                  return null;
                },
              ),
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _phoneController,
                    label: 'Phone',
                    hint: 'Enter phone number',
                    prefixIcon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                  ),
                  IrisTextField(
                    controller: _mobileController,
                    label: 'Mobile',
                    hint: 'Enter mobile number',
                    prefixIcon: Icons.smartphone_outlined,
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

          // Lead Details
          IrisFormSection(
            title: 'Lead Details',
            children: [
              IrisFormRow(
                children: [
                  LuxuryDropdown<String>(
                    label: 'Status',
                    hint: 'Select status',
                    value: _status,
                    items: _buildStatusDropdownItems(),
                    onChanged: (value) {
                      setState(() {
                        _status = value;
                        _isDirty = true;
                      });
                    },
                  ),
                  LuxuryDropdown<String>(
                    label: 'Rating',
                    hint: 'Select rating',
                    value: _rating,
                    items: _buildRatingDropdownItems(),
                    onChanged: (value) {
                      setState(() {
                        _rating = value;
                        _isDirty = true;
                      });
                    },
                  ),
                ],
              ),
              IrisFormRow(
                children: [
                  LuxuryDropdown<String>(
                    label: 'Lead Source',
                    hint: 'Select source',
                    value: _leadSource,
                    items: _buildLeadSourceDropdownItems(),
                    onChanged: (value) {
                      setState(() {
                        _leadSource = value;
                        _isDirty = true;
                      });
                    },
                  ),
                  LuxuryDropdown<String>(
                    label: 'Industry',
                    hint: 'Select industry',
                    value: _industry,
                    items: _buildIndustryDropdownItems(),
                    onChanged: (value) {
                      setState(() {
                        _industry = value;
                        _isDirty = true;
                      });
                    },
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Company Details
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

          // Address
          IrisFormSection(
            title: 'Address',
            children: [
              IrisTextField(
                controller: _streetController,
                label: 'Street',
                hint: 'Enter street address',
                prefixIcon: Icons.location_on_outlined,
              ),
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _cityController,
                    label: 'City',
                    hint: 'Enter city',
                  ),
                  IrisTextField(
                    controller: _stateController,
                    label: 'State/Province',
                    hint: 'Enter state',
                  ),
                ],
              ),
              IrisTextField(
                controller: _postalCodeController,
                label: 'Postal Code',
                hint: 'Enter postal code',
                keyboardType: TextInputType.text,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Description
          IrisFormSection(
            title: 'Additional Notes',
            children: [
              LuxuryTextArea(
                controller: _descriptionController,
                label: 'Description',
                hint: 'Add notes about this lead...',
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
