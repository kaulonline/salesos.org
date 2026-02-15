import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import 'crm_data_service.dart';

/// Email draft model
class EmailDraft {
  final String id;
  final String recipientEmail;
  final String recipientName;
  final String subject;
  final String body;
  final String entityType;
  final String entityId;
  final String? tone;
  final String? context;
  final DateTime createdAt;

  const EmailDraft({
    required this.id,
    required this.recipientEmail,
    required this.recipientName,
    required this.subject,
    required this.body,
    required this.entityType,
    required this.entityId,
    this.tone,
    this.context,
    required this.createdAt,
  });

  factory EmailDraft.fromJson(Map<String, dynamic> json) {
    return EmailDraft(
      id: json['id'] ?? '',
      recipientEmail: json['recipientEmail'] ?? '',
      recipientName: json['recipientName'] ?? '',
      subject: json['subject'] ?? '',
      body: json['body'] ?? '',
      entityType: json['entityType'] ?? '',
      entityId: json['entityId'] ?? '',
      tone: json['tone'],
      context: json['context'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'recipientEmail': recipientEmail,
        'recipientName': recipientName,
        'subject': subject,
        'body': body,
        'entityType': entityType,
        'entityId': entityId,
        'tone': tone,
        'context': context,
        'createdAt': createdAt.toIso8601String(),
      };

  EmailDraft copyWith({
    String? subject,
    String? body,
    String? tone,
  }) {
    return EmailDraft(
      id: id,
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      subject: subject ?? this.subject,
      body: body ?? this.body,
      entityType: entityType,
      entityId: entityId,
      tone: tone ?? this.tone,
      context: context,
      createdAt: createdAt,
    );
  }
}

/// Email type for different outreach scenarios
enum EmailType {
  followUp,
  checkIn,
  introduction,
  proposal,
  thankYou,
  meetingRequest,
  reEngagement,
}

extension EmailTypeExtension on EmailType {
  String get label {
    switch (this) {
      case EmailType.followUp:
        return 'Follow Up';
      case EmailType.checkIn:
        return 'Check In';
      case EmailType.introduction:
        return 'Introduction';
      case EmailType.proposal:
        return 'Proposal';
      case EmailType.thankYou:
        return 'Thank You';
      case EmailType.meetingRequest:
        return 'Meeting Request';
      case EmailType.reEngagement:
        return 'Re-engagement';
    }
  }

  String get description {
    switch (this) {
      case EmailType.followUp:
        return 'Follow up on a previous conversation or meeting';
      case EmailType.checkIn:
        return 'Casual check-in to maintain the relationship';
      case EmailType.introduction:
        return 'Introduce yourself or your product/service';
      case EmailType.proposal:
        return 'Send a business proposal or offer';
      case EmailType.thankYou:
        return 'Express gratitude after a meeting or action';
      case EmailType.meetingRequest:
        return 'Request a meeting or call';
      case EmailType.reEngagement:
        return 'Re-engage a dormant contact';
    }
  }
}

/// AI Email Draft Service
class AIEmailDraftService {
  final Ref _ref;

  AIEmailDraftService(this._ref);

  /// Generate an AI email draft for an entity
  Future<EmailDraft> generateDraft({
    required String entityType,
    required String entityId,
    required String entityName,
    String? entityEmail,
    EmailType emailType = EmailType.followUp,
    String? additionalContext,
    String? tone,
  }) async {
    try {
      final crmDataService = _ref.read(crmDataServiceProvider);

      // Get entity details for context-aware personalization
      // CrmDataService handles Salesforce/local routing automatically
      final entityDetails = await _getEntityDetails(
        crmDataService,
        entityType,
        entityId,
      );

      // Generate personalized draft using entity context
      return _generatePersonalizedDraft(
        entityType: entityType,
        entityId: entityId,
        entityName: entityName,
        entityEmail: entityEmail,
        emailType: emailType,
        entityDetails: entityDetails,
        tone: tone,
        additionalContext: additionalContext,
      );
    } catch (e) {
      // Return template-based draft on error
      return _generateTemplateDraft(
        entityType: entityType,
        entityId: entityId,
        entityName: entityName,
        entityEmail: entityEmail,
        emailType: emailType,
        tone: tone,
      );
    }
  }

  /// Generate a personalized draft using entity context
  EmailDraft _generatePersonalizedDraft({
    required String entityType,
    required String entityId,
    required String entityName,
    String? entityEmail,
    required EmailType emailType,
    required Map<String, dynamic> entityDetails,
    String? tone,
    String? additionalContext,
  }) {
    final company = entityDetails['company'] as String? ??
        entityDetails['companyName'] as String? ??
        entityDetails['Account']?['Name'] as String? ??
        entityDetails['accountName'] as String?;
    final title = entityDetails['title'] as String? ??
        entityDetails['jobTitle'] as String? ??
        entityDetails['Title'] as String?;
    final stageName = entityDetails['stageName'] as String? ??
        entityDetails['StageName'] as String?;
    final amount = entityDetails['amount'] ?? entityDetails['Amount'];

    // Build personalized body based on context
    String body = _getContextualBody(
      emailType: emailType,
      entityName: entityName,
      company: company,
      title: title,
      stageName: stageName,
      amount: amount,
      additionalContext: additionalContext,
    );

    // Generate contextual subject
    String subject = _getContextualSubject(
      emailType: emailType,
      entityName: entityName,
      company: company,
      stageName: stageName,
    );

    return EmailDraft(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      recipientEmail: entityEmail ?? '',
      recipientName: entityName,
      subject: subject,
      body: body,
      entityType: entityType,
      entityId: entityId,
      tone: tone ?? 'professional',
      context: additionalContext,
      createdAt: DateTime.now(),
    );
  }

  /// Generate contextual email body based on entity data
  String _getContextualBody({
    required EmailType emailType,
    required String entityName,
    String? company,
    String? title,
    String? stageName,
    dynamic amount,
    String? additionalContext,
  }) {
    final companyRef = company != null ? ' at $company' : '';

    switch (emailType) {
      case EmailType.followUp:
        if (stageName != null) {
          return 'I wanted to follow up on our recent discussion regarding the $stageName opportunity.\n\n'
              'I understand timing and priorities can shift, and I\'m here to help address any questions or concerns you might have.\n\n'
              'Would you have time for a brief call this week to discuss next steps?';
        }
        return 'I hope this message finds you well. I wanted to follow up on our previous conversation and see how things are progressing on your end.\n\n'
            'Please let me know if there\'s anything I can help clarify or if you\'d like to schedule a call to discuss further.\n\n'
            'Looking forward to hearing from you.';

      case EmailType.checkIn:
        return 'I hope you\'re doing well$companyRef. It\'s been a little while since we last connected, and I wanted to check in.\n\n'
            'I\'d love to hear how things are going and see if there are any ways I can be helpful.\n\n'
            'Feel free to let me know if you have any questions or if there\'s a good time to catch up.';

      case EmailType.introduction:
        return 'I\'m reaching out to introduce myself and explore how we might be able to work together.\n\n'
            'I\'ve been following $company\'s work and believe there could be some valuable synergies between our organizations.\n\n'
            'I\'d welcome the opportunity to schedule a brief call to learn more about your current priorities and share some ideas that might be relevant.';

      case EmailType.proposal:
        final amountStr = amount != null ? '\$${_formatAmount(amount)}' : 'the discussed';
        return 'Thank you for the opportunity to put together a proposal for your consideration.\n\n'
            'Based on our conversations, I\'ve outlined a solution valued at $amountStr that I believe addresses your key requirements.\n\n'
            'I\'d be happy to walk you through the details and answer any questions. When would be a good time for a follow-up discussion?';

      case EmailType.thankYou:
        return 'Thank you for taking the time to meet with me today. I truly appreciate the opportunity to learn more about your needs$companyRef.\n\n'
            'I found our conversation very insightful and I\'m excited about the potential to work together.\n\n'
            'I\'ll follow up with the information we discussed. In the meantime, please don\'t hesitate to reach out if you have any questions.';

      case EmailType.meetingRequest:
        return 'I\'d like to request a meeting to discuss how we can help $company achieve your goals.\n\n'
            'I have some ideas I\'d love to share with you, and I\'d also like to learn more about your current challenges and priorities.\n\n'
            'Would you have 30 minutes available this week or next for a brief call?';

      case EmailType.reEngagement:
        return 'It\'s been a while since we last connected, and I wanted to reach out to see how things are going$companyRef.\n\n'
            'A lot has changed in our space recently, and I thought it might be valuable to reconnect and share some updates that could be relevant to you.\n\n'
            'I\'d love to catch up when you have a moment. No pressure at all – just wanted to stay in touch.';
    }
  }

  /// Generate contextual subject line
  String _getContextualSubject({
    required EmailType emailType,
    required String entityName,
    String? company,
    String? stageName,
  }) {
    switch (emailType) {
      case EmailType.followUp:
        if (stageName != null) {
          return 'Following Up - $stageName Discussion';
        }
        return 'Following Up on Our Conversation';
      case EmailType.checkIn:
        return company != null ? 'Quick Check-In - $company' : 'Quick Check-In';
      case EmailType.introduction:
        return company != null
            ? 'Introduction - Partnership Opportunity with $company'
            : 'Introduction - Opportunity to Connect';
      case EmailType.proposal:
        return company != null
            ? 'Proposal for $company'
            : 'Proposal for Your Review';
      case EmailType.thankYou:
        return 'Thank You for Your Time';
      case EmailType.meetingRequest:
        return company != null
            ? 'Meeting Request - $company'
            : 'Meeting Request - Let\'s Connect';
      case EmailType.reEngagement:
        return 'Reconnecting - Let\'s Catch Up';
    }
  }

  String _formatAmount(dynamic amount) {
    if (amount == null) return '0';
    final num = double.tryParse(amount.toString()) ?? 0;
    if (num >= 1000000) {
      return '${(num / 1000000).toStringAsFixed(1)}M';
    } else if (num >= 1000) {
      return '${(num / 1000).toStringAsFixed(0)}K';
    }
    return num.toStringAsFixed(0);
  }

  /// Send an email draft
  Future<bool> sendDraft(EmailDraft draft) async {

    try {
      final apiClient = _ref.read(apiClientProvider);

      final response = await apiClient.post(
        '/email/send',
        data: {
          'to': draft.recipientEmail,
          'subject': draft.subject,
          'body': draft.body,
          'entityType': draft.entityType,
          'entityId': draft.entityId,
        },
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  /// Get entity details for context using CrmDataService
  /// This automatically routes to Salesforce or local based on auth mode
  Future<Map<String, dynamic>> _getEntityDetails(
    CrmDataService crmDataService,
    String entityType,
    String entityId,
  ) async {
    try {

      // Determine entity type - check explicit type first, then infer from Salesforce ID prefix
      String resolvedType = entityType.toLowerCase();

      // If type is unknown or generic, infer from Salesforce ID prefix
      if (resolvedType.isEmpty || resolvedType == 'entity' || resolvedType == 'unknown') {
        if (entityId.startsWith('00Q')) {
          resolvedType = 'lead';
        } else if (entityId.startsWith('003')) {
          resolvedType = 'contact';
        } else if (entityId.startsWith('006')) {
          resolvedType = 'opportunity';
        } else if (entityId.startsWith('001')) {
          resolvedType = 'account';
        }
      }

      // Use CrmDataService which handles Salesforce/local routing automatically
      Map<String, dynamic>? result;
      switch (resolvedType) {
        case 'lead':
          result = await crmDataService.getLeadById(entityId);
          break;
        case 'contact':
          result = await crmDataService.getContactById(entityId);
          break;
        case 'opportunity':
          result = await crmDataService.getOpportunityById(entityId);
          break;
        case 'account':
          result = await crmDataService.getAccountById(entityId);
          break;
        default:
          // Default to contact if type is still unknown
          result = await crmDataService.getContactById(entityId);
      }

      if (result != null) {
        return result;
      }
    } catch (e) {
      // Silently ignore
    }
    return {};
  }

  /// Generate subject line based on email type (fallback)
  String _generateSubject(EmailType emailType, String entityName) {
    switch (emailType) {
      case EmailType.followUp:
        return 'Following Up on Our Conversation';
      case EmailType.checkIn:
        return 'Quick Check-In';
      case EmailType.introduction:
        return 'Introduction - Opportunity to Connect';
      case EmailType.proposal:
        return 'Proposal for Your Review';
      case EmailType.thankYou:
        return 'Thank You for Your Time';
      case EmailType.meetingRequest:
        return 'Meeting Request - Let\'s Connect';
      case EmailType.reEngagement:
        return 'It\'s Been a While - Let\'s Reconnect';
    }
  }

  /// Get fallback body when AI generation fails
  String _getFallbackBody(EmailType emailType, String entityName) {
    switch (emailType) {
      case EmailType.followUp:
        return 'I wanted to follow up on our recent conversation and see if you had any questions.\n\nI\'m available to discuss further at your convenience.\n\nLooking forward to hearing from you.';
      case EmailType.checkIn:
        return 'I hope this message finds you well. I wanted to check in and see how things are going.\n\nPlease let me know if there\'s anything I can help with.\n\nLooking forward to connecting soon.';
      case EmailType.introduction:
        return 'I hope this email finds you well. I\'m reaching out to introduce myself and explore potential opportunities to work together.\n\nI would love to schedule a brief call to learn more about your needs.\n\nLooking forward to connecting.';
      case EmailType.proposal:
        return 'I\'m excited to share a proposal that I believe could be valuable for your business.\n\nI\'d welcome the opportunity to discuss this in more detail.\n\nPlease let me know a convenient time to connect.';
      case EmailType.thankYou:
        return 'Thank you for taking the time to meet with me. I truly appreciate the opportunity to learn more about your needs.\n\nI look forward to our continued conversation.\n\nPlease don\'t hesitate to reach out if you have any questions.';
      case EmailType.meetingRequest:
        return 'I would love to schedule a meeting to discuss how we might work together.\n\nWould you have 30 minutes available this week or next?\n\nLooking forward to connecting.';
      case EmailType.reEngagement:
        return 'It\'s been a while since we last connected, and I wanted to reach out to see how things are going.\n\nI\'d love to catch up and hear about what you\'ve been working on.\n\nHope to reconnect soon.';
    }
  }

  /// Generate template-based draft when AI is unavailable
  EmailDraft _generateTemplateDraft({
    required String entityType,
    required String entityId,
    required String entityName,
    String? entityEmail,
    required EmailType emailType,
    String? tone,
  }) {
    return EmailDraft(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      recipientEmail: entityEmail ?? '',
      recipientName: entityName,
      subject: _generateSubject(emailType, entityName),
      body: _getFallbackBody(emailType, entityName),
      entityType: entityType,
      entityId: entityId,
      tone: tone ?? 'professional',
      context: null,
      createdAt: DateTime.now(),
    );
  }
}

/// AI Email Draft Service Provider
final aiEmailDraftServiceProvider = Provider<AIEmailDraftService>((ref) {
  return AIEmailDraftService(ref);
});

/// Draft generation provider (for use in widgets)
final emailDraftProvider = FutureProvider.family<EmailDraft,
    ({String entityType, String entityId, String entityName, String? email, EmailType emailType})>(
  (ref, params) async {
    final service = ref.watch(aiEmailDraftServiceProvider);
    return service.generateDraft(
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      entityEmail: params.email,
      emailType: params.emailType,
    );
  },
);
