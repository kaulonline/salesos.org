import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';

import '../../core/config/theme.dart';
import '../../core/services/smart_notes_service.dart';
import 'luxury_card.dart';

/// A reusable notes section for entity detail pages
/// Displays notes linked to an entity (lead, account, contact, opportunity)
class EntityNotesSection extends ConsumerStatefulWidget {
  final String entityId;
  final String entityType; // 'lead', 'account', 'contact', 'opportunity'
  final String entityName; // For display purposes
  final bool isSalesforceId;

  const EntityNotesSection({
    super.key,
    required this.entityId,
    required this.entityType,
    required this.entityName,
    this.isSalesforceId = false,
  });

  @override
  ConsumerState<EntityNotesSection> createState() => _EntityNotesSectionState();
}

class _EntityNotesSectionState extends ConsumerState<EntityNotesSection> {
  List<CrmNote> _notes = [];
  bool _isLoading = true;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() => _isLoading = true);
    try {
      final notesService = ref.read(smartNotesServiceProvider);
      final notes = await notesService.getNotesForEntity(
        widget.entityId,
        widget.entityType,
        isSalesforceId: widget.isSalesforceId,
      );
      if (mounted) {
        setState(() {
          _notes = notes;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _notes = [];
          _isLoading = false;
        });
      }
    }
  }

  void _showCreateNoteSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CreateNoteForEntitySheet(
        entityId: widget.entityId,
        entityType: widget.entityType,
        entityName: widget.entityName,
        isSalesforceId: widget.isSalesforceId,
        onCreated: () {
          Navigator.pop(context);
          _loadNotes();
        },
      ),
    );
  }

  void _showNoteDetail(CrmNote note) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _NoteDetailBottomSheet(
        note: note,
        onUpdated: () {
          Navigator.pop(context);
          _loadNotes();
        },
        onDeleted: () {
          Navigator.pop(context);
          _loadNotes();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            setState(() => _isExpanded = !_isExpanded);
          },
          child: Row(
            children: [
              Icon(
                Iconsax.document_text,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
              const SizedBox(width: 8),
              Text(
                'Notes',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _notes.length.toString(),
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.champagneGold,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              Icon(
                _isExpanded ? Iconsax.arrow_up_2 : Iconsax.arrow_down_1,
                size: 18,
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Notes Content
        AnimatedCrossFade(
          duration: const Duration(milliseconds: 200),
          crossFadeState: _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          firstChild: _buildCollapsedView(isDark),
          secondChild: _buildExpandedView(isDark),
        ),
      ],
    );
  }

  Widget _buildCollapsedView(bool isDark) {
    if (_isLoading) {
      return LuxuryCard(
        variant: LuxuryCardVariant.bordered,
        tier: LuxuryTier.gold,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(LuxuryColors.champagneGold),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Loading notes...',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ),
      );
    }

    if (_notes.isEmpty) {
      return LuxuryCard(
        variant: LuxuryCardVariant.bordered,
        tier: LuxuryTier.gold,
        padding: const EdgeInsets.all(16),
        onTap: _showCreateNoteSheet,
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Iconsax.add,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Add first note',
                style: IrisTheme.bodyMedium.copyWith(
                  color: LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Icon(
              Iconsax.arrow_right_3,
              size: 16,
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ],
        ),
      );
    }

    // Show preview of most recent note
    final latestNote = _notes.first;
    return LuxuryCard(
      variant: LuxuryCardVariant.bordered,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(16),
      onTap: () => _showNoteDetail(latestNote),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              latestNote.isPrivate ? Iconsax.lock : Iconsax.document_text,
              size: 18,
              color: LuxuryColors.champagneGold,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  latestNote.title ?? 'Untitled Note',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  latestNote.body,
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (_notes.length > 1) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '+${_notes.length - 1}',
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildExpandedView(bool isDark) {
    return Column(
      children: [
        // Add Note Button
        LuxuryCard(
          variant: LuxuryCardVariant.bordered,
          tier: LuxuryTier.gold,
          padding: const EdgeInsets.all(12),
          onTap: _showCreateNoteSheet,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Iconsax.add,
                size: 18,
                color: LuxuryColors.jadePremium,
              ),
              const SizedBox(width: 8),
              Text(
                'Add Note',
                style: IrisTheme.bodyMedium.copyWith(
                  color: LuxuryColors.jadePremium,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Notes List
        if (_isLoading)
          Padding(
            padding: const EdgeInsets.all(20),
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation(LuxuryColors.champagneGold),
            ),
          )
        else if (_notes.isEmpty)
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Icon(
                  Iconsax.document,
                  size: 40,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(height: 8),
                Text(
                  'No notes yet',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          )
        else
          ...List.generate(_notes.length, (index) {
            final note = _notes[index];
            return Padding(
              padding: EdgeInsets.only(bottom: index < _notes.length - 1 ? 8 : 0),
              child: _NoteCard(
                note: note,
                onTap: () => _showNoteDetail(note),
              ),
            );
          }),
      ],
    );
  }
}

/// Note card widget
class _NoteCard extends StatelessWidget {
  final CrmNote note;
  final VoidCallback onTap;

  const _NoteCard({
    required this.note,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dateFormat = DateFormat('MMM d, yyyy');

    return LuxuryCard(
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  note.title ?? 'Untitled Note',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (note.isPrivate)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Icon(
                    Iconsax.lock,
                    size: 14,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            note.body,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Text(
            dateFormat.format(note.createdAt),
            style: IrisTheme.labelSmall.copyWith(
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Create note sheet for entity
class _CreateNoteForEntitySheet extends ConsumerStatefulWidget {
  final String entityId;
  final String entityType;
  final String entityName;
  final bool isSalesforceId;
  final VoidCallback onCreated;

  const _CreateNoteForEntitySheet({
    required this.entityId,
    required this.entityType,
    required this.entityName,
    required this.isSalesforceId,
    required this.onCreated,
  });

  @override
  ConsumerState<_CreateNoteForEntitySheet> createState() => _CreateNoteForEntitySheetState();
}

class _CreateNoteForEntitySheetState extends ConsumerState<_CreateNoteForEntitySheet> {
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  bool _isPrivate = false;
  bool _isSaving = false;

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _saveNote() async {
    if (_bodyController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Note content cannot be empty'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    HapticFeedback.lightImpact();

    try {
      final notesService = ref.read(smartNotesServiceProvider);
      final note = await notesService.createNoteForEntity(
        title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
        body: _bodyController.text.trim(),
        isPrivate: _isPrivate,
        entityId: widget.entityId,
        entityType: widget.entityType,
        isSalesforceId: widget.isSalesforceId,
      );

      if (note != null) {
        HapticFeedback.mediumImpact();
        widget.onCreated();
      } else {
        throw Exception('Failed to create note');
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create note: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Header
            Text(
              'Add Note',
              style: IrisTheme.titleLarge.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'For ${widget.entityName}',
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.champagneGold,
              ),
            ),
            const SizedBox(height: 24),

            // Title field
            TextField(
              controller: _titleController,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Note title (optional)',
                hintStyle: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
                prefixIcon: Icon(
                  Iconsax.text,
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
                filled: true,
                fillColor: isDark ? LuxuryColors.richBlack : LuxuryColors.platinum.withValues(alpha: 0.3),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Body field
            TextField(
              controller: _bodyController,
              maxLines: 6,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Write your note here...',
                hintStyle: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
                prefixIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 100),
                  child: Icon(
                    Iconsax.document_text,
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
                filled: true,
                fillColor: isDark ? LuxuryColors.richBlack : LuxuryColors.platinum.withValues(alpha: 0.3),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Private toggle
            Row(
              children: [
                Switch(
                  value: _isPrivate,
                  onChanged: (value) => setState(() => _isPrivate = value),
                  activeTrackColor: LuxuryColors.champagneGold,
                ),
                const SizedBox(width: 8),
                Icon(
                  _isPrivate ? Iconsax.lock : Iconsax.unlock,
                  size: 18,
                  color: _isPrivate ? LuxuryColors.champagneGold : (isDark ? Colors.white54 : Colors.black38),
                ),
                const SizedBox(width: 8),
                Text(
                  _isPrivate ? 'Private note' : 'Public note',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Save button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveNote,
                style: ElevatedButton.styleFrom(
                  backgroundColor: LuxuryColors.rolexGreen,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Save Note',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Note detail bottom sheet
class _NoteDetailBottomSheet extends ConsumerStatefulWidget {
  final CrmNote note;
  final VoidCallback onUpdated;
  final VoidCallback onDeleted;

  const _NoteDetailBottomSheet({
    required this.note,
    required this.onUpdated,
    required this.onDeleted,
  });

  @override
  ConsumerState<_NoteDetailBottomSheet> createState() => _NoteDetailBottomSheetState();
}

class _NoteDetailBottomSheetState extends ConsumerState<_NoteDetailBottomSheet> {
  late TextEditingController _titleController;
  late TextEditingController _bodyController;
  late bool _isPrivate;
  bool _isEditing = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.note.title ?? '');
    _bodyController = TextEditingController(text: widget.note.body);
    _isPrivate = widget.note.isPrivate;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    setState(() => _isSaving = true);
    HapticFeedback.lightImpact();

    try {
      final notesService = ref.read(smartNotesServiceProvider);
      final updated = await notesService.updateNote(
        widget.note.id,
        title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
        body: _bodyController.text.trim(),
        isPrivate: _isPrivate,
      );

      if (updated != null) {
        HapticFeedback.mediumImpact();
        widget.onUpdated();
      } else {
        throw Exception('Failed to update note');
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update note: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _deleteNote() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Note'),
        content: const Text('Are you sure you want to delete this note? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      HapticFeedback.lightImpact();
      try {
        final notesService = ref.read(smartNotesServiceProvider);
        final deleted = await notesService.deleteNote(widget.note.id);

        if (deleted) {
          HapticFeedback.mediumImpact();
          widget.onDeleted();
        } else {
          throw Exception('Failed to delete note');
        }
      } catch (e) {
        HapticFeedback.heavyImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete note: $e'),
              backgroundColor: Colors.red.shade700,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dateFormat = DateFormat('MMMM d, yyyy h:mm a');

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Header with actions
            Row(
              children: [
                Expanded(
                  child: Text(
                    _isEditing ? 'Edit Note' : 'Note Details',
                    style: IrisTheme.titleLarge.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),
                ),
                if (!_isEditing) ...[
                  IconButton(
                    icon: Icon(Iconsax.edit, color: LuxuryColors.jadePremium),
                    onPressed: () => setState(() => _isEditing = true),
                  ),
                  IconButton(
                    icon: Icon(Iconsax.trash, color: Colors.red.shade400),
                    onPressed: _deleteNote,
                  ),
                ] else ...[
                  TextButton(
                    onPressed: () {
                      _titleController.text = widget.note.title ?? '';
                      _bodyController.text = widget.note.body;
                      _isPrivate = widget.note.isPrivate;
                      setState(() => _isEditing = false);
                    },
                    child: const Text('Cancel'),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),

            if (_isEditing) ...[
              // Edit mode
              TextField(
                controller: _titleController,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'Note title (optional)',
                  hintStyle: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                  filled: true,
                  fillColor: isDark ? LuxuryColors.richBlack : LuxuryColors.platinum.withValues(alpha: 0.3),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _bodyController,
                maxLines: 6,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'Write your note here...',
                  hintStyle: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                  filled: true,
                  fillColor: isDark ? LuxuryColors.richBlack : LuxuryColors.platinum.withValues(alpha: 0.3),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Switch(
                    value: _isPrivate,
                    onChanged: (value) => setState(() => _isPrivate = value),
                    activeTrackColor: LuxuryColors.champagneGold,
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    _isPrivate ? Iconsax.lock : Iconsax.unlock,
                    size: 18,
                    color: _isPrivate ? LuxuryColors.champagneGold : (isDark ? Colors.white54 : Colors.black38),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isPrivate ? 'Private note' : 'Public note',
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? Colors.white70 : Colors.black54,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveChanges,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: LuxuryColors.rolexGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Save Changes',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                ),
              ),
            ] else ...[
              // View mode
              if (widget.note.title != null) ...[
                Text(
                  widget.note.title!,
                  style: IrisTheme.headlineSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              Row(
                children: [
                  if (widget.note.isPrivate)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Iconsax.lock, size: 12, color: LuxuryColors.champagneGold),
                          const SizedBox(width: 4),
                          Text(
                            'Private',
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.champagneGold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  const Spacer(),
                  Text(
                    dateFormat.format(widget.note.createdAt),
                    style: IrisTheme.labelSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? LuxuryColors.richBlack : LuxuryColors.platinum.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  widget.note.body,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
