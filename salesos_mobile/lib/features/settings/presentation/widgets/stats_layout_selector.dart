import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Widget that allows users to select how stats are displayed on phone.
///
/// Provides two layout options:
/// - Row: Horizontal scrollable layout with swipe gesture
/// - Grid: Compact 2x2 grid layout showing all stats at once
///
/// The selected option is highlighted with a gold border and checkmark.
class StatsLayoutSelector extends StatelessWidget {
  /// The currently selected layout ('row' or 'grid')
  final String value;

  /// Callback when layout selection changes
  final void Function(String) onChanged;

  const StatsLayoutSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        // Row option
        Expanded(
          child: _LayoutOptionCard(
            id: 'row',
            icon: Iconsax.arrow_right_1,
            label: 'Horizontal Row',
            description: 'Swipe to see all stats',
            previewWidget: _RowPreview(isDark: isDark),
            isSelected: value == 'row',
            isDark: isDark,
            onTap: () {
              HapticFeedback.lightImpact();
              onChanged('row');
            },
          ),
        ),
        const SizedBox(width: 12),
        // Grid option
        Expanded(
          child: _LayoutOptionCard(
            id: 'grid',
            icon: Iconsax.element_3,
            label: 'Compact Grid',
            description: '2x2 grid layout',
            previewWidget: _GridPreview(isDark: isDark),
            isSelected: value == 'grid',
            isDark: isDark,
            onTap: () {
              HapticFeedback.lightImpact();
              onChanged('grid');
            },
          ),
        ),
      ],
    );
  }
}

/// Individual layout option card widget
class _LayoutOptionCard extends StatelessWidget {
  final String id;
  final IconData icon;
  final String label;
  final String description;
  final Widget previewWidget;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _LayoutOptionCard({
    required this.id,
    required this.icon,
    required this.label,
    required this.description,
    required this.previewWidget,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor = LuxuryColors.rolexGreen;
    final subtleBorderColor = isDark
        ? Colors.white.withValues(alpha: 0.1)
        : Colors.black.withValues(alpha: 0.08);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? accentColor : subtleBorderColor,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: accentColor.withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [
                  BoxShadow(
                    color: isDark
                        ? Colors.black.withValues(alpha: 0.3)
                        : Colors.black.withValues(alpha: 0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header row with icon and checkmark
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Layout icon
                AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOutCubic,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? accentColor.withValues(alpha: 0.15)
                        : (isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.black.withValues(alpha: 0.03)),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? accentColor.withValues(alpha: 0.3)
                          : Colors.transparent,
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    icon,
                    size: 20,
                    color: isSelected
                        ? accentColor
                        : (isDark
                            ? LuxuryColors.textOnDark
                            : LuxuryColors.textOnLight),
                  ),
                ),

                // Checkmark indicator
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 200),
                  opacity: isSelected ? 1.0 : 0.0,
                  child: AnimatedScale(
                    duration: const Duration(milliseconds: 250),
                    scale: isSelected ? 1.0 : 0.5,
                    curve: Curves.easeOutBack,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: accentColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: accentColor.withValues(alpha: 0.3),
                            blurRadius: 8,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Iconsax.tick_circle5,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Layout name
            Text(
              label,
              style: IrisTheme.titleSmall.copyWith(
                color: isSelected
                    ? accentColor
                    : (isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight),
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
              ),
            ),

            const SizedBox(height: 4),

            // Layout description
            Text(
              description,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? LuxuryColors.textMuted
                    : IrisTheme.lightTextSecondary,
                height: 1.3,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),

            const SizedBox(height: 14),

            // Mini preview
            previewWidget,
          ],
        ),
      ),
    );
  }
}

/// Mini preview showing 4 squares in a horizontal row with arrow indicator
class _RowPreview extends StatelessWidget {
  final bool isDark;

  const _RowPreview({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final squareColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.08);
    final arrowColor = isDark
        ? Colors.white.withValues(alpha: 0.4)
        : Colors.black.withValues(alpha: 0.3);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Four small squares in a row
          for (int i = 0; i < 4; i++) ...[
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: squareColor,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            if (i < 3) const SizedBox(width: 4),
          ],
          const SizedBox(width: 6),
          // Arrow indicator
          Icon(
            Iconsax.arrow_right_3,
            size: 14,
            color: arrowColor,
          ),
        ],
      ),
    );
  }
}

/// Mini preview showing 2x2 grid of squares
class _GridPreview extends StatelessWidget {
  final bool isDark;

  const _GridPreview({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final squareColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.08);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.black.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top row - 2 squares
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 20,
                height: 14,
                decoration: BoxDecoration(
                  color: squareColor,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                width: 20,
                height: 14,
                decoration: BoxDecoration(
                  color: squareColor,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Bottom row - 2 squares
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 20,
                height: 14,
                decoration: BoxDecoration(
                  color: squareColor,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                width: 20,
                height: 14,
                decoration: BoxDecoration(
                  color: squareColor,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
