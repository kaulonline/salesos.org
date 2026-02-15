import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';

import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/providers/connectivity_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../data/contracts_service.dart';
import '../widgets/contract_card.dart';
import '../widgets/contract_form.dart';

/// Contract filter notifier
class _ContractFilterNotifier extends Notifier<ContractStatus?> {
  @override
  ContractStatus? build() => null;
  void setFilter(ContractStatus? status) => state = status;
}

/// Contract search notifier
class _ContractSearchNotifier extends Notifier<String> {
  @override
  String build() => '';
  void setSearch(String query) => state = query;
  void clear() => state = '';
}

/// Filter state provider for contracts
final _contractFilterProvider = NotifierProvider<_ContractFilterNotifier, ContractStatus?>(
  _ContractFilterNotifier.new,
);
final _contractSearchProvider = NotifierProvider<_ContractSearchNotifier, String>(
  _ContractSearchNotifier.new,
);

/// Filter tab options matching requirements
enum ContractFilterTab {
  all('All', null, Iconsax.document_text),
  draft('Draft', ContractStatus.DRAFT, Iconsax.edit_2),
  pending('Pending', ContractStatus.PENDING, Iconsax.clock),
  active('Active', ContractStatus.ACTIVE, Iconsax.tick_circle),
  expired('Expired', ContractStatus.EXPIRED, Iconsax.timer),
  terminated('Terminated', ContractStatus.TERMINATED, Iconsax.close_circle);

  final String label;
  final ContractStatus? status;
  final IconData icon;

  const ContractFilterTab(this.label, this.status, this.icon);
}

/// Contracts page - Lists all contracts with filtering and search
class ContractsPage extends ConsumerStatefulWidget {
  const ContractsPage({super.key});

  @override
  ConsumerState<ContractsPage> createState() => _ContractsPageState();
}

class _ContractsPageState extends ConsumerState<ContractsPage>
    with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: ContractFilterTab.values.length,
      vsync: this,
    );
    _tabController.addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    final tab = ContractFilterTab.values[_tabController.index];
    ref.read(_contractFilterProvider.notifier).setFilter(tab.status);
  }

  Future<void> _onRefresh() async {
    ref.invalidate(contractsProvider);
    ref.invalidate(contractStatsProvider);
  }

  void _showCreateContractForm() {
    HapticFeedback.mediumImpact();
    ContractForm.show(
      context: context,
      onSuccess: () {
        _onRefresh();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final contractsAsync = ref.watch(contractsProvider);
    final selectedFilter = ref.watch(_contractFilterProvider);
    final searchQuery = ref.watch(_contractSearchProvider);

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
                _onRefresh();
              },
            ),

            // Custom App Bar
            _buildAppBar(isDark),

            // Search Bar
            _buildSearchBar(isDark),

            const SizedBox(height: 16),

            // Filter Tabs
            _buildFilterTabs(isDark),

            // Stats Row
            _buildStatsRow(isDark),

            // Contracts List
            Expanded(
              child: contractsAsync.when(
                data: (contracts) {
                  // Apply filters
                  var filteredContracts = contracts;
                  if (selectedFilter != null) {
                    filteredContracts = filteredContracts
                        .where((c) => c.status == selectedFilter)
                        .toList();
                  }
                  if (searchQuery.isNotEmpty) {
                    final query = searchQuery.toLowerCase();
                    filteredContracts = filteredContracts.where((c) {
                      return c.contractNumber.toLowerCase().contains(query) ||
                          (c.name?.toLowerCase().contains(query) ?? false) ||
                          (c.accountName?.toLowerCase().contains(query) ?? false);
                    }).toList();
                  }

                  if (filteredContracts.isEmpty) {
                    return _buildEmptyState(isDark, searchQuery.isNotEmpty);
                  }

                  return RefreshIndicator(
                    onRefresh: _onRefresh,
                    color: LuxuryColors.rolexGreen,
                    child: _buildContractsList(filteredContracts, isDark),
                  );
                },
                loading: () => _buildLoadingState(isDark),
                error: (error, stack) => _buildErrorState(isDark, error),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateContractForm,
        backgroundColor: LuxuryColors.rolexGreen,
        child: const Icon(
          Iconsax.add,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildAppBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          // Back button
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              context.pop();
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDark
                    ? IrisTheme.darkSurfaceElevated
                    : IrisTheme.lightSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  width: 1,
                ),
              ),
              child: Icon(
                Iconsax.arrow_left,
                size: 20,
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
          const SizedBox(width: 16),

          // Title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Contracts',
                  style: IrisTheme.headlineSmall.copyWith(
                    color:
                        isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'Manage your agreements',
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),

          // Actions
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              _onRefresh();
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Iconsax.refresh,
                size: 20,
                color: LuxuryColors.rolexGreen,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildSearchBar(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: IrisSearchField(
        controller: _searchController,
        hint: 'Search contracts...',
        tier: LuxuryTier.gold,
        onChanged: (value) {
          ref.read(_contractSearchProvider.notifier).setSearch(value);
        },
        onClear: () {
          ref.read(_contractSearchProvider.notifier).clear();
        },
      ),
    ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1);
  }

  Widget _buildFilterTabs(bool isDark) {
    return Container(
      height: 44,
      margin: const EdgeInsets.only(bottom: 8),
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        labelColor: LuxuryColors.rolexGreen,
        unselectedLabelColor: isDark
            ? IrisTheme.darkTextSecondary
            : IrisTheme.lightTextSecondary,
        indicatorColor: LuxuryColors.rolexGreen,
        indicatorWeight: 3,
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w600),
        unselectedLabelStyle: IrisTheme.labelMedium.copyWith(fontWeight: FontWeight.w500),
        dividerColor: Colors.transparent,
        tabs: ContractFilterTab.values.map((tab) {
          return Tab(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(tab.icon, size: 16),
                const SizedBox(width: 6),
                Text(tab.label),
              ],
            ),
          );
        }).toList(),
      ),
    ).animate(delay: 150.ms).fadeIn();
  }

  Widget _buildStatsRow(bool isDark) {
    final statsAsync = ref.watch(contractStatsProvider);

    return statsAsync.when(
      data: (stats) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDark
                  ? [
                      LuxuryColors.rolexGreen.withValues(alpha: 0.15),
                      LuxuryColors.deepEmerald.withValues(alpha: 0.1),
                    ]
                  : [
                      LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                      LuxuryColors.jadePremium.withValues(alpha: 0.05),
                    ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              _buildStatItem(
                'Total',
                stats['total']?.toString() ?? '0',
                Iconsax.document_text,
                LuxuryColors.champagneGold,
                isDark,
              ),
              _buildStatDivider(isDark),
              _buildStatItem(
                'Active',
                stats['active']?.toString() ?? '0',
                Iconsax.tick_circle,
                LuxuryColors.rolexGreen,
                isDark,
              ),
              _buildStatDivider(isDark),
              _buildStatItem(
                'Pending',
                stats['pending']?.toString() ?? '0',
                Iconsax.clock,
                IrisTheme.irisGold,
                isDark,
              ),
              _buildStatDivider(isDark),
              _buildStatItem(
                'Expiring',
                stats['expiringSoon']?.toString() ?? '0',
                Iconsax.warning_2,
                IrisTheme.irisGoldDark,
                isDark,
              ),
            ],
          ),
        ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1);
      },
      loading: () => const SizedBox(height: 80),
      error: (_, _) => const SizedBox(height: 80),
    );
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
    bool isDark,
  ) {
    return Expanded(
      child: Column(
        children: [
          Icon(
            icon,
            size: 18,
            color: color,
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: IrisTheme.labelSmall.copyWith(
              color:
                  isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatDivider(bool isDark) {
    return Container(
      width: 1,
      height: 40,
      color: (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder)
          .withValues(alpha: 0.5),
    );
  }

  Widget _buildContractsList(List<ContractModel> contracts, bool isDark) {
    return ListView.separated(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: contracts.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final contract = contracts[index];
        return ContractCard(
          contract: contract,
          animationIndex: index,
          onTap: () {
            HapticFeedback.lightImpact();
            context.push('${AppRoutes.contracts}/${contract.id}');
          },
        );
      },
    );
  }

  Widget _buildEmptyState(bool isDark, bool hasSearch) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              hasSearch ? Iconsax.search_normal : Iconsax.document_text,
              size: 36,
              color: LuxuryColors.rolexGreen,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            hasSearch ? 'No contracts found' : 'No contracts yet',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            hasSearch
                ? 'Try adjusting your search or filters'
                : 'Create your first contract to get started',
            style: IrisTheme.bodySmall.copyWith(
              color:
                  isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          if (!hasSearch) ...[
            const SizedBox(height: 24),
            GestureDetector(
              onTap: _showCreateContractForm,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Iconsax.add, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Create Contract',
                      style: IrisTheme.labelMedium.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9));
  }

  Widget _buildLoadingState(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: 5,
      itemBuilder: (context, index) {
        // Wrap continuous animation in ExcludeSemantics and RepaintBoundary
        // to prevent semantics parent data dirty errors
        return ExcludeSemantics(
          child: RepaintBoundary(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              height: 160,
              decoration: BoxDecoration(
                color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  width: 1,
                ),
              ),
            )
                .animate(onPlay: (controller) => controller.repeat())
                .shimmer(
                  duration: 1500.ms,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.05)
                      : Colors.black.withValues(alpha: 0.03),
                ),
          ),
        );
      },
    );
  }

  Widget _buildErrorState(bool isDark, Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Iconsax.warning_2,
            size: 48,
            color: IrisTheme.irisGoldDark,
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load contracts',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            error.toString(),
            style: IrisTheme.bodySmall.copyWith(
              color:
                  isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _onRefresh,
            icon: const Icon(Iconsax.refresh),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(
              backgroundColor: LuxuryColors.rolexGreen,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
