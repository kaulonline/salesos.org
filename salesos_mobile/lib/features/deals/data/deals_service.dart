// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/crm_data_service.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Deal stage enum - maps to SalesOS backend OpportunityStage
/// All 10 stages from web TypeScript type
enum DealStage {
  PROSPECTING('Prospecting', 'PROSPECTING'),
  QUALIFICATION('Qualification', 'QUALIFICATION'),
  NEEDS_ANALYSIS('Needs Analysis', 'NEEDS_ANALYSIS'),
  VALUE_PROPOSITION('Value Proposition', 'VALUE_PROPOSITION'),
  DECISION_MAKERS_IDENTIFIED('Decision Makers Identified', 'DECISION_MAKERS_IDENTIFIED'),
  PERCEPTION_ANALYSIS('Perception Analysis', 'PERCEPTION_ANALYSIS'),
  PROPOSAL_PRICE_QUOTE('Proposal/Price Quote', 'PROPOSAL_PRICE_QUOTE'),
  NEGOTIATION_REVIEW('Negotiation/Review', 'NEGOTIATION_REVIEW'),
  CLOSED_WON('Closed Won', 'CLOSED_WON'),
  CLOSED_LOST('Closed Lost', 'CLOSED_LOST');

  final String label;
  final String backendValue;
  const DealStage(this.label, this.backendValue);

  static DealStage fromString(String? stage) {
    if (stage == null) return DealStage.QUALIFICATION;
    final upper = stage.toUpperCase().replaceAll(' ', '_').replaceAll('/', '_').replaceAll('-', '_');
    switch (upper) {
      case 'PROSPECTING':
        return DealStage.PROSPECTING;
      case 'QUALIFICATION':
        return DealStage.QUALIFICATION;
      case 'NEEDS_ANALYSIS':
        return DealStage.NEEDS_ANALYSIS;
      case 'VALUE_PROPOSITION':
        return DealStage.VALUE_PROPOSITION;
      case 'DECISION_MAKERS_IDENTIFIED':
        return DealStage.DECISION_MAKERS_IDENTIFIED;
      case 'PERCEPTION_ANALYSIS':
        return DealStage.PERCEPTION_ANALYSIS;
      case 'PROPOSAL_PRICE_QUOTE':
      case 'PROPOSAL':
        return DealStage.PROPOSAL_PRICE_QUOTE;
      case 'NEGOTIATION_REVIEW':
      case 'NEGOTIATION':
        return DealStage.NEGOTIATION_REVIEW;
      case 'CLOSED_WON':
        return DealStage.CLOSED_WON;
      case 'CLOSED_LOST':
        return DealStage.CLOSED_LOST;
      default:
        break;
    }
    // Fallback: normalize removing all separators for old mobile values
    final normalized = stage.toLowerCase().replaceAll(' ', '').replaceAll('-', '').replaceAll('_', '');
    switch (normalized) {
      case 'prospecting':
        return DealStage.PROSPECTING;
      case 'qualified':
      case 'qualification':
        return DealStage.QUALIFICATION;
      case 'needsanalysis':
        return DealStage.NEEDS_ANALYSIS;
      case 'valueproposition':
        return DealStage.VALUE_PROPOSITION;
      case 'decisionmakersidentified':
      case 'iddecisionmakers':
        return DealStage.DECISION_MAKERS_IDENTIFIED;
      case 'perceptionanalysis':
        return DealStage.PERCEPTION_ANALYSIS;
      case 'proposal':
      case 'proposalsent':
      case 'proposalpricequote':
        return DealStage.PROPOSAL_PRICE_QUOTE;
      case 'negotiation':
      case 'negotiating':
      case 'negotiationreview':
        return DealStage.NEGOTIATION_REVIEW;
      case 'closedwon':
      case 'won':
        return DealStage.CLOSED_WON;
      case 'closedlost':
      case 'lost':
        return DealStage.CLOSED_LOST;
      default:
        return DealStage.QUALIFICATION;
    }
  }
}

/// Opportunity source enum - maps to SalesOS backend OpportunitySource
enum OpportunitySource {
  EXISTING_CUSTOMER('Existing Customer', 'EXISTING_CUSTOMER'),
  NEW_CUSTOMER('New Customer', 'NEW_CUSTOMER'),
  PARTNER('Partner', 'PARTNER'),
  EMPLOYEE_REFERRAL('Employee Referral', 'EMPLOYEE_REFERRAL'),
  EXTERNAL_REFERRAL('External Referral', 'EXTERNAL_REFERRAL'),
  ADVERTISEMENT('Advertisement', 'ADVERTISEMENT'),
  TRADE_SHOW('Trade Show', 'TRADE_SHOW'),
  WEB('Web', 'WEB'),
  WORD_OF_MOUTH('Word of Mouth', 'WORD_OF_MOUTH'),
  OTHER('Other', 'OTHER');

  final String label;
  final String backendValue;
  const OpportunitySource(this.label, this.backendValue);

  static OpportunitySource? fromString(String? source) {
    if (source == null || source.isEmpty) return null;
    final upper = source.toUpperCase().replaceAll(' ', '_').replaceAll('-', '_');
    for (final v in OpportunitySource.values) {
      if (v.backendValue == upper) return v;
    }
    // Fallback mappings for old mobile / Salesforce values
    final normalized = source.toLowerCase().replaceAll(' ', '').replaceAll('_', '');
    switch (normalized) {
      case 'existingcustomer':
        return OpportunitySource.EXISTING_CUSTOMER;
      case 'newcustomer':
        return OpportunitySource.NEW_CUSTOMER;
      case 'partner':
      case 'partnerreferral':
        return OpportunitySource.PARTNER;
      case 'employeereferral':
        return OpportunitySource.EMPLOYEE_REFERRAL;
      case 'externalreferral':
        return OpportunitySource.EXTERNAL_REFERRAL;
      case 'advertisement':
        return OpportunitySource.ADVERTISEMENT;
      case 'tradeshow':
        return OpportunitySource.TRADE_SHOW;
      case 'web':
      case 'phoneinquiry':
        return OpportunitySource.WEB;
      case 'wordofmouth':
        return OpportunitySource.WORD_OF_MOUTH;
      case 'purchasedlist':
      case 'other':
        return OpportunitySource.OTHER;
      default:
        return OpportunitySource.OTHER;
    }
  }
}

/// Opportunity type enum - maps to SalesOS backend OpportunityType
enum OpportunityType {
  NEW_BUSINESS('New Business', 'NEW_BUSINESS'),
  EXISTING_BUSINESS('Existing Business', 'EXISTING_BUSINESS'),
  UPSELL('Upsell', 'UPSELL'),
  CROSS_SELL('Cross Sell', 'CROSS_SELL'),
  RENEWAL('Renewal', 'RENEWAL');

  final String label;
  final String backendValue;
  const OpportunityType(this.label, this.backendValue);

  static OpportunityType? fromString(String? type) {
    if (type == null || type.isEmpty) return null;
    final upper = type.toUpperCase().replaceAll(' ', '_').replaceAll('-', '_');
    for (final v in OpportunityType.values) {
      if (v.backendValue == upper) return v;
    }
    // Fallback mappings for old mobile values
    final normalized = type.toLowerCase().replaceAll(' ', '').replaceAll('_', '');
    switch (normalized) {
      case 'newbusiness':
        return OpportunityType.NEW_BUSINESS;
      case 'existingbusiness':
        return OpportunityType.EXISTING_BUSINESS;
      case 'upsell':
        return OpportunityType.UPSELL;
      case 'crosssell':
        return OpportunityType.CROSS_SELL;
      case 'renewal':
        return OpportunityType.RENEWAL;
      default:
        return null;
    }
  }
}

/// Deal model - aligned with web Opportunity TypeScript interface
class DealModel {
  final String id;
  final String name;

  // IDs for relationships
  final String accountId;
  final String ownerId;
  final String? contactId;
  final String? campaignId;
  final String? pipelineId;
  final String? stageId;

  // Kept for display convenience (backward compat)
  final String? accountName;
  final String? contactName;

  // Core fields
  final double amount;
  final DealStage stage;
  final int probability;
  final String? description;
  final OpportunitySource? opportunitySource;
  final OpportunityType? type;

  // Financial
  final double? expectedRevenue;
  final double? discount;

  // Dates
  final DateTime? closeDate;
  final DateTime? lastActivityDate;
  final DateTime? nextActivityDate;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // Analysis & AI fields
  final String? needsAnalysis;
  final String? proposedSolution;
  final List<String>? competitors;
  final String? nextStep;
  final double? winProbability;
  final List<String>? riskFactors;
  final List<String>? recommendedActions;
  final double? dealVelocity;

  // Close status
  final bool isClosed;
  final bool isWon;
  final String? lostReason;
  final DateTime? closedDate;

  // Nested relationships
  final Map<String, dynamic>? account;
  final Map<String, dynamic>? owner;
  final List<Map<String, dynamic>>? contacts;

  DealModel({
    required this.id,
    required this.name,
    this.accountId = '',
    this.ownerId = '',
    this.contactId,
    this.campaignId,
    this.pipelineId,
    this.stageId,
    this.accountName,
    this.contactName,
    required this.amount,
    required this.stage,
    this.probability = 50,
    this.description,
    this.opportunitySource,
    this.type,
    this.expectedRevenue,
    this.discount,
    this.closeDate,
    this.lastActivityDate,
    this.nextActivityDate,
    required this.createdAt,
    this.updatedAt,
    this.needsAnalysis,
    this.proposedSolution,
    this.competitors,
    this.nextStep,
    this.winProbability,
    this.riskFactors,
    this.recommendedActions,
    this.dealVelocity,
    this.isClosed = false,
    this.isWon = false,
    this.lostReason,
    this.closedDate,
    this.account,
    this.owner,
    this.contacts,
  });

  factory DealModel.fromJson(Map<String, dynamic> json) {
    // Support both web API and Salesforce field names with backward compat
    final id = json['id'] as String? ?? json['Id'] as String? ?? '';
    final name = json['name'] as String? ?? json['Name'] as String? ?? 'Untitled Deal';

    // Relationship IDs
    final accountId = json['accountId'] as String? ?? json['AccountId'] as String? ?? '';
    final ownerId = json['ownerId'] as String? ?? json['OwnerId'] as String? ?? '';
    final contactId = json['contactId'] as String? ?? json['ContactId'] as String?;
    final campaignId = json['campaignId'] as String? ?? json['CampaignId'] as String?;
    final pipelineId = json['pipelineId'] as String?;
    final stageId = json['stageId'] as String?;

    // Display names (backward compat: try nested objects if flat name missing)
    final accountName = json['accountName'] as String? ??
        (json['account'] as Map<String, dynamic>?)?['name'] as String? ??
        (json['Account'] as Map<String, dynamic>?)?['Name'] as String?;
    final contactName = json['contactName'] as String? ??
        (json['contact'] as Map<String, dynamic>?)?['name'] as String? ??
        (json['Contact'] as Map<String, dynamic>?)?['Name'] as String?;

    // Core fields
    final amount = (json['amount'] as num?)?.toDouble() ??
        (json['Amount'] as num?)?.toDouble() ?? 0;
    final stage = json['stage'] as String? ?? json['StageName'] as String?;
    final probability = json['probability'] as int? ??
        (json['Probability'] as num?)?.toInt() ?? 50;
    final description = json['description'] as String? ?? json['Description'] as String?;

    // Enums
    final opportunitySource = OpportunitySource.fromString(
      json['opportunitySource'] as String? ?? json['leadSource'] as String? ?? json['LeadSource'] as String?,
    );
    final opportunityType = OpportunityType.fromString(
      json['type'] as String? ?? json['Type'] as String?,
    );

    // Financial
    final expectedRevenue = (json['expectedRevenue'] as num?)?.toDouble() ??
        (json['ExpectedRevenue'] as num?)?.toDouble();
    final discount = (json['discount'] as num?)?.toDouble();

    // Dates
    final closeDate = json['closeDate'] as String? ?? json['CloseDate'] as String?;
    final lastActivityDate = json['lastActivityDate'] as String? ?? json['LastActivityDate'] as String?;
    final nextActivityDate = json['nextActivityDate'] as String?;
    final createdAt = json['createdAt'] as String? ?? json['createdDate'] as String? ?? json['CreatedDate'] as String?;
    final updatedAt = json['updatedAt'] as String? ?? json['LastModifiedDate'] as String?;
    final closedDate = json['closedDate'] as String?;

    // Analysis & AI
    final needsAnalysis = json['needsAnalysis'] as String?;
    final proposedSolution = json['proposedSolution'] as String?;
    final competitors = (json['competitors'] as List<dynamic>?)?.cast<String>();
    final nextStep = json['nextStep'] as String? ?? json['NextStep'] as String?;
    final winProbability = (json['winProbability'] as num?)?.toDouble();
    final riskFactors = (json['riskFactors'] as List<dynamic>?)?.cast<String>();
    final recommendedActions = (json['recommendedActions'] as List<dynamic>?)?.cast<String>();
    final dealVelocity = (json['dealVelocity'] as num?)?.toDouble();

    // Close status
    final isClosed = json['isClosed'] as bool? ?? false;
    final isWon = json['isWon'] as bool? ?? false;
    final lostReason = json['lostReason'] as String?;

    // Nested relationships
    final account = json['account'] as Map<String, dynamic>?;
    final owner = json['owner'] as Map<String, dynamic>?;
    final contacts = (json['contacts'] as List<dynamic>?)
        ?.map((c) => c as Map<String, dynamic>)
        .toList();

    return DealModel(
      id: id,
      name: name,
      accountId: accountId,
      ownerId: ownerId,
      contactId: contactId,
      campaignId: campaignId,
      pipelineId: pipelineId,
      stageId: stageId,
      accountName: accountName,
      contactName: contactName,
      amount: amount,
      stage: DealStage.fromString(stage),
      probability: probability,
      description: description,
      opportunitySource: opportunitySource,
      type: opportunityType,
      expectedRevenue: expectedRevenue,
      discount: discount,
      closeDate: closeDate != null ? DateTime.tryParse(closeDate) : null,
      lastActivityDate: lastActivityDate != null ? DateTime.tryParse(lastActivityDate) : null,
      nextActivityDate: nextActivityDate != null ? DateTime.tryParse(nextActivityDate) : null,
      createdAt: createdAt != null ? DateTime.parse(createdAt) : DateTime.now(),
      updatedAt: updatedAt != null ? DateTime.tryParse(updatedAt) : null,
      needsAnalysis: needsAnalysis,
      proposedSolution: proposedSolution,
      competitors: competitors,
      nextStep: nextStep,
      winProbability: winProbability,
      riskFactors: riskFactors,
      recommendedActions: recommendedActions,
      dealVelocity: dealVelocity,
      isClosed: isClosed,
      isWon: isWon,
      lostReason: lostReason,
      closedDate: closedDate != null ? DateTime.tryParse(closedDate) : null,
      account: account,
      owner: owner,
      contacts: contacts,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'accountId': accountId,
      'ownerId': ownerId,
      if (contactId != null) 'contactId': contactId,
      if (campaignId != null) 'campaignId': campaignId,
      if (pipelineId != null) 'pipelineId': pipelineId,
      if (stageId != null) 'stageId': stageId,
      'amount': amount,
      'stage': stage.backendValue,
      'probability': probability,
      if (description != null) 'description': description,
      if (opportunitySource != null) 'opportunitySource': opportunitySource!.backendValue,
      if (type != null) 'type': type!.backendValue,
      if (expectedRevenue != null) 'expectedRevenue': expectedRevenue,
      if (discount != null) 'discount': discount,
      if (closeDate != null) 'closeDate': closeDate!.toIso8601String(),
      if (lastActivityDate != null) 'lastActivityDate': lastActivityDate!.toIso8601String(),
      if (nextActivityDate != null) 'nextActivityDate': nextActivityDate!.toIso8601String(),
      if (needsAnalysis != null) 'needsAnalysis': needsAnalysis,
      if (proposedSolution != null) 'proposedSolution': proposedSolution,
      if (competitors != null) 'competitors': competitors,
      if (nextStep != null) 'nextStep': nextStep,
      if (winProbability != null) 'winProbability': winProbability,
      if (riskFactors != null) 'riskFactors': riskFactors,
      if (recommendedActions != null) 'recommendedActions': recommendedActions,
      if (dealVelocity != null) 'dealVelocity': dealVelocity,
      'isClosed': isClosed,
      'isWon': isWon,
      if (lostReason != null) 'lostReason': lostReason,
      if (closedDate != null) 'closedDate': closedDate!.toIso8601String(),
    };
  }

  /// Get the stage label for display
  String get stageLabel => stage.label;
}

/// Deals service provider
final dealsServiceProvider = Provider<DealsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return DealsService(api, authMode);
});

/// Deals list provider - uses CRM-aware service
/// Watches authModeProvider directly to rebuild when switching between Local/Salesforce
final dealsProvider =
    FutureProvider.autoDispose<List<DealModel>>((ref) async {
  ref.watch(authModeProvider);
  final crmService = ref.watch(crmDataServiceProvider);
  final rawDeals = await crmService.getOpportunities();
  return rawDeals.map((json) => DealModel.fromJson(json)).toList();
});

/// Deals by stage provider
final dealsByStageProvider = FutureProvider.autoDispose<Map<DealStage, List<DealModel>>>((ref) async {
  ref.watch(authModeProvider);
  final deals = await ref.watch(dealsProvider.future);

  final Map<DealStage, List<DealModel>> byStage = {};
  for (final stage in DealStage.values) {
    byStage[stage] = deals.where((d) => d.stage == stage).toList();
  }
  return byStage;
});

/// Service for deals/opportunities
class DealsService {
  final ApiClient _api;
  final AuthMode _authMode;

  DealsService(this._api, this._authMode);

  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  /// Get all deals/opportunities
  Future<List<DealModel>> getDeals() async {
    try {
      final response = await _api.get('/opportunities');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }

      return items
          .map((item) => DealModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get a single deal by ID
  Future<DealModel?> getDeal(String id) async {
    try {
      final response = await _api.get('/opportunities/$id');
      return DealModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Create a new deal
  Future<DealModel?> createDeal(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/opportunities', data: data);
      return DealModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Update a deal
  Future<DealModel?> updateDeal(String id, Map<String, dynamic> data) async {
    try {
      final response = await _api.patch('/opportunities/$id', data: data);
      return DealModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Update deal stage
  Future<bool> updateStage(String id, DealStage stage) async {
    try {
      await _api.patch('/opportunities/$id', data: {'stage': stage.backendValue});
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Delete a deal
  Future<bool> deleteDeal(String id) async {
    try {
      await _api.delete('/opportunities/$id');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get pipeline statistics
  Future<Map<String, dynamic>> getPipelineStats() async {
    try {
      final response = await _api.get('/opportunities/pipeline/stats');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      return {};
    }
  }

  /// Search deals
  Future<List<DealModel>> searchDeals(String query) async {
    try {
      final response = await _api.get('/opportunities', queryParameters: {'search': query});
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      }

      return items
          .map((item) => DealModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }
}
