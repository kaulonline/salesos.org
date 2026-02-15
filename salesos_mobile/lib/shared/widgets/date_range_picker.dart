import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';
import 'iris_card.dart';

/// Date range preset options
enum DateRangePreset {
  today('Today', 'today'),
  yesterday('Yesterday', 'yesterday'),
  last7Days('Last 7 Days', '7d'),
  last30Days('Last 30 Days', '30d'),
  last90Days('Last 90 Days', '90d'),
  thisWeek('This Week', 'week'),
  lastWeek('Last Week', 'last_week'),
  thisMonth('This Month', 'month'),
  lastMonth('Last Month', 'last_month'),
  thisQuarter('This Quarter', 'quarter'),
  thisYear('This Year', 'year'),
  yearToDate('Year to Date', 'ytd'),
  custom('Custom Range', 'custom'),
  allTime('All Time', 'all');

  final String label;
  final String value;
  const DateRangePreset(this.label, this.value);
}

/// Date range selection result
class DateRangeSelection {
  final DateTime startDate;
  final DateTime endDate;
  final DateRangePreset preset;
  final bool compareToPrevious;

  const DateRangeSelection({
    required this.startDate,
    required this.endDate,
    required this.preset,
    this.compareToPrevious = false,
  });

  /// Get the previous period for comparison
  (DateTime start, DateTime end) get previousPeriod {
    final duration = endDate.difference(startDate);
    return (
      startDate.subtract(duration).subtract(const Duration(days: 1)),
      startDate.subtract(const Duration(days: 1)),
    );
  }

  /// Format date range as string
  String get formattedRange {
    if (preset == DateRangePreset.allTime) return 'All Time';
    if (preset != DateRangePreset.custom) return preset.label;

    final startStr = '${_monthName(startDate.month)} ${startDate.day}';
    final endStr = '${_monthName(endDate.month)} ${endDate.day}';

    if (startDate.year != endDate.year) {
      return '$startStr, ${startDate.year} - $endStr, ${endDate.year}';
    }
    return '$startStr - $endStr, ${endDate.year}';
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  /// Calculate date range from preset
  static DateRangeSelection fromPreset(DateRangePreset preset, {bool compare = false}) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    switch (preset) {
      case DateRangePreset.today:
        return DateRangeSelection(
          startDate: today,
          endDate: today.add(const Duration(hours: 23, minutes: 59, seconds: 59)),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.yesterday:
        final yesterday = today.subtract(const Duration(days: 1));
        return DateRangeSelection(
          startDate: yesterday,
          endDate: yesterday.add(const Duration(hours: 23, minutes: 59, seconds: 59)),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.last7Days:
        return DateRangeSelection(
          startDate: today.subtract(const Duration(days: 6)),
          endDate: today.add(const Duration(hours: 23, minutes: 59, seconds: 59)),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.last30Days:
        return DateRangeSelection(
          startDate: today.subtract(const Duration(days: 29)),
          endDate: today.add(const Duration(hours: 23, minutes: 59, seconds: 59)),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.last90Days:
        return DateRangeSelection(
          startDate: today.subtract(const Duration(days: 89)),
          endDate: today.add(const Duration(hours: 23, minutes: 59, seconds: 59)),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.thisWeek:
        final startOfWeek = today.subtract(Duration(days: today.weekday - 1));
        final endOfWeek = startOfWeek.add(const Duration(days: 6, hours: 23, minutes: 59, seconds: 59));
        return DateRangeSelection(
          startDate: startOfWeek,
          endDate: endOfWeek,
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.lastWeek:
        final startOfThisWeek = today.subtract(Duration(days: today.weekday - 1));
        final startOfLastWeek = startOfThisWeek.subtract(const Duration(days: 7));
        final endOfLastWeek = startOfLastWeek.add(const Duration(days: 6, hours: 23, minutes: 59, seconds: 59));
        return DateRangeSelection(
          startDate: startOfLastWeek,
          endDate: endOfLastWeek,
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.thisMonth:
        final startOfMonth = DateTime(now.year, now.month, 1);
        final endOfMonth = DateTime(now.year, now.month + 1, 0, 23, 59, 59);
        return DateRangeSelection(
          startDate: startOfMonth,
          endDate: endOfMonth,
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.lastMonth:
        final startOfLastMonth = DateTime(now.year, now.month - 1, 1);
        final endOfLastMonth = DateTime(now.year, now.month, 0, 23, 59, 59);
        return DateRangeSelection(
          startDate: startOfLastMonth,
          endDate: endOfLastMonth,
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.thisQuarter:
        final quarter = ((now.month - 1) ~/ 3);
        final startMonth = quarter * 3 + 1;
        final startOfQuarter = DateTime(now.year, startMonth, 1);
        final endOfQuarter = DateTime(now.year, startMonth + 3, 0, 23, 59, 59);
        return DateRangeSelection(
          startDate: startOfQuarter,
          endDate: endOfQuarter,
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.thisYear:
        return DateRangeSelection(
          startDate: DateTime(now.year, 1, 1),
          endDate: DateTime(now.year, 12, 31, 23, 59, 59),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.yearToDate:
        return DateRangeSelection(
          startDate: DateTime(now.year, 1, 1),
          endDate: today.add(const Duration(hours: 23, minutes: 59, seconds: 59)),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.allTime:
        return DateRangeSelection(
          startDate: DateTime(now.year - 10),
          endDate: DateTime(now.year + 10),
          preset: preset,
          compareToPrevious: compare,
        );
      case DateRangePreset.custom:
        // Default to last 30 days for custom
        return DateRangeSelection(
          startDate: today.subtract(const Duration(days: 29)),
          endDate: today.add(const Duration(hours: 23, minutes: 59, seconds: 59)),
          preset: preset,
          compareToPrevious: compare,
        );
    }
  }

  /// Convert to DateTimeRange for Flutter compatibility
  DateTimeRange toDateTimeRange() {
    return DateTimeRange(start: startDate, end: endDate);
  }

  /// Create from DateTimeRange
  static DateRangeSelection fromDateTimeRange(
    DateTimeRange range, {
    bool compareToPrevious = false,
  }) {
    return DateRangeSelection(
      startDate: range.start,
      endDate: range.end,
      preset: DateRangePreset.custom,
      compareToPrevious: compareToPrevious,
    );
  }

  /// Copy with modified properties
  DateRangeSelection copyWith({
    DateTime? startDate,
    DateTime? endDate,
    DateRangePreset? preset,
    bool? compareToPrevious,
  }) {
    return DateRangeSelection(
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      preset: preset ?? this.preset,
      compareToPrevious: compareToPrevious ?? this.compareToPrevious,
    );
  }
}

/// Premium Date Range Picker Widget
/// Luxury design with gold accents, calendar UI, and presets
class PremiumDateRangePicker extends StatefulWidget {
  final DateRangeSelection? initialSelection;
  final ValueChanged<DateRangeSelection> onSelectionChanged;
  final bool showCompareToggle;
  final bool showAllTimeOption;
  final List<DateRangePreset>? presets;

  const PremiumDateRangePicker({
    super.key,
    this.initialSelection,
    required this.onSelectionChanged,
    this.showCompareToggle = true,
    this.showAllTimeOption = true,
    this.presets,
  });

  @override
  State<PremiumDateRangePicker> createState() => _PremiumDateRangePickerState();
}

class _PremiumDateRangePickerState extends State<PremiumDateRangePicker> {
  late DateRangeSelection _selection;
  late DateTime _focusedMonth;
  DateTime? _customStartDate;
  DateTime? _customEndDate;
  bool _isSelectingEnd = false;
  bool _showCalendar = false;

  List<DateRangePreset> get _presets => widget.presets ?? [
    DateRangePreset.today,
    DateRangePreset.last7Days,
    DateRangePreset.last30Days,
    DateRangePreset.last90Days,
    DateRangePreset.yearToDate,
    if (widget.showAllTimeOption) DateRangePreset.allTime,
  ];

  @override
  void initState() {
    super.initState();
    _selection = widget.initialSelection ??
        DateRangeSelection.fromPreset(DateRangePreset.thisMonth);
    _focusedMonth = DateTime.now();
    if (_selection.preset == DateRangePreset.custom) {
      _customStartDate = _selection.startDate;
      _customEndDate = _selection.endDate;
    }
  }

  void _selectPreset(DateRangePreset preset) {
    HapticFeedback.lightImpact();
    if (preset == DateRangePreset.custom) {
      setState(() {
        _showCalendar = true;
        _customStartDate = null;
        _customEndDate = null;
        _isSelectingEnd = false;
      });
    } else {
      setState(() {
        _showCalendar = false;
        _selection = DateRangeSelection.fromPreset(
          preset,
          compare: _selection.compareToPrevious,
        );
      });
      widget.onSelectionChanged(_selection);
    }
  }

  void _selectDate(DateTime date) {
    HapticFeedback.selectionClick();
    setState(() {
      if (!_isSelectingEnd || _customStartDate == null) {
        _customStartDate = date;
        _customEndDate = null;
        _isSelectingEnd = true;
      } else {
        if (date.isBefore(_customStartDate!)) {
          _customEndDate = _customStartDate;
          _customStartDate = date;
        } else {
          _customEndDate = date;
        }
        _isSelectingEnd = false;
      }
    });
  }

  void _applyCustomRange() {
    if (_customStartDate != null && _customEndDate != null) {
      HapticFeedback.mediumImpact();
      setState(() {
        _selection = DateRangeSelection(
          startDate: _customStartDate!,
          endDate: DateTime(
            _customEndDate!.year,
            _customEndDate!.month,
            _customEndDate!.day,
            23, 59, 59,
          ),
          preset: DateRangePreset.custom,
          compareToPrevious: _selection.compareToPrevious,
        );
        _showCalendar = false;
      });
      widget.onSelectionChanged(_selection);
    }
  }

  void _clearSelection() {
    HapticFeedback.lightImpact();
    setState(() {
      _customStartDate = null;
      _customEndDate = null;
      _isSelectingEnd = false;
    });
  }

  void _toggleCompare(bool value) {
    HapticFeedback.selectionClick();
    setState(() {
      _selection = DateRangeSelection(
        startDate: _selection.startDate,
        endDate: _selection.endDate,
        preset: _selection.preset,
        compareToPrevious: value,
      );
    });
    widget.onSelectionChanged(_selection);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Preset Chips
        _buildPresetChips(isDark),

        // Calendar View (when custom is selected)
        if (_showCalendar) ...[
          const SizedBox(height: 16),
          _buildCalendarCard(isDark),
        ],

        // Compare Toggle
        if (widget.showCompareToggle && !_showCalendar) ...[
          const SizedBox(height: 12),
          _buildCompareToggle(isDark),
        ],
      ],
    );
  }

  Widget _buildPresetChips(bool isDark) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          ..._presets.map((preset) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: _PresetChip(
              label: preset.label,
              isSelected: _selection.preset == preset && !_showCalendar,
              onTap: () => _selectPreset(preset),
            ),
          )),
          // Custom Range Button
          _PresetChip(
            label: 'Custom',
            icon: Iconsax.calendar_1,
            isSelected: _showCalendar || _selection.preset == DateRangePreset.custom,
            onTap: () => _selectPreset(DateRangePreset.custom),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildCalendarCard(bool isDark) {
    return IrisCard(
      variant: IrisCardVariant.elevated,
      tier: LuxuryTier.gold,
      padding: EdgeInsets.zero,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Calendar Header
          _buildCalendarHeader(isDark),

          // Week Day Headers
          _buildWeekDayHeaders(isDark),

          // Calendar Grid
          _buildCalendarGrid(isDark),

          // Selected Range Display
          _buildSelectedRangeDisplay(isDark),

          // Action Buttons
          _buildActionButtons(isDark),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1);
  }

  Widget _buildCalendarHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [LuxuryColors.deepEmerald.withValues(alpha: 0.3), LuxuryColors.obsidian]
              : [LuxuryColors.jadePremium.withValues(alpha: 0.1), Colors.white],
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: () {
              HapticFeedback.selectionClick();
              setState(() {
                _focusedMonth = DateTime(
                  _focusedMonth.year,
                  _focusedMonth.month - 1,
                );
              });
            },
            icon: Icon(
              Iconsax.arrow_left_2,
              color: LuxuryColors.jadePremium,
              size: 20,
            ),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
          Text(
            _getMonthYearString(_focusedMonth),
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          IconButton(
            onPressed: () {
              HapticFeedback.selectionClick();
              setState(() {
                _focusedMonth = DateTime(
                  _focusedMonth.year,
                  _focusedMonth.month + 1,
                );
              });
            },
            icon: Icon(
              Iconsax.arrow_right_3,
              color: LuxuryColors.jadePremium,
              size: 20,
            ),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ],
      ),
    );
  }

  Widget _buildWeekDayHeaders(bool isDark) {
    const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: weekDays.map((day) => SizedBox(
          width: 36,
          child: Text(
            day,
            textAlign: TextAlign.center,
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
        )).toList(),
      ),
    );
  }

  Widget _buildCalendarGrid(bool isDark) {
    final firstDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final lastDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0);
    final daysInMonth = lastDayOfMonth.day;
    final startWeekday = firstDayOfMonth.weekday; // 1 = Monday

    final List<Widget> dayWidgets = [];

    // Empty slots for days before the first of the month
    for (int i = 1; i < startWeekday; i++) {
      dayWidgets.add(const SizedBox(width: 36, height: 36));
    }

    // Days of the month
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_focusedMonth.year, _focusedMonth.month, day);
      dayWidgets.add(_buildDayCell(date, isDark));
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: GridView.count(
        crossAxisCount: 7,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 4,
        crossAxisSpacing: 0,
        childAspectRatio: 1.3,
        children: dayWidgets,
      ),
    );
  }

  Widget _buildDayCell(DateTime date, bool isDark) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final isToday = date.year == today.year &&
                    date.month == today.month &&
                    date.day == today.day;
    final isFuture = date.isAfter(today);

    final isStartDate = _customStartDate != null &&
        date.year == _customStartDate!.year &&
        date.month == _customStartDate!.month &&
        date.day == _customStartDate!.day;

    final isEndDate = _customEndDate != null &&
        date.year == _customEndDate!.year &&
        date.month == _customEndDate!.month &&
        date.day == _customEndDate!.day;

    final isInRange = _customStartDate != null &&
        _customEndDate != null &&
        date.isAfter(_customStartDate!.subtract(const Duration(days: 1))) &&
        date.isBefore(_customEndDate!.add(const Duration(days: 1)));

    Color bgColor;
    Color textColor;
    BoxDecoration? decoration;

    if (isStartDate || isEndDate) {
      bgColor = LuxuryColors.rolexGreen;
      textColor = Colors.white;
      decoration = BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      );
    } else if (isInRange) {
      bgColor = LuxuryColors.jadePremium.withValues(alpha: 0.2);
      textColor = isDark ? LuxuryColors.jadePremium : LuxuryColors.deepEmerald;
      decoration = BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      );
    } else if (isToday) {
      bgColor = Colors.transparent;
      textColor = LuxuryColors.jadePremium;
      decoration = BoxDecoration(
        border: Border.all(color: LuxuryColors.jadePremium, width: 1.5),
        borderRadius: BorderRadius.circular(8),
      );
    } else {
      bgColor = Colors.transparent;
      textColor = isFuture
          ? LuxuryColors.textMuted.withValues(alpha: 0.5)
          : (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight);
      decoration = null;
    }

    return GestureDetector(
      onTap: isFuture ? null : () => _selectDate(date),
      child: Container(
        width: 36,
        height: 36,
        decoration: decoration,
        child: Center(
          child: Text(
            date.day.toString(),
            style: IrisTheme.labelMedium.copyWith(
              color: textColor,
              fontWeight: isStartDate || isEndDate || isToday
                  ? FontWeight.w700
                  : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedRangeDisplay(bool isDark) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.deepEmerald.withValues(alpha: 0.15)
            : LuxuryColors.jadePremium.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.jadePremium.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Iconsax.calendar_tick,
            size: 18,
            color: LuxuryColors.jadePremium,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isSelectingEnd && _customStartDate != null
                      ? 'Select end date'
                      : 'Selected Range',
                  style: IrisTheme.labelSmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _getSelectedRangeText(),
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          if (_customStartDate != null || _customEndDate != null)
            IconButton(
              onPressed: _clearSelection,
              icon: Icon(
                Iconsax.close_circle,
                size: 20,
                color: LuxuryColors.textMuted,
              ),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(bool isDark) {
    final canApply = _customStartDate != null && _customEndDate != null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() {
                  _showCalendar = false;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isDark
                      ? LuxuryColors.obsidian
                      : LuxuryColors.platinum.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark
                        ? LuxuryColors.coolGray.withValues(alpha: 0.2)
                        : LuxuryColors.coolGray.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  'Cancel',
                  textAlign: TextAlign.center,
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: canApply ? _applyCustomRange : null,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  gradient: canApply
                      ? LuxuryColors.emeraldGradient
                      : null,
                  color: canApply
                      ? null
                      : (isDark
                          ? LuxuryColors.coolGray.withValues(alpha: 0.2)
                          : LuxuryColors.coolGray.withValues(alpha: 0.3)),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: canApply
                      ? [
                          BoxShadow(
                            color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  'Apply',
                  textAlign: TextAlign.center,
                  style: IrisTheme.labelMedium.copyWith(
                    color: canApply
                        ? Colors.white
                        : LuxuryColors.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompareToggle(bool isDark) {
    return GestureDetector(
      onTap: () => _toggleCompare(!_selection.compareToPrevious),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: _selection.compareToPrevious
              ? LuxuryColors.jadePremium.withValues(alpha: 0.15)
              : (isDark ? LuxuryColors.obsidian : Colors.white),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _selection.compareToPrevious
                ? LuxuryColors.jadePremium.withValues(alpha: 0.4)
                : (isDark
                    ? LuxuryColors.coolGray.withValues(alpha: 0.2)
                    : LuxuryColors.coolGray.withValues(alpha: 0.3)),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _selection.compareToPrevious
                  ? Iconsax.chart_success5
                  : Iconsax.chart_success,
              size: 18,
              color: _selection.compareToPrevious
                  ? LuxuryColors.jadePremium
                  : LuxuryColors.textMuted,
            ),
            const SizedBox(width: 8),
            Text(
              'Compare to previous period',
              style: IrisTheme.labelMedium.copyWith(
                color: _selection.compareToPrevious
                    ? LuxuryColors.jadePremium
                    : (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                fontWeight: _selection.compareToPrevious
                    ? FontWeight.w600
                    : FontWeight.w500,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: _selection.compareToPrevious
                    ? LuxuryColors.rolexGreen
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(5),
                border: Border.all(
                  color: _selection.compareToPrevious
                      ? LuxuryColors.rolexGreen
                      : LuxuryColors.textMuted,
                  width: 1.5,
                ),
              ),
              child: _selection.compareToPrevious
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  String _getMonthYearString(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }

  String _getSelectedRangeText() {
    if (_customStartDate == null) {
      return 'Tap a date to start';
    }

    final startStr = _formatDate(_customStartDate!);

    if (_customEndDate == null) {
      return '$startStr - ...';
    }

    return '$startStr - ${_formatDate(_customEndDate!)}';
  }

  String _formatDate(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Preset selection chip with premium styling
class _PresetChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PresetChip({
    required this.label,
    this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          gradient: isSelected ? LuxuryColors.emeraldGradient : null,
          color: isSelected
              ? null
              : (isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? LuxuryColors.rolexGreen
                : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 14,
                color: isSelected
                    ? Colors.white
                    : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: IrisTheme.labelMedium.copyWith(
                color: isSelected
                    ? Colors.white
                    : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Compact date range button that shows current selection and opens picker
class DateRangePickerButton extends StatelessWidget {
  final DateRangeSelection selection;
  final VoidCallback onTap;
  final bool compact;

  const DateRangePickerButton({
    super.key,
    required this.selection,
    required this.onTap,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 10 : 14,
          vertical: compact ? 6 : 10,
        ),
        decoration: BoxDecoration(
          color: isDark
              ? LuxuryColors.deepEmerald.withValues(alpha: 0.2)
              : LuxuryColors.jadePremium.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(compact ? 8 : 12),
          border: Border.all(
            color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Iconsax.calendar_1,
              size: compact ? 14 : 16,
              color: LuxuryColors.jadePremium,
            ),
            const SizedBox(width: 8),
            Text(
              selection.formattedRange,
              style: (compact ? IrisTheme.labelSmall : IrisTheme.labelMedium).copyWith(
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 6),
            Icon(
              Iconsax.arrow_down_1,
              size: compact ? 12 : 14,
              color: LuxuryColors.jadePremium,
            ),
          ],
        ),
      ),
    );
  }
}

/// Centered dialog wrapper for date range picker
Future<DateRangeSelection?> showPremiumDateRangePicker({
  required BuildContext context,
  DateRangeSelection? initialSelection,
  bool showCompareToggle = true,
  bool showAllTimeOption = true,
  List<DateRangePreset>? presets,
}) async {
  DateRangeSelection? result = initialSelection;

  HapticFeedback.mediumImpact();
  await showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.black54,
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (ctx, animation, secondaryAnimation) {
      final isDark = Theme.of(ctx).brightness == Brightness.dark;

      return BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: Center(
          child: Material(
            color: Colors.transparent,
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              constraints: const BoxConstraints(maxWidth: 400),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.obsidian : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.jadePremium.withValues(alpha: 0.2),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title row with close button
                    Row(
                      children: [
                        Icon(
                          Iconsax.calendar_2,
                          color: LuxuryColors.jadePremium,
                          size: 22,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Select Date Range',
                            style: IrisTheme.titleMedium.copyWith(
                              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.of(ctx).pop(),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : Colors.black.withValues(alpha: 0.05),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.close,
                              size: 18,
                              color: isDark ? Colors.white70 : Colors.black54,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Date Range Picker
                    PremiumDateRangePicker(
                      initialSelection: initialSelection,
                      showCompareToggle: showCompareToggle,
                      showAllTimeOption: showAllTimeOption,
                      presets: presets,
                      onSelectionChanged: (selection) {
                        result = selection;
                        Navigator.of(ctx).pop();
                      },
                    ),
                  ],
                ),
              ),
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

  return result;
}

// ============================================================================
// ALTERNATIVE API - DateRangePicker Widget
// Matches the requested widget API for flexibility
// ============================================================================

/// Date Range Picker Widget with configurable presets
///
/// A premium date range picker following the IRIS luxury design system.
/// Provides preset quick-select options and a custom calendar picker.
///
/// Example usage:
/// ```dart
/// DateRangePicker(
///   initialRange: DateTimeRange(start: DateTime.now().subtract(Duration(days: 30)), end: DateTime.now()),
///   presets: [DateRangePreset.today, DateRangePreset.thisWeek, DateRangePreset.thisMonth],
///   onRangeSelected: (range) => print('Selected: ${range.start} - ${range.end}'),
///   onCompareToggled: (compare) => print('Compare: $compare'),
/// )
/// ```
class DateRangePicker extends StatefulWidget {
  /// Initial date range selection
  final DateTimeRange? initialRange;

  /// List of preset options to display
  /// Defaults to common presets if not specified
  final List<DateRangePreset>? presets;

  /// Callback when a date range is selected
  final ValueChanged<DateTimeRange>? onRangeSelected;

  /// Callback when compare toggle changes
  final ValueChanged<bool>? onCompareToggled;

  /// Whether to show the compare to previous period toggle
  final bool showCompareToggle;

  /// Whether to show the All Time option
  final bool showAllTimeOption;

  /// Initial compare state
  final bool initialCompare;

  /// Compact mode for smaller displays
  final bool compact;

  const DateRangePicker({
    super.key,
    this.initialRange,
    this.presets,
    this.onRangeSelected,
    this.onCompareToggled,
    this.showCompareToggle = true,
    this.showAllTimeOption = false,
    this.initialCompare = false,
    this.compact = false,
  });

  /// Default presets used when none specified
  static const List<DateRangePreset> defaultPresets = [
    DateRangePreset.today,
    DateRangePreset.yesterday,
    DateRangePreset.thisWeek,
    DateRangePreset.lastWeek,
    DateRangePreset.thisMonth,
    DateRangePreset.lastMonth,
    DateRangePreset.thisQuarter,
    DateRangePreset.thisYear,
  ];

  @override
  State<DateRangePicker> createState() => _DateRangePickerState();
}

class _DateRangePickerState extends State<DateRangePicker> {
  late DateRangeSelection _selection;

  @override
  void initState() {
    super.initState();
    if (widget.initialRange != null) {
      _selection = DateRangeSelection.fromDateTimeRange(
        widget.initialRange!,
        compareToPrevious: widget.initialCompare,
      );
    } else {
      _selection = DateRangeSelection.fromPreset(
        DateRangePreset.thisMonth,
        compare: widget.initialCompare,
      );
    }
  }

  void _handleSelectionChanged(DateRangeSelection selection) {
    setState(() {
      _selection = selection;
    });
    widget.onRangeSelected?.call(selection.toDateTimeRange());
    if (selection.compareToPrevious != _selection.compareToPrevious) {
      widget.onCompareToggled?.call(selection.compareToPrevious);
    }
  }

  @override
  Widget build(BuildContext context) {
    final effectivePresets = widget.presets ?? DateRangePicker.defaultPresets;

    return PremiumDateRangePicker(
      initialSelection: _selection,
      presets: effectivePresets,
      showCompareToggle: widget.showCompareToggle,
      showAllTimeOption: widget.showAllTimeOption,
      onSelectionChanged: _handleSelectionChanged,
    );
  }
}

/// Inline Date Range Picker that can be embedded directly in a page
/// Shows the full calendar UI without needing a bottom sheet
class InlineDateRangePicker extends StatefulWidget {
  /// Initial selection
  final DateRangeSelection? initialSelection;

  /// Callback when selection changes
  final ValueChanged<DateRangeSelection>? onSelectionChanged;

  /// Available presets
  final List<DateRangePreset>? presets;

  /// Show compare toggle
  final bool showCompareToggle;

  /// Show all time option
  final bool showAllTimeOption;

  /// Elevation for the calendar card
  final double elevation;

  const InlineDateRangePicker({
    super.key,
    this.initialSelection,
    this.onSelectionChanged,
    this.presets,
    this.showCompareToggle = true,
    this.showAllTimeOption = false,
    this.elevation = 0,
  });

  @override
  State<InlineDateRangePicker> createState() => _InlineDateRangePickerState();
}

class _InlineDateRangePickerState extends State<InlineDateRangePicker> {
  late DateRangeSelection _selection;
  late DateTime _focusedMonth;
  DateTime? _customStartDate;
  DateTime? _customEndDate;
  bool _isSelectingEnd = false;

  List<DateRangePreset> get _presets => widget.presets ?? [
    DateRangePreset.today,
    DateRangePreset.yesterday,
    DateRangePreset.thisWeek,
    DateRangePreset.lastWeek,
    DateRangePreset.thisMonth,
    DateRangePreset.lastMonth,
    DateRangePreset.thisQuarter,
    if (widget.showAllTimeOption) DateRangePreset.allTime,
  ];

  @override
  void initState() {
    super.initState();
    _selection = widget.initialSelection ??
        DateRangeSelection.fromPreset(DateRangePreset.thisMonth);
    _focusedMonth = DateTime.now();
    if (_selection.preset == DateRangePreset.custom) {
      _customStartDate = _selection.startDate;
      _customEndDate = _selection.endDate;
    }
  }

  void _selectPreset(DateRangePreset preset) {
    HapticFeedback.lightImpact();
    if (preset == DateRangePreset.custom) {
      setState(() {
        _customStartDate = null;
        _customEndDate = null;
        _isSelectingEnd = false;
      });
    } else {
      final newSelection = DateRangeSelection.fromPreset(
        preset,
        compare: _selection.compareToPrevious,
      );
      setState(() {
        _selection = newSelection;
      });
      widget.onSelectionChanged?.call(newSelection);
    }
  }

  void _selectDate(DateTime date) {
    HapticFeedback.selectionClick();
    setState(() {
      if (!_isSelectingEnd || _customStartDate == null) {
        _customStartDate = date;
        _customEndDate = null;
        _isSelectingEnd = true;
      } else {
        if (date.isBefore(_customStartDate!)) {
          _customEndDate = _customStartDate;
          _customStartDate = date;
        } else {
          _customEndDate = date;
        }
        _isSelectingEnd = false;

        // Auto-apply when both dates selected
        if (_customStartDate != null && _customEndDate != null) {
          final newSelection = DateRangeSelection(
            startDate: _customStartDate!,
            endDate: DateTime(
              _customEndDate!.year,
              _customEndDate!.month,
              _customEndDate!.day,
              23, 59, 59,
            ),
            preset: DateRangePreset.custom,
            compareToPrevious: _selection.compareToPrevious,
          );
          _selection = newSelection;
          widget.onSelectionChanged?.call(newSelection);
        }
      }
    });
  }

  void _toggleCompare(bool value) {
    HapticFeedback.selectionClick();
    final newSelection = _selection.copyWith(compareToPrevious: value);
    setState(() {
      _selection = newSelection;
    });
    widget.onSelectionChanged?.call(newSelection);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      variant: widget.elevation > 0
          ? IrisCardVariant.elevated
          : IrisCardVariant.bordered,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Iconsax.calendar_2,
                  color: LuxuryColors.jadePremium,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Date Range',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                      ),
                    ),
                    Text(
                      _selection.formattedRange,
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.jadePremium,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (_selection.preset == DateRangePreset.custom)
                IconButton(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    setState(() {
                      _customStartDate = null;
                      _customEndDate = null;
                      _isSelectingEnd = false;
                    });
                  },
                  icon: Icon(
                    Iconsax.close_circle,
                    size: 20,
                    color: LuxuryColors.textMuted,
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
            ],
          ),

          const SizedBox(height: 16),

          // Preset Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ..._presets.map((preset) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _InlinePresetChip(
                    label: preset.label,
                    isSelected: _selection.preset == preset,
                    onTap: () => _selectPreset(preset),
                  ),
                )),
                _InlinePresetChip(
                  label: 'Custom',
                  icon: Iconsax.calendar_1,
                  isSelected: _selection.preset == DateRangePreset.custom,
                  onTap: () => _selectPreset(DateRangePreset.custom),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Calendar
          _buildCalendar(isDark),

          // Compare Toggle
          if (widget.showCompareToggle) ...[
            const SizedBox(height: 12),
            _buildCompareToggle(isDark),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildCalendar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.richBlack.withValues(alpha: 0.5)
            : LuxuryColors.cream.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.jadePremium.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        children: [
          // Month Navigation
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    setState(() {
                      _focusedMonth = DateTime(
                        _focusedMonth.year,
                        _focusedMonth.month - 1,
                      );
                    });
                  },
                  icon: Icon(
                    Iconsax.arrow_left_2,
                    color: LuxuryColors.jadePremium,
                    size: 18,
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
                Text(
                  _getMonthYearString(_focusedMonth),
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                IconButton(
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    setState(() {
                      _focusedMonth = DateTime(
                        _focusedMonth.year,
                        _focusedMonth.month + 1,
                      );
                    });
                  },
                  icon: Icon(
                    Iconsax.arrow_right_3,
                    color: LuxuryColors.jadePremium,
                    size: 18,
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
              ],
            ),
          ),

          // Week Days Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
                  .map((day) => SizedBox(
                        width: 32,
                        child: Text(
                          day,
                          textAlign: TextAlign.center,
                          style: IrisTheme.labelSmall.copyWith(
                            color: LuxuryColors.textMuted,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ))
                  .toList(),
            ),
          ),

          const SizedBox(height: 4),

          // Calendar Grid
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: _buildCalendarGrid(isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarGrid(bool isDark) {
    final firstDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final lastDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0);
    final daysInMonth = lastDayOfMonth.day;
    final startWeekday = firstDayOfMonth.weekday;

    final List<Widget> dayWidgets = [];

    // Empty slots before first day
    for (int i = 1; i < startWeekday; i++) {
      dayWidgets.add(const SizedBox(width: 32, height: 32));
    }

    // Days of the month
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_focusedMonth.year, _focusedMonth.month, day);
      dayWidgets.add(_buildDayCell(date, isDark));
    }

    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 2,
      crossAxisSpacing: 0,
      childAspectRatio: 1.4,
      children: dayWidgets,
    );
  }

  Widget _buildDayCell(DateTime date, bool isDark) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final isToday = date.year == today.year &&
        date.month == today.month &&
        date.day == today.day;
    final isFuture = date.isAfter(today);

    // Check if date is in current selection
    final isInSelection = !date.isBefore(_selection.startDate) &&
        !date.isAfter(DateTime(_selection.endDate.year, _selection.endDate.month, _selection.endDate.day));

    final isStartDate = _customStartDate != null &&
        date.year == _customStartDate!.year &&
        date.month == _customStartDate!.month &&
        date.day == _customStartDate!.day;

    final isEndDate = _customEndDate != null &&
        date.year == _customEndDate!.year &&
        date.month == _customEndDate!.month &&
        date.day == _customEndDate!.day;

    final isInCustomRange = _customStartDate != null &&
        _customEndDate != null &&
        date.isAfter(_customStartDate!.subtract(const Duration(days: 1))) &&
        date.isBefore(_customEndDate!.add(const Duration(days: 1)));

    Color? bgColor;
    Color textColor;
    BoxDecoration? decoration;

    if (isStartDate || isEndDate) {
      bgColor = LuxuryColors.rolexGreen;
      textColor = Colors.white;
      decoration = BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      );
    } else if (isInCustomRange || (isInSelection && _selection.preset != DateRangePreset.custom)) {
      bgColor = LuxuryColors.jadePremium.withValues(alpha: 0.15);
      textColor = isDark ? LuxuryColors.jadePremium : LuxuryColors.deepEmerald;
      decoration = BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      );
    } else if (isToday) {
      bgColor = null;
      textColor = LuxuryColors.jadePremium;
      decoration = BoxDecoration(
        border: Border.all(color: LuxuryColors.jadePremium, width: 1.5),
        borderRadius: BorderRadius.circular(6),
      );
    } else {
      bgColor = null;
      textColor = isFuture
          ? LuxuryColors.textMuted.withValues(alpha: 0.4)
          : (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight);
      decoration = null;
    }

    return GestureDetector(
      onTap: isFuture ? null : () => _selectDate(date),
      child: Container(
        width: 32,
        height: 32,
        decoration: decoration,
        child: Center(
          child: Text(
            date.day.toString(),
            style: IrisTheme.labelSmall.copyWith(
              color: textColor,
              fontWeight: isStartDate || isEndDate || isToday
                  ? FontWeight.w700
                  : FontWeight.w500,
              fontSize: 11,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCompareToggle(bool isDark) {
    return GestureDetector(
      onTap: () => _toggleCompare(!_selection.compareToPrevious),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: _selection.compareToPrevious
              ? LuxuryColors.jadePremium.withValues(alpha: 0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: _selection.compareToPrevious
                ? LuxuryColors.jadePremium.withValues(alpha: 0.3)
                : (isDark
                    ? LuxuryColors.coolGray.withValues(alpha: 0.15)
                    : LuxuryColors.coolGray.withValues(alpha: 0.2)),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _selection.compareToPrevious
                  ? Iconsax.chart_success5
                  : Iconsax.chart_success,
              size: 16,
              color: _selection.compareToPrevious
                  ? LuxuryColors.jadePremium
                  : LuxuryColors.textMuted,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Compare to previous period',
                style: IrisTheme.labelSmall.copyWith(
                  color: _selection.compareToPrevious
                      ? LuxuryColors.jadePremium
                      : (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
                  fontWeight: _selection.compareToPrevious
                      ? FontWeight.w600
                      : FontWeight.w500,
                ),
              ),
            ),
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: _selection.compareToPrevious
                    ? LuxuryColors.rolexGreen
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                  color: _selection.compareToPrevious
                      ? LuxuryColors.rolexGreen
                      : LuxuryColors.textMuted,
                  width: 1.5,
                ),
              ),
              child: _selection.compareToPrevious
                  ? const Icon(Icons.check, size: 12, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  String _getMonthYearString(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }
}

/// Compact preset chip for inline picker
class _InlinePresetChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _InlinePresetChip({
    required this.label,
    this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          gradient: isSelected ? LuxuryColors.emeraldGradient : null,
          color: isSelected
              ? null
              : (isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? LuxuryColors.rolexGreen
                : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 12,
                color: isSelected
                    ? Colors.white
                    : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
              ),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: IrisTheme.labelSmall.copyWith(
                color: isSelected
                    ? Colors.white
                    : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Show a dialog version of the date range picker
Future<DateTimeRange?> showDateRangePickerDialog({
  required BuildContext context,
  DateTimeRange? initialRange,
  List<DateRangePreset>? presets,
  bool showCompareToggle = false,
  bool showAllTimeOption = false,
}) async {
  final result = await showPremiumDateRangePicker(
    context: context,
    initialSelection: initialRange != null
        ? DateRangeSelection.fromDateTimeRange(initialRange)
        : null,
    presets: presets,
    showCompareToggle: showCompareToggle,
    showAllTimeOption: showAllTimeOption,
  );

  return result?.toDateTimeRange();
}
