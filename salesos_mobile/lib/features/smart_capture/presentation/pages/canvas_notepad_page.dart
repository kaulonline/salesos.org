import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/services/canvas_notepad_service.dart';
import '../../../../shared/widgets/drawing_canvas.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// State provider for current canvas note being edited
final currentCanvasNoteProvider = StateProvider<CanvasNote?>((ref) => null);

/// State provider for current stroke being drawn
final currentStrokeProvider = StateProvider<CanvasStroke?>((ref) => null);

/// State provider for current page index
final currentPageIndexProvider = StateProvider<int>((ref) => 0);

/// State provider for undo stack
final undoStackProvider = StateProvider<List<List<CanvasStroke>>>((ref) => []);

/// State provider for redo stack
final redoStackProvider = StateProvider<List<List<CanvasStroke>>>((ref) => []);

class CanvasNotepadPage extends ConsumerStatefulWidget {
  final String? noteId;
  final String? linkedEntityId;
  final String? linkedEntityType;
  final String? linkedEntityName;

  const CanvasNotepadPage({
    super.key,
    this.noteId,
    this.linkedEntityId,
    this.linkedEntityType,
    this.linkedEntityName,
  });

  @override
  ConsumerState<CanvasNotepadPage> createState() => _CanvasNotepadPageState();
}

class _CanvasNotepadPageState extends ConsumerState<CanvasNotepadPage> {
  Timer? _autoSaveTimer;
  bool _hasUnsavedChanges = false;
  bool _isProcessing = false;
  bool _showToolbar = true;
  final TextEditingController _titleController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initializeNote();
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();
    _titleController.dispose();
    // Save on exit if there are unsaved changes
    if (_hasUnsavedChanges) {
      _saveNote();
    }
    super.dispose();
  }

  Future<void> _initializeNote() async {
    final service = ref.read(canvasNotepadServiceProvider);
    await service.init();

    CanvasNote note;
    if (widget.noteId != null) {
      // Load existing note
      final existing = await service.getNote(widget.noteId!);
      note = existing ?? _createNewNote();
    } else {
      // Create new note
      note = _createNewNote();
    }

    ref.read(currentCanvasNoteProvider.notifier).state = note;
    ref.read(currentPageIndexProvider.notifier).state = 0;
    _titleController.text = note.title ?? '';

    // Start auto-save timer
    _startAutoSave();
  }

  CanvasNote _createNewNote() {
    return CanvasNote(
      linkedEntityId: widget.linkedEntityId,
      linkedEntityType: widget.linkedEntityType,
      linkedEntityName: widget.linkedEntityName,
    );
  }

  void _startAutoSave() {
    _autoSaveTimer?.cancel();
    _autoSaveTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_hasUnsavedChanges) {
        _saveNote();
      }
    });
  }

  Future<void> _saveNote() async {
    final note = ref.read(currentCanvasNoteProvider);
    if (note == null) return;

    final service = ref.read(canvasNotepadServiceProvider);
    final updatedNote = note.copyWith(
      title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
    );

    await service.saveNote(updatedNote);
    ref.read(currentCanvasNoteProvider.notifier).state = updatedNote;
    _hasUnsavedChanges = false;

    if (mounted) {
      // Brief save indicator
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Iconsax.tick_circle, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              const Text('Saved'),
            ],
          ),
          duration: const Duration(milliseconds: 800),
          behavior: SnackBarBehavior.floating,
          backgroundColor: LuxuryColors.rolexGreen,
          margin: const EdgeInsets.only(bottom: 80, left: 20, right: 20),
        ),
      );
    }
  }

  void _onStrokeStart(StrokePoint point) {
    final toolSettings = ref.read(canvasToolSettingsProvider);
    final stroke = CanvasStroke(
      points: [point],
      color: toolSettings.effectiveColor,
      strokeWidth: toolSettings.effectiveStrokeWidth,
      isEraser: toolSettings.isEraser,
    );
    ref.read(currentStrokeProvider.notifier).state = stroke;
  }

  void _onStrokeUpdate(StrokePoint point) {
    final currentStroke = ref.read(currentStrokeProvider);
    if (currentStroke == null) return;

    final updatedStroke = currentStroke.copyWith(
      points: [...currentStroke.points, point],
    );
    ref.read(currentStrokeProvider.notifier).state = updatedStroke;
  }

  void _onStrokeEnd() {
    final currentStroke = ref.read(currentStrokeProvider);
    if (currentStroke == null || currentStroke.points.length < 2) {
      ref.read(currentStrokeProvider.notifier).state = null;
      return;
    }

    // Save undo state
    final note = ref.read(currentCanvasNoteProvider);
    final pageIndex = ref.read(currentPageIndexProvider);
    if (note != null && pageIndex < note.pages.length) {
      final currentStrokes = note.pages[pageIndex].strokes;
      final undoStack = ref.read(undoStackProvider);
      ref.read(undoStackProvider.notifier).state = [...undoStack, List.from(currentStrokes)];
      ref.read(redoStackProvider.notifier).state = []; // Clear redo on new action
    }

    // Add stroke to current page
    _addStrokeToCurrentPage(currentStroke);
    ref.read(currentStrokeProvider.notifier).state = null;
    _hasUnsavedChanges = true;
  }

  void _addStrokeToCurrentPage(CanvasStroke stroke) {
    final note = ref.read(currentCanvasNoteProvider);
    final pageIndex = ref.read(currentPageIndexProvider);

    if (note == null || pageIndex >= note.pages.length) return;

    final currentPage = note.pages[pageIndex];
    final updatedPage = currentPage.copyWith(
      strokes: [...currentPage.strokes, stroke],
    );

    final updatedPages = List<CanvasPage>.from(note.pages);
    updatedPages[pageIndex] = updatedPage;

    ref.read(currentCanvasNoteProvider.notifier).state = note.copyWith(pages: updatedPages);
  }

  void _undo() {
    final undoStack = ref.read(undoStackProvider);
    if (undoStack.isEmpty) return;

    final note = ref.read(currentCanvasNoteProvider);
    final pageIndex = ref.read(currentPageIndexProvider);
    if (note == null || pageIndex >= note.pages.length) return;

    // Save current state to redo stack
    final currentStrokes = note.pages[pageIndex].strokes;
    final redoStack = ref.read(redoStackProvider);
    ref.read(redoStackProvider.notifier).state = [...redoStack, List.from(currentStrokes)];

    // Restore previous state
    final previousStrokes = undoStack.last;
    ref.read(undoStackProvider.notifier).state = undoStack.sublist(0, undoStack.length - 1);

    final updatedPage = note.pages[pageIndex].copyWith(strokes: previousStrokes);
    final updatedPages = List<CanvasPage>.from(note.pages);
    updatedPages[pageIndex] = updatedPage;

    ref.read(currentCanvasNoteProvider.notifier).state = note.copyWith(pages: updatedPages);
    _hasUnsavedChanges = true;
    HapticFeedback.lightImpact();
  }

  void _redo() {
    final redoStack = ref.read(redoStackProvider);
    if (redoStack.isEmpty) return;

    final note = ref.read(currentCanvasNoteProvider);
    final pageIndex = ref.read(currentPageIndexProvider);
    if (note == null || pageIndex >= note.pages.length) return;

    // Save current state to undo stack
    final currentStrokes = note.pages[pageIndex].strokes;
    final undoStack = ref.read(undoStackProvider);
    ref.read(undoStackProvider.notifier).state = [...undoStack, List.from(currentStrokes)];

    // Restore redo state
    final redoStrokes = redoStack.last;
    ref.read(redoStackProvider.notifier).state = redoStack.sublist(0, redoStack.length - 1);

    final updatedPage = note.pages[pageIndex].copyWith(strokes: redoStrokes);
    final updatedPages = List<CanvasPage>.from(note.pages);
    updatedPages[pageIndex] = updatedPage;

    ref.read(currentCanvasNoteProvider.notifier).state = note.copyWith(pages: updatedPages);
    _hasUnsavedChanges = true;
    HapticFeedback.lightImpact();
  }

  void _clearCanvas() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Canvas'),
        content: const Text('Are you sure you want to clear the current page?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _doClearCanvas();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _doClearCanvas() {
    final note = ref.read(currentCanvasNoteProvider);
    final pageIndex = ref.read(currentPageIndexProvider);
    if (note == null || pageIndex >= note.pages.length) return;

    // Save undo state
    final currentStrokes = note.pages[pageIndex].strokes;
    final undoStack = ref.read(undoStackProvider);
    ref.read(undoStackProvider.notifier).state = [...undoStack, List.from(currentStrokes)];
    ref.read(redoStackProvider.notifier).state = [];

    // Clear strokes
    final updatedPage = note.pages[pageIndex].copyWith(strokes: []);
    final updatedPages = List<CanvasPage>.from(note.pages);
    updatedPages[pageIndex] = updatedPage;

    ref.read(currentCanvasNoteProvider.notifier).state = note.copyWith(pages: updatedPages);
    _hasUnsavedChanges = true;
    HapticFeedback.mediumImpact();
  }

  void _showColorPicker() {
    final currentSettings = ref.read(canvasToolSettingsProvider);
    Color pickedColor = currentSettings.color;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Pick a color'),
        content: SingleChildScrollView(
          child: BlockPicker(
            pickerColor: pickedColor,
            onColorChanged: (color) => pickedColor = color,
            availableColors: const [
              Colors.black,
              Color(0xFF1A1A2E),
              Color(0xFF16213E),
              Color(0xFF0F3460),
              LuxuryColors.champagneGold, // SalesOS gold
              LuxuryColors.champagneGoldDark,
              Color(0xFF1E3A8A),
              Color(0xFF3730A3),
              Color(0xFF6B21A8),
              Color(0xFF831843),
              Color(0xFF9F1239),
              Color(0xFFB91C1C),
              Color(0xFFC2410C),
              Color(0xFFD97706),
              Color(0xFFCA8A04),
              Color(0xFF65A30D),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              ref.read(canvasToolSettingsProvider.notifier).state =
                  currentSettings.copyWith(color: pickedColor);
              Navigator.pop(context);
            },
            child: const Text('Select'),
          ),
        ],
      ),
    );
  }

  void _showStrokeWidthPicker() {
    final currentSettings = ref.read(canvasToolSettingsProvider);
    double strokeWidth = currentSettings.strokeWidth;
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
          child: StatefulBuilder(
            builder: (context, setState) => Container(
              constraints: const BoxConstraints(maxWidth: 360),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.obsidian : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Stroke Width',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Preview
                  Container(
                    height: 60,
                    alignment: Alignment.center,
                    child: Container(
                      width: 100,
                      height: strokeWidth,
                      decoration: BoxDecoration(
                        color: currentSettings.color,
                        borderRadius: BorderRadius.circular(strokeWidth / 2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Slider(
                    value: strokeWidth,
                    min: 1,
                    max: 20,
                    divisions: 19,
                    activeColor: LuxuryColors.jadePremium,
                    label: strokeWidth.round().toString(),
                    onChanged: (value) {
                      setState(() => strokeWidth = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [1.0, 3.0, 5.0, 8.0, 12.0].map((w) {
                      return GestureDetector(
                        onTap: () => setState(() => strokeWidth = w),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: strokeWidth == w
                                ? LuxuryColors.jadePremium.withValues(alpha: 0.2)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: strokeWidth == w
                                  ? LuxuryColors.jadePremium
                                  : (isDark ? Colors.white24 : Colors.black12),
                            ),
                          ),
                          child: Center(
                            child: Container(
                              width: w * 2,
                              height: w * 2,
                              decoration: BoxDecoration(
                                color: currentSettings.color,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        ref.read(canvasToolSettingsProvider.notifier).state =
                            currentSettings.copyWith(strokeWidth: strokeWidth);
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: LuxuryColors.rolexGreen,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Apply'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _processWithAI() async {
    final note = ref.read(currentCanvasNoteProvider);
    if (note == null || !note.hasContent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Nothing to process. Draw something first!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);
    HapticFeedback.lightImpact();

    try {
      // Save first
      await _saveNote();

      // Process with AI
      final service = ref.read(canvasNotepadServiceProvider);
      final result = await service.processWithAI(note);

      if (result?['success'] == true) {
        final extractedText = result?['extractedText'] as String?;
        HapticFeedback.mediumImpact();

        if (mounted) {
          _showProcessingResult(extractedText, result);
        }
      } else {
        throw Exception(result?['error'] ?? 'Processing failed');
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Processing failed: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _showProcessingResult(String? extractedText, Map<String, dynamic>? result) {
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
            constraints: const BoxConstraints(maxWidth: 440, maxHeight: 500),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                width: 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Iconsax.magic_star,
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'AI Analysis',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                if (extractedText != null && extractedText.isNotEmpty) ...[
                  Text(
                    'Extracted Text:',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white70 : Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? Colors.white12 : Colors.black12,
                        ),
                      ),
                      child: SingleChildScrollView(
                        child: Text(
                          extractedText,
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.6,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        Navigator.pop(context);
                        await _syncToServer();
                      },
                      icon: const Icon(Iconsax.cloud_add),
                      label: const Text('Save as CRM Note'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: LuxuryColors.rolexGreen,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  Center(
                    child: Column(
                      children: [
                        Icon(
                          Iconsax.document_text,
                          size: 48,
                          color: isDark ? Colors.white38 : Colors.black26,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No text could be extracted',
                          style: TextStyle(
                            color: isDark ? Colors.white54 : Colors.black45,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _syncToServer() async {
    final note = ref.read(currentCanvasNoteProvider);
    if (note == null) return;

    setState(() => _isProcessing = true);

    try {
      final service = ref.read(canvasNotepadServiceProvider);
      final success = await service.syncToServer(note);

      if (success) {
        HapticFeedback.mediumImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Iconsax.tick_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  const Text('Saved to CRM'),
                ],
              ),
              backgroundColor: LuxuryColors.rolexGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } else {
        throw Exception('Sync failed');
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to sync: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _showTitleDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Note Title'),
        content: TextField(
          controller: _titleController,
          decoration: const InputDecoration(
            hintText: 'Enter title...',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              _hasUnsavedChanges = true;
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final note = ref.watch(currentCanvasNoteProvider);
    final currentStroke = ref.watch(currentStrokeProvider);
    final pageIndex = ref.watch(currentPageIndexProvider);
    final toolSettings = ref.watch(canvasToolSettingsProvider);
    final undoStack = ref.watch(undoStackProvider);
    final redoStack = ref.watch(redoStackProvider);

    final currentPage = note != null && pageIndex < note.pages.length
        ? note.pages[pageIndex]
        : null;

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
          onPressed: () async {
            if (_hasUnsavedChanges) {
              await _saveNote();
              if (!mounted) return;
            }
            // ignore: use_build_context_synchronously
            context.pop();
          },
        ),
        title: GestureDetector(
          onTap: _showTitleDialog,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                note?.title ?? 'Untitled Note',
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Iconsax.edit_2,
                size: 14,
                color: isDark ? Colors.white54 : Colors.black38,
              ),
            ],
          ),
        ),
        centerTitle: true,
        actions: [
          if (_hasUnsavedChanges)
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Unsaved',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.orange,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          IconButton(
            icon: Icon(
              Iconsax.magic_star,
              color: LuxuryColors.jadePremium,
            ),
            onPressed: _isProcessing ? null : _processWithAI,
            tooltip: 'Process with AI',
          ),
          IconButton(
            icon: Icon(
              _showToolbar ? Iconsax.eye_slash : Iconsax.eye,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
            onPressed: () => setState(() => _showToolbar = !_showToolbar),
            tooltip: _showToolbar ? 'Hide toolbar' : 'Show toolbar',
          ),
        ],
      ),
      body: Stack(
        children: [
          // Canvas
          if (currentPage != null)
            DrawingCanvas(
              strokes: currentPage.strokes,
              currentStroke: currentStroke,
              backgroundColor: currentPage.backgroundColor,
              toolSettings: toolSettings,
              onStrokeStart: _onStrokeStart,
              onStrokeUpdate: _onStrokeUpdate,
              onStrokeEnd: _onStrokeEnd,
            ),

          // Floating toolbar
          if (_showToolbar)
            Positioned(
              bottom: 24,
              left: 16,
              right: 16,
              child: _buildToolbar(isDark, toolSettings, undoStack, redoStack),
            ),

          // Processing overlay
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: Center(
                child: LuxuryCard(
                  variant: LuxuryCardVariant.elevated,
                  tier: LuxuryTier.gold,
                  padding: const EdgeInsets.all(32),
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
                      const SizedBox(height: 16),
                      Text(
                        'Processing...',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildToolbar(
    bool isDark,
    CanvasToolSettings toolSettings,
    List<List<CanvasStroke>> undoStack,
    List<List<CanvasStroke>> redoStack,
  ) {
    final Widget card = LuxuryCard(
      variant: LuxuryCardVariant.elevated,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Pen tools
          _ToolButton(
            icon: Iconsax.pen_tool,
            isSelected: toolSettings.tool == PenTool.pen,
            onTap: () {
              HapticFeedback.selectionClick();
              ref.read(canvasToolSettingsProvider.notifier).state =
                  toolSettings.copyWith(tool: PenTool.pen);
            },
            tooltip: 'Pen',
          ),
          _ToolButton(
            icon: Iconsax.edit,
            isSelected: toolSettings.tool == PenTool.pencil,
            onTap: () {
              HapticFeedback.selectionClick();
              ref.read(canvasToolSettingsProvider.notifier).state =
                  toolSettings.copyWith(tool: PenTool.pencil);
            },
            tooltip: 'Pencil',
          ),
          _ToolButton(
            icon: Iconsax.brush_1,
            isSelected: toolSettings.tool == PenTool.highlighter,
            onTap: () {
              HapticFeedback.selectionClick();
              ref.read(canvasToolSettingsProvider.notifier).state =
                  toolSettings.copyWith(tool: PenTool.highlighter);
            },
            tooltip: 'Highlighter',
          ),
          _ToolButton(
            icon: Iconsax.eraser_1,
            isSelected: toolSettings.tool == PenTool.eraser,
            onTap: () {
              HapticFeedback.selectionClick();
              ref.read(canvasToolSettingsProvider.notifier).state =
                  toolSettings.copyWith(tool: PenTool.eraser);
            },
            tooltip: 'Eraser',
          ),

          // Divider
          Container(
            width: 1,
            height: 28,
            color: isDark ? Colors.white12 : Colors.black12,
          ),

          // Color picker
          GestureDetector(
            onTap: _showColorPicker,
            child: Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: toolSettings.color,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isDark ? Colors.white30 : Colors.black26,
                  width: 2,
                ),
              ),
            ),
          ),

          // Stroke width
          _ToolButton(
            icon: Iconsax.ruler,
            onTap: _showStrokeWidthPicker,
            tooltip: 'Stroke width',
          ),

          // Divider
          Container(
            width: 1,
            height: 28,
            color: isDark ? Colors.white12 : Colors.black12,
          ),

          // Undo/Redo
          _ToolButton(
            icon: Iconsax.undo,
            onTap: undoStack.isNotEmpty ? _undo : null,
            tooltip: 'Undo',
            enabled: undoStack.isNotEmpty,
          ),
          _ToolButton(
            icon: Iconsax.redo,
            onTap: redoStack.isNotEmpty ? _redo : null,
            tooltip: 'Redo',
            enabled: redoStack.isNotEmpty,
          ),

          // Clear
          _ToolButton(
            icon: Iconsax.trash,
            onTap: _clearCanvas,
            tooltip: 'Clear',
            color: Colors.red.shade400,
          ),
        ],
      ),
    );
    return card.animate().fadeIn(duration: 300.ms).slideY(begin: 0.2);
  }
}

class _ToolButton extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final VoidCallback? onTap;
  final String? tooltip;
  final bool enabled;
  final Color? color;

  const _ToolButton({
    required this.icon,
    this.isSelected = false,
    this.onTap,
    this.tooltip,
    this.enabled = true,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: tooltip ?? '',
      child: GestureDetector(
        onTap: enabled ? onTap : null,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isSelected
                ? LuxuryColors.jadePremium.withValues(alpha: 0.2)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            size: 20,
            color: color ??
                (enabled
                    ? (isSelected
                        ? LuxuryColors.jadePremium
                        : (isDark ? Colors.white70 : Colors.black54))
                    : (isDark ? Colors.white24 : Colors.black26)),
          ),
        ),
      ),
    );
  }
}
