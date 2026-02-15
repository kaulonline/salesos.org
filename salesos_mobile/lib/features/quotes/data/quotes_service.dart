// ignore_for_file: constant_identifier_names

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/providers.dart';
import '../../../core/providers/auth_mode_provider.dart';
import '../../../shared/widgets/luxury_card.dart';

/// Quote status enum matching web TypeScript QuoteStatus type
enum QuoteStatus {
  DRAFT,
  PENDING_APPROVAL,
  APPROVED,
  SENT,
  VIEWED,
  ACCEPTED,
  REJECTED,
  EXPIRED,
  CANCELLED;

  String get label {
    switch (this) {
      case QuoteStatus.DRAFT:
        return 'Draft';
      case QuoteStatus.PENDING_APPROVAL:
        return 'Pending Approval';
      case QuoteStatus.APPROVED:
        return 'Approved';
      case QuoteStatus.SENT:
        return 'Sent';
      case QuoteStatus.VIEWED:
        return 'Viewed';
      case QuoteStatus.ACCEPTED:
        return 'Accepted';
      case QuoteStatus.REJECTED:
        return 'Rejected';
      case QuoteStatus.EXPIRED:
        return 'Expired';
      case QuoteStatus.CANCELLED:
        return 'Cancelled';
    }
  }

  Color get color {
    switch (this) {
      case QuoteStatus.DRAFT:
        return LuxuryColors.textMuted;
      case QuoteStatus.PENDING_APPROVAL:
        return LuxuryColors.warningAmber;
      case QuoteStatus.APPROVED:
        return LuxuryColors.jadePremium;
      case QuoteStatus.SENT:
        return LuxuryColors.infoCobalt;
      case QuoteStatus.VIEWED:
        return LuxuryColors.infoCobalt;
      case QuoteStatus.ACCEPTED:
        return LuxuryColors.successGreen;
      case QuoteStatus.REJECTED:
        return LuxuryColors.errorRuby;
      case QuoteStatus.EXPIRED:
        return LuxuryColors.warningAmber;
      case QuoteStatus.CANCELLED:
        return LuxuryColors.textMuted;
    }
  }

  static QuoteStatus fromString(String? status) {
    switch (status?.toUpperCase()) {
      case 'DRAFT':
        return QuoteStatus.DRAFT;
      case 'PENDING_APPROVAL':
      case 'PENDING':
        return QuoteStatus.PENDING_APPROVAL;
      case 'APPROVED':
        return QuoteStatus.APPROVED;
      case 'SENT':
        return QuoteStatus.SENT;
      case 'VIEWED':
        return QuoteStatus.VIEWED;
      case 'ACCEPTED':
        return QuoteStatus.ACCEPTED;
      case 'REJECTED':
      case 'DECLINED':
        return QuoteStatus.REJECTED;
      case 'EXPIRED':
        return QuoteStatus.EXPIRED;
      case 'CANCELLED':
      case 'CANCELED':
        return QuoteStatus.CANCELLED;
      default:
        return QuoteStatus.DRAFT;
    }
  }
}

/// Quote line item model matching web QuoteLineItem interface
class QuoteLineItem {
  final String? id;
  final String quoteId;
  final String? productId;
  final String name; // maps to productName on web
  final String? productCode;
  final String? description;
  final int quantity;
  final double unitPrice;
  final double? listPrice;
  final double? discount;
  final double? discountPercent;
  final double? tax;
  final double? taxPercent;
  final double totalPrice;
  final int sortOrder;
  final Map<String, dynamic>? product;

  QuoteLineItem({
    this.id,
    this.quoteId = '',
    this.productId,
    required this.name,
    this.productCode,
    this.description,
    required this.quantity,
    required this.unitPrice,
    this.listPrice,
    this.discount,
    this.discountPercent,
    this.tax,
    this.taxPercent,
    double? totalPrice,
    this.sortOrder = 0,
    this.product,
  }) : totalPrice = totalPrice ?? (unitPrice * quantity) - (discount ?? 0);

  double get lineTotal => totalPrice;

  QuoteLineItem copyWith({
    String? id,
    String? quoteId,
    String? name,
    String? productCode,
    String? description,
    int? quantity,
    double? unitPrice,
    double? listPrice,
    double? discount,
    double? discountPercent,
    double? tax,
    double? taxPercent,
    double? totalPrice,
    int? sortOrder,
    String? productId,
    Map<String, dynamic>? product,
  }) {
    return QuoteLineItem(
      id: id ?? this.id,
      quoteId: quoteId ?? this.quoteId,
      name: name ?? this.name,
      productCode: productCode ?? this.productCode,
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      listPrice: listPrice ?? this.listPrice,
      discount: discount ?? this.discount,
      discountPercent: discountPercent ?? this.discountPercent,
      tax: tax ?? this.tax,
      taxPercent: taxPercent ?? this.taxPercent,
      totalPrice: totalPrice ?? this.totalPrice,
      sortOrder: sortOrder ?? this.sortOrder,
      productId: productId ?? this.productId,
      product: product ?? this.product,
    );
  }

  factory QuoteLineItem.fromJson(Map<String, dynamic> json) {
    final qty = (json['quantity'] as num?)?.toInt() ?? 1;
    final price = (json['unitPrice'] as num?)?.toDouble() ?? 0.0;
    final disc = (json['discount'] as num?)?.toDouble();
    final tp = (json['totalPrice'] as num?)?.toDouble() ??
        (json['total'] as num?)?.toDouble();

    return QuoteLineItem(
      id: json['id'] as String? ?? '',
      quoteId: json['quoteId'] as String? ?? '',
      productId: json['productId'] as String? ?? json['Product2Id'] as String?,
      name: json['productName'] as String? ?? json['name'] as String? ?? 'Product',
      productCode: json['productCode'] as String?,
      description: json['description'] as String?,
      quantity: qty,
      unitPrice: price,
      listPrice: (json['listPrice'] as num?)?.toDouble(),
      discount: disc,
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      tax: (json['tax'] as num?)?.toDouble(),
      taxPercent: (json['taxPercent'] as num?)?.toDouble(),
      totalPrice: tp ?? (price * qty) - (disc ?? 0),
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      product: json['product'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'quoteId': quoteId,
        if (productId != null) 'productId': productId,
        'productName': name,
        if (productCode != null) 'productCode': productCode,
        if (description != null) 'description': description,
        'quantity': quantity,
        'unitPrice': unitPrice,
        if (listPrice != null) 'listPrice': listPrice,
        if (discount != null) 'discount': discount,
        if (discountPercent != null) 'discountPercent': discountPercent,
        if (tax != null) 'tax': tax,
        if (taxPercent != null) 'taxPercent': taxPercent,
        'totalPrice': totalPrice,
        'sortOrder': sortOrder,
      };
}

/// Quote model matching web Quote interface
class QuoteModel {
  final String id;
  final String quoteNumber;
  final String name;
  final String customerName;
  final String? customerCompany;
  final double subtotal; // was 'amount'; web uses 'subtotal'
  final QuoteStatus status;
  final DateTime createdAt;
  final DateTime? expirationDate; // was 'expiryDate'; web uses 'expirationDate'
  final DateTime? sentAt;
  final String? description;
  final String? notes;
  final String? dealId;
  final String? dealName;
  final String? opportunityId; // web field name
  final String? accountId;
  final String? contactId;
  final String? priceBookId;
  final String? ownerId;
  final String? createdBy;
  final double? discount;
  final double? discountPercent;
  final double? tax;
  final double? taxPercent;
  final double? shippingCost;
  final double? total;
  final double? totalPrice;
  final String currency;
  final String? terms;
  final String? paymentTerms;
  final Map<String, dynamic>? billingAddress;
  final Map<String, dynamic>? shippingAddress;
  final bool? isSynced;
  final DateTime? viewedAt;
  final DateTime? acceptedAt;
  final DateTime? rejectedAt;
  final String? rejectionReason;
  final DateTime? updatedAt;
  final Map<String, dynamic>? opportunity;
  final Map<String, dynamic>? account;
  final Map<String, dynamic>? contact;
  final Map<String, dynamic>? owner;
  final List<QuoteLineItem> lineItems;

  QuoteModel({
    required this.id,
    required this.quoteNumber,
    this.name = '',
    required this.customerName,
    this.customerCompany,
    required this.subtotal,
    required this.status,
    required this.createdAt,
    this.expirationDate,
    this.sentAt,
    this.description,
    this.notes,
    this.dealId,
    this.dealName,
    this.opportunityId,
    this.accountId,
    this.contactId,
    this.priceBookId,
    this.ownerId,
    this.createdBy,
    this.discount,
    this.discountPercent,
    this.tax,
    this.taxPercent,
    this.shippingCost,
    this.total,
    this.totalPrice,
    this.currency = 'USD',
    this.terms,
    this.paymentTerms,
    this.billingAddress,
    this.shippingAddress,
    this.isSynced,
    this.viewedAt,
    this.acceptedAt,
    this.rejectedAt,
    this.rejectionReason,
    this.updatedAt,
    this.opportunity,
    this.account,
    this.contact,
    this.owner,
    this.lineItems = const [],
  });

  /// Backward-compatible alias: amount -> subtotal
  double get amount => subtotal;

  /// Backward-compatible alias: expiryDate -> expirationDate
  DateTime? get expiryDate => expirationDate;

  bool get isExpired {
    if (expirationDate == null) return false;
    return DateTime.now().isAfter(expirationDate!);
  }

  int get daysUntilExpiry {
    if (expirationDate == null) return -1;
    return expirationDate!.difference(DateTime.now()).inDays;
  }

  String get statusLabel => status.label;

  factory QuoteModel.fromJson(Map<String, dynamic> json) {
    // Parse dates
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      if (value is String) return DateTime.tryParse(value);
      return null;
    }

    // Parse subtotal - backward compatible with 'amount' and other fields
    double parseSubtotal(Map<String, dynamic> json) {
      if (json['subtotal'] != null) {
        return (json['subtotal'] as num).toDouble();
      }
      if (json['amount'] != null) {
        return (json['amount'] as num).toDouble();
      }
      if (json['totalPrice'] != null) {
        return (json['totalPrice'] as num).toDouble();
      }
      if (json['grandTotal'] != null) {
        return (json['grandTotal'] as num).toDouble();
      }
      return 0.0;
    }

    // Parse customer name from account or opportunity
    String customerName = 'Unknown';
    String? customerCompany;

    if (json['account'] != null) {
      customerCompany = json['account']['name'] as String?;
      customerName = customerCompany ?? 'Unknown';
    } else if (json['opportunity'] != null) {
      customerName = json['opportunity']['name'] as String? ?? 'Unknown';
      if (json['opportunity']['account'] != null) {
        customerCompany = json['opportunity']['account']['name'] as String?;
      }
    }

    // Backward compat: check old mobile field names too
    if (customerName == 'Unknown') {
      customerName = json['customerName'] as String? ?? 'Unknown';
    }
    customerCompany ??= json['customerCompany'] as String?;

    // Parse line items
    List<QuoteLineItem> lineItems = [];
    if (json['lineItems'] != null && json['lineItems'] is List) {
      lineItems = (json['lineItems'] as List)
          .map((item) => QuoteLineItem.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    return QuoteModel(
      id: json['id'] as String? ?? '',
      quoteNumber: json['quoteNumber'] as String? ?? json['name'] as String? ?? 'Q-XXX',
      name: json['name'] as String? ?? json['quoteNumber'] as String? ?? '',
      customerName: customerName,
      customerCompany: customerCompany,
      subtotal: parseSubtotal(json),
      status: QuoteStatus.fromString(json['status'] as String?),
      createdAt: parseDate(json['createdAt']) ?? DateTime.now(),
      expirationDate: parseDate(json['expirationDate'] ?? json['validUntil'] ?? json['expiryDate']),
      sentAt: parseDate(json['sentAt'] ?? json['sentDate']),
      description: json['description'] as String?,
      notes: json['notes'] as String?,
      dealId: json['opportunityId'] as String? ?? json['dealId'] as String?,
      dealName: json['opportunity']?['name'] as String? ?? json['dealName'] as String?,
      opportunityId: json['opportunityId'] as String? ?? json['dealId'] as String?,
      accountId: json['accountId'] as String?,
      contactId: json['contactId'] as String?,
      priceBookId: json['priceBookId'] as String?,
      ownerId: json['ownerId'] as String?,
      createdBy: json['createdBy'] as String?,
      discount: (json['discount'] as num?)?.toDouble(),
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      tax: (json['tax'] as num?)?.toDouble(),
      taxPercent: (json['taxPercent'] as num?)?.toDouble(),
      shippingCost: (json['shippingCost'] as num?)?.toDouble() ??
          (json['shippingHandling'] as num?)?.toDouble(),
      total: (json['total'] as num?)?.toDouble(),
      totalPrice: (json['totalPrice'] as num?)?.toDouble(),
      currency: json['currency'] as String? ?? 'USD',
      terms: json['terms'] as String?,
      paymentTerms: json['paymentTerms'] as String?,
      billingAddress: json['billingAddress'] as Map<String, dynamic>?,
      shippingAddress: json['shippingAddress'] as Map<String, dynamic>?,
      isSynced: json['isSynced'] as bool?,
      viewedAt: parseDate(json['viewedAt']),
      acceptedAt: parseDate(json['acceptedAt'] ?? json['acceptedDate']),
      rejectedAt: parseDate(json['rejectedAt'] ?? json['rejectedDate']),
      rejectionReason: json['rejectionReason'] as String? ?? json['rejectedReason'] as String?,
      updatedAt: parseDate(json['updatedAt']),
      opportunity: json['opportunity'] as Map<String, dynamic>?,
      account: json['account'] as Map<String, dynamic>?,
      contact: json['contact'] as Map<String, dynamic>?,
      owner: json['owner'] as Map<String, dynamic>?,
      lineItems: lineItems,
    );
  }

  /// Factory constructor for Salesforce JSON format
  factory QuoteModel.fromSalesforceJson(Map<String, dynamic> json) {
    // Parse dates from Salesforce format
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      if (value is String) return DateTime.tryParse(value);
      return null;
    }

    // Parse subtotal from Salesforce fields
    double parseSubtotal(Map<String, dynamic> json) {
      if (json['Subtotal'] != null) {
        return (json['Subtotal'] as num).toDouble();
      }
      if (json['TotalPrice'] != null) {
        return (json['TotalPrice'] as num).toDouble();
      }
      if (json['GrandTotal'] != null) {
        return (json['GrandTotal'] as num).toDouble();
      }
      return 0.0;
    }

    // Parse customer name from Salesforce nested objects
    String customerName = 'Unknown';
    String? customerCompany;

    if (json['Account'] != null) {
      customerCompany = json['Account']['Name'] as String?;
      customerName = customerCompany ?? 'Unknown';
    } else if (json['Opportunity'] != null) {
      customerName = json['Opportunity']['Name'] as String? ?? 'Unknown';
    }

    return QuoteModel(
      id: json['Id'] as String? ?? '',
      quoteNumber: json['QuoteNumber'] as String? ?? json['Name'] as String? ?? 'Q-XXX',
      name: json['Name'] as String? ?? '',
      customerName: customerName,
      customerCompany: customerCompany,
      subtotal: parseSubtotal(json),
      status: QuoteStatus.fromString(json['Status'] as String?),
      createdAt: parseDate(json['CreatedDate']) ?? DateTime.now(),
      expirationDate: parseDate(json['ExpirationDate']),
      sentAt: null, // Salesforce Quote doesn't have sentAt by default
      description: json['Description'] as String?,
      dealId: json['OpportunityId'] as String?,
      dealName: json['Opportunity']?['Name'] as String?,
      opportunityId: json['OpportunityId'] as String?,
      accountId: json['AccountId'] as String?,
      discount: (json['Discount'] as num?)?.toDouble(),
      tax: (json['Tax'] as num?)?.toDouble(),
      shippingCost: (json['ShippingHandling'] as num?)?.toDouble(),
      totalPrice: (json['GrandTotal'] as num?)?.toDouble() ??
          (json['TotalPrice'] as num?)?.toDouble(),
      currency: 'USD',
      updatedAt: parseDate(json['LastModifiedDate']),
      lineItems: [], // Line items would need separate query
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'quoteNumber': quoteNumber,
        'name': name,
        'status': status.name,
        'subtotal': subtotal,
        if (accountId != null) 'accountId': accountId,
        if (contactId != null) 'contactId': contactId,
        if (opportunityId != null) 'opportunityId': opportunityId,
        if (priceBookId != null) 'priceBookId': priceBookId,
        if (ownerId != null) 'ownerId': ownerId,
        if (createdBy != null) 'createdBy': createdBy,
        if (expirationDate != null) 'expirationDate': expirationDate!.toIso8601String(),
        if (description != null) 'description': description,
        if (notes != null) 'notes': notes,
        if (discount != null) 'discount': discount,
        if (discountPercent != null) 'discountPercent': discountPercent,
        if (tax != null) 'tax': tax,
        if (taxPercent != null) 'taxPercent': taxPercent,
        if (shippingCost != null) 'shippingCost': shippingCost,
        if (total != null) 'total': total,
        if (totalPrice != null) 'totalPrice': totalPrice,
        'currency': currency,
        if (terms != null) 'terms': terms,
        if (paymentTerms != null) 'paymentTerms': paymentTerms,
        if (billingAddress != null) 'billingAddress': billingAddress,
        if (shippingAddress != null) 'shippingAddress': shippingAddress,
        'createdAt': createdAt.toIso8601String(),
        if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
        'lineItems': lineItems.map((item) => item.toJson()).toList(),
      };
}

/// Quotes service for fetching and managing quotes
class QuotesService {
  final ApiClient _api;
  final AuthMode _authMode;

  QuotesService(this._api, this._authMode);

  /// Check if we're in Salesforce mode
  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  /// Get all quotes from the API
  Future<List<QuoteModel>> getQuotes({QuoteStatus? status, String? opportunityId}) async {
    try {
      if (isSalesforceMode) {
        // Build SOQL WHERE clause for Salesforce
        final conditions = <String>[];
        if (status != null) conditions.add("Status = '${status.label}'");
        if (opportunityId != null) conditions.add("OpportunityId = '$opportunityId'");

        final whereClause = conditions.isNotEmpty ? 'WHERE ${conditions.join(' AND ')}' : '';

        final results = await _querySalesforce(
          'SELECT Id, Name, QuoteNumber, Status, ExpirationDate, Description, '
          'GrandTotal, Subtotal, TotalPrice, Discount, Tax, ShippingHandling, '
          'OpportunityId, Opportunity.Name, AccountId, Account.Name, '
          'CreatedDate, LastModifiedDate '
          'FROM Quote $whereClause '
          'ORDER BY CreatedDate DESC',
        );

        return results.map((json) => QuoteModel.fromSalesforceJson(json)).toList();
      } else {
        // Local API mode
        final queryParams = <String, dynamic>{};
        if (status != null) {
          queryParams['status'] = status.name;
        }
        if (opportunityId != null) {
          queryParams['opportunityId'] = opportunityId;
        }

        final response = await _api.get(
          '/quotes',
          queryParameters: queryParams.isNotEmpty ? queryParams : null,
        );

        if (response.data == null) return [];

        // Handle both list and paginated response
        List<dynamic> quotesData;
        if (response.data is List) {
          quotesData = response.data as List;
        } else if (response.data is Map && response.data['data'] != null) {
          quotesData = response.data['data'] as List;
        } else if (response.data is Map && response.data['quotes'] != null) {
          quotesData = response.data['quotes'] as List;
        } else {
          return [];
        }

        return quotesData
            .map((json) => QuoteModel.fromJson(json as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      // Return empty list on error - let UI handle empty state
      return [];
    }
  }

  /// Get quote statistics
  Future<Map<String, dynamic>> getQuoteStats() async {
    try {
      final response = await _api.get('/quotes/stats');
      return response.data as Map<String, dynamic>? ?? {};
    } catch (e) {
      return {};
    }
  }

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

  /// Get a single quote by ID
  Future<QuoteModel?> getQuoteById(String id) async {
    try {
      final response = await _api.get('/quotes/$id');
      if (response.data == null) return null;
      return QuoteModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Create a new quote
  Future<QuoteModel?> createQuote({
    required String accountId,
    required String opportunityId,
    required String name,
    DateTime? expirationDate,
    String? description,
    double? shippingCost,
    double? tax,
    double? discount,
    String? currency,
    String? paymentTerms,
  }) async {
    try {
      final response = await _api.post('/quotes', data: {
        'accountId': accountId,
        'opportunityId': opportunityId,
        'name': name,
        if (expirationDate != null) 'expirationDate': expirationDate.toIso8601String(),
        'description': ?description,
        'shippingCost': ?shippingCost,
        'tax': ?tax,
        'discount': ?discount,
        'currency': ?currency,
        'paymentTerms': ?paymentTerms,
      });
      if (response.data == null) return null;
      return QuoteModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Update a quote
  Future<QuoteModel?> updateQuote(String id, {
    String? name,
    DateTime? expirationDate,
    String? description,
    double? shippingCost,
    double? tax,
    double? discount,
    String? currency,
    String? paymentTerms,
  }) async {
    try {
      final response = await _api.patch('/quotes/$id', data: {
        'name': ?name,
        if (expirationDate != null) 'expirationDate': expirationDate.toIso8601String(),
        'description': ?description,
        'shippingCost': ?shippingCost,
        'tax': ?tax,
        'discount': ?discount,
        'currency': ?currency,
        'paymentTerms': ?paymentTerms,
      });
      if (response.data == null) return null;
      return QuoteModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Send a quote to customer
  Future<QuoteModel?> sendQuote(String id) async {
    try {
      final response = await _api.post('/quotes/$id/send');
      if (response.data == null) return null;
      return QuoteModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Accept a quote
  Future<QuoteModel?> acceptQuote(String id) async {
    try {
      final response = await _api.post('/quotes/$id/accept');
      if (response.data == null) return null;
      return QuoteModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Reject a quote
  Future<QuoteModel?> rejectQuote(String id, {String? reason}) async {
    try {
      final response = await _api.post('/quotes/$id/reject', data: {
        'reason': ?reason,
      });
      if (response.data == null) return null;
      return QuoteModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Add a line item to a quote
  Future<QuoteLineItem?> addLineItem(String quoteId, {
    required String productName,
    String? description,
    required int quantity,
    required double listPrice,
    required double unitPrice,
    double? discount,
  }) async {
    try {
      final response = await _api.post('/quotes/$quoteId/line-items', data: {
        'productName': productName,
        'description': ?description,
        'quantity': quantity,
        'listPrice': listPrice,
        'unitPrice': unitPrice,
        'discount': ?discount,
      });
      if (response.data == null) return null;
      return QuoteLineItem.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Update a line item
  Future<QuoteLineItem?> updateLineItem(String lineItemId, {
    String? productName,
    String? description,
    int? quantity,
    double? listPrice,
    double? unitPrice,
    double? discount,
  }) async {
    try {
      final response = await _api.patch('/quotes/line-items/$lineItemId', data: {
        'productName': ?productName,
        'description': ?description,
        'quantity': ?quantity,
        'listPrice': ?listPrice,
        'unitPrice': ?unitPrice,
        'discount': ?discount,
      });
      if (response.data == null) return null;
      return QuoteLineItem.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Remove a line item
  Future<void> removeLineItem(String lineItemId) async {
    try {
      await _api.delete('/quotes/line-items/$lineItemId');
    } catch (e) {
      rethrow;
    }
  }
}

/// Quotes service provider
final quotesServiceProvider = Provider<QuotesService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return QuotesService(api, authMode);
});

/// Quotes data provider
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final quotesProvider =
    FutureProvider.autoDispose<List<QuoteModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuotes();
});

/// Quote stats provider
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final quoteStatsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(quotesServiceProvider);
  return service.getQuoteStats();
});
