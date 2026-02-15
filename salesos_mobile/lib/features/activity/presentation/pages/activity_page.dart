import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import 'activity_detail_page.dart';
import '../widgets/activity_form.dart';

/// Provider for fetching all activities from CRM
final activityPageProvider = FutureProvider<List<ActivityItem>>((ref) async {
  final crmService = ref.watch(crmDataServiceProvider);
  final rawActivities = await crmService.getActivities(limit: 50);

  // Transform raw CRM data into ActivityItem objects
  return rawActivities.map((activity) {
    final type = _mapActivityType(activity);
    final title = activity['Subject'] as String? ??
        activity['subject'] as String? ??
        activity['title'] as String? ??
        'Activity';
    final description = activity['Description'] as String? ??
        activity['description'] as String? ??
        '';
    final contactName = activity['contactName'] as String? ??
        (activity['Who'] as Map?)?['Name'] as String? ??
        '';
    final relatedTo = activity['relatedTo'] as String? ??
        (activity['What'] as Map?)?['Name'] as String? ??
        '';

    // Parse timestamp
    final dateStr = activity['CreatedDate'] as String? ??
        activity['createdAt'] as String? ??
        activity['activityDate'] as String? ??
        activity['startTime'] as String?;
    final timestamp = dateStr != null
        ? DateTime.tryParse(dateStr) ?? DateTime.now()
        : DateTime.now();

    // Build metadata
    final metadata = <String, String>{};
    if (activity['location'] != null) {
      metadata['location'] = activity['location'] as String;
    }
    if (activity['Status'] != null || activity['status'] != null) {
      metadata['status'] = (activity['Status'] ?? activity['status']) as String;
    }
    if (activity['Priority'] != null || activity['priority'] != null) {
      metadata['priority'] = (activity['Priority'] ?? activity['priority']) as String;
    }

    // Build relatedEntity with better fallbacks
    String relatedEntity;
    if (contactName.isNotEmpty) {
      relatedEntity = contactName;
    } else if (relatedTo.isNotEmpty) {
      relatedEntity = relatedTo;
    } else {
      // Fallback to activity type description instead of "Unknown"
      relatedEntity = _getActivityTypeLabel(type);
    }

    return ActivityItem(
      id: activity['Id'] as String? ?? activity['id'] as String? ?? '',
      type: type,
      title: title,
      description: description.isNotEmpty ? description : title,
      timestamp: timestamp,
      relatedEntity: relatedEntity,
      metadata: metadata.isNotEmpty ? metadata : null,
    );
  }).toList()
    ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
});

/// Map raw activity data to ActivityType enum
ActivityType _mapActivityType(Map<String, dynamic> activity) {
  final type = (activity['type'] as String? ?? '').toUpperCase();
  final subject = (activity['Subject'] as String? ??
          activity['subject'] as String? ??
          activity['title'] as String? ??
          '')
      .toLowerCase();

  // Check explicit type first
  if (type == 'CALL' || subject.contains('call') || subject.contains('phone')) {
    return ActivityType.call;
  }
  if (type == 'EMAIL' || subject.contains('email') || subject.contains('send')) {
    return ActivityType.email;
  }
  if (type == 'MEETING' || type == 'EVENT' || subject.contains('meeting') || subject.contains('demo')) {
    return ActivityType.meeting;
  }
  if (subject.contains('won') || subject.contains('closed won')) {
    return ActivityType.dealWon;
  }
  if (subject.contains('lost') || subject.contains('closed lost')) {
    return ActivityType.dealLost;
  }
  if (subject.contains('stage') || subject.contains('moved')) {
    return ActivityType.stageChange;
  }
  if (subject.contains('note') || subject.contains('comment')) {
    return ActivityType.note;
  }
  if (subject.contains('complete') || subject.contains('done') || subject.contains('finished')) {
    return ActivityType.taskComplete;
  }
  if (subject.contains('insight') || subject.contains('ai') || subject.contains('recommendation')) {
    return ActivityType.aiInsight;
  }

  // Default to task
  return ActivityType.taskComplete;
}

/// Get a human-readable label for an activity type
String _getActivityTypeLabel(ActivityType type) {
  switch (type) {
    case ActivityType.call:
      return 'Phone Call';
    case ActivityType.email:
      return 'Email';
    case ActivityType.meeting:
      return 'Meeting';
    case ActivityType.note:
      return 'Note';
    case ActivityType.taskComplete:
      return 'Task';
    case ActivityType.dealWon:
      return 'Deal Won';
    case ActivityType.dealLost:
      return 'Deal Lost';
    case ActivityType.stageChange:
      return 'Stage Change';
    case ActivityType.aiInsight:
      return 'AI Insight';
  }
}

class ActivityPage extends ConsumerStatefulWidget {
  const ActivityPage({super.key});

  @override
  ConsumerState<ActivityPage> createState() => _ActivityPageState();
}

class _ActivityPageState extends ConsumerState<ActivityPage> {
  String _selectedFilter = 'All';

  List<ActivityItem> _filterActivities(List<ActivityItem> activities) {
    if (_selectedFilter == 'All') return activities;
    return activities.where((a) {
      switch (_selectedFilter) {
        case 'Calls':
          return a.type == ActivityType.call;
        case 'Emails':
          return a.type == ActivityType.email;
        case 'Meetings':
          return a.type == ActivityType.meeting;
        case 'Deals':
          return a.type == ActivityType.dealWon ||
              a.type == ActivityType.dealLost ||
              a.type == ActivityType.stageChange;
        case 'Tasks':
          return a.type == ActivityType.taskComplete ||
              a.type == ActivityType.note;
        default:
          return true;
      }
    }).toList();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(activityPageProvider);
  }

  void _showQuickLogSheet(BuildContext context, bool isDark) {
    HapticFeedback.mediumImpact();
    ActivityForm.show(
      context: context,
      onSuccess: () {
        ref.invalidate(activityPageProvider);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activitiesAsync = ref.watch(activityPageProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: const IrisAppBar(
        title: 'Activity',
        showBackButton: true,
      ),
      floatingActionButton: _QuickLogFab(
        onTap: () => _showQuickLogSheet(context, isDark),
      ),
      body: Column(
        children: [
          // Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: ['All', 'Calls', 'Emails', 'Meetings', 'Deals', 'Tasks'].map((filter) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _FilterChip(
                    label: filter,
                    isSelected: _selectedFilter == filter,
                    onTap: () => setState(() => _selectedFilter = filter),
                  ),
                );
              }).toList(),
            ),
          ).animate().fadeIn(duration: 300.ms),

          // Activity Timeline
          Expanded(
            child: activitiesAsync.when(
              loading: () => const IrisListShimmer(itemCount: 8, itemHeight: 100),
              error: (error, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Iconsax.warning_2,
                      size: 48,
                      color: IrisTheme.error,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Failed to load activities',
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        error.toString(),
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _onRefresh,
                      icon: const Icon(Iconsax.refresh),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: LuxuryColors.rolexGreen,
                        foregroundColor: isDark ? Colors.black : Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
              data: (activities) {
                final filteredActivities = _filterActivities(activities);

                if (filteredActivities.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Iconsax.activity,
                          size: 48,
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _selectedFilter == 'All'
                              ? 'No activities found'
                              : 'No $_selectedFilter activities',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Activities from your CRM will appear here',
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _onRefresh,
                  color: LuxuryColors.jadePremium,
                  backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredActivities.length,
                    itemBuilder: (context, index) {
                      final activity = filteredActivities[index];
                      final showDateHeader = index == 0 ||
                          !_isSameDay(
                            filteredActivities[index - 1].timestamp,
                            activity.timestamp,
                          );

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (showDateHeader) ...[
                            if (index > 0) const SizedBox(height: 16),
                            Text(
                              _formatDateHeader(activity.timestamp),
                              style: IrisTheme.titleSmall.copyWith(
                                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                          _ActivityTimelineItem(
                            activity: activity,
                            isLast: index == filteredActivities.length - 1 ||
                                !_isSameDay(
                                  activity.timestamp,
                                  filteredActivities[index + 1].timestamp,
                                ),
                            onTap: () {
                              HapticFeedback.lightImpact();
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => ActivityDetailPage(activity: activity),
                                ),
                              );
                            },
                          ).animate(delay: (100 + index * 30).ms).fadeIn().slideX(begin: 0.03),
                        ],
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _formatDateHeader(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dateOnly = DateTime(date.year, date.month, date.day);

    if (dateOnly == today) {
      return 'Today';
    } else if (dateOnly == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '${days[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}';
    }
  }
}

enum ActivityType {
  call,
  email,
  meeting,
  note,
  dealWon,
  dealLost,
  stageChange,
  taskComplete,
  aiInsight,
}

class ActivityItem {
  final String id;
  final ActivityType type;
  final String title;
  final String description;
  final DateTime timestamp;
  final String relatedEntity;
  final Map<String, String>? metadata;

  ActivityItem({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.timestamp,
    required this.relatedEntity,
    this.metadata,
  });
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen
              : (isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? LuxuryColors.rolexGreen
                : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
          ),
        ),
        child: Text(
          label,
          style: IrisTheme.labelMedium.copyWith(
            color: isSelected
                ? (isDark ? Colors.black : Colors.black87)
                : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _ActivityTimelineItem extends StatelessWidget {
  final ActivityItem activity;
  final bool isLast;
  final VoidCallback? onTap;

  const _ActivityTimelineItem({
    required this.activity,
    required this.isLast,
    this.onTap,
  });

  IconData _getIcon() {
    switch (activity.type) {
      case ActivityType.call:
        return Iconsax.call;
      case ActivityType.email:
        return Iconsax.sms;
      case ActivityType.meeting:
        return Iconsax.people;
      case ActivityType.note:
        return Iconsax.note;
      case ActivityType.dealWon:
        return Iconsax.medal_star;
      case ActivityType.dealLost:
        return Iconsax.close_circle;
      case ActivityType.stageChange:
        return Iconsax.arrow_right_3;
      case ActivityType.taskComplete:
        return Iconsax.tick_circle;
      case ActivityType.aiInsight:
        return Iconsax.magic_star;
    }
  }

  Color _getColor() {
    switch (activity.type) {
      case ActivityType.call:
        return IrisTheme.info;
      case ActivityType.email:
        return IrisTheme.success;
      case ActivityType.meeting:
        return IrisTheme.warning;
      case ActivityType.note:
        return IrisTheme.darkTextSecondary;
      case ActivityType.dealWon:
        return LuxuryColors.rolexGreen;
      case ActivityType.dealLost:
        return IrisTheme.error;
      case ActivityType.stageChange:
        return IrisTheme.stageNegotiation;
      case ActivityType.taskComplete:
        return IrisTheme.success;
      case ActivityType.aiInsight:
        return LuxuryColors.rolexGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _getColor();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Timeline indicator
        Column(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: color.withValues(alpha: 0.3)),
              ),
              child: Icon(
                _getIcon(),
                size: 16,
                color: color,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 50,
                margin: const EdgeInsets.symmetric(vertical: 4),
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
          ],
        ),
        const SizedBox(width: 12),
        // Content
        Expanded(
          child: IrisCard(
            margin: EdgeInsets.only(bottom: isLast ? 0 : 8),
            padding: const EdgeInsets.all(12),
            onTap: onTap,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        activity.title,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      timeago.format(activity.timestamp, locale: 'en_short'),
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
                if (activity.description != activity.title) ...[
                  const SizedBox(height: 4),
                  Text(
                    activity.description,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (activity.metadata != null && activity.metadata!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: activity.metadata!.entries.map((entry) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${entry.key}: ${entry.value}',
                          style: IrisTheme.labelSmall.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      Iconsax.link,
                      size: 12,
                      color: LuxuryColors.jadePremium,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        activity.relatedEntity,
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.jadePremium,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Quick log FAB for activity page
class _QuickLogFab extends StatelessWidget {
  final VoidCallback onTap;

  const _QuickLogFab({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FloatingActionButton.extended(
      onPressed: onTap,
      backgroundColor: LuxuryColors.rolexGreen,
      foregroundColor: isDark ? Colors.black : Colors.black87,
      icon: const Icon(Iconsax.add),
      label: const Text(
        'Log Activity',
        style: TextStyle(fontWeight: FontWeight.w600),
      ),
    ).animate().scale(delay: 300.ms, duration: 200.ms);
  }
}
