// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

enum IntegrationCategory { EMAIL, CALENDAR, CRM, ANALYTICS, COMMUNICATION, STORAGE, PAYMENT, MARKETING }

enum ConnectionStatus { ACTIVE, INACTIVE, EXPIRED, ERROR, SYNCING }

class Integration {
  final String id;
  final String name;
  final String? description;
  final IntegrationCategory category;
  final String? icon;
  final bool isConnected;
  final bool isAvailable;
  final Map<String, dynamic>? config;
  final DateTime? lastSyncAt;
  final ConnectionStatus status;
  final String? provider;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Integration({
    required this.id,
    required this.name,
    this.description,
    this.category = IntegrationCategory.CRM,
    this.icon,
    this.isConnected = false,
    this.isAvailable = true,
    this.config,
    this.lastSyncAt,
    this.status = ConnectionStatus.INACTIVE,
    this.provider,
    this.createdAt,
    this.updatedAt,
  });

  factory Integration.fromJson(Map<String, dynamic> json) {
    return Integration(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown',
      description: json['description'] as String?,
      category: _parseCategory(json['category'] as String?),
      icon: json['icon'] as String?,
      isConnected: json['isConnected'] as bool? ?? false,
      isAvailable: json['isAvailable'] as bool? ?? true,
      config: json['config'] as Map<String, dynamic>?,
      lastSyncAt: json['lastSyncAt'] != null ? DateTime.tryParse(json['lastSyncAt'] as String) : null,
      status: _parseStatus(json['status'] as String?),
      provider: json['provider'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'category': category.name,
      if (icon != null) 'icon': icon,
      'isConnected': isConnected,
      'isAvailable': isAvailable,
      if (config != null) 'config': config,
      if (lastSyncAt != null) 'lastSyncAt': lastSyncAt!.toIso8601String(),
      'status': status.name,
      if (provider != null) 'provider': provider,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  static IntegrationCategory _parseCategory(String? cat) {
    switch (cat?.toUpperCase()) {
      case 'EMAIL': return IntegrationCategory.EMAIL;
      case 'CALENDAR': return IntegrationCategory.CALENDAR;
      case 'CRM': return IntegrationCategory.CRM;
      case 'ANALYTICS': return IntegrationCategory.ANALYTICS;
      case 'COMMUNICATION': return IntegrationCategory.COMMUNICATION;
      case 'STORAGE': return IntegrationCategory.STORAGE;
      case 'PAYMENT': return IntegrationCategory.PAYMENT;
      case 'MARKETING': return IntegrationCategory.MARKETING;
      default: return IntegrationCategory.CRM;
    }
  }

  static ConnectionStatus _parseStatus(String? status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return ConnectionStatus.ACTIVE;
      case 'CONNECTED': return ConnectionStatus.ACTIVE;
      case 'INACTIVE': return ConnectionStatus.INACTIVE;
      case 'DISCONNECTED': return ConnectionStatus.INACTIVE;
      case 'EXPIRED': return ConnectionStatus.EXPIRED;
      case 'ERROR': return ConnectionStatus.ERROR;
      case 'SYNCING': return ConnectionStatus.SYNCING;
      default: return ConnectionStatus.INACTIVE;
    }
  }

  String get categoryLabel {
    switch (category) {
      case IntegrationCategory.EMAIL: return 'Email';
      case IntegrationCategory.CALENDAR: return 'Calendar';
      case IntegrationCategory.CRM: return 'CRM';
      case IntegrationCategory.ANALYTICS: return 'Analytics';
      case IntegrationCategory.COMMUNICATION: return 'Communication';
      case IntegrationCategory.STORAGE: return 'Storage';
      case IntegrationCategory.PAYMENT: return 'Payment';
      case IntegrationCategory.MARKETING: return 'Marketing';
    }
  }

  String get statusLabel {
    switch (status) {
      case ConnectionStatus.ACTIVE: return 'Connected';
      case ConnectionStatus.INACTIVE: return 'Disconnected';
      case ConnectionStatus.EXPIRED: return 'Expired';
      case ConnectionStatus.ERROR: return 'Error';
      case ConnectionStatus.SYNCING: return 'Syncing';
    }
  }
}

// Providers
final integrationsServiceProvider = Provider<IntegrationsService>((ref) {
  final api = ref.watch(apiClientProvider);
  return IntegrationsService(api);
});

final integrationsProvider = FutureProvider.autoDispose<List<Integration>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(integrationsServiceProvider);
  return service.getIntegrations();
});

final integrationDetailProvider = FutureProvider.autoDispose.family<Integration?, String>((ref, id) async {
  final service = ref.watch(integrationsServiceProvider);
  return service.getIntegration(id);
});

class IntegrationsService {
  final ApiClient _api;
  IntegrationsService(this._api);

  Future<List<Integration>> getIntegrations() async {
    try {
      final response = await _api.get('/integrations');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }
      return items.map((item) => Integration.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<Integration?> getIntegration(String id) async {
    try {
      final response = await _api.get('/integrations/$id');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return Integration.fromJson(data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> connect(String id) async {
    try {
      await _api.post('/integrations/$id/connect');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> disconnect(String id) async {
    try {
      await _api.post('/integrations/$id/disconnect');
      return true;
    } catch (e) {
      return false;
    }
  }
}
