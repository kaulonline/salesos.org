import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/organization_repository.dart';
import '../../domain/entities/organization.dart';

/// Organization state
class OrganizationState {
  final bool isLoading;
  final Organization? organization;
  final OrganizationMember? membership;
  final List<OrganizationMember> members;
  final List<OrganizationLicense> licenses;
  final String? error;

  const OrganizationState({
    this.isLoading = false,
    this.organization,
    this.membership,
    this.members = const [],
    this.licenses = const [],
    this.error,
  });

  OrganizationState copyWith({
    bool? isLoading,
    Organization? organization,
    OrganizationMember? membership,
    List<OrganizationMember>? members,
    List<OrganizationLicense>? licenses,
    String? error,
  }) {
    return OrganizationState(
      isLoading: isLoading ?? this.isLoading,
      organization: organization ?? this.organization,
      membership: membership ?? this.membership,
      members: members ?? this.members,
      licenses: licenses ?? this.licenses,
      error: error,
    );
  }

  bool get hasOrganization => organization != null;
  bool get isOwnerOrAdmin =>
      membership?.role == OrganizationMemberRole.owner ||
      membership?.role == OrganizationMemberRole.admin;
}

/// Organization state provider
final organizationProvider =
    NotifierProvider<OrganizationNotifier, OrganizationState>(
        OrganizationNotifier.new);

/// Current organization provider (convenience)
final currentOrganizationProvider = Provider<Organization?>((ref) {
  return ref.watch(organizationProvider).organization;
});

/// Has organization provider
final hasOrganizationProvider = Provider<bool>((ref) {
  return ref.watch(organizationProvider).hasOrganization;
});

class OrganizationNotifier extends Notifier<OrganizationState> {
  late final OrganizationRepository _repository;

  @override
  OrganizationState build() {
    _repository = ref.watch(organizationRepositoryProvider);
    return const OrganizationState();
  }

  /// Load current user's organization
  Future<void> loadMyOrganization() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final organization = await _repository.getMyOrganization();
      final membership = await _repository.getMyMembership();

      state = state.copyWith(
        isLoading: false,
        organization: organization,
        membership: membership,
      );

      // If we have an organization, load members and licenses
      if (organization != null) {
        await Future.wait([
          loadMembers(organization.id),
          loadLicenses(organization.id),
        ]);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Load organization members
  Future<void> loadMembers(String organizationId) async {
    try {
      final members = await _repository.getMembers(organizationId);
      state = state.copyWith(members: members);
    } catch (e) {
      // Non-critical, don't update error state
    }
  }

  /// Load organization license pools
  Future<void> loadLicenses(String organizationId) async {
    try {
      final licenses = await _repository.getLicenses(organizationId);
      state = state.copyWith(licenses: licenses);
    } catch (e) {
      // Non-critical, don't update error state
    }
  }

  /// Clear organization state (on logout)
  void clear() {
    state = const OrganizationState();
  }
}

/// Provider for validating organization codes
final validateOrganizationCodeProvider =
    FutureProvider.family<OrganizationCodeValidation, String>((ref, code) async {
  final repository = ref.watch(organizationRepositoryProvider);
  return repository.validateCode(code);
});
