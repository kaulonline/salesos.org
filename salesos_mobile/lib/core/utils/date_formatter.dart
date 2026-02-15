import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../services/preferences_service.dart';

/// Date formatting utility that respects user timezone preference
class DateFormatter {
  final Ref _ref;

  DateFormatter(this._ref);

  /// Get the timezone offset in hours from the user preference
  Duration get _timezoneOffset {
    try {
      final prefs = _ref.read(userPreferencesProvider);
      switch (prefs.timezone) {
        case AppTimezone.pst:
          return const Duration(hours: -8);
        case AppTimezone.mst:
          return const Duration(hours: -7);
        case AppTimezone.cst:
          return const Duration(hours: -6);
        case AppTimezone.est:
          return const Duration(hours: -5);
        case AppTimezone.utc:
          return Duration.zero;
      }
    } catch (e) {
      // Default to device timezone if preference not available
      return DateTime.now().timeZoneOffset;
    }
  }

  /// Convert UTC time to user's preferred timezone
  DateTime toUserTimezone(DateTime utcTime) {
    if (!utcTime.isUtc) {
      utcTime = utcTime.toUtc();
    }
    return utcTime.add(_timezoneOffset);
  }

  /// Convert user's local time to UTC
  DateTime toUtc(DateTime localTime) {
    return localTime.subtract(_timezoneOffset);
  }

  /// Format date with user's timezone
  String formatDate(DateTime date, {String pattern = 'MMM d, yyyy'}) {
    final localDate = date.isUtc ? toUserTimezone(date) : date;
    return DateFormat(pattern).format(localDate);
  }

  /// Format time with user's timezone
  String formatTime(DateTime date, {bool use24Hour = false}) {
    final localDate = date.isUtc ? toUserTimezone(date) : date;
    final pattern = use24Hour ? 'HH:mm' : 'h:mm a';
    return DateFormat(pattern).format(localDate);
  }

  /// Format date and time with user's timezone
  String formatDateTime(DateTime date, {String? pattern, bool use24Hour = false}) {
    final localDate = date.isUtc ? toUserTimezone(date) : date;
    final timePattern = use24Hour ? 'HH:mm' : 'h:mm a';
    final finalPattern = pattern ?? 'MMM d, yyyy $timePattern';
    return DateFormat(finalPattern).format(localDate);
  }

  /// Format relative date (Today, Yesterday, etc.)
  String formatRelativeDate(DateTime date) {
    final now = DateTime.now();
    final localDate = date.isUtc ? toUserTimezone(date) : date;
    final today = DateTime(now.year, now.month, now.day);
    final dateOnly = DateTime(localDate.year, localDate.month, localDate.day);

    final difference = today.difference(dateOnly).inDays;

    if (difference == 0) {
      return 'Today';
    } else if (difference == 1) {
      return 'Yesterday';
    } else if (difference == -1) {
      return 'Tomorrow';
    } else if (difference > 1 && difference < 7) {
      return '$difference days ago';
    } else if (difference < -1 && difference > -7) {
      return 'In ${-difference} days';
    } else {
      return formatDate(localDate);
    }
  }

  /// Format relative date with time
  String formatRelativeDateWithTime(DateTime date, {bool use24Hour = false}) {
    final relativeDate = formatRelativeDate(date);
    final time = formatTime(date, use24Hour: use24Hour);
    return '$relativeDate at $time';
  }

  /// Get short weekday name
  String getWeekday(DateTime date) {
    final localDate = date.isUtc ? toUserTimezone(date) : date;
    return DateFormat('EEEE').format(localDate);
  }

  /// Get timezone display name
  String get timezoneDisplayName {
    try {
      final prefs = _ref.read(userPreferencesProvider);
      return prefs.timezone.displayName;
    } catch (e) {
      return 'Local';
    }
  }
}

/// Provider for DateFormatter
final dateFormatterProvider = Provider<DateFormatter>((ref) {
  return DateFormatter(ref);
});

/// Extension for easy date formatting
extension DateTimeExtension on DateTime {
  /// Format with user timezone (requires WidgetRef to access preferences)
  String formatWithRef(WidgetRef ref, {String pattern = 'MMM d, yyyy'}) {
    final formatter = ref.read(dateFormatterProvider);
    return formatter.formatDate(this, pattern: pattern);
  }
}
