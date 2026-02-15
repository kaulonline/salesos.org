import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/api_client.dart';

/// Represents a tool that was executed during a voice call
class VoiceCallTool {
  final String name;
  final String? result;
  final DateTime executedAt;

  VoiceCallTool({
    required this.name,
    this.result,
    required this.executedAt,
  });

  factory VoiceCallTool.fromJson(Map<String, dynamic> json) {
    return VoiceCallTool(
      name: json['name'] as String? ?? '',
      result: json['result'] as String?,
      executedAt: json['executedAt'] != null
          ? DateTime.parse(json['executedAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'result': result,
        'executedAt': executedAt.toIso8601String(),
      };
}

/// Represents a turn in a voice conversation
class VoiceCallTurn {
  final String id;
  final String role; // 'user' or 'assistant'
  final String? transcript;
  final DateTime timestamp;

  VoiceCallTurn({
    required this.id,
    required this.role,
    this.transcript,
    required this.timestamp,
  });

  factory VoiceCallTurn.fromJson(Map<String, dynamic> json) {
    return VoiceCallTurn(
      id: json['id'] as String? ?? '',
      role: json['role'] as String? ?? 'user',
      transcript: json['transcript'] as String?,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role,
        'transcript': transcript,
        'timestamp': timestamp.toIso8601String(),
      };
}

/// Represents a complete voice call session
class VoiceCallSession {
  final String id;
  final DateTime startedAt;
  final DateTime? endedAt;
  final Duration duration;
  final List<VoiceCallTurn> turns;
  final List<VoiceCallTool> toolsUsed;
  final String? summary;
  final int userTurnCount;
  final int assistantTurnCount;
  final bool userSpoke;

  VoiceCallSession({
    required this.id,
    required this.startedAt,
    this.endedAt,
    required this.duration,
    required this.turns,
    required this.toolsUsed,
    this.summary,
    required this.userTurnCount,
    required this.assistantTurnCount,
    required this.userSpoke,
  });

  factory VoiceCallSession.fromJson(Map<String, dynamic> json) {
    final turnsList = json['turns'] as List<dynamic>? ?? [];
    final toolsList = json['toolsUsed'] as List<dynamic>? ?? [];

    return VoiceCallSession(
      id: json['id'] as String? ?? '',
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'] as String)
          : DateTime.now(),
      endedAt: json['endedAt'] != null
          ? DateTime.parse(json['endedAt'] as String)
          : null,
      duration: Duration(milliseconds: json['durationMs'] as int? ?? 0),
      turns: turnsList
          .map((t) => VoiceCallTurn.fromJson(t as Map<String, dynamic>))
          .toList(),
      toolsUsed: toolsList
          .map((t) => VoiceCallTool.fromJson(t as Map<String, dynamic>))
          .toList(),
      summary: json['summary'] as String?,
      userTurnCount: json['userTurnCount'] as int? ?? 0,
      assistantTurnCount: json['assistantTurnCount'] as int? ?? 0,
      userSpoke: json['userSpoke'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'startedAt': startedAt.toIso8601String(),
        'endedAt': endedAt?.toIso8601String(),
        'durationMs': duration.inMilliseconds,
        'turns': turns.map((t) => t.toJson()).toList(),
        'toolsUsed': toolsUsed.map((t) => t.toJson()).toList(),
        'summary': summary,
        'userTurnCount': userTurnCount,
        'assistantTurnCount': assistantTurnCount,
        'userSpoke': userSpoke,
      };

  /// Get a formatted duration string (e.g., "2m 30s")
  String get formattedDuration {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;

    if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    }
    return '${seconds}s';
  }

  /// Get the total number of turns
  int get totalTurns => userTurnCount + assistantTurnCount;

  /// Get a brief summary for display
  String get displaySummary {
    if (summary != null && summary!.isNotEmpty) {
      return summary!;
    }

    // Generate summary from first assistant response
    final firstAssistantTurn = turns.firstWhere(
      (t) => t.role == 'assistant' && t.transcript != null,
      orElse: () => VoiceCallTurn(
        id: '',
        role: 'assistant',
        transcript: 'Voice conversation',
        timestamp: startedAt,
      ),
    );

    final transcript = firstAssistantTurn.transcript ?? 'Voice conversation';
    if (transcript.length > 100) {
      return '${transcript.substring(0, 100)}...';
    }
    return transcript;
  }

  /// Get unique tool names used
  List<String> get uniqueToolNames {
    final names = <String>{};
    for (final tool in toolsUsed) {
      names.add(tool.name);
    }
    return names.toList();
  }
}

/// State for managing call history
class CallHistoryState {
  final List<VoiceCallSession> sessions;
  final bool isLoading;
  final String? error;

  const CallHistoryState({
    this.sessions = const [],
    this.isLoading = false,
    this.error,
  });

  CallHistoryState copyWith({
    List<VoiceCallSession>? sessions,
    bool? isLoading,
    String? error,
  }) {
    return CallHistoryState(
      sessions: sessions ?? this.sessions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Service for persisting and retrieving voice call history
/// Uses local storage for privacy and performance
class CallHistoryService extends Notifier<CallHistoryState> {
  static const String _storageKey = 'iris_voice_call_history';
  static const int _maxStoredSessions = 100; // Limit storage

  // API client for optional backend sync
  ApiClient? _apiClient;

  @override
  CallHistoryState build() {
    _apiClient = ref.watch(apiClientProvider);
    // Load call history on initialization
    _loadCallHistory();
    return const CallHistoryState(isLoading: true);
  }

  /// Load call history from local storage
  Future<void> _loadCallHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);

      if (jsonString == null || jsonString.isEmpty) {
        state = const CallHistoryState(isLoading: false);
        return;
      }

      final List<dynamic> jsonList = jsonDecode(jsonString);
      final sessions = jsonList
          .map((json) => VoiceCallSession.fromJson(json as Map<String, dynamic>))
          .toList();

      // Sort by most recent first
      sessions.sort((a, b) => b.startedAt.compareTo(a.startedAt));

      state = CallHistoryState(
        sessions: sessions,
        isLoading: false,
      );
    } catch (e) {
      state = CallHistoryState(
        isLoading: false,
        error: 'Failed to load call history: $e',
      );
    }
  }

  /// Save call history to local storage
  Future<void> _saveCallHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = state.sessions.map((s) => s.toJson()).toList();
      await prefs.setString(_storageKey, jsonEncode(jsonList));
    } catch (e) {
      // Silently handle save errors - data will be re-saved on next operation
    }
  }

  /// Save a new call session
  Future<void> saveCallSession(VoiceCallSession session) async {
    // Add to the beginning of the list (most recent first)
    final updatedSessions = [session, ...state.sessions];

    // Limit the number of stored sessions
    final limitedSessions = updatedSessions.length > _maxStoredSessions
        ? updatedSessions.sublist(0, _maxStoredSessions)
        : updatedSessions;

    state = state.copyWith(sessions: limitedSessions);
    await _saveCallHistory();

    // Optionally sync to backend for analytics
    _syncToBackend(session);
  }

  /// Get all call sessions
  List<VoiceCallSession> getCallHistory() {
    return state.sessions;
  }

  /// Get a specific call session by ID
  VoiceCallSession? getCallSession(String id) {
    try {
      return state.sessions.firstWhere((s) => s.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Delete a specific call session
  Future<bool> deleteCallSession(String id) async {
    final updatedSessions = state.sessions.where((s) => s.id != id).toList();
    state = state.copyWith(sessions: updatedSessions);
    await _saveCallHistory();
    return true;
  }

  /// Delete all call history
  Future<void> clearAllHistory() async {
    state = state.copyWith(sessions: []);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }

  /// Get sessions from a specific date range
  List<VoiceCallSession> getSessionsInRange(DateTime start, DateTime end) {
    return state.sessions.where((s) {
      return s.startedAt.isAfter(start) && s.startedAt.isBefore(end);
    }).toList();
  }

  /// Get sessions from today
  List<VoiceCallSession> getTodaySessions() {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    return getSessionsInRange(startOfDay, endOfDay);
  }

  /// Get total duration of all calls
  Duration getTotalCallDuration() {
    return state.sessions.fold(
      Duration.zero,
      (total, session) => total + session.duration,
    );
  }

  /// Get call statistics
  Map<String, dynamic> getCallStatistics() {
    final sessions = state.sessions;
    final totalDuration = getTotalCallDuration();

    // Count tool usage
    final toolCounts = <String, int>{};
    for (final session in sessions) {
      for (final tool in session.toolsUsed) {
        toolCounts[tool.name] = (toolCounts[tool.name] ?? 0) + 1;
      }
    }

    // Find most used tools
    final sortedTools = toolCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return {
      'totalCalls': sessions.length,
      'totalDurationMs': totalDuration.inMilliseconds,
      'totalDurationFormatted': _formatDuration(totalDuration),
      'averageDurationMs': sessions.isEmpty
          ? 0
          : totalDuration.inMilliseconds ~/ sessions.length,
      'totalToolsUsed': sessions.fold(
        0,
        (sum, s) => sum + s.toolsUsed.length,
      ),
      'mostUsedTools':
          sortedTools.take(5).map((e) => {'name': e.key, 'count': e.value}).toList(),
      'callsToday': getTodaySessions().length,
    };
  }

  /// Format duration for display
  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    final seconds = duration.inSeconds % 60;

    if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    }
    return '${seconds}s';
  }

  /// Optionally sync call session to backend for analytics
  /// This is fire-and-forget - failures are ignored
  /// Uses POST /api/realtime/sessions endpoint
  Future<void> _syncToBackend(VoiceCallSession session) async {
    if (_apiClient == null) return;

    try {
      await _apiClient!.post(
        '/realtime/sessions',
        data: {
          'sessionId': session.id,
          'startedAt': session.startedAt.toIso8601String(),
          'endedAt': session.endedAt?.toIso8601String(),
          'durationMs': session.duration.inMilliseconds,
          'userTurnCount': session.userTurnCount,
          'assistantTurnCount': session.assistantTurnCount,
          'toolsUsed': session.uniqueToolNames,
          'userSpoke': session.userSpoke,
          'summary': session.summary,
        },
      );
    } catch (e) {
      // Silently ignore backend sync failures
      // Local storage is the primary source of truth
    }
  }

  /// Refresh call history from local storage
  Future<void> refresh() async {
    state = state.copyWith(isLoading: true);
    await _loadCallHistory();
  }
}

/// Provider for CallHistoryService
final callHistoryProvider =
    NotifierProvider<CallHistoryService, CallHistoryState>(() {
  return CallHistoryService();
});

/// Provider for quick access to call history list
final callHistoryListProvider = Provider<List<VoiceCallSession>>((ref) {
  return ref.watch(callHistoryProvider).sessions;
});

/// Provider for call statistics
final callStatisticsProvider = Provider<Map<String, dynamic>>((ref) {
  final callHistory = ref.watch(callHistoryProvider.notifier);
  return callHistory.getCallStatistics();
});
