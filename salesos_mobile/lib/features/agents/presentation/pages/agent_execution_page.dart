import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../data/agents_service.dart';

/// Provider for execution details with logs
final executionDetailProvider = FutureProvider.family<AgentExecution?, String>((ref, executionId) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getExecution(executionId);
});

/// Provider for execution logs
final executionLogsProvider = FutureProvider.family<List<ExecutionLog>, String>((ref, executionId) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getExecutionLogs(executionId);
});

class AgentExecutionPage extends ConsumerStatefulWidget {
  final String executionId;
  final String? agentName;

  const AgentExecutionPage({
    super.key,
    required this.executionId,
    this.agentName,
  });

  @override
  ConsumerState<AgentExecutionPage> createState() => _AgentExecutionPageState();
}

class _AgentExecutionPageState extends ConsumerState<AgentExecutionPage> {
  Timer? _pollingTimer;
  String? _lastStatus;

  @override
  void initState() {
    super.initState();
    // Start polling immediately
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void _startPolling() {
    // Poll every 2 seconds while execution is running
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      // Refresh both execution and logs
      ref.invalidate(executionDetailProvider(widget.executionId));
      ref.invalidate(executionLogsProvider(widget.executionId));
    });
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  void _checkAndStopPolling(String status) {
    // Stop polling when execution is no longer RUNNING
    if (status != 'RUNNING' && _pollingTimer != null) {
      _stopPolling();
      // Show completion notification
      if (_lastStatus == 'RUNNING' && mounted) {
        HapticFeedback.mediumImpact();
        final isSuccess = status == 'COMPLETED';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  isSuccess ? Iconsax.tick_circle : Iconsax.warning_2,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(isSuccess ? 'Execution completed!' : 'Execution failed'),
              ],
            ),
            backgroundColor: isSuccess ? IrisTheme.success : IrisTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
    _lastStatus = status;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final executionAsync = ref.watch(executionDetailProvider(widget.executionId));
    final logsAsync = ref.watch(executionLogsProvider(widget.executionId));

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
          'Execution Logs',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Iconsax.refresh),
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            onPressed: () {
              ref.invalidate(executionDetailProvider(widget.executionId));
              ref.invalidate(executionLogsProvider(widget.executionId));
              HapticFeedback.lightImpact();
            },
          ),
        ],
      ),
      body: executionAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: LuxuryColors.jadePremium),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.warning_2, size: 64, color: IrisTheme.error),
              const SizedBox(height: 16),
              Text('Failed to load execution', style: IrisTheme.bodyLarge),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.invalidate(executionDetailProvider(widget.executionId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (execution) {
          if (execution == null) {
            return const Center(child: Text('Execution not found'));
          }

          // Check if we should stop polling
          _checkAndStopPolling(execution.status);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status card
                _buildStatusCard(execution, isDark),
                const SizedBox(height: 16),

                // Metrics
                _buildMetricsSection(execution, isDark),
                const SizedBox(height: 24),

                // Result summary
                if (execution.resultSummary != null) ...[
                  _buildResultSection(execution, isDark),
                  const SizedBox(height: 24),
                ],

                // Logs section
                Text(
                  'Execution Timeline',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),

                logsAsync.when(
                  loading: () => const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: CircularProgressIndicator(color: LuxuryColors.jadePremium),
                    ),
                  ),
                  error: (e, _) => IrisCard(
                    child: Center(
                      child: Text('Failed to load logs: $e'),
                    ),
                  ),
                  data: (logs) => _buildLogsTimeline(logs, isDark),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusCard(AgentExecution execution, bool isDark) {
    final statusColor = _getStatusColor(execution.status);
    final statusIcon = _getStatusIcon(execution.status);
    final isRunning = execution.status == 'RUNNING';

    Widget statusIconWidget = Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(statusIcon, color: statusColor, size: 24),
    );

    // Add pulsing animation when running
    if (isRunning) {
      statusIconWidget = statusIconWidget
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .scale(begin: const Offset(1.0, 1.0), end: const Offset(1.1, 1.1), duration: 800.ms)
          .then()
          .scale(begin: const Offset(1.1, 1.1), end: const Offset(1.0, 1.0), duration: 800.ms);
    }

    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          statusIconWidget,
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.agentName ?? 'Agent Execution',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isRunning) ...[
                            SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(statusColor),
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Text(
                            execution.status,
                            style: IrisTheme.labelSmall.copyWith(
                              color: statusColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatTimestamp(execution.startedAt),
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms);
  }

  Widget _buildMetricsSection(AgentExecution execution, bool isDark) {
    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            icon: Iconsax.clock,
            label: 'Duration',
            value: execution.executionTimeMs != null
                ? '${(execution.executionTimeMs! / 1000).toStringAsFixed(1)}s'
                : '-',
            color: IrisTheme.info,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            icon: Iconsax.cpu,
            label: 'LLM Calls',
            value: '${execution.llmCalls}',
            color: LuxuryColors.jadePremium,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            icon: Iconsax.document,
            label: 'Tokens',
            value: '${execution.inputTokens + execution.outputTokens}',
            color: IrisTheme.success,
          ),
        ),
      ],
    ).animate().fadeIn(delay: 100.ms, duration: 200.ms);
  }

  Widget _buildResultSection(AgentExecution execution, bool isDark) {
    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Iconsax.document_text, size: 18, color: LuxuryColors.jadePremium),
              const SizedBox(width: 8),
              Text(
                'Result Summary',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            execution.resultSummary!,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          if (execution.alertsCreated > 0 || execution.insightsFound > 0) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (execution.alertsCreated > 0)
                  _buildResultChip(
                    '${execution.alertsCreated} alerts',
                    IrisTheme.warning,
                    isDark,
                  ),
                if (execution.alertsCreated > 0 && execution.insightsFound > 0)
                  const SizedBox(width: 8),
                if (execution.insightsFound > 0)
                  _buildResultChip(
                    '${execution.insightsFound} insights',
                    IrisTheme.info,
                    isDark,
                  ),
              ],
            ),
          ],
        ],
      ),
    ).animate().fadeIn(delay: 150.ms, duration: 200.ms);
  }

  Widget _buildResultChip(String text, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: IrisTheme.labelSmall.copyWith(color: color),
      ),
    );
  }

  Widget _buildLogsTimeline(List<ExecutionLog> logs, bool isDark) {
    if (logs.isEmpty) {
      return IrisCard(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Iconsax.document,
                size: 48,
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
              const SizedBox(height: 12),
              Text(
                'No logs available',
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: logs.asMap().entries.map((entry) {
        final index = entry.key;
        final log = entry.value;
        final isLast = index == logs.length - 1;

        return _buildLogEntry(log, isDark, isLast, index);
      }).toList(),
    );
  }

  Widget _buildLogEntry(ExecutionLog log, bool isDark, bool isLast, int index) {
    final levelColor = _getLevelColor(log.level);
    final categoryIcon = _getCategoryIcon(log.category);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Timeline indicator
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: levelColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(categoryIcon, size: 16, color: levelColor),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
          ],
        ),
        const SizedBox(width: 12),
        // Log content
        Expanded(
          child: IrisCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: levelColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        log.level,
                        style: IrisTheme.labelSmall.copyWith(
                          color: levelColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      log.category,
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    const Spacer(),
                    if (log.latencyMs != null)
                      Text(
                        '${log.latencyMs}ms',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  log.message,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                if (log.toolName != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Iconsax.code, size: 12, color: LuxuryColors.jadePremium),
                      const SizedBox(width: 4),
                      Text(
                        log.toolName!,
                        style: IrisTheme.labelSmall.copyWith(color: LuxuryColors.jadePremium),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05),
        ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return IrisTheme.success;
      case 'RUNNING':
        return IrisTheme.info;
      case 'FAILED':
        return IrisTheme.error;
      case 'CANCELLED':
        return IrisTheme.warning;
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return Iconsax.tick_circle;
      case 'RUNNING':
        return Iconsax.play;
      case 'FAILED':
        return Iconsax.close_circle;
      case 'CANCELLED':
        return Iconsax.stop_circle;
      default:
        return Iconsax.clock;
    }
  }

  Color _getLevelColor(String level) {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return IrisTheme.error;
      case 'WARN':
      case 'WARNING':
        return IrisTheme.warning;
      case 'DEBUG':
        return IrisTheme.info;
      default:
        return IrisTheme.success;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toUpperCase()) {
      case 'INIT':
        return Iconsax.flag;
      case 'LLM_CALL':
        return Iconsax.cpu;
      case 'TOOL_CALL':
        return Iconsax.code;
      case 'RESULT':
        return Iconsax.document_text;
      case 'ERROR':
        return Iconsax.warning_2;
      default:
        return Iconsax.info_circle;
    }
  }

  String _formatTimestamp(String timestamp) {
    try {
      final dt = DateTime.parse(timestamp);
      final now = DateTime.now();
      final diff = now.difference(dt);

      if (diff.inMinutes < 1) {
        return 'Just now';
      } else if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else {
        return '${diff.inDays}d ago';
      }
    } catch (e) {
      return timestamp;
    }
  }
}

class _MetricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    );
  }
}
