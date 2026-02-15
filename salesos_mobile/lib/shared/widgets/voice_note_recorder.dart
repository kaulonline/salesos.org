import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../core/config/theme.dart';
import '../../core/services/voice_input_service.dart';
import 'luxury_card.dart';

/// Voice note recorder widget for capturing voice notes with real-time transcription
class VoiceNoteRecorder extends ConsumerStatefulWidget {
  final Function(String transcription) onTranscriptionComplete;
  final Function(String partialText)? onPartialResult;
  final VoidCallback? onRecordingStart;
  final VoidCallback? onRecordingStop;
  final bool showPreview;
  final String? initialText;

  const VoiceNoteRecorder({
    super.key,
    required this.onTranscriptionComplete,
    this.onPartialResult,
    this.onRecordingStart,
    this.onRecordingStop,
    this.showPreview = true,
    this.initialText,
  });

  @override
  ConsumerState<VoiceNoteRecorder> createState() => _VoiceNoteRecorderState();
}

class _VoiceNoteRecorderState extends ConsumerState<VoiceNoteRecorder> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  String _transcribedText = '';
  String _partialText = '';
  bool _isRecording = false;
  StreamSubscription<VoiceInputResult>? _resultSubscription;
  StreamSubscription<VoiceInputState>? _stateSubscription;
  Timer? _recordingTimer;
  int _recordingDuration = 0;

  @override
  void initState() {
    super.initState();
    _transcribedText = widget.initialText ?? '';
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _initVoiceService();
  }

  Future<void> _initVoiceService() async {
    final voiceService = ref.read(voiceInputServiceProvider);
    await voiceService.initialize();

    _resultSubscription = voiceService.resultStream.listen((result) {
      setState(() {
        if (result.isFinal) {
          if (_transcribedText.isNotEmpty && result.text.isNotEmpty) {
            _transcribedText = '$_transcribedText ${result.text}';
          } else if (result.text.isNotEmpty) {
            _transcribedText = result.text;
          }
          _partialText = '';
          widget.onTranscriptionComplete(_transcribedText);
        } else {
          _partialText = result.text;
          widget.onPartialResult?.call(result.text);
        }
      });
    });

    _stateSubscription = voiceService.stateStream.listen((state) {
      setState(() {
        _isRecording = state == VoiceInputState.listening;
        if (_isRecording) {
          _pulseController.repeat(reverse: true);
        } else {
          _pulseController.stop();
        }
      });
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _resultSubscription?.cancel();
    _stateSubscription?.cancel();
    _recordingTimer?.cancel();
    super.dispose();
  }

  Future<void> _toggleRecording() async {
    HapticFeedback.mediumImpact();
    final voiceService = ref.read(voiceInputServiceProvider);

    if (_isRecording) {
      await voiceService.stopListening();
      _recordingTimer?.cancel();
      widget.onRecordingStop?.call();
    } else {
      final started = await voiceService.startListening(
        listenFor: const Duration(minutes: 5),
        pauseFor: const Duration(seconds: 5),
      );
      if (started) {
        widget.onRecordingStart?.call();
        _recordingDuration = 0;
        _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          setState(() {
            _recordingDuration++;
          });
        });
      }
    }
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final voiceService = ref.watch(voiceInputServiceProvider);

    return Column(
      children: [
        // Recording controls
        LuxuryCard(
          variant: LuxuryCardVariant.elevated,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Recording button with pulse animation
                GestureDetector(
                  onTap: voiceService.isAvailable ? _toggleRecording : null,
                  child: AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isRecording
                              ? Colors.red.withValues(alpha: 0.1 + (_pulseController.value * 0.1))
                              : LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                          border: Border.all(
                            color: _isRecording
                                ? Colors.red.withValues(alpha: 0.3 + (_pulseController.value * 0.3))
                                : LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                            width: 3,
                          ),
                          boxShadow: _isRecording
                              ? [
                                  BoxShadow(
                                    color: Colors.red.withValues(alpha: 0.2 + (_pulseController.value * 0.2)),
                                    blurRadius: 20 + (_pulseController.value * 10),
                                    spreadRadius: 2 + (_pulseController.value * 3),
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          _isRecording ? Iconsax.stop : Iconsax.microphone,
                          size: 36,
                          color: _isRecording ? Colors.red : LuxuryColors.rolexGreen,
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),

                // Status text
                Text(
                  _isRecording
                      ? 'Recording... ${_formatDuration(_recordingDuration)}'
                      : voiceService.isAvailable
                          ? 'Tap to start recording'
                          : 'Voice recording unavailable',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: _isRecording
                        ? Colors.red
                        : isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                    fontWeight: _isRecording ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),

                // Partial transcription preview
                if (_isRecording && _partialText.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark
                          ? LuxuryColors.obsidian
                          : LuxuryColors.platinum.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Iconsax.voice_square,
                          size: 16,
                          color: Colors.red.withValues(alpha: 0.8),
                        )
                            .animate(onPlay: (c) => c.repeat())
                            .fadeIn(duration: 300.ms)
                            .then()
                            .fadeOut(duration: 300.ms),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _partialText,
                            style: IrisTheme.bodySmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                              fontStyle: FontStyle.italic,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Transcription preview
        if (widget.showPreview && _transcribedText.isNotEmpty) ...[
          const SizedBox(height: 16),
          LuxuryCard(
            variant: LuxuryCardVariant.bordered,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Iconsax.document_text,
                        size: 18,
                        color: LuxuryColors.rolexGreen,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Transcription',
                        style: IrisTheme.labelMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          setState(() {
                            _transcribedText = '';
                          });
                          widget.onTranscriptionComplete('');
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Iconsax.trash,
                                size: 14,
                                color: Colors.red,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Clear',
                                style: IrisTheme.labelSmall.copyWith(
                                  color: Colors.red,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _transcribedText,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Compact voice input button for inline use
class VoiceInputButton extends ConsumerStatefulWidget {
  final Function(String text) onResult;
  final double size;
  final bool showTooltip;

  const VoiceInputButton({
    super.key,
    required this.onResult,
    this.size = 44,
    this.showTooltip = true,
  });

  @override
  ConsumerState<VoiceInputButton> createState() => _VoiceInputButtonState();
}

class _VoiceInputButtonState extends ConsumerState<VoiceInputButton> {
  bool _isListening = false;
  String _accumulatedText = '';

  @override
  void initState() {
    super.initState();
    _initService();
  }

  Future<void> _initService() async {
    final voiceService = ref.read(voiceInputServiceProvider);
    await voiceService.initialize();
  }

  Future<void> _toggleListening() async {
    HapticFeedback.mediumImpact();
    final voiceService = ref.read(voiceInputServiceProvider);

    if (_isListening) {
      await voiceService.stopListening();
      setState(() => _isListening = false);
      if (_accumulatedText.isNotEmpty) {
        widget.onResult(_accumulatedText);
        _accumulatedText = '';
      }
    } else {
      _accumulatedText = '';
      final started = await voiceService.startListening();
      if (started) {
        setState(() => _isListening = true);

        // Listen for results
        voiceService.resultStream.listen((result) {
          if (result.isFinal) {
            _accumulatedText += ' ${result.text}';
            _accumulatedText = _accumulatedText.trim();
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final voiceService = ref.watch(voiceInputServiceProvider);

    if (!voiceService.isAvailable) {
      return const SizedBox.shrink();
    }

    final button = GestureDetector(
      onTap: _toggleListening,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _isListening
              ? Colors.red.withValues(alpha: 0.1)
              : isDark
                  ? LuxuryColors.obsidian
                  : LuxuryColors.platinum.withValues(alpha: 0.5),
          border: Border.all(
            color: _isListening
                ? Colors.red.withValues(alpha: 0.5)
                : Colors.transparent,
            width: 2,
          ),
        ),
        child: Icon(
          _isListening ? Iconsax.stop : Iconsax.microphone,
          size: widget.size * 0.45,
          color: _isListening
              ? Colors.red
              : isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
        ),
      ),
    );

    if (widget.showTooltip) {
      return Tooltip(
        message: _isListening ? 'Stop recording' : 'Voice input',
        child: button,
      );
    }

    return button;
  }
}
