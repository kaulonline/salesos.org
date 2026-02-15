import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'luxury_card.dart';

/// Luxury shimmer loading placeholder
/// Inspired by premium brand loading states
class IrisShimmer extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;
  final EdgeInsetsGeometry? margin;
  final LuxuryTier tier;

  const IrisShimmer({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 12,
    this.margin,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Shimmer.fromColors(
          baseColor: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.diamond.withValues(alpha: 0.6),
          highlightColor: isDark
              ? shimmerColor.withValues(alpha: 0.15)
              : shimmerColor.withValues(alpha: 0.2),
          child: Container(
            width: width,
            height: height,
            margin: margin,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: shimmerColor.withValues(alpha: 0.1),
                width: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury shimmer loading for list items
class IrisListShimmer extends StatelessWidget {
  final int itemCount;
  final double itemHeight;
  final EdgeInsetsGeometry? padding;
  final LuxuryTier tier;

  const IrisListShimmer({
    super.key,
    this.itemCount = 5,
    this.itemHeight = 80,
    this.padding,
    this.tier = LuxuryTier.gold,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 20),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        return _ShimmerListItem(height: itemHeight, tier: tier);
      },
    );
  }
}

class _ShimmerListItem extends StatelessWidget {
  final double height;
  final LuxuryTier tier;

  const _ShimmerListItem({
    required this.height,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Shimmer.fromColors(
          baseColor: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.diamond.withValues(alpha: 0.6),
          highlightColor: isDark
              ? shimmerColor.withValues(alpha: 0.15)
              : shimmerColor.withValues(alpha: 0.2),
          child: Container(
            height: height,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: shimmerColor.withValues(alpha: 0.1),
                width: 1,
              ),
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                const SizedBox(width: 14),
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: double.infinity,
                        height: 14,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: 120,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury card shimmer loading
class IrisCardShimmer extends StatelessWidget {
  final double height;
  final EdgeInsetsGeometry? margin;
  final LuxuryTier tier;

  const IrisCardShimmer({
    super.key,
    this.height = 120,
    this.margin,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Shimmer.fromColors(
          baseColor: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.diamond.withValues(alpha: 0.6),
          highlightColor: isDark
              ? shimmerColor.withValues(alpha: 0.15)
              : shimmerColor.withValues(alpha: 0.2),
          child: Container(
            height: height,
            margin: margin ?? const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: shimmerColor.withValues(alpha: 0.15),
                width: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury dashboard shimmer loading
class IrisDashboardShimmer extends StatelessWidget {
  final LuxuryTier tier;

  const IrisDashboardShimmer({
    super.key,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Shimmer.fromColors(
          baseColor: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.diamond.withValues(alpha: 0.6),
          highlightColor: isDark
              ? shimmerColor.withValues(alpha: 0.15)
              : shimmerColor.withValues(alpha: 0.2),
          child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 100,
                        height: 14,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: 150,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),
            // Stats card
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: shimmerColor.withValues(alpha: 0.1),
                  width: 1,
                ),
              ),
            ),
            const SizedBox(height: 28),
            // Section title
            Container(
              width: 120,
              height: 16,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            const SizedBox(height: 18),
            // Horizontal scroll items
            SizedBox(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: 4,
                itemBuilder: (context, index) => Container(
                  width: 100,
                  height: 100,
                  margin: const EdgeInsets.only(right: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: shimmerColor.withValues(alpha: 0.1),
                      width: 1,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),
            // Activity items
            ...List.generate(
              3,
              (index) => Container(
                height: 80,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: shimmerColor.withValues(alpha: 0.1),
                    width: 1,
                  ),
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
}

/// Luxury kanban shimmer loading
class IrisKanbanShimmer extends StatelessWidget {
  final LuxuryTier tier;

  const IrisKanbanShimmer({
    super.key,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Shimmer.fromColors(
          baseColor: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.diamond.withValues(alpha: 0.6),
          highlightColor: isDark
              ? shimmerColor.withValues(alpha: 0.15)
              : shimmerColor.withValues(alpha: 0.2),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: List.generate(
                4,
                (stageIndex) => Container(
                  width: 280,
                  margin: const EdgeInsets.only(right: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stage header
                      Container(
                        height: 44,
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: shimmerColor.withValues(alpha: 0.1),
                            width: 1,
                          ),
                        ),
                      ),
                      // Deal cards
                      ...List.generate(
                        3 - stageIndex.clamp(0, 2),
                        (cardIndex) => Container(
                          height: 100,
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: shimmerColor.withValues(alpha: 0.1),
                              width: 1,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Animated counter for smooth number transitions
class AnimatedCounter extends StatelessWidget {
  final int value;
  final TextStyle? style;
  final String? prefix;
  final String? suffix;
  final Duration duration;
  final Curve curve;

  const AnimatedCounter({
    super.key,
    required this.value,
    this.style,
    this.prefix,
    this.suffix,
    this.duration = const Duration(milliseconds: 800),
    this.curve = Curves.easeOutCubic,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<int>(
      tween: IntTween(begin: 0, end: value),
      duration: duration,
      curve: curve,
      builder: (context, val, child) {
        return Text(
          '${prefix ?? ''}$val${suffix ?? ''}',
          style: style,
        );
      },
    );
  }
}

/// Animated currency counter with luxury formatting
class AnimatedCurrencyCounter extends StatelessWidget {
  final double value;
  final TextStyle? style;
  final Duration duration;
  final Curve curve;

  const AnimatedCurrencyCounter({
    super.key,
    required this.value,
    this.style,
    this.duration = const Duration(milliseconds: 1000),
    this.curve = Curves.easeOutCubic,
  });

  String _formatCurrency(double val) {
    if (val >= 1000000) {
      return '\$${(val / 1000000).toStringAsFixed(1)}M';
    } else if (val >= 1000) {
      return '\$${(val / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${val.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: value),
      duration: duration,
      curve: curve,
      builder: (context, val, child) {
        return Text(
          _formatCurrency(val),
          style: style,
        );
      },
    );
  }
}

/// Luxury stat chip shimmer
class StatChipShimmer extends StatelessWidget {
  final LuxuryTier tier;

  const StatChipShimmer({
    super.key,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Shimmer.fromColors(
            baseColor: isDark
                ? LuxuryColors.obsidian
                : LuxuryColors.diamond.withValues(alpha: 0.6),
            highlightColor: isDark
                ? shimmerColor.withValues(alpha: 0.15)
                : shimmerColor.withValues(alpha: 0.2),
            child: Container(
              width: 95,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: shimmerColor.withValues(alpha: 0.15),
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: 60,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury pipeline card shimmer
class PipelineCardShimmer extends StatelessWidget {
  final LuxuryTier tier;

  const PipelineCardShimmer({
    super.key,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Shimmer.fromColors(
          baseColor: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.diamond.withValues(alpha: 0.6),
          highlightColor: isDark
              ? shimmerColor.withValues(alpha: 0.15)
              : shimmerColor.withValues(alpha: 0.2),
          child: Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isDark ? LuxuryColors.obsidian : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: shimmerColor.withValues(alpha: 0.15),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 100,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: 140,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Container(
                        width: 80,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Inline value shimmer for loading states
class ValueShimmer extends StatelessWidget {
  final double width;
  final double height;
  final LuxuryTier tier;

  const ValueShimmer({
    super.key,
    this.width = 30,
    this.height = 14,
    this.tier = LuxuryTier.gold,
  });

  Color _getShimmerColor() {
    switch (tier) {
      case LuxuryTier.gold:
        return LuxuryColors.champagneGold;
      case LuxuryTier.platinum:
        return LuxuryColors.platinum;
      case LuxuryTier.emerald:
        return LuxuryColors.champagneGold;
      case LuxuryTier.roseGold:
        return LuxuryColors.roseGold;
      default:
        return LuxuryColors.champagneGold;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor = _getShimmerColor();

    // Wrap shimmer animation in ExcludeSemantics and RepaintBoundary
    // to prevent semantics parent data dirty errors during continuous animation
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: Shimmer.fromColors(
          baseColor: isDark
              ? LuxuryColors.obsidian
              : LuxuryColors.diamond.withValues(alpha: 0.6),
          highlightColor: isDark
              ? shimmerColor.withValues(alpha: 0.15)
              : shimmerColor.withValues(alpha: 0.2),
          child: Container(
            width: width,
            height: height,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ),
      ),
    );
  }
}
