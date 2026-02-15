import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/meetings_service.dart';
import '../widgets/meeting_card.dart';

class MeetingsPage extends ConsumerStatefulWidget {
  const MeetingsPage({super.key});

  @override
  ConsumerState<MeetingsPage> createState() => _MeetingsPageState();
}

class _MeetingsPageState extends ConsumerState<MeetingsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
    });
  }

  Future<void> _onRefresh() async {
    ref.invalidate(meetingsProvider);
  }

  List<MeetingModel> _filterMeetings(List<MeetingModel> meetings) {
    var filtered = meetings;

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((m) {
        return m.title.toLowerCase().contains(_searchQuery) ||
            m.participants.any((p) => p.name.toLowerCase().contains(_searchQuery) ||
                p.email.toLowerCase().contains(_searchQuery));
      }).toList();
    }

    // Apply tab filter
    switch (_tabController.index) {
      case 0: // Upcoming
        filtered = filtered.where((m) => m.isUpcoming).toList();
        filtered.sort((a, b) => a.startTime.compareTo(b.startTime));
        break;
      case 1: // Past
        filtered = filtered.where((m) => m.isPast).toList();
        filtered.sort((a, b) => b.startTime.compareTo(a.startTime));
        break;
      case 2: // All
        filtered.sort((a, b) => b.startTime.compareTo(a.startTime));
        break;
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final meetingsAsync = ref.watch(meetingsProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
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
                          'Meetings',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        meetingsAsync.when(
                          data: (meetings) {
                            final upcoming =
                                meetings.where((m) => m.isUpcoming).length;
                            return Text(
                              '$upcoming upcoming meetings',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            );
                          },
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (_, _) => Text(
                            'Error loading meetings',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Refresh button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      _onRefresh();
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? IrisTheme.darkSurfaceHigh
                            : IrisTheme.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.refresh,
                        size: 20,
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: IrisSearchField(
                controller: _searchController,
                hint: 'Search meetings...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Tab filters
            TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor:
                  isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
              unselectedLabelColor: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              indicatorColor:
                  isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
              indicatorWeight: 3,
              labelStyle:
                  IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
              onTap: (_) => setState(() {}),
              tabs: const [
                Tab(text: 'Upcoming'),
                Tab(text: 'Past'),
                Tab(text: 'All'),
              ],
            ).animate(delay: 150.ms).fadeIn(),

            const SizedBox(height: 8),

            // Content
            Expanded(
              child: meetingsAsync.when(
                data: (meetings) {
                  final filtered = _filterMeetings(meetings);
                  if (filtered.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.calendar_1,
                      title: 'No meetings found',
                      subtitle: _tabController.index == 0
                          ? 'No upcoming meetings scheduled'
                          : 'No meetings match your search',
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    backgroundColor:
                        isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final meeting = filtered[index];
                        return MeetingCard(
                          meeting: meeting,
                          onTap: () =>
                              context.push('/meetings/${meeting.id}'),
                        ).animate(delay: (index * 50).ms).fadeIn().slideX(
                              begin: 0.05,
                            );
                      },
                    ),
                  );
                },
                loading: () => const IrisListShimmer(
                  itemCount: 5,
                  itemHeight: 80,
                ),
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
                        'Failed to load meetings',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _onRefresh,
                        child: Text(
                          'Retry',
                          style: TextStyle(
                            color: isDark
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.rolexGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
