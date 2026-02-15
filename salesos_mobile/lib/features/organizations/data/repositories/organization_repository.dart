import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/exceptions.dart';
import '../../domain/entities/organization.dart';

final organizationRepositoryProvider = Provider<OrganizationRepository>((ref) {
  return OrganizationRepository(ref.watch(apiClientProvider));
});

class OrganizationRepository {
  final ApiClient _apiClient;

  OrganizationRepository(this._apiClient);

  /// Extract AppException from DioException or wrap unknown errors
  AppException _handleError(dynamic error, String context) {
    if (error is DioException && error.error is AppException) {
      return error.error as AppException;
    }
    if (error is AppException) {
      return error;
    }
    return UnknownException(
      message: 'An error occurred during $context',
      originalError: error,
    );
  }

  /// Get current user's organization
  Future<Organization?> getMyOrganization() async {
    try {
      final response = await _apiClient.get('/organizations/my-organization');
      if (response.data == null) return null;
      return Organization.fromJson(response.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null; // User not in an organization
      }
      throw _handleError(e, 'fetching organization');
    } catch (e) {
      throw _handleError(e, 'fetching organization');
    }
  }

  /// Get organization by ID
  Future<Organization> getOrganization(String id) async {
    try {
      final response = await _apiClient.get('/organizations/$id');
      return Organization.fromJson(response.data);
    } catch (e) {
      throw _handleError(e, 'fetching organization');
    }
  }

  /// Get organization members
  Future<List<OrganizationMember>> getMembers(String organizationId) async {
    try {
      final response = await _apiClient.get('/organizations/$organizationId/members');
      final List<dynamic> data = response.data ?? [];
      return data.map((json) => OrganizationMember.fromJson(json)).toList();
    } catch (e) {
      throw _handleError(e, 'fetching members');
    }
  }

  /// Get organization license pools
  Future<List<OrganizationLicense>> getLicenses(String organizationId) async {
    try {
      final response = await _apiClient.get('/organizations/$organizationId/licenses');
      final List<dynamic> data = response.data ?? [];
      return data.map((json) => OrganizationLicense.fromJson(json)).toList();
    } catch (e) {
      throw _handleError(e, 'fetching licenses');
    }
  }

  /// Validate organization code (public endpoint - no auth required)
  Future<OrganizationCodeValidation> validateCode(String code) async {
    try {
      final response = await _apiClient.post(
        '/organizations/validate-code',
        data: {'code': code},
      );
      return OrganizationCodeValidation.fromJson(response.data);
    } catch (e) {
      throw _handleError(e, 'validating organization code');
    }
  }

  /// Get current user's membership details
  Future<OrganizationMember?> getMyMembership() async {
    try {
      final response = await _apiClient.get('/organizations/my-organization');
      if (response.data == null) return null;
      return OrganizationMember.fromJson(response.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      throw _handleError(e, 'fetching membership');
    } catch (e) {
      throw _handleError(e, 'fetching membership');
    }
  }
}

/// Organization code validation result
class OrganizationCodeValidation {
  final bool valid;
  final String? organizationId;
  final String? organizationName;
  final String? message;
  final int? availableSeats;

  OrganizationCodeValidation({
    required this.valid,
    this.organizationId,
    this.organizationName,
    this.message,
    this.availableSeats,
  });

  factory OrganizationCodeValidation.fromJson(Map<String, dynamic> json) {
    return OrganizationCodeValidation(
      valid: json['valid'] ?? false,
      organizationId: json['organizationId'],
      organizationName: json['organizationName'],
      message: json['message'],
      availableSeats: json['availableSeats'],
    );
  }
}
