import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_button.dart';
// Import the core dashboard config provider
import '../../../../core/services/dashboard_config_service.dart';
import '../../../../core/models/dashboard_config.dart';

// ============================================================
// DASHBOARD CONFIGURATION MODELS
// ============================================================

/// Stats layout options for phone view
enum StatsLayout {
  row,
  grid,
}

extension StatsLayoutExtension on StatsLayout {
  String get displayName {
    switch (this) {
      case StatsLayout.row:
        return 'Horizontal Row';
      case StatsLayout.grid:
        return 'Grid Layout';
    }
  }
}

/// Insights style options for phone view
enum InsightsStyle {
  carousel,
  list,
}

extension InsightsStyleExtension on InsightsStyle {
  String get displayName {
    switch (this) {
      case InsightsStyle.carousel:
        return 'Carousel';
      case InsightsStyle.list:
        return 'List';
    }
  }
}

/// Dashboard theme presets
enum DashboardTheme {
  defaultTheme,
  minimal,
  detailed,
}

extension DashboardThemeExtension on DashboardTheme {
  String get displayName {
    switch (this) {
      case DashboardTheme.defaultTheme:
        return 'Default';
      case DashboardTheme.minimal:
        return 'Minimal';
      case DashboardTheme.detailed:
        return 'Detailed';
    }
  }

  String get description {
    switch (this) {
      case DashboardTheme.defaultTheme:
        return 'Balanced view with key metrics';
      case DashboardTheme.minimal:
        return 'Clean, focused interface';
      case DashboardTheme.detailed:
        return 'Comprehensive data display';
    }
  }
}

/// Available quick stats options
enum QuickStatType {
  calls,
  meetings,
  tasks,
  leads,
  deals,
  emails,
}

extension QuickStatTypeExtension on QuickStatType {
  String get displayName {
    switch (this) {
      case QuickStatType.calls:
        return 'Calls';
      case QuickStatType.meetings:
        return 'Meetings';
      case QuickStatType.tasks:
        return 'Tasks';
      case QuickStatType.leads:
        return 'Leads';
      case QuickStatType.deals:
        return 'Deals';
      case QuickStatType.emails:
        return 'Emails';
    }
  }

  IconData get icon {
    switch (this) {
      case QuickStatType.calls:
        return Iconsax.call;
      case QuickStatType.meetings:
        return Iconsax.calendar;
      case QuickStatType.tasks:
        return Iconsax.task_square;
      case QuickStatType.leads:
        return Iconsax.profile_2user;
      case QuickStatType.deals:
        return Iconsax.money;
      case QuickStatType.emails:
        return Iconsax.sms;
    }
  }
}

/// Dashboard widget visibility options
class DashboardWidgetVisibility {
  final bool showPipeline;
  final bool showMorningBrief;
  final bool showIrisRank;
  final bool showQuickStats;
  final bool showRecentActivity;
  final bool showUpcomingMeetings;
  final bool showTopDeals;
  final bool showAiInsights;

  const DashboardWidgetVisibility({
    this.showPipeline = true,
    this.showMorningBrief = true,
    this.showIrisRank = true,
    this.showQuickStats = true,
    this.showRecentActivity = true,
    this.showUpcomingMeetings = true,
    this.showTopDeals = true,
    this.showAiInsights = true,
  });

  DashboardWidgetVisibility copyWith({
    bool? showPipeline,
    bool? showMorningBrief,
    bool? showIrisRank,
    bool? showQuickStats,
    bool? showRecentActivity,
    bool? showUpcomingMeetings,
    bool? showTopDeals,
    bool? showAiInsights,
  }) {
    return DashboardWidgetVisibility(
      showPipeline: showPipeline ?? this.showPipeline,
      showMorningBrief: showMorningBrief ?? this.showMorningBrief,
      showIrisRank: showIrisRank ?? this.showIrisRank,
      showQuickStats: showQuickStats ?? this.showQuickStats,
      showRecentActivity: showRecentActivity ?? this.showRecentActivity,
      showUpcomingMeetings: showUpcomingMeetings ?? this.showUpcomingMeetings,
      showTopDeals: showTopDeals ?? this.showTopDeals,
      showAiInsights: showAiInsights ?? this.showAiInsights,
    );
  }
}

/// Dashboard settings state for the settings page UI.
/// This is distinct from the core DashboardConfig model.
class DashboardSettingsState {
  final DashboardWidgetVisibility widgetVisibility;
  final List<QuickStatType> selectedQuickStats;
  final StatsLayout phoneStatsLayout;
  final InsightsStyle phoneInsightsStyle;
  final int phoneActivityLimit;
  final int tabletStatsColumns;
  final bool tabletShowDualColumn;
  final double tabletPanelRatio;
  final DashboardTheme theme;

  const DashboardSettingsState({
    this.widgetVisibility = const DashboardWidgetVisibility(),
    this.selectedQuickStats = const [
      QuickStatType.calls,
      QuickStatType.meetings,
      QuickStatType.tasks,
      QuickStatType.leads,
    ],
    this.phoneStatsLayout = StatsLayout.row,
    this.phoneInsightsStyle = InsightsStyle.carousel,
    this.phoneActivityLimit = 5,
    this.tabletStatsColumns = 3,
    this.tabletShowDualColumn = true,
    this.tabletPanelRatio = 0.4,
    this.theme = DashboardTheme.defaultTheme,
  });

  DashboardSettingsState copyWith({
    DashboardWidgetVisibility? widgetVisibility,
    List<QuickStatType>? selectedQuickStats,
    StatsLayout? phoneStatsLayout,
    InsightsStyle? phoneInsightsStyle,
    int? phoneActivityLimit,
    int? tabletStatsColumns,
    bool? tabletShowDualColumn,
    double? tabletPanelRatio,
    DashboardTheme? theme,
  }) {
    return DashboardSettingsState(
      widgetVisibility: widgetVisibility ?? this.widgetVisibility,
      selectedQuickStats: selectedQuickStats ?? this.selectedQuickStats,
      phoneStatsLayout: phoneStatsLayout ?? this.phoneStatsLayout,
      phoneInsightsStyle: phoneInsightsStyle ?? this.phoneInsightsStyle,
      phoneActivityLimit: phoneActivityLimit ?? this.phoneActivityLimit,
      tabletStatsColumns: tabletStatsColumns ?? this.tabletStatsColumns,
      tabletShowDualColumn: tabletShowDualColumn ?? this.tabletShowDualColumn,
      tabletPanelRatio: tabletPanelRatio ?? this.tabletPanelRatio,
      theme: theme ?? this.theme,
    );
  }

  static DashboardSettingsState get defaultState => const DashboardSettingsState();
}

// ============================================================
// DASHBOARD SETTINGS SERVICE
// ============================================================

/// Service for persisting dashboard settings to SharedPreferences.
class DashboardSettingsService {
  static const String _keyPrefix = 'iris_dashboard_';

  Future<DashboardSettingsState> loadSettings() async {
    final prefs = await SharedPreferences.getInstance();

    // Load widget visibility
    final visibility = DashboardWidgetVisibility(
      showPipeline: prefs.getBool('${_keyPrefix}show_pipeline') ?? true,
      showMorningBrief: prefs.getBool('${_keyPrefix}show_morning_brief') ?? true,
      showIrisRank: prefs.getBool('${_keyPrefix}show_iris_rank') ?? true,
      showQuickStats: prefs.getBool('${_keyPrefix}show_quick_stats') ?? true,
      showRecentActivity: prefs.getBool('${_keyPrefix}show_recent_activity') ?? true,
      showUpcomingMeetings: prefs.getBool('${_keyPrefix}show_upcoming_meetings') ?? true,
      showTopDeals: prefs.getBool('${_keyPrefix}show_top_deals') ?? true,
      showAiInsights: prefs.getBool('${_keyPrefix}show_ai_insights') ?? true,
    );

    // Load quick stats
    final statsString = prefs.getStringList('${_keyPrefix}quick_stats');
    final selectedStats = statsString != null
        ? statsString
            .map((s) => QuickStatType.values.firstWhere(
                  (e) => e.name == s,
                  orElse: () => QuickStatType.calls,
                ))
            .toList()
        : [QuickStatType.calls, QuickStatType.meetings, QuickStatType.tasks, QuickStatType.leads];

    // Load phone layout settings
    final statsLayoutString = prefs.getString('${_keyPrefix}phone_stats_layout');
    final phoneStatsLayout = statsLayoutString != null
        ? StatsLayout.values.firstWhere((e) => e.name == statsLayoutString, orElse: () => StatsLayout.row)
        : StatsLayout.row;

    final insightsStyleString = prefs.getString('${_keyPrefix}phone_insights_style');
    final phoneInsightsStyle = insightsStyleString != null
        ? InsightsStyle.values.firstWhere((e) => e.name == insightsStyleString, orElse: () => InsightsStyle.carousel)
        : InsightsStyle.carousel;

    // Load tablet layout settings
    final themeString = prefs.getString('${_keyPrefix}theme');
    final theme = themeString != null
        ? DashboardTheme.values.firstWhere((e) => e.name == themeString, orElse: () => DashboardTheme.defaultTheme)
        : DashboardTheme.defaultTheme;

    return DashboardSettingsState(
      widgetVisibility: visibility,
      selectedQuickStats: selectedStats,
      phoneStatsLayout: phoneStatsLayout,
      phoneInsightsStyle: phoneInsightsStyle,
      phoneActivityLimit: prefs.getInt('${_keyPrefix}phone_activity_limit') ?? 5,
      tabletStatsColumns: prefs.getInt('${_keyPrefix}tablet_stats_columns') ?? 3,
      tabletShowDualColumn: prefs.getBool('${_keyPrefix}tablet_show_dual_column') ?? true,
      tabletPanelRatio: prefs.getDouble('${_keyPrefix}tablet_panel_ratio') ?? 0.4,
      theme: theme,
    );
  }

  Future<void> saveSettings(DashboardSettingsState settings) async {
    final prefs = await SharedPreferences.getInstance();

    // Save widget visibility
    await prefs.setBool('${_keyPrefix}show_pipeline', settings.widgetVisibility.showPipeline);
    await prefs.setBool('${_keyPrefix}show_morning_brief', settings.widgetVisibility.showMorningBrief);
    await prefs.setBool('${_keyPrefix}show_iris_rank', settings.widgetVisibility.showIrisRank);
    await prefs.setBool('${_keyPrefix}show_quick_stats', settings.widgetVisibility.showQuickStats);
    await prefs.setBool('${_keyPrefix}show_recent_activity', settings.widgetVisibility.showRecentActivity);
    await prefs.setBool('${_keyPrefix}show_upcoming_meetings', settings.widgetVisibility.showUpcomingMeetings);
    await prefs.setBool('${_keyPrefix}show_top_deals', settings.widgetVisibility.showTopDeals);
    await prefs.setBool('${_keyPrefix}show_ai_insights', settings.widgetVisibility.showAiInsights);

    // Save quick stats
    await prefs.setStringList('${_keyPrefix}quick_stats', settings.selectedQuickStats.map((e) => e.name).toList());

    // Save phone layout settings
    await prefs.setString('${_keyPrefix}phone_stats_layout', settings.phoneStatsLayout.name);
    await prefs.setString('${_keyPrefix}phone_insights_style', settings.phoneInsightsStyle.name);
    await prefs.setInt('${_keyPrefix}phone_activity_limit', settings.phoneActivityLimit);

    // Save tablet layout settings
    await prefs.setInt('${_keyPrefix}tablet_stats_columns', settings.tabletStatsColumns);
    await prefs.setBool('${_keyPrefix}tablet_show_dual_column', settings.tabletShowDualColumn);
    await prefs.setDouble('${_keyPrefix}tablet_panel_ratio', settings.tabletPanelRatio);

    // Save theme
    await prefs.setString('${_keyPrefix}theme', settings.theme.name);
  }

  Future<void> resetToDefaults() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((k) => k.startsWith(_keyPrefix));
    for (final key in keys) {
      await prefs.remove(key);
    }
  }
}

// ============================================================
// PROVIDERS
// ============================================================

final dashboardSettingsServiceProvider = Provider<DashboardSettingsService>((ref) {
  return DashboardSettingsService();
});

final dashboardSettingsProvider = NotifierProvider<DashboardSettingsNotifier, DashboardSettingsState>(
  DashboardSettingsNotifier.new,
);

/// Notifier for dashboard settings page state management.
class DashboardSettingsNotifier extends Notifier<DashboardSettingsState> {
  late final DashboardSettingsService _service;

  @override
  DashboardSettingsState build() {
    _service = ref.watch(dashboardSettingsServiceProvider);
    _loadSettings();
    return const DashboardSettingsState();
  }

  Future<void> _loadSettings() async {
    state = await _service.loadSettings();
  }

  Future<void> updateWidgetVisibility(DashboardWidgetVisibility visibility) async {
    state = state.copyWith(widgetVisibility: visibility);
    await _service.saveSettings(state);
  }

  Future<void> updateQuickStats(List<QuickStatType> stats) async {
    state = state.copyWith(selectedQuickStats: stats);
    await _service.saveSettings(state);
  }

  Future<void> updatePhoneStatsLayout(StatsLayout layout) async {
    state = state.copyWith(phoneStatsLayout: layout);
    await _service.saveSettings(state);
  }

  Future<void> updatePhoneInsightsStyle(InsightsStyle style) async {
    state = state.copyWith(phoneInsightsStyle: style);
    await _service.saveSettings(state);
  }

  Future<void> updatePhoneActivityLimit(int limit) async {
    state = state.copyWith(phoneActivityLimit: limit);
    await _service.saveSettings(state);
  }

  Future<void> updateTabletStatsColumns(int columns) async {
    state = state.copyWith(tabletStatsColumns: columns);
    await _service.saveSettings(state);
  }

  Future<void> updateTabletShowDualColumn(bool show) async {
    state = state.copyWith(tabletShowDualColumn: show);
    await _service.saveSettings(state);
  }

  Future<void> updateTabletPanelRatio(double ratio) async {
    state = state.copyWith(tabletPanelRatio: ratio);
    await _service.saveSettings(state);
  }

  Future<void> updateTheme(DashboardTheme theme) async {
    state = state.copyWith(theme: theme);
    await _service.saveSettings(state);
  }

  Future<void> resetToDefaults() async {
    await _service.resetToDefaults();
    state = DashboardSettingsState.defaultState;
  }
}

// ============================================================
// DASHBOARD SETTINGS PAGE
// ============================================================

class DashboardSettingsPage extends ConsumerStatefulWidget {
  const DashboardSettingsPage({super.key});

  @override
  ConsumerState<DashboardSettingsPage> createState() => _DashboardSettingsPageState();
}

class _DashboardSettingsPageState extends ConsumerState<DashboardSettingsPage> {
  @override
  Widget build(BuildContext context) {
    // Watch the core dashboard config provider (this is what the dashboard uses)
    final coreConfig = ref.watch(dashboardConfigProvider);
    final coreNotifier = ref.read(dashboardConfigProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
          onPressed: () {
            HapticFeedback.lightImpact();
            context.pop();
          },
        ),
        title: Text(
          'Dashboard Settings',
          style: IrisTheme.titleLarge.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
      ),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Section 1: Widget Visibility (uses core config provider)
                  _buildSectionHeader('Widget Visibility', isDark)
                      .animate()
                      .fadeIn(duration: 300.ms),
                  const SizedBox(height: 12),
                  _buildWidgetVisibilitySection(coreConfig, coreNotifier, isDark)
                      .animate(delay: 50.ms)
                      .fadeIn()
                      .slideY(begin: 0.1),

                  const SizedBox(height: 28),

                  // Section 2: Quick Stats (uses core config)
                  _buildSectionHeader('Quick Stats', isDark)
                      .animate(delay: 100.ms)
                      .fadeIn(),
                  const SizedBox(height: 8),
                  Text(
                    'Select 4 stats to display',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ).animate(delay: 100.ms).fadeIn(),
                  const SizedBox(height: 12),
                  _buildQuickStatsSection(coreConfig, coreNotifier, isDark)
                      .animate(delay: 150.ms)
                      .fadeIn()
                      .slideY(begin: 0.1),

                  const SizedBox(height: 28),

                  // Section 3: Phone Layout (uses core config)
                  _buildSectionHeader('Phone Layout', isDark)
                      .animate(delay: 200.ms)
                      .fadeIn(),
                  const SizedBox(height: 12),
                  _buildPhoneLayoutSection(coreConfig, coreNotifier, isDark)
                      .animate(delay: 250.ms)
                      .fadeIn()
                      .slideY(begin: 0.1),

                  const SizedBox(height: 28),

                  // Section 4: Tablet Layout (uses core config)
                  _buildSectionHeader('Tablet Layout', isDark)
                      .animate(delay: 300.ms)
                      .fadeIn(),
                  const SizedBox(height: 12),
                  _buildTabletLayoutSection(coreConfig, coreNotifier, isDark)
                      .animate(delay: 350.ms)
                      .fadeIn()
                      .slideY(begin: 0.1),

                  const SizedBox(height: 28),

                  // Section 5: Theme (uses core config)
                  _buildSectionHeader('Theme', isDark)
                      .animate(delay: 400.ms)
                      .fadeIn(),
                  const SizedBox(height: 12),
                  _buildThemeSection(coreConfig, coreNotifier, isDark)
                      .animate(delay: 450.ms)
                      .fadeIn()
                      .slideY(begin: 0.1),

                  const SizedBox(height: 32),

                  // Reset to Defaults Button
                  _buildResetButton(coreNotifier, isDark)
                      .animate(delay: 500.ms)
                      .fadeIn()
                      .slideY(begin: 0.1),

                  const SizedBox(height: 40),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Text(
      title,
      style: IrisTheme.titleSmall.copyWith(
        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildWidgetVisibilitySection(
    DashboardConfig coreConfig,
    DashboardConfigNotifier coreNotifier,
    bool isDark,
  ) {
    // Use the core config's widget visibility settings
    final widgets = coreConfig.widgets;

    final widgetOptions = [
      _WidgetOption(
        title: 'Pipeline Overview',
        subtitle: 'Sales pipeline visualization',
        icon: Iconsax.chart,
        value: widgets.pipelineSummary,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('pipelineSummary', v);
        },
      ),
      _WidgetOption(
        title: 'Morning Brief',
        subtitle: 'Daily AI-generated summary',
        icon: Iconsax.sun_1,
        value: widgets.morningBrief,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('morningBrief', v);
        },
      ),
      _WidgetOption(
        title: 'SalesOS Rank',
        subtitle: 'Your performance score',
        icon: Iconsax.ranking_1,
        value: widgets.irisRank,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('irisRank', v);
        },
      ),
      _WidgetOption(
        title: "Today's Focus",
        subtitle: 'Key metrics at a glance',
        icon: Iconsax.status_up,
        value: widgets.todaysFocus,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('todaysFocus', v);
        },
      ),
      _WidgetOption(
        title: 'Recent Activity',
        subtitle: 'Latest CRM activities',
        icon: Iconsax.activity,
        value: widgets.recentActivity,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('recentActivity', v);
        },
      ),
      _WidgetOption(
        title: 'AI Insights',
        subtitle: 'Smart recommendations',
        icon: Iconsax.magic_star,
        value: widgets.aiInsights,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('aiInsights', v);
        },
      ),
      _WidgetOption(
        title: 'CRM Mode Indicator',
        subtitle: 'Show data source badge',
        icon: Iconsax.cloud,
        value: widgets.crmModeIndicator,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('crmModeIndicator', v);
        },
      ),
      _WidgetOption(
        title: 'Sales Performance Chart',
        subtitle: 'Pipeline funnel & revenue trends',
        icon: Iconsax.chart_2,
        value: widgets.salesPerformanceChart,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          coreNotifier.toggleWidget('salesPerformanceChart', v);
        },
      ),
    ];

    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: widgetOptions.asMap().entries.map((entry) {
          final index = entry.key;
          final widget = entry.value;
          return _buildSwitchTile(
            title: widget.title,
            subtitle: widget.subtitle,
            icon: widget.icon,
            value: widget.value,
            onChanged: widget.onChanged,
            isDark: isDark,
            showDivider: index < widgetOptions.length - 1,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
    required bool isDark,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: LuxuryColors.rolexGreen,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: value,
                onChanged: onChanged,
                activeTrackColor: LuxuryColors.rolexGreen,
                thumbColor: WidgetStateProperty.resolveWith((states) =>
                    states.contains(WidgetState.selected) ? Colors.white : null),
              ),
            ],
          ),
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 70,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
      ],
    );
  }

  Widget _buildQuickStatsSection(
    DashboardConfig coreConfig,
    DashboardConfigNotifier coreNotifier,
    bool isDark,
  ) {
    // Use core config's quickStats list
    final selectedStats = coreConfig.quickStats;

    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: QuickStatType.values.map((stat) {
          final statName = stat.name;
          final isSelected = selectedStats.contains(statName);
          final canSelect = selectedStats.length < 4 || isSelected;

          return FilterChip(
            label: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  stat.icon,
                  size: 16,
                  color: isSelected
                      ? LuxuryColors.rolexGreen
                      : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                ),
                const SizedBox(width: 6),
                Text(stat.displayName),
              ],
            ),
            selected: isSelected,
            onSelected: canSelect
                ? (selected) {
                    HapticFeedback.selectionClick();
                    final newStats = List<String>.from(selectedStats);
                    if (selected) {
                      if (newStats.length < 4) {
                        newStats.add(statName);
                      }
                    } else {
                      newStats.remove(statName);
                    }
                    coreNotifier.updateQuickStats(newStats);
                  }
                : null,
            selectedColor: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
            checkmarkColor: LuxuryColors.rolexGreen,
            labelStyle: IrisTheme.labelMedium.copyWith(
              color: isSelected
                  ? LuxuryColors.rolexGreen
                  : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
            backgroundColor: isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated,
            side: BorderSide(
              color: isSelected ? LuxuryColors.rolexGreen : Colors.transparent,
              width: 1,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPhoneLayoutSection(
    DashboardConfig coreConfig,
    DashboardConfigNotifier coreNotifier,
    bool isDark,
  ) {
    final phoneLayout = coreConfig.layout.phone;

    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats Layout
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Stats Layout',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: StatsLayout.values.map((layout) {
                    final isSelected = phoneLayout.statsLayout == layout.name;
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          right: layout != StatsLayout.values.last ? 8 : 0,
                        ),
                        child: _buildRadioOption(
                          label: layout.displayName,
                          isSelected: isSelected,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            coreNotifier.updatePhoneLayout(
                              phoneLayout.copyWith(statsLayout: layout.name),
                            );
                          },
                          isDark: isDark,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),

          // Insights Style
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Insights Style',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: InsightsStyle.values.map((style) {
                    final isSelected = phoneLayout.insightsStyle == style.name;
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          right: style != InsightsStyle.values.last ? 8 : 0,
                        ),
                        child: _buildRadioOption(
                          label: style.displayName,
                          isSelected: isSelected,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            coreNotifier.updatePhoneLayout(
                              phoneLayout.copyWith(insightsStyle: style.name),
                            );
                          },
                          isDark: isDark,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),

          // Activity Limit Slider
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Activity Limit',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '${phoneLayout.activityLimit} items',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: LuxuryColors.rolexGreen,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: LuxuryColors.rolexGreen,
                    inactiveTrackColor: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                    thumbColor: LuxuryColors.rolexGreen,
                    overlayColor: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  ),
                  child: Slider(
                    value: phoneLayout.activityLimit.toDouble(),
                    min: 3,
                    max: 15,
                    divisions: 12,
                    onChanged: (value) {
                      HapticFeedback.selectionClick();
                      coreNotifier.updatePhoneLayout(
                        phoneLayout.copyWith(activityLimit: value.round()),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRadioOption({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
              : (isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? LuxuryColors.rolexGreen : Colors.transparent,
            width: 1,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: IrisTheme.labelMedium.copyWith(
              color: isSelected
                  ? LuxuryColors.rolexGreen
                  : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabletLayoutSection(
    DashboardConfig coreConfig,
    DashboardConfigNotifier coreNotifier,
    bool isDark,
  ) {
    final tabletLayout = coreConfig.layout.tablet;

    return IrisCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats Columns Dropdown
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Stats Columns',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      'Number of stat columns on tablet',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    ),
                  ),
                  child: DropdownButton<int>(
                    value: tabletLayout.statsColumns,
                    underline: const SizedBox(),
                    isDense: true,
                    dropdownColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    items: [2, 3, 4].map((count) {
                      return DropdownMenuItem<int>(
                        value: count,
                        child: Text(
                          '$count',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        HapticFeedback.selectionClick();
                        coreNotifier.updateTabletLayout(
                          tabletLayout.copyWith(statsColumns: value),
                        );
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),

          // Dual Column Switch
          _buildSwitchTile(
            title: 'Dual Column Layout',
            subtitle: 'Show side-by-side panels on tablet',
            icon: Iconsax.grid_1,
            value: tabletLayout.showDualColumn,
            onChanged: (v) {
              HapticFeedback.selectionClick();
              coreNotifier.updateTabletLayout(
                tabletLayout.copyWith(showDualColumn: v),
              );
            },
            isDark: isDark,
            showDivider: true,
          ),

          // Panel Ratio Slider
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Panel Ratio',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '${(tabletLayout.panelRatio * 100).round()}%',
                      style: IrisTheme.bodyMedium.copyWith(
                        color: LuxuryColors.rolexGreen,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Text(
                  'Left panel width ratio',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: LuxuryColors.rolexGreen,
                    inactiveTrackColor: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                    thumbColor: LuxuryColors.rolexGreen,
                    overlayColor: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  ),
                  child: Slider(
                    value: tabletLayout.panelRatio,
                    min: 0.25,
                    max: 0.5,
                    divisions: 5,
                    onChanged: tabletLayout.showDualColumn
                        ? (value) {
                            HapticFeedback.selectionClick();
                            coreNotifier.updateTabletLayout(
                              tabletLayout.copyWith(panelRatio: value),
                            );
                          }
                        : null,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeSection(
    DashboardConfig coreConfig,
    DashboardConfigNotifier coreNotifier,
    bool isDark,
  ) {
    // Map string theme to enum
    final currentTheme = DashboardTheme.values.firstWhere(
      (t) => t.name == coreConfig.dashboardTheme ||
             (t == DashboardTheme.defaultTheme && coreConfig.dashboardTheme == 'luxury'),
      orElse: () => DashboardTheme.defaultTheme,
    );

    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SegmentedButton<DashboardTheme>(
            segments: DashboardTheme.values.map((theme) {
              return ButtonSegment<DashboardTheme>(
                value: theme,
                label: Text(theme.displayName),
              );
            }).toList(),
            selected: {currentTheme},
            onSelectionChanged: (selection) {
              HapticFeedback.selectionClick();
              final themeName = selection.first == DashboardTheme.defaultTheme
                  ? 'luxury'
                  : selection.first.name;
              coreNotifier.updateTheme(themeName);
            },
            style: ButtonStyle(
              backgroundColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return LuxuryColors.rolexGreen.withValues(alpha: 0.15);
                }
                return isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated;
              }),
              foregroundColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return LuxuryColors.rolexGreen;
                }
                return isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary;
              }),
              side: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return const BorderSide(color: LuxuryColors.rolexGreen);
                }
                return BorderSide(
                  color: isDark
                      ? LuxuryColors.rolexGreen.withValues(alpha: 0.3)
                      : LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                );
              }),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            currentTheme.description,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResetButton(DashboardConfigNotifier notifier, bool isDark) {
    return IrisButton(
      label: 'Reset to Defaults',
      variant: IrisButtonVariant.outline,
      icon: Iconsax.refresh,
      isFullWidth: true,
      onPressed: () async {
        HapticFeedback.mediumImpact();
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            title: Text(
              'Reset Dashboard Settings?',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
            content: Text(
              'This will reset all dashboard customizations to their default values.',
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(
                  'Cancel',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text(
                  'Reset',
                  style: IrisTheme.labelMedium.copyWith(
                    color: LuxuryColors.rolexGreen,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        );

        if (confirmed == true) {
          await notifier.resetToDefaults();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Dashboard settings reset to defaults',
                  style: IrisTheme.bodyMedium.copyWith(color: Colors.white),
                ),
                backgroundColor: LuxuryColors.rolexGreen,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            );
          }
        }
      },
    );
  }
}

// Helper class for widget options
class _WidgetOption {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;

  _WidgetOption({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.value,
    required this.onChanged,
  });
}
