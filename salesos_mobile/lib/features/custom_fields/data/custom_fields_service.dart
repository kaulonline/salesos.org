import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Custom field model
class CustomFieldModel {
  final String id;
  final String name;
  final String fieldType;
  final String entityType;
  final bool isRequired;
  final List<String>? options;
  final String? defaultValue;

  CustomFieldModel({
    required this.id,
    required this.name,
    required this.fieldType,
    required this.entityType,
    this.isRequired = false,
    this.options,
    this.defaultValue,
  });

  factory CustomFieldModel.fromJson(Map<String, dynamic> json) {
    return CustomFieldModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      fieldType: json['fieldType'] as String? ?? json['type'] as String? ?? 'TEXT',
      entityType: json['entityType'] as String? ?? '',
      isRequired: json['isRequired'] as bool? ?? json['required'] as bool? ?? false,
      options: (json['options'] as List<dynamic>?)
          ?.map((o) => o.toString())
          .toList(),
      defaultValue: json['defaultValue'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'fieldType': fieldType,
      'entityType': entityType,
      'isRequired': isRequired,
      if (options != null) 'options': options,
      if (defaultValue != null) 'defaultValue': defaultValue,
    };
  }
}

/// Custom fields service provider
final customFieldsServiceProvider = Provider<CustomFieldsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return CustomFieldsService(api, authMode);
});

/// Custom fields list provider
final customFieldsProvider =
    FutureProvider.autoDispose<List<CustomFieldModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(customFieldsServiceProvider);
  return service.getAll();
});

/// Custom fields service
class CustomFieldsService {
  final ApiClient _api;

  CustomFieldsService(this._api, AuthMode _);

  /// Get all custom fields
  Future<List<CustomFieldModel>> getAll() async {
    try {
      final response = await _api.get('/custom-fields');
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
          .map((item) =>
              CustomFieldModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Create a custom field
  Future<CustomFieldModel?> create(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/custom-fields', data: data);
      return CustomFieldModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Update a custom field
  Future<CustomFieldModel?> update(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/custom-fields/$id', data: data);
      return CustomFieldModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Delete a custom field
  Future<bool> delete(String id) async {
    try {
      await _api.delete('/custom-fields/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
