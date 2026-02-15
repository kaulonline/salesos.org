import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../data/coaching_service.dart';
import '../widgets/coaching_feedback_card.dart';

/// Active session state
enum SessionState {
  idle,
  recording,
  submitting,
  analyzed,
}

class CoachingSessionPage extends ConsumerStatefulWidget {
  final String sessionId;

  const CoachingSessionPage({
    super.key,
    required this.sessionId,
  });

  @override
  ConsumerState<CoachingSessionPage> createState() => _CoachingSessionPageState();
}

class _CoachingSessionPageState extends ConsumerState<CoachingSessionPage> {
  SessionState _state = SessionState.idle;
  Timer? _timer;
  int _elapsedSeconds = 0;

  // Mock feedback data (would come from API in production)
  int? _score;
  String? _feedbackText;
  List<String> _strengths = [];
  List<String> _weaknesses = [];
  List<String> _suggestions = [];

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startRecording() {
    HapticFeedback.mediumImpact();
    setState(() {
      _state = SessionState.recording;
      _elapsedSeconds = 0;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _elapsedSeconds++;
      });
    });
  }

  void _stopRecording() {
    HapticFeedback.mediumImpact();
    _timer?.cancel();
    setState(() {
      _state = SessionState.idle;
    });
  }

  Future<void> _submitForAnalysis() async {
    HapticFeedback.mediumImpact();
    setState(() {
      _state = SessionState.submitting;
    });

    // Simulate AI analysis delay
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _state = SessionState.analyzed;
      _score = 72;
      _feedbackText = 'Good presentation skills with room for improvement in objection handling. '
          'Your opening was strong and engaging.';
      _strengths = [
        'Clear and confident delivery',
        'Good use of product knowledge',
        'Strong opening hook',
      ];
      _weaknesses = [
        'Could improve objection handling',
        'Missed opportunity for discovery questions',
        'Closing could be more assertive',
      ];
      _suggestions = [
        'Practice the LAER method for handling objections',
        'Ask 2-3 discovery questions before presenting solutions',
        'Use assumptive close techniques more frequently',
      ];
    });

    // Invalidate sessions to reflect completed state
    ref.invalidate(coachingSessionsProvider);
    ref.invalidate(coachingProgressProvider);
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Coaching Session',
        showBackButton: true,
        onBackPressed: () => context.pop(),
      ),
      body: SafeArea(
        child: _state == SessionState.analyzed
            ? _buildAnalyzedView(isDark)
            : _buildRecordingView(isDark),
      ),
    );
  }

  Widget _buildRecordingView(bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Timer display
        LuxuryCard(
          padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
          child: Column(
            children: [
              // Recording indicator
              if (_state == SessionState.recording)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: LuxuryColors.errorRuby,
                        shape: BoxShape.circle,
                      ),
                    ).animate(onPlay: (c) => c.repeat(reverse: true))
                        .fadeIn(duration: 600.ms)
                        .then()
                        .fadeOut(duration: 600.ms),
                    const SizedBox(width: 8),
                    Text(
                      'Recording',
                      style: IrisTheme.labelMedium.copyWith(
                        color: LuxuryColors.errorRuby,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                )
              else if (_state == SessionState.submitting)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          LuxuryColors.champagneGold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Analyzing...',
                      style: IrisTheme.labelMedium.copyWith(
                        color: LuxuryColors.champagneGold,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                )
              else
                Text(
                  'Ready to Record',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              const SizedBox(height: 20),

              // Timer
              Text(
                _formatDuration(_elapsedSeconds),
                style: IrisTheme.numericLarge.copyWith(
                  color: _state == SessionState.recording
                      ? LuxuryColors.errorRuby
                      : (isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary),
                  fontSize: 64,
                ),
              ),
              const SizedBox(height: 24),

              // Recording controls
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_state == SessionState.idle || _state == SessionState.recording)
                    GestureDetector(
                      onTap: _state == SessionState.recording
                          ? _stopRecording
                          : _startRecording,
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _state == SessionState.recording
                              ? LuxuryColors.errorRuby
                              : LuxuryColors.rolexGreen,
                          boxShadow: [
                            BoxShadow(
                              color: (_state == SessionState.recording
                                      ? LuxuryColors.errorRuby
                                      : LuxuryColors.rolexGreen)
                                  .withValues(alpha: 0.3),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Icon(
                          _state == SessionState.recording
                              ? Iconsax.stop5
                              : Iconsax.microphone,
                          size: 32,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ).animate().fadeIn(duration: 400.ms),
        const SizedBox(height: 20),

        // Submit button (visible after recording)
        if (_elapsedSeconds > 0 && _state != SessionState.recording && _state != SessionState.submitting)
          IrisButton(
            label: 'Submit for AI Analysis',
            icon: Iconsax.cpu,
            variant: IrisButtonVariant.emerald,
            isFullWidth: true,
            onPressed: _submitForAnalysis,
          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1),

        if (_state == SessionState.submitting) ...[
          const SizedBox(height: 20),
          LuxuryCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      LuxuryColors.champagneGold,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'AI is analyzing your session...',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This may take a moment',
                  style: IrisTheme.caption.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 300.ms),
        ],

        // Tips card
        if (_state == SessionState.idle && _elapsedSeconds == 0) ...[
          const SizedBox(height: 16),
          LuxuryCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: LuxuryColors.infoCobalt.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.lamp_on,
                        size: 18,
                        color: LuxuryColors.infoCobalt,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Tips',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _TipItem(
                  text: 'Speak clearly and at a natural pace',
                  isDark: isDark,
                ),
                _TipItem(
                  text: 'Practice your pitch as if talking to a real prospect',
                  isDark: isDark,
                ),
                _TipItem(
                  text: 'AI will analyze tone, content, and delivery',
                  isDark: isDark,
                ),
              ],
            ),
          ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.05),
        ],
      ],
    );
  }

  Widget _buildAnalyzedView(bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Session summary
        LuxuryCard(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Iconsax.clock, size: 18, color: LuxuryColors.warmGray),
              const SizedBox(width: 8),
              Text(
                'Session Duration: ${_formatDuration(_elapsedSeconds)}',
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 300.ms),
        const SizedBox(height: 16),

        // Feedback card
        if (_score != null)
          CoachingFeedbackCard(
            score: _score!,
            feedback: _feedbackText,
            strengths: _strengths,
            weaknesses: _weaknesses,
            suggestions: _suggestions,
          ),
        const SizedBox(height: 20),

        // Try again button
        IrisButton(
          label: 'Start New Session',
          icon: Iconsax.refresh,
          variant: IrisButtonVariant.outline,
          isFullWidth: true,
          onPressed: () {
            setState(() {
              _state = SessionState.idle;
              _elapsedSeconds = 0;
              _score = null;
              _feedbackText = null;
              _strengths = [];
              _weaknesses = [];
              _suggestions = [];
            });
          },
        ).animate(delay: 600.ms).fadeIn().slideY(begin: 0.1),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _TipItem extends StatelessWidget {
  final String text;
  final bool isDark;

  const _TipItem({
    required this.text,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(top: 6),
            decoration: BoxDecoration(
              color: LuxuryColors.infoCobalt.withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
