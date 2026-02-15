import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/campaigns_service.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../widgets/campaign_form.dart';

/// Campaign status colors and styling
extension CampaignStatusUI on CampaignStatus {
  Color get color {
    switch (this) {
      case CampaignStatus.planned:
        return IrisTheme.accentBlueLight;
      case CampaignStatus.active:
        return LuxuryColors.rolexGreen;
      case CampaignStatus.completed:
        return IrisTheme.stageClosedWon;
      case CampaignStatus.cancelled:
        return IrisTheme.stageClosedLost;
    }
  }

  IconData get icon {
    switch (this) {
      case CampaignStatus.planned:
        return Iconsax.calendar_1;
      case CampaignStatus.active:
        return Iconsax.play_circle;
      case CampaignStatus.completed:
        return Iconsax.tick_circle;
      case CampaignStatus.cancelled:
        return Iconsax.close_circle;
    }
  }
}

/// Campaign type icons
extension CampaignTypeUI on CampaignType {
  IconData get icon {
    switch (this) {
      case CampaignType.email:
        return Iconsax.sms;
      case CampaignType.social:
        return Iconsax.message;
      case CampaignType.webinar:
        return Iconsax.video;
      case CampaignType.event:
        return Iconsax.calendar;
      case CampaignType.advertising:
        return Iconsax.chart;
      case CampaignType.referral:
        return Iconsax.people;
      case CampaignType.other:
        return Iconsax.tag;
    }
  }

  Color get color {
    switch (this) {
      case CampaignType.email:
        return LuxuryColors.emailBlue;
      case CampaignType.social:
        return LuxuryColors.socialPurple;
      case CampaignType.webinar:
        return LuxuryColors.webinarPink;
      case CampaignType.event:
        return LuxuryColors.eventOrange;
      case CampaignType.advertising:
        return LuxuryColors.advertisingGreen;
      case CampaignType.referral:
        return LuxuryColors.referralIndigo;
      case CampaignType.other:
        return LuxuryColors.warmGold;
    }
  }
}

class CampaignsPage extends ConsumerStatefulWidget {
  const CampaignsPage({super.key});

  @override
  ConsumerState<CampaignsPage> createState() => _CampaignsPageState();
}

class _CampaignsPageState extends ConsumerState<CampaignsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
    });
  }

  Future<void> _onRefresh() async {
    ref.invalidate(campaignsProvider);
    ref.invalidate(campaignStatsProvider);
  }

  List<CampaignModel> _filterCampaigns(List<CampaignModel> campaigns) {
    var filtered = campaigns;

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((campaign) {
        return campaign.name.toLowerCase().contains(_searchQuery) ||
            (campaign.description?.toLowerCase().contains(_searchQuery) ?? false) ||
            campaign.type.label.toLowerCase().contains(_searchQuery);
      }).toList();
    }

    // Apply tab filter
    switch (_tabController.index) {
      case 1: // Active
        filtered = filtered.where((c) => c.status == CampaignStatus.active).toList();
        break;
      case 2: // Completed
        filtered = filtered.where((c) => c.status == CampaignStatus.completed).toList();
        break;
      case 3: // Planned
        filtered = filtered.where((c) => c.status == CampaignStatus.planned).toList();
        break;
    }

    return filtered;
  }

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(0)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final campaignsAsync = ref.watch(campaignsProvider);
    final statsAsync = ref.watch(campaignStatsProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: _onRefresh,
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(
                children: [
                  // Back button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      context.pop();
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? IrisTheme.darkSurfaceElevated
                            : IrisTheme.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.arrow_left,
                        size: 20,
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Campaigns',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        statsAsync.when(
                          data: (stats) => Text(
                            '${stats.activeCampaigns} active, ${_formatCurrency(stats.totalSpent)} spent',
                            style: IrisTheme.bodySmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodySmall.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (_, _) => const SizedBox.shrink(),
                        ),
                      ],
                    ),
                  ),
                  // Add Campaign Button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      CampaignForm.show(
                        context: context,
                        mode: IrisFormMode.create,
                        onSuccess: _onRefresh,
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.add,
                        size: 20,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Stats Cards Row
            statsAsync.when(
              data: (stats) => _StatsRow(stats: stats),
              loading: () => const SizedBox(height: 100),
              error: (_, _) => const SizedBox.shrink(),
            ),

            const SizedBox(height: 12),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: IrisSearchField(
                controller: _searchController,
                hint: 'Search campaigns...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Status Tabs
            TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
              unselectedLabelColor: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              indicatorColor: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
              indicatorWeight: 3,
              labelStyle: IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
              onTap: (_) => setState(() {}),
              tabs: const [
                Tab(text: 'All'),
                Tab(text: 'Active'),
                Tab(text: 'Completed'),
                Tab(text: 'Planned'),
              ],
            ).animate(delay: 150.ms).fadeIn(),

            const SizedBox(height: 8),

            // Campaign List
            Expanded(
              child: campaignsAsync.when(
                data: (campaigns) {
                  final filteredCampaigns = _filterCampaigns(campaigns);
                  if (filteredCampaigns.isEmpty) {
                    return IrisEmptyState(
                      icon: Iconsax.chart_1,
                      title: 'No campaigns found',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try adjusting your search'
                          : 'Create your first campaign to get started',
                      actionLabel: 'Create Campaign',
                      onAction: () {
                        HapticFeedback.lightImpact();
                        CampaignForm.show(
                          context: context,
                          mode: IrisFormMode.create,
                          onSuccess: _onRefresh,
                        );
                      },
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                    backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    child: _CampaignsList(campaigns: filteredCampaigns),
                  );
                },
                loading: () => const IrisListShimmer(itemCount: 5, itemHeight: 140),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load campaigns',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _onRefresh,
                        child: Text(
                          'Retry',
                          style: TextStyle(
                            color: isDark
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.rolexGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Stats summary row at top
class _StatsRow extends StatelessWidget {
  final CampaignStats stats;

  const _StatsRow({required this.stats});

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(0)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = Responsive.shouldShowSplitView(context);
    final containerHeight = Responsive.value<double>(
      context,
      compact: 110.0,
      medium: 115.0,
      expanded: 120.0,
    );

    final statCards = [
      _StatCardData(
        label: 'Total ROI',
        value: '${stats.averageROI.toStringAsFixed(1)}%',
        icon: Iconsax.chart_2,
        isPositive: stats.averageROI > 0,
        gradient: stats.averageROI > 0
            ? LuxuryColors.goldShimmer
            : const LinearGradient(colors: [LuxuryColors.cancelledRedDark, LuxuryColors.cancelledRed]),
      ),
      _StatCardData(
        label: 'Revenue',
        value: _formatCurrency(stats.totalRevenue),
        icon: Iconsax.dollar_circle,
        isPositive: true,
        gradient: LuxuryColors.emeraldGradient,
      ),
      _StatCardData(
        label: 'Leads',
        value: '${stats.totalLeadsGenerated}',
        icon: Iconsax.user_add,
        isPositive: true,
        gradient: const LinearGradient(
          colors: [LuxuryColors.infoCobalt, Color(0xFF2563EB)],
        ),
      ),
      _StatCardData(
        label: 'Conversion',
        value: '${stats.averageConversionRate.toStringAsFixed(1)}%',
        icon: Iconsax.convert_3d_cube,
        isPositive: stats.averageConversionRate > 0,
        gradient: LuxuryColors.platinumShimmer,
      ),
    ];

    // On tablets, display cards in a row that fills the width
    if (isTablet) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SizedBox(
          height: containerHeight,
          child: Row(
            children: statCards.asMap().entries.map((entry) {
              final index = entry.key;
              final data = entry.value;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: index == 0 ? 0 : 6,
                    right: index == statCards.length - 1 ? 0 : 6,
                  ),
                  child: _StatCard(
                    label: data.label,
                    value: data.value,
                    icon: data.icon,
                    isPositive: data.isPositive,
                    gradient: data.gradient,
                    expanded: true,
                  ),
                ),
              );
            }).toList(),
          ).animate().fadeIn(duration: 400.ms),
        ),
      );
    }

    // On phones, use horizontal scrolling
    return SizedBox(
      height: containerHeight,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: statCards.map((data) => _StatCard(
          label: data.label,
          value: data.value,
          icon: data.icon,
          isPositive: data.isPositive,
          gradient: data.gradient,
          width: 130,
        )).toList().animate(interval: 50.ms).fadeIn().slideX(begin: 0.1),
      ),
    );
  }
}

/// Data class for stat card
class _StatCardData {
  final String label;
  final String value;
  final IconData icon;
  final bool isPositive;
  final LinearGradient gradient;

  const _StatCardData({
    required this.label,
    required this.value,
    required this.icon,
    required this.isPositive,
    required this.gradient,
  });
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool isPositive;
  final LinearGradient gradient;
  final double? width;
  final bool expanded;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.isPositive,
    required this.gradient,
    this.width,
    this.expanded = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: expanded ? null : (width ?? 140),
      margin: expanded ? EdgeInsets.zero : const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: gradient.colors.first.withValues(alpha: 0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: gradient.colors.first.withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 18,
              color: LuxuryColors.richBlack,
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value,
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w600,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                label.toUpperCase(),
                style: IrisTheme.labelSmall.copyWith(
                  color: LuxuryColors.textMuted,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Campaigns list view
class _CampaignsList extends StatelessWidget {
  final List<CampaignModel> campaigns;

  const _CampaignsList({required this.campaigns});

  @override
  Widget build(BuildContext context) {
    final isTablet = Responsive.shouldShowSplitView(context);

    if (isTablet) {
      return LayoutBuilder(
        builder: (context, constraints) {
          // Determine grid columns based on available width
          final availableWidth = constraints.maxWidth;
          int crossAxisCount = 2;
          if (availableWidth > 1200) {
            crossAxisCount = 3;
          } else if (availableWidth < 700) {
            crossAxisCount = 1;
          }

          // Calculate card width and appropriate aspect ratio
          final cardWidth = (availableWidth - 48 - (16 * (crossAxisCount - 1))) / crossAxisCount;
          // Aspect ratio: width / height - cards need ~200-220 height for content
          final aspectRatio = cardWidth / 210;

          return GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              mainAxisSpacing: 12,
              crossAxisSpacing: 16,
              childAspectRatio: aspectRatio.clamp(1.2, 2.5),
            ),
            itemCount: campaigns.length,
            itemBuilder: (context, index) {
              return _CampaignCard(campaign: campaigns[index])
                  .animate(delay: (index * 30).ms)
                  .fadeIn()
                  .scale(begin: const Offset(0.95, 0.95));
            },
          );
        },
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      itemCount: campaigns.length,
      itemBuilder: (context, index) {
        return _CampaignCard(campaign: campaigns[index])
            .animate(delay: (index * 50).ms)
            .fadeIn()
            .slideX(begin: 0.05);
      },
    );
  }
}

/// Individual campaign card
class _CampaignCard extends StatelessWidget {
  final CampaignModel campaign;

  const _CampaignCard({required this.campaign});

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(0)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '-';
    return DateFormat('MMM d, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final roiColor = campaign.roi >= 0 ? LuxuryColors.champagneGold : IrisTheme.error;
    final roiSign = campaign.roi >= 0 ? '+' : '';

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      onTap: () => context.push('${AppRoutes.campaigns}/${campaign.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header row: Type icon, name, status
          Row(
            children: [
              // Type icon
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: campaign.type.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  campaign.type.icon,
                  size: 18,
                  color: campaign.type.color,
                ),
              ),
              const SizedBox(width: 12),
              // Name and type
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      campaign.name,
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
                      campaign.type.label,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: campaign.status.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      campaign.status.icon,
                      size: 12,
                      color: campaign.status.color,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      campaign.status.label,
                      style: IrisTheme.labelSmall.copyWith(
                        color: campaign.status.color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Budget progress bar
          _BudgetProgressBar(
            spent: campaign.actualCost,
            budget: campaign.budgetedCost,
          ),

          const SizedBox(height: 12),

          // Metrics row
          Row(
            children: [
              // ROI
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          campaign.roi >= 0 ? Iconsax.trend_up : Iconsax.trend_down,
                          size: 14,
                          color: roiColor,
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            '$roiSign${campaign.roi.toStringAsFixed(1)}%',
                            style: IrisTheme.titleSmall.copyWith(
                              color: roiColor,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'ROI',
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              // Leads
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${campaign.totalLeads}',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.jadePremium
                            : LuxuryColors.rolexGreen,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Leads',
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              // Revenue
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _formatCurrency(campaign.actualRevenue),
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Revenue',
                      style: IrisTheme.labelSmall.copyWith(
                        color: LuxuryColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              // Dates
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.calendar,
                        size: 12,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDate(campaign.endDate ?? campaign.startDate),
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Budget progress bar with spent vs budget
class _BudgetProgressBar extends StatelessWidget {
  final double spent;
  final double budget;

  const _BudgetProgressBar({
    required this.spent,
    required this.budget,
  });

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progress = budget > 0 ? (spent / budget).clamp(0.0, 1.0) : 0.0;
    final isOverBudget = spent > budget;

    final progressColor = isOverBudget
        ? IrisTheme.error
        : progress > 0.8
            ? IrisTheme.warning
            : LuxuryColors.rolexGreen;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                'Budget: ${_formatCurrency(spent)} / ${_formatCurrency(budget)}',
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text(
              '${(progress * 100).toStringAsFixed(0)}%',
              style: IrisTheme.labelSmall.copyWith(
                color: progressColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          height: 6,
          decoration: BoxDecoration(
            color: isDark
                ? IrisTheme.darkSurfaceElevated
                : IrisTheme.lightSurfaceElevated,
            borderRadius: BorderRadius.circular(3),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: progress,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      progressColor,
                      progressColor.withValues(alpha: 0.7),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
