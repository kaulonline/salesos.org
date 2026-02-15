import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../providers/providers.dart';
import '../models/cached_lead.dart';
import '../models/cached_contact.dart';

/// Cache entry with TTL metadata
class CacheEntry {
  final String data;
  final DateTime cachedAt;
  final Duration ttl;

  CacheEntry({
    required this.data,
    required this.cachedAt,
    required this.ttl,
  });

  bool get isExpired => DateTime.now().difference(cachedAt) > ttl;

  Map<String, dynamic> toJson() => {
        'data': data,
        'cachedAt': cachedAt.toIso8601String(),
        'ttlMs': ttl.inMilliseconds,
      };

  factory CacheEntry.fromJson(Map<String, dynamic> json) => CacheEntry(
        data: json['data'] as String,
        cachedAt: DateTime.parse(json['cachedAt'] as String),
        ttl: Duration(milliseconds: json['ttlMs'] as int),
      );
}

/// Entity types for cache operations
enum CacheEntityType {
  leads,
  contacts,
  accounts,
  opportunities,
  tasks,
  activities,
  pipelineStats,
  dashboardMetrics,
  salesTrend,
  orders,
  products,
  meetings,
  messages,
  playbooks,
  competitors,
  documents,
  forecasts,
}

/// Cache key constants for CRM entities
class CacheKeys {
  static const String leads = 'crm_leads';
  static const String contacts = 'crm_contacts';
  static const String accounts = 'crm_accounts';
  static const String opportunities = 'crm_opportunities';
  static const String tasks = 'crm_tasks';
  static const String activities = 'crm_activities';
  static const String pipelineStats = 'crm_pipeline_stats';
  static const String dashboardMetrics = 'crm_dashboard_metrics';
  static const String salesTrend = 'crm_sales_trend';
  static const String orders = 'crm_orders';
  static const String products = 'crm_products';
  static const String meetings = 'crm_meetings';
  static const String messages = 'crm_messages';
  static const String playbooks = 'crm_playbooks';
  static const String competitors = 'crm_competitors';
  static const String documents = 'crm_documents';
  static const String forecasts = 'crm_forecasts';

  /// Get key for a single entity by ID
  static String leadById(String id) => 'crm_lead_$id';
  static String contactById(String id) => 'crm_contact_$id';
  static String accountById(String id) => 'crm_account_$id';
  static String opportunityById(String id) => 'crm_opportunity_$id';
  static String taskById(String id) => 'crm_task_$id';
  static String orderById(String id) => 'crm_order_$id';
  static String productById(String id) => 'crm_product_$id';
  static String meetingById(String id) => 'crm_meeting_$id';
  static String playbookById(String id) => 'crm_playbook_$id';
  static String competitorById(String id) => 'crm_competitor_$id';
  static String documentById(String id) => 'crm_document_$id';

  /// Get key for related entities
  static String accountContacts(String accountId) => 'crm_account_${accountId}_contacts';
  static String accountOpportunities(String accountId) => 'crm_account_${accountId}_opportunities';
  static String contactOpportunities(String contactId) => 'crm_contact_${contactId}_opportunities';
  static String opportunityActivities(String oppId) => 'crm_opportunity_${oppId}_activities';
  static String calendarEvents(DateTime month) => 'crm_calendar_${month.year}_${month.month}';
}

/// CRM Cache Service for offline-first data access
///
/// Features:
/// - TTL-based cache expiration (default 5 minutes)
/// - Automatic invalidation on mutations
/// - Offline-first serving from cache
/// - Background refresh when online
/// - Cache size management
/// - Typed Hive adapters for Lead and Contact entities
class CacheService {
  static const String _boxName = 'crm_cache';
  static const String _timestampBoxName = 'crm_cache_timestamps';
  static const Duration defaultTtl = Duration(minutes: 5);
  static const int maxCacheSize = 1000; // Maximum number of cache entries

  Box<String>? _box;
  Box<int>? _timestampBox;
  final Map<String, Timer> _refreshTimers = {};
  final Map<String, Future<void> Function()> _refreshCallbacks = {};

  bool _isInitialized = false;
  bool _typedBoxesInitialized = false;

  /// Initialize the cache service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      _box = await Hive.openBox<String>(_boxName);
      _timestampBox = await Hive.openBox<int>(_timestampBoxName);
      _isInitialized = true;

      // Clean up expired entries on startup
      await _cleanupExpiredEntries();
    } catch (e) {
      // If initialization fails, service will operate in pass-through mode
      _isInitialized = false;
    }
  }

  /// Initialize typed Hive boxes for Lead and Contact entities
  /// Call this after Hive.initFlutter() and after registering adapters
  Future<void> initializeTypedBoxes() async {
    if (_typedBoxesInitialized) return;

    try {
      // Initialize typed boxes for leads and contacts
      await LeadCacheBox.init();
      await ContactCacheBox.init();
      _typedBoxesInitialized = true;
    } catch (e) {
      _typedBoxesInitialized = false;
    }
  }

  /// Check if the cache is initialized
  bool get isInitialized => _isInitialized && _box != null;

  /// Check if typed boxes are initialized
  bool get typedBoxesInitialized => _typedBoxesInitialized;

  /// Get cached data for a key
  /// Returns null if not cached or expired
  T? get<T>(String key) {
    if (!isInitialized) return null;

    try {
      final entryJson = _box!.get(key);
      if (entryJson == null) return null;

      final entry = CacheEntry.fromJson(jsonDecode(entryJson) as Map<String, dynamic>);

      if (entry.isExpired) {
        // Return expired data but mark for refresh
        // This enables offline-first behavior
        return _decodeData<T>(entry.data);
      }

      return _decodeData<T>(entry.data);
    } catch (e) {
      return null;
    }
  }

  /// Check if cached data is expired (but may still be present)
  bool isExpired(String key) {
    if (!isInitialized) return true;

    try {
      final entryJson = _box!.get(key);
      if (entryJson == null) return true;

      final entry = CacheEntry.fromJson(jsonDecode(entryJson) as Map<String, dynamic>);
      return entry.isExpired;
    } catch (e) {
      return true;
    }
  }

  /// Check if key exists in cache (regardless of expiration)
  bool has(String key) {
    if (!isInitialized) return false;
    return _box!.containsKey(key);
  }

  /// Store data in cache with TTL
  Future<void> set<T>(String key, T data, {Duration? ttl}) async {
    if (!isInitialized) return;

    try {
      final entry = CacheEntry(
        data: _encodeData(data),
        cachedAt: DateTime.now(),
        ttl: ttl ?? defaultTtl,
      );

      await _box!.put(key, jsonEncode(entry.toJson()));

      // Ensure cache size limits are respected
      await _enforceCacheLimit();
    } catch (e) {
      // Silently fail on cache write errors
    }
  }

  /// Remove a specific key from cache
  Future<void> remove(String key) async {
    if (!isInitialized) return;

    try {
      await _box!.delete(key);
    } catch (e) {
      // Silently fail
    }
  }

  /// Invalidate cache for a specific entity type
  /// Call this after mutations (create, update, delete)
  Future<void> invalidate(String pattern) async {
    if (!isInitialized) return;

    try {
      final keysToDelete = _box!.keys
          .where((key) => key.toString().startsWith(pattern))
          .toList();

      await _box!.deleteAll(keysToDelete);
    } catch (e) {
      // Silently fail
    }
  }

  /// Invalidate all lead-related cache
  Future<void> invalidateLeads() async {
    await invalidate('crm_lead');
    await remove(CacheKeys.leads);
    await remove(CacheKeys.dashboardMetrics);
  }

  /// Invalidate all contact-related cache
  Future<void> invalidateContacts() async {
    await invalidate('crm_contact');
    await remove(CacheKeys.contacts);
    await remove(CacheKeys.dashboardMetrics);
  }

  /// Invalidate all account-related cache
  Future<void> invalidateAccounts() async {
    await invalidate('crm_account');
    await remove(CacheKeys.accounts);
  }

  /// Invalidate all opportunity-related cache
  Future<void> invalidateOpportunities() async {
    await invalidate('crm_opportunity');
    await remove(CacheKeys.opportunities);
    await remove(CacheKeys.pipelineStats);
    await remove(CacheKeys.salesTrend);
    await remove(CacheKeys.dashboardMetrics);
  }

  /// Invalidate all task-related cache
  Future<void> invalidateTasks() async {
    await invalidate('crm_task');
    await remove(CacheKeys.tasks);
    await remove(CacheKeys.dashboardMetrics);
  }

  /// Invalidate all activity-related cache
  Future<void> invalidateActivities() async {
    await invalidate('crm_activity');
    await invalidate('crm_calendar');
    await remove(CacheKeys.activities);
    await remove(CacheKeys.dashboardMetrics);
  }

  /// Invalidate all order-related cache
  Future<void> invalidateOrders() async {
    await invalidate('crm_order');
    await remove(CacheKeys.orders);
    await remove(CacheKeys.dashboardMetrics);
  }

  /// Invalidate all product-related cache
  Future<void> invalidateProducts() async {
    await invalidate('crm_product');
    await remove(CacheKeys.products);
  }

  /// Invalidate all meeting-related cache
  Future<void> invalidateMeetings() async {
    await invalidate('crm_meeting');
    await remove(CacheKeys.meetings);
  }

  /// Invalidate all message-related cache
  Future<void> invalidateMessages() async {
    await invalidate('crm_message');
    await remove(CacheKeys.messages);
  }

  /// Invalidate all playbook-related cache
  Future<void> invalidatePlaybooks() async {
    await invalidate('crm_playbook');
    await remove(CacheKeys.playbooks);
  }

  /// Invalidate all competitor-related cache
  Future<void> invalidateCompetitors() async {
    await invalidate('crm_competitor');
    await remove(CacheKeys.competitors);
  }

  /// Invalidate all document-related cache
  Future<void> invalidateDocuments() async {
    await invalidate('crm_document');
    await remove(CacheKeys.documents);
  }

  /// Invalidate all forecast-related cache
  Future<void> invalidateForecasts() async {
    await invalidate('crm_forecast');
    await remove(CacheKeys.forecasts);
  }

  /// Clear all cached data
  Future<void> clearAll() async {
    if (!isInitialized) return;

    try {
      await _box!.clear();
      _cancelAllRefreshTimers();
    } catch (e) {
      // Silently fail
    }
  }

  /// Register a background refresh callback for a key
  /// The callback will be invoked when the cache entry expires
  void registerRefreshCallback(String key, Future<void> Function() callback) {
    _refreshCallbacks[key] = callback;
  }

  /// Start background refresh for a key if expired
  void scheduleBackgroundRefresh(String key, {Duration? delay}) {
    if (!isInitialized) return;
    if (!_refreshCallbacks.containsKey(key)) return;

    // Cancel existing timer for this key
    _refreshTimers[key]?.cancel();

    // Schedule refresh
    _refreshTimers[key] = Timer(
      delay ?? const Duration(seconds: 1),
      () async {
        try {
          await _refreshCallbacks[key]?.call();
        } catch (e) {
          // Refresh failed, will retry on next access
        }
        _refreshTimers.remove(key);
      },
    );
  }

  /// Get cache statistics
  Map<String, dynamic> getStats() {
    if (!isInitialized) {
      return {'initialized': false, 'entries': 0};
    }

    int total = 0;
    int expired = 0;
    int valid = 0;

    for (final key in _box!.keys) {
      total++;
      try {
        final entryJson = _box!.get(key);
        if (entryJson != null) {
          final entry = CacheEntry.fromJson(
            jsonDecode(entryJson) as Map<String, dynamic>,
          );
          if (entry.isExpired) {
            expired++;
          } else {
            valid++;
          }
        }
      } catch (e) {
        expired++;
      }
    }

    return {
      'initialized': true,
      'entries': total,
      'valid': valid,
      'expired': expired,
    };
  }

  /// Clean up expired entries
  Future<void> _cleanupExpiredEntries() async {
    if (!isInitialized) return;

    try {
      final keysToDelete = <dynamic>[];

      for (final key in _box!.keys) {
        try {
          final entryJson = _box!.get(key);
          if (entryJson != null) {
            final entry = CacheEntry.fromJson(
              jsonDecode(entryJson) as Map<String, dynamic>,
            );
            // Remove entries that are significantly expired (> 2x TTL)
            if (DateTime.now().difference(entry.cachedAt) > entry.ttl * 2) {
              keysToDelete.add(key);
            }
          }
        } catch (e) {
          keysToDelete.add(key);
        }
      }

      if (keysToDelete.isNotEmpty) {
        await _box!.deleteAll(keysToDelete);
      }
    } catch (e) {
      // Silently fail
    }
  }

  /// Enforce cache size limit by removing oldest entries
  Future<void> _enforceCacheLimit() async {
    if (!isInitialized) return;

    try {
      if (_box!.length <= maxCacheSize) return;

      // Get all entries with their cached times
      final entries = <MapEntry<dynamic, DateTime>>[];

      for (final key in _box!.keys) {
        try {
          final entryJson = _box!.get(key);
          if (entryJson != null) {
            final entry = CacheEntry.fromJson(
              jsonDecode(entryJson) as Map<String, dynamic>,
            );
            entries.add(MapEntry(key, entry.cachedAt));
          }
        } catch (e) {
          entries.add(MapEntry(key, DateTime(2000)));
        }
      }

      // Sort by cached time (oldest first)
      entries.sort((a, b) => a.value.compareTo(b.value));

      // Remove oldest entries to get below limit
      final toRemove = entries.take(_box!.length - maxCacheSize + 100);
      await _box!.deleteAll(toRemove.map((e) => e.key));
    } catch (e) {
      // Silently fail
    }
  }

  void _cancelAllRefreshTimers() {
    for (final timer in _refreshTimers.values) {
      timer.cancel();
    }
    _refreshTimers.clear();
  }

  String _encodeData<T>(T data) {
    if (data is String) return data;
    if (data is List) return jsonEncode(data);
    if (data is Map) return jsonEncode(data);
    return jsonEncode(data);
  }

  T? _decodeData<T>(String data) {
    try {
      final decoded = jsonDecode(data);
      return decoded as T?;
    } catch (e) {
      if (T == String) return data as T?;
      return null;
    }
  }

  // ============================================================================
  // TYPED ENTITY CACHING - Leads
  // ============================================================================

  /// Cache a list of leads using typed Hive adapter
  /// This provides efficient binary serialization for offline access
  Future<void> cacheLeads(List<Map<String, dynamic>> leads) async {
    if (!_typedBoxesInitialized) return;

    try {
      final cachedLeads = leads.map((lead) => CachedLead.fromMap(lead)).toList();
      await LeadCacheBox.saveAll(cachedLeads);
      await _updateTimestamp(CacheEntityType.leads);
    } catch (e) {
      // Silently fail on cache write errors
    }
  }

  /// Get all cached leads from typed Hive box
  /// Returns empty list if cache is not available
  List<CachedLead> getCachedLeads() {
    if (!_typedBoxesInitialized) return [];
    return LeadCacheBox.getAll();
  }

  /// Get cached leads as Map for API compatibility
  List<Map<String, dynamic>> getCachedLeadsAsMap() {
    return getCachedLeads().map((lead) => lead.toMap()).toList();
  }

  /// Get a single cached lead by ID
  CachedLead? getCachedLeadById(String id) {
    if (!_typedBoxesInitialized) return null;
    return LeadCacheBox.getById(id);
  }

  /// Get cached lead by ID as Map
  Map<String, dynamic>? getCachedLeadByIdAsMap(String id) {
    return getCachedLeadById(id)?.toMap();
  }

  // ============================================================================
  // TYPED ENTITY CACHING - Contacts
  // ============================================================================

  /// Cache a list of contacts using typed Hive adapter
  Future<void> cacheContacts(List<Map<String, dynamic>> contacts) async {
    if (!_typedBoxesInitialized) return;

    try {
      final cachedContacts = contacts.map((contact) => CachedContact.fromMap(contact)).toList();
      await ContactCacheBox.saveAll(cachedContacts);
      await _updateTimestamp(CacheEntityType.contacts);
    } catch (e) {
      // Silently fail on cache write errors
    }
  }

  /// Get all cached contacts from typed Hive box
  List<CachedContact> getCachedContacts() {
    if (!_typedBoxesInitialized) return [];
    return ContactCacheBox.getAll();
  }

  /// Get cached contacts as Map for API compatibility
  List<Map<String, dynamic>> getCachedContactsAsMap() {
    return getCachedContacts().map((contact) => contact.toMap()).toList();
  }

  /// Get a single cached contact by ID
  CachedContact? getCachedContactById(String id) {
    if (!_typedBoxesInitialized) return null;
    return ContactCacheBox.getById(id);
  }

  /// Get cached contact by ID as Map
  Map<String, dynamic>? getCachedContactByIdAsMap(String id) {
    return getCachedContactById(id)?.toMap();
  }

  /// Get cached contacts for a specific account
  List<CachedContact> getCachedContactsByAccount(String accountId) {
    if (!_typedBoxesInitialized) return [];
    return ContactCacheBox.getByAccountId(accountId);
  }

  // ============================================================================
  // CACHE TIMESTAMP & STALENESS METHODS
  // ============================================================================

  /// Update the timestamp for an entity type
  Future<void> _updateTimestamp(CacheEntityType entityType) async {
    if (_timestampBox == null) return;
    await _timestampBox!.put(
      _entityTypeToKey(entityType),
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  /// Get the cache timestamp for an entity type
  /// Returns null if no timestamp exists (never cached)
  DateTime? getCacheTimestamp(CacheEntityType entityType) {
    if (_timestampBox == null) return null;
    final timestamp = _timestampBox!.get(_entityTypeToKey(entityType));
    if (timestamp == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(timestamp);
  }

  /// Check if cache for an entity type is stale (older than maxAge)
  /// Returns true if stale or if no cache exists
  bool isCacheStale(CacheEntityType entityType, {Duration? maxAge}) {
    final timestamp = getCacheTimestamp(entityType);
    if (timestamp == null) return true;

    final age = maxAge ?? defaultTtl;
    return DateTime.now().difference(timestamp) > age;
  }

  /// Get the age of cache for an entity type
  /// Returns null if no timestamp exists
  Duration? getCacheAge(CacheEntityType entityType) {
    final timestamp = getCacheTimestamp(entityType);
    if (timestamp == null) return null;
    return DateTime.now().difference(timestamp);
  }

  /// Convert CacheEntityType to storage key
  String _entityTypeToKey(CacheEntityType entityType) {
    switch (entityType) {
      case CacheEntityType.leads:
        return 'timestamp_leads';
      case CacheEntityType.contacts:
        return 'timestamp_contacts';
      case CacheEntityType.accounts:
        return 'timestamp_accounts';
      case CacheEntityType.opportunities:
        return 'timestamp_opportunities';
      case CacheEntityType.tasks:
        return 'timestamp_tasks';
      case CacheEntityType.activities:
        return 'timestamp_activities';
      case CacheEntityType.pipelineStats:
        return 'timestamp_pipeline_stats';
      case CacheEntityType.dashboardMetrics:
        return 'timestamp_dashboard_metrics';
      case CacheEntityType.salesTrend:
        return 'timestamp_sales_trend';
      case CacheEntityType.orders:
        return 'timestamp_orders';
      case CacheEntityType.products:
        return 'timestamp_products';
      case CacheEntityType.meetings:
        return 'timestamp_meetings';
      case CacheEntityType.messages:
        return 'timestamp_messages';
      case CacheEntityType.playbooks:
        return 'timestamp_playbooks';
      case CacheEntityType.competitors:
        return 'timestamp_competitors';
      case CacheEntityType.documents:
        return 'timestamp_documents';
      case CacheEntityType.forecasts:
        return 'timestamp_forecasts';
    }
  }

  // ============================================================================
  // ENTITY-SPECIFIC INVALIDATION
  // ============================================================================

  /// Invalidate cache for a specific entity type
  /// Clears both JSON cache and typed boxes as appropriate
  Future<void> invalidateCache(CacheEntityType entityType) async {
    switch (entityType) {
      case CacheEntityType.leads:
        await invalidateLeads();
        if (_typedBoxesInitialized) await LeadCacheBox.clear();
        break;
      case CacheEntityType.contacts:
        await invalidateContacts();
        if (_typedBoxesInitialized) await ContactCacheBox.clear();
        break;
      case CacheEntityType.accounts:
        await invalidateAccounts();
        break;
      case CacheEntityType.opportunities:
        await invalidateOpportunities();
        break;
      case CacheEntityType.tasks:
        await invalidateTasks();
        break;
      case CacheEntityType.activities:
        await invalidateActivities();
        break;
      case CacheEntityType.pipelineStats:
        await remove(CacheKeys.pipelineStats);
        break;
      case CacheEntityType.dashboardMetrics:
        await remove(CacheKeys.dashboardMetrics);
        break;
      case CacheEntityType.salesTrend:
        await remove(CacheKeys.salesTrend);
        break;
      case CacheEntityType.orders:
        await invalidateOrders();
        break;
      case CacheEntityType.products:
        await invalidateProducts();
        break;
      case CacheEntityType.meetings:
        await invalidateMeetings();
        break;
      case CacheEntityType.messages:
        await invalidateMessages();
        break;
      case CacheEntityType.playbooks:
        await invalidatePlaybooks();
        break;
      case CacheEntityType.competitors:
        await invalidateCompetitors();
        break;
      case CacheEntityType.documents:
        await invalidateDocuments();
        break;
      case CacheEntityType.forecasts:
        await invalidateForecasts();
        break;
    }

    // Clear the timestamp for this entity type
    if (_timestampBox != null) {
      await _timestampBox!.delete(_entityTypeToKey(entityType));
    }
  }

  /// Clear all caches including typed boxes
  Future<void> clearAllCache() async {
    await clearAll();

    if (_typedBoxesInitialized) {
      await LeadCacheBox.clear();
      await ContactCacheBox.clear();
    }

    // Clear all timestamps
    if (_timestampBox != null) {
      await _timestampBox!.clear();
    }
  }

  /// Close the cache service
  Future<void> close() async {
    _cancelAllRefreshTimers();
    _refreshCallbacks.clear();

    if (_box != null && _box!.isOpen) {
      await _box!.close();
    }

    if (_timestampBox != null && _timestampBox!.isOpen) {
      await _timestampBox!.close();
    }

    // Close typed boxes
    if (_typedBoxesInitialized) {
      await LeadCacheBox.close();
      await ContactCacheBox.close();
    }

    _isInitialized = false;
    _typedBoxesInitialized = false;
  }
}

/// Cache service provider
final cacheServiceProvider = Provider<CacheService>((ref) {
  return CacheService();
});

/// Cached CRM data service provider
/// Wraps CrmDataService with caching layer
final cachedCrmServiceProvider = Provider<CachedCrmDataService>((ref) {
  final cacheService = ref.watch(cacheServiceProvider);
  final isOnline = ref.watch(isOnlineProvider);
  return CachedCrmDataService(cacheService, isOnline);
});

/// Wrapper service that provides cached CRM data access
class CachedCrmDataService {
  final CacheService _cache;
  final bool _isOnline;

  CachedCrmDataService(this._cache, this._isOnline);

  /// Get cached data or fetch fresh data
  ///
  /// [key] - Cache key
  /// [fetcher] - Function to fetch fresh data when cache is empty or expired
  /// [forceRefresh] - Force fetch from API even if cache is valid
  /// [ttl] - Custom TTL for this entry
  Future<T?> getCachedOrFetch<T>({
    required String key,
    required Future<T> Function() fetcher,
    bool forceRefresh = false,
    Duration? ttl,
  }) async {
    // Try to get from cache first
    final cached = _cache.get<T>(key);
    final isExpired = _cache.isExpired(key);

    // If we have valid cached data and don't need refresh, return it
    if (cached != null && !isExpired && !forceRefresh) {
      return cached;
    }

    // If we're offline, return cached data (even if expired)
    if (!_isOnline) {
      return cached;
    }

    // If forceRefresh or expired, try to fetch fresh data
    if (forceRefresh || isExpired) {
      try {
        final fresh = await fetcher();
        await _cache.set(key, fresh, ttl: ttl);
        return fresh;
      } catch (e) {
        // If fetch fails, return cached data as fallback
        if (cached != null) {
          return cached;
        }
        rethrow;
      }
    }

    // Try to fetch if no cache
    if (cached == null && _isOnline) {
      final fresh = await fetcher();
      await _cache.set(key, fresh, ttl: ttl);
      return fresh;
    }

    return cached;
  }

  /// Get cached list data with background refresh
  Future<List<Map<String, dynamic>>> getCachedList({
    required String key,
    required Future<List<Map<String, dynamic>>> Function() fetcher,
    bool forceRefresh = false,
    Duration? ttl,
  }) async {
    final result = await getCachedOrFetch<List<dynamic>>(
      key: key,
      fetcher: () async {
        final data = await fetcher();
        return data;
      },
      forceRefresh: forceRefresh,
      ttl: ttl,
    );

    if (result == null) return [];

    return result.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Get cached map data with background refresh
  Future<Map<String, dynamic>> getCachedMap({
    required String key,
    required Future<Map<String, dynamic>> Function() fetcher,
    bool forceRefresh = false,
    Duration? ttl,
  }) async {
    final result = await getCachedOrFetch<Map<String, dynamic>>(
      key: key,
      fetcher: fetcher,
      forceRefresh: forceRefresh,
      ttl: ttl,
    );

    return result ?? {};
  }

  /// Invalidate cache after mutation
  Future<void> invalidateAfterMutation(String entityType) async {
    switch (entityType) {
      case 'lead':
        await _cache.invalidateLeads();
        break;
      case 'contact':
        await _cache.invalidateContacts();
        break;
      case 'account':
        await _cache.invalidateAccounts();
        break;
      case 'opportunity':
        await _cache.invalidateOpportunities();
        break;
      case 'task':
        await _cache.invalidateTasks();
        break;
      case 'activity':
        await _cache.invalidateActivities();
        break;
      case 'order':
        await _cache.invalidateOrders();
        break;
      case 'product':
        await _cache.invalidateProducts();
        break;
      case 'meeting':
        await _cache.invalidateMeetings();
        break;
      case 'message':
        await _cache.invalidateMessages();
        break;
      case 'playbook':
        await _cache.invalidatePlaybooks();
        break;
      case 'competitor':
        await _cache.invalidateCompetitors();
        break;
      case 'document':
        await _cache.invalidateDocuments();
        break;
      case 'forecast':
        await _cache.invalidateForecasts();
        break;
      default:
        // Unknown entity type, clear all
        await _cache.clearAll();
    }
  }

  /// Check if we're currently online
  bool get isOnline => _isOnline;

  /// Check if cache is available
  bool get isCacheAvailable => _cache.isInitialized;
}
