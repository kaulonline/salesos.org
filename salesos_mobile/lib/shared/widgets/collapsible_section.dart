import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/config/theme.dart';

/// A collapsible section widget that persists its expanded/collapsed state
///
/// Supports two persistence mechanisms:
/// 1. SharedPreferences (default fallback) - automatically saves state using [storageKey]
/// 2. Centralized dashboard config - via [onCollapseChanged] callback for parent sync
///
/// When [onCollapseChanged] is provided, the parent widget can sync the collapsed
/// state to a centralized config provider (e.g., DashboardConfigProvider).
/// SharedPreferences persistence continues to work as a fallback.
class CollapsibleSection extends StatefulWidget {
  final String title;
  final String storageKey;
  final Widget child;
  final Widget? leading;
  final bool initiallyExpanded;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? contentPadding;

  /// Optional callback invoked when the collapsed state changes.
  /// The callback receives `true` when the section is collapsed,
  /// `false` when expanded. Use this to sync state to a centralized
  /// dashboard config provider.
  final void Function(bool isCollapsed)? onCollapseChanged;

  const CollapsibleSection({
    super.key,
    required this.title,
    required this.storageKey,
    required this.child,
    this.leading,
    this.initiallyExpanded = true,
    this.padding,
    this.contentPadding,
    this.onCollapseChanged,
  });

  @override
  State<CollapsibleSection> createState() => _CollapsibleSectionState();
}

class _CollapsibleSectionState extends State<CollapsibleSection>
    with SingleTickerProviderStateMixin {
  late bool _isExpanded;
  late AnimationController _animationController;
  late Animation<double> _rotationAnimation;
  late Animation<double> _heightAnimation;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
      // Start at expanded state by default
      value: widget.initiallyExpanded ? 1.0 : 0.0,
    );

    _rotationAnimation = Tween<double>(begin: 0, end: 0.5).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    _heightAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );

    _loadState();
  }

  Future<void> _loadState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedState = prefs.getBool(widget.storageKey);

      if (mounted && savedState != null) {
        // Only apply saved state if it differs from current
        if (savedState != _isExpanded) {
          setState(() {
            _isExpanded = savedState;
          });
          // Animate to the saved state
          if (savedState) {
            _animationController.forward();
          } else {
            _animationController.reverse();
          }
        }
      }
    } catch (e) {
      // If SharedPreferences fails, keep the default expanded state
    }
  }

  Future<void> _saveState(bool isExpanded) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(widget.storageKey, isExpanded);
  }

  void _toggleExpanded() {
    HapticFeedback.lightImpact();
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
      // Save to SharedPreferences (fallback persistence)
      _saveState(_isExpanded);
    });

    // Notify parent of collapse state change for centralized config sync
    // Note: isCollapsed is the inverse of _isExpanded
    widget.onCollapseChanged?.call(!_isExpanded);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Always use SizeTransition - animation controller starts at correct value
    return Padding(
      padding: widget.padding ?? EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(isDark),
          SizeTransition(
            sizeFactor: _heightAnimation,
            axisAlignment: -1,
            child: Padding(
              padding: widget.contentPadding ?? EdgeInsets.zero,
              child: widget.child,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return GestureDetector(
      onTap: _toggleExpanded,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            if (widget.leading != null) ...[
              widget.leading!,
              const SizedBox(width: 8),
            ],
            Expanded(
              child: Text(
                widget.title,
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
            ),
            RotationTransition(
              turns: _rotationAnimation,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isDark
                      ? IrisTheme.darkSurfaceElevated
                      : IrisTheme.lightSurfaceElevated,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.keyboard_arrow_down,
                  size: 20,
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: 200.ms).fadeIn();
  }
}
