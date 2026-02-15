import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/agents_service.dart';
import 'alert_detail_page.dart';

/// Provider for alerts list
final alertsListProvider = FutureProvider<List<AgentAlert>>((ref) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getAlerts(limit: 50);
});

class AlertsListPage extends ConsumerStatefulWidget {
  const AlertsListPage({super.key});

  @override
  ConsumerState<AlertsListPage> createState() => _AlertsListPageState();
}

class _AlertsListPageState extends ConsumerState<AlertsListPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      setState(() {
        switch (_tabController.index) {
          case 0:
            _filter = 'all';
            break;
          case 1:
            _filter = 'pending';
            break;
          case 2:
            _filter = 'actioned';
            break;
        }
      });
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return IrisTheme.error;
      case 'MEDIUM':
        return IrisTheme.warning;
      case 'LOW':
        return IrisTheme.info;
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  Color _getAlertTypeColor(String alertType) {
    switch (alertType.toUpperCase()) {
      case 'CRITICAL':
        return IrisTheme.error;
      case 'WARNING':
        return IrisTheme.warning;
      case 'OPPORTUNITY':
        return IrisTheme.success;
      case 'INFORMATION':
      default:
        return IrisTheme.info;
    }
  }

  IconData _getAlertTypeIcon(String alertType) {
    switch (alertType.toUpperCase()) {
      case 'CRITICAL':
        return Iconsax.danger;
      case 'WARNING':
        return Iconsax.warning_2;
      case 'OPPORTUNITY':
        return Iconsax.medal_star;
      case 'INFORMATION':
      default:
        return Iconsax.info_circle;
    }
  }

  List<AgentAlert> _filterAlerts(List<AgentAlert> alerts) {
    switch (_filter) {
      case 'pending':
        return alerts.where((a) => a.isPending).toList();
      case 'actioned':
        return alerts.where((a) => a.isActioned || a.isDismissed).toList();
      default:
        return alerts;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final alertsAsync = ref.watch(alertsListProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Agent Alerts',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Iconsax.refresh),
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            onPressed: () {
              ref.invalidate(alertsListProvider);
              HapticFeedback.lightImpact();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: LuxuryColors.rolexGreen,
          labelColor: LuxuryColors.jadePremium,
          unselectedLabelColor: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Pending'),
            Tab(text: 'Completed'),
          ],
        ),
      ),
      body: alertsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: LuxuryColors.jadePremium),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 64, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text('Failed to load alerts', style: IrisTheme.bodyLarge),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.invalidate(alertsListProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (alerts) {
          final filteredAlerts = _filterAlerts(alerts);

          if (filteredAlerts.isEmpty) {
            return _buildEmptyState(isDark);
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(alertsListProvider);
            },
            color: LuxuryColors.jadePremium,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: filteredAlerts.length,
              itemBuilder: (context, index) {
                final alert = filteredAlerts[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildAlertCard(alert, isDark)
                      .animate()
                      .fadeIn(delay: Duration(milliseconds: index * 50), duration: 200.ms)
                      .slideY(begin: 0.1, end: 0),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              Iconsax.notification,
              size: 40,
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'No Alerts',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _filter == 'pending'
                ? 'No pending alerts'
                : _filter == 'actioned'
                    ? 'No completed alerts'
                    : 'Run an agent to generate alerts',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildAlertCard(AgentAlert alert, bool isDark) {
    final priorityColor = _getPriorityColor(alert.priority);
    final alertTypeColor = _getAlertTypeColor(alert.alertType);
    final alertTypeIcon = _getAlertTypeIcon(alert.alertType);
    final hasActions = alert.suggestedActions.isNotEmpty;
    final pendingActions = alert.suggestedActions.where((a) => !a.executed).length;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => AlertDetailPage(
              alertId: alert.id,
              alert: alert,
            ),
          ),
        ).then((_) {
          // Refresh on return
          ref.invalidate(alertsListProvider);
        });
      },
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: alert.isPending
                ? priorityColor.withValues(alpha: 0.3)
                : Colors.transparent,
            width: alert.isPending ? 1.5 : 0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          alertTypeColor,
                          alertTypeColor.withValues(alpha: 0.7),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(alertTypeIcon, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: priorityColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                alert.priority,
                                style: IrisTheme.labelSmall.copyWith(
                                  color: priorityColor,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 10,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _formatTimeAgo(alert.createdAt),
                              style: IrisTheme.labelSmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextTertiary
                                    : IrisTheme.lightTextTertiary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          alert.title,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (!alert.isPending)
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: alert.isActioned
                            ? IrisTheme.success.withValues(alpha: 0.15)
                            : IrisTheme.darkTextTertiary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        alert.isActioned ? Iconsax.tick_circle : Iconsax.close_circle,
                        color: alert.isActioned ? IrisTheme.success : IrisTheme.darkTextTertiary,
                        size: 16,
                      ),
                    ),
                ],
              ),
              if (alert.entityName.isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Iconsax.user,
                      size: 14,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '${alert.entityType}: ${alert.entityName}',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
              if (hasActions && alert.isPending) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Iconsax.flash, size: 14, color: LuxuryColors.jadePremium),
                      const SizedBox(width: 6),
                      Text(
                        '$pendingActions action${pendingActions > 1 ? 's' : ''} available',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.jadePremium,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimeAgo(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}d ago';
      } else {
        return '${date.month}/${date.day}';
      }
    } catch (e) {
      return '';
    }
  }
}
