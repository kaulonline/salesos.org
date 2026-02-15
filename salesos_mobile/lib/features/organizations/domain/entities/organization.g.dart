// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organization.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Organization _$OrganizationFromJson(Map<String, dynamic> json) =>
    _Organization(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      code: json['code'] as String?,
      domain: json['domain'] as String?,
      contactEmail: json['contactEmail'] as String?,
      contactPhone: json['contactPhone'] as String?,
      logoUrl: json['logoUrl'] as String?,
      status:
          $enumDecodeNullable(_$OrganizationStatusEnumMap, json['status']) ??
          OrganizationStatus.pending,
      maxMembers: (json['maxMembers'] as num?)?.toInt(),
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
      memberCount: (json['memberCount'] as num?)?.toInt(),
      licenseCount: (json['licenseCount'] as num?)?.toInt(),
      codeCount: (json['codeCount'] as num?)?.toInt(),
    );

Map<String, dynamic> _$OrganizationToJson(_Organization instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'slug': instance.slug,
      'code': instance.code,
      'domain': instance.domain,
      'contactEmail': instance.contactEmail,
      'contactPhone': instance.contactPhone,
      'logoUrl': instance.logoUrl,
      'status': _$OrganizationStatusEnumMap[instance.status]!,
      'maxMembers': instance.maxMembers,
      'createdAt': instance.createdAt?.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
      'memberCount': instance.memberCount,
      'licenseCount': instance.licenseCount,
      'codeCount': instance.codeCount,
    };

const _$OrganizationStatusEnumMap = {
  OrganizationStatus.active: 'ACTIVE',
  OrganizationStatus.suspended: 'SUSPENDED',
  OrganizationStatus.pending: 'PENDING',
  OrganizationStatus.inactive: 'INACTIVE',
};

_OrganizationMember _$OrganizationMemberFromJson(Map<String, dynamic> json) =>
    _OrganizationMember(
      id: json['id'] as String,
      userId: json['userId'] as String,
      organizationId: json['organizationId'] as String,
      role:
          $enumDecodeNullable(_$OrganizationMemberRoleEnumMap, json['role']) ??
          OrganizationMemberRole.member,
      isActive: json['isActive'] as bool? ?? true,
      joinedAt: json['joinedAt'] == null
          ? null
          : DateTime.parse(json['joinedAt'] as String),
      department: json['department'] as String?,
      title: json['title'] as String?,
      userName: json['userName'] as String?,
      userEmail: json['userEmail'] as String?,
      userAvatarUrl: json['userAvatarUrl'] as String?,
    );

Map<String, dynamic> _$OrganizationMemberToJson(_OrganizationMember instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'organizationId': instance.organizationId,
      'role': _$OrganizationMemberRoleEnumMap[instance.role]!,
      'isActive': instance.isActive,
      'joinedAt': instance.joinedAt?.toIso8601String(),
      'department': instance.department,
      'title': instance.title,
      'userName': instance.userName,
      'userEmail': instance.userEmail,
      'userAvatarUrl': instance.userAvatarUrl,
    };

const _$OrganizationMemberRoleEnumMap = {
  OrganizationMemberRole.owner: 'OWNER',
  OrganizationMemberRole.admin: 'ADMIN',
  OrganizationMemberRole.manager: 'MANAGER',
  OrganizationMemberRole.member: 'MEMBER',
};

_OrganizationLicense _$OrganizationLicenseFromJson(Map<String, dynamic> json) =>
    _OrganizationLicense(
      id: json['id'] as String,
      organizationId: json['organizationId'] as String,
      licenseTypeId: json['licenseTypeId'] as String,
      totalSeats: (json['totalSeats'] as num).toInt(),
      usedSeats: (json['usedSeats'] as num?)?.toInt() ?? 0,
      licenseKey: json['licenseKey'] as String?,
      startDate: json['startDate'] == null
          ? null
          : DateTime.parse(json['startDate'] as String),
      endDate: json['endDate'] == null
          ? null
          : DateTime.parse(json['endDate'] as String),
      status: json['status'] as String? ?? 'ACTIVE',
      licenseTypeName: json['licenseTypeName'] as String?,
      licenseTypeSlug: json['licenseTypeSlug'] as String?,
    );

Map<String, dynamic> _$OrganizationLicenseToJson(
  _OrganizationLicense instance,
) => <String, dynamic>{
  'id': instance.id,
  'organizationId': instance.organizationId,
  'licenseTypeId': instance.licenseTypeId,
  'totalSeats': instance.totalSeats,
  'usedSeats': instance.usedSeats,
  'licenseKey': instance.licenseKey,
  'startDate': instance.startDate?.toIso8601String(),
  'endDate': instance.endDate?.toIso8601String(),
  'status': instance.status,
  'licenseTypeName': instance.licenseTypeName,
  'licenseTypeSlug': instance.licenseTypeSlug,
};
