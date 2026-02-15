import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_app_bar.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../data/documents_service.dart';

class DocumentDetailPage extends ConsumerWidget {
  final String documentId;

  const DocumentDetailPage({super.key, required this.documentId});

  IconData _typeIcon(String category) {
    switch (category.toUpperCase()) {
      case 'PDF':
        return Iconsax.document_text;
      case 'DOC':
        return Iconsax.document;
      case 'IMAGE':
        return Iconsax.image;
      case 'SHEET':
        return Iconsax.document_code;
      default:
        return Iconsax.document_1;
    }
  }

  Color _typeColor(String category) {
    switch (category.toUpperCase()) {
      case 'PDF':
        return LuxuryColors.errorRuby;
      case 'DOC':
        return LuxuryColors.infoCobalt;
      case 'IMAGE':
        return LuxuryColors.rolexGreen;
      case 'SHEET':
        return LuxuryColors.successGreen;
      default:
        return LuxuryColors.textMuted;
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.month}/${dt.day}/${dt.year} at ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(documentDetailProvider(documentId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Document Details',
        showBackButton: true,
        tier: LuxuryTier.gold,
        actions: [
          IrisAppBarAction(
            icon: Iconsax.share,
            tooltip: 'Share',
            onPressed: () {
              HapticFeedback.lightImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Share functionality')),
              );
            },
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const IrisDashboardShimmer(),
        error: (err, _) => IrisEmptyState.error(
          message: 'Failed to load document',
          onRetry: () => ref.invalidate(documentDetailProvider(documentId)),
        ),
        data: (doc) {
          if (doc == null) {
            return IrisEmptyState(
              icon: Iconsax.document,
              title: 'Document not found',
              subtitle: 'This document may have been removed.',
            );
          }

          final color = _typeColor(doc.typeCategory);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Document header
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  variant: LuxuryCardVariant.accent,
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(
                          _typeIcon(doc.typeCategory),
                          color: color,
                          size: 36,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        doc.name,
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          LuxuryBadge(
                            text: doc.typeCategory,
                            color: color,
                            tier: LuxuryTier.gold,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            doc.formattedSize,
                            style: IrisTheme.bodySmall.copyWith(
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1),
                const SizedBox(height: 20),

                // Document preview placeholder
                if (doc.typeCategory == 'IMAGE' && doc.url != null) ...[
                  LuxuryCard(
                    tier: LuxuryTier.gold,
                    padding: EdgeInsets.zero,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        doc.url!,
                        height: 200,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          height: 200,
                          color: color.withValues(alpha: 0.08),
                          child: Center(
                            child: Icon(
                              Iconsax.image,
                              size: 48,
                              color: color.withValues(alpha: 0.4),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1),
                  const SizedBox(height: 20),
                ],

                // Info section
                LuxurySectionHeader(
                  title: 'Information',
                  tier: LuxuryTier.gold,
                ),
                const SizedBox(height: 12),
                LuxuryCard(
                  tier: LuxuryTier.gold,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _InfoRow(label: 'Type', value: doc.type),
                      const LuxuryDivider(),
                      _InfoRow(label: 'Size', value: doc.formattedSize),
                      const LuxuryDivider(),
                      _InfoRow(
                        label: 'Uploaded',
                        value: _formatDate(doc.createdAt),
                      ),
                      if (doc.createdBy != null) ...[
                        const LuxuryDivider(),
                        _InfoRow(label: 'Uploaded By', value: doc.createdBy!),
                      ],
                      if (doc.entityType != null) ...[
                        const LuxuryDivider(),
                        _InfoRow(
                          label: 'Linked To',
                          value: '${doc.entityType} ${doc.entityId ?? ''}',
                        ),
                      ],
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                const SizedBox(height: 24),

                // Actions
                Row(
                  children: [
                    Expanded(
                      child: IrisButton(
                        label: 'Share',
                        onPressed: () {
                          HapticFeedback.lightImpact();
                        },
                        variant: IrisButtonVariant.secondary,
                        icon: Iconsax.share,
                        isFullWidth: true,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: IrisButton(
                        label: 'Delete',
                        onPressed: () async {
                          final confirmed = await IrisDeleteConfirmation.show(
                            context: context,
                            title: 'Delete Document',
                            message:
                                'Are you sure you want to delete "${doc.name}"?',
                          );
                          if (confirmed) {
                            final service = ref.read(documentsServiceProvider);
                            final success = await service.delete(doc.id);
                            if (success && context.mounted) {
                              ref.invalidate(documentsProvider);
                              Navigator.of(context).pop();
                            }
                          }
                        },
                        variant: IrisButtonVariant.danger,
                        icon: Iconsax.trash,
                        isFullWidth: true,
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 250.ms).slideY(begin: 0.1),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: IrisTheme.bodySmall.copyWith(
              color: LuxuryColors.textMuted,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? LuxuryColors.textOnDark
                    : LuxuryColors.textOnLight,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}
