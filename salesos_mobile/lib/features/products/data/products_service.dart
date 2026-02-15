import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

class PricingTier {
  final int minQuantity;
  final int? maxQuantity;
  final double price;

  PricingTier({required this.minQuantity, this.maxQuantity, required this.price});

  factory PricingTier.fromJson(Map<String, dynamic> json) => PricingTier(
    minQuantity: (json['minQuantity'] as num?)?.toInt() ?? 1,
    maxQuantity: (json['maxQuantity'] as num?)?.toInt(),
    price: (json['price'] as num?)?.toDouble() ?? 0,
  );
}

class ProductModel {
  final String id;
  final String name;
  final String? sku;
  final String? description;
  final String? category;
  final String? family;
  final double unitPrice;
  final double? listPrice;
  final String? currency;
  final bool isActive;
  final String? imageUrl;
  final List<PricingTier> pricingTiers;
  final Map<String, dynamic>? customFields;
  final DateTime createdAt;
  final DateTime updatedAt;

  ProductModel({
    required this.id,
    required this.name,
    this.sku,
    this.description,
    this.category,
    this.family,
    required this.unitPrice,
    this.listPrice,
    this.currency,
    this.isActive = true,
    this.imageUrl,
    this.pricingTiers = const [],
    this.customFields,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final tiers = (json['pricingTiers'] as List<dynamic>?)
        ?.map((t) => PricingTier.fromJson(t as Map<String, dynamic>))
        .toList() ?? [];

    return ProductModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unnamed Product',
      sku: json['sku'] as String?,
      description: json['description'] as String?,
      category: json['category'] as String?,
      family: json['family'] as String? ?? json['productFamily'] as String?,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? (json['price'] as num?)?.toDouble() ?? 0,
      listPrice: (json['listPrice'] as num?)?.toDouble(),
      currency: json['currency'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      imageUrl: json['imageUrl'] as String?,
      pricingTiers: tiers,
      customFields: json['customFields'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'] as String) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'sku': sku,
    'description': description,
    'category': category,
    'family': family,
    'unitPrice': unitPrice,
    'listPrice': listPrice,
    'currency': currency,
    'isActive': isActive,
  };
}

// Providers
final productsServiceProvider = Provider<ProductsService>((ref) {
  final api = ref.watch(apiClientProvider);
  return ProductsService(api);
});

final productsProvider = FutureProvider.autoDispose<List<ProductModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(productsServiceProvider);
  return service.getProducts();
});

final productDetailProvider = FutureProvider.autoDispose.family<ProductModel?, String>((ref, productId) async {
  final service = ref.watch(productsServiceProvider);
  return service.getProduct(productId);
});

final productFamiliesProvider = FutureProvider.autoDispose<List<String>>((ref) async {
  final products = await ref.watch(productsProvider.future);
  final families = products.map((p) => p.family).whereType<String>().toSet().toList();
  families.sort();
  return families;
});

class ProductsService {
  final ApiClient _api;
  ProductsService(this._api);

  Future<List<ProductModel>> getProducts() async {
    try {
      final response = await _api.get('/products');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => ProductModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<ProductModel?> getProduct(String id) async {
    try {
      final response = await _api.get('/products/$id');
      return ProductModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<ProductModel?> createProduct(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/products', data: data);
      return ProductModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<ProductModel?> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/products/$id', data: data);
      return ProductModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }
}
