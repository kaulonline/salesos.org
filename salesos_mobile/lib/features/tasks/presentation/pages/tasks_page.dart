import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/filter_pill_tabs.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/iris_error_boundary.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../core/services/user_preferences_service.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../widgets/task_form.dart';

class TasksPage extends ConsumerStatefulWidget {
  const TasksPage({super.key});

  @override
  ConsumerState<TasksPage> createState() => _TasksPageState();
}

class _TasksPageState extends ConsumerState<TasksPage> {
  String _selectedFilter = 'All'; // All, Today, Upcoming, Completed

  Future<void> _onRefresh() async {
    ref.invalidate(crmTasksProvider);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tasksAsync = ref.watch(crmTasksProvider);
    final viewPrefs = ref.watch(viewPreferencesProvider);
    final isTableView = viewPrefs.tasksView == ListViewType.table;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: tasksAsync.when(
          loading: () => const IrisDashboardShimmer(),
          error: (e, _) => IrisErrorStateFactory.forAsyncError(e, _onRefresh),
          data: (tasks) => _buildContent(context, tasks, isTableView),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<Map<String, dynamic>> tasks, bool isTableView) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Categorize tasks
    final today = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(today);

    final todayTasks = <Map<String, dynamic>>[];
    final upcomingTasks = <Map<String, dynamic>>[];
    final completedTasks = <Map<String, dynamic>>[];

    for (final task in tasks) {
      final isCompleted = _isTaskCompleted(task);
      if (isCompleted) {
        completedTasks.add(task);
      } else {
        final dueDate = _getTaskDueDate(task);
        if (dueDate != null) {
          final dueDateStr = DateFormat('yyyy-MM-dd').format(dueDate);
          if (dueDateStr == todayStr || dueDate.isBefore(today)) {
            todayTasks.add(task);
          } else {
            upcomingTasks.add(task);
          }
        } else {
          // No due date - show in upcoming
          upcomingTasks.add(task);
        }
      }
    }

    final pendingCount = todayTasks.length + upcomingTasks.length;

    // Get filtered tasks based on selection
    List<Map<String, dynamic>> filteredTasks;
    switch (_selectedFilter) {
      case 'Today':
        filteredTasks = todayTasks;
        break;
      case 'Upcoming':
        filteredTasks = upcomingTasks;
        break;
      case 'Completed':
        filteredTasks = completedTasks;
        break;
      default:
        filteredTasks = tasks;
    }

    return RefreshIndicator(
      onRefresh: _onRefresh,
      color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
      child: Column(
        children: [
          // Offline Banner
          OfflineBanner(
            compact: true,
            onRetry: _onRefresh,
          ),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tasks',
                        style: IrisTheme.headlineMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      Text(
                        '$pendingCount pending',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    // View toggle button
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        ref.read(viewPreferencesProvider.notifier).toggleView('tasks');
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isTableView
                              ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                              : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isTableView ? Iconsax.element_3 : Iconsax.row_vertical,
                          size: 20,
                          color: isTableView
                              ? LuxuryColors.rolexGreen
                              : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Refresh button
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        _onRefresh();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Iconsax.refresh,
                          size: 20,
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Add button
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        TaskForm.show(
                          context: context,
                          mode: IrisFormMode.create,
                          onSuccess: () {
                            ref.invalidate(crmTasksProvider);
                          },
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Iconsax.add, size: 20, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms),

          // Filter Pills
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: FilterPillTabs<String>(
              items: [
                FilterPillItem(value: 'All', label: 'All', icon: Iconsax.task_square, count: tasks.length),
                FilterPillItem(value: 'Today', label: 'Today', icon: Iconsax.calendar_1, count: todayTasks.length),
                FilterPillItem(value: 'Upcoming', label: 'Upcoming', icon: Iconsax.calendar_tick, count: upcomingTasks.length),
                FilterPillItem(value: 'Completed', label: 'Done', icon: Iconsax.tick_circle, count: completedTasks.length),
              ],
              selectedValue: _selectedFilter,
              onSelected: (value) {
                HapticFeedback.lightImpact();
                setState(() => _selectedFilter = value);
              },
              padding: EdgeInsets.zero,
            ),
          ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

          const SizedBox(height: 16),

          // Task List
          Expanded(
            child: _TaskList(
              tasks: filteredTasks,
              isTableView: isTableView,
              onRefresh: _onRefresh,
            ),
          ),
        ],
      ),
    );
  }

  bool _isTaskCompleted(Map<String, dynamic> task) {
    final status = (task['Status'] as String?)?.toLowerCase() ??
        (task['status'] as String?)?.toLowerCase() ??
        '';
    return status == 'completed' || task['IsClosed'] == true;
  }

  DateTime? _getTaskDueDate(Map<String, dynamic> task) {
    final dateStr = task['ActivityDate'] as String? ??
        task['activityDate'] as String? ??
        task['dueDate'] as String? ??
        task['due'] as String?;
    if (dateStr == null) return null;
    return DateTime.tryParse(dateStr);
  }
}

class _TaskList extends StatelessWidget {
  final List<Map<String, dynamic>> tasks;
  final bool isTableView;
  final VoidCallback? onRefresh;

  const _TaskList({required this.tasks, required this.isTableView, this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isTablet = Responsive.shouldShowSplitView(context);

    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Iconsax.tick_circle,
              size: 48,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
            const SizedBox(height: 16),
            Text(
              'No tasks here',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ),
      );
    }

    // Table View
    if (isTableView) {
      return _TasksDataTable(
        tasks: tasks,
        isDark: isDark,
        isTablet: isTablet,
        onTaskTap: (task) {
          HapticFeedback.lightImpact();
          // Open task detail in edit mode
          TaskForm.show(
            context: context,
            initialData: task,
            mode: IrisFormMode.edit,
            onSuccess: onRefresh,
          );
        },
      );
    }

    // Use 2-column grid on tablets for better space utilization
    if (isTablet) {
      return LayoutBuilder(
        builder: (context, constraints) {
          // Determine grid columns based on available width
          final availableWidth = constraints.maxWidth;
          int crossAxisCount = 2;
          if (availableWidth > 1200) {
            crossAxisCount = 3;
          } else if (availableWidth < 700) {
            crossAxisCount = 1;
          }

          // Calculate card width and appropriate aspect ratio
          final cardWidth = (availableWidth - 48 - (16 * (crossAxisCount - 1))) / crossAxisCount;
          // Aspect ratio: width / height - task cards need ~120-140 height
          final aspectRatio = cardWidth / 130;

          return GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              mainAxisSpacing: 12,
              crossAxisSpacing: 16,
              childAspectRatio: aspectRatio.clamp(1.5, 3.5),
            ),
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              return _TaskCard(task: tasks[index])
                  .animate(delay: (200 + index * 30).ms)
                  .fadeIn()
                  .scale(begin: const Offset(0.95, 0.95));
            },
          );
        },
      );
    }

    // Phone layout - single column list
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        return _TaskCard(task: tasks[index])
            .animate(delay: (200 + index * 50).ms)
            .fadeIn()
            .slideX(begin: 0.05);
      },
    );
  }
}

class _TaskCard extends StatefulWidget {
  final Map<String, dynamic> task;

  const _TaskCard({required this.task});

  @override
  State<_TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<_TaskCard> {
  late bool _isCompleted;

  @override
  void initState() {
    super.initState();
    _isCompleted = _checkCompleted();
  }

  bool _checkCompleted() {
    final status = (widget.task['Status'] as String?)?.toLowerCase() ??
        (widget.task['status'] as String?)?.toLowerCase() ??
        '';
    return status == 'completed' || widget.task['IsClosed'] == true;
  }

  IconData _getTypeIcon(String? type) {
    final t = (type ?? '').toLowerCase();
    if (t.contains('call')) return Iconsax.call;
    if (t.contains('email') || t.contains('message')) return Iconsax.sms;
    if (t.contains('document')) return Iconsax.document_text;
    if (t.contains('meeting')) return Iconsax.calendar;
    return Iconsax.task_square;
  }

  String _formatDueDate(Map<String, dynamic> task) {
    final dateStr = task['ActivityDate'] as String? ??
        task['activityDate'] as String? ??
        task['dueDate'] as String? ??
        task['due'] as String?;

    if (dateStr == null) return 'No due date';

    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final taskDay = DateTime(date.year, date.month, date.day);

    if (taskDay == today) return 'Today';
    if (taskDay == tomorrow) return 'Tomorrow';
    if (taskDay.isBefore(today)) return 'Overdue';

    return DateFormat('MMM d').format(date);
  }

  Color _getCardBackgroundColor(String priority, bool isDark) {
    final p = priority.toLowerCase();
    if (p == 'high') return IrisTheme.cardBlue; // Blue for high priority
    if (p == 'medium' || p == 'normal') return IrisTheme.cardTeal; // Teal for medium
    return isDark ? IrisTheme.darkSurface : Colors.white; // Default for low
  }

  Color _getCardTextColor(String priority, bool isDark) {
    final p = priority.toLowerCase();
    if (p == 'high') return Colors.white;
    if (p == 'medium' || p == 'normal') return IrisTheme.darkBackground; // Teal background always needs dark text
    return isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary;
  }

  Color _getCardSecondaryTextColor(String priority, bool isDark) {
    final p = priority.toLowerCase();
    if (p == 'high') return Colors.white.withValues(alpha: 0.7);
    if (p == 'medium' || p == 'normal') return IrisTheme.darkBackground.withValues(alpha: 0.6);
    return isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Extract task details with fallbacks for both Local and Salesforce formats
    final title = widget.task['Subject'] as String? ??
        widget.task['subject'] as String? ??
        widget.task['title'] as String? ??
        'Untitled Task';
    final priority = widget.task['Priority'] as String? ??
        widget.task['priority'] as String? ??
        'normal';
    final description = widget.task['Description'] as String? ??
        widget.task['description'] as String?;
    final dueDisplay = _formatDueDate(widget.task);
    final isOverdue = dueDisplay == 'Overdue';

    final bgColor = _getCardBackgroundColor(priority, isDark);
    final textColor = _getCardTextColor(priority, isDark);
    final secondaryColor = _getCardSecondaryTextColor(priority, isDark);
    final isColoredCard = priority.toLowerCase() == 'high' ||
                          priority.toLowerCase() == 'medium' ||
                          priority.toLowerCase() == 'normal';

    return GestureDetector(
      onTap: () => HapticFeedback.lightImpact(),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: bgColor.withValues(alpha: isColoredCard ? 0.3 : (isDark ? 0.3 : 0.06)),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Checkbox
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() => _isCompleted = !_isCompleted);
              },
              child: Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: _isCompleted
                      ? (isColoredCard ? textColor.withValues(alpha: 0.2) : IrisTheme.success)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _isCompleted
                        ? (isColoredCard ? textColor : IrisTheme.success)
                        : textColor.withValues(alpha: 0.4),
                    width: 2,
                  ),
                ),
                child: _isCompleted
                    ? Icon(Icons.check, size: 16, color: textColor)
                    : null,
              ),
            ),
            const SizedBox(width: 14),
            // Type Icon
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: textColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                _getTypeIcon(widget.task['type'] as String?),
                size: 18,
                color: textColor,
              ),
            ),
            const SizedBox(width: 14),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: IrisTheme.titleSmall.copyWith(
                      color: textColor,
                      fontWeight: FontWeight.w600,
                      decoration: _isCompleted ? TextDecoration.lineThrough : null,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (description != null && description.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: IrisTheme.bodySmall.copyWith(
                        color: secondaryColor,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.calendar,
                        size: 12,
                        color: isOverdue
                            ? (isColoredCard ? IrisTheme.cardYellow : IrisTheme.error)
                            : secondaryColor,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          dueDisplay,
                          style: IrisTheme.labelSmall.copyWith(
                            color: isOverdue
                                ? (isColoredCard ? IrisTheme.cardYellow : IrisTheme.error)
                                : secondaryColor,
                            fontWeight: isOverdue ? FontWeight.w600 : FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (priority.toLowerCase() == 'high') ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'HIGH',
                            style: IrisTheme.labelSmall.copyWith(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Compact DataTable for Tasks
class _TasksDataTable extends StatelessWidget {
  final List<Map<String, dynamic>> tasks;
  final bool isDark;
  final bool isTablet;
  final Function(Map<String, dynamic>) onTaskTap;

  const _TasksDataTable({
    required this.tasks,
    required this.isDark,
    required this.isTablet,
    required this.onTaskTap,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      physics: const AlwaysScrollableScrollPhysics(),
      child: LuxuryCard(
        variant: LuxuryCardVariant.standard,
        tier: LuxuryTier.gold,
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            // Table Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? LuxuryColors.obsidian.withValues(alpha: 0.5)
                    : Colors.grey.shade50,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 36), // Checkbox space
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: Text(
                      'Task',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (isTablet) ...[
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Due Date',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  SizedBox(
                    width: 80,
                    child: Text(
                      'Priority',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 32), // Arrow space
                ],
              ),
            ),
            // Table Rows
            ...tasks.asMap().entries.map((entry) {
              final index = entry.key;
              final task = entry.value;
              return _TaskTableRow(
                task: task,
                isDark: isDark,
                isTablet: isTablet,
                onTap: () => onTaskTap(task),
                isLast: index == tasks.length - 1,
              ).animate(delay: (100 + index * 30).ms).fadeIn();
            }),
          ],
        ),
      ),
    );
  }
}

/// Individual row in the Tasks DataTable
class _TaskTableRow extends StatefulWidget {
  final Map<String, dynamic> task;
  final bool isDark;
  final bool isTablet;
  final VoidCallback onTap;
  final bool isLast;

  const _TaskTableRow({
    required this.task,
    required this.isDark,
    required this.isTablet,
    required this.onTap,
    this.isLast = false,
  });

  @override
  State<_TaskTableRow> createState() => _TaskTableRowState();
}

class _TaskTableRowState extends State<_TaskTableRow> {
  late bool _isCompleted;

  @override
  void initState() {
    super.initState();
    _isCompleted = _checkCompleted();
  }

  bool _checkCompleted() {
    final status = (widget.task['Status'] as String?)?.toLowerCase() ??
        (widget.task['status'] as String?)?.toLowerCase() ??
        '';
    return status == 'completed' || widget.task['IsClosed'] == true;
  }

  String _formatDueDate(Map<String, dynamic> task) {
    final dateStr = task['ActivityDate'] as String? ??
        task['activityDate'] as String? ??
        task['dueDate'] as String? ??
        task['due'] as String?;

    if (dateStr == null) return 'No date';

    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final taskDay = DateTime(date.year, date.month, date.day);

    if (taskDay == today) return 'Today';
    if (taskDay == tomorrow) return 'Tomorrow';
    if (taskDay.isBefore(today)) return 'Overdue';

    return DateFormat('MMM d').format(date);
  }

  Color _getPriorityColor(String priority) {
    final p = priority.toLowerCase();
    if (p == 'high') return IrisTheme.error;
    if (p == 'medium' || p == 'normal') return IrisTheme.warning;
    return IrisTheme.success;
  }

  IconData _getTypeIcon(String? type) {
    final t = (type ?? '').toLowerCase();
    if (t.contains('call')) return Iconsax.call;
    if (t.contains('email') || t.contains('message')) return Iconsax.sms;
    if (t.contains('document')) return Iconsax.document_text;
    if (t.contains('meeting')) return Iconsax.calendar;
    return Iconsax.task_square;
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.task['Subject'] as String? ??
        widget.task['subject'] as String? ??
        widget.task['title'] as String? ??
        'Untitled Task';
    final priority = widget.task['Priority'] as String? ??
        widget.task['priority'] as String? ??
        'normal';
    final dueDisplay = _formatDueDate(widget.task);
    final isOverdue = dueDisplay == 'Overdue';
    final priorityColor = _getPriorityColor(priority);
    final type = widget.task['type'] as String?;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: widget.isDark ? LuxuryColors.richBlack : Colors.white,
          border: widget.isLast
              ? null
              : Border(
                  bottom: BorderSide(
                    color: widget.isDark
                        ? Colors.white.withValues(alpha: 0.06)
                        : Colors.grey.shade200,
                  ),
                ),
        ),
        child: Row(
          children: [
            // Checkbox
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() => _isCompleted = !_isCompleted);
              },
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: _isCompleted
                      ? LuxuryColors.jadePremium.withValues(alpha: 0.2)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: _isCompleted
                        ? LuxuryColors.jadePremium
                        : (widget.isDark ? Colors.white.withValues(alpha: 0.3) : Colors.grey.shade400),
                    width: 2,
                  ),
                ),
                child: _isCompleted
                    ? Icon(
                        Icons.check,
                        size: 14,
                        color: LuxuryColors.jadePremium,
                      )
                    : null,
              ),
            ),
            const SizedBox(width: 12),
            // Task Icon + Name
            Expanded(
              flex: 3,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: widget.isDark
                          ? LuxuryColors.obsidian
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getTypeIcon(type),
                      size: 14,
                      color: widget.isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: IrisTheme.bodySmall.copyWith(
                            color: widget.isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                            fontWeight: FontWeight.w500,
                            decoration: _isCompleted ? TextDecoration.lineThrough : null,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (!widget.isTablet) ...[
                          const SizedBox(height: 2),
                          Text(
                            dueDisplay,
                            style: IrisTheme.labelSmall.copyWith(
                              color: isOverdue
                                  ? IrisTheme.error
                                  : (widget.isDark
                                      ? IrisTheme.darkTextTertiary
                                      : IrisTheme.lightTextTertiary),
                              fontWeight: isOverdue ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // Due Date (tablet only)
            if (widget.isTablet) ...[
              Expanded(
                flex: 2,
                child: Row(
                  children: [
                    Icon(
                      Iconsax.calendar,
                      size: 12,
                      color: isOverdue
                          ? IrisTheme.error
                          : (widget.isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      dueDisplay,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isOverdue
                            ? IrisTheme.error
                            : (widget.isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary),
                        fontWeight: isOverdue ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            // Priority Badge
            SizedBox(
              width: 80,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: priorityColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    priority.toUpperCase(),
                    style: IrisTheme.labelSmall.copyWith(
                      color: priorityColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 9,
                    ),
                  ),
                ),
              ),
            ),
            // Arrow
            Icon(
              Iconsax.arrow_right_3,
              size: 16,
              color: widget.isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ],
        ),
      ),
    );
  }
}
