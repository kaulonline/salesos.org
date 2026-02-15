import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Coaching session model
class CoachingSessionModel {
  final String id;
  final String? scenarioId;
  final String? scenarioName;
  final String status; // 'pending', 'in_progress', 'completed', 'analyzed'
  final int? score;
  final String? feedback;
  final String? recordingUrl;
  final DateTime createdAt;

  const CoachingSessionModel({
    required this.id,
    this.scenarioId,
    this.scenarioName,
    required this.status,
    this.score,
    this.feedback,
    this.recordingUrl,
    required this.createdAt,
  });

  factory CoachingSessionModel.fromJson(Map<String, dynamic> json) {
    return CoachingSessionModel(
      id: json['id'] as String? ?? '',
      scenarioId: json['scenarioId'] as String?,
      scenarioName: json['scenarioName'] as String? ??
          json['scenario']?['name'] as String?,
      status: json['status'] as String? ?? 'pending',
      score: (json['score'] as num?)?.toInt(),
      feedback: json['feedback'] as String?,
      recordingUrl: json['recordingUrl'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  bool get isCompleted => status == 'completed' || status == 'analyzed';
  bool get hasScore => score != null;
}

/// Coaching scenario model
class CoachingScenarioModel {
  final String id;
  final String name;
  final String? description;
  final String difficulty; // 'beginner', 'intermediate', 'advanced'
  final String? category;

  const CoachingScenarioModel({
    required this.id,
    required this.name,
    this.description,
    required this.difficulty,
    this.category,
  });

  factory CoachingScenarioModel.fromJson(Map<String, dynamic> json) {
    return CoachingScenarioModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Untitled',
      description: json['description'] as String?,
      difficulty: json['difficulty'] as String? ?? 'intermediate',
      category: json['category'] as String?,
    );
  }
}

/// Coaching progress model
class CoachingProgressModel {
  final int totalSessions;
  final double avgScore;
  final int completedScenarios;
  final int streak;

  const CoachingProgressModel({
    required this.totalSessions,
    required this.avgScore,
    required this.completedScenarios,
    required this.streak,
  });

  factory CoachingProgressModel.fromJson(Map<String, dynamic> json) {
    return CoachingProgressModel(
      totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
      avgScore: (json['avgScore'] as num?)?.toDouble() ?? 0,
      completedScenarios: (json['completedScenarios'] as num?)?.toInt() ?? 0,
      streak: (json['streak'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Coaching service provider
final coachingServiceProvider = Provider<CoachingService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return CoachingService(api, authMode);
});

/// Coaching sessions provider
final coachingSessionsProvider =
    FutureProvider.autoDispose<List<CoachingSessionModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(coachingServiceProvider);
  return service.getSessions();
});

/// Coaching progress provider
final coachingProgressProvider =
    FutureProvider.autoDispose<CoachingProgressModel>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(coachingServiceProvider);
  return service.getProgress();
});

/// Coaching scenarios provider
final coachingScenariosProvider =
    FutureProvider.autoDispose<List<CoachingScenarioModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(coachingServiceProvider);
  return service.getScenarios();
});

/// Service for coaching module
class CoachingService {
  final ApiClient _api;

  CoachingService(this._api, AuthMode _);

  /// Get all coaching sessions
  Future<List<CoachingSessionModel>> getSessions() async {
    try {
      final response = await _api.get('/coaching/sessions');
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
          .map((item) =>
              CoachingSessionModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Get a single session by ID
  Future<CoachingSessionModel?> getSession(String id) async {
    try {
      final response = await _api.get('/coaching/sessions/$id');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return CoachingSessionModel.fromJson(data);
      }
    } catch (_) {
      // Not found
    }
    return null;
  }

  /// Create a new coaching session
  Future<CoachingSessionModel?> createSession(String scenarioId) async {
    try {
      final response = await _api.post('/coaching/sessions', data: {
        'scenarioId': scenarioId,
      });
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return CoachingSessionModel.fromJson(data);
      }
    } catch (_) {
      // Creation failed
    }
    return null;
  }

  /// Upload recording for analysis
  Future<bool> uploadRecording(String sessionId, String filePath) async {
    try {
      await _api.uploadFile(
        '/coaching/sessions/$sessionId/recording',
        filePath: filePath,
        fieldName: 'recording',
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Get coaching progress
  Future<CoachingProgressModel> getProgress() async {
    try {
      final response = await _api.get('/coaching/progress');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return CoachingProgressModel.fromJson(data);
      }
    } catch (_) {
      // Return default
    }
    return const CoachingProgressModel(
      totalSessions: 0,
      avgScore: 0,
      completedScenarios: 0,
      streak: 0,
    );
  }

  /// Get available scenarios
  Future<List<CoachingScenarioModel>> getScenarios() async {
    try {
      final response = await _api.get('/coaching/scenarios');
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
          .map((item) =>
              CoachingScenarioModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Get AI-powered next steps suggestions
  Future<List<String>> getNextSteps(String sessionId) async {
    try {
      final response = await _api.get('/coaching/sessions/$sessionId/next-steps');
      final data = response.data;
      if (data is List) {
        return data.map((e) => e.toString()).toList();
      } else if (data is Map && data['steps'] is List) {
        return (data['steps'] as List).map((e) => e.toString()).toList();
      }
    } catch (_) {
      // No suggestions
    }
    return [];
  }
}
