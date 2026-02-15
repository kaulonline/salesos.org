import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// A slider widget that controls how many recent activities to show.
///
/// This widget provides a premium-styled slider wrapped in a LuxuryCard,
/// allowing users to select a value between 3 and 10 items.
class ActivityLimitSlider extends StatelessWidget {
  /// The current limit value (must be between 3 and 10).
  final int value;

  /// Callback invoked when the slider value changes.
  final Function(int) onChanged;

  /// Creates an ActivityLimitSlider widget.
  ///
  /// [value] must be between 3 and 10 (inclusive).
  /// [onChanged] is called whenever the user changes the slider value.
  const ActivityLimitSlider({
    super.key,
    required this.value,
    required this.onChanged,
  }) : assert(value >= 3 && value <= 10, 'Value must be between 3 and 10');

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return LuxuryCard(
      tier: LuxuryTier.gold,
      variant: LuxuryCardVariant.standard,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with label and current value display
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Activity Items',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextPrimary
                      : IrisTheme.lightTextPrimary,
                ),
              ),
              // Value badge
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  'Show $value items',
                  style: IrisTheme.labelMedium.copyWith(
                    color: LuxuryColors.rolexGreen,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Slider with custom styling
          SliderTheme(
            data: SliderThemeData(
              trackHeight: 4,
              activeTrackColor: LuxuryColors.rolexGreen,
              inactiveTrackColor: isDark
                  ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                  : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
              thumbColor: LuxuryColors.rolexGreen,
              overlayColor: LuxuryColors.rolexGreen.withValues(alpha: 0.12),
              thumbShape: _CustomThumbShape(value: value),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 24),
              tickMarkShape: SliderTickMarkShape.noTickMark,
              valueIndicatorColor: LuxuryColors.rolexGreen,
              valueIndicatorTextStyle: IrisTheme.labelMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
              showValueIndicator: ShowValueIndicator.onlyForDiscrete,
            ),
            child: Slider(
              value: value.toDouble(),
              min: 3,
              max: 10,
              divisions: 7,
              label: value.toString(),
              onChanged: (newValue) {
                HapticFeedback.selectionClick();
                onChanged(newValue.round());
              },
            ),
          ),

          const SizedBox(height: 8),

          // Min/Max labels
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Min: 3',
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
              Text(
                'Max: 10',
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark
                      ? IrisTheme.darkTextSecondary
                      : IrisTheme.lightTextSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Custom thumb shape that displays the current value inside the thumb.
class _CustomThumbShape extends SliderComponentShape {
  final int value;

  const _CustomThumbShape({required this.value});

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) {
    return const Size(28, 28);
  }

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final Canvas canvas = context.canvas;

    // Thumb circle
    final Paint thumbPaint = Paint()
      ..color = LuxuryColors.rolexGreen
      ..style = PaintingStyle.fill;

    // Outer glow effect
    final Paint glowPaint = Paint()
      ..color = LuxuryColors.rolexGreen.withValues(alpha: 0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    // Draw glow
    canvas.drawCircle(center, 16, glowPaint);

    // Draw thumb
    canvas.drawCircle(center, 14, thumbPaint);

    // Draw value text inside thumb
    final textSpan = TextSpan(
      text: this.value.toString(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: Colors.white,
        fontFamily: IrisTheme.fontFamily,
      ),
    );

    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );

    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(
        center.dx - textPainter.width / 2,
        center.dy - textPainter.height / 2,
      ),
    );
  }
}
