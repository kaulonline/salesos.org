import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Accessibility utilities for WCAG 2.1 AA compliance
class IrisAccessibility {
  IrisAccessibility._();

  // Minimum touch target sizes per platform guidelines
  static const double minTouchTargetIOS = 44.0;
  static const double minTouchTargetAndroid = 48.0;

  // WCAG 2.1 minimum contrast ratios
  static const double minContrastNormalText = 4.5;
  static const double minContrastLargeText = 3.0;

  /// Ensures widget meets minimum touch target size
  static Widget ensureTouchTarget({
    required Widget child,
    double minSize = 48.0,
  }) {
    return ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: minSize,
        minHeight: minSize,
      ),
      child: child,
    );
  }

  /// Wraps widget with semantic label for screen readers
  static Widget withSemantics({
    required Widget child,
    required String label,
    String? hint,
    bool isButton = false,
    bool isHeader = false,
    bool excludeFromSemantics = false,
  }) {
    return Semantics(
      label: label,
      hint: hint,
      button: isButton,
      header: isHeader,
      excludeSemantics: excludeFromSemantics,
      child: child,
    );
  }

  /// Creates accessible icon button with proper touch target
  static Widget accessibleIconButton({
    required IconData icon,
    required String semanticLabel,
    required VoidCallback onTap,
    double size = 24.0,
    Color? color,
  }) {
    return Semantics(
      label: semanticLabel,
      button: true,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            minWidth: 48.0,
            minHeight: 48.0,
          ),
          child: Center(
            child: Icon(icon, size: size, color: color),
          ),
        ),
      ),
    );
  }

  /// Calculates contrast ratio between two colors
  static double contrastRatio(Color foreground, Color background) {
    final fgLuminance = foreground.computeLuminance();
    final bgLuminance = background.computeLuminance();
    final lighter = fgLuminance > bgLuminance ? fgLuminance : bgLuminance;
    final darker = fgLuminance > bgLuminance ? bgLuminance : fgLuminance;
    return (lighter + 0.05) / (darker + 0.05);
  }

  /// Checks if contrast meets WCAG AA standards
  static bool meetsContrastRequirement(
    Color foreground,
    Color background, {
    bool isLargeText = false,
  }) {
    final ratio = contrastRatio(foreground, background);
    return ratio >= (isLargeText ? minContrastLargeText : minContrastNormalText);
  }
}

/// Extension for adding accessibility to any widget
extension AccessibleWidget on Widget {
  Widget withSemanticLabel(String label, {String? hint, bool isButton = false}) {
    return Semantics(
      label: label,
      hint: hint,
      button: isButton,
      child: this,
    );
  }

  Widget ensureMinTouchTarget([double minSize = 48.0]) {
    return ConstrainedBox(
      constraints: BoxConstraints(minWidth: minSize, minHeight: minSize),
      child: Center(child: this),
    );
  }
}

/// Announce text to screen readers
void announceToScreenReader(BuildContext context, String message) {
  // ignore: deprecated_member_use
  SemanticsService.announce(message, TextDirection.ltr);
}
