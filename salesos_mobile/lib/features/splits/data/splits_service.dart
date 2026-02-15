import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Revenue split model
class SplitModel {
  final String id;
  final String dealId;
  final String? dealName;
  final String repId;
  final String? repName;
  final double percentage;
  final double amount;

  SplitModel({
    required this.id,
    required this.dealId,
    this.dealName,
    required this.repId,
    this.repName,
    required this.percentage,
    required this.amount,
  });

  factory SplitModel.fromJson(Map<String, dynamic> json) {
    return SplitModel(
      id: json['id'] as String? ?? '',
      dealId: json['dealId'] as String? ?? json['opportunityId'] as String? ?? '',
      dealName: json['dealName'] as String? ??
          json['deal']?['name'] as String? ??
          json['opportunity']?['name'] as String?,
      repId: json['repId'] as String? ?? json['userId'] as String? ?? '',
      repName: json['repName'] as String? ??
          json['rep']?['name'] as String? ??
          json['user']?['name'] as String?,
      percentage: (json['percentage'] as num?)?.toDouble() ??
          (json['splitPercentage'] as num?)?.toDouble() ??
          0,
      amount: (json['amount'] as num?)?.toDouble() ??
          (json['splitAmount'] as num?)?.toDouble() ??
          0,
    );
  }
}

/// Splits service provider
final splitsServiceProvider = Provider<SplitsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return SplitsService(api, authMode);
});

/// Deal splits provider (family by dealId)
final dealSplitsProvider =
    FutureProvider.autoDispose.family<List<SplitModel>, String>((ref, dealId) async {
  ref.watch(authModeProvider);
  final service = ref.watch(splitsServiceProvider);
  return service.getByDeal(dealId);
});

/// Revenue splits service
class SplitsService {
  final ApiClient _api;

  SplitsService(this._api, AuthMode _);

  /// Get all splits
  Future<List<SplitModel>> getAll() async {
    try {
      final response = await _api.get('/splits');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }

      return items
          .map((item) => SplitModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get splits by deal ID
  Future<List<SplitModel>> getByDeal(String dealId) async {
    try {
      final response = await _api.get('/splits', queryParameters: {
        'dealId': dealId,
      });
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }

      return items
          .map((item) => SplitModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }
}
