import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// Activity type enum for the timeline
enum ActivityType {
  call,
  email,
  meeting,
  task,
  note,
}

/// Extension for activity type helpers
extension ActivityTypeExtension on ActivityType {
  String get displayName {
    switch (this) {
      case ActivityType.call:
        return 'Calls';
      case ActivityType.email:
        return 'Emails';
      case ActivityType.meeting:
        return 'Meetings';
      case ActivityType.task:
        return 'Tasks';
      case ActivityType.note:
        return 'Notes';
    }
  }

  IconData get icon {
    switch (this) {
      case ActivityType.call:
        return Iconsax.call;
      case ActivityType.email:
        return Iconsax.sms;
      case ActivityType.meeting:
        return Iconsax.calendar;
      case ActivityType.task:
        return Iconsax.task_square;
      case ActivityType.note:
        return Iconsax.note_1;
    }
  }

  Color get color {
    switch (this) {
      case ActivityType.call:
        return LuxuryColors.jadePremium;
      case ActivityType.email:
        return const Color(0xFF3B82F6);
      case ActivityType.meeting:
        return LuxuryColors.champagneGold;
      case ActivityType.task:
        return const Color(0xFF8B5CF6);
      case ActivityType.note:
        return LuxuryColors.roseGold;
    }
  }
}

/// Data model for a single activity in the timeline
class ActivityItem {
  final String id;
  final ActivityType type;
  final String subject;
  final String? description;
  final String? outcome;
  final String? duration;
  final String? contactName;
  final String? relatedTo;
  final DateTime activityDate;
  final VoidCallback? onTap;

  const ActivityItem({
    required this.id,
    required this.type,
    required this.subject,
    this.description,
    this.outcome,
    this.duration,
    this.contactName,
    this.relatedTo,
    required this.activityDate,
    this.onTap,
  });
}

/// Activity Timeline Widget - Premium timeline view for contact activities
/// Features:
/// - Chronological list with date separators
/// - Activity type icons with gradient backgrounds
/// - Relative timestamps
/// - Gold accent timeline line
/// - Load more pagination
/// - Empty state
/// - Filter by activity type
class ActivityTimeline extends StatefulWidget {
  final List<ActivityItem> activities;
  final bool isLoading;
  final bool hasMore;
  final VoidCallback? onLoadMore;
  final ScrollController? scrollController;
  final bool showFilters;
  final Set<ActivityType>? initialFilters;
  final ValueChanged<Set<ActivityType>>? onFiltersChanged;

  const ActivityTimeline({
    super.key,
    required this.activities,
    this.isLoading = false,
    this.hasMore = false,
    this.onLoadMore,
    this.scrollController,
    this.showFilters = true,
    this.initialFilters,
    this.onFiltersChanged,
  });

  @override
  State<ActivityTimeline> createState() => _ActivityTimelineState();
}

class _ActivityTimelineState extends State<ActivityTimeline> {
  late ScrollController _scrollController;
  late Set<ActivityType> _activeFilters;

  @override
  void initState() {
    super.initState();
    _scrollController = widget.scrollController ?? ScrollController();
    _scrollController.addListener(_onScroll);
    // Initialize filters - empty set means show all
    _activeFilters = widget.initialFilters ?? {};
  }

  @override
  void dispose() {
    if (widget.scrollController == null) {
      _scrollController.dispose();
    }
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        widget.hasMore &&
        !widget.isLoading) {
      widget.onLoadMore?.call();
    }
  }

  void _toggleFilter(ActivityType type) {
    HapticFeedback.lightImpact();
    setState(() {
      if (_activeFilters.contains(type)) {
        _activeFilters.remove(type);
      } else {
        _activeFilters.add(type);
      }
    });
    widget.onFiltersChanged?.call(_activeFilters);
  }

  void _clearFilters() {
    HapticFeedback.lightImpact();
    setState(() {
      _activeFilters.clear();
    });
    widget.onFiltersChanged?.call(_activeFilters);
  }

  List<ActivityItem> get _filteredActivities {
    if (_activeFilters.isEmpty) {
      return widget.activities;
    }
    return widget.activities
        .where((activity) => _activeFilters.contains(activity.type))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final filteredActivities = _filteredActivities;

    if (widget.activities.isEmpty && !widget.isLoading) {
      return const _EmptyActivityTimeline();
    }

    // Group activities by date
    final groupedActivities = _groupActivitiesByDate(filteredActivities);

    return Column(
      children: [
        // Filter chips row
        if (widget.showFilters)
          _ActivityFilterBar(
            activeFilters: _activeFilters,
            onToggleFilter: _toggleFilter,
            onClearFilters: _clearFilters,
            activityCounts: _getActivityCounts(),
          ),
        // Timeline list
        Expanded(
          child: filteredActivities.isEmpty && !widget.isLoading
              ? _EmptyFilteredTimeline(onClearFilters: _clearFilters)
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: groupedActivities.length + (widget.isLoading ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == groupedActivities.length) {
                      // Loading indicator
                      return const Padding(
                        padding: EdgeInsets.all(20),
                        child: Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(LuxuryColors.champagneGold),
                            ),
                          ),
                        ),
                      );
                    }

                    final entry = groupedActivities[index];
                    final dateLabel = entry.key;
                    final dateActivities = entry.value;

                    return _DateSection(
                      dateLabel: dateLabel,
                      activities: dateActivities,
                      sectionIndex: index,
                    );
                  },
                ),
        ),
      ],
    );
  }

  Map<ActivityType, int> _getActivityCounts() {
    final counts = <ActivityType, int>{};
    for (final type in ActivityType.values) {
      counts[type] = widget.activities.where((a) => a.type == type).length;
    }
    return counts;
  }

  List<MapEntry<String, List<ActivityItem>>> _groupActivitiesByDate(
      List<ActivityItem> activities) {
    final Map<String, List<ActivityItem>> grouped = {};
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    for (final activity in activities) {
      final activityDate = DateTime(
        activity.activityDate.year,
        activity.activityDate.month,
        activity.activityDate.day,
      );

      String label;
      if (activityDate == today) {
        label = 'Today';
      } else if (activityDate == yesterday) {
        label = 'Yesterday';
      } else if (activityDate.isAfter(today.subtract(const Duration(days: 7)))) {
        label = _getDayName(activityDate.weekday);
      } else {
        label = _formatDate(activityDate);
      }

      grouped.putIfAbsent(label, () => []).add(activity);
    }

    return grouped.entries.toList();
  }

  String _getDayName(int weekday) {
    switch (weekday) {
      case 1:
        return 'Monday';
      case 2:
        return 'Tuesday';
      case 3:
        return 'Wednesday';
      case 4:
        return 'Thursday';
      case 5:
        return 'Friday';
      case 6:
        return 'Saturday';
      case 7:
        return 'Sunday';
      default:
        return '';
    }
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Date section with date separator and activities for that date
class _DateSection extends StatelessWidget {
  final String dateLabel;
  final List<ActivityItem> activities;
  final int sectionIndex;

  const _DateSection({
    required this.dateLabel,
    required this.activities,
    required this.sectionIndex,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Date separator
        Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 12),
          child: Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  dateLabel.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 1,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        LuxuryColors.champagneGold.withValues(alpha: 0.3),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        )
            .animate(delay: (sectionIndex * 100).ms)
            .fadeIn(duration: 300.ms),

        // Activities for this date with timeline
        ...activities.asMap().entries.map((entry) {
          final index = entry.key;
          final activity = entry.value;
          final isFirst = index == 0;
          final isLast = index == activities.length - 1;

          return _ActivityTimelineCard(
            activity: activity,
            isFirst: isFirst,
            isLast: isLast,
            animationDelay: (sectionIndex * 100 + index * 50).ms,
          );
        }),
      ],
    );
  }
}

/// Individual activity card with timeline connector
class _ActivityTimelineCard extends StatefulWidget {
  final ActivityItem activity;
  final bool isFirst;
  final bool isLast;
  final Duration animationDelay;

  const _ActivityTimelineCard({
    required this.activity,
    required this.isFirst,
    required this.isLast,
    required this.animationDelay,
  });

  @override
  State<_ActivityTimelineCard> createState() => _ActivityTimelineCardState();
}

class _ActivityTimelineCardState extends State<_ActivityTimelineCard> {
  bool _isPressed = false;

  IconData _getIcon(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return Iconsax.call;
      case ActivityType.email:
        return Iconsax.sms;
      case ActivityType.meeting:
        return Iconsax.calendar;
      case ActivityType.task:
        return Iconsax.task_square;
      case ActivityType.note:
        return Iconsax.note_1;
    }
  }

  Color _getAccentColor(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return LuxuryColors.jadePremium;
      case ActivityType.email:
        return const Color(0xFF3B82F6);
      case ActivityType.meeting:
        return LuxuryColors.champagneGold;
      case ActivityType.task:
        return const Color(0xFF8B5CF6);
      case ActivityType.note:
        return LuxuryColors.roseGold;
    }
  }

  String _getTypeLabel(ActivityType type) {
    switch (type) {
      case ActivityType.call:
        return 'Call';
      case ActivityType.email:
        return 'Email';
      case ActivityType.meeting:
        return 'Meeting';
      case ActivityType.task:
        return 'Task';
      case ActivityType.note:
        return 'Note';
    }
  }

  String _formatRelativeTime(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '${weeks}w ago';
    } else {
      final months = (difference.inDays / 30).floor();
      return '${months}mo ago';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = _getAccentColor(widget.activity.type);

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        HapticFeedback.lightImpact();
        widget.activity.onTap?.call();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Timeline column with gold accent line
            SizedBox(
              width: 40,
              child: Column(
                children: [
                  // Top connector line
                  if (!widget.isFirst)
                    Container(
                      width: 2,
                      height: 12,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            LuxuryColors.champagneGold.withValues(alpha: 0.3),
                            LuxuryColors.champagneGold.withValues(alpha: 0.5),
                          ],
                        ),
                      ),
                    ),
                  // Timeline dot
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          accentColor,
                          Color.lerp(accentColor, Colors.black, 0.2)!,
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: accentColor.withValues(alpha: 0.4),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
                  // Bottom connector line
                  if (!widget.isLast)
                    Expanded(
                      child: Container(
                        width: 2,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              LuxuryColors.champagneGold.withValues(alpha: 0.5),
                              LuxuryColors.champagneGold.withValues(alpha: 0.3),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Activity card
            Expanded(
              child: Container(
                margin: const EdgeInsets.only(left: 8, bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark
                      ? (_isPressed
                          ? LuxuryColors.obsidian.withValues(alpha: 0.8)
                          : LuxuryColors.obsidian)
                      : (_isPressed ? Colors.grey.shade50 : Colors.white),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _isPressed
                        ? accentColor.withValues(alpha: 0.4)
                        : (isDark
                            ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
                            : LuxuryColors.champagneGold.withValues(alpha: 0.2)),
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                    if (_isPressed)
                      BoxShadow(
                        color: accentColor.withValues(alpha: 0.2),
                        blurRadius: 16,
                        spreadRadius: -4,
                      ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header row with icon, type badge, and time
                    Row(
                      children: [
                        // Activity icon with gradient
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                accentColor,
                                Color.lerp(accentColor, Colors.black, 0.2)!,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: accentColor.withValues(alpha: 0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            _getIcon(widget.activity.type),
                            size: 18,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Type badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: accentColor.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            _getTypeLabel(widget.activity.type).toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.8,
                              color: accentColor,
                            ),
                          ),
                        ),
                        const Spacer(),
                        // Relative time
                        Text(
                          _formatRelativeTime(widget.activity.activityDate),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: LuxuryColors.champagneGold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Subject/Title
                    Text(
                      widget.activity.subject,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                        letterSpacing: -0.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Description (if available)
                    if (widget.activity.description != null &&
                        widget.activity.description!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        widget.activity.description!,
                        style: TextStyle(
                          fontSize: 13,
                          color: LuxuryColors.textMuted,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],

                    // Details row (duration, outcome, related)
                    if (widget.activity.duration != null ||
                        widget.activity.outcome != null ||
                        widget.activity.relatedTo != null) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 12,
                        runSpacing: 6,
                        children: [
                          if (widget.activity.duration != null)
                            _DetailChip(
                              icon: Iconsax.timer_1,
                              label: widget.activity.duration!,
                            ),
                          if (widget.activity.outcome != null)
                            _DetailChip(
                              icon: Iconsax.tick_circle,
                              label: widget.activity.outcome!,
                            ),
                          if (widget.activity.relatedTo != null)
                            _DetailChip(
                              icon: Iconsax.link,
                              label: widget.activity.relatedTo!,
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: widget.animationDelay).fadeIn(duration: 300.ms).slideX(
          begin: 0.05,
          curve: Curves.easeOutCubic,
        );
  }
}

/// Small detail chip for activity metadata
class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _DetailChip({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 12,
          color: isDark
              ? LuxuryColors.textMuted
              : LuxuryColors.textMuted.withValues(alpha: 0.8),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: isDark
                ? LuxuryColors.textMuted
                : LuxuryColors.textMuted.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }
}

/// Empty state for the activity timeline
class _EmptyActivityTimeline extends StatelessWidget {
  const _EmptyActivityTimeline();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Icon with gold glow
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    LuxuryColors.champagneGold.withValues(alpha: 0.05),
                  ],
                ),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Icon(
                Iconsax.activity,
                size: 36,
                color: LuxuryColors.champagneGold.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Activity Yet',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Calls, emails, meetings, and notes\nwill appear here',
              textAlign: TextAlign.center,
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).scale(
          begin: const Offset(0.95, 0.95),
          curve: Curves.easeOutCubic,
        );
  }
}

/// Load more button for the activity timeline
class ActivityTimelineLoadMore extends StatelessWidget {
  final bool isLoading;
  final VoidCallback? onTap;

  const ActivityTimelineLoadMore({
    super.key,
    this.isLoading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: isLoading ? null : () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isDark
              ? LuxuryColors.obsidian
              : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isLoading)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    LuxuryColors.champagneGold,
                  ),
                ),
              )
            else
              Icon(
                Iconsax.arrow_down_1,
                size: 18,
                color: LuxuryColors.champagneGold,
              ),
            const SizedBox(width: 8),
            Text(
              isLoading ? 'Loading...' : 'Load More',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: LuxuryColors.champagneGold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Filter bar for activity types with luxury styling
class _ActivityFilterBar extends StatelessWidget {
  final Set<ActivityType> activeFilters;
  final ValueChanged<ActivityType> onToggleFilter;
  final VoidCallback onClearFilters;
  final Map<ActivityType, int> activityCounts;

  const _ActivityFilterBar({
    required this.activeFilters,
    required this.onToggleFilter,
    required this.onClearFilters,
    required this.activityCounts,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasActiveFilters = activeFilters.isNotEmpty;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with title and clear button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Filter by Type',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark
                      ? LuxuryColors.textMuted
                      : LuxuryColors.textMuted.withValues(alpha: 0.8),
                  letterSpacing: 0.5,
                ),
              ),
              if (hasActiveFilters)
                GestureDetector(
                  onTap: onClearFilters,
                  child: Text(
                    'Clear All',
                    style: IrisTheme.labelSmall.copyWith(
                      color: LuxuryColors.champagneGold,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          // Filter chips horizontal scroll
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: ActivityType.values.map((type) {
                final isActive = activeFilters.contains(type);
                final count = activityCounts[type] ?? 0;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _ActivityFilterChip(
                    type: type,
                    isActive: isActive,
                    count: count,
                    onTap: () => onToggleFilter(type),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}

/// Individual filter chip with premium styling
class _ActivityFilterChip extends StatelessWidget {
  final ActivityType type;
  final bool isActive;
  final int count;
  final VoidCallback onTap;

  const _ActivityFilterChip({
    required this.type,
    required this.isActive,
    required this.count,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = type.color;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? color.withValues(alpha: 0.2)
              : (isDark
                  ? LuxuryColors.obsidian
                  : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive
                ? color
                : (isDark
                    ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                    : LuxuryColors.champagneGold.withValues(alpha: 0.3)),
            width: isActive ? 1.5 : 1,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 0.2),
                    blurRadius: 8,
                    spreadRadius: -2,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              type.icon,
              size: 14,
              color: isActive
                  ? color
                  : (isDark
                      ? LuxuryColors.textMuted
                      : LuxuryColors.textMuted.withValues(alpha: 0.8)),
            ),
            const SizedBox(width: 6),
            Text(
              type.displayName,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive
                    ? color
                    : (isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isActive
                      ? color.withValues(alpha: 0.3)
                      : (isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.08)),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: isActive
                        ? color
                        : (isDark
                            ? LuxuryColors.textMuted
                            : LuxuryColors.textMuted.withValues(alpha: 0.8)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Empty state when filters are active but no matching activities
class _EmptyFilteredTimeline extends StatelessWidget {
  final VoidCallback onClearFilters;

  const _EmptyFilteredTimeline({required this.onClearFilters});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Icon with muted appearance
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.black.withValues(alpha: 0.05),
              ),
              child: Icon(
                Iconsax.filter,
                size: 32,
                color: LuxuryColors.textMuted.withValues(alpha: 0.5),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'No Matching Activities',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Try adjusting your filters to see more activities',
              textAlign: TextAlign.center,
              style: IrisTheme.bodyMedium.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: onClearFilters,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                    width: 1,
                  ),
                ),
                child: Text(
                  'Clear Filters',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

/// Log Activity Bottom Sheet - For creating new activities
class LogActivityBottomSheet extends StatefulWidget {
  final String? contactId;
  final String? contactName;
  final Function(ActivityType type, Map<String, dynamic> data)? onSubmit;

  const LogActivityBottomSheet({
    super.key,
    this.contactId,
    this.contactName,
    this.onSubmit,
  });

  /// Show the dialog and return the result
  static Future<Map<String, dynamic>?> show({
    required BuildContext context,
    String? contactId,
    String? contactName,
    Function(ActivityType type, Map<String, dynamic> data)? onSubmit,
  }) {
    HapticFeedback.mediumImpact();
    return showGeneralDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: LogActivityBottomSheet(
                contactId: contactId,
                contactName: contactName,
                onSubmit: onSubmit,
              ),
            ),
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

  @override
  State<LogActivityBottomSheet> createState() => _LogActivityBottomSheetState();
}

class _LogActivityBottomSheetState extends State<LogActivityBottomSheet> {
  ActivityType _selectedType = ActivityType.call;
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _outcomeController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    _outcomeController.dispose();
    super.dispose();
  }

  void _selectDate() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.fromSeed(
              seedColor: LuxuryColors.rolexGreen,
              brightness: isDark ? Brightness.dark : Brightness.light,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  void _submit() async {
    if (_subjectController.text.trim().isEmpty) {
      return;
    }

    setState(() => _isSubmitting = true);

    final data = {
      'subject': _subjectController.text.trim(),
      'description': _descriptionController.text.trim(),
      'outcome': _outcomeController.text.trim(),
      'activityDate': _selectedDate.toIso8601String(),
      'contactId': widget.contactId,
    };

    await widget.onSubmit?.call(_selectedType, data);

    if (mounted) {
      Navigator.pop(context, data);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(bottom: bottomPadding, left: 20, right: 20),
      constraints: const BoxConstraints(maxWidth: 450),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 30,
            spreadRadius: 5,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Log Activity',
                      style: IrisTheme.titleLarge.copyWith(
                        color: isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight,
                      ),
                    ),
                    if (widget.contactName != null)
                      Text(
                        'for ${widget.contactName}',
                        style: IrisTheme.bodySmall.copyWith(
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(
                    Iconsax.close_circle,
                    color: LuxuryColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          // Activity type selector
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ActivityType.values.map((type) {
                  final isSelected = _selectedType == type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        setState(() => _selectedType = type);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? type.color.withValues(alpha: 0.2)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? type.color
                                : LuxuryColors.textMuted.withValues(alpha: 0.3),
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              type.icon,
                              size: 18,
                              color: isSelected
                                  ? type.color
                                  : LuxuryColors.textMuted,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              type.displayName.replaceAll('s', ''),
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: isSelected
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                                color: isSelected
                                    ? type.color
                                    : (isDark
                                        ? LuxuryColors.textOnDark
                                        : LuxuryColors.textOnLight),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Form fields
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                // Subject
                _LuxuryTextField(
                  controller: _subjectController,
                  label: 'Subject',
                  hint: 'Enter activity subject',
                  icon: Iconsax.text,
                ),
                const SizedBox(height: 12),
                // Description
                _LuxuryTextField(
                  controller: _descriptionController,
                  label: 'Description',
                  hint: 'Add notes or details',
                  icon: Iconsax.document_text,
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                // Outcome (for calls/meetings)
                if (_selectedType == ActivityType.call ||
                    _selectedType == ActivityType.meeting)
                  _LuxuryTextField(
                    controller: _outcomeController,
                    label: 'Outcome',
                    hint: 'How did it go?',
                    icon: Iconsax.tick_circle,
                  ),
                const SizedBox(height: 12),
                // Date picker
                GestureDetector(
                  onTap: _selectDate,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.black.withValues(alpha: 0.03),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Iconsax.calendar_1,
                          size: 20,
                          color: LuxuryColors.champagneGold,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Date',
                                style: IrisTheme.labelSmall.copyWith(
                                  color: LuxuryColors.textMuted,
                                ),
                              ),
                              Text(
                                _formatDate(_selectedDate),
                                style: IrisTheme.bodyMedium.copyWith(
                                  color: isDark
                                      ? LuxuryColors.textOnDark
                                      : LuxuryColors.textOnLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Iconsax.arrow_right_3,
                          size: 18,
                          color: LuxuryColors.textMuted,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Submit button
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: GestureDetector(
              onTap: _isSubmitting ? null : _submit,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _selectedType.color,
                      Color.lerp(_selectedType.color, Colors.black, 0.2)!,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: _selectedType.color.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          'Log ${_selectedType.displayName.replaceAll('s', '')}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dateOnly = DateTime(date.year, date.month, date.day);

    if (dateOnly == today) {
      return 'Today';
    } else if (dateOnly == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    }
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Luxury styled text field
class _LuxuryTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final int maxLines;

  const _LuxuryTextField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        style: IrisTheme.bodyMedium.copyWith(
          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
        ),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          hintStyle: IrisTheme.bodyMedium.copyWith(
            color: LuxuryColors.textMuted.withValues(alpha: 0.6),
          ),
          labelStyle: IrisTheme.labelMedium.copyWith(
            color: LuxuryColors.champagneGold,
          ),
          prefixIcon: Icon(
            icon,
            size: 20,
            color: LuxuryColors.champagneGold.withValues(alpha: 0.7),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
      ),
    );
  }
}
