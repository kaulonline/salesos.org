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

/// Activity type options
enum ActivityType { call, meeting, email }

/// Activity form widget for logging calls, meetings, and emails
class ActivityForm extends ConsumerStatefulWidget {
  final ActivityType activityType;
  final Map<String, dynamic>? initialData;
  final VoidCallback? onSuccess;
  final String? contactId;
  final String? relatedToId; // Account or Opportunity ID

  const ActivityForm({
    super.key,
    required this.activityType,
    this.initialData,
    this.onSuccess,
    this.contactId,
    this.relatedToId,
  });

  @override
  ConsumerState<ActivityForm> createState() => _ActivityFormState();

  /// Show the log call form as a centered modal
  static Future<void> logCall({
    required BuildContext context,
    VoidCallback? onSuccess,
    String? contactId,
    String? relatedToId,
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
          child: ActivityForm(
            activityType: ActivityType.call,
            onSuccess: onSuccess,
            contactId: contactId,
            relatedToId: relatedToId,
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

  /// Show the log meeting form as a centered modal
  static Future<void> logMeeting({
    required BuildContext context,
    VoidCallback? onSuccess,
    String? contactId,
    String? relatedToId,
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
          child: ActivityForm(
            activityType: ActivityType.meeting,
            onSuccess: onSuccess,
            contactId: contactId,
            relatedToId: relatedToId,
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

  /// Show the log email form as a centered modal
  static Future<void> logEmail({
    required BuildContext context,
    VoidCallback? onSuccess,
    String? contactId,
    String? relatedToId,
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
          child: ActivityForm(
            activityType: ActivityType.email,
            onSuccess: onSuccess,
            contactId: contactId,
            relatedToId: relatedToId,
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

  /// Show activity type selector and then the appropriate form
  static Future<void> show({
    required BuildContext context,
    VoidCallback? onSuccess,
    String? contactId,
    String? relatedToId,
  }) async {
    HapticFeedback.mediumImpact();
    final type = await showGeneralDialog<ActivityType>(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: _ActivityTypeSelector(),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );

    if (type != null && context.mounted) {
      await showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
        barrierColor: Colors.black54,
        transitionDuration: const Duration(milliseconds: 200),
        pageBuilder: (context, animation, secondaryAnimation) {
          return BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
            child: ActivityForm(
              activityType: type,
              onSuccess: onSuccess,
              contactId: contactId,
              relatedToId: relatedToId,
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
}

class _ActivityFormState extends ConsumerState<ActivityForm> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  // Form controllers
  late final TextEditingController _subjectController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _locationController;

  DateTime? _activityDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;

  String get _typeLabel {
    switch (widget.activityType) {
      case ActivityType.call:
        return 'Call';
      case ActivityType.meeting:
        return 'Meeting';
      case ActivityType.email:
        return 'Email';
    }
  }

  IconData get _typeIcon {
    switch (widget.activityType) {
      case ActivityType.call:
        return Icons.phone_outlined;
      case ActivityType.meeting:
        return Icons.people_outline;
      case ActivityType.email:
        return Icons.email_outlined;
    }
  }

  @override
  void initState() {
    super.initState();
    _initializeForm();
  }

  void _initializeForm() {
    // Get prefill data from context (e.g., creating activity from a contact or deal)
    final prefillService = ref.read(prefillServiceProvider);
    Map<String, dynamic> data = prefillService.getActivityPrefill();

    // Merge with any provided initial data (initial data takes priority)
    if (widget.initialData != null) {
      data.addAll(widget.initialData!);
    }

    // Get related entity name for subject line
    final relatedName = data['_relatedToName'] ?? '';

    final defaultSubject = widget.activityType == ActivityType.call
        ? 'Call with $relatedName'.trim()
        : widget.activityType == ActivityType.meeting
            ? 'Meeting: $relatedName'.trim()
            : 'Email: $relatedName'.trim();

    _subjectController = TextEditingController(text: data['subject'] ?? defaultSubject);
    _descriptionController = TextEditingController(text: data['description'] ?? '');
    _locationController = TextEditingController(text: data['location'] ?? '');

    _activityDate = DateTime.now();
    _startTime = TimeOfDay.now();
    _endTime = TimeOfDay(hour: TimeOfDay.now().hour + 1, minute: TimeOfDay.now().minute);
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _activityDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
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
        _activityDate = picked;
      });
    }
  }

  Future<void> _selectStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime ?? TimeOfDay.now(),
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
        _startTime = picked;
      });
    }
  }

  Future<void> _selectEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime ?? TimeOfDay(hour: TimeOfDay.now().hour + 1, minute: 0),
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
        _endTime = picked;
      });
    }
  }

  DateTime? _combineDateTime(DateTime? date, TimeOfDay? time) {
    if (date == null || time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final crmService = ref.read(crmDataServiceProvider);

      switch (widget.activityType) {
        case ActivityType.call:
          await crmService.logCall({
            'subject': _subjectController.text.trim(),
            'description': _descriptionController.text.trim(),
            'activityDate': _activityDate?.toIso8601String().split('T')[0],
            'contactId': widget.contactId,
            'relatedToId': widget.relatedToId,
          });
          break;
        case ActivityType.meeting:
          final startDateTime = _combineDateTime(_activityDate, _startTime);
          final endDateTime = _combineDateTime(_activityDate, _endTime);
          await crmService.logMeeting({
            'subject': _subjectController.text.trim(),
            'description': _descriptionController.text.trim(),
            'location': _locationController.text.trim(),
            'startTime': startDateTime?.toIso8601String(),
            'endTime': endDateTime?.toIso8601String(),
            'contactId': widget.contactId,
            'relatedToId': widget.relatedToId,
          });
          break;
        case ActivityType.email:
          await crmService.logEmail({
            'subject': _subjectController.text.trim(),
            'description': _descriptionController.text.trim(),
            'activityDate': _activityDate?.toIso8601String().split('T')[0],
            'contactId': widget.contactId,
            'relatedToId': widget.relatedToId,
          });
          break;
      }

      HapticFeedback.mediumImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$_typeLabel logged successfully'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
        Navigator.of(context).pop();
        widget.onSuccess?.call();
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to log $_typeLabel: ${e.toString()}';
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return IrisFormDialog(
      title: 'Log $_typeLabel',
      mode: IrisFormMode.create,
      formKey: _formKey,
      isLoading: _isLoading,
      saveLabel: 'Log $_typeLabel',
      onSave: _handleSave,
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
            title: '$_typeLabel Details',
            children: [
              IrisTextField(
                controller: _subjectController,
                label: 'Subject',
                hint: 'Enter subject',
                prefixIcon: _typeIcon,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Subject is required';
                  }
                  return null;
                },
              ),
            ],
          ),

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Date & Time',
            children: [
              // Date picker
              GestureDetector(
                onTap: _selectDate,
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
                              'DATE',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1.2,
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _activityDate != null
                                  ? DateFormat('MMM dd, yyyy').format(_activityDate!)
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
              // Time pickers for meetings
              if (widget.activityType == ActivityType.meeting) ...[
                IrisFormRow(
                  children: [
                    // Start time
                    GestureDetector(
                      onTap: _selectStartTime,
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
                              Icons.access_time,
                              size: 20,
                              color: LuxuryColors.champagneGold,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'START',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w500,
                                      letterSpacing: 1.2,
                                      color: LuxuryColors.textMuted,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _startTime?.format(context) ?? 'Select',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // End time
                    GestureDetector(
                      onTap: _selectEndTime,
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
                              Icons.access_time,
                              size: 20,
                              color: LuxuryColors.champagneGold,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'END',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w500,
                                      letterSpacing: 1.2,
                                      color: LuxuryColors.textMuted,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _endTime?.format(context) ?? 'Select',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),

          // Location for meetings
          if (widget.activityType == ActivityType.meeting) ...[
            const SizedBox(height: 24),
            IrisFormSection(
              title: 'Location',
              children: [
                IrisTextField(
                  controller: _locationController,
                  label: 'Location',
                  hint: 'Where is the meeting?',
                  prefixIcon: Icons.location_on_outlined,
                ),
              ],
            ),
          ],

          const SizedBox(height: 24),

          IrisFormSection(
            title: 'Notes',
            children: [
              LuxuryTextArea(
                controller: _descriptionController,
                label: 'Description',
                hint: 'Add notes about this $_typeLabel...',
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

/// Activity type selector bottom sheet
class _ActivityTypeSelector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.richBlack : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'LOG ACTIVITY',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                    color: LuxuryColors.textMuted,
                  ),
                ),
                const SizedBox(height: 16),
                _ActivityTypeOption(
                  icon: Icons.phone_outlined,
                  label: 'Log a Call',
                  description: 'Record a phone conversation',
                  color: LuxuryColors.rolexGreen,
                  onTap: () => Navigator.pop(context, ActivityType.call),
                ),
                const SizedBox(height: 12),
                _ActivityTypeOption(
                  icon: Icons.people_outline,
                  label: 'Log a Meeting',
                  description: 'Record an in-person or virtual meeting',
                  color: LuxuryColors.champagneGold,
                  onTap: () => Navigator.pop(context, ActivityType.meeting),
                ),
                const SizedBox(height: 12),
                _ActivityTypeOption(
                  icon: Icons.email_outlined,
                  label: 'Log an Email',
                  description: 'Record an email communication',
                  color: LuxuryColors.platinum,
                  onTap: () => Navigator.pop(context, ActivityType.email),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityTypeOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final Color color;
  final VoidCallback onTap;

  const _ActivityTypeOption({
    required this.icon,
    required this.label,
    required this.description,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 12,
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: color,
            ),
          ],
        ),
      ),
    );
  }
}
