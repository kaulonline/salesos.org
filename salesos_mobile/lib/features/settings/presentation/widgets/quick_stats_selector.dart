import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Available stat options for dashboard quick stats
class StatOption {
  final String id;
  final String label;
  final IconData icon;

  const StatOption({
    required this.id,
    required this.label,
    required this.icon,
  });
}

/// Predefined stat options available for selection
class AvailableStats {
  static const List<StatOption> all = [
    StatOption(id: 'calls', label: 'Calls', icon: Iconsax.call),
    StatOption(id: 'meetings', label: 'Meetings', icon: Iconsax.calendar_1),
    StatOption(id: 'tasks', label: 'Tasks', icon: Iconsax.task_square),
    StatOption(id: 'leads', label: 'Leads', icon: Iconsax.profile_2user),
    StatOption(id: 'deals', label: 'Deals', icon: Iconsax.money_recive),
    StatOption(id: 'emails', label: 'Emails', icon: Iconsax.sms),
  ];

  /// Get a stat option by its ID
  static StatOption? getById(String id) {
    try {
      return all.firstWhere((stat) => stat.id == id);
    } catch (_) {
      return null;
    }
  }
}

/// A widget that allows users to select which stats to display on the dashboard.
///
/// Users can select up to [maxSelection] stats (default 4) from the available options.
/// The widget displays FilterChip components for each stat option with luxury styling.
class QuickStatsSelector extends ConsumerWidget {
  /// The currently selected stat IDs
  final List<String> selectedStats;

  /// Callback when selection changes
  final Function(List<String>) onChanged;

  /// Maximum number of stats that can be selected (default: 4)
  final int maxSelection;

  const QuickStatsSelector({
    super.key,
    required this.selectedStats,
    required this.onChanged,
    this.maxSelection = 4,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bool hasMinimumSelection = selectedStats.length >= maxSelection;
    final bool showWarning = selectedStats.length < maxSelection;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with selection count
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Quick Stats',
              style: IrisTheme.titleSmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: showWarning
                    ? IrisTheme.warning.withValues(alpha: 0.1)
                    : LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${selectedStats.length}/$maxSelection',
                style: IrisTheme.labelSmall.copyWith(
                  color: showWarning
                      ? IrisTheme.warning
                      : LuxuryColors.rolexGreen,
                  fontWeight: IrisTheme.weightSemiBold,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 8),

        // Description text
        Text(
          'Select $maxSelection stats to display on your dashboard',
          style: IrisTheme.bodySmall.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),

        const SizedBox(height: 16),

        // Stat chips in a Wrap layout
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: AvailableStats.all.asMap().entries.map((entry) {
            final index = entry.key;
            final stat = entry.value;
            final isSelected = selectedStats.contains(stat.id);
            final isDisabled = !isSelected && hasMinimumSelection;

            return _StatChip(
              stat: stat,
              isSelected: isSelected,
              isDisabled: isDisabled,
              onTap: () => _handleStatTap(stat.id, isSelected, isDisabled),
              animationDelay: Duration(milliseconds: 50 * index),
            );
          }).toList(),
        ),

        // Warning message when less than required stats are selected
        if (showWarning) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: IrisTheme.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: IrisTheme.warning.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Iconsax.warning_2,
                  size: 18,
                  color: IrisTheme.warning,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Please select ${maxSelection - selectedStats.length} more stat${(maxSelection - selectedStats.length) > 1 ? 's' : ''} to complete your dashboard',
                    style: IrisTheme.bodySmall.copyWith(
                      color: IrisTheme.warning,
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
        ],
      ],
    );
  }

  /// Handle stat chip tap
  void _handleStatTap(String statId, bool isSelected, bool isDisabled) {
    if (isDisabled) {
      // Provide haptic feedback to indicate disabled state
      HapticFeedback.lightImpact();
      return;
    }

    HapticFeedback.selectionClick();

    final List<String> newSelection = List.from(selectedStats);

    if (isSelected) {
      // Remove from selection
      newSelection.remove(statId);
    } else {
      // Add to selection (only if under max)
      if (newSelection.length < maxSelection) {
        newSelection.add(statId);
      }
    }

    onChanged(newSelection);
  }
}

/// Individual stat chip widget with luxury styling
class _StatChip extends StatelessWidget {
  final StatOption stat;
  final bool isSelected;
  final bool isDisabled;
  final VoidCallback onTap;
  final Duration animationDelay;

  const _StatChip({
    required this.stat,
    required this.isSelected,
    required this.isDisabled,
    required this.onTap,
    required this.animationDelay,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Determine colors based on state
    final Color backgroundColor;
    final Color borderColor;
    final Color iconColor;
    final Color labelColor;

    if (isSelected) {
      backgroundColor = LuxuryColors.rolexGreen.withValues(alpha: 0.15);
      borderColor = LuxuryColors.rolexGreen;
      iconColor = LuxuryColors.rolexGreen;
      labelColor = LuxuryColors.rolexGreen;
    } else if (isDisabled) {
      backgroundColor = isDark
          ? Colors.white.withValues(alpha: 0.05)
          : Colors.black.withValues(alpha: 0.03);
      borderColor = isDark
          ? Colors.white.withValues(alpha: 0.1)
          : Colors.black.withValues(alpha: 0.1);
      iconColor = isDark
          ? IrisTheme.darkTextTertiary
          : IrisTheme.lightTextTertiary;
      labelColor = isDark
          ? IrisTheme.darkTextTertiary
          : IrisTheme.lightTextTertiary;
    } else {
      backgroundColor = isDark
          ? LuxuryColors.obsidian
          : Colors.white;
      borderColor = isDark
          ? Colors.white.withValues(alpha: 0.2)
          : Colors.black.withValues(alpha: 0.1);
      iconColor = isDark
          ? IrisTheme.darkTextSecondary
          : IrisTheme.lightTextSecondary;
      labelColor = isDark
          ? IrisTheme.darkTextPrimary
          : IrisTheme.lightTextPrimary;
    }

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: borderColor,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              stat.icon,
              size: 18,
              color: iconColor,
            ),
            const SizedBox(width: 8),
            Text(
              stat.label,
              style: IrisTheme.labelMedium.copyWith(
                color: labelColor,
                fontWeight: isSelected
                    ? IrisTheme.weightSemiBold
                    : IrisTheme.weightMedium,
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Icon(
                Iconsax.tick_circle5,
                size: 16,
                color: LuxuryColors.rolexGreen,
              ),
            ],
          ],
        ),
      ),
    ).animate(delay: animationDelay).fadeIn().scale(
          begin: const Offset(0.9, 0.9),
          end: const Offset(1.0, 1.0),
          duration: 250.ms,
          curve: Curves.easeOut,
        );
  }
}

/// A card-wrapped version of the QuickStatsSelector for use in settings pages
class QuickStatsSelectorCard extends ConsumerWidget {
  /// The currently selected stat IDs
  final List<String> selectedStats;

  /// Callback when selection changes
  final Function(List<String>) onChanged;

  /// Maximum number of stats that can be selected (default: 4)
  final int maxSelection;

  const QuickStatsSelectorCard({
    super.key,
    required this.selectedStats,
    required this.onChanged,
    this.maxSelection = 4,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(16),
      child: QuickStatsSelector(
        selectedStats: selectedStats,
        onChanged: onChanged,
        maxSelection: maxSelection,
      ),
    );
  }
}
