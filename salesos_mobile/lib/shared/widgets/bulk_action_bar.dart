import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'luxury_card.dart';

class BulkAction {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final Color? color;

  const BulkAction({
    required this.label,
    required this.icon,
    required this.onPressed,
    this.color,
  });
}

class BulkActionBar extends StatelessWidget {
  final int selectedCount;
  final List<BulkAction> actions;
  final VoidCallback onClearSelection;

  const BulkActionBar({
    super.key,
    required this.selectedCount,
    required this.actions,
    required this.onClearSelection,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Positioned(
      bottom: 100,
      left: 16,
      right: 16,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : LuxuryColors.richBlack,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            // Selection count
            GestureDetector(
              onTap: onClearSelection,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$selectedCount',
                      style: const TextStyle(
                        color: LuxuryColors.champagneGold,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Iconsax.close_circle,
                      size: 16,
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.7),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Action buttons
            Expanded(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: actions.map((action) {
                  return Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: action.onPressed,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: (action.color ?? Colors.white).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(action.icon, size: 16, color: action.color ?? Colors.white),
                              const SizedBox(width: 6),
                              Text(
                                action.label,
                                style: TextStyle(
                                  color: action.color ?? Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ).animate().slideY(begin: 1.0, duration: 250.ms, curve: Curves.easeOutCubic).fadeIn(),
    );
  }
}
