import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/user.dart';

part 'auth_response.g.dart';

@JsonSerializable(fieldRename: FieldRename.snake)
class AuthResponse {
  final String accessToken;
  final String? refreshToken;
  final String? csrfToken;
  final User user;
  final int? expiresIn;

  AuthResponse({
    required this.accessToken,
    this.refreshToken,
    this.csrfToken,
    required this.user,
    this.expiresIn,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) =>
      _$AuthResponseFromJson(json);

  Map<String, dynamic> toJson() => _$AuthResponseToJson(this);
}

@JsonSerializable()
class LoginRequest {
  final String email;
  final String password;

  LoginRequest({
    required this.email,
    required this.password,
  });

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);

  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

@JsonSerializable()
class RegisterRequest {
  final String email;
  final String password;
  final String? firstName;
  final String? lastName;
  final String? company;
  final String? organizationCode;

  RegisterRequest({
    required this.email,
    required this.password,
    this.firstName,
    this.lastName,
    this.company,
    this.organizationCode,
  });

  factory RegisterRequest.fromJson(Map<String, dynamic> json) =>
      _$RegisterRequestFromJson(json);

  Map<String, dynamic> toJson() => _$RegisterRequestToJson(this);
}
