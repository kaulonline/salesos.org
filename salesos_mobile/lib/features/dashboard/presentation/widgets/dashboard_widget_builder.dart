import 'package:flutter/material.dart';
import '../../../../core/models/dashboard_config.dart';

// Re-export core model classes for convenience
export '../../../../core/models/dashboard_config.dart';

/// Additional widget keys that may be used by builder widgets
/// These extend the core model's widget keys with quickStats support
class BuilderWidgetKeys {
  /// All widget keys including quickStats for the builder
  static const List<String> allKeys = [
    'pipelineSummary',
    'morningBrief',
    'irisRank',
    'todaysFocus',
    'quickStats',
    'aiInsights',
    'recentActivity',
  ];

  /// Default widget order including quickStats
  static const List<String> defaultOrder = [
    'pipelineSummary',
    'morningBrief',
    'irisRank',
    'todaysFocus',
    'quickStats',
    'aiInsights',
    'recentActivity',
  ];
}

/// Extension on DashboardWidgets to add quickStats support for builder
extension BuilderDashboardWidgetsExtension on DashboardWidgets {
  /// Returns true if the widget with the given key is enabled.
  /// Extends the core isEnabled() to support 'quickStats' key.
  bool isBuilderWidgetEnabled(String key) {
    // Handle quickStats specially - default to true
    if (key == 'quickStats') {
      return true;
    }
    return isEnabled(key);
  }
}

/// A widget builder that conditionally renders dashboard widgets based on configuration
///
/// Returns the [child] only if the widget specified by [widgetKey] is enabled
/// in [config.widgets], otherwise returns [placeholder] or [SizedBox.shrink()]
class DashboardWidgetBuilder extends StatelessWidget {
  /// Dashboard configuration containing widget visibility settings
  final DashboardConfig config;

  /// The widget key to check (e.g., 'pipelineSummary', 'morningBrief')
  final String widgetKey;

  /// The widget to render if enabled
  final Widget child;

  /// Optional placeholder to show when the widget is disabled
  /// If not provided, [SizedBox.shrink()] is used
  final Widget? placeholder;

  const DashboardWidgetBuilder({
    super.key,
    required this.config,
    required this.widgetKey,
    required this.child,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    if (config.widgets.isBuilderWidgetEnabled(widgetKey)) {
      return child;
    }
    return placeholder ?? const SizedBox.shrink();
  }
}

/// A widget that renders dashboard widgets in the order specified by configuration
///
/// Takes a [widgetMap] that maps widget keys to their corresponding widgets,
/// and renders them in the order specified by [config.widgetOrder],
/// filtering out disabled widgets
class OrderedDashboardWidgets extends StatelessWidget {
  /// Dashboard configuration containing widget order and visibility settings
  final DashboardConfig config;

  /// Map of widget keys to their corresponding widgets
  final Map<String, Widget> widgetMap;

  /// Optional spacing between widgets
  final double spacing;

  /// Whether to wrap widgets in a Column (true) or return as a List
  final bool useColumn;

  /// Main axis alignment when using Column
  final MainAxisAlignment mainAxisAlignment;

  /// Cross axis alignment when using Column
  final CrossAxisAlignment crossAxisAlignment;

  const OrderedDashboardWidgets({
    super.key,
    required this.config,
    required this.widgetMap,
    this.spacing = 0,
    this.useColumn = true,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.crossAxisAlignment = CrossAxisAlignment.stretch,
  });

  /// Gets the ordered list of enabled widgets
  List<Widget> get orderedWidgets {
    final widgets = <Widget>[];

    for (final key in config.widgetOrder) {
      // Skip if widget is not enabled
      if (!config.widgets.isBuilderWidgetEnabled(key)) continue;

      // Skip if widget is not in the map
      final widget = widgetMap[key];
      if (widget == null) continue;

      // Add spacing between widgets
      if (widgets.isNotEmpty && spacing > 0) {
        widgets.add(SizedBox(height: spacing));
      }

      widgets.add(widget);
    }

    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    final widgets = orderedWidgets;

    if (!useColumn) {
      // Return first widget or empty if used outside Column context
      return widgets.isNotEmpty ? widgets.first : const SizedBox.shrink();
    }

    return Column(
      mainAxisAlignment: mainAxisAlignment,
      crossAxisAlignment: crossAxisAlignment,
      mainAxisSize: MainAxisSize.min,
      children: widgets,
    );
  }
}

/// A SliverList variant for ordered dashboard widgets
class OrderedDashboardSliverList extends StatelessWidget {
  /// Dashboard configuration containing widget order and visibility settings
  final DashboardConfig config;

  /// Map of widget keys to their corresponding widgets
  final Map<String, Widget> widgetMap;

  const OrderedDashboardSliverList({
    super.key,
    required this.config,
    required this.widgetMap,
  });

  @override
  Widget build(BuildContext context) {
    final orderedKeys = config.widgetOrder
        .where((key) => config.widgets.isBuilderWidgetEnabled(key) && widgetMap.containsKey(key))
        .toList();

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final key = orderedKeys[index];
          return widgetMap[key];
        },
        childCount: orderedKeys.length,
      ),
    );
  }
}
