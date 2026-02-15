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
import '../../data/discount_rules_service.dart';

class DiscountRuleDetailPage extends ConsumerWidget {
  final String ruleId;

  const DiscountRuleDetailPage({super.key, required this.ruleId});

  String _formatDate(DateTime date) => DateFormat('MMM dd, yyyy').format(date);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(discountRuleDetailProvider(ruleId));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: asyncData.when(
          data: (rule) {
            if (rule == null) return _buildNotFound(context, isDark);
            return _buildContent(context, ref, rule, isDark);
          },
          loading: () => _buildLoading(context, isDark),
          error: (error, _) => _buildError(context, ref, isDark),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () { HapticFeedback.lightImpact(); context.pop(); },
            icon: Icon(Iconsax.arrow_left,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text('Discount Rule', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildNotFound(BuildContext context, bool isDark) {
    return Column(children: [
      _buildHeader(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.ticket_discount, size: 64, color: LuxuryColors.textMuted.withValues(alpha: 0.4)),
        const SizedBox(height: 16),
        Text('Discount rule not found', style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
      ]))),
    ]);
  }

  Widget _buildLoading(BuildContext context, bool isDark) {
    return Column(children: [
      _buildHeader(context, isDark),
      Expanded(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
        IrisShimmer(width: double.infinity, height: 150, borderRadius: 20, tier: LuxuryTier.gold),
        const SizedBox(height: 16),
        IrisShimmer(width: double.infinity, height: 100, borderRadius: 16, tier: LuxuryTier.gold),
      ]))),
    ]);
  }

  Widget _buildError(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(children: [
      _buildHeader(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
        const SizedBox(height: 16),
        Text('Failed to load rule', style: TextStyle(fontSize: 16,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
        const SizedBox(height: 16),
        TextButton.icon(onPressed: () => ref.invalidate(discountRuleDetailProvider(ruleId)),
            icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
      ]))),
    ]);
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, DiscountRule rule, bool isDark) {
    return Column(children: [
      _buildHeader(context, isDark),
      Expanded(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(discountRuleDetailProvider(ruleId)),
          color: LuxuryColors.champagneGold,
          backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Name & value
              LuxuryCard(
                tier: LuxuryTier.gold,
                variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(rule.name, style: IrisTheme.headlineSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: (rule.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20)),
                      child: Text(rule.isActive ? 'Active' : 'Inactive',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                              color: rule.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray)),
                    ),
                  ]),
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [
                        LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        LuxuryColors.warmGold.withValues(alpha: 0.08),
                      ]),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: LuxuryColors.champagneGold.withValues(alpha: 0.3)),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('DISCOUNT VALUE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                          letterSpacing: 1.0, color: LuxuryColors.champagneGold)),
                      const SizedBox(height: 4),
                      Text(rule.valueDisplay, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700,
                          color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark)),
                      Text(rule.typeLabel, style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted)),
                    ]),
                  ),
                ]),
              ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Configuration
              LuxuryCard(
                tier: LuxuryTier.gold,
                variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(Iconsax.setting_2, size: 18, color: LuxuryColors.champagneGold),
                    const SizedBox(width: 8),
                    Text('Configuration', style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 16),
                  _row('Type', rule.typeLabel, isDark),
                  const SizedBox(height: 10),
                  _row('Priority', '${rule.priority}', isDark),
                  if (rule.code != null) ...[
                    const SizedBox(height: 10), _row('Promo Code', rule.code!, isDark)],
                  if (rule.minQuantity != null) ...[
                    const SizedBox(height: 10), _row('Min Quantity', '${rule.minQuantity}', isDark)],
                  if (rule.maxQuantity != null) ...[
                    const SizedBox(height: 10), _row('Max Quantity', '${rule.maxQuantity}', isDark)],
                  if (rule.maxUses != null) ...[
                    const SizedBox(height: 10), _row('Usage', '${rule.currentUses} / ${rule.maxUses}', isDark)],
                  if (rule.validFrom != null) ...[
                    const SizedBox(height: 10), _row('Valid From', _formatDate(rule.validFrom!), isDark)],
                  if (rule.validTo != null) ...[
                    const SizedBox(height: 10), _row('Valid To', _formatDate(rule.validTo!), isDark)],
                ]),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Metadata
              LuxuryCard(
                tier: LuxuryTier.gold,
                variant: LuxuryCardVariant.standard,
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
                  _row('Created', _formatDate(rule.createdAt), isDark),
                  const SizedBox(height: 10),
                  _row('Rule ID', rule.id, isDark),
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
