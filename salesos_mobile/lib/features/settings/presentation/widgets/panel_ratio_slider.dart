import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Widget that controls the tablet left panel width ratio.
///
/// Allows users to adjust the ratio between left and right panels
/// on tablet layouts. The value ranges from 0.3 (30%) to 0.5 (50%).
///
/// Features:
/// - Live visual preview showing panel proportions
/// - Slider with gold accent color
/// - Percentage labels and current value display
/// - Haptic feedback on interaction
/// - Luxury card styling
class PanelRatioSlider extends StatelessWidget {
  /// The current panel width ratio (0.3 to 0.5)
  final double value;

  /// Callback when the value changes
  final Function(double) onChanged;

  /// Minimum ratio value (default: 0.3)
  final double min;

  /// Maximum ratio value (default: 0.5)
  final double max;

  const PanelRatioSlider({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 0.3,
    this.max = 0.5,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = LuxuryColors.rolexGreen;

    return LuxuryCard(
      variant: LuxuryCardVariant.standard,
      tier: LuxuryTier.gold,
      borderRadius: 16,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header label
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Panel Width (Tablet)',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                ),
              ),
              // Current value badge
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: accentColor.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  'Left panel: ${(value * 100).toInt()}%',
                  style: IrisTheme.labelMedium.copyWith(
                    color: accentColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Visual preview showing two panels
          _PanelPreview(
            ratio: value,
            isDark: isDark,
            accentColor: accentColor,
          ),

          const SizedBox(height: 20),

          // Slider with percentage labels
          Column(
            children: [
              // Slider
              SliderTheme(
                data: SliderThemeData(
                  activeTrackColor: accentColor,
                  inactiveTrackColor: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.black.withValues(alpha: 0.1),
                  thumbColor: accentColor,
                  overlayColor: accentColor.withValues(alpha: 0.2),
                  trackHeight: 6,
                  thumbShape: const RoundSliderThumbShape(
                    enabledThumbRadius: 10,
                    elevation: 4,
                  ),
                  overlayShape: const RoundSliderOverlayShape(
                    overlayRadius: 20,
                  ),
                  trackShape: const RoundedRectSliderTrackShape(),
                ),
                child: Slider(
                  value: value,
                  min: min,
                  max: max,
                  divisions: 20,
                  onChanged: (newValue) {
                    HapticFeedback.selectionClick();
                    onChanged(newValue);
                  },
                  onChangeStart: (_) {
                    HapticFeedback.lightImpact();
                  },
                  onChangeEnd: (_) {
                    HapticFeedback.mediumImpact();
                  },
                ),
              ),

              // Percentage labels
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '30%',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textMuted
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    Text(
                      '40%',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textMuted
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                    Text(
                      '50%',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textMuted
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Live preview widget showing the panel proportions
class _PanelPreview extends StatelessWidget {
  final double ratio;
  final bool isDark;
  final Color accentColor;

  const _PanelPreview({
    required this.ratio,
    required this.isDark,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final leftPanelColor = accentColor.withValues(alpha: 0.3);
    final rightPanelColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.05);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.12);

    return Container(
      height: 80,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: borderColor,
          width: 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final totalWidth = constraints.maxWidth;
          final leftWidth = totalWidth * ratio;
          final rightWidth = totalWidth * (1 - ratio);

          return Row(
            children: [
              // Left panel
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                width: leftWidth,
                decoration: BoxDecoration(
                  color: leftPanelColor,
                  border: Border(
                    right: BorderSide(
                      color: accentColor.withValues(alpha: 0.5),
                      width: 2,
                    ),
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.menu,
                      size: 20,
                      color: accentColor,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Left',
                      style: IrisTheme.caption.copyWith(
                        color: accentColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${(ratio * 100).toInt()}%',
                      style: IrisTheme.labelSmall.copyWith(
                        color: accentColor.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),

              // Right panel
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                width: rightWidth,
                color: rightPanelColor,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.dashboard_outlined,
                      size: 20,
                      color: isDark
                          ? LuxuryColors.textMuted
                          : IrisTheme.lightTextTertiary,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Right',
                      style: IrisTheme.caption.copyWith(
                        color: isDark
                            ? LuxuryColors.textMuted
                            : IrisTheme.lightTextTertiary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${((1 - ratio) * 100).toInt()}%',
                      style: IrisTheme.labelSmall.copyWith(
                        color: isDark
                            ? LuxuryColors.textMuted.withValues(alpha: 0.8)
                            : IrisTheme.lightTextTertiary.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
