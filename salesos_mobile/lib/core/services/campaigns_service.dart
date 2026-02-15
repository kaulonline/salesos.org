import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../providers/auth_mode_provider.dart';

/// Campaign status enumeration
enum CampaignStatus {
  planned,
  active,
  completed,
  cancelled;

  String get label {
    switch (this) {
      case CampaignStatus.planned:
        return 'Planned';
      case CampaignStatus.active:
        return 'Active';
      case CampaignStatus.completed:
        return 'Completed';
      case CampaignStatus.cancelled:
        return 'Cancelled';
    }
  }

  static CampaignStatus fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'active':
      case 'in progress':
        return CampaignStatus.active;
      case 'completed':
      case 'closed':
        return CampaignStatus.completed;
      case 'cancelled':
      case 'aborted':
        return CampaignStatus.cancelled;
      default:
        return CampaignStatus.planned;
    }
  }
}

/// Campaign type enumeration
enum CampaignType {
  email,
  social,
  webinar,
  event,
  advertising,
  referral,
  other;

  String get label {
    switch (this) {
      case CampaignType.email:
        return 'Email';
      case CampaignType.social:
        return 'Social Media';
      case CampaignType.webinar:
        return 'Webinar';
      case CampaignType.event:
        return 'Event';
      case CampaignType.advertising:
        return 'Advertising';
      case CampaignType.referral:
        return 'Referral';
      case CampaignType.other:
        return 'Other';
    }
  }

  static CampaignType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'email':
        return CampaignType.email;
      case 'social':
      case 'social media':
        return CampaignType.social;
      case 'webinar':
        return CampaignType.webinar;
      case 'event':
      case 'conference':
      case 'trade show':
        return CampaignType.event;
      case 'advertising':
      case 'advertisement':
      case 'ad':
        return CampaignType.advertising;
      case 'referral':
      case 'partner':
        return CampaignType.referral;
      default:
        return CampaignType.other;
    }
  }
}

/// Campaign model representing a marketing campaign
class CampaignModel {
  final String id;
  final String name;
  final String? description;
  final CampaignStatus status;
  final CampaignType type;
  final DateTime? startDate;
  final DateTime? endDate;
  final double budgetedCost;
  final double actualCost;
  final double expectedRevenue;
  final double actualRevenue;
  final int totalLeads;
  final int convertedLeads;
  final int totalContacts;
  final int totalOpportunities;
  final double totalOpportunityValue;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final Map<String, dynamic>? metadata;

  const CampaignModel({
    required this.id,
    required this.name,
    this.description,
    required this.status,
    required this.type,
    this.startDate,
    this.endDate,
    this.budgetedCost = 0,
    this.actualCost = 0,
    this.expectedRevenue = 0,
    this.actualRevenue = 0,
    this.totalLeads = 0,
    this.convertedLeads = 0,
    this.totalContacts = 0,
    this.totalOpportunities = 0,
    this.totalOpportunityValue = 0,
    required this.createdAt,
    this.updatedAt,
    this.metadata,
  });

  /// Calculate ROI as a percentage
  /// ROI = ((Actual Revenue - Actual Cost) / Actual Cost) * 100
  double get roi {
    if (actualCost <= 0) return 0;
    return ((actualRevenue - actualCost) / actualCost) * 100;
  }

  /// Calculate cost per lead
  double get costPerLead {
    if (totalLeads <= 0) return 0;
    return actualCost / totalLeads;
  }

  /// Calculate conversion rate as percentage
  double get conversionRate {
    if (totalLeads <= 0) return 0;
    return (convertedLeads / totalLeads) * 100;
  }

  /// Check if campaign is currently running
  bool get isRunning {
    if (status != CampaignStatus.active) return false;
    final now = DateTime.now();
    if (startDate != null && now.isBefore(startDate!)) return false;
    if (endDate != null && now.isAfter(endDate!)) return false;
    return true;
  }

  /// Calculate budget utilization percentage
  double get budgetUtilization {
    if (budgetedCost <= 0) return 0;
    return (actualCost / budgetedCost) * 100;
  }

  /// Factory constructor from API JSON
  factory CampaignModel.fromJson(Map<String, dynamic> json) {
    return CampaignModel(
      id: json['id'] as String? ?? json['Id'] as String? ?? '',
      name: json['name'] as String? ?? json['Name'] as String? ?? 'Unnamed Campaign',
      description: json['description'] as String? ?? json['Description'] as String?,
      status: CampaignStatus.fromString(json['status'] as String? ?? json['Status'] as String?),
      type: CampaignType.fromString(json['type'] as String? ?? json['Type'] as String?),
      startDate: _parseDate(json['startDate'] ?? json['StartDate']),
      endDate: _parseDate(json['endDate'] ?? json['EndDate']),
      budgetedCost: _parseDouble(json['budgetedCost'] ?? json['BudgetedCost']),
      actualCost: _parseDouble(json['actualCost'] ?? json['ActualCost']),
      expectedRevenue: _parseDouble(json['expectedRevenue'] ?? json['ExpectedRevenue']),
      actualRevenue: _parseDouble(json['actualRevenue'] ?? json['AmountAllOpportunities'] ?? 0),
      totalLeads: _parseInt(json['totalLeads'] ?? json['NumberOfLeads'] ?? 0),
      convertedLeads: _parseInt(json['convertedLeads'] ?? json['NumberOfConvertedLeads'] ?? 0),
      totalContacts: _parseInt(json['totalContacts'] ?? json['NumberOfContacts'] ?? 0),
      totalOpportunities: _parseInt(json['totalOpportunities'] ?? json['NumberOfOpportunities'] ?? 0),
      totalOpportunityValue: _parseDouble(json['totalOpportunityValue'] ?? json['AmountAllOpportunities'] ?? 0),
      createdAt: _parseDate(json['createdAt'] ?? json['CreatedDate']) ?? DateTime.now(),
      updatedAt: _parseDate(json['updatedAt'] ?? json['LastModifiedDate']),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  /// Convert to JSON for API
  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'status': status.label,
      'type': type.label,
      'startDate': startDate?.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'budgetedCost': budgetedCost,
      'actualCost': actualCost,
      'expectedRevenue': expectedRevenue,
    };
  }

  /// Copy with modifications
  CampaignModel copyWith({
    String? id,
    String? name,
    String? description,
    CampaignStatus? status,
    CampaignType? type,
    DateTime? startDate,
    DateTime? endDate,
    double? budgetedCost,
    double? actualCost,
    double? expectedRevenue,
    double? actualRevenue,
    int? totalLeads,
    int? convertedLeads,
    int? totalContacts,
    int? totalOpportunities,
    double? totalOpportunityValue,
  }) {
    return CampaignModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      status: status ?? this.status,
      type: type ?? this.type,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      budgetedCost: budgetedCost ?? this.budgetedCost,
      actualCost: actualCost ?? this.actualCost,
      expectedRevenue: expectedRevenue ?? this.expectedRevenue,
      actualRevenue: actualRevenue ?? this.actualRevenue,
      totalLeads: totalLeads ?? this.totalLeads,
      convertedLeads: convertedLeads ?? this.convertedLeads,
      totalContacts: totalContacts ?? this.totalContacts,
      totalOpportunities: totalOpportunities ?? this.totalOpportunities,
      totalOpportunityValue: totalOpportunityValue ?? this.totalOpportunityValue,
      createdAt: createdAt,
      updatedAt: updatedAt,
      metadata: metadata,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}

/// Campaign ROI data for analytics
class CampaignROI {
  final String campaignId;
  final String campaignName;
  final double totalInvestment;
  final double totalRevenue;
  final double roi;
  final double costPerLead;
  final double costPerOpportunity;
  final int leadsGenerated;
  final int opportunitiesCreated;
  final double conversionRate;
  final List<Map<String, dynamic>> monthlyData;

  const CampaignROI({
    required this.campaignId,
    required this.campaignName,
    required this.totalInvestment,
    required this.totalRevenue,
    required this.roi,
    required this.costPerLead,
    required this.costPerOpportunity,
    required this.leadsGenerated,
    required this.opportunitiesCreated,
    required this.conversionRate,
    this.monthlyData = const [],
  });

  factory CampaignROI.fromJson(Map<String, dynamic> json) {
    return CampaignROI(
      campaignId: json['campaignId'] as String? ?? '',
      campaignName: json['campaignName'] as String? ?? '',
      totalInvestment: CampaignModel._parseDouble(json['totalInvestment']),
      totalRevenue: CampaignModel._parseDouble(json['totalRevenue']),
      roi: CampaignModel._parseDouble(json['roi']),
      costPerLead: CampaignModel._parseDouble(json['costPerLead']),
      costPerOpportunity: CampaignModel._parseDouble(json['costPerOpportunity']),
      leadsGenerated: CampaignModel._parseInt(json['leadsGenerated']),
      opportunitiesCreated: CampaignModel._parseInt(json['opportunitiesCreated']),
      conversionRate: CampaignModel._parseDouble(json['conversionRate']),
      monthlyData: (json['monthlyData'] as List<dynamic>?)
          ?.map((e) => e as Map<String, dynamic>)
          .toList() ?? [],
    );
  }

  /// Calculate ROI from campaign model
  factory CampaignROI.fromCampaign(CampaignModel campaign) {
    final costPerOpp = campaign.totalOpportunities > 0
        ? campaign.actualCost / campaign.totalOpportunities
        : 0.0;

    return CampaignROI(
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalInvestment: campaign.actualCost,
      totalRevenue: campaign.actualRevenue,
      roi: campaign.roi,
      costPerLead: campaign.costPerLead,
      costPerOpportunity: costPerOpp,
      leadsGenerated: campaign.totalLeads,
      opportunitiesCreated: campaign.totalOpportunities,
      conversionRate: campaign.conversionRate,
    );
  }
}

/// Campaign statistics summary
class CampaignStats {
  final int totalCampaigns;
  final int activeCampaigns;
  final int completedCampaigns;
  final double totalBudget;
  final double totalSpent;
  final double totalRevenue;
  final double averageROI;
  final int totalLeadsGenerated;
  final double averageConversionRate;
  final CampaignModel? topPerforming;
  final List<CampaignModel> recentCampaigns;

  const CampaignStats({
    this.totalCampaigns = 0,
    this.activeCampaigns = 0,
    this.completedCampaigns = 0,
    this.totalBudget = 0,
    this.totalSpent = 0,
    this.totalRevenue = 0,
    this.averageROI = 0,
    this.totalLeadsGenerated = 0,
    this.averageConversionRate = 0,
    this.topPerforming,
    this.recentCampaigns = const [],
  });

  factory CampaignStats.fromCampaigns(List<CampaignModel> campaigns) {
    if (campaigns.isEmpty) {
      return const CampaignStats();
    }

    final active = campaigns.where((c) => c.status == CampaignStatus.active).length;
    final completed = campaigns.where((c) => c.status == CampaignStatus.completed).length;
    final totalBudget = campaigns.fold<double>(0, (sum, c) => sum + c.budgetedCost);
    final totalSpent = campaigns.fold<double>(0, (sum, c) => sum + c.actualCost);
    final totalRevenue = campaigns.fold<double>(0, (sum, c) => sum + c.actualRevenue);
    final totalLeads = campaigns.fold<int>(0, (sum, c) => sum + c.totalLeads);

    // Calculate average ROI (only for campaigns with spend)
    final campaignsWithSpend = campaigns.where((c) => c.actualCost > 0).toList();
    final avgROI = campaignsWithSpend.isEmpty
        ? 0.0
        : campaignsWithSpend.fold<double>(0, (sum, c) => sum + c.roi) / campaignsWithSpend.length;

    // Calculate average conversion rate (only for campaigns with leads)
    final campaignsWithLeads = campaigns.where((c) => c.totalLeads > 0).toList();
    final avgConversion = campaignsWithLeads.isEmpty
        ? 0.0
        : campaignsWithLeads.fold<double>(0, (sum, c) => sum + c.conversionRate) / campaignsWithLeads.length;

    // Find top performing campaign by ROI
    CampaignModel? topPerforming;
    if (campaignsWithSpend.isNotEmpty) {
      topPerforming = campaignsWithSpend.reduce((a, b) => a.roi > b.roi ? a : b);
    }

    // Get 5 most recent campaigns
    final sorted = [...campaigns]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    final recent = sorted.take(5).toList();

    return CampaignStats(
      totalCampaigns: campaigns.length,
      activeCampaigns: active,
      completedCampaigns: completed,
      totalBudget: totalBudget,
      totalSpent: totalSpent,
      totalRevenue: totalRevenue,
      averageROI: avgROI,
      totalLeadsGenerated: totalLeads,
      averageConversionRate: avgConversion,
      topPerforming: topPerforming,
      recentCampaigns: recent,
    );
  }
}

/// Campaigns service for managing marketing campaigns
class CampaignsService {
  final ApiClient _api;
  final AuthMode _authMode;

  CampaignsService(this._api, this._authMode);

  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /// Get all campaigns
  Future<List<CampaignModel>> getCampaigns({int? limit, CampaignStatus? status}) async {
    try {
      if (isSalesforceMode) {
        String whereClause = '';
        if (status != null) {
          whereClause = "WHERE Status = '${status.label}'";
        }

        final results = await _querySalesforce(
          'SELECT Id, Name, Description, Status, Type, StartDate, EndDate, '
          'BudgetedCost, ActualCost, ExpectedRevenue, AmountAllOpportunities, '
          'NumberOfLeads, NumberOfConvertedLeads, NumberOfContacts, NumberOfOpportunities, '
          'CreatedDate, LastModifiedDate '
          'FROM Campaign $whereClause '
          'ORDER BY CreatedDate DESC '
          '${limit != null ? 'LIMIT $limit' : ''}',
        );

        return results.map((json) => CampaignModel.fromJson(json)).toList();
      } else {
        final queryParams = <String, String>{};
        if (limit != null) queryParams['limit'] = limit.toString();
        if (status != null) queryParams['status'] = status.label;

        final response = await _api.get('/campaigns', queryParameters: queryParams);
        final items = _parseListResponse(response.data);
        return items.map((json) => CampaignModel.fromJson(json)).toList();
      }
    } catch (e) {
      return [];
    }
  }

  /// Get a single campaign by ID
  Future<CampaignModel?> getCampaign(String id) async {
    try {
      if (isSalesforceMode) {
        final results = await _querySalesforce(
          "SELECT Id, Name, Description, Status, Type, StartDate, EndDate, "
          "BudgetedCost, ActualCost, ExpectedRevenue, AmountAllOpportunities, "
          "NumberOfLeads, NumberOfConvertedLeads, NumberOfContacts, NumberOfOpportunities, "
          "AmountWonOpportunities, NumberOfWonOpportunities, "
          "CreatedDate, LastModifiedDate, OwnerId "
          "FROM Campaign WHERE Id = '$id'",
        );

        if (results.isEmpty) return null;
        return CampaignModel.fromJson(results.first);
      } else {
        final response = await _api.get('/campaigns/$id');
        if (response.data == null) return null;
        return CampaignModel.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new campaign
  Future<CampaignModel?> createCampaign(Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final sfData = {
          'Name': data['name'],
          'Description': data['description'],
          'Status': data['status'] ?? 'Planned',
          'Type': data['type'],
          'StartDate': data['startDate'],
          'EndDate': data['endDate'],
          'BudgetedCost': data['budgetedCost'],
          'ExpectedRevenue': data['expectedRevenue'],
        };
        sfData.removeWhere((key, value) => value == null);

        final response = await _api.post('/salesforce/sobjects/Campaign', data: sfData);
        if (response.data != null && response.data['id'] != null) {
          return await getCampaign(response.data['id'] as String);
        }
        return null;
      } else {
        final response = await _api.post('/campaigns', data: data);
        if (response.data == null) return null;
        return CampaignModel.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing campaign
  Future<CampaignModel?> updateCampaign(String id, Map<String, dynamic> data) async {
    try {
      if (isSalesforceMode) {
        final sfData = <String, dynamic>{};
        if (data['name'] != null) sfData['Name'] = data['name'];
        if (data['description'] != null) sfData['Description'] = data['description'];
        if (data['status'] != null) sfData['Status'] = data['status'];
        if (data['type'] != null) sfData['Type'] = data['type'];
        if (data['startDate'] != null) sfData['StartDate'] = data['startDate'];
        if (data['endDate'] != null) sfData['EndDate'] = data['endDate'];
        if (data['budgetedCost'] != null) sfData['BudgetedCost'] = data['budgetedCost'];
        if (data['actualCost'] != null) sfData['ActualCost'] = data['actualCost'];
        if (data['expectedRevenue'] != null) sfData['ExpectedRevenue'] = data['expectedRevenue'];

        await _api.patch('/salesforce/sobjects/Campaign/$id', data: sfData);
        return await getCampaign(id);
      } else {
        final response = await _api.patch('/campaigns/$id', data: data);
        if (response.data == null) return null;
        return CampaignModel.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a campaign
  Future<bool> deleteCampaign(String id) async {
    try {
      if (isSalesforceMode) {
        await _api.delete('/salesforce/sobjects/Campaign/$id');
      } else {
        await _api.delete('/campaigns/$id');
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // ANALYTICS & STATISTICS
  // ============================================================================

  /// Get ROI data for a specific campaign
  Future<CampaignROI?> getCampaignROI(String id) async {
    try {
      final campaign = await getCampaign(id);
      if (campaign == null) return null;

      // For Salesforce, we might fetch additional opportunity data
      if (isSalesforceMode) {
        // Get won opportunities for this campaign
        final wonOpps = await _querySalesforce(
          "SELECT SUM(Amount) total, COUNT(Id) cnt "
          "FROM Opportunity WHERE CampaignId = '$id' AND IsWon = true",
        );

        double wonAmount = 0;
        if (wonOpps.isNotEmpty) {
          wonAmount = CampaignModel._parseDouble(wonOpps.first['total']);
        }

        // Create enriched ROI data
        return CampaignROI(
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalInvestment: campaign.actualCost,
          totalRevenue: wonAmount > 0 ? wonAmount : campaign.actualRevenue,
          roi: campaign.roi,
          costPerLead: campaign.costPerLead,
          costPerOpportunity: campaign.totalOpportunities > 0
              ? campaign.actualCost / campaign.totalOpportunities
              : 0,
          leadsGenerated: campaign.totalLeads,
          opportunitiesCreated: campaign.totalOpportunities,
          conversionRate: campaign.conversionRate,
        );
      }

      return CampaignROI.fromCampaign(campaign);
    } catch (e) {
      return null;
    }
  }

  /// Get overall campaign statistics
  Future<CampaignStats> getCampaignStats() async {
    try {
      final campaigns = await getCampaigns();
      return CampaignStats.fromCampaigns(campaigns);
    } catch (e) {
      return const CampaignStats();
    }
  }

  /// Get leads linked to a campaign
  Future<List<Map<String, dynamic>>> getCampaignLeads(String campaignId, {int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          "SELECT Id, FirstName, LastName, Company, Email, Phone, Status, CreatedDate "
          "FROM Lead WHERE Id IN "
          "(SELECT LeadId FROM CampaignMember WHERE CampaignId = '$campaignId' AND LeadId != null) "
          "ORDER BY CreatedDate DESC "
          "${limit != null ? 'LIMIT $limit' : ''}",
        );
      } else {
        final response = await _api.get('/campaigns/$campaignId/leads', queryParameters: {
          if (limit != null) 'limit': limit.toString(),
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Get contacts linked to a campaign
  Future<List<Map<String, dynamic>>> getCampaignContacts(String campaignId, {int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          "SELECT Id, FirstName, LastName, Email, Phone, Title, Account.Name, CreatedDate "
          "FROM Contact WHERE Id IN "
          "(SELECT ContactId FROM CampaignMember WHERE CampaignId = '$campaignId' AND ContactId != null) "
          "ORDER BY CreatedDate DESC "
          "${limit != null ? 'LIMIT $limit' : ''}",
        );
      } else {
        final response = await _api.get('/campaigns/$campaignId/contacts', queryParameters: {
          if (limit != null) 'limit': limit.toString(),
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Get opportunities linked to a campaign
  Future<List<Map<String, dynamic>>> getCampaignOpportunities(String campaignId, {int? limit}) async {
    try {
      if (isSalesforceMode) {
        return await _querySalesforce(
          "SELECT Id, Name, Amount, StageName, Probability, CloseDate, Account.Name, IsWon, IsClosed "
          "FROM Opportunity WHERE CampaignId = '$campaignId' "
          "ORDER BY CloseDate DESC "
          "${limit != null ? 'LIMIT $limit' : ''}",
        );
      } else {
        final response = await _api.get('/campaigns/$campaignId/opportunities', queryParameters: {
          if (limit != null) 'limit': limit.toString(),
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  /// Get campaign activity timeline
  Future<List<Map<String, dynamic>>> getCampaignActivities(String campaignId, {int? limit}) async {
    try {
      if (isSalesforceMode) {
        // Get tasks related to campaign
        final tasks = await _querySalesforce(
          "SELECT Id, Subject, Status, ActivityDate, Description, CreatedDate "
          "FROM Task WHERE WhatId = '$campaignId' "
          "ORDER BY CreatedDate DESC "
          "${limit != null ? 'LIMIT $limit' : ''}",
        );

        // Get events related to campaign
        final events = await _querySalesforce(
          "SELECT Id, Subject, StartDateTime, EndDateTime, Description, CreatedDate "
          "FROM Event WHERE WhatId = '$campaignId' "
          "ORDER BY CreatedDate DESC "
          "${limit != null ? 'LIMIT $limit' : ''}",
        );

        // Combine and sort by date
        final activities = <Map<String, dynamic>>[];
        for (final task in tasks) {
          activities.add({
            ...task,
            'activityType': 'task',
          });
        }
        for (final event in events) {
          activities.add({
            ...event,
            'activityType': 'event',
          });
        }

        activities.sort((a, b) {
          final dateA = DateTime.tryParse(a['CreatedDate'] as String? ?? '') ?? DateTime(2000);
          final dateB = DateTime.tryParse(b['CreatedDate'] as String? ?? '') ?? DateTime(2000);
          return dateB.compareTo(dateA);
        });

        return activities.take(limit ?? activities.length).toList();
      } else {
        final response = await _api.get('/campaigns/$campaignId/activities', queryParameters: {
          if (limit != null) 'limit': limit.toString(),
        });
        return _parseListResponse(response.data);
      }
    } catch (e) {
      return [];
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

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

  List<Map<String, dynamic>> _parseListResponse(dynamic data) {
    if (data is List) {
      return data.whereType<Map<String, dynamic>>().toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List).whereType<Map<String, dynamic>>().toList();
    }
    if (data is Map && data['items'] is List) {
      return (data['items'] as List).whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Campaigns service provider
final campaignsServiceProvider = Provider<CampaignsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return CampaignsService(api, authMode);
});

/// All campaigns provider
final campaignsProvider =
    FutureProvider.autoDispose<List<CampaignModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaigns();
});

/// Active campaigns provider
final activeCampaignsProvider =
    FutureProvider.autoDispose<List<CampaignModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaigns(status: CampaignStatus.active);
});

/// Campaign stats provider
final campaignStatsProvider =
    FutureProvider.autoDispose<CampaignStats>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaignStats();
});

/// Single campaign provider (by ID)
final campaignByIdProvider = FutureProvider.autoDispose
    .family<CampaignModel?, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaign(id);
});

/// Campaign ROI provider (by ID)
final campaignRoiProvider = FutureProvider.autoDispose
    .family<CampaignROI?, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaignROI(id);
});

/// Campaign leads provider (by campaign ID)
final campaignLeadsProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaignLeads(id, limit: 20);
});

/// Campaign contacts provider (by campaign ID)
final campaignContactsProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, id) async {
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaignContacts(id, limit: 20);
});

/// Campaign opportunities provider (by campaign ID)
final campaignOpportunitiesProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, id) async {
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaignOpportunities(id, limit: 20);
});

/// Campaign activities provider (by campaign ID)
final campaignActivitiesProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, id) async {
  final service = ref.watch(campaignsServiceProvider);
  return service.getCampaignActivities(id, limit: 10);
});
