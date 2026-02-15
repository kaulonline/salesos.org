// ignore_for_file: constant_identifier_names

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

// ═══════════════════════════════════════════════════════════════
// Enums aligned with web TypeScript types
// ═══════════════════════════════════════════════════════════════

enum CompetitorTier { PRIMARY, SECONDARY, EMERGING, INDIRECT }

CompetitorTier parseCompetitorTier(dynamic value) {
  if (value == null) return CompetitorTier.PRIMARY;
  final s = value.toString().toUpperCase();
  switch (s) {
    case 'PRIMARY':
      return CompetitorTier.PRIMARY;
    case 'SECONDARY':
      return CompetitorTier.SECONDARY;
    case 'EMERGING':
      return CompetitorTier.EMERGING;
    case 'INDIRECT':
      return CompetitorTier.INDIRECT;
    default:
      return CompetitorTier.PRIMARY;
  }
}

String competitorTierToJson(CompetitorTier tier) => tier.name;

enum CompetitorStatus { ACTIVE, INACTIVE, ACQUIRED, MERGED }

CompetitorStatus parseCompetitorStatus(dynamic value) {
  if (value == null) return CompetitorStatus.ACTIVE;
  final s = value.toString().toUpperCase();
  switch (s) {
    case 'ACTIVE':
      return CompetitorStatus.ACTIVE;
    case 'INACTIVE':
      return CompetitorStatus.INACTIVE;
    case 'ACQUIRED':
      return CompetitorStatus.ACQUIRED;
    case 'MERGED':
      return CompetitorStatus.MERGED;
    default:
      return CompetitorStatus.ACTIVE;
  }
}

String competitorStatusToJson(CompetitorStatus status) => status.name;

enum ThreatLevel { LOW, MEDIUM, HIGH, CRITICAL }

ThreatLevel parseThreatLevel(dynamic value) {
  if (value == null) return ThreatLevel.LOW;
  final s = value.toString().toUpperCase();
  switch (s) {
    case 'LOW':
      return ThreatLevel.LOW;
    case 'MEDIUM':
      return ThreatLevel.MEDIUM;
    case 'HIGH':
      return ThreatLevel.HIGH;
    case 'CRITICAL':
      return ThreatLevel.CRITICAL;
    default:
      return ThreatLevel.LOW;
  }
}

String threatLevelToJson(ThreatLevel level) => level.name;

// ═══════════════════════════════════════════════════════════════
// Battlecard model — aligned with web interface
// ═══════════════════════════════════════════════════════════════

class Battlecard {
  final String id;
  final String competitorId;
  final String title;
  final String? overview;
  final String? pricingComparison;
  final List<String> keyTalkingPoints;
  final List<String> trapQuestions;
  final List<String> winThemes;
  final List<String> loseThemes;
  final List<Map<String, String>>? objectionHandling;
  final bool isActive;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Battlecard({
    required this.id,
    required this.competitorId,
    required this.title,
    this.overview,
    this.pricingComparison,
    this.keyTalkingPoints = const [],
    this.trapQuestions = const [],
    this.winThemes = const [],
    this.loseThemes = const [],
    this.objectionHandling,
    this.isActive = true,
    this.version = 1,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Battlecard.fromJson(Map<String, dynamic> json) {
    return Battlecard(
      id: json['id'] as String? ?? '',
      competitorId: json['competitorId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      overview: json['overview'] as String?,
      pricingComparison: json['pricingComparison'] as String?,
      keyTalkingPoints: _parseStringList(json['keyTalkingPoints']),
      trapQuestions: _parseStringList(json['trapQuestions']),
      winThemes: _parseStringList(json['winThemes']),
      loseThemes: _parseStringList(json['loseThemes']),
      objectionHandling: _parseObjectionHandling(json['objectionHandling']),
      isActive: json['isActive'] as bool? ?? true,
      version: json['version'] as int? ?? 1,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'competitorId': competitorId,
    'title': title,
    'overview': overview,
    'pricingComparison': pricingComparison,
    'keyTalkingPoints': keyTalkingPoints,
    'trapQuestions': trapQuestions,
    'winThemes': winThemes,
    'loseThemes': loseThemes,
    'objectionHandling': objectionHandling,
    'isActive': isActive,
    'version': version,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  static List<Map<String, String>>? _parseObjectionHandling(dynamic value) {
    if (value is! List) return null;
    return value.map<Map<String, String>>((e) {
      if (e is Map) {
        return {
          'objection': e['objection']?.toString() ?? '',
          'response': e['response']?.toString() ?? '',
        };
      }
      return {'objection': '', 'response': ''};
    }).toList();
  }
}

// ═══════════════════════════════════════════════════════════════
// Competitor model — aligned with web interface
// ═══════════════════════════════════════════════════════════════

class CompetitorModel {
  final String id;
  final String? organizationId;
  final String name;
  final String? website;
  final String? logoUrl;
  final String? description;
  final CompetitorTier tier;
  final CompetitorStatus status;
  final List<String> strengths;
  final List<String> weaknesses;
  final List<String> differentiators;
  final String? targetMarket;
  final String? pricingModel;
  final int winsAgainst;
  final int lossesAgainst;
  final double? winRateAgainst;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<dynamic>? products;
  final List<Battlecard>? battlecards;
  final int? battlecardCount;
  final int? productCount;
  final int? dealCount;

  const CompetitorModel({
    required this.id,
    this.organizationId,
    required this.name,
    this.website,
    this.logoUrl,
    this.description,
    this.tier = CompetitorTier.PRIMARY,
    this.status = CompetitorStatus.ACTIVE,
    this.strengths = const [],
    this.weaknesses = const [],
    this.differentiators = const [],
    this.targetMarket,
    this.pricingModel,
    this.winsAgainst = 0,
    this.lossesAgainst = 0,
    this.winRateAgainst,
    this.createdAt,
    this.updatedAt,
    this.products,
    this.battlecards,
    this.battlecardCount,
    this.productCount,
    this.dealCount,
  });

  // ── Computed getters ──────────────────────────────────────────

  String get tierLabel {
    switch (tier) {
      case CompetitorTier.PRIMARY:
        return 'Primary';
      case CompetitorTier.SECONDARY:
        return 'Secondary';
      case CompetitorTier.EMERGING:
        return 'Emerging';
      case CompetitorTier.INDIRECT:
        return 'Indirect';
    }
  }

  String get statusLabel {
    switch (status) {
      case CompetitorStatus.ACTIVE:
        return 'Active';
      case CompetitorStatus.INACTIVE:
        return 'Inactive';
      case CompetitorStatus.ACQUIRED:
        return 'Acquired';
      case CompetitorStatus.MERGED:
        return 'Merged';
    }
  }

  /// Computed win rate from wins/losses; returns null if no data.
  double? get winRate {
    final total = winsAgainst + lossesAgainst;
    if (total == 0) return null;
    return (winsAgainst / total) * 100;
  }

  // ── Serialisation ─────────────────────────────────────────────

  factory CompetitorModel.fromJson(Map<String, dynamic> json) {
    return CompetitorModel(
      id: json['id'] as String? ?? '',
      organizationId: json['organizationId'] as String?,
      name: json['name'] as String? ?? 'Unknown',
      website: json['website'] as String?,
      logoUrl: json['logoUrl'] as String?,
      description: json['description'] as String?,
      tier: parseCompetitorTier(json['tier']),
      status: parseCompetitorStatus(json['status']),
      strengths: _parseStringList(json['strengths']),
      weaknesses: _parseStringList(json['weaknesses']),
      // Backward compat: web sends 'differentiators', old mobile sent 'talkTracks'
      differentiators: _parseStringList(json['differentiators'] ?? json['talkTracks']),
      // Backward compat: web sends 'targetMarket', old mobile sent 'marketPosition'
      targetMarket: (json['targetMarket'] ?? json['marketPosition']) as String?,
      // Backward compat: web sends 'pricingModel', old mobile sent 'pricing'
      pricingModel: (json['pricingModel'] ?? json['pricing']) as String?,
      winsAgainst: json['winsAgainst'] as int? ?? 0,
      lossesAgainst: json['lossesAgainst'] as int? ?? 0,
      winRateAgainst: (json['winRateAgainst'] as num?)?.toDouble(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? ''),
      products: json['products'] as List<dynamic>?,
      battlecards: _parseBattlecards(json['battlecards']),
      battlecardCount: json['battlecardCount'] as int?,
      productCount: json['productCount'] as int?,
      dealCount: json['dealCount'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'organizationId': organizationId,
    'name': name,
    'website': website,
    'logoUrl': logoUrl,
    'description': description,
    'tier': competitorTierToJson(tier),
    'status': competitorStatusToJson(status),
    'strengths': strengths,
    'weaknesses': weaknesses,
    'differentiators': differentiators,
    'targetMarket': targetMarket,
    'pricingModel': pricingModel,
    'winsAgainst': winsAgainst,
    'lossesAgainst': lossesAgainst,
    'winRateAgainst': winRateAgainst,
    'createdAt': createdAt?.toIso8601String(),
    'updatedAt': updatedAt?.toIso8601String(),
    'products': products,
    'battlecards': battlecards?.map((b) => b.toJson()).toList(),
    'battlecardCount': battlecardCount,
    'productCount': productCount,
    'dealCount': dealCount,
  };

  static List<Battlecard>? _parseBattlecards(dynamic value) {
    if (value is! List) return null;
    return value
        .whereType<Map<String, dynamic>>()
        .map((e) => Battlecard.fromJson(e))
        .toList();
  }
}

// ═══════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════

List<String> _parseStringList(dynamic value) {
  if (value is List) {
    return value.map((e) => e.toString()).toList();
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════
// Providers
// ═══════════════════════════════════════════════════════════════

/// Competitors service provider
final competitorsServiceProvider = Provider<CompetitorsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return CompetitorsService(api, authMode);
});

/// All competitors list provider
final competitorsProvider = FutureProvider.autoDispose<List<CompetitorModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(competitorsServiceProvider);
  return service.getAll();
});

/// Single competitor detail provider
final competitorDetailProvider = FutureProvider.autoDispose
    .family<CompetitorModel?, String>((ref, competitorId) async {
  ref.watch(authModeProvider);
  final service = ref.watch(competitorsServiceProvider);
  return service.getById(competitorId);
});

// ═══════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════

/// Service for competitor battlecard data
class CompetitorsService {
  final ApiClient _api;

  CompetitorsService(this._api, AuthMode _);

  /// Get all competitors
  Future<List<CompetitorModel>> getAll() async {
    try {
      final response = await _api.get('/competitors');
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
          .map((item) => CompetitorModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Get a single competitor by ID
  Future<CompetitorModel?> getById(String id) async {
    try {
      final response = await _api.get('/competitors/$id');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return CompetitorModel.fromJson(data);
      }
    } catch (_) {
      // Not found
    }
    return null;
  }
}
