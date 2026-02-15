// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

enum OrderStatus {
  DRAFT('Draft', 'DRAFT'),
  PENDING('Pending', 'PENDING'),
  CONFIRMED('Confirmed', 'CONFIRMED'),
  PROCESSING('Processing', 'PROCESSING'),
  SHIPPED('Shipped', 'SHIPPED'),
  DELIVERED('Delivered', 'DELIVERED'),
  COMPLETED('Completed', 'COMPLETED'),
  CANCELLED('Cancelled', 'CANCELLED'),
  RETURNED('Returned', 'RETURNED');

  final String label;
  final String backendValue;
  const OrderStatus(this.label, this.backendValue);

  static OrderStatus fromString(String? status) {
    if (status == null) return OrderStatus.DRAFT;
    final upper = status.toUpperCase().replaceAll(' ', '').replaceAll('-', '').replaceAll('_', '');
    switch (upper) {
      case 'DRAFT': return OrderStatus.DRAFT;
      case 'PENDING': return OrderStatus.PENDING;
      case 'CONFIRMED': return OrderStatus.CONFIRMED;
      case 'PROCESSING': return OrderStatus.PROCESSING;
      case 'SHIPPED': return OrderStatus.SHIPPED;
      case 'DELIVERED': return OrderStatus.DELIVERED;
      case 'COMPLETED': return OrderStatus.COMPLETED;
      case 'CANCELLED': return OrderStatus.CANCELLED;
      case 'RETURNED': return OrderStatus.RETURNED;
      default: return OrderStatus.DRAFT;
    }
  }
}

enum FulfillmentStatus {
  UNFULFILLED('Unfulfilled', 'UNFULFILLED'),
  PARTIAL('Partial', 'PARTIAL'),
  FULFILLED('Fulfilled', 'FULFILLED'),
  RETURNED('Returned', 'RETURNED');

  final String label;
  final String backendValue;
  const FulfillmentStatus(this.label, this.backendValue);

  static FulfillmentStatus fromString(String? status) {
    if (status == null) return FulfillmentStatus.UNFULFILLED;
    final upper = status.toUpperCase().replaceAll('_', '');
    switch (upper) {
      case 'UNFULFILLED': return FulfillmentStatus.UNFULFILLED;
      case 'PARTIAL': return FulfillmentStatus.PARTIAL;
      case 'FULFILLED': return FulfillmentStatus.FULFILLED;
      case 'RETURNED': return FulfillmentStatus.RETURNED;
      // Old mobile lowercase fallbacks
      default: return FulfillmentStatus.UNFULFILLED;
    }
  }
}

enum PaymentStatus {
  PENDING('Pending', 'PENDING'),
  PARTIAL('Partial', 'PARTIAL'),
  PAID('Paid', 'PAID'),
  REFUNDED('Refunded', 'REFUNDED'),
  FAILED('Failed', 'FAILED');

  final String label;
  final String backendValue;
  const PaymentStatus(this.label, this.backendValue);

  static PaymentStatus fromString(String? status) {
    if (status == null) return PaymentStatus.PENDING;
    final upper = status.toUpperCase().replaceAll('_', '');
    switch (upper) {
      case 'PENDING': return PaymentStatus.PENDING;
      case 'PARTIAL': return PaymentStatus.PARTIAL;
      case 'PAID': return PaymentStatus.PAID;
      case 'REFUNDED': return PaymentStatus.REFUNDED;
      case 'FAILED': return PaymentStatus.FAILED;
      // Old mobile value fallback
      case 'UNPAID': return PaymentStatus.PENDING;
      default: return PaymentStatus.PENDING;
    }
  }
}

class OrderAddress {
  final String? street;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? country;
  final String? attention;

  OrderAddress({
    this.street,
    this.city,
    this.state,
    this.postalCode,
    this.country,
    this.attention,
  });

  factory OrderAddress.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return OrderAddress(
        street: json['street'] as String?,
        city: json['city'] as String?,
        state: json['state'] as String?,
        postalCode: json['postalCode'] as String?,
        country: json['country'] as String?,
        attention: json['attention'] as String?,
      );
    }
    // String fallback: treat the whole string as the street line
    if (json is String && json.isNotEmpty) {
      return OrderAddress(street: json);
    }
    return OrderAddress();
  }

  Map<String, dynamic> toJson() => {
    if (street != null) 'street': street,
    if (city != null) 'city': city,
    if (state != null) 'state': state,
    if (postalCode != null) 'postalCode': postalCode,
    if (country != null) 'country': country,
    if (attention != null) 'attention': attention,
  };

  /// Returns a formatted multi-line display string, or null if empty.
  String? get displayString {
    final parts = <String>[];
    if (attention != null && attention!.isNotEmpty) parts.add('Attn: $attention');
    if (street != null && street!.isNotEmpty) parts.add(street!);
    final cityStateZip = [
      if (city != null && city!.isNotEmpty) city!,
      if (state != null && state!.isNotEmpty) state!,
      if (postalCode != null && postalCode!.isNotEmpty) postalCode!,
    ].join(', ');
    if (cityStateZip.isNotEmpty) parts.add(cityStateZip);
    if (country != null && country!.isNotEmpty) parts.add(country!);
    return parts.isNotEmpty ? parts.join('\n') : null;
  }

  bool get isEmpty =>
      (street == null || street!.isEmpty) &&
      (city == null || city!.isEmpty) &&
      (state == null || state!.isEmpty) &&
      (postalCode == null || postalCode!.isEmpty) &&
      (country == null || country!.isEmpty) &&
      (attention == null || attention!.isEmpty);

  bool get isNotEmpty => !isEmpty;
}

class OrderLineItem {
  final String? id;
  final String orderId;
  final String productId;
  final String productName;
  final String? productCode;
  final String? description;
  final int quantity;
  final double unitPrice;
  final double? discount;
  final double? discountPercent;
  final double? tax;
  final double? taxPercent;
  final double totalPrice;
  final int fulfilledQuantity;
  final int returnedQuantity;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  OrderLineItem({
    this.id,
    this.orderId = '',
    required this.productId,
    required this.productName,
    this.productCode,
    this.description,
    required this.quantity,
    required this.unitPrice,
    this.discount,
    this.discountPercent,
    this.tax,
    this.taxPercent,
    required this.totalPrice,
    this.fulfilledQuantity = 0,
    this.returnedQuantity = 0,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory OrderLineItem.fromJson(Map<String, dynamic> json) {
    return OrderLineItem(
      id: json['id'] as String?,
      orderId: json['orderId'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? json['product']?['name'] as String? ?? 'Unknown Product',
      productCode: json['productCode'] as String?,
      description: json['description'] as String?,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble(),
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      tax: (json['tax'] as num?)?.toDouble(),
      taxPercent: (json['taxPercent'] as num?)?.toDouble(),
      // Backward compat: totalPrice (web) ?? total (old mobile) ?? lineTotal (legacy)
      totalPrice: (json['totalPrice'] as num?)?.toDouble()
          ?? (json['total'] as num?)?.toDouble()
          ?? (json['lineTotal'] as num?)?.toDouble()
          ?? 0,
      fulfilledQuantity: (json['fulfilledQuantity'] as num?)?.toInt() ?? 0,
      returnedQuantity: (json['returnedQuantity'] as num?)?.toInt() ?? 0,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'productName': productName,
    if (productCode != null) 'productCode': productCode,
    if (description != null) 'description': description,
    'quantity': quantity,
    'unitPrice': unitPrice,
    if (discount != null) 'discount': discount,
    if (discountPercent != null) 'discountPercent': discountPercent,
    if (tax != null) 'tax': tax,
    if (taxPercent != null) 'taxPercent': taxPercent,
    'totalPrice': totalPrice,
    'fulfilledQuantity': fulfilledQuantity,
    'returnedQuantity': returnedQuantity,
    if (notes != null) 'notes': notes,
  };
}

class OrderModel {
  final String id;
  final String ownerId;
  final String orderNumber;
  final String? name;
  final String? accountId;
  final String? accountName;
  final String? contactId;
  final String? contactName;
  final String? quoteId;
  final String? opportunityId;
  final OrderStatus status;
  final FulfillmentStatus fulfillmentStatus;
  final PaymentStatus paymentStatus;
  final List<OrderLineItem> lineItems;
  final double subtotal;
  final double? discount;
  final double? discountPercent;
  final double? tax;
  final double? taxPercent;
  final double? shippingCost;
  final double total;
  final double paidAmount;
  final String currency;
  final String? notes;
  final String? internalNotes;
  final OrderAddress? shippingAddress;
  final OrderAddress? billingAddress;
  final DateTime? orderDate;
  final DateTime? shippedDate;
  final DateTime? deliveredDate;
  final DateTime? expectedDeliveryDate;
  final String? trackingNumber;
  final String? trackingUrl;
  final String? paymentTerms;
  final String? paymentMethod;
  final DateTime createdAt;
  final DateTime updatedAt;
  // Nested relations (raw maps to keep flexibility)
  final Map<String, dynamic>? quote;
  final Map<String, dynamic>? account;
  final Map<String, dynamic>? contact;
  final Map<String, dynamic>? createdBy;

  OrderModel({
    required this.id,
    this.ownerId = '',
    required this.orderNumber,
    this.name,
    this.accountId,
    this.accountName,
    this.contactId,
    this.contactName,
    this.quoteId,
    this.opportunityId,
    required this.status,
    this.fulfillmentStatus = FulfillmentStatus.UNFULFILLED,
    this.paymentStatus = PaymentStatus.PENDING,
    this.lineItems = const [],
    required this.subtotal,
    this.discount,
    this.discountPercent,
    this.tax,
    this.taxPercent,
    this.shippingCost,
    required this.total,
    this.paidAmount = 0,
    this.currency = 'USD',
    this.notes,
    this.internalNotes,
    this.shippingAddress,
    this.billingAddress,
    this.orderDate,
    this.shippedDate,
    this.deliveredDate,
    this.expectedDeliveryDate,
    this.trackingNumber,
    this.trackingUrl,
    this.paymentTerms,
    this.paymentMethod,
    required this.createdAt,
    required this.updatedAt,
    this.quote,
    this.account,
    this.contact,
    this.createdBy,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final lineItemsList = (json['lineItems'] as List<dynamic>?)
        ?.map((item) => OrderLineItem.fromJson(item as Map<String, dynamic>))
        .toList() ?? [];

    // Parse addresses: support object (web) or string (old mobile)
    OrderAddress? parseAddress(dynamic shippingVal, dynamic billingVal, {required bool isShipping}) {
      final val = isShipping ? shippingVal : billingVal;
      if (val == null) return null;
      final addr = OrderAddress.fromJson(val);
      return addr.isEmpty ? null : addr;
    }

    final shippingRaw = json['shippingAddress'];
    final billingRaw = json['billingAddress'];

    return OrderModel(
      id: json['id'] as String? ?? '',
      ownerId: json['ownerId'] as String? ?? '',
      orderNumber: json['orderNumber'] as String? ?? json['number'] as String? ?? '',
      name: json['name'] as String?,
      accountId: json['accountId'] as String?,
      accountName: json['accountName'] as String? ?? json['account']?['name'] as String?,
      contactId: json['contactId'] as String?,
      contactName: json['contactName'] as String? ?? json['contact']?['name'] as String?,
      quoteId: json['quoteId'] as String?,
      opportunityId: json['opportunityId'] as String?,
      status: OrderStatus.fromString(json['status'] as String?),
      fulfillmentStatus: FulfillmentStatus.fromString(json['fulfillmentStatus'] as String?),
      paymentStatus: PaymentStatus.fromString(json['paymentStatus'] as String?),
      lineItems: lineItemsList,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble(),
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      tax: (json['tax'] as num?)?.toDouble(),
      taxPercent: (json['taxPercent'] as num?)?.toDouble(),
      // Backward compat: shippingCost (web) ?? shipping (old mobile)
      shippingCost: (json['shippingCost'] as num?)?.toDouble()
          ?? (json['shipping'] as num?)?.toDouble(),
      total: (json['total'] as num?)?.toDouble() ?? (json['grandTotal'] as num?)?.toDouble() ?? 0,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      notes: json['notes'] as String?,
      internalNotes: json['internalNotes'] as String?,
      shippingAddress: parseAddress(shippingRaw, billingRaw, isShipping: true),
      billingAddress: parseAddress(shippingRaw, billingRaw, isShipping: false),
      orderDate: json['orderDate'] != null ? DateTime.tryParse(json['orderDate'] as String) : null,
      shippedDate: json['shippedDate'] != null ? DateTime.tryParse(json['shippedDate'] as String) : null,
      deliveredDate: json['deliveredDate'] != null ? DateTime.tryParse(json['deliveredDate'] as String) : null,
      expectedDeliveryDate: json['expectedDeliveryDate'] != null ? DateTime.tryParse(json['expectedDeliveryDate'] as String) : null,
      trackingNumber: json['trackingNumber'] as String?,
      trackingUrl: json['trackingUrl'] as String?,
      paymentTerms: json['paymentTerms'] as String?,
      paymentMethod: json['paymentMethod'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'] as String) : DateTime.now(),
      quote: json['quote'] as Map<String, dynamic>?,
      account: json['account'] as Map<String, dynamic>?,
      contact: json['contact'] as Map<String, dynamic>?,
      createdBy: json['createdBy'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'accountId': accountId,
    'contactId': contactId,
    'quoteId': quoteId,
    'opportunityId': opportunityId,
    'status': status.backendValue,
    'paymentStatus': paymentStatus.backendValue,
    'fulfillmentStatus': fulfillmentStatus.backendValue,
    'lineItems': lineItems.map((e) => e.toJson()).toList(),
    'notes': notes,
    if (internalNotes != null) 'internalNotes': internalNotes,
    if (shippingAddress != null) 'shippingAddress': shippingAddress!.toJson(),
    if (billingAddress != null) 'billingAddress': billingAddress!.toJson(),
    if (expectedDeliveryDate != null)
      'expectedDeliveryDate': expectedDeliveryDate!.toIso8601String(),
    if (shippingCost != null) 'shippingCost': shippingCost,
    if (discount != null) 'discount': discount,
    if (discountPercent != null) 'discountPercent': discountPercent,
    if (taxPercent != null) 'taxPercent': taxPercent,
    if (trackingNumber != null) 'trackingNumber': trackingNumber,
    if (trackingUrl != null) 'trackingUrl': trackingUrl,
    if (paymentTerms != null) 'paymentTerms': paymentTerms,
    if (paymentMethod != null) 'paymentMethod': paymentMethod,
    'currency': currency,
  };
}

class OrderTimelineEntry {
  final String id;
  final String action;
  final String? description;
  final String? userId;
  final String? userName;
  final DateTime timestamp;

  OrderTimelineEntry({
    required this.id,
    required this.action,
    this.description,
    this.userId,
    this.userName,
    required this.timestamp,
  });

  factory OrderTimelineEntry.fromJson(Map<String, dynamic> json) => OrderTimelineEntry(
    id: json['id'] as String? ?? '',
    action: json['action'] as String? ?? '',
    description: json['description'] as String?,
    userId: json['userId'] as String?,
    userName: json['userName'] as String?,
    timestamp: json['timestamp'] != null ? DateTime.parse(json['timestamp'] as String) : DateTime.now(),
  );
}

// Providers
final ordersServiceProvider = Provider<OrdersService>((ref) {
  final api = ref.watch(apiClientProvider);
  return OrdersService(api);
});

final ordersProvider = FutureProvider.autoDispose<List<OrderModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(ordersServiceProvider);
  return service.getOrders();
});

final orderDetailProvider = FutureProvider.autoDispose.family<OrderModel?, String>((ref, orderId) async {
  final service = ref.watch(ordersServiceProvider);
  return service.getOrder(orderId);
});

final orderTimelineProvider = FutureProvider.autoDispose.family<List<OrderTimelineEntry>, String>((ref, orderId) async {
  final service = ref.watch(ordersServiceProvider);
  return service.getTimeline(orderId);
});

class OrdersService {
  final ApiClient _api;

  OrdersService(this._api);

  Future<List<OrderModel>> getOrders() async {
    try {
      final response = await _api.get('/orders');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => OrderModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<OrderModel?> getOrder(String id) async {
    try {
      final response = await _api.get('/orders/$id');
      return OrderModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<OrderModel?> createOrder(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/orders', data: data);
      return OrderModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<OrderModel?> updateOrder(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/orders/$id', data: data);
      return OrderModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<OrderModel?> convertFromQuote(String quoteId) async {
    try {
      final response = await _api.post('/orders/convert-from-quote', data: {'quoteId': quoteId});
      return OrderModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<bool> confirmOrder(String id) async {
    try {
      await _api.post('/orders/$id/confirm');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> shipOrder(String id) async {
    try {
      await _api.post('/orders/$id/ship');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deliverOrder(String id) async {
    try {
      await _api.post('/orders/$id/deliver');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> cancelOrder(String id) async {
    try {
      await _api.post('/orders/$id/cancel');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateFulfillment(String id, String status) async {
    try {
      await _api.patch('/orders/$id/fulfillment', data: {'status': status});
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updatePayment(String id, String status) async {
    try {
      await _api.patch('/orders/$id/payment', data: {'status': status});
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<List<OrderTimelineEntry>> getTimeline(String id) async {
    try {
      final response = await _api.get('/orders/$id/timeline');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      }
      return items.map((item) => OrderTimelineEntry.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<bool> deleteOrder(String id) async {
    try {
      await _api.delete('/orders/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
