import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'luxury_card.dart';

/// Quick action item data
class QuickAction {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color? color;
  final bool isPrimary;

  const QuickAction({
    required this.icon,
    required this.label,
    this.onTap,
    this.color,
    this.isPrimary = false,
  });
}

/// Floating Quick Actions Bar - Premium glassmorphic quick action buttons
/// Positioned at the bottom of the screen for easy access
class QuickActionsBar extends StatelessWidget {
  final List<QuickAction> actions;
  final EdgeInsets? padding;
  final bool showLabels;

  const QuickActionsBar({
    super.key,
    required this.actions,
    this.padding,
    this.showLabels = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [
                        Colors.white.withValues(alpha: 0.12),
                        Colors.white.withValues(alpha: 0.06),
                      ]
                    : [
                        Colors.white.withValues(alpha: 0.85),
                        Colors.white.withValues(alpha: 0.7),
                      ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark
                    ? LuxuryColors.rolexGreen.withValues(alpha: 0.25)
                    : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.1),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                  spreadRadius: -8,
                ),
                BoxShadow(
                  color: LuxuryColors.rolexGreen.withValues(alpha: isDark ? 0.15 : 0.08),
                  blurRadius: 32,
                  offset: const Offset(0, 4),
                  spreadRadius: -4,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: actions.asMap().entries.map((entry) {
                final index = entry.key;
                final action = entry.value;

                return _QuickActionButton(
                  action: action,
                  showLabel: showLabels,
                ).animate(delay: (100 + index * 50).ms)
                    .fadeIn(duration: 250.ms)
                    .scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack);
              }).toList(),
            ),
          ),
        ),
      ),
    ).animate()
        .fadeIn(duration: 400.ms, delay: 300.ms)
        .slideY(begin: 0.3, curve: Curves.easeOutCubic);
  }
}

class _QuickActionButton extends StatefulWidget {
  final QuickAction action;
  final bool showLabel;

  const _QuickActionButton({
    required this.action,
    this.showLabel = false,
  });

  @override
  State<_QuickActionButton> createState() => _QuickActionButtonState();
}

class _QuickActionButtonState extends State<_QuickActionButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 100),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.9).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = widget.action.color ?? LuxuryColors.jadePremium;

    return GestureDetector(
      onTapDown: (_) {
        setState(() => _isPressed = true);
        _controller.forward();
      },
      onTapUp: (_) {
        setState(() => _isPressed = false);
        _controller.reverse();
        HapticFeedback.mediumImpact();
        widget.action.onTap?.call();
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
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: widget.action.isPrimary ? 52 : 46,
                    height: widget.action.isPrimary ? 52 : 46,
                    decoration: BoxDecoration(
                      gradient: widget.action.isPrimary
                          ? LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                accentColor,
                                Color.lerp(accentColor, Colors.black, 0.2)!,
                              ],
                            )
                          : null,
                      color: widget.action.isPrimary
                          ? null
                          : (_isPressed
                              ? accentColor.withValues(alpha: 0.2)
                              : accentColor.withValues(alpha: 0.1)),
                      borderRadius: BorderRadius.circular(widget.action.isPrimary ? 16 : 14),
                      boxShadow: widget.action.isPrimary
                          ? [
                              BoxShadow(
                                color: accentColor.withValues(alpha: 0.4),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ]
                          : null,
                    ),
                    child: Icon(
                      widget.action.icon,
                      size: widget.action.isPrimary ? 24 : 20,
                      color: widget.action.isPrimary
                          ? Colors.white
                          : accentColor,
                    ),
                  ),
                  if (widget.showLabel) ...[
                    const SizedBox(height: 6),
                    Text(
                      widget.action.label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: isDark
                            ? LuxuryColors.textOnDark.withValues(alpha: 0.7)
                            : LuxuryColors.textOnLight.withValues(alpha: 0.6),
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Expandable Quick Actions FAB - Premium floating action button that expands
class ExpandableQuickActionsFab extends StatefulWidget {
  final List<QuickAction> actions;
  final IconData icon;
  final IconData closeIcon;

  const ExpandableQuickActionsFab({
    super.key,
    required this.actions,
    this.icon = Iconsax.add,
    this.closeIcon = Iconsax.close_circle,
  });

  @override
  State<ExpandableQuickActionsFab> createState() => _ExpandableQuickActionsFabState();
}

class _ExpandableQuickActionsFabState extends State<ExpandableQuickActionsFab>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _expandAnimation;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _expandAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _isExpanded = !_isExpanded);
    if (_isExpanded) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // Expanded actions
        AnimatedBuilder(
          animation: _expandAnimation,
          builder: (context, child) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: widget.actions.asMap().entries.map((entry) {
                final index = entry.key;
                final action = entry.value;
                final reverseIndex = widget.actions.length - 1 - index;

                return Transform.translate(
                  offset: Offset(
                    0,
                    (1 - _expandAnimation.value) * (reverseIndex + 1) * 20,
                  ),
                  child: Opacity(
                    opacity: _expandAnimation.value,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Label
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? LuxuryColors.obsidian
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.1),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Text(
                              action.label,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Icon button
                          _MiniActionButton(
                            action: action,
                            onTap: () {
                              _toggle();
                              action.onTap?.call();
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
        // Main FAB
        GestureDetector(
          onTap: _toggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: _isExpanded
                    ? [
                        LuxuryColors.textMuted,
                        Color.lerp(LuxuryColors.textMuted, Colors.black, 0.2)!,
                      ]
                    : [
                        LuxuryColors.jadePremium,
                        LuxuryColors.deepEmerald,
                      ],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: (_isExpanded ? LuxuryColors.textMuted : LuxuryColors.jadePremium)
                      .withValues(alpha: 0.4),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: AnimatedRotation(
              duration: const Duration(milliseconds: 200),
              turns: _isExpanded ? 0.125 : 0,
              child: Icon(
                _isExpanded ? widget.closeIcon : widget.icon,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MiniActionButton extends StatelessWidget {
  final QuickAction action;
  final VoidCallback? onTap;

  const _MiniActionButton({
    required this.action,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor = action.color ?? LuxuryColors.jadePremium;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              accentColor,
              Color.lerp(accentColor, Colors.black, 0.15)!,
            ],
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: accentColor.withValues(alpha: 0.35),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(
          action.icon,
          color: Colors.white,
          size: 20,
        ),
      ),
    );
  }
}

/// Horizontal Quick Actions Row - For inline quick actions
class QuickActionsRow extends StatelessWidget {
  final List<QuickAction> actions;
  final double spacing;

  const QuickActionsRow({
    super.key,
    required this.actions,
    this.spacing = 8,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: actions.asMap().entries.map((entry) {
          final index = entry.key;
          final action = entry.value;
          final accentColor = action.color ?? LuxuryColors.jadePremium;

          return Padding(
            padding: EdgeInsets.only(right: spacing),
            child: GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                action.onTap?.call();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark
                      ? accentColor.withValues(alpha: 0.15)
                      : accentColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: accentColor.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      action.icon,
                      size: 16,
                      color: accentColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      action.label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: accentColor,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ).animate(delay: (50 + index * 30).ms)
              .fadeIn(duration: 200.ms)
              .slideX(begin: 0.1);
        }).toList(),
      ),
    );
  }
}
