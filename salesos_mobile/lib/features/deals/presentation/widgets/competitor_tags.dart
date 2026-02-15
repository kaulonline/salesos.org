import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Competitor tracking chips widget for deal detail pages
class CompetitorTags extends StatefulWidget {
  final List<String> competitors;
  final ValueChanged<List<String>>? onChanged;
  final bool readOnly;

  const CompetitorTags({
    super.key,
    required this.competitors,
    this.onChanged,
    this.readOnly = false,
  });

  @override
  State<CompetitorTags> createState() => _CompetitorTagsState();
}

class _CompetitorTagsState extends State<CompetitorTags> {
  late List<String> _competitors;

  @override
  void initState() {
    super.initState();
    _competitors = List.from(widget.competitors);
  }

  @override
  void didUpdateWidget(CompetitorTags oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.competitors != widget.competitors) {
      _competitors = List.from(widget.competitors);
    }
  }

  void _addCompetitor(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    if (_competitors.any((c) => c.toLowerCase() == trimmed.toLowerCase())) {
      return;
    }
    setState(() {
      _competitors.add(trimmed);
    });
    widget.onChanged?.call(List.from(_competitors));
  }

  void _removeCompetitor(String name) {
    setState(() {
      _competitors.remove(name);
    });
    widget.onChanged?.call(List.from(_competitors));
  }

  void _showAddDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final controller = TextEditingController();

    HapticFeedback.lightImpact();
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Add Competitor',
          style: TextStyle(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
          decoration: InputDecoration(
            hintText: 'Competitor name',
            hintStyle: TextStyle(color: LuxuryColors.textMuted),
            prefixIcon: const Icon(Iconsax.buildings, size: 18),
          ),
          onSubmitted: (value) {
            if (value.trim().isNotEmpty) {
              _addCompetitor(value);
              Navigator.of(dialogContext).pop();
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isDark
                    ? LuxuryColors.textOnDark.withValues(alpha: 0.6)
                    : LuxuryColors.textOnLight.withValues(alpha: 0.6),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                _addCompetitor(controller.text);
                Navigator.of(dialogContext).pop();
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: LuxuryColors.champagneGold,
              foregroundColor: LuxuryColors.richBlack,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Icon(
              Iconsax.flag,
              size: 16,
              color: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
            ),
            const SizedBox(width: 6),
            Text(
              'Competitors',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
                letterSpacing: 0.5,
              ),
            ),
            if (_competitors.isNotEmpty) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${_competitors.length}',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: LuxuryColors.champagneGold,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 10),

        // Chips wrap
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            // Competitor chips
            ..._competitors.asMap().entries.map((entry) {
              final index = entry.key;
              final name = entry.value;
              return _buildCompetitorChip(name, isDark, index);
            }),

            // Add button
            if (!widget.readOnly)
              GestureDetector(
                onTap: _showAddDialog,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.15)
                          : Colors.black.withValues(alpha: 0.1),
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.add,
                        size: 14,
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Add',
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextSecondary
                              : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),

        // Empty state
        if (_competitors.isEmpty) ...[
          const SizedBox(height: 4),
          Text(
            'No competitors tracked',
            style: IrisTheme.caption.copyWith(
              color: isDark
                  ? IrisTheme.darkTextTertiary
                  : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCompetitorChip(String name, bool isDark, int index) {
    // Assign a deterministic color from a palette based on the name
    final colorPalette = [
      LuxuryColors.errorRuby,
      LuxuryColors.infoCobalt,
      LuxuryColors.socialPurple,
      LuxuryColors.warningAmber,
      LuxuryColors.webinarPink,
      LuxuryColors.rolexGreen,
    ];
    final chipColor = colorPalette[name.hashCode.abs() % colorPalette.length];

    return GestureDetector(
      onTap: widget.readOnly
          ? null
          : () {
              HapticFeedback.lightImpact();
              _showRemoveConfirmation(name);
            },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: chipColor.withValues(alpha: isDark ? 0.15 : 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: chipColor.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: chipColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              name,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
              ),
            ),
            if (!widget.readOnly) ...[
              const SizedBox(width: 6),
              Icon(
                Iconsax.close_circle,
                size: 14,
                color: chipColor.withValues(alpha: 0.7),
              ),
            ],
          ],
        ),
      ),
    ).animate(delay: (30 * index).ms).fadeIn().scale(
          begin: const Offset(0.9, 0.9),
          duration: 200.ms,
        );
  }

  void _showRemoveConfirmation(String name) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Remove Competitor',
          style: TextStyle(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          'Remove "$name" from competitors?',
          style: TextStyle(
            color: isDark
                ? LuxuryColors.textOnDark.withValues(alpha: 0.7)
                : LuxuryColors.textOnLight.withValues(alpha: 0.7),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              _removeCompetitor(name);
              Navigator.of(dialogContext).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: LuxuryColors.errorRuby,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }
}
