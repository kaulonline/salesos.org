import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../core/config/routes.dart';
import '../../core/services/alerts_service.dart';
import 'iris_card.dart';

/// Shows the alerts panel as a centered dialog
void showAlertsPanel(BuildContext context) {
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
        child: const Center(
          child: Material(
            color: Colors.transparent,
            child: AlertsPanel(),
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

/// Alerts panel widget
class AlertsPanel extends ConsumerWidget {
  const AlertsPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final alertsAsync = ref.watch(alertsProvider);

    return Container(
      constraints: BoxConstraints(
        maxWidth: 450,
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 30,
            spreadRadius: 5,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: IrisTheme.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Iconsax.notification,
                        size: 20,
                        color: IrisTheme.error,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Alerts',
                            style: IrisTheme.titleLarge.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                            ),
                          ),
                          alertsAsync.when(
                            data: (alerts) => Text(
                              '${alerts.length} item${alerts.length != 1 ? 's' : ''} need attention',
                              style: IrisTheme.bodySmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                            loading: () => const SizedBox.shrink(),
                            error: (e, s) => const SizedBox.shrink(),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(
                        Iconsax.close_circle,
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 300.ms),

              const Divider(height: 1),

              // Alerts list
              Expanded(
                child: alertsAsync.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: LuxuryColors.champagneGold),
                  ),
                  error: (e, st) => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
                        const SizedBox(height: 16),
                        Text(
                          'Error loading alerts',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  data: (alerts) {
                    if (alerts.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Iconsax.tick_circle,
                              size: 64,
                              color: IrisTheme.success.withValues(alpha: 0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'All caught up!',
                              style: IrisTheme.titleMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'No alerts at the moment',
                              style: IrisTheme.bodyMedium.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextSecondary
                                    : IrisTheme.lightTextSecondary,
                              ),
                            ),
                          ],
                        ).animate().fadeIn(delay: 200.ms),
                      );
                    }

                    // Group alerts by priority
                    final highPriority = alerts.where((a) => a.priority == AlertPriority.high).toList();
                    final mediumPriority = alerts.where((a) => a.priority == AlertPriority.medium).toList();
                    final lowPriority = alerts.where((a) => a.priority == AlertPriority.low).toList();

                    return ListView(
                      shrinkWrap: true,
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      children: [
                        if (highPriority.isNotEmpty) ...[
                          _SectionHeader(
                            title: 'High Priority',
                            count: highPriority.length,
                            color: AlertPriority.high.color,
                          ),
                          ...highPriority.asMap().entries.map((entry) {
                            return _AlertCard(
                              alert: entry.value,
                              onTap: () => _handleAlertTap(context, entry.value),
                            ).animate(delay: (100 + entry.key * 50).ms)
                                .fadeIn()
                                .slideX(begin: 0.05);
                          }),
                          const SizedBox(height: 16),
                        ],
                        if (mediumPriority.isNotEmpty) ...[
                          _SectionHeader(
                            title: 'Medium Priority',
                            count: mediumPriority.length,
                            color: AlertPriority.medium.color,
                          ),
                          ...mediumPriority.asMap().entries.map((entry) {
                            return _AlertCard(
                              alert: entry.value,
                              onTap: () => _handleAlertTap(context, entry.value),
                            ).animate(delay: (200 + entry.key * 50).ms)
                                .fadeIn()
                                .slideX(begin: 0.05);
                          }),
                          const SizedBox(height: 16),
                        ],
                        if (lowPriority.isNotEmpty) ...[
                          _SectionHeader(
                            title: 'Low Priority',
                            count: lowPriority.length,
                            color: AlertPriority.low.color,
                          ),
                          ...lowPriority.asMap().entries.map((entry) {
                            return _AlertCard(
                              alert: entry.value,
                              onTap: () => _handleAlertTap(context, entry.value),
                            ).animate(delay: (300 + entry.key * 50).ms)
                                .fadeIn()
                                .slideX(begin: 0.05);
                          }),
                        ],
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        );
  }

  void _handleAlertTap(BuildContext context, AppAlert alert) {
    Navigator.pop(context); // Close the bottom sheet
    HapticFeedback.lightImpact();

    // Navigate based on entity type
    switch (alert.entityType) {
      case 'opportunity':
        if (alert.entityId != null) {
          context.push('${AppRoutes.deals}/${alert.entityId}');
        } else {
          context.go(AppRoutes.deals);
        }
        break;
      case 'lead':
        if (alert.entityId != null) {
          context.push('${AppRoutes.leads}/${alert.entityId}');
        } else {
          context.go(AppRoutes.leads);
        }
        break;
      case 'task':
        context.go(AppRoutes.tasks);
        break;
      case 'event':
        context.go(AppRoutes.calendar);
        break;
      case 'contact':
        if (alert.entityId != null) {
          context.push('${AppRoutes.contacts}/${alert.entityId}');
        } else {
          context.go(AppRoutes.contacts);
        }
        break;
      default:
        // Default to dashboard
        context.go(AppRoutes.dashboard);
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  final Color color;

  const _SectionHeader({
    required this.title,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: IrisTheme.labelMedium.copyWith(
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              count.toString(),
              style: IrisTheme.labelSmall.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final AppAlert alert;
  final VoidCallback onTap;

  const _AlertCard({
    required this.alert,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        children: [
          // Icon
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: alert.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              alert.icon,
              size: 18,
              color: alert.color,
            ),
          ),
          const SizedBox(width: 12),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.title,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  alert.description,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Arrow
          Icon(
            Iconsax.arrow_right_3,
            size: 16,
            color: isDark
                ? IrisTheme.darkTextTertiary
                : IrisTheme.lightTextTertiary,
          ),
        ],
      ),
    );
  }
}

/// Extension to add color to AlertPriority
extension AlertPriorityColor on AlertPriority {
  Color get color {
    switch (this) {
      case AlertPriority.high:
        return IrisTheme.irisBrown;     // Deep brown for high priority
      case AlertPriority.medium:
        return LuxuryColors.champagneGoldDark;  // Terracotta for medium
      case AlertPriority.low:
        return LuxuryColors.champagneGold;      // Warm tan for low
    }
  }
}
