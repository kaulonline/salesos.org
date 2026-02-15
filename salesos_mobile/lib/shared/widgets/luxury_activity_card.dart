import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'luxury_card.dart';

/// Activity type for premium activity cards
enum LuxuryActivityType {
  call,
  email,
  meeting,
  deal,
  task,
  note,
  activity,
}

/// Premium Activity Card - Luxury styled activity item with refined aesthetics
class LuxuryActivityCard extends StatefulWidget {
  final LuxuryActivityType type;
  final String title;
  final String? subtitle;
  final String time;
  final VoidCallback? onTap;
  final bool showTimeline;
  final bool isFirst;
  final bool isLast;

  const LuxuryActivityCard({
    super.key,
    required this.type,
    required this.title,
    this.subtitle,
    required this.time,
    this.onTap,
    this.showTimeline = false,
    this.isFirst = false,
    this.isLast = false,
  });

  @override
  State<LuxuryActivityCard> createState() => _LuxuryActivityCardState();
}

class _LuxuryActivityCardState extends State<LuxuryActivityCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.98).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  IconData get _icon {
    switch (widget.type) {
      case LuxuryActivityType.call:
        return Iconsax.call;
      case LuxuryActivityType.email:
        return Iconsax.sms;
      case LuxuryActivityType.meeting:
        return Iconsax.calendar;
      case LuxuryActivityType.deal:
        return Iconsax.dollar_circle;
      case LuxuryActivityType.task:
        return Iconsax.task_square;
      case LuxuryActivityType.note:
        return Iconsax.note_1;
      case LuxuryActivityType.activity:
        return Iconsax.activity;
    }
  }

  Color get _accentColor {
    switch (widget.type) {
      case LuxuryActivityType.call:
        return LuxuryColors.jadePremium;
      case LuxuryActivityType.email:
        return const Color(0xFF3B82F6);
      case LuxuryActivityType.meeting:
        return LuxuryColors.champagneGold;
      case LuxuryActivityType.deal:
        return LuxuryColors.rolexGreen;
      case LuxuryActivityType.task:
        return const Color(0xFF8B5CF6);
      case LuxuryActivityType.note:
        return LuxuryColors.roseGold;
      case LuxuryActivityType.activity:
        return LuxuryColors.platinum;
    }
  }

  Gradient get _iconGradient {
    final color = _accentColor;
    return LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        color,
        Color.lerp(color, Colors.black, 0.2)!,
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: (_) {
        setState(() => _isPressed = true);
        _controller.forward();
      },
      onTapUp: (_) {
        setState(() => _isPressed = false);
        _controller.reverse();
        HapticFeedback.lightImpact();
        widget.onTap?.call();
      },
      onTapCancel: () {
        setState(() => _isPressed = false);
        _controller.reverse();
      },
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Timeline indicator
                if (widget.showTimeline)
                  SizedBox(
                    width: 32,
                    child: Column(
                      children: [
                        if (!widget.isFirst)
                          Container(
                            width: 1.5,
                            height: 12,
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.1)
                                : Colors.black.withValues(alpha: 0.08),
                          ),
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _accentColor.withValues(alpha: 0.2),
                            border: Border.all(
                              color: _accentColor,
                              width: 2,
                            ),
                          ),
                        ),
                        if (!widget.isLast)
                          Expanded(
                            child: Container(
                              width: 1.5,
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : Colors.black.withValues(alpha: 0.08),
                            ),
                          ),
                      ],
                    ),
                  ),
                // Card content
                Expanded(
                  child: Container(
                    margin: EdgeInsets.only(
                      left: widget.showTimeline ? 8 : 0,
                      bottom: 8,
                    ),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark
                          ? (_isPressed
                              ? LuxuryColors.obsidian.withValues(alpha: 0.8)
                              : LuxuryColors.obsidian)
                          : (_isPressed
                              ? Colors.grey.shade50
                              : Colors.white),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _isPressed
                            ? _accentColor.withValues(alpha: 0.3)
                            : (isDark
                                ? Colors.white.withValues(alpha: 0.08)
                                : Colors.black.withValues(alpha: 0.06)),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                        if (_isPressed)
                          BoxShadow(
                            color: _accentColor.withValues(alpha: 0.15),
                            blurRadius: 12,
                            spreadRadius: -4,
                          ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Gradient icon container
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            gradient: _iconGradient,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: _accentColor.withValues(alpha: 0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            _icon,
                            size: 18,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Content
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.title,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: isDark
                                      ? LuxuryColors.textOnDark
                                      : LuxuryColors.textOnLight,
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (widget.subtitle != null && widget.subtitle!.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  widget.subtitle!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: LuxuryColors.textMuted,
                                    letterSpacing: -0.1,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Time badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _accentColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            widget.time,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: _accentColor,
                              letterSpacing: 0.2,
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
        },
      ),
    );
  }
}

/// Premium Activity List - A list of luxury activity cards with timeline
class LuxuryActivityList extends StatelessWidget {
  final List<LuxuryActivityData> activities;
  final bool showTimeline;
  final int limit;

  const LuxuryActivityList({
    super.key,
    required this.activities,
    this.showTimeline = true,
    this.limit = 5,
  });

  @override
  Widget build(BuildContext context) {
    final displayActivities = activities.take(limit).toList();

    return Column(
      children: displayActivities.asMap().entries.map((entry) {
        final index = entry.key;
        final activity = entry.value;

        return LuxuryActivityCard(
          type: activity.type,
          title: activity.title,
          subtitle: activity.subtitle,
          time: activity.time,
          onTap: activity.onTap,
          showTimeline: showTimeline,
          isFirst: index == 0,
          isLast: index == displayActivities.length - 1,
        ).animate(delay: (100 + index * 50).ms)
            .fadeIn(duration: 300.ms)
            .slideX(begin: 0.05, curve: Curves.easeOutCubic);
      }).toList(),
    );
  }
}

/// Data model for luxury activity
class LuxuryActivityData {
  final LuxuryActivityType type;
  final String title;
  final String? subtitle;
  final String time;
  final VoidCallback? onTap;

  const LuxuryActivityData({
    required this.type,
    required this.title,
    this.subtitle,
    required this.time,
    this.onTap,
  });
}

/// Premium Activity Section - Complete section with header and activity list
class LuxuryActivitySection extends StatelessWidget {
  final String title;
  final List<LuxuryActivityData> activities;
  final VoidCallback? onSeeAllTap;
  final int limit;

  const LuxuryActivitySection({
    super.key,
    this.title = 'Recent Activity',
    required this.activities,
    this.onSeeAllTap,
    this.limit = 5,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 3,
                    height: 18,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          LuxuryColors.jadePremium,
                          LuxuryColors.rolexGreen,
                        ],
                      ),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    title.toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.5,
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                ],
              ),
              if (onSeeAllTap != null)
                GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    onSeeAllTap?.call();
                  },
                  child: Row(
                    children: [
                      Text(
                        'See All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: LuxuryColors.jadePremium,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        Iconsax.arrow_right_3,
                        size: 14,
                        color: LuxuryColors.jadePremium,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ).animate(delay: 50.ms).fadeIn(),
        // Activity list
        activities.isEmpty
            ? _EmptyActivityState()
            : LuxuryActivityList(
                activities: activities,
                limit: limit,
              ),
      ],
    );
  }
}

class _EmptyActivityState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.06)
              : Colors.black.withValues(alpha: 0.04),
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: LuxuryColors.jadePremium.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Iconsax.activity,
              size: 22,
              color: LuxuryColors.jadePremium.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'No recent activity',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: LuxuryColors.textMuted,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Your activity will appear here',
            style: TextStyle(
              fontSize: 12,
              color: LuxuryColors.textMuted.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms);
  }
}
