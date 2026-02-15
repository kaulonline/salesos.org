import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Email template model
class EmailTemplateModel {
  final String id;
  final String name;
  final String subject;
  final String body;
  final String? category;

  EmailTemplateModel({
    required this.id,
    required this.name,
    required this.subject,
    required this.body,
    this.category,
  });

  factory EmailTemplateModel.fromJson(Map<String, dynamic> json) {
    return EmailTemplateModel(
      id: json['id'] as String? ?? json['Id'] as String? ?? '',
      name: json['name'] as String? ?? json['Name'] as String? ?? 'Untitled',
      subject: json['subject'] as String? ??
          json['Subject'] as String? ??
          '',
      body: json['body'] as String? ??
          json['htmlBody'] as String? ??
          json['Body'] as String? ??
          '',
      category: json['category'] as String? ??
          json['type'] as String? ??
          json['FolderId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'subject': subject,
      'body': body,
      'category': category,
    };
  }
}

/// Email tracking model
class EmailTrackingModel {
  final String id;
  final String emailId;
  final int opens;
  final int clicks;
  final DateTime? lastOpened;

  EmailTrackingModel({
    required this.id,
    required this.emailId,
    this.opens = 0,
    this.clicks = 0,
    this.lastOpened,
  });

  factory EmailTrackingModel.fromJson(Map<String, dynamic> json) {
    final lastOpened = json['lastOpened'] as String? ??
        json['lastOpenedAt'] as String?;

    return EmailTrackingModel(
      id: json['id'] as String? ?? json['Id'] as String? ?? '',
      emailId: json['emailId'] as String? ?? json['messageId'] as String? ?? '',
      opens: (json['opens'] as num?)?.toInt() ??
          (json['openCount'] as num?)?.toInt() ??
          0,
      clicks: (json['clicks'] as num?)?.toInt() ??
          (json['clickCount'] as num?)?.toInt() ??
          0,
      lastOpened:
          lastOpened != null ? DateTime.tryParse(lastOpened) : null,
    );
  }
}

/// Email service provider
final emailServiceProvider = Provider<EmailService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return EmailService(api, authMode);
});

/// Email templates list provider
final emailTemplatesProvider =
    FutureProvider.autoDispose<List<EmailTemplateModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(emailServiceProvider);
  return service.getTemplates();
});

/// Service for email templates and sending
class EmailService {
  final ApiClient _api;
  final AuthMode _authMode;

  EmailService(this._api, this._authMode);

  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  /// Get all email templates
  Future<List<EmailTemplateModel>> getTemplates() async {
    try {
      final response = await _api.get('/email/templates');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['templates'] is List) {
        items = data['templates'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      }

      return items
          .map((item) =>
              EmailTemplateModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get a single email template by ID
  Future<EmailTemplateModel?> getTemplate(String id) async {
    try {
      final response = await _api.get('/email/templates/$id');
      return EmailTemplateModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Send an email
  Future<bool> sendEmail({
    required String to,
    required String subject,
    required String body,
    bool trackOpens = false,
    bool trackClicks = false,
  }) async {
    try {
      await _api.post('/email/send', data: {
        'to': to,
        'subject': subject,
        'body': body,
        'trackOpens': trackOpens,
        'trackClicks': trackClicks,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get email tracking data
  Future<EmailTrackingModel?> getTracking(String emailId) async {
    try {
      final response = await _api.get('/email/tracking/$emailId');
      return EmailTrackingModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }
}
