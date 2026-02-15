import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../data/agents_service.dart';
import 'agent_builder_page.dart';
import 'agent_execution_page.dart';
import 'alert_detail_page.dart';
import 'alerts_list_page.dart';

/// Provider for fetching a single agent by ID
final agentByIdProvider = FutureProvider.family<CustomAgent?, String>((ref, agentId) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getAgent(agentId);
});

/// Provider for agent executions
final agentExecutionsProvider = FutureProvider.family<List<AgentExecution>, String>((ref, agentId) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getExecutions(agentId, limit: 20);
});

/// Provider for agent alerts (all alerts for user, filtered by agent type if needed)
final agentAlertsProvider = FutureProvider<List<AgentAlert>>((ref) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getAlerts(limit: 10);
});

class AgentDetailPage extends ConsumerStatefulWidget {
  /// Agent ID to fetch and display
  final String agentId;

  /// Optional pre-loaded agent (if navigating from a list)
  final CustomAgent? agent;

  const AgentDetailPage({
    super.key,
    required this.agentId,
    this.agent,
  });

  @override
  ConsumerState<AgentDetailPage> createState() => _AgentDetailPageState();
}

class _AgentDetailPageState extends ConsumerState<AgentDetailPage> {
  CustomAgent? _agent;
  bool _isRunning = false;

  @override
  void initState() {
    super.initState();
    _agent = widget.agent;
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'sales':
        return IrisTheme.error;
      case 'engagement':
        return IrisTheme.info;
      case 'analytics':
        return IrisTheme.success;
      case 'automation':
        return IrisTheme.warning;
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'sales':
        return Iconsax.shield_tick;
      case 'engagement':
        return Iconsax.notification;
      case 'analytics':
        return Iconsax.chart;
      case 'automation':
        return Iconsax.flash;
      default:
        return Iconsax.cpu;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // If no agent is pre-loaded, fetch from API
    if (_agent == null) {
      final agentAsync = ref.watch(agentByIdProvider(widget.agentId));
      return agentAsync.when(
        loading: () => Scaffold(
          backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
          body: const Center(
            child: CircularProgressIndicator(color: LuxuryColors.jadePremium),
          ),
        ),
        error: (e, _) => Scaffold(
          backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
          appBar: AppBar(
            title: const Text('Error'),
            backgroundColor: Colors.transparent,
          ),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.warning_2, size: 64, color: IrisTheme.error),
                const SizedBox(height: 16),
                Text(
                  'Failed to load agent',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => ref.invalidate(agentByIdProvider(widget.agentId)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (agent) {
          if (agent == null) {
            return Scaffold(
              backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
              appBar: AppBar(backgroundColor: Colors.transparent),
              body: const Center(child: Text('Agent not found')),
            );
          }
          // Update local state and continue
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _agent == null) {
              setState(() => _agent = agent);
            }
          });
          return _buildAgentContent(context, agent, isDark);
        },
      );
    }

    return _buildAgentContent(context, _agent!, isDark);
  }

  Widget _buildAgentContent(BuildContext context, CustomAgent agent, bool isDark) {
    final executionsAsync = ref.watch(agentExecutionsProvider(agent.id));
    final alertsAsync = ref.watch(agentAlertsProvider);
    final categoryColor = _getCategoryColor(agent.category);
    final categoryIcon = _getCategoryIcon(agent.category);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: CustomScrollView(
        slivers: [
          // App bar with gradient header
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: categoryColor,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
            actions: [
              IconButton(
                icon: const Icon(Iconsax.edit, color: Colors.white),
                onPressed: () => _handleEdit(agent),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: Colors.white),
                onSelected: (action) => _handleMenuAction(action, agent),
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'duplicate',
                    child: Row(
                      children: [
                        Icon(Iconsax.copy, size: 18),
                        SizedBox(width: 8),
                        Text('Duplicate'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'toggle',
                    child: Row(
                      children: [
                        Icon(agent.isEnabled ? Iconsax.pause : Iconsax.play, size: 18),
                        const SizedBox(width: 8),
                        Text(agent.isEnabled ? 'Disable' : 'Enable'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Iconsax.trash, size: 18, color: IrisTheme.error),
                        const SizedBox(width: 8),
                        Text('Delete', style: TextStyle(color: IrisTheme.error)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      categoryColor,
                      categoryColor.withValues(alpha: 0.8),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(categoryIcon, size: 28, color: Colors.white),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    agent.name,
                                    style: IrisTheme.headlineSmall.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          'v${agent.version}',
                                          style: IrisTheme.labelSmall.copyWith(color: Colors.white),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: agent.isEnabled
                                              ? Colors.white.withValues(alpha: 0.3)
                                              : Colors.black.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          agent.isEnabled ? 'Active' : 'Disabled',
                                          style: IrisTheme.labelSmall.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Run button
                  _buildRunSection(isDark, agent),
                  const SizedBox(height: 20),

                  // Stats
                  _buildStatsSection(isDark, agent),
                  const SizedBox(height: 20),

                  // Description
                  _buildDescriptionSection(isDark, agent),
                  const SizedBox(height: 20),

                  // Configuration
                  _buildConfigSection(isDark, agent),
                  const SizedBox(height: 20),

                  // Alerts
                  _buildAlertsSection(isDark, alertsAsync, agent),
                  const SizedBox(height: 20),

                  // Executions
                  _buildExecutionsSection(isDark, executionsAsync, agent),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRunSection(bool isDark, CustomAgent agent) {
    return IrisCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: agent.isEnabled && !_isRunning ? () => _handleRun(agent) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: LuxuryColors.rolexGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: _isRunning
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Iconsax.play),
                  label: Text(
                    _isRunning ? 'Running...' : 'Run Agent',
                    style: IrisTheme.labelLarge.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
          if (!agent.isEnabled)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Row(
                children: [
                  Icon(Iconsax.info_circle, size: 16, color: IrisTheme.warning),
                  const SizedBox(width: 8),
                  Text(
                    'Enable this agent to run it',
                    style: IrisTheme.bodySmall.copyWith(color: IrisTheme.warning),
                  ),
                ],
              ),
            ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideY(begin: 0.1);
  }

  Widget _buildStatsSection(bool isDark, CustomAgent agent) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Iconsax.play,
            label: 'Total Runs',
            value: '${agent.runCount}',
            color: IrisTheme.info,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Iconsax.tick_circle,
            label: 'Success Rate',
            value: '${agent.successRate}%',
            color: agent.successRate >= 80
                ? IrisTheme.success
                : agent.successRate >= 50
                    ? IrisTheme.warning
                    : IrisTheme.error,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Iconsax.clock,
            label: 'Last Run',
            value: agent.lastRunAt != null ? _formatLastRun(agent.lastRunAt!) : 'Never',
            color: LuxuryColors.jadePremium,
          ),
        ),
      ],
    ).animate().fadeIn(delay: 100.ms, duration: 200.ms);
  }

  Widget _buildDescriptionSection(bool isDark, CustomAgent agent) {
    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Iconsax.document_text, size: 18, color: LuxuryColors.jadePremium),
              const SizedBox(width: 8),
              Text(
                'Description',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            agent.description,
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 150.ms, duration: 200.ms);
  }

  Widget _buildConfigSection(bool isDark, CustomAgent agent) {
    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Iconsax.setting_2, size: 18, color: LuxuryColors.jadePremium),
              const SizedBox(width: 8),
              Text(
                'Configuration',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _ConfigRow(label: 'Model', value: agent.modelId),
          _ConfigRow(label: 'Temperature', value: agent.temperature.toString()),
          _ConfigRow(label: 'Max Tokens', value: '${agent.maxTokens}'),
          _ConfigRow(label: 'Category', value: agent.category),
          _ConfigRow(label: 'Requires Approval', value: agent.requiresApproval ? 'Yes' : 'No'),
          if (agent.enabledTools.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Enabled Tools',
                    style: IrisTheme.labelMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: agent.enabledTools.take(5).map((tool) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          tool,
                          style: IrisTheme.labelSmall.copyWith(color: LuxuryColors.jadePremium),
                        ),
                      );
                    }).toList(),
                  ),
                  if (agent.enabledTools.length > 5)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '+${agent.enabledTools.length - 5} more',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms, duration: 200.ms);
  }

  Widget _buildAlertsSection(bool isDark, AsyncValue<List<AgentAlert>> alertsAsync, CustomAgent agent) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Iconsax.notification, size: 18, color: LuxuryColors.jadePremium),
            const SizedBox(width: 8),
            Text(
              'Recent Alerts',
              style: IrisTheme.titleSmall.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: () {
                HapticFeedback.lightImpact();
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context) => const AlertsListPage()),
                );
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        alertsAsync.when(
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(color: LuxuryColors.jadePremium),
            ),
          ),
          error: (e, _) => IrisCard(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                'Failed to load alerts',
                style: IrisTheme.bodySmall.copyWith(color: IrisTheme.error),
              ),
            ),
          ),
          data: (alerts) {
            // Filter to show only pending alerts first, then recent ones
            final pendingAlerts = alerts.where((a) => a.isPending).toList();
            final displayAlerts = pendingAlerts.isNotEmpty ? pendingAlerts.take(3).toList() : alerts.take(3).toList();

            if (displayAlerts.isEmpty) {
              return IrisCard(
                padding: const EdgeInsets.all(32),
                child: Center(
                  child: Column(
                    children: [
                      Icon(
                        Iconsax.notification,
                        size: 40,
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No alerts yet',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Run agents to generate insights and alerts',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }

            return Column(
              children: displayAlerts.map((alert) => _AlertCard(alert: alert)).toList(),
            );
          },
        ),
      ],
    ).animate().fadeIn(delay: 220.ms, duration: 200.ms);
  }

  Widget _buildExecutionsSection(bool isDark, AsyncValue<List<AgentExecution>> executionsAsync, CustomAgent agent) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Iconsax.activity, size: 18, color: LuxuryColors.jadePremium),
            const SizedBox(width: 8),
            Text(
              'Recent Executions',
              style: IrisTheme.titleSmall.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: () => ref.invalidate(agentExecutionsProvider(agent.id)),
              child: const Text('Refresh'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        executionsAsync.when(
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(color: LuxuryColors.jadePremium),
            ),
          ),
          error: (e, _) => IrisCard(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                'Failed to load executions',
                style: IrisTheme.bodySmall.copyWith(color: IrisTheme.error),
              ),
            ),
          ),
          data: (executions) {
            if (executions.isEmpty) {
              return IrisCard(
                padding: const EdgeInsets.all(32),
                child: Center(
                  child: Column(
                    children: [
                      Icon(
                        Iconsax.clock,
                        size: 40,
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No executions yet',
                        style: IrisTheme.bodyMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Run the agent to see execution history',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return Column(
              children: executions.take(5).map((exec) => _ExecutionCard(
                execution: exec,
                agentName: agent.name,
              )).toList(),
            );
          },
        ),
      ],
    ).animate().fadeIn(delay: 250.ms, duration: 200.ms);
  }

  String _formatLastRun(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
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
      return 'Unknown';
    }
  }

  void _handleRun(CustomAgent agent) async {
    HapticFeedback.mediumImpact();
    setState(() => _isRunning = true);

    try {
      final service = ref.read(agentsServiceProvider);
      final result = await service.runAgent(agent.id);

      if (mounted) {
        if (result != null) {
          // Navigate to execution page immediately to see real-time logs
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => AgentExecutionPage(
                executionId: result.executionId,
                agentName: agent.name,
              ),
            ),
          ).then((_) {
            // Refresh executions when returning from execution page
            if (mounted) {
              ref.invalidate(agentExecutionsProvider(agent.id));
            }
          });
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to run agent'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isRunning = false);
      }
    }
  }

  void _handleEdit(CustomAgent agent) {
    HapticFeedback.lightImpact();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AgentBuilderPage(
          agent: agent,
          onSaved: (updatedAgent) {
            setState(() => _agent = updatedAgent);
          },
        ),
      ),
    );
  }

  void _handleMenuAction(String action, CustomAgent agent) async {
    HapticFeedback.lightImpact();
    final service = ref.read(agentsServiceProvider);

    switch (action) {
      case 'toggle':
        try {
          final updated = await service.toggleAgent(agent.id, !agent.isEnabled);
          if (updated != null && mounted) {
            setState(() => _agent = updated);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(updated.isEnabled ? 'Agent enabled' : 'Agent disabled'),
                backgroundColor: IrisTheme.success,
              ),
            );
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: $e'), backgroundColor: IrisTheme.error),
            );
          }
        }
        break;

      case 'duplicate':
        // For now, just show a message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Duplicate feature coming soon')),
        );
        break;

      case 'delete':
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Delete Agent?'),
            content: Text('Are you sure you want to delete "${agent.name}"? This cannot be undone.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: TextButton.styleFrom(foregroundColor: IrisTheme.error),
                child: const Text('Delete'),
              ),
            ],
          ),
        );

        if (confirmed == true && mounted) {
          final success = await service.deleteAgent(agent.id);
          if (success && mounted) {
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Agent deleted'),
                backgroundColor: IrisTheme.success,
              ),
            );
          }
        }
        break;
    }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      padding: const EdgeInsets.all(14),
      child: Column(
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

class _ConfigRow extends StatelessWidget {
  final String label;
  final String value;

  const _ConfigRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          Text(
            value,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExecutionCard extends StatelessWidget {
  final AgentExecution execution;
  final String? agentName;

  const _ExecutionCard({required this.execution, this.agentName});

  Color get _statusColor {
    switch (execution.status) {
      case 'COMPLETED':
        return IrisTheme.success;
      case 'FAILED':
        return IrisTheme.error;
      case 'RUNNING':
        return IrisTheme.info;
      default:
        return IrisTheme.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => AgentExecutionPage(
              executionId: execution.id,
              agentName: agentName,
            ),
          ),
        );
      },
      child: IrisCard(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        child: Row(
        children: [
          Container(
            width: 8,
            height: 40,
            decoration: BoxDecoration(
              color: _statusColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        execution.status,
                        style: IrisTheme.labelSmall.copyWith(
                          color: _statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Spacer(),
                    if (execution.executionTimeMs != null)
                      Text(
                        '${execution.durationSeconds.toStringAsFixed(1)}s',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          fontFamily: 'monospace',
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _formatDate(execution.startedAt),
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Iconsax.flash, size: 12, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                    const SizedBox(width: 4),
                    Text(
                      '${execution.llmCalls} LLM calls',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Icon(Iconsax.notification, size: 12, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                    const SizedBox(width: 4),
                    Text(
                      '${execution.alertsCreated} alerts',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Chevron to indicate tappable
          Icon(
            Icons.chevron_right,
            size: 20,
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          ),
        ],
      ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.month}/${date.day}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr;
    }
  }
}

class _AlertCard extends ConsumerWidget {
  final AgentAlert alert;

  const _AlertCard({required this.alert});

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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final priorityColor = _getPriorityColor(alert.priority);
    final alertTypeColor = _getAlertTypeColor(alert.alertType);
    final alertTypeIcon = _getAlertTypeIcon(alert.alertType);
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
          ref.invalidate(agentAlertsProvider);
        });
      },
      child: IrisCard(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    alertTypeColor,
                    alertTypeColor.withValues(alpha: 0.7),
                  ],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(alertTypeIcon, color: Colors.white, size: 20),
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
                      if (pendingActions > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Iconsax.flash, size: 10, color: LuxuryColors.jadePremium),
                              const SizedBox(width: 4),
                              Text(
                                '$pendingActions',
                                style: IrisTheme.labelSmall.copyWith(
                                  color: LuxuryColors.jadePremium,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    alert.title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (alert.entityName.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      '${alert.entityType}: ${alert.entityName}',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (!alert.isPending)
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: alert.isActioned
                      ? IrisTheme.success.withValues(alpha: 0.15)
                      : IrisTheme.darkTextTertiary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(
                  alert.isActioned ? Iconsax.tick_circle : Iconsax.close_circle,
                  color: alert.isActioned ? IrisTheme.success : IrisTheme.darkTextTertiary,
                  size: 14,
                ),
              )
            else
              Icon(
                Icons.chevron_right,
                size: 20,
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
              ),
          ],
        ),
      ),
    );
  }
}
