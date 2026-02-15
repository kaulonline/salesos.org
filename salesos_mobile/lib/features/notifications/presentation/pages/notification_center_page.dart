import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';

import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/notification_repository.dart';
import '../widgets/notification_list_item.dart';

/// Filter options for notifications
enum NotificationFilter {
  all,
  unread,
  deals,
  tasks,
  aiInsights,
}

/// Extension for NotificationFilter display properties
extension NotificationFilterExtension on NotificationFilter {
  String get displayName {
    switch (this) {
      case NotificationFilter.all:
        return 'All';
      case NotificationFilter.unread:
        return 'Unread';
      case NotificationFilter.deals:
        return 'Deals';
      case NotificationFilter.tasks:
        return 'Tasks';
      case NotificationFilter.aiInsights:
        return 'AI Insights';
    }
  }

  IconData get icon {
    switch (this) {
      case NotificationFilter.all:
        return Iconsax.notification;
      case NotificationFilter.unread:
        return Iconsax.notification_bing;
      case NotificationFilter.deals:
        return Iconsax.dollar_circle;
      case NotificationFilter.tasks:
        return Iconsax.task_square;
      case NotificationFilter.aiInsights:
        return Iconsax.magic_star;
    }
  }

  Color get color {
    switch (this) {
      case NotificationFilter.all:
        return LuxuryColors.rolexGreen;
      case NotificationFilter.unread:
        return LuxuryColors.jadePremium;
      case NotificationFilter.deals:
        return LuxuryColors.champagneGold;
      case NotificationFilter.tasks:
        return LuxuryColors.warmGold;
      case NotificationFilter.aiInsights:
        return LuxuryColors.roseGold;
    }
  }
}

/// Premium Notification Center Page with luxury design
/// Features:
/// - Date-grouped notifications (Today, Yesterday, This Week, Earlier)
/// - Swipe to dismiss and mark as read
/// - Filter tabs: All, Unread, Deals, Tasks, AI Insights
/// - Pull to refresh
/// - Premium empty states
/// - Navigation to detail pages
class NotificationCenterPage extends ConsumerStatefulWidget {
  const NotificationCenterPage({super.key});

  @override
  ConsumerState<NotificationCenterPage> createState() => _NotificationCenterPageState();
}

class _NotificationCenterPageState extends ConsumerState<NotificationCenterPage>
    with SingleTickerProviderStateMixin {
  NotificationFilter _selectedFilter = NotificationFilter.all;
  late AnimationController _refreshController;

  @override
  void initState() {
    super.initState();
    _refreshController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
  }

  @override
  void dispose() {
    _refreshController.dispose();
    super.dispose();
  }

  /// Group notifications by date
  Map<String, List<AppNotification>> _groupByDate(List<AppNotification> notifications) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final thisWeekStart = today.subtract(Duration(days: today.weekday - 1));

    final Map<String, List<AppNotification>> grouped = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': [],
    };

    for (final notification in notifications) {
      final notificationDate = DateTime(
        notification.createdAt.year,
        notification.createdAt.month,
        notification.createdAt.day,
      );

      if (notificationDate.isAtSameMomentAs(today)) {
        grouped['Today']!.add(notification);
      } else if (notificationDate.isAtSameMomentAs(yesterday)) {
        grouped['Yesterday']!.add(notification);
      } else if (notificationDate.isAfter(thisWeekStart) ||
          notificationDate.isAtSameMomentAs(thisWeekStart)) {
        grouped['This Week']!.add(notification);
      } else {
        grouped['Earlier']!.add(notification);
      }
    }

    // Remove empty groups
    grouped.removeWhere((key, value) => value.isEmpty);

    return grouped;
  }

  /// Filter notifications based on selected filter
  List<AppNotification> _filterNotifications(List<AppNotification> notifications) {
    switch (_selectedFilter) {
      case NotificationFilter.all:
        return notifications;
      case NotificationFilter.unread:
        return notifications.where((n) => !n.isRead).toList();
      case NotificationFilter.deals:
        return notifications.where((n) => n.type == NotificationType.deal).toList();
      case NotificationFilter.tasks:
        return notifications
            .where((n) =>
                n.type == NotificationType.task ||
                n.type == NotificationType.reminder)
            .toList();
      case NotificationFilter.aiInsights:
        return notifications.where((n) => n.type == NotificationType.aiInsight).toList();
    }
  }

  /// Handle notification tap - navigate to relevant detail page
  void _onNotificationTap(AppNotification notification) {
    // Mark as read
    ref.read(notificationsProvider.notifier).markAsRead(notification.id);

    // Navigate based on entity type
    if (notification.entityId != null && notification.entityType != null) {
      switch (notification.entityType) {
        case 'deal':
          context.push('${AppRoutes.deals}/${notification.entityId}');
          break;
        case 'task':
          context.go(AppRoutes.tasks);
          break;
        case 'contact':
          context.push('${AppRoutes.contacts}/${notification.entityId}');
          break;
        case 'lead':
          context.push('${AppRoutes.leads}/${notification.entityId}');
          break;
        case 'account':
          context.push('${AppRoutes.accounts}/${notification.entityId}');
          break;
        default:
          break;
      }
    }
  }

  /// Show mark all as read confirmation dialog
  void _showMarkAllReadDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isDark
                ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                : LuxuryColors.rolexGreen.withValues(alpha: 0.1),
            width: 1,
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Iconsax.tick_circle,
                size: 20,
                color: LuxuryColors.rolexGreen,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Mark All as Read',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to mark all notifications as read? This action cannot be undone.',
          style: IrisTheme.bodyMedium.copyWith(
            color: LuxuryColors.textMuted,
            height: 1.5,
          ),
        ),
        actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
          ),
          GestureDetector(
            onTap: () {
              Navigator.of(dialogContext).pop();
              ref.read(notificationsProvider.notifier).markAllAsRead();
              HapticFeedback.mediumImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      Icon(
                        Iconsax.tick_circle5,
                        size: 18,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'All notifications marked as read',
                        style: IrisTheme.bodySmall.copyWith(color: Colors.white),
                      ),
                    ],
                  ),
                  backgroundColor: LuxuryColors.rolexGreen,
                  behavior: SnackBarBehavior.floating,
                  margin: const EdgeInsets.all(16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Text(
                'Mark All Read',
                style: IrisTheme.labelMedium.copyWith(
                  color: LuxuryColors.jadePremium,
                  fontWeight: IrisTheme.weightSemiBold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final notificationsAsync = ref.watch(notificationsProvider);
    final unreadCount = ref.watch(unreadNotificationsCountProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Header with back button and mark all read
            _buildHeader(isDark, unreadCount),

            // Filter chips
            _buildFilterChips(isDark),

            // Notifications list
            Expanded(
              child: notificationsAsync.when(
                data: (notifications) {
                  final filtered = _filterNotifications(notifications);
                  if (filtered.isEmpty) {
                    return _buildEmptyState(isDark);
                  }
                  return _buildNotificationsList(isDark, filtered);
                },
                loading: () => _buildLoadingState(isDark),
                error: (error, stack) => _buildErrorState(isDark, error),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build header with back button, title, and mark all read action
  Widget _buildHeader(bool isDark, int unreadCount) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
            width: 0.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Back button
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              context.pop();
            },
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.black.withValues(alpha: 0.06),
                  width: 1,
                ),
              ),
              child: Icon(
                Iconsax.arrow_left,
                size: 20,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ),
          const SizedBox(width: 16),

          // Title with unread count badge
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Notifications',
                      style: IrisTheme.headlineSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: IrisTheme.weightSemiBold,
                      ),
                    ),
                    if (unreadCount > 0) ...[
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              LuxuryColors.jadePremium,
                              LuxuryColors.rolexGreen,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Text(
                          '$unreadCount',
                          style: IrisTheme.labelSmall.copyWith(
                            color: Colors.white,
                            fontWeight: IrisTheme.weightBold,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (unreadCount > 0) ...[
                  const SizedBox(height: 2),
                  Text(
                    '$unreadCount unread notification${unreadCount == 1 ? '' : 's'}',
                    style: IrisTheme.labelSmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Mark all read button
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              _showMarkAllReadDialog();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.25),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Iconsax.tick_circle,
                    size: 16,
                    color: LuxuryColors.rolexGreen,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Read All',
                    style: IrisTheme.labelSmall.copyWith(
                      color: LuxuryColors.rolexGreen,
                      fontWeight: IrisTheme.weightSemiBold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  /// Build filter chips: All, Unread, Deals, Tasks, AI Insights
  Widget _buildFilterChips(bool isDark) {
    final filters = NotificationFilter.values;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? Colors.white.withValues(alpha: 0.06)
                : Colors.black.withValues(alpha: 0.04),
            width: 0.5,
          ),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: filters.asMap().entries.map((entry) {
            final index = entry.key;
            final filter = entry.value;
            final isSelected = _selectedFilter == filter;

            return Padding(
              padding: const EdgeInsets.only(right: 10),
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedFilter = filter);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOutCubic,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? filter.color.withValues(alpha: 0.15)
                        : (isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.black.withValues(alpha: 0.03)),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? filter.color.withValues(alpha: 0.4)
                          : (isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.black.withValues(alpha: 0.08)),
                      width: isSelected ? 1.5 : 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: filter.color.withValues(alpha: 0.2),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        filter.icon,
                        size: 16,
                        color: isSelected
                            ? filter.color
                            : (isDark
                                ? LuxuryColors.textMuted
                                : IrisTheme.lightTextSecondary),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        filter.displayName,
                        style: IrisTheme.labelSmall.copyWith(
                          color: isSelected
                              ? filter.color
                              : (isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight),
                          fontWeight: isSelected
                              ? IrisTheme.weightSemiBold
                              : IrisTheme.weightMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              )
                  .animate()
                  .fadeIn(delay: Duration(milliseconds: 50 * index), duration: 250.ms)
                  .slideX(begin: 0.1, curve: Curves.easeOut),
            );
          }).toList(),
        ),
      ),
    );
  }

  /// Build the notifications list with date grouping
  Widget _buildNotificationsList(bool isDark, List<AppNotification> notifications) {
    final grouped = _groupByDate(notifications);
    int itemIndex = 0;

    return RefreshIndicator(
      color: LuxuryColors.rolexGreen,
      backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
      strokeWidth: 2.5,
      displacement: 50,
      onRefresh: () async {
        HapticFeedback.lightImpact();
        _refreshController.forward(from: 0);
        await ref.read(notificationsProvider.notifier).refresh();
      },
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        itemCount: grouped.entries.fold(0, (sum, entry) => sum + 1 + entry.value.length) + 2,
        itemBuilder: (context, index) {
          // Top padding
          if (index == 0) {
            return const SizedBox(height: 8);
          }

          int currentIndex = 1;
          for (final entry in grouped.entries) {
            // Date header
            if (index == currentIndex) {
              return NotificationDateHeader(title: entry.key);
            }
            currentIndex++;

            // Notifications in this group
            for (int i = 0; i < entry.value.length; i++) {
              if (index == currentIndex) {
                final notification = entry.value[i];
                return NotificationListItem(
                  notification: notification,
                  index: itemIndex++,
                  onTap: () => _onNotificationTap(notification),
                  onMarkRead: () {
                    HapticFeedback.lightImpact();
                    ref.read(notificationsProvider.notifier).toggleRead(notification.id);
                  },
                  onDelete: () {
                    HapticFeedback.mediumImpact();
                    ref.read(notificationsProvider.notifier).deleteNotification(notification.id);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Row(
                          children: [
                            Icon(
                              Iconsax.trash,
                              size: 16,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Notification deleted',
                              style: IrisTheme.bodySmall.copyWith(color: Colors.white),
                            ),
                          ],
                        ),
                        backgroundColor:
                            isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightTextSecondary,
                        behavior: SnackBarBehavior.floating,
                        margin: const EdgeInsets.all(16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        duration: const Duration(seconds: 3),
                        action: SnackBarAction(
                          label: 'Undo',
                          textColor: LuxuryColors.jadePremium,
                          onPressed: () {
                            // Restore notification by refreshing
                            ref.read(notificationsProvider.notifier).refresh();
                          },
                        ),
                      ),
                    );
                  },
                );
              }
              currentIndex++;
            }
          }

          // Bottom padding
          return const SizedBox(height: 100);
        },
      ),
    );
  }

  /// Build empty state based on current filter
  Widget _buildEmptyState(bool isDark) {
    String title;
    String subtitle;
    IconData icon;

    switch (_selectedFilter) {
      case NotificationFilter.all:
        title = 'No Notifications';
        subtitle = 'You\'re all caught up! Check back later for updates.';
        icon = Iconsax.notification;
        break;
      case NotificationFilter.unread:
        title = 'All Caught Up!';
        subtitle = 'You have no unread notifications. Great job staying on top of things!';
        icon = Iconsax.tick_circle;
        break;
      case NotificationFilter.deals:
        title = 'No Deal Updates';
        subtitle = 'Deal notifications will appear here when your pipeline changes.';
        icon = Iconsax.dollar_circle;
        break;
      case NotificationFilter.tasks:
        title = 'No Task Notifications';
        subtitle = 'Task reminders and updates will show up here.';
        icon = Iconsax.task_square;
        break;
      case NotificationFilter.aiInsights:
        title = 'No AI Insights';
        subtitle = 'SalesOS will notify you when it discovers valuable insights.';
        icon = Iconsax.magic_star;
        break;
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animated icon container
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    _selectedFilter.color.withValues(alpha: 0.15),
                    _selectedFilter.color.withValues(alpha: 0.08),
                  ],
                ),
                shape: BoxShape.circle,
                border: Border.all(
                  color: _selectedFilter.color.withValues(alpha: 0.25),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: _selectedFilter.color.withValues(alpha: 0.15),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Icon(
                icon,
                size: 44,
                color: _selectedFilter.color.withValues(alpha: 0.7),
              ),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .scale(
                  begin: const Offset(1, 1),
                  end: const Offset(1.05, 1.05),
                  duration: 2500.ms,
                  curve: Curves.easeInOut,
                ),
            const SizedBox(height: 28),

            Text(
              title,
              style: IrisTheme.headlineSmall.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                fontWeight: IrisTheme.weightSemiBold,
              ),
            ).animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 10),

            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
                height: 1.5,
              ),
            ).animate().fadeIn(delay: 300.ms),

            // Show "View All" button when filtering
            if (_selectedFilter != NotificationFilter.all) ...[
              const SizedBox(height: 28),
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _selectedFilter = NotificationFilter.all);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.notification,
                        size: 18,
                        color: LuxuryColors.rolexGreen,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'View All Notifications',
                        style: IrisTheme.labelMedium.copyWith(
                          color: LuxuryColors.rolexGreen,
                          fontWeight: IrisTheme.weightSemiBold,
                        ),
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
            ],
          ],
        ),
      ),
    );
  }

  /// Build loading shimmer state
  Widget _buildLoadingState(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: 6,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.06),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              // Icon placeholder
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title placeholder
                    Container(
                      height: 16,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.08)
                            : Colors.black.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Body placeholder
                    Container(
                      height: 12,
                      width: MediaQuery.of(context).size.width * 0.5,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.black.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Badge placeholder
                    Container(
                      height: 20,
                      width: 70,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.black.withValues(alpha: 0.03),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        )
            .animate(onPlay: (c) => c.repeat())
            .shimmer(
              delay: Duration(milliseconds: 200 * index),
              duration: 1800.ms,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.black.withValues(alpha: 0.03),
            );
      },
    );
  }

  /// Build error state with retry button
  Widget _buildErrorState(bool isDark, Object error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: IrisTheme.error.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: IrisTheme.error.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
              child: Icon(
                Iconsax.warning_2,
                size: 38,
                color: IrisTheme.error.withValues(alpha: 0.8),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Something went wrong',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Unable to load notifications. Please check your connection and try again.',
              textAlign: TextAlign.center,
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 28),
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                ref.read(notificationsProvider.notifier).refresh();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.refresh,
                      size: 18,
                      color: LuxuryColors.rolexGreen,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Try Again',
                      style: IrisTheme.labelMedium.copyWith(
                        color: LuxuryColors.rolexGreen,
                        fontWeight: IrisTheme.weightSemiBold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
