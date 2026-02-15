import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/smart_capture_service.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Capture state class
class CaptureState {
  final File? selectedImage;
  final CaptureMode? selectedMode;
  final bool isProcessing;
  final SmartCaptureResult? result;
  final String? error;

  CaptureState({
    this.selectedImage,
    this.selectedMode,
    this.isProcessing = false,
    this.result,
    this.error,
  });

  CaptureState copyWith({
    File? selectedImage,
    CaptureMode? selectedMode,
    bool? isProcessing,
    SmartCaptureResult? result,
    String? error,
  }) {
    return CaptureState(
      selectedImage: selectedImage ?? this.selectedImage,
      selectedMode: selectedMode ?? this.selectedMode,
      isProcessing: isProcessing ?? this.isProcessing,
      result: result ?? this.result,
      error: error ?? this.error,
    );
  }

  CaptureState reset() => CaptureState();
}

/// Notifier for capture state management
class CaptureStateNotifier extends Notifier<CaptureState> {
  @override
  CaptureState build() => CaptureState();

  void updateState(CaptureState newState) => state = newState;
  void reset() => state = CaptureState();
}

/// Provider for current capture state
final captureStateProvider = NotifierProvider<CaptureStateNotifier, CaptureState>(
  CaptureStateNotifier.new,
);

class SmartCapturePage extends ConsumerStatefulWidget {
  final String? linkedEntityId;
  final String? linkedEntityType;

  const SmartCapturePage({
    super.key,
    this.linkedEntityId,
    this.linkedEntityType,
  });

  @override
  ConsumerState<SmartCapturePage> createState() => _SmartCapturePageState();
}

class _SmartCapturePageState extends ConsumerState<SmartCapturePage> {
  @override
  void initState() {
    super.initState();
    // Reset capture state when entering page
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(captureStateProvider.notifier).reset();
    });
  }

  Future<void> _captureFromCamera(CaptureMode mode) async {
    HapticFeedback.lightImpact();
    final captureService = ref.read(smartCaptureServiceProvider);

    ref.read(captureStateProvider.notifier).updateState(
        ref.read(captureStateProvider).copyWith(isProcessing: false, selectedMode: mode));

    final imageFile = await captureService.captureFromCamera();
    if (imageFile != null) {
      ref.read(captureStateProvider.notifier).updateState(
          ref.read(captureStateProvider).copyWith(selectedImage: imageFile));
      await _processImage(imageFile, mode);
    }
  }

  Future<void> _pickFromGallery(CaptureMode mode) async {
    HapticFeedback.lightImpact();
    final captureService = ref.read(smartCaptureServiceProvider);

    ref.read(captureStateProvider.notifier).updateState(
        ref.read(captureStateProvider).copyWith(isProcessing: false, selectedMode: mode));

    final imageFile = await captureService.pickFromGallery();
    if (imageFile != null) {
      ref.read(captureStateProvider.notifier).updateState(
          ref.read(captureStateProvider).copyWith(selectedImage: imageFile));
      await _processImage(imageFile, mode);
    }
  }

  Future<void> _processImage(File imageFile, CaptureMode mode) async {
    final captureService = ref.read(smartCaptureServiceProvider);

    ref.read(captureStateProvider.notifier).updateState(
        ref.read(captureStateProvider).copyWith(isProcessing: true));

    try {
      final result = await captureService.processImage(
        imageFile,
        mode,
        linkedEntityId: widget.linkedEntityId,
        linkedEntityType: widget.linkedEntityType,
      );

      ref.read(captureStateProvider.notifier).updateState(
          ref.read(captureStateProvider).copyWith(
            isProcessing: false,
            result: result,
            error: result.success ? null : result.error,
          ));

      if (result.success) {
        HapticFeedback.mediumImpact();
        _showResultDialog(result);
      } else {
        HapticFeedback.heavyImpact();
        _showErrorSnackbar(result.error ?? 'Processing failed');
      }
    } catch (e) {
      ref.read(captureStateProvider.notifier).updateState(
          ref.read(captureStateProvider).copyWith(
            isProcessing: false,
            error: e.toString(),
          ));
      HapticFeedback.heavyImpact();
      _showErrorSnackbar(e.toString());
    }
  }

  void _showResultDialog(SmartCaptureResult result) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;

    if (isTablet) {
      // Use centered dialog for iPad/tablet
      showDialog(
        context: context,
        barrierDismissible: true,
        builder: (context) => _CaptureResultDialog(
          result: result,
          isDark: isDark,
          onCreateEntity: (entityType) {
            Navigator.pop(context);
            _createEntity(result, entityType);
          },
          onDismiss: () => Navigator.pop(context),
        ),
      );
    } else {
      // Use centered dialog for phones too (consistent UI)
      showDialog(
        context: context,
        barrierDismissible: true,
        barrierColor: Colors.black54,
        builder: (context) => BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: _CaptureResultDialog(
            result: result,
            isDark: isDark,
            onCreateEntity: (entityType) {
              Navigator.pop(context);
              _createEntity(result, entityType);
            },
            onDismiss: () => Navigator.pop(context),
          ),
        ),
      );
    }
  }

  Future<void> _createEntity(SmartCaptureResult result, CrmEntityType entityType) async {
    // Dialog is already closed before this is called
    HapticFeedback.lightImpact();

    final captureService = ref.read(smartCaptureServiceProvider);

    ref.read(captureStateProvider.notifier).updateState(
        ref.read(captureStateProvider).copyWith(isProcessing: true));

    try {
      final createResult = await captureService.createEntityFromCapture(
        entityType: entityType,
        extractedData: result.extractedData,
        linkedEntityId: widget.linkedEntityId,
        linkedEntityType: widget.linkedEntityType,
      );

      ref.read(captureStateProvider.notifier).updateState(
          ref.read(captureStateProvider).copyWith(isProcessing: false));

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
          // Navigate to the created entity
          _navigateToEntity(createResult.createdEntity!);
        }
      } else {
        _showErrorSnackbar(createResult.error ?? 'Failed to create entity');
      }
    } catch (e) {
      ref.read(captureStateProvider.notifier).updateState(
          ref.read(captureStateProvider).copyWith(isProcessing: false));
      _showErrorSnackbar(e.toString());
    }
  }

  void _navigateToEntity(CreatedEntity entity) {
    switch (entity.type) {
      case CrmEntityType.lead:
        context.push('${AppRoutes.leads}/${entity.id}');
        break;
      case CrmEntityType.contact:
        context.push('${AppRoutes.contacts}/${entity.id}');
        break;
      case CrmEntityType.account:
        context.push('${AppRoutes.accounts}/${entity.id}');
        break;
      case CrmEntityType.note:
        // Navigate to notes page to view all notes including the new one
        context.push(AppRoutes.notes);
        break;
    }
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

  void _showCaptureOptions(CaptureMode mode) {
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
                  _getModeName(mode),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _getModeDescription(mode),
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: _CaptureOptionButton(
                        icon: Iconsax.camera,
                        label: 'Camera',
                        isDark: isDark,
                        onTap: () {
                          Navigator.pop(context);
                          _captureFromCamera(mode);
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _CaptureOptionButton(
                        icon: Iconsax.gallery,
                        label: 'Gallery',
                        isDark: isDark,
                        onTap: () {
                          Navigator.pop(context);
                          _pickFromGallery(mode);
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
        return 'Business Card Scan';
      case CaptureMode.document:
        return 'Document Scan';
      case CaptureMode.handwritten:
        return 'Handwritten Notes';
      case CaptureMode.receipt:
        return 'Receipt Scan';
    }
  }

  String _getModeDescription(CaptureMode mode) {
    switch (mode) {
      case CaptureMode.businessCard:
        return 'Extract contact information from a business card';
      case CaptureMode.document:
        return 'Convert printed text from documents to digital text';
      case CaptureMode.handwritten:
        return 'Transcribe your handwritten notes';
      case CaptureMode.receipt:
        return 'Extract expense data from receipts';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final captureState = ref.watch(captureStateProvider);
    final capabilities = ref.watch(ocrCapabilitiesProvider);

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
        title: Text(
          'Smart Capture',
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black87,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              Iconsax.note_2,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
            tooltip: 'View All Notes',
            onPressed: () => context.push(AppRoutes.notes),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header section
                  Text(
                    'Capture & Convert',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ).animate().fadeIn(duration: 300.ms).slideX(begin: -0.1),
                  const SizedBox(height: 8),
                  Text(
                    'Use AI-powered OCR to extract data from images',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white60 : Colors.black54,
                    ),
                  ).animate().fadeIn(duration: 300.ms, delay: 100.ms),
                  const SizedBox(height: 24),

                  // OCR Status indicator
                  capabilities.when(
                    data: (caps) => _OcrStatusBadge(
                      available: caps.available,
                      isDark: isDark,
                    ),
                    loading: () => const SizedBox.shrink(),
                    error: (e, s) => _OcrStatusBadge(available: false, isDark: isDark),
                  ),
                  const SizedBox(height: 24),

                  // Capture mode cards - 2x2 grid layout
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.15,
                    children: [
                      _CaptureModeCard(
                        icon: Iconsax.card,
                        title: 'Business Card',
                        description: 'Scan to create leads or contacts',
                        color: LuxuryColors.champagneGold,
                        isDark: isDark,
                        onTap: () => _showCaptureOptions(CaptureMode.businessCard),
                      ).animate().fadeIn(duration: 300.ms, delay: 150.ms).scale(begin: const Offset(0.9, 0.9)),
                      _CaptureModeCard(
                        icon: Iconsax.document_text,
                        title: 'Document',
                        description: 'Extract text from documents',
                        color: LuxuryColors.rolexGreen,
                        isDark: isDark,
                        onTap: () => _showCaptureOptions(CaptureMode.document),
                      ).animate().fadeIn(duration: 300.ms, delay: 200.ms).scale(begin: const Offset(0.9, 0.9)),
                      _CaptureModeCard(
                        icon: Iconsax.edit_2,
                        title: 'Handwritten',
                        description: 'Convert notes to digital text',
                        color: LuxuryColors.jadePremium,
                        isDark: isDark,
                        onTap: () => _showCaptureOptions(CaptureMode.handwritten),
                      ).animate().fadeIn(duration: 300.ms, delay: 250.ms).scale(begin: const Offset(0.9, 0.9)),
                      _CaptureModeCard(
                        icon: Iconsax.receipt_item,
                        title: 'Receipt',
                        description: 'Extract expense details',
                        color: LuxuryColors.roseGold,
                        isDark: isDark,
                        onTap: () => _showCaptureOptions(CaptureMode.receipt),
                      ).animate().fadeIn(duration: 300.ms, delay: 300.ms).scale(begin: const Offset(0.9, 0.9)),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // Tips section
                  _TipsCard(isDark: isDark)
                      .animate()
                      .fadeIn(duration: 300.ms, delay: 350.ms),
                ],
              ),
            ),
          ),

          // Processing overlay
          if (captureState.isProcessing)
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
                        width: 60,
                        height: 60,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Processing...',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Extracting data with AI',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white60 : Colors.black54,
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
}

// Capture Mode Card Widget - Boxed vertical layout
class _CaptureModeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _CaptureModeCard({
    required this.icon,
    required this.title,
    required this.description,
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
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? color.withValues(alpha: 0.3)
                  : Colors.grey.withValues(alpha: 0.2),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: isDark ? 0.12 : 0.06),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Icon container with gradient background
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        color.withValues(alpha: 0.2),
                        color.withValues(alpha: 0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: color.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    icon,
                    size: 22,
                    color: color,
                  ),
                ),
                const SizedBox(height: 8),
                // Title
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                // Description
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? Colors.white54 : Colors.black45,
                    height: 1.2,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                // Tap indicator
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.scan,
                        size: 10,
                        color: color,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        'Scan',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: color,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// OCR Status Badge
class _OcrStatusBadge extends StatelessWidget {
  final bool available;
  final bool isDark;

  const _OcrStatusBadge({
    required this.available,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: available
            ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
            : Colors.red.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: available ? LuxuryColors.rolexGreen : Colors.red,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            available ? Iconsax.tick_circle : Iconsax.close_circle,
            size: 16,
            color: available ? LuxuryColors.rolexGreen : Colors.red,
          ),
          const SizedBox(width: 8),
          Text(
            available ? 'OCR Service Connected' : 'OCR Service Unavailable',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: available ? LuxuryColors.rolexGreen : Colors.red,
            ),
          ),
        ],
      ),
    );
  }
}

// Capture Option Button
class _CaptureOptionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  final VoidCallback onTap;

  const _CaptureOptionButton({
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
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 32,
                color: LuxuryColors.jadePremium,
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
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

// Tip Item Widget
class _TipItem extends StatelessWidget {
  final String text;
  final bool isDark;

  const _TipItem({required this.text, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Iconsax.tick_circle,
            size: 16,
            color: LuxuryColors.jadePremium,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.white70 : Colors.black54,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Capture Result Dialog for iPad/Tablet - Centered, resizable dialog
class _CaptureResultDialog extends StatefulWidget {
  final SmartCaptureResult result;
  final bool isDark;
  final Function(CrmEntityType) onCreateEntity;
  final VoidCallback onDismiss;

  const _CaptureResultDialog({
    required this.result,
    required this.isDark,
    required this.onCreateEntity,
    required this.onDismiss,
  });

  @override
  State<_CaptureResultDialog> createState() => _CaptureResultDialogState();
}

class _CaptureResultDialogState extends State<_CaptureResultDialog> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final dialogWidth = _isExpanded ? screenSize.width * 0.85 : 500.0;
    final dialogHeight = _isExpanded ? screenSize.height * 0.85 : screenSize.height * 0.65;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        width: dialogWidth.clamp(400.0, screenSize.width * 0.9),
        height: dialogHeight.clamp(400.0, screenSize.height * 0.9),
        decoration: BoxDecoration(
          color: widget.isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          children: [
            // Header with close and expand buttons
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: widget.isDark ? Colors.white12 : Colors.black12,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Iconsax.tick_circle,
                      color: LuxuryColors.rolexGreen,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Extracted Data',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: widget.isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        if (widget.result.aiEnhanced)
                          Text(
                            'Enhanced with AI',
                            style: TextStyle(
                              fontSize: 11,
                              color: LuxuryColors.jadePremium,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Expand/collapse button
                  IconButton(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      setState(() => _isExpanded = !_isExpanded);
                    },
                    icon: Icon(
                      _isExpanded ? Iconsax.maximize_4 : Iconsax.maximize_3,
                      color: widget.isDark ? Colors.white60 : Colors.black54,
                      size: 20,
                    ),
                    tooltip: _isExpanded ? 'Collapse' : 'Expand',
                  ),
                  IconButton(
                    onPressed: widget.onDismiss,
                    icon: Icon(
                      Iconsax.close_circle,
                      color: widget.isDark ? Colors.white60 : Colors.black54,
                      size: 22,
                    ),
                    tooltip: 'Close',
                  ),
                ],
              ),
            ),

            // Scrollable content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: _ExtractedDataContent(
                  result: widget.result,
                  isDark: widget.isDark,
                  isExpanded: _isExpanded,
                ),
              ),
            ),

            // Action buttons footer
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: widget.isDark ? Colors.white12 : Colors.black12,
                  ),
                ),
              ),
              child: _buildActionButtons(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    if (widget.result.mode == CaptureMode.businessCard) {
      return Row(
        children: [
          Expanded(
            child: _ActionButton(
              icon: Iconsax.user_add,
              label: 'Create Lead',
              color: LuxuryColors.champagneGold,
              isDark: widget.isDark,
              onTap: () => widget.onCreateEntity(CrmEntityType.lead),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ActionButton(
              icon: Iconsax.profile_add,
              label: 'Create Contact',
              color: LuxuryColors.jadePremium,
              isDark: widget.isDark,
              onTap: () => widget.onCreateEntity(CrmEntityType.contact),
            ),
          ),
        ],
      );
    } else if (widget.result.mode == CaptureMode.handwritten ||
        widget.result.mode == CaptureMode.document) {
      return Row(
        children: [
          Expanded(
            child: TextButton(
              onPressed: widget.onDismiss,
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: widget.isDark ? Colors.white60 : Colors.black54,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: _ActionButton(
              icon: Iconsax.note_add,
              label: 'Save as Note',
              color: LuxuryColors.jadePremium,
              isDark: widget.isDark,
              onTap: () => widget.onCreateEntity(CrmEntityType.note),
            ),
          ),
        ],
      );
    } else if (widget.result.mode == CaptureMode.receipt) {
      return Row(
        children: [
          Expanded(
            child: TextButton(
              onPressed: widget.onDismiss,
              child: Text(
                'Cancel',
                style: TextStyle(
                  color: widget.isDark ? Colors.white60 : Colors.black54,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: _ActionButton(
              icon: Iconsax.building,
              label: 'Create Account',
              color: LuxuryColors.champagneGold,
              isDark: widget.isDark,
              onTap: () => widget.onCreateEntity(CrmEntityType.account),
            ),
          ),
        ],
      );
    }
    return TextButton(
      onPressed: widget.onDismiss,
      child: const Text('Close'),
    );
  }
}

// Capture Result Sheet for Phone - Draggable bottom sheet
class _CaptureResultSheet extends StatefulWidget {
  final SmartCaptureResult result;
  final bool isDark;
  final Function(CrmEntityType) onCreateEntity;
  final VoidCallback onDismiss;

  const _CaptureResultSheet({
    required this.result,
    required this.isDark,
    required this.onCreateEntity,
    required this.onDismiss,
  });

  @override
  State<_CaptureResultSheet> createState() => _CaptureResultSheetState();
}

class _CaptureResultSheetState extends State<_CaptureResultSheet> {
  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: widget.isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Drag handle
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: widget.isDark ? Colors.white24 : Colors.black26,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Iconsax.tick_circle,
                        color: LuxuryColors.rolexGreen,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Data Extracted',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: widget.isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                          if (widget.result.aiEnhanced)
                            Text(
                              'Enhanced with AI',
                              style: TextStyle(
                                fontSize: 11,
                                color: LuxuryColors.jadePremium,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: widget.onDismiss,
                      icon: Icon(
                        Iconsax.close_circle,
                        color: widget.isDark ? Colors.white60 : Colors.black54,
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
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    const SizedBox(height: 8),
                    _ExtractedDataContent(
                      result: widget.result,
                      isDark: widget.isDark,
                      isExpanded: true,
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),

              // Action buttons
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: _buildActionButtons(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActionButtons() {
    if (widget.result.mode == CaptureMode.businessCard) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create from this data:',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: widget.isDark ? Colors.white60 : Colors.black54,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _ActionButton(
                  icon: Iconsax.user_add,
                  label: 'Lead',
                  color: LuxuryColors.champagneGold,
                  isDark: widget.isDark,
                  onTap: () => widget.onCreateEntity(CrmEntityType.lead),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ActionButton(
                  icon: Iconsax.profile_add,
                  label: 'Contact',
                  color: LuxuryColors.jadePremium,
                  isDark: widget.isDark,
                  onTap: () => widget.onCreateEntity(CrmEntityType.contact),
                ),
              ),
            ],
          ),
        ],
      );
    } else if (widget.result.mode == CaptureMode.handwritten ||
        widget.result.mode == CaptureMode.document) {
      return _ActionButton(
        icon: Iconsax.note_add,
        label: 'Save as Note',
        color: LuxuryColors.jadePremium,
        isDark: widget.isDark,
        onTap: () => widget.onCreateEntity(CrmEntityType.note),
        fullWidth: true,
      );
    } else if (widget.result.mode == CaptureMode.receipt) {
      return _ActionButton(
        icon: Iconsax.building,
        label: 'Create Account',
        color: LuxuryColors.champagneGold,
        isDark: widget.isDark,
        onTap: () => widget.onCreateEntity(CrmEntityType.account),
        fullWidth: true,
      );
    }
    return const SizedBox.shrink();
  }
}

// Extracted Data Content - Shared between dialog and sheet
class _ExtractedDataContent extends StatelessWidget {
  final SmartCaptureResult result;
  final bool isDark;
  final bool isExpanded;

  const _ExtractedDataContent({
    required this.result,
    required this.isDark,
    required this.isExpanded,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      variant: LuxuryCardVariant.bordered,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _getModeIcon(),
                size: 16,
                color: LuxuryColors.jadePremium,
              ),
              const SizedBox(width: 8),
              Text(
                'Extracted Information',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white70 : Colors.black54,
                ),
              ),
              const Spacer(),
              if (result.extractedData['confidence'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${(result.extractedData['confidence'] * 100).toStringAsFixed(0)}% confident',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: LuxuryColors.jadePremium,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _buildExtractedData(),
        ],
      ),
    );
  }

  IconData _getModeIcon() {
    switch (result.mode) {
      case CaptureMode.businessCard:
        return Iconsax.card;
      case CaptureMode.document:
        return Iconsax.document_text;
      case CaptureMode.handwritten:
        return Iconsax.edit_2;
      case CaptureMode.receipt:
        return Iconsax.receipt_item;
    }
  }

  Widget _buildExtractedData() {
    final data = result.extractedData;
    final entries = <Widget>[];

    // Handle different capture modes
    if (result.mode == CaptureMode.businessCard) {
      if (data['fullName'] != null || data['firstName'] != null) {
        entries.add(_DataRow(
          label: 'Name',
          value: data['fullName'] ??
              '${data['firstName'] ?? ''} ${data['lastName'] ?? ''}'.trim(),
          isDark: isDark,
          icon: Iconsax.user,
        ));
      }
      if (data['company'] != null) {
        entries.add(_DataRow(
          label: 'Company',
          value: data['company'],
          isDark: isDark,
          icon: Iconsax.building,
        ));
      }
      if (data['jobTitle'] != null) {
        entries.add(_DataRow(
          label: 'Title',
          value: data['jobTitle'],
          isDark: isDark,
          icon: Iconsax.briefcase,
        ));
      }
      if (data['email'] != null) {
        entries.add(_DataRow(
          label: 'Email',
          value: data['email'],
          isDark: isDark,
          icon: Iconsax.sms,
          copyable: true,
        ));
      }
      if (data['phone'] != null) {
        entries.add(_DataRow(
          label: 'Phone',
          value: data['phone'],
          isDark: isDark,
          icon: Iconsax.call,
          copyable: true,
        ));
      }
      if (data['mobilePhone'] != null && data['mobilePhone'] != data['phone']) {
        entries.add(_DataRow(
          label: 'Mobile',
          value: data['mobilePhone'],
          isDark: isDark,
          icon: Iconsax.mobile,
          copyable: true,
        ));
      }
      if (data['website'] != null) {
        entries.add(_DataRow(
          label: 'Website',
          value: data['website'],
          isDark: isDark,
          icon: Iconsax.global,
          copyable: true,
        ));
      }
      if (data['address'] != null) {
        entries.add(_DataRow(
          label: 'Address',
          value: data['address'],
          isDark: isDark,
          icon: Iconsax.location,
          multiline: true,
        ));
      }
    } else if (result.mode == CaptureMode.handwritten ||
        result.mode == CaptureMode.document) {
      if (data['text'] != null) {
        entries.add(_ExpandableTextRow(
          label: 'Extracted Text',
          value: data['text'],
          isDark: isDark,
          isExpanded: isExpanded,
        ));
      }
      if (data['wordCount'] != null) {
        entries.add(_DataRow(
          label: 'Word Count',
          value: data['wordCount'].toString(),
          isDark: isDark,
          icon: Iconsax.text,
        ));
      }
      if (data['hasHandwriting'] == true) {
        entries.add(_DataRow(
          label: 'Type',
          value: 'Contains handwritten text',
          isDark: isDark,
          icon: Iconsax.edit,
        ));
      }
    } else if (result.mode == CaptureMode.receipt) {
      if (data['merchantName'] != null) {
        entries.add(_DataRow(
          label: 'Merchant',
          value: data['merchantName'],
          isDark: isDark,
          icon: Iconsax.shop,
        ));
      }
      if (data['total'] != null) {
        entries.add(_DataRow(
          label: 'Total',
          value: '\$${data['total']}',
          isDark: isDark,
          icon: Iconsax.money,
          highlight: true,
        ));
      }
      if (data['subtotal'] != null) {
        entries.add(_DataRow(
          label: 'Subtotal',
          value: '\$${data['subtotal']}',
          isDark: isDark,
          icon: Iconsax.receipt_minus,
        ));
      }
      if (data['tax'] != null) {
        entries.add(_DataRow(
          label: 'Tax',
          value: '\$${data['tax']}',
          isDark: isDark,
          icon: Iconsax.percentage_square,
        ));
      }
      if (data['date'] != null) {
        entries.add(_DataRow(
          label: 'Date',
          value: data['date'],
          isDark: isDark,
          icon: Iconsax.calendar,
        ));
      }
      if (data['merchantAddress'] != null) {
        entries.add(_DataRow(
          label: 'Address',
          value: data['merchantAddress'],
          isDark: isDark,
          icon: Iconsax.location,
          multiline: true,
        ));
      }
    }

    if (entries.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              Iconsax.document_text,
              size: 40,
              color: isDark ? Colors.white30 : Colors.black26,
            ),
            const SizedBox(height: 12),
            Text(
              'No data extracted',
              style: TextStyle(
                color: isDark ? Colors.white60 : Colors.black54,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: entries
          .map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: entry,
              ))
          .toList(),
    );
  }
}

// Data Row Widget - Enhanced with icons and copy functionality
class _DataRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final bool multiline;
  final IconData? icon;
  final bool copyable;
  final bool highlight;

  const _DataRow({
    required this.label,
    required this.value,
    required this.isDark,
    this.multiline = false,
    this.icon,
    this.copyable = false,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      decoration: BoxDecoration(
        color: highlight
            ? LuxuryColors.champagneGold.withValues(alpha: 0.1)
            : isDark
                ? Colors.white.withValues(alpha: 0.03)
                : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(10),
        border: highlight
            ? Border.all(color: LuxuryColors.champagneGold.withValues(alpha: 0.3))
            : null,
      ),
      child: multiline
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (icon != null) ...[
                      Icon(
                        icon,
                        size: 14,
                        color: isDark ? Colors.white54 : Colors.black45,
                      ),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white54 : Colors.black45,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white : Colors.black87,
                    height: 1.4,
                  ),
                ),
              ],
            )
          : Row(
              children: [
                if (icon != null) ...[
                  Icon(
                    icon,
                    size: 16,
                    color: highlight
                        ? LuxuryColors.champagneGold
                        : isDark
                            ? Colors.white54
                            : Colors.black45,
                  ),
                  const SizedBox(width: 10),
                ],
                SizedBox(
                  width: 70,
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white54 : Colors.black45,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: highlight ? FontWeight.w600 : FontWeight.normal,
                      color: highlight
                          ? LuxuryColors.champagneGold
                          : isDark
                              ? Colors.white
                              : Colors.black87,
                    ),
                  ),
                ),
                if (copyable)
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: value));
                      HapticFeedback.lightImpact();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('$label copied'),
                          behavior: SnackBarBehavior.floating,
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: Icon(
                        Iconsax.copy,
                        size: 16,
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

// Expandable Text Row - For large text content like extracted documents
class _ExpandableTextRow extends StatefulWidget {
  final String label;
  final String value;
  final bool isDark;
  final bool isExpanded;

  const _ExpandableTextRow({
    required this.label,
    required this.value,
    required this.isDark,
    this.isExpanded = false,
  });

  @override
  State<_ExpandableTextRow> createState() => _ExpandableTextRowState();
}

class _ExpandableTextRowState extends State<_ExpandableTextRow> {
  bool _localExpanded = false;

  @override
  Widget build(BuildContext context) {
    final isShowingFull = _localExpanded || widget.isExpanded;
    final displayText = isShowingFull
        ? widget.value
        : (widget.value.length > 300
            ? '${widget.value.substring(0, 300)}...'
            : widget.value);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.isDark
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: widget.isDark ? Colors.white12 : Colors.black12,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.document_text,
                size: 14,
                color: widget.isDark ? Colors.white54 : Colors.black45,
              ),
              const SizedBox(width: 6),
              Text(
                widget.label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: widget.isDark ? Colors.white54 : Colors.black45,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: widget.value));
                  HapticFeedback.lightImpact();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Text copied to clipboard'),
                      behavior: SnackBarBehavior.floating,
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.copy,
                        size: 12,
                        color: LuxuryColors.jadePremium,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Copy',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: LuxuryColors.jadePremium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AnimatedCrossFade(
            firstChild: Text(
              displayText,
              style: TextStyle(
                fontSize: 14,
                color: widget.isDark ? Colors.white : Colors.black87,
                height: 1.5,
              ),
            ),
            secondChild: Text(
              widget.value,
              style: TextStyle(
                fontSize: 14,
                color: widget.isDark ? Colors.white : Colors.black87,
                height: 1.5,
              ),
            ),
            crossFadeState:
                isShowingFull ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
          if (widget.value.length > 300 && !widget.isExpanded) ...[
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() => _localExpanded = !_localExpanded);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: widget.isDark ? Colors.white12 : Colors.black12,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _localExpanded ? 'Show less' : 'Show more',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      _localExpanded ? Iconsax.arrow_up_2 : Iconsax.arrow_down_1,
                      size: 14,
                      color: LuxuryColors.jadePremium,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// Action Button Widget
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;
  final bool fullWidth;

  const _ActionButton({
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
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
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

// Tips Card Widget
class _TipsCard extends StatelessWidget {
  final bool isDark;

  const _TipsCard({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      variant: LuxuryCardVariant.bordered,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.lamp_on,
                size: 20,
                color: LuxuryColors.jadePremium,
              ),
              const SizedBox(width: 8),
              Text(
                'Tips for best results',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _TipItem(
            text: 'Ensure good lighting and avoid shadows',
            isDark: isDark,
          ),
          _TipItem(
            text: 'Keep the camera steady and document flat',
            isDark: isDark,
          ),
          _TipItem(
            text: 'Make sure all text is visible and in focus',
            isDark: isDark,
          ),
        ],
      ),
    );
  }
}
