import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// Action type for note intelligence
enum NoteActionType {
  createTask,
  updateOpportunity,
  updateLead,
  updateAccount,
  updateContact,
  linkToEntity,
  syncToSalesforce,
}

/// Pending action from note intelligence
class PendingNoteAction {
  final String id;
  final NoteActionType actionType;
  final String? targetEntity;
  final String? targetEntityId;
  final String? fieldName;
  final dynamic proposedValue;
  final double confidence;
  final String? reasoning;
  final String? sourceText;
  bool isSelected;

  PendingNoteAction({
    required this.id,
    required this.actionType,
    this.targetEntity,
    this.targetEntityId,
    this.fieldName,
    this.proposedValue,
    this.confidence = 0.5,
    this.reasoning,
    this.sourceText,
    this.isSelected = true,
  });

  factory PendingNoteAction.fromJson(Map<String, dynamic> json) {
    return PendingNoteAction(
      id: json['id'] ?? '',
      actionType: _parseActionType(json['actionType']),
      targetEntity: json['targetEntity'],
      targetEntityId: json['targetEntityId'],
      fieldName: json['fieldName'],
      proposedValue: json['proposedValue'],
      confidence: (json['confidence'] ?? 0.5).toDouble(),
      reasoning: json['reasoning'],
      sourceText: json['sourceText'],
    );
  }

  static NoteActionType _parseActionType(String? type) {
    switch (type) {
      case 'CREATE_TASK':
        return NoteActionType.createTask;
      case 'UPDATE_OPPORTUNITY':
        return NoteActionType.updateOpportunity;
      case 'UPDATE_LEAD':
        return NoteActionType.updateLead;
      case 'UPDATE_ACCOUNT':
        return NoteActionType.updateAccount;
      case 'UPDATE_CONTACT':
        return NoteActionType.updateContact;
      case 'LINK_TO_ENTITY':
        return NoteActionType.linkToEntity;
      case 'SYNC_TO_SALESFORCE':
        return NoteActionType.syncToSalesforce;
      default:
        return NoteActionType.createTask;
    }
  }

  String get actionTypeString {
    switch (actionType) {
      case NoteActionType.createTask:
        return 'CREATE_TASK';
      case NoteActionType.updateOpportunity:
        return 'UPDATE_OPPORTUNITY';
      case NoteActionType.updateLead:
        return 'UPDATE_LEAD';
      case NoteActionType.updateAccount:
        return 'UPDATE_ACCOUNT';
      case NoteActionType.updateContact:
        return 'UPDATE_CONTACT';
      case NoteActionType.linkToEntity:
        return 'LINK_TO_ENTITY';
      case NoteActionType.syncToSalesforce:
        return 'SYNC_TO_SALESFORCE';
    }
  }
}

/// Note Actions Review Sheet for reviewing AI-suggested actions
class NoteActionsReviewSheet extends StatefulWidget {
  final List<PendingNoteAction> actions;
  final String? noteTitle;
  final String? noteSummary;
  final Function(List<String> approvedIds, List<String> rejectedIds) onSubmit;
  final VoidCallback? onCancel;

  const NoteActionsReviewSheet({
    super.key,
    required this.actions,
    this.noteTitle,
    this.noteSummary,
    required this.onSubmit,
    this.onCancel,
  });

  @override
  State<NoteActionsReviewSheet> createState() => _NoteActionsReviewSheetState();
}

class _NoteActionsReviewSheetState extends State<NoteActionsReviewSheet> {
  late List<PendingNoteAction> _actions;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _actions = widget.actions.map((a) {
      // Auto-select high confidence actions
      return PendingNoteAction(
        id: a.id,
        actionType: a.actionType,
        targetEntity: a.targetEntity,
        targetEntityId: a.targetEntityId,
        fieldName: a.fieldName,
        proposedValue: a.proposedValue,
        confidence: a.confidence,
        reasoning: a.reasoning,
        sourceText: a.sourceText,
        isSelected: a.confidence >= 0.7,
      );
    }).toList();
  }

  void _toggleAction(int index) {
    HapticFeedback.lightImpact();
    setState(() {
      _actions[index].isSelected = !_actions[index].isSelected;
    });
  }

  void _selectAll() {
    HapticFeedback.lightImpact();
    setState(() {
      for (var action in _actions) {
        action.isSelected = true;
      }
    });
  }

  void _deselectAll() {
    HapticFeedback.lightImpact();
    setState(() {
      for (var action in _actions) {
        action.isSelected = false;
      }
    });
  }

  Future<void> _submit() async {
    HapticFeedback.mediumImpact();
    setState(() => _isSubmitting = true);

    final approvedIds = _actions
        .where((a) => a.isSelected)
        .map((a) => a.id)
        .toList();
    final rejectedIds = _actions
        .where((a) => !a.isSelected)
        .map((a) => a.id)
        .toList();

    await widget.onSubmit(approvedIds, rejectedIds);

    if (mounted) {
      setState(() => _isSubmitting = false);
      Navigator.of(context).pop();
    }
  }

  IconData _getIconForAction(NoteActionType type) {
    switch (type) {
      case NoteActionType.createTask:
        return Iconsax.task_square;
      case NoteActionType.updateOpportunity:
        return Iconsax.money_4;
      case NoteActionType.updateLead:
        return Iconsax.profile_2user;
      case NoteActionType.updateAccount:
        return Iconsax.building;
      case NoteActionType.updateContact:
        return Iconsax.user;
      case NoteActionType.linkToEntity:
        return Iconsax.link;
      case NoteActionType.syncToSalesforce:
        return Iconsax.cloud_add;
    }
  }

  Color _getColorForAction(NoteActionType type, bool isDark) {
    switch (type) {
      case NoteActionType.createTask:
        return Colors.blue;
      case NoteActionType.updateOpportunity:
        return Colors.purple;
      case NoteActionType.updateLead:
        return LuxuryColors.rolexGreen;
      case NoteActionType.updateAccount:
        return LuxuryColors.champagneGold;
      case NoteActionType.updateContact:
        return Colors.teal;
      case NoteActionType.linkToEntity:
        return Colors.orange;
      case NoteActionType.syncToSalesforce:
        return Colors.blue.shade700;
    }
  }

  String _getActionTitle(PendingNoteAction action) {
    switch (action.actionType) {
      case NoteActionType.createTask:
        final value = action.proposedValue;
        if (value is Map) {
          return 'Create Task: ${value['subject'] ?? 'Follow-up'}';
        }
        return 'Create Follow-up Task';
      case NoteActionType.updateOpportunity:
        return 'Update Opportunity ${action.fieldName ?? ''}';
      case NoteActionType.updateLead:
        return 'Update Lead ${action.fieldName ?? ''}';
      case NoteActionType.updateAccount:
        return 'Update Account ${action.fieldName ?? ''}';
      case NoteActionType.updateContact:
        return 'Update Contact ${action.fieldName ?? ''}';
      case NoteActionType.linkToEntity:
        return 'Link to ${action.targetEntity ?? 'Record'}';
      case NoteActionType.syncToSalesforce:
        return 'Sync to Salesforce';
    }
  }

  String _getActionSubtitle(PendingNoteAction action) {
    if (action.actionType == NoteActionType.createTask) {
      final value = action.proposedValue;
      if (value is Map) {
        final parts = <String>[];
        if (value['priority'] != null) parts.add('Priority: ${value['priority']}');
        if (value['dueDate'] != null) parts.add('Due: ${value['dueDate']}');
        return parts.isNotEmpty ? parts.join(' | ') : action.reasoning ?? '';
      }
    }

    if (action.proposedValue != null && action.fieldName != null) {
      return '${action.fieldName}: ${action.proposedValue}';
    }

    return action.reasoning ?? '';
  }

  Color _getConfidenceColor(double confidence) {
    if (confidence >= 0.8) return LuxuryColors.rolexGreen;
    if (confidence >= 0.6) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedCount = _actions.where((a) => a.isSelected).length;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.richBlack : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Iconsax.magic_star,
                        color: LuxuryColors.rolexGreen,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AI Suggestions',
                            style: IrisTheme.headlineSmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '${_actions.length} actions detected',
                            style: IrisTheme.labelMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Summary if available
                if (widget.noteSummary != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark
                          ? LuxuryColors.obsidian
                          : LuxuryColors.platinum.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Iconsax.document_text,
                          size: 16,
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.noteSummary!,
                            style: IrisTheme.bodySmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Select all / Deselect all
                const SizedBox(height: 12),
                Row(
                  children: [
                    GestureDetector(
                      onTap: _selectAll,
                      child: Text(
                        'Select All',
                        style: IrisTheme.labelMedium.copyWith(
                          color: LuxuryColors.rolexGreen,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    GestureDetector(
                      onTap: _deselectAll,
                      child: Text(
                        'Deselect All',
                        style: IrisTheme.labelMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Actions list
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _actions.length,
              itemBuilder: (context, index) {
                final action = _actions[index];
                final color = _getColorForAction(action.actionType, isDark);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GestureDetector(
                    onTap: () => _toggleAction(index),
                    child: LuxuryCard(
                      variant: action.isSelected
                          ? LuxuryCardVariant.accent
                          : LuxuryCardVariant.bordered,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            // Checkbox
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: action.isSelected
                                    ? LuxuryColors.rolexGreen
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: action.isSelected
                                      ? LuxuryColors.rolexGreen
                                      : isDark
                                          ? Colors.white24
                                          : Colors.black26,
                                  width: 2,
                                ),
                              ),
                              child: action.isSelected
                                  ? const Icon(
                                      Icons.check,
                                      size: 16,
                                      color: Colors.white,
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 12),

                            // Icon
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                _getIconForAction(action.actionType),
                                color: color,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Content
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _getActionTitle(action),
                                    style: IrisTheme.bodyMedium.copyWith(
                                      color: isDark
                                          ? IrisTheme.darkTextPrimary
                                          : IrisTheme.lightTextPrimary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _getActionSubtitle(action),
                                    style: IrisTheme.labelSmall.copyWith(
                                      color: isDark
                                          ? IrisTheme.darkTextSecondary
                                          : IrisTheme.lightTextSecondary,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),

                            // Confidence indicator
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: _getConfidenceColor(action.confidence)
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${(action.confidence * 100).toInt()}%',
                                style: IrisTheme.labelSmall.copyWith(
                                  color: _getConfidenceColor(action.confidence),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ).animate().fadeIn(
                        duration: 200.ms,
                        delay: (index * 50).ms,
                      ),
                );
              },
            ),
          ),

          // Bottom actions
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSubmitting
                          ? null
                          : () {
                              widget.onCancel?.call();
                              Navigator.of(context).pop();
                            },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: BorderSide(
                          color: isDark ? Colors.white24 : Colors.black26,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Skip All',
                        style: IrisTheme.labelLarge.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _isSubmitting || selectedCount == 0
                          ? null
                          : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: LuxuryColors.rolexGreen,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              'Apply $selectedCount Action${selectedCount != 1 ? 's' : ''}',
                              style: IrisTheme.labelLarge.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
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
}

/// Show the note actions review sheet as a bottom sheet
Future<void> showNoteActionsReviewSheet(
  BuildContext context, {
  required List<PendingNoteAction> actions,
  String? noteTitle,
  String? noteSummary,
  required Function(List<String> approvedIds, List<String> rejectedIds) onSubmit,
  VoidCallback? onCancel,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => NoteActionsReviewSheet(
      actions: actions,
      noteTitle: noteTitle,
      noteSummary: noteSummary,
      onSubmit: onSubmit,
      onCancel: onCancel,
    ),
  );
}
