import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/search_service.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/filter_pill_tabs.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../../../core/providers/connectivity_provider.dart';
import '../../domain/models/saved_search.dart';

/// Search state provider
final searchQueryProvider = NotifierProvider<SearchQueryNotifier, String>(SearchQueryNotifier.new);

class SearchQueryNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setQuery(String query) => state = query;
  void clear() => state = '';
}

/// Search results provider with debouncing
final searchResultsProvider = FutureProvider.autoDispose<SearchResults>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.trim().isEmpty) {
    return SearchResults();
  }

  // Debounce - wait for user to stop typing
  await Future.delayed(const Duration(milliseconds: 300));

  // Check if query changed during delay
  if (ref.read(searchQueryProvider) != query) {
    throw Exception('Query changed');
  }

  final searchService = ref.read(searchServiceProvider);
  return searchService.search(query);
});

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  Timer? _debounceTimer;
  String _selectedEntityFilter = 'All'; // All, Leads, Contacts, Deals, Accounts, Tasks

  @override
  void initState() {
    super.initState();
    // Auto-focus search field
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      ref.read(searchQueryProvider.notifier).setQuery(value);

      // Add to recent searches if not empty
      if (value.trim().isNotEmpty && value.trim().length > 2) {
        ref.read(recentSearchesProvider.notifier).addSearch(value.trim());
      }
    });
  }

  void _clearSearch() {
    _searchController.clear();
    ref.read(searchQueryProvider.notifier).clear();
    _focusNode.requestFocus();
  }

  void _onRecentSearchTap(String query) {
    _searchController.text = query;
    ref.read(searchQueryProvider.notifier).setQuery(query);
  }

  /// Apply a saved search
  void _onSavedSearchTap(SavedSearch savedSearch) {
    HapticFeedback.lightImpact();
    _searchController.text = savedSearch.query;
    ref.read(searchQueryProvider.notifier).setQuery(savedSearch.query);

    // Apply the entity filter if present
    final entityFilter = savedSearch.filters['entityType'] as String?;
    if (entityFilter != null) {
      setState(() => _selectedEntityFilter = entityFilter);
    }

    // Mark the search as used
    ref.read(savedSearchesProvider.notifier).markSearchAsUsed(savedSearch.id);
  }

  /// Show dialog to save current search
  Future<void> _showSaveSearchDialog() async {
    final query = ref.read(searchQueryProvider);
    if (query.isEmpty) return;

    final filters = <String, dynamic>{};
    if (_selectedEntityFilter != 'All') {
      filters['entityType'] = _selectedEntityFilter;
    }

    // Check if already saved
    if (ref.read(savedSearchesProvider.notifier).searchExists(query, filters)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('This search is already saved'),
          backgroundColor: IrisTheme.warning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final nameController = TextEditingController(text: query);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Iconsax.save_2, size: 20, color: LuxuryColors.rolexGreen),
            ),
            const SizedBox(width: 12),
            Text(
              'Save Search',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Give this search a name',
              style: IrisTheme.bodySmall.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              autofocus: true,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
              cursorColor: LuxuryColors.rolexGreen,
              decoration: InputDecoration(
                hintText: 'Search name',
                hintStyle: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
                filled: true,
                fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: LuxuryColors.rolexGreen,
                    width: 2,
                  ),
                ),
              ),
            ),
            if (_selectedEntityFilter != 'All') ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: LuxuryColors.jadePremium.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Iconsax.filter, size: 14, color: LuxuryColors.jadePremium),
                    const SizedBox(width: 6),
                    Text(
                      'Filter: $_selectedEntityFilter',
                      style: IrisTheme.labelSmall.copyWith(color: LuxuryColors.jadePremium),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, nameController.text),
            child: Text(
              'Save',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.rolexGreen,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      HapticFeedback.mediumImpact();
      await ref.read(savedSearchesProvider.notifier).saveSearch(
        name: result,
        query: query,
        filters: filters,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Iconsax.tick_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text('Search saved'),
              ],
            ),
            backgroundColor: LuxuryColors.rolexGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// Delete a saved search with confirmation
  Future<void> _deleteSavedSearch(SavedSearch savedSearch) async {
    HapticFeedback.mediumImpact();
    await ref.read(savedSearchesProvider.notifier).deleteSavedSearch(savedSearch.id);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Search "${savedSearch.name}" deleted'),
          backgroundColor: IrisTheme.error,
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'Undo',
            textColor: Colors.white,
            onPressed: () async {
              // Re-save the deleted search
              await ref.read(savedSearchesProvider.notifier).saveSearch(
                name: savedSearch.name,
                query: savedSearch.query,
                filters: savedSearch.filters,
              );
            },
          ),
        ),
      );
    }
  }

  void _navigateToResult(SearchResult result) {
    HapticFeedback.lightImpact();
    switch (result.type) {
      case 'lead':
        context.push('${AppRoutes.leads}/${result.id}');
        break;
      case 'contact':
        context.push('${AppRoutes.contacts}/${result.id}');
        break;
      case 'opportunity':
        context.push('${AppRoutes.deals}/${result.id}');
        break;
      case 'account':
        context.push('${AppRoutes.accounts}/${result.id}');
        break;
      case 'task':
        context.go(AppRoutes.tasks);
        break;
    }
  }

  /// Filter search results by selected entity type
  SearchResults _filterResultsByEntity(SearchResults results) {
    if (_selectedEntityFilter == 'All') {
      return results;
    }

    return SearchResults(
      leads: _selectedEntityFilter == 'Leads' ? results.leads : [],
      contacts: _selectedEntityFilter == 'Contacts' ? results.contacts : [],
      opportunities: _selectedEntityFilter == 'Deals' ? results.opportunities : [],
      accounts: _selectedEntityFilter == 'Accounts' ? results.accounts : [],
      tasks: _selectedEntityFilter == 'Tasks' ? results.tasks : [],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final query = ref.watch(searchQueryProvider);
    final resultsAsync = ref.watch(searchResultsProvider);
    final recentSearches = ref.watch(recentSearchesProvider);
    final savedSearches = ref.watch(savedSearchesProvider);

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
              },
            ),

            // Search Header
            Container(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
              decoration: BoxDecoration(
                color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Back button
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: Icon(
                      Iconsax.arrow_left,
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),

                  // Search field
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      focusNode: _focusNode,
                      onChanged: _onSearchChanged,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                      cursorColor: LuxuryColors.rolexGreen,
                      decoration: InputDecoration(
                        hintText: 'Search leads, contacts, deals...',
                        hintStyle: IrisTheme.bodyMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        prefixIcon: Icon(
                          Iconsax.search_normal,
                          size: 20,
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        suffixIcon: query.isNotEmpty
                            ? IconButton(
                                onPressed: _clearSearch,
                                icon: Icon(
                                  Iconsax.close_circle,
                                  size: 20,
                                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                                ),
                              )
                            : null,
                        filled: true,
                        fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: LuxuryColors.rolexGreen,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Save Search Button (only shown when query is not empty)
                  if (query.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: _showSaveSearchDialog,
                      tooltip: 'Save Search',
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Iconsax.save_2,
                          size: 18,
                          color: LuxuryColors.rolexGreen,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ).animate().fadeIn(duration: 200.ms),

            // Entity Filter Pills (only shown when there are results or searching)
            if (query.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: FilterPillTabs<String>(
                  items: const [
                    FilterPillItem(value: 'All', label: 'All', icon: Iconsax.search_normal_1),
                    FilterPillItem(value: 'Leads', label: 'Leads', icon: Iconsax.profile_2user),
                    FilterPillItem(value: 'Contacts', label: 'Contacts', icon: Iconsax.user),
                    FilterPillItem(value: 'Deals', label: 'Deals', icon: Iconsax.dollar_circle),
                    FilterPillItem(value: 'Accounts', label: 'Accounts', icon: Iconsax.building),
                  ],
                  selectedValue: _selectedEntityFilter,
                  onSelected: (value) {
                    HapticFeedback.lightImpact();
                    setState(() => _selectedEntityFilter = value);
                  },
                  padding: EdgeInsets.zero,
                ),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

            // Content
            Expanded(
              child: query.isEmpty
                  ? _buildEmptyState(isDark, recentSearches, savedSearches)
                  : resultsAsync.when(
                      loading: () => _buildLoadingState(isDark),
                      error: (e, _) => _buildEmptyState(isDark, recentSearches, savedSearches),
                      data: (results) => _filterResultsByEntity(results).isEmpty
                          ? _buildNoResults(isDark, query)
                          : _buildResults(isDark, _filterResultsByEntity(results)),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark, List<String> recentSearches, List<SavedSearch> savedSearches) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Saved Searches section
          if (savedSearches.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Iconsax.save_2,
                      size: 18,
                      color: LuxuryColors.rolexGreen,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Saved Searches',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    savedSearches.length.toString(),
                    style: IrisTheme.labelSmall.copyWith(
                      color: LuxuryColors.rolexGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...savedSearches.take(5).toList().asMap().entries.map((entry) {
              return _SavedSearchTile(
                savedSearch: entry.value,
                onTap: () => _onSavedSearchTap(entry.value),
                onDelete: () => _deleteSavedSearch(entry.value),
              ).animate(delay: (entry.key * 50).ms).fadeIn().slideX(begin: 0.03);
            }),
            const SizedBox(height: 24),
          ],

          // Recent searches
          if (recentSearches.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Searches',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    ref.read(recentSearchesProvider.notifier).clearSearches();
                  },
                  child: Text(
                    'Clear',
                    style: IrisTheme.labelMedium.copyWith(color: LuxuryColors.jadePremium),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: recentSearches.map((search) {
                return GestureDetector(
                  onTap: () => _onRecentSearchTap(search),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Iconsax.clock,
                          size: 14,
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          search,
                          style: IrisTheme.labelMedium.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ).animate().fadeIn(delay: 100.ms),
            const SizedBox(height: 32),
          ],

          // Search suggestions
          Text(
            'Search For',
            style: IrisTheme.titleSmall.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 16),
          _SearchCategoryTile(
            icon: Iconsax.profile_2user,
            title: 'Leads',
            subtitle: 'Search by name, company, or email',
            color: IrisTheme.info,
            onTap: () {
              _searchController.text = '';
              _focusNode.requestFocus();
            },
          ).animate(delay: 150.ms).fadeIn().slideX(begin: 0.05),
          _SearchCategoryTile(
            icon: Iconsax.user,
            title: 'Contacts',
            subtitle: 'Find contacts by name or account',
            color: IrisTheme.success,
            onTap: () {
              _searchController.text = '';
              _focusNode.requestFocus();
            },
          ).animate(delay: 200.ms).fadeIn().slideX(begin: 0.05),
          _SearchCategoryTile(
            icon: Iconsax.dollar_circle,
            title: 'Opportunities',
            subtitle: 'Search deals by name or account',
            color: LuxuryColors.rolexGreen,
            onTap: () {
              _searchController.text = '';
              _focusNode.requestFocus();
            },
          ).animate(delay: 250.ms).fadeIn().slideX(begin: 0.05),
          _SearchCategoryTile(
            icon: Iconsax.building,
            title: 'Accounts',
            subtitle: 'Find accounts by name or industry',
            color: IrisTheme.warning,
            onTap: () {
              _searchController.text = '';
              _focusNode.requestFocus();
            },
          ).animate(delay: 300.ms).fadeIn().slideX(begin: 0.05),
          _SearchCategoryTile(
            icon: Iconsax.task_square,
            title: 'Tasks',
            subtitle: 'Search tasks by subject',
            color: IrisTheme.error,
            onTap: () {
              _searchController.text = '';
              _focusNode.requestFocus();
            },
          ).animate(delay: 350.ms).fadeIn().slideX(begin: 0.05),
        ],
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 40,
            height: 40,
            child: CircularProgressIndicator(
              color: LuxuryColors.jadePremium,
              strokeWidth: 3,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Searching...',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoResults(bool isDark, String query) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Iconsax.search_status,
            size: 64,
            color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
          ),
          const SizedBox(height: 16),
          Text(
            'No results found',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'No matches for "$query"',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try searching with different keywords',
            style: IrisTheme.bodySmall.copyWith(
              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
            ),
          ),
        ],
      ).animate().fadeIn(delay: 200.ms),
    );
  }

  Widget _buildResults(bool isDark, SearchResults results) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Results summary
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Text(
            '${results.totalCount} result${results.totalCount != 1 ? 's' : ''} found',
            style: IrisTheme.labelMedium.copyWith(
              color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
            ),
          ),
        ).animate().fadeIn(),

        // Leads
        if (results.leads.isNotEmpty) ...[
          _ResultSection(
            title: 'Leads',
            icon: Iconsax.profile_2user,
            color: IrisTheme.info,
            count: results.leads.length,
          ),
          ...results.leads.asMap().entries.map((entry) {
            return _ResultCard(
              result: entry.value,
              onTap: () => _navigateToResult(entry.value),
            ).animate(delay: (entry.key * 50).ms).fadeIn().slideX(begin: 0.03);
          }),
          const SizedBox(height: 16),
        ],

        // Contacts
        if (results.contacts.isNotEmpty) ...[
          _ResultSection(
            title: 'Contacts',
            icon: Iconsax.user,
            color: IrisTheme.success,
            count: results.contacts.length,
          ),
          ...results.contacts.asMap().entries.map((entry) {
            return _ResultCard(
              result: entry.value,
              onTap: () => _navigateToResult(entry.value),
            ).animate(delay: (entry.key * 50).ms).fadeIn().slideX(begin: 0.03);
          }),
          const SizedBox(height: 16),
        ],

        // Opportunities
        if (results.opportunities.isNotEmpty) ...[
          _ResultSection(
            title: 'Opportunities',
            icon: Iconsax.dollar_circle,
            color: LuxuryColors.rolexGreen,
            count: results.opportunities.length,
          ),
          ...results.opportunities.asMap().entries.map((entry) {
            return _ResultCard(
              result: entry.value,
              onTap: () => _navigateToResult(entry.value),
            ).animate(delay: (entry.key * 50).ms).fadeIn().slideX(begin: 0.03);
          }),
          const SizedBox(height: 16),
        ],

        // Accounts
        if (results.accounts.isNotEmpty) ...[
          _ResultSection(
            title: 'Accounts',
            icon: Iconsax.building,
            color: IrisTheme.warning,
            count: results.accounts.length,
          ),
          ...results.accounts.asMap().entries.map((entry) {
            return _ResultCard(
              result: entry.value,
              onTap: () => _navigateToResult(entry.value),
            ).animate(delay: (entry.key * 50).ms).fadeIn().slideX(begin: 0.03);
          }),
          const SizedBox(height: 16),
        ],

        // Tasks
        if (results.tasks.isNotEmpty) ...[
          _ResultSection(
            title: 'Tasks',
            icon: Iconsax.task_square,
            color: IrisTheme.error,
            count: results.tasks.length,
          ),
          ...results.tasks.asMap().entries.map((entry) {
            return _ResultCard(
              result: entry.value,
              onTap: () => _navigateToResult(entry.value),
            ).animate(delay: (entry.key * 50).ms).fadeIn().slideX(begin: 0.03);
          }),
        ],

        const SizedBox(height: 32),
      ],
    );
  }
}

class _SearchCategoryTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _SearchCategoryTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                ),
                Text(
                  subtitle,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
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

class _ResultSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final int count;

  const _ResultSection({
    required this.title,
    required this.icon,
    required this.color,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Text(
            title,
            style: IrisTheme.labelLarge.copyWith(
              color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              count.toString(),
              style: IrisTheme.labelSmall.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final SearchResult result;
  final VoidCallback onTap;

  const _ResultCard({
    required this.result,
    required this.onTap,
  });

  IconData get _typeIcon {
    switch (result.type) {
      case 'lead':
        return Iconsax.profile_2user;
      case 'contact':
        return Iconsax.user;
      case 'opportunity':
        return Iconsax.dollar_circle;
      case 'account':
        return Iconsax.building;
      case 'task':
        return Iconsax.task_square;
      default:
        return Iconsax.document;
    }
  }

  Color get _typeColor {
    switch (result.type) {
      case 'lead':
        return IrisTheme.info;
      case 'contact':
        return IrisTheme.success;
      case 'opportunity':
        return LuxuryColors.rolexGreen;
      case 'account':
        return IrisTheme.warning;
      case 'task':
        return IrisTheme.error;
      default:
        return IrisTheme.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IrisCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      onTap: onTap,
      child: Row(
        children: [
          // Icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _typeColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(_typeIcon, size: 18, color: _typeColor),
          ),
          const SizedBox(width: 12),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.title,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (result.subtitle != null || result.description != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    [result.subtitle, result.description].where((s) => s != null).join(' • '),
                    style: IrisTheme.bodySmall.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Arrow
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

/// Saved search tile widget with swipe-to-delete
class _SavedSearchTile extends StatelessWidget {
  final SavedSearch savedSearch;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _SavedSearchTile({
    required this.savedSearch,
    required this.onTap,
    required this.onDelete,
  });

  IconData get _entityIcon {
    final entityType = savedSearch.filters['entityType'] as String?;
    switch (entityType) {
      case 'Leads':
        return Iconsax.profile_2user;
      case 'Contacts':
        return Iconsax.user;
      case 'Deals':
        return Iconsax.dollar_circle;
      case 'Accounts':
        return Iconsax.building;
      case 'Tasks':
        return Iconsax.task_square;
      default:
        return Iconsax.search_normal_1;
    }
  }

  Color get _entityColor {
    final entityType = savedSearch.filters['entityType'] as String?;
    switch (entityType) {
      case 'Leads':
        return IrisTheme.info;
      case 'Contacts':
        return IrisTheme.success;
      case 'Deals':
        return LuxuryColors.rolexGreen;
      case 'Accounts':
        return IrisTheme.warning;
      case 'Tasks':
        return IrisTheme.error;
      default:
        return LuxuryColors.rolexGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dismissible(
      key: Key(savedSearch.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: IrisTheme.error,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(
          Iconsax.trash,
          color: Colors.white,
          size: 22,
        ),
      ),
      confirmDismiss: (direction) async {
        HapticFeedback.mediumImpact();
        return true;
      },
      onDismissed: (direction) => onDelete(),
      child: IrisCard(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        onTap: onTap,
        child: Row(
          children: [
            // Icon
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _entityColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(_entityIcon, size: 18, color: _entityColor),
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    savedSearch.name,
                    style: IrisTheme.titleSmall.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      // Query
                      Flexible(
                        child: Text(
                          savedSearch.displayDescription,
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      // Use count badge
                      if (savedSearch.useCount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.1)
                                : Colors.black.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${savedSearch.useCount}x',
                            style: IrisTheme.labelSmall.copyWith(
                              color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Play/Apply icon
            Icon(
              Iconsax.play,
              size: 16,
              color: LuxuryColors.jadePremium,
            ),
          ],
        ),
      ),
    );
  }
}
