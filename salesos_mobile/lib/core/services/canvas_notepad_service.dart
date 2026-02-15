import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../network/api_client.dart';

/// A single point in a stroke with pressure and tilt data
class StrokePoint {
  final double x;
  final double y;
  final double pressure;
  final double tiltX;
  final double tiltY;
  final int timestamp;

  StrokePoint({
    required this.x,
    required this.y,
    this.pressure = 0.5,
    this.tiltX = 0.0,
    this.tiltY = 0.0,
    int? timestamp,
  }) : timestamp = timestamp ?? DateTime.now().millisecondsSinceEpoch;

  factory StrokePoint.fromJson(Map<String, dynamic> json) {
    return StrokePoint(
      x: (json['x'] as num).toDouble(),
      y: (json['y'] as num).toDouble(),
      pressure: (json['pressure'] as num?)?.toDouble() ?? 0.5,
      tiltX: (json['tiltX'] as num?)?.toDouble() ?? 0.0,
      tiltY: (json['tiltY'] as num?)?.toDouble() ?? 0.0,
      timestamp: json['timestamp'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'x': x,
        'y': y,
        'pressure': pressure,
        'tiltX': tiltX,
        'tiltY': tiltY,
        'timestamp': timestamp,
      };

  Offset get offset => Offset(x, y);
}

/// A complete stroke with style information
class CanvasStroke {
  final String id;
  final List<StrokePoint> points;
  final Color color;
  final double strokeWidth;
  final StrokeCap strokeCap;
  final bool isEraser;

  CanvasStroke({
    String? id,
    required this.points,
    this.color = Colors.black,
    this.strokeWidth = 3.0,
    this.strokeCap = StrokeCap.round,
    this.isEraser = false,
  }) : id = id ?? const Uuid().v4();

  factory CanvasStroke.fromJson(Map<String, dynamic> json) {
    return CanvasStroke(
      id: json['id'] as String,
      points: (json['points'] as List)
          .map((p) => StrokePoint.fromJson(p as Map<String, dynamic>))
          .toList(),
      color: Color(json['color'] as int),
      strokeWidth: (json['strokeWidth'] as num).toDouble(),
      strokeCap: StrokeCap.values[json['strokeCap'] as int? ?? 0],
      isEraser: json['isEraser'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'points': points.map((p) => p.toJson()).toList(),
        'color': color.toARGB32(),
        'strokeWidth': strokeWidth,
        'strokeCap': strokeCap.index,
        'isEraser': isEraser,
      };

  CanvasStroke copyWith({
    String? id,
    List<StrokePoint>? points,
    Color? color,
    double? strokeWidth,
    StrokeCap? strokeCap,
    bool? isEraser,
  }) {
    return CanvasStroke(
      id: id ?? this.id,
      points: points ?? this.points,
      color: color ?? this.color,
      strokeWidth: strokeWidth ?? this.strokeWidth,
      strokeCap: strokeCap ?? this.strokeCap,
      isEraser: isEraser ?? this.isEraser,
    );
  }
}

/// A canvas note with multiple pages
class CanvasNote {
  final String id;
  final String? title;
  final List<CanvasPage> pages;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? linkedEntityId;
  final String? linkedEntityType;
  final String? linkedEntityName;
  final String? extractedText;
  final bool isSynced;

  CanvasNote({
    String? id,
    this.title,
    List<CanvasPage>? pages,
    DateTime? createdAt,
    DateTime? updatedAt,
    this.linkedEntityId,
    this.linkedEntityType,
    this.linkedEntityName,
    this.extractedText,
    this.isSynced = false,
  })  : id = id ?? const Uuid().v4(),
        pages = pages ?? [CanvasPage()],
        createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory CanvasNote.fromJson(Map<String, dynamic> json) {
    return CanvasNote(
      id: json['id'] as String,
      title: json['title'] as String?,
      pages: (json['pages'] as List?)
              ?.map((p) => CanvasPage.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [CanvasPage()],
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      linkedEntityId: json['linkedEntityId'] as String?,
      linkedEntityType: json['linkedEntityType'] as String?,
      linkedEntityName: json['linkedEntityName'] as String?,
      extractedText: json['extractedText'] as String?,
      isSynced: json['isSynced'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'pages': pages.map((p) => p.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'linkedEntityId': linkedEntityId,
        'linkedEntityType': linkedEntityType,
        'linkedEntityName': linkedEntityName,
        'extractedText': extractedText,
        'isSynced': isSynced,
      };

  CanvasNote copyWith({
    String? id,
    String? title,
    List<CanvasPage>? pages,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? linkedEntityId,
    String? linkedEntityType,
    String? linkedEntityName,
    String? extractedText,
    bool? isSynced,
  }) {
    return CanvasNote(
      id: id ?? this.id,
      title: title ?? this.title,
      pages: pages ?? this.pages,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
      linkedEntityId: linkedEntityId ?? this.linkedEntityId,
      linkedEntityType: linkedEntityType ?? this.linkedEntityType,
      linkedEntityName: linkedEntityName ?? this.linkedEntityName,
      extractedText: extractedText ?? this.extractedText,
      isSynced: isSynced ?? this.isSynced,
    );
  }

  bool get hasContent => pages.any((p) => p.strokes.isNotEmpty);
}

/// A single page in a canvas note
class CanvasPage {
  final String id;
  final List<CanvasStroke> strokes;
  final Color backgroundColor;
  final int pageIndex;

  CanvasPage({
    String? id,
    List<CanvasStroke>? strokes,
    this.backgroundColor = Colors.white,
    this.pageIndex = 0,
  })  : id = id ?? const Uuid().v4(),
        strokes = strokes ?? [];

  factory CanvasPage.fromJson(Map<String, dynamic> json) {
    return CanvasPage(
      id: json['id'] as String,
      strokes: (json['strokes'] as List?)
              ?.map((s) => CanvasStroke.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      backgroundColor: Color(json['backgroundColor'] as int? ?? 0xFFFFFFFF),
      pageIndex: json['pageIndex'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'strokes': strokes.map((s) => s.toJson()).toList(),
        'backgroundColor': backgroundColor.toARGB32(),
        'pageIndex': pageIndex,
      };

  CanvasPage copyWith({
    String? id,
    List<CanvasStroke>? strokes,
    Color? backgroundColor,
    int? pageIndex,
  }) {
    return CanvasPage(
      id: id ?? this.id,
      strokes: strokes ?? this.strokes,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      pageIndex: pageIndex ?? this.pageIndex,
    );
  }
}

/// Pen tool types
enum PenTool {
  pen,
  pencil,
  marker,
  highlighter,
  eraser,
}

/// Canvas tool settings
class CanvasToolSettings {
  final PenTool tool;
  final Color color;
  final double strokeWidth;
  final double opacity;

  const CanvasToolSettings({
    this.tool = PenTool.pen,
    this.color = Colors.black,
    this.strokeWidth = 3.0,
    this.opacity = 1.0,
  });

  CanvasToolSettings copyWith({
    PenTool? tool,
    Color? color,
    double? strokeWidth,
    double? opacity,
  }) {
    return CanvasToolSettings(
      tool: tool ?? this.tool,
      color: color ?? this.color,
      strokeWidth: strokeWidth ?? this.strokeWidth,
      opacity: opacity ?? this.opacity,
    );
  }

  double get effectiveStrokeWidth {
    switch (tool) {
      case PenTool.pen:
        return strokeWidth;
      case PenTool.pencil:
        return strokeWidth * 0.8;
      case PenTool.marker:
        return strokeWidth * 2.0;
      case PenTool.highlighter:
        return strokeWidth * 4.0;
      case PenTool.eraser:
        return strokeWidth * 3.0;
    }
  }

  Color get effectiveColor {
    if (tool == PenTool.highlighter) {
      return color.withValues(alpha: 0.4);
    }
    return color.withValues(alpha: opacity);
  }

  bool get isEraser => tool == PenTool.eraser;
}

/// Service for managing canvas notes
class CanvasNotepadService {
  final ApiClient _apiClient;
  Box<String>? _notesBox;
  static const String _boxName = 'canvas_notes';

  CanvasNotepadService(this._apiClient);

  /// Initialize local storage
  Future<void> init() async {
    if (_notesBox == null || !_notesBox!.isOpen) {
      _notesBox = await Hive.openBox<String>(_boxName);
    }
  }

  /// Get all canvas notes (local)
  Future<List<CanvasNote>> getAllNotes() async {
    await init();
    final notes = <CanvasNote>[];
    for (final key in _notesBox!.keys) {
      try {
        final json = _notesBox!.get(key);
        if (json != null) {
          notes.add(CanvasNote.fromJson(jsonDecode(json)));
        }
      } catch (e) {
        // Silently ignore
      }
    }
    notes.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return notes;
  }

  /// Get a single canvas note
  Future<CanvasNote?> getNote(String id) async {
    await init();
    try {
      final json = _notesBox!.get(id);
      if (json != null) {
        return CanvasNote.fromJson(jsonDecode(json));
      }
    } catch (e) {
      // Silently ignore
    }
    return null;
  }

  /// Save a canvas note (local)
  Future<void> saveNote(CanvasNote note) async {
    await init();
    final updatedNote = note.copyWith(updatedAt: DateTime.now());
    await _notesBox!.put(note.id, jsonEncode(updatedNote.toJson()));
  }

  /// Delete a canvas note
  Future<void> deleteNote(String id) async {
    await init();
    await _notesBox!.delete(id);
    // Also delete any exported images
    try {
      final dir = await getApplicationDocumentsDirectory();
      final imageFile = File('${dir.path}/canvas_notes/$id.png');
      if (await imageFile.exists()) {
        await imageFile.delete();
      }
    } catch (e) {
      // Silently ignore
    }
  }

  /// Export canvas to image
  Future<File?> exportToImage(
    CanvasNote note, {
    int pageIndex = 0,
    double scale = 2.0,
    Size canvasSize = const Size(800, 1000),
  }) async {
    if (pageIndex >= note.pages.length) return null;
    final page = note.pages[pageIndex];

    try {
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final size = canvasSize * scale;

      // Draw background
      canvas.drawRect(
        Rect.fromLTWH(0, 0, size.width, size.height),
        Paint()..color = page.backgroundColor,
      );

      // Draw all strokes
      for (final stroke in page.strokes) {
        if (stroke.points.length < 2) continue;

        final paint = Paint()
          ..color = stroke.isEraser ? page.backgroundColor : stroke.color
          ..strokeWidth = stroke.strokeWidth * scale
          ..strokeCap = stroke.strokeCap
          ..strokeJoin = StrokeJoin.round
          ..style = PaintingStyle.stroke;

        final path = Path();
        path.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);

        for (int i = 1; i < stroke.points.length; i++) {
          final p0 = stroke.points[i - 1];
          final p1 = stroke.points[i];
          final midX = (p0.x + p1.x) / 2 * scale;
          final midY = (p0.y + p1.y) / 2 * scale;
          path.quadraticBezierTo(p0.x * scale, p0.y * scale, midX, midY);
        }

        canvas.drawPath(path, paint);
      }

      final picture = recorder.endRecording();
      final img = await picture.toImage(size.width.toInt(), size.height.toInt());
      final byteData = await img.toByteData(format: ui.ImageByteFormat.png);

      if (byteData == null) return null;

      // Save to file
      final dir = await getApplicationDocumentsDirectory();
      final notesDir = Directory('${dir.path}/canvas_notes');
      if (!await notesDir.exists()) {
        await notesDir.create(recursive: true);
      }

      final file = File('${notesDir.path}/${note.id}_$pageIndex.png');
      await file.writeAsBytes(byteData.buffer.asUint8List());
      return file;
    } catch (e) {
      return null;
    }
  }

  /// Process canvas with OCR and AI
  Future<Map<String, dynamic>?> processWithAI(CanvasNote note) async {
    try {
      // Export all pages to images
      final imageFiles = <File>[];
      for (int i = 0; i < note.pages.length; i++) {
        final file = await exportToImage(note, pageIndex: i);
        if (file != null) {
          imageFiles.add(file);
        }
      }

      if (imageFiles.isEmpty) {
        return {'error': 'No content to process'};
      }

      // Upload first page for OCR (can be extended to all pages)
      final response = await _apiClient.uploadFile(
        '/smart-capture/handwritten',
        filePath: imageFiles[0].path,
        fieldName: 'file',
        data: {
          'createNote': false,
          'analyzeContent': true,
        },
      );

      if (response.data != null) {
        final extractedText = response.data['extractedData']?['text'] as String?;
        final aiEnhanced = response.data['aiEnhanced'] as bool? ?? false;

        return {
          'success': true,
          'extractedText': extractedText,
          'aiEnhanced': aiEnhanced,
          'suggestedEntities': response.data['suggestedEntities'],
          'summary': response.data['summary'],
        };
      }

      return {'error': 'No data returned'};
    } catch (e) {
      return {'error': e.toString()};
    }
  }

  /// Sync note to server and create CRM note
  Future<bool> syncToServer(CanvasNote note) async {
    try {
      // First process with AI to get extracted text
      final aiResult = await processWithAI(note);
      final extractedText = aiResult?['extractedText'] as String?;

      if (extractedText == null || extractedText.isEmpty) {
        return false;
      }

      // Create CRM note with extracted text
      final response = await _apiClient.post('/notes', data: {
        'title': note.title ?? 'Canvas Note - ${note.createdAt.toString().substring(0, 10)}',
        'body': extractedText,
        'leadId': note.linkedEntityType == 'lead' ? note.linkedEntityId : null,
        'accountId': note.linkedEntityType == 'account' ? note.linkedEntityId : null,
        'contactId': note.linkedEntityType == 'contact' ? note.linkedEntityId : null,
        'opportunityId': note.linkedEntityType == 'opportunity' ? note.linkedEntityId : null,
        'metadata': {
          'source': 'canvas_notepad',
          'canvasNoteId': note.id,
          'hasDrawing': true,
        },
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Update local note as synced
        final updatedNote = note.copyWith(
          isSynced: true,
          extractedText: extractedText,
        );
        await saveNote(updatedNote);
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /// Get notes linked to an entity
  Future<List<CanvasNote>> getNotesForEntity(String entityId, String entityType) async {
    final allNotes = await getAllNotes();
    return allNotes
        .where((n) => n.linkedEntityId == entityId && n.linkedEntityType == entityType)
        .toList();
  }
}

/// Provider for CanvasNotepadService
final canvasNotepadServiceProvider = Provider<CanvasNotepadService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CanvasNotepadService(apiClient);
});

/// Provider for all canvas notes
final canvasNotesProvider = FutureProvider<List<CanvasNote>>((ref) async {
  final service = ref.watch(canvasNotepadServiceProvider);
  return service.getAllNotes();
});

/// Provider for a single canvas note
final canvasNoteProvider = FutureProvider.family<CanvasNote?, String>((ref, id) async {
  final service = ref.watch(canvasNotepadServiceProvider);
  return service.getNote(id);
});

/// Provider for canvas tool settings (current selection)
final canvasToolSettingsProvider = StateProvider<CanvasToolSettings>((ref) {
  return const CanvasToolSettings();
});
