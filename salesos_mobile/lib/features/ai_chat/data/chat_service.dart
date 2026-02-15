import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/exceptions.dart';
import '../../../core/services/error_reporting_service.dart';

/// Chat message model
class ChatMessageModel {
  final String id;
  final String content;
  final String role; // 'user' or 'assistant'
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  ChatMessageModel({
    required this.id,
    required this.content,
    required this.role,
    required this.createdAt,
    this.metadata,
  });

  bool get isUser => role == 'user';

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id'] as String? ?? '',
      content: json['content'] as String? ?? '',
      role: json['role'] as String? ?? 'assistant',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'role': role,
      'createdAt': createdAt.toIso8601String(),
      if (metadata != null) 'metadata': metadata,
    };
  }
}

/// Conversation model
class ConversationModel {
  final String id;
  final String? title;
  final List<ChatMessageModel> messages;
  final DateTime createdAt;
  final DateTime updatedAt;

  ConversationModel({
    required this.id,
    this.title,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    final messagesJson = json['messages'] as List<dynamic>? ?? [];
    return ConversationModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String?,
      messages: messagesJson
          .map((m) => ChatMessageModel.fromJson(m as Map<String, dynamic>))
          .toList(),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }
}

/// Chat service provider
final chatServiceProvider = Provider<ChatService>((ref) {
  final api = ref.watch(apiClientProvider);
  final errorService = ref.watch(errorReportingServiceProvider);
  return ChatService(api, errorService);
});

/// Current conversation provider
final currentConversationProvider = NotifierProvider<CurrentConversationNotifier, String?>(CurrentConversationNotifier.new);

class CurrentConversationNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void setConversation(String? id) => state = id;
}

/// Service for AI chat functionality
class ChatService {
  final ApiClient _api;
  final ErrorReportingService _errorService;

  ChatService(this._api, this._errorService);

  /// Extract and report error
  AppException _handleError(dynamic error, String context) {
    AppException appError;
    if (error is DioException && error.error is AppException) {
      appError = error.error as AppException;
    } else if (error is AppException) {
      appError = error;
    } else {
      appError = UnknownException(
        message: 'An error occurred during $context',
        originalError: error,
      );
    }

    // Report error to error service
    _errorService.reportError(
      appError,
      stackTrace: StackTrace.current,
      context: ErrorContext(
        screenName: 'ChatService',
        action: context,
      ),
    );

    return appError;
  }

  /// Create a new conversation
  /// Throws [AppException] on error
  Future<ConversationModel> createConversation() async {
    try {
      final response = await _api.post('/conversations');
      return ConversationModel.fromJson(response.data);
    } catch (e) {
      throw _handleError(e, 'createConversation');
    }
  }

  /// Get a conversation by ID
  /// Throws [AppException] on error
  Future<ConversationModel> getConversation(String conversationId) async {
    try {
      final response = await _api.get('/conversations/$conversationId');
      return ConversationModel.fromJson(response.data);
    } catch (e) {
      throw _handleError(e, 'getConversation');
    }
  }

  /// Get all conversations for the user
  /// Returns empty list on error (with error reported)
  Future<List<ConversationModel>> getConversations() async {
    try {
      final response = await _api.get('/conversations');
      final data = response.data;
      if (data is List) {
        return data
            .map((c) => ConversationModel.fromJson(c as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      _handleError(e, 'getConversations');
      return []; // Return empty list but error is reported
    }
  }

  /// Send a message and get AI response
  /// [mode] can be 'local', 'salesforce', or 'documents'
  Future<ChatMessageModel?> sendMessage({
    required String conversationId,
    required String message,
    String? mode,
  }) async {
    try {
      final response = await _api.post(
        '/conversations/$conversationId/messages',
        data: {
          'content': message,
          'mode': ?mode,
        },
      );

      // The API response structure is:
      // { conversation: {...}, userMessage: {...}, assistantMessage: {...} }
      final data = response.data;
      if (data is Map<String, dynamic>) {
        // Extract the assistant message from the response
        final assistantMessage = data['assistantMessage'];
        if (assistantMessage is Map<String, dynamic>) {
          final content = assistantMessage['content'];
          // Content could be a string or needs to be extracted from nested structure
          String responseContent = '';
          if (content is String) {
            responseContent = content;
          } else if (content is List) {
            // Handle case where content is an array of text blocks
            responseContent = content
                .whereType<Map>()
                .where((block) => block['type'] == 'text')
                .map((block) => block['text'] as String? ?? '')
                .join('\n');
          }

          if (responseContent.isNotEmpty) {
            return ChatMessageModel(
              id: assistantMessage['id'] as String? ??
                  DateTime.now().millisecondsSinceEpoch.toString(),
              content: _cleanResponse(responseContent),
              role: 'assistant',
              createdAt: assistantMessage['createdAt'] != null
                  ? DateTime.parse(assistantMessage['createdAt'] as String)
                  : DateTime.now(),
              metadata: assistantMessage['metadata'] as Map<String, dynamic>?,
            );
          }
        }

        // Fallback: Check for direct response field
        if (data['response'] != null && data['response'] is String) {
          return ChatMessageModel(
            id: data['id'] as String? ?? DateTime.now().millisecondsSinceEpoch.toString(),
            content: _cleanResponse(data['response'] as String),
            role: 'assistant',
            createdAt: DateTime.now(),
            metadata: data['metadata'] as Map<String, dynamic>?,
          );
        }

        // Or it might be a message object directly
        if (data['content'] != null && data['content'] is String) {
          return ChatMessageModel.fromJson(data);
        }
      }

      return null;
    } catch (e) {
      _handleError(e, 'sendMessage');
      return null; // Return null but error is reported
    }
  }

  /// Clean and format AI response
  String _cleanResponse(String response) {
    // Remove any excessive newlines or whitespace
    var cleaned = response.trim();

    // Remove any system-level markers if present
    cleaned = cleaned.replaceAll(RegExp(r'\[(?:IRIS|SalesOS)\]:\s*'), '');

    return cleaned;
  }

  /// Delete a conversation
  /// Throws [AppException] on error
  Future<void> deleteConversation(String conversationId) async {
    try {
      await _api.delete('/conversations/$conversationId');
    } catch (e) {
      throw _handleError(e, 'deleteConversation');
    }
  }

  /// Clear conversation history (deletes the conversation on the backend)
  /// Throws [AppException] on error
  Future<void> clearConversation(String conversationId) async {
    try {
      await _api.delete('/conversations/$conversationId');
    } catch (e) {
      throw _handleError(e, 'clearConversation');
    }
  }
}
