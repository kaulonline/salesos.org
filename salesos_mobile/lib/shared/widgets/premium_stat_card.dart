import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/config/theme.dart';
import 'iris_shimmer.dart'; // Contains AnimatedCounter
import 'luxury_card.dart';

/// Premium stat card types for Today's Focus
enum StatCardType { calls, meetings, tasks, leads }

/// Luxury gradient presets for each stat type - Premium SalesOS design
class StatCardGradients {
  // Calls - Platinum shimmer (professional, elite communication)
  static const callsGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFF5F5F5), // Diamond white
      Color(0xFFE5E4E2), // Platinum
      Color(0xFFD4D4D8), // Silver platinum
    ],
  );

  // Meetings - Rose gold elegance (engagement, collaboration)
  static const meetingsGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFEDC9AF), // Light rose
      Color(0xFFB76E79), // Rose gold
      Color(0xFF9E6B6B), // Deep rose
    ],
  );

  // Tasks - Royal navy with gold undertones (productivity, action)
  static const tasksGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF1B263B), // Midnight blue
      Color(0xFF0D1B2A), // Deep navy
      Color(0xFF1A1F3D), // Royal navy
    ],
  );

  // Leads - Champagne gold shimmer (value, opportunity)
  static const leadsGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFE8B99A), // Light gold
      Color(0xFFEAD07D), // SalesOS gold
      Color(0xFFCFB53B), // Antique gold
    ],
  );

  static LinearGradient getGradient(StatCardType type) {
    switch (type) {
      case StatCardType.calls:
        return callsGradient;
      case StatCardType.meetings:
        return meetingsGradient;
      case StatCardType.tasks:
        return tasksGradient;
      case StatCardType.leads:
        return leadsGradient;
    }
  }
}

/// Premium glassmorphic stat card with 3D illustration
class PremiumStatCard extends StatelessWidget {
  final StatCardType type;
  final int value;
  final String label;
  final VoidCallback? onTap;
  final bool animateValue;
  final bool compact; // For phone layout
  final String? semanticLabel; // Accessibility label for screen readers

  const PremiumStatCard({
    super.key,
    required this.type,
    required this.value,
    required this.label,
    this.onTap,
    this.animateValue = true,
    this.compact = false,
    this.semanticLabel,
  });

  // Get text color based on gradient type - luxury color palette
  Color get _textColor {
    switch (type) {
      case StatCardType.calls:
        return LuxuryColors.richBlack; // Dark on light platinum
      case StatCardType.meetings:
        return const Color(0xFF2D1B14); // Deep brown on rose gold
      case StatCardType.tasks:
        return LuxuryColors.champagneGold; // Gold on navy
      case StatCardType.leads:
        return LuxuryColors.richBlack; // Dark on gold
    }
  }

  Color get _secondaryTextColor {
    switch (type) {
      case StatCardType.calls:
        return LuxuryColors.textMuted;
      case StatCardType.meetings:
        return const Color(0xFF5C3D2E);
      case StatCardType.tasks:
        return LuxuryColors.textPlatinum;
      case StatCardType.leads:
        return const Color(0xFF5C3D2E);
    }
  }

  Color get _borderColor {
    switch (type) {
      case StatCardType.calls:
        return LuxuryColors.platinum.withValues(alpha: 0.4);
      case StatCardType.meetings:
        return LuxuryColors.roseGold.withValues(alpha: 0.4);
      case StatCardType.tasks:
        return LuxuryColors.champagneGold.withValues(alpha: 0.3);
      case StatCardType.leads:
        return LuxuryColors.champagneGold.withValues(alpha: 0.4);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gradient = StatCardGradients.getGradient(type);

    return Semantics(
      label: semanticLabel ?? '$value $label',
      button: onTap != null,
      enabled: onTap != null,
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap?.call();
        },
        child: Container(
        width: compact ? 95 : null,
        height: compact ? 120 : 100, // Fixed height for consistent sizing
        margin: compact ? const EdgeInsets.symmetric(horizontal: 4) : null,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(compact ? 16 : 20),
          border: Border.all(
            color: _borderColor,
            width: 1,
          ),
          boxShadow: [
            // Primary shadow
            BoxShadow(
              color: gradient.colors[1].withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
            // Subtle accent glow
            BoxShadow(
              color: gradient.colors.first.withValues(alpha: 0.2),
              blurRadius: 24,
              spreadRadius: -4,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(compact ? 16 : 20),
          child: Stack(
            children: [
              // Glassmorphic overlay pattern
              Positioned.fill(
                child: CustomPaint(
                  painter: _GlassPatternPainter(),
                ),
              ),

              // Premium texture overlay
              Positioned.fill(
                child: IgnorePointer(
                  child: CustomPaint(
                    painter: _LeatherTexturePainter(
                      opacity: 0.06,
                      isDark: type == StatCardType.tasks, // Tasks has dark background
                    ),
                  ),
                ),
              ),

              // Content
              Padding(
                padding: EdgeInsets.all(compact ? 12 : 16),
                child: compact
                    ? _buildCompactLayout()
                    : _buildExpandedLayout(),
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }

  Widget _buildCompactLayout() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Value
        animateValue
            ? AnimatedCounter(
                value: value,
                suffix: '',
                style: IrisTheme.headlineMedium.copyWith(
                  color: _textColor,
                  fontWeight: FontWeight.bold,
                ),
              )
            : Text(
                '$value',
                style: IrisTheme.headlineMedium.copyWith(
                  color: _textColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
        const SizedBox(height: 4),
        // Label
        Text(
          label,
          style: IrisTheme.labelSmall.copyWith(
            color: _secondaryTextColor,
            fontWeight: FontWeight.w500,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildExpandedLayout() {
    return Row(
      children: [
        const SizedBox(width: 8),
        // Value and label
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              animateValue
                  ? AnimatedCounter(
                      value: value,
                      suffix: '',
                      style: IrisTheme.headlineMedium.copyWith(
                        color: _textColor,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : Text(
                      '$value',
                      style: IrisTheme.headlineMedium.copyWith(
                        color: _textColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
              const SizedBox(height: 4),
              Text(
                label,
                style: IrisTheme.bodyMedium.copyWith(
                  color: _secondaryTextColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        // Arrow indicator
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: _textColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.arrow_forward_ios,
            size: 14,
            color: _textColor,
          ),
        ),
      ],
    );
  }
}

/// Premium leather texture painter for cards
class _LeatherTexturePainter extends CustomPainter {
  final double opacity;
  final bool isDark;

  _LeatherTexturePainter({
    this.opacity = 0.04,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = (isDark ? Colors.white : Colors.black).withValues(alpha: opacity)
      ..strokeWidth = 0.5
      ..style = PaintingStyle.stroke;

    // Create subtle cross-hatch pattern (leather grain effect)
    const spacing = 8.0;

    // Diagonal lines going one direction
    for (double i = -size.height; i < size.width; i += spacing) {
      canvas.drawLine(
        Offset(i, 0),
        Offset(i + size.height, size.height),
        paint,
      );
    }

    // Diagonal lines going the other direction (creates diamond pattern)
    for (double i = 0; i < size.width + size.height; i += spacing) {
      canvas.drawLine(
        Offset(i, 0),
        Offset(i - size.height, size.height),
        paint,
      );
    }

    // Add subtle highlight at top-left corner (embossed effect)
    final highlightPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.center,
        colors: [
          Colors.white.withValues(alpha: isDark ? 0.03 : 0.08),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width * 0.4, size.height * 0.4));

    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width * 0.4, size.height * 0.4),
      highlightPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _LeatherTexturePainter oldDelegate) {
    return oldDelegate.opacity != opacity || oldDelegate.isDark != isDark;
  }
}

/// Custom painter for glassmorphic pattern overlay
class _GlassPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Use white for light highlights on warm backgrounds
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;

    // Draw subtle glass circles for depth
    canvas.drawCircle(
      Offset(size.width * 0.85, size.height * 0.15),
      size.width * 0.35,
      paint,
    );

    canvas.drawCircle(
      Offset(size.width * 0.05, size.height * 0.95),
      size.width * 0.25,
      paint,
    );

    // Draw diagonal highlight line for gloss effect
    final highlightPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withValues(alpha: 0.3),
          Colors.white.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width * 0.5, 0)
      ..lineTo(0, size.height * 0.5)
      ..close();

    canvas.drawPath(path, highlightPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Premium stat cards grid for tablet layout
class PremiumStatsGrid extends StatelessWidget {
  final int calls;
  final int meetings;
  final int tasks;
  final int leads;
  final bool isLoading;
  final VoidCallback? onCallsTap;
  final VoidCallback? onMeetingsTap;
  final VoidCallback? onTasksTap;
  final VoidCallback? onLeadsTap;

  const PremiumStatsGrid({
    super.key,
    required this.calls,
    required this.meetings,
    required this.tasks,
    required this.leads,
    this.isLoading = false,
    this.onCallsTap,
    this.onMeetingsTap,
    this.onTasksTap,
    this.onLeadsTap,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Row(
        children: [
          Expanded(child: _PremiumStatShimmer()),
          const SizedBox(width: 12),
          Expanded(child: _PremiumStatShimmer()),
          const SizedBox(width: 12),
          Expanded(child: _PremiumStatShimmer()),
          const SizedBox(width: 12),
          Expanded(child: _PremiumStatShimmer()),
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          child: PremiumStatCard(
            type: StatCardType.calls,
            value: calls,
            label: 'Calls Today',
            onTap: onCallsTap,
          ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: PremiumStatCard(
            type: StatCardType.meetings,
            value: meetings,
            label: 'Meetings',
            onTap: onMeetingsTap,
          ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.1),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: PremiumStatCard(
            type: StatCardType.tasks,
            value: tasks,
            label: 'Tasks Due',
            onTap: onTasksTap,
          ).animate(delay: 350.ms).fadeIn().slideY(begin: 0.1),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: PremiumStatCard(
            type: StatCardType.leads,
            value: leads,
            label: 'Hot Leads',
            onTap: onLeadsTap,
          ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.1),
        ),
      ],
    );
  }
}

/// Shimmer placeholder for premium stat card
class _PremiumStatShimmer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // Wrap in ExcludeSemantics and RepaintBoundary to prevent semantics
    // parentDataDirty assertion errors during repeating animations
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Container(
          height: 100,
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(20),
          ),
        )
            .animate(onPlay: (c) => c.repeat())
            .shimmer(
              duration: 1200.ms,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.05),
            ),
      ),
    );
  }
}

/// Horizontal scrollable premium stat chips for phone layout
class PremiumStatsRow extends StatelessWidget {
  final int calls;
  final int meetings;
  final int tasks;
  final int leads;
  final bool isLoading;
  final VoidCallback? onCallsTap;
  final VoidCallback? onMeetingsTap;
  final VoidCallback? onTasksTap;
  final VoidCallback? onLeadsTap;

  const PremiumStatsRow({
    super.key,
    required this.calls,
    required this.meetings,
    required this.tasks,
    required this.leads,
    this.isLoading = false,
    this.onCallsTap,
    this.onMeetingsTap,
    this.onTasksTap,
    this.onLeadsTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (isLoading) {
      return SizedBox(
        height: 120,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          children: List.generate(
            4,
            (i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              // Wrap in ExcludeSemantics and RepaintBoundary to prevent semantics
              // parentDataDirty assertion errors during repeating animations
              child: ExcludeSemantics(
                child: RepaintBoundary(
                  child: Container(
                    width: 95,
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  )
                      .animate(onPlay: (c) => c.repeat())
                      .shimmer(
                        duration: 1200.ms,
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.black.withValues(alpha: 0.05),
                      ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 120,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          PremiumStatCard(
            type: StatCardType.calls,
            value: calls,
            label: 'Calls',
            onTap: onCallsTap,
            compact: true,
          ).animate(delay: 250.ms).fadeIn().slideX(begin: 0.2),
          PremiumStatCard(
            type: StatCardType.meetings,
            value: meetings,
            label: 'Meetings',
            onTap: onMeetingsTap,
            compact: true,
          ).animate(delay: 300.ms).fadeIn().slideX(begin: 0.2),
          PremiumStatCard(
            type: StatCardType.tasks,
            value: tasks,
            label: 'Tasks',
            onTap: onTasksTap,
            compact: true,
          ).animate(delay: 350.ms).fadeIn().slideX(begin: 0.2),
          PremiumStatCard(
            type: StatCardType.leads,
            value: leads,
            label: 'Leads',
            onTap: onLeadsTap,
            compact: true,
          ).animate(delay: 400.ms).fadeIn().slideX(begin: 0.2),
        ],
      ),
    );
  }
}
