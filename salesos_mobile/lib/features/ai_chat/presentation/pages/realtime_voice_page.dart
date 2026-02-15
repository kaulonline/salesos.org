import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/services/realtime_voice_webrtc_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/animated_voice_orb.dart';
import '../../../../features/auth/presentation/bloc/auth_provider.dart';
import '../../data/call_history_service.dart';

/// Premium immersive real-time voice conversation page
/// Inspired by futuristic AI assistant interfaces with SalesOS Gold branding
class RealtimeVoicePage extends ConsumerStatefulWidget {
  const RealtimeVoicePage({super.key});

  @override
  ConsumerState<RealtimeVoicePage> createState() => _RealtimeVoicePageState();

  static Future<void> show(BuildContext context) async {
    await Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        pageBuilder: (context, animation, secondaryAnimation) {
          return FadeTransition(
            opacity: animation,
            child: const RealtimeVoicePage(),
          );
        },
        transitionDuration: const Duration(milliseconds: 400),
        reverseTransitionDuration: const Duration(milliseconds: 300),
      ),
    );
  }
}

class _RealtimeVoicePageState extends ConsumerState<RealtimeVoicePage>
    with TickerProviderStateMixin {
  late AnimationController _backgroundController;
  late AnimationController _textController;
  final TextEditingController _inputController = TextEditingController();
  final FocusNode _inputFocusNode = FocusNode();

  // Cache the notifier to safely disconnect in dispose
  RealtimeVoiceWebRTCService? _voiceService;

  // Session tracking for call history
  final String _sessionId = const Uuid().v4();
  DateTime? _sessionStartTime;
  final List<VoiceCallTool> _toolsUsed = [];
  bool _sessionSaved = false;

  @override
  void initState() {
    super.initState();

    // Slow background animation
    _backgroundController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();

    // Text fade animation
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();

    // Connect to realtime API via WebRTC
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _voiceService = ref.read(realtimeVoiceWebRTCProvider.notifier);
      _voiceService?.connect();
      _sessionStartTime = DateTime.now();
    });
  }

  @override
  void dispose() {
    // Save call session to history before disconnecting (no toast in dispose)
    // Toast is shown in _handleClose when user manually closes
    _saveCallSession(showToast: false);

    // Disconnect using cached reference (safe after unmount)
    _voiceService?.disconnect();
    _voiceService = null;

    _backgroundController.dispose();
    _textController.dispose();
    _inputController.dispose();
    _inputFocusNode.dispose();

    super.dispose();
  }

  /// Save the current call session to history
  /// Returns true if session was saved, false if there was nothing to save
  bool _saveCallSession({bool showToast = false}) {
    if (_sessionSaved) return false;
    _sessionSaved = true;

    // Get the final state before disconnect
    final voiceState = ref.read(realtimeVoiceWebRTCProvider);

    // Only save if there was actual conversation
    if (voiceState.turns.isEmpty && !voiceState.analytics.userHasSpoken) {
      return false;
    }

    final now = DateTime.now();
    final sessionStart = _sessionStartTime ?? now;
    final duration = now.difference(sessionStart);

    // Convert turns to VoiceCallTurn format
    final turns = voiceState.turns.map((turn) {
      return VoiceCallTurn(
        id: turn.id,
        role: turn.role,
        transcript: turn.transcript,
        timestamp: turn.timestamp,
      );
    }).toList();

    // Create the session
    final session = VoiceCallSession(
      id: _sessionId,
      startedAt: sessionStart,
      endedAt: now,
      duration: duration,
      turns: turns,
      toolsUsed: _toolsUsed,
      summary: null, // Will be generated from turns in displaySummary
      userTurnCount: voiceState.analytics.userTurnCount,
      assistantTurnCount: voiceState.analytics.assistantTurnCount,
      userSpoke: voiceState.analytics.userHasSpoken,
    );

    // Save to call history (fire and forget)
    ref.read(callHistoryProvider.notifier).saveCallSession(session);

    // Show toast confirmation if requested and context is still valid
    if (showToast && mounted) {
      _showCallSavedToast(duration);
    }

    return true;
  }

  /// Show a premium toast notification that the call was saved
  void _showCallSavedToast(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    final durationText = minutes > 0 ? '${minutes}m ${seconds}s' : '${seconds}s';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.check_circle_outline,
                color: LuxuryColors.rolexGreen,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Call Saved',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'Duration: $durationText',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: LuxuryColors.obsidian,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
          ),
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _handleClose() {
    HapticFeedback.lightImpact();
    // Save the call session with toast notification before closing
    _saveCallSession(showToast: true);
    Navigator.of(context).pop();
  }

  void _handleOrbTap() {
    HapticFeedback.mediumImpact();
    final service = ref.read(realtimeVoiceWebRTCProvider.notifier);
    final state = ref.read(realtimeVoiceWebRTCProvider);

    if (state.state == RealtimeVoiceState.listening) {
      service.stopListening();
    } else if (state.state == RealtimeVoiceState.connected ||
        state.state == RealtimeVoiceState.speaking) {
      // Interrupt if assistant is speaking
      if (state.isAssistantSpeaking) {
        service.interrupt();
      }
      service.startListening();
    }
  }

  void _handleTextSubmit(String text) {
    if (text.trim().isEmpty) return;
    HapticFeedback.lightImpact();
    // For now, just start voice - text input could be added later
    _inputController.clear();
    _inputFocusNode.unfocus();
    _handleOrbTap();
  }

  String _getGreetingName() {
    final user = ref.watch(currentUserProvider);
    if (user == null) return 'there';

    // Get first name only
    final fullName = user.fullName;
    final firstName = fullName.split(' ').first;
    return firstName;
  }

  @override
  Widget build(BuildContext context) {
    final voiceState = ref.watch(realtimeVoiceWebRTCProvider);
    final screenSize = MediaQuery.of(context).size;
    final isTablet = screenSize.width > 600;

    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      resizeToAvoidBottomInset: false,
      body: Stack(
        children: [
          // Animated dark gradient background
          _buildAnimatedBackground(voiceState),

          // Particle/star effect overlay
          _buildParticleOverlay(),

          // Main content
          SafeArea(
            child: Column(
              children: [
                // Header with close button
                _buildHeader(voiceState),

                const Spacer(flex: 2),

                // Personalized greeting
                _buildGreeting(voiceState),

                const SizedBox(height: 8),

                // Subtitle
                _buildSubtitle(voiceState),

                const SizedBox(height: 48),

                // Central animated orb
                AnimatedVoiceOrb(
                  isListening: voiceState.state == RealtimeVoiceState.listening,
                  isSpeaking: voiceState.isAssistantSpeaking,
                  isProcessing: voiceState.state == RealtimeVoiceState.processing,
                  isConnecting: voiceState.state == RealtimeVoiceState.connecting,
                  audioLevel: voiceState.state == RealtimeVoiceState.listening
                      ? voiceState.inputLevel
                      : voiceState.outputLevel,
                  onTap: _handleOrbTap,
                  size: isTablet ? 280 : 220,
                ),

                const SizedBox(height: 32),

                // Status indicator text
                _buildStatusText(voiceState),

                const Spacer(flex: 2),

                // Transcript area (compact)
                if (voiceState.currentTranscript != null ||
                    voiceState.turns.isNotEmpty)
                  _buildTranscriptArea(voiceState),

                // Frosted glass input field
                _buildFrostedInput(voiceState),

                SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedBackground(RealtimeConversationState voiceState) {
    final isActive = voiceState.isUserSpeaking || voiceState.isAssistantSpeaking;
    final isSpeaking = voiceState.isAssistantSpeaking;

    return AnimatedBuilder(
      animation: _backgroundController,
      builder: (context, child) {
        final animValue = _backgroundController.value;

        // Determine glow color based on state
        Color glowColor;
        if (isSpeaking) {
          glowColor = LuxuryColors.champagneGold;
        } else if (voiceState.state == RealtimeVoiceState.listening) {
          glowColor = LuxuryColors.jadePremium;
        } else {
          glowColor = LuxuryColors.rolexGreen;
        }

        return Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(
                0.0 + (animValue * 0.2 - 0.1),
                -0.3 + (animValue * 0.1 - 0.05),
              ),
              radius: 1.8,
              colors: [
                glowColor.withValues(alpha: isActive ? 0.15 : 0.08),
                LuxuryColors.obsidian.withValues(alpha: 0.95),
                LuxuryColors.richBlack,
              ],
              stops: const [0.0, 0.4, 1.0],
            ),
          ),
        );
      },
    );
  }

  Widget _buildParticleOverlay() {
    // Subtle star/particle effect
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _backgroundController,
        builder: (context, child) {
          return CustomPaint(
            painter: _StarFieldPainter(
              animation: _backgroundController.value,
            ),
            size: Size.infinite,
          );
        },
      ),
    );
  }

  Widget _buildHeader(RealtimeConversationState voiceState) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          // Close button
          GestureDetector(
            onTap: _handleClose,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
              child: Icon(
                Icons.close,
                color: Colors.white.withValues(alpha: 0.7),
                size: 22,
              ),
            ),
          ),

          const Spacer(),

          // Connection indicator
          _buildConnectionPill(voiceState),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2, end: 0);
  }

  Widget _buildConnectionPill(RealtimeConversationState voiceState) {
    Color color;
    String label;

    switch (voiceState.state) {
      case RealtimeVoiceState.connected:
      case RealtimeVoiceState.listening:
      case RealtimeVoiceState.speaking:
        color = LuxuryColors.jadePremium;
        label = 'Connected';
        break;
      case RealtimeVoiceState.connecting:
        color = LuxuryColors.champagneGold;
        label = 'Connecting';
        break;
      case RealtimeVoiceState.processing:
        color = LuxuryColors.champagneGold;
        label = 'Processing';
        break;
      case RealtimeVoiceState.error:
        color = LuxuryColors.errorRuby;
        label = 'Error';
        break;
      default:
        color = Colors.grey;
        label = 'Offline';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.5),
                  blurRadius: 6,
                  spreadRadius: 1,
                ),
              ],
            ),
          )
              .animate(
                onPlay: (controller) => controller.repeat(reverse: true),
              )
              .scale(
                begin: const Offset(1, 1),
                end: const Offset(1.2, 1.2),
                duration: 1000.ms,
              ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGreeting(RealtimeConversationState voiceState) {
    final name = _getGreetingName();

    return Text(
      'Hello $name',
      style: TextStyle(
        color: Colors.white.withValues(alpha: 0.95),
        fontSize: 32,
        fontWeight: FontWeight.w300,
        letterSpacing: -0.5,
      ),
    )
        .animate(controller: _textController)
        .fadeIn(duration: 600.ms, delay: 200.ms)
        .slideY(begin: 0.2, end: 0);
  }

  Widget _buildSubtitle(RealtimeConversationState voiceState) {
    String text;
    Color color = Colors.white.withValues(alpha: 0.5);

    if (voiceState.state == RealtimeVoiceState.connecting) {
      text = 'Connecting to SalesOS...';
    } else if (voiceState.state == RealtimeVoiceState.error) {
      text = voiceState.errorMessage ?? 'Connection error';
      color = LuxuryColors.errorRuby.withValues(alpha: 0.8);
    } else {
      text = 'How can I help you today?';
    }

    return Text(
      text,
      style: TextStyle(
        color: color,
        fontSize: 18,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.2,
      ),
    )
        .animate(controller: _textController)
        .fadeIn(duration: 600.ms, delay: 400.ms)
        .slideY(begin: 0.2, end: 0);
  }

  Widget _buildStatusText(RealtimeConversationState voiceState) {
    String text;
    Color color;

    if (voiceState.state == RealtimeVoiceState.listening) {
      text = 'Listening...';
      color = LuxuryColors.jadePremium;
    } else if (voiceState.isAssistantSpeaking) {
      text = 'SalesOS is responding';
      color = LuxuryColors.champagneGold;
    } else if (voiceState.state == RealtimeVoiceState.processing) {
      text = 'Thinking...';
      color = LuxuryColors.champagneGold;
    } else if (voiceState.state == RealtimeVoiceState.connected) {
      text = 'Tap the orb or speak';
      color = Colors.white.withValues(alpha: 0.4);
    } else if (voiceState.state == RealtimeVoiceState.connecting) {
      text = 'Initializing voice...';
      color = Colors.white.withValues(alpha: 0.4);
    } else {
      text = '';
      color = Colors.transparent;
    }

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: Text(
        text,
        key: ValueKey(text),
        style: TextStyle(
          color: color,
          fontSize: 14,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildTranscriptArea(RealtimeConversationState voiceState) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 120),
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
        ),
      ),
      child: SingleChildScrollView(
        reverse: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Show current transcript if available
            if (voiceState.currentTranscript != null &&
                voiceState.currentTranscript!.isNotEmpty)
              Text(
                voiceState.currentTranscript!,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontSize: 15,
                  height: 1.5,
                ),
              ),

            // Show recent turns if no current transcript
            if (voiceState.currentTranscript == null &&
                voiceState.turns.isNotEmpty)
              ...voiceState.turns.reversed.take(2).map((turn) {
                final isUser = turn.role == 'user';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        isUser ? Iconsax.user : Iconsax.magic_star,
                        color: isUser
                            ? LuxuryColors.platinum
                            : LuxuryColors.champagneGold,
                        size: 14,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          turn.transcript ?? '...',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 14,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1, end: 0);
  }

  Widget _buildFrostedInput(RealtimeConversationState voiceState) {
    final isConnected = voiceState.state == RealtimeVoiceState.connected ||
        voiceState.state == RealtimeVoiceState.listening ||
        voiceState.state == RealtimeVoiceState.speaking;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(28),
            ),
            child: Row(
              children: [
                const SizedBox(width: 20),

                // Text input
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    focusNode: _inputFocusNode,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 16,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Ask anything...',
                      hintStyle: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                      ),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                    ),
                    onSubmitted: _handleTextSubmit,
                    enabled: isConnected,
                  ),
                ),

                // Mic button
                GestureDetector(
                  onTap: isConnected ? _handleOrbTap : null,
                  child: Container(
                    width: 44,
                    height: 44,
                    margin: const EdgeInsets.only(right: 6),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: voiceState.state == RealtimeVoiceState.listening
                            ? [
                                LuxuryColors.errorRuby,
                                LuxuryColors.errorRuby.withValues(alpha: 0.8),
                              ]
                            : [
                                LuxuryColors.rolexGreen,
                                LuxuryColors.deepEmerald,
                              ],
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: (voiceState.state == RealtimeVoiceState.listening
                                  ? LuxuryColors.errorRuby
                                  : LuxuryColors.rolexGreen)
                              .withValues(alpha: 0.4),
                          blurRadius: 12,
                          spreadRadius: 0,
                        ),
                      ],
                    ),
                    child: Icon(
                      voiceState.state == RealtimeVoiceState.listening
                          ? Icons.stop_rounded
                          : Iconsax.microphone_25,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms, delay: 600.ms)
        .slideY(begin: 0.3, end: 0);
  }
}

/// Custom painter for subtle star field background effect
class _StarFieldPainter extends CustomPainter {
  final double animation;

  _StarFieldPainter({required this.animation});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.15)
      ..style = PaintingStyle.fill;

    // Create a deterministic "random" star field
    final starCount = 50;
    for (int i = 0; i < starCount; i++) {
      // Use sine/cosine for pseudo-random positions
      final seed = i * 137.5; // Golden angle
      final x = (seed % size.width);
      final y = ((seed * 0.618) % size.height);

      // Twinkle effect
      final twinkle = (0.3 + 0.7 * ((animation + i * 0.02) % 1.0)).abs();
      paint.color = Colors.white.withValues(alpha: 0.05 * twinkle);

      final starSize = 1.0 + (i % 3) * 0.5;
      canvas.drawCircle(Offset(x, y), starSize, paint);
    }
  }

  @override
  bool shouldRepaint(_StarFieldPainter oldDelegate) {
    return oldDelegate.animation != animation;
  }
}
