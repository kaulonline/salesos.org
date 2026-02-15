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
import '../../data/documents_service.dart';
import 'document_detail_page.dart';

class DocumentsPage extends ConsumerStatefulWidget {
  const DocumentsPage({super.key});

  @override
  ConsumerState<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends ConsumerState<DocumentsPage> {
  String _typeFilter = 'ALL';

  static const _filters = ['ALL', 'PDF', 'DOC', 'IMAGE', 'OTHER'];

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

  List<DocumentModel> _filterDocs(List<DocumentModel> docs) {
    if (_typeFilter == 'ALL') return docs;
    return docs.where((d) => d.typeCategory == _typeFilter).toList();
  }

  String _formatDate(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final docsAsync = ref.watch(documentsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: IrisAppBar(
        title: 'Documents',
        showBackButton: true,
        tier: LuxuryTier.gold,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          HapticFeedback.mediumImpact();
          // In a real app, this would use file_picker to upload
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Upload functionality requires file_picker')),
          );
        },
        backgroundColor: LuxuryColors.champagneGold,
        child: const Icon(Iconsax.document_upload, color: Colors.white),
      ),
      body: Column(
        children: [
          // Type filter
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filters.map((filter) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: LuxuryChip(
                      label: filter,
                      icon: filter != 'ALL' ? _typeIcon(filter) : null,
                      selected: _typeFilter == filter,
                      tier: LuxuryTier.gold,
                      onTap: () => setState(() => _typeFilter = filter),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            child: docsAsync.when(
              loading: () => const IrisListShimmer(),
              error: (err, _) => IrisEmptyState.error(
                message: 'Failed to load documents',
                onRetry: () => ref.invalidate(documentsProvider),
              ),
              data: (docs) {
                final filtered = _filterDocs(docs);

                if (filtered.isEmpty) {
                  return IrisEmptyState(
                    icon: Iconsax.document,
                    title: 'No documents',
                    subtitle: _typeFilter != 'ALL'
                        ? 'No $_typeFilter documents found.'
                        : 'Upload your first document to get started.',
                    actionLabel: 'Upload',
                    onAction: () {
                      HapticFeedback.mediumImpact();
                    },
                  );
                }

                return RefreshIndicator(
                  color: LuxuryColors.champagneGold,
                  onRefresh: () async => ref.invalidate(documentsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final doc = filtered[index];
                      final color = _typeColor(doc.typeCategory);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: LuxuryCard(
                          tier: LuxuryTier.gold,
                          padding: const EdgeInsets.all(14),
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    DocumentDetailPage(documentId: doc.id),
                              ),
                            );
                          },
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  _typeIcon(doc.typeCategory),
                                  color: color,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      doc.name,
                                      style: IrisTheme.bodyMedium.copyWith(
                                        color: isDark
                                            ? LuxuryColors.textOnDark
                                            : LuxuryColors.textOnLight,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        LuxuryBadge(
                                          text: doc.typeCategory,
                                          color: color,
                                          tier: LuxuryTier.gold,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          doc.formattedSize,
                                          style: IrisTheme.labelSmall.copyWith(
                                            color: LuxuryColors.textMuted,
                                          ),
                                        ),
                                        const Spacer(),
                                        Text(
                                          _formatDate(doc.createdAt),
                                          style: IrisTheme.labelSmall.copyWith(
                                            color: LuxuryColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(
                            delay: Duration(milliseconds: 40 * index),
                          );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
