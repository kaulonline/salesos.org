import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/iris_card.dart';

/// Show revenue details dialog
void showRevenueDetails(BuildContext context, Map<String, dynamic> metrics) {
  HapticFeedback.mediumImpact();
  showDialog(
    context: context,
    barrierDismissible: true,
    barrierColor: Colors.black54,
    builder: (context) => BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: _RevenueDetailsSheet(metrics: metrics),
      ),
    ),
  );
}

/// Show won deals dialog
void showWonDealsDetails(BuildContext context, Map<String, dynamic> metrics) {
  HapticFeedback.mediumImpact();
  showDialog(
    context: context,
    barrierDismissible: true,
    barrierColor: Colors.black54,
    builder: (context) => BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: _WonDealsSheet(metrics: metrics),
      ),
    ),
  );
}

/// Show win rate details dialog
void showWinRateDetails(BuildContext context, Map<String, dynamic> metrics) {
  HapticFeedback.mediumImpact();
  showDialog(
    context: context,
    barrierDismissible: true,
    barrierColor: Colors.black54,
    builder: (context) => BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: _WinRateSheet(metrics: metrics),
      ),
    ),
  );
}

/// Show average deal size details dialog
void showAvgDealSizeDetails(BuildContext context, Map<String, dynamic> metrics) {
  HapticFeedback.mediumImpact();
  showDialog(
    context: context,
    barrierDismissible: true,
    barrierColor: Colors.black54,
    builder: (context) => BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: _AvgDealSizeSheet(metrics: metrics),
      ),
    ),
  );
}

/// Show pipeline stage details dialog
void showPipelineStageDetails(BuildContext context, String stageName, List<Map<String, dynamic>> deals) {
  HapticFeedback.mediumImpact();
  showDialog(
    context: context,
    barrierDismissible: true,
    barrierColor: Colors.black54,
    builder: (context) => BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: _PipelineStageSheet(stageName: stageName, deals: deals),
      ),
    ),
  );
}

/// Show activity details dialog
void showActivityDetails(BuildContext context, String activityType, int count, Map<String, dynamic> metrics) {
  HapticFeedback.mediumImpact();
  showDialog(
    context: context,
    barrierDismissible: true,
    barrierColor: Colors.black54,
    builder: (context) => BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: _ActivityDetailsSheet(activityType: activityType, count: count, metrics: metrics),
      ),
    ),
  );
}

// ============================================================================
// REVENUE DETAILS SHEET
// ============================================================================

class _RevenueDetailsSheet extends StatelessWidget {
  final Map<String, dynamic> metrics;

  const _RevenueDetailsSheet({required this.metrics});

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalRevenue = (metrics['totalRevenue'] as num?)?.toDouble() ?? 0;
    final opportunities = metrics['opportunities'] as List<Map<String, dynamic>>? ?? [];

    // Get won deals with amounts
    final wonDeals = opportunities.where((o) =>
      o['IsWon'] == true || o['StageName'] == 'Closed Won' || o['stageName'] == 'Closed Won'
    ).toList();

    // Sort by amount descending
    wonDeals.sort((a, b) {
      final aAmount = (a['Amount'] as num?)?.toDouble() ?? 0;
      final bAmount = (b['Amount'] as num?)?.toDouble() ?? 0;
      return bAmount.compareTo(aAmount);
    });

    return _DetailSheetContainer(
      title: 'Revenue Details',
      subtitle: _formatCurrency(totalRevenue),
      icon: Iconsax.dollar_circle,
      iconColor: IrisTheme.success,
      child: wonDeals.isEmpty
          ? _EmptyState(message: 'No revenue data available')
          : ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: wonDeals.length,
              itemBuilder: (context, index) {
                final deal = wonDeals[index];
                final name = deal['Name'] as String? ?? deal['name'] as String? ?? 'Deal';
                final amount = (deal['Amount'] as num?)?.toDouble() ?? 0;
                final closeDate = deal['CloseDate'] as String? ?? deal['closeDate'] as String?;

                return _DealListItem(
                  name: name,
                  amount: _formatCurrency(amount),
                  subtitle: closeDate != null ? 'Closed ${_formatDate(closeDate)}' : null,
                  onTap: () {
                    Navigator.pop(context);
                    final dealId = deal['Id'] as String? ?? deal['id'] as String?;
                    if (dealId != null) {
                      context.push('${AppRoutes.deals}/$dealId');
                    }
                  },
                ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
              },
            ),
    );
  }

  String _formatDate(String dateStr) {
    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;
    return DateFormat('MMM d, yyyy').format(date);
  }
}

// ============================================================================
// WON DEALS SHEET
// ============================================================================

class _WonDealsSheet extends StatelessWidget {
  final Map<String, dynamic> metrics;

  const _WonDealsSheet({required this.metrics});

  @override
  Widget build(BuildContext context) {
    final wonDealsCount = (metrics['wonDeals'] as num?)?.toInt() ?? 0;
    final opportunities = metrics['opportunities'] as List<Map<String, dynamic>>? ?? [];

    final wonDeals = opportunities.where((o) =>
      o['IsWon'] == true || o['StageName'] == 'Closed Won' || o['stageName'] == 'Closed Won'
    ).toList();

    // Sort by close date descending
    wonDeals.sort((a, b) {
      final aDate = a['CloseDate'] as String? ?? a['closeDate'] as String? ?? '';
      final bDate = b['CloseDate'] as String? ?? b['closeDate'] as String? ?? '';
      return bDate.compareTo(aDate);
    });

    return _DetailSheetContainer(
      title: 'Won Deals',
      subtitle: '$wonDealsCount deals closed',
      icon: Iconsax.medal_star,
      iconColor: LuxuryColors.jadePremium,
      child: wonDeals.isEmpty
          ? _EmptyState(message: 'No won deals in this period')
          : ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: wonDeals.length,
              itemBuilder: (context, index) {
                final deal = wonDeals[index];
                final name = deal['Name'] as String? ?? deal['name'] as String? ?? 'Deal';
                final amount = (deal['Amount'] as num?)?.toDouble() ?? 0;
                final account = deal['Account'] as Map<String, dynamic>?;
                final accountName = account?['Name'] as String? ?? '';

                return _DealListItem(
                  name: name,
                  amount: _formatCurrency(amount),
                  subtitle: accountName.isNotEmpty ? accountName : null,
                  onTap: () {
                    Navigator.pop(context);
                    final dealId = deal['Id'] as String? ?? deal['id'] as String?;
                    if (dealId != null) {
                      context.push('${AppRoutes.deals}/$dealId');
                    }
                  },
                ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
              },
            ),
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }
}

// ============================================================================
// WIN RATE SHEET
// ============================================================================

class _WinRateSheet extends StatelessWidget {
  final Map<String, dynamic> metrics;

  const _WinRateSheet({required this.metrics});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final winRate = (metrics['winRate'] as num?)?.toInt() ?? 0;
    final opportunities = metrics['opportunities'] as List<Map<String, dynamic>>? ?? [];

    final wonDeals = opportunities.where((o) =>
      o['IsWon'] == true || o['StageName'] == 'Closed Won' || o['stageName'] == 'Closed Won'
    ).toList();

    final lostDeals = opportunities.where((o) =>
      o['IsClosed'] == true && o['IsWon'] != true &&
      o['StageName'] != 'Closed Won' && o['stageName'] != 'Closed Won'
    ).toList();

    final openDeals = opportunities.where((o) =>
      o['IsClosed'] != true && o['isClosed'] != true
    ).toList();

    return _DetailSheetContainer(
      title: 'Win Rate Analysis',
      subtitle: '$winRate% win rate',
      icon: Iconsax.chart_2,
      iconColor: IrisTheme.info,
      child: Column(
        children: [
          // Stats row
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Won',
                  value: wonDeals.length.toString(),
                  color: IrisTheme.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Lost',
                  value: lostDeals.length.toString(),
                  color: IrisTheme.error,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Open',
                  value: openDeals.length.toString(),
                  color: IrisTheme.info,
                ),
              ),
            ],
          ).animate(delay: 100.ms).fadeIn(),

          const SizedBox(height: 20),

          // Progress bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Win/Loss Ratio',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: Row(
                  children: [
                    if (wonDeals.isNotEmpty)
                      Expanded(
                        flex: wonDeals.length,
                        child: Container(
                          height: 24,
                          color: IrisTheme.success,
                          alignment: Alignment.center,
                          child: Text(
                            '${wonDeals.length}',
                            style: IrisTheme.labelSmall.copyWith(color: Colors.white),
                          ),
                        ),
                      ),
                    if (lostDeals.isNotEmpty)
                      Expanded(
                        flex: lostDeals.length,
                        child: Container(
                          height: 24,
                          color: IrisTheme.error,
                          alignment: Alignment.center,
                          child: Text(
                            '${lostDeals.length}',
                            style: IrisTheme.labelSmall.copyWith(color: Colors.white),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ).animate(delay: 200.ms).fadeIn(),

          if (lostDeals.isNotEmpty) ...[
            const SizedBox(height: 20),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Recently Lost',
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ),
            const SizedBox(height: 8),
            ...lostDeals.take(3).map((deal) {
              final name = deal['Name'] as String? ?? deal['name'] as String? ?? 'Deal';
              final amount = (deal['Amount'] as num?)?.toDouble() ?? 0;
              return _DealListItem(
                name: name,
                amount: _formatCurrency(amount),
                subtitle: 'Lost',
                isLost: true,
                onTap: () {
                  Navigator.pop(context);
                  final dealId = deal['Id'] as String? ?? deal['id'] as String?;
                  if (dealId != null) {
                    context.push('${AppRoutes.deals}/$dealId');
                  }
                },
              );
            }),
          ],
        ],
      ),
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }
}

// ============================================================================
// AVG DEAL SIZE SHEET
// ============================================================================

class _AvgDealSizeSheet extends StatelessWidget {
  final Map<String, dynamic> metrics;

  const _AvgDealSizeSheet({required this.metrics});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final avgDealSize = (metrics['avgDealSize'] as num?)?.toDouble() ?? 0;
    final opportunities = metrics['opportunities'] as List<Map<String, dynamic>>? ?? [];

    final wonDeals = opportunities.where((o) =>
      o['IsWon'] == true || o['StageName'] == 'Closed Won' || o['stageName'] == 'Closed Won'
    ).toList();

    // Group deals by size buckets
    int small = 0, medium = 0, large = 0, enterprise = 0;
    for (final deal in wonDeals) {
      final amount = (deal['Amount'] as num?)?.toDouble() ?? 0;
      if (amount < 10000) {
        small++;
      } else if (amount < 50000) {
        medium++;
      } else if (amount < 100000) {
        large++;
      } else {
        enterprise++;
      }
    }

    // Find min and max
    double minDeal = double.infinity;
    double maxDeal = 0;
    for (final deal in wonDeals) {
      final amount = (deal['Amount'] as num?)?.toDouble() ?? 0;
      if (amount > 0) {
        if (amount < minDeal) minDeal = amount;
        if (amount > maxDeal) maxDeal = amount;
      }
    }
    if (minDeal == double.infinity) minDeal = 0;

    return _DetailSheetContainer(
      title: 'Deal Size Analysis',
      subtitle: 'Avg: ${_formatCurrency(avgDealSize)}',
      icon: Iconsax.receipt,
      iconColor: IrisTheme.warning,
      child: Column(
        children: [
          // Min/Max row
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Smallest',
                  value: _formatCurrency(minDeal),
                  color: IrisTheme.info,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Average',
                  value: _formatCurrency(avgDealSize),
                  color: LuxuryColors.jadePremium,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Largest',
                  value: _formatCurrency(maxDeal),
                  color: IrisTheme.success,
                ),
              ),
            ],
          ).animate(delay: 100.ms).fadeIn(),

          const SizedBox(height: 24),

          // Size distribution
          Text(
            'Deal Size Distribution',
            style: IrisTheme.titleSmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),

          _DistributionBar(label: 'Small (<\$10K)', count: small, total: wonDeals.length, color: IrisTheme.info),
          _DistributionBar(label: 'Medium (\$10K-\$50K)', count: medium, total: wonDeals.length, color: IrisTheme.success),
          _DistributionBar(label: 'Large (\$50K-\$100K)', count: large, total: wonDeals.length, color: IrisTheme.warning),
          _DistributionBar(label: 'Enterprise (>\$100K)', count: enterprise, total: wonDeals.length, color: LuxuryColors.rolexGreen),
        ],
      ),
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }
}

// ============================================================================
// PIPELINE STAGE SHEET
// ============================================================================

class _PipelineStageSheet extends StatelessWidget {
  final String stageName;
  final List<Map<String, dynamic>> deals;

  const _PipelineStageSheet({required this.stageName, required this.deals});

  @override
  Widget build(BuildContext context) {
    final totalValue = deals.fold<double>(0, (sum, d) => sum + ((d['Amount'] as num?)?.toDouble() ?? 0));

    return _DetailSheetContainer(
      title: stageName,
      subtitle: '${deals.length} deals • ${_formatCurrency(totalValue)}',
      icon: Iconsax.chart,
      iconColor: LuxuryColors.jadePremium,
      child: deals.isEmpty
          ? _EmptyState(message: 'No deals in this stage')
          : ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: deals.length,
              itemBuilder: (context, index) {
                final deal = deals[index];
                final name = deal['Name'] as String? ?? deal['name'] as String? ?? 'Deal';
                final amount = (deal['Amount'] as num?)?.toDouble() ?? 0;
                final probability = (deal['Probability'] as num?)?.toInt() ?? 0;
                final closeDate = deal['CloseDate'] as String? ?? deal['closeDate'] as String?;

                return _DealListItem(
                  name: name,
                  amount: _formatCurrency(amount),
                  subtitle: '$probability% • Closes ${closeDate != null ? _formatDate(closeDate) : 'TBD'}',
                  onTap: () {
                    Navigator.pop(context);
                    final dealId = deal['Id'] as String? ?? deal['id'] as String?;
                    if (dealId != null) {
                      context.push('${AppRoutes.deals}/$dealId');
                    }
                  },
                ).animate(delay: (index * 50).ms).fadeIn().slideX(begin: 0.05);
              },
            ),
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }

  String _formatDate(String dateStr) {
    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;
    return DateFormat('MMM d').format(date);
  }
}

// ============================================================================
// ACTIVITY DETAILS SHEET
// ============================================================================

class _ActivityDetailsSheet extends StatelessWidget {
  final String activityType;
  final int count;
  final Map<String, dynamic> metrics;

  const _ActivityDetailsSheet({
    required this.activityType,
    required this.count,
    required this.metrics,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final calls = (metrics['calls'] as num?)?.toInt() ?? 0;
    final emails = (metrics['emails'] as num?)?.toInt() ?? 0;
    final meetings = (metrics['meetings'] as num?)?.toInt() ?? 0;
    final tasks = (metrics['tasks'] as num?)?.toInt() ?? 0;
    final total = calls + emails + meetings + tasks;

    IconData icon;
    Color color;
    String title;

    switch (activityType.toLowerCase()) {
      case 'calls':
        icon = Iconsax.call;
        color = IrisTheme.info;
        title = 'Calls';
        break;
      case 'emails':
        icon = Iconsax.sms;
        color = IrisTheme.success;
        title = 'Emails';
        break;
      case 'meetings':
        icon = Iconsax.people;
        color = IrisTheme.warning;
        title = 'Meetings';
        break;
      case 'tasks':
        icon = Iconsax.task_square;
        color = LuxuryColors.rolexGreen;
        title = 'Tasks';
        break;
      default:
        icon = Iconsax.activity;
        color = IrisTheme.info;
        title = 'Activities';
    }

    return _DetailSheetContainer(
      title: '$title Activity',
      subtitle: '$count $title this period',
      icon: icon,
      iconColor: color,
      child: Column(
        children: [
          // Activity breakdown - Row 1
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Calls',
                  value: calls.toString(),
                  color: IrisTheme.info,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Emails',
                  value: emails.toString(),
                  color: IrisTheme.success,
                ),
              ),
            ],
          ).animate(delay: 100.ms).fadeIn(),

          const SizedBox(height: 12),

          // Activity breakdown - Row 2
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Meetings',
                  value: meetings.toString(),
                  color: IrisTheme.warning,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Tasks',
                  value: tasks.toString(),
                  color: LuxuryColors.jadePremium,
                ),
              ),
            ],
          ).animate(delay: 150.ms).fadeIn(),

          const SizedBox(height: 24),

          // Distribution
          Text(
            'Activity Distribution',
            style: IrisTheme.titleSmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),

          _DistributionBar(label: 'Calls', count: calls, total: total, color: IrisTheme.info),
          _DistributionBar(label: 'Emails', count: emails, total: total, color: IrisTheme.success),
          _DistributionBar(label: 'Meetings', count: meetings, total: total, color: IrisTheme.warning),
          _DistributionBar(label: 'Tasks', count: tasks, total: total, color: LuxuryColors.rolexGreen),

          const SizedBox(height: 16),

          // Tip
          IrisCard(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(Iconsax.info_circle, size: 20, color: IrisTheme.info),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Track activities to improve engagement and close more deals.',
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ).animate(delay: 300.ms).fadeIn(),
        ],
      ),
    );
  }
}

// ============================================================================
// SHARED WIDGETS
// ============================================================================

class _DetailSheetContainer extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Widget child;

  const _DetailSheetContainer({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: iconColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, size: 24, color: iconColor),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: IrisTheme.titleLarge.copyWith(
                              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                            ),
                          ),
                          Text(
                            subtitle,
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(
                        Iconsax.close_circle,
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 300.ms),

              const Divider(height: 1),

              // Content
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: child,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DealListItem extends StatelessWidget {
  final String name;
  final String amount;
  final String? subtitle;
  final bool isLost;
  final VoidCallback onTap;

  const _DealListItem({
    required this.name,
    required this.amount,
    this.subtitle,
    this.isLost = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: IrisTheme.bodySmall.copyWith(
                      color: isLost ? IrisTheme.error : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            amount,
            style: IrisTheme.titleSmall.copyWith(
              color: isLost ? IrisTheme.error : LuxuryColors.rolexGreen,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 8),
          Icon(
            Iconsax.arrow_right_3,
            size: 16,
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Text(
            value,
            style: IrisTheme.titleMedium.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _DistributionBar extends StatelessWidget {
  final String label;
  final int count;
  final int total;
  final Color color;

  const _DistributionBar({
    required this.label,
    required this.count,
    required this.total,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final percentage = total > 0 ? (count / total) : 0.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
              Text(
                '$count (${(percentage * 100).toInt()}%)',
                style: IrisTheme.labelMedium.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percentage,
              backgroundColor: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightBorder,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;

  const _EmptyState({required this.message});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Iconsax.document,
              size: 48,
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
