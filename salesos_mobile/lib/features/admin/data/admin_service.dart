import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Admin dashboard statistics
class AdminStatsModel {
  final int totalUsers;
  final int activeUsers;
  final int totalOrgs;
  final int totalDeals;
  final double revenue;

  AdminStatsModel({
    required this.totalUsers,
    required this.activeUsers,
    required this.totalOrgs,
    required this.totalDeals,
    required this.revenue,
  });

  factory AdminStatsModel.fromJson(Map<String, dynamic> json) {
    return AdminStatsModel(
      totalUsers: json['totalUsers'] as int? ?? 0,
      activeUsers: json['activeUsers'] as int? ?? 0,
      totalOrgs: json['totalOrgs'] as int? ?? json['totalOrganizations'] as int? ?? 0,
      totalDeals: json['totalDeals'] as int? ?? 0,
      revenue: (json['revenue'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Admin user model with dual-role info
class AdminUserModel {
  final String id;
  final String email;
  final String? name;
  final String role;
  final String? organizationId;
  final String? organizationName;
  final String? orgRole;
  final String status;
  final DateTime createdAt;

  AdminUserModel({
    required this.id,
    required this.email,
    this.name,
    required this.role,
    this.organizationId,
    this.organizationName,
    this.orgRole,
    required this.status,
    required this.createdAt,
  });

  factory AdminUserModel.fromJson(Map<String, dynamic> json) {
    return AdminUserModel(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String?,
      role: json['role'] as String? ?? 'USER',
      organizationId: json['organizationId'] as String?,
      organizationName: json['organizationName'] as String? ??
          json['organization']?['name'] as String?,
      orgRole: json['orgRole'] as String? ??
          json['organizationRole'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'organizationId': organizationId,
      'orgRole': orgRole,
      'status': status,
    };
  }

  String get displayName => name ?? email;

  bool get isAdmin => role.toUpperCase() == 'ADMIN';
  bool get isActive => status.toUpperCase() == 'ACTIVE';
}

/// Feature flag model
class AdminFeatureFlag {
  final String key;
  final String name;
  final String? description;
  final bool enabled;

  AdminFeatureFlag({
    required this.key,
    required this.name,
    this.description,
    required this.enabled,
  });

  factory AdminFeatureFlag.fromJson(Map<String, dynamic> json) {
    return AdminFeatureFlag(
      key: json['key'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      enabled: json['enabled'] as bool? ?? false,
    );
  }
}

/// Audit log entry
class AuditLogEntry {
  final String id;
  final String? userId;
  final String? userName;
  final String action;
  final String? entityType;
  final String? entityId;
  final String? details;
  final DateTime timestamp;

  AuditLogEntry({
    required this.id,
    this.userId,
    this.userName,
    required this.action,
    this.entityType,
    this.entityId,
    this.details,
    required this.timestamp,
  });

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    return AuditLogEntry(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String?,
      userName: json['userName'] as String? ??
          json['user']?['name'] as String?,
      action: json['action'] as String? ?? '',
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
      details: json['details'] as String?,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : json['createdAt'] != null
              ? DateTime.parse(json['createdAt'] as String)
              : DateTime.now(),
    );
  }
}

/// Admin service provider
final adminServiceProvider = Provider<AdminService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return AdminService(api, authMode);
});

/// Admin dashboard stats provider
final adminStatsProvider =
    FutureProvider.autoDispose<AdminStatsModel>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(adminServiceProvider);
  return service.getDashboard();
});

/// Admin users list provider
final adminUsersProvider =
    FutureProvider.autoDispose<List<AdminUserModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(adminServiceProvider);
  return service.getUsers();
});

/// Admin feature flags provider
final adminFeaturesProvider =
    FutureProvider.autoDispose<List<AdminFeatureFlag>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(adminServiceProvider);
  return service.getFeatures();
});

/// Admin audit logs provider
final adminAuditLogsProvider =
    FutureProvider.autoDispose<List<AuditLogEntry>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(adminServiceProvider);
  return service.getAuditLogs();
});

/// Admin service for platform management
class AdminService {
  final ApiClient _api;

  AdminService(this._api, AuthMode _);

  /// Get admin dashboard stats
  Future<AdminStatsModel> getDashboard() async {
    try {
      final response = await _api.get('/admin/dashboard');
      return AdminStatsModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return AdminStatsModel(
        totalUsers: 0,
        activeUsers: 0,
        totalOrgs: 0,
        totalDeals: 0,
        revenue: 0,
      );
    }
  }

  /// Get all users
  Future<List<AdminUserModel>> getUsers() async {
    try {
      final response = await _api.get('/admin/users');
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
          .map((item) => AdminUserModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Update a user
  Future<AdminUserModel?> updateUser(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/admin/users/$id', data: data);
      return AdminUserModel.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Suspend a user
  Future<bool> suspendUser(String id) async {
    try {
      await _api.patch('/admin/users/$id', data: {'status': 'SUSPENDED'});
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Activate a user
  Future<bool> activateUser(String id) async {
    try {
      await _api.patch('/admin/users/$id', data: {'status': 'ACTIVE'});
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get feature flags
  Future<List<AdminFeatureFlag>> getFeatures() async {
    try {
      final response = await _api.get('/admin/features');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      }

      return items
          .map((item) => AdminFeatureFlag.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Toggle a feature flag
  Future<bool> toggleFeature(String key, bool enabled) async {
    try {
      await _api.patch('/admin/features/$key', data: {'enabled': enabled});
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get audit logs
  Future<List<AuditLogEntry>> getAuditLogs() async {
    try {
      final response = await _api.get('/admin/audit-logs');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      }

      return items
          .map((item) => AuditLogEntry.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get backups
  Future<List<Map<String, dynamic>>> getBackups() async {
    try {
      final response = await _api.get('/admin/backups');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      }

      return items.cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  /// Create a backup
  Future<bool> createBackup() async {
    try {
      await _api.post('/admin/backups');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get system config
  Future<Map<String, dynamic>> getConfig() async {
    try {
      final response = await _api.get('/admin/config');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {};
    }
  }

  /// Update system config
  Future<bool> updateConfig(Map<String, dynamic> config) async {
    try {
      await _api.patch('/admin/config', data: config);
      return true;
    } catch (e) {
      return false;
    }
  }
}
