// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_User _$UserFromJson(Map<String, dynamic> json) => _User(
  id: json['id'] as String,
  email: json['email'] as String,
  name: json['name'] as String?,
  firstName: json['firstName'] as String?,
  lastName: json['lastName'] as String?,
  avatarUrl: json['avatarUrl'] as String?,
  phone: json['phone'] as String?,
  company: json['company'] as String?,
  role: json['role'] as String?,
  isEmailVerified: json['isEmailVerified'] as bool? ?? false,
  createdAt: json['createdAt'] == null
      ? null
      : DateTime.parse(json['createdAt'] as String),
  updatedAt: json['updatedAt'] == null
      ? null
      : DateTime.parse(json['updatedAt'] as String),
  organizationId: json['organizationId'] as String?,
  organizationName: json['organizationName'] as String?,
  organizationRole: json['organizationRole'] as String?,
  organizationSlug: json['organizationSlug'] as String?,
);

Map<String, dynamic> _$UserToJson(_User instance) => <String, dynamic>{
  'id': instance.id,
  'email': instance.email,
  'name': instance.name,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
  'avatarUrl': instance.avatarUrl,
  'phone': instance.phone,
  'company': instance.company,
  'role': instance.role,
  'isEmailVerified': instance.isEmailVerified,
  'createdAt': instance.createdAt?.toIso8601String(),
  'updatedAt': instance.updatedAt?.toIso8601String(),
  'organizationId': instance.organizationId,
  'organizationName': instance.organizationName,
  'organizationRole': instance.organizationRole,
  'organizationSlug': instance.organizationSlug,
};
