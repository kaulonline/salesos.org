import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/ai_chat/data/chat_service.dart';
import '../providers/auth_mode_provider.dart';

/// Types of entities that can be extracted from text
enum ExtractableEntityType {
  lead,
  contact,
  account,
  meeting,
  task,
}

/// Result of AI extraction
class SmartFillResult {
  final bool success;
  final Map<String, dynamic> extractedData;
  final String? errorMessage;
  final double? confidence;

  SmartFillResult({
    required this.success,
    this.extractedData = const {},
    this.errorMessage,
    this.confidence,
  });

  factory SmartFillResult.success(Map<String, dynamic> data, {double? confidence}) {
    return SmartFillResult(
      success: true,
      extractedData: data,
      confidence: confidence,
    );
  }

  factory SmartFillResult.error(String message) {
    return SmartFillResult(
      success: false,
      errorMessage: message,
    );
  }
}

/// Service for AI-powered smart fill functionality
class SmartFillService {
  final ChatService _chatService;
  final String _crmMode;

  SmartFillService(this._chatService, this._crmMode);

  /// Extract contact/lead information from text (business card, email signature, etc.)
  Future<SmartFillResult> extractContactInfo(String text) async {
    if (text.trim().isEmpty) {
      return SmartFillResult.error('No text provided');
    }

    try {
      final conversation = await _chatService.createConversation();

      final prompt = '''Extract contact information from the following text and return it as a JSON object.

Text to extract from:
"""
$text
"""

Return a JSON object with these fields (only include fields where you found data):
{
  "firstName": "extracted first name",
  "lastName": "extracted last name",
  "email": "extracted email address",
  "phone": "extracted phone number",
  "mobilePhone": "extracted mobile/cell number",
  "title": "job title",
  "company": "company name",
  "department": "department",
  "website": "company website",
  "street": "street address",
  "city": "city",
  "state": "state/province",
  "postalCode": "zip/postal code",
  "country": "country",
  "linkedIn": "LinkedIn URL if found",
  "notes": "any other relevant information"
}

IMPORTANT:
- Only return the JSON object, no other text
- If you can't find a field, don't include it
- Clean up phone numbers to a standard format
- Extract email domains to infer company name if not explicit''';

      final response = await _chatService.sendMessage(
        conversationId: conversation.id,
        message: prompt,
        mode: _crmMode,
      );

      // Clean up temporary conversation to avoid polluting chat history
      await _chatService.deleteConversation(conversation.id);

      if (response != null) {
        final extracted = _parseJsonResponse(response.content);
        if (extracted.isNotEmpty) {
          return SmartFillResult.success(extracted, confidence: 0.85);
        }
      }

      return SmartFillResult.error('Could not extract information');
    } catch (e) {
      return SmartFillResult.error('Extraction failed: $e');
    }
  }

  /// Extract account/company information from text or company name
  Future<SmartFillResult> extractAccountInfo(String text) async {
    if (text.trim().isEmpty) {
      return SmartFillResult.error('No text provided');
    }

    try {
      final conversation = await _chatService.createConversation();

      final prompt = '''Extract company/account information from the following text and return it as a JSON object.

Text to extract from:
"""
$text
"""

Return a JSON object with these fields (only include fields where you found or can reasonably infer data):
{
  "name": "company name",
  "website": "company website",
  "phone": "main phone number",
  "industry": "industry category",
  "type": "Customer, Prospect, Partner, etc.",
  "description": "brief company description",
  "billingStreet": "street address",
  "billingCity": "city",
  "billingState": "state/province",
  "billingPostalCode": "zip/postal code",
  "billingCountry": "country",
  "numberOfEmployees": estimated number of employees as integer,
  "annualRevenue": estimated annual revenue as number
}

IMPORTANT:
- Only return the JSON object, no other text
- If you can't find a field, don't include it
- Use your knowledge to suggest industry based on company name if not explicit
- numberOfEmployees and annualRevenue should be numbers, not strings''';

      final response = await _chatService.sendMessage(
        conversationId: conversation.id,
        message: prompt,
        mode: _crmMode,
      );

      // Clean up temporary conversation to avoid polluting chat history
      await _chatService.deleteConversation(conversation.id);

      if (response != null) {
        final extracted = _parseJsonResponse(response.content);
        if (extracted.isNotEmpty) {
          return SmartFillResult.success(extracted, confidence: 0.75);
        }
      }

      return SmartFillResult.error('Could not extract information');
    } catch (e) {
      return SmartFillResult.error('Extraction failed: $e');
    }
  }

  /// Extract meeting/task details from natural language
  Future<SmartFillResult> extractTaskInfo(String text) async {
    if (text.trim().isEmpty) {
      return SmartFillResult.error('No text provided');
    }

    try {
      final conversation = await _chatService.createConversation();

      final now = DateTime.now();
      final prompt = '''Extract task or meeting information from the following text and return it as a JSON object.

Current date/time: ${now.toIso8601String()}

Text to extract from:
"""
$text
"""

Return a JSON object with these fields (only include fields where you found data):
{
  "subject": "task or meeting subject/title",
  "description": "detailed description",
  "type": "Call, Meeting, Email, Task, or Other",
  "priority": "High, Normal, or Low",
  "dueDate": "ISO date string (YYYY-MM-DD)",
  "dueTime": "time in HH:MM format (24hr)",
  "duration": duration in minutes as integer,
  "relatedToName": "name of related contact/account if mentioned",
  "location": "meeting location if mentioned",
  "reminder": true or false
}

IMPORTANT:
- Only return the JSON object, no other text
- Parse relative dates like "tomorrow", "next Tuesday", "in 2 days" into actual dates
- If no due date mentioned, default to tomorrow
- If no priority mentioned, default to "Normal"''';

      final response = await _chatService.sendMessage(
        conversationId: conversation.id,
        message: prompt,
        mode: _crmMode,
      );

      // Clean up temporary conversation to avoid polluting chat history
      await _chatService.deleteConversation(conversation.id);

      if (response != null) {
        final extracted = _parseJsonResponse(response.content);
        if (extracted.isNotEmpty) {
          return SmartFillResult.success(extracted, confidence: 0.80);
        }
      }

      return SmartFillResult.error('Could not extract information');
    } catch (e) {
      return SmartFillResult.error('Extraction failed: $e');
    }
  }

  /// Get clipboard text for smart fill
  Future<String?> getClipboardText() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      return data?.text;
    } catch (e) {
      return null;
    }
  }

  /// Auto-detect entity type from text
  Future<ExtractableEntityType> detectEntityType(String text) async {
    final lowerText = text.toLowerCase();

    // Simple heuristics for quick detection
    if (lowerText.contains('meeting') ||
        lowerText.contains('schedule') ||
        lowerText.contains('call with') ||
        lowerText.contains('appointment')) {
      return ExtractableEntityType.meeting;
    }

    if (lowerText.contains('task') ||
        lowerText.contains('todo') ||
        lowerText.contains('remind') ||
        lowerText.contains('follow up')) {
      return ExtractableEntityType.task;
    }

    // Check for contact-like patterns
    final hasEmail = RegExp(r'[\w\.-]+@[\w\.-]+\.\w+').hasMatch(text);
    final hasPhone = RegExp(r'[\d\-\(\)\+\s]{10,}').hasMatch(text);
    final hasName = text.split('\n').any((line) {
      final words = line.trim().split(' ');
      return words.length >= 2 &&
          words.length <= 4 &&
          words.every((w) => w.isNotEmpty && w[0] == w[0].toUpperCase());
    });

    if (hasEmail || hasPhone || hasName) {
      return ExtractableEntityType.contact;
    }

    // Default to contact/lead
    return ExtractableEntityType.lead;
  }

  /// Suggest company info from email domain
  Future<SmartFillResult> suggestFromEmailDomain(String email) async {
    final domainMatch = RegExp(r'@([\w\.-]+)').firstMatch(email);
    if (domainMatch == null) {
      return SmartFillResult.error('Invalid email format');
    }

    final domain = domainMatch.group(1)!;

    // Skip common personal email domains
    final personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    if (personalDomains.contains(domain.toLowerCase())) {
      return SmartFillResult.error('Personal email domain');
    }

    // Extract company name from domain
    final companyName = domain
        .replaceAll(RegExp(r'\.(com|org|net|io|co|ai)$'), '')
        .split('.')
        .last
        .replaceAll('-', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty ? '${word[0].toUpperCase()}${word.substring(1)}' : '')
        .join(' ');

    return SmartFillResult.success({
      'company': companyName,
      'website': 'https://www.$domain',
    }, confidence: 0.6);
  }

  /// Parse JSON from AI response
  Map<String, dynamic> _parseJsonResponse(String response) {
    try {
      // Find JSON in response
      final jsonMatch = RegExp(r'\{[\s\S]*\}').firstMatch(response);
      if (jsonMatch != null) {
        final jsonStr = jsonMatch.group(0)!;
        return Map<String, dynamic>.from(jsonDecode(jsonStr));
      }
    } catch (e) {
      // Silently ignore
    }
    return {};
  }
}

/// Provider for SmartFillService
final smartFillServiceProvider = Provider<SmartFillService>((ref) {
  final chatService = ref.watch(chatServiceProvider);
  final authMode = ref.watch(authModeProvider);
  final crmMode = authMode == AuthMode.salesforce ? 'salesforce' : 'local';
  return SmartFillService(chatService, crmMode);
});
