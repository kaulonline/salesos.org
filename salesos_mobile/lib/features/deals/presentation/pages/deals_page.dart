import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/deal_health_indicator.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../data/deals_service.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../core/services/export_service.dart';
import '../../../reports/presentation/widgets/export_dialog.dart';
import '../widgets/deal_form.dart';

/// Stage colors for UI - all 10 stages from web TypeScript type
extension DealStageUI on DealStage {
  Color get color {
    switch (this) {
      case DealStage.PROSPECTING:
        return IrisTheme.stageProspecting;
      case DealStage.QUALIFICATION:
        return IrisTheme.stageQualified;
      case DealStage.NEEDS_ANALYSIS:
        return IrisTheme.stageQualified;
      case DealStage.VALUE_PROPOSITION:
        return IrisTheme.stageProposal;
      case DealStage.DECISION_MAKERS_IDENTIFIED:
        return IrisTheme.stageProposal;
      case DealStage.PERCEPTION_ANALYSIS:
        return IrisTheme.stageNegotiation;
      case DealStage.PROPOSAL_PRICE_QUOTE:
        return IrisTheme.stageProposal;
      case DealStage.NEGOTIATION_REVIEW:
        return IrisTheme.stageNegotiation;
      case DealStage.CLOSED_WON:
        return IrisTheme.stageClosedWon;
      case DealStage.CLOSED_LOST:
        return IrisTheme.stageClosedLost;
    }
  }
}

class DealsPage extends ConsumerStatefulWidget {
  const DealsPage({super.key});

  @override
  ConsumerState<DealsPage> createState() => _DealsPageState();
}

class _DealsPageState extends ConsumerState<DealsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  bool _isKanbanView = true;
  String _searchQuery = '';
  DealHealthStatus? _healthFilter; // Filter by health status
  bool _sortByHealth = false; // Sort by health (worst first)

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
    });
  }

  Future<void> _onRefresh() async {
    ref.invalidate(dealsProvider);
  }

  void _showExportDialog(BuildContext context, List<DealModel> deals) {
    if (deals.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No deals to export')),
      );
      return;
    }

    // Apply current filters to export data
    final filteredDeals = _filterDeals(deals);

    // Convert DealModel to Map for export
    final exportData = filteredDeals.map((deal) => {
      'name': deal.name,
      'accountName': deal.accountName ?? '',
      'stage': deal.stage.label,
      'amount': deal.amount,
      'probability': deal.probability,
      'closeDate': deal.closeDate?.toIso8601String() ?? '',
      'contactName': deal.contactName ?? '',
      'description': deal.description ?? '',
      'createdAt': deal.createdAt.toIso8601String(),
    }).toList();

    HapticFeedback.mediumImpact();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Container(
              margin: const EdgeInsets.all(24),
              constraints: const BoxConstraints(maxWidth: 400),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: ExportDialog(
                title: 'Export Deals',
                subtitle: '${filteredDeals.length} deals will be exported',
                dataType: ExportDataType.opportunities,
                data: exportData,
                filename: 'iris_deals_export',
                exportTitle: 'SalesOS CRM - Deals Export',
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  List<DealModel> _filterDeals(List<DealModel> deals) {
    var filtered = deals;

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((deal) {
        return deal.name.toLowerCase().contains(_searchQuery) ||
            (deal.accountName?.toLowerCase().contains(_searchQuery) ?? false) ||
            (deal.contactName?.toLowerCase().contains(_searchQuery) ?? false);
      }).toList();
    }

    // Apply tab filter
    switch (_tabController.index) {
      case 1: // Active
        filtered = filtered
            .where((d) =>
                d.stage != DealStage.CLOSED_WON &&
                d.stage != DealStage.CLOSED_LOST)
            .toList();
        break;
      case 2: // Closed
        filtered = filtered
            .where((d) =>
                d.stage == DealStage.CLOSED_WON ||
                d.stage == DealStage.CLOSED_LOST)
            .toList();
        break;
    }

    // Apply health filter (only for active deals)
    if (_healthFilter != null) {
      filtered = filtered.where((deal) {
        // Skip closed deals for health filtering
        if (deal.stage == DealStage.CLOSED_WON || deal.stage == DealStage.CLOSED_LOST) {
          return false;
        }
        final healthData = DealHealthData.fromDeal(_dealToMap(deal));
        return healthData.status == _healthFilter;
      }).toList();
    }

    // Sort by health status (worst first) if enabled
    if (_sortByHealth) {
      filtered.sort((a, b) {
        // Closed deals go to end
        final aIsClosed = a.stage == DealStage.CLOSED_WON || a.stage == DealStage.CLOSED_LOST;
        final bIsClosed = b.stage == DealStage.CLOSED_WON || b.stage == DealStage.CLOSED_LOST;
        if (aIsClosed && !bIsClosed) return 1;
        if (!aIsClosed && bIsClosed) return -1;
        if (aIsClosed && bIsClosed) return 0;

        // Sort active deals by health score (lowest first)
        final aHealth = DealHealthData.fromDeal(_dealToMap(a));
        final bHealth = DealHealthData.fromDeal(_dealToMap(b));
        return aHealth.healthScore.compareTo(bHealth.healthScore);
      });
    }

    return filtered;
  }

  Map<String, dynamic> _dealToMap(DealModel deal) {
    return {
      'id': deal.id,
      'name': deal.name,
      'accountName': deal.accountName,
      'contactName': deal.contactName,
      'amount': deal.amount,
      'stage': deal.stage.label,
      'closeDate': deal.closeDate?.toIso8601String(),
      'probability': deal.probability,
      'description': deal.description,
      'createdAt': deal.createdAt.toIso8601String(),
      'updatedAt': deal.updatedAt?.toIso8601String() ?? deal.createdAt.toIso8601String(),
    };
  }

  void _showHealthFilterSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    HapticFeedback.mediumImpact();

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Container(
              margin: const EdgeInsets.all(24),
              constraints: const BoxConstraints(maxWidth: 400),
              decoration: BoxDecoration(
                color: isDark ? LuxuryColors.richBlack : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                ),
              ),
              child: StatefulBuilder(
                builder: (context, setModalState) {
                  return SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Iconsax.health,
                                size: 20,
                                color: LuxuryColors.champagneGold,
                              ),
                              const SizedBox(width: 10),
                              Text(
                                'Filter by Health',
                                style: IrisTheme.titleMedium.copyWith(
                                  color: isDark
                                      ? IrisTheme.darkTextPrimary
                                      : IrisTheme.lightTextPrimary,
                                ),
                              ),
                              const Spacer(),
                              IconButton(
                                icon: Icon(
                                  Icons.close,
                                  size: 20,
                                  color: LuxuryColors.textMuted,
                                ),
                                onPressed: () => Navigator.pop(ctx),
                              ),
                            ],
                          ),
                          if (_healthFilter != null || _sortByHealth) ...[
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {
                                  setModalState(() {
                                    _healthFilter = null;
                                    _sortByHealth = false;
                                  });
                                  setState(() {
                                    _healthFilter = null;
                                    _sortByHealth = false;
                                  });
                                },
                                child: Text(
                                  'Clear All',
                                  style: TextStyle(color: LuxuryColors.rolexGreen),
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          // Sort by health toggle
                          _HealthFilterOption(
                            icon: Iconsax.sort,
                            label: 'Sort by Health',
                            subtitle: 'Show deals needing attention first',
                            isSelected: _sortByHealth,
                            color: LuxuryColors.jadePremium,
                            onTap: () {
                              setModalState(() => _sortByHealth = !_sortByHealth);
                              setState(() => _sortByHealth = !_sortByHealth);
                            },
                            trailing: Switch.adaptive(
                              value: _sortByHealth,
                              onChanged: (value) {
                                setModalState(() => _sortByHealth = value);
                                setState(() => _sortByHealth = value);
                              },
                              activeTrackColor: LuxuryColors.rolexGreen,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Divider(),
                          const SizedBox(height: 12),
                          Text(
                            'Filter by Status',
                            style: IrisTheme.labelMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          // Health status filters
                          _HealthFilterOption(
                            icon: Iconsax.danger,
                            label: DealHealthStatus.critical.label,
                            subtitle: DealHealthStatus.critical.description,
                            isSelected: _healthFilter == DealHealthStatus.critical,
                            color: const Color(0xFFB91C1C),
                            onTap: () {
                              final newFilter = _healthFilter == DealHealthStatus.critical
                                  ? null
                                  : DealHealthStatus.critical;
                              setModalState(() => _healthFilter = newFilter);
                              setState(() => _healthFilter = newFilter);
                            },
                          ),
                          const SizedBox(height: 8),
                          _HealthFilterOption(
                            icon: Iconsax.warning_2,
                            label: DealHealthStatus.atRisk.label,
                            subtitle: DealHealthStatus.atRisk.description,
                            isSelected: _healthFilter == DealHealthStatus.atRisk,
                            color: LuxuryColors.champagneGold,
                            onTap: () {
                              final newFilter = _healthFilter == DealHealthStatus.atRisk
                                  ? null
                                  : DealHealthStatus.atRisk;
                              setModalState(() => _healthFilter = newFilter);
                              setState(() => _healthFilter = newFilter);
                            },
                          ),
                          const SizedBox(height: 8),
                          _HealthFilterOption(
                            icon: Iconsax.timer_pause,
                            label: DealHealthStatus.stalled.label,
                            subtitle: DealHealthStatus.stalled.description,
                            isSelected: _healthFilter == DealHealthStatus.stalled,
                            color: LuxuryColors.warningAmber,
                            onTap: () {
                              final newFilter = _healthFilter == DealHealthStatus.stalled
                                  ? null
                                  : DealHealthStatus.stalled;
                              setModalState(() => _healthFilter = newFilter);
                              setState(() => _healthFilter = newFilter);
                            },
                          ),
                          const SizedBox(height: 8),
                          _HealthFilterOption(
                            icon: Iconsax.tick_circle,
                            label: DealHealthStatus.healthy.label,
                            subtitle: DealHealthStatus.healthy.description,
                            isSelected: _healthFilter == DealHealthStatus.healthy,
                            color: LuxuryColors.rolexGreen,
                            onTap: () {
                              final newFilter = _healthFilter == DealHealthStatus.healthy
                                  ? null
                                  : DealHealthStatus.healthy;
                              setModalState(() => _healthFilter = newFilter);
                              setState(() => _healthFilter = newFilter);
                            },
                          ),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  String _formatPipelineValue(List<DealModel> deals) {
    final total = deals
        .where((d) =>
            d.stage != DealStage.CLOSED_WON && d.stage != DealStage.CLOSED_LOST)
        .fold<double>(0, (sum, deal) => sum + deal.amount);

    if (total >= 1000000) {
      return '\$${(total / 1000000).toStringAsFixed(2)}M in pipeline';
    } else if (total >= 1000) {
      return '\$${(total / 1000).toStringAsFixed(0)}K in pipeline';
    } else {
      return '\$${total.toStringAsFixed(0)} in pipeline';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dealsAsync = ref.watch(dealsProvider);

    return Scaffold(
      backgroundColor:
          isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: _onRefresh,
            ),
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
                          'Deals',
                          style: IrisTheme.headlineMedium.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        dealsAsync.when(
                          data: (deals) => Text(
                            _formatPipelineValue(deals),
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          loading: () => Text(
                            'Loading...',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextSecondary
                                  : IrisTheme.lightTextSecondary,
                            ),
                          ),
                          error: (error, stackTrace) => Text(
                            'Error loading deals',
                            style: IrisTheme.bodyMedium.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // View Toggle
                  Container(
                    decoration: BoxDecoration(
                      color: isDark
                          ? IrisTheme.darkSurfaceElevated
                          : IrisTheme.lightSurfaceElevated,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        _ViewToggleButton(
                          icon: Iconsax.element_3,
                          isActive: _isKanbanView,
                          onTap: () => setState(() => _isKanbanView = true),
                        ),
                        _ViewToggleButton(
                          icon: Iconsax.menu_1,
                          isActive: !_isKanbanView,
                          onTap: () => setState(() => _isKanbanView = false),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Health Filter Button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      _showHealthFilterSheet(context);
                    },
                    // Use RepaintBoundary and Clip.hardEdge to prevent semantics parent data dirty errors
                    child: RepaintBoundary(
                      child: Stack(
                        clipBehavior: Clip.hardEdge,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: (_healthFilter != null || _sortByHealth)
                                  ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                                  : (isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated),
                              borderRadius: BorderRadius.circular(10),
                              border: (_healthFilter != null || _sortByHealth)
                                  ? Border.all(color: LuxuryColors.rolexGreen.withValues(alpha: 0.3))
                                  : null,
                            ),
                            child: Icon(
                              Iconsax.health,
                              size: 20,
                              color: (_healthFilter != null || _sortByHealth)
                                  ? LuxuryColors.rolexGreen
                                  : (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                            ),
                          ),
                          // Active filter indicator dot - use AnimatedOpacity for stable tree
                          Positioned(
                            top: -2,
                            right: -2,
                            child: AnimatedOpacity(
                              duration: const Duration(milliseconds: 200),
                              opacity: (_healthFilter != null || _sortByHealth) ? 1.0 : 0.0,
                              child: DealHealthDot(
                                status: _healthFilter ?? DealHealthStatus.atRisk,
                                size: 8,
                                animated: false,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Export Button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      final deals = ref.read(dealsProvider).value ?? [];
                      _showExportDialog(context, deals);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? IrisTheme.darkSurfaceHigh : IrisTheme.lightSurfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Iconsax.export_1,
                        size: 20,
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Add Deal Button
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      DealForm.show(
                        context: context,
                        mode: IrisFormMode.create,
                        onSuccess: () {
                          ref.invalidate(crmOpportunitiesProvider);
                          ref.invalidate(dealsProvider);
                        },
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: LuxuryColors.rolexGreen,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Iconsax.add,
                        size: 20,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: IrisSearchField(
                controller: _searchController,
                hint: 'Search deals...',
              ),
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            const SizedBox(height: 16),

            // Stage Tabs
            TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: isDark
                  ? LuxuryColors.jadePremium
                  : LuxuryColors.rolexGreen,
              unselectedLabelColor: isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary,
              indicatorColor: isDark
                  ? LuxuryColors.jadePremium
                  : LuxuryColors.rolexGreen,
              indicatorWeight: 3,
              labelStyle:
                  IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
              onTap: (_) => setState(() {}),
              tabs: const [
                Tab(text: 'All Stages'),
                Tab(text: 'Active'),
                Tab(text: 'Closed'),
              ],
            ).animate(delay: 150.ms).fadeIn(),

            const SizedBox(height: 8),

            // Content
            Expanded(
              child: dealsAsync.when(
                data: (deals) {
                  final filteredDeals = _filterDeals(deals);
                  if (filteredDeals.isEmpty) {
                    return IrisEmptyState.deals(onAdd: () {
                      HapticFeedback.lightImpact();
                    });
                  }
                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: isDark
                        ? LuxuryColors.jadePremium
                        : LuxuryColors.rolexGreen,
                    backgroundColor:
                        isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                    child: _isKanbanView
                        ? _KanbanView(deals: filteredDeals, ref: ref)
                        : _ListView(deals: filteredDeals),
                  );
                },
                loading: () => _isKanbanView
                    ? const IrisKanbanShimmer()
                    : const IrisListShimmer(itemCount: 5, itemHeight: 90),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Iconsax.warning_2,
                        size: 48,
                        color: IrisTheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load deals',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _onRefresh,
                        child: Text(
                          'Retry',
                          style: TextStyle(
                            color: isDark
                                ? LuxuryColors.jadePremium
                                : LuxuryColors.rolexGreen,
                          ),
                        ),
                      ),
                    ],
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

class _ViewToggleButton extends StatelessWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _ViewToggleButton({
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isActive
              ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 18,
          color: isActive
              ? LuxuryColors.rolexGreen
              : (isDark
                  ? IrisTheme.darkTextSecondary
                  : IrisTheme.lightTextSecondary),
        ),
      ),
    );
  }
}

class _KanbanView extends StatelessWidget {
  final List<DealModel> deals;
  final WidgetRef ref;

  const _KanbanView({required this.deals, required this.ref});

  @override
  Widget build(BuildContext context) {
    final stages = [
      DealStage.PROSPECTING,
      DealStage.QUALIFICATION,
      DealStage.NEEDS_ANALYSIS,
      DealStage.VALUE_PROPOSITION,
      DealStage.DECISION_MAKERS_IDENTIFIED,
      DealStage.PERCEPTION_ANALYSIS,
      DealStage.PROPOSAL_PRICE_QUOTE,
      DealStage.NEGOTIATION_REVIEW,
    ];

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      physics: const ClampingScrollPhysics(),
      itemCount: stages.length,
      itemBuilder: (context, index) {
        final stage = stages[index];
        final stageDeals = deals.where((d) => d.stage == stage).toList();
        return _KanbanColumn(
          stage: stage,
          deals: stageDeals,
          ref: ref,
        );
      },
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  final DealStage stage;
  final List<DealModel> deals;
  final WidgetRef ref;

  const _KanbanColumn({
    required this.stage,
    required this.deals,
    required this.ref,
  });

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
    final totalValue = deals.fold<double>(0, (sum, deal) => sum + deal.amount);

    return Container(
      width: 280,
      margin: const EdgeInsets.only(right: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Column Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: stage.color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: stage.color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    stage.label,
                    style: IrisTheme.labelMedium.copyWith(
                      color: stage.color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  '${deals.length}',
                  style: IrisTheme.labelSmall.copyWith(
                    color: stage.color,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  _formatAmount(totalValue),
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          // Deal Cards
          Expanded(
            child: deals.isEmpty
                ? Center(
                    child: Text(
                      'No deals',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                    ),
                  )
                : ListView.builder(
                    physics: const ClampingScrollPhysics(),
                    itemCount: deals.length,
                    itemBuilder: (context, index) {
                      return _KanbanCard(deal: deals[index]);
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _KanbanCard extends StatelessWidget {
  final DealModel deal;

  const _KanbanCard({required this.deal});

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

    // Calculate health data for the deal
    final healthData = DealHealthData.fromDeal(_dealToMap(deal));
    final showHealthBadge = deal.stage != DealStage.CLOSED_WON &&
        deal.stage != DealStage.CLOSED_LOST &&
        (healthData.status != DealHealthStatus.healthy ||
            healthData.daysSinceLastActivity >= 7);

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      onTap: () => context.push('${AppRoutes.deals}/${deal.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  deal.name,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (showHealthBadge) ...[
                const SizedBox(width: 6),
                DealHealthBadge(
                  status: healthData.status,
                  compact: true,
                  showIcon: false,
                ),
              ],
            ],
          ),
          if (deal.accountName != null) ...[
            const SizedBox(height: 4),
            Text(
              deal.accountName!,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          // Show stalled badge if no activity for 7+ days
          if (healthData.daysSinceLastActivity >= 7) ...[
            const SizedBox(height: 6),
            StalledBadge(daysSinceActivity: healthData.daysSinceLastActivity),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                _formatAmount(deal.amount),
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark
                      ? LuxuryColors.jadePremium
                      : LuxuryColors.rolexGreen,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              if (deal.closeDate != null) ...[
                Icon(
                  Iconsax.calendar,
                  size: 12,
                  color: isDark
                      ? IrisTheme.darkTextTertiary
                      : IrisTheme.lightTextTertiary,
                ),
                const SizedBox(width: 4),
                Text(
                  DateFormat('MMM d').format(deal.closeDate!),
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Map<String, dynamic> _dealToMap(DealModel deal) {
    return {
      'id': deal.id,
      'name': deal.name,
      'accountName': deal.accountName,
      'contactName': deal.contactName,
      'amount': deal.amount,
      'stage': deal.stage.label,
      'closeDate': deal.closeDate?.toIso8601String(),
      'probability': deal.probability,
      'description': deal.description,
      'createdAt': deal.createdAt.toIso8601String(),
      'updatedAt': deal.updatedAt?.toIso8601String() ?? deal.createdAt.toIso8601String(),
    };
  }
}

class _ListView extends StatelessWidget {
  final List<DealModel> deals;

  const _ListView({required this.deals});

  @override
  Widget build(BuildContext context) {
    final isTablet = Responsive.shouldShowSplitView(context);

    // Use 2-column grid on tablets for better space utilization
    if (isTablet) {
      return LayoutBuilder(
        builder: (context, constraints) {
          // Determine grid columns based on available width
          final availableWidth = constraints.maxWidth;
          int crossAxisCount = 2;
          if (availableWidth > 1200) {
            crossAxisCount = 3;
          } else if (availableWidth < 700) {
            crossAxisCount = 1;
          }

          // Calculate card width and appropriate aspect ratio
          final cardWidth = (availableWidth - 48 - (16 * (crossAxisCount - 1))) / crossAxisCount;
          // Aspect ratio: width / height - deal cards need ~120-140 height
          final aspectRatio = cardWidth / 130;

          return GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              mainAxisSpacing: 12,
              crossAxisSpacing: 16,
              childAspectRatio: aspectRatio.clamp(1.5, 3.5),
            ),
            itemCount: deals.length,
            itemBuilder: (context, index) {
              return _DealListItem(deal: deals[index])
                  .animate(delay: (index * 30).ms)
                  .fadeIn()
                  .scale(begin: const Offset(0.95, 0.95));
            },
          );
        },
      );
    }

    // Phone layout - single column list
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      itemCount: deals.length,
      itemBuilder: (context, index) {
        return _DealListItem(deal: deals[index])
            .animate(delay: (index * 50).ms)
            .fadeIn()
            .slideX(begin: 0.05);
      },
    );
  }
}

class _DealListItem extends StatelessWidget {
  final DealModel deal;

  const _DealListItem({required this.deal});

  String _formatAmount(double amount) {
    if (amount >= 1000000) {
      return '\$${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '\$${(amount / 1000).toStringAsFixed(0)}K';
    } else {
      return '\$${amount.toStringAsFixed(0)}';
    }
  }

  Map<String, dynamic> _dealToMap(DealModel deal) {
    return {
      'id': deal.id,
      'name': deal.name,
      'accountName': deal.accountName,
      'contactName': deal.contactName,
      'amount': deal.amount,
      'stage': deal.stage.label,
      'closeDate': deal.closeDate?.toIso8601String(),
      'probability': deal.probability,
      'description': deal.description,
      'createdAt': deal.createdAt.toIso8601String(),
      'updatedAt': deal.updatedAt?.toIso8601String() ?? deal.createdAt.toIso8601String(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Calculate health data for the deal
    final healthData = DealHealthData.fromDeal(_dealToMap(deal));
    final isActiveDeal = deal.stage != DealStage.CLOSED_WON &&
        deal.stage != DealStage.CLOSED_LOST;
    final showHealthBadge = isActiveDeal &&
        (healthData.status != DealHealthStatus.healthy ||
            healthData.daysSinceLastActivity >= 7);

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('${AppRoutes.deals}/${deal.id}'),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 50,
            decoration: BoxDecoration(
              color: deal.stage.color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        deal.name,
                        style: IrisTheme.titleSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextPrimary
                              : IrisTheme.lightTextPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Health badge for non-healthy active deals
                    if (showHealthBadge) ...[
                      const SizedBox(width: 8),
                      DealHealthBadge(
                        status: healthData.status,
                        compact: true,
                        showIcon: true,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  deal.accountName ?? 'No account',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: deal.stage.color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        deal.stage.label,
                        style: IrisTheme.labelSmall.copyWith(
                          color: deal.stage.color,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    // Stalled badge if no activity for 7+ days
                    if (isActiveDeal && healthData.daysSinceLastActivity >= 7) ...[
                      const SizedBox(width: 6),
                      StalledBadge(daysSinceActivity: healthData.daysSinceLastActivity),
                    ],
                    if (deal.closeDate != null) ...[
                      const SizedBox(width: 8),
                      Icon(
                        Iconsax.calendar,
                        size: 12,
                        color: isDark
                            ? IrisTheme.darkTextTertiary
                            : IrisTheme.lightTextTertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        DateFormat('MMM d').format(deal.closeDate!),
                        style: IrisTheme.labelSmall.copyWith(
                          color: isDark
                              ? IrisTheme.darkTextTertiary
                              : IrisTheme.lightTextTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _formatAmount(deal.amount),
                style: IrisTheme.titleSmall.copyWith(
                  color: isDark
                      ? LuxuryColors.jadePremium
                      : LuxuryColors.rolexGreen,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              // Show velocity indicator for active deals
              if (isActiveDeal)
                DealVelocityBadge(
                  velocity: healthData.velocity,
                  compact: true,
                )
              else
                Text(
                  '${deal.probability}%',
                  style: IrisTheme.labelSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Health filter option widget for the filter bottom sheet
class _HealthFilterOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool isSelected;
  final Color color;
  final VoidCallback onTap;
  final Widget? trailing;

  const _HealthFilterOption({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.isSelected,
    required this.color,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.1)
              : (isDark ? IrisTheme.darkSurfaceElevated : IrisTheme.lightSurfaceElevated),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? color.withValues(alpha: 0.3)
                : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 18,
                color: color,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextPrimary
                          : IrisTheme.lightTextPrimary,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: IrisTheme.caption.copyWith(
                      color: isDark
                          ? IrisTheme.darkTextTertiary
                          : IrisTheme.lightTextTertiary,
                    ),
                  ),
                ],
              ),
            ),
            if (trailing != null)
              trailing!
            else if (isSelected)
              Icon(
                Iconsax.tick_circle5,
                size: 20,
                color: color,
              ),
          ],
        ),
      ),
    );
  }
}
