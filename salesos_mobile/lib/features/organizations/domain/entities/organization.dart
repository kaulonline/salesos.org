import 'package:freezed_annotation/freezed_annotation.dart';

part 'organization.freezed.dart';
part 'organization.g.dart';

/// Organization status enum
enum OrganizationStatus {
  @JsonValue('ACTIVE')
  active,
  @JsonValue('SUSPENDED')
  suspended,
  @JsonValue('PENDING')
  pending,
  @JsonValue('INACTIVE')
  inactive,
}

/// Organization member role enum
enum OrganizationMemberRole {
  @JsonValue('OWNER')
  owner,
  @JsonValue('ADMIN')
  admin,
  @JsonValue('MANAGER')
  manager,
  @JsonValue('MEMBER')
  member,
}

/// Organization entity
@freezed
abstract class Organization with _$Organization {
  const Organization._();

  const factory Organization({
    required String id,
    required String name,
    required String slug,
    String? code,
    String? domain,
    String? contactEmail,
    String? contactPhone,
    String? logoUrl,
    @Default(OrganizationStatus.pending) OrganizationStatus status,
    int? maxMembers,
    DateTime? createdAt,
    DateTime? updatedAt,
    // Counts
    int? memberCount,
    int? licenseCount,
    int? codeCount,
  }) = _Organization;

  factory Organization.fromJson(Map<String, dynamic> json) =>
      _$OrganizationFromJson(json);

  bool get isActive => status == OrganizationStatus.active;
}

/// Organization member entity
@freezed
abstract class OrganizationMember with _$OrganizationMember {
  const OrganizationMember._();

  const factory OrganizationMember({
    required String id,
    required String userId,
    required String organizationId,
    @Default(OrganizationMemberRole.member) OrganizationMemberRole role,
    @Default(true) bool isActive,
    DateTime? joinedAt,
    String? department,
    String? title,
    // User info
    String? userName,
    String? userEmail,
    String? userAvatarUrl,
  }) = _OrganizationMember;

  factory OrganizationMember.fromJson(Map<String, dynamic> json) =>
      _$OrganizationMemberFromJson(json);

  String get roleDisplayName {
    switch (role) {
      case OrganizationMemberRole.owner:
        return 'Owner';
      case OrganizationMemberRole.admin:
        return 'Admin';
      case OrganizationMemberRole.manager:
        return 'Manager';
      case OrganizationMemberRole.member:
        return 'Member';
    }
  }
}

/// Organization license pool entity
@freezed
abstract class OrganizationLicense with _$OrganizationLicense {
  const OrganizationLicense._();

  const factory OrganizationLicense({
    required String id,
    required String organizationId,
    required String licenseTypeId,
    required int totalSeats,
    @Default(0) int usedSeats,
    String? licenseKey,
    DateTime? startDate,
    DateTime? endDate,
    @Default('ACTIVE') String status,
    // License type info
    String? licenseTypeName,
    String? licenseTypeSlug,
  }) = _OrganizationLicense;

  factory OrganizationLicense.fromJson(Map<String, dynamic> json) =>
      _$OrganizationLicenseFromJson(json);

  int get availableSeats => totalSeats - usedSeats;
  bool get hasAvailableSeats => availableSeats > 0;
  double get usagePercentage => totalSeats > 0 ? usedSeats / totalSeats : 0;
}
