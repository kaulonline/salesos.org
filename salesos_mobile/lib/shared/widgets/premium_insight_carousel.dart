import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'luxury_card.dart';

/// Insight priority level
enum InsightLevel {
  high,
  medium,
  low,
}

/// Insight type for categorization
enum InsightCategory {
  hotLead,
  atRisk,
  followUp,
  meeting,
  dealProgress,
  opportunity,
  task,
  inactive,
}

/// Data model for a premium insight
class PremiumInsight {
  final String id;
  final String title;
  final String description;
  final InsightLevel level;
  final InsightCategory category;
  final String actionLabel;
  final VoidCallback? onAction;
  final String? entityId;
  final String? entityType;

  const PremiumInsight({
    required this.id,
    required this.title,
    required this.description,
    this.level = InsightLevel.medium,
    this.category = InsightCategory.opportunity,
    this.actionLabel = 'View Details',
    this.onAction,
    this.entityId,
    this.entityType,
  });
}

/// Premium Insight Carousel - Stunning animated AI insights carousel
class PremiumInsightCarousel extends StatefulWidget {
  final List<PremiumInsight> insights;
  final double height;
  final bool autoPlay;
  final Duration autoPlayDuration;

  const PremiumInsightCarousel({
    super.key,
    required this.insights,
    this.height = 180,
    this.autoPlay = false,
    this.autoPlayDuration = const Duration(seconds: 5),
  });

  @override
  State<PremiumInsightCarousel> createState() => _PremiumInsightCarouselState();
}

class _PremiumInsightCarouselState extends State<PremiumInsightCarousel> {
  late PageController _pageController;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.9);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.insights.isEmpty) {
      return _EmptyInsightsState(height: widget.height);
    }

    return Column(
      children: [
        SizedBox(
          height: widget.height,
          child: PageView.builder(
            controller: _pageController,
            itemCount: widget.insights.length,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
              HapticFeedback.selectionClick();
            },
            itemBuilder: (context, index) {
              final insight = widget.insights[index];
              return Padding(
                padding: EdgeInsets.only(
                  left: index == 0 ? 4 : 6,
                  right: index == widget.insights.length - 1 ? 4 : 6,
                ),
                child: PremiumInsightCard(
                  insight: insight,
                  isActive: index == _currentPage,
                ).animate(delay: (100 + index * 50).ms)
                    .fadeIn(duration: 300.ms)
                    .slideX(begin: 0.05, curve: Curves.easeOutCubic),
              );
            },
          ),
        ),
        // Page indicators
        if (widget.insights.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                widget.insights.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: index == _currentPage ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    gradient: index == _currentPage
                        ? LinearGradient(
                            colors: [
                              LuxuryColors.jadePremium,
                              LuxuryColors.rolexGreen,
                            ],
                          )
                        : null,
                    color: index == _currentPage
                        ? null
                        : LuxuryColors.textMuted.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(3),
                    boxShadow: index == _currentPage
                        ? [
                            BoxShadow(
                              color: LuxuryColors.jadePremium.withValues(alpha: 0.4),
                              blurRadius: 6,
                              spreadRadius: 0,
                            ),
                          ]
                        : null,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Premium Insight Card - Individual AI insight with luxury styling
class PremiumInsightCard extends StatefulWidget {
  final PremiumInsight insight;
  final bool isActive;

  const PremiumInsightCard({
    super.key,
    required this.insight,
    this.isActive = true,
  });

  @override
  State<PremiumInsightCard> createState() => _PremiumInsightCardState();
}

class _PremiumInsightCardState extends State<PremiumInsightCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _glowController;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    if (widget.insight.level == InsightLevel.high) {
      _glowController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  IconData get _categoryIcon {
    switch (widget.insight.category) {
      case InsightCategory.hotLead:
        return Iconsax.flash_1;
      case InsightCategory.atRisk:
        return Iconsax.warning_2;
      case InsightCategory.followUp:
        return Iconsax.call_calling;
      case InsightCategory.meeting:
        return Iconsax.calendar_tick;
      case InsightCategory.dealProgress:
        return Iconsax.chart_2;
      case InsightCategory.opportunity:
        return Iconsax.dollar_circle;
      case InsightCategory.task:
        return Iconsax.task;
      case InsightCategory.inactive:
        return Iconsax.profile_delete;
    }
  }

  Color get _levelColor {
    switch (widget.insight.level) {
      case InsightLevel.high:
        return const Color(0xFFDC2626);
      case InsightLevel.medium:
        return LuxuryColors.champagneGold;
      case InsightLevel.low:
        return LuxuryColors.jadePremium;
    }
  }

  Gradient get _cardGradient {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    switch (widget.insight.level) {
      case InsightLevel.high:
        return LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF1A0D0D),
                  const Color(0xFF2D1515),
                  const Color(0xFF1A1A1A),
                ]
              : [
                  const Color(0xFFFFF5F5),
                  const Color(0xFFFFE5E5),
                  Colors.white,
                ],
        );
      case InsightLevel.medium:
        return LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF1A1710),
                  const Color(0xFF2D2515),
                  const Color(0xFF1A1A1A),
                ]
              : [
                  const Color(0xFFFFFBF5),
                  const Color(0xFFFFF5E5),
                  Colors.white,
                ],
        );
      case InsightLevel.low:
        return LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF0D1A15),
                  const Color(0xFF152D25),
                  const Color(0xFF1A1A1A),
                ]
              : [
                  const Color(0xFFF5FFFB),
                  const Color(0xFFE5FFF5),
                  Colors.white,
                ],
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        HapticFeedback.lightImpact();
        widget.insight.onAction?.call();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedBuilder(
        animation: _glowController,
        builder: (context, child) {
          final glowIntensity = widget.insight.level == InsightLevel.high
              ? 0.2 + _glowController.value * 0.15
              : 0.15;

          return AnimatedScale(
            scale: _isPressed ? 0.98 : 1.0,
            duration: const Duration(milliseconds: 100),
            child: Container(
              decoration: BoxDecoration(
                gradient: _cardGradient,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: _levelColor.withValues(alpha: _isPressed ? 0.5 : 0.3),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                  if (widget.isActive)
                    BoxShadow(
                      color: _levelColor.withValues(alpha: glowIntensity),
                      blurRadius: 20,
                      spreadRadius: -4,
                    ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Stack(
                  children: [
                    // Decorative elements
                    Positioned(
                      top: -30,
                      right: -30,
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              _levelColor.withValues(alpha: 0.1),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Content
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top row: Icon + Tags
                          Row(
                            children: [
                              // Icon container with gradient
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      _levelColor,
                                      Color.lerp(_levelColor, Colors.black, 0.2)!,
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: [
                                    BoxShadow(
                                      color: _levelColor.withValues(alpha: 0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  _categoryIcon,
                                  size: 18,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(width: 10),
                              // AI Badge
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: LuxuryColors.jadePremium.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Iconsax.magic_star,
                                      size: 10,
                                      color: LuxuryColors.jadePremium,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'AI',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: LuxuryColors.jadePremium,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 6),
                              // Priority badge
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: _levelColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  widget.insight.level.name.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: _levelColor,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // Title
                          Text(
                            widget.insight.title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? LuxuryColors.textOnDark
                                  : LuxuryColors.textOnLight,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          // Description
                          Expanded(
                            child: Text(
                              widget.insight.description,
                              style: TextStyle(
                                fontSize: 13,
                                color: LuxuryColors.textMuted,
                                height: 1.4,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(height: 10),
                          // Action button
                          Row(
                            children: [
                              Text(
                                widget.insight.actionLabel,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: _levelColor,
                                  letterSpacing: 0.2,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Iconsax.arrow_right_3,
                                size: 14,
                                color: _levelColor,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _EmptyInsightsState extends StatelessWidget {
  final double height;

  const _EmptyInsightsState({required this.height});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: height,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF0D1A15).withValues(alpha: 0.5),
                  const Color(0xFF152D25).withValues(alpha: 0.3),
                ]
              : [
                  const Color(0xFFF5FFFB),
                  const Color(0xFFE5FFF5),
                ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: LuxuryColors.jadePremium.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  LuxuryColors.jadePremium.withValues(alpha: 0.2),
                  LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Iconsax.magic_star,
              size: 26,
              color: LuxuryColors.jadePremium.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'No insights yet',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isDark
                  ? LuxuryColors.textOnDark.withValues(alpha: 0.8)
                  : LuxuryColors.textOnLight.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Add more CRM data to get AI-powered recommendations',
            style: TextStyle(
              fontSize: 12,
              color: LuxuryColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }
}

/// Insight Section Header with premium styling
class InsightSectionHeader extends StatelessWidget {
  final String title;
  final int insightCount;
  final VoidCallback? onViewAll;

  const InsightSectionHeader({
    super.key,
    this.title = 'AI Insights',
    this.insightCount = 0,
    this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  LuxuryColors.jadePremium,
                  LuxuryColors.deepEmerald,
                ],
              ),
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.jadePremium.withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(
              Iconsax.magic_star,
              size: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                  ),
                ),
                if (insightCount > 0)
                  Text(
                    '$insightCount recommendations',
                    style: TextStyle(
                      fontSize: 11,
                      color: LuxuryColors.textMuted,
                    ),
                  ),
              ],
            ),
          ),
          if (onViewAll != null && insightCount > 1)
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                onViewAll?.call();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: LuxuryColors.jadePremium.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'View All',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: LuxuryColors.jadePremium,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Iconsax.arrow_right_3,
                      size: 12,
                      color: LuxuryColors.jadePremium,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn();
  }
}
