import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../data/meetings_service.dart';

/// Meeting card widget for list display
/// Shows meeting title, time, participant count, status badge, type, and bot status
class MeetingCard extends StatelessWidget {
  final MeetingModel meeting;
  final VoidCallback? onTap;

  const MeetingCard({
    super.key,
    required this.meeting,
    this.onTap,
  });

  Color _statusColor(MeetingStatus status) {
    switch (status) {
      case MeetingStatus.SCHEDULED:
        return LuxuryColors.infoCobalt;
      case MeetingStatus.IN_PROGRESS:
        return LuxuryColors.jadePremium;
      case MeetingStatus.COMPLETED:
        return LuxuryColors.rolexGreen;
      case MeetingStatus.CANCELLED:
        return LuxuryColors.errorRuby;
      case MeetingStatus.NO_SHOW:
        return LuxuryColors.warningAmber;
    }
  }

  Color _botStatusColor(BotStatus status) {
    switch (status) {
      case BotStatus.notJoined:
        return LuxuryColors.textMuted;
      case BotStatus.joining:
        return LuxuryColors.warningAmber;
      case BotStatus.recording:
        return LuxuryColors.errorRuby;
      case BotStatus.processing:
        return LuxuryColors.infoCobalt;
      case BotStatus.complete:
        return LuxuryColors.rolexGreen;
      case BotStatus.error:
        return LuxuryColors.errorRuby;
    }
  }

  IconData _botStatusIcon(BotStatus status) {
    switch (status) {
      case BotStatus.notJoined:
        return Iconsax.microphone_slash;
      case BotStatus.joining:
        return Iconsax.microphone;
      case BotStatus.recording:
        return Iconsax.record;
      case BotStatus.processing:
        return Iconsax.cpu;
      case BotStatus.complete:
        return Iconsax.tick_circle;
      case BotStatus.error:
        return Iconsax.warning_2;
    }
  }

  IconData _meetingTypeIcon(MeetingType type) {
    switch (type) {
      case MeetingType.CALL:
        return Iconsax.call;
      case MeetingType.VIDEO:
        return Iconsax.video;
      case MeetingType.IN_PERSON:
        return Iconsax.people;
      case MeetingType.WEBINAR:
        return Iconsax.monitor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statusCol = _statusColor(meeting.status);
    final botCol = _botStatusColor(meeting.botStatus);

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        children: [
          // Time indicator
          Container(
            width: 52,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: statusCol.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                Text(
                  DateFormat('HH:mm').format(meeting.startTime),
                  style: IrisTheme.labelMedium.copyWith(
                    color: statusCol,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  DateFormat('MMM d').format(meeting.startTime),
                  style: IrisTheme.caption.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  meeting.title,
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
                    // Meeting type icon
                    Icon(
                      _meetingTypeIcon(meeting.type),
                      size: 14,
                      color: isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary,
                    ),
                    const SizedBox(width: 4),
                    // Participant count
                    Icon(
                      Iconsax.people,
                      size: 14,
                      color: isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${meeting.participants.length}',
                      style: IrisTheme.caption.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: statusCol.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        meeting.status.label,
                        style: IrisTheme.labelSmall.copyWith(
                          color: statusCol,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Bot status indicator
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: botCol.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _botStatusIcon(meeting.botStatus),
              size: 18,
              color: botCol,
            ),
          ),
        ],
      ),
    );
  }
}
