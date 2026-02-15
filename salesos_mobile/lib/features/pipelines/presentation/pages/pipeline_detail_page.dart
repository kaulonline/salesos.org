import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../data/pipelines_service.dart';
import '../widgets/stage_editor.dart';

class PipelineDetailPage extends ConsumerWidget {
  final String pipelineId;

  const PipelineDetailPage({super.key, required this.pipelineId});

  String _formatDate(DateTime date) => DateFormat('MMM dd, yyyy').format(date);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(pipelineDetailProvider(pipelineId));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: asyncData.when(
          data: (pipeline) {
            if (pipeline == null) return _buildNotFound(context, isDark);
            return _buildContent(context, ref, pipeline, isDark);
          },
          loading: () => _buildLoading(context, isDark),
          error: (error, _) => _buildError(context, ref, isDark),
        ),
      ),
    );
  }

  Widget _header(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(children: [
        IconButton(onPressed: () { HapticFeedback.lightImpact(); context.pop(); },
            icon: Icon(Iconsax.arrow_left, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
        const SizedBox(width: 8),
        Expanded(child: Text('Pipeline Details', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
      ]),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildNotFound(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.hierarchy_3, size: 64, color: LuxuryColors.textMuted.withValues(alpha: 0.4)),
        const SizedBox(height: 16),
        Text('Pipeline not found', style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
      ])))]);
  }

  Widget _buildLoading(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
        IrisShimmer(width: double.infinity, height: 150, borderRadius: 20, tier: LuxuryTier.gold),
        const SizedBox(height: 16),
        IrisShimmer(width: double.infinity, height: 200, borderRadius: 16, tier: LuxuryTier.gold),
      ])))]);
  }

  Widget _buildError(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
        const SizedBox(height: 16),
        Text('Failed to load pipeline', style: TextStyle(fontSize: 16,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
        const SizedBox(height: 16),
        TextButton.icon(onPressed: () => ref.invalidate(pipelineDetailProvider(pipelineId)),
            icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
      ])))]);
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, Pipeline pipeline, bool isDark) {
    return Column(children: [
      _header(context, isDark),
      Expanded(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(pipelineDetailProvider(pipelineId)),
          color: LuxuryColors.champagneGold,
          backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Info card
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(pipeline.name, style: IrisTheme.headlineSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: (pipeline.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20)),
                      child: Text(pipeline.isActive ? 'Active' : 'Inactive',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                              color: pipeline.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray)),
                    ),
                  ]),
                  if (pipeline.description != null) ...[
                    const SizedBox(height: 8),
                    Text(pipeline.description!, style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
                  ],
                  const SizedBox(height: 12),
                  Row(children: [
                    if (pipeline.isDefault)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20)),
                        child: Text('Default', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                            color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark)),
                      ),
                    const Spacer(),
                    Text('${pipeline.stages.length} stages',
                        style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted)),
                  ]),
                ]),
              ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Stages
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(Iconsax.hierarchy_3, size: 18, color: LuxuryColors.champagneGold),
                    const SizedBox(width: 8),
                    Text('Stages', style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 16),
                  StageEditor(stages: pipeline.stages),
                ]),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Metadata
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(Iconsax.info_circle, size: 18, color: LuxuryColors.champagneGold),
                    const SizedBox(width: 8),
                    Text('Details', style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 16),
                  _row('Created', _formatDate(pipeline.createdAt), isDark),
                  const SizedBox(height: 10),
                  _row('Updated', _formatDate(pipeline.updatedAt), isDark),
                  const SizedBox(height: 10),
                  _row('Pipeline ID', pipeline.id, isDark),
                ]),
              ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.05),
            ]),
          ),
        ),
      ),
    ]);
  }

  Widget _row(String label, String value, bool isDark) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
      Flexible(child: Text(value, style: IrisTheme.bodyMedium.copyWith(
          color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          fontWeight: FontWeight.w500), textAlign: TextAlign.right, maxLines: 1, overflow: TextOverflow.ellipsis)),
    ]);
  }
}
