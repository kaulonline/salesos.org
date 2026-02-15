import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Keys for storing preferences
class PreferenceKeys {
  static const String defaultLeadSource = 'default_lead_source';
  static const String defaultLeadStatus = 'default_lead_status';
  static const String defaultTaskPriority = 'default_task_priority';
  static const String defaultDealStage = 'default_deal_stage';
  static const String defaultCurrency = 'default_currency';
  static const String recentAccounts = 'recent_accounts';
  static const String recentContacts = 'recent_contacts';
  static const String recentLeadSources = 'recent_lead_sources';
  static const String recentIndustries = 'recent_industries';
  static const String userDefaults = 'user_defaults';
  // View preferences
  static const String viewPreferences = 'view_preferences';
}

/// View type enum for list/table toggle
enum ListViewType { card, table }

/// View preferences for different pages
class ViewPreferences {
  final ListViewType leadsView;
  final ListViewType contactsView;
  final ListViewType accountsView;
  final ListViewType tasksView;
  final ListViewType notesView;
  final ListViewType dealsView;

  const ViewPreferences({
    this.leadsView = ListViewType.card,
    this.contactsView = ListViewType.card,
    this.accountsView = ListViewType.card,
    this.tasksView = ListViewType.card,
    this.notesView = ListViewType.table, // Notes default to table
    this.dealsView = ListViewType.card,
  });

  Map<String, dynamic> toJson() => {
        'leadsView': leadsView.name,
        'contactsView': contactsView.name,
        'accountsView': accountsView.name,
        'tasksView': tasksView.name,
        'notesView': notesView.name,
        'dealsView': dealsView.name,
      };

  factory ViewPreferences.fromJson(Map<String, dynamic> json) => ViewPreferences(
        leadsView: _parseViewType(json['leadsView']),
        contactsView: _parseViewType(json['contactsView']),
        accountsView: _parseViewType(json['accountsView']),
        tasksView: _parseViewType(json['tasksView']),
        notesView: _parseViewType(json['notesView'], defaultValue: ListViewType.table),
        dealsView: _parseViewType(json['dealsView']),
      );

  static ListViewType _parseViewType(String? value, {ListViewType defaultValue = ListViewType.card}) {
    if (value == 'table') return ListViewType.table;
    if (value == 'card') return ListViewType.card;
    return defaultValue;
  }

  ViewPreferences copyWith({
    ListViewType? leadsView,
    ListViewType? contactsView,
    ListViewType? accountsView,
    ListViewType? tasksView,
    ListViewType? notesView,
    ListViewType? dealsView,
  }) =>
      ViewPreferences(
        leadsView: leadsView ?? this.leadsView,
        contactsView: contactsView ?? this.contactsView,
        accountsView: accountsView ?? this.accountsView,
        tasksView: tasksView ?? this.tasksView,
        notesView: notesView ?? this.notesView,
        dealsView: dealsView ?? this.dealsView,
      );
}

/// Represents a recent entity selection
class RecentEntity {
  final String id;
  final String name;
  final DateTime timestamp;

  RecentEntity({
    required this.id,
    required this.name,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'timestamp': timestamp.toIso8601String(),
      };

  factory RecentEntity.fromJson(Map<String, dynamic> json) => RecentEntity(
        id: json['id'] as String,
        name: json['name'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
      );
}

/// User preferences and defaults
class UserDefaults {
  final String? defaultLeadSource;
  final String? defaultLeadStatus;
  final String? defaultTaskPriority;
  final String? defaultDealStage;
  final String? defaultCurrency;
  final String? defaultTimezone;
  final String? defaultCountry;

  UserDefaults({
    this.defaultLeadSource,
    this.defaultLeadStatus,
    this.defaultTaskPriority,
    this.defaultDealStage,
    this.defaultCurrency,
    this.defaultTimezone,
    this.defaultCountry,
  });

  Map<String, dynamic> toJson() => {
        'defaultLeadSource': defaultLeadSource,
        'defaultLeadStatus': defaultLeadStatus,
        'defaultTaskPriority': defaultTaskPriority,
        'defaultDealStage': defaultDealStage,
        'defaultCurrency': defaultCurrency,
        'defaultTimezone': defaultTimezone,
        'defaultCountry': defaultCountry,
      };

  factory UserDefaults.fromJson(Map<String, dynamic> json) => UserDefaults(
        defaultLeadSource: json['defaultLeadSource'] as String?,
        defaultLeadStatus: json['defaultLeadStatus'] as String?,
        defaultTaskPriority: json['defaultTaskPriority'] as String?,
        defaultDealStage: json['defaultDealStage'] as String?,
        defaultCurrency: json['defaultCurrency'] as String?,
        defaultTimezone: json['defaultTimezone'] as String?,
        defaultCountry: json['defaultCountry'] as String?,
      );

  UserDefaults copyWith({
    String? defaultLeadSource,
    String? defaultLeadStatus,
    String? defaultTaskPriority,
    String? defaultDealStage,
    String? defaultCurrency,
    String? defaultTimezone,
    String? defaultCountry,
  }) =>
      UserDefaults(
        defaultLeadSource: defaultLeadSource ?? this.defaultLeadSource,
        defaultLeadStatus: defaultLeadStatus ?? this.defaultLeadStatus,
        defaultTaskPriority: defaultTaskPriority ?? this.defaultTaskPriority,
        defaultDealStage: defaultDealStage ?? this.defaultDealStage,
        defaultCurrency: defaultCurrency ?? this.defaultCurrency,
        defaultTimezone: defaultTimezone ?? this.defaultTimezone,
        defaultCountry: defaultCountry ?? this.defaultCountry,
      );
}

/// Service for managing user preferences and defaults
class UserPreferencesService {
  final SharedPreferences _prefs;

  UserPreferencesService(this._prefs);

  // ============ View Preferences ============

  /// Get view preferences
  ViewPreferences getViewPreferences() {
    try {
      final json = _prefs.getString(PreferenceKeys.viewPreferences);
      if (json != null) {
        return ViewPreferences.fromJson(jsonDecode(json));
      }
    } catch (e) {
      // Silently ignore
    }
    return const ViewPreferences();
  }

  /// Save view preferences
  Future<void> saveViewPreferences(ViewPreferences prefs) async {
    await _prefs.setString(
      PreferenceKeys.viewPreferences,
      jsonEncode(prefs.toJson()),
    );
  }

  /// Toggle view type for a specific page
  Future<ViewPreferences> toggleViewType(String page) async {
    final current = getViewPreferences();
    ViewPreferences updated;

    switch (page) {
      case 'leads':
        updated = current.copyWith(
          leadsView: current.leadsView == ListViewType.card
              ? ListViewType.table
              : ListViewType.card,
        );
        break;
      case 'contacts':
        updated = current.copyWith(
          contactsView: current.contactsView == ListViewType.card
              ? ListViewType.table
              : ListViewType.card,
        );
        break;
      case 'accounts':
        updated = current.copyWith(
          accountsView: current.accountsView == ListViewType.card
              ? ListViewType.table
              : ListViewType.card,
        );
        break;
      case 'tasks':
        updated = current.copyWith(
          tasksView: current.tasksView == ListViewType.card
              ? ListViewType.table
              : ListViewType.card,
        );
        break;
      case 'notes':
        updated = current.copyWith(
          notesView: current.notesView == ListViewType.card
              ? ListViewType.table
              : ListViewType.card,
        );
        break;
      case 'deals':
        updated = current.copyWith(
          dealsView: current.dealsView == ListViewType.card
              ? ListViewType.table
              : ListViewType.card,
        );
        break;
      default:
        return current;
    }

    await saveViewPreferences(updated);
    return updated;
  }

  /// Check if table view is enabled for a specific page
  bool isTableView(String page) {
    final prefs = getViewPreferences();
    switch (page) {
      case 'leads':
        return prefs.leadsView == ListViewType.table;
      case 'contacts':
        return prefs.contactsView == ListViewType.table;
      case 'accounts':
        return prefs.accountsView == ListViewType.table;
      case 'tasks':
        return prefs.tasksView == ListViewType.table;
      case 'notes':
        return prefs.notesView == ListViewType.table;
      case 'deals':
        return prefs.dealsView == ListViewType.table;
      default:
        return false;
    }
  }

  // ============ User Defaults ============

  /// Get user defaults
  UserDefaults getDefaults() {
    try {
      final json = _prefs.getString(PreferenceKeys.userDefaults);
      if (json != null) {
        return UserDefaults.fromJson(jsonDecode(json));
      }
    } catch (e) {
      // Silently ignore
    }
    return UserDefaults();
  }

  /// Save user defaults
  Future<void> saveDefaults(UserDefaults defaults) async {
    await _prefs.setString(
      PreferenceKeys.userDefaults,
      jsonEncode(defaults.toJson()),
    );
  }

  /// Update a single default value
  Future<void> updateDefault(String key, String value) async {
    final current = getDefaults();
    UserDefaults updated;

    switch (key) {
      case 'leadSource':
        updated = current.copyWith(defaultLeadSource: value);
        break;
      case 'leadStatus':
        updated = current.copyWith(defaultLeadStatus: value);
        break;
      case 'taskPriority':
        updated = current.copyWith(defaultTaskPriority: value);
        break;
      case 'dealStage':
        updated = current.copyWith(defaultDealStage: value);
        break;
      case 'currency':
        updated = current.copyWith(defaultCurrency: value);
        break;
      default:
        return;
    }

    await saveDefaults(updated);
  }

  // ============ Recent Entities ============

  /// Get recent accounts
  List<RecentEntity> getRecentAccounts() {
    return _getRecentEntities(PreferenceKeys.recentAccounts);
  }

  /// Add a recent account
  Future<void> addRecentAccount(String id, String name) async {
    await _addRecentEntity(PreferenceKeys.recentAccounts, id, name);
  }

  /// Get recent contacts
  List<RecentEntity> getRecentContacts() {
    return _getRecentEntities(PreferenceKeys.recentContacts);
  }

  /// Add a recent contact
  Future<void> addRecentContact(String id, String name) async {
    await _addRecentEntity(PreferenceKeys.recentContacts, id, name);
  }

  /// Get recent lead sources
  List<String> getRecentLeadSources() {
    return _getRecentStrings(PreferenceKeys.recentLeadSources);
  }

  /// Add a recent lead source
  Future<void> addRecentLeadSource(String source) async {
    await _addRecentString(PreferenceKeys.recentLeadSources, source);
  }

  /// Get recent industries
  List<String> getRecentIndustries() {
    return _getRecentStrings(PreferenceKeys.recentIndustries);
  }

  /// Add a recent industry
  Future<void> addRecentIndustry(String industry) async {
    await _addRecentString(PreferenceKeys.recentIndustries, industry);
  }

  // ============ Pre-fill Helpers ============

  /// Get pre-fill data for a Lead form
  Map<String, dynamic> getLeadPrefill() {
    final defaults = getDefaults();
    return {
      if (defaults.defaultLeadSource != null) 'leadSource': defaults.defaultLeadSource,
      if (defaults.defaultLeadStatus != null) 'status': defaults.defaultLeadStatus,
      if (defaults.defaultCountry != null) 'country': defaults.defaultCountry,
    };
  }

  /// Get pre-fill data for a Contact form
  Map<String, dynamic> getContactPrefill() {
    final defaults = getDefaults();
    return {
      if (defaults.defaultCountry != null) 'mailingCountry': defaults.defaultCountry,
    };
  }

  /// Get pre-fill data for a Deal/Opportunity form
  Map<String, dynamic> getDealPrefill() {
    final defaults = getDefaults();
    return {
      if (defaults.defaultDealStage != null) 'stageName': defaults.defaultDealStage,
      if (defaults.defaultCurrency != null) 'currencyIsoCode': defaults.defaultCurrency,
    };
  }

  /// Get pre-fill data for a Task form
  Map<String, dynamic> getTaskPrefill() {
    final defaults = getDefaults();
    return {
      if (defaults.defaultTaskPriority != null) 'priority': defaults.defaultTaskPriority,
      'status': 'Not Started',
    };
  }

  // ============ Internal Helpers ============

  List<RecentEntity> _getRecentEntities(String key) {
    try {
      final json = _prefs.getString(key);
      if (json != null) {
        final list = jsonDecode(json) as List;
        return list
            .map((e) => RecentEntity.fromJson(e as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
      }
    } catch (e) {
      // Silently ignore
    }
    return [];
  }

  Future<void> _addRecentEntity(String key, String id, String name) async {
    final entities = _getRecentEntities(key);

    // Remove existing entry with same ID
    entities.removeWhere((e) => e.id == id);

    // Add new entry at the beginning
    entities.insert(0, RecentEntity(id: id, name: name));

    // Keep only the most recent 10
    final trimmed = entities.take(10).toList();

    await _prefs.setString(
      key,
      jsonEncode(trimmed.map((e) => e.toJson()).toList()),
    );
  }

  List<String> _getRecentStrings(String key) {
    try {
      final json = _prefs.getString(key);
      if (json != null) {
        final list = jsonDecode(json) as List;
        return list.cast<String>();
      }
    } catch (e) {
      // Silently ignore
    }
    return [];
  }

  Future<void> _addRecentString(String key, String value) async {
    final strings = _getRecentStrings(key);

    // Remove existing entry
    strings.remove(value);

    // Add at the beginning
    strings.insert(0, value);

    // Keep only the most recent 10
    final trimmed = strings.take(10).toList();

    await _prefs.setString(key, jsonEncode(trimmed));
  }
}

/// Provider for SharedPreferences
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be initialized before use');
});

/// Provider for UserPreferencesService (local storage based)
/// Note: Named differently to avoid conflict with userPreferencesProvider in preferences_service.dart
final userPrefsServiceProvider = Provider<UserPreferencesService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return UserPreferencesService(prefs);
});

/// Notifier for managing view preferences state
class ViewPreferencesNotifier extends Notifier<ViewPreferences> {
  @override
  ViewPreferences build() {
    final prefsService = ref.read(userPrefsServiceProvider);
    return prefsService.getViewPreferences();
  }

  /// Toggle view type for a page and persist
  Future<void> toggleView(String page) async {
    final prefsService = ref.read(userPrefsServiceProvider);
    final updated = await prefsService.toggleViewType(page);
    state = updated;
  }

  /// Check if table view is active for a page
  bool isTableView(String page) {
    switch (page) {
      case 'leads':
        return state.leadsView == ListViewType.table;
      case 'contacts':
        return state.contactsView == ListViewType.table;
      case 'accounts':
        return state.accountsView == ListViewType.table;
      case 'tasks':
        return state.tasksView == ListViewType.table;
      case 'notes':
        return state.notesView == ListViewType.table;
      case 'deals':
        return state.dealsView == ListViewType.table;
      default:
        return false;
    }
  }
}

/// Provider for view preferences with state management
final viewPreferencesProvider =
    NotifierProvider<ViewPreferencesNotifier, ViewPreferences>(
  ViewPreferencesNotifier.new,
);
