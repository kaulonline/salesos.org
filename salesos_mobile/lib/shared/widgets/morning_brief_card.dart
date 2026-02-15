import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../core/config/theme.dart';
import '../../core/config/routes.dart';
import '../../core/network/api_client.dart';
import '../../core/services/morning_brief_service.dart';
import '../../core/services/ai_email_draft_service.dart';
import 'email_draft_sheet.dart';
import 'luxury_card.dart';

/// Morning Brief Card - Premium AI-synthesized daily summary
/// Redesigned with premium SalesOS aesthetics
class MorningBriefCard extends ConsumerWidget {
  final bool compact;
  final VoidCallback? onTapExpand;
  final bool showHeader;

  const MorningBriefCard({
    super.key,
    this.compact = false,
    this.onTapExpand,
    this.showHeader = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final briefAsync = ref.watch(morningBriefProvider);

    return briefAsync.when(
      loading: () => _PremiumLoadingState(isDark: isDark),
      error: (e, _) => _PremiumErrorState(isDark: isDark, ref: ref),
      data: (brief) => compact
          ? _PremiumCompactCard(
              brief: brief,
              isDark: isDark,
              onTap: onTapExpand,
              showHeader: showHeader,
            )
          : _PremiumFullCard(
              brief: brief,
              isDark: isDark,
              ref: ref,
              showHeader: showHeader,
            ),
    );
  }
}

/// Premium loading state with elegant shimmer
class _PremiumLoadingState extends StatelessWidget {
  final bool isDark;

  const _PremiumLoadingState({required this.isDark});

  @override
  Widget build(BuildContext context) {
    // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0D0D12) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _shimmerBox(48, 48, 14),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _shimmerBox(140, 16, 4),
                        const SizedBox(height: 8),
                        _shimmerBox(200, 12, 4),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _shimmerBox(double.infinity, 80, 12),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _shimmerBox(double.infinity, 70, 12)),
                  const SizedBox(width: 12),
                  Expanded(child: _shimmerBox(double.infinity, 70, 12)),
                  const SizedBox(width: 12),
                  Expanded(child: _shimmerBox(double.infinity, 70, 12)),
                ],
              ),
            ],
          ),
        )
            .animate(onPlay: (c) => c.repeat())
            .shimmer(duration: 1500.ms, color: isDark ? Colors.white10 : Colors.black12),
      ),
    );
  }

  Widget _shimmerBox(double width, double height, double radius) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

/// Premium error state
class _PremiumErrorState extends StatelessWidget {
  final bool isDark;
  final WidgetRef ref;

  const _PremiumErrorState({required this.isDark, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0D0D12) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: IrisTheme.warning.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: IrisTheme.warning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Iconsax.warning_2, color: IrisTheme.warning, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Unable to load brief',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Tap to retry',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white54 : Colors.black54,
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              ref.invalidate(morningBriefProvider);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                ),
              ),
              child: Text(
                'RETRY',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                  color: LuxuryColors.rolexGreen,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Premium compact card for dashboard summary
class _PremiumCompactCard extends StatelessWidget {
  final MorningBrief brief;
  final bool isDark;
  final VoidCallback? onTap;
  final bool showHeader;

  const _PremiumCompactCard({
    required this.brief,
    required this.isDark,
    this.onTap,
    required this.showHeader,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0D0D12) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            if (showHeader) ...[
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LuxuryColors.emeraldGradient,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Iconsax.sun_1, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 14),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    brief.greeting,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    brief.summary,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white60 : Colors.black54,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Iconsax.arrow_right_3,
                size: 16,
                color: LuxuryColors.rolexGreen,
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

/// Premium full card with luxury design - Animated Wave Gradient (BuildCrew-inspired)
class _PremiumFullCard extends StatefulWidget {
  final MorningBrief brief;
  final bool isDark;
  final WidgetRef ref;
  final bool showHeader;

  const _PremiumFullCard({
    required this.brief,
    required this.isDark,
    required this.ref,
    required this.showHeader,
  });

  @override
  State<_PremiumFullCard> createState() => _PremiumFullCardState();
}

class _PremiumFullCardState extends State<_PremiumFullCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _waveController;

  // BuildCrew-inspired color palette (dark greens/grays)
  static const _darkColors = [
    Color(0xFF131513), // Primary dark
    Color(0xFF1A1F1A), // Dark green-gray
    Color(0xFF242924), // Mid dark
    Color(0xFF0D0F0D), // Near black
  ];

  static const _lightColors = [
    Color(0xFFF5F7F5), // Soft white-green
    Color(0xFFECF0EC), // Light gray-green
    Color(0xFFE8ECE8), // Subtle green-gray
    Color(0xFFF8FAF8), // Near white
  ];

  @override
  void initState() {
    super.initState();
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8), // Smooth wave cycle
    )..repeat();
  }

  @override
  void dispose() {
    _waveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _waveController,
      builder: (context, child) {
        final progress = _waveController.value;

        return Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: LuxuryColors.rolexGreen.withValues(alpha: widget.isDark ? 0.25 : 0.15),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.rolexGreen.withValues(alpha: widget.isDark ? 0.12 : 0.06),
                blurRadius: 40,
                offset: const Offset(0, 10),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: widget.isDark ? 0.3 : 0.08),
                blurRadius: 60,
                offset: const Offset(0, 20),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Animated wave gradient background
              Positioned.fill(
                child: CustomPaint(
                  painter: _WaveGradientPainter(
                    progress: progress,
                    isDark: widget.isDark,
                    darkColors: _darkColors,
                    lightColors: _lightColors,
                  ),
                ),
              ),
              // Emerald accent glow - top right (animated position)
              Positioned(
                top: -60 + (20 * _wave(progress)),
                right: -40 + (15 * _wave(progress + 0.3)),
                child: Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        LuxuryColors.rolexGreen.withValues(alpha: widget.isDark ? 0.12 : 0.06),
                        LuxuryColors.rolexGreen.withValues(alpha: widget.isDark ? 0.04 : 0.02),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              ),
              // Secondary accent glow - bottom left (animated)
              Positioned(
                bottom: -40 + (15 * _wave(progress + 0.5)),
                left: -30 + (10 * _wave(progress + 0.7)),
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        const Color(0xFF3d4739).withValues(alpha: widget.isDark ? 0.15 : 0.08),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
              // Main content
              child!,
            ],
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Premium Header
          if (widget.showHeader) _buildPremiumHeader(context),

          // AI Insight Panel
          Padding(
            padding: EdgeInsets.fromLTRB(20, widget.showHeader ? 0 : 20, 20, 0),
            child: _buildAIInsightPanel(),
          ),

          // Premium Metric Tiles
          Padding(
            padding: const EdgeInsets.all(20),
            child: _buildPremiumMetrics(context),
          ),

          // Priority Sections
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _buildPrioritySections(context),
          ),

          // Quick Actions
          Padding(
            padding: const EdgeInsets.all(20),
            child: _buildPremiumQuickActions(context),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  // Smooth wave function for organic movement
  double _wave(double t) {
    return math.sin(t * 2 * math.pi);
  }

  Widget _buildPremiumHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: widget.isDark
                ? Colors.white.withValues(alpha: 0.06)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ),
      ),
      child: Row(
        children: [
          // Luxury icon with emerald gradient
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: LuxuryColors.emeraldGradient,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(Iconsax.sun_1, color: Colors.white, size: 26),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'MORNING BRIEF',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                        color: widget.isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(width: 10),
                    // AI Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        gradient: LuxuryColors.emeraldGradient,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Iconsax.magic_star, size: 10, color: Colors.white),
                          const SizedBox(width: 4),
                          const Text(
                            'AI',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  _formatTime(widget.brief.generatedAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: widget.isDark ? Colors.white38 : Colors.black38,
                  ),
                ),
              ],
            ),
          ),
          // Refresh button
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              widget.ref.invalidate(morningBriefProvider);
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: widget.isDark
                    ? Colors.white.withValues(alpha: 0.06)
                    : Colors.black.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: widget.isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.06),
                ),
              ),
              child: Icon(
                Iconsax.refresh,
                size: 18,
                color: widget.isDark ? Colors.white54 : Colors.black45,
              ),
            ),
          ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn().slideY(begin: -0.1);
  }

  Widget _buildAIInsightPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            LuxuryColors.rolexGreen.withValues(alpha: 0.12),
            LuxuryColors.rolexGreen.withValues(alpha: 0.06),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.rolexGreen.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Iconsax.magic_star,
              size: 18,
              color: LuxuryColors.rolexGreen,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI INSIGHT',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    color: LuxuryColors.rolexGreen,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  widget.brief.summary,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: widget.isDark ? Colors.white.withValues(alpha: 0.9) : Colors.black87,
                    decoration: TextDecoration.none,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate(delay: 150.ms).fadeIn().slideX(begin: 0.05);
  }

  Widget _buildPremiumMetrics(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _PremiumMetricTile(
            icon: Iconsax.profile_2user,
            value: widget.brief.priorityContactsCount.toString(),
            label: 'Priority',
            color: LuxuryColors.rolexGreen,
            isDark: widget.isDark,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PremiumMetricTile(
            icon: Iconsax.danger,
            value: widget.brief.atRiskDealsCount.toString(),
            label: 'At Risk',
            color: const Color(0xFFE5A623), // Luxury amber/gold warning
            isDark: widget.isDark,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PremiumMetricTile(
            icon: Iconsax.task_square,
            value: widget.brief.pendingTasksCount.toString(),
            label: 'Tasks',
            color: const Color(0xFF5B8DEF), // Premium blue
            isDark: widget.isDark,
          ),
        ),
      ],
    ).animate(delay: 200.ms).fadeIn();
  }

  Widget _buildPrioritySections(BuildContext context) {
    final sections = widget.brief.sections.take(3).toList();
    if (sections.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section header
        Row(
          children: [
            Container(
              width: 4,
              height: 16,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'TODAY\'S PRIORITIES',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
                color: widget.isDark ? Colors.white54 : Colors.black45,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        // Priority items
        ...sections.asMap().entries.map((entry) {
          final index = entry.key;
          final section = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _PremiumSectionTile(
              section: section,
              isDark: widget.isDark,
              onTap: () {
                if (section.actionRoute != null) {
                  HapticFeedback.lightImpact();
                  _handleSectionTap(context, section);
                }
              },
            ).animate(delay: (250 + index * 50).ms).fadeIn().slideX(begin: 0.03),
          );
        }),
      ],
    );
  }

  Widget _buildPremiumQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Divider
        Container(
          height: 1,
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                widget.isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.08),
                Colors.transparent,
              ],
            ),
          ),
        ),
        Row(
          children: [
            Expanded(
              child: _PremiumActionButton(
                label: 'Contacts',
                icon: Iconsax.profile_2user,
                onTap: () => context.push(AppRoutes.contacts),
                isDark: widget.isDark,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _PremiumActionButton(
                label: 'Deals',
                icon: Iconsax.briefcase,
                onTap: () => context.push(AppRoutes.deals),
                isDark: widget.isDark,
                isPrimary: true,
              ),
            ),
          ],
        ),
      ],
    ).animate(delay: 350.ms).fadeIn();
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    if (now.day == date.day && now.month == date.month && now.year == date.year) {
      return 'Generated today at ${DateFormat.jm().format(date)}';
    }
    return 'Generated ${DateFormat('MMM d').format(date)} at ${DateFormat.jm().format(date)}';
  }

  void _handleSectionTap(BuildContext context, BriefSection section) {
    final route = section.actionRoute;
    if (route == null) return;

    if (route.startsWith('priorities://')) {
      final priorityType = route.replaceFirst('priorities://', '');
      _showPriorityBottomSheet(context, priorityType, section);
    } else {
      context.push(route);
    }
  }

  void _showPriorityBottomSheet(
    BuildContext context,
    String priorityType,
    BriefSection section,
  ) {
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: _PremiumPrioritySheet(
                priorityType: priorityType,
                section: section,
                isDark: widget.isDark,
              ),
            ),
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

/// Custom painter for animated wave gradient background (BuildCrew-inspired)
class _WaveGradientPainter extends CustomPainter {
  final double progress;
  final bool isDark;
  final List<Color> darkColors;
  final List<Color> lightColors;

  _WaveGradientPainter({
    required this.progress,
    required this.isDark,
    required this.darkColors,
    required this.lightColors,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final colors = isDark ? darkColors : lightColors;
    final rect = Offset.zero & size;

    // Base gradient - shifts with animation
    final baseGradient = LinearGradient(
      begin: Alignment(-1 + progress * 0.5, -1 + progress * 0.3),
      end: Alignment(1 - progress * 0.3, 1 - progress * 0.2),
      colors: colors,
      stops: const [0.0, 0.35, 0.65, 1.0],
    );

    final basePaint = Paint()..shader = baseGradient.createShader(rect);
    canvas.drawRect(rect, basePaint);

    // Animated blob 1 - top area
    _drawAnimatedBlob(
      canvas,
      size,
      center: Offset(
        size.width * (0.7 + 0.2 * math.sin(progress * 2 * math.pi)),
        size.height * (0.2 + 0.1 * math.cos(progress * 2 * math.pi)),
      ),
      radius: size.width * 0.4,
      color: isDark
          ? const Color(0xFF1E2A1E).withValues(alpha: 0.6)
          : const Color(0xFFE8F0E8).withValues(alpha: 0.5),
    );

    // Animated blob 2 - bottom area
    _drawAnimatedBlob(
      canvas,
      size,
      center: Offset(
        size.width * (0.3 + 0.15 * math.cos(progress * 2 * math.pi + 1)),
        size.height * (0.8 + 0.1 * math.sin(progress * 2 * math.pi + 1)),
      ),
      radius: size.width * 0.35,
      color: isDark
          ? const Color(0xFF2A352A).withValues(alpha: 0.5)
          : const Color(0xFFE0EAE0).withValues(alpha: 0.4),
    );

    // Subtle emerald accent blob
    _drawAnimatedBlob(
      canvas,
      size,
      center: Offset(
        size.width * (0.9 + 0.08 * math.sin(progress * 2 * math.pi + 2)),
        size.height * (0.1 + 0.05 * math.cos(progress * 2 * math.pi + 2)),
      ),
      radius: size.width * 0.25,
      color: isDark
          ? LuxuryColors.rolexGreen.withValues(alpha: 0.08)
          : LuxuryColors.rolexGreen.withValues(alpha: 0.04),
    );
  }

  void _drawAnimatedBlob(
    Canvas canvas,
    Size size, {
    required Offset center,
    required double radius,
    required Color color,
  }) {
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          color,
          color.withValues(alpha: color.a * 0.5),
          Colors.transparent,
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(
        Rect.fromCircle(center: center, radius: radius),
      )
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 40);

    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_WaveGradientPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.isDark != isDark;
  }
}

/// Premium metric tile
class _PremiumMetricTile extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  final bool isDark;

  const _PremiumMetricTile({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Premium section tile
class _PremiumSectionTile extends StatelessWidget {
  final BriefSection section;
  final bool isDark;
  final VoidCallback? onTap;

  const _PremiumSectionTile({
    required this.section,
    required this.isDark,
    this.onTap,
  });

  IconData get _icon {
    switch (section.icon) {
      case 'user_check':
        return Iconsax.user_tick;
      case 'warning':
        return Iconsax.danger;
      case 'task':
        return Iconsax.task_square;
      case 'calendar':
        return Iconsax.calendar_1;
      case 'trending_up':
        return Iconsax.trend_up;
      default:
        return Iconsax.star_1;
    }
  }

  Color get _color {
    switch (section.priority) {
      case BriefPriority.high:
        return const Color(0xFFE5A623);
      case BriefPriority.normal:
        return const Color(0xFF5B8DEF);
      case BriefPriority.low:
        return LuxuryColors.rolexGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.04)
              : Colors.black.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_icon, size: 20, color: _color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    section.title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                      decoration: TextDecoration.none,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    section.content,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white54 : Colors.black54,
                      height: 1.3,
                      decoration: TextDecoration.none,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (section.actionRoute != null) ...[
              const SizedBox(width: 12),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: _color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Iconsax.arrow_right_3,
                  size: 14,
                  color: _color,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Premium action button
class _PremiumActionButton extends StatefulWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool isDark;
  final bool isPrimary;

  const _PremiumActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
    required this.isDark,
    this.isPrimary = false,
  });

  @override
  State<_PremiumActionButton> createState() => _PremiumActionButtonState();
}

class _PremiumActionButtonState extends State<_PremiumActionButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: () {
        HapticFeedback.lightImpact();
        widget.onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          gradient: widget.isPrimary ? LuxuryColors.emeraldGradient : null,
          color: widget.isPrimary
              ? null
              : (widget.isDark
                  ? Colors.white.withValues(alpha: _isPressed ? 0.08 : 0.05)
                  : Colors.black.withValues(alpha: _isPressed ? 0.06 : 0.03)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: widget.isPrimary
                ? LuxuryColors.rolexGreen.withValues(alpha: 0.5)
                : (widget.isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.black.withValues(alpha: 0.08)),
          ),
          boxShadow: widget.isPrimary
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              widget.icon,
              size: 16,
              color: widget.isPrimary
                  ? Colors.white
                  : (widget.isDark ? Colors.white70 : Colors.black54),
            ),
            const SizedBox(width: 6),
            Text(
              widget.label.toUpperCase(),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.8,
                color: widget.isPrimary
                    ? Colors.white
                    : (widget.isDark ? Colors.white70 : Colors.black54),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Premium Priority Bottom Sheet
class _PremiumPrioritySheet extends ConsumerStatefulWidget {
  final String priorityType;
  final BriefSection section;
  final bool isDark;

  const _PremiumPrioritySheet({
    required this.priorityType,
    required this.section,
    required this.isDark,
  });

  @override
  ConsumerState<_PremiumPrioritySheet> createState() => _PremiumPrioritySheetState();
}

class _PremiumPrioritySheetState extends ConsumerState<_PremiumPrioritySheet> {
  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0D0D12) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: widget.isDark ? Colors.white24 : Colors.black12,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _getPriorityColor().withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    _getPriorityIcon(),
                    color: _getPriorityColor(),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.section.title,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: widget.isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.section.content,
                        style: TextStyle(
                          fontSize: 13,
                          color: widget.isDark ? Colors.white54 : Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: widget.isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Iconsax.close_circle,
                      size: 18,
                      color: widget.isDark ? Colors.white54 : Colors.black45,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Container(
            height: 1,
            color: widget.isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.06),
          ),
          Flexible(child: _buildContent()),
          // Bottom action
          Padding(
            padding: const EdgeInsets.all(20),
            child: GestureDetector(
              onTap: () {
                Navigator.pop(context);
                _navigateToFullList(context);
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: LuxuryColors.emeraldGradient,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Text(
                  'VIEW ALL ${_getFullListLabel().toUpperCase()}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.0,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getPriorityColor() {
    switch (widget.priorityType) {
      case 'at_risk_deals':
        return const Color(0xFFE5A623);
      case 'tasks_due_today':
        return const Color(0xFF5B8DEF);
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  IconData _getPriorityIcon() {
    switch (widget.priorityType) {
      case 'at_risk_deals':
        return Iconsax.danger;
      case 'tasks_due_today':
        return Iconsax.task_square;
      default:
        return Iconsax.star_1;
    }
  }

  String _getFullListLabel() {
    switch (widget.priorityType) {
      case 'at_risk_deals':
        return 'Deals';
      case 'tasks_due_today':
        return 'Tasks';
      default:
        return 'Items';
    }
  }

  void _navigateToFullList(BuildContext context) {
    switch (widget.priorityType) {
      case 'at_risk_deals':
        context.push(AppRoutes.deals);
        break;
      case 'tasks_due_today':
        context.push(AppRoutes.tasks);
        break;
    }
  }

  Widget _buildContent() {
    switch (widget.priorityType) {
      case 'at_risk_deals':
        return _buildAtRiskDealsContent();
      case 'tasks_due_today':
        return _buildTasksDueTodayContent();
      default:
        return Center(
          child: Text(
            'Unknown priority type',
            style: TextStyle(color: widget.isDark ? Colors.white54 : Colors.black54),
          ),
        );
    }
  }

  Widget _buildAtRiskDealsContent() {
    final metadata = widget.section.metadata;
    final deals = (metadata?['deals'] as List<dynamic>?) ?? [];

    if (deals.isEmpty) {
      return _buildEmptyState('No at-risk deals found');
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      shrinkWrap: true,
      itemCount: deals.length,
      itemBuilder: (context, index) {
        final deal = deals[index] as Map<String, dynamic>;
        final insights = (deal['insights'] as List<dynamic>?)?.cast<String>() ?? [];

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _PremiumEntityCard(
            name: deal['name'] as String? ?? 'Unknown Deal',
            subtitle: insights.isNotEmpty ? insights.first : 'Needs attention',
            trend: deal['trend'] as String? ?? 'at_risk',
            isDark: widget.isDark,
            icon: Iconsax.briefcase,
            onTap: () {
              Navigator.pop(context);
              context.push('${AppRoutes.deals}/${deal['id']}');
            },
            onActionTap: () {
              HapticFeedback.lightImpact();
              _showDealActions(context, deal);
            },
          ),
        ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
      },
    );
  }

  Widget _buildTasksDueTodayContent() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _fetchTodayTasks(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(40),
              child: CircularProgressIndicator(
                color: LuxuryColors.rolexGreen,
                strokeWidth: 2,
              ),
            ),
          );
        }

        final tasks = snapshot.data ?? [];
        if (tasks.isEmpty) {
          return _buildEmptyState('No tasks due today');
        }

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          shrinkWrap: true,
          itemCount: tasks.length,
          itemBuilder: (context, index) {
            final task = tasks[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _PremiumEntityCard(
                name: task['subject'] as String? ?? task['title'] as String? ?? 'Untitled Task',
                subtitle: task['relatedTo'] as String? ?? 'Due today',
                trend: 'due',
                isDark: widget.isDark,
                icon: Iconsax.task_square,
                onTap: () {
                  Navigator.pop(context);
                  context.push('${AppRoutes.tasks}/${task['id']}');
                },
                onActionTap: () {
                  HapticFeedback.lightImpact();
                  _showTaskActions(context, task);
                },
              ),
            ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
          },
        );
      },
    );
  }

  Future<List<Map<String, dynamic>>> _fetchTodayTasks() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.get('/tasks?filter=due_today');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is List) {
          return data.cast<Map<String, dynamic>>().take(5).toList();
        } else if (data is Map && data['tasks'] != null) {
          return (data['tasks'] as List).cast<Map<String, dynamic>>().take(5).toList();
        }
      }
    } catch (e) {
      // Silently ignore
    }
    return [];
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Iconsax.tick_circle,
                size: 32,
                color: LuxuryColors.rolexGreen,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: widget.isDark ? Colors.white70 : Colors.black54,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDealActions(BuildContext context, Map<String, dynamic> deal) {
    final dealName = deal['name'] as String? ?? 'Deal';
    final dealId = deal['id'] as String? ?? '';

    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: _PremiumActionSheet(
                title: dealName,
                isDark: widget.isDark,
                actions: [
                  _ActionItem(
                    icon: Iconsax.call,
                    label: 'Call Contact',
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('${AppRoutes.deals}/$dealId');
                    },
                  ),
                  _ActionItem(
                    icon: Iconsax.sms,
                    label: 'Draft Email',
                    onTap: () {
                      Navigator.pop(ctx);
                      showEmailDraftSheet(
                        context,
                        entityType: 'Opportunity',
                        entityId: dealId,
                        entityName: dealName,
                        initialEmailType: EmailType.followUp,
                      );
                    },
                  ),
                  _ActionItem(
                    icon: Iconsax.calendar_1,
                    label: 'Schedule Meeting',
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('${AppRoutes.meetingNew}?dealId=$dealId');
                    },
                  ),
                  _ActionItem(
                    icon: Iconsax.document_text,
                    label: 'View Deal',
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('${AppRoutes.deals}/$dealId');
                    },
                  ),
                ],
              ),
            ),
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

  void _showTaskActions(BuildContext context, Map<String, dynamic> task) {
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: _PremiumActionSheet(
                title: task['subject'] as String? ?? task['title'] as String? ?? 'Task',
                isDark: widget.isDark,
                actions: [
                  _ActionItem(
                    icon: Iconsax.tick_circle,
                    label: 'Mark Complete',
                    onTap: () => Navigator.pop(ctx),
                  ),
                  _ActionItem(
                    icon: Iconsax.clock,
                    label: 'Reschedule',
                    onTap: () => Navigator.pop(ctx),
                  ),
                  _ActionItem(
                    icon: Iconsax.edit,
                    label: 'Edit Task',
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('${AppRoutes.tasks}/${task['id']}');
                    },
                  ),
                ],
              ),
            ),
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

/// Premium entity card for priority items
class _PremiumEntityCard extends StatelessWidget {
  final String name;
  final String subtitle;
  final String trend;
  final bool isDark;
  final IconData icon;
  final VoidCallback? onTap;
  final VoidCallback? onActionTap;

  const _PremiumEntityCard({
    required this.name,
    required this.subtitle,
    required this.trend,
    required this.isDark,
    required this.icon,
    this.onTap,
    this.onActionTap,
  });

  Color get _trendColor {
    switch (trend) {
      case 'accelerating':
        return LuxuryColors.rolexGreen;
      case 'at_risk':
      case 'churning':
        return const Color(0xFFE5A623);
      case 'due':
        return const Color(0xFF5B8DEF);
      default:
        return isDark ? Colors.white38 : Colors.black38;
    }
  }

  String get _trendLabel {
    switch (trend) {
      case 'accelerating':
        return 'Hot';
      case 'at_risk':
        return 'At Risk';
      case 'churning':
        return 'Urgent';
      case 'due':
        return 'Due Today';
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.04)
              : Colors.black.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _trendColor.withValues(alpha: 0.25),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _trendColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, size: 22, color: _trendColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (_trendLabel.isNotEmpty) ...[
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _trendColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _trendLabel.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: _trendColor,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white54 : Colors.black54,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: onActionTap,
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Iconsax.more,
                  size: 18,
                  color: LuxuryColors.rolexGreen,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Premium action sheet
class _PremiumActionSheet extends StatelessWidget {
  final String title;
  final bool isDark;
  final List<_ActionItem> actions;

  const _PremiumActionSheet({
    required this.title,
    required this.isDark,
    required this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0D0D12) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
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
          const SizedBox(height: 20),
          Text(
            'Actions for $title',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 24),
          ...actions.map((action) => _buildActionTile(action)),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.black.withValues(alpha: 0.03),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Cancel',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white54 : Colors.black45,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile(_ActionItem action) {
    return GestureDetector(
      onTap: action.onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.black.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(action.icon, size: 18, color: LuxuryColors.rolexGreen),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                action.label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ),
            Icon(
              Iconsax.arrow_right_3,
              size: 16,
              color: isDark ? Colors.white38 : Colors.black26,
            ),
          ],
        ),
      ),
    );
  }
}

/// Action item model
class _ActionItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });
}
