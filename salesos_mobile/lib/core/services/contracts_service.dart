// ignore_for_file: constant_identifier_names
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../models/contract.dart';
import '../providers/auth_mode_provider.dart';

/// Contracts service for managing contract lifecycle operations.
/// Communicates with the backend /api/contracts/* endpoints or Salesforce via proxy.
class ContractsService {
  final ApiClient _api;
  final AuthMode _authMode;

  ContractsService(this._api, this._authMode);

  /// Check if we're in Salesforce mode
  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /// Get all contracts with optional filters
  Future<List<Contract>> getContracts({ContractFilters? filters}) async {
    try {
      if (isSalesforceMode) {
        // Build SOQL WHERE clause
        final conditions = <String>[];
        if (filters?.status != null) {
          conditions.add("Status = '${_mapStatusToSalesforce(filters!.status!)}'");
        }
        if (filters?.accountId != null) {
          conditions.add("AccountId = '${filters!.accountId}'");
        }

        final whereClause = conditions.isNotEmpty ? 'WHERE ${conditions.join(' AND ')}' : '';

        final results = await _querySalesforce(
          'SELECT Id, ContractNumber, Name, Status, StartDate, EndDate, ContractTerm, '
          'Description, SpecialTerms, AccountId, Account.Name, OwnerId, '
          'ActivatedDate, CreatedDate, LastModifiedDate '
          'FROM Contract $whereClause '
          'ORDER BY CreatedDate DESC',
        );

        return results.map((json) => Contract.fromSalesforceJson(json)).toList();
      } else {
        final queryParams = filters?.toQueryParameters();
        final response = await _api.get(
          '/contracts',
          queryParameters: queryParams,
        );
        return _parseContractList(response.data);
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Get a single contract by ID
  Future<Contract> getContract(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, ContractNumber, Name, Status, StartDate, EndDate, ContractTerm, "
          "Description, SpecialTerms, AccountId, Account.Name, OwnerId, "
          "ActivatedDate, CreatedDate, LastModifiedDate "
          "FROM Contract WHERE Id = '$id'",
        );

        if (results.isEmpty) {
          throw Exception('Contract not found');
        }
        return Contract.fromSalesforceJson(results.first);
      } else {
        final response = await _api.get('/contracts/$id');
        final data = _safeParseResponseData(response.data);
        if (data == null) throw Exception('Invalid response: expected contract data');
        return Contract.fromJson(data);
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Get contract statistics
  Future<ContractStats> getContractStats() async {
    try {
      final response = await _api.get('/contracts/stats');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected stats data');
      return ContractStats.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // CREATE/UPDATE OPERATIONS
  // ============================================================================

  /// Create a new contract
  Future<Contract> createContract(CreateContractDto data) async {
    try {
      if (isSalesforceMode) {
        final sfData = {
          'AccountId': data.accountId,
          'Status': 'Draft',
          'StartDate': data.startDate?.toIso8601String().split('T')[0],
          'ContractTerm': data.contractTerm,
          'Description': data.description,
          'SpecialTerms': data.specialTerms,
        };
        sfData.removeWhere((key, value) => value == null);

        final response = await _api.post('/salesforce/sobjects/Contract', data: sfData);
        if (response.data != null && response.data['id'] != null) {
          return await getContract(response.data['id'] as String);
        }
        throw Exception('Failed to create contract');
      } else {
        final response = await _api.post('/contracts', data: data.toJson());
        final responseData = _safeParseResponseData(response.data);
        if (responseData == null) throw Exception('Invalid response: expected contract data');
        return Contract.fromJson(responseData);
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing contract
  Future<Contract> updateContract(String id, UpdateContractDto data) async {
    try {
      if (isSalesforceMode) {
        final sfData = <String, dynamic>{};
        if (data.startDate != null) sfData['StartDate'] = data.startDate!.toIso8601String().split('T')[0];
        if (data.endDate != null) sfData['EndDate'] = data.endDate!.toIso8601String().split('T')[0];
        if (data.contractTerm != null) sfData['ContractTerm'] = data.contractTerm;
        if (data.description != null) sfData['Description'] = data.description;
        if (data.specialTerms != null) sfData['SpecialTerms'] = data.specialTerms;

        await _api.patch('/salesforce/sobjects/Contract/$id', data: sfData);
        return await getContract(id);
      } else {
        final response = await _api.patch('/contracts/$id', data: data.toJson());
        final responseData = _safeParseResponseData(response.data);
        if (responseData == null) throw Exception('Invalid response: expected contract data');
        return Contract.fromJson(responseData);
      }
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // LIFECYCLE OPERATIONS
  // ============================================================================

  /// Submit contract for review (DRAFT -> IN_REVIEW)
  Future<Contract> submitContract(String id) async {
    try {
      final response = await _api.post('/contracts/$id/submit');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected contract data');
      return Contract.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Approve contract (IN_REVIEW -> APPROVED)
  Future<Contract> approveContract(String id) async {
    try {
      final response = await _api.post('/contracts/$id/approve');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected contract data');
      return Contract.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Activate contract (APPROVED -> ACTIVATED)
  Future<Contract> activateContract(String id) async {
    try {
      final response = await _api.post('/contracts/$id/activate');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected contract data');
      return Contract.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Terminate contract (ACTIVATED -> TERMINATED)
  Future<Contract> terminateContract(String id, {String? reason}) async {
    try {
      final response = await _api.post(
        '/contracts/$id/terminate',
        data: reason != null ? {'reason': reason} : null,
      );
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected contract data');
      return Contract.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  /// Renew contract - creates a new contract based on the existing one
  Future<Contract> renewContract(String id) async {
    try {
      final response = await _api.post('/contracts/$id/renew');
      final data = _safeParseResponseData(response.data);
      if (data == null) throw Exception('Invalid response: expected contract data');
      return Contract.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /// Safely parse response data to a Map.
  /// Returns null if data is null or not a Map.
  Map<String, dynamic>? _safeParseResponseData(dynamic data) {
    if (data == null) return null;
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return null;
  }

  /// Parse contract list from API response
  List<Contract> _parseContractList(dynamic data) {
    if (data is List) {
      return data
          .whereType<Map<String, dynamic>>()
          .map((json) => Contract.fromJson(json))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .whereType<Map<String, dynamic>>()
          .map((json) => Contract.fromJson(json))
          .toList();
    }
    if (data is Map && data['items'] is List) {
      return (data['items'] as List)
          .whereType<Map<String, dynamic>>()
          .map((json) => Contract.fromJson(json))
          .toList();
    }
    return [];
  }

  // ============================================================================
  // SALESFORCE HELPER METHODS
  // ============================================================================

  /// Execute a SOQL query against Salesforce via the backend proxy
  Future<List<Map<String, dynamic>>> _querySalesforce(String soql) async {
    try {
      final response = await _api.post(
        '/salesforce/query',
        data: {'soql': soql},
        options: Options(
          validateStatus: (status) => status != null && status >= 200 && status < 300,
        ),
      );

      final data = response.data;
      if (data == null) return [];

      if (data is Map<String, dynamic>) {
        final records = data['records'] as List<dynamic>?;
        if (records != null) {
          return records.cast<Map<String, dynamic>>();
        }
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  /// Map our ContractStatus to Salesforce Contract Status
  String _mapStatusToSalesforce(ContractStatus status) {
    switch (status) {
      case ContractStatus.DRAFT:
        return 'Draft';
      case ContractStatus.IN_REVIEW:
        return 'In Approval Process';
      case ContractStatus.APPROVED:
        return 'Draft'; // Salesforce doesn't have approved, it goes draft -> activated
      case ContractStatus.ACTIVATED:
        return 'Activated';
      case ContractStatus.EXPIRED:
        return 'Expired';
      case ContractStatus.TERMINATED:
        return 'Terminated';
    }
  }
}

// ============================================================================
// RIVERPOD PROVIDERS
// ============================================================================

/// Contracts service provider
final contractsServiceProvider = Provider<ContractsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return ContractsService(api, authMode);
});

/// All contracts provider
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final contractsProvider = FutureProvider.autoDispose<List<Contract>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts();
});

/// Contracts with filters provider
final filteredContractsProvider = FutureProvider.autoDispose
    .family<List<Contract>, ContractFilters?>((ref, filters) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts(filters: filters);
});

/// Single contract by ID provider
final contractProvider =
    FutureProvider.autoDispose.family<Contract, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContract(id);
});

/// Alias for contractProvider - single contract by ID
/// This provides a more explicit naming convention
final contractByIdProvider = contractProvider;

/// Contract statistics provider
final contractStatsProvider =
    FutureProvider.autoDispose<ContractStats>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContractStats();
});

/// Active contracts provider (convenience)
final activeContractsProvider =
    FutureProvider.autoDispose<List<Contract>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts(
    filters: const ContractFilters(status: ContractStatus.ACTIVATED),
  );
});

/// Contracts due for renewal provider
final contractsDueForRenewalProvider =
    FutureProvider.autoDispose<List<Contract>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts(
    filters: const ContractFilters(renewalDue: true),
  );
});

/// Draft contracts provider (convenience)
final draftContractsProvider =
    FutureProvider.autoDispose<List<Contract>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts(
    filters: const ContractFilters(status: ContractStatus.DRAFT),
  );
});

/// Contracts by account provider
final contractsByAccountProvider = FutureProvider.autoDispose
    .family<List<Contract>, String>((ref, accountId) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts(
    filters: ContractFilters(accountId: accountId),
  );
});

// ============================================================================
// STATE NOTIFIERS FOR MUTATIONS
// ============================================================================

/// State for contract operations
class ContractOperationState {
  final bool isLoading;
  final Contract? result;
  final String? error;

  const ContractOperationState({
    this.isLoading = false,
    this.result,
    this.error,
  });

  ContractOperationState copyWith({
    bool? isLoading,
    Contract? result,
    String? error,
  }) {
    return ContractOperationState(
      isLoading: isLoading ?? this.isLoading,
      result: result ?? this.result,
      error: error,
    );
  }
}

/// Notifier for contract create/update operations
class ContractMutationNotifier extends Notifier<ContractOperationState> {
  @override
  ContractOperationState build() => const ContractOperationState();

  ContractsService get _service => ref.read(contractsServiceProvider);

  /// Create a new contract
  Future<Contract?> createContract(CreateContractDto data) async {
    state = const ContractOperationState(isLoading: true);
    try {
      final result = await _service.createContract(data);
      state = ContractOperationState(result: result);
      _invalidateProviders();
      return result;
    } catch (e) {
      state = ContractOperationState(error: e.toString());
      return null;
    }
  }

  /// Update an existing contract
  Future<Contract?> updateContract(String id, UpdateContractDto data) async {
    state = const ContractOperationState(isLoading: true);
    try {
      final result = await _service.updateContract(id, data);
      state = ContractOperationState(result: result);
      _invalidateProviders();
      return result;
    } catch (e) {
      state = ContractOperationState(error: e.toString());
      return null;
    }
  }

  /// Submit contract for review
  Future<Contract?> submitContract(String id) async {
    state = const ContractOperationState(isLoading: true);
    try {
      final result = await _service.submitContract(id);
      state = ContractOperationState(result: result);
      _invalidateProviders();
      return result;
    } catch (e) {
      state = ContractOperationState(error: e.toString());
      return null;
    }
  }

  /// Approve contract
  Future<Contract?> approveContract(String id) async {
    state = const ContractOperationState(isLoading: true);
    try {
      final result = await _service.approveContract(id);
      state = ContractOperationState(result: result);
      _invalidateProviders();
      return result;
    } catch (e) {
      state = ContractOperationState(error: e.toString());
      return null;
    }
  }

  /// Activate contract
  Future<Contract?> activateContract(String id) async {
    state = const ContractOperationState(isLoading: true);
    try {
      final result = await _service.activateContract(id);
      state = ContractOperationState(result: result);
      _invalidateProviders();
      return result;
    } catch (e) {
      state = ContractOperationState(error: e.toString());
      return null;
    }
  }

  /// Terminate contract
  Future<Contract?> terminateContract(String id, {String? reason}) async {
    state = const ContractOperationState(isLoading: true);
    try {
      final result = await _service.terminateContract(id, reason: reason);
      state = ContractOperationState(result: result);
      _invalidateProviders();
      return result;
    } catch (e) {
      state = ContractOperationState(error: e.toString());
      return null;
    }
  }

  /// Renew contract
  Future<Contract?> renewContract(String id) async {
    state = const ContractOperationState(isLoading: true);
    try {
      final result = await _service.renewContract(id);
      state = ContractOperationState(result: result);
      _invalidateProviders();
      return result;
    } catch (e) {
      state = ContractOperationState(error: e.toString());
      return null;
    }
  }

  /// Reset the operation state
  void reset() {
    state = const ContractOperationState();
  }

  /// Invalidate related providers to refresh data
  void _invalidateProviders() {
    ref.invalidate(contractsProvider);
    ref.invalidate(contractStatsProvider);
    ref.invalidate(activeContractsProvider);
    ref.invalidate(contractsDueForRenewalProvider);
    ref.invalidate(draftContractsProvider);
  }
}

/// Provider for contract mutation operations
final contractMutationProvider = NotifierProvider<ContractMutationNotifier, ContractOperationState>(
  ContractMutationNotifier.new,
);

// ============================================================================
// SELECTED CONTRACT STATE
// ============================================================================

/// Notifier for selected contract ID
class SelectedContractIdNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String? id) => state = id;
  void clear() => state = null;
}

/// Currently selected contract ID for detail views
final selectedContractIdProvider = NotifierProvider<SelectedContractIdNotifier, String?>(
  SelectedContractIdNotifier.new,
);

/// Currently selected contract (auto-fetches when ID changes)
final selectedContractProvider =
    FutureProvider.autoDispose<Contract?>((ref) async {
  ref.watch(authModeProvider);
  final id = ref.watch(selectedContractIdProvider);
  if (id == null) return null;

  final service = ref.watch(contractsServiceProvider);
  try {
    return await service.getContract(id);
  } catch (e) {
    return null;
  }
});

// ============================================================================
// ASYNC NOTIFIERS FOR ADVANCED STATE MANAGEMENT
// ============================================================================

/// Contract list state for managing contracts with mutations
/// Provides a more reactive approach to list management
class ContractsNotifier extends AsyncNotifier<List<Contract>> {
  @override
  Future<List<Contract>> build() async {
    final service = ref.read(contractsServiceProvider);
    return service.getContracts();
  }

  /// Refresh the contracts list
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(contractsServiceProvider);
      return service.getContracts();
    });
  }

  /// Create a new contract and refresh the list
  Future<Contract> create(CreateContractDto data) async {
    final service = ref.read(contractsServiceProvider);
    final contract = await service.createContract(data);
    await refresh();
    return contract;
  }

  /// Update a contract and refresh the list
  Future<Contract> updateContract(String id, UpdateContractDto data) async {
    final service = ref.read(contractsServiceProvider);
    final contract = await service.updateContract(id, data);
    await refresh();
    return contract;
  }

  /// Submit a contract for review and refresh the list
  Future<Contract> submitForReview(String id) async {
    final service = ref.read(contractsServiceProvider);
    final contract = await service.submitContract(id);
    await refresh();
    return contract;
  }

  /// Approve a contract and refresh the list
  Future<Contract> approve(String id) async {
    final service = ref.read(contractsServiceProvider);
    final contract = await service.approveContract(id);
    await refresh();
    return contract;
  }

  /// Activate a contract and refresh the list
  Future<Contract> activate(String id) async {
    final service = ref.read(contractsServiceProvider);
    final contract = await service.activateContract(id);
    await refresh();
    return contract;
  }

  /// Terminate a contract and refresh the list
  Future<Contract> terminate(String id, {String? reason}) async {
    final service = ref.read(contractsServiceProvider);
    final contract = await service.terminateContract(id, reason: reason);
    await refresh();
    return contract;
  }

  /// Renew a contract and refresh the list
  Future<Contract> renew(String id) async {
    final service = ref.read(contractsServiceProvider);
    final contract = await service.renewContract(id);
    await refresh();
    return contract;
  }
}

/// Contracts list notifier provider
final contractsNotifierProvider =
    AsyncNotifierProvider<ContractsNotifier, List<Contract>>(
        ContractsNotifier.new);

