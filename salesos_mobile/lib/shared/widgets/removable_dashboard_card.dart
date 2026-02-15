import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import '../../core/services/dashboard_config_service.dart';
import '../../core/models/dashboard_config.dart';
import 'luxury_card.dart';

/// Notifier for dashboard edit mode state
class DashboardEditModeNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void toggle() => state = !state;
  void setEditMode(bool value) => state = value;
}

/// Provider for dashboard edit mode state
final dashboardEditModeProvider = NotifierProvider<DashboardEditModeNotifier, bool>(
  DashboardEditModeNotifier.new,
);

/// Widget IDs matching the dashboard config keys
class DashboardWidgetId {
  static const String pipelineSummary = 'pipelineSummary';
  static const String salesPerformanceChart = 'salesPerformanceChart';
  static const String morningBrief = 'morningBrief';
  static const String irisRank = 'irisRank';
  static const String todaysFocus = 'todaysFocus';
  static const String aiInsights = 'aiInsights';
  static const String recentActivity = 'recentActivity';
  static const String crmModeIndicator = 'crmModeIndicator';

  static String getDisplayName(String id) {
    switch (id) {
      case pipelineSummary:
        return 'Pipeline Summary';
      case salesPerformanceChart:
        return 'Sales Performance';
      case morningBrief:
        return 'Morning Brief';
      case irisRank:
        return 'SalesOS Intelligence';
      case todaysFocus:
        return "Today's Focus";
      case aiInsights:
        return 'AI Insights';
      case recentActivity:
        return 'Recent Activity';
      case crmModeIndicator:
        return 'CRM Mode';
      default:
        return id;
    }
  }
}

/// A wrapper widget that adds remove functionality to dashboard cards when in edit mode
class RemovableDashboardCard extends ConsumerWidget {
  final String widgetId;
  final Widget child;
  final EdgeInsets? margin;

  const RemovableDashboardCard({
    super.key,
    required this.widgetId,
    required this.child,
    this.margin,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isEditMode = ref.watch(dashboardEditModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Use RepaintBoundary to isolate semantics updates and prevent parent data dirty issues
    // Keep widget tree structure stable to avoid semantics assertion errors
    return RepaintBoundary(
      child: Stack(
        // Use Clip.hardEdge instead of Clip.none to prevent semantics parent data dirty errors
        clipBehavior: Clip.hardEdge,
        children: [
          // Always render child in a container to keep tree structure stable
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: isEditMode
                ? BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                      width: 1.5,
                    ),
                  )
                : null,
            child: child,
          ),

          // Remove button overlay - Premium gold accent
          // Use AnimatedOpacity instead of conditional rendering to keep tree stable
          Positioned(
            top: -6,
            right: -6,
            child: IgnorePointer(
              ignoring: !isEditMode,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 200),
                opacity: isEditMode ? 1.0 : 0.0,
                child: GestureDetector(
                  onTap: () => _removeWidget(context, ref),
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: LuxuryColors.rolexGreen,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isDark ? LuxuryColors.obsidian : Colors.white,
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Iconsax.close_square,
                      color: Colors.white,
                      size: 14,
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Widget label (shown in edit mode)
          // Use AnimatedOpacity instead of conditional rendering to keep tree stable
          Positioned(
            bottom: 8,
            left: 8,
            child: IgnorePointer(
              ignoring: !isEditMode,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 200),
                opacity: isEditMode ? 1.0 : 0.0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    DashboardWidgetId.getDisplayName(widgetId),
                    style: IrisTheme.labelSmall.copyWith(
                      color: isDark ? Colors.white70 : Colors.black87,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _removeWidget(BuildContext context, WidgetRef ref) {
    HapticFeedback.mediumImpact();

    final widgetName = DashboardWidgetId.getDisplayName(widgetId);

    // Show confirmation snackbar with undo option
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$widgetName hidden'),
        backgroundColor: LuxuryColors.obsidian,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        action: SnackBarAction(
          label: 'Undo',
          textColor: LuxuryColors.jadePremium,
          onPressed: () {
            // Re-enable the widget
            ref.read(dashboardConfigProvider.notifier).toggleWidget(widgetId, true);
            HapticFeedback.lightImpact();
          },
        ),
        duration: const Duration(seconds: 4),
      ),
    );

    // Disable the widget
    ref.read(dashboardConfigProvider.notifier).toggleWidget(widgetId, false);
  }
}

/// Variant for the edit mode button styling
enum DashboardEditModeVariant {
  standard, // For phone header
  luxury,   // For tablet header (matches _LuxuryIconButton)
}

/// Edit mode toggle button for the dashboard header
/// Matches the style of other header icon buttons
class DashboardEditModeButton extends ConsumerWidget {
  final double size;
  final DashboardEditModeVariant variant;

  const DashboardEditModeButton({
    super.key,
    this.size = 20,
    this.variant = DashboardEditModeVariant.standard,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isEditMode = ref.watch(dashboardEditModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        ref.read(dashboardEditModeProvider.notifier).toggle();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isEditMode
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
              : _getBackgroundColor(isDark),
          borderRadius: BorderRadius.circular(variant == DashboardEditModeVariant.luxury ? 10 : 12),
          border: _getBorder(isEditMode, isDark),
        ),
        child: Icon(
          isEditMode ? Iconsax.tick_circle5 : Iconsax.edit_2,
          size: variant == DashboardEditModeVariant.luxury ? 18 : size,
          color: isEditMode
              ? LuxuryColors.jadePremium
              : _getIconColor(isDark),
        ),
      ),
    );
  }

  Color _getBackgroundColor(bool isDark) {
    if (variant == DashboardEditModeVariant.luxury) {
      return Colors.transparent;
    }
    return isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated;
  }

  Color _getIconColor(bool isDark) {
    if (variant == DashboardEditModeVariant.luxury) {
      return isDark
          ? LuxuryColors.textOnDark.withValues(alpha: 0.8)
          : LuxuryColors.textOnLight.withValues(alpha: 0.7);
    }
    return isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary;
  }

  Border? _getBorder(bool isEditMode, bool isDark) {
    if (isEditMode) {
      return Border.all(color: LuxuryColors.rolexGreen, width: 1.5);
    }
    if (variant == DashboardEditModeVariant.luxury) {
      return Border.all(
        color: isDark
            ? LuxuryColors.textOnDark.withValues(alpha: 0.15)
            : LuxuryColors.textOnLight.withValues(alpha: 0.1),
        width: 1,
      );
    }
    return null;
  }
}

/// Banner shown when in edit mode with restore option
class DashboardEditModeBanner extends ConsumerWidget {
  const DashboardEditModeBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isEditMode = ref.watch(dashboardEditModeProvider);
    final config = ref.watch(dashboardConfigProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!isEditMode) return const SizedBox.shrink();

    // Count hidden widgets
    final hiddenCount = _countHiddenWidgets(config.widgets);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            LuxuryColors.rolexGreen.withValues(alpha: 0.15),
            LuxuryColors.deepEmerald.withValues(alpha: 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Iconsax.info_circle,
            size: 20,
            color: LuxuryColors.jadePremium,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Edit Mode',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark ? Colors.white : Colors.black87,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Tap X to hide cards${hiddenCount > 0 ? ' • $hiddenCount hidden' : ''}',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                ),
              ],
            ),
          ),
          if (hiddenCount > 0)
            TextButton(
              onPressed: () => _showRestoreDialog(context, ref),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                backgroundColor: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                'Restore',
                style: IrisTheme.labelSmall.copyWith(
                  color: LuxuryColors.jadePremium,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              ref.read(dashboardEditModeProvider.notifier).setEditMode(false);
            },
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              backgroundColor: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.05),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              'Done',
              style: IrisTheme.labelSmall.copyWith(
                color: isDark ? Colors.white : Colors.black87,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideY(begin: -0.2);
  }

  int _countHiddenWidgets(DashboardWidgets widgets) {
    int count = 0;
    if (!widgets.pipelineSummary) count++;
    if (!widgets.salesPerformanceChart) count++;
    if (!widgets.morningBrief) count++;
    if (!widgets.irisRank) count++;
    if (!widgets.todaysFocus) count++;
    if (!widgets.aiInsights) count++;
    if (!widgets.recentActivity) count++;
    return count;
  }

  void _showRestoreDialog(BuildContext context, WidgetRef ref) {
    final config = ref.read(dashboardConfigProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Build list of hidden widgets
    final hiddenWidgets = <String>[];
    if (!config.widgets.pipelineSummary) hiddenWidgets.add(DashboardWidgetId.pipelineSummary);
    if (!config.widgets.salesPerformanceChart) hiddenWidgets.add(DashboardWidgetId.salesPerformanceChart);
    if (!config.widgets.morningBrief) hiddenWidgets.add(DashboardWidgetId.morningBrief);
    if (!config.widgets.irisRank) hiddenWidgets.add(DashboardWidgetId.irisRank);
    if (!config.widgets.todaysFocus) hiddenWidgets.add(DashboardWidgetId.todaysFocus);
    if (!config.widgets.aiInsights) hiddenWidgets.add(DashboardWidgetId.aiInsights);
    if (!config.widgets.recentActivity) hiddenWidgets.add(DashboardWidgetId.recentActivity);

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
            child: Material(
              color: Colors.transparent,
              child: Container(
                width: MediaQuery.of(ctx).size.width * 0.9,
                constraints: const BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  color: isDark ? LuxuryColors.obsidian : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.2 : 0.15),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Restore Hidden Cards',
                            style: IrisTheme.titleMedium.copyWith(
                              color: isDark ? Colors.white : Colors.black87,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              HapticFeedback.mediumImpact();
                              // Restore all
                              for (final id in hiddenWidgets) {
                                ref.read(dashboardConfigProvider.notifier).toggleWidget(id, true);
                              }
                              Navigator.pop(ctx);
                            },
                            child: Text(
                              'Restore All',
                              style: IrisTheme.labelMedium.copyWith(
                                color: LuxuryColors.jadePremium,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ...hiddenWidgets.map((id) => _buildRestoreItem(ctx, ref, id, isDark)),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
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

  Widget _buildRestoreItem(BuildContext context, WidgetRef ref, String widgetId, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: LuxuryCard(
        variant: LuxuryCardVariant.bordered,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Icon(
              _getWidgetIcon(widgetId),
              size: 20,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                DashboardWidgetId.getDisplayName(widgetId),
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ),
            TextButton(
              onPressed: () {
                HapticFeedback.lightImpact();
                ref.read(dashboardConfigProvider.notifier).toggleWidget(widgetId, true);
                Navigator.pop(context);
              },
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                backgroundColor: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                'Restore',
                style: IrisTheme.labelSmall.copyWith(
                  color: LuxuryColors.jadePremium,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getWidgetIcon(String widgetId) {
    switch (widgetId) {
      case DashboardWidgetId.pipelineSummary:
        return Iconsax.chart_2;
      case DashboardWidgetId.salesPerformanceChart:
        return Iconsax.graph;
      case DashboardWidgetId.morningBrief:
        return Iconsax.sun_1;
      case DashboardWidgetId.irisRank:
        return Iconsax.ranking;
      case DashboardWidgetId.todaysFocus:
        return Iconsax.task_square;
      case DashboardWidgetId.aiInsights:
        return Iconsax.magic_star;
      case DashboardWidgetId.recentActivity:
        return Iconsax.activity;
      default:
        return Iconsax.element_3;
    }
  }
}
