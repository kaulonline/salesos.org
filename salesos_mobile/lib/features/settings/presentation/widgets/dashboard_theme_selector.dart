import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Dashboard theme option model
class _DashboardThemeOption {
  final String id;
  final String name;
  final String description;
  final IconData icon;

  const _DashboardThemeOption({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
  });
}

/// Dashboard theme options
const _themeOptions = [
  _DashboardThemeOption(
    id: 'default',
    name: 'Default',
    description: 'Balanced view with all information',
    icon: Iconsax.slider_horizontal,
  ),
  _DashboardThemeOption(
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, focused essentials only',
    icon: Iconsax.minus_square,
  ),
  _DashboardThemeOption(
    id: 'detailed',
    name: 'Detailed',
    description: 'Rich data with expanded sections',
    icon: Iconsax.maximize_4,
  ),
];

/// Widget that allows users to select a dashboard theme
///
/// Displays three theme options as tappable cards:
/// - Default: Balanced view with all information
/// - Minimal: Clean, focused essentials only
/// - Detailed: Rich data with expanded sections
///
/// The selected theme is highlighted with a gold border and checkmark.
/// Responsive: Uses Column on narrow screens, Row on wider screens.
class DashboardThemeSelector extends ConsumerWidget {
  /// The currently selected theme ('default', 'minimal', 'detailed')
  final String selectedTheme;

  /// Callback when theme selection changes
  final void Function(String) onChanged;

  /// Breakpoint for switching between Row and Column layout (default: 400)
  final double breakpoint;

  const DashboardThemeSelector({
    super.key,
    required this.selectedTheme,
    required this.onChanged,
    this.breakpoint = 400,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < breakpoint;

        final themeCards = _themeOptions.asMap().entries.map((entry) {
          final index = entry.key;
          final option = entry.value;
          final isSelected = selectedTheme == option.id;

          return _ThemeOptionCard(
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
                begin: isNarrow ? 0 : (index == 0 ? -0.1 : (index == 2 ? 0.1 : 0)),
                end: 0,
                duration: 300.ms,
                curve: Curves.easeOutCubic,
              )
              .slideY(
                begin: isNarrow ? 0.1 : 0,
                end: 0,
                duration: 300.ms,
                curve: Curves.easeOutCubic,
              );
        }).toList();

        if (isNarrow) {
          // Vertical layout for narrow screens
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: themeCards
                .map((card) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: card,
                    ))
                .toList(),
          );
        } else {
          // Horizontal layout for wider screens
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: themeCards
                .asMap()
                .entries
                .map((entry) => Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          left: entry.key == 0 ? 0 : 6,
                          right: entry.key == 2 ? 0 : 6,
                        ),
                        child: entry.value,
                      ),
                    ))
                .toList(),
          );
        }
      },
    );
  }
}

/// Individual theme option card widget
class _ThemeOptionCard extends StatelessWidget {
  final _DashboardThemeOption option;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _ThemeOptionCard({
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
                  // Theme icon
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

              // Theme name
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

              // Theme description
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
            ],
          ),
        ),
      ),
    );
  }
}
