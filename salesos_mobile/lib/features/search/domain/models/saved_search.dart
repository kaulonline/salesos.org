import 'dart:convert';

/// Model representing a saved search with query and filters
class SavedSearch {
  final String id;
  final String name;
  final String query;
  final Map<String, dynamic> filters;
  final DateTime createdAt;
  final DateTime lastUsedAt;
  final int useCount;
  final String? iconName;

  SavedSearch({
    required this.id,
    required this.name,
    required this.query,
    this.filters = const {},
    DateTime? createdAt,
    DateTime? lastUsedAt,
    this.useCount = 0,
    this.iconName,
  })  : createdAt = createdAt ?? DateTime.now(),
        lastUsedAt = lastUsedAt ?? DateTime.now();

  /// Create from JSON map
  factory SavedSearch.fromJson(Map<String, dynamic> json) {
    return SavedSearch(
      id: json['id'] as String,
      name: json['name'] as String,
      query: json['query'] as String,
      filters: json['filters'] != null
          ? Map<String, dynamic>.from(json['filters'] as Map)
          : {},
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      lastUsedAt: json['lastUsedAt'] != null
          ? DateTime.parse(json['lastUsedAt'] as String)
          : DateTime.now(),
      useCount: json['useCount'] as int? ?? 0,
      iconName: json['iconName'] as String?,
    );
  }

  /// Convert to JSON map
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'query': query,
      'filters': filters,
      'createdAt': createdAt.toIso8601String(),
      'lastUsedAt': lastUsedAt.toIso8601String(),
      'useCount': useCount,
      'iconName': iconName,
    };
  }

  /// Create a copy with updated fields
  SavedSearch copyWith({
    String? id,
    String? name,
    String? query,
    Map<String, dynamic>? filters,
    DateTime? createdAt,
    DateTime? lastUsedAt,
    int? useCount,
    String? iconName,
  }) {
    return SavedSearch(
      id: id ?? this.id,
      name: name ?? this.name,
      query: query ?? this.query,
      filters: filters ?? this.filters,
      createdAt: createdAt ?? this.createdAt,
      lastUsedAt: lastUsedAt ?? this.lastUsedAt,
      useCount: useCount ?? this.useCount,
      iconName: iconName ?? this.iconName,
    );
  }

  /// Serialize to JSON string for storage
  String toJsonString() => jsonEncode(toJson());

  /// Create from JSON string
  factory SavedSearch.fromJsonString(String jsonString) {
    return SavedSearch.fromJson(jsonDecode(jsonString) as Map<String, dynamic>);
  }

  /// Get the entity filter if present
  String? get entityFilter => filters['entityType'] as String?;

  /// Check if this search has any filters applied
  bool get hasFilters => filters.isNotEmpty;

  /// Get a display description for the search
  String get displayDescription {
    final parts = <String>[];

    if (query.isNotEmpty) {
      parts.add('"$query"');
    }

    final entityType = filters['entityType'] as String?;
    if (entityType != null && entityType != 'All') {
      parts.add('in $entityType');
    }

    return parts.isEmpty ? 'All items' : parts.join(' ');
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SavedSearch &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'SavedSearch{id: $id, name: $name, query: $query, filters: $filters}';
  }
}
