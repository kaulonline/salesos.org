// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

enum TaxType { SALES, VAT, GST, HST, PST, CUSTOM }

class TaxRate {
  final String id;
  final String name;
  final double rate;
  final TaxType taxType;
  final String? country;
  final String? region;
  final String? city;
  final String? postalCode;
  final bool isDefault;
  final bool isActive;
  final bool isCompound;
  final int priority;
  final String? description;
  final DateTime? effectiveFrom;
  final DateTime? effectiveTo;
  final DateTime createdAt;
  final DateTime? updatedAt;

  TaxRate({
    required this.id,
    required this.name,
    required this.rate,
    this.taxType = TaxType.SALES,
    this.country,
    this.region,
    this.city,
    this.postalCode,
    this.isDefault = false,
    this.isActive = true,
    this.isCompound = false,
    this.priority = 0,
    this.description,
    this.effectiveFrom,
    this.effectiveTo,
    required this.createdAt,
    this.updatedAt,
  });

  factory TaxRate.fromJson(Map<String, dynamic> json) {
    return TaxRate(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unnamed Tax',
      rate: (json['rate'] as num?)?.toDouble() ?? 0,
      taxType: _parseTaxType((json['taxType'] ?? json['type']) as String?),
      country: json['country'] as String?,
      region: (json['region'] ?? json['state']) as String?,
      city: json['city'] as String?,
      postalCode: (json['postalCode'] ?? json['zipCode']) as String?,
      isDefault: json['isDefault'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      isCompound: json['isCompound'] as bool? ?? false,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      description: json['description'] as String?,
      effectiveFrom: (json['effectiveFrom'] ?? json['effectiveDate']) != null ? DateTime.tryParse((json['effectiveFrom'] ?? json['effectiveDate']) as String) : null,
      effectiveTo: (json['effectiveTo'] ?? json['expirationDate']) != null ? DateTime.tryParse((json['effectiveTo'] ?? json['expirationDate']) as String) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'rate': rate,
    'taxType': taxType.name,
    'country': country,
    'region': region,
    'city': city,
    'postalCode': postalCode,
    'isDefault': isDefault,
    'isActive': isActive,
    'isCompound': isCompound,
    'priority': priority,
    'description': description,
    'effectiveFrom': effectiveFrom?.toIso8601String(),
    'effectiveTo': effectiveTo?.toIso8601String(),
  };

  static TaxType _parseTaxType(String? type) {
    if (type == null) return TaxType.SALES;
    switch (type.toUpperCase()) {
      case 'VAT': return TaxType.VAT;
      case 'GST': return TaxType.GST;
      case 'HST': return TaxType.HST;
      case 'PST': return TaxType.PST;
      case 'CUSTOM': return TaxType.CUSTOM;
      case 'SALES':
      default: return TaxType.SALES;
    }
  }

  String get typeLabel {
    switch (taxType) {
      case TaxType.SALES: return 'Sales Tax';
      case TaxType.VAT: return 'VAT';
      case TaxType.GST: return 'GST';
      case TaxType.HST: return 'HST';
      case TaxType.PST: return 'PST';
      case TaxType.CUSTOM: return 'Custom';
    }
  }

  String get rateDisplay => '${rate.toStringAsFixed(2)}%';

  String get locationDisplay {
    final parts = <String>[];
    if (city != null) parts.add(city!);
    if (region != null) parts.add(region!);
    if (country != null) parts.add(country!);
    return parts.isEmpty ? 'Global' : parts.join(', ');
  }
}

// Providers
final taxRatesServiceProvider = Provider<TaxRatesService>((ref) {
  final api = ref.watch(apiClientProvider);
  return TaxRatesService(api);
});

final taxRatesProvider = FutureProvider.autoDispose<List<TaxRate>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(taxRatesServiceProvider);
  return service.getTaxRates();
});

final taxRateDetailProvider = FutureProvider.autoDispose.family<TaxRate?, String>((ref, id) async {
  final service = ref.watch(taxRatesServiceProvider);
  return service.getTaxRate(id);
});

class TaxRatesService {
  final ApiClient _api;
  TaxRatesService(this._api);

  Future<List<TaxRate>> getTaxRates() async {
    try {
      final response = await _api.get('/tax-rates');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => TaxRate.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<TaxRate?> getTaxRate(String id) async {
    try {
      final response = await _api.get('/tax-rates/$id');
      return TaxRate.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<TaxRate?> createTaxRate(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/tax-rates', data: data);
      return TaxRate.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<TaxRate?> updateTaxRate(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/tax-rates/$id', data: data);
      return TaxRate.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<bool> deleteTaxRate(String id) async {
    try {
      await _api.delete('/tax-rates/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
