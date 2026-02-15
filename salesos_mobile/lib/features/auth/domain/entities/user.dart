import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
abstract class User with _$User {
  const User._(); // Required for custom getters

  const factory User({
    required String id,
    required String email,
    String? name, // Backend returns 'name' as single field
    String? firstName,
    String? lastName,
    String? avatarUrl,
    String? phone,
    String? company,
    String? role,
    @Default(false) bool isEmailVerified,
    DateTime? createdAt,
    DateTime? updatedAt,
    // Organization context (B2B enterprise)
    String? organizationId,
    String? organizationName,
    String? organizationRole, // OWNER, ADMIN, MANAGER, MEMBER
    String? organizationSlug,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);

  /// Check if user belongs to an organization
  bool get hasOrganization => organizationId != null;

  String get fullName {
    // First try the 'name' field from backend
    if (name != null && name!.isNotEmpty) {
      return name!;
    }
    // Then try firstName/lastName
    final parts = [firstName, lastName].where((p) => p != null && p.isNotEmpty);
    return parts.isNotEmpty ? parts.join(' ') : email.split('@').first;
  }

  String get initials {
    // First try the 'name' field from backend
    if (name != null && name!.isNotEmpty) {
      final parts = name!.split(' ');
      if (parts.length >= 2) {
        return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      }
      return name![0].toUpperCase();
    }
    // Then try firstName/lastName
    if (firstName != null && firstName!.isNotEmpty) {
      final first = firstName![0].toUpperCase();
      if (lastName != null && lastName!.isNotEmpty) {
        return '$first${lastName![0].toUpperCase()}';
      }
      return first;
    }
    return email[0].toUpperCase();
  }
}
