import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'crm_data_service.dart';
import 'iris_rank_service.dart';

/// Meeting context data for pre-meeting briefing
class MeetingContext {
  final String meetingId;
  final String subject;
  final DateTime startTime;
  final DateTime endTime;
  final List<Attendee> attendees;
  final String? location;
  final String? description;
  final RelatedEntities? relatedEntities;
  final List<TalkingPoint> talkingPoints;
  final List<RecentInteraction> recentInteractions;
  final String? aiSummary;
  final DateTime generatedAt;

  const MeetingContext({
    required this.meetingId,
    required this.subject,
    required this.startTime,
    required this.endTime,
    required this.attendees,
    this.location,
    this.description,
    this.relatedEntities,
    required this.talkingPoints,
    required this.recentInteractions,
    this.aiSummary,
    required this.generatedAt,
  });

  /// Time until meeting starts
  Duration get timeUntilStart => startTime.difference(DateTime.now());

  /// Is meeting happening soon (within 30 minutes)
  bool get isUpcoming =>
      timeUntilStart.isNegative == false && timeUntilStart.inMinutes <= 30;

  /// Is meeting happening now
  bool get isNow {
    final now = DateTime.now();
    return now.isAfter(startTime) && now.isBefore(endTime);
  }

  factory MeetingContext.fromJson(Map<String, dynamic> json) {
    return MeetingContext(
      meetingId: json['meetingId'] ?? '',
      subject: json['subject'] ?? '',
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      attendees: (json['attendees'] as List?)
              ?.map((a) => Attendee.fromJson(a))
              .toList() ??
          [],
      location: json['location'],
      description: json['description'],
      relatedEntities: json['relatedEntities'] != null
          ? RelatedEntities.fromJson(json['relatedEntities'])
          : null,
      talkingPoints: (json['talkingPoints'] as List?)
              ?.map((t) => TalkingPoint.fromJson(t))
              .toList() ??
          [],
      recentInteractions: (json['recentInteractions'] as List?)
              ?.map((i) => RecentInteraction.fromJson(i))
              .toList() ??
          [],
      aiSummary: json['aiSummary'],
      generatedAt: DateTime.parse(json['generatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'meetingId': meetingId,
        'subject': subject,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime.toIso8601String(),
        'attendees': attendees.map((a) => a.toJson()).toList(),
        'location': location,
        'description': description,
        'relatedEntities': relatedEntities?.toJson(),
        'talkingPoints': talkingPoints.map((t) => t.toJson()).toList(),
        'recentInteractions': recentInteractions.map((i) => i.toJson()).toList(),
        'aiSummary': aiSummary,
        'generatedAt': generatedAt.toIso8601String(),
      };
}

/// Meeting attendee
class Attendee {
  final String name;
  final String? email;
  final String? role;
  final String? company;
  final String? contactId;
  final bool isOrganizer;

  const Attendee({
    required this.name,
    this.email,
    this.role,
    this.company,
    this.contactId,
    this.isOrganizer = false,
  });

  String get initials {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  factory Attendee.fromJson(Map<String, dynamic> json) {
    return Attendee(
      name: json['name'] ?? '',
      email: json['email'],
      role: json['role'],
      company: json['company'],
      contactId: json['contactId'],
      isOrganizer: json['isOrganizer'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'role': role,
        'company': company,
        'contactId': contactId,
        'isOrganizer': isOrganizer,
      };
}

/// Related CRM entities for the meeting
class RelatedEntities {
  final ContactSummary? contact;
  final AccountSummary? account;
  final DealSummary? deal;

  const RelatedEntities({
    this.contact,
    this.account,
    this.deal,
  });

  factory RelatedEntities.fromJson(Map<String, dynamic> json) {
    return RelatedEntities(
      contact: json['contact'] != null
          ? ContactSummary.fromJson(json['contact'])
          : null,
      account: json['account'] != null
          ? AccountSummary.fromJson(json['account'])
          : null,
      deal: json['deal'] != null ? DealSummary.fromJson(json['deal']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'contact': contact?.toJson(),
        'account': account?.toJson(),
        'deal': deal?.toJson(),
      };
}

class ContactSummary {
  final String id;
  final String name;
  final String? title;
  final String? email;
  final String? phone;
  final int? irisRank;

  const ContactSummary({
    required this.id,
    required this.name,
    this.title,
    this.email,
    this.phone,
    this.irisRank,
  });

  factory ContactSummary.fromJson(Map<String, dynamic> json) {
    return ContactSummary(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      title: json['title'],
      email: json['email'],
      phone: json['phone'],
      irisRank: json['irisRank'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'title': title,
        'email': email,
        'phone': phone,
        'irisRank': irisRank,
      };
}

class AccountSummary {
  final String id;
  final String name;
  final String? industry;
  final String? website;
  final double? annualRevenue;

  const AccountSummary({
    required this.id,
    required this.name,
    this.industry,
    this.website,
    this.annualRevenue,
  });

  factory AccountSummary.fromJson(Map<String, dynamic> json) {
    return AccountSummary(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      industry: json['industry'],
      website: json['website'],
      annualRevenue: (json['annualRevenue'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'industry': industry,
        'website': website,
        'annualRevenue': annualRevenue,
      };
}

class DealSummary {
  final String id;
  final String name;
  final String stage;
  final double amount;
  final double probability;
  final DateTime? closeDate;

  const DealSummary({
    required this.id,
    required this.name,
    required this.stage,
    required this.amount,
    required this.probability,
    this.closeDate,
  });

  factory DealSummary.fromJson(Map<String, dynamic> json) {
    return DealSummary(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      stage: json['stage'] ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      probability: (json['probability'] as num?)?.toDouble() ?? 0.0,
      closeDate: json['closeDate'] != null
          ? DateTime.parse(json['closeDate'])
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'stage': stage,
        'amount': amount,
        'probability': probability,
        'closeDate': closeDate?.toIso8601String(),
      };
}

/// AI-generated talking point
class TalkingPoint {
  final String content;
  final TalkingPointType type;
  final String? source;

  const TalkingPoint({
    required this.content,
    required this.type,
    this.source,
  });

  factory TalkingPoint.fromJson(Map<String, dynamic> json) {
    return TalkingPoint(
      content: json['content'] ?? '',
      type: TalkingPointType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => TalkingPointType.general,
      ),
      source: json['source'],
    );
  }

  Map<String, dynamic> toJson() => {
        'content': content,
        'type': type.name,
        'source': source,
      };
}

enum TalkingPointType { dealProgress, followUp, objection, opportunity, general }

/// Recent interaction with the contact
class RecentInteraction {
  final String type;
  final String summary;
  final DateTime date;
  final String? outcome;

  const RecentInteraction({
    required this.type,
    required this.summary,
    required this.date,
    this.outcome,
  });

  factory RecentInteraction.fromJson(Map<String, dynamic> json) {
    return RecentInteraction(
      type: json['type'] ?? '',
      summary: json['summary'] ?? '',
      date: DateTime.parse(json['date']),
      outcome: json['outcome'],
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'summary': summary,
        'date': date.toIso8601String(),
        'outcome': outcome,
      };
}

/// Pre-meeting service for generating meeting context briefings
class PreMeetingService {
  final Ref _ref;
  static const String _cacheKeyPrefix = 'meeting_context_';

  PreMeetingService(this._ref);

  /// Get upcoming meetings from CRM
  Future<List<Map<String, dynamic>>> getUpcomingMeetings({
    int limit = 5,
  }) async {
    try {
      final crmService = _ref.read(crmDataServiceProvider);
      final activities = await crmService.getActivities(limit: limit * 3);

      // Filter to only upcoming meetings/events/calls
      final now = DateTime.now();
      return activities
          .where((a) {
            final type = a['type']?.toString().toLowerCase() ?? '';
            final dateStr = a['activityDate']?.toString() ?? a['createdAt']?.toString();
            final activityDate = dateStr != null ? DateTime.tryParse(dateStr) : null;
            final isUpcoming = activityDate != null && activityDate.isAfter(now);

            return isUpcoming &&
                (type == 'meeting' || type == 'event' || type == 'call');
          })
          .take(limit)
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Generate meeting context for a specific meeting
  Future<MeetingContext> generateMeetingContext({
    required String meetingId,
    required String subject,
    required DateTime startTime,
    required DateTime endTime,
    String? location,
    String? description,
    List<String>? attendeeEmails,
  }) async {

    try {
      final crmService = _ref.read(crmDataServiceProvider);
      final irisRankService = _ref.read(irisRankServiceProvider);

      // Find related contacts by email
      final attendees = <Attendee>[];
      ContactSummary? primaryContact;
      AccountSummary? relatedAccount;
      DealSummary? relatedDeal;

      if (attendeeEmails != null && attendeeEmails.isNotEmpty) {
        for (final email in attendeeEmails) {
          // Try to find contact in CRM by getting all contacts and filtering
          final allContacts = await crmService.getContacts(limit: 100);
          final matchingContacts = allContacts
              .where((c) =>
                  c['Email']?.toString().toLowerCase() == email.toLowerCase() ||
                  c['email']?.toString().toLowerCase() == email.toLowerCase())
              .toList();

          if (matchingContacts.isNotEmpty) {
            final contact = matchingContacts.first;
            final irisRank = await _getContactIRISRank(
                contact['id']?.toString() ?? '', irisRankService);

            attendees.add(Attendee(
              name: contact['Name'] ?? contact['name'] ?? email,
              email: email,
              role: contact['Title'] ?? contact['title'],
              company: contact['Account']?['Name'] ??
                  contact['accountName'] ??
                  contact['company'],
              contactId: contact['id']?.toString(),
            ));

            // Set first found contact as primary
            if (primaryContact == null) {
              primaryContact = ContactSummary(
                id: contact['id']?.toString() ?? '',
                name: contact['Name'] ?? contact['name'] ?? '',
                title: contact['Title'] ?? contact['title'],
                email: email,
                phone: contact['Phone'] ?? contact['phone'],
                irisRank: irisRank,
              );

              // Get related account
              if (contact['AccountId'] != null ||
                  contact['accountId'] != null) {
                final accountId =
                    contact['AccountId']?.toString() ?? contact['accountId']?.toString() ?? '';
                final accountData =
                    await crmService.getAccountById(accountId);
                if (accountData != null) {
                  relatedAccount = AccountSummary(
                    id: accountId,
                    name: accountData['Name'] ?? accountData['name'] ?? '',
                    industry: accountData['Industry'] ?? accountData['industry'],
                    website: accountData['Website'] ?? accountData['website'],
                    annualRevenue:
                        (accountData['AnnualRevenue'] as num?)?.toDouble(),
                  );
                }
              }
            }
          } else {
            // Unknown attendee
            attendees.add(Attendee(
              name: email.split('@').first,
              email: email,
            ));
          }
        }
      }

      // Find related deals
      if (primaryContact != null) {
        final deals = await crmService.getContactOpportunities(primaryContact.id);
        if (deals.isNotEmpty) {
          final deal = deals.first;
          relatedDeal = DealSummary(
            id: deal['id']?.toString() ?? deal['Id']?.toString() ?? '',
            name: deal['Name'] ?? deal['name'] ?? '',
            stage: deal['StageName'] ?? deal['stage'] ?? '',
            amount: (deal['Amount'] as num?)?.toDouble() ?? 0.0,
            probability: (deal['Probability'] as num?)?.toDouble() ?? 0.0,
            closeDate: deal['CloseDate'] != null
                ? DateTime.tryParse(deal['CloseDate'].toString())
                : null,
          );
        }
      }

      // Get recent interactions from activities
      final recentInteractions = <RecentInteraction>[];
      if (primaryContact != null) {
        // Get activities and filter by contact
        final activities = await crmService.getActivities(limit: 20);
        final contactId = primaryContact.id;
        final contactActivities = activities
            .where((a) =>
                a['contactId']?.toString() == contactId ||
                a['WhoId']?.toString() == contactId)
            .take(5)
            .toList();

        for (final activity in contactActivities) {
          recentInteractions.add(RecentInteraction(
            type: activity['type']?.toString() ?? 'activity',
            summary: activity['subject'] ??
                activity['title'] ??
                activity['description'] ??
                '',
            date: DateTime.tryParse(activity['activityDate']?.toString() ??
                    activity['createdAt']?.toString() ??
                    '') ??
                DateTime.now(),
            outcome: activity['outcome']?.toString(),
          ));
        }
      }

      // Generate talking points
      final talkingPoints = _generateTalkingPoints(
        primaryContact: primaryContact,
        account: relatedAccount,
        deal: relatedDeal,
        recentInteractions: recentInteractions,
        meetingSubject: subject,
      );

      // Generate AI summary
      final aiSummary = _generateAISummary(
        subject: subject,
        attendees: attendees,
        contact: primaryContact,
        account: relatedAccount,
        deal: relatedDeal,
        recentInteractions: recentInteractions,
      );

      final context = MeetingContext(
        meetingId: meetingId,
        subject: subject,
        startTime: startTime,
        endTime: endTime,
        attendees: attendees,
        location: location,
        description: description,
        relatedEntities: RelatedEntities(
          contact: primaryContact,
          account: relatedAccount,
          deal: relatedDeal,
        ),
        talkingPoints: talkingPoints,
        recentInteractions: recentInteractions,
        aiSummary: aiSummary,
        generatedAt: DateTime.now(),
      );

      // Cache the context
      await _cacheContext(context);

      return context;
    } catch (e) {
      rethrow;
    }
  }

  Future<int?> _getContactIRISRank(
      String contactId, IRISRankService service) async {
    try {
      final hotLeads = await service.getHotLeads(limit: 50);
      final match = hotLeads.firstWhere(
        (l) => l.id == contactId,
        orElse: () => IRISRankResult(
          id: '',
          name: '',
          type: '',
          rank: -1,
          scores: {},
          momentum: MomentumMetrics(
            velocity: 0,
            acceleration: 0,
            momentumScore: 0,
            trend: '',
            daysSinceLastActivity: 0,
            periodCounts: {},
          ),
          insights: [],
          properties: null,
        ),
      );
      return match.rank >= 0 ? match.rank.toInt() : null;
    } catch (e) {
      return null;
    }
  }

  List<TalkingPoint> _generateTalkingPoints({
    ContactSummary? primaryContact,
    AccountSummary? account,
    DealSummary? deal,
    List<RecentInteraction> recentInteractions = const [],
    required String meetingSubject,
  }) {
    final points = <TalkingPoint>[];

    // Deal-related talking points
    if (deal != null) {
      points.add(TalkingPoint(
        content:
            'Current deal "${deal.name}" is at ${deal.stage} stage with ${(deal.probability * 100).toInt()}% probability',
        type: TalkingPointType.dealProgress,
        source: 'CRM',
      ));

      if (deal.closeDate != null) {
        final daysUntilClose =
            deal.closeDate!.difference(DateTime.now()).inDays;
        if (daysUntilClose <= 30 && daysUntilClose > 0) {
          points.add(TalkingPoint(
            content:
                'Close date is in $daysUntilClose days - confirm timeline and next steps',
            type: TalkingPointType.dealProgress,
            source: 'AI',
          ));
        }
      }
    }

    // Follow-up from recent interactions
    if (recentInteractions.isNotEmpty) {
      final lastInteraction = recentInteractions.first;
      points.add(TalkingPoint(
        content:
            'Follow up on ${lastInteraction.type} from ${_formatDaysAgo(lastInteraction.date)}: "${lastInteraction.summary}"',
        type: TalkingPointType.followUp,
        source: 'Recent Activity',
      ));
    }

    // Account insights
    if (account != null && account.industry != null) {
      points.add(TalkingPoint(
        content:
            'Discuss how our solution addresses ${account.industry} industry challenges',
        type: TalkingPointType.opportunity,
        source: 'AI',
      ));
    }

    // Contact-specific insights
    if (primaryContact != null && primaryContact.irisRank != null) {
      if (primaryContact.irisRank! <= 10) {
        points.add(TalkingPoint(
          content:
              '${primaryContact.name} is a high-priority contact - ensure strong relationship building',
          type: TalkingPointType.opportunity,
          source: 'IRISRank',
        ));
      }
    }

    // General preparation
    points.add(TalkingPoint(
      content: 'Ask about current priorities and pain points',
      type: TalkingPointType.general,
      source: 'Best Practice',
    ));

    return points;
  }

  String _generateAISummary({
    required String subject,
    required List<Attendee> attendees,
    ContactSummary? contact,
    AccountSummary? account,
    DealSummary? deal,
    List<RecentInteraction> recentInteractions = const [],
  }) {
    final parts = <String>[];

    parts.add('Meeting: "$subject"');

    if (attendees.isNotEmpty) {
      final names = attendees.take(3).map((a) => a.name).join(', ');
      parts.add('with $names');
    }

    if (account != null) {
      parts.add('from ${account.name}');
      if (account.industry != null) {
        parts.add('(${account.industry})');
      }
    }

    if (deal != null) {
      parts.add(
          '. Active deal worth \$${_formatCurrency(deal.amount)} at ${deal.stage} stage');
    }

    if (recentInteractions.isNotEmpty) {
      parts.add(
          '. Last contact was ${_formatDaysAgo(recentInteractions.first.date)}');
    }

    return parts.join(' ');
  }

  String _formatDaysAgo(DateTime date) {
    final days = DateTime.now().difference(date).inDays;
    if (days == 0) return 'today';
    if (days == 1) return 'yesterday';
    if (days < 7) return '$days days ago';
    if (days < 30) return '${(days / 7).round()} weeks ago';
    return '${(days / 30).round()} months ago';
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(0)}K';
    }
    return value.toStringAsFixed(0);
  }

  Future<void> _cacheContext(MeetingContext context) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        '$_cacheKeyPrefix${context.meetingId}',
        jsonEncode(context.toJson()),
      );
    } catch (e) {
      // Silently ignore
    }
  }

  /// Get cached meeting context
  Future<MeetingContext?> getCachedContext(String meetingId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('$_cacheKeyPrefix$meetingId');
      if (cached != null) {
        return MeetingContext.fromJson(jsonDecode(cached));
      }
    } catch (e) {
      // Silently ignore
    }
    return null;
  }
}

/// Pre-meeting service provider
final preMeetingServiceProvider = Provider<PreMeetingService>((ref) {
  return PreMeetingService(ref);
});

/// Upcoming meetings provider
final upcomingMeetingsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final service = ref.watch(preMeetingServiceProvider);
  return service.getUpcomingMeetings();
});

/// Meeting context provider (by meeting ID)
final meetingContextProvider =
    FutureProvider.family<MeetingContext?, String>((ref, meetingId) async {
  final service = ref.watch(preMeetingServiceProvider);
  return service.getCachedContext(meetingId);
});
