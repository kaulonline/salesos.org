import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Deal health status for AI indicators
enum DealHealthStatus { hot, healthy, atRisk, cold }

/// Color-coded opportunity/deal card inspired by modern CRM designs
/// Features vibrant background colors for visual scanability
/// Enhanced with AI health indicators
class OpportunityCard extends StatelessWidget {
  final String id;
  final String name;
  final double amount;
  final DateTime? date;
  final String? dateLabel;
  final OpportunityCardColor cardColor;
  final VoidCallback? onTap;
  final List<String>? teamMemberAvatars; // URLs or initials
  // AI Health indicators
  final int? healthScore; // 0-100
  final DealHealthStatus? healthStatus;
  final int? daysInStage;
  final String? aiRecommendation;

  const OpportunityCard({
    super.key,
    required this.id,
    required this.name,
    required this.amount,
    this.date,
    this.dateLabel,
    this.cardColor = OpportunityCardColor.blue,
    this.onTap,
    this.teamMemberAvatars,
    this.healthScore,
    this.healthStatus,
    this.daysInStage,
    this.aiRecommendation,
  });

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${NumberFormat('#,##0.00').format(amount / 1000000)}M';
    } else if (amount >= 1000) {
      return '\$${NumberFormat('#,###').format(amount)}';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = cardColor.colors;
    final textColor = cardColor.textColor;
    final secondaryTextColor = cardColor.secondaryTextColor;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colors.first,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: colors.first.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Date label
                  if (date != null || dateLabel != null) ...[
                    Text(
                      dateLabel ?? DateFormat('MMM d').format(date!),
                      style: IrisTheme.labelSmall.copyWith(
                        color: secondaryTextColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 6),
                  ],
                  // Deal name
                  Text(
                    name,
                    style: IrisTheme.titleSmall.copyWith(
                      color: textColor,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                  // Amount - large and prominent
                  Text(
                    _formatAmount(amount),
                    style: IrisTheme.headlineSmall.copyWith(
                      color: textColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  // AI Health indicators
                  if (healthScore != null || healthStatus != null || daysInStage != null) ...[
                    const SizedBox(height: 10),
                    _buildHealthIndicators(textColor, secondaryTextColor),
                  ],
                ],
              ),
            ),
            // Right content - avatars and arrow
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Team avatars (stacked)
                if (teamMemberAvatars != null && teamMemberAvatars!.isNotEmpty)
                  _buildAvatarStack(textColor),
                const SizedBox(height: 24),
                // Arrow indicator
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: textColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Iconsax.arrow_right_3,
                    size: 16,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.05);
  }

  Widget _buildHealthIndicators(Color textColor, Color secondaryTextColor) {
    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: [
        // Health status badge
        if (healthStatus != null)
          _HealthBadge(
            status: healthStatus!,
            textColor: textColor,
          ),
        // Health score
        if (healthScore != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: textColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Iconsax.chart_2,
                  size: 12,
                  color: textColor.withValues(alpha: 0.8),
                ),
                const SizedBox(width: 4),
                Text(
                  '$healthScore%',
                  style: IrisTheme.caption.copyWith(
                    color: textColor.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        // Days in stage
        if (daysInStage != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: textColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Iconsax.clock,
                  size: 12,
                  color: textColor.withValues(alpha: 0.8),
                ),
                const SizedBox(width: 4),
                Text(
                  '$daysInStage days',
                  style: IrisTheme.caption.copyWith(
                    color: textColor.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildAvatarStack(Color textColor) {
    final avatars = teamMemberAvatars!.take(3).toList();
    const avatarSize = 28.0;
    const overlap = 8.0;

    return SizedBox(
      width: avatarSize + (avatars.length - 1) * (avatarSize - overlap),
      height: avatarSize,
      child: Stack(
        children: avatars.asMap().entries.map((entry) {
          final index = entry.key;
          final avatar = entry.value;
          return Positioned(
            right: index * (avatarSize - overlap),
            child: Container(
              width: avatarSize,
              height: avatarSize,
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold,
                shape: BoxShape.circle,
                border: Border.all(
                  color: cardColor.colors.first,
                  width: 2,
                ),
              ),
              child: Center(
                child: Text(
                  avatar.length <= 2 ? avatar : avatar.substring(0, 2).toUpperCase(),
                  style: IrisTheme.labelSmall.copyWith(
                    color: IrisTheme.darkBackground,
                    fontWeight: FontWeight.w600,
                    fontSize: 10,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Color options for opportunity cards
enum OpportunityCardColor {
  blue,
  yellow,
  teal,
  dark,
  gold, // Brand gold
}

extension OpportunityCardColorExtension on OpportunityCardColor {
  List<Color> get colors {
    switch (this) {
      case OpportunityCardColor.blue:
        return [IrisTheme.cardBlue, IrisTheme.accentBlueDark];
      case OpportunityCardColor.yellow:
        return [IrisTheme.cardYellow, IrisTheme.accentYellowDark];
      case OpportunityCardColor.teal:
        return [IrisTheme.cardTeal, IrisTheme.accentTealDark];
      case OpportunityCardColor.dark:
        return [IrisTheme.cardDark, IrisTheme.darkBackground];
      case OpportunityCardColor.gold:
        return [LuxuryColors.champagneGold, LuxuryColors.champagneGoldDark];
    }
  }

  Color get textColor {
    switch (this) {
      case OpportunityCardColor.blue:
      case OpportunityCardColor.dark:
        return Colors.white;
      case OpportunityCardColor.yellow:
      case OpportunityCardColor.teal:
      case OpportunityCardColor.gold:
        return IrisTheme.darkBackground;
    }
  }

  Color get secondaryTextColor {
    switch (this) {
      case OpportunityCardColor.blue:
      case OpportunityCardColor.dark:
        return Colors.white.withValues(alpha: 0.7);
      case OpportunityCardColor.yellow:
      case OpportunityCardColor.teal:
      case OpportunityCardColor.gold:
        return IrisTheme.darkBackground.withValues(alpha: 0.6);
    }
  }
}

/// Stacked opportunity cards view - shows cards with slight overlap
/// Similar to Interaction History in modern CRM designs
class StackedOpportunityCards extends StatelessWidget {
  final List<OpportunityCardData> opportunities;
  final void Function(String id)? onTap;

  const StackedOpportunityCards({
    super.key,
    required this.opportunities,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: opportunities.length,
      itemBuilder: (context, index) {
        final opp = opportunities[index];
        // Cycle through colors for visual variety
        final colorIndex = index % OpportunityCardColor.values.length;
        final cardColor = OpportunityCardColor.values[colorIndex];

        return OpportunityCard(
          id: opp.id,
          name: opp.name,
          amount: opp.amount,
          date: opp.date,
          dateLabel: opp.dateLabel,
          cardColor: cardColor,
          teamMemberAvatars: opp.teamMemberAvatars,
          onTap: () => onTap?.call(opp.id),
        );
      },
    );
  }
}

/// Data model for opportunity cards
class OpportunityCardData {
  final String id;
  final String name;
  final double amount;
  final DateTime? date;
  final String? dateLabel;
  final List<String>? teamMemberAvatars;
  final int? healthScore;
  final DealHealthStatus? healthStatus;
  final int? daysInStage;

  const OpportunityCardData({
    required this.id,
    required this.name,
    required this.amount,
    this.date,
    this.dateLabel,
    this.teamMemberAvatars,
    this.healthScore,
    this.healthStatus,
    this.daysInStage,
  });
}

/// Health status badge for deals
class _HealthBadge extends StatelessWidget {
  final DealHealthStatus status;
  final Color textColor;

  const _HealthBadge({
    required this.status,
    required this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final (icon, label, color) = switch (status) {
      DealHealthStatus.hot => (Iconsax.flash_15, 'Hot', IrisTheme.success),
      DealHealthStatus.healthy => (Iconsax.tick_circle, 'Healthy', IrisTheme.info),
      DealHealthStatus.atRisk => (Iconsax.warning_2, 'At Risk', IrisTheme.warning),
      DealHealthStatus.cold => (Iconsax.danger, 'Cold', IrisTheme.error),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.4)),
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
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
