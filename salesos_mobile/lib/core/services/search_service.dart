import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';
import 'crm_data_service.dart';
import '../../features/search/domain/models/saved_search.dart';

/// Search result item with entity type and data
class SearchResult {
  final String id;
  final String type; // lead, contact, opportunity, account, task
  final String title;
  final String? subtitle;
  final String? description;
  final Map<String, dynamic> data;

  SearchResult({
    required this.id,
    required this.type,
    required this.title,
    this.subtitle,
    this.description,
    required this.data,
  });
}

/// Search results grouped by entity type
class SearchResults {
  final List<SearchResult> leads;
  final List<SearchResult> contacts;
  final List<SearchResult> opportunities;
  final List<SearchResult> accounts;
  final List<SearchResult> tasks;
  final int totalCount;

  SearchResults({
    this.leads = const [],
    this.contacts = const [],
    this.opportunities = const [],
    this.accounts = const [],
    this.tasks = const [],
  }) : totalCount = leads.length + contacts.length + opportunities.length + accounts.length + tasks.length;

  bool get isEmpty => totalCount == 0;

  List<SearchResult> get all => [...leads, ...contacts, ...opportunities, ...accounts, ...tasks];
}

/// Provider for search service
final searchServiceProvider = Provider<SearchService>((ref) {
  return SearchService(ref);
});

/// Provider for recent searches (stored in memory)
final recentSearchesProvider = NotifierProvider<RecentSearchesNotifier, List<String>>(RecentSearchesNotifier.new);

/// Provider for saved searches (persisted in Hive)
final savedSearchesProvider = NotifierProvider<SavedSearchesNotifier, List<SavedSearch>>(SavedSearchesNotifier.new);

class RecentSearchesNotifier extends Notifier<List<String>> {
  @override
  List<String> build() => [];

  void addSearch(String query) {
    if (query.isEmpty || state.contains(query)) return;
    state = [query, ...state.take(9)].toList();
  }

  void removeSearch(String query) {
    state = state.where((s) => s != query).toList();
  }

  void clearSearches() => state = [];
}

/// Notifier for managing saved searches with Hive persistence
class SavedSearchesNotifier extends Notifier<List<SavedSearch>> {
  static const String _boxName = 'saved_searches';
  Box<String>? _box;

  @override
  List<SavedSearch> build() {
    _loadSavedSearches();
    return [];
  }

  /// Initialize and load saved searches from Hive
  Future<void> _loadSavedSearches() async {
    try {
      _box = await Hive.openBox<String>(_boxName);
      final searches = <SavedSearch>[];

      for (final key in _box!.keys) {
        try {
          final jsonString = _box!.get(key);
          if (jsonString != null) {
            searches.add(SavedSearch.fromJsonString(jsonString));
          }
        } catch (e) {
          // Skip invalid entries
        }
      }

      // Sort by last used date (most recent first)
      searches.sort((a, b) => b.lastUsedAt.compareTo(a.lastUsedAt));
      state = searches;
    } catch (e) {
      state = [];
    }
  }

  /// Ensure the box is open
  Future<Box<String>> _ensureBoxOpen() async {
    if (_box == null || !_box!.isOpen) {
      _box = await Hive.openBox<String>(_boxName);
    }
    return _box!;
  }

  /// Save a new search
  Future<SavedSearch> saveSearch({
    required String name,
    required String query,
    Map<String, dynamic> filters = const {},
    String? iconName,
  }) async {
    final box = await _ensureBoxOpen();

    final savedSearch = SavedSearch(
      id: const Uuid().v4(),
      name: name,
      query: query,
      filters: filters,
      iconName: iconName,
    );

    await box.put(savedSearch.id, savedSearch.toJsonString());

    // Add to state and sort by last used
    final newState = [savedSearch, ...state];
    newState.sort((a, b) => b.lastUsedAt.compareTo(a.lastUsedAt));
    state = newState;

    return savedSearch;
  }

  /// Delete a saved search by ID
  Future<void> deleteSavedSearch(String id) async {
    final box = await _ensureBoxOpen();
    await box.delete(id);
    state = state.where((s) => s.id != id).toList();
  }

  /// Update the last used timestamp and use count when a search is applied
  Future<void> markSearchAsUsed(String id) async {
    final box = await _ensureBoxOpen();

    final index = state.indexWhere((s) => s.id == id);
    if (index == -1) return;

    final updatedSearch = state[index].copyWith(
      lastUsedAt: DateTime.now(),
      useCount: state[index].useCount + 1,
    );

    await box.put(id, updatedSearch.toJsonString());

    final newState = List<SavedSearch>.from(state);
    newState[index] = updatedSearch;
    newState.sort((a, b) => b.lastUsedAt.compareTo(a.lastUsedAt));
    state = newState;
  }

  /// Update a saved search
  Future<void> updateSavedSearch(SavedSearch search) async {
    final box = await _ensureBoxOpen();
    await box.put(search.id, search.toJsonString());

    final index = state.indexWhere((s) => s.id == search.id);
    if (index != -1) {
      final newState = List<SavedSearch>.from(state);
      newState[index] = search;
      state = newState;
    }
  }

  /// Check if a search with the same query and filters already exists
  bool searchExists(String query, Map<String, dynamic> filters) {
    return state.any((s) =>
      s.query.toLowerCase() == query.toLowerCase() &&
      _mapsEqual(s.filters, filters)
    );
  }

  bool _mapsEqual(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      if (!b.containsKey(key) || a[key] != b[key]) return false;
    }
    return true;
  }

  /// Get saved searches count
  int get count => state.length;

  /// Clear all saved searches
  Future<void> clearAll() async {
    final box = await _ensureBoxOpen();
    await box.clear();
    state = [];
  }
}

/// Search service for global CRM search
class SearchService {
  final Ref _ref;

  SearchService(this._ref);

  CrmDataService get _crmService => _ref.read(crmDataServiceProvider);

  /// Perform global search across all CRM entities
  Future<SearchResults> search(String query) async {
    if (query.trim().isEmpty) {
      return SearchResults();
    }

    final normalizedQuery = query.toLowerCase().trim();

    try {
      // Fetch all data in parallel
      final results = await Future.wait([
        _crmService.getLeads(),
        _crmService.getContacts(),
        _crmService.getOpportunities(),
        _crmService.getAccounts(),
        _crmService.getTasks(),
      ]);

      final leads = results[0];
      final contacts = results[1];
      final opportunities = results[2];
      final accounts = results[3];
      final tasks = results[4];

      // Search and filter each entity type
      final leadResults = _searchLeads(leads, normalizedQuery);
      final contactResults = _searchContacts(contacts, normalizedQuery);
      final opportunityResults = _searchOpportunities(opportunities, normalizedQuery);
      final accountResults = _searchAccounts(accounts, normalizedQuery);
      final taskResults = _searchTasks(tasks, normalizedQuery);

      return SearchResults(
        leads: leadResults,
        contacts: contactResults,
        opportunities: opportunityResults,
        accounts: accountResults,
        tasks: taskResults,
      );
    } catch (e) {
      return SearchResults();
    }
  }

  List<SearchResult> _searchLeads(List<Map<String, dynamic>> leads, String query) {
    return leads.where((lead) {
      final firstName = (lead['FirstName'] as String? ?? lead['firstName'] as String? ?? '').toLowerCase();
      final lastName = (lead['LastName'] as String? ?? lead['lastName'] as String? ?? '').toLowerCase();
      final company = (lead['Company'] as String? ?? lead['company'] as String? ?? '').toLowerCase();
      final email = (lead['Email'] as String? ?? lead['email'] as String? ?? '').toLowerCase();
      final title = (lead['Title'] as String? ?? lead['title'] as String? ?? '').toLowerCase();

      return firstName.contains(query) ||
          lastName.contains(query) ||
          '$firstName $lastName'.contains(query) ||
          company.contains(query) ||
          email.contains(query) ||
          title.contains(query);
    }).map((lead) {
      final firstName = lead['FirstName'] as String? ?? lead['firstName'] as String? ?? '';
      final lastName = lead['LastName'] as String? ?? lead['lastName'] as String? ?? '';
      final company = lead['Company'] as String? ?? lead['company'] as String?;
      final title = lead['Title'] as String? ?? lead['title'] as String?;

      return SearchResult(
        id: lead['Id'] as String? ?? lead['id'] as String? ?? '',
        type: 'lead',
        title: '$firstName $lastName'.trim(),
        subtitle: company,
        description: title,
        data: lead,
      );
    }).take(10).toList();
  }

  List<SearchResult> _searchContacts(List<Map<String, dynamic>> contacts, String query) {
    return contacts.where((contact) {
      final firstName = (contact['FirstName'] as String? ?? contact['firstName'] as String? ?? '').toLowerCase();
      final lastName = (contact['LastName'] as String? ?? contact['lastName'] as String? ?? '').toLowerCase();
      final email = (contact['Email'] as String? ?? contact['email'] as String? ?? '').toLowerCase();
      final phone = (contact['Phone'] as String? ?? contact['phone'] as String? ?? '').toLowerCase();
      final accountName = (contact['Account']?['Name'] as String? ?? '').toLowerCase();

      return firstName.contains(query) ||
          lastName.contains(query) ||
          '$firstName $lastName'.contains(query) ||
          email.contains(query) ||
          phone.contains(query) ||
          accountName.contains(query);
    }).map((contact) {
      final firstName = contact['FirstName'] as String? ?? contact['firstName'] as String? ?? '';
      final lastName = contact['LastName'] as String? ?? contact['lastName'] as String? ?? '';
      final account = contact['Account'] as Map<String, dynamic>?;
      final accountName = account?['Name'] as String?;
      final title = contact['Title'] as String? ?? contact['title'] as String?;

      return SearchResult(
        id: contact['Id'] as String? ?? contact['id'] as String? ?? '',
        type: 'contact',
        title: '$firstName $lastName'.trim(),
        subtitle: accountName,
        description: title,
        data: contact,
      );
    }).take(10).toList();
  }

  List<SearchResult> _searchOpportunities(List<Map<String, dynamic>> opportunities, String query) {
    return opportunities.where((opp) {
      final name = (opp['Name'] as String? ?? opp['name'] as String? ?? '').toLowerCase();
      final accountName = (opp['Account']?['Name'] as String? ?? '').toLowerCase();
      final stage = (opp['StageName'] as String? ?? opp['stageName'] as String? ?? '').toLowerCase();

      return name.contains(query) || accountName.contains(query) || stage.contains(query);
    }).map((opp) {
      final name = opp['Name'] as String? ?? opp['name'] as String? ?? 'Opportunity';
      final account = opp['Account'] as Map<String, dynamic>?;
      final accountName = account?['Name'] as String?;
      final stage = opp['StageName'] as String? ?? opp['stageName'] as String?;
      final amount = opp['Amount'] as num?;

      String? subtitle;
      if (accountName != null) {
        subtitle = accountName;
      }
      if (amount != null) {
        final amountStr = _formatCurrency(amount.toDouble());
        subtitle = subtitle != null ? '$subtitle • $amountStr' : amountStr;
      }

      return SearchResult(
        id: opp['Id'] as String? ?? opp['id'] as String? ?? '',
        type: 'opportunity',
        title: name,
        subtitle: subtitle,
        description: stage,
        data: opp,
      );
    }).take(10).toList();
  }

  List<SearchResult> _searchAccounts(List<Map<String, dynamic>> accounts, String query) {
    return accounts.where((account) {
      final name = (account['Name'] as String? ?? account['name'] as String? ?? '').toLowerCase();
      final industry = (account['Industry'] as String? ?? account['industry'] as String? ?? '').toLowerCase();
      final city = (account['BillingCity'] as String? ?? account['city'] as String? ?? '').toLowerCase();

      return name.contains(query) || industry.contains(query) || city.contains(query);
    }).map((account) {
      final name = account['Name'] as String? ?? account['name'] as String? ?? 'Account';
      final industry = account['Industry'] as String? ?? account['industry'] as String?;
      final city = account['BillingCity'] as String? ?? account['city'] as String?;
      final state = account['BillingState'] as String? ?? account['state'] as String?;

      String? location;
      if (city != null && state != null) {
        location = '$city, $state';
      } else if (city != null) {
        location = city;
      }

      return SearchResult(
        id: account['Id'] as String? ?? account['id'] as String? ?? '',
        type: 'account',
        title: name,
        subtitle: industry,
        description: location,
        data: account,
      );
    }).take(10).toList();
  }

  List<SearchResult> _searchTasks(List<Map<String, dynamic>> tasks, String query) {
    return tasks.where((task) {
      final subject = (task['Subject'] as String? ?? task['subject'] as String? ?? '').toLowerCase();
      final description = (task['Description'] as String? ?? task['description'] as String? ?? '').toLowerCase();
      final relatedTo = (task['What']?['Name'] as String? ?? task['relatedTo'] as String? ?? '').toLowerCase();

      return subject.contains(query) || description.contains(query) || relatedTo.contains(query);
    }).map((task) {
      final subject = task['Subject'] as String? ?? task['subject'] as String? ?? 'Task';
      final status = task['Status'] as String? ?? task['status'] as String?;
      final relatedTo = task['What']?['Name'] as String? ?? task['relatedTo'] as String?;
      final dueDate = task['ActivityDate'] as String? ?? task['dueDate'] as String?;

      String? subtitle;
      if (relatedTo != null) {
        subtitle = relatedTo;
      }
      if (dueDate != null) {
        subtitle = subtitle != null ? '$subtitle • Due: $dueDate' : 'Due: $dueDate';
      }

      return SearchResult(
        id: task['Id'] as String? ?? task['id'] as String? ?? '',
        type: 'task',
        title: subject,
        subtitle: subtitle,
        description: status,
        data: task,
      );
    }).take(10).toList();
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '\$${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}K';
    } else {
      return '\$${value.toStringAsFixed(0)}';
    }
  }
}
