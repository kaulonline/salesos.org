import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Represents a saved form draft with metadata
class FormDraft {
  final String formId;
  final Map<String, dynamic> data;
  final DateTime savedAt;
  final String? entityType;
  final String? entityId;

  FormDraft({
    required this.formId,
    required this.data,
    required this.savedAt,
    this.entityType,
    this.entityId,
  });

  factory FormDraft.fromJson(Map<String, dynamic> json) {
    return FormDraft(
      formId: json['formId'] as String,
      data: Map<String, dynamic>.from(json['data'] as Map),
      savedAt: DateTime.parse(json['savedAt'] as String),
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'formId': formId,
        'data': data,
        'savedAt': savedAt.toIso8601String(),
        'entityType': entityType,
        'entityId': entityId,
      };

  /// Get a human-readable preview of the draft
  String get preview {
    final parts = <String>[];

    // Try to extract meaningful preview data based on common field names
    final name = data['name'] ??
        '${data['firstName'] ?? ''} ${data['lastName'] ?? ''}'.trim();
    if (name.isNotEmpty) {
      parts.add(name);
    }

    final company = data['company'] as String?;
    if (company != null && company.isNotEmpty) {
      parts.add(company);
    }

    final email = data['email'] as String?;
    if (email != null && email.isNotEmpty) {
      parts.add(email);
    }

    final subject = data['subject'] as String?;
    if (subject != null && subject.isNotEmpty) {
      parts.add(subject);
    }

    if (parts.isEmpty) {
      return 'Draft saved ${_formatTimeAgo(savedAt)}';
    }

    return parts.take(2).join(' - ');
  }

  /// Get formatted time ago string
  String get timeAgo => _formatTimeAgo(savedAt);

  static String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      final mins = difference.inMinutes;
      return '$mins ${mins == 1 ? 'minute' : 'minutes'} ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '$hours ${hours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      return '$days ${days == 1 ? 'day' : 'days'} ago';
    } else {
      return '${dateTime.month}/${dateTime.day}/${dateTime.year}';
    }
  }
}

/// Service for managing form drafts with local storage persistence
class FormDraftService {
  Box<String>? _draftsBox;
  static const String _boxName = 'form_drafts';

  // Track debounce timers for auto-save
  final Map<String, Timer> _debounceTimers = {};

  /// Initialize local storage
  Future<void> init() async {
    if (_draftsBox == null || !_draftsBox!.isOpen) {
      _draftsBox = await Hive.openBox<String>(_boxName);
    }
  }

  /// Generate a unique form ID based on entity type and optional entity ID
  /// For create forms: 'lead_create', 'contact_create', etc.
  /// For edit forms: 'lead_edit_abc123', 'contact_edit_xyz789', etc.
  static String generateFormId(String entityType, {String? entityId}) {
    if (entityId != null && entityId.isNotEmpty) {
      return '${entityType}_edit_$entityId';
    }
    return '${entityType}_create';
  }

  /// Save a draft for a form
  /// Uses debouncing to prevent excessive writes
  Future<void> saveDraft(
    String formId,
    Map<String, dynamic> data, {
    String? entityType,
    String? entityId,
    Duration debounce = const Duration(seconds: 1),
  }) async {
    // Cancel any existing debounce timer for this form
    _debounceTimers[formId]?.cancel();

    // Create a new debounce timer
    _debounceTimers[formId] = Timer(debounce, () async {
      await _saveDraftImmediate(formId, data, entityType: entityType, entityId: entityId);
    });
  }

  /// Save draft immediately without debouncing
  Future<void> _saveDraftImmediate(
    String formId,
    Map<String, dynamic> data, {
    String? entityType,
    String? entityId,
  }) async {
    await init();

    // Don't save empty drafts
    if (_isDataEmpty(data)) {
      return;
    }

    final draft = FormDraft(
      formId: formId,
      data: data,
      savedAt: DateTime.now(),
      entityType: entityType,
      entityId: entityId,
    );

    try {
      await _draftsBox!.put(formId, jsonEncode(draft.toJson()));
      debugPrint('FormDraftService: Saved draft for $formId');
    } catch (e) {
      debugPrint('FormDraftService: Error saving draft: $e');
    }
  }

  /// Save draft immediately (for manual save or before navigation)
  Future<void> saveDraftNow(
    String formId,
    Map<String, dynamic> data, {
    String? entityType,
    String? entityId,
  }) async {
    // Cancel any pending debounced save
    _debounceTimers[formId]?.cancel();
    _debounceTimers.remove(formId);

    await _saveDraftImmediate(formId, data, entityType: entityType, entityId: entityId);
  }

  /// Check if data is effectively empty
  bool _isDataEmpty(Map<String, dynamic> data) {
    for (final value in data.values) {
      if (value == null) continue;
      if (value is String && value.trim().isNotEmpty) return false;
      if (value is num && value != 0) return false;
      if (value is bool && value) return false;
      if (value is List && value.isNotEmpty) return false;
      if (value is Map && value.isNotEmpty) return false;
    }
    return true;
  }

  /// Retrieve a saved draft for a form
  Future<FormDraft?> getDraft(String formId) async {
    await init();

    try {
      final json = _draftsBox!.get(formId);
      if (json != null) {
        return FormDraft.fromJson(jsonDecode(json));
      }
    } catch (e) {
      debugPrint('FormDraftService: Error getting draft: $e');
      // If there's an error reading the draft, delete it
      await deleteDraft(formId);
    }
    return null;
  }

  /// Delete a draft (typically called after successful form submission)
  Future<void> deleteDraft(String formId) async {
    await init();

    // Cancel any pending debounced save
    _debounceTimers[formId]?.cancel();
    _debounceTimers.remove(formId);

    try {
      await _draftsBox!.delete(formId);
      debugPrint('FormDraftService: Deleted draft for $formId');
    } catch (e) {
      debugPrint('FormDraftService: Error deleting draft: $e');
    }
  }

  /// Check if a draft exists for a form
  Future<bool> hasDraft(String formId) async {
    await init();
    return _draftsBox!.containsKey(formId);
  }

  /// Get all saved drafts (for debugging or draft management UI)
  Future<List<FormDraft>> getAllDrafts() async {
    await init();

    final drafts = <FormDraft>[];
    for (final key in _draftsBox!.keys) {
      try {
        final json = _draftsBox!.get(key);
        if (json != null) {
          drafts.add(FormDraft.fromJson(jsonDecode(json)));
        }
      } catch (e) {
        // Skip invalid drafts
        debugPrint('FormDraftService: Error reading draft $key: $e');
      }
    }

    // Sort by savedAt, most recent first
    drafts.sort((a, b) => b.savedAt.compareTo(a.savedAt));
    return drafts;
  }

  /// Delete all drafts (for cleanup or logout)
  Future<void> deleteAllDrafts() async {
    await init();

    // Cancel all pending timers
    for (final timer in _debounceTimers.values) {
      timer.cancel();
    }
    _debounceTimers.clear();

    await _draftsBox!.clear();
    debugPrint('FormDraftService: Deleted all drafts');
  }

  /// Delete drafts older than a certain duration
  Future<int> deleteOldDrafts(Duration maxAge) async {
    await init();

    final now = DateTime.now();
    final keysToDelete = <String>[];

    for (final key in _draftsBox!.keys) {
      try {
        final json = _draftsBox!.get(key);
        if (json != null) {
          final draft = FormDraft.fromJson(jsonDecode(json));
          if (now.difference(draft.savedAt) > maxAge) {
            keysToDelete.add(key as String);
          }
        }
      } catch (e) {
        // Delete invalid drafts
        keysToDelete.add(key as String);
      }
    }

    for (final key in keysToDelete) {
      await _draftsBox!.delete(key);
    }

    if (keysToDelete.isNotEmpty) {
      debugPrint('FormDraftService: Deleted ${keysToDelete.length} old drafts');
    }

    return keysToDelete.length;
  }

  /// Dispose timers when service is no longer needed
  void dispose() {
    for (final timer in _debounceTimers.values) {
      timer.cancel();
    }
    _debounceTimers.clear();
  }
}

/// Provider for FormDraftService
final formDraftServiceProvider = Provider<FormDraftService>((ref) {
  final service = FormDraftService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider to check if a draft exists for a specific form
final hasDraftProvider = FutureProvider.family<bool, String>((ref, formId) async {
  final service = ref.watch(formDraftServiceProvider);
  return service.hasDraft(formId);
});

/// Provider to get a specific draft
final formDraftProvider = FutureProvider.family<FormDraft?, String>((ref, formId) async {
  final service = ref.watch(formDraftServiceProvider);
  return service.getDraft(formId);
});

/// Provider to get the count of all unsaved drafts
/// Useful for displaying a badge in navigation or settings
final draftCountProvider = FutureProvider<int>((ref) async {
  final service = ref.watch(formDraftServiceProvider);
  final drafts = await service.getAllDrafts();
  return drafts.length;
});

/// Provider to get all drafts for the draft recovery UI
final allDraftsProvider = FutureProvider<List<FormDraft>>((ref) async {
  final service = ref.watch(formDraftServiceProvider);
  return service.getAllDrafts();
});

/// Provider to check if any drafts exist
final hasAnyDraftsProvider = FutureProvider<bool>((ref) async {
  final count = await ref.watch(draftCountProvider.future);
  return count > 0;
});
