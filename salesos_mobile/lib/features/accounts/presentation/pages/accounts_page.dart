import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/crm_data_service.dart';
import '../../../../shared/widgets/iris_shimmer.dart';
import '../../../../shared/widgets/iris_empty_state.dart';
import '../../../../shared/widgets/iris_form_dialog.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../../../core/utils/responsive.dart';
import '../../../../core/services/user_preferences_service.dart';
import '../widgets/account_form.dart';

class AccountsPage extends ConsumerStatefulWidget {
  const AccountsPage({super.key});

  @override
  ConsumerState<AccountsPage> createState() => _AccountsPageState();
}

class _AccountsPageState extends ConsumerState<AccountsPage> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() => _searchQuery = _searchController.text.toLowerCase());
  }

  String _getAccountName(Map<String, dynamic> account) {
    return account['Name'] as String? ?? account['name'] as String? ?? 'Unknown';
  }

  String _getAccountType(Map<String, dynamic> account) {
    return account['Type'] as String? ?? account['type'] as String? ?? '';
  }

  String _getAccountIndustry(Map<String, dynamic> account) {
    return account['Industry'] as String? ?? account['industry'] as String? ?? '';
  }

  List<Map<String, dynamic>> _filterAccounts(List<Map<String, dynamic>> accounts) {
    var filtered = accounts;

    if (_selectedFilter != 'All') {
      filtered = filtered.where((account) {
        final type = _getAccountType(account).toLowerCase();
        return type == _selectedFilter.toLowerCase();
      }).toList();
    }

    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((account) {
        final name = _getAccountName(account).toLowerCase();
        final industry = _getAccountIndustry(account).toLowerCase();
        final type = _getAccountType(account).toLowerCase();
        return name.contains(_searchQuery) ||
               industry.contains(_searchQuery) ||
               type.contains(_searchQuery);
      }).toList();
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accountsAsync = ref.watch(crmAccountsProvider);
    final viewPrefs = ref.watch(viewPreferencesProvider);
    final isTableView = viewPrefs.accountsView == ListViewType.table;
    final isTablet = Responsive.shouldShowSplitView(context);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.crystalWhite,
      body: SafeArea(
        child: Column(
          children: [
            OfflineBanner(
              compact: true,
              onRetry: () => ref.invalidate(crmAccountsProvider),
            ),

            // Header
            _PageHeader(
              onBack: () => Navigator.of(context).pop(),
              onCreateAccount: () {
                HapticFeedback.lightImpact();
                AccountForm.show(
                  context: context,
                  mode: IrisFormMode.create,
                  onSuccess: () => ref.invalidate(crmAccountsProvider),
                );
              },
              isTableView: isTableView,
              onToggleView: () {
                HapticFeedback.lightImpact();
                ref.read(viewPreferencesProvider.notifier).toggleView('accounts');
              },
              onRefresh: () {
                HapticFeedback.lightImpact();
                ref.invalidate(crmAccountsProvider);
              },
            ),

            // Summary stats
            accountsAsync.when(
              data: (accounts) => _SummarySection(accounts: accounts),
              loading: () => const SizedBox(height: 70),
              error: (_, _) => const SizedBox(height: 70),
            ),

            const SizedBox(height: 16),

            // Search
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SearchField(
                controller: _searchController,
                hint: 'Search accounts...',
              ),
            ).animate(delay: 100.ms).fadeIn(),

            const SizedBox(height: 12),

            // Filter chips
            _FilterChips(
              selectedFilter: _selectedFilter,
              onFilterChanged: (filter) {
                HapticFeedback.lightImpact();
                setState(() => _selectedFilter = filter);
              },
            ),

            const SizedBox(height: 12),

            // List
            Expanded(
              child: accountsAsync.when(
                loading: () => const IrisListShimmer(
                  itemCount: 5,
                  itemHeight: 100,
                  tier: LuxuryTier.gold,
                ),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Iconsax.warning_2, size: 48, color: LuxuryColors.errorRuby),
                      const SizedBox(height: 16),
                      Text('Failed to load accounts', style: TextStyle(
                        fontSize: 16,
                        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                      )),
                      const SizedBox(height: 16),
                      TextButton.icon(
                        onPressed: () => ref.invalidate(crmAccountsProvider),
                        icon: const Icon(Iconsax.refresh),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
                data: (accounts) {
                  final filteredAccounts = _filterAccounts(accounts);

                  if (filteredAccounts.isEmpty) {
                    return _searchQuery.isNotEmpty
                        ? IrisEmptyState.search(query: _searchQuery)
                        : IrisEmptyState.accounts(onAdd: () {
                            HapticFeedback.lightImpact();
                            AccountForm.show(
                              context: context,
                              mode: IrisFormMode.create,
                              onSuccess: () => ref.invalidate(crmAccountsProvider),
                            );
                          });
                  }

                  return RefreshIndicator(
                    onRefresh: () async => ref.invalidate(crmAccountsProvider),
                    color: LuxuryColors.rolexGreen,
                    backgroundColor: isDark ? LuxuryColors.obsidian : Colors.white,
                    child: isTableView
                        ? _AccountTable(
                            accounts: filteredAccounts,
                            isDark: isDark,
                            isTablet: isTablet,
                            onAccountTap: (id) {
                              HapticFeedback.lightImpact();
                              context.push('${AppRoutes.accounts}/$id');
                            },
                          )
                        : isTablet
                            ? _TabletAccountGrid(
                                accounts: filteredAccounts,
                                onAccountTap: (id) {
                                  HapticFeedback.lightImpact();
                                  context.push('${AppRoutes.accounts}/$id');
                                },
                              )
                            : _PhoneAccountList(
                                accounts: filteredAccounts,
                                onAccountTap: (id) {
                                  HapticFeedback.lightImpact();
                                  context.push('${AppRoutes.accounts}/$id');
                                },
                              ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          HapticFeedback.lightImpact();
          AccountForm.show(
            context: context,
            mode: IrisFormMode.create,
            onSuccess: () => ref.invalidate(crmAccountsProvider),
          );
        },
        backgroundColor: LuxuryColors.rolexGreen,
        foregroundColor: Colors.white,
        icon: const Icon(Iconsax.add),
        label: const Text('New Account'),
      ),
    );
  }
}

class _PageHeader extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onCreateAccount;
  final bool isTableView;
  final VoidCallback onToggleView;
  final VoidCallback onRefresh;

  const _PageHeader({
    required this.onBack,
    required this.onCreateAccount,
    required this.isTableView,
    required this.onToggleView,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              onBack();
            },
            icon: Icon(
              Iconsax.arrow_left,
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Accounts',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
          ),
          // View toggle
          IconButton(
            onPressed: onToggleView,
            icon: Icon(
              isTableView ? Iconsax.element_3 : Iconsax.row_vertical,
              color: isTableView
                  ? LuxuryColors.rolexGreen
                  : (isDark ? LuxuryColors.textMuted : IrisTheme.lightTextSecondary),
            ),
          ),
          // Refresh
          IconButton(
            onPressed: onRefresh,
            icon: Icon(
              Iconsax.refresh,
              color: isDark ? LuxuryColors.textMuted : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _SummarySection extends StatelessWidget {
  final List<Map<String, dynamic>> accounts;

  const _SummarySection({required this.accounts});

  String _getType(Map<String, dynamic> account) {
    return account['Type'] as String? ?? account['type'] as String? ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final total = accounts.length;
    final customers = accounts.where((a) => _getType(a).toLowerCase() == 'customer').length;
    final prospects = accounts.where((a) => _getType(a).toLowerCase() == 'prospect').length;
    final partners = accounts.where((a) => _getType(a).toLowerCase() == 'partner').length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Row(
        children: [
          _StatChip(value: '$total', label: 'Total', color: LuxuryColors.rolexGreen, isDark: isDark),
          const SizedBox(width: 8),
          _StatChip(value: '$customers', label: 'Customers', color: LuxuryColors.successGreen, isDark: isDark),
          const SizedBox(width: 8),
          _StatChip(value: '$prospects', label: 'Prospects', color: LuxuryColors.infoCobalt, isDark: isDark),
          const SizedBox(width: 8),
          _StatChip(value: '$partners', label: 'Partners', color: LuxuryColors.champagneGold, isDark: isDark),
        ],
      ),
    ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1);
  }
}

class _StatChip extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  final bool isDark;

  const _StatChip({
    required this.value,
    required this.label,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w500,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;

  const _SearchField({required this.controller, required this.hint});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TextField(
      controller: controller,
      style: TextStyle(
        fontSize: 15,
        color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: LuxuryColors.textMuted),
        prefixIcon: Icon(Iconsax.search_normal, size: 20, color: LuxuryColors.rolexGreen),
        filled: true,
        fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: LuxuryColors.rolexGreen),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}

class _FilterChips extends StatelessWidget {
  final String selectedFilter;
  final Function(String) onFilterChanged;

  const _FilterChips({
    required this.selectedFilter,
    required this.onFilterChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filters = [
      ('All', LuxuryColors.rolexGreen),
      ('Customer', LuxuryColors.successGreen),
      ('Prospect', LuxuryColors.infoCobalt),
      ('Partner', LuxuryColors.champagneGold),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: filters.map((filter) {
          final isSelected = selectedFilter == filter.$1;
          final color = filter.$2;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onFilterChanged(filter.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? color.withValues(alpha: isDark ? 0.2 : 0.12)
                      : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? color
                        : (isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.2)),
                  ),
                ),
                child: Text(
                  filter.$1,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected
                        ? color
                        : (isDark ? LuxuryColors.textMuted : IrisTheme.lightTextSecondary),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    ).animate(delay: 150.ms).fadeIn();
  }
}

class _PhoneAccountList extends StatelessWidget {
  final List<Map<String, dynamic>> accounts;
  final Function(String) onAccountTap;

  const _PhoneAccountList({required this.accounts, required this.onAccountTap});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
      itemCount: accounts.length,
      itemBuilder: (context, index) {
        final account = accounts[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _AccountCard(
            account: account,
            onTap: () {
              final id = account['Id'] as String? ?? account['id'] as String? ?? '';
              onAccountTap(id);
            },
          ).animate(delay: Duration(milliseconds: 30 * index)).fadeIn().slideX(begin: 0.02),
        );
      },
    );
  }
}

/// Tablet: Proper 2-column grid with natural left-to-right, top-to-bottom flow
class _TabletAccountGrid extends StatelessWidget {
  final List<Map<String, dynamic>> accounts;
  final Function(String) onAccountTap;

  const _TabletAccountGrid({required this.accounts, required this.onAccountTap});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
      itemCount: (accounts.length / 2).ceil(),
      itemBuilder: (context, rowIndex) {
        final leftIndex = rowIndex * 2;
        final rightIndex = leftIndex + 1;

        return Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left card
              Expanded(
                child: _AccountCard(
                  account: accounts[leftIndex],
                  onTap: () {
                    final id = accounts[leftIndex]['Id'] as String? ??
                        accounts[leftIndex]['id'] as String? ?? '';
                    onAccountTap(id);
                  },
                ).animate(delay: Duration(milliseconds: 30 * leftIndex)).fadeIn(),
              ),
              const SizedBox(width: 14),
              // Right card (or empty space)
              Expanded(
                child: rightIndex < accounts.length
                    ? _AccountCard(
                        account: accounts[rightIndex],
                        onTap: () {
                          final id = accounts[rightIndex]['Id'] as String? ??
                              accounts[rightIndex]['id'] as String? ?? '';
                          onAccountTap(id);
                        },
                      ).animate(delay: Duration(milliseconds: 30 * rightIndex)).fadeIn()
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Clean Account Card - no accent lines, proper contained design
class _AccountCard extends StatelessWidget {
  final Map<String, dynamic> account;
  final VoidCallback onTap;

  const _AccountCard({required this.account, required this.onTap});

  String _getInitials(String name) {
    final words = name.split(' ').where((w) => w.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words[0][0].toUpperCase();
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'customer': return LuxuryColors.successGreen;
      case 'prospect': return LuxuryColors.infoCobalt;
      case 'partner': return LuxuryColors.champagneGold;
      case 'competitor': return LuxuryColors.errorRuby;
      default: return LuxuryColors.rolexGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final name = account['Name'] as String? ?? account['name'] as String? ?? 'Unknown';
    final type = account['Type'] as String? ?? account['type'] as String? ?? '';
    final industry = account['Industry'] as String? ?? account['industry'] as String? ?? '';
    final phone = account['Phone'] as String? ?? account['phone'] as String? ?? '';
    final initials = _getInitials(name);
    final typeColor = _getTypeColor(type);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? LuxuryColors.obsidian : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.grey.withValues(alpha: 0.15),
            ),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.3)
                    : Colors.black.withValues(alpha: 0.05),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header row
                Row(
                  children: [
                    // Avatar
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: typeColor.withValues(alpha: 0.15),
                      child: Text(
                        initials,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: typeColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    // Name and type
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            name,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (type.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: typeColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                type,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: typeColor,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    // Arrow
                    Icon(
                      Iconsax.arrow_right_3,
                      size: 18,
                      color: LuxuryColors.textMuted,
                    ),
                  ],
                ),

                // Industry
                if (industry.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Iconsax.building_4, size: 14, color: LuxuryColors.textMuted),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          industry,
                          style: TextStyle(
                            fontSize: 13,
                            color: LuxuryColors.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],

                // Phone
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Iconsax.call, size: 14, color: LuxuryColors.successGreen),
                      const SizedBox(width: 8),
                      Text(
                        phone,
                        style: TextStyle(
                          fontSize: 13,
                          color: LuxuryColors.successGreen,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Table view for accounts
class _AccountTable extends StatelessWidget {
  final List<Map<String, dynamic>> accounts;
  final bool isDark;
  final bool isTablet;
  final Function(String) onAccountTap;

  const _AccountTable({
    required this.accounts,
    required this.isDark,
    required this.isTablet,
    required this.onAccountTap,
  });

  String _getInitials(String name) {
    final words = name.split(' ').where((w) => w.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words[0][0].toUpperCase();
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'customer': return LuxuryColors.successGreen;
      case 'prospect': return LuxuryColors.infoCobalt;
      case 'partner': return LuxuryColors.champagneGold;
      default: return LuxuryColors.rolexGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 16, vertical: 8),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.grey.withValues(alpha: 0.15),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: isDark ? 0.15 : 0.08),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 44),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: Text(
                      'ACCOUNT',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: LuxuryColors.rolexGreen,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  if (isTablet)
                    Expanded(
                      flex: 2,
                      child: Text(
                        'INDUSTRY',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: LuxuryColors.rolexGreen,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  SizedBox(
                    width: 80,
                    child: Text(
                      'TYPE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: LuxuryColors.rolexGreen,
                        letterSpacing: 1,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ),
            // Rows
            ...accounts.asMap().entries.map((entry) {
              final index = entry.key;
              final account = entry.value;
              final isLast = index == accounts.length - 1;
              final name = account['Name'] as String? ?? account['name'] as String? ?? 'Unknown';
              final type = account['Type'] as String? ?? account['type'] as String? ?? '';
              final industry = account['Industry'] as String? ?? account['industry'] as String? ?? '';
              final id = account['Id'] as String? ?? account['id'] as String? ?? '';
              final typeColor = _getTypeColor(type);

              return Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => onAccountTap(id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      border: isLast
                          ? null
                          : Border(
                              bottom: BorderSide(
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.06)
                                    : Colors.grey.withValues(alpha: 0.1),
                              ),
                            ),
                    ),
                    child: Row(
                      children: [
                        // Avatar
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: typeColor.withValues(alpha: 0.15),
                          child: Text(
                            _getInitials(name),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: typeColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Name
                        Expanded(
                          flex: 3,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                name,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (!isTablet && industry.isNotEmpty)
                                Text(
                                  industry,
                                  style: TextStyle(fontSize: 11, color: LuxuryColors.textMuted),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                            ],
                          ),
                        ),
                        // Industry (tablet)
                        if (isTablet)
                          Expanded(
                            flex: 2,
                            child: Text(
                              industry.isNotEmpty ? industry : '-',
                              style: TextStyle(fontSize: 13, color: LuxuryColors.textMuted),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        // Type badge
                        Container(
                          width: 80,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: typeColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            type.isNotEmpty ? type : 'Other',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: typeColor,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ).animate(delay: Duration(milliseconds: 20 * index)).fadeIn(duration: 150.ms);
            }),
          ],
        ),
      ),
    );
  }
}
