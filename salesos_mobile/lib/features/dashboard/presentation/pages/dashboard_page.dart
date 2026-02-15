import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../auth/presentation/bloc/auth_provider.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/crm_mode_toggle.dart';
import '../../../../shared/widgets/alerts_panel.dart';
import '../../../../core/services/alerts_service.dart';
import '../../data/ai_insights_service.dart';
import '../../../activity/presentation/pages/activity_page.dart';
import '../../../activity/presentation/pages/activity_detail_page.dart';
import '../../../../shared/widgets/iris_intelligence_card.dart';
import '../../../../shared/widgets/morning_brief_card.dart';
import '../../../../core/services/morning_brief_service.dart';
import '../../../../core/services/iris_rank_service.dart';
import '../../../../shared/widgets/premium_stat_card.dart';
import '../../../../shared/widgets/collapsible_section.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/sales_performance_chart.dart';
import '../../../../core/services/dashboard_config_service.dart';
import '../../../../core/models/dashboard_config.dart';
import '../../../../shared/widgets/removable_dashboard_card.dart';
import '../../../../shared/widgets/premium_dashboard_header.dart';
import '../../../../shared/widgets/luxury_activity_card.dart';
import '../../../../shared/widgets/premium_insight_carousel.dart';
import '../../../../shared/widgets/offline_banner.dart';

/// Dashboard loading state provider
final dashboardLoadingProvider = NotifierProvider<DashboardLoadingNotifier, bool>(DashboardLoadingNotifier.new);

class DashboardLoadingNotifier extends Notifier<bool> {
  @override
  bool build() => true;

  void setLoading(bool value) => state = value;
}

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  @override
  void initState() {
    super.initState();
  }

  Future<void> _onRefresh() async {
    // Invalidate all dashboard providers to refresh data
    ref.invalidate(crmPipelineStatsProvider);
    ref.invalidate(crmDashboardMetricsProvider);
    ref.invalidate(crmSalesTrendProvider);
    ref.invalidate(morningBriefProvider);
    ref.invalidate(crmActivitiesProvider);
    ref.invalidate(aiInsightsProvider);
    ref.invalidate(alertsProvider);
    ref.invalidate(hotLeadsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Watch dashboard configuration for customization
    final dashboardConfig = ref.watch(dashboardConfigProvider);

    // Watch all dashboard providers (CRM-aware)
    final pipelineAsync = ref.watch(crmPipelineStatsProvider);
    final metricsAsync = ref.watch(crmDashboardMetricsProvider);
    final salesTrendAsync = ref.watch(crmSalesTrendProvider);
    final activitiesAsync = ref.watch(crmActivitiesProvider);
    final insightsAsync = ref.watch(aiInsightsProvider);
    final alertsCount = ref.watch(unreadAlertsCountProvider);
    final hotLeadsAsync = ref.watch(hotLeadsProvider);

    // Determine loading states for each section
    final isPipelineLoading = pipelineAsync.isLoading && !pipelineAsync.hasValue;
    final isMetricsLoading = metricsAsync.isLoading && !metricsAsync.hasValue;
    // Note: isActivitiesLoading can be used for activity section shimmer if needed

    // Show full shimmer only on initial load (no data at all)
    final isInitialLoad = isPipelineLoading && isMetricsLoading;
    if (isInitialLoad) {
      return Scaffold(
        backgroundColor: isDark ? LuxuryColors.richBlack : IrisTheme.lightBackground,
        body: const SafeArea(child: IrisDashboardShimmer()),
      );
    }

    // Get the data with fallbacks
    final pipelineData = pipelineAsync.value ?? {};
    final metricsData = metricsAsync.value ?? {};
    final salesTrendData = salesTrendAsync.value ?? [];
    final activities = activitiesAsync.value ?? [];
    final insights = insightsAsync.value ?? [];

    // Extract values from CRM data (only when data is available)
    final pipelineValue = pipelineAsync.hasValue
        ? (pipelineData['totalPipelineValue'] as num?)?.toDouble() ?? 0
        : null;
    final totalDeals = pipelineAsync.hasValue
        ? (pipelineData['openOpportunities'] as num?)?.toInt() ?? 0
        : null;
    // Use actual hot leads from IRIS Rank service (momentum-based scoring)
    final hotLeadsCount = hotLeadsAsync.hasValue
        ? hotLeadsAsync.value?.length ?? 0
        : null;
    final pendingTasks = metricsAsync.hasValue
        ? (metricsData['pendingTasks'] as num?)?.toInt() ?? 0
        : null;
    final todayMeetings = metricsAsync.hasValue
        ? (metricsData['todayMeetings'] as num?)?.toInt() ?? 0
        : null;
    final todayCalls = metricsAsync.hasValue
        ? (metricsData['todayCalls'] as num?)?.toInt() ?? 0
        : null;
    final quotaProgress = metricsAsync.hasValue
        ? (metricsData['quotaProgress'] as num?)?.toDouble() ?? 0.0
        : null;

    // Detect tablet layout
    final isTablet = Responsive.shouldShowSplitView(context);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Offline banner - shows when device is offline
            const OfflineBanner(compact: true),
            // Main scrollable content
            Expanded(
              child: RefreshIndicator(
                onRefresh: _onRefresh,
                color: LuxuryColors.jadePremium,
                backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                child: isTablet
                    ? _buildTabletLayout(
                        context,
                        user,
                        isDark,
                        alertsCount,
                        isPipelineLoading,
                        pipelineValue ?? 0,
                        quotaProgress ?? 0,
                        totalDeals ?? 0,
                        isMetricsLoading,
                        todayCalls ?? 0,
                        todayMeetings ?? 0,
                        pendingTasks ?? 0,
                        hotLeadsCount ?? 0,
                        insights,
                        activities,
                        dashboardConfig,
                        pipelineData,
                        salesTrendData,
                      )
                    : _buildPhoneLayout(
                        context,
                        user,
                        isDark,
                        alertsCount,
                        isPipelineLoading,
                        pipelineValue ?? 0,
                        quotaProgress ?? 0,
                        totalDeals ?? 0,
                        isMetricsLoading,
                        todayCalls ?? 0,
                        todayMeetings ?? 0,
                        pendingTasks ?? 0,
                        hotLeadsCount ?? 0,
                        insights,
                        activities,
                        dashboardConfig,
                        pipelineData,
                        salesTrendData,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build phone layout (single column)
  Widget _buildPhoneLayout(
    BuildContext context,
    user,
    bool isDark,
    int alertsCount,
    bool isPipelineLoading,
    double pipelineValue,
    double quotaProgress,
    int totalDeals,
    bool isMetricsLoading,
    int todayCalls,
    int todayMeetings,
    int pendingTasks,
    int hotLeadsCount,
    List<AiInsight> insights,
    List<Map<String, dynamic>> activities,
    DashboardConfig config,
    Map<String, dynamic> pipelineData,
    List<Map<String, dynamic>> salesTrendData,
  ) {
    // Get activity limit from config
    final activityLimit = config.layout.phone.activityLimit;
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // Premium Header - Luxury styled greeting section
        SliverToBoxAdapter(
          child: PremiumDashboardHeaderCompact(
            greeting: _getGreeting(),
            userName: user?.fullName ?? 'User',
            userInitials: user?.initials,
            userAvatarUrl: _getFullAvatarUrl(user?.avatarUrl),
            alertsCount: alertsCount,
            onSearchTap: () => context.push(AppRoutes.search),
            onCameraTap: () => context.push(AppRoutes.smartCapture),
            onNotificationsTap: () => showAlertsPanel(context),
            onProfileTap: () => context.push(AppRoutes.settings),
            editModeButton: const DashboardEditModeButton(),
          ),
        ),

            // Data Source Indicator - Tappable to go to settings
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: GestureDetector(
                  onTap: () => context.push(AppRoutes.settings),
                  child: const CrmModeIndicator(
                    size: 24,
                    showLabel: true,
                  ),
                ).animate().fadeIn(duration: 300.ms),
              ),
            ),

            // Edit Mode Banner (shown when in edit mode)
            const SliverToBoxAdapter(
              child: DashboardEditModeBanner(),
            ),

            // Pipeline Summary Card (conditionally shown based on config)
            if (config.widgets.pipelineSummary)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                  child: RemovableDashboardCard(
                    widgetId: DashboardWidgetId.pipelineSummary,
                    child: _buildPipelineCard(
                      context,
                      isPipelineLoading,
                      pipelineValue,
                      quotaProgress,
                      totalDeals,
                    ),
                  ),
                ),
              ),

            // Today's Focus Section - Priority placement for daily actionable items
            if (config.widgets.todaysFocus)
              SliverToBoxAdapter(
                child: RemovableDashboardCard(
                  widgetId: DashboardWidgetId.todaysFocus,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                        child: Text(
                          "Today's Focus",
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ).animate(delay: 200.ms).fadeIn(),
                      ),
                      // Quick Stats Row - Premium glassmorphic cards
                      PremiumStatsRow(
                        calls: todayCalls,
                        meetings: todayMeetings,
                        tasks: pendingTasks,
                        leads: hotLeadsCount,
                        isLoading: isMetricsLoading,
                        onCallsTap: () => context.push(AppRoutes.activity),
                        onMeetingsTap: () => context.push(AppRoutes.calendar),
                        onTasksTap: () => context.go(AppRoutes.tasks),
                        onLeadsTap: () => context.go(AppRoutes.leads),
                      ),
                    ],
                  ),
                ),
              ),

            // Sales Performance Chart - Beautiful KPI visualization with real data
            if (config.widgets.salesPerformanceChart)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: RemovableDashboardCard(
                    widgetId: DashboardWidgetId.salesPerformanceChart,
                    child: SalesPerformanceChart(
                      pipelineData: _buildPipelineChartData(pipelineData),
                      trendData: _buildTrendDataFromApi(salesTrendData),
                      quotaAttainment: quotaProgress,
                      totalPipelineValue: pipelineValue,
                      wonValue: (pipelineData['closedWonValue'] as num?)?.toDouble() ?? pipelineValue * 0.25,
                      activeDeals: totalDeals,
                    ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),
                  ),
                ),
              ),

            // Morning Brief Card - AI-synthesized daily priorities (Collapsible)
            if (config.widgets.morningBrief)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: RemovableDashboardCard(
                    widgetId: DashboardWidgetId.morningBrief,
                    child: CollapsibleSection(
                      title: 'Morning Brief',
                      storageKey: 'dashboard_morning_brief_expanded',
                      leading: Icon(
                        Iconsax.sun_1,
                        size: 20,
                        color: LuxuryColors.jadePremium,
                      ),
                      contentPadding: const EdgeInsets.only(top: 8),
                      child: MorningBriefCard(
                        compact: true,
                        showHeader: false,
                        onTapExpand: () => _showMorningBriefBottomSheet(context),
                      ),
                    ),
                  ),
                ),
              ),

            // IRIS Intelligence Card - Primary AI insight widget (Collapsible)
            if (config.widgets.irisRank)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: RemovableDashboardCard(
                    widgetId: DashboardWidgetId.irisRank,
                    child: CollapsibleSection(
                      title: 'SalesOS Rank',
                      storageKey: 'dashboard_iris_rank_expanded',
                      leading: Icon(
                        Iconsax.ranking_1,
                        size: 20,
                        color: LuxuryColors.jadePremium,
                      ),
                      contentPadding: const EdgeInsets.only(top: 8),
                      child: IrisIntelligenceCard(
                        onTapViewAll: () => context.push(AppRoutes.irisInsights),
                        showHeader: false,
                      ),
                    ),
                  ),
                ),
              ),

            // AI Insights Section - Premium Carousel (wrapped as single removable unit)
            if (config.widgets.aiInsights)
              SliverToBoxAdapter(
                child: RemovableDashboardCard(
                  widgetId: DashboardWidgetId.aiInsights,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      InsightSectionHeader(
                        title: 'AI Insights',
                        insightCount: insights.length,
                        onViewAll: insights.length > 1
                            ? () => context.push(AppRoutes.irisInsights)
                            : null,
                      ),
                      // Premium AI Insights Carousel
                      PremiumInsightCarousel(
                        insights: insights.map((insight) => PremiumInsight(
                          id: insight.entityId ?? '',
                          title: insight.title,
                          description: insight.description,
                          level: _mapPriorityToLevel(insight.priority),
                          category: _mapTypeToCategory(insight.type),
                          actionLabel: insight.actionLabel,
                          onAction: () => _handleInsightAction(context, insight),
                          entityId: insight.entityId,
                          entityType: insight.entityType,
                        )).toList(),
                        height: 175,
                      ),
                    ],
                  ),
                ),
              ),

            // Recent Activity Section Header (with remove option)
            if (config.widgets.recentActivity)
              SliverToBoxAdapter(
                child: RemovableDashboardCard(
                  widgetId: DashboardWidgetId.recentActivity,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Recent Activity',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        TextButton(
                          onPressed: () {},
                          child: Text(
                            'See All',
                            style: IrisTheme.labelMedium.copyWith(
                              color: LuxuryColors.jadePremium,
                            ),
                          ),
                        ),
                      ],
                    ).animate(delay: 550.ms).fadeIn(),
                  ),
                ),
              ),

            // Activity List - wrapped in RepaintBoundary to isolate semantics updates
            if (config.widgets.recentActivity)
              SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  // Handle empty state - only render placeholder at index 0
                  // childCount controls the exact number of children, so we don't return null
                  if (activities.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      child: RepaintBoundary(
                        child: IrisCard(
                          padding: const EdgeInsets.all(20),
                          child: Center(
                            child: Text(
                              'No recent activity',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }

                  // Safe bounds check - childCount should prevent out of bounds,
                  // but we return a SizedBox.shrink() instead of null to avoid semantics issues
                  if (index >= activities.length || index < 0) {
                    return const SizedBox.shrink();
                  }

                  final activity = activities[index];
                  final activityType = (activity['type'] as String?) ?? 'activity';
                  final activityTitle = (activity['title'] as String?) ??
                      (activity['subject'] as String?) ??
                      'Activity';
                  final activitySubtitle = (activity['description'] as String?) ??
                      (activity['contactName'] as String?) ??
                      '';
                  final activityDateStr = (activity['createdAt'] as String?) ??
                      (activity['activityDate'] as String?) ??
                      (activity['CreatedDate'] as String?);
                  final activityDate = activityDateStr != null
                      ? DateTime.tryParse(activityDateStr) ?? DateTime.now()
                      : DateTime.now();

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    child: RepaintBoundary(
                      child: _ActivityItem(
                        icon: _getActivityIcon(activityType),
                        iconColor: _getActivityColor(activityType),
                        title: activityTitle,
                        subtitle: activitySubtitle,
                        time: _formatTimeAgo(activityDate),
                        onTap: () {
                          // Convert raw activity data to ActivityItem and navigate
                          final activityItem = ActivityItem(
                            id: (activity['id'] as String?) ?? index.toString(),
                            type: _mapToActivityType(activityType),
                            title: activityTitle,
                            description: activitySubtitle.isNotEmpty ? activitySubtitle : activityTitle,
                            timestamp: activityDate,
                            relatedEntity: (activity['contactName'] as String?) ??
                                (activity['relatedTo'] as String?) ??
                                (activity['accountName'] as String?) ??
                                _getActivityTypeDisplayName(activityType),
                            metadata: _extractMetadata(activity),
                          );
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => ActivityDetailPage(activity: activityItem),
                            ),
                          );
                        },
                      ).animate(delay: (600 + index * 50).ms)
                          .fadeIn()
                          .slideX(begin: 0.05),
                    ),
                  );
                },
                childCount: activities.isEmpty ? 1 : activities.length.clamp(0, activityLimit),
              ),
            ),

            // Bottom Padding
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        );
  }

  /// Build tablet layout (multi-column grid)
  Widget _buildTabletLayout(
    BuildContext context,
    user,
    bool isDark,
    int alertsCount,
    bool isPipelineLoading,
    double pipelineValue,
    double quotaProgress,
    int totalDeals,
    bool isMetricsLoading,
    int todayCalls,
    int todayMeetings,
    int pendingTasks,
    int hotLeadsCount,
    List<AiInsight> insights,
    List<Map<String, dynamic>> activities,
    DashboardConfig config,
    Map<String, dynamic> pipelineData,
    List<Map<String, dynamic>> salesTrendData,
  ) {
    // Get activity limit from config (use tablet settings or fallback to phone)
    final activityLimit = config.layout.phone.activityLimit;
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: Header + Pipeline (using fixed height instead of IntrinsicHeight to avoid semantics issues)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting section
              Expanded(
                flex: config.widgets.pipelineSummary ? 1 : 2,
                child: _buildHeaderSection(context, user, isDark, alertsCount),
              ),
              // Pipeline summary (conditionally shown)
              if (config.widgets.pipelineSummary) ...[
                const SizedBox(width: 24),
                Expanded(
                  flex: 1,
                  child: RemovableDashboardCard(
                    widgetId: DashboardWidgetId.pipelineSummary,
                    child: isPipelineLoading
                        ? const PipelineCardShimmer()
                        : _PipelineSummaryCard(
                            pipelineValue: pipelineValue,
                            quotaProgress: quotaProgress,
                            totalDeals: totalDeals,
                            animateValues: true,
                            onTap: () => context.push(AppRoutes.deals),
                          ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),
                  ),
                ),
              ],
            ],
          ),
          // Edit Mode Banner (shown when in edit mode)
          const DashboardEditModeBanner(),
          const SizedBox(height: 24),
          // Today's Focus - Premium Stats Grid with 3D illustrations
          if (config.widgets.todaysFocus) ...[
            RemovableDashboardCard(
              widgetId: DashboardWidgetId.todaysFocus,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Today's Focus",
                    style: IrisTheme.titleMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ).animate(delay: 200.ms).fadeIn(),
                  const SizedBox(height: 12),
                  PremiumStatsGrid(
                    calls: todayCalls,
                    meetings: todayMeetings,
                    tasks: pendingTasks,
                    leads: hotLeadsCount,
                    isLoading: isMetricsLoading,
                    onCallsTap: () => context.push(AppRoutes.activity),
                    onMeetingsTap: () => context.push(AppRoutes.calendar),
                    onTasksTap: () => context.go(AppRoutes.tasks),
                    onLeadsTap: () => context.go(AppRoutes.leads),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Sales Performance Chart - Beautiful KPI visualization with real data
          if (config.widgets.salesPerformanceChart) ...[
            RemovableDashboardCard(
              widgetId: DashboardWidgetId.salesPerformanceChart,
              child: SalesPerformanceChart(
                pipelineData: _buildPipelineChartData(pipelineData),
                trendData: _buildTrendDataFromApi(salesTrendData),
                quotaAttainment: quotaProgress,
                totalPipelineValue: pipelineValue,
                wonValue: (pipelineData['closedWonValue'] as num?)?.toDouble() ?? pipelineValue * 0.25,
                activeDeals: totalDeals,
              ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1),
            ),
            const SizedBox(height: 24),
          ],

          // Morning Brief Card - AI-synthesized daily priorities (Collapsible)
          if (config.widgets.morningBrief) ...[
            RemovableDashboardCard(
              widgetId: DashboardWidgetId.morningBrief,
              child: CollapsibleSection(
                title: 'Morning Brief',
                storageKey: 'dashboard_morning_brief_expanded',
                leading: Icon(
                  Iconsax.sun_1,
                  size: 20,
                  color: LuxuryColors.jadePremium,
                ),
                contentPadding: const EdgeInsets.only(top: 8),
                child: const MorningBriefCard(compact: false, showHeader: false),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // IRIS Intelligence Card - Primary AI-Powered Insights (Collapsible)
          if (config.widgets.irisRank) ...[
            RemovableDashboardCard(
              widgetId: DashboardWidgetId.irisRank,
              child: CollapsibleSection(
                title: 'SalesOS Rank',
                storageKey: 'dashboard_iris_rank_expanded',
                leading: Icon(
                  Iconsax.ranking_1,
                  size: 20,
                  color: LuxuryColors.jadePremium,
                ),
                contentPadding: const EdgeInsets.only(top: 8),
                child: IrisIntelligenceCard(
                  onTapViewAll: () => context.push(AppRoutes.irisInsights),
                  showHeader: false,
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Bottom row: AI Insights + Recent Activity
          if (config.widgets.aiInsights || config.widgets.recentActivity)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // AI Insights section
                if (config.widgets.aiInsights)
                  Expanded(
                    flex: 1,
                    child: RemovableDashboardCard(
                      widgetId: DashboardWidgetId.aiInsights,
                      child: _buildAiInsightsSection(context, isDark, insights),
                    ),
                  ),
                if (config.widgets.aiInsights && config.widgets.recentActivity)
                  const SizedBox(width: 24),
                // Recent Activity section
                if (config.widgets.recentActivity)
                  Expanded(
                    flex: 1,
                    child: RemovableDashboardCard(
                      widgetId: DashboardWidgetId.recentActivity,
                      child: _buildActivitySection(context, isDark, activities, activityLimit: activityLimit),
                    ),
                  ),
              ],
            ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  /// Build header section for tablet - Premium SalesOS design
  Widget _buildHeaderSection(BuildContext context, dynamic user, bool isDark, int alertsCount) {
    return PremiumDashboardHeader(
      greeting: _getGreeting(),
      userName: user?.fullName ?? 'User',
      userInitials: user?.initials,
      userAvatarUrl: _getFullAvatarUrl(user?.avatarUrl),
      alertsCount: alertsCount,
      margin: EdgeInsets.zero, // No margin in tablet layout
      onSearchTap: () => context.push(AppRoutes.search),
      onCameraTap: () => context.push(AppRoutes.smartCapture),
      onNotificationsTap: () => showAlertsPanel(context),
      onProfileTap: () => context.push(AppRoutes.settings),
      editModeButton: const DashboardEditModeButton(variant: DashboardEditModeVariant.luxury),
      dataSourceIndicator: GestureDetector(
        onTap: () => context.push(AppRoutes.settings),
        child: const CrmModeIndicator(size: 24, showLabel: true),
      ),
    );
  }

  /// Build AI Insights section for tablet - Premium styled
  Widget _buildAiInsightsSection(BuildContext context, bool isDark, List<AiInsight> insights) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: LuxuryColors.jadePremium.withValues(alpha: isDark ? 0.2 : 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: LuxuryColors.jadePremium.withValues(alpha: 0.08),
            blurRadius: 24,
            spreadRadius: -8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InsightSectionHeader(
            title: 'AI Insights',
            insightCount: insights.length,
            onViewAll: insights.length > 1
                ? () => context.push(AppRoutes.irisInsights)
                : null,
          ),
          const SizedBox(height: 8),
          // Display premium insight cards in a vertical list
          if (insights.isEmpty)
            _EmptyInsightsCard()
          else
            ...insights.take(3).map((insight) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: PremiumInsightCard(
                    insight: PremiumInsight(
                      id: insight.entityId ?? '',
                      title: insight.title,
                      description: insight.description,
                      level: _mapPriorityToLevel(insight.priority),
                      category: _mapTypeToCategory(insight.type),
                      actionLabel: insight.actionLabel,
                      onAction: () => _handleInsightAction(context, insight),
                      entityId: insight.entityId,
                      entityType: insight.entityType,
                    ),
                  ).animate(delay: 100.ms).fadeIn(),
                )),
        ],
      ),
    ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.05);
  }

  /// Build activity section for tablet - Premium styled
  Widget _buildActivitySection(BuildContext context, bool isDark, List<Map<String, dynamic>> activities, {int activityLimit = 5}) {
    // Convert raw activities to LuxuryActivityData
    final luxuryActivities = activities.take(activityLimit).toList().asMap().entries.map((entry) {
      final index = entry.key;
      final activity = entry.value;
      final activityType = (activity['type'] as String?) ?? 'activity';
      final activityTitle = (activity['title'] as String?) ??
          (activity['subject'] as String?) ??
          'Activity';
      final activitySubtitle = (activity['description'] as String?) ??
          (activity['contactName'] as String?) ??
          '';
      final activityDateStr = (activity['createdAt'] as String?) ??
          (activity['activityDate'] as String?) ??
          (activity['CreatedDate'] as String?);
      final activityDate = activityDateStr != null
          ? DateTime.tryParse(activityDateStr) ?? DateTime.now()
          : DateTime.now();

      return LuxuryActivityData(
        type: _mapToLuxuryActivityType(activityType),
        title: activityTitle,
        subtitle: activitySubtitle,
        time: _formatTimeAgo(activityDate),
        onTap: () {
          final activityItem = ActivityItem(
            id: (activity['id'] as String?) ?? index.toString(),
            type: _mapToActivityType(activityType),
            title: activityTitle,
            description: activitySubtitle.isNotEmpty ? activitySubtitle : activityTitle,
            timestamp: activityDate,
            relatedEntity: (activity['contactName'] as String?) ??
                (activity['relatedTo'] as String?) ??
                (activity['accountName'] as String?) ??
                _getActivityTypeDisplayName(activityType),
            metadata: _extractMetadata(activity),
          );
          Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => ActivityDetailPage(activity: activityItem)),
          );
        },
      );
    }).toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: LuxuryColors.jadePremium.withValues(alpha: isDark ? 0.2 : 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: LuxuryActivitySection(
        title: 'Recent Activity',
        activities: luxuryActivities,
        limit: activityLimit,
        onSeeAllTap: () => context.push(AppRoutes.activity),
      ),
    ).animate(delay: 350.ms).fadeIn().slideY(begin: 0.05);
  }

  /// Map string type to LuxuryActivityType
  LuxuryActivityType _mapToLuxuryActivityType(String type) {
    switch (type.toLowerCase()) {
      case 'call':
        return LuxuryActivityType.call;
      case 'email':
      case 'message':
        return LuxuryActivityType.email;
      case 'meeting':
        return LuxuryActivityType.meeting;
      case 'deal':
      case 'opportunity':
        return LuxuryActivityType.deal;
      case 'task':
        return LuxuryActivityType.task;
      case 'note':
        return LuxuryActivityType.note;
      default:
        return LuxuryActivityType.activity;
    }
  }

  Widget _buildPipelineCard(
    BuildContext context,
    bool isLoading,
    double pipelineValue,
    double quotaProgress,
    int totalDeals,
  ) {
    if (isLoading) {
      return const PipelineCardShimmer();
    }
    final card = _PipelineSummaryCard(
      pipelineValue: pipelineValue,
      quotaProgress: quotaProgress,
      totalDeals: totalDeals,
      animateValues: true,
      onTap: () => context.push(AppRoutes.deals),
    );
    return card.animate(delay: 100.ms).fadeIn().slideY(begin: 0.1);
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /// Construct full avatar URL from relative path
  String? _getFullAvatarUrl(String? avatarUrl) {
    if (avatarUrl == null || avatarUrl.isEmpty) return null;
    // If already a full URL, return as-is
    if (avatarUrl.startsWith('http')) return avatarUrl;
    // Prepend API base URL for relative paths
    return '${AppConfig.apiBaseUrl}$avatarUrl';
  }

  IconData _getActivityIcon(String type) {
    switch (type.toLowerCase()) {
      case 'call':
        return Iconsax.call;
      case 'email':
      case 'message':
        return Iconsax.sms;
      case 'meeting':
        return Iconsax.calendar;
      case 'deal':
      case 'opportunity':
        return Iconsax.dollar_circle;
      case 'task':
        return Iconsax.task_square;
      case 'note':
        return Iconsax.note_1;
      default:
        return Iconsax.activity;
    }
  }

  Color _getActivityColor(String type) {
    switch (type.toLowerCase()) {
      case 'call':
        return IrisTheme.success;
      case 'email':
      case 'message':
        return IrisTheme.info;
      case 'meeting':
        return IrisTheme.warning;
      case 'deal':
      case 'opportunity':
        return LuxuryColors.rolexGreen;
      case 'task':
        return IrisTheme.success;
      default:
        return IrisTheme.info;
    }
  }

  /// Map string type to ActivityType enum
  ActivityType _mapToActivityType(String type) {
    switch (type.toLowerCase()) {
      case 'call':
        return ActivityType.call;
      case 'email':
      case 'message':
        return ActivityType.email;
      case 'meeting':
        return ActivityType.meeting;
      case 'note':
        return ActivityType.note;
      case 'deal':
      case 'opportunity':
        return ActivityType.stageChange;
      case 'task':
        return ActivityType.taskComplete;
      default:
        return ActivityType.note;
    }
  }

  /// Get a human-readable display name for an activity type
  String _getActivityTypeDisplayName(String type) {
    switch (type.toLowerCase()) {
      case 'call':
        return 'Phone Call';
      case 'email':
      case 'message':
        return 'Email';
      case 'meeting':
        return 'Meeting';
      case 'note':
        return 'Note';
      case 'deal':
      case 'opportunity':
        return 'Deal Update';
      case 'task':
        return 'Task';
      default:
        return 'Activity';
    }
  }

  /// Extract metadata from raw activity data
  Map<String, String>? _extractMetadata(Map<String, dynamic> activity) {
    final metadata = <String, String>{};

    if (activity['duration'] != null) {
      metadata['duration'] = activity['duration'].toString();
    }
    if (activity['amount'] != null) {
      metadata['amount'] = '\$${activity['amount']}';
    }
    if (activity['attendees'] != null) {
      metadata['attendees'] = activity['attendees'].toString();
    }
    if (activity['status'] != null) {
      metadata['status'] = activity['status'].toString();
    }
    if (activity['priority'] != null) {
      metadata['priority'] = activity['priority'].toString();
    }

    return metadata.isEmpty ? null : metadata;
  }

  String _formatTimeAgo(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(timestamp);
    }
  }

  /// Map AI insight priority to premium insight level
  InsightLevel _mapPriorityToLevel(InsightPriority priority) {
    switch (priority) {
      case InsightPriority.high:
        return InsightLevel.high;
      case InsightPriority.medium:
        return InsightLevel.medium;
      case InsightPriority.low:
        return InsightLevel.low;
    }
  }

  /// Map AI insight type to premium insight category
  InsightCategory _mapTypeToCategory(InsightType type) {
    switch (type) {
      case InsightType.hotLead:
        return InsightCategory.hotLead;
      case InsightType.atRiskDeal:
        return InsightCategory.atRisk;
      case InsightType.followUpNeeded:
        return InsightCategory.followUp;
      case InsightType.meetingReminder:
        return InsightCategory.meeting;
      case InsightType.dealProgress:
        return InsightCategory.dealProgress;
      case InsightType.inactiveAccount:
        return InsightCategory.inactive;
      case InsightType.urgentTask:
        return InsightCategory.task;
      case InsightType.opportunity:
        return InsightCategory.opportunity;
    }
  }

  void _handleInsightAction(BuildContext context, AiInsight insight) {
    // Navigate based on entity type
    switch (insight.entityType) {
      case 'opportunity':
        context.push('${AppRoutes.deals}/${insight.entityId}');
        break;
      case 'lead':
        context.push('${AppRoutes.leads}/${insight.entityId}');
        break;
      case 'task':
        context.push('${AppRoutes.tasks}/${insight.entityId}');
        break;
      case 'activity':
        // Show activity or navigate to AI chat
        context.go(AppRoutes.aiChat);
        break;
      default:
        // Default to AI chat for general insights
        context.go(AppRoutes.aiChat);
    }
  }

  /// Show full Morning Brief in a centered dialog
  void _showMorningBriefBottomSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    HapticFeedback.mediumImpact();
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Container(
              margin: const EdgeInsets.all(24),
              constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header with close button
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 8, 8),
                    child: Row(
                      children: [
                        Icon(
                          Iconsax.sun_1,
                          size: 20,
                          color: LuxuryColors.jadePremium,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Morning Brief',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: Icon(
                            Icons.close,
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  ),
                  // Full Morning Brief Card
                  const Flexible(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: MorningBriefCard(compact: false, showHeader: false),
                    ),
                  ),
                ],
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

  /// Build pipeline chart data from the pipeline data map
  List<PipelineStageData> _buildPipelineChartData(Map<String, dynamic> pipelineData) {
    // Try to get stage data from the pipeline response
    final stages = pipelineData['stages'] as List<dynamic>?;

    if (stages != null && stages.isNotEmpty) {
      return stages.map((stage) {
        final stageMap = stage as Map<String, dynamic>;
        final name = stageMap['name'] as String? ?? 'Unknown';
        return PipelineStageData(
          stageName: name,
          shortName: _getShortStageName(name),
          value: (stageMap['value'] as num?)?.toDouble() ?? 0,
          count: (stageMap['count'] as num?)?.toInt() ?? 0,
        );
      }).toList();
    }

    // Generate default data based on total pipeline value
    final totalValue = (pipelineData['totalPipelineValue'] as num?)?.toDouble() ?? 500000;
    final totalDeals = (pipelineData['openOpportunities'] as num?)?.toInt() ?? 25;

    // Create a realistic funnel distribution
    return [
      PipelineStageData(
        stageName: 'Qualification',
        shortName: 'Qual',
        value: totalValue * 0.35,
        count: (totalDeals * 0.35).round(),
      ),
      PipelineStageData(
        stageName: 'Discovery',
        shortName: 'Disc',
        value: totalValue * 0.28,
        count: (totalDeals * 0.25).round(),
      ),
      PipelineStageData(
        stageName: 'Proposal',
        shortName: 'Prop',
        value: totalValue * 0.20,
        count: (totalDeals * 0.20).round(),
      ),
      PipelineStageData(
        stageName: 'Negotiation',
        shortName: 'Nego',
        value: totalValue * 0.12,
        count: (totalDeals * 0.12).round(),
      ),
      PipelineStageData(
        stageName: 'Closed Won',
        shortName: 'Won',
        value: totalValue * 0.05,
        count: (totalDeals * 0.08).round(),
      ),
    ];
  }

  /// Get short name for a pipeline stage
  String _getShortStageName(String name) {
    final shortNames = {
      'qualification': 'Qual',
      'discovery': 'Disc',
      'proposal': 'Prop',
      'negotiation': 'Nego',
      'closed won': 'Won',
      'closed lost': 'Lost',
    };
    return shortNames[name.toLowerCase()] ?? name.substring(0, name.length.clamp(0, 4));
  }

  /// Build trend data from real API response (closed won opportunities by month)
  List<SalesTrendData> _buildTrendDataFromApi(List<Map<String, dynamic>> apiData) {
    if (apiData.isEmpty) {
      // Return empty list - chart will handle gracefully
      return [];
    }

    return apiData.map((data) {
      return SalesTrendData(
        label: data['label'] as String? ?? '',
        value: (data['value'] as num?)?.toDouble() ?? 0.0,
        year: (data['year'] as num?)?.toInt(),
      );
    }).toList();
  }
}

class _PipelineSummaryCard extends StatelessWidget {
  final double pipelineValue;
  final double quotaProgress;
  final int totalDeals;
  final bool animateValues;
  final VoidCallback? onTap;

  const _PipelineSummaryCard({
    required this.pipelineValue,
    required this.quotaProgress,
    required this.totalDeals,
    this.animateValues = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final quotaPercent = quotaProgress.clamp(0.0, 1.0);

    return GestureDetector(
      onTap: onTap,
      child: LuxuryCard(
      variant: LuxuryCardVariant.accent,
      accentColor: LuxuryColors.rolexGreen,
      padding: const EdgeInsets.all(16),
      child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'PIPELINE VALUE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1.5,
                      color: LuxuryColors.rolexGreen,
                    ),
                  ),
                  const SizedBox(height: 6),
                  animateValues
                      ? AnimatedCurrencyCounter(
                          value: pipelineValue,
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w300,
                            letterSpacing: -0.5,
                            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                          ),
                        )
                      : Text(
                          _formatCurrency(pipelineValue),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w300,
                            letterSpacing: -0.5,
                            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                          ),
                        ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        width: 4,
                        height: 4,
                        decoration: BoxDecoration(
                          color: LuxuryColors.jadePremium,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      animateValues
                          ? AnimatedCounter(
                              value: totalDeals,
                              suffix: ' open deals',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                letterSpacing: 0.3,
                                color: LuxuryColors.textMuted,
                              ),
                            )
                          : Text(
                              '$totalDeals open deals',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                letterSpacing: 0.3,
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                    ],
                  ),
                ],
              ),
            ),
            TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: quotaPercent),
              duration: animateValues ? const Duration(milliseconds: 1200) : Duration.zero,
              curve: Curves.easeOutCubic,
              builder: (context, value, child) {
                return CircularPercentIndicator(
                  radius: 36,
                  lineWidth: 5,
                  percent: value,
                  center: Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${(value * 100).toInt()}%',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: LuxuryColors.jadePremium,
                        ),
                      ),
                      Text(
                        'QUOTA',
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1.0,
                          color: LuxuryColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                  backgroundColor: isDark
                      ? LuxuryColors.richBlack.withValues(alpha: 0.5)
                      : LuxuryColors.cream,
                  progressColor: LuxuryColors.rolexGreen,
                  circularStrokeCap: CircularStrokeCap.round,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }
}

class _EmptyInsightsCard extends StatelessWidget {
  const _EmptyInsightsCard();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Iconsax.magic_star,
              size: 24,
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              'No insights available yet. Add more data to your CRM to get AI-powered recommendations.',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String time;
  final VoidCallback? onTap;

  const _ActivityItem({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.time,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              time,
              style: IrisTheme.labelSmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
