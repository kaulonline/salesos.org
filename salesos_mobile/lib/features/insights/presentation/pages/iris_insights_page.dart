import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/iris_rank_service.dart';
import '../../../../core/services/pexels_service.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/app_background.dart';

/// IRIS Insights Page - Premium Analytics Dashboard
/// Enterprise-grade design with sophisticated visuals
class IrisInsightsPage extends ConsumerStatefulWidget {
  const IrisInsightsPage({super.key});

  @override
  ConsumerState<IrisInsightsPage> createState() => _IrisInsightsPageState();
}

class _IrisInsightsPageState extends ConsumerState<IrisInsightsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    ref.invalidate(hotLeadsProvider);
    ref.invalidate(atRiskEntitiesProvider);
    ref.invalidate(portfolioInsightsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isTablet = Responsive.isTablet(context);

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: RefreshIndicator(
        onRefresh: _onRefresh,
        color: LuxuryColors.jadePremium,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            _buildHeroHeader(context, isDark),
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(isTablet ? 24 : 16),
                child: _PortfolioHealthCard(),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _TabBarDelegate(
                tabController: _tabController,
                isDark: isDark,
              ),
            ),
            SliverFillRemaining(
              hasScrollBody: true,
              child: TabBarView(
                controller: _tabController,
                children: const [
                  _HotLeadsTab(),
                  _AtRiskTab(),
                  _AnalyticsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildHeroHeader(BuildContext context, bool isDark) {
    // Watch Pexels images for analytics
    final analyticsImages = ref.watch(analyticsImagesProvider);

    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      leading: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.7),
          shape: BoxShape.circle,
        ),
        child: IconButton(
          icon: Icon(
            Iconsax.arrow_left,
            color: isDark ? Colors.white70 : Colors.black87,
            size: 20,
          ),
          onPressed: () => context.pop(),
        ),
      ),
      actions: [
        Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.7),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: Icon(
              Iconsax.refresh,
              color: isDark ? Colors.white70 : Colors.black87,
              size: 20,
            ),
            onPressed: _onRefresh,
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            // Professional background image from Pexels
            analyticsImages.when(
              data: (photos) {
                if (photos.isEmpty) return _buildFallbackGradient(isDark);
                final photo = photos.first;
                return CachedNetworkImage(
                  imageUrl: photo.src.landscape,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => _buildLoadingPlaceholder(isDark, photo.avgColor),
                  errorWidget: (context, url, error) => _buildFallbackGradient(isDark),
                );
              },
              loading: () => _buildLoadingPlaceholder(isDark, null),
              error: (error, _) => _buildFallbackGradient(isDark),
            ),
            // Sophisticated gradient overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: isDark
                      ? [
                          Colors.black.withValues(alpha: 0.3),
                          Colors.black.withValues(alpha: 0.7),
                          IrisTheme.darkBackground,
                        ]
                      : [
                          Colors.white.withValues(alpha: 0.1),
                          Colors.white.withValues(alpha: 0.6),
                          IrisTheme.lightBackground,
                        ],
                  stops: const [0.0, 0.6, 1.0],
                ),
              ),
            ),
            // Content
            Positioned(
              left: 24,
              right: 24,
              bottom: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Subtle badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: LuxuryColors.warmGold.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Iconsax.chart_215,
                          size: 12,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'INTELLIGENCE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.2,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 200.ms),
                  const SizedBox(height: 12),
                  Text(
                    'SalesOS Analytics',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : IrisTheme.lightTextPrimary,
                      letterSpacing: -0.5,
                      height: 1.1,
                    ),
                  ).animate().fadeIn(delay: 300.ms),
                  const SizedBox(height: 6),
                  Text(
                    'AI-powered insights for your CRM portfolio',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.6)
                          : IrisTheme.lightTextSecondary,
                      fontWeight: FontWeight.w400,
                    ),
                  ).animate().fadeIn(delay: 400.ms),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build fallback gradient when image fails to load
  Widget _buildFallbackGradient(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [IrisTheme.darkSurface, IrisTheme.darkBackground]
              : [IrisTheme.lightBorder, IrisTheme.lightBackground],
        ),
      ),
    );
  }

  /// Build loading placeholder with optional average color
  Widget _buildLoadingPlaceholder(bool isDark, String? avgColor) {
    Color bgColor;
    if (avgColor != null && avgColor.startsWith('#')) {
      try {
        bgColor = Color(int.parse(avgColor.substring(1), radix: 16) + 0xFF000000);
      } catch (_) {
        bgColor = isDark ? IrisTheme.darkSurface : IrisTheme.lightBorder;
      }
    } else {
      bgColor = isDark ? IrisTheme.darkSurface : IrisTheme.lightBorder;
    }
    return Container(color: bgColor);
  }
}

/// Refined tab bar delegate
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabController tabController;
  final bool isDark;

  _TabBarDelegate({required this.tabController, required this.isDark});

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
        border: Border(
          bottom: BorderSide(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            width: 1,
          ),
        ),
      ),
      child: TabBar(
        controller: tabController,
        labelColor: LuxuryColors.jadePremium,
        unselectedLabelColor: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
        indicatorColor: LuxuryColors.rolexGreen,
        indicatorWeight: 3,
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
        tabs: const [
          Tab(text: 'Hot Leads'),
          Tab(text: 'At Risk'),
          Tab(text: 'Analytics'),
        ],
      ),
    );
  }

  @override
  double get maxExtent => 48;

  @override
  double get minExtent => 48;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) => false;
}

/// Refined Portfolio Health Card with visual gauges
class _PortfolioHealthCard extends ConsumerWidget {
  // Use IrisTheme semantic colors for consistency
  static const Color _successColor = IrisTheme.success;
  static const Color _errorColor = IrisTheme.error;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final insightsAsync = ref.watch(portfolioInsightsProvider);

    return insightsAsync.when(
      loading: () => const IrisCardShimmer(height: 140),
      error: (error, _) => _buildErrorCard(isDark),
      data: (insights) => _buildHealthCard(context, isDark, insights),
    );
  }

  Widget _buildErrorCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(Iconsax.info_circle, size: 28, color: _errorColor.withValues(alpha: 0.7)),
            const SizedBox(height: 8),
            Text(
              'Unable to load insights',
              style: TextStyle(
                fontSize: 14,
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthCard(BuildContext context, bool isDark, PortfolioInsights? insights) {
    final healthPercent = insights?.healthScore ?? 50;
    final totalEntities = insights?.totalEntities ?? 0;
    final healthColor = healthPercent >= 70
        ? _successColor
        : healthPercent >= 40
            ? LuxuryColors.rolexGreen
            : _errorColor;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
        boxShadow: IrisTheme.shadowMd,
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            // Circular Progress - enhanced visual gauge
            SizedBox(
              width: 88,
              height: 88,
              child: _AnimatedScoreGauge(
                score: healthPercent,
                maxScore: 100,
                primaryColor: healthColor,
                backgroundColor: isDark
                    ? IrisTheme.darkSurfaceHigh
                    : IrisTheme.lightBorder,
              ),
            ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.8, 0.8)),
            const SizedBox(width: 20),
            // Health Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Portfolio Health',
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: healthColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _getHealthLabel(healthPercent),
                          style: IrisTheme.caption.copyWith(
                            fontWeight: IrisTheme.weightSemiBold,
                            color: healthColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '$totalEntities active relationships',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 14),
                  // Mini stats with refined design
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      _MiniStatPill(
                        icon: Iconsax.flash_15,
                        label: '${insights?.hotCount ?? 0} Hot',
                        color: _successColor,
                        isDark: isDark,
                      ),
                      _MiniStatPill(
                        icon: Iconsax.activity,
                        label: '${insights?.steadyCount ?? 0} Steady',
                        color: LuxuryColors.rolexGreen,
                        isDark: isDark,
                      ),
                      _MiniStatPill(
                        icon: Iconsax.warning_2,
                        label: '${insights?.atRiskCount ?? 0} At Risk',
                        color: _errorColor,
                        isDark: isDark,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  String _getHealthLabel(int percent) {
    if (percent >= 80) return 'Excellent';
    if (percent >= 70) return 'Good';
    if (percent >= 50) return 'Fair';
    if (percent >= 30) return 'Attention';
    return 'Critical';
  }
}


/// Refined Hot Leads Tab
class _HotLeadsTab extends ConsumerWidget {
  const _HotLeadsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hotLeadsAsync = ref.watch(hotLeadsProvider);

    return hotLeadsAsync.when(
      loading: () => const Center(child: IrisDashboardShimmer()),
      error: (error, _) => _buildEmptyState(isDark, isError: true),
      data: (leads) => leads.isEmpty
          ? _buildEmptyState(isDark)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: leads.length,
              itemBuilder: (context, index) => _HotLeadCard(
                lead: leads[index],
                rank: index + 1,
              ).animate(delay: (50 * index).ms).fadeIn().slideX(begin: 0.02),
            ),
    );
  }

  Widget _buildEmptyState(bool isDark, {bool isError = false}) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isError ? Iconsax.info_circle : Iconsax.chart_2,
            size: 48,
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          ),
          const SizedBox(height: 12),
          Text(
            isError ? 'Unable to load data' : 'No hot leads detected',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isError ? 'Pull to refresh' : 'High-momentum opportunities will appear here',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

class _HotLeadCard extends StatelessWidget {
  final IRISRankResult lead;
  final int rank;

  const _HotLeadCard({required this.lead, required this.rank});

  static const Color _accentColor = LuxuryColors.warmGold;
  static const Color _successColor = LuxuryColors.jadePremium;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final momentum = lead.momentum;
    final velocity = momentum.velocity;
    final trend = momentum.trend;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _navigateToEntity(context),
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Rank indicator
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: rank <= 3
                        ? _accentColor.withValues(alpha: 0.12)
                        : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Text(
                      '$rank',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: rank <= 3
                            ? _accentColor
                            : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Lead info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              lead.name,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : IrisTheme.lightTextPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          _TrendBadge(trend: trend),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            lead.type,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
                            ),
                          ),
                          Container(
                            margin: const EdgeInsets.symmetric(horizontal: 8),
                            width: 3,
                            height: 3,
                            decoration: BoxDecoration(
                              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                              shape: BoxShape.circle,
                            ),
                          ),
                          Icon(
                            velocity > 0 ? Iconsax.arrow_up_3 : Iconsax.arrow_down,
                            size: 12,
                            color: velocity > 0 ? _successColor : LuxuryColors.errorRuby,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Velocity ${velocity > 0 ? '+' : ''}${velocity.toStringAsFixed(1)}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: velocity > 0 ? _successColor : LuxuryColors.errorRuby,
                            ),
                          ),
                        ],
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
          ),
        ),
      ),
    );
  }

  void _navigateToEntity(BuildContext context) {
    HapticFeedback.lightImpact();
    final type = lead.type.toLowerCase();
    if (type.contains('lead')) {
      context.push('${AppRoutes.leads}/${lead.id}');
    } else if (type.contains('contact')) {
      context.push('${AppRoutes.contacts}/${lead.id}');
    }
  }
}

class _TrendBadge extends StatelessWidget {
  final String trend;

  const _TrendBadge({required this.trend});

  @override
  Widget build(BuildContext context) {
    final (color, label) = _getTrendInfo(trend);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  (Color, String) _getTrendInfo(String trend) {
    switch (trend.toLowerCase()) {
      case 'accelerating':
        return (LuxuryColors.jadePremium, 'RISING');
      case 'steady':
        return (LuxuryColors.infoCobalt, 'STEADY');
      case 'decelerating':
        return (LuxuryColors.warningAmber, 'SLOWING');
      case 'at_risk':
      case 'churning':
        return (LuxuryColors.errorRuby, 'AT RISK');
      default:
        return (LuxuryColors.infoCobalt, 'ACTIVE');
    }
  }
}

/// Refined At Risk Tab
class _AtRiskTab extends ConsumerWidget {
  const _AtRiskTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final atRiskAsync = ref.watch(atRiskEntitiesProvider);

    return atRiskAsync.when(
      loading: () => const Center(child: IrisDashboardShimmer()),
      error: (error, _) => _buildState(isDark, isError: true),
      data: (entities) => entities.isEmpty
          ? _buildState(isDark, isHealthy: true)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: entities.length,
              itemBuilder: (context, index) => _AtRiskCard(
                entity: entities[index],
                urgency: index + 1,
              ).animate(delay: (50 * index).ms).fadeIn().slideX(begin: 0.02),
            ),
    );
  }

  Widget _buildState(bool isDark, {bool isError = false, bool isHealthy = false}) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isHealthy
                  ? LuxuryColors.jadePremium.withValues(alpha: 0.1)
                  : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isHealthy ? Iconsax.shield_tick : (isError ? Iconsax.info_circle : Iconsax.warning_2),
              size: 32,
              color: isHealthy
                  ? LuxuryColors.jadePremium
                  : (isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            isError
                ? 'Unable to load data'
                : (isHealthy ? 'All relationships healthy' : 'No at-risk entities'),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isError
                ? 'Pull to refresh'
                : (isHealthy ? 'Great engagement across your portfolio' : 'Keep monitoring'),
            style: TextStyle(
              fontSize: 13,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

class _AtRiskCard extends StatelessWidget {
  final IRISRankResult entity;
  final int urgency;

  const _AtRiskCard({required this.entity, required this.urgency});

  static const Color _warningColor = LuxuryColors.warningAmber;
  static const Color _errorColor = LuxuryColors.errorRuby;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final daysInactive = entity.momentum.daysSinceLastActivity;
    final urgencyColor = urgency <= 3 ? _errorColor : _warningColor;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: urgencyColor.withValues(alpha: 0.3),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _navigateToEntity(context),
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Warning indicator
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: urgencyColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Iconsax.warning_2,
                    size: 18,
                    color: urgencyColor,
                  ),
                ),
                const SizedBox(width: 12),
                // Entity info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entity.name,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : IrisTheme.lightTextPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            entity.type,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
                            ),
                          ),
                          Container(
                            margin: const EdgeInsets.symmetric(horizontal: 8),
                            width: 3,
                            height: 3,
                            decoration: BoxDecoration(
                              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                              shape: BoxShape.circle,
                            ),
                          ),
                          Icon(Iconsax.clock, size: 12, color: urgencyColor),
                          const SizedBox(width: 4),
                          Text(
                            '$daysInactive days inactive',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: urgencyColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Re-engage button
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: LuxuryColors.warmGold.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Re-engage',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: LuxuryColors.warmGold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _navigateToEntity(BuildContext context) {
    HapticFeedback.lightImpact();
    final type = entity.type.toLowerCase();
    if (type.contains('lead')) {
      context.push('${AppRoutes.leads}/${entity.id}');
    } else if (type.contains('contact')) {
      context.push('${AppRoutes.contacts}/${entity.id}');
    }
  }
}

/// Refined Analytics Tab
class _AnalyticsTab extends ConsumerWidget {
  const _AnalyticsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hotLeadsAsync = ref.watch(hotLeadsProvider);
    final atRiskAsync = ref.watch(atRiskEntitiesProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: 'Score Distribution'),
          const SizedBox(height: 12),
          _ChartCard(
            isDark: isDark,
            height: 180,
            child: hotLeadsAsync.when(
              loading: () => Center(child: CircularProgressIndicator(strokeWidth: 2, color: LuxuryColors.jadePremium)),
              error: (error, _) => _buildNoData(isDark),
              data: (leads) => _buildScoreChart(leads, isDark),
            ),
          ).animate(delay: 100.ms).fadeIn(),

          const SizedBox(height: 24),

          _SectionHeader(title: 'Momentum Trends'),
          const SizedBox(height: 12),
          _ChartCard(
            isDark: isDark,
            height: 180,
            child: hotLeadsAsync.when(
              loading: () => Center(child: CircularProgressIndicator(strokeWidth: 2, color: LuxuryColors.jadePremium)),
              error: (error, _) => _buildNoData(isDark),
              data: (leads) => _buildTrendChart(leads, isDark),
            ),
          ).animate(delay: 200.ms).fadeIn(),

          const SizedBox(height: 24),

          _SectionHeader(title: 'Risk Overview'),
          const SizedBox(height: 12),
          atRiskAsync.when(
            loading: () => const IrisCardShimmer(height: 80),
            error: (error, _) => const SizedBox.shrink(),
            data: (atRisk) => _RiskOverviewCard(atRiskCount: atRisk.length, isDark: isDark),
          ).animate(delay: 300.ms).fadeIn(),

          const SizedBox(height: 24),

          _AlgorithmInfoCard(isDark: isDark).animate(delay: 400.ms).fadeIn(),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildNoData(bool isDark) {
    return Center(
      child: Text(
        'No data available',
        style: TextStyle(
          fontSize: 13,
          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
        ),
      ),
    );
  }

  Widget _buildScoreChart(List<IRISRankResult> leads, bool isDark) {
    if (leads.isEmpty) return _buildNoData(isDark);

    final bars = leads.take(6).toList().asMap().entries.map((entry) {
      final index = entry.key;
      final lead = entry.value;
      return BarChartGroupData(
        x: index,
        barRods: [
          BarChartRodData(
            toY: lead.rank * 100,
            color: LuxuryColors.warmGold,
            width: 20,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ],
      );
    }).toList();

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 100,
        barTouchData: BarTouchData(enabled: false),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < leads.length) {
                  final name = leads[index].name;
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      name.length > 4 ? name.substring(0, 4) : name,
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  );
                }
                return const SizedBox();
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) {
                return Text(
                  '${value.toInt()}',
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
                  ),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 25,
          getDrawingHorizontalLine: (value) => FlLine(
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
            strokeWidth: 1,
          ),
        ),
        barGroups: bars,
      ),
    );
  }

  Widget _buildTrendChart(List<IRISRankResult> leads, bool isDark) {
    if (leads.isEmpty) return _buildNoData(isDark);

    int accelerating = 0, steady = 0, decelerating = 0, atRisk = 0;

    for (final lead in leads) {
      switch (lead.momentum.trend.toLowerCase()) {
        case 'accelerating':
          accelerating++;
        case 'steady':
          steady++;
        case 'decelerating':
          decelerating++;
        case 'at_risk':
        case 'churning':
          atRisk++;
        default:
          steady++;
      }
    }

    final sections = <PieChartSectionData>[];
    final total = accelerating + steady + decelerating + atRisk;
    if (total == 0) return _buildNoData(isDark);

    void addSection(int count, Color color) {
      if (count > 0) {
        sections.add(PieChartSectionData(
          value: count.toDouble(),
          title: '${(count / total * 100).toInt()}%',
          color: color,
          radius: 35,
          titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
        ));
      }
    }

    addSection(accelerating, LuxuryColors.jadePremium);
    addSection(steady, LuxuryColors.infoCobalt);
    addSection(decelerating, LuxuryColors.warningAmber);
    addSection(atRisk, LuxuryColors.errorRuby);

    return Row(
      children: [
        Expanded(
          child: PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 32,
              sections: sections,
            ),
          ),
        ),
        const SizedBox(width: 20),
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _LegendItem(color: LuxuryColors.jadePremium, label: 'Rising'),
            const SizedBox(height: 8),
            _LegendItem(color: LuxuryColors.infoCobalt, label: 'Steady'),
            const SizedBox(height: 8),
            _LegendItem(color: LuxuryColors.warningAmber, label: 'Slowing'),
            const SizedBox(height: 8),
            _LegendItem(color: LuxuryColors.errorRuby, label: 'At Risk'),
          ],
        ),
        const SizedBox(width: 16),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Text(
      title,
      style: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  final bool isDark;
  final double height;
  final Widget child;

  const _ChartCard({required this.isDark, required this.height, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: child,
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
          ),
        ),
      ],
    );
  }
}

class _RiskOverviewCard extends StatelessWidget {
  final int atRiskCount;
  final bool isDark;

  const _RiskOverviewCard({required this.atRiskCount, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final riskLevel = atRiskCount == 0 ? 'Low' : atRiskCount <= 3 ? 'Moderate' : 'High';
    final riskColor = atRiskCount == 0
        ? LuxuryColors.jadePremium
        : atRiskCount <= 3
            ? LuxuryColors.warningAmber
            : LuxuryColors.errorRuby;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: riskColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              atRiskCount == 0 ? Iconsax.shield_tick : Iconsax.warning_2,
              size: 20,
              color: riskColor,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$riskLevel Risk',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  atRiskCount == 0
                      ? 'All relationships are healthy'
                      : '$atRiskCount relationship${atRiskCount > 1 ? 's' : ''} need${atRiskCount == 1 ? 's' : ''} attention',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AlgorithmInfoCard extends StatelessWidget {
  final bool isDark;

  const _AlgorithmInfoCard({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: LuxuryColors.warmGold.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: LuxuryColors.warmGold.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(Iconsax.cpu, size: 16, color: LuxuryColors.warmGold),
              ),
              const SizedBox(width: 10),
              Text(
                'About IRISRank',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'Our proprietary algorithm analyzes:',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextTertiary,
            ),
          ),
          const SizedBox(height: 10),
          _FeatureRow(icon: Iconsax.hierarchy_square_2, text: 'Network relationships', isDark: isDark),
          _FeatureRow(icon: Iconsax.activity, text: 'Engagement patterns', isDark: isDark),
          _FeatureRow(icon: Iconsax.chart_21, text: 'Momentum signals', isDark: isDark),
          _FeatureRow(icon: Iconsax.flash_1, text: 'Predictive scoring', isDark: isDark),
        ],
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool isDark;

  const _FeatureRow({required this.icon, required this.text, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 14, color: LuxuryColors.jadePremium),
          const SizedBox(width: 10),
          Text(
            text,
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary.withValues(alpha: 0.8) : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Animated circular score gauge with CustomPaint
class _AnimatedScoreGauge extends StatelessWidget {
  final int score;
  final int maxScore;
  final Color primaryColor;
  final Color backgroundColor;

  const _AnimatedScoreGauge({
    required this.score,
    required this.maxScore,
    required this.primaryColor,
    required this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _CircularGaugePainter(
        progress: score / maxScore,
        primaryColor: primaryColor,
        backgroundColor: backgroundColor,
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              score.toString(),
              style: IrisTheme.numericSmall.copyWith(
                color: primaryColor,
                fontWeight: IrisTheme.weightBold,
              ),
            ),
            Text(
              '%',
              style: IrisTheme.caption.copyWith(
                color: primaryColor.withValues(alpha: 0.7),
                fontWeight: IrisTheme.weightMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircularGaugePainter extends CustomPainter {
  final double progress;
  final Color primaryColor;
  final Color backgroundColor;

  _CircularGaugePainter({
    required this.progress,
    required this.primaryColor,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 6;
    const strokeWidth = 8.0;

    // Background circle
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    // Progress arc
    final progressPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _CircularGaugePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.primaryColor != primaryColor;
  }
}

/// Mini stat pill for portfolio breakdown
class _MiniStatPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isDark;

  const _MiniStatPill({
    required this.icon,
    required this.label,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: IrisTheme.caption.copyWith(
              color: color,
              fontWeight: IrisTheme.weightSemiBold,
            ),
          ),
        ],
      ),
    );
  }
}
