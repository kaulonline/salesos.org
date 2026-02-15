import 'dart:convert';

/// The type of mutation operation
enum MutationType {
  create,
  update,
  delete,
}

/// The status of a pending mutation
enum MutationStatus {
  /// Waiting to be processed
  pending,

  /// Currently being processed
  processing,

  /// Successfully completed
  completed,

  /// Failed but can be retried
  failed,

  /// Conflict detected with server data
  conflict,

  /// Permanently failed (exceeded retry limit)
  abandoned,
}

/// Entity types that can be mutated offline
enum MutationEntityType {
  lead,
  contact,
  account,
  opportunity,
  task,
  activity,
  note,
}

extension MutationEntityTypeExtension on MutationEntityType {
  String get apiPath {
    switch (this) {
      case MutationEntityType.lead:
        return '/leads';
      case MutationEntityType.contact:
        return '/contacts';
      case MutationEntityType.account:
        return '/accounts';
      case MutationEntityType.opportunity:
        return '/opportunities';
      case MutationEntityType.task:
        return '/tasks';
      case MutationEntityType.activity:
        return '/activities';
      case MutationEntityType.note:
        return '/notes';
    }
  }

  String get displayName {
    switch (this) {
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
        return 'Activity';
      case MutationEntityType.note:
        return 'Note';
    }
  }
}

/// A pending mutation that needs to be synced when online
class PendingMutation {
  /// Unique identifier for this mutation
  final String id;

  /// Type of mutation operation
  final MutationType type;

  /// Entity type being mutated
  final MutationEntityType entityType;

  /// ID of the entity being mutated (null for create operations)
  final String? entityId;

  /// The mutation data payload
  final Map<String, dynamic> data;

  /// Current status of the mutation
  final MutationStatus status;

  /// Error message if the mutation failed
  final String? errorMessage;

  /// Number of retry attempts made
  final int retryCount;

  /// Maximum number of retries allowed
  final int maxRetries;

  /// When this mutation was created
  final DateTime createdAt;

  /// When this mutation was last attempted
  final DateTime? lastAttemptAt;

  /// When this mutation was completed (success or abandoned)
  final DateTime? completedAt;

  /// Local version number for conflict detection
  final int localVersion;

  /// Server version at time of creation (for optimistic locking)
  final int? serverVersion;

  /// Temporary local ID for create operations (to map to server ID after sync)
  final String? tempLocalId;

  /// Human-readable description of the mutation
  final String? description;

  const PendingMutation({
    required this.id,
    required this.type,
    required this.entityType,
    this.entityId,
    required this.data,
    this.status = MutationStatus.pending,
    this.errorMessage,
    this.retryCount = 0,
    this.maxRetries = 3,
    required this.createdAt,
    this.lastAttemptAt,
    this.completedAt,
    this.localVersion = 1,
    this.serverVersion,
    this.tempLocalId,
    this.description,
  });

  /// Create a copy with updated fields
  PendingMutation copyWith({
    String? id,
    MutationType? type,
    MutationEntityType? entityType,
    String? entityId,
    Map<String, dynamic>? data,
    MutationStatus? status,
    String? errorMessage,
    int? retryCount,
    int? maxRetries,
    DateTime? createdAt,
    DateTime? lastAttemptAt,
    DateTime? completedAt,
    int? localVersion,
    int? serverVersion,
    String? tempLocalId,
    String? description,
  }) {
    return PendingMutation(
      id: id ?? this.id,
      type: type ?? this.type,
      entityType: entityType ?? this.entityType,
      entityId: entityId ?? this.entityId,
      data: data ?? this.data,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
      retryCount: retryCount ?? this.retryCount,
      maxRetries: maxRetries ?? this.maxRetries,
      createdAt: createdAt ?? this.createdAt,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      completedAt: completedAt ?? this.completedAt,
      localVersion: localVersion ?? this.localVersion,
      serverVersion: serverVersion ?? this.serverVersion,
      tempLocalId: tempLocalId ?? this.tempLocalId,
      description: description ?? this.description,
    );
  }

  /// Check if this mutation can be retried
  bool get canRetry => retryCount < maxRetries && status == MutationStatus.failed;

  /// Check if this mutation is terminal (completed, abandoned, or conflict)
  bool get isTerminal =>
      status == MutationStatus.completed ||
      status == MutationStatus.abandoned ||
      status == MutationStatus.conflict;

  /// Check if this mutation is actionable (pending or failed with retries left)
  bool get isActionable =>
      status == MutationStatus.pending ||
      (status == MutationStatus.failed && canRetry);

  /// Get display name for the operation
  String get operationName {
    switch (type) {
      case MutationType.create:
        return 'Create ${entityType.displayName}';
      case MutationType.update:
        return 'Update ${entityType.displayName}';
      case MutationType.delete:
        return 'Delete ${entityType.displayName}';
    }
  }

  /// Get status display text
  String get statusDisplayText {
    switch (status) {
      case MutationStatus.pending:
        return 'Waiting to sync';
      case MutationStatus.processing:
        return 'Syncing...';
      case MutationStatus.completed:
        return 'Synced';
      case MutationStatus.failed:
        return 'Failed ($retryCount/$maxRetries retries)';
      case MutationStatus.conflict:
        return 'Conflict detected';
      case MutationStatus.abandoned:
        return 'Abandoned';
    }
  }

  /// Serialize to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'entityType': entityType.name,
      'entityId': entityId,
      'data': data,
      'status': status.name,
      'errorMessage': errorMessage,
      'retryCount': retryCount,
      'maxRetries': maxRetries,
      'createdAt': createdAt.toIso8601String(),
      'lastAttemptAt': lastAttemptAt?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'localVersion': localVersion,
      'serverVersion': serverVersion,
      'tempLocalId': tempLocalId,
      'description': description,
    };
  }

  /// Deserialize from JSON
  factory PendingMutation.fromJson(Map<String, dynamic> json) {
    return PendingMutation(
      id: json['id'] as String,
      type: MutationType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => MutationType.create,
      ),
      entityType: MutationEntityType.values.firstWhere(
        (e) => e.name == json['entityType'],
        orElse: () => MutationEntityType.lead,
      ),
      entityId: json['entityId'] as String?,
      data: Map<String, dynamic>.from(json['data'] as Map? ?? {}),
      status: MutationStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => MutationStatus.pending,
      ),
      errorMessage: json['errorMessage'] as String?,
      retryCount: json['retryCount'] as int? ?? 0,
      maxRetries: json['maxRetries'] as int? ?? 3,
      createdAt: DateTime.parse(json['createdAt'] as String),
      lastAttemptAt: json['lastAttemptAt'] != null
          ? DateTime.parse(json['lastAttemptAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      localVersion: json['localVersion'] as int? ?? 1,
      serverVersion: json['serverVersion'] as int?,
      tempLocalId: json['tempLocalId'] as String?,
      description: json['description'] as String?,
    );
  }

  /// Serialize to JSON string
  String toJsonString() => jsonEncode(toJson());

  /// Deserialize from JSON string
  factory PendingMutation.fromJsonString(String jsonString) {
    return PendingMutation.fromJson(jsonDecode(jsonString) as Map<String, dynamic>);
  }

  @override
  String toString() {
    return 'PendingMutation(id: $id, type: $type, entityType: $entityType, '
        'entityId: $entityId, status: $status, retryCount: $retryCount)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is PendingMutation && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

/// Summary of offline queue status
class OfflineQueueSummary {
  final int pendingCount;
  final int processingCount;
  final int failedCount;
  final int conflictCount;
  final int completedCount;
  final int abandonedCount;
  final DateTime? oldestPendingAt;
  final DateTime? lastSyncAt;

  const OfflineQueueSummary({
    this.pendingCount = 0,
    this.processingCount = 0,
    this.failedCount = 0,
    this.conflictCount = 0,
    this.completedCount = 0,
    this.abandonedCount = 0,
    this.oldestPendingAt,
    this.lastSyncAt,
  });

  /// Total number of items that need attention
  int get actionableCount => pendingCount + failedCount;

  /// Total number of items in the queue
  int get totalCount =>
      pendingCount + processingCount + failedCount + conflictCount;

  /// Check if there are items to sync
  bool get hasItemsToSync => actionableCount > 0;

  /// Check if there are any conflicts
  bool get hasConflicts => conflictCount > 0;

  Map<String, dynamic> toJson() {
    return {
      'pendingCount': pendingCount,
      'processingCount': processingCount,
      'failedCount': failedCount,
      'conflictCount': conflictCount,
      'completedCount': completedCount,
      'abandonedCount': abandonedCount,
      'oldestPendingAt': oldestPendingAt?.toIso8601String(),
      'lastSyncAt': lastSyncAt?.toIso8601String(),
    };
  }

  factory OfflineQueueSummary.fromJson(Map<String, dynamic> json) {
    return OfflineQueueSummary(
      pendingCount: json['pendingCount'] as int? ?? 0,
      processingCount: json['processingCount'] as int? ?? 0,
      failedCount: json['failedCount'] as int? ?? 0,
      conflictCount: json['conflictCount'] as int? ?? 0,
      completedCount: json['completedCount'] as int? ?? 0,
      abandonedCount: json['abandonedCount'] as int? ?? 0,
      oldestPendingAt: json['oldestPendingAt'] != null
          ? DateTime.parse(json['oldestPendingAt'] as String)
          : null,
      lastSyncAt: json['lastSyncAt'] != null
          ? DateTime.parse(json['lastSyncAt'] as String)
          : null,
    );
  }
}

/// Conflict resolution strategies
enum ConflictResolutionStrategy {
  /// Keep the local changes (overwrite server)
  keepLocal,

  /// Keep the server changes (discard local)
  keepServer,

  /// Merge changes (field-level merge)
  merge,

  /// Skip this mutation and mark as conflict
  skip,
}

/// Result of a mutation sync attempt
class MutationSyncResult {
  final bool success;
  final PendingMutation mutation;
  final String? serverId;
  final Map<String, dynamic>? serverData;
  final String? errorMessage;
  final bool isConflict;

  const MutationSyncResult({
    required this.success,
    required this.mutation,
    this.serverId,
    this.serverData,
    this.errorMessage,
    this.isConflict = false,
  });

  factory MutationSyncResult.success(
    PendingMutation mutation, {
    String? serverId,
    Map<String, dynamic>? serverData,
  }) {
    return MutationSyncResult(
      success: true,
      mutation: mutation,
      serverId: serverId,
      serverData: serverData,
    );
  }

  factory MutationSyncResult.failure(
    PendingMutation mutation,
    String errorMessage, {
    bool isConflict = false,
  }) {
    return MutationSyncResult(
      success: false,
      mutation: mutation,
      errorMessage: errorMessage,
      isConflict: isConflict,
    );
  }

  factory MutationSyncResult.conflict(
    PendingMutation mutation,
    Map<String, dynamic> serverData,
  ) {
    return MutationSyncResult(
      success: false,
      mutation: mutation,
      serverData: serverData,
      isConflict: true,
      errorMessage: 'Conflict detected with server data',
    );
  }
}
