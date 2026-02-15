import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Conversation model
class ConversationModel {
  final String id;
  final List<String> participants;
  final String? lastMessage;
  final int unreadCount;
  final DateTime updatedAt;

  ConversationModel({
    required this.id,
    this.participants = const [],
    this.lastMessage,
    this.unreadCount = 0,
    required this.updatedAt,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    final participantsRaw = json['participants'] as List<dynamic>? ?? [];
    final participants = participantsRaw.map((p) {
      if (p is String) return p;
      if (p is Map) return p['name'] as String? ?? p['email'] as String? ?? '';
      return '';
    }).toList();

    final updatedAt = json['updatedAt'] as String? ??
        json['lastMessageAt'] as String? ??
        json['UpdatedDate'] as String?;

    return ConversationModel(
      id: json['id'] as String? ?? json['Id'] as String? ?? '',
      participants: participants,
      lastMessage: json['lastMessage'] as String? ??
          json['lastMessageText'] as String? ??
          json['preview'] as String?,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ??
          (json['unread'] as num?)?.toInt() ??
          0,
      updatedAt: updatedAt != null ? DateTime.parse(updatedAt) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'participants': participants,
      'lastMessage': lastMessage,
      'unreadCount': unreadCount,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  /// Display name: first two participant names or "Group"
  String get displayName {
    if (participants.isEmpty) return 'Unknown';
    if (participants.length == 1) return participants.first;
    if (participants.length == 2) return participants.join(' & ');
    return '${participants.first} + ${participants.length - 1} others';
  }
}

/// Message model
class MessageModel {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime timestamp;
  final bool isRead;

  MessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.timestamp,
    this.isRead = false,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    final timestamp = json['timestamp'] as String? ??
        json['createdAt'] as String? ??
        json['sentAt'] as String?;

    return MessageModel(
      id: json['id'] as String? ?? json['Id'] as String? ?? '',
      conversationId: json['conversationId'] as String? ??
          json['threadId'] as String? ??
          '',
      senderId: json['senderId'] as String? ??
          json['fromId'] as String? ??
          '',
      senderName: json['senderName'] as String? ??
          json['fromName'] as String? ??
          json['sender']?['name'] as String? ??
          'Unknown',
      content: json['content'] as String? ??
          json['text'] as String? ??
          json['body'] as String? ??
          '',
      timestamp:
          timestamp != null ? DateTime.parse(timestamp) : DateTime.now(),
      isRead: json['isRead'] as bool? ?? json['read'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversationId': conversationId,
      'senderId': senderId,
      'senderName': senderName,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
    };
  }
}

/// Messages service provider
final messagesServiceProvider = Provider<MessagesService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return MessagesService(api, authMode);
});

/// Conversations list provider
final conversationsProvider =
    FutureProvider.autoDispose<List<ConversationModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(messagesServiceProvider);
  return service.getConversations();
});

/// Messages provider (by conversation ID)
final messagesProvider = FutureProvider.autoDispose
    .family<List<MessageModel>, String>((ref, conversationId) async {
  ref.watch(authModeProvider);
  final service = ref.watch(messagesServiceProvider);
  return service.getMessages(conversationId);
});

/// Service for team messaging
class MessagesService {
  final ApiClient _api;
  final AuthMode _authMode;

  MessagesService(this._api, this._authMode);

  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  /// Get all conversations
  Future<List<ConversationModel>> getConversations() async {
    try {
      final response = await _api.get('/messages/conversations');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      } else if (data is Map && data['conversations'] is List) {
        items = data['conversations'] as List;
      }

      return items
          .map((item) =>
              ConversationModel.fromJson(item as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    } catch (e) {
      return [];
    }
  }

  /// Start a new conversation
  Future<ConversationModel?> startConversation(
      List<String> participantIds, String? initialMessage) async {
    try {
      final response = await _api.post('/messages/conversations', data: {
        'participantIds': participantIds,
        'message': ?initialMessage,
      });
      return ConversationModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Get messages for a conversation
  Future<List<MessageModel>> getMessages(String conversationId) async {
    try {
      final response =
          await _api.get('/messages/conversations/$conversationId/messages');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['messages'] is List) {
        items = data['messages'] as List;
      }

      return items
          .map((item) => MessageModel.fromJson(item as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    } catch (e) {
      return [];
    }
  }

  /// Send a message in a conversation
  Future<MessageModel?> sendMessage(
      String conversationId, String content) async {
    try {
      final response = await _api.post(
        '/messages/conversations/$conversationId/messages',
        data: {'content': content},
      );
      return MessageModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }
}
