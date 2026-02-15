import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/providers.dart';
import '../../../core/services/crm_data_service.dart';

/// Event type enum
enum EventType {
  meeting('meeting'),
  call('call'),
  task('task'),
  deadline('deadline'),
  other('other');

  final String value;
  const EventType(this.value);

  static EventType fromString(String? type) {
    if (type == null) return EventType.other;
    final normalized = type.toLowerCase();
    switch (normalized) {
      case 'meeting':
        return EventType.meeting;
      case 'call':
        return EventType.call;
      case 'task':
        return EventType.task;
      case 'deadline':
        return EventType.deadline;
      default:
        return EventType.other;
    }
  }
}

/// Meeting platform for video conferencing
enum MeetingPlatform {
  zoom('zoom'),
  teams('teams'),
  googleMeet('google_meet'),
  webex('webex'),
  other('other'),
  none('none');

  final String value;
  const MeetingPlatform(this.value);

  /// Detect platform from meeting URL
  static MeetingPlatform fromUrl(String? url) {
    if (url == null || url.isEmpty) return MeetingPlatform.none;
    final lowerUrl = url.toLowerCase();

    if (lowerUrl.contains('zoom.us') || lowerUrl.contains('zoom.com')) {
      return MeetingPlatform.zoom;
    } else if (lowerUrl.contains('teams.microsoft.com') || lowerUrl.contains('teams.live.com')) {
      return MeetingPlatform.teams;
    } else if (lowerUrl.contains('meet.google.com')) {
      return MeetingPlatform.googleMeet;
    } else if (lowerUrl.contains('webex.com')) {
      return MeetingPlatform.webex;
    } else if (lowerUrl.isNotEmpty) {
      return MeetingPlatform.other;
    }
    return MeetingPlatform.none;
  }

  /// Get display name for the platform
  String get displayName {
    switch (this) {
      case MeetingPlatform.zoom:
        return 'Zoom';
      case MeetingPlatform.teams:
        return 'Microsoft Teams';
      case MeetingPlatform.googleMeet:
        return 'Google Meet';
      case MeetingPlatform.webex:
        return 'Webex';
      case MeetingPlatform.other:
        return 'Video Call';
      case MeetingPlatform.none:
        return '';
    }
  }

  /// Get deep link scheme for the platform
  String? get deepLinkScheme {
    switch (this) {
      case MeetingPlatform.zoom:
        return 'zoomus://';
      case MeetingPlatform.teams:
        return 'msteams://';
      case MeetingPlatform.googleMeet:
        return null; // Google Meet uses web URLs
      case MeetingPlatform.webex:
        return 'webex://';
      default:
        return null;
    }
  }
}

/// Event attendee model
class EventAttendee {
  final String? id;
  final String? name;
  final String? email;
  final String? status; // ACCEPTED, DECLINED, TENTATIVE, PENDING
  final bool isOrganizer;

  EventAttendee({
    this.id,
    this.name,
    this.email,
    this.status,
    this.isOrganizer = false,
  });

  factory EventAttendee.fromJson(Map<String, dynamic> json) {
    return EventAttendee(
      id: json['id'] as String?,
      name: json['name'] as String? ?? json['displayName'] as String?,
      email: json['email'] as String? ?? json['emailAddress'] as String?,
      status: json['status'] as String? ?? json['responseStatus'] as String?,
      isOrganizer: json['isOrganizer'] as bool? ?? json['organizer'] as bool? ?? false,
    );
  }

  /// Get initials for avatar display
  String get initials {
    if (name == null || name!.isEmpty) {
      return email?.substring(0, 1).toUpperCase() ?? '?';
    }
    final parts = name!.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name![0].toUpperCase();
  }

  /// Get display name (name or email)
  String get displayName => name ?? email ?? 'Unknown';

  /// Check if attendee has accepted
  bool get hasAccepted => status?.toUpperCase() == 'ACCEPTED';

  /// Check if attendee has declined
  bool get hasDeclined => status?.toUpperCase() == 'DECLINED';

  /// Check if response is pending
  bool get isPending => status == null || status!.toUpperCase() == 'PENDING';
}

/// Calendar event model
class CalendarEventModel {
  final String id;
  final String title;
  final String? description;
  final DateTime startTime;
  final DateTime? endTime;
  final EventType type;
  final String? contactName;
  final String? contactPhone;
  final String? contactEmail;
  final String? contactId;
  final String? accountName;
  final String? accountId;
  final String? opportunityId;
  final String? opportunityName;
  final String? leadId;
  final String? leadName;
  final String? location;
  final bool isAllDay;

  // Salesforce CRM IDs (for users in Salesforce mode)
  final String? salesforceLeadId;
  final String? salesforceContactId;
  final String? salesforceAccountId;

  // Meeting/Video conference fields
  final String? meetingUrl;
  final String? meetingId;
  final String? meetingPassword;
  final MeetingPlatform meetingPlatform;
  final String? meetingSessionId; // Backend MeetingSession ID for transcripts/analysis

  // Attendee information
  final List<EventAttendee> attendees;
  final String? organizerName;
  final String? organizerEmail;

  // RSVP status
  final String? rsvpStatus; // PENDING, ACCEPTED, DECLINED, TENTATIVE

  CalendarEventModel({
    required this.id,
    required this.title,
    this.description,
    required this.startTime,
    this.endTime,
    required this.type,
    this.contactName,
    this.contactPhone,
    this.contactEmail,
    this.contactId,
    this.accountName,
    this.accountId,
    this.opportunityId,
    this.opportunityName,
    this.leadId,
    this.leadName,
    this.location,
    this.isAllDay = false,
    this.salesforceLeadId,
    this.salesforceContactId,
    this.salesforceAccountId,
    this.meetingUrl,
    this.meetingId,
    this.meetingPassword,
    this.meetingPlatform = MeetingPlatform.none,
    this.meetingSessionId,
    this.attendees = const [],
    this.organizerName,
    this.organizerEmail,
    this.rsvpStatus,
  });

  factory CalendarEventModel.fromJson(Map<String, dynamic> json) {
    // Extract meeting URL from various possible fields
    String? meetingUrl = json['meetingUrl'] as String? ??
        json['conferenceUrl'] as String? ??
        json['joinUrl'] as String? ??
        json['videoConferenceUrl'] as String? ??
        json['zoomLink'] as String? ??
        json['teamsLink'] as String? ??
        json['meetLink'] as String?;

    // Try to extract from location if it contains a meeting URL
    final location = json['location'] as String?;
    if (meetingUrl == null && location != null) {
      meetingUrl = _extractMeetingUrlFromText(location);
    }

    // Try to extract from description if still not found
    final description = json['description'] as String? ?? json['notes'] as String?;
    if (meetingUrl == null && description != null) {
      meetingUrl = _extractMeetingUrlFromText(description);
    }

    // Parse attendees
    final attendeesList = <EventAttendee>[];
    final attendeesJson = json['attendees'] as List? ?? json['participants'] as List?;
    if (attendeesJson != null) {
      for (final a in attendeesJson) {
        if (a is Map<String, dynamic>) {
          attendeesList.add(EventAttendee.fromJson(a));
        }
      }
    }

    return CalendarEventModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ??
          json['subject'] as String? ??
          json['name'] as String? ??
          'Untitled Event',
      description: description,
      startTime: json['startTime'] != null
          ? DateTime.parse(json['startTime'] as String)
          : (json['startDate'] != null
              ? DateTime.parse(json['startDate'] as String)
              : (json['dueDate'] != null
                  ? DateTime.parse(json['dueDate'] as String)
                  : DateTime.now())),
      endTime: json['endTime'] != null
          ? DateTime.parse(json['endTime'] as String)
          : (json['endDate'] != null
              ? DateTime.parse(json['endDate'] as String)
              : null),
      type: EventType.fromString(json['type'] as String? ?? json['activityType'] as String?),
      contactName: json['contactName'] as String? ?? json['contact']?['name'] as String?,
      contactPhone: json['contactPhone'] as String? ?? json['contact']?['phone'] as String?,
      contactEmail: json['contactEmail'] as String? ?? json['contact']?['email'] as String?,
      contactId: json['contactId'] as String? ?? json['contact']?['id'] as String?,
      accountName: json['accountName'] as String? ?? json['account']?['name'] as String?,
      accountId: json['accountId'] as String? ?? json['account']?['id'] as String?,
      opportunityId: json['opportunityId'] as String? ?? json['opportunity']?['id'] as String?,
      opportunityName: json['opportunityName'] as String? ?? json['opportunity']?['name'] as String?,
      leadId: json['leadId'] as String? ?? json['lead']?['id'] as String?,
      leadName: json['leadName'] as String? ?? json['lead']?['name'] as String?,
      location: location,
      isAllDay: json['isAllDay'] as bool? ?? false,
      // Salesforce IDs from direct props or metadata
      salesforceLeadId: json['salesforceLeadId'] as String? ??
          (json['metadata'] as Map<String, dynamic>?)?['salesforceLeadId'] as String?,
      salesforceContactId: json['salesforceContactId'] as String? ??
          (json['metadata'] as Map<String, dynamic>?)?['salesforceContactId'] as String?,
      salesforceAccountId: json['salesforceAccountId'] as String? ??
          (json['metadata'] as Map<String, dynamic>?)?['salesforceAccountId'] as String?,
      meetingUrl: meetingUrl,
      meetingId: json['meetingId'] as String? ?? json['conferenceId'] as String?,
      meetingPassword: json['meetingPassword'] as String? ?? json['passcode'] as String?,
      meetingPlatform: MeetingPlatform.fromUrl(meetingUrl),
      meetingSessionId: json['meetingSessionId'] as String?,
      attendees: attendeesList,
      organizerName: json['organizerName'] as String? ?? json['organizer']?['name'] as String?,
      organizerEmail: json['organizerEmail'] as String? ?? json['organizer']?['email'] as String?,
      rsvpStatus: json['rsvpStatus'] as String? ?? json['responseStatus'] as String?,
    );
  }

  /// Extract meeting URL from text (location or description)
  static String? _extractMeetingUrlFromText(String text) {
    // Common meeting URL patterns
    final patterns = [
      RegExp(r'https?://[\w.-]*zoom\.us/j/\S+', caseSensitive: false),
      RegExp(r'https?://[\w.-]*teams\.microsoft\.com/l/meetup-join/\S+', caseSensitive: false),
      RegExp(r'https?://meet\.google\.com/\S+', caseSensitive: false),
      RegExp(r'https?://[\w.-]*webex\.com/\S+', caseSensitive: false),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        return match.group(0);
      }
    }
    return null;
  }

  /// Check if this event has a joinable meeting
  bool get hasMeetingLink => meetingUrl != null && meetingUrl!.isNotEmpty;

  /// Check if meeting is starting soon (within 15 minutes)
  bool get isStartingSoon {
    final now = DateTime.now();
    final diff = startTime.difference(now);
    return diff.inMinutes >= 0 && diff.inMinutes <= 15;
  }

  /// Check if meeting is happening now
  bool get isHappeningNow {
    final now = DateTime.now();
    if (endTime == null) {
      // If no end time, consider it happening for 1 hour after start
      return now.isAfter(startTime) && now.isBefore(startTime.add(const Duration(hours: 1)));
    }
    return now.isAfter(startTime) && now.isBefore(endTime!);
  }

  /// Get meeting status text
  String? get meetingStatusText {
    if (!hasMeetingLink) return null;
    if (isHappeningNow) return 'IN PROGRESS';
    if (isStartingSoon) return 'STARTING SOON';
    return null;
  }

  String get timeString {
    final hour = startTime.hour;
    final minute = startTime.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '${displayHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $period';
  }

  String get durationString {
    if (endTime == null) return '';
    final duration = endTime!.difference(startTime);
    if (duration.inHours >= 1) {
      final hours = duration.inHours;
      final mins = duration.inMinutes % 60;
      if (mins > 0) {
        return '$hours hr $mins min';
      }
      return '$hours ${hours == 1 ? 'hour' : 'hours'}';
    }
    return '${duration.inMinutes} min';
  }
}

/// Calendar service provider
final calendarServiceProvider = Provider<CalendarService>((ref) {
  final api = ref.watch(apiClientProvider);
  return CalendarService(api);
});

/// Calendar events provider - fetches events using CRM service (mode-aware)
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final calendarEventsProvider = FutureProvider.autoDispose
    .family<Map<DateTime, List<CalendarEventModel>>, DateTime>((ref, month) async {
  ref.watch(authModeProvider);
  final crmService = ref.watch(crmDataServiceProvider);
  final rawEvents = await crmService.getCalendarEvents(month);

  // Transform raw events to CalendarEventModel
  final Map<DateTime, List<CalendarEventModel>> eventsByDay = {};
  for (final entry in rawEvents.entries) {
    eventsByDay[entry.key] = entry.value.map((e) => CalendarEventModel.fromJson(e)).toList();
  }
  return eventsByDay;
});

/// Service for calendar/events functionality
class CalendarService {
  final ApiClient _api;

  CalendarService(this._api);

  /// Get events for a specific month
  Future<Map<DateTime, List<CalendarEventModel>>> getEventsForMonth(DateTime month) async {
    try {
      final startOfMonth = DateTime(month.year, month.month, 1);
      final endOfMonth = DateTime(month.year, month.month + 1, 0, 23, 59, 59);

      // Fetch activities/meetings from API
      final response = await _api.get('/activities', queryParameters: {
        'startDate': startOfMonth.toIso8601String(),
        'endDate': endOfMonth.toIso8601String(),
      });

      List<dynamic> items = [];
      final data = response.data;
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }

      // Group events by day
      final Map<DateTime, List<CalendarEventModel>> eventsByDay = {};

      for (final item in items) {
        final event = CalendarEventModel.fromJson(item as Map<String, dynamic>);
        final dayKey = DateTime(event.startTime.year, event.startTime.month, event.startTime.day);

        if (eventsByDay.containsKey(dayKey)) {
          eventsByDay[dayKey]!.add(event);
        } else {
          eventsByDay[dayKey] = [event];
        }
      }

      // Also try to fetch tasks with due dates
      try {
        final tasksResponse = await _api.get('/tasks', queryParameters: {
          'startDate': startOfMonth.toIso8601String(),
          'endDate': endOfMonth.toIso8601String(),
        });

        List<dynamic> taskItems = [];
        final taskData = tasksResponse.data;
        if (taskData is List) {
          taskItems = taskData;
        } else if (taskData is Map && taskData['data'] is List) {
          taskItems = taskData['data'] as List;
        }

        for (final item in taskItems) {
          final taskJson = item as Map<String, dynamic>;
          // Only include tasks with due dates
          if (taskJson['dueDate'] != null) {
            final event = CalendarEventModel(
              id: taskJson['id'] as String? ?? '',
              title: taskJson['title'] as String? ?? 'Task',
              description: taskJson['description'] as String?,
              startTime: DateTime.parse(taskJson['dueDate'] as String),
              type: EventType.task,
              contactName: taskJson['contact']?['name'] as String?,
            );

            final dayKey = DateTime(event.startTime.year, event.startTime.month, event.startTime.day);
            if (eventsByDay.containsKey(dayKey)) {
              eventsByDay[dayKey]!.add(event);
            } else {
              eventsByDay[dayKey] = [event];
            }
          }
        }
      } catch (e) {
        // Silently ignore
      }

      return eventsByDay;
    } catch (e) {
      return {};
    }
  }

  /// Get events for a specific day
  Future<List<CalendarEventModel>> getEventsForDay(DateTime day) async {
    final eventsMap = await getEventsForMonth(day);
    final dayKey = DateTime(day.year, day.month, day.day);
    return eventsMap[dayKey] ?? [];
  }

  /// Create a new event/activity
  Future<CalendarEventModel?> createEvent(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/activities', data: data);
      return CalendarEventModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Update an event
  Future<CalendarEventModel?> updateEvent(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/activities/$id', data: data);
      return CalendarEventModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Delete an event
  Future<bool> deleteEvent(String id) async {
    try {
      await _api.delete('/activities/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
