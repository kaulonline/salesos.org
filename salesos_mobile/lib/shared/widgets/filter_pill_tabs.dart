import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// A horizontal scrollable list of pill-shaped filter tabs
/// Inspired by modern CRM designs for quick filtering
class FilterPillTabs<T> extends StatelessWidget {
  final List<FilterPillItem<T>> items;
  final T selectedValue;
  final ValueChanged<T> onSelected;
  final EdgeInsetsGeometry? padding;

  const FilterPillTabs({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onSelected,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: padding ?? const EdgeInsets.symmetric(horizontal: 20),
        itemCount: items.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = items[index];
          final isSelected = item.value == selectedValue;

          return GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              onSelected(item.value);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected
                    ? LuxuryColors.rolexGreen
                    : (isDark
                        ? IrisTheme.darkSurfaceElevated
                        : IrisTheme.lightSurfaceElevated),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected
                      ? LuxuryColors.rolexGreen
                      : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (item.icon != null) ...[
                    Transform.rotate(
                      angle: (item.iconRotation ?? 0) * 3.14159 / 180,
                      child: Icon(
                        item.icon,
                        size: 16,
                        color: isSelected
                            ? IrisTheme.darkBackground
                            : (isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary),
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    item.label,
                    style: IrisTheme.labelMedium.copyWith(
                      color: isSelected
                          ? IrisTheme.darkBackground
                          : (isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary),
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                  if (item.count != null) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? IrisTheme.darkBackground.withValues(alpha: 0.2)
                            : LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        item.count.toString(),
                        style: IrisTheme.labelSmall.copyWith(
                          color: isSelected
                              ? IrisTheme.darkBackground
                              : LuxuryColors.rolexGreen,
                          fontWeight: FontWeight.w600,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.1);
        },
      ),
    );
  }
}

/// A single filter pill item
class FilterPillItem<T> {
  final T value;
  final String label;
  final IconData? icon;
  final int? count;
  final double? iconRotation; // Rotation in degrees

  const FilterPillItem({
    required this.value,
    required this.label,
    this.icon,
    this.count,
    this.iconRotation,
  });
}

/// Pre-built filter options for common use cases
class ContactFilterOption {
  static const all = 'all';
  static const recent = 'recent';
  static const favorites = 'favorites';
  static const vip = 'vip';
}

class LeadFilterOption {
  static const all = 'all';
  static const hot = 'hot';
  static const warm = 'warm';
  static const cold = 'cold';
  static const new_ = 'new';
}

class DealFilterOption {
  static const all = 'all';
  static const active = 'active';
  static const closing = 'closing';
  static const won = 'won';
  static const lost = 'lost';
}
