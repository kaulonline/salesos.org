import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

/// Meeting intelligence/prep data model
class MeetingIntelligence {
  final String generatedAt;
  final String executiveSummary;
  final AccountOverview? accountOverview;
  final LeadOverview? leadOverview;
  final List<KeyContact> keyContacts;
  final List<ActiveOpportunity> activeOpportunities;
  final List<RecentInteraction> recentInteractions;
  final List<PastMeetingInsight> pastMeetingInsights;
  final List<CompanyNews> companyNews;
  final List<String> suggestedAgenda;
  final List<String> talkingPoints;
  final List<String> potentialObjections;
  final List<String> questionsToAsk;
  final List<String> dealRisks;
  final String? relationshipStrength;
  final String? recommendedApproach;

  MeetingIntelligence({
    required this.generatedAt,
    required this.executiveSummary,
    this.accountOverview,
    this.leadOverview,
    this.keyContacts = const [],
    this.activeOpportunities = const [],
    this.recentInteractions = const [],
    this.pastMeetingInsights = const [],
    this.companyNews = const [],
    this.suggestedAgenda = const [],
    this.talkingPoints = const [],
    this.potentialObjections = const [],
    this.questionsToAsk = const [],
    this.dealRisks = const [],
    this.relationshipStrength,
    this.recommendedApproach,
  });

  factory MeetingIntelligence.fromJson(Map<String, dynamic> json) {
    return MeetingIntelligence(
      generatedAt: json['generatedAt'] as String? ?? DateTime.now().toIso8601String(),
      executiveSummary: json['executiveSummary'] as String? ?? '',
      accountOverview: json['accountOverview'] != null
          ? AccountOverview.fromJson(json['accountOverview'])
          : null,
      leadOverview: json['leadOverview'] != null
          ? LeadOverview.fromJson(json['leadOverview'])
          : null,
      keyContacts: (json['keyContacts'] as List?)
              ?.map((e) => KeyContact.fromJson(e))
              .toList() ??
          [],
      activeOpportunities: (json['activeOpportunities'] as List?)
              ?.map((e) => ActiveOpportunity.fromJson(e))
              .toList() ??
          [],
      recentInteractions: (json['recentInteractions'] as List?)
              ?.map((e) => RecentInteraction.fromJson(e))
              .toList() ??
          [],
      pastMeetingInsights: (json['pastMeetingInsights'] as List?)
              ?.map((e) => PastMeetingInsight.fromJson(e))
              .toList() ??
          [],
      companyNews: (json['companyNews'] as List?)
              ?.map((e) => CompanyNews.fromJson(e))
              .toList() ??
          [],
      suggestedAgenda: (json['suggestedAgenda'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      talkingPoints: (json['talkingPoints'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      potentialObjections: (json['potentialObjections'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      questionsToAsk: (json['questionsToAsk'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      dealRisks: (json['dealRisks'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      relationshipStrength: json['relationshipStrength'] as String?,
      recommendedApproach: json['recommendedApproach'] as String?,
    );
  }
}

class AccountOverview {
  final String name;
  final String? industry;
  final String? website;
  final int? employees;
  final String? revenue;
  final String? description;

  AccountOverview({
    required this.name,
    this.industry,
    this.website,
    this.employees,
    this.revenue,
    this.description,
  });

  factory AccountOverview.fromJson(Map<String, dynamic> json) {
    return AccountOverview(
      name: json['name'] as String? ?? '',
      industry: json['industry'] as String?,
      website: json['website'] as String?,
      employees: json['employees'] as int?,
      revenue: json['revenue'] as String?,
      description: json['description'] as String?,
    );
  }
}

class LeadOverview {
  final String name;
  final String? company;
  final String? title;
  final String? email;
  final String? status;
  final List<String> painPoints;
  final String? buyingIntent;

  LeadOverview({
    required this.name,
    this.company,
    this.title,
    this.email,
    this.status,
    this.painPoints = const [],
    this.buyingIntent,
  });

  factory LeadOverview.fromJson(Map<String, dynamic> json) {
    return LeadOverview(
      name: json['name'] as String? ?? '',
      company: json['company'] as String?,
      title: json['title'] as String?,
      email: json['email'] as String?,
      status: json['status'] as String?,
      painPoints: (json['painPoints'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      buyingIntent: json['buyingIntent'] as String?,
    );
  }
}

class KeyContact {
  final String name;
  final String? title;
  final String? role;
  final String? email;
  final String? lastInteraction;

  KeyContact({
    required this.name,
    this.title,
    this.role,
    this.email,
    this.lastInteraction,
  });

  factory KeyContact.fromJson(Map<String, dynamic> json) {
    return KeyContact(
      name: json['name'] as String? ?? '',
      title: json['title'] as String?,
      role: json['role'] as String?,
      email: json['email'] as String?,
      lastInteraction: json['lastInteraction'] as String?,
    );
  }
}

class ActiveOpportunity {
  final String name;
  final double? amount;
  final String? stage;
  final String? closeDate;
  final int? probability;

  ActiveOpportunity({
    required this.name,
    this.amount,
    this.stage,
    this.closeDate,
    this.probability,
  });

  factory ActiveOpportunity.fromJson(Map<String, dynamic> json) {
    return ActiveOpportunity(
      name: json['name'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble(),
      stage: json['stage'] as String?,
      closeDate: json['closeDate'] as String?,
      probability: json['probability'] as int?,
    );
  }
}

class RecentInteraction {
  final String type;
  final String subject;
  final String date;
  final String? summary;

  RecentInteraction({
    required this.type,
    required this.subject,
    required this.date,
    this.summary,
  });

  factory RecentInteraction.fromJson(Map<String, dynamic> json) {
    return RecentInteraction(
      type: json['type'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      date: json['date'] as String? ?? '',
      summary: json['summary'] as String?,
    );
  }
}

class PastMeetingInsight {
  final String title;
  final String date;
  final List<String> keyPoints;
  final List<String> objections;
  final List<String> actionItems;

  PastMeetingInsight({
    required this.title,
    required this.date,
    this.keyPoints = const [],
    this.objections = const [],
    this.actionItems = const [],
  });

  factory PastMeetingInsight.fromJson(Map<String, dynamic> json) {
    return PastMeetingInsight(
      title: json['title'] as String? ?? '',
      date: json['date'] as String? ?? '',
      keyPoints: (json['keyPoints'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      objections: (json['objections'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      actionItems: (json['actionItems'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

class CompanyNews {
  final String title;
  final String snippet;
  final String? date;
  final String? url;

  CompanyNews({
    required this.title,
    required this.snippet,
    this.date,
    this.url,
  });

  factory CompanyNews.fromJson(Map<String, dynamic> json) {
    return CompanyNews(
      title: json['title'] as String? ?? '',
      snippet: json['snippet'] as String? ?? '',
      date: json['date'] as String?,
      url: json['url'] as String?,
    );
  }
}

/// Provider for MeetingPrepService
final meetingPrepServiceProvider = Provider<MeetingPrepService>((ref) {
  final api = ref.watch(apiClientProvider);
  return MeetingPrepService(api);
});

/// Service for meeting prep API calls
class MeetingPrepService {
  final ApiClient _api;

  MeetingPrepService(this._api);

  /// Generate meeting prep for given parameters
  Future<MeetingIntelligence> getMeetingPrep({
    String? meetingId,
    String? accountId,
    String? leadId,
    String? opportunityId,
    String? contactId,
  }) async {
    final params = <String>[];
    if (meetingId != null) params.add('meetingId=$meetingId');
    if (accountId != null) params.add('accountId=$accountId');
    if (leadId != null) params.add('leadId=$leadId');
    if (opportunityId != null) params.add('opportunityId=$opportunityId');
    if (contactId != null) params.add('contactId=$contactId');

    final queryString = params.join('&');
    final response = await _api.get('/meetings/prep?$queryString');
    return MeetingIntelligence.fromJson(response.data);
  }

  /// Generate meeting prep for a specific meeting by ID
  Future<MeetingIntelligence> getMeetingPrepById(String meetingId) async {
    final response = await _api.get('/meetings/$meetingId/prep');
    return MeetingIntelligence.fromJson(response.data);
  }
}
