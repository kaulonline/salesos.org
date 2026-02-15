import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../data/agents_service.dart';
import 'agent_detail_page.dart';
import 'agent_builder_page.dart';

/// Provider for templates - autoDispose to always refresh when revisiting
final templatesProvider = FutureProvider.autoDispose<List<AgentTemplate>>((ref) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getTemplates();
});

/// Provider for user's custom agents - autoDispose to always refresh when revisiting
final customAgentsProvider = FutureProvider.autoDispose<List<CustomAgent>>((ref) async {
  final service = ref.watch(agentsServiceProvider);
  return service.getAgents();
});

class AgentsHubPage extends ConsumerStatefulWidget {
  const AgentsHubPage({super.key});

  @override
  ConsumerState<AgentsHubPage> createState() => _AgentsHubPageState();
}

class _AgentsHubPageState extends ConsumerState<AgentsHubPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _refresh() {
    ref.invalidate(templatesProvider);
    ref.invalidate(customAgentsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'AI Agents',
        showBackButton: true,
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: Icon(
              Iconsax.refresh,
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Tab bar
          Container(
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            decoration: BoxDecoration(
              color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: LuxuryColors.rolexGreen,
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              indicatorPadding: const EdgeInsets.all(4),
              labelColor: Colors.white,
              unselectedLabelColor: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              labelStyle: IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
              unselectedLabelStyle: IrisTheme.labelMedium,
              dividerColor: Colors.transparent,
              tabs: const [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.magic_star, size: 18),
                      SizedBox(width: 8),
                      Text('Templates'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.cpu, size: 18),
                      SizedBox(width: 8),
                      Text('My Agents'),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 200.ms),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _TemplatesTab(onCreateFromTemplate: _handleCreateFromTemplate),
                _MyAgentsTab(onCreateNew: _handleCreateNew),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _handleCreateNew,
        backgroundColor: LuxuryColors.rolexGreen,
        foregroundColor: Colors.white,
        icon: const Icon(Iconsax.add),
        label: const Text('Create Agent'),
      ).animate().scale(delay: 300.ms, duration: 200.ms),
    );
  }

  void _handleCreateFromTemplate(AgentTemplate template) async {
    HapticFeedback.mediumImpact();

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? IrisTheme.darkSurface
            : IrisTheme.lightSurface,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: LuxuryColors.jadePremium),
            const SizedBox(height: 16),
            Text(
              'Creating agent from template...',
              style: IrisTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );

    try {
      final service = ref.read(agentsServiceProvider);
      final agent = await service.createFromTemplate(template.id);

      if (mounted) {
        Navigator.of(context).pop(); // Close loading dialog

        if (agent != null) {
          _refresh();
          _tabController.animateTo(1); // Switch to My Agents tab

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Created "${agent.name}" from template'),
              backgroundColor: IrisTheme.success,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to create agent'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  void _handleCreateNew() {
    HapticFeedback.mediumImpact();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AgentBuilderPage(
          onSaved: (agent) {
            _refresh();
          },
        ),
      ),
    );
  }
}

// ============================================
// TEMPLATES TAB
// ============================================

class _TemplatesTab extends ConsumerWidget {
  final Function(AgentTemplate) onCreateFromTemplate;

  const _TemplatesTab({required this.onCreateFromTemplate});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final templatesAsync = ref.watch(templatesProvider);

    return templatesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: LuxuryColors.jadePremium)),
      error: (e, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
            const SizedBox(height: 16),
            Text('Failed to load templates', style: IrisTheme.bodyMedium),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => ref.invalidate(templatesProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (templates) {
        if (templates.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Iconsax.magic_star,
                  size: 64,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(height: 16),
                Text(
                  'No templates available',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Check back later for pre-built agent templates',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: templates.length,
          itemBuilder: (context, index) {
            final template = templates[index];
            return _TemplateCard(
              template: template,
              onUse: () => onCreateFromTemplate(template),
            ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
          },
        );
      },
    );
  }
}

class _TemplateCard extends StatelessWidget {
  final AgentTemplate template;
  final VoidCallback onUse;

  const _TemplateCard({
    required this.template,
    required this.onUse,
  });

  Color get _categoryColor {
    switch (template.category) {
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

  IconData get _categoryIcon {
    switch (template.category) {
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

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _categoryColor.withValues(alpha: 0.08),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _categoryColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(_categoryIcon, size: 20, color: _categoryColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              template.name,
                              style: IrisTheme.titleSmall.copyWith(
                                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (template.isFeatured)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Featured',
                                style: IrisTheme.labelSmall.copyWith(
                                  color: LuxuryColors.jadePremium,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${template.category} • ${template.complexity}',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Body
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  template.description,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),

                // Tags
                if (template.tags.isNotEmpty)
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: template.tags.take(3).map((tag) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          tag,
                          style: IrisTheme.labelSmall.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
              ],
            ),
          ),

          // Footer
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                ),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Iconsax.play,
                  size: 14,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(width: 4),
                Text(
                  '${template.useCount} uses',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                ),
                if (template.estimatedSetupTime != null) ...[
                  const SizedBox(width: 12),
                  Icon(
                    Iconsax.clock,
                    size: 14,
                    color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    template.estimatedSetupTime!,
                    style: IrisTheme.labelSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                  ),
                ],
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: onUse,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _categoryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  icon: const Icon(Iconsax.add, size: 16),
                  label: const Text('Use'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================
// MY AGENTS TAB
// ============================================

class _MyAgentsTab extends ConsumerWidget {
  final VoidCallback onCreateNew;

  const _MyAgentsTab({required this.onCreateNew});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final agentsAsync = ref.watch(customAgentsProvider);

    return agentsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: LuxuryColors.jadePremium)),
      error: (e, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
            const SizedBox(height: 16),
            Text('Failed to load agents', style: IrisTheme.bodyMedium),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => ref.invalidate(customAgentsProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (agents) {
        if (agents.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Iconsax.cpu,
                  size: 64,
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(height: 16),
                Text(
                  'No agents yet',
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create your first custom AI agent',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: onCreateNew,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: LuxuryColors.rolexGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  icon: const Icon(Iconsax.add),
                  label: const Text('Create Agent'),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: agents.length,
          itemBuilder: (context, index) {
            final agent = agents[index];
            return _AgentCard(
              agent: agent,
              onTap: () {
                HapticFeedback.lightImpact();
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => AgentDetailPage(
                      agentId: agent.id,
                      agent: agent,
                    ),
                  ),
                );
              },
            ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
          },
        );
      },
    );
  }
}

class _AgentCard extends StatelessWidget {
  final CustomAgent agent;
  final VoidCallback onTap;

  const _AgentCard({
    required this.agent,
    required this.onTap,
  });

  Color get _categoryColor {
    switch (agent.category) {
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

  IconData get _categoryIcon {
    switch (agent.category) {
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

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Row(
        children: [
          // Icon
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _categoryColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_categoryIcon, size: 24, color: _categoryColor),
          ),
          const SizedBox(width: 14),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        agent.name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: agent.isEnabled
                            ? IrisTheme.success.withValues(alpha: 0.15)
                            : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        agent.isEnabled ? 'Active' : 'Disabled',
                        style: IrisTheme.labelSmall.copyWith(
                          color: agent.isEnabled
                              ? IrisTheme.success
                              : (isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  agent.description,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'v${agent.version}',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Icon(
                      Iconsax.play,
                      size: 12,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${agent.runCount} runs',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    if (agent.runCount > 0) ...[
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: agent.successRate >= 80
                              ? IrisTheme.success.withValues(alpha: 0.15)
                              : agent.successRate >= 50
                                  ? IrisTheme.warning.withValues(alpha: 0.15)
                                  : IrisTheme.error.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${agent.successRate}%',
                          style: IrisTheme.labelSmall.copyWith(
                            color: agent.successRate >= 80
                                ? IrisTheme.success
                                : agent.successRate >= 50
                                    ? IrisTheme.warning
                                    : IrisTheme.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Chevron
          Icon(
            Iconsax.arrow_right_3,
            size: 18,
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          ),
        ],
      ),
    );
  }
}
