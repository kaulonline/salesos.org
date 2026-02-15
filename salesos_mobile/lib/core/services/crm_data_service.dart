import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../providers/providers.dart';
import '../utils/exceptions.dart';
import 'cache_service.dart';
import 'error_reporting_service.dart';

/// Unified CRM data service that routes to Local or Salesforce based on auth mode
/// Now includes caching layer for offline-first data access
///
/// Cache Strategy:
/// 1. Check typed Hive cache first (fast binary lookup)
/// 2. If cache is fresh and not forceRefresh, return cached data
/// 3. If online, fetch from API and update cache
/// 4. If offline, return stale cache data as fallback
/// 5. On mutation, invalidate relevant caches
class CrmDataService {
  final ApiClient _api;
  final AuthMode _authMode;
  final CachedCrmDataService? _cacheService;
  final CacheService? _typedCacheService;
  final bool _isOnline;
  final ErrorReportingService? _errorService;

  CrmDataService(
    this._api,
    this._authMode, [
    this._cacheService,
    this._typedCacheService,
    this._isOnline = true,
    this._errorService,
  ]);

  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  /// Report error with context but don't throw - used for graceful degradation
  void _reportError(dynamic error, String context) {
    if (_errorService == null) return;
    final appError = error is AppException
        ? error
        : UnknownException(message: 'CRM error during $context', originalError: error);
    _errorService.reportError(
      appError,
      stackTrace: StackTrace.current,
      context: ErrorContext(screenName: 'CrmDataService', action: context),
    );
  }

  /// Check if cache is available
  bool get hasCacheService => _cacheService != null && _cacheService.isCacheAvailable;

  /// Check if typed cache is available
  bool get hasTypedCache => _typedCacheService != null && _typedCacheService.typedBoxesInitialized;

  /// Check if we're currently online
  bool get isOnline => _isOnline;

  // ============================================================================
  // LEADS
  // ============================================================================

  /// Get all leads with offline-first caching strategy
  ///
  /// Strategy:
  /// 1. If offline, return typed cache immediately
  /// 2. If online and cache is fresh, return cache
  /// 3. If online and forceRefresh or cache is stale, fetch from API
  /// 4. Update typed cache after successful API fetch
  /// 5. Fall back to stale cache if API fails
  Future<List<Map<String, dynamic>>> getLeads({int? limit, bool forceRefresh = false}) async {
    // Offline mode: return typed cache immediately
    if (!isOnline && hasTypedCache) {
      final cachedLeads = _typedCacheService!.getCachedLeadsAsMap();
      if (cachedLeads.isNotEmpty) {
        return limit != null ? cachedLeads.take(limit).toList() : cachedLeads;
      }
    }

    // Check typed cache first if not force refreshing
    if (hasTypedCache && !forceRefresh) {
      final isStale = _typedCacheService!.isCacheStale(CacheEntityType.leads);
      if (!isStale) {
        final cachedLeads = _typedCacheService.getCachedLeadsAsMap();
        if (cachedLeads.isNotEmpty) {
          return limit != null ? cachedLeads.take(limit).toList() : cachedLeads;
        }
      }
    }

    // Try to fetch from API
    try {
      final leads = await _fetchLeads(limit: limit);

      // Update typed cache on successful fetch
      if (hasTypedCache && leads.isNotEmpty) {
        await _typedCacheService!.cacheLeads(leads);
      }

      return leads;
    } catch (e) {
      // On API failure, return stale cache as fallback
      if (hasTypedCache) {
        final cachedLeads = _typedCacheService!.getCachedLeadsAsMap();
        if (cachedLeads.isNotEmpty) {
          return limit != null ? cachedLeads.take(limit).toList() : cachedLeads;
        }
      }

      // Also try JSON cache as secondary fallback
      if (hasCacheService) {
        final cached = await _cacheService!.getCachedList(
          key: CacheKeys.leads,
          fetcher: () => Future.value(<Map<String, dynamic>>[]),
          forceRefresh: false,
        );
        if (cached.isNotEmpty) return cached;
      }

      return [];
    }
  }

  /// Internal method to fetch leads from API
  Future<List<Map<String, dynamic>>> _fetchLeads({int? limit}) async {
    try {
      if (isSalesforceMode) {
        // Filter out converted leads (IsConverted = false)
        return await _querySalesforce(
          'SELECT Id, Name, FirstName, LastName, Company, Title, Email, Phone, Status, '
          'LeadSource, Rating, Industry, CreatedDate, LastModifiedDate '
          'FROM Lead WHERE IsConverted = false ${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Lead',
        );
      } else {
        final response = await _api.get('/leads');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      _reportError(e, '_fetchLeads');
      return [];
    }
  }

  /// Get a single lead by ID with offline-first caching
  Future<Map<String, dynamic>?> getLeadById(String id, {bool forceRefresh = false}) async {
    // Offline mode: return typed cache immediately
    if (!isOnline && hasTypedCache) {
      final cached = _typedCacheService!.getCachedLeadByIdAsMap(id);
      if (cached != null) return cached;
    }

    // Check typed cache first if not force refreshing
    if (hasTypedCache && !forceRefresh) {
      final cached = _typedCacheService!.getCachedLeadByIdAsMap(id);
      if (cached != null) return cached;
    }

    // Try to fetch from API
    try {
      final lead = await _fetchLeadById(id);
      return lead;
    } catch (e) {
      // On API failure, return cached data as fallback
      if (hasTypedCache) {
        final cached = _typedCacheService!.getCachedLeadByIdAsMap(id);
        if (cached != null) return cached;
      }

      // Also try JSON cache as secondary fallback
      if (hasCacheService) {
        // ignore: null_argument_to_non_null_type
        final cached = await _cacheService!.getCachedOrFetch<Map<String, dynamic>?>(
          key: CacheKeys.leadById(id),
          fetcher: () => Future.value(null),
          forceRefresh: false,
        );
        if (cached != null) return cached;
      }

      return null;
    }
  }

  /// Internal method to fetch a single lead from API
  Future<Map<String, dynamic>?> _fetchLeadById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, FirstName, LastName, Company, Title, Email, Phone, MobilePhone, "
          "Status, Rating, Industry, LeadSource, Description, Street, City, State, PostalCode, "
          "NumberOfEmployees, AnnualRevenue, Website, CreatedDate, LastModifiedDate "
          "FROM Lead WHERE Id = '$id'",
          objectType: 'Lead',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/leads/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      _reportError(e, '_fetchLeadById($id)');
      return null;
    }
  }

  /// Create a new lead
  Future<Map<String, dynamic>?> createLead(Map<String, dynamic> data) async {
    try {
      Map<String, dynamic>? result;
      if (isSalesforceMode) {
        final response = await _api.post('/salesforce/sobjects/Lead', data: data);
        result = response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/leads', data: data);
        result = response.data as Map<String, dynamic>?;
      }

      // Invalidate leads cache after mutation (both typed and JSON cache)
      if (hasTypedCache) {
        await _typedCacheService!.invalidateCache(CacheEntityType.leads);
      }
      if (hasCacheService) {
        await _cacheService!.invalidateAfterMutation('lead');
      }

      return result;
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing lead
  Future<Map<String, dynamic>?> updateLead(String id, Map<String, dynamic> data) async {
    try {
      Map<String, dynamic>? result;
      if (isSalesforceMode) {
        final response = await _api.patch('/salesforce/sobjects/Lead/$id', data: data);
        result = response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.patch('/leads/$id', data: data);
        result = response.data as Map<String, dynamic>?;
      }

      // Invalidate leads cache after mutation (both typed and JSON cache)
      if (hasTypedCache) {
        await _typedCacheService!.invalidateCache(CacheEntityType.leads);
      }
      if (hasCacheService) {
        await _cacheService!.invalidateAfterMutation('lead');
      }

      return result;
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a lead
  Future<bool> deleteLead(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Lead/$id');
      } else {
        await _api.delete('/leads/$id');
      }

      // Invalidate leads cache after mutation (both typed and JSON cache)
      if (hasTypedCache) {
        await _typedCacheService!.invalidateCache(CacheEntityType.leads);
      }
      if (hasCacheService) {
        await _cacheService!.invalidateAfterMutation('lead');
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // CONTACTS
  // ============================================================================

  /// Get all contacts with offline-first caching strategy
  ///
  /// Strategy:
  /// 1. If offline, return typed cache immediately
  /// 2. If online and cache is fresh, return cache
  /// 3. If online and forceRefresh or cache is stale, fetch from API
  /// 4. Update typed cache after successful API fetch
  /// 5. Fall back to stale cache if API fails
  Future<List<Map<String, dynamic>>> getContacts({int? limit, bool forceRefresh = false}) async {
    // Offline mode: return typed cache immediately
    if (!isOnline && hasTypedCache) {
      final cachedContacts = _typedCacheService!.getCachedContactsAsMap();
      if (cachedContacts.isNotEmpty) {
        return limit != null ? cachedContacts.take(limit).toList() : cachedContacts;
      }
    }

    // Check typed cache first if not force refreshing
    if (hasTypedCache && !forceRefresh) {
      final isStale = _typedCacheService!.isCacheStale(CacheEntityType.contacts);
      if (!isStale) {
        final cachedContacts = _typedCacheService.getCachedContactsAsMap();
        if (cachedContacts.isNotEmpty) {
          return limit != null ? cachedContacts.take(limit).toList() : cachedContacts;
        }
      }
    }

    // Try to fetch from API
    try {
      final contacts = await _fetchContacts(limit: limit);

      // Update typed cache on successful fetch
      if (hasTypedCache && contacts.isNotEmpty) {
        await _typedCacheService!.cacheContacts(contacts);
      }

      return contacts;
    } catch (e) {
      // On API failure, return stale cache as fallback
      if (hasTypedCache) {
        final cachedContacts = _typedCacheService!.getCachedContactsAsMap();
        if (cachedContacts.isNotEmpty) {
          return limit != null ? cachedContacts.take(limit).toList() : cachedContacts;
        }
      }

      // Also try JSON cache as secondary fallback
      if (hasCacheService) {
        final cached = await _cacheService!.getCachedList(
          key: CacheKeys.contacts,
          fetcher: () => Future.value(<Map<String, dynamic>>[]),
          forceRefresh: false,
        );
        if (cached.isNotEmpty) return cached;
      }

      return [];
    }
  }

  /// Internal method to fetch contacts from API
  Future<List<Map<String, dynamic>>> _fetchContacts({int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          'SELECT Id, Name, FirstName, LastName, Email, Phone, Title, Department, '
          'Account.Name, MailingCity, MailingState, CreatedDate '
          'FROM Contact ${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Contact',
        );
      } else {
        final response = await _api.get('/contacts');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      _reportError(e, '_fetchContacts');
      return [];
    }
  }

  /// Get a single contact by ID with offline-first caching
  Future<Map<String, dynamic>?> getContactById(String id, {bool forceRefresh = false}) async {
    // Offline mode: return typed cache immediately
    if (!isOnline && hasTypedCache) {
      final cached = _typedCacheService!.getCachedContactByIdAsMap(id);
      if (cached != null) return cached;
    }

    // Check typed cache first if not force refreshing
    if (hasTypedCache && !forceRefresh) {
      final cached = _typedCacheService!.getCachedContactByIdAsMap(id);
      if (cached != null) return cached;
    }

    // Try to fetch from API
    try {
      final contact = await _fetchContactById(id);
      return contact;
    } catch (e) {
      // On API failure, return cached data as fallback
      if (hasTypedCache) {
        final cached = _typedCacheService!.getCachedContactByIdAsMap(id);
        if (cached != null) return cached;
      }

      // Also try JSON cache as secondary fallback
      if (hasCacheService) {
        // ignore: null_argument_to_non_null_type
        final cached = await _cacheService!.getCachedOrFetch<Map<String, dynamic>?>(
          key: CacheKeys.contactById(id),
          fetcher: () => Future.value(null),
          forceRefresh: false,
        );
        if (cached != null) return cached;
      }

      return null;
    }
  }

  /// Internal method to fetch a single contact from API
  Future<Map<String, dynamic>?> _fetchContactById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Title, Department, "
          "Account.Name, Account.Id, MailingStreet, MailingCity, MailingState, MailingPostalCode, "
          "Description, CreatedDate, LastModifiedDate "
          "FROM Contact WHERE Id = '$id'",
          objectType: 'Contact',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/contacts/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new contact
  Future<Map<String, dynamic>?> createContact(Map<String, dynamic> data) async {
    try {
      Map<String, dynamic>? result;
      if (isSalesforceMode) {
        final response = await _api.post('/salesforce/sobjects/Contact', data: data);
        result = response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/contacts', data: data);
        result = response.data as Map<String, dynamic>?;
      }

      // Invalidate contacts cache after mutation (both typed and JSON cache)
      if (hasTypedCache) {
        await _typedCacheService!.invalidateCache(CacheEntityType.contacts);
      }
      if (hasCacheService) {
        await _cacheService!.invalidateAfterMutation('contact');
      }

      return result;
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing contact
  Future<Map<String, dynamic>?> updateContact(String id, Map<String, dynamic> data) async {
    try {
      Map<String, dynamic>? result;
      if (isSalesforceMode) {
        final response = await _api.patch('/salesforce/sobjects/Contact/$id', data: data);
        result = response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.patch('/contacts/$id', data: data);
        result = response.data as Map<String, dynamic>?;
      }

      // Invalidate contacts cache after mutation (both typed and JSON cache)
      if (hasTypedCache) {
        await _typedCacheService!.invalidateCache(CacheEntityType.contacts);
      }
      if (hasCacheService) {
        await _cacheService!.invalidateAfterMutation('contact');
      }

      return result;
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a contact
  Future<bool> deleteContact(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Contact/$id');
      } else {
        await _api.delete('/contacts/$id');
      }

      // Invalidate contacts cache after mutation (both typed and JSON cache)
      if (hasTypedCache) {
        await _typedCacheService!.invalidateCache(CacheEntityType.contacts);
      }
      if (hasCacheService) {
        await _cacheService!.invalidateAfterMutation('contact');
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get related opportunities for a contact
  /// Note: Salesforce doesn't allow OR with semi-joins, so we query OpportunityContactRole first
  Future<List<Map<String, dynamic>>> getContactOpportunities(String contactId) async {
    try {
      if (isSalesforceMode) {
        // First, get opportunities where contact is primary
        final directOpps = await _querySalesforce(
          "SELECT Id, Name, Amount, StageName, CloseDate "
          "FROM Opportunity WHERE ContactId = '$contactId' "
          "ORDER BY CloseDate DESC LIMIT 5",
          objectType: 'Opportunity',
        );

        // Then get opportunities via OpportunityContactRole (contact is associated)
        final roleOpps = await _querySalesforce(
          "SELECT Id, Name, Amount, StageName, CloseDate "
          "FROM Opportunity WHERE Id IN "
          "(SELECT OpportunityId FROM OpportunityContactRole WHERE ContactId = '$contactId') "
          "ORDER BY CloseDate DESC LIMIT 5",
          objectType: 'Opportunity',
        );

        // Merge and deduplicate by Id
        final Map<String, Map<String, dynamic>> uniqueOpps = {};
        for (final opp in [...directOpps, ...roleOpps]) {
          final id = opp['Id'] as String?;
          if (id != null && !uniqueOpps.containsKey(id)) {
            uniqueOpps[id] = opp;
          }
        }

        // Sort by close date and return top 5
        final merged = uniqueOpps.values.toList();
        merged.sort((a, b) {
          final dateA = DateTime.tryParse(a['CloseDate'] as String? ?? '');
          final dateB = DateTime.tryParse(b['CloseDate'] as String? ?? '');
          if (dateA == null || dateB == null) return 0;
          return dateB.compareTo(dateA);
        });
        return merged.take(5).toList();
      } else {
        final response = await _api.get('/opportunities', queryParameters: {
          'contactId': contactId,
          'limit': '5',
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Get all activities for a contact (calls, emails, meetings, tasks, notes)
  /// Returns activities sorted by date descending with pagination support
  Future<List<Map<String, dynamic>>> getContactActivities(
    String contactId, {
    int? limit,
    int? offset,
  }) async {
    try {
      if (isSalesforceMode) {
        final List<Map<String, dynamic>> activities = [];
        final limitClause = limit != null ? 'LIMIT $limit' : 'LIMIT 50';
        final offsetClause = offset != null ? 'OFFSET $offset' : '';

        // Fetch Tasks (calls, emails, general tasks)
        final tasks = await _querySalesforce(
          "SELECT Id, Subject, Description, Status, Priority, ActivityDate, "
          "CreatedDate, LastModifiedDate, CallDurationInSeconds, CallType, "
          "Who.Name, What.Name "
          "FROM Task WHERE WhoId = '$contactId' "
          "ORDER BY CreatedDate DESC $limitClause $offsetClause",
          objectType: 'Task',
        );

        // Fetch Events (meetings)
        final events = await _querySalesforce(
          "SELECT Id, Subject, Description, StartDateTime, EndDateTime, "
          "Location, CreatedDate, LastModifiedDate, DurationInMinutes, "
          "Who.Name, What.Name "
          "FROM Event WHERE WhoId = '$contactId' "
          "ORDER BY CreatedDate DESC $limitClause $offsetClause",
          objectType: 'Event',
        );

        // Fetch Notes
        // Note: In Salesforce, Notes are linked via ContentDocumentLink
        // For simplicity, we'll try direct Note query if available
        try {
          final notes = await _querySalesforce(
            "SELECT Id, Title, Body, CreatedDate, LastModifiedDate "
            "FROM Note WHERE ParentId = '$contactId' "
            "ORDER BY CreatedDate DESC $limitClause $offsetClause",
            objectType: 'Note',
          );
          for (final note in notes) {
            activities.add({
              'id': note['Id'],
              'type': 'NOTE',
              'subject': note['Title'] ?? 'Note',
              'description': note['Body'],
              'activityDate': note['CreatedDate'],
              'createdAt': note['CreatedDate'],
            });
          }
        } catch (e) {
          // Notes may not be accessible, continue without them
        }

        // Transform Tasks
        for (final task in tasks) {
          final subject = (task['Subject'] as String? ?? '').toLowerCase();
          String activityType = 'TASK';
          String? duration;

          // Classify by subject content and call type
          final callType = task['CallType'] as String?;
          if (callType != null || subject.contains('call') || subject.contains('phone')) {
            activityType = 'CALL';
            final callDuration = task['CallDurationInSeconds'] as num?;
            if (callDuration != null && callDuration > 0) {
              final minutes = (callDuration / 60).ceil();
              duration = '$minutes min';
            }
          } else if (subject.contains('email') || subject.contains('send')) {
            activityType = 'EMAIL';
          }

          activities.add({
            'id': task['Id'],
            'type': activityType,
            'subject': task['Subject'] ?? 'Task',
            'description': task['Description'],
            'outcome': task['Status'],
            'duration': duration,
            'activityDate': task['ActivityDate'] ?? task['CreatedDate'],
            'createdAt': task['CreatedDate'],
            'contactName': task['Who']?['Name'],
            'relatedTo': task['What']?['Name'],
          });
        }

        // Transform Events
        for (final event in events) {
          String? duration;
          final durationMins = event['DurationInMinutes'] as num?;
          if (durationMins != null && durationMins > 0) {
            if (durationMins >= 60) {
              final hours = (durationMins / 60).floor();
              final mins = (durationMins % 60).toInt();
              duration = mins > 0 ? '${hours}h ${mins}m' : '${hours}h';
            } else {
              duration = '${durationMins.toInt()} min';
            }
          }

          activities.add({
            'id': event['Id'],
            'type': 'MEETING',
            'subject': event['Subject'] ?? 'Meeting',
            'description': event['Description'],
            'location': event['Location'],
            'duration': duration,
            'activityDate': event['StartDateTime'] ?? event['CreatedDate'],
            'createdAt': event['CreatedDate'],
            'contactName': event['Who']?['Name'],
            'relatedTo': event['What']?['Name'],
          });
        }

        // Sort all activities by date descending
        activities.sort((a, b) {
          final dateA = DateTime.tryParse(a['activityDate'] as String? ?? '') ?? DateTime(2000);
          final dateB = DateTime.tryParse(b['activityDate'] as String? ?? '') ?? DateTime(2000);
          return dateB.compareTo(dateA);
        });

        return limit != null ? activities.take(limit).toList() : activities;
      } else {
        // Local API mode
        final queryParams = <String, String>{
          'contactId': contactId,
        };
        if (limit != null) queryParams['limit'] = limit.toString();
        if (offset != null) queryParams['offset'] = offset.toString();

        final response = await _api.get('/activities', queryParameters: queryParams);
        final activities = _parseListResponse(response.data);

        // Transform to include contactName and relatedTo fields
        for (final activity in activities) {
          if (activity['contactName'] == null) {
            final contact = activity['contact'] as Map<String, dynamic>?;
            if (contact != null) {
              final firstName = contact['firstName'] as String? ?? '';
              final lastName = contact['lastName'] as String? ?? '';
              activity['contactName'] = '$firstName $lastName'.trim();
            }
          }
          if (activity['relatedTo'] == null) {
            final opportunity = activity['opportunity'] as Map<String, dynamic>?;
            final account = activity['account'] as Map<String, dynamic>?;
            if (opportunity != null) {
              activity['relatedTo'] = opportunity['name'] as String? ?? '';
            } else if (account != null) {
              activity['relatedTo'] = account['name'] as String? ?? '';
            }
          }
        }

        return activities;
      }
    } catch (e) {
      return [];
    }
  }

  // ============================================================================
  // OPPORTUNITIES / DEALS
  // ============================================================================

  Future<List<Map<String, dynamic>>> getOpportunities({int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          'SELECT Id, Name, Amount, StageName, Probability, CloseDate, '
          'Account.Name, Type, LeadSource, NextStep, IsClosed, IsWon, '
          'CreatedDate, LastModifiedDate '
          'FROM Opportunity ${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Opportunity',
        );
      } else {
        final response = await _api.get('/opportunities');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      _reportError(e, 'getOpportunities');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getOpportunityById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, Name, Amount, StageName, Probability, CloseDate, "
          "Account.Name, Account.Id, Type, LeadSource, NextStep, Description, "
          "IsClosed, IsWon, CreatedDate, LastModifiedDate "
          "FROM Opportunity WHERE Id = '$id'",
          objectType: 'Opportunity',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/opportunities/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new opportunity
  Future<Map<String, dynamic>?> createOpportunity(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.post('/salesforce/sobjects/Opportunity', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/opportunities', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing opportunity
  Future<Map<String, dynamic>?> updateOpportunity(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.patch('/salesforce/sobjects/Opportunity/$id', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.patch('/opportunities/$id', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete an opportunity
  Future<bool> deleteOpportunity(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Opportunity/$id');
      } else {
        await _api.delete('/opportunities/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get recent activities for an opportunity
  Future<List<Map<String, dynamic>>> getOpportunityActivities(String oppId) async {
    try {
      if (isSalesforceMode) {
        // Fetch tasks and events related to the opportunity
        final tasks = await _querySalesforce(
          "SELECT Id, Subject, Status, Priority, ActivityDate, CreatedDate, Description "
          "FROM Task WHERE WhatId = '$oppId' ORDER BY CreatedDate DESC LIMIT 10",
          objectType: 'Task',
        );
        final events = await _querySalesforce(
          "SELECT Id, Subject, StartDateTime, EndDateTime, Description, CreatedDate "
          "FROM Event WHERE WhatId = '$oppId' ORDER BY CreatedDate DESC LIMIT 10",
          objectType: 'Event',
        );

        // Combine and sort by date
        final combined = [
          ...tasks.map((t) => {...t, 'activityType': 'task'}),
          ...events.map((e) => {...e, 'activityType': 'event'}),
        ];
        combined.sort((a, b) {
          final dateA = DateTime.tryParse(a['CreatedDate'] as String? ?? '') ?? DateTime(2000);
          final dateB = DateTime.tryParse(b['CreatedDate'] as String? ?? '') ?? DateTime(2000);
          return dateB.compareTo(dateA);
        });
        return combined.take(5).toList();
      } else {
        final response = await _api.get('/activities', queryParameters: {
          'opportunityId': oppId,
          'limit': '5',
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> getPipelineStats() async {
    try {
      if (isSalesforceMode) {
        // Query Salesforce for pipeline data
        final opps = await _querySalesforce(
          'SELECT StageName, COUNT(Id) cnt, SUM(Amount) total '
          'FROM Opportunity WHERE IsClosed = false '
          'GROUP BY StageName',
          objectType: 'AggregateResult',
        );

        double totalValue = 0;
        int totalDeals = 0;
        final Map<String, Map<String, dynamic>> byStage = {};

        for (final opp in opps) {
          final stage = opp['StageName'] as String? ?? 'Unknown';
          final count = (opp['cnt'] as num?)?.toInt() ?? 0;
          final amount = (opp['total'] as num?)?.toDouble() ?? 0;

          totalDeals += count;
          totalValue += amount;
          byStage[stage] = {'count': count, 'value': amount};
        }

        return {
          'totalPipelineValue': totalValue,
          'openOpportunities': totalDeals,
          'byStage': byStage,
          'winRate': 0,
        };
      } else {
        final response = await _api.get('/opportunities/pipeline/stats');
        return response.data is Map<String, dynamic>
            ? response.data
            : {'totalPipelineValue': 0, 'openOpportunities': 0};
      }
    } catch (e) {
      return {'totalPipelineValue': 0, 'openOpportunities': 0};
    }
  }

  // ============================================================================
  // ACCOUNTS
  // ============================================================================

  Future<List<Map<String, dynamic>>> getAccounts({int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          'SELECT Id, Name, Industry, Type, Phone, Website, BillingCity, '
          'BillingState, AnnualRevenue, NumberOfEmployees, CreatedDate '
          'FROM Account ${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Account',
        );
      } else {
        final response = await _api.get('/accounts');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      _reportError(e, 'getAccounts');
      return [];
    }
  }

  /// Get single account by ID
  Future<Map<String, dynamic>?> getAccountById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, Name, Industry, Type, Phone, Fax, Website, "
          "BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, "
          "ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry, "
          "AnnualRevenue, NumberOfEmployees, Description, OwnerId, "
          "CreatedDate, LastModifiedDate "
          "FROM Account WHERE Id = '$id'",
          objectType: 'Account',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/accounts/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new account
  Future<Map<String, dynamic>?> createAccount(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.post('/salesforce/sobjects/Account', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/accounts', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing account
  Future<Map<String, dynamic>?> updateAccount(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.patch('/salesforce/sobjects/Account/$id', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.patch('/accounts/$id', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete an account
  Future<bool> deleteAccount(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Account/$id');
      } else {
        await _api.delete('/accounts/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get related opportunities for an account
  Future<List<Map<String, dynamic>>> getAccountOpportunities(String accountId) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          "SELECT Id, Name, Amount, StageName, CloseDate, Probability, IsWon, IsClosed "
          "FROM Opportunity WHERE AccountId = '$accountId' "
          "ORDER BY CloseDate DESC LIMIT 10",
          objectType: 'Opportunity',
        );
      } else {
        final response = await _api.get('/opportunities', queryParameters: {
          'accountId': accountId,
          'limit': '10',
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Get related contacts for an account
  Future<List<Map<String, dynamic>>> getAccountContacts(String accountId) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          "SELECT Id, FirstName, LastName, Email, Phone, Title "
          "FROM Contact WHERE AccountId = '$accountId' "
          "ORDER BY LastName ASC LIMIT 20",
          objectType: 'Contact',
        );
      } else {
        final response = await _api.get('/contacts', queryParameters: {
          'accountId': accountId,
          'limit': '20',
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  // ============================================================================
  // ACTIVITIES / EVENTS
  // ============================================================================

  Future<List<Map<String, dynamic>>> getActivities({int? limit}) async {
    try {
      if (isSalesforceMode) {
        // Fetch both Tasks and Events from Salesforce for TODAY only
        // Note: Standard Task object doesn't have Type field, classify by Subject
        final tasks = await _querySalesforce(
          'SELECT Id, Subject, Description, Status, Priority, ActivityDate, '
          'Who.Name, What.Name, CreatedDate '
          'FROM Task WHERE IsClosed = false AND ActivityDate = TODAY '
          '${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Task',
        );

        // Fetch events for TODAY only
        final events = await _querySalesforce(
          'SELECT Id, Subject, Description, StartDateTime, EndDateTime, '
          'Who.Name, What.Name, Location, CreatedDate '
          'FROM Event WHERE StartDateTime = TODAY '
          '${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Event',
        );

        // Transform to unified format
        final activities = <Map<String, dynamic>>[];

        for (final task in tasks) {
          // Classify task by subject content
          final subject = (task['Subject'] as String? ?? '').toLowerCase();
          String activityType = 'TASK';
          if (subject.contains('call') || subject.contains('phone')) {
            activityType = 'CALL';
          } else if (subject.contains('email') || subject.contains('send')) {
            activityType = 'EMAIL';
          }

          activities.add({
            'id': task['Id'],
            'type': activityType,
            'subject': task['Subject'],
            'title': task['Subject'],
            'description': task['Description'],
            'activityDate': task['ActivityDate'],
            'contactName': task['Who']?['Name'],
            'relatedTo': task['What']?['Name'],
            'createdAt': task['CreatedDate'],
          });
        }

        for (final event in events) {
          activities.add({
            'id': event['Id'],
            'type': 'MEETING',
            'subject': event['Subject'],
            'title': event['Subject'],
            'description': event['Description'],
            'startTime': event['StartDateTime'],
            'endTime': event['EndDateTime'],
            'location': event['Location'],
            'contactName': event['Who']?['Name'],
            'relatedTo': event['What']?['Name'],
            'createdAt': event['CreatedDate'],
          });
        }

        // Sort by date
        activities.sort((a, b) {
          final dateA = a['activityDate'] ?? a['startTime'] ?? a['createdAt'];
          final dateB = b['activityDate'] ?? b['startTime'] ?? b['createdAt'];
          if (dateA == null || dateB == null) return 0;
          return dateB.toString().compareTo(dateA.toString());
        });

        return activities.take(limit ?? activities.length).toList();
      } else {
        final response = await _api.get('/activities${limit != null ? '?limit=$limit' : ''}');
        final allActivities = _parseListResponse(response.data);

        // Process activities - no date filter for "Recent Activity" (shows all recent)
        final activities = <Map<String, dynamic>>[];
        for (final activity in allActivities) {
          // Transform to include contactName and relatedTo fields
          if (activity['contactName'] == null) {
            final contact = activity['contact'] as Map<String, dynamic>?;
            final lead = activity['lead'] as Map<String, dynamic>?;
            if (contact != null) {
              final firstName = contact['firstName'] as String? ?? '';
              final lastName = contact['lastName'] as String? ?? '';
              activity['contactName'] = '$firstName $lastName'.trim();
            } else if (lead != null) {
              final firstName = lead['firstName'] as String? ?? '';
              final lastName = lead['lastName'] as String? ?? '';
              activity['contactName'] = '$firstName $lastName'.trim();
            }
          }

          if (activity['relatedTo'] == null) {
            final opportunity = activity['opportunity'] as Map<String, dynamic>?;
            final account = activity['account'] as Map<String, dynamic>?;
            if (opportunity != null) {
              activity['relatedTo'] = opportunity['name'] as String? ?? '';
            } else if (account != null) {
              activity['relatedTo'] = account['name'] as String? ?? '';
            }
          }

          // Add title field if missing (use subject)
          if (activity['title'] == null) {
            activity['title'] = activity['subject'] as String? ?? 'Activity';
          }

          activities.add(activity);
        }

        return activities;
      }
    } catch (e) {
      return [];
    }
  }

  Future<Map<DateTime, List<Map<String, dynamic>>>> getCalendarEvents(DateTime month) async {
    try {
      final startOfMonth = DateTime(month.year, month.month, 1);
      final endOfMonth = DateTime(month.year, month.month + 1, 0, 23, 59, 59);

      if (isSalesforceMode) {
        // Fetch events and tasks
        final events = await _querySalesforce(
          "SELECT Id, Subject, Description, StartDateTime, EndDateTime, "
          "WhoId, Who.Name, What.Name, Location, Type "
          "FROM Event "
          "WHERE StartDateTime >= ${_formatSoqlDateTime(startOfMonth)} "
          "AND StartDateTime <= ${_formatSoqlDateTime(endOfMonth)}",
          objectType: 'Event',
        );

        final tasks = await _querySalesforce(
          "SELECT Id, Subject, Description, ActivityDate, Status, Priority, "
          "WhoId, Who.Name, What.Name "
          "FROM Task "
          "WHERE ActivityDate >= ${_formatSoqlDate(startOfMonth)} "
          "AND ActivityDate <= ${_formatSoqlDate(endOfMonth)}",
          objectType: 'Task',
        );

        // Collect all WhoIds (Contact or Lead IDs)
        final Set<String> contactIds = {};
        final Set<String> leadIds = {};

        for (final event in events) {
          final whoId = event['WhoId'] as String?;
          if (whoId != null && whoId.isNotEmpty) {
            // Salesforce ID prefixes: 003 = Contact, 00Q = Lead
            if (whoId.startsWith('003')) {
              contactIds.add(whoId);
            } else if (whoId.startsWith('00Q')) {
              leadIds.add(whoId);
            }
          }
        }
        for (final task in tasks) {
          final whoId = task['WhoId'] as String?;
          if (whoId != null && whoId.isNotEmpty) {
            if (whoId.startsWith('003')) {
              contactIds.add(whoId);
            } else if (whoId.startsWith('00Q')) {
              leadIds.add(whoId);
            }
          }
        }

        // Fetch contact details (phone, email) for all related contacts
        final Map<String, Map<String, String?>> contactDetails = {};

        if (contactIds.isNotEmpty) {
          final contactIdList = contactIds.map((id) => "'$id'").join(',');
          final contacts = await _querySalesforce(
            "SELECT Id, Phone, Email FROM Contact WHERE Id IN ($contactIdList)",
            objectType: 'Contact',
          );
          for (final contact in contacts) {
            final id = contact['Id'] as String?;
            if (id != null) {
              contactDetails[id] = {
                'phone': contact['Phone'] as String?,
                'email': contact['Email'] as String?,
              };
            }
          }
        }

        // Fetch lead details (phone, email) for all related leads
        if (leadIds.isNotEmpty) {
          final leadIdList = leadIds.map((id) => "'$id'").join(',');
          final leads = await _querySalesforce(
            "SELECT Id, Phone, Email FROM Lead WHERE Id IN ($leadIdList)",
            objectType: 'Lead',
          );
          for (final lead in leads) {
            final id = lead['Id'] as String?;
            if (id != null) {
              contactDetails[id] = {
                'phone': lead['Phone'] as String?,
                'email': lead['Email'] as String?,
              };
            }
          }
        }

        final Map<DateTime, List<Map<String, dynamic>>> eventsByDay = {};

        for (final event in events) {
          final startStr = event['StartDateTime'] as String?;
          if (startStr != null) {
            final startTime = DateTime.tryParse(startStr);
            if (startTime != null) {
              final dayKey = DateTime(startTime.year, startTime.month, startTime.day);
              // Classify event type using same logic as dashboard
              final subject = (event['Subject'] as String? ?? '').toLowerCase();
              final sfType = (event['Type'] as String? ?? '').toLowerCase();
              String eventType = 'meeting';
              if (sfType.contains('call') || subject.contains('call') || subject.contains('phone')) {
                eventType = 'call';
              } else if (subject.contains('demo') || subject.contains('presentation')) {
                eventType = 'meeting';
              }

              // Get contact details from our lookup map
              final whoId = event['WhoId'] as String?;
              final details = whoId != null ? contactDetails[whoId] : null;

              final eventData = {
                'id': event['Id'],
                'title': event['Subject'] ?? 'Event',
                'description': event['Description'],
                'startTime': startStr,
                'endTime': event['EndDateTime'],
                'type': eventType,
                'contactId': whoId,
                'contactName': event['Who']?['Name'],
                'contactPhone': details?['phone'],
                'contactEmail': details?['email'],
                'accountName': event['What']?['Name'],
                'location': event['Location'],
              };

              if (eventsByDay.containsKey(dayKey)) {
                eventsByDay[dayKey]!.add(eventData);
              } else {
                eventsByDay[dayKey] = [eventData];
              }
            }
          }
        }

        for (final task in tasks) {
          final dateStr = task['ActivityDate'] as String?;
          if (dateStr != null) {
            final date = DateTime.tryParse(dateStr);
            if (date != null) {
              final dayKey = DateTime(date.year, date.month, date.day);
              // Classify task type using same logic as dashboard
              final subject = (task['Subject'] as String? ?? '').toLowerCase();
              String taskType = 'task';
              if (subject.contains('call') || subject.contains('phone')) {
                taskType = 'call';
              } else if (subject.contains('meet') || subject.contains('demo') || subject.contains('presentation')) {
                taskType = 'meeting';
              }

              // Get contact details from our lookup map
              final whoId = task['WhoId'] as String?;
              final details = whoId != null ? contactDetails[whoId] : null;

              final taskData = {
                'id': task['Id'],
                'title': task['Subject'] ?? 'Task',
                'description': task['Description'],
                'startTime': dateStr,
                'type': taskType,
                'contactId': whoId,
                'contactName': task['Who']?['Name'],
                'contactPhone': details?['phone'],
                'contactEmail': details?['email'],
                'accountName': task['What']?['Name'],
              };

              if (eventsByDay.containsKey(dayKey)) {
                eventsByDay[dayKey]!.add(taskData);
              } else {
                eventsByDay[dayKey] = [taskData];
              }
            }
          }
        }

        // Also fetch IRIS scheduled meetings (may not be synced to Salesforce yet)
        await _addIrisMeetingsToCalendar(eventsByDay, startOfMonth, endOfMonth);

        return eventsByDay;
      } else {
        // Fetch activities (logged past events)
        final response = await _api.get('/activities', queryParameters: {
          'startDate': startOfMonth.toIso8601String(),
          'endDate': endOfMonth.toIso8601String(),
        });

        final items = _parseListResponse(response.data);
        final Map<DateTime, List<Map<String, dynamic>>> eventsByDay = {};

        for (final item in items) {
          final startStr = item['startTime'] as String? ??
              item['startDate'] as String? ??
              item['dueDate'] as String? ??
              item['activityDate'] as String?;

          if (startStr != null) {
            final startTime = DateTime.tryParse(startStr);
            if (startTime != null) {
              final dayKey = DateTime(startTime.year, startTime.month, startTime.day);
              if (eventsByDay.containsKey(dayKey)) {
                eventsByDay[dayKey]!.add(item);
              } else {
                eventsByDay[dayKey] = [item];
              }
            }
          }
        }

        // Also fetch IRIS scheduled meetings
        await _addIrisMeetingsToCalendar(eventsByDay, startOfMonth, endOfMonth);

        return eventsByDay;
      }
    } catch (e) {
      return {};
    }
  }

  /// Helper method to fetch IRIS scheduled meetings and add to calendar
  /// Used by both Salesforce and Local modes to ensure all meetings appear
  Future<void> _addIrisMeetingsToCalendar(
    Map<DateTime, List<Map<String, dynamic>>> eventsByDay,
    DateTime startOfMonth,
    DateTime endOfMonth,
  ) async {
    try {
      final meetingsResponse = await _api.get('/meetings');
      final meetings = _parseListResponse(meetingsResponse.data);

      for (final meeting in meetings) {
        final startStr = meeting['scheduledStart'] as String?;
        if (startStr != null) {
          final startTime = DateTime.tryParse(startStr);
          if (startTime != null) {
            // Check if meeting falls within the requested month
            if (startTime.isAfter(startOfMonth.subtract(const Duration(days: 1))) &&
                startTime.isBefore(endOfMonth.add(const Duration(days: 1)))) {
              final dayKey = DateTime(startTime.year, startTime.month, startTime.day);

              // Extract Salesforce IDs from direct props or metadata
              final metadata = meeting['metadata'] as Map<String, dynamic>? ?? {};
              final salesforceLeadId = meeting['salesforceLeadId'] as String? ??
                  metadata['salesforceLeadId'] as String?;
              final salesforceContactId = meeting['salesforceContactId'] as String? ??
                  metadata['salesforceContactId'] as String?;
              final salesforceAccountId = meeting['salesforceAccountId'] as String? ??
                  metadata['salesforceAccountId'] as String?;

              // Transform meeting to calendar event format
              final calendarEvent = {
                'id': meeting['id'],
                'title': meeting['title'] ?? 'Scheduled Meeting',
                'description': meeting['description'],
                'startTime': startStr,
                'endTime': meeting['scheduledEnd'],
                'type': 'meeting',
                'meetingUrl': meeting['meetingUrl'],
                'meetingId': meeting['externalMeetingId'],
                'meetingSessionId': meeting['id'],
                'location': meeting['meetingUrl'],
                'contactId': meeting['contactId'],
                'accountId': meeting['accountId'],
                'opportunityId': meeting['opportunityId'],
                'leadId': meeting['leadId'],
                // Salesforce CRM IDs (for Salesforce mode users)
                'salesforceLeadId': salesforceLeadId,
                'salesforceContactId': salesforceContactId,
                'salesforceAccountId': salesforceAccountId,
                // Include attendees if available
                'attendees': meeting['attendees'],
                'organizerName': meeting['organizerName'],
                'organizerEmail': meeting['organizerEmail'],
                'rsvpStatus': meeting['rsvpStatus'],
              };

              if (eventsByDay.containsKey(dayKey)) {
                // Avoid duplicates - check if meeting already exists by ID or Salesforce Event ID
                final sfEventId = meeting['salesforceEventId'] as String?;
                final exists = eventsByDay[dayKey]!.any((e) =>
                    e['id'] == meeting['id'] ||
                    e['meetingSessionId'] == meeting['id'] ||
                    (sfEventId != null && e['id'] == sfEventId));
                if (!exists) {
                  eventsByDay[dayKey]!.add(calendarEvent);
                }
              } else {
                eventsByDay[dayKey] = [calendarEvent];
              }
            }
          }
        }
      }
    } catch (e) {
      // Silently ignore meetings fetch errors - other calendar data still works
    }
  }

  // ============================================================================
  // TASKS
  // ============================================================================

  Future<List<Map<String, dynamic>>> getTasks({String? status, int? limit}) async {
    try {
      if (isSalesforceMode) {
        String whereClause = 'WHERE IsClosed = false';
        if (status != null) {
          whereClause = "WHERE Status = '$status'";
        }

        return await _querySalesforce(
          'SELECT Id, Subject, Description, Status, Priority, ActivityDate, '
          'Who.Name, What.Name, CreatedDate '
          'FROM Task $whereClause '
          '${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Task',
        );
      } else {
        String path = '/tasks';
        if (status != null) {
          path += '?status=$status';
        }
        final response = await _api.get(path);
        return _parseListResponse(response.data);
      }
    } catch (e) {
      _reportError(e, 'getTasks');
      return [];
    }
  }

  /// Get a single task by ID
  Future<Map<String, dynamic>?> getTaskById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, Subject, Description, Status, Priority, ActivityDate, "
          "Who.Name, Who.Id, What.Name, What.Id, CreatedDate, LastModifiedDate "
          "FROM Task WHERE Id = '$id'",
          objectType: 'Task',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/tasks/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new task
  Future<Map<String, dynamic>?> createTask(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.post('/salesforce/sobjects/Task', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/tasks', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing task
  Future<Map<String, dynamic>?> updateTask(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.patch('/salesforce/sobjects/Task/$id', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.patch('/tasks/$id', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a task
  Future<bool> deleteTask(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Task/$id');
      } else {
        await _api.delete('/tasks/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // ACTIVITIES - Create/Log Activities (calls, meetings, emails)
  // ============================================================================

  /// Log a call activity
  Future<Map<String, dynamic>?> logCall(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        // Salesforce Task with call subject
        final taskData = {
          'Subject': data['subject'] ?? 'Call',
          'Description': data['description'],
          'Status': 'Completed',
          'Priority': 'Normal',
          'ActivityDate': data['activityDate'] ?? DateTime.now().toIso8601String().split('T')[0],
          'WhoId': data['contactId'],
          'WhatId': data['relatedToId'],
        };
        final response = await _api.post('/salesforce/sobjects/Task', data: taskData);
        return response.data as Map<String, dynamic>?;
      } else {
        final activityData = {
          ...data,
          'type': 'CALL',
        };
        final response = await _api.post('/activities', data: activityData);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Log a meeting/event
  Future<Map<String, dynamic>?> logMeeting(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        // Salesforce Event object
        final eventData = {
          'Subject': data['subject'] ?? 'Meeting',
          'Description': data['description'],
          'StartDateTime': data['startTime'],
          'EndDateTime': data['endTime'],
          'Location': data['location'],
          'WhoId': data['contactId'],
          'WhatId': data['relatedToId'],
        };
        final response = await _api.post('/salesforce/sobjects/Event', data: eventData);
        return response.data as Map<String, dynamic>?;
      } else {
        final activityData = {
          ...data,
          'type': 'MEETING',
        };
        final response = await _api.post('/activities', data: activityData);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Log an email activity
  Future<Map<String, dynamic>?> logEmail(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        // Salesforce Task with email subject
        final taskData = {
          'Subject': data['subject'] ?? 'Email',
          'Description': data['description'],
          'Status': 'Completed',
          'Priority': 'Normal',
          'ActivityDate': data['activityDate'] ?? DateTime.now().toIso8601String().split('T')[0],
          'WhoId': data['contactId'],
          'WhatId': data['relatedToId'],
        };
        final response = await _api.post('/salesforce/sobjects/Task', data: taskData);
        return response.data as Map<String, dynamic>?;
      } else {
        final activityData = {
          ...data,
          'type': 'EMAIL',
        };
        final response = await _api.post('/activities', data: activityData);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete an activity
  Future<bool> deleteActivity(String id, {String? activityType}) async {
    try {
      if (isSalesforceMode) {
        // Determine if it's a Task or Event
        final objectType = activityType == 'MEETING' ? 'Event' : 'Task';
        await _api.delete('/salesforce/sobjects/$objectType/$id');
      } else {
        await _api.delete('/activities/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // NOTES
  // ============================================================================

  /// Get notes for an entity
  Future<List<Map<String, dynamic>>> getNotes({String? parentId, int? limit}) async {
    try {
      if (isSalesforceMode) {
        String whereClause = '';
        if (parentId != null) {
          whereClause = "WHERE ParentId = '$parentId'";
        }
        return await _querySalesforce(
          'SELECT Id, Title, Body, CreatedDate, LastModifiedDate, OwnerId '
          'FROM Note $whereClause '
          'ORDER BY CreatedDate DESC '
          '${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Note',
        );
      } else {
        final queryParams = <String, String>{};
        if (parentId != null) queryParams['parentId'] = parentId;
        if (limit != null) queryParams['limit'] = limit.toString();
        final response = await _api.get('/notes', queryParameters: queryParams);
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Create a note
  Future<Map<String, dynamic>?> createNote(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final noteData = {
          'Title': data['title'],
          'Body': data['body'] ?? data['content'],
          'ParentId': data['parentId'],
        };
        final response = await _api.post('/salesforce/sobjects/Note', data: noteData);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/notes', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update a note
  Future<Map<String, dynamic>?> updateNote(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final noteData = <String, dynamic>{};
        if (data['title'] != null) noteData['Title'] = data['title'];
        if (data['body'] != null || data['content'] != null) {
          noteData['Body'] = data['body'] ?? data['content'];
        }
        final response = await _api.patch('/salesforce/sobjects/Note/$id', data: noteData);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.patch('/notes/$id', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a note
  Future<bool> deleteNote(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Note/$id');
      } else {
        await _api.delete('/notes/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // SALES TRENDS - Revenue by Month (for charts)
  // ============================================================================

  /// Get sales trend data - closed won opportunities grouped by month
  /// Returns last 6 months of closed won revenue for trend visualization
  Future<List<Map<String, dynamic>>> getSalesTrend({int months = 6}) async {
    try {
      final now = DateTime.now();
      final startDate = DateTime(now.year, now.month - months + 1, 1);

      if (isSalesforceMode) {
        // Query Salesforce for closed won opportunities grouped by month
        final opps = await _querySalesforce(
          'SELECT CALENDAR_MONTH(CloseDate) month, CALENDAR_YEAR(CloseDate) year, '
          'SUM(Amount) total, COUNT(Id) cnt '
          'FROM Opportunity WHERE IsWon = true AND IsClosed = true '
          'AND CloseDate >= ${_formatSoqlDate(startDate)} '
          'GROUP BY CALENDAR_MONTH(CloseDate), CALENDAR_YEAR(CloseDate) '
          'ORDER BY CALENDAR_YEAR(CloseDate), CALENDAR_MONTH(CloseDate)',
          objectType: 'AggregateResult',
        );

        // Build result with all months (including zeros)
        final monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        final results = <Map<String, dynamic>>[];

        for (int i = 0; i < months; i++) {
          final targetMonth = DateTime(now.year, now.month - months + 1 + i, 1);
          final monthNum = targetMonth.month;
          final yearNum = targetMonth.year;

          // Find matching data from Salesforce
          final matchingData = opps.where((o) =>
            (o['month'] as num?)?.toInt() == monthNum &&
            (o['year'] as num?)?.toInt() == yearNum
          ).toList();

          final value = matchingData.isNotEmpty
            ? (matchingData.first['total'] as num?)?.toDouble() ?? 0.0
            : 0.0;
          final count = matchingData.isNotEmpty
            ? (matchingData.first['cnt'] as num?)?.toInt() ?? 0
            : 0;

          results.add({
            'label': monthNames[monthNum - 1],
            'month': monthNum,
            'year': yearNum,
            'value': value,
            'count': count,
          });
        }

        return results;
      } else {
        // Query local API for closed won opportunities
        final response = await _api.get('/opportunities', queryParameters: {
          'stage': 'Closed Won',
          'closeDateAfter': startDate.toIso8601String(),
        });

        final opps = _parseListResponse(response.data);
        final monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Group by month
        final Map<String, Map<String, dynamic>> byMonth = {};

        for (int i = 0; i < months; i++) {
          final targetMonth = DateTime(now.year, now.month - months + 1 + i, 1);
          final key = '${targetMonth.year}-${targetMonth.month}';
          byMonth[key] = {
            'label': monthNames[targetMonth.month - 1],
            'month': targetMonth.month,
            'year': targetMonth.year,
            'value': 0.0,
            'count': 0,
          };
        }

        for (final opp in opps) {
          final stage = (opp['stage'] as String? ?? opp['stageName'] as String? ?? '').toLowerCase();
          if (stage.contains('closed won') || stage.contains('won')) {
            final closeDateStr = opp['closeDate'] as String? ?? opp['CloseDate'] as String?;
            if (closeDateStr != null) {
              final closeDate = DateTime.tryParse(closeDateStr);
              if (closeDate != null) {
                final key = '${closeDate.year}-${closeDate.month}';
                if (byMonth.containsKey(key)) {
                  byMonth[key]!['value'] = (byMonth[key]!['value'] as double) +
                    ((opp['amount'] as num?)?.toDouble() ?? 0.0);
                  byMonth[key]!['count'] = (byMonth[key]!['count'] as int) + 1;
                }
              }
            }
          }
        }

        return byMonth.values.toList();
      }
    } catch (e) {
      return [];
    }
  }

  // ============================================================================
  // DASHBOARD METRICS
  // ============================================================================

  Future<Map<String, dynamic>> getDashboardMetrics() async {
    try {
      if (isSalesforceMode) {
        // Fetch counts from Salesforce
        final leadCount = await _querySalesforce(
          'SELECT COUNT() FROM Lead',
          objectType: 'AggregateResult',
        );
        final contactCount = await _querySalesforce(
          'SELECT COUNT() FROM Contact',
          objectType: 'AggregateResult',
        );
        final oppCount = await _querySalesforce(
          'SELECT COUNT() FROM Opportunity WHERE IsClosed = false',
          objectType: 'AggregateResult',
        );

        // Fetch today's events (meetings scheduled for today)
        // Note: Event object doesn't have 'Type' field - we infer from Subject
        final todayEvents = await _querySalesforce(
          'SELECT Id, Subject FROM Event WHERE StartDateTime = TODAY',
          objectType: 'Event',
        );

        // Fetch open tasks due TODAY only (not overdue or no-date tasks)
        final todayTasks = await _querySalesforce(
          'SELECT Id, Subject, Status FROM Task WHERE IsClosed = false AND ActivityDate = TODAY',
          objectType: 'Task',
        );

        // Count meetings and calls from activities
        int todayMeetings = 0;
        int todayCalls = 0;
        int tasksDueToday = 0;

        for (final event in todayEvents) {
          final subject = (event['Subject'] as String? ?? '').toLowerCase();
          final type = (event['Type'] as String? ?? '').toLowerCase();
          if (type.contains('call') || subject.contains('call') || subject.contains('phone')) {
            todayCalls++;
          } else {
            todayMeetings++;
          }
        }

        for (final task in todayTasks) {
          final subject = (task['Subject'] as String? ?? '').toLowerCase();
          // Count calls from tasks
          if (subject.contains('call') || subject.contains('phone')) {
            todayCalls++;
          } else if (subject.contains('meet') || subject.contains('demo') || subject.contains('presentation')) {
            todayMeetings++;
          }
          // Always count as a task due
          tasksDueToday++;
        }


        // Get pipeline stats and quota in parallel
        final pipelineAndQuota = await Future.wait([
          getPipelineStats(),
          _safeGet('/users/me/quota'),
        ]);
        final pipeline = pipelineAndQuota[0] as Map<String, dynamic>;
        final quotaResult = pipelineAndQuota[1];
        final quotaProgress = (quotaResult is Map ? quotaResult['quotaProgress'] as num? : null)?.toDouble() ?? 0.0;

        return {
          'totalLeads': _extractCount(leadCount),
          'totalContacts': _extractCount(contactCount),
          'totalOpportunities': _extractCount(oppCount),
          'pendingTasks': tasksDueToday, // Only tasks due TODAY (0 is valid)
          'todayMeetings': todayMeetings,
          'todayCalls': todayCalls,
          'pipelineValue': pipeline['totalPipelineValue'] ?? 0,
          'quotaProgress': quotaProgress,
        };
      } else {
        // Fetch from local endpoints - use dedicated count endpoints for accuracy
        final results = await Future.wait([
          _safeGet('/leads'),
          _safeGet('/contacts'),
          _safeGet('/opportunities'),
          _safeGet('/tasks?status=pending'),
          _safeGet('/opportunities/pipeline/stats'),
          _safeGet('/activities/count?date=today&type=MEETING'),
          _safeGet('/activities/count?date=today&type=CALL'),
          _safeGet('/users/me/quota'),
        ]);

        // Extract counts from dedicated endpoints
        final meetingsResult = results[5];
        final callsResult = results[6];
        final quotaResult = results[7];

        final todayMeetings = (meetingsResult is Map ? meetingsResult['count'] as int? : null) ?? 0;
        final todayCalls = (callsResult is Map ? callsResult['count'] as int? : null) ?? 0;
        final quotaProgress = (quotaResult is Map ? quotaResult['quotaProgress'] as num? : null)?.toDouble() ?? 0.0;

        // Count pending tasks from the filtered list
        final pendingTasks = _getListLength(results[3]);

        return {
          'totalLeads': _getListLength(results[0]),
          'totalContacts': _getListLength(results[1]),
          'totalOpportunities': _getListLength(results[2]),
          'pendingTasks': pendingTasks,
          'todayMeetings': todayMeetings,
          'todayCalls': todayCalls,
          'pipelineValue': (results[4] is Map ? results[4]['totalPipelineValue'] : 0)?.toDouble() ?? 0,
          'quotaProgress': quotaProgress,
        };
      }
    } catch (e) {
      _reportError(e, 'getDashboardMetrics');
      return {
        'totalLeads': 0,
        'totalContacts': 0,
        'totalOpportunities': 0,
        'pendingTasks': 0,
        'todayMeetings': 0,
        'todayCalls': 0,
        'pipelineValue': 0,
        'quotaProgress': 0,
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /// Execute a SOQL query against Salesforce
  Future<List<Map<String, dynamic>>> _querySalesforce(
    String soql, {
    required String objectType,
  }) async {
    try {
      // Use /salesforce/query endpoint with JWT auth (not salesforce-package)
      final response = await _api.post(
        '/salesforce/query',
        data: {'soql': soql},
        options: Options(
          // Accept both 200 and 201 as valid responses
          validateStatus: (status) => status != null && status >= 200 && status < 300,
        ),
      );

      final data = response.data;
      if (data == null) {
        return [];
      }

      if (data is Map<String, dynamic>) {
        final records = data['records'] as List<dynamic>?;
        if (records != null) {
          return records.cast<Map<String, dynamic>>();
        }
        // Response has no records array - return empty
        return [];
      }

      return [];
    } on DioException catch (e) {
      // Handle Dio-specific errors and report
      _reportError(e, '_querySalesforce');
      return [];
    } catch (e) {
      _reportError(e, '_querySalesforce');
      return [];
    }
  }

  Future<dynamic> _safeGet(String path) async {
    try {
      final response = await _api.get(path);
      return response.data;
    } catch (e) {
      _reportError(e, '_safeGet($path)');
      return null;
    }
  }

  List<Map<String, dynamic>> _parseListResponse(dynamic data) {
    if (data is List) {
      return data.whereType<Map<String, dynamic>>().toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List).whereType<Map<String, dynamic>>().toList();
    }
    if (data is Map && data['items'] is List) {
      return (data['items'] as List).whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }

  int _getListLength(dynamic data) {
    if (data is List) return data.length;
    if (data is Map && data['data'] is List) return (data['data'] as List).length;
    if (data is Map && data['items'] is List) return (data['items'] as List).length;
    return 0;
  }

  int _extractCount(List<Map<String, dynamic>> result) {
    if (result.isEmpty) return 0;
    // Salesforce COUNT() returns in 'expr0' field
    return (result.first['expr0'] as num?)?.toInt() ?? 0;
  }

  /// Format DateTime for SOQL DateTime fields (e.g., StartDateTime, EndDateTime)
  String _formatSoqlDateTime(DateTime date) {
    // SOQL DateTime format: YYYY-MM-DDTHH:MM:SSZ
    return '${date.toUtc().toIso8601String().split('.').first}Z';
  }

  /// Format Date for SOQL Date fields (e.g., ActivityDate, CloseDate)
  String _formatSoqlDate(DateTime date) {
    // SOQL Date format: YYYY-MM-DD (no time component)
    return '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  // ============================================================================
  // ACTIVITY MANAGEMENT
  // ============================================================================

  /// Create a new activity (Event in Salesforce)
  Future<Map<String, dynamic>?> createActivity(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        // Map to Salesforce Event fields
        final eventData = {
          'Subject': data['subject'] ?? data['title'],
          'StartDateTime': data['startTime'],
          'EndDateTime': data['endTime'],
          'Description': data['description'],
          'WhoId': data['whoId'], // Lead or Contact ID
          'WhatId': data['whatId'], // Account or Opportunity ID
          'Type': data['type'] ?? 'Meeting',
        };
        // Remove null values
        eventData.removeWhere((key, value) => value == null);
        final response = await _api.post('/salesforce/sobjects/Event', data: eventData);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/activities', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // LEAD CONVERSION
  // ============================================================================

  /// Convert a lead to Account, Contact, and Opportunity
  Future<Map<String, dynamic>?> convertLead(String leadId) async {
    try {
      if (isSalesforceMode) {
        // Salesforce lead conversion via REST API
        final convertData = {
          'leadId': leadId,
          'convertedStatus': 'Closed - Converted',
          'doNotCreateOpportunity': false,
        };
        final response = await _api.post('/salesforce/leads/$leadId/convert', data: convertData);
        return response.data as Map<String, dynamic>?;
      } else {
        // Local API lead conversion
        final response = await _api.post('/leads/$leadId/convert');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // CONTRACTS
  // ============================================================================

  /// Get all contracts
  Future<List<Map<String, dynamic>>> getContracts({int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          'SELECT Id, ContractNumber, AccountId, Account.Name, Status, StartDate, EndDate, '
          'ContractTerm, SpecialTerms, Description, CreatedDate, LastModifiedDate '
          'FROM Contract ${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Contract',
        );
      } else {
        final response = await _api.get('/contracts${limit != null ? '?limit=$limit' : ''}');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Get contract by ID
  Future<Map<String, dynamic>?> getContractById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, ContractNumber, AccountId, Account.Name, Status, StartDate, EndDate, "
          "ContractTerm, SpecialTerms, Description, BillingStreet, BillingCity, BillingState, "
          "BillingPostalCode, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, "
          "CreatedDate, LastModifiedDate FROM Contract WHERE Id = '$id'",
          objectType: 'Contract',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/contracts/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new contract
  Future<Map<String, dynamic>?> createContract(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final contractData = {
          'AccountId': data['accountId'],
          'Status': data['status'] ?? 'Draft',
          'StartDate': data['startDate'],
          'EndDate': data['endDate'],
          'ContractTerm': data['contractTerm'],
          'SpecialTerms': data['terms'] ?? data['specialTerms'],
          'Description': data['description'],
        };
        contractData.removeWhere((key, value) => value == null);
        final response = await _api.post('/salesforce/sobjects/Contract', data: contractData);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/contracts', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing contract
  Future<Map<String, dynamic>?> updateContract(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.patch('/salesforce/sobjects/Contract/$id', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.patch('/contracts/$id', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a contract
  Future<bool> deleteContract(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Contract/$id');
      } else {
        await _api.delete('/contracts/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // QUOTES
  // ============================================================================

  /// Get all quotes
  Future<List<Map<String, dynamic>>> getQuotes({int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          'SELECT Id, Name, QuoteNumber, Status, ExpirationDate, GrandTotal, Discount, Tax, '
          'OpportunityId, Opportunity.Name, AccountId, Account.Name, ContactId, Contact.Name, '
          'Description, CreatedDate, LastModifiedDate '
          'FROM Quote ${limit != null ? 'LIMIT $limit' : ''}',
          objectType: 'Quote',
        );
      } else {
        final response = await _api.get('/quotes${limit != null ? '?limit=$limit' : ''}');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Get quote by ID
  Future<Map<String, dynamic>?> getQuoteById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, Name, QuoteNumber, Status, ExpirationDate, GrandTotal, Subtotal, Discount, Tax, "
          "OpportunityId, Opportunity.Name, AccountId, Account.Name, ContactId, Contact.Name, "
          "Description, ShippingHandling, BillingName, BillingStreet, BillingCity, BillingState, "
          "BillingPostalCode, ShippingName, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, "
          "CreatedDate, LastModifiedDate FROM Quote WHERE Id = '\$id'",
          objectType: 'Quote',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/quotes/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new quote
  Future<Map<String, dynamic>?> createQuote(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final quoteData = {
          'Name': data['name'],
          'Status': data['status'] ?? 'Draft',
          if (data['expiryDate'] != null || data['expirationDate'] != null)
            'ExpirationDate': data['expiryDate'] ?? data['expirationDate'],
          if (data['opportunityId'] != null) 'OpportunityId': data['opportunityId'],
          if (data['description'] != null) 'Description': data['description'],
          if (data['discount'] != null) 'Discount': data['discount'],
          if (data['tax'] != null) 'Tax': data['tax'],
        };
        final response = await _api.post('/salesforce/sobjects/Quote', data: quoteData);
        final id = response.data['id'] as String?;
        if (id != null) {
          // Create line items if provided
          final lineItems = data['lineItems'] as List?;
          if (lineItems != null) {
            for (final item in lineItems) {
              await _api.post('/salesforce/sobjects/QuoteLineItem', data: {
                'QuoteId': id,
                'Product2Id': item['productId'],
                'Quantity': item['quantity'],
                'UnitPrice': item['unitPrice'],
                if (item['description'] != null) 'Description': item['description'],
              });
            }
          }
          return getQuoteById(id);
        }
        return null;
      } else {
        final response = await _api.post('/quotes', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing quote
  Future<Map<String, dynamic>?> updateQuote(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final quoteData = {
          if (data['name'] != null) 'Name': data['name'],
          if (data['status'] != null) 'Status': data['status'],
          if (data['expiryDate'] != null || data['expirationDate'] != null)
            'ExpirationDate': data['expiryDate'] ?? data['expirationDate'],
          if (data['description'] != null) 'Description': data['description'],
          if (data['discount'] != null) 'Discount': data['discount'],
          if (data['tax'] != null) 'Tax': data['tax'],
        };
        await _api.patch('/salesforce/sobjects/Quote/$id', data: quoteData);
        return getQuoteById(id);
      } else {
        final response = await _api.patch('/quotes/$id', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a quote
  Future<bool> deleteQuote(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Quote/$id');
      } else {
        await _api.delete('/quotes/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // ORDERS
  // ============================================================================

  /// Get all orders
  Future<List<Map<String, dynamic>>> getOrders({int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          'SELECT Id, OrderNumber, Status, TotalAmount, EffectiveDate, '
          'Account.Name, BillToContact.Name, Description, '
          'CreatedDate, LastModifiedDate '
          'FROM Order ORDER BY CreatedDate DESC'
          '${limit != null ? ' LIMIT $limit' : ''}',
          objectType: 'Order',
        );
      } else {
        final response = await _api.get('/orders');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      _reportError(e, 'getOrders');
      return [];
    }
  }

  /// Get a single order by ID
  Future<Map<String, dynamic>?> getOrderById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, OrderNumber, Status, TotalAmount, EffectiveDate, "
          "Account.Name, Account.Id, BillToContact.Name, Description, "
          "CreatedDate, LastModifiedDate "
          "FROM Order WHERE Id = '$id'",
          objectType: 'Order',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/orders/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      _reportError(e, 'getOrderById');
      return null;
    }
  }

  /// Create a new order
  Future<Map<String, dynamic>?> createOrder(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final response = await _api.post('/salesforce/sobjects/Order', data: data);
        return response.data as Map<String, dynamic>?;
      } else {
        final response = await _api.post('/orders', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing order
  Future<Map<String, dynamic>?> updateOrder(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        await _api.patch('/salesforce/sobjects/Order/$id', data: data);
        return getOrderById(id);
      } else {
        final response = await _api.patch('/orders/$id', data: data);
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // PRODUCTS
  // ============================================================================

  /// Get all products
  Future<List<Map<String, dynamic>>> getProducts({int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          'SELECT Id, Name, ProductCode, Family, Description, IsActive '
          'FROM Product2 WHERE IsActive = true ORDER BY Name ASC'
          '${limit != null ? ' LIMIT $limit' : ''}',
          objectType: 'Product2',
        );
      } else {
        final response = await _api.get('/products');
        return _parseListResponse(response.data);
      }
    } catch (e) {
      _reportError(e, 'getProducts');
      return [];
    }
  }

  /// Get a single product by ID
  Future<Map<String, dynamic>?> getProductById(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, Name, ProductCode, Family, Description, IsActive "
          "FROM Product2 WHERE Id = '$id'",
          objectType: 'Product2',
        );
        return results.isNotEmpty ? results.first : null;
      } else {
        final response = await _api.get('/products/$id');
        return response.data as Map<String, dynamic>?;
      }
    } catch (e) {
      _reportError(e, 'getProductById');
      return null;
    }
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// CRM Data Service provider - automatically uses correct mode with caching support
/// Includes:
/// - JSON-based cache service for general data
/// - Typed Hive cache for leads and contacts
/// - Connectivity-aware offline-first data access
/// - Error reporting for monitoring
final crmDataServiceProvider = Provider<CrmDataService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  final cachedService = ref.watch(cachedCrmServiceProvider);
  final cacheService = ref.watch(cacheServiceProvider);
  final isOnline = ref.watch(isOnlineProvider);
  final errorService = ref.watch(errorReportingServiceProvider);

  return CrmDataService(
    api,
    authMode,
    cachedService,
    cacheService,
    isOnline,
    errorService,
  );
});

/// Leads provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmLeadsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  // Watch authMode to force rebuild when mode changes
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getLeads();
});

/// Contacts provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmContactsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getContacts();
});

/// Opportunities provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmOpportunitiesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getOpportunities();
});

/// Accounts provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmAccountsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getAccounts();
});

/// Pipeline stats provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmPipelineStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getPipelineStats();
});

/// Sales trend provider - closed won revenue by month for charts
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmSalesTrendProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getSalesTrend(months: 6);
});

/// Dashboard metrics provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmDashboardMetricsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getDashboardMetrics();
});

/// Activities provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmActivitiesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getActivities(limit: 10);
});

/// Tasks provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmTasksProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getTasks();
});

/// Calendar events provider using CRM service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final crmCalendarEventsProvider = FutureProvider.family<Map<DateTime, List<Map<String, dynamic>>>, DateTime>((ref, month) async {
  ref.watch(authModeProvider);
  final service = ref.watch(crmDataServiceProvider);
  return service.getCalendarEvents(month);
});
