import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/dashboard_config.dart';
import '../network/api_client.dart';

/// Dashboard configuration service provider
final dashboardConfigServiceProvider = Provider<DashboardConfigService>((ref) {
  return DashboardConfigService(ref.watch(apiClientProvider));
});

/// Dashboard configuration state provider with notifier
final dashboardConfigProvider =
    NotifierProvider<DashboardConfigNotifier, DashboardConfig>(
        DashboardConfigNotifier.new);

/// Service for managing dashboard configuration with local-first storage and backend sync.
///
/// This service handles:
/// - Loading configuration from SharedPreferences (local-first)
/// - Saving configuration to local storage
/// - Syncing configuration to backend via PATCH /users/me/preferences
/// - Resetting configuration to defaults
class DashboardConfigService {
  final ApiClient _apiClient;

  /// SharedPreferences key for storing dashboard configuration
  static const String _prefsKey = 'iris_dashboard_config';

  DashboardConfigService(this._apiClient);

  /// Load dashboard configuration from SharedPreferences.
  ///
  /// Returns the stored configuration or defaults if not found or invalid.
  Future<DashboardConfig> loadConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_prefsKey);

      if (jsonString == null || jsonString.isEmpty) {
        return DashboardConfig.defaultConfig;
      }

      final jsonMap = jsonDecode(jsonString) as Map<String, dynamic>;
      return DashboardConfig.fromJson(jsonMap);
    } catch (e) {
      return DashboardConfig.defaultConfig;
    }
  }

  /// Save dashboard configuration to SharedPreferences and sync to backend.
  ///
  /// Local storage is primary - backend sync errors are ignored to ensure
  /// offline-first functionality.
  Future<void> saveConfig(DashboardConfig config) async {
    try {
      // Save to local storage first (local-first approach)
      final prefs = await SharedPreferences.getInstance();
      final jsonString = jsonEncode(config.toJson());
      await prefs.setString(_prefsKey, jsonString);

      // Sync to backend with dashboardConfig nested in preferences
      try {
        await _apiClient.patch(
          '/users/me/preferences',
          data: {
            'dashboardConfig': config.toJson(),
          },
        );
      } catch (e) {
        // Ignore sync errors - local storage is primary
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Reset configuration to defaults.
  ///
  /// Clears local storage and syncs empty/default config to backend.
  Future<void> resetToDefaults() async {
    try {
      // Clear local storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefsKey);

      // Sync empty config to backend
      try {
        await _apiClient.patch(
          '/users/me/preferences',
          data: {
            'dashboardConfig': null,
          },
        );
      } catch (e) {
        // Ignore sync errors - local storage is primary
      }
    } catch (e) {
      rethrow;
    }
  }
}

/// Notifier for managing dashboard configuration state with Riverpod.
///
/// Provides methods for updating individual configuration properties
/// while maintaining immutability and automatic persistence.
class DashboardConfigNotifier extends Notifier<DashboardConfig> {
  late final DashboardConfigService _service;

  @override
  DashboardConfig build() {
    _service = ref.watch(dashboardConfigServiceProvider);
    _loadConfig();
    return DashboardConfig.defaultConfig;
  }

  /// Load configuration from service asynchronously
  Future<void> _loadConfig() async {
    state = await _service.loadConfig();
  }

  /// Update widget visibility settings
  Future<void> updateWidgets(DashboardWidgets widgets) async {
    state = state.copyWith(widgets: widgets);
    await _service.saveConfig(state);
  }

  /// Update the order of widgets on the dashboard
  Future<void> updateWidgetOrder(List<String> widgetOrder) async {
    state = state.copyWith(widgetOrder: widgetOrder);
    await _service.saveConfig(state);
  }

  /// Update collapsed sections state
  Future<void> updateCollapsedSections(CollapsedSections collapsedSections) async {
    state = state.copyWith(collapsedSections: collapsedSections);
    await _service.saveConfig(state);
  }

  /// Update phone-specific layout configuration
  Future<void> updatePhoneLayout(PhoneLayoutConfig phoneLayout) async {
    state = state.copyWith(
      layout: state.layout.copyWith(phone: phoneLayout),
    );
    await _service.saveConfig(state);
  }

  /// Update tablet-specific layout configuration
  Future<void> updateTabletLayout(TabletLayoutConfig tabletLayout) async {
    state = state.copyWith(
      layout: state.layout.copyWith(tablet: tabletLayout),
    );
    await _service.saveConfig(state);
  }

  /// Update the list of quick stats to display
  Future<void> updateQuickStats(List<String> quickStats) async {
    state = state.copyWith(quickStats: quickStats);
    await _service.saveConfig(state);
  }

  /// Update the dashboard theme
  Future<void> updateTheme(String theme) async {
    state = state.copyWith(dashboardTheme: theme);
    await _service.saveConfig(state);
  }

  /// Reset all configuration to defaults
  Future<void> resetToDefaults() async {
    await _service.resetToDefaults();
    state = DashboardConfig.defaultConfig;
  }

  /// Toggle a specific widget's visibility
  Future<void> toggleWidget(String widgetId, bool visible) async {
    DashboardWidgets updatedWidgets;

    switch (widgetId) {
      case 'pipelineSummary':
        updatedWidgets = state.widgets.copyWith(pipelineSummary: visible);
        break;
      case 'morningBrief':
        updatedWidgets = state.widgets.copyWith(morningBrief: visible);
        break;
      case 'irisRank':
        updatedWidgets = state.widgets.copyWith(irisRank: visible);
        break;
      case 'todaysFocus':
        updatedWidgets = state.widgets.copyWith(todaysFocus: visible);
        break;
      case 'aiInsights':
        updatedWidgets = state.widgets.copyWith(aiInsights: visible);
        break;
      case 'recentActivity':
        updatedWidgets = state.widgets.copyWith(recentActivity: visible);
        break;
      case 'crmModeIndicator':
        updatedWidgets = state.widgets.copyWith(crmModeIndicator: visible);
        break;
      case 'salesPerformanceChart':
        updatedWidgets = state.widgets.copyWith(salesPerformanceChart: visible);
        break;
      default:
        return;
    }

    await updateWidgets(updatedWidgets);
  }

  /// Toggle a section's collapsed state
  Future<void> toggleSectionCollapsed(String sectionId) async {
    CollapsedSections updatedSections;

    switch (sectionId) {
      case 'morningBrief':
        updatedSections = state.collapsedSections.copyWith(
          morningBrief: !state.collapsedSections.morningBrief,
        );
        break;
      case 'irisRank':
        updatedSections = state.collapsedSections.copyWith(
          irisRank: !state.collapsedSections.irisRank,
        );
        break;
      default:
        return;
    }

    await updateCollapsedSections(updatedSections);
  }

  /// Move a widget to a new position in the order
  Future<void> moveWidget(int oldIndex, int newIndex) async {
    final updatedOrder = List<String>.from(state.widgetOrder);

    if (oldIndex < 0 ||
        oldIndex >= updatedOrder.length ||
        newIndex < 0 ||
        newIndex >= updatedOrder.length) {
      return;
    }

    final widget = updatedOrder.removeAt(oldIndex);
    updatedOrder.insert(newIndex, widget);

    await updateWidgetOrder(updatedOrder);
  }
}
