import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'luxury_card.dart';
import '../../core/network/api_client.dart';

class EnrichButton extends ConsumerStatefulWidget {
  final String entityType;
  final String entityId;
  final VoidCallback? onEnriched;

  const EnrichButton({
    super.key,
    required this.entityType,
    required this.entityId,
    this.onEnriched,
  });

  @override
  ConsumerState<EnrichButton> createState() => _EnrichButtonState();
}

class _EnrichButtonState extends ConsumerState<EnrichButton> {
  bool _isLoading = false;

  Future<void> _enrich() async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/enrichment/${widget.entityType}s/${widget.entityId}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${widget.entityType} enriched successfully'),
            backgroundColor: LuxuryColors.rolexGreen,
          ),
        );
        widget.onEnriched?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Enrichment failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _isLoading ? null : _enrich,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.15 : 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_isLoading)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: LuxuryColors.champagneGold,
                  ),
                )
              else
                const Icon(Iconsax.magic_star, size: 14, color: LuxuryColors.champagneGold),
              const SizedBox(width: 6),
              Text(
                _isLoading ? 'Enriching...' : 'Enrich',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: LuxuryColors.champagneGold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
