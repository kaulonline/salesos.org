import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/call_history_service.dart';

/// Premium call history page displaying voice conversation history
/// Follows the luxury design system with SalesOS Gold branding
class CallHistoryPage extends ConsumerStatefulWidget {
  const CallHistoryPage({super.key});

  @override
  ConsumerState<CallHistoryPage> createState() => _CallHistoryPageState();

  static Future<void> show(BuildContext context) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const CallHistoryPage(),
      ),
    );
  }
}

class _CallHistoryPageState extends ConsumerState<CallHistoryPage> {
  // Search and filter state
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  DateTime? _filterStartDate;
  DateTime? _filterEndDate;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Filter sessions based on search query and date range
  List<VoiceCallSession> _filterSessions(List<VoiceCallSession> sessions) {
    var filtered = sessions;

    // Apply date range filter
    if (_filterStartDate != null) {
      filtered = filtered.where((s) {
        return s.startedAt.isAfter(_filterStartDate!) ||
            s.startedAt.isAtSameMomentAs(_filterStartDate!);
      }).toList();
    }

    if (_filterEndDate != null) {
      // Add a day to include the end date fully
      final endOfDay = DateTime(
        _filterEndDate!.year,
        _filterEndDate!.month,
        _filterEndDate!.day,
        23,
        59,
        59,
      );
      filtered = filtered.where((s) {
        return s.startedAt.isBefore(endOfDay) ||
            s.startedAt.isAtSameMomentAs(endOfDay);
      }).toList();
    }

    // Apply search query filter
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((s) {
        // Search in summary
        if (s.displaySummary.toLowerCase().contains(query)) return true;

        // Search in transcripts
        for (final turn in s.turns) {
          if (turn.transcript?.toLowerCase().contains(query) ?? false) {
            return true;
          }
        }

        // Search in tool names
        for (final tool in s.toolsUsed) {
          if (tool.name.toLowerCase().contains(query)) return true;
        }

        return false;
      }).toList();
    }

    return filtered;
  }

  void _clearFilters() {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _filterStartDate = null;
      _filterEndDate = null;
    });
  }

  bool get _hasActiveFilters =>
      _searchQuery.isNotEmpty ||
      _filterStartDate != null ||
      _filterEndDate != null;

  @override
  Widget build(BuildContext context) {
    final callHistoryState = ref.watch(callHistoryProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filteredSessions = _filterSessions(callHistoryState.sessions);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.cream,
      appBar: _buildAppBar(context, isDark),
      body: Column(
        children: [
          // Search and filter section
          _buildSearchAndFilterSection(isDark),

          // Main content
          Expanded(
            child: callHistoryState.isLoading
                ? _buildLoadingState(isDark)
                : callHistoryState.error != null
                    ? _buildErrorState(callHistoryState.error!, isDark)
                    : callHistoryState.sessions.isEmpty
                        ? _buildEmptyState(isDark)
                        : filteredSessions.isEmpty
                            ? _buildNoResultsState(isDark)
                            : _buildCallList(filteredSessions, isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilterSection(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.05),
          ),
        ),
      ),
      child: Column(
        children: [
          // Search bar
          Container(
            height: 44,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.black.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
              ),
            ),
            child: TextField(
              controller: _searchController,
              style: TextStyle(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontSize: 15,
              ),
              decoration: InputDecoration(
                hintText: 'Search in transcripts...',
                hintStyle: TextStyle(
                  color: LuxuryColors.textMuted,
                  fontSize: 15,
                ),
                prefixIcon: Icon(
                  Iconsax.search_normal,
                  size: 18,
                  color: LuxuryColors.rolexGreen,
                ),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: Icon(
                          Icons.clear,
                          size: 18,
                          color: LuxuryColors.textMuted,
                        ),
                        onPressed: () {
                          setState(() {
                            _searchController.clear();
                            _searchQuery = '';
                          });
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
            ),
          ),
          const SizedBox(height: 12),
          // Filter row
          Row(
            children: [
              // Date range filter button
              _buildFilterChip(
                icon: Iconsax.calendar_1,
                label: _filterStartDate != null || _filterEndDate != null
                    ? _getDateRangeLabel()
                    : 'Date Range',
                isActive: _filterStartDate != null || _filterEndDate != null,
                onTap: () => _showDateRangePicker(isDark),
                isDark: isDark,
              ),
              const Spacer(),
              // Clear filters button
              if (_hasActiveFilters)
                TextButton.icon(
                  onPressed: _clearFilters,
                  icon: Icon(
                    Icons.clear_all,
                    size: 16,
                    color: LuxuryColors.errorRuby,
                  ),
                  label: Text(
                    'Clear',
                    style: TextStyle(
                      color: LuxuryColors.errorRuby,
                      fontSize: 13,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
              : (isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.black.withValues(alpha: 0.03)),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive
                ? LuxuryColors.rolexGreen.withValues(alpha: 0.5)
                : LuxuryColors.rolexGreen.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isActive
                  ? LuxuryColors.rolexGreen
                  : LuxuryColors.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive
                    ? LuxuryColors.rolexGreen
                    : (isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight),
              ),
            ),
            if (isActive) ...[
              const SizedBox(width: 4),
              Icon(
                Icons.check,
                size: 12,
                color: LuxuryColors.rolexGreen,
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getDateRangeLabel() {
    final dateFormat = DateFormat('MMM d');
    if (_filterStartDate != null && _filterEndDate != null) {
      return '${dateFormat.format(_filterStartDate!)} - ${dateFormat.format(_filterEndDate!)}';
    } else if (_filterStartDate != null) {
      return 'From ${dateFormat.format(_filterStartDate!)}';
    } else if (_filterEndDate != null) {
      return 'Until ${dateFormat.format(_filterEndDate!)}';
    }
    return 'Date Range';
  }

  Future<void> _showDateRangePicker(bool isDark) async {
    final now = DateTime.now();
    final firstDate = now.subtract(const Duration(days: 365));

    final result = await showDateRangePicker(
      context: context,
      firstDate: firstDate,
      lastDate: now,
      initialDateRange: _filterStartDate != null && _filterEndDate != null
          ? DateTimeRange(start: _filterStartDate!, end: _filterEndDate!)
          : null,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: isDark
                ? ColorScheme.dark(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: LuxuryColors.obsidian,
                    onSurface: LuxuryColors.textOnDark,
                  )
                : ColorScheme.light(
                    primary: LuxuryColors.rolexGreen,
                    onPrimary: Colors.white,
                    surface: Colors.white,
                    onSurface: LuxuryColors.textOnLight,
                  ),
          ),
          child: child!,
        );
      },
    );

    if (result != null) {
      setState(() {
        _filterStartDate = result.start;
        _filterEndDate = result.end;
      });
    }
  }

  Widget _buildNoResultsState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: LuxuryColors.textMuted.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Iconsax.search_status,
                size: 48,
                color: LuxuryColors.textMuted,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'No Results Found',
              style: TextStyle(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty
                  ? 'No calls match "$_searchQuery"'
                  : 'No calls in the selected date range',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: LuxuryColors.textMuted,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 20),
            TextButton.icon(
              onPressed: _clearFilters,
              icon: Icon(
                Icons.clear_all,
                size: 18,
                color: LuxuryColors.rolexGreen,
              ),
              label: Text(
                'Clear Filters',
                style: TextStyle(
                  color: LuxuryColors.rolexGreen,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, bool isDark) {
    return AppBar(
      backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back_ios_new,
          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          size: 20,
        ),
        onPressed: () => Navigator.of(context).pop(),
      ),
      title: Text(
        'Call History',
        style: TextStyle(
          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
      actions: [
        PopupMenuButton<String>(
          icon: Icon(
            Iconsax.more,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          onSelected: (value) {
            if (value == 'clear') {
              _showClearConfirmation(context, isDark);
            } else if (value == 'stats') {
              _showStatistics(context, isDark);
            }
          },
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'stats',
              child: Row(
                children: [
                  Icon(
                    Iconsax.chart_2,
                    size: 18,
                    color: LuxuryColors.rolexGreen,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Statistics',
                    style: TextStyle(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'clear',
              child: Row(
                children: [
                  Icon(
                    Iconsax.trash,
                    size: 18,
                    color: LuxuryColors.errorRuby,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Clear All',
                    style: TextStyle(
                      color: LuxuryColors.errorRuby,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 40,
            height: 40,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(LuxuryColors.rolexGreen),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Loading call history...',
            style: TextStyle(
              color: LuxuryColors.textMuted,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error, bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Iconsax.warning_2,
                size: 48,
                color: LuxuryColors.errorRuby,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Error Loading History',
              style: TextStyle(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: LuxuryColors.textMuted,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref.read(callHistoryProvider.notifier).refresh();
              },
              icon: const Icon(Iconsax.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: LuxuryColors.rolexGreen,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Iconsax.microphone,
                size: 64,
                color: LuxuryColors.rolexGreen,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Call History',
              style: TextStyle(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your voice conversations with SalesOS will appear here',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: LuxuryColors.textMuted,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildCallList(List<VoiceCallSession> sessions, bool isDark) {
    // Group sessions by date
    final groupedSessions = _groupSessionsByDate(sessions);

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(callHistoryProvider.notifier).refresh();
      },
      color: LuxuryColors.rolexGreen,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: groupedSessions.length,
        itemBuilder: (context, index) {
          final group = groupedSessions[index];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Date header
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  group.dateLabel,
                  style: TextStyle(
                    color: LuxuryColors.rolexGreen,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.0,
                  ),
                ),
              ),
              // Sessions for this date
              ...group.sessions.asMap().entries.map((entry) {
                final sessionIndex = entry.key;
                final session = entry.value;
                return _buildCallCard(session, isDark, sessionIndex)
                    .animate()
                    .fadeIn(duration: 300.ms, delay: (50 * sessionIndex).ms)
                    .slideX(begin: 0.05, end: 0);
              }),
            ],
          );
        },
      ),
    );
  }

  List<_DateGroup> _groupSessionsByDate(List<VoiceCallSession> sessions) {
    final groups = <String, List<VoiceCallSession>>{};
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    for (final session in sessions) {
      final sessionDate = DateTime(
        session.startedAt.year,
        session.startedAt.month,
        session.startedAt.day,
      );

      String dateKey;
      if (sessionDate == today) {
        dateKey = 'TODAY';
      } else if (sessionDate == yesterday) {
        dateKey = 'YESTERDAY';
      } else if (sessionDate.isAfter(today.subtract(const Duration(days: 7)))) {
        dateKey = DateFormat('EEEE').format(session.startedAt).toUpperCase();
      } else {
        dateKey = DateFormat('MMMM d, y').format(session.startedAt).toUpperCase();
      }

      groups.putIfAbsent(dateKey, () => []);
      groups[dateKey]!.add(session);
    }

    return groups.entries
        .map((e) => _DateGroup(dateLabel: e.key, sessions: e.value))
        .toList();
  }

  Widget _buildCallCard(VoiceCallSession session, bool isDark, int index) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LuxuryCard(
        variant: LuxuryCardVariant.standard,
        tier: LuxuryTier.gold,
        padding: const EdgeInsets.all(16),
        onTap: () => _showCallDetail(context, session, isDark),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                // Voice icon
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Iconsax.microphone,
                    size: 20,
                    color: LuxuryColors.rolexGreen,
                  ),
                ),
                const SizedBox(width: 12),
                // Time and duration
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormat('h:mm a').format(session.startedAt),
                        style: TextStyle(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Iconsax.timer_1,
                            size: 12,
                            color: LuxuryColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            session.formattedDuration,
                            style: TextStyle(
                              color: LuxuryColors.textMuted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Icon(
                            Iconsax.message,
                            size: 12,
                            color: LuxuryColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${session.totalTurns} turns',
                            style: TextStyle(
                              color: LuxuryColors.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Delete button
                IconButton(
                  icon: Icon(
                    Iconsax.trash,
                    size: 18,
                    color: LuxuryColors.errorRuby.withValues(alpha: 0.7),
                  ),
                  onPressed: () => _deleteSession(session, isDark),
                  splashRadius: 20,
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Summary
            Text(
              session.displaySummary,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: isDark
                    ? LuxuryColors.textOnDark.withValues(alpha: 0.8)
                    : LuxuryColors.textOnLight.withValues(alpha: 0.8),
                fontSize: 14,
                height: 1.4,
              ),
            ),
            // Tools used
            if (session.toolsUsed.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: session.uniqueToolNames.take(3).map((toolName) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Text(
                      _formatToolName(toolName),
                      style: TextStyle(
                        color: LuxuryColors.champagneGold,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatToolName(String name) {
    // Convert snake_case to Title Case
    return name
        .split('_')
        .map((word) => word.isNotEmpty
            ? '${word[0].toUpperCase()}${word.substring(1)}'
            : '')
        .join(' ');
  }

  void _showCallDetail(
    BuildContext context,
    VoiceCallSession session,
    bool isDark,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _CallDetailPage(session: session),
      ),
    );
  }

  void _deleteSession(VoiceCallSession session, bool isDark) {
    HapticFeedback.lightImpact();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Delete Call',
          style: TextStyle(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
        ),
        content: Text(
          'Are you sure you want to delete this call from history?',
          style: TextStyle(
            color: LuxuryColors.textMuted,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: TextStyle(color: LuxuryColors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(callHistoryProvider.notifier).deleteCallSession(session.id);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Call deleted'),
                  backgroundColor: LuxuryColors.obsidian,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              );
            },
            child: Text(
              'Delete',
              style: TextStyle(color: LuxuryColors.errorRuby),
            ),
          ),
        ],
      ),
    );
  }

  void _showClearConfirmation(BuildContext context, bool isDark) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Clear All History',
          style: TextStyle(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
        ),
        content: Text(
          'This will permanently delete all call history. This action cannot be undone.',
          style: TextStyle(
            color: LuxuryColors.textMuted,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: TextStyle(color: LuxuryColors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(callHistoryProvider.notifier).clearAllHistory();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Call history cleared'),
                  backgroundColor: LuxuryColors.obsidian,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              );
            },
            child: Text(
              'Clear All',
              style: TextStyle(color: LuxuryColors.errorRuby),
            ),
          ),
        ],
      ),
    );
  }

  void _showStatistics(BuildContext context, bool isDark) {
    final stats = ref.read(callHistoryProvider.notifier).getCallStatistics();

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Iconsax.chart_2,
                  color: LuxuryColors.rolexGreen,
                ),
                const SizedBox(width: 12),
                Text(
                  'Call Statistics',
                  style: TextStyle(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Stats grid
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    'Total Calls',
                    '${stats['totalCalls']}',
                    Iconsax.call,
                    isDark,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatItem(
                    'Today',
                    '${stats['callsToday']}',
                    Iconsax.calendar_1,
                    isDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    'Total Time',
                    stats['totalDurationFormatted'] ?? '0s',
                    Iconsax.timer_1,
                    isDark,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatItem(
                    'Tools Used',
                    '${stats['totalToolsUsed']}',
                    Iconsax.cpu,
                    isDark,
                  ),
                ),
              ],
            ),
            if ((stats['mostUsedTools'] as List).isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'TOP TOOLS',
                style: TextStyle(
                  color: LuxuryColors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              ...(stats['mostUsedTools'] as List).take(3).map((tool) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: LuxuryColors.champagneGold,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _formatToolName(tool['name'] as String),
                          style: TextStyle(
                            color: isDark
                                ? LuxuryColors.textOnDark
                                : LuxuryColors.textOnLight,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Text(
                        '${tool['count']}x',
                        style: TextStyle(
                          color: LuxuryColors.rolexGreen,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 20,
            color: LuxuryColors.rolexGreen,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
              fontSize: 24,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              color: LuxuryColors.textMuted,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

/// Helper class for grouping sessions by date
class _DateGroup {
  final String dateLabel;
  final List<VoiceCallSession> sessions;

  _DateGroup({required this.dateLabel, required this.sessions});
}

/// Detailed view of a single call session
class _CallDetailPage extends ConsumerWidget {
  final VoiceCallSession session;

  const _CallDetailPage({required this.session});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.cream,
      appBar: AppBar(
        backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            size: 20,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Call Details',
          style: TextStyle(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Call info card
            LuxuryCard(
              variant: LuxuryCardVariant.accent,
              tier: LuxuryTier.gold,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Iconsax.microphone,
                          size: 24,
                          color: LuxuryColors.rolexGreen,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              DateFormat('EEEE, MMMM d')
                                  .format(session.startedAt),
                              style: TextStyle(
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              DateFormat('h:mm a').format(session.startedAt),
                              style: TextStyle(
                                color: LuxuryColors.textMuted,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      _buildInfoChip(
                        Iconsax.timer_1,
                        session.formattedDuration,
                        isDark,
                      ),
                      const SizedBox(width: 12),
                      _buildInfoChip(
                        Iconsax.message,
                        '${session.totalTurns} turns',
                        isDark,
                      ),
                      const SizedBox(width: 12),
                      _buildInfoChip(
                        Iconsax.cpu,
                        '${session.toolsUsed.length} tools',
                        isDark,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            // Tools section
            if (session.toolsUsed.isNotEmpty) ...[
              Text(
                'TOOLS USED',
                style: TextStyle(
                  color: LuxuryColors.rolexGreen,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              LuxuryCard(
                variant: LuxuryCardVariant.standard,
                tier: LuxuryTier.gold,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: session.uniqueToolNames.map((toolName) {
                    final count =
                        session.toolsUsed.where((t) => t.name == toolName).length;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color:
                                  LuxuryColors.champagneGold.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Iconsax.cpu_setting,
                              size: 16,
                              color: LuxuryColors.champagneGold,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _formatToolName(toolName),
                              style: TextStyle(
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color:
                                  LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${count}x',
                              style: TextStyle(
                                color: LuxuryColors.rolexGreen,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 24),
            ],
            // Transcript section
            Text(
              'TRANSCRIPT',
              style: TextStyle(
                color: LuxuryColors.rolexGreen,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: 12),
            if (session.turns.isEmpty)
              LuxuryCard(
                variant: LuxuryCardVariant.standard,
                tier: LuxuryTier.gold,
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: Text(
                    'No transcript available',
                    style: TextStyle(
                      color: LuxuryColors.textMuted,
                      fontSize: 14,
                    ),
                  ),
                ),
              )
            else
              ...session.turns.map((turn) {
                final isUser = turn.role == 'user';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isUser
                              ? LuxuryColors.platinum.withValues(alpha: 0.1)
                              : LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          isUser ? Iconsax.user : Iconsax.magic_star,
                          size: 16,
                          color: isUser
                              ? LuxuryColors.platinum
                              : LuxuryColors.rolexGreen,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  isUser ? 'You' : 'SalesOS AI',
                                  style: TextStyle(
                                    color: isUser
                                        ? LuxuryColors.platinum
                                        : LuxuryColors.rolexGreen,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  DateFormat('h:mm a').format(turn.timestamp),
                                  style: TextStyle(
                                    color: LuxuryColors.textMuted,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              turn.transcript ?? '...',
                              style: TextStyle(
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                        .withValues(alpha: 0.9)
                                    : LuxuryColors.textOnLight
                                        .withValues(alpha: 0.9),
                                fontSize: 14,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: LuxuryColors.textMuted,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  String _formatToolName(String name) {
    return name
        .split('_')
        .map((word) => word.isNotEmpty
            ? '${word[0].toUpperCase()}${word.substring(1)}'
            : '')
        .join(' ');
  }
}
