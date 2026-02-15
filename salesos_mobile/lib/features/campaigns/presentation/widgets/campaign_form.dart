import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/services/campaigns_service.dart';
import '../../../../core/services/form_draft_service.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Campaign form widget for creating and editing campaigns
class CampaignForm extends ConsumerStatefulWidget {
  final CampaignModel? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;

  const CampaignForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
  });

  @override
  ConsumerState<CampaignForm> createState() => _CampaignFormState();

  /// Show the campaign form as a centered modal
  static Future<void> show({
    required BuildContext context,
    CampaignModel? initialData,
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
          child: CampaignForm(
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

class _CampaignFormState extends ConsumerState<CampaignForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;
  bool _isDirty = false;
  bool _isRestoringDraft = false;
  Timer? _autoSaveTimer;

  // Form controllers
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _budgetedCostController;
  late final TextEditingController _expectedRevenueController;

  // Dropdown and date values
  CampaignStatus _status = CampaignStatus.planned;
  CampaignType _type = CampaignType.email;
  DateTime? _startDate;
  DateTime? _endDate;

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
    final entityId = widget.initialData?.id;
    _formId = FormDraftService.generateFormId('campaign', entityId: entityId);
  }

  void _initializeForm() {
    final data = widget.initialData;

    _nameController = TextEditingController(text: data?.name ?? '');
    _descriptionController = TextEditingController(text: data?.description ?? '');
    _budgetedCostController = TextEditingController(
      text: data?.budgetedCost != null && data!.budgetedCost > 0
          ? data.budgetedCost.toStringAsFixed(2)
          : '',
    );
    _expectedRevenueController = TextEditingController(
      text: data?.expectedRevenue != null && data!.expectedRevenue > 0
          ? data.expectedRevenue.toStringAsFixed(2)
          : '',
    );

    _status = data?.status ?? CampaignStatus.planned;
    _type = data?.type ?? CampaignType.email;
    _startDate = data?.startDate;
    _endDate = data?.endDate;

    // Add listeners for dirty tracking
    _addDirtyListeners();
  }

  void _addDirtyListeners() {
    final controllers = [
      _nameController,
      _descriptionController,
      _budgetedCostController,
      _expectedRevenueController,
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
    _autoSaveTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_isDirty && !_isLoading) {
        _saveDraft();
      }
    });
  }

  Future<void> _checkForExistingDraft() async {
    if (widget.mode == IrisFormMode.edit) {
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
                    Iconsax.chart,
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

    _nameController.text = data['name'] ?? '';
    _descriptionController.text = data['description'] ?? '';

    if (data['budgetedCost'] != null) {
      _budgetedCostController.text = data['budgetedCost'].toString();
    }
    if (data['expectedRevenue'] != null) {
      _expectedRevenueController.text = data['expectedRevenue'].toString();
    }

    setState(() {
      _status = CampaignStatus.fromString(data['status']);
      _type = CampaignType.fromString(data['type']);
      if (data['startDate'] != null) {
        _startDate = DateTime.tryParse(data['startDate']);
      }
      if (data['endDate'] != null) {
        _endDate = DateTime.tryParse(data['endDate']);
      }
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
    final data = _buildCampaignData();

    await draftService.saveDraft(
      _formId,
      data,
      entityType: 'campaign',
    );
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();

    if (_isDirty && !_isLoading) {
      final draftService = _draftService;
      draftService.saveDraftNow(_formId, _buildCampaignData(), entityType: 'campaign');
    }

    _nameController.dispose();
    _descriptionController.dispose();
    _budgetedCostController.dispose();
    _expectedRevenueController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _buildCampaignData() {
    final budgetedCost = double.tryParse(_budgetedCostController.text);
    final expectedRevenue = double.tryParse(_expectedRevenueController.text);

    return {
      'name': _nameController.text.trim(),
      'description': _descriptionController.text.trim(),
      'status': _status.label,
      'type': _type.label,
      if (_startDate != null) 'startDate': _startDate!.toIso8601String(),
      if (_endDate != null) 'endDate': _endDate!.toIso8601String(),
      'budgetedCost': ?budgetedCost,
      'expectedRevenue': ?expectedRevenue,
    };
  }

  Future<void> _selectDate({required bool isStartDate}) async {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final initialDate = isStartDate
        ? (_startDate ?? DateTime.now())
        : (_endDate ?? _startDate ?? DateTime.now());

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: theme.copyWith(
            colorScheme: theme.colorScheme.copyWith(
              primary: LuxuryColors.rolexGreen,
              onPrimary: Colors.white,
              surface: isDark ? LuxuryColors.obsidian : Colors.white,
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
          // Adjust end date if it's before start date
          if (_endDate != null && _endDate!.isBefore(pickedDate)) {
            _endDate = pickedDate;
          }
        } else {
          _endDate = pickedDate;
        }
        _isDirty = true;
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
      final campaignsService = ref.read(campaignsServiceProvider);
      final data = _buildCampaignData();

      if (widget.mode == IrisFormMode.create) {
        await campaignsService.createCampaign(data);
        HapticFeedback.mediumImpact();

        final draftService = _draftService;
        await draftService.deleteDraft(_formId);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Campaign created successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
          Navigator.of(context).pop();
          ref.invalidate(campaignsProvider);
          ref.invalidate(campaignStatsProvider);
          widget.onSuccess?.call();
        }
      } else if (widget.mode == IrisFormMode.edit) {
        final id = widget.initialData?.id;
        if (id != null) {
          await campaignsService.updateCampaign(id, data);
          HapticFeedback.mediumImpact();

          final draftService = _draftService;
          await draftService.deleteDraft(_formId);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Campaign updated successfully'),
                backgroundColor: LuxuryColors.rolexGreen,
              ),
            );
            Navigator.of(context).pop();
            ref.invalidate(campaignsProvider);
            ref.invalidate(campaignStatsProvider);
            ref.invalidate(campaignByIdProvider(id));
            widget.onSuccess?.call();
          }
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to save campaign: ${e.toString()}';
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
      title: 'Delete Campaign',
      message: 'Are you sure you want to delete this campaign? This action cannot be undone.',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final campaignsService = ref.read(campaignsServiceProvider);
      final id = widget.initialData?.id;

      if (id != null) {
        final success = await campaignsService.deleteCampaign(id);
        if (success && mounted) {
          HapticFeedback.mediumImpact();

          final draftService = _draftService;
          await draftService.deleteDraft(_formId);

          if (!mounted) return;

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Campaign deleted'),
              backgroundColor: LuxuryColors.errorRuby,
            ),
          );
          Navigator.of(context).pop();
          ref.invalidate(campaignsProvider);
          ref.invalidate(campaignStatsProvider);
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
      title: widget.mode == IrisFormMode.create ? 'New Campaign' : 'Edit Campaign',
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
            title: 'Campaign Details',
            children: [
              IrisTextField(
                controller: _nameController,
                label: 'Campaign Name',
                hint: 'Enter campaign name',
                prefixIcon: Iconsax.chart,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Campaign name is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              IrisFormRow(
                children: [
                  _CampaignStatusDropdown(
                    value: _status,
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _status = value;
                          _isDirty = true;
                        });
                      }
                    },
                  ),
                  _CampaignTypeDropdown(
                    value: _type,
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _type = value;
                          _isDirty = true;
                        });
                      }
                    },
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Schedule
          IrisFormSection(
            title: 'Schedule',
            children: [
              IrisFormRow(
                children: [
                  _DatePickerField(
                    label: 'Start Date',
                    value: _startDate,
                    onTap: () => _selectDate(isStartDate: true),
                  ),
                  _DatePickerField(
                    label: 'End Date',
                    value: _endDate,
                    onTap: () => _selectDate(isStartDate: false),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Budget
          IrisFormSection(
            title: 'Budget & Goals',
            children: [
              IrisFormRow(
                children: [
                  IrisTextField(
                    controller: _budgetedCostController,
                    label: 'Budget',
                    hint: 'Enter amount',
                    prefixIcon: Iconsax.dollar_circle,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                    ],
                  ),
                  IrisTextField(
                    controller: _expectedRevenueController,
                    label: 'Expected Revenue',
                    hint: 'Enter amount',
                    prefixIcon: Iconsax.money_recive,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                    ],
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Description
          IrisFormSection(
            title: 'Description',
            children: [
              LuxuryTextArea(
                controller: _descriptionController,
                label: 'Campaign Description',
                hint: 'Describe the campaign goals, target audience, and strategy...',
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

/// Campaign status dropdown
class _CampaignStatusDropdown extends StatelessWidget {
  final CampaignStatus value;
  final ValueChanged<CampaignStatus?> onChanged;

  const _CampaignStatusDropdown({
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryDropdown<CampaignStatus>(
      label: 'Status',
      hint: 'Select status',
      value: value,
      items: CampaignStatus.values.map((status) {
        return DropdownMenuItem(
          value: status,
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _getStatusColor(status),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(status.label),
            ],
          ),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }

  Color _getStatusColor(CampaignStatus status) {
    switch (status) {
      case CampaignStatus.planned:
        return IrisTheme.accentBlueLight;
      case CampaignStatus.active:
        return LuxuryColors.rolexGreen;
      case CampaignStatus.completed:
        return IrisTheme.stageClosedWon;
      case CampaignStatus.cancelled:
        return IrisTheme.stageClosedLost;
    }
  }
}

/// Campaign type dropdown
class _CampaignTypeDropdown extends StatelessWidget {
  final CampaignType value;
  final ValueChanged<CampaignType?> onChanged;

  const _CampaignTypeDropdown({
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryDropdown<CampaignType>(
      label: 'Type',
      hint: 'Select type',
      value: value,
      items: CampaignType.values.map((type) {
        return DropdownMenuItem(
          value: type,
          child: Row(
            children: [
              Icon(_getTypeIcon(type), size: 16, color: _getTypeColor(type)),
              const SizedBox(width: 8),
              Text(type.label),
            ],
          ),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }

  IconData _getTypeIcon(CampaignType type) {
    switch (type) {
      case CampaignType.email:
        return Iconsax.sms;
      case CampaignType.social:
        return Iconsax.message;
      case CampaignType.webinar:
        return Iconsax.video;
      case CampaignType.event:
        return Iconsax.calendar;
      case CampaignType.advertising:
        return Iconsax.chart;
      case CampaignType.referral:
        return Iconsax.people;
      case CampaignType.other:
        return Iconsax.tag;
    }
  }

  Color _getTypeColor(CampaignType type) {
    switch (type) {
      case CampaignType.email:
        return LuxuryColors.emailBlue;
      case CampaignType.social:
        return LuxuryColors.socialPurple;
      case CampaignType.webinar:
        return LuxuryColors.webinarPink;
      case CampaignType.event:
        return LuxuryColors.eventOrange;
      case CampaignType.advertising:
        return LuxuryColors.advertisingGreen;
      case CampaignType.referral:
        return LuxuryColors.referralIndigo;
      case CampaignType.other:
        return LuxuryColors.warmGold;
    }
  }
}

/// Date picker field
class _DatePickerField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final VoidCallback onTap;

  const _DatePickerField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final displayText = value != null
        ? DateFormat('MMM d, yyyy').format(value!)
        : 'Select date';

    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? LuxuryColors.textMuted : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              onTap();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.obsidian : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                      : IrisTheme.lightBorder,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Iconsax.calendar_1,
                    size: 18,
                    color: value != null
                        ? (isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen)
                        : LuxuryColors.textMuted,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      displayText,
                      style: TextStyle(
                        fontSize: 14,
                        color: value != null
                            ? (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)
                            : LuxuryColors.textMuted,
                      ),
                    ),
                  ),
                  Icon(
                    Iconsax.arrow_down_1,
                    size: 16,
                    color: LuxuryColors.textMuted,
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
