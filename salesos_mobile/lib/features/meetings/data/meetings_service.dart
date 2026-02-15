// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Meeting status enum - aligned with web TypeScript MeetingStatus
enum MeetingStatus {
  SCHEDULED('Scheduled', 'SCHEDULED'),
  IN_PROGRESS('In Progress', 'IN_PROGRESS'),
  COMPLETED('Completed', 'COMPLETED'),
  CANCELLED('Cancelled', 'CANCELLED'),
  NO_SHOW('No Show', 'NO_SHOW');

  final String label;
  final String backendValue;
  const MeetingStatus(this.label, this.backendValue);

  static MeetingStatus fromString(String? status) {
    if (status == null) return MeetingStatus.SCHEDULED;
    final upper = status.toUpperCase().replaceAll(' ', '_');
    final normalized = upper.replaceAll('_', '');
    switch (normalized) {
      case 'SCHEDULED':
        return MeetingStatus.SCHEDULED;
      case 'INPROGRESS':
        return MeetingStatus.IN_PROGRESS;
      case 'COMPLETED':
        return MeetingStatus.COMPLETED;
      case 'CANCELLED':
      case 'CANCELED':
        return MeetingStatus.CANCELLED;
      case 'NOSHOW':
        return MeetingStatus.NO_SHOW;
      default:
        return MeetingStatus.SCHEDULED;
    }
  }
}

/// Meeting type enum - aligned with web TypeScript MeetingType
enum MeetingType {
  CALL('Call', 'CALL'),
  VIDEO('Video', 'VIDEO'),
  IN_PERSON('In Person', 'IN_PERSON'),
  WEBINAR('Webinar', 'WEBINAR');

  final String label;
  final String backendValue;
  const MeetingType(this.label, this.backendValue);

  static MeetingType fromString(String? type) {
    if (type == null) return MeetingType.CALL;
    final upper = type.toUpperCase().replaceAll(' ', '_');
    final normalized = upper.replaceAll('_', '');
    switch (normalized) {
      case 'CALL':
        return MeetingType.CALL;
      case 'VIDEO':
        return MeetingType.VIDEO;
      case 'INPERSON':
        return MeetingType.IN_PERSON;
      case 'WEBINAR':
        return MeetingType.WEBINAR;
      default:
        return MeetingType.CALL;
    }
  }
}

/// Bot status enum for meeting recording bots (mobile-only)
enum BotStatus {
  notJoined('Not Joined', 'NOT_JOINED'),
  joining('Joining', 'JOINING'),
  recording('Recording', 'RECORDING'),
  processing('Processing', 'PROCESSING'),
  complete('Complete', 'COMPLETE'),
  error('Error', 'ERROR');

  final String label;
  final String backendValue;
  const BotStatus(this.label, this.backendValue);

  static BotStatus fromString(String? status) {
    if (status == null) return BotStatus.notJoined;
    final normalized = status.toLowerCase().replaceAll(' ', '').replaceAll('_', '');
    switch (normalized) {
      case 'notjoined':
        return BotStatus.notJoined;
      case 'joining':
        return BotStatus.joining;
      case 'recording':
        return BotStatus.recording;
      case 'processing':
        return BotStatus.processing;
      case 'complete':
      case 'completed':
        return BotStatus.complete;
      case 'error':
      case 'failed':
        return BotStatus.error;
      default:
        return BotStatus.notJoined;
    }
  }
}

/// Meeting participant model - aligned with web MeetingParticipant
class MeetingParticipant {
  final String id;
  final String meetingId;
  final String? contactId;
  final String? userId;
  final String email;
  final String name;
  final String? role;
  final bool attended;
  final Map<String, dynamic>? contact;
  final Map<String, dynamic>? user;

  MeetingParticipant({
    required this.id,
    required this.meetingId,
    this.contactId,
    this.userId,
    required this.email,
    required this.name,
    this.role,
    this.attended = false,
    this.contact,
    this.user,
  });

  factory MeetingParticipant.fromJson(Map<String, dynamic> json) {
    return MeetingParticipant(
      id: json['id'] as String? ?? '',
      meetingId: json['meetingId'] as String? ?? '',
      contactId: json['contactId'] as String?,
      userId: json['userId'] as String?,
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? json['email'] as String? ?? '',
      role: json['role'] as String?,
      attended: json['attended'] as bool? ?? false,
      contact: json['contact'] as Map<String, dynamic>?,
      user: json['user'] as Map<String, dynamic>?,
    );
  }

  /// Create a simple participant from a string (backward compat with old attendees list)
  factory MeetingParticipant.fromString(String nameOrEmail) {
    return MeetingParticipant(
      id: '',
      meetingId: '',
      email: nameOrEmail.contains('@') ? nameOrEmail : '',
      name: nameOrEmail,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'meetingId': meetingId,
      if (contactId != null) 'contactId': contactId,
      if (userId != null) 'userId': userId,
      'email': email,
      'name': name,
      if (role != null) 'role': role,
      'attended': attended,
      if (contact != null) 'contact': contact,
      if (user != null) 'user': user,
    };
  }
}

/// Meeting action item model
class MeetingActionItem {
  final String id;
  final String title;
  final String? assignee;
  final String status;

  MeetingActionItem({
    required this.id,
    required this.title,
    this.assignee,
    this.status = 'pending',
  });

  factory MeetingActionItem.fromJson(Map<String, dynamic> json) {
    return MeetingActionItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? json['text'] as String? ?? '',
      assignee: json['assignee'] as String? ?? json['assigneeName'] as String?,
      status: json['status'] as String? ?? 'pending',
    );
  }

  /// Create an action item from a plain string (web sends actionItems as string[])
  factory MeetingActionItem.fromString(String text) {
    return MeetingActionItem(
      id: '',
      title: text,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'assignee': assignee,
      'status': status,
    };
  }

  /// Convert to plain string for web-compatible toJson
  String toWebString() => title;
}

/// Meeting insight model (kept for backward compatibility in fromJson)
class MeetingInsight {
  final String topic;
  final String sentiment;
  final List<String> keywords;

  MeetingInsight({
    required this.topic,
    required this.sentiment,
    this.keywords = const [],
  });

  factory MeetingInsight.fromJson(Map<String, dynamic> json) {
    return MeetingInsight(
      topic: json['topic'] as String? ?? '',
      sentiment: json['sentiment'] as String? ?? 'neutral',
      keywords: (json['keywords'] as List<dynamic>?)
              ?.map((k) => k.toString())
              .toList() ??
          [],
    );
  }
}

/// Meeting model - aligned with web TypeScript Meeting interface
class MeetingModel {
  final String id;
  final String ownerId;
  final String title;
  final String? description;
  final MeetingType type;
  final MeetingStatus status;
  final DateTime startTime;
  final DateTime endTime;
  final String? location;
  final String? meetingLink;
  final String? accountId;
  final String? opportunityId;
  final String? leadId;
  final String? recordingUrl;
  final String? transcriptUrl;
  final String? summary;
  final List<MeetingActionItem> actionItems;
  final double? sentimentScore;
  final List<String> keyTopics;
  final Map<String, dynamic>? metadata;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<MeetingParticipant> participants;
  final Map<String, dynamic>? account;
  final Map<String, dynamic>? opportunity;
  final Map<String, dynamic>? owner;

  // Mobile-only fields (kept for backward compat)
  final BotStatus botStatus;
  final String? transcript;

  MeetingModel({
    required this.id,
    this.ownerId = '',
    required this.title,
    this.description,
    this.type = MeetingType.CALL,
    required this.status,
    required this.startTime,
    required this.endTime,
    this.location,
    this.meetingLink,
    this.accountId,
    this.opportunityId,
    this.leadId,
    this.recordingUrl,
    this.transcriptUrl,
    this.summary,
    this.actionItems = const [],
    this.sentimentScore,
    this.keyTopics = const [],
    this.metadata,
    this.createdAt,
    this.updatedAt,
    this.participants = const [],
    this.account,
    this.opportunity,
    this.owner,
    this.botStatus = BotStatus.notJoined,
    this.transcript,
  });

  factory MeetingModel.fromJson(Map<String, dynamic> json) {
    final id = json['id'] as String? ?? json['Id'] as String? ?? '';
    final ownerId = json['ownerId'] as String? ?? '';
    final title = json['title'] as String? ?? json['Name'] as String? ?? 'Untitled Meeting';
    final description = json['description'] as String?;
    final typeStr = json['type'] as String?;
    final startTime = json['startTime'] as String? ??
        json['startDate'] as String? ??
        json['StartDateTime'] as String?;
    final endTime = json['endTime'] as String? ??
        json['endDate'] as String? ??
        json['EndDateTime'] as String?;
    final location = json['location'] as String?;
    final meetingLink = json['meetingLink'] as String?;
    final accountId = json['accountId'] as String?;
    final opportunityId = json['opportunityId'] as String?;
    final leadId = json['leadId'] as String?;
    final recordingUrl = json['recordingUrl'] as String?;
    final transcriptUrl = json['transcriptUrl'] as String?;
    final status = json['status'] as String? ?? json['Status'] as String?;
    final botStatus = json['botStatus'] as String? ?? json['BotStatus'] as String?;
    final createdAtStr = json['createdAt'] as String?;
    final updatedAtStr = json['updatedAt'] as String?;

    // Parse participants: support both object list (web) and string list (old mobile attendees)
    final participantsRaw = json['participants'] as List<dynamic>?;
    final attendeesRaw = json['attendees'] as List<dynamic>?;
    List<MeetingParticipant> participants;
    if (participantsRaw != null && participantsRaw.isNotEmpty) {
      participants = participantsRaw.map((p) {
        if (p is Map<String, dynamic>) {
          return MeetingParticipant.fromJson(p);
        } else if (p is Map) {
          return MeetingParticipant.fromJson(Map<String, dynamic>.from(p));
        } else if (p is String) {
          return MeetingParticipant.fromString(p);
        }
        return MeetingParticipant.fromString('');
      }).toList();
    } else if (attendeesRaw != null && attendeesRaw.isNotEmpty) {
      // Backward compat: convert old string attendees to participants
      participants = attendeesRaw.map((a) {
        if (a is String) return MeetingParticipant.fromString(a);
        if (a is Map) {
          return MeetingParticipant.fromJson(Map<String, dynamic>.from(a));
        }
        return MeetingParticipant.fromString('');
      }).toList();
    } else {
      participants = [];
    }

    // Parse actionItems: support both object list and string list (web sends string[])
    final actionItemsRaw = json['actionItems'] as List<dynamic>? ?? [];
    final actionItems = actionItemsRaw.map((item) {
      if (item is Map<String, dynamic>) {
        return MeetingActionItem.fromJson(item);
      } else if (item is Map) {
        return MeetingActionItem.fromJson(Map<String, dynamic>.from(item));
      } else if (item is String) {
        return MeetingActionItem.fromString(item);
      }
      return MeetingActionItem.fromString('');
    }).toList();

    // Parse keyTopics: from web keyTopics field OR extract from old insights array
    List<String> keyTopics;
    final keyTopicsRaw = json['keyTopics'] as List<dynamic>?;
    final insightsRaw = json['insights'] as List<dynamic>?;
    if (keyTopicsRaw != null && keyTopicsRaw.isNotEmpty) {
      keyTopics = keyTopicsRaw.map((t) => t.toString()).toList();
    } else if (insightsRaw != null && insightsRaw.isNotEmpty) {
      // Backward compat: extract topics from old insights objects
      keyTopics = insightsRaw
          .map((i) {
            if (i is Map) return (i['topic'] as String?) ?? '';
            return '';
          })
          .where((t) => t.isNotEmpty)
          .toList();
    } else {
      keyTopics = [];
    }

    // Parse sentimentScore: from web field OR compute from old insights
    double? sentimentScore = (json['sentimentScore'] as num?)?.toDouble();
    if (sentimentScore == null && insightsRaw != null && insightsRaw.isNotEmpty) {
      // Backward compat: derive average sentiment from old insights
      double total = 0;
      int count = 0;
      for (final i in insightsRaw) {
        if (i is Map) {
          final s = (i['sentiment'] as String?)?.toLowerCase();
          if (s == 'positive') { total += 1.0; count++; }
          else if (s == 'negative') { total -= 1.0; count++; }
          else if (s == 'neutral') { total += 0.0; count++; }
        }
      }
      if (count > 0) sentimentScore = total / count;
    }

    // Parse nested objects
    final account = json['account'] as Map<String, dynamic>?;
    final opportunity = json['opportunity'] as Map<String, dynamic>?;
    final owner = json['owner'] as Map<String, dynamic>?;
    final metadata = json['metadata'] as Map<String, dynamic>?;

    return MeetingModel(
      id: id,
      ownerId: ownerId,
      title: title,
      description: description,
      type: MeetingType.fromString(typeStr),
      startTime: startTime != null ? DateTime.parse(startTime) : DateTime.now(),
      endTime: endTime != null
          ? DateTime.parse(endTime)
          : DateTime.now().add(const Duration(hours: 1)),
      location: location,
      meetingLink: meetingLink,
      accountId: accountId,
      opportunityId: opportunityId,
      leadId: leadId,
      recordingUrl: recordingUrl,
      transcriptUrl: transcriptUrl,
      participants: participants,
      status: MeetingStatus.fromString(status),
      botStatus: BotStatus.fromString(botStatus),
      transcript: json['transcript'] as String?,
      summary: json['summary'] as String?,
      actionItems: actionItems,
      sentimentScore: sentimentScore,
      keyTopics: keyTopics,
      metadata: metadata,
      createdAt: createdAtStr != null ? DateTime.parse(createdAtStr) : null,
      updatedAt: updatedAtStr != null ? DateTime.parse(updatedAtStr) : null,
      account: account,
      opportunity: opportunity,
      owner: owner,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ownerId': ownerId,
      'title': title,
      if (description != null) 'description': description,
      'type': type.backendValue,
      'status': status.backendValue,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      if (location != null) 'location': location,
      if (meetingLink != null) 'meetingLink': meetingLink,
      if (accountId != null) 'accountId': accountId,
      if (opportunityId != null) 'opportunityId': opportunityId,
      if (leadId != null) 'leadId': leadId,
      if (recordingUrl != null) 'recordingUrl': recordingUrl,
      if (transcriptUrl != null) 'transcriptUrl': transcriptUrl,
      if (summary != null) 'summary': summary,
      // Web-compatible: emit actionItems as string[]
      'actionItems': actionItems.map((a) => a.toWebString()).toList(),
      if (sentimentScore != null) 'sentimentScore': sentimentScore,
      'keyTopics': keyTopics,
      if (metadata != null) 'metadata': metadata,
      'createdAt': createdAt?.toIso8601String() ?? startTime.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String() ?? startTime.toIso8601String(),
      // Web-compatible: emit participants as objects
      'participants': participants.map((p) => p.toJson()).toList(),
      if (account != null) 'account': account,
      if (opportunity != null) 'opportunity': opportunity,
      if (owner != null) 'owner': owner,
    };
  }

  /// Whether the meeting is upcoming (starts in the future)
  bool get isUpcoming => startTime.isAfter(DateTime.now());

  /// Whether the meeting is in the past
  bool get isPast => endTime.isBefore(DateTime.now());

  /// Status label getter for all 5 statuses
  String get statusLabel {
    switch (status) {
      case MeetingStatus.SCHEDULED:
        return 'Scheduled';
      case MeetingStatus.IN_PROGRESS:
        return 'In Progress';
      case MeetingStatus.COMPLETED:
        return 'Completed';
      case MeetingStatus.CANCELLED:
        return 'Cancelled';
      case MeetingStatus.NO_SHOW:
        return 'No Show';
    }
  }
}

/// Meetings service provider
final meetingsServiceProvider = Provider<MeetingsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return MeetingsService(api, authMode);
});

/// Meetings list provider
final meetingsProvider =
    FutureProvider.autoDispose<List<MeetingModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(meetingsServiceProvider);
  return service.getAll();
});

/// Meeting detail provider (by ID)
final meetingDetailProvider =
    FutureProvider.autoDispose.family<MeetingModel?, String>((ref, id) async {
  ref.watch(authModeProvider);
  final service = ref.watch(meetingsServiceProvider);
  return service.getById(id);
});

/// Service for meetings and meeting intelligence
class MeetingsService {
  final ApiClient _api;
  final AuthMode _authMode;

  MeetingsService(this._api, this._authMode);

  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  /// Get all meetings
  Future<List<MeetingModel>> getAll() async {
    try {
      final response = await _api.get('/meetings');
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
          .map((item) => MeetingModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get a single meeting by ID
  Future<MeetingModel?> getById(String id) async {
    try {
      final response = await _api.get('/meetings/$id');
      return MeetingModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Get meeting transcript
  Future<String?> getTranscript(String id) async {
    try {
      final response = await _api.get('/meetings/$id/transcript');
      final data = response.data;
      if (data is String) return data;
      if (data is Map) return data['transcript'] as String?;
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Get meeting summary
  Future<String?> getSummary(String id) async {
    try {
      final response = await _api.get('/meetings/$id/summary');
      final data = response.data;
      if (data is String) return data;
      if (data is Map) return data['summary'] as String?;
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Get meeting action items
  Future<List<MeetingActionItem>> getActionItems(String id) async {
    try {
      final response = await _api.get('/meetings/$id/action-items');
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
          .map((item) => MeetingActionItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Analyze meeting with AI
  Future<bool> analyze(String id) async {
    try {
      await _api.post('/meetings/$id/analyze');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Generate meeting summary with AI
  Future<String?> generateSummary(String id) async {
    try {
      final response = await _api.post('/meetings/$id/generate-summary');
      final data = response.data;
      if (data is String) return data;
      if (data is Map) return data['summary'] as String?;
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Approve action items from meeting
  Future<bool> approveActions(String id, List<String> actionItemIds) async {
    try {
      await _api.post('/meetings/$id/approve-actions', data: {
        'actionItemIds': actionItemIds,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Join meeting bot for recording
  Future<bool> joinBot(String id) async {
    try {
      await _api.post('/meetings/$id/bot/join');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get bot status for a meeting
  Future<BotStatus> getBotStatus(String id) async {
    try {
      final response = await _api.get('/meetings/$id/bot/status');
      final data = response.data;
      final statusStr = data is Map ? data['status'] as String? : null;
      return BotStatus.fromString(statusStr);
    } catch (e) {
      return BotStatus.notJoined;
    }
  }
}
