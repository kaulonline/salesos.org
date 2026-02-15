// ignore_for_file: constant_identifier_names
// Contract models for IRIS mobile app.
// Matches the backend Contract entity and DTOs.

/// Contract status enum matching backend ContractStatus - UPPERCASE for web convention
enum ContractStatus {
  DRAFT('DRAFT'),
  IN_REVIEW('IN_REVIEW'),
  APPROVED('APPROVED'),
  ACTIVATED('ACTIVATED'),
  EXPIRED('EXPIRED'),
  TERMINATED('TERMINATED');

  const ContractStatus(this.value);
  final String value;

  static ContractStatus fromString(String? value) {
    if (value == null) return ContractStatus.DRAFT;
    final upper = value.toUpperCase();
    return ContractStatus.values.firstWhere(
      (status) => status.value == upper || status.name == upper,
      orElse: () {
        // Fallback mappings for old mobile values
        switch (upper) {
          case 'DRAFT':
            return ContractStatus.DRAFT;
          case 'IN_REVIEW':
          case 'INREVIEW':
          case 'PENDING':
            return ContractStatus.IN_REVIEW;
          case 'APPROVED':
            return ContractStatus.APPROVED;
          case 'ACTIVATED':
          case 'ACTIVE':
            return ContractStatus.ACTIVATED;
          case 'EXPIRED':
            return ContractStatus.EXPIRED;
          case 'TERMINATED':
          case 'CANCELLED':
            return ContractStatus.TERMINATED;
          default:
            return ContractStatus.DRAFT;
        }
      },
    );
  }

  String get displayName {
    switch (this) {
      case ContractStatus.DRAFT:
        return 'Draft';
      case ContractStatus.IN_REVIEW:
        return 'In Review';
      case ContractStatus.APPROVED:
        return 'Approved';
      case ContractStatus.ACTIVATED:
        return 'Activated';
      case ContractStatus.EXPIRED:
        return 'Expired';
      case ContractStatus.TERMINATED:
        return 'Terminated';
    }
  }

  bool get isEditable => this == ContractStatus.DRAFT;
  bool get canSubmit => this == ContractStatus.DRAFT;
  bool get canApprove => this == ContractStatus.IN_REVIEW;
  bool get canActivate => this == ContractStatus.APPROVED;
  bool get canTerminate => this == ContractStatus.ACTIVATED;
  bool get canRenew => this == ContractStatus.ACTIVATED;
}

/// Related account summary
class ContractAccount {
  final String id;
  final String name;

  const ContractAccount({
    required this.id,
    required this.name,
  });

  factory ContractAccount.fromJson(Map<String, dynamic> json) {
    return ContractAccount(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
  };
}

/// Related quote summary
class ContractQuote {
  final String id;
  final String? quoteNumber;
  final double? totalAmount;

  const ContractQuote({
    required this.id,
    this.quoteNumber,
    this.totalAmount,
  });

  factory ContractQuote.fromJson(Map<String, dynamic> json) {
    return ContractQuote(
      id: json['id'] as String? ?? '',
      quoteNumber: json['quoteNumber'] as String?,
      totalAmount: (json['totalAmount'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'quoteNumber': quoteNumber,
    'totalAmount': totalAmount,
  };
}

/// Contract owner summary
class ContractOwner {
  final String id;
  final String? name;
  final String? email;

  const ContractOwner({
    required this.id,
    this.name,
    this.email,
  });

  factory ContractOwner.fromJson(Map<String, dynamic> json) {
    return ContractOwner(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
      email: json['email'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
  };
}

/// Contract model matching backend Contract entity
class Contract {
  final String id;
  final String accountId;
  final String? quoteId;
  final String ownerId;
  final String contractNumber;
  final String contractName;
  final ContractStatus status;

  // Terms
  final DateTime? startDate;
  final DateTime? endDate;
  final int? contractTerm; // months

  // Financial
  final double? contractValue;
  final String? billingFrequency; // Monthly, Quarterly, Annually

  // Renewal
  final bool autoRenew;
  final DateTime? renewalDate;
  final DateTime? renewalNoticeDate;
  final bool renewalReminder;

  // Status dates
  final DateTime? signedDate;
  final DateTime? activatedDate;
  final DateTime? terminatedDate;
  final String? terminationReason;

  // Content
  final String? description;
  final String? specialTerms;

  // Metadata
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Related entities
  final ContractAccount? account;
  final ContractQuote? quote;
  final ContractOwner? owner;

  const Contract({
    required this.id,
    required this.accountId,
    this.quoteId,
    required this.ownerId,
    required this.contractNumber,
    required this.contractName,
    required this.status,
    this.startDate,
    this.endDate,
    this.contractTerm,
    this.contractValue,
    this.billingFrequency,
    this.autoRenew = false,
    this.renewalDate,
    this.renewalNoticeDate,
    this.renewalReminder = false,
    this.signedDate,
    this.activatedDate,
    this.terminatedDate,
    this.terminationReason,
    this.description,
    this.specialTerms,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
    this.account,
    this.quote,
    this.owner,
  });

  factory Contract.fromJson(Map<String, dynamic> json) {
    return Contract(
      id: json['id'] as String? ?? '',
      accountId: json['accountId'] as String? ?? '',
      quoteId: json['quoteId'] as String?,
      ownerId: json['ownerId'] as String? ?? '',
      contractNumber: json['contractNumber'] as String? ?? '',
      contractName: json['contractName'] as String? ?? '',
      status: ContractStatus.fromString(json['status'] as String?),
      startDate: json['startDate'] != null
          ? DateTime.tryParse(json['startDate'] as String)
          : null,
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'] as String)
          : null,
      contractTerm: json['contractTerm'] as int?,
      contractValue: (json['contractValue'] as num?)?.toDouble(),
      billingFrequency: json['billingFrequency'] as String?,
      autoRenew: json['autoRenew'] as bool? ?? false,
      renewalDate: json['renewalDate'] != null
          ? DateTime.tryParse(json['renewalDate'] as String)
          : null,
      renewalNoticeDate: json['renewalNoticeDate'] != null
          ? DateTime.tryParse(json['renewalNoticeDate'] as String)
          : null,
      renewalReminder: json['renewalReminder'] as bool? ?? false,
      signedDate: json['signedDate'] != null
          ? DateTime.tryParse(json['signedDate'] as String)
          : null,
      activatedDate: json['activatedDate'] != null
          ? DateTime.tryParse(json['activatedDate'] as String)
          : null,
      terminatedDate: json['terminatedDate'] != null
          ? DateTime.tryParse(json['terminatedDate'] as String)
          : null,
      terminationReason: json['terminationReason'] as String?,
      description: json['description'] as String?,
      specialTerms: json['specialTerms'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      account: json['account'] != null
          ? ContractAccount.fromJson(json['account'] as Map<String, dynamic>)
          : null,
      quote: json['quote'] != null
          ? ContractQuote.fromJson(json['quote'] as Map<String, dynamic>)
          : null,
      owner: json['owner'] != null
          ? ContractOwner.fromJson(json['owner'] as Map<String, dynamic>)
          : null,
    );
  }

  /// Factory constructor for Salesforce Contract JSON
  /// Maps Salesforce field names (PascalCase) to model fields
  factory Contract.fromSalesforceJson(Map<String, dynamic> json) {
    // Extract nested Account name
    final accountData = json['Account'] as Map<String, dynamic>?;

    // Map Salesforce Status to our ContractStatus
    ContractStatus mapSalesforceStatus(String? sfStatus) {
      switch (sfStatus?.toUpperCase()) {
        case 'DRAFT':
          return ContractStatus.DRAFT;
        case 'IN APPROVAL PROCESS':
        case 'PENDING':
          return ContractStatus.IN_REVIEW;
        case 'ACTIVATED':
        case 'ACTIVE':
          return ContractStatus.ACTIVATED;
        case 'TERMINATED':
        case 'CANCELLED':
          return ContractStatus.TERMINATED;
        case 'EXPIRED':
          return ContractStatus.EXPIRED;
        default:
          return ContractStatus.DRAFT;
      }
    }

    return Contract(
      id: json['Id'] as String? ?? '',
      accountId: json['AccountId'] as String? ?? '',
      quoteId: json['Quote__c'] as String?,
      ownerId: json['OwnerId'] as String? ?? '',
      contractNumber: json['ContractNumber'] as String? ?? '',
      contractName: json['Name'] as String? ?? json['ContractNumber'] as String? ?? '',
      status: mapSalesforceStatus(json['Status'] as String?),
      startDate: _parseDateTimeValue(json['StartDate']),
      endDate: _parseDateTimeValue(json['EndDate']),
      contractTerm: json['ContractTerm'] as int?,
      contractValue: (json['TotalContractValue__c'] as num?)?.toDouble() ??
          (json['Amount__c'] as num?)?.toDouble(),
      billingFrequency: json['BillingFrequency__c'] as String?,
      autoRenew: json['AutoRenew__c'] as bool? ?? false,
      renewalDate: _parseDateTimeValue(json['EndDate']), // Salesforce uses EndDate for renewal
      signedDate: _parseDateTimeValue(json['ActivatedDate']),
      activatedDate: _parseDateTimeValue(json['ActivatedDate']),
      description: json['Description'] as String?,
      specialTerms: json['SpecialTerms'] as String?,
      createdAt: _parseDateTimeValue(json['CreatedDate']) ?? DateTime.now(),
      updatedAt: _parseDateTimeValue(json['LastModifiedDate']) ?? DateTime.now(),
      account: accountData != null
          ? ContractAccount(
              id: json['AccountId'] as String? ?? '',
              name: accountData['Name'] as String? ?? '',
            )
          : null,
    );
  }

  static DateTime? _parseDateTimeValue(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'accountId': accountId,
    'quoteId': quoteId,
    'ownerId': ownerId,
    'contractNumber': contractNumber,
    'contractName': contractName,
    'status': status.value,
    'startDate': startDate?.toIso8601String(),
    'endDate': endDate?.toIso8601String(),
    'contractTerm': contractTerm,
    'contractValue': contractValue,
    'billingFrequency': billingFrequency,
    'autoRenew': autoRenew,
    'renewalDate': renewalDate?.toIso8601String(),
    'renewalNoticeDate': renewalNoticeDate?.toIso8601String(),
    'renewalReminder': renewalReminder,
    'signedDate': signedDate?.toIso8601String(),
    'activatedDate': activatedDate?.toIso8601String(),
    'terminatedDate': terminatedDate?.toIso8601String(),
    'terminationReason': terminationReason,
    'description': description,
    'specialTerms': specialTerms,
    'metadata': metadata,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'account': account?.toJson(),
    'quote': quote?.toJson(),
    'owner': owner?.toJson(),
  };

  Contract copyWith({
    String? id,
    String? accountId,
    String? quoteId,
    String? ownerId,
    String? contractNumber,
    String? contractName,
    ContractStatus? status,
    DateTime? startDate,
    DateTime? endDate,
    int? contractTerm,
    double? contractValue,
    String? billingFrequency,
    bool? autoRenew,
    DateTime? renewalDate,
    DateTime? renewalNoticeDate,
    bool? renewalReminder,
    DateTime? signedDate,
    DateTime? activatedDate,
    DateTime? terminatedDate,
    String? terminationReason,
    String? description,
    String? specialTerms,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
    ContractAccount? account,
    ContractQuote? quote,
    ContractOwner? owner,
  }) {
    return Contract(
      id: id ?? this.id,
      accountId: accountId ?? this.accountId,
      quoteId: quoteId ?? this.quoteId,
      ownerId: ownerId ?? this.ownerId,
      contractNumber: contractNumber ?? this.contractNumber,
      contractName: contractName ?? this.contractName,
      status: status ?? this.status,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      contractTerm: contractTerm ?? this.contractTerm,
      contractValue: contractValue ?? this.contractValue,
      billingFrequency: billingFrequency ?? this.billingFrequency,
      autoRenew: autoRenew ?? this.autoRenew,
      renewalDate: renewalDate ?? this.renewalDate,
      renewalNoticeDate: renewalNoticeDate ?? this.renewalNoticeDate,
      renewalReminder: renewalReminder ?? this.renewalReminder,
      signedDate: signedDate ?? this.signedDate,
      activatedDate: activatedDate ?? this.activatedDate,
      terminatedDate: terminatedDate ?? this.terminatedDate,
      terminationReason: terminationReason ?? this.terminationReason,
      description: description ?? this.description,
      specialTerms: specialTerms ?? this.specialTerms,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      account: account ?? this.account,
      quote: quote ?? this.quote,
      owner: owner ?? this.owner,
    );
  }

  /// Check if contract is due for renewal within the specified days
  bool isDueForRenewal({int withinDays = 60}) {
    if (status != ContractStatus.ACTIVATED || renewalDate == null) {
      return false;
    }
    final daysUntilRenewal = renewalDate!.difference(DateTime.now()).inDays;
    return daysUntilRenewal >= 0 && daysUntilRenewal <= withinDays;
  }

  /// Get the remaining days until renewal
  int? get daysUntilRenewal {
    if (renewalDate == null) return null;
    return renewalDate!.difference(DateTime.now()).inDays;
  }

  /// Get contract duration in days
  int? get durationDays {
    if (startDate == null || endDate == null) return null;
    return endDate!.difference(startDate!).inDays;
  }
}

/// DTO for creating a new contract
class CreateContractDto {
  final String accountId;
  final String? quoteId;
  final String contractName;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? contractTerm;
  final double? contractValue;
  final String? billingFrequency;
  final bool? autoRenew;
  final String? description;
  final String? specialTerms;

  const CreateContractDto({
    required this.accountId,
    this.quoteId,
    required this.contractName,
    this.startDate,
    this.endDate,
    this.contractTerm,
    this.contractValue,
    this.billingFrequency,
    this.autoRenew,
    this.description,
    this.specialTerms,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'accountId': accountId,
      'contractName': contractName,
    };

    if (quoteId != null) json['quoteId'] = quoteId;
    if (startDate != null) json['startDate'] = startDate!.toIso8601String();
    if (endDate != null) json['endDate'] = endDate!.toIso8601String();
    if (contractTerm != null) json['contractTerm'] = contractTerm;
    if (contractValue != null) json['contractValue'] = contractValue;
    if (billingFrequency != null) json['billingFrequency'] = billingFrequency;
    if (autoRenew != null) json['autoRenew'] = autoRenew;
    if (description != null) json['description'] = description;
    if (specialTerms != null) json['specialTerms'] = specialTerms;

    return json;
  }
}

/// DTO for updating an existing contract
class UpdateContractDto {
  final String? contractName;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? contractTerm;
  final double? contractValue;
  final String? billingFrequency;
  final bool? autoRenew;
  final String? description;
  final String? specialTerms;

  const UpdateContractDto({
    this.contractName,
    this.startDate,
    this.endDate,
    this.contractTerm,
    this.contractValue,
    this.billingFrequency,
    this.autoRenew,
    this.description,
    this.specialTerms,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};

    if (contractName != null) json['contractName'] = contractName;
    if (startDate != null) json['startDate'] = startDate!.toIso8601String();
    if (endDate != null) json['endDate'] = endDate!.toIso8601String();
    if (contractTerm != null) json['contractTerm'] = contractTerm;
    if (contractValue != null) json['contractValue'] = contractValue;
    if (billingFrequency != null) json['billingFrequency'] = billingFrequency;
    if (autoRenew != null) json['autoRenew'] = autoRenew;
    if (description != null) json['description'] = description;
    if (specialTerms != null) json['specialTerms'] = specialTerms;

    return json;
  }
}

/// Contract statistics from the API
class ContractStats {
  final int total;
  final Map<ContractStatus, int> byStatus;
  final double totalValue;
  final double activeValue;
  final int renewalsDueNext30Days;

  const ContractStats({
    required this.total,
    required this.byStatus,
    required this.totalValue,
    required this.activeValue,
    required this.renewalsDueNext30Days,
  });

  factory ContractStats.fromJson(Map<String, dynamic> json) {
    // Parse byStatus from list of {status, _count} objects
    final byStatusList = json['byStatus'] as List<dynamic>? ?? [];
    final byStatusMap = <ContractStatus, int>{};
    for (final item in byStatusList) {
      if (item is Map<String, dynamic>) {
        final status = ContractStatus.fromString(item['status'] as String?);
        final count = item['_count'] as int? ?? 0;
        byStatusMap[status] = count;
      }
    }

    return ContractStats(
      total: json['total'] as int? ?? 0,
      byStatus: byStatusMap,
      totalValue: (json['totalValue'] as num?)?.toDouble() ?? 0.0,
      activeValue: (json['activeValue'] as num?)?.toDouble() ?? 0.0,
      renewalsDueNext30Days: json['renewalsDueNext30Days'] as int? ?? 0,
    );
  }

  /// Get count for a specific status
  int countForStatus(ContractStatus status) => byStatus[status] ?? 0;

  /// Get active contracts count
  int get activeCount => countForStatus(ContractStatus.ACTIVATED);

  /// Get draft contracts count
  int get draftCount => countForStatus(ContractStatus.DRAFT);

  /// Get contracts in review count
  int get inReviewCount => countForStatus(ContractStatus.IN_REVIEW);
}

/// Contract list filter options
class ContractFilters {
  final ContractStatus? status;
  final String? accountId;
  final bool? renewalDue;

  const ContractFilters({
    this.status,
    this.accountId,
    this.renewalDue,
  });

  Map<String, String> toQueryParameters() {
    final params = <String, String>{};
    if (status != null) params['status'] = status!.value;
    if (accountId != null) params['accountId'] = accountId!;
    if (renewalDue != null) params['renewalDue'] = renewalDue.toString();
    return params;
  }
}
