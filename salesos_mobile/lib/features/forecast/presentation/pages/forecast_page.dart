import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../data/forecast_service.dart';
import '../widgets/forecast_chart.dart';
import '../widgets/forecast_summary_card.dart';

class ForecastPage extends ConsumerStatefulWidget {
  const ForecastPage({super.key});

  @override
  ConsumerState<ForecastPage> createState() => _ForecastPageState();
}

class _ForecastPageState extends ConsumerState<ForecastPage> {
  Future<void> _onRefresh() async {
    ref.invalidate(forecastProvider);
    ref.invalidate(repForecastsProvider);
  }

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(0)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedPeriod = ref.watch(selectedForecastPeriodProvider);
    final forecastAsync = ref.watch(forecastProvider);
    final repForecastsAsync = ref.watch(repForecastsProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Forecast',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Revenue forecast and projections',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Period selector
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ForecastPeriod.values.map((period) {
                    final isSelected = period == selectedPeriod;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: LuxuryChip(
                        label: period.label,
                        selected: isSelected,
                        onTap: () {
                          HapticFeedback.lightImpact();
                          ref.read(selectedForecastPeriodProvider.notifier).select(period);
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Content
            Expanded(
              child: forecastAsync.when(
                data: (forecast) => RefreshIndicator(
                  onRefresh: _onRefresh,
                  color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                  backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      // Summary cards row 1
                      Row(
                        children: [
                          Expanded(
                            child: ForecastSummaryCard(
                              label: 'Quota',
                              value: forecast.quota ?? forecast.target,
                              icon: Iconsax.flag,
                              color: LuxuryColors.champagneGold,
                              delayMs: 100,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ForecastSummaryCard(
                              label: 'Closed',
                              value: forecast.closed,
                              target: forecast.quota ?? forecast.target,
                              icon: Iconsax.tick_circle,
                              color: LuxuryColors.rolexGreen,
                              delayMs: 150,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Summary cards row 2
                      Row(
                        children: [
                          Expanded(
                            child: ForecastSummaryCard(
                              label: 'Committed',
                              value: forecast.committed,
                              target: forecast.quota ?? forecast.target,
                              icon: Iconsax.shield_tick,
                              color: LuxuryColors.infoCobalt,
                              delayMs: 200,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ForecastSummaryCard(
                              label: 'Best Case',
                              value: forecast.bestCase,
                              target: forecast.quota ?? forecast.target,
                              icon: Iconsax.star,
                              color: LuxuryColors.jadePremium,
                              delayMs: 250,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Pipeline card
                      ForecastSummaryCard(
                        label: 'Pipeline',
                        value: forecast.pipeline,
                        icon: Iconsax.chart_1,
                        color: LuxuryColors.warmGray,
                        delayMs: 300,
                      ),
                      const SizedBox(height: 20),

                      // Chart
                      ForecastChart(forecast: forecast),
                      const SizedBox(height: 20),

                      // Rep breakdown
                      _RepBreakdownSection(
                        repForecastsAsync: repForecastsAsync,
                        isDark: isDark,
                        formatAmount: _formatAmount,
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
                loading: () => _buildLoading(),
                error: (_, _) => Center(
                  child: IrisEmptyState(
                    icon: Iconsax.chart_fail,
                    title: 'Unable to load forecast',
                    subtitle: 'Pull down to try again',
                    actionLabel: 'Retry',
                    onAction: _onRefresh,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: const [
              Expanded(child: IrisShimmer(width: double.infinity, height: 100)),
              SizedBox(width: 12),
              Expanded(child: IrisShimmer(width: double.infinity, height: 100)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: const [
              Expanded(child: IrisShimmer(width: double.infinity, height: 100)),
              SizedBox(width: 12),
              Expanded(child: IrisShimmer(width: double.infinity, height: 100)),
            ],
          ),
          const SizedBox(height: 20),
          const IrisShimmer(width: double.infinity, height: 260),
        ],
      ),
    );
  }
}

class _RepBreakdownSection extends StatelessWidget {
  final AsyncValue<List<ForecastModel>> repForecastsAsync;
  final bool isDark;
  final String Function(double) formatAmount;

  const _RepBreakdownSection({
    required this.repForecastsAsync,
    required this.isDark,
    required this.formatAmount,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LuxurySectionHeader(
          title: 'Rep Breakdown',
          subtitle: 'Individual rep forecasts',
        ),
        const SizedBox(height: 12),
        repForecastsAsync.when(
          data: (reps) {
            if (reps.isEmpty) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    'No rep forecast data available',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary,
                    ),
                  ),
                ),
              );
            }
            return Column(
              children: reps.asMap().entries.map((entry) {
                final rep = entry.value;
                return LuxuryCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      LuxuryAvatar(
                        initials: rep.ownerName != null && rep.ownerName!.isNotEmpty
                            ? rep.ownerName!.substring(0, 1).toUpperCase()
                            : '?',
                        size: 40,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              rep.ownerName ?? 'Unknown Rep',
                              style: IrisTheme.titleSmall.copyWith(
                                color: isDark
                                    ? IrisTheme.darkTextPrimary
                                    : IrisTheme.lightTextPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            LuxuryProgress(
                              value: rep.attainmentPct / 100,
                              height: 4,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            formatAmount(rep.closed),
                            style: IrisTheme.titleSmall.copyWith(
                              color: LuxuryColors.rolexGreen,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '${rep.attainmentPct.toStringAsFixed(0)}%',
                            style: IrisTheme.caption.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextTertiary
                                  : IrisTheme.lightTextTertiary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ).animate(delay: (entry.key * 80).ms).fadeIn().slideX(begin: 0.05);
              }).toList(),
            );
          },
          loading: () => Column(
            children: List.generate(3, (_) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: IrisShimmer(width: double.infinity, height: 68),
            )),
          ),
          error: (_, _) => const SizedBox.shrink(),
        ),
      ],
    );
  }
}
