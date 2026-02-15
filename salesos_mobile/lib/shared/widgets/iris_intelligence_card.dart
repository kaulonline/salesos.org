import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/theme.dart';
import '../../core/services/iris_rank_service.dart';
import 'luxury_card.dart';
import 'ai_next_steps_sheet.dart';

/// IRIS Intelligence Card - Showcases the proprietary IRISRank algorithm
/// Redesigned with visual indicators, score gauges, and trend visualizations
class IrisIntelligenceCard extends ConsumerWidget {
  final VoidCallback? onTapViewAll;
  final void Function(String entityId, String entityType)? onTapEntity;
  final bool showHeader;

  const IrisIntelligenceCard({
    super.key,
    this.onTapViewAll,
    this.onTapEntity,
    this.showHeader = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hotLeadsAsync = ref.watch(hotLeadsProvider);
    final atRiskAsync = ref.watch(atRiskEntitiesProvider);
    final portfolioAsync = ref.watch(portfolioInsightsProvider);

    return (LuxuryCard(
      variant: LuxuryCardVariant.elevated,
      tier: LuxuryTier.gold,
      accentColor: LuxuryColors.rolexGreen,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with animated badge (conditional)
          if (showHeader) ...[
            _buildHeader(isDark),
            const SizedBox(height: 20),
          ],

          // Portfolio Health Score - Visual gauge
          portfolioAsync.when(
            loading: () => _buildHealthGaugeSkeleton(isDark),
            error: (e, s) => const SizedBox.shrink(),
            data: (insights) => insights != null
                ? _buildHealthGauge(insights, isDark)
                : const SizedBox.shrink(),
          ),
          const SizedBox(height: 24),

          // Hot Leads Section with visual cards
          _buildSectionHeader(
            'Hot Leads',
            Iconsax.flash_15,
            LuxuryColors.successGreen,
            isDark,
            hotBadge: true,
          ),
          const SizedBox(height: 12),
          _buildHotLeadsContent(hotLeadsAsync, isDark),

          const SizedBox(height: 20),

          // Needs Attention Section with visual cards
          _buildSectionHeader(
            'Needs Attention',
            Iconsax.warning_2,
            LuxuryColors.warningAmber,
            isDark,
          ),
          const SizedBox(height: 12),
          _buildAtRiskContent(atRiskAsync, isDark),

          // View All Button
          if (onTapViewAll != null) ...[
            const SizedBox(height: 16),
            _buildViewAllButton(isDark),
          ],
        ],
      ),
    ) as Widget).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildHeader(bool isDark) {
    return Row(
      children: [
        // Luxury styled logo container with emerald gradient
        // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
        ExcludeSemantics(
          child: RepaintBoundary(
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: LuxuryColors.emeraldGradient,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(
                Iconsax.chart_215,
                color: LuxuryColors.diamond,
                size: 18,
              ),
            ).animate(onPlay: (c) => c.repeat(reverse: true))
                .shimmer(duration: 2000.ms, color: Colors.white.withValues(alpha: 0.3)),
          ),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'SalesOS Rank',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  ),
                ),
                const SizedBox(width: 8),
                // Luxury AI badge
                LuxuryBadge(
                  text: 'AI',
                  tier: LuxuryTier.gold,
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              'Intelligent entity ranking',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                letterSpacing: 0.3,
                color: LuxuryColors.textMuted,
              ),
            ),
          ],
        ),
        const Spacer(),
        // Live indicator with pulse - Gold accent
        Row(
          children: [
            // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
            ExcludeSemantics(
              child: RepaintBoundary(
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: LuxuryColors.successGreen,
                    shape: BoxShape.circle,
                  ),
                ).animate(onPlay: (c) => c.repeat(reverse: true))
                    .scale(begin: const Offset(1, 1), end: const Offset(1.3, 1.3), duration: 1000.ms),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              'LIVE',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
                color: LuxuryColors.successGreen,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHealthGauge(PortfolioInsights insights, bool isDark) {
    final healthScore = insights.healthScore;
    final hotCount = insights.hotCount;
    final atRiskCount = insights.atRiskCount;
    final steadyCount = insights.steadyCount;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? IrisTheme.darkSurfaceElevated
            : IrisTheme.lightSurfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
        ),
      ),
      child: Row(
        children: [
          // Circular gauge
          SizedBox(
            width: 80,
            height: 80,
            child: _CircularScoreGauge(
              score: healthScore,
              maxScore: 100,
              primaryColor: _getHealthColor(healthScore),
              backgroundColor: isDark
                  ? IrisTheme.darkSurfaceHigh
                  : IrisTheme.lightBorder,
            ),
          ),
          const SizedBox(width: 20),
          // Stats breakdown
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Portfolio Health',
                  style: IrisTheme.labelMedium.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: IrisTheme.weightSemiBold,
                  ),
                ),
                const SizedBox(height: 12),
                // Mini stat pills
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _MiniStatPill(
                      icon: Iconsax.flash_15,
                      label: '$hotCount Hot',
                      color: IrisTheme.success,
                      isDark: isDark,
                    ),
                    _MiniStatPill(
                      icon: Iconsax.activity,
                      label: '$steadyCount Steady',
                      color: LuxuryColors.champagneGold,
                      isDark: isDark,
                    ),
                    _MiniStatPill(
                      icon: Iconsax.warning_2,
                      label: '$atRiskCount At Risk',
                      color: IrisTheme.warning,
                      isDark: isDark,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.05);
  }

  Widget _buildHealthGaugeSkeleton(bool isDark) {
    // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark
                ? IrisTheme.darkSurfaceElevated
                : IrisTheme.lightSurfaceElevated,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightBorder,
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 100,
                      height: 14,
                      decoration: BoxDecoration(
                        color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightBorder,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: List.generate(
                        3,
                        (i) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Container(
                            width: 60,
                            height: 24,
                            decoration: BoxDecoration(
                              color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightBorder,
                              borderRadius: BorderRadius.circular(12),
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
        ).animate(onPlay: (c) => c.repeat())
            .shimmer(duration: 1500.ms, color: isDark ? Colors.white10 : Colors.white),
      ),
    );
  }

  Color _getHealthColor(int score) {
    if (score >= 70) return IrisTheme.success;
    if (score >= 40) return LuxuryColors.champagneGold;
    return IrisTheme.warning;
  }

  Widget _buildSectionHeader(
    String title,
    IconData icon,
    Color color,
    bool isDark, {
    bool hotBadge = false,
  }) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 14),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: IrisTheme.titleSmall.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            fontWeight: IrisTheme.weightSemiBold,
          ),
        ),
        if (hotBadge) ...[
          const SizedBox(width: 8),
          // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
          ExcludeSemantics(
            child: RepaintBoundary(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: IrisTheme.success.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Iconsax.flash_15,
                      size: 10,
                      color: IrisTheme.success,
                    ),
                    const SizedBox(width: 2),
                    Text(
                      'TRENDING',
                      style: IrisTheme.caption.copyWith(
                        color: IrisTheme.success,
                        fontWeight: IrisTheme.weightBold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ).animate(onPlay: (c) => c.repeat(reverse: true))
                  .fadeIn().then().fade(begin: 1, end: 0.7, duration: 1000.ms),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildHotLeadsContent(AsyncValue<List<IRISRankResult>> hotLeadsAsync, bool isDark) {
    return hotLeadsAsync.when(
      loading: () => _buildLoadingState(isDark),
      error: (e, _) => _buildEmptyState('Unable to load', isDark, isError: true),
      data: (leads) {
        if (leads.isEmpty) {
          return _buildEmptyState('No hot leads right now', isDark);
        }
        return Column(
          children: leads.take(3).toList().asMap().entries.map((entry) {
            final index = entry.key;
            final lead = entry.value;
            final props = lead.properties ?? {};
            return _EnhancedLeadTile(
              entity: lead,
              entityId: lead.id,
              initials: lead.initials,
              name: lead.name,
              entityType: lead.type,
              rankScore: lead.rankPercentage,
              velocity: lead.momentum.velocity,
              trend: lead.momentum.trend,
              isDark: isDark,
              isHot: true,
              onTap: onTapEntity,
              email: props['Email'] as String? ?? props['email'] as String?,
              phone: props['Phone'] as String? ?? props['phone'] as String? ?? props['MobilePhone'] as String?,
              properties: props,
            ).animate(delay: (50 * index).ms).fadeIn().slideX(begin: 0.05);
          }).toList(),
        );
      },
    );
  }

  Widget _buildAtRiskContent(AsyncValue<List<IRISRankResult>> atRiskAsync, bool isDark) {
    return atRiskAsync.when(
      loading: () => _buildLoadingState(isDark),
      error: (e, _) => _buildEmptyState('Unable to load', isDark, isError: true),
      data: (entities) {
        if (entities.isEmpty) {
          return _buildEmptyState('All accounts healthy', isDark, isSuccess: true);
        }
        return Column(
          children: entities.take(3).toList().asMap().entries.map((entry) {
            final index = entry.key;
            final entityItem = entry.value;
            final props = entityItem.properties ?? {};
            // For accounts/opportunities, look for related contact info
            final email = props['Email'] as String? ??
                          props['email'] as String? ??
                          props['Primary_Contact_Email__c'] as String?;
            final phone = props['Phone'] as String? ??
                          props['phone'] as String? ??
                          props['MobilePhone'] as String? ??
                          props['Primary_Contact_Phone__c'] as String?;
            return _EnhancedLeadTile(
              entity: entityItem,
              entityId: entityItem.id,
              initials: entityItem.initials,
              name: entityItem.name,
              entityType: entityItem.type,
              rankScore: entityItem.rankPercentage,
              daysSinceActivity: entityItem.momentum.daysSinceLastActivity,
              trend: entityItem.momentum.trend,
              isDark: isDark,
              isHot: false,
              onTap: onTapEntity,
              email: email,
              phone: phone,
              properties: props,
            ).animate(delay: (50 * index).ms).fadeIn().slideX(begin: 0.05);
          }).toList(),
        );
      },
    );
  }

  Widget _buildLoadingState(bool isDark) {
    // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Column(
          children: List.generate(
            2,
            (i) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                height: 64,
                decoration: BoxDecoration(
                  color: isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ).animate(onPlay: (c) => c.repeat())
            .shimmer(duration: 1500.ms, color: isDark ? Colors.white10 : Colors.white),
      ),
    );
  }

  Widget _buildEmptyState(String message, bool isDark, {bool isError = false, bool isSuccess = false}) {
    final color = isError
        ? IrisTheme.warning
        : isSuccess
            ? IrisTheme.success
            : (isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary);
    final icon = isError
        ? Iconsax.warning_2
        : isSuccess
            ? Iconsax.tick_circle
            : Iconsax.info_circle;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 8),
          Text(
            message,
            style: IrisTheme.bodySmall.copyWith(
              color: color,
              fontWeight: IrisTheme.weightMedium,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildViewAllButton(bool isDark) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTapViewAll?.call();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          gradient: LuxuryColors.emeraldGradient,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'VIEW FULL ANALYTICS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5,
                color: LuxuryColors.diamond,
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Iconsax.arrow_right_3,
              color: LuxuryColors.diamond,
              size: 18,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 200.ms);
  }
}

/// Enhanced lead tile with visual score gauge, trend indicators, and action buttons
class _EnhancedLeadTile extends StatelessWidget {
  final IRISRankResult entity;
  final String entityId;
  final String initials;
  final String name;
  final String entityType;
  final int rankScore;
  final double? velocity;
  final int? daysSinceActivity;
  final String trend;
  final bool isDark;
  final bool isHot;
  final void Function(String entityId, String entityType)? onTap;
  final String? email;
  final String? phone;
  final Map<String, dynamic>? properties;

  const _EnhancedLeadTile({
    required this.entity,
    required this.entityId,
    required this.initials,
    required this.name,
    required this.entityType,
    required this.rankScore,
    this.velocity,
    this.daysSinceActivity,
    required this.trend,
    required this.isDark,
    required this.isHot,
    this.onTap,
    this.email,
    this.phone,
    this.properties,
  });

  /// Show AI next steps modal
  void _showNextSteps(BuildContext context) {
    // Call the callback if provided
    onTap?.call(entityId, entityType);

    // Show the AI next steps bottom sheet
    AiNextStepsSheet.show(context, entity);
  }

  @override
  Widget build(BuildContext context) {
    final trendColor = _getTrendColor();
    final trendIcon = _getTrendIcon();

    return GestureDetector(
      onTap: () => _showNextSteps(context),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? IrisTheme.darkSurfaceElevated
              : IrisTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isHot
                ? IrisTheme.success.withValues(alpha: 0.3)
                : IrisTheme.warning.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Avatar with trend indicator
            Stack(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: isHot
                        ? IrisTheme.successGradient
                        : IrisTheme.warningGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: IrisTheme.labelMedium.copyWith(
                        color: Colors.white,
                        fontWeight: IrisTheme.weightBold,
                      ),
                    ),
                  ),
                ),
                // Trend badge
                Positioned(
                  right: -2,
                  bottom: -2,
                  child: Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      color: trendColor,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isDark ? IrisTheme.darkSurface : Colors.white,
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      trendIcon,
                      size: 10,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                            fontWeight: IrisTheme.weightSemiBold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      // Entity type badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark
                              ? IrisTheme.darkSurfaceHigh
                              : IrisTheme.lightBorder,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          entityType,
                          style: IrisTheme.caption.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                            fontWeight: IrisTheme.weightMedium,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Metric row
                  Row(
                    children: [
                      // Velocity or days inactive
                      if (isHot && velocity != null) ...[
                        Icon(
                          Iconsax.arrow_up_3,
                          size: 12,
                          color: IrisTheme.success,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          '+${(velocity! * 100).toStringAsFixed(0)}%',
                          style: IrisTheme.caption.copyWith(
                            color: IrisTheme.success,
                            fontWeight: IrisTheme.weightSemiBold,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'velocity',
                          style: IrisTheme.caption.copyWith(
                            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          ),
                        ),
                      ] else if (!isHot && daysSinceActivity != null) ...[
                        Icon(
                          Iconsax.clock,
                          size: 12,
                          color: IrisTheme.warning,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$daysSinceActivity days',
                          style: IrisTheme.caption.copyWith(
                            color: IrisTheme.warning,
                            fontWeight: IrisTheme.weightSemiBold,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'inactive',
                          style: IrisTheme.caption.copyWith(
                            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Quick action buttons for all entities
            _QuickActionButton(
              icon: Iconsax.call,
              color: IrisTheme.success,
              onTap: phone != null ? () => _makePhoneCall(phone!) : null,
              isDark: isDark,
            ),
            const SizedBox(width: 4),
            _QuickActionButton(
              icon: Iconsax.sms,
              color: IrisTheme.info,
              onTap: email != null ? () => _sendEmail(email!) : null,
              isDark: isDark,
            ),
            const SizedBox(width: 6),
            // Score gauge
            SizedBox(
              width: 44,
              height: 44,
              child: _MiniScoreGauge(
                score: rankScore,
                color: isHot ? IrisTheme.success : IrisTheme.warning,
                isDark: isDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    HapticFeedback.lightImpact();
    final Uri phoneUri = Uri(scheme: 'tel', path: phoneNumber);
    if (await canLaunchUrl(phoneUri)) {
      await launchUrl(phoneUri);
    }
  }

  Future<void> _sendEmail(String emailAddress) async {
    HapticFeedback.lightImpact();
    final Uri emailUri = Uri(scheme: 'mailto', path: emailAddress);
    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
    }
  }

  Color _getTrendColor() {
    switch (trend) {
      case 'accelerating':
        return IrisTheme.success;
      case 'steady':
        return LuxuryColors.champagneGold;
      case 'decelerating':
        return LuxuryColors.champagneGoldDark;
      case 'at_risk':
        return IrisTheme.warning;
      case 'churning':
        return IrisTheme.error;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  IconData _getTrendIcon() {
    switch (trend) {
      case 'accelerating':
        return Iconsax.flash_15;
      case 'steady':
        return Iconsax.minus;
      case 'decelerating':
        return Iconsax.arrow_down_2;
      case 'at_risk':
        return Iconsax.warning_2;
      case 'churning':
        return Iconsax.danger;
      default:
        return Iconsax.activity;
    }
  }
}

/// Mini score gauge for lead tiles
class _MiniScoreGauge extends StatelessWidget {
  final int score;
  final Color color;
  final bool isDark;

  const _MiniScoreGauge({
    required this.score,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _MiniGaugePainter(
        score: score / 100,
        color: color,
        backgroundColor: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightBorder,
      ),
      child: Center(
        child: Text(
          score.toString(),
          style: IrisTheme.labelSmall.copyWith(
            color: color,
            fontWeight: IrisTheme.weightBold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

class _MiniGaugePainter extends CustomPainter {
  final double score;
  final Color color;
  final Color backgroundColor;

  _MiniGaugePainter({
    required this.score,
    required this.color,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 3;
    const strokeWidth = 4.0;

    // Background arc
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi * 0.75,
      math.pi * 1.5,
      false,
      bgPaint,
    );

    // Foreground arc
    final fgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi * 0.75,
      math.pi * 1.5 * score,
      false,
      fgPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _MiniGaugePainter oldDelegate) {
    return oldDelegate.score != score || oldDelegate.color != color;
  }
}

/// Circular score gauge for portfolio health
class _CircularScoreGauge extends StatelessWidget {
  final int score;
  final int maxScore;
  final Color primaryColor;
  final Color backgroundColor;

  const _CircularScoreGauge({
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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

/// Quick action button for at-risk entity tiles
class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  final bool isDark;

  const _QuickActionButton({
    required this.icon,
    required this.color,
    this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = onTap == null;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: isDisabled
              ? (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightBorder)
              : color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 14,
          color: isDisabled
              ? (isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary)
              : color,
        ),
      ),
    );
  }
}
