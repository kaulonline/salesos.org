import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/models/dashboard_config.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// A visual preview widget that displays the dashboard layout as the user customizes it.
/// Shows a mini representation of the dashboard with enabled widgets and their positioning.
class DashboardLayoutPreview extends StatelessWidget {
  /// The dashboard configuration to preview.
  final DashboardConfig config;

  /// Whether to show tablet preview (true) or phone preview (false).
  final bool isTablet;

  /// Height of the preview container.
  final double height;

  const DashboardLayoutPreview({
    super.key,
    required this.config,
    this.isTablet = false,
    this.height = 200,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: LuxuryColors.obsidian,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          // Preview label
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: LuxuryColors.richBlack,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(15),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isTablet ? Iconsax.monitor : Iconsax.mobile,
                  size: 14,
                  color: LuxuryColors.jadePremium,
                ),
                const SizedBox(width: 8),
                Text(
                  isTablet ? 'Tablet Preview' : 'Phone Preview',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                    color: LuxuryColors.textOnDark.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
          // Device frame and content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: _buildDeviceFrame(context, isDark),
            ),
          ),
        ],
      ),
    );
  }

  /// Builds the device frame outline with content inside.
  Widget _buildDeviceFrame(BuildContext context, bool isDark) {
    final aspectRatio = isTablet ? 4 / 3 : 9 / 16;

    return Center(
      child: AspectRatio(
        aspectRatio: aspectRatio,
        child: Container(
          decoration: BoxDecoration(
            color: LuxuryColors.richBlack,
            borderRadius: BorderRadius.circular(isTablet ? 8 : 12),
            border: Border.all(
              color: LuxuryColors.textOnDark.withValues(alpha: 0.2),
              width: 2,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(isTablet ? 6 : 10),
            child: isTablet
                ? _buildTabletPreview(context)
                : _buildPhonePreview(context),
          ),
        ),
      ),
    );
  }

  /// Builds the phone preview layout (vertical, single column).
  Widget _buildPhonePreview(BuildContext context) {
    final enabledWidgets = _getEnabledWidgetsInOrder();
    final statsLayout = config.layout.phone.statsLayout;

    return Container(
      padding: const EdgeInsets.all(4),
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header area (always shown)
            _PreviewHeader(),
            const SizedBox(height: 3),
            // Widget list based on order and visibility
            ...enabledWidgets.map((widgetId) {
              if (widgetId == 'todaysFocus') {
                return _buildStatsPreview(statsLayout);
              }
              return Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: _PreviewWidget(
                  widgetId: widgetId,
                  isEnabled: true,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  /// Builds the tablet preview layout (dual column).
  Widget _buildTabletPreview(BuildContext context) {
    final tabletConfig = config.layout.tablet;
    final enabledWidgets = _getEnabledWidgetsInOrder();
    final panelRatio = tabletConfig.panelRatio.clamp(0.25, 0.5);
    final statsColumns = tabletConfig.statsColumns.clamp(2, 4);

    return Container(
      padding: const EdgeInsets.all(4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left panel
          SizedBox(
            width: (panelRatio * 100).toDouble(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _PreviewHeader(compact: true),
                const SizedBox(height: 2),
                // Left panel widgets (header, pipeline)
                if (enabledWidgets.contains('pipelineSummary'))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: _PreviewWidget(
                      widgetId: 'pipelineSummary',
                      isEnabled: true,
                      compact: true,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          // Right panel
          Expanded(
            child: SingleChildScrollView(
              physics: const NeverScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Stats grid with column count
                  _buildStatsGridPreview(statsColumns),
                  const SizedBox(height: 2),
                  // Remaining widgets
                  ...enabledWidgets
                      .where((id) =>
                          id != 'pipelineSummary' && id != 'todaysFocus')
                      .take(3)
                      .map((widgetId) => Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: _PreviewWidget(
                              widgetId: widgetId,
                              isEnabled: true,
                              compact: true,
                            ),
                          )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Builds the stats preview section based on layout style.
  Widget _buildStatsPreview(String statsLayout) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section label
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: LuxuryColors.jadePremium.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Text(
                    statsLayout == 'grid' ? 'Grid' : 'Row',
                    style: TextStyle(
                      fontSize: 6,
                      fontWeight: FontWeight.w500,
                      color: LuxuryColors.jadePremium,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Stats display
          if (statsLayout == 'grid')
            _buildStatsGridPreview(2)
          else
            _buildStatsRowPreview(),
        ],
      ),
    );
  }

  /// Builds a row of stat items for phone layout.
  Widget _buildStatsRowPreview() {
    final stats = config.quickStats.take(4).toList();

    return SizedBox(
      height: 16,
      child: Row(
        children: stats
            .map((stat) => Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 2),
                    child: _StatPreviewItem(statId: stat),
                  ),
                ))
            .toList(),
      ),
    );
  }

  /// Builds a grid of stat items for tablet layout.
  Widget _buildStatsGridPreview(int columns) {
    final stats = config.quickStats.take(columns).toList();

    return SizedBox(
      height: 14,
      child: Row(
        children: stats
            .map((stat) => Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 2),
                    child: _StatPreviewItem(statId: stat, compact: true),
                  ),
                ))
            .toList(),
      ),
    );
  }

  /// Returns the list of enabled widgets in their configured order.
  List<String> _getEnabledWidgetsInOrder() {
    final widgetVisibility = {
      'pipelineSummary': config.widgets.pipelineSummary,
      'morningBrief': config.widgets.morningBrief,
      'irisRank': config.widgets.irisRank,
      'todaysFocus': config.widgets.todaysFocus,
      'aiInsights': config.widgets.aiInsights,
      'recentActivity': config.widgets.recentActivity,
    };

    return config.widgetOrder
        .where((id) => widgetVisibility[id] ?? false)
        .toList();
  }
}

/// Mini header preview widget.
class _PreviewHeader extends StatelessWidget {
  final bool compact;

  const _PreviewHeader({this.compact = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: compact ? 10 : 14,
      decoration: BoxDecoration(
        color: LuxuryColors.obsidian.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(2),
      ),
      child: Row(
        children: [
          const SizedBox(width: 4),
          // Greeting placeholder
          Container(
            width: compact ? 20 : 30,
            height: compact ? 4 : 6,
            decoration: BoxDecoration(
              color: LuxuryColors.textOnDark.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(1),
            ),
          ),
          const Spacer(),
          // Avatar placeholder
          Container(
            width: compact ? 6 : 8,
            height: compact ? 6 : 8,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
    );
  }
}

/// Mini widget preview representation.
class _PreviewWidget extends StatelessWidget {
  final String widgetId;
  final bool isEnabled;
  final bool compact;

  const _PreviewWidget({
    required this.widgetId,
    required this.isEnabled,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final widgetConfig = _getWidgetConfig(widgetId);

    return Opacity(
      opacity: isEnabled ? 0.3 : 0.1,
      child: Container(
        height: compact ? 12 : 16,
        decoration: BoxDecoration(
          color: widgetConfig.color.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(3),
          border: Border.all(
            color: widgetConfig.color.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
        child: Row(
          children: [
            const SizedBox(width: 4),
            Icon(
              widgetConfig.icon,
              size: compact ? 6 : 8,
              color: widgetConfig.color,
            ),
            const SizedBox(width: 3),
            Expanded(
              child: Container(
                height: compact ? 3 : 4,
                decoration: BoxDecoration(
                  color: LuxuryColors.textOnDark.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ),
            const SizedBox(width: 4),
          ],
        ),
      ),
    );
  }

  _WidgetPreviewConfig _getWidgetConfig(String widgetId) {
    switch (widgetId) {
      case 'pipelineSummary':
        return _WidgetPreviewConfig(
          icon: Iconsax.chart_2,
          color: LuxuryColors.champagneGold,
        );
      case 'morningBrief':
        return _WidgetPreviewConfig(
          icon: Iconsax.sun_1,
          color: LuxuryColors.warningAmber,
        );
      case 'irisRank':
        return _WidgetPreviewConfig(
          icon: Iconsax.ranking_1,
          color: LuxuryColors.jadePremium,
        );
      case 'todaysFocus':
        return _WidgetPreviewConfig(
          icon: Iconsax.calendar_tick,
          color: LuxuryColors.infoCobalt,
        );
      case 'aiInsights':
        return _WidgetPreviewConfig(
          icon: Iconsax.magic_star,
          color: LuxuryColors.roseGold,
        );
      case 'recentActivity':
        return _WidgetPreviewConfig(
          icon: Iconsax.activity,
          color: LuxuryColors.successGreen,
        );
      default:
        return _WidgetPreviewConfig(
          icon: Iconsax.element_4,
          color: LuxuryColors.textMuted,
        );
    }
  }
}

/// Configuration for widget preview appearance.
class _WidgetPreviewConfig {
  final IconData icon;
  final Color color;

  const _WidgetPreviewConfig({
    required this.icon,
    required this.color,
  });
}

/// Mini stat item preview.
class _StatPreviewItem extends StatelessWidget {
  final String statId;
  final bool compact;

  const _StatPreviewItem({
    required this.statId,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final statConfig = _getStatConfig(statId);

    return Container(
      decoration: BoxDecoration(
        color: statConfig.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(2),
        border: Border.all(
          color: statConfig.color.withValues(alpha: 0.3),
          width: 0.5,
        ),
      ),
      child: Center(
        child: Icon(
          statConfig.icon,
          size: compact ? 5 : 6,
          color: statConfig.color.withValues(alpha: 0.5),
        ),
      ),
    );
  }

  _StatPreviewConfig _getStatConfig(String statId) {
    switch (statId) {
      case 'calls':
        return _StatPreviewConfig(
          icon: Iconsax.call,
          color: LuxuryColors.successGreen,
        );
      case 'meetings':
        return _StatPreviewConfig(
          icon: Iconsax.calendar,
          color: LuxuryColors.infoCobalt,
        );
      case 'tasks':
        return _StatPreviewConfig(
          icon: Iconsax.task_square,
          color: LuxuryColors.warningAmber,
        );
      case 'leads':
        return _StatPreviewConfig(
          icon: Iconsax.profile_2user,
          color: LuxuryColors.roseGold,
        );
      default:
        return _StatPreviewConfig(
          icon: Iconsax.chart_1,
          color: LuxuryColors.textMuted,
        );
    }
  }
}

/// Configuration for stat preview appearance.
class _StatPreviewConfig {
  final IconData icon;
  final Color color;

  const _StatPreviewConfig({
    required this.icon,
    required this.color,
  });
}
