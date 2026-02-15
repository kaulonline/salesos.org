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
import '../../data/price_books_service.dart';

class PriceBookDetailPage extends ConsumerWidget {
  final String priceBookId;

  const PriceBookDetailPage({super.key, required this.priceBookId});

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return formatter.format(value);
  }

  String _formatDate(DateTime date) {
    return DateFormat('MMM dd, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(priceBookDetailProvider(priceBookId));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: asyncData.when(
          data: (priceBook) {
            if (priceBook == null) return _buildNotFound(context, isDark);
            return _buildContent(context, ref, priceBook, isDark);
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
            onPressed: () {
              HapticFeedback.lightImpact();
              context.pop();
            },
            icon: Icon(Iconsax.arrow_left,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Price Book Details',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildNotFound(BuildContext context, bool isDark) {
    return Column(
      children: [
        _buildHeader(context, isDark),
        Expanded(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Iconsax.book, size: 64, color: LuxuryColors.textMuted.withValues(alpha: 0.4)),
                const SizedBox(height: 16),
                Text('Price book not found',
                    style: IrisTheme.titleMedium.copyWith(color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLoading(BuildContext context, bool isDark) {
    return Column(
      children: [
        _buildHeader(context, isDark),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                IrisShimmer(width: double.infinity, height: 150, borderRadius: 20, tier: LuxuryTier.gold),
                const SizedBox(height: 16),
                IrisShimmer(width: double.infinity, height: 100, borderRadius: 16, tier: LuxuryTier.gold),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildError(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(
      children: [
        _buildHeader(context, isDark),
        Expanded(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                const SizedBox(height: 16),
                Text('Failed to load price book',
                    style: TextStyle(fontSize: 16, color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                const SizedBox(height: 16),
                TextButton.icon(
                    onPressed: () => ref.invalidate(priceBookDetailProvider(priceBookId)),
                    icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, PriceBook priceBook, bool isDark) {
    return Column(
      children: [
        _buildHeader(context, isDark),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => ref.invalidate(priceBookDetailProvider(priceBookId)),
            color: LuxuryColors.champagneGold,
            backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name & Status
                  LuxuryCard(
                    tier: LuxuryTier.gold,
                    variant: LuxuryCardVariant.standard,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(priceBook.name,
                                  style: IrisTheme.headlineSmall.copyWith(
                                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: priceBook.isActive
                                    ? LuxuryColors.successGreen.withValues(alpha: 0.12)
                                    : LuxuryColors.warmGray.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                priceBook.isActive ? 'Active' : 'Inactive',
                                style: TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w600,
                                    color: priceBook.isActive ? LuxuryColors.successGreen : LuxuryColors.warmGray),
                              ),
                            ),
                          ],
                        ),
                        if (priceBook.description != null) ...[
                          const SizedBox(height: 8),
                          Text(priceBook.description!,
                              style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
                        ],
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (priceBook.isStandard)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text('Standard', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                                    color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark)),
                              ),
                            if (priceBook.currency != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: LuxuryColors.infoCobalt.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(priceBook.currency!, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: LuxuryColors.infoCobalt)),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.05),

                  const SizedBox(height: 16),

                  // Entries
                  LuxuryCard(
                    tier: LuxuryTier.gold,
                    variant: LuxuryCardVariant.standard,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Iconsax.document_text, size: 18, color: LuxuryColors.champagneGold),
                            const SizedBox(width: 8),
                            Text('Entries (${priceBook.entries.length})',
                                style: IrisTheme.titleSmall.copyWith(
                                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (priceBook.entries.isEmpty)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Text('No entries yet',
                                  style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
                            ),
                          )
                        else
                          ...priceBook.entries.asMap().entries.map((entry) {
                            final e = entry.value;
                            final isLast = entry.key == priceBook.entries.length - 1;
                            return Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                border: isLast ? null : Border(
                                  bottom: BorderSide(
                                    color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.grey.withValues(alpha: 0.1),
                                  ),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(e.productName ?? 'Product',
                                            style: IrisTheme.bodyMedium.copyWith(
                                                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                                fontWeight: FontWeight.w500)),
                                        if (e.minimumQuantity != null || e.maximumQuantity != null)
                                          Text(
                                            'Qty: ${e.minimumQuantity ?? 1}${e.maximumQuantity != null ? ' - ${e.maximumQuantity}' : '+'}',
                                            style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(_formatCurrency(e.unitPrice ?? e.listPrice),
                                          style: IrisTheme.titleSmall.copyWith(
                                              color: isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark,
                                              fontWeight: FontWeight.w600)),
                                      if (e.unitPrice != null && e.unitPrice != e.listPrice)
                                        Text('List: ${_formatCurrency(e.listPrice)}',
                                            style: IrisTheme.bodySmall.copyWith(
                                                color: LuxuryColors.textMuted,
                                                decoration: TextDecoration.lineThrough)),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),

                  const SizedBox(height: 16),

                  // Metadata
                  LuxuryCard(
                    tier: LuxuryTier.gold,
                    variant: LuxuryCardVariant.standard,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Iconsax.info_circle, size: 18, color: LuxuryColors.champagneGold),
                            const SizedBox(width: 8),
                            Text('Details', style: IrisTheme.titleSmall.copyWith(
                                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (priceBook.validFrom != null)
                          _detailRow('Valid From', _formatDate(priceBook.validFrom!), isDark),
                        if (priceBook.validTo != null) ...[
                          const SizedBox(height: 10),
                          _detailRow('Valid To', _formatDate(priceBook.validTo!), isDark),
                        ],
                        const SizedBox(height: 10),
                        _detailRow('Created', _formatDate(priceBook.createdAt), isDark),
                        const SizedBox(height: 10),
                        _detailRow('Updated', _formatDate(priceBook.updatedAt), isDark),
                      ],
                    ),
                  ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.05),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _detailRow(String label, String value, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
        Text(value, style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
