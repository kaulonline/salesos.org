import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/role_gate.dart';
import '../../data/admin_service.dart';
import 'admin_users_page.dart';
import '../widgets/feature_toggle_tile.dart';

class AdminHubPage extends ConsumerStatefulWidget {
  const AdminHubPage({super.key});

  @override
  ConsumerState<AdminHubPage> createState() => _AdminHubPageState();
}

class _AdminHubPageState extends ConsumerState<AdminHubPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RoleGate.admin(
      fallback: Scaffold(
        appBar: const IrisAppBar(title: 'Admin'),
        body: IrisEmptyState(
          icon: Iconsax.lock,
          title: 'Access Denied',
          subtitle: 'You do not have admin privileges to view this page.',
        ),
      ),
      child: Scaffold(
        appBar: IrisAppBar(
          title: 'Admin Panel',
          showBackButton: true,
          tier: LuxuryTier.gold,
          actions: [
            IrisAppBarAction(
              icon: Iconsax.refresh,
              tooltip: 'Refresh',
              onPressed: () {
                ref.invalidate(adminStatsProvider);
                ref.invalidate(adminUsersProvider);
                ref.invalidate(adminFeaturesProvider);
                ref.invalidate(adminAuditLogsProvider);
              },
            ),
          ],
        ),
        body: Column(
          children: [
            _buildTabBar(context),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _OverviewTab(),
                  const AdminUsersPage(),
                  _FeaturesTab(),
                  _AuditTab(),
                  _SettingsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? LuxuryColors.champagneGold.withValues(alpha: 0.1)
                : LuxuryColors.champagneGold.withValues(alpha: 0.15),
          ),
        ),
      ),
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        labelColor:
            isDark ? LuxuryColors.champagneGold : LuxuryColors.textOnLight,
        unselectedLabelColor: LuxuryColors.textMuted,
        indicatorColor: LuxuryColors.champagneGold,
        indicatorWeight: 2,
        labelStyle: IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
        unselectedLabelStyle: IrisTheme.labelMedium,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        tabs: const [
          Tab(text: 'Overview'),
          Tab(text: 'Users'),
          Tab(text: 'Features'),
          Tab(text: 'Audit'),
          Tab(text: 'Settings'),
        ],
      ),
    );
  }
}

/// Overview tab with stat cards
class _OverviewTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(adminStatsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return statsAsync.when(
      loading: () => const IrisDashboardShimmer(),
      error: (err, _) => IrisEmptyState.error(
        message: 'Failed to load admin stats',
        onRetry: () => ref.invalidate(adminStatsProvider),
      ),
      data: (stats) => RefreshIndicator(
        color: LuxuryColors.champagneGold,
        onRefresh: () async => ref.invalidate(adminStatsProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LuxurySectionHeader(
                title: 'System Overview',
                subtitle: 'Platform health and metrics',
                tier: LuxuryTier.gold,
              ),
              const SizedBox(height: 20),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 1.5,
                children: [
                  _StatCard(
                    icon: Iconsax.profile_2user,
                    label: 'Total Users',
                    value: stats.totalUsers.toString(),
                    color: LuxuryColors.champagneGold,
                  ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1),
                  _StatCard(
                    icon: Iconsax.user_tick,
                    label: 'Active Users',
                    value: stats.activeUsers.toString(),
                    color: LuxuryColors.successGreen,
                  ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1),
                  _StatCard(
                    icon: Iconsax.building,
                    label: 'Organizations',
                    value: stats.totalOrgs.toString(),
                    color: LuxuryColors.infoCobalt,
                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                  _StatCard(
                    icon: Iconsax.dollar_circle,
                    label: 'Total Deals',
                    value: stats.totalDeals.toString(),
                    color: LuxuryColors.rolexGreen,
                  ).animate().fadeIn(delay: 250.ms).slideY(begin: 0.1),
                ],
              ),
              const SizedBox(height: 20),
              LuxuryCard(
                tier: LuxuryTier.gold,
                variant: LuxuryCardVariant.accent,
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        Iconsax.chart,
                        color: LuxuryColors.champagneGold,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'REVENUE',
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.textMuted,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$${_formatRevenue(stats.revenue)}',
                            style: IrisTheme.titleLarge.copyWith(
                              color: isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
            ],
          ),
        ),
      ),
    );
  }

  String _formatRevenue(double revenue) {
    if (revenue >= 1000000) {
      return '${(revenue / 1000000).toStringAsFixed(1)}M';
    } else if (revenue >= 1000) {
      return '${(revenue / 1000).toStringAsFixed(1)}K';
    }
    return revenue.toStringAsFixed(0);
  }
}

/// Stat card widget
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

    return LuxuryCard(
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: IrisTheme.titleLarge.copyWith(
                  color:
                      isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label.toUpperCase(),
                style: IrisTheme.labelSmall.copyWith(
                  color: LuxuryColors.textMuted,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Features tab
class _FeaturesTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featuresAsync = ref.watch(adminFeaturesProvider);

    return featuresAsync.when(
      loading: () => const IrisListShimmer(),
      error: (err, _) => IrisEmptyState.error(
        message: 'Failed to load features',
        onRetry: () => ref.invalidate(adminFeaturesProvider),
      ),
      data: (features) {
        if (features.isEmpty) {
          return IrisEmptyState(
            icon: Iconsax.toggle_on_circle,
            title: 'No feature flags',
            subtitle: 'Feature flags will appear here when configured.',
          );
        }

        return RefreshIndicator(
          color: LuxuryColors.champagneGold,
          onRefresh: () async => ref.invalidate(adminFeaturesProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: features.length,
            itemBuilder: (context, index) {
              final feature = features[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: FeatureToggleTile(feature: feature),
              ).animate().fadeIn(delay: Duration(milliseconds: 50 * index));
            },
          ),
        );
      },
    );
  }
}

/// Audit tab
class _AuditTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final logsAsync = ref.watch(adminAuditLogsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return logsAsync.when(
      loading: () => const IrisListShimmer(),
      error: (err, _) => IrisEmptyState.error(
        message: 'Failed to load audit logs',
        onRetry: () => ref.invalidate(adminAuditLogsProvider),
      ),
      data: (logs) {
        if (logs.isEmpty) {
          return IrisEmptyState(
            icon: Iconsax.document_text,
            title: 'No audit logs',
            subtitle: 'System activity will be recorded here.',
          );
        }

        return RefreshIndicator(
          color: LuxuryColors.champagneGold,
          onRefresh: () async => ref.invalidate(adminAuditLogsProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: logs.length,
            itemBuilder: (context, index) {
              final log = logs[index];
              return LuxuryCard(
                tier: LuxuryTier.gold,
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.activity,
                        size: 18,
                        color: LuxuryColors.champagneGold,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            log.action,
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          if (log.userName != null)
                            Text(
                              'by ${log.userName}',
                              style: IrisTheme.bodySmall.copyWith(
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                          if (log.entityType != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              '${log.entityType} ${log.entityId ?? ''}',
                              style: IrisTheme.bodySmall.copyWith(
                                color: LuxuryColors.textMuted,
                              ),
                            ),
                          ],
                          const SizedBox(height: 4),
                          Text(
                            _formatTimestamp(log.timestamp),
                            style: IrisTheme.labelSmall.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: Duration(milliseconds: 30 * index));
            },
          ),
        );
      },
    );
  }

  String _formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
  }
}

/// Settings tab
class _SettingsTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final service = ref.watch(adminServiceProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LuxurySectionHeader(
            title: 'System Settings',
            subtitle: 'Manage platform configuration',
            tier: LuxuryTier.gold,
          ),
          const SizedBox(height: 20),
          LuxuryListTile(
            title: 'Backup Database',
            subtitle: 'Create a full database backup',
            leadingIcon: Iconsax.cloud_add,
            tier: LuxuryTier.gold,
            onTap: () async {
              final result = await service.createBackup();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      result ? 'Backup created successfully' : 'Backup failed',
                    ),
                  ),
                );
              }
            },
          ),
          LuxuryListTile(
            title: 'System Configuration',
            subtitle: 'OAuth, maintenance mode, and more',
            leadingIcon: Iconsax.setting_2,
            tier: LuxuryTier.gold,
          ),
          LuxuryListTile(
            title: 'View Backups',
            subtitle: 'Manage existing database backups',
            leadingIcon: Iconsax.cloud,
            tier: LuxuryTier.gold,
          ),
        ],
      ),
    );
  }
}
