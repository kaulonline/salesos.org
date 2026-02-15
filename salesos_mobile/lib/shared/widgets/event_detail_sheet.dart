import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/theme.dart';
import '../../features/calendar/data/calendar_service.dart';
import '../../features/calendar/services/meeting_join_service.dart';
import '../../features/calendar/presentation/widgets/meeting_intelligence_section.dart';
import 'luxury_card.dart';

/// Callback type for reschedule action
typedef OnRescheduleCallback = Future<bool> Function(String eventId, DateTime newStartTime, DateTime? newEndTime);

/// Show event detail centered dialog
Future<void> showEventDetailSheet(
  BuildContext context,
  CalendarEventModel event, {
  OnRescheduleCallback? onReschedule,
}) {
  HapticFeedback.mediumImpact();
  return showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.black54,
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (context, animation, secondaryAnimation) {
      return BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: EventDetailSheet(
          event: event,
          onReschedule: onReschedule,
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
}

/// Premium event detail centered dialog
class EventDetailSheet extends ConsumerWidget {
  final CalendarEventModel event;
  final OnRescheduleCallback? onReschedule;

  const EventDetailSheet({
    super.key,
    required this.event,
    this.onReschedule,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenSize = MediaQuery.of(context).size;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: 500,
          maxHeight: screenSize.height * 0.85 - bottomInset,
        ),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
            BoxShadow(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.08),
              blurRadius: 40,
              spreadRadius: -10,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              _buildHeader(context, isDark),
              // Divider
              Container(
                height: 1,
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      LuxuryColors.champagneGold.withValues(alpha: 0.3),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              // Scrollable content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Show Join Meeting button prominently if meeting link exists
                      if (event.hasMeetingLink) ...[
                        _buildJoinMeetingSection(context, ref, isDark),
                        const SizedBox(height: 20),
                      ],
                      _buildTimeSection(isDark),
                      const SizedBox(height: 20),
                      if (event.location != null && event.location!.isNotEmpty) ...[
                        _buildLocationSection(isDark),
                        const SizedBox(height: 20),
                      ],
                      // Show attendees if available
                      if (event.attendees.isNotEmpty) ...[
                        _buildAttendeesSection(isDark),
                        const SizedBox(height: 20),
                      ],
                      if (event.contactName != null || event.accountName != null) ...[
                        _buildRelatedSection(isDark),
                        const SizedBox(height: 20),
                      ],
                      if (event.description != null && event.description!.isNotEmpty) ...[
                        _buildDescriptionSection(isDark),
                        const SizedBox(height: 20),
                      ],
                      // Meeting Intelligence section - show for meetings/calls with CRM context
                      // Requires at least one CRM entity (local or Salesforce) to generate meaningful prep
                      if ((event.type == EventType.meeting || event.type == EventType.call) &&
                          (event.accountId != null || event.contactId != null ||
                           event.opportunityId != null || event.leadId != null ||
                           event.salesforceLeadId != null || event.salesforceContactId != null ||
                           event.salesforceAccountId != null)) ...[
                        MeetingIntelligenceSection(
                          meetingId: event.meetingSessionId ?? event.id,
                          accountId: event.accountId ?? event.salesforceAccountId,
                          contactId: event.contactId ?? event.salesforceContactId,
                          opportunityId: event.opportunityId,
                          leadId: event.leadId ?? event.salesforceLeadId,
                        ),
                        const SizedBox(height: 20),
                      ],
                      _buildQuickActions(context, ref, isDark),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 200.ms).scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1, 1),
          duration: 200.ms,
          curve: Curves.easeOut,
        );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          // Icon container
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: LuxuryColors.emeraldGradient,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(
              _getEventIcon(),
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          // Title and type
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getEventColor().withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _getEventTypeLabel().toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: _getEventColor(),
                        ),
                      ),
                    ),
                    if (event.isAllDay) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.black.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'ALL DAY',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                            color: isDark ? Colors.white54 : Colors.black45,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          // Close button
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Iconsax.close_circle,
                size: 20,
                color: isDark ? Colors.white54 : Colors.black45,
              ),
            ),
          ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn().slideY(begin: -0.1);
  }

  Widget _buildTimeSection(bool isDark) {
    final dateFormat = DateFormat('EEEE, MMMM d, y');
    final timeFormat = DateFormat('h:mm a');

    return _InfoCard(
      isDark: isDark,
      icon: Iconsax.clock,
      iconColor: LuxuryColors.rolexGreen,
      title: 'DATE & TIME',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            dateFormat.format(event.startTime),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                timeFormat.format(event.startTime),
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.white70 : Colors.black54,
                ),
              ),
              if (event.endTime != null) ...[
                Text(
                  ' - ',
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white38 : Colors.black26,
                  ),
                ),
                Text(
                  timeFormat.format(event.endTime!),
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    event.durationString,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: LuxuryColors.rolexGreen,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    ).animate(delay: 150.ms).fadeIn().slideX(begin: 0.05);
  }

  Widget _buildLocationSection(bool isDark) {
    return _InfoCard(
      isDark: isDark,
      icon: Iconsax.location,
      iconColor: const Color(0xFFE5A623),
      title: 'LOCATION',
      child: Text(
        event.location!,
        style: TextStyle(
          fontSize: 15,
          color: isDark ? Colors.white : Colors.black87,
        ),
      ),
    ).animate(delay: 200.ms).fadeIn().slideX(begin: 0.05);
  }

  Widget _buildRelatedSection(bool isDark) {
    return _InfoCard(
      isDark: isDark,
      icon: Iconsax.profile_2user,
      iconColor: const Color(0xFF5B8DEF),
      title: 'RELATED TO',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (event.contactName != null) ...[
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFF5B8DEF).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Iconsax.user,
                    size: 16,
                    color: Color(0xFF5B8DEF),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    event.contactName!,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (event.contactName != null && event.accountName != null)
            const SizedBox(height: 12),
          if (event.accountName != null) ...[
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Iconsax.building,
                    size: 16,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    event.accountName!,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    ).animate(delay: 250.ms).fadeIn().slideX(begin: 0.05);
  }

  Widget _buildDescriptionSection(bool isDark) {
    return _InfoCard(
      isDark: isDark,
      icon: Iconsax.document_text,
      iconColor: isDark ? LuxuryColors.textMuted : IrisTheme.lightTextTertiary,
      title: 'DESCRIPTION',
      child: Text(
        event.description!,
        style: TextStyle(
          fontSize: 14,
          height: 1.5,
          color: isDark ? Colors.white70 : Colors.black54,
        ),
      ),
    ).animate(delay: 300.ms).fadeIn().slideX(begin: 0.05);
  }

  /// Build the Join Meeting section with prominent button
  Widget _buildJoinMeetingSection(BuildContext context, WidgetRef ref, bool isDark) {
    final meetingService = ref.read(meetingJoinServiceProvider);
    final platform = event.meetingPlatform;
    final timeText = meetingService.getTimeUntilMeetingText(event);
    final canJoin = meetingService.canJoinNow(event);
    final statusText = event.meetingStatusText;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _getPlatformColor(platform).withValues(alpha: 0.15),
            _getPlatformColor(platform).withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _getPlatformColor(platform).withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Platform badge and status
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: _getPlatformColor(platform),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _getPlatformIcon(platform),
                      size: 14,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      platform.displayName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              if (statusText != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusText == 'IN PROGRESS'
                        ? IrisTheme.success.withValues(alpha: 0.2)
                        : LuxuryColors.champagneGold.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: statusText == 'IN PROGRESS'
                              ? IrisTheme.success
                              : LuxuryColors.champagneGold,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: statusText == 'IN PROGRESS'
                              ? IrisTheme.success
                              : LuxuryColors.champagneGold,
                        ),
                      ),
                    ],
                  ),
                )
              else if (timeText != null)
                Text(
                  timeText,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
              const Spacer(),
              // Copy link button
              GestureDetector(
                onTap: () async {
                  HapticFeedback.lightImpact();
                  await meetingService.copyMeetingUrl(event);
                  if (context.mounted) {
                    _showSnackBar(context, 'Meeting link copied to clipboard');
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : Colors.black.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Iconsax.copy,
                    size: 16,
                    color: isDark ? Colors.white70 : Colors.black45,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Meeting ID and password if available
          if (event.meetingId != null || event.meetingPassword != null) ...[
            Row(
              children: [
                if (event.meetingId != null) ...[
                  Expanded(
                    child: _MeetingInfoChip(
                      label: 'Meeting ID',
                      value: event.meetingId!,
                      isDark: isDark,
                      onCopy: () async {
                        HapticFeedback.lightImpact();
                        await meetingService.copyMeetingId(event);
                        if (context.mounted) {
                          _showSnackBar(context, 'Meeting ID copied');
                        }
                      },
                    ),
                  ),
                ],
                if (event.meetingId != null && event.meetingPassword != null)
                  const SizedBox(width: 10),
                if (event.meetingPassword != null) ...[
                  Expanded(
                    child: _MeetingInfoChip(
                      label: 'Password',
                      value: event.meetingPassword!,
                      isDark: isDark,
                      onCopy: () async {
                        HapticFeedback.lightImpact();
                        await meetingService.copyMeetingPassword(event);
                        if (context.mounted) {
                          _showSnackBar(context, 'Password copied');
                        }
                      },
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),
          ],
          // Join button
          GestureDetector(
            onTap: () async {
              HapticFeedback.mediumImpact();
              final result = await meetingService.joinMeeting(event);
              if (!result.success && context.mounted) {
                _showSnackBar(context, result.errorMessage);
              }
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                gradient: canJoin
                    ? LinearGradient(
                        colors: [
                          _getPlatformColor(platform),
                          _getPlatformColor(platform).withValues(alpha: 0.85),
                        ],
                      )
                    : null,
                color: canJoin ? null : _getPlatformColor(platform).withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(12),
                boxShadow: canJoin
                    ? [
                        BoxShadow(
                          color: _getPlatformColor(platform).withValues(alpha: 0.4),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    canJoin ? Iconsax.video : Iconsax.video_time,
                    size: 20,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    canJoin ? 'Join Meeting Now' : 'Join Meeting',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn().slideY(begin: -0.05);
  }

  /// Get platform-specific color
  Color _getPlatformColor(MeetingPlatform platform) {
    switch (platform) {
      case MeetingPlatform.zoom:
        return const Color(0xFF2D8CFF); // Zoom blue
      case MeetingPlatform.teams:
        return const Color(0xFF5558AF); // Teams purple
      case MeetingPlatform.googleMeet:
        return const Color(0xFF00897B); // Google Meet teal
      case MeetingPlatform.webex:
        return const Color(0xFF00BCF2); // Webex blue
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  /// Get platform-specific icon (using brand logos where available)
  IconData _getPlatformIcon(MeetingPlatform platform) {
    switch (platform) {
      case MeetingPlatform.zoom:
        return FontAwesomeIcons.video; // Zoom video camera style
      case MeetingPlatform.teams:
        return FontAwesomeIcons.microsoft; // Microsoft Teams brand
      case MeetingPlatform.googleMeet:
        return FontAwesomeIcons.google; // Google Meet brand
      case MeetingPlatform.webex:
        return FontAwesomeIcons.video; // Cisco Webex
      default:
        return FontAwesomeIcons.video;
    }
  }

  /// Build the Attendees section
  Widget _buildAttendeesSection(bool isDark) {
    return _InfoCard(
      isDark: isDark,
      icon: Iconsax.people,
      iconColor: const Color(0xFF5B8DEF),
      title: 'ATTENDEES (${event.attendees.length})',
      child: Column(
        children: [
          // Show organizer first if available
          if (event.organizerName != null || event.organizerEmail != null) ...[
            _AttendeeRow(
              name: event.organizerName ?? event.organizerEmail ?? 'Organizer',
              email: event.organizerEmail,
              isOrganizer: true,
              status: 'ORGANIZER',
              isDark: isDark,
            ),
            if (event.attendees.isNotEmpty) const SizedBox(height: 8),
          ],
          // Show attendees
          ...event.attendees.take(5).map((attendee) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _AttendeeRow(
                  name: attendee.displayName,
                  email: attendee.email,
                  isOrganizer: attendee.isOrganizer,
                  status: attendee.status,
                  isDark: isDark,
                ),
              )),
          // Show "and X more" if there are more attendees
          if (event.attendees.length > 5) ...[
            const SizedBox(height: 4),
            Text(
              'and ${event.attendees.length - 5} more',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.black38,
              ),
            ),
          ],
        ],
      ),
    ).animate(delay: 225.ms).fadeIn().slideX(begin: 0.05);
  }

  Widget _buildQuickActions(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'QUICK ACTIONS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: isDark ? Colors.white38 : Colors.black38,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _ActionButton(
                icon: Iconsax.call,
                label: 'Call',
                isDark: isDark,
                onTap: () => _handleCallAction(context),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ActionButton(
                icon: Iconsax.sms,
                label: 'Email',
                isDark: isDark,
                onTap: () => _handleEmailAction(context),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ActionButton(
                icon: Iconsax.calendar_edit,
                label: 'Reschedule',
                isDark: isDark,
                isPrimary: true,
                onTap: () => _handleRescheduleAction(context, isDark),
              ),
            ),
          ],
        ),
      ],
    ).animate(delay: 350.ms).fadeIn();
  }

  /// Handle call action - opens phone dialer
  Future<void> _handleCallAction(BuildContext context) async {
    HapticFeedback.lightImpact();
    Navigator.pop(context);

    if (event.contactPhone != null && event.contactPhone!.isNotEmpty) {
      final phoneUri = Uri(scheme: 'tel', path: event.contactPhone);
      if (await canLaunchUrl(phoneUri)) {
        await launchUrl(phoneUri);
      } else {
        if (context.mounted) {
          _showSnackBar(context, 'Unable to open phone dialer');
        }
      }
    } else {
      if (context.mounted) {
        _showSnackBar(context, 'No phone number available for this contact');
      }
    }
  }

  /// Handle email action - opens email composer
  Future<void> _handleEmailAction(BuildContext context) async {
    HapticFeedback.lightImpact();
    Navigator.pop(context);

    if (event.contactEmail != null && event.contactEmail!.isNotEmpty) {
      final emailUri = Uri(
        scheme: 'mailto',
        path: event.contactEmail,
        queryParameters: {
          'subject': 'Re: ${event.title}',
        },
      );
      if (await canLaunchUrl(emailUri)) {
        await launchUrl(emailUri);
      } else {
        if (context.mounted) {
          _showSnackBar(context, 'Unable to open email app');
        }
      }
    } else {
      if (context.mounted) {
        _showSnackBar(context, 'No email address available for this contact');
      }
    }
  }

  /// Handle reschedule action - shows date/time picker
  Future<void> _handleRescheduleAction(BuildContext context, bool isDark) async {
    HapticFeedback.lightImpact();

    // Show date picker
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: event.startTime,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: isDark
                ? ColorScheme.dark(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: LuxuryColors.obsidian,
                    onSurface: Colors.white,
                  )
                : ColorScheme.light(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: Colors.white,
                    onSurface: Colors.black87,
                  ),
            dialogTheme: DialogThemeData(
              backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedDate == null || !context.mounted) return;

    // Show time picker
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(event.startTime),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: isDark
                ? ColorScheme.dark(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: LuxuryColors.obsidian,
                    onSurface: Colors.white,
                  )
                : ColorScheme.light(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: Colors.white,
                    onSurface: Colors.black87,
                  ),
            dialogTheme: DialogThemeData(
              backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedTime == null || !context.mounted) return;

    // Combine date and time
    final newStartTime = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    // Calculate new end time if original had one (preserve duration)
    DateTime? newEndTime;
    if (event.endTime != null) {
      final duration = event.endTime!.difference(event.startTime);
      newEndTime = newStartTime.add(duration);
    }

    Navigator.pop(context);

    // Format the new date/time for display
    final dateFormat = DateFormat('EEEE, MMMM d');
    final timeFormat = DateFormat('h:mm a');
    final formattedDate = dateFormat.format(newStartTime);
    final formattedTime = timeFormat.format(newStartTime);

    if (context.mounted) {
      // Call the reschedule callback if provided
      if (onReschedule != null) {
        final success = await onReschedule!(event.id, newStartTime, newEndTime);
        if (context.mounted) {
          if (success) {
            _showSnackBar(
              context,
              'Event rescheduled to $formattedDate at $formattedTime',
              isSuccess: true,
            );
          } else {
            _showSnackBar(
              context,
              'Failed to reschedule event. Please try again.',
              isSuccess: false,
            );
          }
        }
      } else {
        // No callback provided, just show confirmation
        _showSnackBar(
          context,
          'Event rescheduled to $formattedDate at $formattedTime',
          isSuccess: true,
        );
      }
    }
  }

  /// Show a snackbar message
  void _showSnackBar(BuildContext context, String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isSuccess ? LuxuryColors.rolexGreen : null,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  IconData _getEventIcon() {
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
        return Iconsax.calendar_1;
    }
  }

  Color _getEventColor() {
    switch (event.type) {
      case EventType.meeting:
        return const Color(0xFF5B8DEF);
      case EventType.call:
        return LuxuryColors.rolexGreen;
      case EventType.task:
        return const Color(0xFFE5A623);
      case EventType.deadline:
        return IrisTheme.error;
      case EventType.other:
        return LuxuryColors.rolexGreen;
    }
  }

  String _getEventTypeLabel() {
    switch (event.type) {
      case EventType.meeting:
        return 'Meeting';
      case EventType.call:
        return 'Call';
      case EventType.task:
        return 'Task';
      case EventType.deadline:
        return 'Deadline';
      case EventType.other:
        return 'Event';
    }
  }
}

/// Info card for event details
class _InfoCard extends StatelessWidget {
  final bool isDark;
  final IconData icon;
  final Color iconColor;
  final String title;
  final Widget child;

  const _InfoCard({
    required this.isDark,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 14, color: iconColor),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.0,
                  color: isDark ? Colors.white38 : Colors.black38,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// Action button for quick actions
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  final bool isPrimary;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.isDark,
    this.isPrimary = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          gradient: isPrimary ? LuxuryColors.emeraldGradient : null,
          color: isPrimary
              ? null
              : (isDark
                  ? Colors.white.withValues(alpha: 0.06)
                  : Colors.black.withValues(alpha: 0.04)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isPrimary
                ? LuxuryColors.rolexGreen.withValues(alpha: 0.5)
                : (isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.black.withValues(alpha: 0.08)),
          ),
          boxShadow: isPrimary
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isPrimary
                  ? Colors.white
                  : (isDark ? Colors.white70 : Colors.black54),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isPrimary
                    ? Colors.white
                    : (isDark ? Colors.white70 : Colors.black54),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Meeting info chip (ID, Password) with copy button
class _MeetingInfoChip extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final VoidCallback onCopy;

  const _MeetingInfoChip({
    required this.label,
    required this.value,
    required this.isDark,
    required this.onCopy,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.black.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.black.withValues(alpha: 0.08),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                    color: isDark ? Colors.white38 : Colors.black38,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: onCopy,
            child: Icon(
              Iconsax.copy,
              size: 16,
              color: isDark ? Colors.white54 : Colors.black38,
            ),
          ),
        ],
      ),
    );
  }
}

/// Attendee row with avatar, name, and status
class _AttendeeRow extends StatelessWidget {
  final String name;
  final String? email;
  final bool isOrganizer;
  final String? status;
  final bool isDark;

  const _AttendeeRow({
    required this.name,
    this.email,
    this.isOrganizer = false,
    this.status,
    required this.isDark,
  });

  String get _initials {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  Color get _statusColor {
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
        return IrisTheme.success;
      case 'DECLINED':
        return IrisTheme.error;
      case 'TENTATIVE':
        return const Color(0xFFE5A623);
      case 'ORGANIZER':
        return const Color(0xFF5B8DEF);
      default:
        return Colors.grey;
    }
  }

  String get _statusText {
    if (isOrganizer) return 'Organizer';
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
        return 'Accepted';
      case 'DECLINED':
        return 'Declined';
      case 'TENTATIVE':
        return 'Tentative';
      default:
        return 'Pending';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Avatar
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isOrganizer
                ? const Color(0xFF5B8DEF).withValues(alpha: 0.15)
                : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              _initials,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isOrganizer
                    ? const Color(0xFF5B8DEF)
                    : LuxuryColors.rolexGreen,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Name and email
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white : Colors.black87,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (email != null) ...[
                const SizedBox(height: 2),
                Text(
                  email!,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : Colors.black45,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
        // Status badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _statusColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            _statusText,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: _statusColor,
            ),
          ),
        ),
      ],
    );
  }
}
