import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// A single widget item in the widget order list.
/// Used specifically for drag-and-drop reordering UI.
class WidgetOrderItem {
  final String id;
  final String name;
  final IconData icon;
  final bool isEnabled;
  final int order;

  const WidgetOrderItem({
    required this.id,
    required this.name,
    required this.icon,
    required this.isEnabled,
    required this.order,
  });

  WidgetOrderItem copyWith({
    String? id,
    String? name,
    IconData? icon,
    bool? isEnabled,
    int? order,
  }) {
    return WidgetOrderItem(
      id: id ?? this.id,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      isEnabled: isEnabled ?? this.isEnabled,
      order: order ?? this.order,
    );
  }
}

/// State for widget ordering UI.
/// Contains a list of WidgetOrderItems for drag-and-drop reordering.
class WidgetOrderConfig {
  final List<WidgetOrderItem> widgets;

  const WidgetOrderConfig({required this.widgets});

  WidgetOrderConfig copyWith({List<WidgetOrderItem>? widgets}) {
    return WidgetOrderConfig(widgets: widgets ?? this.widgets);
  }

  /// Get enabled widgets sorted by order
  List<WidgetOrderItem> get enabledWidgets {
    return widgets.where((w) => w.isEnabled).toList()
      ..sort((a, b) => a.order.compareTo(b.order));
  }
}

/// Widget display name mapping
const Map<String, String> _widgetDisplayNames = {
  'pipelineSummary': 'Pipeline Summary',
  'morningBrief': 'Morning Brief',
  'irisRank': 'SalesOS Intelligence',
  'todaysFocus': "Today's Focus Stats",
  'aiInsights': 'AI Insights',
  'recentActivity': 'Recent Activity',
  'crmModeIndicator': 'CRM Mode Indicator',
};

/// Widget icon mapping
const Map<String, IconData> _widgetIcons = {
  'pipelineSummary': Iconsax.chart_2,
  'morningBrief': Iconsax.sun_1,
  'irisRank': Iconsax.ranking_1,
  'todaysFocus': Iconsax.task_square,
  'aiInsights': Iconsax.magic_star,
  'recentActivity': Iconsax.activity,
  'crmModeIndicator': Iconsax.data,
};

/// Default widget order
const List<String> _defaultWidgetOrder = [
  'pipelineSummary',
  'morningBrief',
  'irisRank',
  'todaysFocus',
  'aiInsights',
  'recentActivity',
  'crmModeIndicator',
];

/// Widget order notifier for drag-and-drop reordering UI.
/// Manages the order and visibility of dashboard widgets.
class WidgetOrderNotifier extends Notifier<WidgetOrderConfig> {
  static const String _widgetOrderKey = 'iris_dashboard_widget_order';
  static const String _widgetEnabledKey = 'iris_dashboard_widget_enabled';

  @override
  WidgetOrderConfig build() {
    _loadConfig();
    return _createDefaultConfig();
  }

  WidgetOrderConfig _createDefaultConfig() {
    final widgets = _defaultWidgetOrder.asMap().entries.map((entry) {
      final id = entry.value;
      return WidgetOrderItem(
        id: id,
        name: _widgetDisplayNames[id] ?? id,
        icon: _widgetIcons[id] ?? Iconsax.element_3,
        isEnabled: true,
        order: entry.key,
      );
    }).toList();
    return WidgetOrderConfig(widgets: widgets);
  }

  Future<void> _loadConfig() async {
    final prefs = await SharedPreferences.getInstance();

    // Load widget order
    final orderList =
        prefs.getStringList(_widgetOrderKey) ?? _defaultWidgetOrder;

    // Load enabled states
    final enabledMap = <String, bool>{};
    for (final id in _defaultWidgetOrder) {
      enabledMap[id] = prefs.getBool('${_widgetEnabledKey}_$id') ?? true;
    }

    // Build widget configs in order
    final widgets = <WidgetOrderItem>[];
    for (int i = 0; i < orderList.length; i++) {
      final id = orderList[i];
      if (_widgetDisplayNames.containsKey(id)) {
        widgets.add(
          WidgetOrderItem(
            id: id,
            name: _widgetDisplayNames[id]!,
            icon: _widgetIcons[id] ?? Iconsax.element_3,
            isEnabled: enabledMap[id] ?? true,
            order: i,
          ),
        );
      }
    }

    // Add any missing widgets at the end
    for (final id in _defaultWidgetOrder) {
      if (!widgets.any((w) => w.id == id)) {
        widgets.add(
          WidgetOrderItem(
            id: id,
            name: _widgetDisplayNames[id]!,
            icon: _widgetIcons[id] ?? Iconsax.element_3,
            isEnabled: enabledMap[id] ?? true,
            order: widgets.length,
          ),
        );
      }
    }

    state = WidgetOrderConfig(widgets: widgets);
  }

  Future<void> _saveConfig() async {
    final prefs = await SharedPreferences.getInstance();

    // Save widget order
    final orderList = state.widgets.map((w) => w.id).toList();
    await prefs.setStringList(_widgetOrderKey, orderList);

    // Save enabled states
    for (final widget in state.widgets) {
      await prefs.setBool(
        '${_widgetEnabledKey}_${widget.id}',
        widget.isEnabled,
      );
    }
  }

  /// Update widget order after reorder
  Future<void> updateWidgetOrder(int oldIndex, int newIndex) async {
    final widgets = List<WidgetOrderItem>.from(state.widgets);

    // Adjust index if moving down
    if (newIndex > oldIndex) {
      newIndex -= 1;
    }

    final widget = widgets.removeAt(oldIndex);
    widgets.insert(newIndex, widget);

    // Update order values
    final updatedWidgets = widgets.asMap().entries.map((entry) {
      return entry.value.copyWith(order: entry.key);
    }).toList();

    state = state.copyWith(widgets: updatedWidgets);
    await _saveConfig();
  }

  /// Toggle widget visibility
  Future<void> toggleWidgetEnabled(String widgetId) async {
    final widgets = state.widgets.map((w) {
      if (w.id == widgetId) {
        return w.copyWith(isEnabled: !w.isEnabled);
      }
      return w;
    }).toList();

    state = state.copyWith(widgets: widgets);
    await _saveConfig();
  }

  /// Reset to default order
  Future<void> resetToDefault() async {
    state = _createDefaultConfig();
    await _saveConfig();
  }
}

/// Provider for widget ordering state.
/// Used by the DashboardWidgetOrderPage for drag-and-drop reordering.
final widgetOrderProvider =
    NotifierProvider<WidgetOrderNotifier, WidgetOrderConfig>(
      WidgetOrderNotifier.new,
    );

/// Dashboard Widget Order Page
/// Allows users to reorder dashboard widgets via drag-and-drop
class DashboardWidgetOrderPage extends ConsumerStatefulWidget {
  const DashboardWidgetOrderPage({super.key});

  @override
  ConsumerState<DashboardWidgetOrderPage> createState() =>
      _DashboardWidgetOrderPageState();
}

class _DashboardWidgetOrderPageState
    extends ConsumerState<DashboardWidgetOrderPage> {
  bool _isDragging = false;

  @override
  Widget build(BuildContext context) {
    final config = ref.watch(widgetOrderProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Get enabled widgets for display
    final enabledWidgets = config.enabledWidgets;

    return Scaffold(
      backgroundColor: isDark
          ? LuxuryColors.richBlack
          : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Widget Order',
          style: IrisTheme.titleLarge.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              HapticFeedback.mediumImpact();
              await ref.read(widgetOrderProvider.notifier).resetToDefault();
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Reset to default order'),
                  backgroundColor: LuxuryColors.rolexGreen,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              );
            },
            child: Text(
              'Reset',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.jadePremium,
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Instructions
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Text(
                'Drag to reorder widgets on your dashboard',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ).animate().fadeIn(duration: 300.ms),
            ),

            // Reorderable List
            Expanded(
              child: enabledWidgets.isEmpty
                  ? _buildEmptyState(isDark)
                  : ReorderableListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: enabledWidgets.length,
                      proxyDecorator: (child, index, animation) {
                        return AnimatedBuilder(
                          animation: animation,
                          builder: (context, child) {
                            final elevate = Tween<double>(begin: 0, end: 8)
                                .animate(
                                  CurvedAnimation(
                                    parent: animation,
                                    curve: Curves.easeInOut,
                                  ),
                                );
                            return Material(
                              elevation: elevate.value,
                              color: Colors.transparent,
                              shadowColor: LuxuryColors.rolexGreen.withValues(
                                alpha: 0.3,
                              ),
                              borderRadius: BorderRadius.circular(16),
                              child: child,
                            );
                          },
                          child: child,
                        );
                      },
                      onReorderStart: (index) {
                        HapticFeedback.mediumImpact();
                        setState(() => _isDragging = true);
                      },
                      onReorderEnd: (index) {
                        HapticFeedback.lightImpact();
                        setState(() => _isDragging = false);
                      },
                      onReorder: (oldIndex, newIndex) async {
                        HapticFeedback.selectionClick();
                        await ref
                            .read(widgetOrderProvider.notifier)
                            .updateWidgetOrder(oldIndex, newIndex);
                      },
                      itemBuilder: (context, index) {
                        final widget = enabledWidgets[index];
                        return _WidgetOrderItem(
                          key: ValueKey(widget.id),
                          widget: widget,
                          index: index,
                          isDragging: _isDragging,
                          onToggleVisibility: () async {
                            HapticFeedback.selectionClick();
                            await ref
                                .read(widgetOrderProvider.notifier)
                                .toggleWidgetEnabled(widget.id);
                          },
                        );
                      },
                    ),
            ),

            // Disabled widgets section
            if (config.widgets.any((w) => !w.isEnabled)) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  'Hidden Widgets',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  itemCount: config.widgets.where((w) => !w.isEnabled).length,
                  itemBuilder: (context, index) {
                    final widget = config.widgets
                        .where((w) => !w.isEnabled)
                        .toList()[index];
                    return _HiddenWidgetChip(
                      widget: widget,
                      onTap: () async {
                        HapticFeedback.selectionClick();
                        await ref
                            .read(widgetOrderProvider.notifier)
                            .toggleWidgetEnabled(widget.id);
                      },
                    );
                  },
                ),
              ),
            ],

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Iconsax.element_3,
            size: 64,
            color: isDark
                ? IrisTheme.darkTextTertiary
                : IrisTheme.lightTextTertiary,
          ),
          const SizedBox(height: 16),
          Text(
            'No enabled widgets',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Enable widgets from the hidden section below',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Widget order item card
class _WidgetOrderItem extends StatelessWidget {
  final WidgetOrderItem widget;
  final int index;
  final bool isDragging;
  final VoidCallback onToggleVisibility;

  const _WidgetOrderItem({
    super.key,
    required this.widget,
    required this.index,
    required this.isDragging,
    required this.onToggleVisibility,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final Widget luxuryCardWidget = LuxuryCard(
      variant: LuxuryCardVariant.standard,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Drag handle
          ReorderableDragStartListener(
            index: index,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Iconsax.menu,
                size: 20,
                color: LuxuryColors.jadePremium,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Widget icon
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isDark
                  ? LuxuryColors.obsidian
                  : LuxuryColors.cream.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                width: 1,
              ),
            ),
            child: Icon(
              widget.icon,
              size: 20,
              color: LuxuryColors.jadePremium,
            ),
          ),
          const SizedBox(width: 14),

          // Widget name
          Expanded(
            child: Text(
              widget.name,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          // Visibility toggle
          GestureDetector(
            onTap: onToggleVisibility,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: widget.isEnabled
                    ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
                    : (isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.black.withValues(alpha: 0.05)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                widget.isEnabled ? Iconsax.eye : Iconsax.eye_slash,
                size: 18,
                color: widget.isEnabled
                    ? LuxuryColors.jadePremium
                    : (isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary),
              ),
            ),
          ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: luxuryCardWidget.animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05),
    );
  }
}

/// Hidden widget chip for re-enabling
class _HiddenWidgetChip extends StatelessWidget {
  final WidgetOrderItem widget;
  final VoidCallback onTap;

  const _HiddenWidgetChip({required this.widget, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.1),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                widget.icon,
                size: 18,
                color: isDark
                    ? IrisTheme.darkTextTertiary
                    : IrisTheme.lightTextTertiary,
              ),
              const SizedBox(width: 8),
              Text(
                widget.name,
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Iconsax.add_circle,
                size: 16,
                color: LuxuryColors.jadePremium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

