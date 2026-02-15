import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/smart_notes_service.dart';
import '../../../../core/services/smart_capture_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/entity_picker.dart';
import '../../../../shared/widgets/voice_note_recorder.dart';
import '../../../../shared/widgets/note_actions_review_sheet.dart';

class SmartNotesPage extends ConsumerStatefulWidget {
  final String? linkedEntityId;
  final String? linkedEntityType;
  final String? linkedEntityName;

  const SmartNotesPage({
    super.key,
    this.linkedEntityId,
    this.linkedEntityType,
    this.linkedEntityName,
  });

  @override
  ConsumerState<SmartNotesPage> createState() => _SmartNotesPageState();
}

class _SmartNotesPageState extends ConsumerState<SmartNotesPage> {
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  bool _isProcessingCapture = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _captureWithMode(CaptureMode mode) async {
    HapticFeedback.lightImpact();
    final captureService = ref.read(smartCaptureServiceProvider);

    // Show source selection dialog
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black54,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 340),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                width: 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _getModeName(mode),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _SourceButton(
                        icon: Iconsax.camera,
                        label: 'Camera',
                        isDark: isDark,
                        onTap: () async {
                          Navigator.pop(context);
                          final image = await captureService.captureFromCamera();
                          if (image != null && mounted) {
                            _processCapture(image, mode);
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _SourceButton(
                        icon: Iconsax.gallery,
                        label: 'Gallery',
                        isDark: isDark,
                        onTap: () async {
                          Navigator.pop(context);
                          final image = await captureService.pickFromGallery();
                          if (image != null && mounted) {
                            _processCapture(image, mode);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getModeName(CaptureMode mode) {
    switch (mode) {
      case CaptureMode.businessCard:
        return 'Scan Business Card';
      case CaptureMode.document:
        return 'Scan Document';
      case CaptureMode.handwritten:
        return 'Capture Handwritten Notes';
      case CaptureMode.receipt:
        return 'Scan Receipt';
    }
  }

  Future<void> _processCapture(File imageFile, CaptureMode mode) async {
    setState(() => _isProcessingCapture = true);

    try {
      final captureService = ref.read(smartCaptureServiceProvider);
      final result = await captureService.processImage(
        imageFile,
        mode,
        linkedEntityId: widget.linkedEntityId,
        linkedEntityType: widget.linkedEntityType,
      );

      if (mounted) {
        setState(() => _isProcessingCapture = false);

        if (result.success) {
          HapticFeedback.mediumImpact();
          _showCaptureResultSheet(result, mode);
        } else {
          _showErrorSnackbar(result.error ?? 'Processing failed');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessingCapture = false);
        _showErrorSnackbar(e.toString());
      }
    }
  }

  void _showCaptureResultSheet(SmartCaptureResult result, CaptureMode mode) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black54,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: _CaptureResultSheet(
            result: result,
            mode: mode,
            isDark: isDark,
            linkedEntityId: widget.linkedEntityId,
            linkedEntityType: widget.linkedEntityType,
            onCreated: () {
              Navigator.pop(context);
              _refreshNotes();
            },
            onDismiss: () => Navigator.pop(context),
          ),
        ),
      ),
    );
  }

  void _showErrorSnackbar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _refreshNotes() async {
    if (widget.linkedEntityId != null && widget.linkedEntityType != null) {
      ref.invalidate(entityNotesProvider((
        entityId: widget.linkedEntityId!,
        entityType: widget.linkedEntityType!,
      )));
    } else {
      ref.invalidate(notesProvider(_searchQuery.isEmpty ? null : _searchQuery));
    }
  }

  void _showCreateNoteSheet() {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black54,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: _CreateNoteSheet(
            linkedEntityId: widget.linkedEntityId,
            linkedEntityType: widget.linkedEntityType,
            onCreated: () {
              Navigator.pop(context);
              _refreshNotes();
            },
          ),
        ),
      ),
    );
  }

  void _showNoteDetail(CrmNote note) {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black54,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: _NoteDetailSheet(
            note: note,
            onUpdated: () {
              Navigator.pop(context);
              _refreshNotes();
            },
            onDeleted: () {
              Navigator.pop(context);
              _refreshNotes();
            },
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Use entity-specific provider if linked to an entity
    final notesAsync = widget.linkedEntityId != null && widget.linkedEntityType != null
        ? ref.watch(entityNotesProvider((
            entityId: widget.linkedEntityId!,
            entityType: widget.linkedEntityType!,
          )))
        : ref.watch(notesProvider(_searchQuery.isEmpty ? null : _searchQuery));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Iconsax.arrow_left,
            color: isDark ? Colors.white : Colors.black87,
          ),
          onPressed: () => context.pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Smart Notes',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            if (widget.linkedEntityName != null)
              Text(
                widget.linkedEntityName!,
                style: TextStyle(
                  color: isDark ? Colors.white60 : Colors.black54,
                  fontSize: 12,
                ),
              ),
          ],
        ),
        centerTitle: false,
        actions: [
          // Canvas Notepad - Apple Pencil Drawing
          IconButton(
            icon: Icon(
              Iconsax.pen_tool,
              color: LuxuryColors.champagneGold,
            ),
            onPressed: () {
              HapticFeedback.lightImpact();
              context.push(
                '${AppRoutes.canvasNotepad}?entityId=${widget.linkedEntityId ?? ''}&entityType=${widget.linkedEntityType ?? ''}&entityName=${widget.linkedEntityName ?? ''}',
              );
            },
            tooltip: 'Canvas Notepad',
          ),
        ],
      ),
      body: Stack(
        children: [
          SafeArea(
            child: RefreshIndicator(
              onRefresh: _refreshNotes,
              color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
              backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
              child: Column(
                children: [
                  // Compact Capture Row
                  _CaptureRow(
                    isDark: isDark,
                    onCapture: _captureWithMode,
                  ),

                  // Search bar (only show if not linked to entity)
                  if (widget.linkedEntityId == null) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: IrisTextField(
                        controller: _searchController,
                        hint: 'Search notes...',
                        prefixIcon: Iconsax.search_normal,
                        onChanged: (value) {
                          setState(() => _searchQuery = value);
                          // Debounce search
                          Future.delayed(const Duration(milliseconds: 500), () {
                            if (_searchQuery == value) {
                              ref.invalidate(notesProvider(_searchQuery.isEmpty ? null : _searchQuery));
                            }
                          });
                        },
                      ),
                    ),
                  ],

                  // Notes list - Compact DataTable
                  Expanded(
                child: notesAsync.when(
                  data: (notes) {
                    if (notes.isEmpty) {
                      return ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          SizedBox(
                            height: MediaQuery.of(context).size.height * 0.4,
                            child: IrisEmptyState(
                              icon: Iconsax.note,
                              title: 'No Notes Yet',
                              subtitle: widget.linkedEntityId != null
                                  ? 'Capture a handwritten note or create a new one for this ${widget.linkedEntityType}.'
                                  : 'Capture handwritten notes or create new ones to keep track of important information.',
                              actionLabel: 'Create Note',
                              onAction: _showCreateNoteSheet,
                            ),
                          ),
                        ],
                      );
                    }

                    return _NotesDataTable(
                      notes: notes,
                      isDark: isDark,
                      onNoteTap: _showNoteDetail,
                      onRefresh: _refreshNotes,
                    );
                  },
                  loading: () => ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [_NotesTableShimmer()],
                  ),
                  error: (error, stack) => ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(
                        height: MediaQuery.of(context).size.height * 0.4,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Iconsax.warning_2,
                                size: 48,
                                color: Colors.red.shade400,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Failed to load notes',
                                style: TextStyle(
                                  color: isDark ? Colors.white : Colors.black87,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Pull down to retry',
                                style: TextStyle(
                                  color: isDark ? Colors.white54 : Colors.black45,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextButton(
                                onPressed: _refreshNotes,
                                child: const Text('Try Again'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
                ],
              ),
            ),
          ),
          // Processing overlay
          if (_isProcessingCapture)
            Container(
              color: Colors.black54,
              child: Center(
                child: LuxuryCard(
                  variant: LuxuryCardVariant.elevated,
                  tier: LuxuryTier.gold,
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 50,
                        height: 50,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Processing...',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? Colors.white
                              : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Extracting data with AI',
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? Colors.white60
                              : Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateNoteSheet,
        backgroundColor: LuxuryColors.rolexGreen,
        child: const Icon(Iconsax.add, color: Colors.white),
      ),
    );
  }
}

// Compact Capture Row - Horizontal scrolling buttons
class _CaptureRow extends StatelessWidget {
  final bool isDark;
  final Function(CaptureMode) onCapture;

  const _CaptureRow({
    required this.isDark,
    required this.onCapture,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _CaptureButton(
              icon: Iconsax.card,
              label: 'Business Card',
              color: LuxuryColors.champagneGold,
              isDark: isDark,
              onTap: () => onCapture(CaptureMode.businessCard),
            ),
            const SizedBox(width: 8),
            _CaptureButton(
              icon: Iconsax.document_text,
              label: 'Document',
              color: LuxuryColors.rolexGreen,
              isDark: isDark,
              onTap: () => onCapture(CaptureMode.document),
            ),
            const SizedBox(width: 8),
            _CaptureButton(
              icon: Iconsax.edit_2,
              label: 'Handwritten',
              color: LuxuryColors.jadePremium,
              isDark: isDark,
              onTap: () => onCapture(CaptureMode.handwritten),
            ),
            const SizedBox(width: 8),
            _CaptureButton(
              icon: Iconsax.receipt_item,
              label: 'Receipt',
              color: LuxuryColors.roseGold,
              isDark: isDark,
              onTap: () => onCapture(CaptureMode.receipt),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 200.ms).slideY(begin: -0.1);
  }
}

// Compact Capture Button
class _CaptureButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _CaptureButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: isDark ? 0.15 : 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: color.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Source Selection Button
class _SourceButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  final VoidCallback onTap;

  const _SourceButton({
    required this.icon,
    required this.label,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 28, color: LuxuryColors.jadePremium),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Capture Result Sheet for showing extracted data
class _CaptureResultSheet extends ConsumerStatefulWidget {
  final SmartCaptureResult result;
  final CaptureMode mode;
  final bool isDark;
  final String? linkedEntityId;
  final String? linkedEntityType;
  final VoidCallback onCreated;
  final VoidCallback onDismiss;

  const _CaptureResultSheet({
    required this.result,
    required this.mode,
    required this.isDark,
    this.linkedEntityId,
    this.linkedEntityType,
    required this.onCreated,
    required this.onDismiss,
  });

  @override
  ConsumerState<_CaptureResultSheet> createState() => _CaptureResultSheetState();
}

class _CaptureResultSheetState extends ConsumerState<_CaptureResultSheet> {
  bool _isCreating = false;

  Future<void> _createEntity(CrmEntityType entityType) async {
    setState(() => _isCreating = true);
    HapticFeedback.lightImpact();

    try {
      final captureService = ref.read(smartCaptureServiceProvider);
      final createResult = await captureService.createEntityFromCapture(
        entityType: entityType,
        extractedData: widget.result.extractedData,
        linkedEntityId: widget.linkedEntityId,
        linkedEntityType: widget.linkedEntityType,
      );

      if (createResult.success && createResult.createdEntity != null) {
        HapticFeedback.mediumImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${createResult.createdEntity!.name} created successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
          widget.onCreated();
        }
      } else {
        throw Exception(createResult.error ?? 'Failed to create entity');
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() => _isCreating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.35,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: widget.isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: widget.isDark ? Colors.white24 : Colors.black26,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.tick_circle,
                        color: LuxuryColors.rolexGreen,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Data Extracted',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: widget.isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: widget.onDismiss,
                      icon: Icon(
                        Iconsax.close_circle,
                        color: widget.isDark ? Colors.white60 : Colors.black54,
                        size: 22,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              // Scrollable content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _buildExtractedDataCard(),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
              // Action buttons
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _buildActionButtons(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildExtractedDataCard() {
    final data = widget.result.extractedData;
    final entries = <Widget>[];

    if (widget.mode == CaptureMode.businessCard) {
      if (data['fullName'] != null || data['firstName'] != null) {
        entries.add(_buildDataRow('Name', data['fullName'] ?? '${data['firstName'] ?? ''} ${data['lastName'] ?? ''}'.trim(), Iconsax.user));
      }
      if (data['company'] != null) entries.add(_buildDataRow('Company', data['company'], Iconsax.building));
      if (data['jobTitle'] != null) entries.add(_buildDataRow('Title', data['jobTitle'], Iconsax.briefcase));
      if (data['email'] != null) entries.add(_buildDataRow('Email', data['email'], Iconsax.sms));
      if (data['phone'] != null) entries.add(_buildDataRow('Phone', data['phone'], Iconsax.call));
    } else if (widget.mode == CaptureMode.handwritten || widget.mode == CaptureMode.document) {
      if (data['text'] != null) {
        entries.add(_buildTextRow('Extracted Text', data['text']));
      }
    } else if (widget.mode == CaptureMode.receipt) {
      if (data['merchantName'] != null) entries.add(_buildDataRow('Merchant', data['merchantName'], Iconsax.shop));
      if (data['total'] != null) entries.add(_buildDataRow('Total', '\$${data['total']}', Iconsax.money));
      if (data['date'] != null) entries.add(_buildDataRow('Date', data['date'], Iconsax.calendar));
    }

    return LuxuryCard(
      variant: LuxuryCardVariant.bordered,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: entries.isEmpty
            ? [
                Center(
                  child: Text(
                    'No data extracted',
                    style: TextStyle(
                      color: widget.isDark ? Colors.white54 : Colors.black45,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ]
            : entries,
      ),
    );
  }

  Widget _buildDataRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: widget.isDark ? Colors.white54 : Colors.black45),
          const SizedBox(width: 10),
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: widget.isDark ? Colors.white54 : Colors.black45,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                color: widget.isDark ? Colors.white : Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Iconsax.document_text, size: 14, color: widget.isDark ? Colors.white54 : Colors.black45),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: widget.isDark ? Colors.white54 : Colors.black45,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          constraints: const BoxConstraints(maxHeight: 150),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: widget.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(8),
          ),
          child: SingleChildScrollView(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                color: widget.isDark ? Colors.white : Colors.black87,
                height: 1.4,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    if (_isCreating) {
      return Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
          ),
        ),
      );
    }

    if (widget.mode == CaptureMode.businessCard) {
      return Row(
        children: [
          Expanded(
            child: _ActionBtn(
              icon: Iconsax.user_add,
              label: 'Lead',
              color: LuxuryColors.champagneGold,
              isDark: widget.isDark,
              onTap: () => _createEntity(CrmEntityType.lead),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _ActionBtn(
              icon: Iconsax.profile_add,
              label: 'Contact',
              color: LuxuryColors.jadePremium,
              isDark: widget.isDark,
              onTap: () => _createEntity(CrmEntityType.contact),
            ),
          ),
        ],
      );
    } else if (widget.mode == CaptureMode.handwritten || widget.mode == CaptureMode.document) {
      return _ActionBtn(
        icon: Iconsax.note_add,
        label: 'Save as Note',
        color: LuxuryColors.jadePremium,
        isDark: widget.isDark,
        onTap: () => _createEntity(CrmEntityType.note),
        fullWidth: true,
      );
    } else if (widget.mode == CaptureMode.receipt) {
      return _ActionBtn(
        icon: Iconsax.building,
        label: 'Create Account',
        color: LuxuryColors.champagneGold,
        isDark: widget.isDark,
        onTap: () => _createEntity(CrmEntityType.account),
        fullWidth: true,
      );
    }
    return const SizedBox.shrink();
  }
}

// Action Button
class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;
  final bool fullWidth;

  const _ActionBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.isDark,
    required this.onTap,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Compact Notes DataTable Widget
class _NotesDataTable extends StatelessWidget {
  final List<CrmNote> notes;
  final bool isDark;
  final Function(CrmNote) onNoteTap;
  final Future<void> Function() onRefresh;

  const _NotesDataTable({
    required this.notes,
    required this.isDark,
    required this.onNoteTap,
    required this.onRefresh,
  });

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(date);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
      backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: LuxuryCard(
            variant: LuxuryCardVariant.standard,
            tier: LuxuryTier.gold,
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                // Table Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark
                        ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                        : LuxuryColors.rolexGreen.withValues(alpha: 0.08),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 28,
                        child: Icon(
                          Iconsax.note_1,
                          size: 14,
                          color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                        ),
                      ),
                      Expanded(
                        flex: isTablet ? 3 : 2,
                        child: Text(
                          'Title',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white70 : Colors.black54,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      if (isTablet)
                        Expanded(
                          flex: 2,
                          child: Text(
                            'Preview',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white70 : Colors.black54,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      SizedBox(
                        width: isTablet ? 80 : 60,
                        child: Text(
                          'Date',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white70 : Colors.black54,
                            letterSpacing: 0.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(width: 24), // Arrow space
                    ],
                  ),
                ),
                // Table Rows
                ...notes.asMap().entries.map((entry) {
                  final index = entry.key;
                  final note = entry.value;
                  final isLast = index == notes.length - 1;

                  return _NoteTableRow(
                    note: note,
                    isDark: isDark,
                    isTablet: isTablet,
                    isLast: isLast,
                    formattedDate: _formatDate(note.updatedAt),
                    onTap: () {
                      HapticFeedback.lightImpact();
                      onNoteTap(note);
                    },
                  ).animate(delay: Duration(milliseconds: 30 * index)).fadeIn(duration: 200.ms);
                }),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Single Table Row Widget
class _NoteTableRow extends StatelessWidget {
  final CrmNote note;
  final bool isDark;
  final bool isTablet;
  final bool isLast;
  final String formattedDate;
  final VoidCallback onTap;

  const _NoteTableRow({
    required this.note,
    required this.isDark,
    required this.isTablet,
    required this.isLast,
    required this.formattedDate,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            border: isLast
                ? null
                : Border(
                    bottom: BorderSide(
                      color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05),
                    ),
                  ),
          ),
          child: Row(
            children: [
              // Icon/Privacy indicator
              SizedBox(
                width: 28,
                child: note.isPrivate
                    ? Icon(
                        Iconsax.lock,
                        size: 14,
                        color: LuxuryColors.champagneGold,
                      )
                    : Icon(
                        Iconsax.document_text,
                        size: 14,
                        color: isDark ? Colors.white38 : Colors.black38,
                      ),
              ),
              // Title
              Expanded(
                flex: isTablet ? 3 : 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      note.title ?? 'Untitled Note',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (note.linkedEntityType != null && !isTablet)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          note.linkedEntityName,
                          style: TextStyle(
                            fontSize: 10,
                            color: LuxuryColors.jadePremium,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ),
              // Preview (tablet only)
              if (isTablet)
                Expanded(
                  flex: 2,
                  child: Text(
                    note.body,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white54 : Colors.black45,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              // Date
              SizedBox(
                width: isTablet ? 80 : 60,
                child: Text(
                  formattedDate,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : Colors.black45,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              // Arrow
              Icon(
                Iconsax.arrow_right_3,
                size: 16,
                color: isDark ? Colors.white24 : Colors.black26,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Table Shimmer for loading state
class _NotesTableShimmer extends StatelessWidget {
  const _NotesTableShimmer();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: LuxuryCard(
        variant: LuxuryCardVariant.standard,
        tier: LuxuryTier.gold,
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            // Header shimmer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isDark
                    ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                    : LuxuryColors.rolexGreen.withValues(alpha: 0.08),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(
                children: [
                  IrisShimmer(width: 28, height: 14, borderRadius: 4, tier: LuxuryTier.gold),
                  const SizedBox(width: 8),
                  const Expanded(child: IrisShimmer(width: 60, height: 12, borderRadius: 4, tier: LuxuryTier.gold)),
                  const SizedBox(width: 8),
                  const IrisShimmer(width: 50, height: 12, borderRadius: 4, tier: LuxuryTier.gold),
                ],
              ),
            ),
            // Row shimmers
            ...List.generate(6, (index) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              child: Row(
                children: [
                  const IrisShimmer(width: 28, height: 14, borderRadius: 4, tier: LuxuryTier.gold),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        IrisShimmer(width: 120 + (index * 10).toDouble(), height: 14, borderRadius: 4, tier: LuxuryTier.gold),
                        const SizedBox(height: 4),
                        const IrisShimmer(width: 60, height: 10, borderRadius: 4, tier: LuxuryTier.gold),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const IrisShimmer(width: 50, height: 12, borderRadius: 4, tier: LuxuryTier.gold),
                  const SizedBox(width: 8),
                  const IrisShimmer(width: 16, height: 16, borderRadius: 4, tier: LuxuryTier.gold),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }
}

// Create Note Sheet
class _CreateNoteSheet extends ConsumerStatefulWidget {
  final String? linkedEntityId;
  final String? linkedEntityType;
  final VoidCallback onCreated;

  const _CreateNoteSheet({
    this.linkedEntityId,
    this.linkedEntityType,
    required this.onCreated,
  });

  @override
  ConsumerState<_CreateNoteSheet> createState() => _CreateNoteSheetState();
}

class _CreateNoteSheetState extends ConsumerState<_CreateNoteSheet> {
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  bool _isPrivate = false;
  bool _isSaving = false;
  bool _useSmartDetection = true; // Enable AI entity detection by default
  SelectedEntity? _selectedEntity; // Manual entity selection
  bool _isVoiceMode = false; // Toggle between text and voice input
  bool _autoProcessWithAI = false; // Process with AI after saving

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  void _toggleVoiceMode() {
    HapticFeedback.lightImpact();
    setState(() => _isVoiceMode = !_isVoiceMode);
  }

  void _onVoiceTranscriptionComplete(String transcription) {
    // Append transcription to the body
    if (_bodyController.text.isNotEmpty && transcription.isNotEmpty) {
      _bodyController.text = '${_bodyController.text} $transcription';
    } else if (transcription.isNotEmpty) {
      _bodyController.text = transcription;
    }
    // Switch back to text mode after recording
    setState(() => _isVoiceMode = false);
  }

  NoteActionType _parseActionType(String type) {
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

  Future<void> _processNoteWithAI(String noteId, SmartNotesService notesService) async {
    if (!mounted) return;

    try {
      // Process the note with AI
      final result = await notesService.processNoteWithAI(noteId);

      if (!mounted) return;

      if (result != null && result.pendingActions.isNotEmpty) {
        // Close create sheet first
        Navigator.of(context).pop();

        // Convert service PendingAction to widget PendingNoteAction
        final widgetActions = result.pendingActions.map((action) {
          return PendingNoteAction(
            id: action.id,
            actionType: _parseActionType(action.actionType),
            targetEntity: action.targetEntity,
            targetEntityId: action.targetEntityId,
            fieldName: action.fieldName,
            proposedValue: action.proposedValue,
            confidence: action.confidence,
            reasoning: action.reasoning,
            sourceText: action.sourceText,
          );
        }).toList();

        // Show the actions review sheet
        await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (ctx) => NoteActionsReviewSheet(
            actions: widgetActions,
            noteTitle: result.extractedData?.summary,
            onSubmit: (approvedIds, rejectedIds) async {
              // Process approved actions first
              if (approvedIds.isNotEmpty) {
                try {
                  await notesService.bulkProcessActions(approvedIds, true);
                } catch (e) {
                  debugPrint('Error approving actions: $e');
                }
              }
              // Then process rejected actions
              if (rejectedIds.isNotEmpty) {
                try {
                  await notesService.bulkProcessActions(rejectedIds, false);
                } catch (e) {
                  debugPrint('Error rejecting actions: $e');
                }
              }
              if (ctx.mounted) Navigator.of(ctx).pop();
              widget.onCreated();
            },
            onCancel: () {
              Navigator.of(ctx).pop();
              widget.onCreated();
            },
          ),
        );
      } else {
        // No actions found - just show success
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Iconsax.tick_circle, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Note analyzed. No actions detected.',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            backgroundColor: LuxuryColors.rolexGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onCreated();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI processing failed: $e'),
            backgroundColor: Colors.orange.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
        // Still count as success (note was created)
        widget.onCreated();
      }
    }
  }

  void _openEntityPicker() async {
    HapticFeedback.lightImpact();
    final entity = await showEntityPicker(
      context,
      initialEntity: _selectedEntity,
      title: 'Link Note to Record',
    );
    if (entity != null && mounted) {
      setState(() {
        _selectedEntity = entity;
        // Disable AI detection when manually selecting
        _useSmartDetection = false;
      });
    }
  }

  void _clearSelectedEntity() {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedEntity = null;
      _useSmartDetection = true; // Re-enable AI detection
    });
  }

  Color _getEntityColor(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return LuxuryColors.rolexGreen;
      case EntityType.account:
        return LuxuryColors.champagneGold;
      case EntityType.contact:
        return Colors.blue;
      case EntityType.opportunity:
        return Colors.purple;
    }
  }

  IconData _getEntityIcon(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return Iconsax.profile_2user;
      case EntityType.account:
        return Iconsax.building;
      case EntityType.contact:
        return Iconsax.user;
      case EntityType.opportunity:
        return Iconsax.money_4;
    }
  }

  String _getEntityLabel(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return 'Lead';
      case EntityType.account:
        return 'Account';
      case EntityType.contact:
        return 'Contact';
      case EntityType.opportunity:
        return 'Opportunity';
    }
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

      // Determine entity linking - priority: manually selected > passed in > AI detection
      String? leadId, accountId, contactId, opportunityId;
      String? sfLeadId, sfAccountId, sfContactId, sfOpportunityId;

      if (_selectedEntity != null) {
        // Manual selection - use the correct ID field based on Salesforce detection
        if (_selectedEntity!.isSalesforceId) {
          switch (_selectedEntity!.type) {
            case EntityType.lead:
              sfLeadId = _selectedEntity!.id;
              break;
            case EntityType.account:
              sfAccountId = _selectedEntity!.id;
              break;
            case EntityType.contact:
              sfContactId = _selectedEntity!.id;
              break;
            case EntityType.opportunity:
              sfOpportunityId = _selectedEntity!.id;
              break;
          }
        } else {
          switch (_selectedEntity!.type) {
            case EntityType.lead:
              leadId = _selectedEntity!.id;
              break;
            case EntityType.account:
              accountId = _selectedEntity!.id;
              break;
            case EntityType.contact:
              contactId = _selectedEntity!.id;
              break;
            case EntityType.opportunity:
              opportunityId = _selectedEntity!.id;
              break;
          }
        }
      } else if (widget.linkedEntityId != null) {
        // Entity passed in from parent (e.g., viewing notes for a lead)
        leadId = widget.linkedEntityType == 'lead' ? widget.linkedEntityId : null;
        accountId = widget.linkedEntityType == 'account' ? widget.linkedEntityId : null;
        contactId = widget.linkedEntityType == 'contact' ? widget.linkedEntityId : null;
        opportunityId = widget.linkedEntityType == 'opportunity' ? widget.linkedEntityId : null;
      }

      // If already linked to an entity or smart detection disabled, use regular createNote
      if (_selectedEntity != null || widget.linkedEntityId != null || !_useSmartDetection) {
        final note = await notesService.createNote(
          title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
          body: _bodyController.text.trim(),
          isPrivate: _isPrivate,
          leadId: leadId,
          accountId: accountId,
          contactId: contactId,
          opportunityId: opportunityId,
          sfLeadId: sfLeadId,
          sfAccountId: sfAccountId,
          sfContactId: sfContactId,
          sfOpportunityId: sfOpportunityId,
        );

        if (note != null) {
          HapticFeedback.mediumImpact();

          // Process with AI if enabled
          if (_autoProcessWithAI) {
            await _processNoteWithAI(note.id, notesService);
          } else {
            widget.onCreated();
          }
        } else {
          throw Exception('Failed to create note');
        }
      } else {
        // Use smart note creation with AI entity detection
        final result = await notesService.createSmartNote(
          title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
          body: _bodyController.text.trim(),
          isPrivate: _isPrivate,
        );

        if (result.note != null) {
          HapticFeedback.mediumImpact();

          // Show feedback about auto-linking
          if (mounted) {
            if (result.autoLinked && result.linkedEntityType != null) {
              // Find the entity name from detected entities
              final linkedEntity = result.detectedEntities.firstWhere(
                (e) => e.entityId == result.linkedEntityId,
                orElse: () => DetectedEntity(
                  entityId: result.linkedEntityId ?? '',
                  entityType: result.linkedEntityType ?? '',
                  entityName: 'Unknown',
                  confidence: 0,
                ),
              );

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      Icon(Iconsax.magic_star, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Smart linked to ${linkedEntity.entityName} (${result.linkedEntityType})',
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                  backgroundColor: LuxuryColors.rolexGreen,
                  behavior: SnackBarBehavior.floating,
                  duration: const Duration(seconds: 3),
                ),
              );
            } else if (result.detectedEntities.isNotEmpty) {
              // Found entities but didn't auto-link (low confidence)
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      Icon(Iconsax.info_circle, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Note created. ${result.detectedEntities.length} possible match${result.detectedEntities.length > 1 ? "es" : ""} found - tap to link manually.',
                        ),
                      ),
                    ],
                  ),
                  backgroundColor: LuxuryColors.champagneGold.withValues(alpha: 0.9),
                  behavior: SnackBarBehavior.floating,
                  duration: const Duration(seconds: 4),
                ),
              );
            }
          }

          // Process with AI if enabled
          if (_autoProcessWithAI) {
            await _processNoteWithAI(result.note!.id, notesService);
          } else {
            widget.onCreated();
          }
        } else {
          throw Exception('Failed to create note');
        }
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
      child: Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
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
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Iconsax.note_add,
                      color: LuxuryColors.jadePremium,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Create Note',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const Spacer(),
                  // Voice/Text mode toggle
                  GestureDetector(
                    onTap: _toggleVoiceMode,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _isVoiceMode
                            ? Colors.red.withValues(alpha: 0.15)
                            : LuxuryColors.jadePremium.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _isVoiceMode
                              ? Colors.red.withValues(alpha: 0.3)
                              : LuxuryColors.jadePremium.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isVoiceMode ? Iconsax.document_text : Iconsax.microphone,
                            size: 16,
                            color: _isVoiceMode ? Colors.red : LuxuryColors.jadePremium,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _isVoiceMode ? 'Text' : 'Voice',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _isVoiceMode ? Colors.red : LuxuryColors.jadePremium,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Title field
            IrisTextField(
              controller: _titleController,
              hint: 'Note title (optional)',
              prefixIcon: Iconsax.text,
            ),
            const SizedBox(height: 16),

            // Body field or Voice Recorder
            if (_isVoiceMode) ...[
              VoiceNoteRecorder(
                onTranscriptionComplete: _onVoiceTranscriptionComplete,
                initialText: _bodyController.text,
                showPreview: true,
              ),
            ] else ...[
              IrisTextField(
                controller: _bodyController,
                hint: 'Write your note here...',
                maxLines: 6,
                prefixIcon: Iconsax.document_text,
                suffixIcon: Iconsax.microphone,
                onSuffixTap: _toggleVoiceMode,
              ),
            ],
            const SizedBox(height: 16),

            // Manual Entity Linking section (only show when not already linked)
            if (widget.linkedEntityId == null) ...[
              LuxuryCard(
                variant: LuxuryCardVariant.bordered,
                tier: LuxuryTier.gold,
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Iconsax.link_2,
                          size: 16,
                          color: LuxuryColors.champagneGold,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Link to Record',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        const Spacer(),
                        if (_selectedEntity == null)
                          GestureDetector(
                            onTap: _openEntityPicker,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Iconsax.add,
                                    size: 14,
                                    color: LuxuryColors.champagneGold,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Select',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: LuxuryColors.champagneGold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (_selectedEntity != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.05)
                              : Colors.black.withValues(alpha: 0.03),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: _getEntityColor(_selectedEntity!.type).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Icon(
                                  _getEntityIcon(_selectedEntity!.type),
                                  size: 18,
                                  color: _getEntityColor(_selectedEntity!.type),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _selectedEntity!.name,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? Colors.white : Colors.black87,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Row(
                                    children: [
                                      Text(
                                        _getEntityLabel(_selectedEntity!.type),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: _getEntityColor(_selectedEntity!.type),
                                        ),
                                      ),
                                      if (_selectedEntity!.subtitle != null) ...[
                                        Text(
                                          ' • ',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? Colors.white38 : Colors.black26,
                                          ),
                                        ),
                                        Flexible(
                                          child: Text(
                                            _selectedEntity!.subtitle!,
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: isDark ? Colors.white54 : Colors.black45,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            GestureDetector(
                              onTap: _openEntityPicker,
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                child: Icon(
                                  Iconsax.edit_2,
                                  size: 16,
                                  color: isDark ? Colors.white54 : Colors.black38,
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: _clearSelectedEntity,
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                child: Icon(
                                  Iconsax.close_circle,
                                  size: 16,
                                  color: Colors.red.shade400,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Smart Detection & Privacy toggles
            LuxuryCard(
              variant: LuxuryCardVariant.bordered,
              tier: LuxuryTier.gold,
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  // Smart AI Detection toggle (only show when not already linked)
                  if (widget.linkedEntityId == null) ...[
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: _useSmartDetection
                                ? LuxuryColors.jadePremium.withValues(alpha: 0.15)
                                : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Iconsax.magic_star,
                            size: 16,
                            color: _useSmartDetection
                                ? LuxuryColors.jadePremium
                                : (isDark ? Colors.white38 : Colors.black26),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Smart Entity Detection',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                              Text(
                                'AI auto-links to CRM records',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? Colors.white54 : Colors.black45,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: _useSmartDetection,
                          onChanged: (value) => setState(() => _useSmartDetection = value),
                          activeTrackColor: LuxuryColors.jadePremium,
                        ),
                      ],
                    ),
                    Divider(
                      height: 20,
                      color: isDark ? Colors.white12 : Colors.black12,
                    ),
                  ],
                  // Private toggle
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: _isPrivate
                              ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
                              : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          _isPrivate ? Iconsax.lock : Iconsax.unlock,
                          size: 16,
                          color: _isPrivate
                              ? LuxuryColors.champagneGold
                              : (isDark ? Colors.white38 : Colors.black26),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isPrivate ? 'Private Note' : 'Public Note',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                            Text(
                              _isPrivate ? 'Only you can see this' : 'Visible to team members',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.white54 : Colors.black45,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _isPrivate,
                        onChanged: (value) => setState(() => _isPrivate = value),
                        activeTrackColor: LuxuryColors.champagneGold,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI Processing toggle
            LuxuryCard(
              variant: LuxuryCardVariant.bordered,
              tier: LuxuryTier.gold,
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Iconsax.magic_star,
                      size: 18,
                      color: LuxuryColors.jadePremium,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Smart Process',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        Text(
                          'Extract actions & CRM updates with AI',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? Colors.white54 : Colors.black45,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _autoProcessWithAI,
                    onChanged: (value) => setState(() => _autoProcessWithAI = value),
                    activeTrackColor: LuxuryColors.jadePremium,
                  ),
                ],
              ),
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
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_autoProcessWithAI)
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: Icon(Iconsax.magic_star, size: 18),
                            ),
                          Text(
                            _autoProcessWithAI ? 'Save & Analyze' : 'Save Note',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            ],
          ),
        ),
      ),
    );
  }
}

// Note Detail Sheet
class _NoteDetailSheet extends ConsumerStatefulWidget {
  final CrmNote note;
  final VoidCallback onUpdated;
  final VoidCallback onDeleted;

  const _NoteDetailSheet({
    required this.note,
    required this.onUpdated,
    required this.onDeleted,
  });

  @override
  ConsumerState<_NoteDetailSheet> createState() => _NoteDetailSheetState();
}

class _NoteDetailSheetState extends ConsumerState<_NoteDetailSheet> {
  late TextEditingController _titleController;
  late TextEditingController _bodyController;
  late bool _isPrivate;
  bool _isEditing = false;
  bool _isSaving = false;
  bool _isProcessingAI = false;
  SelectedEntity? _linkedEntity; // Current linked entity
  bool _entityChanged = false; // Track if entity link was changed
  bool _entityRemoved = false; // Track if entity link was removed

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.note.title ?? '');
    _bodyController = TextEditingController(text: widget.note.body);
    _isPrivate = widget.note.isPrivate;

    // Initialize linked entity from note
    _initLinkedEntity();
  }

  NoteActionType _parseActionType(String type) {
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

  Future<void> _analyzeWithAI() async {
    HapticFeedback.lightImpact();
    setState(() => _isProcessingAI = true);

    try {
      final notesService = ref.read(smartNotesServiceProvider);
      final result = await notesService.processNoteWithAI(widget.note.id);

      if (!mounted) return;

      setState(() => _isProcessingAI = false);

      if (result != null && result.pendingActions.isNotEmpty) {
        // Close current sheet
        Navigator.of(context).pop();

        // Convert service PendingAction to widget PendingNoteAction
        final widgetActions = result.pendingActions.map((action) {
          return PendingNoteAction(
            id: action.id,
            actionType: _parseActionType(action.actionType),
            targetEntity: action.targetEntity,
            targetEntityId: action.targetEntityId,
            fieldName: action.fieldName,
            proposedValue: action.proposedValue,
            confidence: action.confidence,
            reasoning: action.reasoning,
            sourceText: action.sourceText,
          );
        }).toList();

        final notesService = ref.read(smartNotesServiceProvider);

        // Show the actions review sheet
        await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (ctx) => NoteActionsReviewSheet(
            actions: widgetActions,
            noteTitle: result.extractedData?.summary,
            onSubmit: (approvedIds, rejectedIds) async {
              // Process approved actions first
              if (approvedIds.isNotEmpty) {
                try {
                  await notesService.bulkProcessActions(approvedIds, true);
                } catch (e) {
                  debugPrint('Error approving actions: $e');
                }
              }
              // Then process rejected actions
              if (rejectedIds.isNotEmpty) {
                try {
                  await notesService.bulkProcessActions(rejectedIds, false);
                } catch (e) {
                  debugPrint('Error rejecting actions: $e');
                }
              }
              if (ctx.mounted) Navigator.of(ctx).pop();
              widget.onUpdated();
            },
            onCancel: () {
              Navigator.of(ctx).pop();
            },
          ),
        );
      } else {
        // No actions found
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Iconsax.info_circle, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'No actions or CRM updates detected in this note.',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            backgroundColor: LuxuryColors.champagneGold,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessingAI = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI analysis failed: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _initLinkedEntity() {
    final note = widget.note;
    if (note.linkedEntity != null) {
      final entity = note.linkedEntity!;
      _linkedEntity = SelectedEntity(
        id: entity.id,
        name: entity.displayName,
        type: _getEntityTypeFromString(entity.type),
        isSalesforceId: entity.salesforceId != null,
        subtitle: entity.company ?? entity.stage,
      );
    }
  }

  EntityType _getEntityTypeFromString(String type) {
    switch (type.toLowerCase()) {
      case 'lead':
        return EntityType.lead;
      case 'account':
        return EntityType.account;
      case 'contact':
        return EntityType.contact;
      case 'opportunity':
        return EntityType.opportunity;
      default:
        return EntityType.lead;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  void _openEntityPicker() async {
    HapticFeedback.lightImpact();
    final entity = await showEntityPicker(
      context,
      initialEntity: _linkedEntity,
      title: 'Link Note to Record',
    );
    if (entity != null && mounted) {
      setState(() {
        _linkedEntity = entity;
        _entityChanged = true;
        _entityRemoved = false;
      });
    }
  }

  void _removeEntityLink() {
    HapticFeedback.lightImpact();
    setState(() {
      _linkedEntity = null;
      _entityChanged = true;
      _entityRemoved = true;
    });
  }

  Color _getEntityColor(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return LuxuryColors.rolexGreen;
      case EntityType.account:
        return LuxuryColors.champagneGold;
      case EntityType.contact:
        return Colors.blue;
      case EntityType.opportunity:
        return Colors.purple;
    }
  }

  IconData _getEntityIcon(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return Iconsax.profile_2user;
      case EntityType.account:
        return Iconsax.building;
      case EntityType.contact:
        return Iconsax.user;
      case EntityType.opportunity:
        return Iconsax.money_4;
    }
  }

  String _getEntityLabel(EntityType type) {
    switch (type) {
      case EntityType.lead:
        return 'Lead';
      case EntityType.account:
        return 'Account';
      case EntityType.contact:
        return 'Contact';
      case EntityType.opportunity:
        return 'Opportunity';
    }
  }

  Future<void> _saveChanges() async {
    setState(() => _isSaving = true);
    HapticFeedback.lightImpact();

    try {
      final notesService = ref.read(smartNotesServiceProvider);

      // Build entity ID parameters based on changes
      String? leadId, accountId, contactId, opportunityId;
      String? sfLeadId, sfAccountId, sfContactId, sfOpportunityId;

      if (_entityChanged) {
        if (_entityRemoved) {
          // Set all to null to remove links (handled by passing null explicitly)
          // The API should set fields to null when explicitly passed
        } else if (_linkedEntity != null) {
          // Set the new entity link
          if (_linkedEntity!.isSalesforceId) {
            switch (_linkedEntity!.type) {
              case EntityType.lead:
                sfLeadId = _linkedEntity!.id;
                break;
              case EntityType.account:
                sfAccountId = _linkedEntity!.id;
                break;
              case EntityType.contact:
                sfContactId = _linkedEntity!.id;
                break;
              case EntityType.opportunity:
                sfOpportunityId = _linkedEntity!.id;
                break;
            }
          } else {
            switch (_linkedEntity!.type) {
              case EntityType.lead:
                leadId = _linkedEntity!.id;
                break;
              case EntityType.account:
                accountId = _linkedEntity!.id;
                break;
              case EntityType.contact:
                contactId = _linkedEntity!.id;
                break;
              case EntityType.opportunity:
                opportunityId = _linkedEntity!.id;
                break;
            }
          }
        }
      }

      final updated = await notesService.updateNote(
        widget.note.id,
        title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
        body: _bodyController.text.trim(),
        isPrivate: _isPrivate,
        leadId: _entityChanged ? leadId : null,
        accountId: _entityChanged ? accountId : null,
        contactId: _entityChanged ? contactId : null,
        opportunityId: _entityChanged ? opportunityId : null,
        sfLeadId: _entityChanged ? sfLeadId : null,
        sfAccountId: _entityChanged ? sfAccountId : null,
        sfContactId: _entityChanged ? sfContactId : null,
        sfOpportunityId: _entityChanged ? sfOpportunityId : null,
        clearEntityLinks: _entityRemoved,
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
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Fixed header
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Handle
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 24),

                // Header with actions
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _isEditing ? 'Edit Note' : 'Note Details',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                    ),
                    if (!_isEditing) ...[
                      // AI Analyze button
                      _isProcessingAI
                          ? Padding(
                              padding: const EdgeInsets.all(12),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                                ),
                              ),
                            )
                          : IconButton(
                              icon: Icon(Iconsax.magic_star, color: LuxuryColors.jadePremium),
                              onPressed: _analyzeWithAI,
                              tooltip: 'Analyze with AI',
                            ),
                      IconButton(
                        icon: Icon(Iconsax.edit, color: LuxuryColors.champagneGold),
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
              ],
            ),
          ),

          // Scrollable content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_isEditing) ...[
                    // Edit mode
                    IrisTextField(
                      controller: _titleController,
                      hint: 'Note title (optional)',
                      prefixIcon: Iconsax.text,
                    ),
                    const SizedBox(height: 16),
                    IrisTextField(
                      controller: _bodyController,
                      hint: 'Write your note here...',
                      maxLines: 8,
                      prefixIcon: Iconsax.document_text,
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
                          style: TextStyle(
                            color: isDark ? Colors.white70 : Colors.black54,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Entity Link Editing
                    LuxuryCard(
                      variant: LuxuryCardVariant.bordered,
                      tier: LuxuryTier.gold,
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Iconsax.link_2,
                                size: 16,
                                color: LuxuryColors.champagneGold,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Linked Record',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                              const Spacer(),
                              if (_linkedEntity == null)
                                GestureDetector(
                                  onTap: _openEntityPicker,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Iconsax.add,
                                          size: 14,
                                          color: LuxuryColors.champagneGold,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Link',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: LuxuryColors.champagneGold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          if (_linkedEntity != null) ...[
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.05)
                                    : Colors.black.withValues(alpha: 0.03),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: _getEntityColor(_linkedEntity!.type).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Center(
                                      child: Icon(
                                        _getEntityIcon(_linkedEntity!.type),
                                        size: 18,
                                        color: _getEntityColor(_linkedEntity!.type),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _linkedEntity!.name,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: isDark ? Colors.white : Colors.black87,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          _getEntityLabel(_linkedEntity!.type),
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: _getEntityColor(_linkedEntity!.type),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: _openEntityPicker,
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      child: Icon(
                                        Iconsax.edit_2,
                                        size: 16,
                                        color: isDark ? Colors.white54 : Colors.black38,
                                      ),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: _removeEntityLink,
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      child: Icon(
                                        Iconsax.close_circle,
                                        size: 16,
                                        color: Colors.red.shade400,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ] else ...[
                            const SizedBox(height: 8),
                            Text(
                              'No linked record',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? Colors.white38 : Colors.black26,
                              ),
                            ),
                          ],
                        ],
                      ),
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
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    Text(
                      widget.note.body,
                      style: TextStyle(
                        fontSize: 16,
                        height: 1.6,
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Metadata
                    LuxuryCard(
                      variant: LuxuryCardVariant.bordered,
                      tier: LuxuryTier.gold,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _MetadataRow(
                            icon: Iconsax.calendar,
                            label: 'Created',
                            value: dateFormat.format(widget.note.createdAt),
                            isDark: isDark,
                          ),
                          const SizedBox(height: 8),
                          _MetadataRow(
                            icon: Iconsax.edit,
                            label: 'Updated',
                            value: dateFormat.format(widget.note.updatedAt),
                            isDark: isDark,
                          ),
                          if (widget.note.linkedEntityType != null) ...[
                            const SizedBox(height: 8),
                            _MetadataRow(
                              icon: Iconsax.link,
                              label: 'Linked to',
                              value: widget.note.linkedEntityName,
                              isDark: isDark,
                            ),
                          ],
                          if (widget.note.isPrivate) ...[
                            const SizedBox(height: 8),
                            _MetadataRow(
                              icon: Iconsax.lock,
                              label: 'Visibility',
                              value: 'Private',
                              isDark: isDark,
                              valueColor: LuxuryColors.champagneGold,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Metadata Row Widget
class _MetadataRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;
  final Color? valueColor;

  const _MetadataRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: isDark ? Colors.white38 : Colors.black38,
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? Colors.white38 : Colors.black38,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            color: valueColor ?? (isDark ? Colors.white70 : Colors.black54),
          ),
        ),
      ],
    );
  }
}

// Capture Processing Sheet
class _CaptureProcessingSheet extends ConsumerStatefulWidget {
  final File imageFile;
  final String? linkedEntityId;
  final String? linkedEntityType;
  final VoidCallback onCreated;
  final VoidCallback onCancel;

  // Parameters linkedEntityId and linkedEntityType are used in _CaptureProcessingSheetState
  // for linking notes to CRM entities when creating notes from captured images.
  const _CaptureProcessingSheet({
    required this.imageFile,
    this.linkedEntityId, // ignore: unused_element_parameter
    this.linkedEntityType, // ignore: unused_element_parameter
    required this.onCreated,
    required this.onCancel,
  });

  @override
  ConsumerState<_CaptureProcessingSheet> createState() => _CaptureProcessingSheetState();
}

class _CaptureProcessingSheetState extends ConsumerState<_CaptureProcessingSheet> {
  String? _extractedText;
  bool _isProcessing = true;
  String? _error;

  final _titleController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _processImage();
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _processImage() async {
    try {
      final notesService = ref.read(smartNotesServiceProvider);
      final text = await notesService.transcribeImage(widget.imageFile);

      if (mounted) {
        setState(() {
          _extractedText = text;
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _saveAsNote() async {
    if (_extractedText == null || _extractedText!.isEmpty) return;

    setState(() => _isProcessing = true);
    HapticFeedback.lightImpact();

    try {
      final notesService = ref.read(smartNotesServiceProvider);
      final note = await notesService.createNote(
        title: _titleController.text.trim().isEmpty
            ? 'Handwritten Note - ${DateFormat('MMM d, yyyy').format(DateTime.now())}'
            : _titleController.text.trim(),
        body: _extractedText!,
        leadId: widget.linkedEntityType == 'lead' ? widget.linkedEntityId : null,
        accountId: widget.linkedEntityType == 'account' ? widget.linkedEntityId : null,
        contactId: widget.linkedEntityType == 'contact' ? widget.linkedEntityId : null,
        opportunityId: widget.linkedEntityType == 'opportunity' ? widget.linkedEntityId : null,
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
            content: Text('Failed to save note: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() => _isProcessing = false);
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
      child: Padding(
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
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    _isProcessing ? Iconsax.scan : (_error != null ? Iconsax.warning_2 : Iconsax.tick_circle),
                    color: _error != null ? Colors.red : LuxuryColors.jadePremium,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  _isProcessing
                      ? 'Processing...'
                      : (_error != null ? 'Processing Failed' : 'Text Extracted'),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            if (_isProcessing) ...[
              Center(
                child: Column(
                  children: [
                    SizedBox(
                      width: 60,
                      height: 60,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Extracting text from image...',
                      style: TextStyle(
                        color: isDark ? Colors.white60 : Colors.black54,
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (_error != null) ...[
              Text(
                _error!,
                style: TextStyle(
                  color: Colors.red.shade400,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: widget.onCancel,
                  child: const Text('Close'),
                ),
              ),
            ] else if (_extractedText != null) ...[
              IrisTextField(
                controller: _titleController,
                hint: 'Note title (optional)',
                prefixIcon: Iconsax.text,
              ),
              const SizedBox(height: 16),
              Text(
                'Extracted Text:',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white70 : Colors.black54,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 200),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? Colors.white12 : Colors.black12,
                  ),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    _extractedText!,
                    style: TextStyle(
                      color: isDark ? Colors.white : Colors.black87,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: widget.onCancel,
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _saveAsNote,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: LuxuryColors.rolexGreen,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Save as Note',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
