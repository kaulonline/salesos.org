// ignore_for_file: constant_identifier_names
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/providers.dart';
import '../../../core/services/crm_data_service.dart';

/// Contract status enum - UPPERCASE to match web conventions
enum ContractStatus {
  DRAFT,
  PENDING,
  ACTIVE,
  EXPIRED,
  TERMINATED,
}

extension ContractStatusExtension on ContractStatus {
  String get label {
    switch (this) {
      case ContractStatus.DRAFT:
        return 'Draft';
      case ContractStatus.PENDING:
        return 'Pending';
      case ContractStatus.ACTIVE:
        return 'Active';
      case ContractStatus.EXPIRED:
        return 'Expired';
      case ContractStatus.TERMINATED:
        return 'Terminated';
    }
  }

  /// Web-compatible status string for toJson
  String get webValue {
    switch (this) {
      case ContractStatus.DRAFT:
        return 'DRAFT';
      case ContractStatus.PENDING:
        return 'PENDING';
      case ContractStatus.ACTIVE:
        return 'ACTIVE';
      case ContractStatus.EXPIRED:
        return 'EXPIRED';
      case ContractStatus.TERMINATED:
        return 'TERMINATED';
    }
  }

  static ContractStatus fromString(String? status) {
    if (status == null) return ContractStatus.DRAFT;
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return ContractStatus.DRAFT;
      case 'PENDING':
      case 'IN APPROVAL PROCESS':
      case 'IN_APPROVAL_PROCESS':
        return ContractStatus.PENDING;
      case 'ACTIVE':
      case 'ACTIVATED':
        return ContractStatus.ACTIVE;
      case 'EXPIRED':
        return ContractStatus.EXPIRED;
      case 'TERMINATED':
      case 'CANCELLED':
        return ContractStatus.TERMINATED;
      default:
        return ContractStatus.DRAFT;
    }
  }
}

/// Contract model
class ContractModel {
  final String id;
  final String contractNumber;
  final String? name;
  final String? accountId;
  final String? accountName;
  final ContractStatus status;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? renewalDate;
  final double? value;
  final String? paymentTerms;
  final String? terms;
  final String? description;
  final String? opportunityId;
  final String? opportunityName;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ContractModel({
    required this.id,
    required this.contractNumber,
    this.name,
    this.accountId,
    this.accountName,
    required this.status,
    this.startDate,
    this.endDate,
    this.renewalDate,
    this.value,
    this.paymentTerms,
    this.terms,
    this.description,
    this.opportunityId,
    this.opportunityName,
    this.createdAt,
    this.updatedAt,
  });

  factory ContractModel.fromMap(Map<String, dynamic> map) {
    // Parse dates
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      if (value is String) return DateTime.tryParse(value);
      return null;
    }

    // Parse value
    double? parseValue(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    }

    // Get account name - support various field names
    String? accountName = map['accountName'] as String? ??
        map['AccountName'] as String? ??
        (map['account'] as Map<String, dynamic>?)?['name'] as String? ??
        (map['Account'] as Map<String, dynamic>?)?['Name'] as String?;

    // Get opportunity name
    String? opportunityName = map['opportunityName'] as String? ??
        (map['opportunity'] as Map<String, dynamic>?)?['name'] as String? ??
        (map['Opportunity'] as Map<String, dynamic>?)?['Name'] as String?;

    return ContractModel(
      id: map['id'] as String? ?? map['Id'] as String? ?? '',
      contractNumber: map['contractNumber'] as String? ??
          map['ContractNumber'] as String? ??
          map['contract_number'] as String? ??
          'N/A',
      name: map['name'] as String? ?? map['Name'] as String?,
      accountId: map['accountId'] as String? ?? map['AccountId'] as String?,
      accountName: accountName,
      status: ContractStatusExtension.fromString(
          map['status'] as String? ?? map['Status'] as String?),
      startDate: parseDate(map['startDate'] ?? map['StartDate']),
      endDate: parseDate(map['endDate'] ?? map['EndDate'] ?? map['ContractTerm']),
      renewalDate: parseDate(map['renewalDate'] ?? map['RenewalDate']),
      value: parseValue(map['value'] ?? map['Value'] ?? map['contractValue']),
      paymentTerms:
          map['paymentTerms'] as String? ?? map['PaymentTerms'] as String?,
      terms: map['terms'] as String? ?? map['SpecialTerms'] as String?,
      description:
          map['description'] as String? ?? map['Description'] as String?,
      opportunityId:
          map['opportunityId'] as String? ?? map['OpportunityId'] as String?,
      opportunityName: opportunityName,
      createdAt: parseDate(map['createdAt'] ?? map['CreatedDate']),
      updatedAt: parseDate(map['updatedAt'] ?? map['LastModifiedDate']),
    );
  }

  /// toJson emitting web-compatible field names
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'contractNumber': contractNumber,
      'name': name,
      'accountId': accountId,
      'accountName': accountName,
      'status': status.webValue,
      'startDate': startDate?.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'renewalDate': renewalDate?.toIso8601String(),
      'value': value,
      'paymentTerms': paymentTerms,
      'terms': terms,
      'description': description,
      'opportunityId': opportunityId,
      'opportunityName': opportunityName,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  /// Check if contract is expiring soon (within 30 days)
  bool get isExpiringSoon {
    if (endDate == null) return false;
    final daysUntilExpiry = endDate!.difference(DateTime.now()).inDays;
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }

  /// Get days until expiration
  int? get daysUntilExpiry {
    if (endDate == null) return null;
    return endDate!.difference(DateTime.now()).inDays;
  }
}

/// Contracts service provider
final contractsServiceProvider = Provider<ContractsService>((ref) {
  final crmService = ref.watch(crmDataServiceProvider);
  return ContractsService(crmService);
});

/// Contracts service for fetching contract data
class ContractsService {
  final CrmDataService _crmService;

  ContractsService(this._crmService);

  /// Get all contracts
  Future<List<ContractModel>> getContracts({ContractStatus? status}) async {
    try {
      // Fetch from backend API
      final contractsData = await _crmService.getContracts();

      var contracts = contractsData
          .map((data) => ContractModel.fromMap(data))
          .toList();

      if (status != null) {
        contracts = contracts.where((c) => c.status == status).toList();
      }

      return contracts;
    } catch (e) {
      // Return empty list on error - UI will show appropriate state
      if (kDebugMode) {
        debugPrint('ContractsService.getContracts error: $e');
      }
      return [];
    }
  }

  /// Get contract by ID
  Future<ContractModel?> getContractById(String id) async {
    try {
      // Fetch from backend API
      final contractData = await _crmService.getContractById(id);
      if (contractData == null) return null;
      return ContractModel.fromMap(contractData);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('ContractsService.getContractById error: $e');
      }
      return null;
    }
  }

  /// Search contracts
  Future<List<ContractModel>> searchContracts(String query) async {
    if (query.isEmpty) return getContracts();

    final contracts = await getContracts();
    final lowerQuery = query.toLowerCase();

    return contracts.where((contract) {
      return contract.contractNumber.toLowerCase().contains(lowerQuery) ||
          (contract.name?.toLowerCase().contains(lowerQuery) ?? false) ||
          (contract.accountName?.toLowerCase().contains(lowerQuery) ?? false);
    }).toList();
  }

  /// Get contract summary stats
  Future<Map<String, int>> getContractStats() async {
    final contracts = await getContracts();
    return {
      'total': contracts.length,
      'active': contracts.where((c) => c.status == ContractStatus.ACTIVE).length,
      'pending': contracts.where((c) => c.status == ContractStatus.PENDING).length,
      'draft': contracts.where((c) => c.status == ContractStatus.DRAFT).length,
      'expired': contracts.where((c) => c.status == ContractStatus.EXPIRED).length,
      'expiringSoon': contracts.where((c) => c.isExpiringSoon).length,
    };
  }
}

/// Contracts list provider
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final contractsProvider =
    FutureProvider.autoDispose<List<ContractModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts();
});

/// Contracts by status provider
final contractsByStatusProvider = FutureProvider.autoDispose
    .family<List<ContractModel>, ContractStatus?>((ref, status) async {
  final service = ref.watch(contractsServiceProvider);
  return service.getContracts(status: status);
});

/// Contract detail provider
final contractDetailProvider =
    FutureProvider.autoDispose.family<ContractModel?, String>((ref, id) async {
  final service = ref.watch(contractsServiceProvider);
  return service.getContractById(id);
});

/// Contract stats provider
final contractStatsProvider =
    FutureProvider.autoDispose<Map<String, int>>((ref) async {
  final service = ref.watch(contractsServiceProvider);
  return service.getContractStats();
});
