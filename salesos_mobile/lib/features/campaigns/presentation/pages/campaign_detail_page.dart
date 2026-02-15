import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/campaigns_service.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../widgets/campaign_form.dart';

/// Campaign status colors and styling
extension CampaignStatusDetailUI on CampaignStatus {
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

  LinearGradient get gradient {
    switch (this) {
      case CampaignStatus.planned:
        return LinearGradient(
          colors: [LuxuryColors.infoCobalt, LuxuryColors.infoCobalt.withValues(alpha: 0.8)],
        );
      case CampaignStatus.active:
        return LuxuryColors.emeraldGradient;
      case CampaignStatus.completed:
        return LuxuryColors.goldShimmer;
      case CampaignStatus.cancelled:
        return const LinearGradient(
          colors: [LuxuryColors.cancelledRed, LuxuryColors.cancelledRedDark],
        );
    }
  }
}

/// Campaign type icons
extension CampaignTypeDetailUI on CampaignType {
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

class CampaignDetailPage extends ConsumerStatefulWidget {
  final String campaignId;

  const CampaignDetailPage({super.key, required this.campaignId});

  @override
  ConsumerState<CampaignDetailPage> createState() => _CampaignDetailPageState();
}

class _CampaignDetailPageState extends ConsumerState<CampaignDetailPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index != _currentTabIndex) {
        setState(() {
          _currentTabIndex = _tabController.index;
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(campaignByIdProvider(widget.campaignId));
    ref.invalidate(campaignRoiProvider(widget.campaignId));
    ref.invalidate(campaignLeadsProvider(widget.campaignId));
    ref.invalidate(campaignContactsProvider(widget.campaignId));
    ref.invalidate(campaignOpportunitiesProvider(widget.campaignId));
  }

  Future<void> _handleDelete() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Delete Campaign',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
        ),
        content: Text(
          'Are you sure you want to delete this campaign? This action cannot be undone.',
          style: IrisTheme.bodyMedium.copyWith(
            color: LuxuryColors.textMuted,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: LuxuryColors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Delete',
              style: TextStyle(color: IrisTheme.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final service = ref.read(campaignsServiceProvider);
        final success = await service.deleteCampaign(widget.campaignId);
        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Campaign deleted successfully'),
              backgroundColor: IrisTheme.success,
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete campaign: $e'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final campaignAsync = ref.watch(campaignByIdProvider(widget.campaignId));
    final roiAsync = ref.watch(campaignRoiProvider(widget.campaignId));

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: IrisAppBar(
        title: 'Campaign',
        showBackButton: true,
        actions: [
          campaignAsync.maybeWhen(
            data: (campaign) => campaign != null
                ? Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          Iconsax.edit,
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          CampaignForm.show(
                            context: context,
                            initialData: campaign,
                            mode: IrisFormMode.edit,
                            onSuccess: _onRefresh,
                          );
                        },
                        tooltip: 'Edit',
                      ),
                      IconButton(
                        icon: Icon(
                          Iconsax.trash,
                          color: IrisTheme.error,
                        ),
                        onPressed: _handleDelete,
                        tooltip: 'Delete',
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: campaignAsync.when(
        loading: () => const _LoadingState(),
        error: (error, stack) => _ErrorState(
          onRetry: () => ref.refresh(campaignByIdProvider(widget.campaignId)),
        ),
        data: (campaign) {
          if (campaign == null) {
            return Center(
              child: Text(
                'Campaign not found',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            );
          }

          return Column(
            children: [
              // Tab Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: _buildTabBar(isDark),
              ),
              // Tab Content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Overview Tab
                    RefreshIndicator(
                      onRefresh: _onRefresh,
                      color: LuxuryColors.jadePremium,
                      backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
                      child: _OverviewTab(campaign: campaign, roiAsync: roiAsync),
                    ),
                    // Performance Tab
                    RefreshIndicator(
                      onRefresh: _onRefresh,
                      color: LuxuryColors.jadePremium,
                      backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
                      child: _PerformanceTab(campaign: campaign, roiAsync: roiAsync),
                    ),
                    // Audience Tab
                    RefreshIndicator(
                      onRefresh: _onRefresh,
                      color: LuxuryColors.jadePremium,
                      backgroundColor: isDark ? IrisTheme.darkSurface : Colors.white,
                      child: _AudienceTab(campaignId: widget.campaignId),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTabBar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.obsidian.withValues(alpha: 0.5)
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
            width: 1,
          ),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: LuxuryColors.champagneGold,
        unselectedLabelColor: isDark
            ? IrisTheme.darkTextSecondary
            : IrisTheme.lightTextSecondary,
        labelStyle: IrisTheme.labelMedium.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: IrisTheme.labelMedium,
        padding: const EdgeInsets.all(4),
        tabs: const [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.info_circle, size: 16),
                SizedBox(width: 6),
                Text('Overview'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.chart_2, size: 16),
                SizedBox(width: 6),
                Text('Performance'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.people, size: 16),
                SizedBox(width: 6),
                Text('Audience'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Loading state shimmer
class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const IrisDashboardShimmer(tier: LuxuryTier.gold);
  }
}

/// Error state with retry
class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;

  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Iconsax.warning_2, size: 48, color: IrisTheme.error),
          const SizedBox(height: 16),
          Text(
            'Failed to load campaign',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: onRetry,
            child: Text('Retry', style: TextStyle(color: LuxuryColors.jadePremium)),
          ),
        ],
      ),
    );
  }
}

/// Overview Tab - Campaign info, dates, budget
class _OverviewTab extends StatelessWidget {
  final CampaignModel campaign;
  final AsyncValue<CampaignROI?> roiAsync;

  const _OverviewTab({required this.campaign, required this.roiAsync});

  String _formatDate(DateTime? date) {
    if (date == null) return 'Not set';
    return DateFormat('MMM d, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Card with Campaign Info
          _CampaignHeroCard(campaign: campaign)
              .animate()
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.05),

          const SizedBox(height: 20),

          // Quick Stats Row
          _QuickStatsRow(campaign: campaign, roiAsync: roiAsync)
              .animate(delay: 100.ms)
              .fadeIn()
              .slideY(begin: 0.05),

          const SizedBox(height: 20),

          // Budget Section
          Text(
            'BUDGET',
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w600,
            ),
          ).animate(delay: 150.ms).fadeIn(),
          const SizedBox(height: 12),
          _BudgetCard(campaign: campaign)
              .animate(delay: 200.ms)
              .fadeIn()
              .slideY(begin: 0.05),

          const SizedBox(height: 20),

          // Campaign Details Section
          Text(
            'DETAILS',
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w600,
            ),
          ).animate(delay: 250.ms).fadeIn(),
          const SizedBox(height: 12),
          IrisCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _DetailRow(
                  icon: Iconsax.tag,
                  label: 'Type',
                  value: campaign.type.label,
                  valueColor: campaign.type.color,
                ),
                _DetailRow(
                  icon: Iconsax.calendar_1,
                  label: 'Start Date',
                  value: _formatDate(campaign.startDate),
                ),
                _DetailRow(
                  icon: Iconsax.calendar_tick,
                  label: 'End Date',
                  value: _formatDate(campaign.endDate),
                ),
                _DetailRow(
                  icon: Iconsax.calendar_2,
                  label: 'Created',
                  value: _formatDate(campaign.createdAt),
                  showDivider: campaign.description != null,
                ),
                if (campaign.description != null && campaign.description!.isNotEmpty)
                  _DetailRow(
                    icon: Iconsax.document_text,
                    label: 'Description',
                    value: campaign.description!,
                    showDivider: false,
                    isMultiLine: true,
                  ),
              ],
            ),
          ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.05),

          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

/// Campaign Hero Card
class _CampaignHeroCard extends StatelessWidget {
  final CampaignModel campaign;

  const _CampaignHeroCard({required this.campaign});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      variant: IrisCardVariant.premium,
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              // Type Icon
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: campaign.type.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: campaign.type.color.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Icon(
                  campaign.type.icon,
                  size: 24,
                  color: campaign.type.color,
                ),
              ),
              const SizedBox(width: 16),
              // Name and Type
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      campaign.name,
                      style: IrisTheme.titleLarge.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      campaign.type.label,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Status Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  gradient: campaign.status.gradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: campaign.status.color.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      campaign.status.icon,
                      size: 16,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      campaign.status.label.toUpperCase(),
                      style: IrisTheme.labelMedium.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              if (campaign.isRunning)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Live',
                        style: IrisTheme.labelSmall.copyWith(
                          color: LuxuryColors.rolexGreen,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Quick Stats Row
class _QuickStatsRow extends StatelessWidget {
  final CampaignModel campaign;
  final AsyncValue<CampaignROI?> roiAsync;

  const _QuickStatsRow({required this.campaign, required this.roiAsync});

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

    final statCards = [
      _QuickStatCard(
        label: 'ROI',
        value: '${campaign.roi >= 0 ? '+' : ''}${campaign.roi.toStringAsFixed(1)}%',
        icon: campaign.roi >= 0 ? Iconsax.trend_up : Iconsax.trend_down,
        gradient: campaign.roi >= 0
            ? LuxuryColors.goldShimmer
            : const LinearGradient(colors: [LuxuryColors.cancelledRed, LuxuryColors.cancelledRedDark]),
        valueColor: campaign.roi >= 0 ? null : IrisTheme.error,
        expanded: isTablet,
      ),
      _QuickStatCard(
        label: 'Leads',
        value: '${campaign.totalLeads}',
        icon: Iconsax.user_add,
        gradient: LuxuryColors.emeraldGradient,
        expanded: isTablet,
      ),
      _QuickStatCard(
        label: 'Conversion',
        value: '${campaign.conversionRate.toStringAsFixed(1)}%',
        icon: Iconsax.convert_3d_cube,
        gradient: const LinearGradient(
          colors: [LuxuryColors.infoCobalt, Color(0xFF2563EB)],
        ),
        expanded: isTablet,
      ),
      _QuickStatCard(
        label: 'Revenue',
        value: _formatCurrency(campaign.actualRevenue),
        icon: Iconsax.dollar_circle,
        gradient: LuxuryColors.platinumShimmer,
        expanded: isTablet,
      ),
    ];

    // On tablets, use Row with Expanded to fill width evenly
    if (isTablet) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SizedBox(
          height: 120,
          child: Row(
            children: statCards.asMap().entries.map((entry) {
              final index = entry.key;
              final card = entry.value;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: index == 0 ? 0 : 6,
                    right: index == statCards.length - 1 ? 0 : 6,
                  ),
                  child: card,
                ),
              );
            }).toList(),
          ),
        ),
      );
    }

    // On phones, use horizontal scrolling ListView
    return SizedBox(
      height: 120,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: statCards,
      ),
    );
  }
}

/// Quick Stat Card
class _QuickStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final LinearGradient gradient;
  final Color? valueColor;
  final bool expanded;

  const _QuickStatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    this.valueColor,
    this.expanded = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: expanded ? null : 130,
      margin: expanded ? null : const EdgeInsets.only(right: 12),
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
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 16,
              color: LuxuryColors.richBlack,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: IrisTheme.titleMedium.copyWith(
              color: valueColor ??
                  (isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
              fontWeight: FontWeight.w600,
            ),
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
    );
  }
}

/// Budget Card with progress visualization
class _BudgetCard extends StatelessWidget {
  final CampaignModel campaign;

  const _BudgetCard({required this.campaign});

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(2)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final utilization = campaign.budgetUtilization;
    final isOverBudget = campaign.actualCost > campaign.budgetedCost;

    final progressColor = isOverBudget
        ? IrisTheme.error
        : utilization > 80
            ? IrisTheme.warning
            : LuxuryColors.rolexGreen;

    return IrisCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Budget Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Budget Utilization',
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${utilization.clamp(0, 100).toStringAsFixed(1)}% used',
                    style: IrisTheme.bodySmall.copyWith(
                      color: progressColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: progressColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isOverBudget
                      ? Iconsax.warning_2
                      : utilization > 80
                          ? Iconsax.danger
                          : Iconsax.tick_circle,
                  color: progressColor,
                  size: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Progress Bar
          Container(
            height: 12,
            decoration: BoxDecoration(
              color: isDark
                  ? IrisTheme.darkSurfaceElevated
                  : IrisTheme.lightSurfaceElevated,
              borderRadius: BorderRadius.circular(6),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: (utilization / 100).clamp(0.0, 1.0),
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
          const SizedBox(height: 20),
          // Budget Values Row
          Row(
            children: [
              Expanded(
                child: _BudgetValueColumn(
                  label: 'Budgeted',
                  value: _formatCurrency(campaign.budgetedCost),
                  icon: Iconsax.wallet_3,
                  color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                ),
              ),
              Container(
                height: 40,
                width: 1,
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
              Expanded(
                child: _BudgetValueColumn(
                  label: 'Spent',
                  value: _formatCurrency(campaign.actualCost),
                  icon: Iconsax.money_send,
                  color: progressColor,
                ),
              ),
              Container(
                height: 40,
                width: 1,
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              ),
              Expanded(
                child: _BudgetValueColumn(
                  label: 'Remaining',
                  value: _formatCurrency((campaign.budgetedCost - campaign.actualCost).abs()),
                  icon: isOverBudget ? Iconsax.minus_cirlce : Iconsax.money_add,
                  color: isOverBudget ? IrisTheme.error : LuxuryColors.champagneGold,
                  isNegative: isOverBudget,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Budget Value Column
class _BudgetValueColumn extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool isNegative;

  const _BudgetValueColumn({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.isNegative = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(height: 8),
        Text(
          isNegative ? '-$value' : value,
          style: IrisTheme.titleSmall.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          label.toUpperCase(),
          style: IrisTheme.labelSmall.copyWith(
            color: LuxuryColors.textMuted,
            fontSize: 9,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}

/// Detail Row Widget
class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;
  final bool showDivider;
  final bool isMultiLine;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
    this.showDivider = true,
    this.isMultiLine = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment:
                isMultiLine ? CrossAxisAlignment.start : CrossAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: valueColor ??
                            (isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary),
                      ),
                      maxLines: isMultiLine ? 10 : 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (showDivider)
          Divider(
            height: 1,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
      ],
    );
  }
}

/// Performance Tab - ROI Metrics and Charts
class _PerformanceTab extends StatelessWidget {
  final CampaignModel campaign;
  final AsyncValue<CampaignROI?> roiAsync;

  const _PerformanceTab({required this.campaign, required this.roiAsync});

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(2)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ROI Hero Card
          _ROIHeroCard(campaign: campaign)
              .animate()
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.05),

          const SizedBox(height: 20),

          // Metrics Section
          Text(
            'KEY METRICS',
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w600,
            ),
          ).animate(delay: 100.ms).fadeIn(),
          const SizedBox(height: 12),

          // Metrics Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _MetricCard(
                label: 'Total Investment',
                value: _formatCurrency(campaign.actualCost),
                icon: Iconsax.wallet_2,
                color: LuxuryColors.infoCobalt,
              ),
              _MetricCard(
                label: 'Total Revenue',
                value: _formatCurrency(campaign.actualRevenue),
                icon: Iconsax.money_recive,
                color: LuxuryColors.rolexGreen,
              ),
              _MetricCard(
                label: 'Cost Per Lead',
                value: _formatCurrency(campaign.costPerLead),
                icon: Iconsax.user_tick,
                color: LuxuryColors.socialPurple,
              ),
              _MetricCard(
                label: 'Expected Revenue',
                value: _formatCurrency(campaign.expectedRevenue),
                icon: Iconsax.chart_success,
                color: LuxuryColors.champagneGold,
              ),
            ],
          ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.05),

          const SizedBox(height: 20),

          // Funnel Section
          Text(
            'CONVERSION FUNNEL',
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w600,
            ),
          ).animate(delay: 200.ms).fadeIn(),
          const SizedBox(height: 12),
          _ConversionFunnel(campaign: campaign)
              .animate(delay: 250.ms)
              .fadeIn()
              .slideY(begin: 0.05),

          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

/// ROI Hero Card
class _ROIHeroCard extends StatelessWidget {
  final CampaignModel campaign;

  const _ROIHeroCard({required this.campaign});

  @override
  Widget build(BuildContext context) {
    final isPositiveROI = campaign.roi >= 0;

    return IrisGradientCard(
      gradient: isPositiveROI
          ? LuxuryColors.emeraldGradient
          : const LinearGradient(colors: [LuxuryColors.cancelledRed, LuxuryColors.cancelledRedDark]),
      tier: isPositiveROI ? LuxuryTier.gold : LuxuryTier.gold,
      padding: const EdgeInsets.all(24),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'RETURN ON INVESTMENT',
                  style: IrisTheme.labelSmall.copyWith(
                    color: Colors.white.withValues(alpha: 0.8),
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${isPositiveROI ? '+' : ''}${campaign.roi.toStringAsFixed(1)}%',
                  style: IrisTheme.displayMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isPositiveROI ? 'Profitable' : 'Needs Attention',
                    style: IrisTheme.labelSmall.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              isPositiveROI ? Iconsax.trend_up : Iconsax.trend_down,
              size: 40,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// Metric Card
class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const Spacer(),
          Text(
            value,
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: LuxuryColors.textMuted,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

/// Conversion Funnel Visualization
class _ConversionFunnel extends StatelessWidget {
  final CampaignModel campaign;

  const _ConversionFunnel({required this.campaign});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final funnelSteps = [
      _FunnelStep(
        label: 'Total Leads',
        value: campaign.totalLeads,
        color: LuxuryColors.infoCobalt,
        percentage: 100,
      ),
      _FunnelStep(
        label: 'Contacts Engaged',
        value: campaign.totalContacts,
        color: LuxuryColors.socialPurple,
        percentage: campaign.totalLeads > 0
            ? (campaign.totalContacts / campaign.totalLeads * 100)
            : 0,
      ),
      _FunnelStep(
        label: 'Opportunities Created',
        value: campaign.totalOpportunities,
        color: LuxuryColors.warningAmber,
        percentage: campaign.totalLeads > 0
            ? (campaign.totalOpportunities / campaign.totalLeads * 100)
            : 0,
      ),
      _FunnelStep(
        label: 'Converted',
        value: campaign.convertedLeads,
        color: LuxuryColors.rolexGreen,
        percentage: campaign.conversionRate,
      ),
    ];

    return IrisCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: funnelSteps.asMap().entries.map((entry) {
          final index = entry.key;
          final step = entry.value;
          final isLast = index == funnelSteps.length - 1;

          return Column(
            children: [
              Row(
                children: [
                  // Left side - value and label
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${step.value}',
                          style: IrisTheme.titleMedium.copyWith(
                            color: step.color,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          step.label,
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Right side - progress bar
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${step.percentage.toStringAsFixed(1)}%',
                          style: IrisTheme.labelSmall.copyWith(
                            color: step.color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: isDark
                                ? IrisTheme.darkSurfaceElevated
                                : IrisTheme.lightSurfaceElevated,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: FractionallySizedBox(
                              alignment: Alignment.centerLeft,
                              widthFactor: (step.percentage / 100).clamp(0.0, 1.0),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: step.color,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (!isLast) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const SizedBox(width: 8),
                    Icon(
                      Iconsax.arrow_down_1,
                      size: 16,
                      color: LuxuryColors.textMuted.withValues(alpha: 0.5),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _FunnelStep {
  final String label;
  final int value;
  final Color color;
  final double percentage;

  const _FunnelStep({
    required this.label,
    required this.value,
    required this.color,
    required this.percentage,
  });
}

/// Audience Tab - Leads, Contacts, Opportunities
class _AudienceTab extends ConsumerWidget {
  final String campaignId;

  const _AudienceTab({required this.campaignId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leadsAsync = ref.watch(campaignLeadsProvider(campaignId));
    final contactsAsync = ref.watch(campaignContactsProvider(campaignId));
    final opportunitiesAsync = ref.watch(campaignOpportunitiesProvider(campaignId));

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Leads Section
          _AudienceSection(
            title: 'LEADS',
            icon: Iconsax.user_add,
            color: LuxuryColors.infoCobalt,
            dataAsync: leadsAsync,
            emptyMessage: 'No leads associated with this campaign',
            itemBuilder: (item) => _LeadListItem(lead: item),
          ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05),

          const SizedBox(height: 24),

          // Contacts Section
          _AudienceSection(
            title: 'CONTACTS',
            icon: Iconsax.profile_2user,
            color: LuxuryColors.socialPurple,
            dataAsync: contactsAsync,
            emptyMessage: 'No contacts associated with this campaign',
            itemBuilder: (item) => _ContactListItem(contact: item),
          ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

          const SizedBox(height: 24),

          // Opportunities Section
          _AudienceSection(
            title: 'OPPORTUNITIES',
            icon: Iconsax.money_recive,
            color: LuxuryColors.rolexGreen,
            dataAsync: opportunitiesAsync,
            emptyMessage: 'No opportunities associated with this campaign',
            itemBuilder: (item) => _OpportunityListItem(opportunity: item),
          ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.05),

          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

/// Audience Section Widget
class _AudienceSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final AsyncValue<List<Map<String, dynamic>>> dataAsync;
  final String emptyMessage;
  final Widget Function(Map<String, dynamic>) itemBuilder;

  const _AudienceSection({
    required this.title,
    required this.icon,
    required this.color,
    required this.dataAsync,
    required this.emptyMessage,
    required this.itemBuilder,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(width: 12),
            Text(
              title,
              style: IrisTheme.labelSmall.copyWith(
                color: LuxuryColors.textMuted,
                letterSpacing: 1.2,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            dataAsync.maybeWhen(
              data: (items) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${items.length}',
                  style: IrisTheme.labelSmall.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
        const SizedBox(height: 12),
        dataAsync.when(
          loading: () => const IrisCardShimmer(height: 80),
          error: (_, _) => IrisCard(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  'Failed to load data',
                  style: IrisTheme.bodyMedium.copyWith(
                    color: IrisTheme.error,
                  ),
                ),
              ),
            ),
          ),
          data: (items) {
            if (items.isEmpty) {
              return IrisCard(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Icon(
                          icon,
                          size: 32,
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          emptyMessage,
                          style: IrisTheme.bodyMedium.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }

            return Column(
              children: items.take(5).map((item) => itemBuilder(item)).toList(),
            );
          },
        ),
      ],
    );
  }
}

/// Lead List Item
class _LeadListItem extends StatelessWidget {
  final Map<String, dynamic> lead;

  const _LeadListItem({required this.lead});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final firstName = lead['FirstName'] as String? ?? lead['firstName'] as String? ?? '';
    final lastName = lead['LastName'] as String? ?? lead['lastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final company = lead['Company'] as String? ?? lead['company'] as String? ?? '';
    final status = lead['Status'] as String? ?? lead['status'] as String? ?? '';

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: () {
        HapticFeedback.lightImpact();
        final id = lead['Id'] as String? ?? lead['id'] as String?;
        if (id != null) {
          context.push('${AppRoutes.leads}/$id');
        }
      },
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: LuxuryColors.infoCobalt.withValues(alpha: 0.15),
            child: Text(
              _getInitials(firstName, lastName),
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.infoCobalt,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName.isNotEmpty ? fullName : 'Unknown',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                if (company.isNotEmpty)
                  Text(
                    company,
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                  ),
              ],
            ),
          ),
          if (status.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getStatusColor(status).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                status,
                style: IrisTheme.labelSmall.copyWith(
                  color: _getStatusColor(status),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _getInitials(String firstName, String lastName) {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$first$last'.isNotEmpty ? '$first$last' : '?';
  }

  Color _getStatusColor(String status) {
    final normalized = status.toLowerCase();
    if (normalized.contains('new') || normalized.contains('open')) {
      return LuxuryColors.infoCobalt;
    }
    if (normalized.contains('working') || normalized.contains('contacted')) {
      return LuxuryColors.warningAmber;
    }
    if (normalized.contains('qualified')) {
      return LuxuryColors.rolexGreen;
    }
    if (normalized.contains('converted')) {
      return IrisTheme.success;
    }
    return LuxuryColors.textMuted;
  }
}

/// Contact List Item
class _ContactListItem extends StatelessWidget {
  final Map<String, dynamic> contact;

  const _ContactListItem({required this.contact});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final firstName = contact['FirstName'] as String? ?? contact['firstName'] as String? ?? '';
    final lastName = contact['LastName'] as String? ?? contact['lastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final title = contact['Title'] as String? ?? contact['title'] as String? ?? '';
    final accountName = (contact['Account'] as Map?)?['Name'] as String? ??
        contact['accountName'] as String? ??
        '';

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: () {
        HapticFeedback.lightImpact();
        final id = contact['Id'] as String? ?? contact['id'] as String?;
        if (id != null) {
          context.push('${AppRoutes.contacts}/$id');
        }
      },
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: LuxuryColors.socialPurple.withValues(alpha: 0.15),
            child: Text(
              _getInitials(firstName, lastName),
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.socialPurple,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName.isNotEmpty ? fullName : 'Unknown',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                Text(
                  title.isNotEmpty
                      ? (accountName.isNotEmpty ? '$title at $accountName' : title)
                      : accountName,
                  style: IrisTheme.bodySmall.copyWith(
                    color: LuxuryColors.textMuted,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Icon(
            Iconsax.arrow_right_3,
            size: 16,
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          ),
        ],
      ),
    );
  }

  String _getInitials(String firstName, String lastName) {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$first$last'.isNotEmpty ? '$first$last' : '?';
  }
}

/// Opportunity List Item
class _OpportunityListItem extends StatelessWidget {
  final Map<String, dynamic> opportunity;

  const _OpportunityListItem({required this.opportunity});

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
    final name = opportunity['Name'] as String? ?? opportunity['name'] as String? ?? 'Untitled';
    final stage = opportunity['StageName'] as String? ?? opportunity['stage'] as String? ?? '';
    final amount = (opportunity['Amount'] as num?)?.toDouble() ??
        (opportunity['amount'] as num?)?.toDouble() ??
        0;
    final isWon = opportunity['IsWon'] as bool? ?? false;
    final isClosed = opportunity['IsClosed'] as bool? ?? false;

    Color stageColor;
    if (isWon) {
      stageColor = IrisTheme.success;
    } else if (isClosed) {
      stageColor = IrisTheme.error;
    } else {
      stageColor = _getStageColor(stage);
    }

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: () {
        HapticFeedback.lightImpact();
        final id = opportunity['Id'] as String? ?? opportunity['id'] as String?;
        if (id != null) {
          context.push('${AppRoutes.deals}/$id');
        }
      },
      child: Row(
        children: [
          Container(
            width: 4,
            height: 44,
            decoration: BoxDecoration(
              color: stageColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  stage,
                  style: IrisTheme.bodySmall.copyWith(
                    color: stageColor,
                  ),
                ),
              ],
            ),
          ),
          Text(
            _formatCurrency(amount),
            style: IrisTheme.titleSmall.copyWith(
              color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStageColor(String stage) {
    final normalized = stage.toLowerCase().replaceAll(' ', '');
    if (normalized.contains('prospecting')) return IrisTheme.stageProspecting;
    if (normalized.contains('qualified') || normalized.contains('qualification')) {
      return IrisTheme.stageQualified;
    }
    if (normalized.contains('proposal')) return IrisTheme.stageProposal;
    if (normalized.contains('negotiat')) return IrisTheme.stageNegotiation;
    if (normalized.contains('closedwon') || normalized.contains('won')) {
      return IrisTheme.success;
    }
    if (normalized.contains('closedlost') || normalized.contains('lost')) {
      return IrisTheme.error;
    }
    return IrisTheme.stageQualified;
  }
}
