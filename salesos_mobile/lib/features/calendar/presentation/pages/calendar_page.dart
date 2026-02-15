import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/event_detail_sheet.dart';
import '../../data/calendar_service.dart';

class CalendarPage extends ConsumerStatefulWidget {
  const CalendarPage({super.key});

  @override
  ConsumerState<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends ConsumerState<CalendarPage> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
  }

  Future<void> _onRefresh() async {
    ref.invalidate(calendarEventsProvider(_focusedDay));
  }

  List<CalendarEventModel> _getEventsForDay(
      DateTime day, Map<DateTime, List<CalendarEventModel>> events) {
    final normalizedDay = DateTime(day.year, day.month, day.day);
    return events[normalizedDay] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final eventsAsync = ref.watch(calendarEventsProvider(_focusedDay));

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Calendar',
        actions: [
          IconButton(
            icon: Icon(
              Iconsax.calendar_add,
              color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
            ),
            onPressed: () {
              HapticFeedback.lightImpact();
              // Navigate to add event
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Calendar Widget
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: eventsAsync.when(
              data: (events) => TableCalendar<CalendarEventModel>(
                firstDay: DateTime.utc(2020, 1, 1),
                lastDay: DateTime.utc(2030, 12, 31),
                focusedDay: _focusedDay,
                calendarFormat: _calendarFormat,
                eventLoader: (day) => _getEventsForDay(day, events),
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                onDaySelected: (selectedDay, focusedDay) {
                  HapticFeedback.lightImpact();
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                },
                onFormatChanged: (format) {
                  setState(() => _calendarFormat = format);
                },
                onPageChanged: (focusedDay) {
                  setState(() {
                    _focusedDay = focusedDay;
                  });
                  // Invalidate to fetch new month's events
                  ref.invalidate(calendarEventsProvider(focusedDay));
                },
                calendarStyle: CalendarStyle(
                  outsideDaysVisible: false,
                  weekendTextStyle: TextStyle(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  defaultTextStyle: TextStyle(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                  todayDecoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  todayTextStyle: TextStyle(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                  selectedDecoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen,
                    shape: BoxShape.circle,
                  ),
                  selectedTextStyle: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                  markerDecoration: BoxDecoration(
                    color: IrisTheme.info,
                    shape: BoxShape.circle,
                  ),
                  markersMaxCount: 3,
                ),
                headerStyle: HeaderStyle(
                  titleTextStyle: IrisTheme.titleMedium.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                  formatButtonTextStyle: IrisTheme.labelSmall.copyWith(
                    color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                  ),
                  formatButtonDecoration: BoxDecoration(
                    border: Border.all(
                      color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  leftChevronIcon: Icon(
                    Icons.chevron_left,
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                  rightChevronIcon: Icon(
                    Icons.chevron_right,
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                daysOfWeekStyle: DaysOfWeekStyle(
                  weekdayStyle: IrisTheme.labelSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  weekendStyle: IrisTheme.labelSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                ),
              ),
              loading: () => SizedBox(
                height: 350,
                child: Center(
                  child: CircularProgressIndicator(
                    color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                  ),
                ),
              ),
              error: (error, stackTrace) => SizedBox(
                height: 350,
                child: Center(
                  child: Text(
                    'Error loading calendar',
                    style: TextStyle(color: IrisTheme.error),
                  ),
                ),
              ),
            ),
          ).animate().fadeIn(duration: 400.ms),

          const SizedBox(height: 16),

          // Events for selected day
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _selectedDay != null
                        ? _formatDate(_selectedDay!)
                        : 'Select a day',
                    style: IrisTheme.titleMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ).animate(delay: 200.ms).fadeIn(),
                  const SizedBox(height: 12),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _onRefresh,
                      color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                      backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
                      child: eventsAsync.when(
                        data: (events) {
                          final dayEvents = _selectedDay != null
                              ? _getEventsForDay(_selectedDay!, events)
                              : <CalendarEventModel>[];

                          if (dayEvents.isEmpty) {
                            return ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                SizedBox(
                                  height: MediaQuery.of(context).size.height * 0.25,
                                  child: Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Iconsax.calendar_1,
                                          size: 48,
                                          color: isDark
                                              ? IrisTheme.darkTextTertiary
                                              : IrisTheme.lightTextTertiary,
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          'No events scheduled',
                                          style: IrisTheme.bodyMedium.copyWith(
                                            color: isDark
                                                ? IrisTheme.darkTextSecondary
                                                : IrisTheme.lightTextSecondary,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Pull down to refresh',
                                          style: IrisTheme.labelSmall.copyWith(
                                            color: isDark
                                                ? IrisTheme.darkTextTertiary
                                                : IrisTheme.lightTextTertiary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            );
                          }

                          return ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: dayEvents.length,
                            itemBuilder: (context, index) {
                              return _EventCard(
                                event: dayEvents[index],
                                focusedDay: _focusedDay,
                              )
                                  .animate(delay: (300 + index * 50).ms)
                                  .fadeIn()
                                  .slideX(begin: 0.1);
                            },
                          );
                        },
                        loading: () => ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.25,
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                                ),
                              ),
                            ),
                          ],
                        ),
                        error: (error, stackTrace) => ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.25,
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'Error loading events',
                                      style: TextStyle(color: IrisTheme.error),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Pull down to retry',
                                      style: IrisTheme.labelSmall.copyWith(
                                        color: isDark
                                            ? IrisTheme.darkTextTertiary
                                            : IrisTheme.lightTextTertiary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
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
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final selectedDate = DateTime(date.year, date.month, date.day);

    if (selectedDate == today) {
      return 'Today';
    } else if (selectedDate == today.add(const Duration(days: 1))) {
      return 'Tomorrow';
    } else if (selectedDate == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    }

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];

    return '${days[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}';
  }
}

class _EventCard extends ConsumerWidget {
  final CalendarEventModel event;
  final DateTime focusedDay;

  const _EventCard({required this.event, required this.focusedDay});

  Color get _typeColor {
    switch (event.type) {
      case EventType.meeting:
        return IrisTheme.info;
      case EventType.call:
        return IrisTheme.success;
      case EventType.task:
        return IrisTheme.warning;
      case EventType.deadline:
        return IrisTheme.error;
      case EventType.other:
        return LuxuryColors.rolexGreen;
    }
  }

  IconData get _typeIcon {
    switch (event.type) {
      case EventType.meeting:
        return Iconsax.people;
      case EventType.call:
        return Iconsax.call;
      case EventType.task:
        return Iconsax.task_square;
      case EventType.deadline:
        return Iconsax.timer_1;
      case EventType.other:
        return Iconsax.calendar;
    }
  }

  /// Get platform-specific color for meeting indicator
  Color _getMeetingPlatformColor(MeetingPlatform platform) {
    switch (platform) {
      case MeetingPlatform.zoom:
        return LuxuryColors.zoomBlue; // Zoom blue
      case MeetingPlatform.teams:
        return const Color(0xFF5558AF); // Teams purple
      case MeetingPlatform.googleMeet:
        return LuxuryColors.googleMeetTeal; // Google Meet teal
      case MeetingPlatform.webex:
        return const Color(0xFF00BCF2); // Webex blue
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  /// Handle reschedule - updates the event in Salesforce
  Future<bool> _handleReschedule(WidgetRef ref, String eventId, DateTime newStartTime, DateTime? newEndTime) async {
    try {
      final calendarService = ref.read(calendarServiceProvider);
      final result = await calendarService.updateEvent(eventId, {
        'startDateTime': newStartTime.toIso8601String(),
        if (newEndTime != null) 'endDateTime': newEndTime.toIso8601String(),
      });
      if (result != null) {
        // Refresh the calendar events
        ref.invalidate(calendarEventsProvider(focusedDay));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      onTap: () {
        HapticFeedback.lightImpact();
        showEventDetailSheet(
          context,
          event,
          onReschedule: (eventId, newStartTime, newEndTime) =>
              _handleReschedule(ref, eventId, newStartTime, newEndTime),
        );
      },
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _typeColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _typeIcon,
              size: 20,
              color: _typeColor,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (event.contactName != null) ...[
                      Icon(
                        Iconsax.user,
                        size: 12,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          event.contactName!,
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (event.durationString.isNotEmpty) ...[
                      Icon(
                        Iconsax.clock,
                        size: 12,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        event.durationString,
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Show video indicator if meeting has joinable link
                  if (event.hasMeetingLink) ...[
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: _getMeetingPlatformColor(event.meetingPlatform).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Icon(
                        Iconsax.video,
                        size: 12,
                        color: _getMeetingPlatformColor(event.meetingPlatform),
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    event.timeString,
                    style: IrisTheme.labelMedium.copyWith(
                      color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              // Show meeting status if applicable
              if (event.meetingStatusText != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: event.isHappeningNow
                        ? IrisTheme.success.withValues(alpha: 0.15)
                        : LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: event.isHappeningNow
                              ? IrisTheme.success
                              : LuxuryColors.champagneGold,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        event.meetingStatusText!,
                        style: IrisTheme.labelSmall.copyWith(
                          color: event.isHappeningNow
                              ? IrisTheme.success
                              : LuxuryColors.champagneGold,
                          fontWeight: FontWeight.w600,
                          fontSize: 8,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
              ],
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _typeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  event.type.value.toUpperCase(),
                  style: IrisTheme.labelSmall.copyWith(
                    color: _typeColor,
                    fontWeight: FontWeight.w500,
                    fontSize: 9,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
