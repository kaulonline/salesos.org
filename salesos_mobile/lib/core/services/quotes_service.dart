import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../models/quote.dart';
import '../providers/auth_mode_provider.dart';

/// Quotes service for managing sales quotes
/// Communicates with backend /api/quotes/* endpoints or Salesforce via proxy
class QuotesService {
  final ApiClient _api;
  final AuthMode _authMode;

  QuotesService(this._api, this._authMode);

  /// Check if we're in Salesforce mode
  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  // ============================================================================
  // QUOTES CRUD
  // ============================================================================

  /// Get all quotes with optional filters
  /// [status] - Filter by quote status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)
  /// [opportunityId] - Filter by opportunity
  /// [accountId] - Filter by account
  Future<List<Quote>> getQuotes({
    QuoteStatus? status,
    String? opportunityId,
    String? accountId,
  }) async {
    try {
      if (isSalesforceMode) {
        // Build SOQL WHERE clause
        final conditions = <String>[];
        if (status != null) conditions.add("Status = '${status.value}'");
        if (opportunityId != null) conditions.add("OpportunityId = '$opportunityId'");
        if (accountId != null) conditions.add("Account.Id = '$accountId'");

        final whereClause = conditions.isNotEmpty ? 'WHERE ${conditions.join(' AND ')}' : '';

        final results = await _querySalesforce(
          'SELECT Id, Name, QuoteNumber, Status, ExpirationDate, Description, '
          'GrandTotal, Subtotal, TotalPrice, Discount, Tax, ShippingHandling, '
          'OpportunityId, Opportunity.Name, AccountId, Account.Name, ContactId, Contact.Name, '
          'BillingName, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, '
          'ShippingName, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry, '
          'CreatedDate, LastModifiedDate '
          'FROM Quote $whereClause '
          'ORDER BY CreatedDate DESC',
        );

        return results.map((json) => Quote.fromSalesforceJson(json)).toList();
      } else {
        final queryParams = <String, dynamic>{};
        if (status != null) queryParams['status'] = status.value;
        if (opportunityId != null) queryParams['opportunityId'] = opportunityId;
        if (accountId != null) queryParams['accountId'] = accountId;

        final response = await _api.get(
          '/quotes',
          queryParameters: queryParams.isNotEmpty ? queryParams : null,
        );

        final data = response.data;
        if (data is List) {
          return data
              .whereType<Map<String, dynamic>>()
              .map((json) => Quote.fromJson(json))
              .toList();
        }

        return [];
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Get a single quote by ID with all details including line items
  Future<Quote> getQuote(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, Name, QuoteNumber, Status, ExpirationDate, Description, "
          "GrandTotal, Subtotal, TotalPrice, Discount, Tax, ShippingHandling, "
          "OpportunityId, Opportunity.Name, AccountId, Account.Name, ContactId, Contact.Name, "
          "BillingName, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, "
          "ShippingName, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry, "
          "CreatedDate, LastModifiedDate "
          "FROM Quote WHERE Id = '$id'",
        );

        if (results.isEmpty) {
          throw Exception('Quote not found');
        }
        return Quote.fromSalesforceJson(results.first);
      } else {
        final response = await _api.get('/quotes/$id');
        final data = _safeParseResponseData(response.data);
        if (data == null) throw Exception('Invalid response: expected quote data');
        return Quote.fromJson(data);
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Create a new quote
  Future<Quote> createQuote(CreateQuoteDto data) async {
    try {
      if (isSalesforceMode) {
        final sfData = {
          'Name': data.name,
          'OpportunityId': data.opportunityId,
          'Status': 'Draft',
          'ExpirationDate': data.validUntil?.toIso8601String(),
          'Description': data.description,
          'Tax': data.tax,
          'ShippingHandling': data.shippingHandling,
          'BillingStreet': data.billingStreet,
          'BillingCity': data.billingCity,
          'BillingState': data.billingState,
          'BillingPostalCode': data.billingPostalCode,
          'BillingCountry': data.billingCountry,
          'ShippingStreet': data.shippingStreet,
          'ShippingCity': data.shippingCity,
          'ShippingState': data.shippingState,
          'ShippingPostalCode': data.shippingPostalCode,
          'ShippingCountry': data.shippingCountry,
        };
        sfData.removeWhere((key, value) => value == null);

        final response = await _api.post('/salesforce/sobjects/Quote', data: sfData);
        if (response.data != null && response.data['id'] != null) {
          return await getQuote(response.data['id'] as String);
        }
        throw Exception('Failed to create quote');
      } else {
        final response = await _api.post('/quotes', data: data.toJson());
        final responseData = _safeParseResponseData(response.data);
        if (responseData == null) throw Exception('Invalid response: expected quote data');
        return Quote.fromJson(responseData);
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing quote
  Future<Quote> updateQuote(String id, UpdateQuoteDto data) async {
    try {
      if (isSalesforceMode) {
        final sfData = <String, dynamic>{};
        if (data.name != null) sfData['Name'] = data.name;
        if (data.validUntil != null) sfData['ExpirationDate'] = data.validUntil!.toIso8601String();
        if (data.description != null) sfData['Description'] = data.description;
        if (data.tax != null) sfData['Tax'] = data.tax;
        if (data.shippingHandling != null) sfData['ShippingHandling'] = data.shippingHandling;
        if (data.billingStreet != null) sfData['BillingStreet'] = data.billingStreet;
        if (data.billingCity != null) sfData['BillingCity'] = data.billingCity;
        if (data.billingState != null) sfData['BillingState'] = data.billingState;
        if (data.billingPostalCode != null) sfData['BillingPostalCode'] = data.billingPostalCode;
        if (data.billingCountry != null) sfData['BillingCountry'] = data.billingCountry;
        if (data.shippingStreet != null) sfData['ShippingStreet'] = data.shippingStreet;
        if (data.shippingCity != null) sfData['ShippingCity'] = data.shippingCity;
        if (data.shippingState != null) sfData['ShippingState'] = data.shippingState;
        if (data.shippingPostalCode != null) sfData['ShippingPostalCode'] = data.shippingPostalCode;
        if (data.shippingCountry != null) sfData['ShippingCountry'] = data.shippingCountry;

        await _api.patch('/salesforce/sobjects/Quote/$id', data: sfData);
        return await getQuote(id);
      } else {
        final response = await _api.patch('/quotes/$id', data: data.toJson());
        final responseData = _safeParseResponseData(response.data);
        if (responseData == null) throw Exception('Invalid response: expected quote data');
        return Quote.fromJson(responseData);
      }
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // LINE ITEMS
  // ============================================================================

  /// Add a line item to a quote
  Future<QuoteLineItem> addLineItem(String quoteId, AddLineItemDto item) async {
    try {
      final response = await _api.post(
        '/quotes/$quoteId/line-items',
        data: item.toJson(),
      );
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected line item data');
      return QuoteLineItem.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing line item
  Future<QuoteLineItem> updateLineItem(
    String lineItemId,
    UpdateLineItemDto item,
  ) async {
    try {
      final response = await _api.patch(
        '/quotes/line-items/$lineItemId',
        data: item.toJson(),
      );
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected line item data');
      return QuoteLineItem.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a line item from a quote
  Future<void> deleteLineItem(String lineItemId) async {
    try {
      await _api.delete('/quotes/line-items/$lineItemId');
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // QUOTE ACTIONS
  // ============================================================================

  /// Send a quote to the customer
  /// Changes status from DRAFT to SENT
  Future<Quote> sendQuote(String id) async {
    try {
      final response = await _api.post('/quotes/$id/send');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected quote data');
      return Quote.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Accept a quote
  /// Changes status from SENT to ACCEPTED
  Future<Quote> acceptQuote(String id) async {
    try {
      final response = await _api.post('/quotes/$id/accept');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected quote data');
      return Quote.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Reject a quote
  /// Changes status from SENT to REJECTED
  /// [reason] - Optional reason for rejection
  Future<Quote> rejectQuote(String id, {String? reason}) async {
    try {
      final response = await _api.post(
        '/quotes/$id/reject',
        data: reason != null ? {'reason': reason} : null,
      );
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected quote data');
      return Quote.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /// Get quote statistics
  Future<QuoteStats> getQuoteStats() async {
    try {
      final response = await _api.get('/quotes/stats');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected stats data');
      return QuoteStats.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /// Safely parse response data to a Map.
  /// Returns null if data is null or not a Map.
  Map<String, dynamic>? _safeParseResponseData(dynamic data) {
    if (data == null) return null;
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return null;
  }

  /// Get quotes for a specific opportunity
  Future<List<Quote>> getQuotesForOpportunity(String opportunityId) async {
    return getQuotes(opportunityId: opportunityId);
  }

  /// Get quotes for a specific account
  Future<List<Quote>> getQuotesForAccount(String accountId) async {
    return getQuotes(accountId: accountId);
  }

  /// Get all draft quotes
  Future<List<Quote>> getDraftQuotes() async {
    return getQuotes(status: QuoteStatus.DRAFT);
  }

  /// Get all sent quotes (pending response)
  Future<List<Quote>> getSentQuotes() async {
    return getQuotes(status: QuoteStatus.SENT);
  }

  /// Get all accepted quotes
  Future<List<Quote>> getAcceptedQuotes() async {
    return getQuotes(status: QuoteStatus.ACCEPTED);
  }

  /// Get all rejected quotes
  Future<List<Quote>> getRejectedQuotes() async {
    return getQuotes(status: QuoteStatus.REJECTED);
  }

  // ============================================================================
  // SALESFORCE HELPER METHODS
  // ============================================================================

  /// Execute a SOQL query against Salesforce via the backend proxy
  Future<List<Map<String, dynamic>>> _querySalesforce(String soql) async {
    try {
      final response = await _api.post(
        '/salesforce/query',
        data: {'soql': soql},
        options: Options(
          validateStatus: (status) => status != null && status >= 200 && status < 300,
        ),
      );

      final data = response.data;
      if (data == null) return [];

      if (data is Map<String, dynamic>) {
        final records = data['records'] as List<dynamic>?;
        if (records != null) {
          return records.cast<Map<String, dynamic>>();
        }
      }

      return [];
    } catch (e) {
      return [];
    }
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Quotes service provider
final quotesServiceProvider = Provider<QuotesService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return QuotesService(api, authMode);
});

/// All quotes provider
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final quotesProvider = FutureProvider.autoDispose<List<Quote>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuotes();
});

/// Single quote provider by ID
final quoteProvider =
    FutureProvider.autoDispose.family<Quote, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuote(id);
});

/// Alias for quoteProvider - Single quote provider by ID
/// This alias is provided for naming consistency with other services
final quoteByIdProvider = quoteProvider;

/// Quotes filtered by status
final quotesByStatusProvider = FutureProvider.autoDispose
    .family<List<Quote>, QuoteStatus>((ref, status) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuotes(status: status);
});

/// Quotes filtered by opportunity
final quotesByOpportunityProvider = FutureProvider.autoDispose
    .family<List<Quote>, String>((ref, opportunityId) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuotesForOpportunity(opportunityId);
});

/// Quotes filtered by account
final quotesByAccountProvider =
    FutureProvider.autoDispose.family<List<Quote>, String>((ref, accountId) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuotesForAccount(accountId);
});

/// Quote statistics provider
final quoteStatsProvider = FutureProvider.autoDispose<QuoteStats>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuoteStats();
});

/// Draft quotes count provider
final draftQuotesCountProvider = FutureProvider.autoDispose<int>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  final quotes = await service.getDraftQuotes();
  return quotes.length;
});

/// Pending quotes (sent, awaiting response) count provider
final pendingQuotesCountProvider = FutureProvider.autoDispose<int>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  final quotes = await service.getSentQuotes();
  return quotes.length;
});

// ============================================================================
// STATE NOTIFIERS FOR MUTATIONS
// ============================================================================

/// Quote list state for managing quotes with mutations
class QuotesNotifier extends AsyncNotifier<List<Quote>> {
  @override
  Future<List<Quote>> build() async {
    final service = ref.read(quotesServiceProvider);
    return service.getQuotes();
  }

  /// Refresh the quotes list
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(quotesServiceProvider);
      return service.getQuotes();
    });
  }

  /// Create a new quote
  Future<Quote> create(CreateQuoteDto data) async {
    final service = ref.read(quotesServiceProvider);
    final quote = await service.createQuote(data);
    await refresh();
    return quote;
  }

  /// Update a quote
  Future<Quote> updateQuote(String id, UpdateQuoteDto data) async {
    final service = ref.read(quotesServiceProvider);
    final quote = await service.updateQuote(id, data);
    await refresh();
    return quote;
  }

  /// Send a quote
  Future<Quote> send(String id) async {
    final service = ref.read(quotesServiceProvider);
    final quote = await service.sendQuote(id);
    await refresh();
    return quote;
  }

  /// Accept a quote
  Future<Quote> accept(String id) async {
    final service = ref.read(quotesServiceProvider);
    final quote = await service.acceptQuote(id);
    await refresh();
    return quote;
  }

  /// Reject a quote
  Future<Quote> reject(String id, {String? reason}) async {
    final service = ref.read(quotesServiceProvider);
    final quote = await service.rejectQuote(id, reason: reason);
    await refresh();
    return quote;
  }
}

/// Quotes list notifier provider
final quotesNotifierProvider =
    AsyncNotifierProvider<QuotesNotifier, List<Quote>>(QuotesNotifier.new);

