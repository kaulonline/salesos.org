
// Dashboard configuration models for IRIS mobile app.
// Provides structured configuration for dashboard widgets, layouts, and themes.

/// Configuration for which dashboard widgets are visible.
class DashboardWidgets {
  final bool pipelineSummary;
  final bool morningBrief;
  final bool irisRank;
  final bool todaysFocus;
  final bool aiInsights;
  final bool recentActivity;
  final bool crmModeIndicator;
  final bool salesPerformanceChart;

  const DashboardWidgets({
    this.pipelineSummary = true,
    this.morningBrief = true,
    this.irisRank = true,
    this.todaysFocus = true,
    this.aiInsights = true,
    this.recentActivity = true,
    this.crmModeIndicator = true,
    this.salesPerformanceChart = true,
  });

  DashboardWidgets copyWith({
    bool? pipelineSummary,
    bool? morningBrief,
    bool? irisRank,
    bool? todaysFocus,
    bool? aiInsights,
    bool? recentActivity,
    bool? crmModeIndicator,
    bool? salesPerformanceChart,
  }) {
    return DashboardWidgets(
      pipelineSummary: pipelineSummary ?? this.pipelineSummary,
      morningBrief: morningBrief ?? this.morningBrief,
      irisRank: irisRank ?? this.irisRank,
      todaysFocus: todaysFocus ?? this.todaysFocus,
      aiInsights: aiInsights ?? this.aiInsights,
      recentActivity: recentActivity ?? this.recentActivity,
      crmModeIndicator: crmModeIndicator ?? this.crmModeIndicator,
      salesPerformanceChart: salesPerformanceChart ?? this.salesPerformanceChart,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pipelineSummary': pipelineSummary,
      'morningBrief': morningBrief,
      'irisRank': irisRank,
      'todaysFocus': todaysFocus,
      'aiInsights': aiInsights,
      'recentActivity': recentActivity,
      'crmModeIndicator': crmModeIndicator,
      'salesPerformanceChart': salesPerformanceChart,
    };
  }

  factory DashboardWidgets.fromJson(Map<String, dynamic> json) {
    return DashboardWidgets(
      pipelineSummary: json['pipelineSummary'] as bool? ?? true,
      morningBrief: json['morningBrief'] as bool? ?? true,
      irisRank: json['irisRank'] as bool? ?? true,
      todaysFocus: json['todaysFocus'] as bool? ?? true,
      aiInsights: json['aiInsights'] as bool? ?? true,
      recentActivity: json['recentActivity'] as bool? ?? true,
      crmModeIndicator: json['crmModeIndicator'] as bool? ?? true,
      salesPerformanceChart: json['salesPerformanceChart'] as bool? ?? true,
    );
  }
}

/// Configuration for which dashboard sections are collapsed.
class CollapsedSections {
  final bool morningBrief;
  final bool irisRank;

  const CollapsedSections({
    this.morningBrief = false,
    this.irisRank = false,
  });

  CollapsedSections copyWith({
    bool? morningBrief,
    bool? irisRank,
  }) {
    return CollapsedSections(
      morningBrief: morningBrief ?? this.morningBrief,
      irisRank: irisRank ?? this.irisRank,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'morningBrief': morningBrief,
      'irisRank': irisRank,
    };
  }

  factory CollapsedSections.fromJson(Map<String, dynamic> json) {
    return CollapsedSections(
      morningBrief: json['morningBrief'] as bool? ?? false,
      irisRank: json['irisRank'] as bool? ?? false,
    );
  }
}

/// Layout configuration specific to phone form factor.
class PhoneLayoutConfig {
  /// Layout style for stats display: 'row' | 'grid' | 'carousel'
  final String statsLayout;

  /// Style for AI insights display: 'carousel' | 'list' | 'cards'
  final String insightsStyle;

  /// Maximum number of activity items to display
  final int activityLimit;

  const PhoneLayoutConfig({
    this.statsLayout = 'row',
    this.insightsStyle = 'carousel',
    this.activityLimit = 5,
  });

  PhoneLayoutConfig copyWith({
    String? statsLayout,
    String? insightsStyle,
    int? activityLimit,
  }) {
    return PhoneLayoutConfig(
      statsLayout: statsLayout ?? this.statsLayout,
      insightsStyle: insightsStyle ?? this.insightsStyle,
      activityLimit: activityLimit ?? this.activityLimit,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'statsLayout': statsLayout,
      'insightsStyle': insightsStyle,
      'activityLimit': activityLimit,
    };
  }

  factory PhoneLayoutConfig.fromJson(Map<String, dynamic> json) {
    return PhoneLayoutConfig(
      statsLayout: json['statsLayout'] as String? ?? 'row',
      insightsStyle: json['insightsStyle'] as String? ?? 'carousel',
      activityLimit: json['activityLimit'] as int? ?? 5,
    );
  }
}

/// Layout configuration specific to tablet form factor.
class TabletLayoutConfig {
  /// Number of columns for stats grid display
  final int statsColumns;

  /// Whether to show dual column layout
  final bool showDualColumn;

  /// Ratio of left panel width (0.0 to 1.0)
  final double panelRatio;

  const TabletLayoutConfig({
    this.statsColumns = 4,
    this.showDualColumn = true,
    this.panelRatio = 0.38,
  });

  TabletLayoutConfig copyWith({
    int? statsColumns,
    bool? showDualColumn,
    double? panelRatio,
  }) {
    return TabletLayoutConfig(
      statsColumns: statsColumns ?? this.statsColumns,
      showDualColumn: showDualColumn ?? this.showDualColumn,
      panelRatio: panelRatio ?? this.panelRatio,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'statsColumns': statsColumns,
      'showDualColumn': showDualColumn,
      'panelRatio': panelRatio,
    };
  }

  factory TabletLayoutConfig.fromJson(Map<String, dynamic> json) {
    return TabletLayoutConfig(
      statsColumns: json['statsColumns'] as int? ?? 4,
      showDualColumn: json['showDualColumn'] as bool? ?? true,
      panelRatio: json['panelRatio'] as double? ?? 0.38,
    );
  }
}

/// Combined layout configuration for phone and tablet form factors.
class DashboardLayout {
  final PhoneLayoutConfig phone;
  final TabletLayoutConfig tablet;

  const DashboardLayout({
    this.phone = const PhoneLayoutConfig(),
    this.tablet = const TabletLayoutConfig(),
  });

  DashboardLayout copyWith({
    PhoneLayoutConfig? phone,
    TabletLayoutConfig? tablet,
  }) {
    return DashboardLayout(
      phone: phone ?? this.phone,
      tablet: tablet ?? this.tablet,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'phone': phone.toJson(),
      'tablet': tablet.toJson(),
    };
  }

  factory DashboardLayout.fromJson(Map<String, dynamic> json) {
    return DashboardLayout(
      phone: json['phone'] != null
          ? PhoneLayoutConfig.fromJson(json['phone'] as Map<String, dynamic>)
          : const PhoneLayoutConfig(),
      tablet: json['tablet'] != null
          ? TabletLayoutConfig.fromJson(json['tablet'] as Map<String, dynamic>)
          : const TabletLayoutConfig(),
    );
  }
}

/// Complete dashboard configuration model.
/// Contains all settings for customizing the dashboard display and behavior.
class DashboardConfig {
  /// Widget visibility settings
  final DashboardWidgets widgets;

  /// Section collapsed states
  final CollapsedSections collapsedSections;

  /// Layout configurations for different form factors
  final DashboardLayout layout;

  /// Ordered list of widget identifiers for custom arrangement
  final List<String> widgetOrder;

  /// List of quick stat identifiers to display
  final List<String> quickStats;

  /// Theme identifier for dashboard styling: 'luxury' | 'minimal' | 'classic'
  final String dashboardTheme;

  const DashboardConfig({
    this.widgets = const DashboardWidgets(),
    this.collapsedSections = const CollapsedSections(),
    this.layout = const DashboardLayout(),
    this.widgetOrder = const [
      'pipelineSummary',
      'morningBrief',
      'irisRank',
      'todaysFocus',
      'aiInsights',
      'recentActivity',
    ],
    this.quickStats = const [
      'calls',
      'meetings',
      'tasks',
      'leads',
    ],
    this.dashboardTheme = 'luxury',
  });

  /// Returns the default dashboard configuration.
  static DashboardConfig get defaultConfig => const DashboardConfig();

  DashboardConfig copyWith({
    DashboardWidgets? widgets,
    CollapsedSections? collapsedSections,
    DashboardLayout? layout,
    List<String>? widgetOrder,
    List<String>? quickStats,
    String? dashboardTheme,
  }) {
    return DashboardConfig(
      widgets: widgets ?? this.widgets,
      collapsedSections: collapsedSections ?? this.collapsedSections,
      layout: layout ?? this.layout,
      widgetOrder: widgetOrder ?? this.widgetOrder,
      quickStats: quickStats ?? this.quickStats,
      dashboardTheme: dashboardTheme ?? this.dashboardTheme,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'widgets': widgets.toJson(),
      'collapsedSections': collapsedSections.toJson(),
      'layout': layout.toJson(),
      'widgetOrder': widgetOrder,
      'quickStats': quickStats,
      'dashboardTheme': dashboardTheme,
    };
  }

  factory DashboardConfig.fromJson(Map<String, dynamic> json) {
    return DashboardConfig(
      widgets: json['widgets'] != null
          ? DashboardWidgets.fromJson(json['widgets'] as Map<String, dynamic>)
          : const DashboardWidgets(),
      collapsedSections: json['collapsedSections'] != null
          ? CollapsedSections.fromJson(
              json['collapsedSections'] as Map<String, dynamic>)
          : const CollapsedSections(),
      layout: json['layout'] != null
          ? DashboardLayout.fromJson(json['layout'] as Map<String, dynamic>)
          : const DashboardLayout(),
      widgetOrder: json['widgetOrder'] != null
          ? List<String>.from(json['widgetOrder'] as List)
          : const [
              'pipelineSummary',
              'morningBrief',
              'irisRank',
              'todaysFocus',
              'aiInsights',
              'recentActivity',
            ],
      quickStats: json['quickStats'] != null
          ? List<String>.from(json['quickStats'] as List)
          : const [
              'calls',
              'meetings',
              'tasks',
              'leads',
            ],
      dashboardTheme: json['dashboardTheme'] as String? ?? 'luxury',
    );
  }
}

/// Extension on DashboardWidgets for convenience methods
extension DashboardWidgetsExtension on DashboardWidgets {
  /// All available widget keys
  static const List<String> allWidgetKeys = [
    'pipelineSummary',
    'morningBrief',
    'irisRank',
    'todaysFocus',
    'aiInsights',
    'recentActivity',
    'crmModeIndicator',
    'salesPerformanceChart',
  ];

  /// Default widget order
  static const List<String> defaultOrder = [
    'pipelineSummary',
    'salesPerformanceChart',
    'morningBrief',
    'irisRank',
    'todaysFocus',
    'aiInsights',
    'recentActivity',
  ];

  /// Returns true if the widget with the given key is enabled
  bool isEnabled(String key) {
    switch (key) {
      case 'pipelineSummary':
        return pipelineSummary;
      case 'morningBrief':
        return morningBrief;
      case 'irisRank':
        return irisRank;
      case 'todaysFocus':
        return todaysFocus;
      case 'aiInsights':
        return aiInsights;
      case 'recentActivity':
        return recentActivity;
      case 'crmModeIndicator':
        return crmModeIndicator;
      case 'salesPerformanceChart':
        return salesPerformanceChart;
      default:
        return false;
    }
  }

  /// Returns a list of enabled widget keys
  List<String> get enabledWidgets {
    return allWidgetKeys.where((key) => isEnabled(key)).toList();
  }

  /// Creates a configuration with all widgets enabled
  static DashboardWidgets allEnabled() {
    return const DashboardWidgets(
      pipelineSummary: true,
      morningBrief: true,
      irisRank: true,
      todaysFocus: true,
      aiInsights: true,
      recentActivity: true,
      crmModeIndicator: true,
      salesPerformanceChart: true,
    );
  }

  /// Creates a configuration with all widgets disabled
  static DashboardWidgets allDisabled() {
    return const DashboardWidgets(
      pipelineSummary: false,
      morningBrief: false,
      irisRank: false,
      todaysFocus: false,
      aiInsights: false,
      recentActivity: false,
      crmModeIndicator: false,
      salesPerformanceChart: false,
    );
  }
}

