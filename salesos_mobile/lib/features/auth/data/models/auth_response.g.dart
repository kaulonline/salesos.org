// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AuthResponse _$AuthResponseFromJson(Map<String, dynamic> json) => AuthResponse(
  accessToken: json['access_token'] as String,
  refreshToken: json['refresh_token'] as String?,
  csrfToken: json['csrf_token'] as String?,
  user: User.fromJson(json['user'] as Map<String, dynamic>),
  expiresIn: (json['expires_in'] as num?)?.toInt(),
);

Map<String, dynamic> _$AuthResponseToJson(AuthResponse instance) =>
    <String, dynamic>{
      'access_token': instance.accessToken,
      'refresh_token': instance.refreshToken,
      'csrf_token': instance.csrfToken,
      'user': instance.user,
      'expires_in': instance.expiresIn,
    };

LoginRequest _$LoginRequestFromJson(Map<String, dynamic> json) => LoginRequest(
  email: json['email'] as String,
  password: json['password'] as String,
);

Map<String, dynamic> _$LoginRequestToJson(LoginRequest instance) =>
    <String, dynamic>{'email': instance.email, 'password': instance.password};

RegisterRequest _$RegisterRequestFromJson(Map<String, dynamic> json) =>
    RegisterRequest(
      email: json['email'] as String,
      password: json['password'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      company: json['company'] as String?,
      organizationCode: json['organizationCode'] as String?,
    );

Map<String, dynamic> _$RegisterRequestToJson(RegisterRequest instance) =>
    <String, dynamic>{
      'email': instance.email,
      'password': instance.password,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'company': instance.company,
      'organizationCode': instance.organizationCode,
    };
