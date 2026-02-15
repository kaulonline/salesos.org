// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

enum MemberRole { OWNER, ADMIN, MANAGER, USER, VIEWER }

enum MemberStatus { ACTIVE, PENDING, SUSPENDED, INACTIVE }

class TeamMember {
  final String id;
  final String name;
  final String email;
  final MemberRole role;
  final MemberStatus status;
  final String? avatar;
  final DateTime? lastActive;
  final DateTime joinedAt;

  TeamMember({
    required this.id,
    required this.name,
    required this.email,
    this.role = MemberRole.USER,
    this.status = MemberStatus.ACTIVE,
    this.avatar,
    this.lastActive,
    required this.joinedAt,
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? json['fullName'] as String? ?? 'Unknown',
      email: json['email'] as String? ?? '',
      role: _parseRole(json['role'] as String?),
      status: _parseStatus(json['status'] as String?),
      avatar: json['avatar'] as String? ?? json['avatarUrl'] as String?,
      lastActive: json['lastActive'] != null ? DateTime.tryParse(json['lastActive'] as String) : null,
      joinedAt: json['joinedAt'] != null
          ? DateTime.parse(json['joinedAt'] as String)
          : json['createdAt'] != null
              ? DateTime.parse(json['createdAt'] as String)
              : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role.name,
      'status': status.name,
      if (avatar != null) 'avatar': avatar,
      if (lastActive != null) 'lastActive': lastActive!.toIso8601String(),
      'joinedAt': joinedAt.toIso8601String(),
    };
  }

  static MemberRole _parseRole(String? role) {
    switch (role?.toUpperCase()) {
      case 'OWNER': return MemberRole.OWNER;
      case 'ADMIN': return MemberRole.ADMIN;
      case 'MANAGER': return MemberRole.MANAGER;
      case 'USER': return MemberRole.USER;
      case 'MEMBER': return MemberRole.USER;
      case 'VIEWER': return MemberRole.VIEWER;
      default: return MemberRole.USER;
    }
  }

  static MemberStatus _parseStatus(String? status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return MemberStatus.ACTIVE;
      case 'PENDING': return MemberStatus.PENDING;
      case 'INVITED': return MemberStatus.PENDING;
      case 'SUSPENDED': return MemberStatus.SUSPENDED;
      case 'INACTIVE': return MemberStatus.INACTIVE;
      default: return MemberStatus.ACTIVE;
    }
  }

  String get roleLabel {
    switch (role) {
      case MemberRole.OWNER: return 'Owner';
      case MemberRole.ADMIN: return 'Admin';
      case MemberRole.MANAGER: return 'Manager';
      case MemberRole.USER: return 'User';
      case MemberRole.VIEWER: return 'Viewer';
    }
  }

  String get statusLabel {
    switch (status) {
      case MemberStatus.ACTIVE: return 'Active';
      case MemberStatus.PENDING: return 'Pending';
      case MemberStatus.SUSPENDED: return 'Suspended';
      case MemberStatus.INACTIVE: return 'Inactive';
    }
  }

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'U';
  }
}

// Providers
final teamServiceProvider = Provider<TeamService>((ref) {
  final api = ref.watch(apiClientProvider);
  return TeamService(api);
});

final teamMembersProvider = FutureProvider.autoDispose<List<TeamMember>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(teamServiceProvider);
  return service.getMembers();
});

final teamMemberDetailProvider = FutureProvider.autoDispose.family<TeamMember?, String>((ref, id) async {
  final service = ref.watch(teamServiceProvider);
  return service.getMember(id);
});

class TeamService {
  final ApiClient _api;
  TeamService(this._api);

  Future<List<TeamMember>> getMembers() async {
    try {
      final response = await _api.get('/organizations/current/members');
      final data = response.data;
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      } else if (data is Map && data['members'] is List) {
        items = data['members'] as List;
      }
      return items.map((item) => TeamMember.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<TeamMember?> getMember(String id) async {
    try {
      final response = await _api.get('/organizations/current/members/$id');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return TeamMember.fromJson(data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> inviteMember(String email, String role) async {
    try {
      await _api.post('/organizations/current/invite', data: {
        'email': email,
        'role': role,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateMember(String id, Map<String, dynamic> data) async {
    try {
      await _api.patch('/organizations/current/members/$id', data: data);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> removeMember(String id) async {
    try {
      await _api.delete('/organizations/current/members/$id');
      return true;
    } catch (e) {
      return false;
    }
  }
}
