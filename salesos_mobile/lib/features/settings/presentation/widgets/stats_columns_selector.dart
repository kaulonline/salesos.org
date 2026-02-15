import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Model for column option configuration
class _ColumnOption {
  final int columns;
  final String label;

  const _ColumnOption({
    required this.columns,
    required this.label,
  });
}

/// Available column options for stats grid
const _columnOptions = [
  _ColumnOption(columns: 2, label: '2 Columns'),
  _ColumnOption(columns: 3, label: '3 Columns'),
  _ColumnOption(columns: 4, label: '4 Columns'),
];

/// A widget that allows users to select the number of stat columns on tablet.
///
/// Displays a segmented control with 3 options (2, 3, or 4 columns)
/// and a visual preview of the grid layout below each option.
///
/// The selected option is highlighted with gold accent styling.
/// Includes haptic feedback on selection changes.
class StatsColumnsSelector extends StatelessWidget {
  /// The currently selected column count (2, 3, or 4)
  final int value;

  /// Callback when column selection changes
  final Function(int) onChanged;

  const StatsColumnsSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section header
        Text(
          'Stats Grid Columns (Tablet)',
          style: IrisTheme.titleSmall.copyWith(
            color: isDark
                ? IrisTheme.darkTextPrimary
                : IrisTheme.lightTextPrimary,
          ),
        ),

        const SizedBox(height: 8),

        // Description text
        Text(
          'Choose how many stat columns to display on tablet',
          style: IrisTheme.bodySmall.copyWith(
            color: isDark
                ? IrisTheme.darkTextSecondary
                : IrisTheme.lightTextSecondary,
          ),
        ),

        const SizedBox(height: 16),

        // Segmented control
        Container(
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.08),
              width: 1,
            ),
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: _columnOptions.asMap().entries.map((entry) {
              final index = entry.key;
              final option = entry.value;
              final isSelected = value == option.columns;

              return Expanded(
                child: _ColumnOptionButton(
                  option: option,
                  isSelected: isSelected,
                  isDark: isDark,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onChanged(option.columns);
                  },
                ).animate(delay: (50 * index).ms).fadeIn(duration: 200.ms),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 20),

        // Visual preview row
        Row(
          children: _columnOptions.asMap().entries.map((entry) {
            final index = entry.key;
            final option = entry.value;
            final isSelected = value == option.columns;

            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(
                  left: index == 0 ? 0 : 6,
                  right: index == 2 ? 0 : 6,
                ),
                child: _GridPreview(
                  columns: option.columns,
                  isSelected: isSelected,
                  isDark: isDark,
                ).animate(delay: (100 + 50 * index).ms).fadeIn(duration: 250.ms),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

/// Individual column option button in the segmented control
class _ColumnOptionButton extends StatelessWidget {
  final _ColumnOption option;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _ColumnOptionButton({
    required this.option,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.rolexGreen
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Grid icon representation
            _MiniGridIcon(
              columns: option.columns,
              isSelected: isSelected,
              isDark: isDark,
            ),
            const SizedBox(height: 8),
            // Label
            Text(
              option.label,
              style: IrisTheme.labelSmall.copyWith(
                color: isSelected
                    ? Colors.white
                    : (isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary),
                fontWeight: isSelected
                    ? IrisTheme.weightSemiBold
                    : IrisTheme.weightMedium,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Mini grid icon showing column layout
class _MiniGridIcon extends StatelessWidget {
  final int columns;
  final bool isSelected;
  final bool isDark;

  const _MiniGridIcon({
    required this.columns,
    required this.isSelected,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final itemColor = isSelected
        ? Colors.white.withValues(alpha: 0.9)
        : (isDark
            ? Colors.white.withValues(alpha: 0.4)
            : Colors.black.withValues(alpha: 0.3));

    final itemWidth = (24.0 - (columns - 1) * 2) / columns;

    return SizedBox(
      width: 24,
      height: 16,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(columns, (index) {
          return Container(
            width: itemWidth,
            height: 16,
            decoration: BoxDecoration(
              color: itemColor,
              borderRadius: BorderRadius.circular(2),
            ),
          );
        }),
      ),
    );
  }
}

/// Visual preview of the grid layout
class _GridPreview extends StatelessWidget {
  final int columns;
  final bool isSelected;
  final bool isDark;

  const _GridPreview({
    required this.columns,
    required this.isSelected,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isSelected
        ? LuxuryColors.rolexGreen
        : (isDark
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.black.withValues(alpha: 0.08));

    final itemColor = isSelected
        ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
        : (isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.black.withValues(alpha: 0.05));

    final itemBorderColor = isSelected
        ? LuxuryColors.rolexGreen.withValues(alpha: 0.4)
        : (isDark
            ? Colors.white.withValues(alpha: 0.15)
            : Colors.black.withValues(alpha: 0.1));

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeInOut,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.obsidian
            : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: borderColor,
          width: isSelected ? 1.5 : 1,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row of grid items
          Row(
            children: List.generate(columns, (index) {
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: index == 0 ? 0 : 2,
                    right: index == columns - 1 ? 0 : 2,
                  ),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 20,
                    decoration: BoxDecoration(
                      color: itemColor,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: itemBorderColor,
                        width: 1,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 4),
          // Second row of grid items
          Row(
            children: List.generate(columns, (index) {
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: index == 0 ? 0 : 2,
                    right: index == columns - 1 ? 0 : 2,
                  ),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 20,
                    decoration: BoxDecoration(
                      color: itemColor,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: itemBorderColor,
                        width: 1,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

/// A card-wrapped version of the StatsColumnsSelector for use in settings pages
class StatsColumnsSelectorCard extends StatelessWidget {
  /// The currently selected column count (2, 3, or 4)
  final int value;

  /// Callback when column selection changes
  final Function(int) onChanged;

  const StatsColumnsSelectorCard({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(16),
      child: StatsColumnsSelector(
        value: value,
        onChanged: onChanged,
      ),
    );
  }
}
