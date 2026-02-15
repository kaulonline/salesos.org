import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Insight style option model
class _InsightStyleOption {
  final String id;
  final String name;
  final String description;
  final IconData icon;

  const _InsightStyleOption({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
  });
}

/// Available insight style options
const _styleOptions = [
  _InsightStyleOption(
    id: 'carousel',
    name: 'Carousel',
    description: 'Swipe through insights',
    icon: Iconsax.slider_horizontal_1,
  ),
  _InsightStyleOption(
    id: 'list',
    name: 'List',
    description: 'Scrollable list view',
    icon: Iconsax.row_vertical,
  ),
];

/// Widget that allows users to select how AI insights are displayed on phone
///
/// Displays two style options as tappable cards side by side:
/// - Carousel: Swipe through insights with dots indicator
/// - List: Scrollable list view with stacked cards
///
/// The selected style is highlighted with a gold border and checkmark.
class InsightsStyleSelector extends StatelessWidget {
  /// The currently selected style ('carousel' or 'list')
  final String value;

  /// Callback when style selection changes
  final void Function(String) onChanged;

  const InsightsStyleSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _styleOptions.asMap().entries.map((entry) {
        final index = entry.key;
        final option = entry.value;
        final isSelected = value == option.id;

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              left: index == 0 ? 0 : 6,
              right: index == 1 ? 0 : 6,
            ),
            child: _StyleOptionCard(
              option: option,
              isSelected: isSelected,
              isDark: isDark,
              onTap: () {
                HapticFeedback.lightImpact();
                onChanged(option.id);
              },
            )
                .animate(delay: (50 * index).ms)
                .fadeIn(duration: 300.ms)
                .slideX(
                  begin: index == 0 ? -0.1 : 0.1,
                  end: 0,
                  duration: 300.ms,
                  curve: Curves.easeOutCubic,
                ),
          ),
        );
      }).toList(),
    );
  }
}

/// Individual style option card widget
class _StyleOptionCard extends StatelessWidget {
  final _InsightStyleOption option;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _StyleOptionCard({
    required this.option,
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

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
      child: LuxuryCard(
        variant: LuxuryCardVariant.bordered,
        tier: LuxuryTier.gold,
        borderRadius: 16,
        showAccentBorder: false,
        padding: const EdgeInsets.all(16),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(15),
            border: Border.all(
              color: isSelected ? accentColor : subtleBorderColor,
              width: isSelected ? 2 : 1,
            ),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header row with icon and checkmark
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Style icon
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
                      option.icon,
                      size: 22,
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
                          size: 16,
                          color: Colors.white,
                ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Style name
              Text(
                option.name,
                style: IrisTheme.titleMedium.copyWith(
                  color: isSelected
                      ? accentColor
                      : (isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight),
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                ),
              ),

              const SizedBox(height: 6),

              // Style description
              Text(
                option.description,
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark
                      ? LuxuryColors.textMuted
                      : IrisTheme.lightTextSecondary,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 14),

              // Mini preview
              _buildMiniPreview(option.id, isSelected, accentColor),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds a mini preview illustration for each style option
  Widget _buildMiniPreview(String styleId, bool isSelected, Color accentColor) {
    if (styleId == 'carousel') {
      return _CarouselPreview(
        isSelected: isSelected,
        isDark: isDark,
        accentColor: accentColor,
      );
    } else {
      return _ListPreview(
        isSelected: isSelected,
        isDark: isDark,
        accentColor: accentColor,
      );
    }
  }
}

/// Mini preview showing carousel style with dots indicator
class _CarouselPreview extends StatelessWidget {
  final bool isSelected;
  final bool isDark;
  final Color accentColor;

  const _CarouselPreview({
    required this.isSelected,
    required this.isDark,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.05);
    final dotActiveColor = isSelected ? accentColor : LuxuryColors.textMuted;
    final dotInactiveColor = isDark
        ? Colors.white.withValues(alpha: 0.2)
        : Colors.black.withValues(alpha: 0.15);

    return Column(
      children: [
        // Single card representation (current slide)
        AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          height: 40,
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected
                  ? accentColor.withValues(alpha: 0.3)
                  : Colors.transparent,
              width: 1,
            ),
          ),
          child: Row(
            children: [
              const SizedBox(width: 8),
              // Icon placeholder
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: isSelected
                      ? accentColor.withValues(alpha: 0.2)
                      : (isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.08)),
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              const SizedBox(width: 8),
              // Text lines placeholder
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 6,
                      width: double.infinity,
                      margin: const EdgeInsets.only(right: 16),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.15)
                            : Colors.black.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      height: 4,
                      width: 40,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.black.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 10),

        // Dots indicator
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (index) {
            final isActive = index == 0;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: isActive ? 16 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: isActive ? dotActiveColor : dotInactiveColor,
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
      ],
    );
  }
}

/// Mini preview showing list style with stacked cards
class _ListPreview extends StatelessWidget {
  final bool isSelected;
  final bool isDark;
  final Color accentColor;

  const _ListPreview({
    required this.isSelected,
    required this.isDark,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.05);

    return Column(
      children: List.generate(3, (index) {
        // Each card gets progressively smaller/more transparent
        final opacity = 1.0 - (index * 0.25);
        final height = 20.0 - (index * 2);

        return Padding(
          padding: EdgeInsets.only(bottom: index < 2 ? 4 : 0),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            height: height,
            decoration: BoxDecoration(
              color: cardColor.withValues(alpha: opacity * 0.8),
              borderRadius: BorderRadius.circular(4),
              border: index == 0 && isSelected
                  ? Border.all(
                      color: accentColor.withValues(alpha: 0.3),
                      width: 1,
                    )
                  : null,
            ),
            child: Row(
              children: [
                const SizedBox(width: 6),
                // Small icon placeholder
                Container(
                  width: height - 6,
                  height: height - 6,
                  decoration: BoxDecoration(
                    color: index == 0 && isSelected
                        ? accentColor.withValues(alpha: 0.2)
                        : (isDark
                            ? Colors.white.withValues(alpha: 0.1 * opacity)
                            : Colors.black.withValues(alpha: 0.08 * opacity)),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(width: 6),
                // Text line placeholder
                Expanded(
                  child: Container(
                    height: 4,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.12 * opacity)
                          : Colors.black.withValues(alpha: 0.08 * opacity),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }
}
