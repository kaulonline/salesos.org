import 'package:flutter/services.dart';

/// Haptic feedback utilities for consistent tactile responses
/// Reference: Apple HIG & Material Design guidelines
class IrisHaptics {
  IrisHaptics._();

  /// Light tap feedback - for toggles, selections
  static void lightTap() => HapticFeedback.lightImpact();

  /// Medium impact - for successful actions, confirmations
  static void mediumTap() => HapticFeedback.mediumImpact();

  /// Heavy impact - for destructive actions, errors, warnings
  static void heavyTap() => HapticFeedback.heavyImpact();

  /// Selection change feedback - for pickers, switches
  static void selection() => HapticFeedback.selectionClick();

  /// Success feedback pattern
  static Future<void> success() async {
    await HapticFeedback.mediumImpact();
    await Future.delayed(const Duration(milliseconds: 100));
    await HapticFeedback.lightImpact();
  }

  /// Error/Warning feedback pattern
  static Future<void> error() async {
    await HapticFeedback.heavyImpact();
    await Future.delayed(const Duration(milliseconds: 100));
    await HapticFeedback.heavyImpact();
  }

  /// Notification feedback pattern
  static Future<void> notification() async {
    await HapticFeedback.lightImpact();
    await Future.delayed(const Duration(milliseconds: 80));
    await HapticFeedback.lightImpact();
  }

  /// Pull-to-refresh threshold reached
  static void refreshThreshold() => HapticFeedback.mediumImpact();

  /// Long press started
  static void longPressStart() => HapticFeedback.lightImpact();

  /// Drag threshold crossed (e.g., swipe actions)
  static void dragThreshold() => HapticFeedback.selectionClick();
}
