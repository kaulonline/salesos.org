import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../core/config/routes.dart';
import '../../core/services/pre_meeting_service.dart';
import 'iris_card.dart';

/// Pre-Meeting Companion Card - Shows context briefing for upcoming meetings
class PreMeetingCard extends ConsumerWidget {
  final MeetingContext context;
  final VoidCallback? onDismiss;

  const PreMeetingCard({
    super.key,
    required this.context,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext buildContext, WidgetRef ref) {
    final isDark = Theme.of(buildContext).brightness == Brightness.dark;
    final timeUntil = context.timeUntilStart;

    return IrisCard(
      padding: const EdgeInsets.all(0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with meeting info
          _buildHeader(buildContext, isDark, timeUntil),

          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // AI Summary
                if (context.aiSummary != null) ...[
                  _buildAISummary(context.aiSummary!, isDark),
                  const SizedBox(height: 16),
                ],

                // Attendees
                if (context.attendees.isNotEmpty) ...[
                  _buildAttendeesSection(buildContext, isDark),
                  const SizedBox(height: 16),
                ],

                // Related entities
                if (context.relatedEntities != null)
                  _buildRelatedEntitiesSection(buildContext, isDark),

                const SizedBox(height: 16),

                // Talking points
                if (context.talkingPoints.isNotEmpty)
                  _buildTalkingPointsSection(isDark),

                const SizedBox(height: 16),

                // Quick actions
                _buildQuickActions(buildContext, isDark),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.05);
  }

  Widget _buildHeader(BuildContext context, bool isDark, Duration timeUntil) {
    final isUrgent = timeUntil.inMinutes <= 15;
    final isNow = this.context.isNow;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: isNow
            ? IrisTheme.successGradient
            : isUrgent
                ? IrisTheme.warningGradient
                : IrisTheme.goldGradient,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isNow ? Iconsax.video : Iconsax.calendar_tick,
              color: Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        isNow
                            ? 'NOW'
                            : isUrgent
                                ? 'STARTING SOON'
                                : 'UPCOMING',
                        style: IrisTheme.caption.copyWith(
                          color: Colors.white,
                          fontWeight: IrisTheme.weightBold,
                          fontSize: 9,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatTimeUntil(timeUntil),
                      style: IrisTheme.caption.copyWith(
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  this.context.subject,
                  style: IrisTheme.titleSmall.copyWith(
                    color: Colors.white,
                    fontWeight: IrisTheme.weightSemiBold,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(Iconsax.clock,
                        size: 12, color: Colors.white.withValues(alpha: 0.8)),
                    const SizedBox(width: 4),
                    Text(
                      '${DateFormat.jm().format(this.context.startTime)} - ${DateFormat.jm().format(this.context.endTime)}',
                      style: IrisTheme.caption.copyWith(
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                    if (this.context.location != null) ...[
                      const SizedBox(width: 12),
                      Icon(Iconsax.location,
                          size: 12, color: Colors.white.withValues(alpha: 0.8)),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          this.context.location!,
                          style: IrisTheme.caption.copyWith(
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          if (onDismiss != null)
            GestureDetector(
              onTap: onDismiss,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.close,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAISummary(String summary, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: LuxuryColors.champagneGold.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Iconsax.magic_star,
            color: LuxuryColors.champagneGold,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Briefing',
                  style: IrisTheme.caption.copyWith(
                    color: LuxuryColors.champagneGold,
                    fontWeight: IrisTheme.weightSemiBold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  summary,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn().slideX(begin: 0.05);
  }

  Widget _buildAttendeesSection(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Attendees',
          style: IrisTheme.labelMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
            fontWeight: IrisTheme.weightMedium,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: this.context.attendees.map((attendee) {
            return GestureDetector(
              onTap: attendee.contactId != null
                  ? () {
                      HapticFeedback.lightImpact();
                      context.push('${AppRoutes.contacts}/${attendee.contactId}');
                    }
                  : null,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark
                      ? IrisTheme.darkSurfaceElevated
                      : IrisTheme.lightSurfaceElevated,
                  borderRadius: BorderRadius.circular(20),
                  border: attendee.contactId != null
                      ? Border.all(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.3))
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 12,
                      backgroundColor: attendee.isOrganizer
                          ? LuxuryColors.champagneGold
                          : (isDark
                              ? IrisTheme.darkSurfaceHigh
                              : IrisTheme.lightBorder),
                      child: Text(
                        attendee.initials,
                        style: IrisTheme.caption.copyWith(
                          color: attendee.isOrganizer
                              ? Colors.black
                              : (isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary),
                          fontSize: 9,
                          fontWeight: IrisTheme.weightSemiBold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          attendee.name,
                          style: IrisTheme.caption.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                            fontWeight: IrisTheme.weightMedium,
                          ),
                        ),
                        if (attendee.role != null || attendee.company != null)
                          Text(
                            [attendee.role, attendee.company]
                                .where((s) => s != null)
                                .join(' at '),
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextTertiary
                                  : IrisTheme.lightTextTertiary,
                              fontSize: 10,
                            ),
                          ),
                      ],
                    ),
                    if (attendee.contactId != null) ...[
                      const SizedBox(width: 4),
                      Icon(
                        Iconsax.arrow_right_3,
                        size: 12,
                        color: LuxuryColors.champagneGold,
                      ),
                    ],
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    ).animate(delay: 150.ms).fadeIn();
  }

  Widget _buildRelatedEntitiesSection(BuildContext context, bool isDark) {
    final entities = this.context.relatedEntities!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Related Information',
          style: IrisTheme.labelMedium.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
            fontWeight: IrisTheme.weightMedium,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            if (entities.account != null)
              Expanded(
                child: _EntityChip(
                  icon: Iconsax.building,
                  label: entities.account!.name,
                  sublabel: entities.account!.industry,
                  onTap: () => context
                      .push('${AppRoutes.contacts}?account=${entities.account!.id}'),
                  isDark: isDark,
                ),
              ),
            if (entities.account != null && entities.deal != null)
              const SizedBox(width: 8),
            if (entities.deal != null)
              Expanded(
                child: _EntityChip(
                  icon: Iconsax.dollar_circle,
                  label: entities.deal!.name,
                  sublabel:
                      '${entities.deal!.stage} - \$${_formatCurrency(entities.deal!.amount)}',
                  onTap: () =>
                      context.push('${AppRoutes.deals}/${entities.deal!.id}'),
                  isDark: isDark,
                  color: IrisTheme.success,
                ),
              ),
          ],
        ),
      ],
    ).animate(delay: 200.ms).fadeIn();
  }

  Widget _buildTalkingPointsSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Iconsax.message_question,
              size: 16,
              color: IrisTheme.info,
            ),
            const SizedBox(width: 6),
            Text(
              'Talking Points',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
                fontWeight: IrisTheme.weightMedium,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ...context.talkingPoints.take(4).toList().asMap().entries.map((entry) {
          final index = entry.key;
          final point = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: _getTalkingPointColor(point.type)
                        .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Text(
                      '${index + 1}',
                      style: IrisTheme.caption.copyWith(
                        color: _getTalkingPointColor(point.type),
                        fontWeight: IrisTheme.weightSemiBold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        point.content,
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                          height: 1.3,
                        ),
                      ),
                      if (point.source != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            'Source: ${point.source}',
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextTertiary
                                  : IrisTheme.lightTextTertiary,
                              fontSize: 10,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ).animate(delay: (250 + index * 50).ms).fadeIn().slideX(begin: 0.05),
          );
        }),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, bool isDark) {
    return Row(
      children: [
        if (this.context.attendees.any((a) => a.email != null))
          Expanded(
            child: _ActionButton(
              icon: Iconsax.sms,
              label: 'Email',
              onTap: () => _sendEmail(
                  this.context.attendees.firstWhere((a) => a.email != null).email!),
              isDark: isDark,
            ),
          ),
        const SizedBox(width: 8),
        Expanded(
          child: _ActionButton(
            icon: Iconsax.note_add,
            label: 'Add Note',
            onTap: () {
              // Navigate to add note for this meeting
              HapticFeedback.lightImpact();
            },
            isDark: isDark,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _ActionButton(
            icon: Iconsax.message,
            label: 'Ask SalesOS',
            onTap: () {
              HapticFeedback.lightImpact();
              context.push(AppRoutes.aiChat);
            },
            isDark: isDark,
            isPrimary: true,
          ),
        ),
      ],
    ).animate(delay: 300.ms).fadeIn();
  }

  Color _getTalkingPointColor(TalkingPointType type) {
    switch (type) {
      case TalkingPointType.dealProgress:
        return IrisTheme.success;
      case TalkingPointType.followUp:
        return IrisTheme.warning;
      case TalkingPointType.objection:
        return IrisTheme.error;
      case TalkingPointType.opportunity:
        return IrisTheme.info;
      case TalkingPointType.general:
        return LuxuryColors.champagneGold;
    }
  }

  String _formatTimeUntil(Duration duration) {
    if (duration.isNegative) {
      final elapsed = duration.abs();
      if (elapsed.inMinutes < 60) {
        return 'Started ${elapsed.inMinutes}m ago';
      }
      return 'Started ${elapsed.inHours}h ago';
    }

    if (duration.inMinutes < 60) {
      return 'In ${duration.inMinutes} minutes';
    }
    if (duration.inHours < 24) {
      return 'In ${duration.inHours} hours';
    }
    return 'In ${duration.inDays} days';
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(0)}K';
    }
    return value.toStringAsFixed(0);
  }

  Future<void> _sendEmail(String email) async {
    HapticFeedback.lightImpact();
    final Uri emailUri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
    }
  }
}

/// Entity chip for related information
class _EntityChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? sublabel;
  final VoidCallback onTap;
  final bool isDark;
  final Color? color;

  const _EntityChip({
    required this.icon,
    required this.label,
    this.sublabel,
    required this.onTap,
    required this.isDark,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? IrisTheme.info;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isDark
              ? IrisTheme.darkSurfaceElevated
              : IrisTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: chipColor.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: chipColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: chipColor),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: IrisTheme.caption.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: IrisTheme.weightMedium,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (sublabel != null)
                    Text(
                      sublabel!,
                      style: IrisTheme.caption.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                        fontSize: 10,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            Icon(
              Iconsax.arrow_right_3,
              size: 14,
              color: chipColor,
            ),
          ],
        ),
      ),
    );
  }
}

/// Quick action button
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDark;
  final bool isPrimary;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.isDark,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          gradient: isPrimary ? IrisTheme.goldGradient : null,
          color: isPrimary
              ? null
              : (isDark
                  ? IrisTheme.darkSurfaceElevated
                  : IrisTheme.lightSurfaceElevated),
          borderRadius: BorderRadius.circular(10),
          border: isPrimary
              ? null
              : Border.all(
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isPrimary
                  ? Colors.black
                  : (isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: IrisTheme.labelSmall.copyWith(
                color: isPrimary
                    ? Colors.black
                    : (isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary),
                fontWeight: isPrimary ? IrisTheme.weightSemiBold : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
