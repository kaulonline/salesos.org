import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_mode_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../widgets/win_loss_chart.dart';

/// Win/Loss data model
class WinLossData {
  final int wins;
  final int losses;
  final double winRate;
  final List<LossReason> lossReasons;

  const WinLossData({
    required this.wins,
    required this.losses,
    required this.winRate,
    required this.lossReasons,
  });

  factory WinLossData.fromJson(Map<String, dynamic> json) {
    final reasons = (json['lossReasons'] as List?)
            ?.map((r) => LossReason.fromJson(r as Map<String, dynamic>))
            .toList() ??
        [];
    return WinLossData(
      wins: (json['wins'] as num?)?.toInt() ?? 0,
      losses: (json['losses'] as num?)?.toInt() ?? 0,
      winRate: (json['winRate'] as num?)?.toDouble() ?? 0,
      lossReasons: reasons,
    );
  }
}

class LossReason {
  final String reason;
  final int count;
  final double percentage;

  const LossReason({
    required this.reason,
    required this.count,
    required this.percentage,
  });

  factory LossReason.fromJson(Map<String, dynamic> json) {
    return LossReason(
      reason: json['reason'] as String? ?? 'Unknown',
      count: (json['count'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Period for win/loss analysis
enum WinLossPeriod {
  thisMonth('This Month', 'this_month'),
  thisQuarter('This Quarter', 'this_quarter'),
  thisYear('This Year', 'this_year'),
  allTime('All Time', 'all_time');

  final String label;
  final String value;
  const WinLossPeriod(this.label, this.value);
}

/// Selected period notifier
class WinLossPeriodNotifier extends Notifier<WinLossPeriod> {
  @override
  WinLossPeriod build() => WinLossPeriod.thisQuarter;

  void select(WinLossPeriod period) => state = period;
}

/// Selected period provider
final winLossPeriodProvider =
    NotifierProvider<WinLossPeriodNotifier, WinLossPeriod>(
  WinLossPeriodNotifier.new,
);

/// Win/loss data provider
final winLossDataProvider = FutureProvider.autoDispose<WinLossData>((ref) async {
  ref.watch(authModeProvider);
  final api = ref.watch(apiClientProvider);
  final period = ref.watch(winLossPeriodProvider);

  try {
    final response = await api.get(
      '/reports/win-rate',
      queryParameters: {'period': period.value},
    );
    final data = response.data;
    if (data is Map<String, dynamic>) {
      return WinLossData.fromJson(data);
    }
  } catch (_) {
    // Fall back to empty
  }

  return const WinLossData(
    wins: 0,
    losses: 0,
    winRate: 0,
    lossReasons: [],
  );
});

class WinLossPage extends ConsumerStatefulWidget {
  const WinLossPage({super.key});

  @override
  ConsumerState<WinLossPage> createState() => _WinLossPageState();
}

class _WinLossPageState extends ConsumerState<WinLossPage> {
  Future<void> _onRefresh() async {
    ref.invalidate(winLossDataProvider);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedPeriod = ref.watch(winLossPeriodProvider);
    final dataAsync = ref.watch(winLossDataProvider);

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
                          'Win/Loss Analysis',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Understand your wins and losses',
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
                  children: WinLossPeriod.values.map((period) {
                    final isSelected = period == selectedPeriod;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: LuxuryChip(
                        label: period.label,
                        selected: isSelected,
                        onTap: () {
                          HapticFeedback.lightImpact();
                          ref.read(winLossPeriodProvider.notifier).select(period);
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
              child: dataAsync.when(
                data: (data) => RefreshIndicator(
                  onRefresh: _onRefresh,
                  color: isDark ? LuxuryColors.jadePremium : LuxuryColors.rolexGreen,
                  backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      // Summary cards
                      Row(
                        children: [
                          Expanded(
                            child: LuxuryCard(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: [
                                  Icon(
                                    Iconsax.tick_circle,
                                    size: 28,
                                    color: LuxuryColors.rolexGreen,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${data.wins}',
                                    style: IrisTheme.numericSmall.copyWith(
                                      color: LuxuryColors.rolexGreen,
                                    ),
                                  ),
                                  Text(
                                    'Wins',
                                    style: IrisTheme.caption.copyWith(
                                      color: isDark
                                          ? IrisTheme.darkTextTertiary
                                          : IrisTheme.lightTextTertiary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: LuxuryCard(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: [
                                  Icon(
                                    Iconsax.close_circle,
                                    size: 28,
                                    color: LuxuryColors.errorRuby,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${data.losses}',
                                    style: IrisTheme.numericSmall.copyWith(
                                      color: LuxuryColors.errorRuby,
                                    ),
                                  ),
                                  Text(
                                    'Losses',
                                    style: IrisTheme.caption.copyWith(
                                      color: isDark
                                          ? IrisTheme.darkTextTertiary
                                          : IrisTheme.lightTextTertiary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: LuxuryCard(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: [
                                  Icon(
                                    Iconsax.percentage_circle,
                                    size: 28,
                                    color: LuxuryColors.champagneGold,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${data.winRate.toStringAsFixed(0)}%',
                                    style: IrisTheme.numericSmall.copyWith(
                                      color: LuxuryColors.champagneGold,
                                    ),
                                  ),
                                  Text(
                                    'Win Rate',
                                    style: IrisTheme.caption.copyWith(
                                      color: isDark
                                          ? IrisTheme.darkTextTertiary
                                          : IrisTheme.lightTextTertiary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),
                      const SizedBox(height: 20),

                      // Donut chart
                      WinLossChart(
                        wins: data.wins,
                        losses: data.losses,
                        title: 'Win Rate Overview',
                      ),
                      const SizedBox(height: 20),

                      // Loss reasons
                      if (data.lossReasons.isNotEmpty) ...[
                        LuxuryCard(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: LuxuryColors.errorRuby.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(
                                      Iconsax.info_circle,
                                      size: 18,
                                      color: LuxuryColors.errorRuby,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    'Loss Reasons',
                                    style: IrisTheme.titleMedium.copyWith(
                                      color: isDark
                                          ? IrisTheme.darkTextPrimary
                                          : IrisTheme.lightTextPrimary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              ...data.lossReasons.asMap().entries.map((entry) {
                                final reason = entry.value;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              reason.reason,
                                              style: IrisTheme.bodySmall.copyWith(
                                                color: isDark
                                                    ? IrisTheme.darkTextPrimary
                                                    : IrisTheme.lightTextPrimary,
                                              ),
                                            ),
                                          ),
                                          Text(
                                            '${reason.count} (${reason.percentage.toStringAsFixed(0)}%)',
                                            style: IrisTheme.labelSmall.copyWith(
                                              color: LuxuryColors.errorRuby,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      LuxuryProgress(
                                        value: reason.percentage / 100,
                                        color: LuxuryColors.errorRuby,
                                        height: 4,
                                      ),
                                    ],
                                  ),
                                ).animate(delay: (entry.key * 80).ms)
                                    .fadeIn()
                                    .slideX(begin: 0.05);
                              }),
                            ],
                          ),
                        ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.05),
                      ],
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
                loading: () => Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Row(
                        children: const [
                          Expanded(child: IrisShimmer(width: double.infinity, height: 100)),
                          SizedBox(width: 12),
                          Expanded(child: IrisShimmer(width: double.infinity, height: 100)),
                          SizedBox(width: 12),
                          Expanded(child: IrisShimmer(width: double.infinity, height: 100)),
                        ],
                      ),
                      const SizedBox(height: 20),
                      const IrisShimmer(width: double.infinity, height: 260),
                      const SizedBox(height: 20),
                      const IrisShimmer(width: double.infinity, height: 200),
                    ],
                  ),
                ),
                error: (_, _) => Center(
                  child: IrisEmptyState(
                    icon: Iconsax.chart_fail,
                    title: 'Unable to load analysis',
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
}
