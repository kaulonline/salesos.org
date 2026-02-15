// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

enum DiscountRuleType { VOLUME, PROMO_CODE, CUSTOMER_SEGMENT, TIME_LIMITED, BUNDLE }

enum DiscountValueTypeEnum { PERCENTAGE, FIXED_AMOUNT }

class DiscountRule {
  final String id;
  final String name;
  final String? description;
  final DiscountRuleType type;
  final double discount;
  final DiscountValueTypeEnum discountType;
  final Map<String, dynamic>? conditions;
  final int? minQuantity;
  final int? maxQuantity;
  final DateTime? validFrom;
  final DateTime? validTo;
  final String? code;
  final List<String> applicableProducts;
  final List<String> applicableCategories;
  final int priority;
  final bool isActive;
  final bool stackable;
  final int currentUses;
  final int? maxUses;
  final DateTime createdAt;
  final DateTime? updatedAt;

  DiscountRule({
    required this.id,
    required this.name,
    this.description,
    this.type = DiscountRuleType.VOLUME,
    required this.discount,
    this.discountType = DiscountValueTypeEnum.PERCENTAGE,
    this.conditions,
    this.minQuantity,
    this.maxQuantity,
    this.validFrom,
    this.validTo,
    this.code,
    this.applicableProducts = const [],
    this.applicableCategories = const [],
    this.priority = 0,
    this.isActive = true,
    this.stackable = false,
    this.currentUses = 0,
    this.maxUses,
    required this.createdAt,
    this.updatedAt,
  });

  factory DiscountRule.fromJson(Map<String, dynamic> json) {
    final validFromRaw = json['validFrom'] ?? json['startDate'];
    final validToRaw = json['validTo'] ?? json['endDate'];
    return DiscountRule(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unnamed Rule',
      description: json['description'] as String?,
      type: _parseDiscountRuleType(json['type'] as String?),
      discount: ((json['discount'] ?? json['value']) as num?)?.toDouble() ?? 0,
      discountType: _parseDiscountValueType((json['discountType'] ?? json['valueType']) as String?),
      conditions: json['conditions'] as Map<String, dynamic>?,
      minQuantity: (json['minQuantity'] as num?)?.toInt(),
      maxQuantity: (json['maxQuantity'] as num?)?.toInt(),
      validFrom: validFromRaw != null ? DateTime.tryParse(validFromRaw as String) : null,
      validTo: validToRaw != null ? DateTime.tryParse(validToRaw as String) : null,
      code: (json['code'] ?? json['promoCode']) as String?,
      applicableProducts: (json['applicableProducts'] as List<dynamic>?)?.cast<String>() ?? [],
      applicableCategories: (json['applicableCategories'] as List<dynamic>?)?.cast<String>() ?? [],
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      stackable: json['stackable'] as bool? ?? false,
      currentUses: ((json['currentUses'] ?? json['usageCount']) as num?)?.toInt() ?? 0,
      maxUses: ((json['maxUses'] ?? json['usageLimit']) as num?)?.toInt(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': description,
    'type': type.name,
    'discount': discount,
    'discountType': discountType.name,
    'minQuantity': minQuantity,
    'maxQuantity': maxQuantity,
    'validFrom': validFrom?.toIso8601String(),
    'validTo': validTo?.toIso8601String(),
    'code': code,
    'priority': priority,
    'isActive': isActive,
    'stackable': stackable,
    'maxUses': maxUses,
  };

  static DiscountRuleType _parseDiscountRuleType(String? type) {
    if (type == null) return DiscountRuleType.VOLUME;
    switch (type.toUpperCase()) {
      case 'VOLUME':
        return DiscountRuleType.VOLUME;
      case 'PROMO_CODE':
      case 'PROMOCODE':
        return DiscountRuleType.PROMO_CODE;
      case 'CUSTOMER_SEGMENT':
      case 'CUSTOMERSEGMENT':
        return DiscountRuleType.CUSTOMER_SEGMENT;
      case 'TIME_LIMITED':
      case 'TIMELIMITED':
        return DiscountRuleType.TIME_LIMITED;
      case 'BUNDLE':
        return DiscountRuleType.BUNDLE;
      default:
        // Fallback mappings for old camelCase values
        switch (type) {
          case 'promoCode': return DiscountRuleType.PROMO_CODE;
          case 'customerSegment': return DiscountRuleType.CUSTOMER_SEGMENT;
          case 'timeLimited': return DiscountRuleType.TIME_LIMITED;
          case 'bundle': return DiscountRuleType.BUNDLE;
          case 'volume': return DiscountRuleType.VOLUME;
          default: return DiscountRuleType.VOLUME;
        }
    }
  }

  static DiscountValueTypeEnum _parseDiscountValueType(String? type) {
    if (type == null) return DiscountValueTypeEnum.PERCENTAGE;
    switch (type.toUpperCase()) {
      case 'PERCENTAGE':
        return DiscountValueTypeEnum.PERCENTAGE;
      case 'FIXED_AMOUNT':
      case 'FIXEDAMOUNT':
        return DiscountValueTypeEnum.FIXED_AMOUNT;
      default:
        // Fallback for old values
        switch (type) {
          case 'fixed': return DiscountValueTypeEnum.FIXED_AMOUNT;
          case 'percentage': return DiscountValueTypeEnum.PERCENTAGE;
          default: return DiscountValueTypeEnum.PERCENTAGE;
        }
    }
  }

  String get typeLabel {
    switch (type) {
      case DiscountRuleType.VOLUME: return 'Volume';
      case DiscountRuleType.PROMO_CODE: return 'Promo Code';
      case DiscountRuleType.CUSTOMER_SEGMENT: return 'Segment';
      case DiscountRuleType.TIME_LIMITED: return 'Time Limited';
      case DiscountRuleType.BUNDLE: return 'Bundle';
    }
  }

  String get valueDisplay {
    if (discountType == DiscountValueTypeEnum.PERCENTAGE) {
      return '${discount.toStringAsFixed(0)}%';
    }
    return '\$${discount.toStringAsFixed(2)}';
  }
}

// Providers
final discountRulesServiceProvider = Provider<DiscountRulesService>((ref) {
  final api = ref.watch(apiClientProvider);
  return DiscountRulesService(api);
});

final discountRulesProvider = FutureProvider.autoDispose<List<DiscountRule>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(discountRulesServiceProvider);
  return service.getDiscountRules();
});

final discountRuleDetailProvider = FutureProvider.autoDispose.family<DiscountRule?, String>((ref, id) async {
  final service = ref.watch(discountRulesServiceProvider);
  return service.getDiscountRule(id);
});

class DiscountRulesService {
  final ApiClient _api;
  DiscountRulesService(this._api);

  Future<List<DiscountRule>> getDiscountRules() async {
    try {
      final response = await _api.get('/discount-rules');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => DiscountRule.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<DiscountRule?> getDiscountRule(String id) async {
    try {
      final response = await _api.get('/discount-rules/$id');
      return DiscountRule.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<DiscountRule?> createDiscountRule(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/discount-rules', data: data);
      return DiscountRule.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<DiscountRule?> updateDiscountRule(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/discount-rules/$id', data: data);
      return DiscountRule.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<bool> deleteDiscountRule(String id) async {
    try {
      await _api.delete('/discount-rules/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
