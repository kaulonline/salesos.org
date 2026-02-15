import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/luxury_card.dart';

/// Notification type enum for filtering
enum NotificationType {
  deal,
  task,
  aiInsight,
  system,
  mention,
  reminder,
}

/// Extension for NotificationType display properties
extension NotificationTypeExtension on NotificationType {
  String get displayName {
    switch (this) {
      case NotificationType.deal:
        return 'Deals';
      case NotificationType.task:
        return 'Tasks';
      case NotificationType.aiInsight:
        return 'AI Insights';
      case NotificationType.system:
        return 'System';
      case NotificationType.mention:
        return 'Mentions';
      case NotificationType.reminder:
        return 'Reminders';
    }
  }

  IconData get icon {
    switch (this) {
      case NotificationType.deal:
        return Icons.handshake_outlined;
      case NotificationType.task:
        return Icons.task_alt_outlined;
      case NotificationType.aiInsight:
        return Icons.auto_awesome_outlined;
      case NotificationType.system:
        return Icons.info_outline;
      case NotificationType.mention:
        return Icons.alternate_email;
      case NotificationType.reminder:
        return Icons.alarm_outlined;
    }
  }

  Color get color {
    switch (this) {
      case NotificationType.deal:
        return LuxuryColors.champagneGold; // SalesOS gold
      case NotificationType.task:
        return LuxuryColors.champagneGoldDark; // Dark gold
      case NotificationType.aiInsight:
        return LuxuryColors.champagneGold; // Gold
      case NotificationType.system:
        return LuxuryColors.textMuted; // Muted text
      case NotificationType.mention:
        return LuxuryColors.roseGold; // Rose gold
      case NotificationType.reminder:
        return const Color(0xFFD99C79); // Warm gold
    }
  }
}

/// Notification model
class AppNotification {
  final String id;
  final String title;
  final String body;
  final NotificationType type;
  final DateTime createdAt;
  final bool isRead;
  final String? entityId;
  final String? entityType;
  final Map<String, dynamic>? metadata;

  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.createdAt,
    this.isRead = false,
    this.entityId,
    this.entityType,
    this.metadata,
  });

  AppNotification copyWith({
    String? id,
    String? title,
    String? body,
    NotificationType? type,
    DateTime? createdAt,
    bool? isRead,
    String? entityId,
    String? entityType,
    Map<String, dynamic>? metadata,
  }) {
    return AppNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      createdAt: createdAt ?? this.createdAt,
      isRead: isRead ?? this.isRead,
      entityId: entityId ?? this.entityId,
      entityType: entityType ?? this.entityType,
      metadata: metadata ?? this.metadata,
    );
  }
}

/// Notification repository provider
final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository();
});

/// Notifications state provider
final notificationsProvider = AsyncNotifierProvider<NotificationsNotifier, List<AppNotification>>(
  NotificationsNotifier.new,
);

/// Unread notifications count provider
final unreadNotificationsCountProvider = Provider<int>((ref) {
  final notifications = ref.watch(notificationsProvider);
  return notifications.maybeWhen(
    data: (list) => list.where((n) => !n.isRead).length,
    orElse: () => 0,
  );
});

/// Notification repository with mock data
class NotificationRepository {
  /// Fetch all notifications
  Future<List<AppNotification>> getNotifications() async {
    // In production, this would call the real API
    // For now, return mock data only in debug mode
    if (kDebugMode) {
      await Future.delayed(const Duration(milliseconds: 800));
      return _generateMockNotifications();
    }
    // Production: return empty list until real API is connected
    return [];
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    await Future.delayed(const Duration(milliseconds: 200));
    // In real implementation, this would call the API
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    await Future.delayed(const Duration(milliseconds: 300));
    // In real implementation, this would call the API
  }

  /// Delete a notification
  Future<void> deleteNotification(String notificationId) async {
    await Future.delayed(const Duration(milliseconds: 200));
    // In real implementation, this would call the API
  }

  /// Generate mock notifications for development
  List<AppNotification> _generateMockNotifications() {
    final now = DateTime.now();

    return [
      // Today's notifications
      AppNotification(
        id: '1',
        title: 'Deal stage updated',
        body: 'Acme Corp Enterprise License moved to Negotiation stage.',
        type: NotificationType.deal,
        createdAt: now.subtract(const Duration(minutes: 15)),
        isRead: false,
        entityId: 'deal_001',
        entityType: 'deal',
      ),
      AppNotification(
        id: '2',
        title: 'AI Insight: High-value opportunity',
        body: 'SalesOS detected a pattern suggesting TechStart Inc. is ready to close. Engagement score increased by 40%.',
        type: NotificationType.aiInsight,
        createdAt: now.subtract(const Duration(hours: 1)),
        isRead: false,
        entityId: 'deal_002',
        entityType: 'deal',
      ),
      AppNotification(
        id: '3',
        title: 'Task reminder',
        body: 'Follow up call with Sarah Johnson is due in 30 minutes.',
        type: NotificationType.reminder,
        createdAt: now.subtract(const Duration(hours: 2)),
        isRead: false,
        entityId: 'task_001',
        entityType: 'task',
      ),
      AppNotification(
        id: '4',
        title: 'You were mentioned',
        body: 'Mike Chen mentioned you in a note on Global Systems deal.',
        type: NotificationType.mention,
        createdAt: now.subtract(const Duration(hours: 4)),
        isRead: true,
        entityId: 'deal_003',
        entityType: 'deal',
      ),

      // Yesterday's notifications
      AppNotification(
        id: '5',
        title: 'New deal assigned',
        body: 'You have been assigned to lead the Quantum Solutions opportunity worth \$125,000.',
        type: NotificationType.deal,
        createdAt: now.subtract(const Duration(days: 1, hours: 3)),
        isRead: true,
        entityId: 'deal_004',
        entityType: 'deal',
      ),
      AppNotification(
        id: '6',
        title: 'Task completed',
        body: 'Contract review for Vertex Labs has been marked complete.',
        type: NotificationType.task,
        createdAt: now.subtract(const Duration(days: 1, hours: 6)),
        isRead: true,
        entityId: 'task_002',
        entityType: 'task',
      ),
      AppNotification(
        id: '7',
        title: 'AI Insight: Risk detected',
        body: 'Communication gap detected with DataFlow Inc. Consider reaching out soon.',
        type: NotificationType.aiInsight,
        createdAt: now.subtract(const Duration(days: 1, hours: 8)),
        isRead: true,
        entityId: 'deal_005',
        entityType: 'deal',
      ),

      // This week's notifications
      AppNotification(
        id: '8',
        title: 'Weekly summary available',
        body: 'Your SalesOS weekly performance summary is ready to view.',
        type: NotificationType.system,
        createdAt: now.subtract(const Duration(days: 3)),
        isRead: true,
      ),
      AppNotification(
        id: '9',
        title: 'Deal won!',
        body: 'Congratulations! CloudTech Services deal (\$85,000) has been closed.',
        type: NotificationType.deal,
        createdAt: now.subtract(const Duration(days: 4)),
        isRead: true,
        entityId: 'deal_006',
        entityType: 'deal',
        metadata: {'amount': 85000, 'status': 'won'},
      ),
      AppNotification(
        id: '10',
        title: 'AI Agent completed research',
        body: 'Market analysis for the Healthcare vertical is now available.',
        type: NotificationType.aiInsight,
        createdAt: now.subtract(const Duration(days: 5)),
        isRead: true,
      ),

      // Older notifications
      AppNotification(
        id: '11',
        title: 'New feature available',
        body: 'Smart Notes now supports voice transcription. Try it out!',
        type: NotificationType.system,
        createdAt: now.subtract(const Duration(days: 7)),
        isRead: true,
      ),
      AppNotification(
        id: '12',
        title: 'Quarterly goals updated',
        body: 'Your Q4 sales targets have been updated. Review in Dashboard.',
        type: NotificationType.system,
        createdAt: now.subtract(const Duration(days: 10)),
        isRead: true,
      ),
    ];
  }
}

/// Notifications async notifier
class NotificationsNotifier extends AsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() async {
    final repository = ref.read(notificationRepositoryProvider);
    return repository.getNotifications();
  }

  /// Refresh notifications
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repository = ref.read(notificationRepositoryProvider);
      return repository.getNotifications();
    });
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    final repository = ref.read(notificationRepositoryProvider);
    await repository.markAsRead(notificationId);
    final current = state.value;
    if (current != null) {
      final updated = current.map((n) {
        if (n.id == notificationId) {
          return n.copyWith(isRead: true);
        }
        return n;
      }).toList();
      state = AsyncValue.data(updated);
    }
  }

  /// Toggle read status
  Future<void> toggleRead(String notificationId) async {
    final current = state.value;
    if (current != null) {
      final updated = current.map((n) {
        if (n.id == notificationId) {
          return n.copyWith(isRead: !n.isRead);
        }
        return n;
      }).toList();
      state = AsyncValue.data(updated);
    }
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    final repository = ref.read(notificationRepositoryProvider);
    await repository.markAllAsRead();
    final current = state.value;
    if (current != null) {
      final updated = current.map((n) => n.copyWith(isRead: true)).toList();
      state = AsyncValue.data(updated);
    }
  }

  /// Delete a notification
  Future<void> deleteNotification(String notificationId) async {
    final repository = ref.read(notificationRepositoryProvider);
    await repository.deleteNotification(notificationId);
    final current = state.value;
    if (current != null) {
      final updated = current.where((n) => n.id != notificationId).toList();
      state = AsyncValue.data(updated);
    }
  }
}
