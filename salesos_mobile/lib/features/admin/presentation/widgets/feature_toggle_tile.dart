import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/admin_service.dart';

class FeatureToggleTile extends ConsumerStatefulWidget {
  final AdminFeatureFlag feature;

  const FeatureToggleTile({
    super.key,
    required this.feature,
  });

  @override
  ConsumerState<FeatureToggleTile> createState() => _FeatureToggleTileState();
}

class _FeatureToggleTileState extends ConsumerState<FeatureToggleTile> {
  late bool _enabled;
  bool _isToggling = false;

  @override
  void initState() {
    super.initState();
    _enabled = widget.feature.enabled;
  }

  @override
  void didUpdateWidget(covariant FeatureToggleTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.feature.enabled != widget.feature.enabled) {
      _enabled = widget.feature.enabled;
    }
  }

  Future<void> _toggle(bool value) async {
    setState(() {
      _isToggling = true;
      _enabled = value;
    });

    HapticFeedback.lightImpact();

    final service = ref.read(adminServiceProvider);
    final success = await service.toggleFeature(widget.feature.key, value);

    if (!success && mounted) {
      setState(() => _enabled = !value);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to toggle feature')),
      );
    }

    if (mounted) {
      setState(() => _isToggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return LuxuryCard(
      tier: LuxuryTier.gold,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: (_enabled
                      ? LuxuryColors.successGreen
                      : LuxuryColors.textMuted)
                  .withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _enabled ? Iconsax.toggle_on_circle : Iconsax.toggle_off_circle,
              size: 20,
              color:
                  _enabled ? LuxuryColors.successGreen : LuxuryColors.textMuted,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.feature.name,
                  style: IrisTheme.bodyMedium.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (widget.feature.description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    widget.feature.description!,
                    style: IrisTheme.bodySmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          _isToggling
              ? SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: LuxuryColors.champagneGold,
                  ),
                )
              : Switch.adaptive(
                  value: _enabled,
                  activeThumbColor: LuxuryColors.successGreen,
                  onChanged: _toggle,
                ),
        ],
      ),
    );
  }
}
