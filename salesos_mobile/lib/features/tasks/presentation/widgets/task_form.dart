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
import '../../../../shared/widgets/smart_fill_button.dart';

/// Task status options
const List<String> taskStatusOptions = [
  'Not Started',
  'In Progress',
  'Waiting on someone else',
  'Deferred',
  'Completed',
];

/// Task priority options
const List<String> taskPriorityOptions = [
  'High',
  'Normal',
  'Low',
];

/// Task form widget for creating and editing tasks
class TaskForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialData;
  final IrisFormMode mode;
  final VoidCallback? onSuccess;
  final String? relatedToId;
  final String? contactId;

  const TaskForm({
    super.key,
    this.initialData,
    this.mode = IrisFormMode.create,
    this.onSuccess,
    this.relatedToId,
    this.contactId,
  });

  @override
  ConsumerState<TaskForm> createState() => _TaskFormState();

  /// Show the task form as a centered modal
  static Future<void> show({
    required BuildContext context,
    Map<String, dynamic>? initialData,
    IrisFormMode mode = IrisFormMode.create,
    VoidCallback? onSuccess,
    String? relatedToId,
    String? contactId,
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
          child: TaskForm(
            initialData: initialData,
            mode: mode,
            onSuccess: onSuccess,
            relatedToId: relatedToId,
            contactId: contactId,
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

class _TaskFormState extends ConsumerState<TaskForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  // Form controllers
  late final TextEditingController _subjectController;
  late final TextEditingController _descriptionController;

  String? _status;
  String? _priority;
  String? _relatedToId;
  String? _contactId;
  DateTime? _dueDate;

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
      data = prefillService.getTaskPrefill();
    }
    // Merge with any provided initial data (initial data takes priority)
    if (widget.initialData != null) {
      data.addAll(widget.initialData!);
    }

    _subjectController = TextEditingController(text: data['subject'] ?? data['Subject'] ?? '');
    _descriptionController = TextEditingController(text: data['description'] ?? data['Description'] ?? '');

    _status = data['status'] ?? data['Status'] ?? 'Not Started';
    _priority = data['priority'] ?? data['Priority'] ?? 'Normal';
    _relatedToId = widget.relatedToId ?? data['whatId'] ?? data['WhatId'];
    _contactId = widget.contactId ?? data['whoId'] ?? data['WhoId'];

    final dueDateStr = data['activityDate'] ?? data['ActivityDate'] ?? data['dueDate'];
    if (dueDateStr != null) {
      _dueDate = DateTime.tryParse(dueDateStr.toString());
    }
    _dueDate ??= DateTime.now().add(const Duration(days: 7));
  }

  /// Apply smart fill data to form controllers
  void _applySmartFillData(Map<String, dynamic> data) {
    setState(() {
      if (data['subject'] != null) _subjectController.text = data['subject'];
      if (data['description'] != null) _descriptionController.text = data['description'];
      if (data['priority'] != null && taskPriorityOptions.contains(data['priority'])) {
        _priority = data['priority'];
      }
      if (data['dueDate'] != null) {
        final parsed = DateTime.tryParse(data['dueDate']);
        if (parsed != null) _dueDate = parsed;
      }
      if (data['dueTime'] != null && data['dueDate'] != null) {
        // Combine date and time if both provided
        final timeParts = data['dueTime'].toString().split(':');
        if (timeParts.length >= 2 && _dueDate != null) {
          final hour = int.tryParse(timeParts[0]) ?? 0;
          final minute = int.tryParse(timeParts[1]) ?? 0;
          _dueDate = DateTime(_dueDate!.year, _dueDate!.month, _dueDate!.day, hour, minute);
        }
      }
    });
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  /// Build dropdown items for status, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildStatusDropdownItems() {
    final items = <String>{...taskStatusOptions};
    if (_status != null && !items.contains(_status)) {
      items.add(_status!);
    }
    return items.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList();
  }

  /// Build dropdown items for priority, including current value if from Salesforce
  List<DropdownMenuItem<String>> _buildPriorityDropdownItems() {
    final items = <String>{...taskPriorityOptions};
    if (_priority != null && !items.contains(_priority)) {
      items.add(_priority!);
    }
    return items.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList();
  }

  Map<String, dynamic> _buildTaskData() {
    return {
      'subject': _subjectController.text.trim(),
      'description': _descriptionController.text.trim(),
      'status': _status,
      'priority': _priority,
      if (_relatedToId != null) 'whatId': _relatedToId,
      if (_contactId != null) 'whoId': _contactId,
      if (_dueDate != null) 'activityDate': _dueDate!.toIso8601String().split('T')[0],
    };
  }

  Future<void> _selectDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
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
        _dueDate = picked;
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
      final data = _buildTaskData();

      if (widget.mode == IrisFormMode.create) {
        await crmService.createTask(data);
        HapticFeedback.mediumImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Task created successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
          Navigator.of(context).pop();
          widget.onSuccess?.call();
        }
      } else if (widget.mode == IrisFormMode.edit) {
        final id = widget.initialData?['id'] ?? widget.initialData?['Id'];
        if (id != null) {
          await crmService.updateTask(id, data);
          HapticFeedback.mediumImpact();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Task updated successfully'),
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
        _errorMessage = 'Failed to save task: ${e.toString()}';
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
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
    );

    if (!confirmed || !mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);
      final id = widget.initialData?['id'] ?? widget.initialData?['Id'];

      if (id != null) {
        final success = await crmService.deleteTask(id);
        if (success && mounted) {
          HapticFeedback.mediumImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Task deleted'),
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
      title: widget.mode == IrisFormMode.create ? 'New Task' : 'Edit Task',
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
              entityType: SmartFillEntityType.task,
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
            title: 'Task Details',
            children: [
              IrisTextField(
                controller: _subjectController,
                label: 'Subject',
                hint: 'What needs to be done?',
                prefixIcon: Icons.task_alt_outlined,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Subject is required';
                  }
                  return null;
                },
              ),
              IrisFormRow(
                children: [
                  LuxuryDropdown<String>(
                    label: 'Status',
                    hint: 'Select status',
                    value: _status,
                    items: _buildStatusDropdownItems(),
                    onChanged: (value) => setState(() => _status = value),
                  ),
                  LuxuryDropdown<String>(
                    label: 'Priority',
                    hint: 'Select priority',
                    value: _priority,
                    items: _buildPriorityDropdownItems(),
                    onChanged: (value) => setState(() => _priority = value),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Due Date',
            children: [
              GestureDetector(
                onTap: _selectDueDate,
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
                              'DUE DATE',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1.2,
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _dueDate != null
                                  ? DateFormat('MMM dd, yyyy').format(_dueDate!)
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

          IrisFormSection(
            title: 'Description',
            children: [
              LuxuryTextArea(
                controller: _descriptionController,
                label: 'Comments',
                hint: 'Add notes or details...',
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
