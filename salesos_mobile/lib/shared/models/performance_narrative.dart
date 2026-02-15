// Data models for AI-generated performance narrative insights

/// Highlight type determines the visual styling of each insight bullet
enum HighlightType {
  /// Positive trend or achievement (green accent)
  positive,

  /// Neutral information (platinum/gray accent)
  neutral,

  /// Needs attention or warning (gold accent)
  attention,

  /// AI-generated insight or recommendation (jade accent)
  insight,
}

/// A single narrative highlight/bullet point
class NarrativeHighlight {
  /// The main text content of the highlight
  final String text;

  /// Type determines visual styling (color, icon)
  final HighlightType type;

  /// Optional metric value to display (e.g., "$420K", "34%")
  final String? metric;

  /// Optional percentage change to show with arrow indicator
  final double? changePercent;

  const NarrativeHighlight({
    required this.text,
    required this.type,
    this.metric,
    this.changePercent,
  });

  factory NarrativeHighlight.fromJson(Map<String, dynamic> json) {
    return NarrativeHighlight(
      text: json['text'] as String? ?? '',
      type: _parseHighlightType(json['type'] as String?),
      metric: json['metric'] as String?,
      changePercent: (json['changePercent'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'text': text,
      'type': type.name,
      'metric': metric,
      'changePercent': changePercent,
    };
  }

  static HighlightType _parseHighlightType(String? type) {
    switch (type?.toLowerCase()) {
      case 'positive':
        return HighlightType.positive;
      case 'attention':
        return HighlightType.attention;
      case 'insight':
        return HighlightType.insight;
      case 'neutral':
      default:
        return HighlightType.neutral;
    }
  }
}

/// Complete AI-generated performance narrative for a time period
class PerformanceNarrative {
  /// Display label for the period (e.g., "Q3 2024", "FY 2024")
  final String periodLabel;

  /// Brief one-line summary
  final String summary;

  /// List of key highlights/bullet points
  final List<NarrativeHighlight> highlights;

  /// Full narrative text for TTS and detailed reading
  final String fullNarrative;

  /// When this narrative was generated
  final DateTime generatedAt;

  const PerformanceNarrative({
    required this.periodLabel,
    required this.summary,
    required this.highlights,
    required this.fullNarrative,
    required this.generatedAt,
  });

  factory PerformanceNarrative.fromJson(Map<String, dynamic> json) {
    return PerformanceNarrative(
      periodLabel: json['periodLabel'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      highlights: (json['highlights'] as List<dynamic>?)
              ?.map((h) =>
                  NarrativeHighlight.fromJson(h as Map<String, dynamic>))
              .toList() ??
          [],
      fullNarrative: json['fullNarrative'] as String? ?? '',
      generatedAt: json['generatedAt'] != null
          ? DateTime.tryParse(json['generatedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'periodLabel': periodLabel,
      'summary': summary,
      'highlights': highlights.map((h) => h.toJson()).toList(),
      'fullNarrative': fullNarrative,
      'generatedAt': generatedAt.toIso8601String(),
    };
  }

  /// Estimated reading/listening time in seconds
  int get estimatedDurationSeconds {
    // Average speaking rate is ~150 words per minute
    final wordCount = fullNarrative.split(' ').length;
    return (wordCount / 150 * 60).round();
  }

  /// Formatted duration string (e.g., "~2 min")
  String get formattedDuration {
    final seconds = estimatedDurationSeconds;
    if (seconds < 60) {
      return '~$seconds sec';
    }
    final minutes = (seconds / 60).round();
    return '~$minutes min';
  }
}
