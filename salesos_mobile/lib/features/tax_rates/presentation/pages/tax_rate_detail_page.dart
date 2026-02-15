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
import '../../data/tax_rates_service.dart';

class TaxRateDetailPage extends ConsumerWidget {
  final String taxRateId;

  const TaxRateDetailPage({super.key, required this.taxRateId});

  String _formatDate(DateTime date) => DateFormat('MMM dd, yyyy').format(date);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(taxRateDetailProvider(taxRateId));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: asyncData.when(
          data: (rate) {
            if (rate == null) return _buildNotFound(context, isDark);
            return _buildContent(context, ref, rate, isDark);
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
        Expanded(child: Text('Tax Rate Details', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
      ]),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildNotFound(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.receipt_2, size: 64, color: LuxuryColors.textMuted.withValues(alpha: 0.4)),
        const SizedBox(height: 16),
        Text('Tax rate not found', style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
      ])))]);
  }

  Widget _buildLoading(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
        IrisShimmer(width: double.infinity, height: 150, borderRadius: 20, tier: LuxuryTier.gold),
        const SizedBox(height: 16),
        IrisShimmer(width: double.infinity, height: 100, borderRadius: 16, tier: LuxuryTier.gold),
      ])))]);
  }

  Widget _buildError(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
        const SizedBox(height: 16),
        Text('Failed to load tax rate', style: TextStyle(fontSize: 16,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
        const SizedBox(height: 16),
        TextButton.icon(onPressed: () => ref.invalidate(taxRateDetailProvider(taxRateId)),
            icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
      ])))]);
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, TaxRate rate, bool isDark) {
    return Column(children: [
      _header(context, isDark),
      Expanded(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(taxRateDetailProvider(taxRateId)),
          color: LuxuryColors.champagneGold,
          backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Name & rate
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(rate.name, style: IrisTheme.headlineSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: (rate.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20)),
                      child: Text(rate.isActive ? 'Active' : 'Inactive',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                              color: rate.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray)),
                    ),
                  ]),
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity, padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [
                        LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        LuxuryColors.warmGold.withValues(alpha: 0.08),
                      ]),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: LuxuryColors.champagneGold.withValues(alpha: 0.3)),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('TAX RATE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                          letterSpacing: 1.0, color: LuxuryColors.champagneGold)),
                      const SizedBox(height: 4),
                      Text(rate.rateDisplay, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700,
                          color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark)),
                      Text(rate.typeLabel, style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted)),
                    ]),
                  ),
                  if (rate.description != null) ...[
                    const SizedBox(height: 12),
                    Text(rate.description!, style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
                  ],
                ]),
              ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Location
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(Iconsax.location, size: 18, color: LuxuryColors.champagneGold),
                    const SizedBox(width: 8),
                    Text('Location', style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 16),
                  _row('Country', rate.country ?? 'All', isDark),
                  if (rate.region != null) ...[const SizedBox(height: 10), _row('Region', rate.region!, isDark)],
                  if (rate.city != null) ...[const SizedBox(height: 10), _row('City', rate.city!, isDark)],
                  if (rate.postalCode != null) ...[const SizedBox(height: 10), _row('Postal Code', rate.postalCode!, isDark)],
                ]),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Settings
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Icon(Iconsax.setting_2, size: 18, color: LuxuryColors.champagneGold),
                    const SizedBox(width: 8),
                    Text('Settings', style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                        fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 16),
                  _row('Default', rate.isDefault ? 'Yes' : 'No', isDark),
                  const SizedBox(height: 10),
                  _row('Compound', rate.isCompound ? 'Yes' : 'No', isDark),
                  const SizedBox(height: 10),
                  _row('Priority', '${rate.priority}', isDark),
                  if (rate.effectiveFrom != null) ...[const SizedBox(height: 10), _row('Effective', _formatDate(rate.effectiveFrom!), isDark)],
                  if (rate.effectiveTo != null) ...[const SizedBox(height: 10), _row('Expires', _formatDate(rate.effectiveTo!), isDark)],
                  const SizedBox(height: 10),
                  _row('Created', _formatDate(rate.createdAt), isDark),
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
