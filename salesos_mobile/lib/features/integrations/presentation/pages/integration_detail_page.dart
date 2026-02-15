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
import '../../data/integrations_service.dart';

class IntegrationDetailPage extends ConsumerWidget {
  final String integrationId;

  const IntegrationDetailPage({super.key, required this.integrationId});

  String _formatDate(DateTime date) => DateFormat('MMM dd, yyyy HH:mm').format(date);

  Color _statusColor(ConnectionStatus status) {
    switch (status) {
      case ConnectionStatus.ACTIVE: return LuxuryColors.successGreen;
      case ConnectionStatus.INACTIVE: return LuxuryColors.warmGray;
      case ConnectionStatus.EXPIRED: return LuxuryColors.warningAmber;
      case ConnectionStatus.ERROR: return LuxuryColors.errorRuby;
      case ConnectionStatus.SYNCING: return LuxuryColors.infoCobalt;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final asyncData = ref.watch(integrationDetailProvider(integrationId));

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: asyncData.when(
          data: (integration) {
            if (integration == null) return _buildNotFound(context, isDark);
            return _buildContent(context, ref, integration, isDark);
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
        Expanded(child: Text('Integration', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight))),
      ]),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildNotFound(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.link, size: 64, color: LuxuryColors.textMuted.withValues(alpha: 0.4)),
        const SizedBox(height: 16),
        Text('Integration not found', style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
      ])))]);
  }

  Widget _buildLoading(BuildContext context, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
        IrisShimmer(width: double.infinity, height: 200, borderRadius: 20, tier: LuxuryTier.gold),
        const SizedBox(height: 16),
        IrisShimmer(width: double.infinity, height: 100, borderRadius: 16, tier: LuxuryTier.gold),
      ])))]);
  }

  Widget _buildError(BuildContext context, WidgetRef ref, bool isDark) {
    return Column(children: [_header(context, isDark),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
        const SizedBox(height: 16),
        Text('Failed to load integration', style: TextStyle(fontSize: 16,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
        const SizedBox(height: 16),
        TextButton.icon(onPressed: () => ref.invalidate(integrationDetailProvider(integrationId)),
            icon: const Icon(Iconsax.refresh), label: const Text('Retry')),
      ])))]);
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, Integration integration, bool isDark) {
    final sColor = _statusColor(integration.status);

    return Column(children: [
      _header(context, isDark),
      Expanded(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(integrationDetailProvider(integrationId)),
          color: LuxuryColors.champagneGold,
          backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Info card
              LuxuryCard(
                tier: LuxuryTier.gold, variant: LuxuryCardVariant.standard,
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: (integration.isConnected ? LuxuryColors.rolexGreen : LuxuryColors.champagneGold)
                          .withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Iconsax.link, size: 40,
                        color: integration.isConnected ? LuxuryColors.rolexGreen
                            : isDark ? LuxuryColors.champagneGold : LuxuryColors.champagneGoldDark),
                  ),
                  const SizedBox(height: 16),
                  Text(integration.name, style: IrisTheme.headlineSmall.copyWith(
                      color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight)),
                  const SizedBox(height: 4),
                  Text(integration.categoryLabel,
                      style: IrisTheme.bodyMedium.copyWith(color: LuxuryColors.textMuted)),
                  if (integration.description != null) ...[
                    const SizedBox(height: 8),
                    Text(integration.description!, textAlign: TextAlign.center,
                        style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted)),
                  ],
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: sColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Container(width: 8, height: 8, decoration: BoxDecoration(color: sColor, shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text(integration.statusLabel,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: sColor)),
                    ]),
                  ),
                  const SizedBox(height: 20),
                  // Connect/Disconnect button
                  if (integration.isAvailable)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          HapticFeedback.mediumImpact();
                          final service = ref.read(integrationsServiceProvider);
                          if (integration.isConnected) {
                            await service.disconnect(integration.id);
                          } else {
                            await service.connect(integration.id);
                          }
                          ref.invalidate(integrationDetailProvider(integrationId));
                          ref.invalidate(integrationsProvider);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: integration.isConnected
                              ? LuxuryColors.errorRuby.withValues(alpha: 0.1)
                              : LuxuryColors.rolexGreen,
                          foregroundColor: integration.isConnected
                              ? LuxuryColors.errorRuby
                              : Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        child: Text(integration.isConnected ? 'Disconnect' : 'Connect',
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                ]),
              ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.05),

              const SizedBox(height: 16),

              // Details
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
                  _row('Category', integration.categoryLabel, isDark),
                  const SizedBox(height: 10),
                  _row('Available', integration.isAvailable ? 'Yes' : 'Coming Soon', isDark),
                  if (integration.lastSyncAt != null) ...[
                    const SizedBox(height: 10),
                    _row('Last Sync', _formatDate(integration.lastSyncAt!), isDark),
                  ],
                  const SizedBox(height: 10),
                  _row('Integration ID', integration.id, isDark),
                ]),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.05),
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
