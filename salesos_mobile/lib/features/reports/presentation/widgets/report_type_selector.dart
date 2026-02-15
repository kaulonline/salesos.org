import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Supported report types
enum ReportType {
  pipeline('Pipeline', Iconsax.chart_1),
  winRate('Win Rate', Iconsax.medal_star),
  activities('Activities', Iconsax.activity),
  revenue('Revenue', Iconsax.dollar_circle),
  leadConversion('Lead Conversion', Iconsax.convert_3d_cube);

  final String label;
  final IconData icon;
  const ReportType(this.label, this.icon);
}

/// Horizontal scrollable report type selector tabs
class ReportTypeSelector extends StatelessWidget {
  final ReportType selected;
  final ValueChanged<ReportType> onSelected;

  const ReportTypeSelector({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: ReportType.values.length,
        itemBuilder: (context, index) {
          final type = ReportType.values[index];
          final isSelected = type == selected;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                onSelected(type);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                      : (isDark
                          ? IrisTheme.darkSurfaceElevated
                          : IrisTheme.lightSurfaceElevated),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: isSelected
                        ? LuxuryColors.rolexGreen.withValues(alpha: 0.5)
                        : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      type.icon,
                      size: 16,
                      color: isSelected
                          ? (isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen)
                          : (isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      type.label,
                      style: IrisTheme.labelMedium.copyWith(
                        color: isSelected
                            ? (isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen)
                            : (isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary),
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
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
