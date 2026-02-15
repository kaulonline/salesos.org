import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';
import '../models/pending_mutation.dart';
import '../network/api_client.dart';
import '../providers/providers.dart';

/// Service for managing offline mutations queue
///
/// This service handles:
/// - Queuing create/update/delete operations when offline
/// - Persisting the queue to Hive for app restarts
/// - Processing the queue when connectivity is restored
/// - Handling conflicts and retries
/// - Tracking sync status per item
class OfflineQueueService {
  final ApiClient _apiClient;
  final Ref _ref;

  Box<String>? _queueBox;
  Box<String>? _idMappingBox;

  static const String _queueBoxName = 'offline_queue';
  static const String _idMappingBoxName = 'offline_id_mapping';
  static const String _lastSyncKey = 'last_sync_at';

  /// Stream controller for queue changes
  final _queueChangedController = StreamController<OfflineQueueSummary>.broadcast();

  /// Stream controller for sync progress
  final _syncProgressController = StreamController<SyncProgress>.broadcast();

  /// Whether sync is currently running
  bool _isSyncing = false;

  /// Whether init has been called
  bool _isInitialized = false;

  OfflineQueueService(this._apiClient, this._ref);

  /// Stream of queue summary changes
  Stream<OfflineQueueSummary> get queueChanges => _queueChangedController.stream;

  /// Stream of sync progress updates
  Stream<SyncProgress> get syncProgress => _syncProgressController.stream;

  /// Whether sync is currently in progress
  bool get isSyncing => _isSyncing;

  /// Initialize the offline queue service
  Future<void> init() async {
    if (_isInitialized) return;

    if (_queueBox == null || !_queueBox!.isOpen) {
      _queueBox = await Hive.openBox<String>(_queueBoxName);
    }
    if (_idMappingBox == null || !_idMappingBox!.isOpen) {
      _idMappingBox = await Hive.openBox<String>(_idMappingBoxName);
    }

    _isInitialized = true;

    // Notify listeners of initial state
    _notifyQueueChanged();
  }

  /// Dispose of resources
  void dispose() {
    _queueChangedController.close();
    _syncProgressController.close();
    _isInitialized = false;
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  /// Add a create mutation to the queue
  Future<PendingMutation> queueCreate({
    required MutationEntityType entityType,
    required Map<String, dynamic> data,
    String? description,
  }) async {
    await init();

    final tempLocalId = 'temp_${const Uuid().v4()}';
    final mutation = PendingMutation(
      id: const Uuid().v4(),
      type: MutationType.create,
      entityType: entityType,
      data: data,
      status: MutationStatus.pending,
      createdAt: DateTime.now(),
      tempLocalId: tempLocalId,
      description: description ?? 'Create ${entityType.displayName}',
    );

    await _saveMutation(mutation);
    _notifyQueueChanged();

    // Try to sync immediately if online
    _trySyncIfOnline();

    return mutation;
  }

  /// Add an update mutation to the queue
  Future<PendingMutation> queueUpdate({
    required MutationEntityType entityType,
    required String entityId,
    required Map<String, dynamic> data,
    int? serverVersion,
    String? description,
  }) async {
    await init();

    // Check if there's already a pending mutation for this entity
    final existingMutation = await _findPendingMutationForEntity(entityType, entityId);

    if (existingMutation != null) {
      // Merge with existing mutation
      final mergedData = {...existingMutation.data, ...data};
      final updatedMutation = existingMutation.copyWith(
        data: mergedData,
        localVersion: existingMutation.localVersion + 1,
      );
      await _saveMutation(updatedMutation);
      _notifyQueueChanged();
      return updatedMutation;
    }

    final mutation = PendingMutation(
      id: const Uuid().v4(),
      type: MutationType.update,
      entityType: entityType,
      entityId: entityId,
      data: data,
      status: MutationStatus.pending,
      createdAt: DateTime.now(),
      serverVersion: serverVersion,
      description: description ?? 'Update ${entityType.displayName}',
    );

    await _saveMutation(mutation);
    _notifyQueueChanged();

    // Try to sync immediately if online
    _trySyncIfOnline();

    return mutation;
  }

  /// Add a delete mutation to the queue
  Future<PendingMutation> queueDelete({
    required MutationEntityType entityType,
    required String entityId,
    String? description,
  }) async {
    await init();

    // Remove any pending create/update mutations for this entity
    await _removePendingMutationsForEntity(entityType, entityId);

    final mutation = PendingMutation(
      id: const Uuid().v4(),
      type: MutationType.delete,
      entityType: entityType,
      entityId: entityId,
      data: const {},
      status: MutationStatus.pending,
      createdAt: DateTime.now(),
      description: description ?? 'Delete ${entityType.displayName}',
    );

    await _saveMutation(mutation);
    _notifyQueueChanged();

    // Try to sync immediately if online
    _trySyncIfOnline();

    return mutation;
  }

  /// Get all pending mutations
  Future<List<PendingMutation>> getAllMutations() async {
    await init();

    final mutations = <PendingMutation>[];
    for (final key in _queueBox!.keys) {
      try {
        final json = _queueBox!.get(key);
        if (json != null) {
          mutations.add(PendingMutation.fromJsonString(json));
        }
      } catch (e) {
        // Skip invalid entries
      }
    }

    // Sort by creation time (oldest first for FIFO processing)
    mutations.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return mutations;
  }

  /// Get mutations filtered by status
  Future<List<PendingMutation>> getMutationsByStatus(MutationStatus status) async {
    final all = await getAllMutations();
    return all.where((m) => m.status == status).toList();
  }

  /// Get actionable mutations (pending or failed with retries left)
  Future<List<PendingMutation>> getActionableMutations() async {
    final all = await getAllMutations();
    return all.where((m) => m.isActionable).toList();
  }

  /// Get queue summary
  Future<OfflineQueueSummary> getQueueSummary() async {
    final all = await getAllMutations();

    int pending = 0;
    int processing = 0;
    int failed = 0;
    int conflict = 0;
    int completed = 0;
    int abandoned = 0;
    DateTime? oldestPending;

    for (final m in all) {
      switch (m.status) {
        case MutationStatus.pending:
          pending++;
          if (oldestPending == null || m.createdAt.isBefore(oldestPending)) {
            oldestPending = m.createdAt;
          }
          break;
        case MutationStatus.processing:
          processing++;
          break;
        case MutationStatus.failed:
          if (m.canRetry) {
            failed++;
          } else {
            abandoned++;
          }
          break;
        case MutationStatus.conflict:
          conflict++;
          break;
        case MutationStatus.completed:
          completed++;
          break;
        case MutationStatus.abandoned:
          abandoned++;
          break;
      }
    }

    final lastSyncStr = _queueBox!.get(_lastSyncKey);
    final lastSync = lastSyncStr != null ? DateTime.tryParse(lastSyncStr) : null;

    return OfflineQueueSummary(
      pendingCount: pending,
      processingCount: processing,
      failedCount: failed,
      conflictCount: conflict,
      completedCount: completed,
      abandonedCount: abandoned,
      oldestPendingAt: oldestPending,
      lastSyncAt: lastSync,
    );
  }

  /// Remove a mutation from the queue
  Future<void> removeMutation(String id) async {
    await init();
    await _queueBox!.delete(id);
    _notifyQueueChanged();
  }

  /// Clear all completed mutations
  Future<void> clearCompleted() async {
    await init();

    final toRemove = <String>[];
    for (final key in _queueBox!.keys) {
      if (key == _lastSyncKey) continue;

      try {
        final json = _queueBox!.get(key);
        if (json != null) {
          final mutation = PendingMutation.fromJsonString(json);
          if (mutation.status == MutationStatus.completed) {
            toRemove.add(key.toString());
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    }

    for (final key in toRemove) {
      await _queueBox!.delete(key);
    }

    _notifyQueueChanged();
  }

  /// Clear all mutations (use with caution)
  Future<void> clearAll() async {
    await init();

    final lastSync = _queueBox!.get(_lastSyncKey);
    await _queueBox!.clear();

    // Restore last sync timestamp
    if (lastSync != null) {
      await _queueBox!.put(_lastSyncKey, lastSync);
    }

    await _idMappingBox!.clear();
    _notifyQueueChanged();
  }

  // ============================================================================
  // QUEUE PROCESSING
  // ============================================================================

  /// Process the queue, syncing all actionable mutations
  Future<SyncResult> processQueue() async {
    if (_isSyncing) {
      return SyncResult(
        success: false,
        message: 'Sync already in progress',
        processed: 0,
        succeeded: 0,
        failed: 0,
      );
    }

    final isOnline = _ref.read(isOnlineProvider);
    if (!isOnline) {
      return SyncResult(
        success: false,
        message: 'Device is offline',
        processed: 0,
        succeeded: 0,
        failed: 0,
      );
    }

    _isSyncing = true;

    try {
      final actionable = await getActionableMutations();

      if (actionable.isEmpty) {
        return SyncResult(
          success: true,
          message: 'No items to sync',
          processed: 0,
          succeeded: 0,
          failed: 0,
        );
      }

      int processed = 0;
      int succeeded = 0;
      int failed = 0;
      final errors = <String>[];

      for (final mutation in actionable) {
        _syncProgressController.add(SyncProgress(
          current: processed + 1,
          total: actionable.length,
          currentMutation: mutation,
          message: 'Syncing ${mutation.operationName}...',
        ));

        final result = await _processMutation(mutation);
        processed++;

        if (result.success) {
          succeeded++;
        } else {
          failed++;
          if (result.errorMessage != null) {
            errors.add(result.errorMessage!);
          }
        }
      }

      // Update last sync timestamp
      await _queueBox!.put(_lastSyncKey, DateTime.now().toIso8601String());
      _notifyQueueChanged();

      _syncProgressController.add(SyncProgress(
        current: processed,
        total: actionable.length,
        currentMutation: null,
        message: 'Sync complete',
        isComplete: true,
      ));

      return SyncResult(
        success: failed == 0,
        message: failed == 0
            ? 'Successfully synced $succeeded items'
            : 'Synced $succeeded items, $failed failed',
        processed: processed,
        succeeded: succeeded,
        failed: failed,
        errors: errors,
      );
    } finally {
      _isSyncing = false;
    }
  }

  /// Process a single mutation
  Future<MutationSyncResult> _processMutation(PendingMutation mutation) async {

    // Mark as processing
    final processingMutation = mutation.copyWith(
      status: MutationStatus.processing,
      lastAttemptAt: DateTime.now(),
    );
    await _saveMutation(processingMutation);

    try {
      final result = await _executeMutation(processingMutation);

      if (result.success) {
        // Mark as completed
        final completedMutation = processingMutation.copyWith(
          status: MutationStatus.completed,
          completedAt: DateTime.now(),
        );
        await _saveMutation(completedMutation);

        // Store ID mapping for create operations
        if (mutation.type == MutationType.create &&
            mutation.tempLocalId != null &&
            result.serverId != null) {
          await _storeIdMapping(mutation.tempLocalId!, result.serverId!);
        }

        return result;
      } else if (result.isConflict) {
        // Mark as conflict
        final conflictMutation = processingMutation.copyWith(
          status: MutationStatus.conflict,
          errorMessage: result.errorMessage,
        );
        await _saveMutation(conflictMutation);
        return result;
      } else {
        // Mark as failed
        final newRetryCount = processingMutation.retryCount + 1;
        final status = newRetryCount >= processingMutation.maxRetries
            ? MutationStatus.abandoned
            : MutationStatus.failed;

        final failedMutation = processingMutation.copyWith(
          status: status,
          retryCount: newRetryCount,
          errorMessage: result.errorMessage,
          completedAt: status == MutationStatus.abandoned ? DateTime.now() : null,
        );
        await _saveMutation(failedMutation);
        return result;
      }
    } catch (e) {
      // Mark as failed
      final newRetryCount = processingMutation.retryCount + 1;
      final status = newRetryCount >= processingMutation.maxRetries
          ? MutationStatus.abandoned
          : MutationStatus.failed;

      final failedMutation = processingMutation.copyWith(
        status: status,
        retryCount: newRetryCount,
        errorMessage: e.toString(),
        completedAt: status == MutationStatus.abandoned ? DateTime.now() : null,
      );
      await _saveMutation(failedMutation);

      return MutationSyncResult.failure(failedMutation, e.toString());
    }
  }

  /// Execute the actual API call for a mutation
  Future<MutationSyncResult> _executeMutation(PendingMutation mutation) async {
    final authMode = _ref.read(authModeProvider);
    final isSalesforce = authMode == AuthMode.salesforce;

    try {
      switch (mutation.type) {
        case MutationType.create:
          return await _executeCreate(mutation, isSalesforce);
        case MutationType.update:
          return await _executeUpdate(mutation, isSalesforce);
        case MutationType.delete:
          return await _executeDelete(mutation, isSalesforce);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        // Conflict
        return MutationSyncResult.conflict(
          mutation,
          e.response?.data as Map<String, dynamic>? ?? {},
        );
      }

      final message = _extractErrorMessage(e);
      return MutationSyncResult.failure(mutation, message);
    }
  }

  Future<MutationSyncResult> _executeCreate(
    PendingMutation mutation,
    bool isSalesforce,
  ) async {
    final path = isSalesforce
        ? '/salesforce/sobjects/${_getSalesforceObjectName(mutation.entityType)}'
        : mutation.entityType.apiPath;

    final response = await _apiClient.post(path, data: mutation.data);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data as Map<String, dynamic>?;
      final serverId = data?['id'] as String? ?? data?['Id'] as String?;

      return MutationSyncResult.success(
        mutation,
        serverId: serverId,
        serverData: data,
      );
    }

    return MutationSyncResult.failure(mutation, 'Unexpected response: ${response.statusCode}');
  }

  Future<MutationSyncResult> _executeUpdate(
    PendingMutation mutation,
    bool isSalesforce,
  ) async {
    final entityId = await _resolveEntityId(mutation.entityId);
    if (entityId == null) {
      return MutationSyncResult.failure(mutation, 'Entity ID not found');
    }

    final path = isSalesforce
        ? '/salesforce/sobjects/${_getSalesforceObjectName(mutation.entityType)}/$entityId'
        : '${mutation.entityType.apiPath}/$entityId';

    // Check for conflicts if we have a server version
    if (mutation.serverVersion != null) {
      final conflictCheck = await _checkForConflict(mutation, entityId, isSalesforce);
      if (conflictCheck != null) {
        return conflictCheck;
      }
    }

    final response = await _apiClient.patch(path, data: mutation.data);

    if (response.statusCode == 200 || response.statusCode == 204) {
      return MutationSyncResult.success(
        mutation,
        serverId: entityId,
        serverData: response.data as Map<String, dynamic>?,
      );
    }

    return MutationSyncResult.failure(mutation, 'Unexpected response: ${response.statusCode}');
  }

  Future<MutationSyncResult> _executeDelete(
    PendingMutation mutation,
    bool isSalesforce,
  ) async {
    final entityId = await _resolveEntityId(mutation.entityId);
    if (entityId == null) {
      // Entity was never created on server, so delete is a no-op
      return MutationSyncResult.success(mutation);
    }

    final path = isSalesforce
        ? '/salesforce/sobjects/${_getSalesforceObjectName(mutation.entityType)}/$entityId'
        : '${mutation.entityType.apiPath}/$entityId';

    final response = await _apiClient.delete(path);

    if (response.statusCode == 200 || response.statusCode == 204 || response.statusCode == 404) {
      // 404 is acceptable for delete (already deleted)
      return MutationSyncResult.success(mutation, serverId: entityId);
    }

    return MutationSyncResult.failure(mutation, 'Unexpected response: ${response.statusCode}');
  }

  /// Check for conflicts before updating
  Future<MutationSyncResult?> _checkForConflict(
    PendingMutation mutation,
    String entityId,
    bool isSalesforce,
  ) async {
    try {
      final path = isSalesforce
          ? '/salesforce/sobjects/${_getSalesforceObjectName(mutation.entityType)}/$entityId'
          : '${mutation.entityType.apiPath}/$entityId';

      final response = await _apiClient.get(path);

      if (response.statusCode == 200) {
        final serverData = response.data as Map<String, dynamic>?;
        if (serverData != null) {
          // Check if server version is newer
          final serverVersion = serverData['version'] as int? ??
              serverData['__version'] as int?;

          if (serverVersion != null &&
              mutation.serverVersion != null &&
              serverVersion > mutation.serverVersion!) {
            return MutationSyncResult.conflict(mutation, serverData);
          }
        }
      }
    } catch (e) {
      // If we can't check, proceed with update
    }

    return null;
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  /// Resolve a conflict with a given strategy
  Future<void> resolveConflict(
    String mutationId,
    ConflictResolutionStrategy strategy, {
    Map<String, dynamic>? mergedData,
  }) async {
    await init();

    final json = _queueBox!.get(mutationId);
    if (json == null) return;

    final mutation = PendingMutation.fromJsonString(json);
    if (mutation.status != MutationStatus.conflict) return;

    switch (strategy) {
      case ConflictResolutionStrategy.keepLocal:
        // Retry with force flag or without version check
        final retryMutation = mutation.copyWith(
          status: MutationStatus.pending,
          serverVersion: null, // Clear version to skip conflict check
          retryCount: 0,
          errorMessage: null,
        );
        await _saveMutation(retryMutation);
        break;

      case ConflictResolutionStrategy.keepServer:
        // Just mark as abandoned (server version is kept)
        final abandonedMutation = mutation.copyWith(
          status: MutationStatus.abandoned,
          completedAt: DateTime.now(),
          errorMessage: 'Conflict resolved: kept server version',
        );
        await _saveMutation(abandonedMutation);
        break;

      case ConflictResolutionStrategy.merge:
        if (mergedData != null) {
          final mergedMutation = mutation.copyWith(
            status: MutationStatus.pending,
            data: mergedData,
            serverVersion: null,
            retryCount: 0,
            errorMessage: null,
          );
          await _saveMutation(mergedMutation);
        }
        break;

      case ConflictResolutionStrategy.skip:
        // Mark as abandoned
        final skippedMutation = mutation.copyWith(
          status: MutationStatus.abandoned,
          completedAt: DateTime.now(),
          errorMessage: 'Conflict skipped by user',
        );
        await _saveMutation(skippedMutation);
        break;
    }

    _notifyQueueChanged();

    // Try to sync if strategy was keepLocal or merge
    if (strategy == ConflictResolutionStrategy.keepLocal ||
        strategy == ConflictResolutionStrategy.merge) {
      _trySyncIfOnline();
    }
  }

  /// Retry a failed mutation
  Future<void> retryMutation(String mutationId) async {
    await init();

    final json = _queueBox!.get(mutationId);
    if (json == null) return;

    final mutation = PendingMutation.fromJsonString(json);
    if (mutation.status != MutationStatus.failed &&
        mutation.status != MutationStatus.abandoned) {
      return;
    }

    final retryMutation = mutation.copyWith(
      status: MutationStatus.pending,
      retryCount: 0,
      errorMessage: null,
    );
    await _saveMutation(retryMutation);
    _notifyQueueChanged();

    _trySyncIfOnline();
  }

  // ============================================================================
  // ID MAPPING
  // ============================================================================

  /// Get server ID for a temporary local ID
  Future<String?> getServerIdForTempId(String tempLocalId) async {
    await init();
    return _idMappingBox!.get(tempLocalId);
  }

  /// Resolve entity ID (handles temp IDs)
  Future<String?> _resolveEntityId(String? entityId) async {
    if (entityId == null) return null;

    if (entityId.startsWith('temp_')) {
      return await getServerIdForTempId(entityId);
    }

    return entityId;
  }

  /// Store ID mapping
  Future<void> _storeIdMapping(String tempId, String serverId) async {
    await init();
    await _idMappingBox!.put(tempId, serverId);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  Future<void> _saveMutation(PendingMutation mutation) async {
    await _queueBox!.put(mutation.id, mutation.toJsonString());
  }

  Future<PendingMutation?> _findPendingMutationForEntity(
    MutationEntityType entityType,
    String entityId,
  ) async {
    final all = await getAllMutations();

    for (final m in all) {
      if (m.entityType == entityType &&
          m.entityId == entityId &&
          m.isActionable &&
          m.type == MutationType.update) {
        return m;
      }
    }

    return null;
  }

  Future<void> _removePendingMutationsForEntity(
    MutationEntityType entityType,
    String entityId,
  ) async {
    final all = await getAllMutations();

    for (final m in all) {
      if (m.entityType == entityType &&
          m.entityId == entityId &&
          m.isActionable) {
        await _queueBox!.delete(m.id);
      }
    }
  }

  void _notifyQueueChanged() {
    getQueueSummary().then((summary) {
      if (!_queueChangedController.isClosed) {
        _queueChangedController.add(summary);
      }
    });
  }

  void _trySyncIfOnline() {
    final isOnline = _ref.read(isOnlineProvider);
    if (isOnline && !_isSyncing) {
      // Delay slightly to batch rapid changes
      Future.delayed(const Duration(milliseconds: 500), () {
        if (!_isSyncing) {
          processQueue();
        }
      });
    }
  }

  String _getSalesforceObjectName(MutationEntityType entityType) {
    switch (entityType) {
      case MutationEntityType.lead:
        return 'Lead';
      case MutationEntityType.contact:
        return 'Contact';
      case MutationEntityType.account:
        return 'Account';
      case MutationEntityType.opportunity:
        return 'Opportunity';
      case MutationEntityType.task:
        return 'Task';
      case MutationEntityType.activity:
        return 'Event';
      case MutationEntityType.note:
        return 'Note';
    }
  }

  String _extractErrorMessage(DioException e) {
    if (e.response?.data is Map) {
      final data = e.response!.data as Map;
      return data['message'] as String? ??
          data['error'] as String? ??
          e.message ??
          'Unknown error';
    }
    return e.message ?? 'Network error';
  }
}

/// Sync progress information
class SyncProgress {
  final int current;
  final int total;
  final PendingMutation? currentMutation;
  final String message;
  final bool isComplete;

  const SyncProgress({
    required this.current,
    required this.total,
    this.currentMutation,
    required this.message,
    this.isComplete = false,
  });

  double get progress => total > 0 ? current / total : 0;
}

/// Result of a sync operation
class SyncResult {
  final bool success;
  final String message;
  final int processed;
  final int succeeded;
  final int failed;
  final List<String> errors;

  const SyncResult({
    required this.success,
    required this.message,
    required this.processed,
    required this.succeeded,
    required this.failed,
    this.errors = const [],
  });
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for OfflineQueueService
final offlineQueueServiceProvider = Provider<OfflineQueueService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final service = OfflineQueueService(apiClient, ref);

  // Initialize on creation
  service.init();

  // Listen to connectivity changes and trigger sync when online
  ref.listen<bool>(isOnlineProvider, (previous, next) {
    if (next && previous == false) {
      // Just came online, trigger sync
      service.processQueue();
    }
  });

  // Cleanup on dispose
  ref.onDispose(() {
    service.dispose();
  });

  return service;
});

/// Provider for queue summary (reactive)
final offlineQueueSummaryProvider = StreamProvider<OfflineQueueSummary>((ref) {
  final service = ref.watch(offlineQueueServiceProvider);

  // Return stream that starts with initial summary
  return Stream.multi((controller) async {
    // Emit initial summary
    final initialSummary = await service.getQueueSummary();
    controller.add(initialSummary);

    // Forward subsequent changes
    await for (final summary in service.queueChanges) {
      controller.add(summary);
    }
  });
});

/// Provider for sync progress
final offlineSyncProgressProvider = StreamProvider<SyncProgress>((ref) {
  final service = ref.watch(offlineQueueServiceProvider);
  return service.syncProgress;
});

/// Provider for pending mutation count (for badges)
final pendingMutationCountProvider = Provider<int>((ref) {
  final summary = ref.watch(offlineQueueSummaryProvider);
  return summary.maybeWhen(
    data: (s) => s.actionableCount,
    orElse: () => 0,
  );
});

/// Provider for checking if there are conflicts
final hasConflictsProvider = Provider<bool>((ref) {
  final summary = ref.watch(offlineQueueSummaryProvider);
  return summary.maybeWhen(
    data: (s) => s.hasConflicts,
    orElse: () => false,
  );
});

/// Provider for checking if sync is in progress
final isSyncingProvider = Provider<bool>((ref) {
  final service = ref.watch(offlineQueueServiceProvider);
  return service.isSyncing;
});

/// Provider for all pending mutations (for UI display)
final pendingMutationsProvider = FutureProvider<List<PendingMutation>>((ref) async {
  final service = ref.watch(offlineQueueServiceProvider);
  return service.getAllMutations();
});

/// Provider for mutations with conflicts
final conflictMutationsProvider = FutureProvider<List<PendingMutation>>((ref) async {
  final service = ref.watch(offlineQueueServiceProvider);
  return service.getMutationsByStatus(MutationStatus.conflict);
});
