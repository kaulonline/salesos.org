import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

class PriceBookEntry {
  final String id;
  final String priceBookId;
  final String? productId;
  final String? productName;
  final double listPrice;
  final double? unitPrice;
  final int? minimumQuantity;
  final int? maximumQuantity;
  final double? discountPercent;
  final bool isActive;

  PriceBookEntry({
    required this.id,
    required this.priceBookId,
    this.productId,
    this.productName,
    required this.listPrice,
    this.unitPrice,
    this.minimumQuantity,
    this.maximumQuantity,
    this.discountPercent,
    this.isActive = true,
  });

  factory PriceBookEntry.fromJson(Map<String, dynamic> json) => PriceBookEntry(
    id: json['id'] as String? ?? '',
    priceBookId: json['priceBookId'] as String? ?? '',
    productId: json['productId'] as String?,
    productName: json['productName'] as String?,
    listPrice: (json['listPrice'] as num?)?.toDouble() ?? 0,
    unitPrice: ((json['unitPrice'] ?? json['customPrice']) as num?)?.toDouble(),
    minimumQuantity: ((json['minimumQuantity'] ?? json['minQuantity']) as num?)?.toInt(),
    maximumQuantity: ((json['maximumQuantity'] ?? json['maxQuantity']) as num?)?.toInt(),
    discountPercent: (json['discountPercent'] as num?)?.toDouble(),
    isActive: json['isActive'] as bool? ?? true,
  );

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'listPrice': listPrice,
    'unitPrice': unitPrice,
    'minimumQuantity': minimumQuantity,
    'maximumQuantity': maximumQuantity,
    'discountPercent': discountPercent,
    'isActive': isActive,
  };
}

class PriceBook {
  final String id;
  final String name;
  final String? description;
  final String? currency;
  final bool isStandard;
  final bool isActive;
  final List<PriceBookEntry> entries;
  final int entryCount;
  final String? createdBy;
  final DateTime? validFrom;
  final DateTime? validTo;
  final DateTime createdAt;
  final DateTime updatedAt;

  PriceBook({
    required this.id,
    required this.name,
    this.description,
    this.currency,
    this.isStandard = false,
    this.isActive = true,
    this.entries = const [],
    this.entryCount = 0,
    this.createdBy,
    this.validFrom,
    this.validTo,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PriceBook.fromJson(Map<String, dynamic> json) {
    final entriesJson = json['entries'] as List<dynamic>? ?? [];
    final validFromRaw = json['validFrom'] ?? json['effectiveDate'];
    final validToRaw = json['validTo'] ?? json['expirationDate'];
    return PriceBook(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unnamed Price Book',
      description: json['description'] as String?,
      currency: json['currency'] as String?,
      isStandard: (json['isStandard'] ?? json['isDefault']) as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      entries: entriesJson.map((e) => PriceBookEntry.fromJson(e as Map<String, dynamic>)).toList(),
      entryCount: (json['entryCount'] as num?)?.toInt() ?? 0,
      createdBy: json['createdBy'] as String?,
      validFrom: validFromRaw != null ? DateTime.tryParse(validFromRaw as String) : null,
      validTo: validToRaw != null ? DateTime.tryParse(validToRaw as String) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'] as String) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': description,
    'currency': currency,
    'isStandard': isStandard,
    'isActive': isActive,
    'validFrom': validFrom?.toIso8601String(),
    'validTo': validTo?.toIso8601String(),
  };
}

// Providers
final priceBooksServiceProvider = Provider<PriceBooksService>((ref) {
  final api = ref.watch(apiClientProvider);
  return PriceBooksService(api);
});

final priceBooksProvider = FutureProvider.autoDispose<List<PriceBook>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(priceBooksServiceProvider);
  return service.getPriceBooks();
});

final priceBookDetailProvider = FutureProvider.autoDispose.family<PriceBook?, String>((ref, id) async {
  final service = ref.watch(priceBooksServiceProvider);
  return service.getPriceBook(id);
});

class PriceBooksService {
  final ApiClient _api;
  PriceBooksService(this._api);

  Future<List<PriceBook>> getPriceBooks() async {
    try {
      final response = await _api.get('/price-books');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => PriceBook.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<PriceBook?> getPriceBook(String id) async {
    try {
      final response = await _api.get('/price-books/$id');
      return PriceBook.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<PriceBook?> createPriceBook(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/price-books', data: data);
      return PriceBook.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<PriceBook?> updatePriceBook(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/price-books/$id', data: data);
      return PriceBook.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<bool> deletePriceBook(String id) async {
    try {
      await _api.delete('/price-books/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
