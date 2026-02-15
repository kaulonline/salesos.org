// ignore_for_file: constant_identifier_names

// Quote models for SalesOS Mobile App.
// Matches web TypeScript Quote and QuoteLineItem interfaces.

/// Quote status enum matching web QuoteStatus type
enum QuoteStatus {
  DRAFT('DRAFT'),
  PENDING_APPROVAL('PENDING_APPROVAL'),
  APPROVED('APPROVED'),
  SENT('SENT'),
  VIEWED('VIEWED'),
  ACCEPTED('ACCEPTED'),
  REJECTED('REJECTED'),
  EXPIRED('EXPIRED'),
  CANCELLED('CANCELLED');

  const QuoteStatus(this.value);
  final String value;

  String get label {
    switch (this) {
      case QuoteStatus.DRAFT: return 'Draft';
      case QuoteStatus.PENDING_APPROVAL: return 'Pending Approval';
      case QuoteStatus.APPROVED: return 'Approved';
      case QuoteStatus.SENT: return 'Sent';
      case QuoteStatus.VIEWED: return 'Viewed';
      case QuoteStatus.ACCEPTED: return 'Accepted';
      case QuoteStatus.REJECTED: return 'Rejected';
      case QuoteStatus.EXPIRED: return 'Expired';
      case QuoteStatus.CANCELLED: return 'Cancelled';
    }
  }

  static QuoteStatus fromString(String? value) {
    if (value == null) return QuoteStatus.DRAFT;
    switch (value.toUpperCase()) {
      case 'DRAFT': return QuoteStatus.DRAFT;
      case 'PENDING_APPROVAL':
      case 'PENDING': return QuoteStatus.PENDING_APPROVAL;
      case 'APPROVED': return QuoteStatus.APPROVED;
      case 'SENT': return QuoteStatus.SENT;
      case 'VIEWED': return QuoteStatus.VIEWED;
      case 'ACCEPTED': return QuoteStatus.ACCEPTED;
      case 'REJECTED':
      case 'DECLINED': return QuoteStatus.REJECTED;
      case 'EXPIRED': return QuoteStatus.EXPIRED;
      case 'CANCELLED':
      case 'CANCELED': return QuoteStatus.CANCELLED;
      default: return QuoteStatus.DRAFT;
    }
  }
}

/// Quote line item model matching web QuoteLineItem interface
class QuoteLineItem {
  final String id;
  final String quoteId;
  final String? productId;
  final String productName;
  final String? productCode;
  final String? description;
  final double quantity;
  final double listPrice;
  final double unitPrice;
  final double discount;
  final double? discountPercent;
  final double? tax;
  final double? taxPercent;
  final double totalPrice;
  final int sortOrder;
  final Map<String, dynamic>? product;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const QuoteLineItem({
    required this.id,
    required this.quoteId,
    this.productId,
    required this.productName,
    this.productCode,
    this.description,
    this.quantity = 1,
    required this.listPrice,
    required this.unitPrice,
    this.discount = 0,
    this.discountPercent,
    this.tax,
    this.taxPercent,
    required this.totalPrice,
    this.sortOrder = 0,
    this.product,
    this.createdAt,
    this.updatedAt,
  });

  factory QuoteLineItem.fromJson(Map<String, dynamic> json) {
    return QuoteLineItem(
      id: json['id'] as String? ?? '',
      quoteId: json['quoteId'] as String? ?? '',
      productId: json['productId'] as String? ?? json['Product2Id'] as String?,
      productName: json['productName'] as String? ?? json['name'] as String? ?? '',
      productCode: json['productCode'] as String?,
      description: json['description'] as String?,
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1,
      listPrice: (json['listPrice'] as num?)?.toDouble() ?? 0,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      tax: (json['tax'] as num?)?.toDouble(),
      taxPercent: (json['taxPercent'] as num?)?.toDouble(),
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ??
          (json['total'] as num?)?.toDouble() ?? 0,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      product: json['product'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'quoteId': quoteId,
      if (productId != null) 'productId': productId,
      'productName': productName,
      if (productCode != null) 'productCode': productCode,
      if (description != null) 'description': description,
      'quantity': quantity,
      'listPrice': listPrice,
      'unitPrice': unitPrice,
      'discount': discount,
      if (discountPercent != null) 'discountPercent': discountPercent,
      if (tax != null) 'tax': tax,
      if (taxPercent != null) 'taxPercent': taxPercent,
      'totalPrice': totalPrice,
      'sortOrder': sortOrder,
    };
  }

  QuoteLineItem copyWith({
    String? id,
    String? quoteId,
    String? productId,
    String? productName,
    String? productCode,
    String? description,
    double? quantity,
    double? listPrice,
    double? unitPrice,
    double? discount,
    double? discountPercent,
    double? tax,
    double? taxPercent,
    double? totalPrice,
    int? sortOrder,
    Map<String, dynamic>? product,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return QuoteLineItem(
      id: id ?? this.id,
      quoteId: quoteId ?? this.quoteId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      productCode: productCode ?? this.productCode,
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      listPrice: listPrice ?? this.listPrice,
      unitPrice: unitPrice ?? this.unitPrice,
      discount: discount ?? this.discount,
      discountPercent: discountPercent ?? this.discountPercent,
      tax: tax ?? this.tax,
      taxPercent: taxPercent ?? this.taxPercent,
      totalPrice: totalPrice ?? this.totalPrice,
      sortOrder: sortOrder ?? this.sortOrder,
      product: product ?? this.product,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Related opportunity summary
class QuoteOpportunity {
  final String id;
  final String? name;

  const QuoteOpportunity({
    required this.id,
    this.name,
  });

  factory QuoteOpportunity.fromJson(Map<String, dynamic> json) {
    return QuoteOpportunity(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
    );
  }
}

/// Related account summary
class QuoteAccount {
  final String id;
  final String? name;

  const QuoteAccount({
    required this.id,
    this.name,
  });

  factory QuoteAccount.fromJson(Map<String, dynamic> json) {
    return QuoteAccount(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
    );
  }
}

/// Quote owner summary
class QuoteOwner {
  final String id;
  final String? name;
  final String? email;

  const QuoteOwner({
    required this.id,
    this.name,
    this.email,
  });

  factory QuoteOwner.fromJson(Map<String, dynamic> json) {
    return QuoteOwner(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
      email: json['email'] as String?,
    );
  }
}

/// Quote model matching web Quote interface
class Quote {
  final String id;
  final String opportunityId;
  final String accountId;
  final String? contactId;
  final String ownerId;
  final String? createdBy;
  final String? priceBookId;
  final String quoteNumber;
  final String name;
  final QuoteStatus status;

  // Pricing
  final double subtotal;
  final double discount;
  final double? discountPercent;
  final double tax;
  final double? taxPercent;
  final double shippingHandling;
  final double? shippingCost;
  final double totalPrice;
  final double? total;
  final String currency;

  // Terms
  final DateTime? expirationDate;
  final String? paymentTerms;
  final String? terms;
  final String? description;
  final String? notes;

  // Billing address (web uses Map, keep individual fields for backward compat)
  final String? billingStreet;
  final String? billingCity;
  final String? billingState;
  final String? billingPostalCode;
  final String? billingCountry;
  final Map<String, dynamic>? billingAddressMap;

  // Shipping address
  final String? shippingStreet;
  final String? shippingCity;
  final String? shippingState;
  final String? shippingPostalCode;
  final String? shippingCountry;
  final Map<String, dynamic>? shippingAddressMap;

  // Status tracking
  final bool? isSynced;
  final DateTime? sentAt;
  final DateTime? sentDate;
  final DateTime? viewedAt;
  final DateTime? acceptedAt;
  final DateTime? acceptedDate;
  final DateTime? rejectedAt;
  final DateTime? rejectedDate;
  final String? rejectionReason;
  final String? rejectedReason;

  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Relations
  final QuoteOpportunity? opportunity;
  final QuoteAccount? account;
  final QuoteOwner? owner;
  final Map<String, dynamic>? contact;
  final List<QuoteLineItem> lineItems;

  const Quote({
    required this.id,
    required this.opportunityId,
    required this.accountId,
    this.contactId,
    required this.ownerId,
    this.createdBy,
    this.priceBookId,
    required this.quoteNumber,
    required this.name,
    this.status = QuoteStatus.DRAFT,
    this.subtotal = 0,
    this.discount = 0,
    this.discountPercent,
    this.tax = 0,
    this.taxPercent,
    this.shippingHandling = 0,
    this.shippingCost,
    this.totalPrice = 0,
    this.total,
    this.currency = 'USD',
    this.expirationDate,
    this.paymentTerms,
    this.terms,
    this.description,
    this.notes,
    this.billingStreet,
    this.billingCity,
    this.billingState,
    this.billingPostalCode,
    this.billingCountry,
    this.billingAddressMap,
    this.shippingStreet,
    this.shippingCity,
    this.shippingState,
    this.shippingPostalCode,
    this.shippingCountry,
    this.shippingAddressMap,
    this.isSynced,
    this.sentAt,
    this.sentDate,
    this.viewedAt,
    this.acceptedAt,
    this.acceptedDate,
    this.rejectedAt,
    this.rejectedDate,
    this.rejectionReason,
    this.rejectedReason,
    this.createdAt,
    this.updatedAt,
    this.opportunity,
    this.account,
    this.owner,
    this.contact,
    this.lineItems = const [],
  });

  /// Backward-compatible alias: validUntil -> expirationDate
  DateTime? get validUntil => expirationDate;

  factory Quote.fromJson(Map<String, dynamic> json) {
    return Quote(
      id: json['id'] as String? ?? '',
      opportunityId: json['opportunityId'] as String? ?? json['dealId'] as String? ?? '',
      accountId: json['accountId'] as String? ?? '',
      contactId: json['contactId'] as String?,
      ownerId: json['ownerId'] as String? ?? '',
      createdBy: json['createdBy'] as String?,
      priceBookId: json['priceBookId'] as String?,
      quoteNumber: json['quoteNumber'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: QuoteStatus.fromString(json['status'] as String?),
      subtotal: (json['subtotal'] as num?)?.toDouble() ??
          (json['amount'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      tax: (json['tax'] as num?)?.toDouble() ?? 0,
      taxPercent: (json['taxPercent'] as num?)?.toDouble(),
      shippingHandling: (json['shippingHandling'] as num?)?.toDouble() ?? 0,
      shippingCost: (json['shippingCost'] as num?)?.toDouble(),
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble(),
      currency: json['currency'] as String? ?? 'USD',
      expirationDate: _parseDateTime(json['expirationDate'] ?? json['validUntil'] ?? json['expiryDate']),
      paymentTerms: json['paymentTerms'] as String?,
      terms: json['terms'] as String?,
      description: json['description'] as String?,
      notes: json['notes'] as String?,
      billingStreet: json['billingStreet'] as String?,
      billingCity: json['billingCity'] as String?,
      billingState: json['billingState'] as String?,
      billingPostalCode: json['billingPostalCode'] as String?,
      billingCountry: json['billingCountry'] as String?,
      billingAddressMap: json['billingAddress'] as Map<String, dynamic>?,
      shippingStreet: json['shippingStreet'] as String?,
      shippingCity: json['shippingCity'] as String?,
      shippingState: json['shippingState'] as String?,
      shippingPostalCode: json['shippingPostalCode'] as String?,
      shippingCountry: json['shippingCountry'] as String?,
      shippingAddressMap: json['shippingAddress'] as Map<String, dynamic>?,
      isSynced: json['isSynced'] as bool?,
      sentAt: _parseDateTime(json['sentAt']),
      sentDate: _parseDateTime(json['sentDate'] ?? json['sentAt']),
      viewedAt: _parseDateTime(json['viewedAt']),
      acceptedAt: _parseDateTime(json['acceptedAt']),
      acceptedDate: _parseDateTime(json['acceptedDate'] ?? json['acceptedAt']),
      rejectedAt: _parseDateTime(json['rejectedAt']),
      rejectedDate: _parseDateTime(json['rejectedDate'] ?? json['rejectedAt']),
      rejectionReason: json['rejectionReason'] as String?,
      rejectedReason: json['rejectedReason'] as String? ?? json['rejectionReason'] as String?,
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
      opportunity: json['opportunity'] != null
          ? QuoteOpportunity.fromJson(json['opportunity'] as Map<String, dynamic>)
          : null,
      account: json['account'] != null
          ? QuoteAccount.fromJson(json['account'] as Map<String, dynamic>)
          : null,
      owner: json['owner'] != null
          ? QuoteOwner.fromJson(json['owner'] as Map<String, dynamic>)
          : null,
      contact: json['contact'] as Map<String, dynamic>?,
      lineItems: (json['lineItems'] as List<dynamic>?)
              ?.map((e) => QuoteLineItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  /// Factory constructor for Salesforce Quote JSON
  /// Maps Salesforce field names (PascalCase) to model fields
  factory Quote.fromSalesforceJson(Map<String, dynamic> json) {
    // Extract nested relationship data
    final oppData = json['Opportunity'] as Map<String, dynamic>?;
    final accountData = json['Account'] as Map<String, dynamic>?;

    return Quote(
      id: json['Id'] as String? ?? '',
      opportunityId: json['OpportunityId'] as String? ?? '',
      accountId: json['AccountId'] as String? ?? '',
      ownerId: json['OwnerId'] as String? ?? '',
      quoteNumber: json['QuoteNumber'] as String? ?? '',
      name: json['Name'] as String? ?? '',
      status: QuoteStatus.fromString(json['Status'] as String?),
      subtotal: (json['Subtotal'] as num?)?.toDouble() ?? 0,
      discount: (json['Discount'] as num?)?.toDouble() ?? 0,
      discountPercent: (json['DiscountPercent'] as num?)?.toDouble(),
      tax: (json['Tax'] as num?)?.toDouble() ?? 0,
      shippingHandling: (json['ShippingHandling'] as num?)?.toDouble() ?? 0,
      shippingCost: (json['ShippingHandling'] as num?)?.toDouble(),
      totalPrice: (json['GrandTotal'] as num?)?.toDouble() ??
          (json['TotalPrice'] as num?)?.toDouble() ?? 0,
      currency: 'USD',
      expirationDate: _parseDateTime(json['ExpirationDate']),
      paymentTerms: json['PaymentTerms'] as String?,
      description: json['Description'] as String?,
      billingStreet: json['BillingStreet'] as String?,
      billingCity: json['BillingCity'] as String?,
      billingState: json['BillingState'] as String?,
      billingPostalCode: json['BillingPostalCode'] as String?,
      billingCountry: json['BillingCountry'] as String?,
      shippingStreet: json['ShippingStreet'] as String?,
      shippingCity: json['ShippingCity'] as String?,
      shippingState: json['ShippingState'] as String?,
      shippingPostalCode: json['ShippingPostalCode'] as String?,
      shippingCountry: json['ShippingCountry'] as String?,
      createdAt: _parseDateTime(json['CreatedDate']),
      updatedAt: _parseDateTime(json['LastModifiedDate']),
      opportunity: oppData != null
          ? QuoteOpportunity(
              id: json['OpportunityId'] as String? ?? '',
              name: oppData['Name'] as String?,
            )
          : null,
      account: accountData != null
          ? QuoteAccount(
              id: json['AccountId'] as String? ?? '',
              name: accountData['Name'] as String?,
            )
          : null,
      lineItems: const [], // Line items fetched separately for Salesforce
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'opportunityId': opportunityId,
      'accountId': accountId,
      if (contactId != null) 'contactId': contactId,
      'ownerId': ownerId,
      if (createdBy != null) 'createdBy': createdBy,
      if (priceBookId != null) 'priceBookId': priceBookId,
      'quoteNumber': quoteNumber,
      'name': name,
      'status': status.value,
      'subtotal': subtotal,
      'discount': discount,
      if (discountPercent != null) 'discountPercent': discountPercent,
      'tax': tax,
      if (taxPercent != null) 'taxPercent': taxPercent,
      if (shippingCost != null) 'shippingCost': shippingCost,
      'totalPrice': totalPrice,
      if (total != null) 'total': total,
      'currency': currency,
      if (expirationDate != null) 'expirationDate': expirationDate!.toIso8601String(),
      if (paymentTerms != null) 'paymentTerms': paymentTerms,
      if (terms != null) 'terms': terms,
      if (description != null) 'description': description,
      if (notes != null) 'notes': notes,
      if (billingStreet != null) 'billingStreet': billingStreet,
      if (billingCity != null) 'billingCity': billingCity,
      if (billingState != null) 'billingState': billingState,
      if (billingPostalCode != null) 'billingPostalCode': billingPostalCode,
      if (billingCountry != null) 'billingCountry': billingCountry,
      if (billingAddressMap != null) 'billingAddress': billingAddressMap,
      if (shippingStreet != null) 'shippingStreet': shippingStreet,
      if (shippingCity != null) 'shippingCity': shippingCity,
      if (shippingState != null) 'shippingState': shippingState,
      if (shippingPostalCode != null) 'shippingPostalCode': shippingPostalCode,
      if (shippingCountry != null) 'shippingCountry': shippingCountry,
      if (shippingAddressMap != null) 'shippingAddress': shippingAddressMap,
      if (sentAt != null) 'sentAt': sentAt!.toIso8601String(),
      if (sentDate != null) 'sentDate': sentDate!.toIso8601String(),
      if (viewedAt != null) 'viewedAt': viewedAt!.toIso8601String(),
      if (acceptedAt != null) 'acceptedAt': acceptedAt!.toIso8601String(),
      if (acceptedDate != null) 'acceptedDate': acceptedDate!.toIso8601String(),
      if (rejectedAt != null) 'rejectedAt': rejectedAt!.toIso8601String(),
      if (rejectedDate != null) 'rejectedDate': rejectedDate!.toIso8601String(),
      if (rejectionReason != null) 'rejectionReason': rejectionReason,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      'lineItems': lineItems.map((e) => e.toJson()).toList(),
    };
  }

  Quote copyWith({
    String? id,
    String? opportunityId,
    String? accountId,
    String? contactId,
    String? ownerId,
    String? createdBy,
    String? priceBookId,
    String? quoteNumber,
    String? name,
    QuoteStatus? status,
    double? subtotal,
    double? discount,
    double? discountPercent,
    double? tax,
    double? taxPercent,
    double? shippingHandling,
    double? shippingCost,
    double? totalPrice,
    double? total,
    String? currency,
    DateTime? expirationDate,
    String? paymentTerms,
    String? terms,
    String? description,
    String? notes,
    String? billingStreet,
    String? billingCity,
    String? billingState,
    String? billingPostalCode,
    String? billingCountry,
    Map<String, dynamic>? billingAddressMap,
    String? shippingStreet,
    String? shippingCity,
    String? shippingState,
    String? shippingPostalCode,
    String? shippingCountry,
    Map<String, dynamic>? shippingAddressMap,
    bool? isSynced,
    DateTime? sentAt,
    DateTime? sentDate,
    DateTime? viewedAt,
    DateTime? acceptedAt,
    DateTime? acceptedDate,
    DateTime? rejectedAt,
    DateTime? rejectedDate,
    String? rejectionReason,
    String? rejectedReason,
    DateTime? createdAt,
    DateTime? updatedAt,
    QuoteOpportunity? opportunity,
    QuoteAccount? account,
    QuoteOwner? owner,
    Map<String, dynamic>? contact,
    List<QuoteLineItem>? lineItems,
  }) {
    return Quote(
      id: id ?? this.id,
      opportunityId: opportunityId ?? this.opportunityId,
      accountId: accountId ?? this.accountId,
      contactId: contactId ?? this.contactId,
      ownerId: ownerId ?? this.ownerId,
      createdBy: createdBy ?? this.createdBy,
      priceBookId: priceBookId ?? this.priceBookId,
      quoteNumber: quoteNumber ?? this.quoteNumber,
      name: name ?? this.name,
      status: status ?? this.status,
      subtotal: subtotal ?? this.subtotal,
      discount: discount ?? this.discount,
      discountPercent: discountPercent ?? this.discountPercent,
      tax: tax ?? this.tax,
      taxPercent: taxPercent ?? this.taxPercent,
      shippingHandling: shippingHandling ?? this.shippingHandling,
      shippingCost: shippingCost ?? this.shippingCost,
      totalPrice: totalPrice ?? this.totalPrice,
      total: total ?? this.total,
      currency: currency ?? this.currency,
      expirationDate: expirationDate ?? this.expirationDate,
      paymentTerms: paymentTerms ?? this.paymentTerms,
      terms: terms ?? this.terms,
      description: description ?? this.description,
      notes: notes ?? this.notes,
      billingStreet: billingStreet ?? this.billingStreet,
      billingCity: billingCity ?? this.billingCity,
      billingState: billingState ?? this.billingState,
      billingPostalCode: billingPostalCode ?? this.billingPostalCode,
      billingCountry: billingCountry ?? this.billingCountry,
      billingAddressMap: billingAddressMap ?? this.billingAddressMap,
      shippingStreet: shippingStreet ?? this.shippingStreet,
      shippingCity: shippingCity ?? this.shippingCity,
      shippingState: shippingState ?? this.shippingState,
      shippingPostalCode: shippingPostalCode ?? this.shippingPostalCode,
      shippingCountry: shippingCountry ?? this.shippingCountry,
      shippingAddressMap: shippingAddressMap ?? this.shippingAddressMap,
      isSynced: isSynced ?? this.isSynced,
      sentAt: sentAt ?? this.sentAt,
      sentDate: sentDate ?? this.sentDate,
      viewedAt: viewedAt ?? this.viewedAt,
      acceptedAt: acceptedAt ?? this.acceptedAt,
      acceptedDate: acceptedDate ?? this.acceptedDate,
      rejectedAt: rejectedAt ?? this.rejectedAt,
      rejectedDate: rejectedDate ?? this.rejectedDate,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      rejectedReason: rejectedReason ?? this.rejectedReason,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      opportunity: opportunity ?? this.opportunity,
      account: account ?? this.account,
      owner: owner ?? this.owner,
      contact: contact ?? this.contact,
      lineItems: lineItems ?? this.lineItems,
    );
  }

  /// Check if quote can be edited
  bool get canEdit => status == QuoteStatus.DRAFT;

  /// Check if quote can be sent
  bool get canSend => (status == QuoteStatus.DRAFT || status == QuoteStatus.APPROVED) && lineItems.isNotEmpty;

  /// Check if quote can be accepted
  bool get canAccept => status == QuoteStatus.SENT || status == QuoteStatus.VIEWED;

  /// Check if quote can be rejected
  bool get canReject => status == QuoteStatus.SENT || status == QuoteStatus.VIEWED;

  /// Get formatted billing address
  String? get billingAddress {
    final parts = [
      billingStreet,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
    ].where((p) => p != null && p.isNotEmpty).toList();
    return parts.isEmpty ? null : parts.join(', ');
  }

  /// Get formatted shipping address
  String? get shippingAddress {
    final parts = [
      shippingStreet,
      shippingCity,
      shippingState,
      shippingPostalCode,
      shippingCountry,
    ].where((p) => p != null && p.isNotEmpty).toList();
    return parts.isEmpty ? null : parts.join(', ');
  }
}

/// DTO for creating a new quote
class CreateQuoteDto {
  final String opportunityId;
  final String accountId;
  final String name;
  final DateTime? validUntil;
  final String? paymentTerms;
  final String? description;
  final double? shippingHandling;
  final double? tax;
  final double? discount;
  final String? billingStreet;
  final String? billingCity;
  final String? billingState;
  final String? billingPostalCode;
  final String? billingCountry;
  final String? shippingStreet;
  final String? shippingCity;
  final String? shippingState;
  final String? shippingPostalCode;
  final String? shippingCountry;

  const CreateQuoteDto({
    required this.opportunityId,
    required this.accountId,
    required this.name,
    this.validUntil,
    this.paymentTerms,
    this.description,
    this.shippingHandling,
    this.tax,
    this.discount,
    this.billingStreet,
    this.billingCity,
    this.billingState,
    this.billingPostalCode,
    this.billingCountry,
    this.shippingStreet,
    this.shippingCity,
    this.shippingState,
    this.shippingPostalCode,
    this.shippingCountry,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'opportunityId': opportunityId,
      'accountId': accountId,
      'name': name,
    };

    if (validUntil != null) json['validUntil'] = validUntil!.toIso8601String();
    if (paymentTerms != null) json['paymentTerms'] = paymentTerms;
    if (description != null) json['description'] = description;
    if (shippingHandling != null) json['shippingHandling'] = shippingHandling;
    if (tax != null) json['tax'] = tax;
    if (discount != null) json['discount'] = discount;
    if (billingStreet != null) json['billingStreet'] = billingStreet;
    if (billingCity != null) json['billingCity'] = billingCity;
    if (billingState != null) json['billingState'] = billingState;
    if (billingPostalCode != null) json['billingPostalCode'] = billingPostalCode;
    if (billingCountry != null) json['billingCountry'] = billingCountry;
    if (shippingStreet != null) json['shippingStreet'] = shippingStreet;
    if (shippingCity != null) json['shippingCity'] = shippingCity;
    if (shippingState != null) json['shippingState'] = shippingState;
    if (shippingPostalCode != null) json['shippingPostalCode'] = shippingPostalCode;
    if (shippingCountry != null) json['shippingCountry'] = shippingCountry;

    return json;
  }
}

/// DTO for updating a quote
class UpdateQuoteDto {
  final String? name;
  final DateTime? validUntil;
  final String? paymentTerms;
  final String? description;
  final double? shippingHandling;
  final double? tax;
  final double? discount;
  final String? billingStreet;
  final String? billingCity;
  final String? billingState;
  final String? billingPostalCode;
  final String? billingCountry;
  final String? shippingStreet;
  final String? shippingCity;
  final String? shippingState;
  final String? shippingPostalCode;
  final String? shippingCountry;

  const UpdateQuoteDto({
    this.name,
    this.validUntil,
    this.paymentTerms,
    this.description,
    this.shippingHandling,
    this.tax,
    this.discount,
    this.billingStreet,
    this.billingCity,
    this.billingState,
    this.billingPostalCode,
    this.billingCountry,
    this.shippingStreet,
    this.shippingCity,
    this.shippingState,
    this.shippingPostalCode,
    this.shippingCountry,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};

    if (name != null) json['name'] = name;
    if (validUntil != null) json['validUntil'] = validUntil!.toIso8601String();
    if (paymentTerms != null) json['paymentTerms'] = paymentTerms;
    if (description != null) json['description'] = description;
    if (shippingHandling != null) json['shippingHandling'] = shippingHandling;
    if (tax != null) json['tax'] = tax;
    if (discount != null) json['discount'] = discount;
    if (billingStreet != null) json['billingStreet'] = billingStreet;
    if (billingCity != null) json['billingCity'] = billingCity;
    if (billingState != null) json['billingState'] = billingState;
    if (billingPostalCode != null) json['billingPostalCode'] = billingPostalCode;
    if (billingCountry != null) json['billingCountry'] = billingCountry;
    if (shippingStreet != null) json['shippingStreet'] = shippingStreet;
    if (shippingCity != null) json['shippingCity'] = shippingCity;
    if (shippingState != null) json['shippingState'] = shippingState;
    if (shippingPostalCode != null) json['shippingPostalCode'] = shippingPostalCode;
    if (shippingCountry != null) json['shippingCountry'] = shippingCountry;

    return json;
  }
}

/// DTO for adding a line item
class AddLineItemDto {
  final String productName;
  final String? productCode;
  final String? description;
  final double quantity;
  final double listPrice;
  final double unitPrice;
  final double? discount;

  const AddLineItemDto({
    required this.productName,
    this.productCode,
    this.description,
    this.quantity = 1,
    required this.listPrice,
    required this.unitPrice,
    this.discount,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'productName': productName,
      'quantity': quantity,
      'listPrice': listPrice,
      'unitPrice': unitPrice,
    };

    if (productCode != null) json['productCode'] = productCode;
    if (description != null) json['description'] = description;
    if (discount != null) json['discount'] = discount;

    return json;
  }
}

/// DTO for updating a line item
class UpdateLineItemDto {
  final String? productName;
  final String? productCode;
  final String? description;
  final double? quantity;
  final double? listPrice;
  final double? unitPrice;
  final double? discount;

  const UpdateLineItemDto({
    this.productName,
    this.productCode,
    this.description,
    this.quantity,
    this.listPrice,
    this.unitPrice,
    this.discount,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};

    if (productName != null) json['productName'] = productName;
    if (productCode != null) json['productCode'] = productCode;
    if (description != null) json['description'] = description;
    if (quantity != null) json['quantity'] = quantity;
    if (listPrice != null) json['listPrice'] = listPrice;
    if (unitPrice != null) json['unitPrice'] = unitPrice;
    if (discount != null) json['discount'] = discount;

    return json;
  }
}

/// Quote statistics model
class QuoteStats {
  final int total;
  final List<QuoteStatusCount> byStatus;
  final double totalValue;
  final double acceptedValue;

  const QuoteStats({
    this.total = 0,
    this.byStatus = const [],
    this.totalValue = 0,
    this.acceptedValue = 0,
  });

  factory QuoteStats.fromJson(Map<String, dynamic> json) {
    return QuoteStats(
      total: json['total'] as int? ?? 0,
      byStatus: (json['byStatus'] as List<dynamic>?)
              ?.map((e) => QuoteStatusCount.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalValue: (json['totalValue'] as num?)?.toDouble() ?? 0,
      acceptedValue: (json['acceptedValue'] as num?)?.toDouble() ?? 0,
    );
  }

  /// Get acceptance rate
  double get acceptanceRate {
    if (totalValue == 0) return 0;
    return acceptedValue / totalValue;
  }

  /// Get count for a specific status
  int countForStatus(QuoteStatus status) {
    final match = byStatus.where((s) => s.status == status).toList();
    return match.isEmpty ? 0 : match.first.count;
  }
}

/// Quote status count for statistics
class QuoteStatusCount {
  final QuoteStatus status;
  final int count;

  const QuoteStatusCount({
    required this.status,
    required this.count,
  });

  factory QuoteStatusCount.fromJson(Map<String, dynamic> json) {
    return QuoteStatusCount(
      status: QuoteStatus.fromString(json['status'] as String?),
      count: json['_count'] as int? ?? json['count'] as int? ?? 0,
    );
  }
}
