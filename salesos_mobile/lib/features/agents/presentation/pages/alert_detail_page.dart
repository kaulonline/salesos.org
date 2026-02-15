import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../data/agents_service.dart';

/// Provider for a single alert
final alertDetailProvider = FutureProvider.family<AgentAlert?, String>((ref, alertId) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getAlert(alertId);
});

class AlertDetailPage extends ConsumerStatefulWidget {
  final String alertId;
  final AgentAlert? alert;

  const AlertDetailPage({
    super.key,
    required this.alertId,
    this.alert,
  });

  @override
  ConsumerState<AlertDetailPage> createState() => _AlertDetailPageState();
}

class _AlertDetailPageState extends ConsumerState<AlertDetailPage> {
  AgentAlert? _alert;
  bool _isExecuting = false;
  String? _executingActionId;

  @override
  void initState() {
    super.initState();
    _alert = widget.alert;
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

  IconData _getActionIcon(String iconName) {
    switch (iconName.toLowerCase()) {
      case 'email':
        return Iconsax.sms;
      case 'phone':
        return Iconsax.call;
      case 'task':
        return Iconsax.task_square;
      case 'status':
        return Iconsax.status;
      case 'note':
        return Iconsax.note;
      case 'calendar':
        return Iconsax.calendar;
      default:
        return Iconsax.flash;
    }
  }

  Future<void> _executeAction(SuggestedAction action) async {
    if (_isExecuting) return;

    HapticFeedback.mediumImpact();
    setState(() {
      _isExecuting = true;
      _executingActionId = action.id;
    });

    try {
      final service = ref.read(agentsServiceProvider);
      final result = await service.executeAlertAction(widget.alertId, action.id);

      if (result != null && result.success && mounted) {
        HapticFeedback.heavyImpact();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Iconsax.tick_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(result.message)),
              ],
            ),
            backgroundColor: IrisTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );

        // Refresh alert data
        ref.invalidate(alertDetailProvider(widget.alertId));
        final refreshedAlert = await service.getAlert(widget.alertId);
        if (refreshedAlert != null && mounted) {
          setState(() => _alert = refreshedAlert);
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result?.message ?? 'Failed to execute action'),
            backgroundColor: IrisTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: IrisTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isExecuting = false;
          _executingActionId = null;
        });
      }
    }
  }

  Future<void> _dismissAlert() async {
    HapticFeedback.lightImpact();
    final service = ref.read(agentsServiceProvider);
    final success = await service.dismissAlert(widget.alertId);

    if (success && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // If no alert pre-loaded, fetch from API
    if (_alert == null) {
      final alertAsync = ref.watch(alertDetailProvider(widget.alertId));
      return alertAsync.when(
        loading: () => Scaffold(
          backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
          body: const Center(
            child: CircularProgressIndicator(color: LuxuryColors.jadePremium),
          ),
        ),
        error: (e, _) => Scaffold(
          backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
          appBar: AppBar(title: const Text('Error')),
          body: Center(child: Text('Failed to load alert: $e')),
        ),
        data: (alert) {
          if (alert == null) {
            return Scaffold(
              backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
              appBar: AppBar(title: const Text('Alert')),
              body: const Center(child: Text('Alert not found')),
            );
          }
          _alert = alert;
          return _buildContent(alert, isDark);
        },
      );
    }

    return _buildContent(_alert!, isDark);
  }

  Widget _buildContent(AgentAlert alert, bool isDark) {
    final priorityColor = _getPriorityColor(alert.priority);
    final alertTypeColor = _getAlertTypeColor(alert.alertType);
    final alertTypeIcon = _getAlertTypeIcon(alert.alertType);

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
          'Alert Details',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        actions: [
          if (alert.isPending)
            IconButton(
              icon: Icon(Iconsax.close_circle, color: IrisTheme.error),
              onPressed: _dismissAlert,
              tooltip: 'Dismiss',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Alert Header Card
            _buildAlertHeader(alert, isDark, alertTypeColor, alertTypeIcon, priorityColor)
                .animate().fadeIn(duration: 200.ms),
            const SizedBox(height: 20),

            // Entity Info
            if (alert.entityName.isNotEmpty) ...[
              _buildEntityCard(alert, isDark)
                  .animate().fadeIn(delay: 100.ms, duration: 200.ms),
              const SizedBox(height: 20),
            ],

            // Recommendation
            if (alert.recommendation != null && alert.recommendation!.isNotEmpty) ...[
              _buildRecommendationCard(alert, isDark)
                  .animate().fadeIn(delay: 150.ms, duration: 200.ms),
              const SizedBox(height: 24),
            ],

            // Suggested Actions
            if (alert.suggestedActions.isNotEmpty) ...[
              Text(
                'Quick Actions',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 200.ms),
              const SizedBox(height: 4),
              Text(
                'Tap to execute instantly',
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 200.ms),
              const SizedBox(height: 12),
              ...alert.suggestedActions.asMap().entries.map((entry) {
                final index = entry.key;
                final action = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildActionCard(action, isDark)
                      .animate()
                      .fadeIn(delay: Duration(milliseconds: 250 + index * 50), duration: 200.ms)
                      .slideX(begin: 0.1, end: 0, delay: Duration(milliseconds: 250 + index * 50)),
                );
              }),
            ],

            // Status Badge
            if (!alert.isPending) ...[
              const SizedBox(height: 20),
              _buildStatusBadge(alert, isDark)
                  .animate().fadeIn(delay: 300.ms, duration: 200.ms),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAlertHeader(AgentAlert alert, bool isDark, Color alertTypeColor, IconData alertTypeIcon, Color priorityColor) {
    return IrisCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [alertTypeColor, alertTypeColor.withValues(alpha: 0.7)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: alertTypeColor.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Icon(alertTypeIcon, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: alertTypeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            alert.alertType,
                            style: IrisTheme.labelSmall.copyWith(
                              color: alertTypeColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: priorityColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            alert.priority,
                            style: IrisTheme.labelSmall.copyWith(
                              color: priorityColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      alert.title,
                      style: IrisTheme.titleMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            alert.description,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEntityCard(AgentAlert alert, bool isDark) {
    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getEntityIcon(alert.entityType),
              color: LuxuryColors.jadePremium,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.entityType,
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  alert.entityName,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Iconsax.arrow_right_3,
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            size: 20,
          ),
        ],
      ),
    );
  }

  IconData _getEntityIcon(String entityType) {
    switch (entityType.toLowerCase()) {
      case 'lead':
        return Iconsax.user;
      case 'account':
        return Iconsax.building;
      case 'opportunity':
        return Iconsax.dollar_circle;
      case 'contact':
        return Iconsax.profile_2user;
      default:
        return Iconsax.document;
    }
  }

  Widget _buildRecommendationCard(AgentAlert alert, bool isDark) {
    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: IrisTheme.info.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Iconsax.lamp_on, color: IrisTheme.info, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recommendation',
                  style: IrisTheme.labelMedium.copyWith(
                    color: IrisTheme.info,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  alert.recommendation!,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(SuggestedAction action, bool isDark) {
    final isExecuting = _executingActionId == action.id;
    final isDisabled = action.executed || _isExecuting;

    return GestureDetector(
      onTap: isDisabled ? null : () => _executeAction(action),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: action.executed
                ? IrisTheme.success.withValues(alpha: 0.5)
                : isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.black.withValues(alpha: 0.05),
            width: action.executed ? 2 : 1,
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
                      gradient: action.executed
                          ? LinearGradient(
                              colors: [IrisTheme.success, IrisTheme.success.withValues(alpha: 0.7)],
                            )
                          : LinearGradient(
                              colors: [LuxuryColors.rolexGreen, LuxuryColors.rolexGreen.withValues(alpha: 0.7)],
                            ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: isExecuting
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Icon(
                            action.executed ? Iconsax.tick_circle : _getActionIcon(action.icon),
                            color: Colors.white,
                            size: 22,
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          action.label,
                          style: IrisTheme.titleSmall.copyWith(
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          action.executed ? 'Completed' : action.description,
                          style: IrisTheme.bodySmall.copyWith(
                            color: action.executed
                                ? IrisTheme.success
                                : isDark
                                    ? IrisTheme.darkTextTertiary
                                    : IrisTheme.lightTextTertiary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (!action.executed && !isExecuting)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: LuxuryColors.jadePremium,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Execute',
                        style: IrisTheme.labelSmall.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
              // Show preview for email actions
              if (action.type == 'SEND_EMAIL' && !action.executed) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.05),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Iconsax.sms, size: 14, color: LuxuryColors.jadePremium),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              action.data['subject'] ?? 'Email',
                              style: IrisTheme.labelMedium.copyWith(
                                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        action.data['body'] ?? '',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          height: 1.4,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
              // Show call info for call actions
              if (action.type == 'SCHEDULE_CALL' && !action.executed) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Icon(Iconsax.call, size: 16, color: IrisTheme.success),
                      const SizedBox(width: 8),
                      Text(
                        action.data['phone'] ?? '',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Spacer(),
                      if (action.data['suggestedTime'] != null) ...[
                        Icon(Iconsax.clock, size: 14, color: IrisTheme.info),
                        const SizedBox(width: 4),
                        Text(
                          _formatTime(action.data['suggestedTime']),
                          style: IrisTheme.labelSmall.copyWith(
                            color: IrisTheme.info,
                          ),
                        ),
                      ],
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

  String _formatTime(String? isoTime) {
    if (isoTime == null) return '';
    try {
      final date = DateTime.parse(isoTime);
      final now = DateTime.now();
      if (date.day == now.day && date.month == now.month) {
        return 'Today ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
      } else if (date.day == now.day + 1) {
        return 'Tomorrow ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
      }
      return '${date.month}/${date.day} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return '';
    }
  }

  Widget _buildStatusBadge(AgentAlert alert, bool isDark) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (alert.isActioned) {
      statusColor = IrisTheme.success;
      statusIcon = Iconsax.tick_circle;
      statusText = 'Actions Completed';
    } else if (alert.isDismissed) {
      statusColor = IrisTheme.darkTextTertiary;
      statusIcon = Iconsax.close_circle;
      statusText = 'Dismissed';
    } else if (alert.isAcknowledged) {
      statusColor = IrisTheme.info;
      statusIcon = Iconsax.eye;
      statusText = 'Acknowledged';
    } else {
      statusColor = IrisTheme.warning;
      statusIcon = Iconsax.clock;
      statusText = 'Pending';
    }

    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: statusColor.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: statusColor.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(statusIcon, color: statusColor, size: 18),
            const SizedBox(width: 8),
            Text(
              statusText,
              style: IrisTheme.labelMedium.copyWith(
                color: statusColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
