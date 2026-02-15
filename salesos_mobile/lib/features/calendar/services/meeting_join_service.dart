import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../data/calendar_service.dart';

/// Provider for MeetingJoinService
final meetingJoinServiceProvider = Provider<MeetingJoinService>((ref) {
  return MeetingJoinService();
});

/// Service for joining video meetings (Zoom, Teams, Google Meet, Webex)
class MeetingJoinService {
  /// Join a meeting from a calendar event
  Future<MeetingJoinResult> joinMeeting(CalendarEventModel event) async {
    if (!event.hasMeetingLink) {
      return MeetingJoinResult.noMeetingLink();
    }

    final meetingUrl = event.meetingUrl!;
    final platform = event.meetingPlatform;

    // Try native app first, then fall back to web
    final result = await _tryJoinMeeting(meetingUrl, platform);
    return result;
  }

  /// Join meeting from a direct URL
  Future<MeetingJoinResult> joinMeetingFromUrl(String url) async {
    final platform = MeetingPlatform.fromUrl(url);
    return _tryJoinMeeting(url, platform);
  }

  /// Internal method to attempt joining a meeting
  Future<MeetingJoinResult> _tryJoinMeeting(String url, MeetingPlatform platform) async {
    // First, try to launch the native app if available
    if (platform.deepLinkScheme != null) {
      final nativeUrl = _convertToNativeUrl(url, platform);
      if (nativeUrl != null) {
        final nativeUri = Uri.parse(nativeUrl);
        final canLaunchNative = await canLaunchUrl(nativeUri);

        if (canLaunchNative) {
          final launched = await launchUrl(
            nativeUri,
            mode: LaunchMode.externalApplication,
          );
          if (launched) {
            return MeetingJoinResult.success(platform, isNativeApp: true);
          }
        }
      }
    }

    // Fall back to web URL
    final webUri = Uri.parse(url);
    final canLaunch = await canLaunchUrl(webUri);

    if (!canLaunch) {
      return MeetingJoinResult.cannotLaunch(platform);
    }

    final launched = await launchUrl(
      webUri,
      mode: LaunchMode.externalApplication,
    );

    if (launched) {
      return MeetingJoinResult.success(platform, isNativeApp: false);
    }

    return MeetingJoinResult.launchFailed(platform);
  }

  /// Convert a web meeting URL to native app deep link
  String? _convertToNativeUrl(String webUrl, MeetingPlatform platform) {
    switch (platform) {
      case MeetingPlatform.zoom:
        return _convertZoomUrl(webUrl);
      case MeetingPlatform.teams:
        return _convertTeamsUrl(webUrl);
      case MeetingPlatform.webex:
        return _convertWebexUrl(webUrl);
      case MeetingPlatform.googleMeet:
        // Google Meet doesn't have a native app deep link, uses web
        return null;
      default:
        return null;
    }
  }

  /// Convert Zoom web URL to native app URL
  /// Web: https://zoom.us/j/123456789?pwd=abc123
  /// Native: zoomus://zoom.us/join?confno=123456789&pwd=abc123
  String? _convertZoomUrl(String webUrl) {
    try {
      final uri = Uri.parse(webUrl);
      final pathSegments = uri.pathSegments;

      // Find meeting ID from path (usually /j/123456789)
      String? meetingId;
      for (int i = 0; i < pathSegments.length; i++) {
        if (pathSegments[i] == 'j' && i + 1 < pathSegments.length) {
          meetingId = pathSegments[i + 1];
          break;
        }
      }

      if (meetingId == null) return null;

      // Build native URL
      var nativeUrl = 'zoomus://zoom.us/join?confno=$meetingId';

      // Add password if present
      final pwd = uri.queryParameters['pwd'];
      if (pwd != null) {
        nativeUrl += '&pwd=$pwd';
      }

      return nativeUrl;
    } catch (e) {
      return null;
    }
  }

  /// Convert Teams web URL to native app URL
  /// Web: https://teams.microsoft.com/l/meetup-join/...
  /// Native: msteams://teams.microsoft.com/l/meetup-join/...
  String? _convertTeamsUrl(String webUrl) {
    try {
      if (webUrl.startsWith('https://teams.microsoft.com') ||
          webUrl.startsWith('https://teams.live.com')) {
        return webUrl.replaceFirst('https://', 'msteams://');
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Convert Webex web URL to native app URL
  String? _convertWebexUrl(String webUrl) {
    try {
      final uri = Uri.parse(webUrl);
      // Webex meetings typically have format:
      // https://company.webex.com/meet/username or
      // https://company.webex.com/join/123456789
      return 'webex://${uri.host}${uri.path}';
    } catch (e) {
      return null;
    }
  }

  /// Copy meeting ID to clipboard
  Future<void> copyMeetingId(CalendarEventModel event) async {
    if (event.meetingId != null) {
      await Clipboard.setData(ClipboardData(text: event.meetingId!));
    } else if (event.meetingUrl != null) {
      // Try to extract meeting ID from URL
      final id = _extractMeetingIdFromUrl(event.meetingUrl!, event.meetingPlatform);
      if (id != null) {
        await Clipboard.setData(ClipboardData(text: id));
      }
    }
  }

  /// Copy meeting password to clipboard
  Future<void> copyMeetingPassword(CalendarEventModel event) async {
    if (event.meetingPassword != null) {
      await Clipboard.setData(ClipboardData(text: event.meetingPassword!));
    }
  }

  /// Copy meeting URL to clipboard
  Future<void> copyMeetingUrl(CalendarEventModel event) async {
    if (event.meetingUrl != null) {
      await Clipboard.setData(ClipboardData(text: event.meetingUrl!));
    }
  }

  /// Extract meeting ID from URL
  String? _extractMeetingIdFromUrl(String url, MeetingPlatform platform) {
    try {
      final uri = Uri.parse(url);

      switch (platform) {
        case MeetingPlatform.zoom:
          // Zoom: /j/123456789
          final pathSegments = uri.pathSegments;
          for (int i = 0; i < pathSegments.length; i++) {
            if (pathSegments[i] == 'j' && i + 1 < pathSegments.length) {
              return pathSegments[i + 1];
            }
          }
          break;
        case MeetingPlatform.googleMeet:
          // Google Meet: /abc-defg-hij
          final lastSegment = uri.pathSegments.lastOrNull;
          if (lastSegment != null && lastSegment.contains('-')) {
            return lastSegment;
          }
          break;
        default:
          break;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Check if the meeting can be joined now (based on time)
  bool canJoinNow(CalendarEventModel event) {
    if (!event.hasMeetingLink) return false;

    final now = DateTime.now();
    final startTime = event.startTime;
    final endTime = event.endTime ?? startTime.add(const Duration(hours: 1));

    // Can join 10 minutes before start time until meeting ends
    final joinWindow = startTime.subtract(const Duration(minutes: 10));

    return now.isAfter(joinWindow) && now.isBefore(endTime);
  }

  /// Get time until meeting starts (or null if already started)
  Duration? timeUntilMeeting(CalendarEventModel event) {
    final now = DateTime.now();
    if (now.isAfter(event.startTime)) return null;
    return event.startTime.difference(now);
  }

  /// Get human-readable time until meeting
  String? getTimeUntilMeetingText(CalendarEventModel event) {
    final duration = timeUntilMeeting(event);
    if (duration == null) {
      if (event.isHappeningNow) return 'Now';
      return 'Started';
    }

    if (duration.inMinutes < 1) {
      return 'Starting now';
    } else if (duration.inMinutes < 60) {
      return 'In ${duration.inMinutes} min';
    } else if (duration.inHours < 24) {
      final hours = duration.inHours;
      final mins = duration.inMinutes % 60;
      if (mins > 0) {
        return 'In ${hours}h ${mins}m';
      }
      return 'In $hours ${hours == 1 ? 'hour' : 'hours'}';
    } else {
      final days = duration.inDays;
      return 'In $days ${days == 1 ? 'day' : 'days'}';
    }
  }
}

/// Result of attempting to join a meeting
class MeetingJoinResult {
  final bool success;
  final MeetingPlatform? platform;
  final bool isNativeApp;
  final MeetingJoinError? error;

  MeetingJoinResult._({
    required this.success,
    this.platform,
    this.isNativeApp = false,
    this.error,
  });

  factory MeetingJoinResult.success(MeetingPlatform platform, {required bool isNativeApp}) {
    return MeetingJoinResult._(
      success: true,
      platform: platform,
      isNativeApp: isNativeApp,
    );
  }

  factory MeetingJoinResult.noMeetingLink() {
    return MeetingJoinResult._(
      success: false,
      error: MeetingJoinError.noMeetingLink,
    );
  }

  factory MeetingJoinResult.cannotLaunch(MeetingPlatform platform) {
    return MeetingJoinResult._(
      success: false,
      platform: platform,
      error: MeetingJoinError.cannotLaunch,
    );
  }

  factory MeetingJoinResult.launchFailed(MeetingPlatform platform) {
    return MeetingJoinResult._(
      success: false,
      platform: platform,
      error: MeetingJoinError.launchFailed,
    );
  }

  String get errorMessage {
    switch (error) {
      case MeetingJoinError.noMeetingLink:
        return 'No meeting link available';
      case MeetingJoinError.cannotLaunch:
        return 'Cannot open ${platform?.displayName ?? 'meeting'} app';
      case MeetingJoinError.launchFailed:
        return 'Failed to open ${platform?.displayName ?? 'meeting'}';
      case null:
        return '';
    }
  }
}

/// Errors that can occur when joining a meeting
enum MeetingJoinError {
  noMeetingLink,
  cannotLaunch,
  launchFailed,
}
