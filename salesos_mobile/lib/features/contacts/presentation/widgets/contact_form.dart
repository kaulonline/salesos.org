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

/// Contact form widget for creating and editing contacts
class ContactForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;
  final String? accountId; // Pre-select account if creating from account detail

  const ContactForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
    this.accountId,
  });

  @override
  ConsumerState<ContactForm> createState() => _ContactFormState();

  /// Show the contact form as a centered modal
  static Future<void> show({
    required BuildContext context,
    Map<String, dynamic>? initialData,
    IrisFormMode mode = IrisFormMode.create,
    VoidCallback? onSuccess,
    String? accountId,
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
          child: ContactForm(
            initialData: initialData,
            mode: mode,
            onSuccess: onSuccess,
            accountId: accountId,
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

class _ContactFormState extends ConsumerState<ContactForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;
  bool _isDirty = false;
  bool _isRestoringDraft = false;
  Timer? _autoSaveTimer;

  // Form controllers
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _titleController;
  late final TextEditingController _departmentController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _mobileController;
  late final TextEditingController _streetController;
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _postalCodeController;
  late final TextEditingController _descriptionController;

  String? _accountId;

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
    _formId = FormDraftService.generateFormId('contact', entityId: entityId);
  }

  void _initializeForm() {
    // Get prefill data for create mode
    Map<String, dynamic> data = {};
    if (widget.mode == IrisFormMode.create) {
      final prefillService = ref.read(prefillServiceProvider);
      data = prefillService.getContactPrefill();
    }
    // Merge with any provided initial data (initial data takes priority)
    if (widget.initialData != null) {
      data.addAll(widget.initialData!);
    }

    _firstNameController = TextEditingController(text: data['firstName'] ?? data['FirstName'] ?? '');
    _lastNameController = TextEditingController(text: data['lastName'] ?? data['LastName'] ?? '');
    _titleController = TextEditingController(text: data['title'] ?? data['Title'] ?? '');
    _departmentController = TextEditingController(text: data['department'] ?? data['Department'] ?? '');
    _emailController = TextEditingController(text: data['email'] ?? data['Email'] ?? '');
    _phoneController = TextEditingController(text: data['phone'] ?? data['Phone'] ?? '');
    _mobileController = TextEditingController(text: data['mobilePhone'] ?? data['MobilePhone'] ?? '');
    _streetController = TextEditingController(text: data['mailingStreet'] ?? data['MailingStreet'] ?? '');
    _cityController = TextEditingController(text: data['mailingCity'] ?? data['MailingCity'] ?? '');
    _stateController = TextEditingController(text: data['mailingState'] ?? data['MailingState'] ?? '');
    _postalCodeController = TextEditingController(text: data['mailingPostalCode'] ?? data['MailingPostalCode'] ?? '');
    _descriptionController = TextEditingController(text: data['description'] ?? data['Description'] ?? '');

    _accountId = widget.accountId ?? data['accountId'] ?? data['AccountId'];

    // Add listeners for dirty tracking
    _addDirtyListeners();
  }

  void _addDirtyListeners() {
    final controllers = [
      _firstNameController,
      _lastNameController,
      _titleController,
      _departmentController,
      _emailController,
      _phoneController,
      _mobileController,
      _streetController,
      _cityController,
      _stateController,
      _postalCodeController,
      _descriptionController,
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
    _titleController.text = data['title'] ?? '';
    _departmentController.text = data['department'] ?? '';
    _emailController.text = data['email'] ?? '';
    _phoneController.text = data['phone'] ?? '';
    _mobileController.text = data['mobilePhone'] ?? '';
    _streetController.text = data['mailingStreet'] ?? '';
    _cityController.text = data['mailingCity'] ?? '';
    _stateController.text = data['mailingState'] ?? '';
    _postalCodeController.text = data['mailingPostalCode'] ?? '';
    _descriptionController.text = data['description'] ?? '';

    setState(() {
      _accountId = data['accountId'];
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
    final data = _buildContactData();

    await draftService.saveDraft(
      _formId,
      data,
      entityType: 'contact',
    );
  }

  /// Apply smart fill data to form controllers
  void _applySmartFillData(Map<String, dynamic> data) {
    setState(() {
      if (data['firstName'] != null) _firstNameController.text = data['firstName'];
      if (data['lastName'] != null) _lastNameController.text = data['lastName'];
      if (data['title'] != null) _titleController.text = data['title'];
      if (data['department'] != null) _departmentController.text = data['department'];
      if (data['email'] != null) _emailController.text = data['email'];
      if (data['phone'] != null) _phoneController.text = data['phone'];
      if (data['mobilePhone'] != null) _mobileController.text = data['mobilePhone'];
      if (data['street'] != null) _streetController.text = data['street'];
      if (data['city'] != null) _cityController.text = data['city'];
      if (data['state'] != null) _stateController.text = data['state'];
      if (data['postalCode'] != null) _postalCodeController.text = data['postalCode'];
      if (data['description'] != null || data['notes'] != null) {
        _descriptionController.text = data['description'] ?? data['notes'] ?? '';
      }
      _isDirty = true;
    });
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();

    // Save draft on dispose if dirty
    if (_isDirty && !_isLoading) {
      final draftService = _draftService;
      draftService.saveDraftNow(_formId, _buildContactData(), entityType: 'contact');
    }

    _firstNameController.dispose();
    _lastNameController.dispose();
    _titleController.dispose();
    _departmentController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _mobileController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _postalCodeController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _buildContactData() {
    return {
      'firstName': _firstNameController.text.trim(),
      'lastName': _lastNameController.text.trim(),
      'title': _titleController.text.trim(),
      'department': _departmentController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'mobilePhone': _mobileController.text.trim(),
      'mailingStreet': _streetController.text.trim(),
      'mailingCity': _cityController.text.trim(),
      'mailingState': _stateController.text.trim(),
      'mailingPostalCode': _postalCodeController.text.trim(),
      'description': _descriptionController.text.trim(),
      if (_accountId != null) 'accountId': _accountId,
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
      final data = _buildContactData();

      if (widget.mode == IrisFormMode.create) {
        await crmService.createContact(data);
        HapticFeedback.mediumImpact();

        // Clear draft on successful save
        final draftService = _draftService;
        await draftService.deleteDraft(_formId);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Contact created successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
          Navigator.of(context).pop();
          widget.onSuccess?.call();
        }
      } else if (widget.mode == IrisFormMode.edit) {
        final id = widget.initialData?['id'] ?? widget.initialData?['Id'];
        if (id != null) {
          await crmService.updateContact(id, data);
          HapticFeedback.mediumImpact();

          // Clear draft on successful save
          final draftService = _draftService;
          await draftService.deleteDraft(_formId);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Contact updated successfully'),
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
        _errorMessage = 'Failed to save contact: ${e.toString()}';
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
      title: 'Delete Contact',
      message: 'Are you sure you want to delete this contact? This action cannot be undone.',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final id = widget.initialData?['id'] ?? widget.initialData?['Id'];

      if (id != null) {
        final success = await crmService.deleteContact(id);
        if (success && mounted) {
          HapticFeedback.mediumImpact();

          // Clear draft on successful delete
          final draftService = _draftService;
          await draftService.deleteDraft(_formId);

          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Contact deleted'),
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
      title: widget.mode == IrisFormMode.create ? 'New Contact' : 'Edit Contact',
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
              entityType: SmartFillEntityType.contact,
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
            title: 'Name',
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
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Work Information',
            children: [
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _titleController,
                    label: 'Title',
                    hint: 'Job title',
                    prefixIcon: Icons.badge_outlined,
                  ),
                  IrisTextField(
                    controller: _departmentController,
                    label: 'Department',
                    hint: 'Department name',
                    prefixIcon: Icons.business_outlined,
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

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
                    hint: 'Phone number',
                    prefixIcon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                  ),
                  IrisTextField(
                    controller: _mobileController,
                    label: 'Mobile',
                    hint: 'Mobile number',
                    prefixIcon: Icons.smartphone_outlined,
                    keyboardType: TextInputType.phone,
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Mailing Address',
            children: [
              IrisTextField(
                controller: _streetController,
                label: 'Street',
                hint: 'Street address',
                prefixIcon: Icons.location_on_outlined,
              ),
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _cityController,
                    label: 'City',
                    hint: 'City',
                  ),
                  IrisTextField(
                    controller: _stateController,
                    label: 'State/Province',
                    hint: 'State',
                  ),
                ],
              ),
              IrisTextField(
                controller: _postalCodeController,
                label: 'Postal Code',
                hint: 'Postal code',
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Additional Notes',
            children: [
              LuxuryTextArea(
                controller: _descriptionController,
                label: 'Description',
                hint: 'Add notes about this contact...',
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
