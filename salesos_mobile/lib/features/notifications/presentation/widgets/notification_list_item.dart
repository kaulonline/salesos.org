import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/notification_repository.dart';

/// A premium notification list item with swipe actions
class NotificationListItem extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback? onTap;
  final VoidCallback? onMarkRead;
  final VoidCallback? onDelete;
  final int index;

  const NotificationListItem({
    super.key,
    required this.notification,
    this.onTap,
    this.onMarkRead,
    this.onDelete,
    this.index = 0,
  });

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(dateTime);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final typeColor = notification.type.color;

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.horizontal,
      background: _buildSwipeBackground(
        isDark: isDark,
        alignment: Alignment.centerLeft,
        icon: notification.isRead ? Icons.mark_email_unread_outlined : Icons.mark_email_read_outlined,
        label: notification.isRead ? 'Unread' : 'Read',
        color: LuxuryColors.rolexGreen,
      ),
      secondaryBackground: _buildSwipeBackground(
        isDark: isDark,
        alignment: Alignment.centerRight,
        icon: Icons.delete_outline,
        label: 'Delete',
        color: IrisTheme.error,
      ),
      confirmDismiss: (direction) async {
        HapticFeedback.lightImpact();
        if (direction == DismissDirection.startToEnd) {
          onMarkRead?.call();
          return false; // Don't dismiss, just toggle read
        } else {
          return true; // Dismiss for delete
        }
      },
      onDismissed: (direction) {
        if (direction == DismissDirection.endToStart) {
          onDelete?.call();
        }
      },
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            onTap?.call();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              border: Border(
                bottom: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.06)
                      : Colors.black.withValues(alpha: 0.05),
                  width: 0.5,
                ),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Notification type icon with colored background
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: typeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: typeColor.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    notification.type.icon,
                    size: 20,
                    color: typeColor,
                  ),
                ),
                const SizedBox(width: 14),

                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notification.title,
                              style: IrisTheme.titleSmall.copyWith(
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                                fontWeight: notification.isRead
                                    ? IrisTheme.weightMedium
                                    : IrisTheme.weightSemiBold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatTime(notification.createdAt),
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.body,
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark
                              ? LuxuryColors.textMuted
                              : IrisTheme.lightTextSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          // Type badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: typeColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              notification.type.displayName.toUpperCase(),
                              style: IrisTheme.caption.copyWith(
                                color: typeColor,
                                fontWeight: IrisTheme.weightMedium,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const Spacer(),
                          // Unread indicator
                          if (!notification.isRead)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: LuxuryColors.jadePremium,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: LuxuryColors.jadePremium.withValues(alpha: 0.4),
                                    blurRadius: 4,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: 50 * index), duration: 300.ms)
        .slideX(begin: 0.05, curve: Curves.easeOut);
  }

  Widget _buildSwipeBackground({
    required bool isDark,
    required Alignment alignment,
    required IconData icon,
    required String label,
    required Color color,
  }) {
    final isLeft = alignment == Alignment.centerLeft;

    return Container(
      alignment: alignment,
      padding: EdgeInsets.only(
        left: isLeft ? 24 : 0,
        right: isLeft ? 0 : 24,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.2 : 0.1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!isLeft) ...[
            Text(
              label,
              style: IrisTheme.labelMedium.copyWith(
                color: color,
                fontWeight: IrisTheme.weightSemiBold,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Icon(icon, color: color, size: 24),
          if (isLeft) ...[
            const SizedBox(width: 8),
            Text(
              label,
              style: IrisTheme.labelMedium.copyWith(
                color: color,
                fontWeight: IrisTheme.weightSemiBold,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Date group header for notifications
class NotificationDateHeader extends StatelessWidget {
  final String title;

  const NotificationDateHeader({
    super.key,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      color: isDark ? LuxuryColors.richBlack : IrisTheme.lightBackground,
      child: Row(
        children: [
          Container(
            width: 3,
            height: 16,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            title.toUpperCase(),
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
              fontWeight: IrisTheme.weightSemiBold,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
