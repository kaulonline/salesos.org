import 'dart:ui' as ui;
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:perfect_freehand/perfect_freehand.dart';
import '../../core/services/canvas_notepad_service.dart' as canvas;

/// A drawing canvas widget with Apple Pencil support
class DrawingCanvas extends StatefulWidget {
  final List<canvas.CanvasStroke> strokes;
  final canvas.CanvasStroke? currentStroke;
  final Color backgroundColor;
  final canvas.CanvasToolSettings toolSettings;
  final Function(canvas.StrokePoint) onStrokeStart;
  final Function(canvas.StrokePoint) onStrokeUpdate;
  final VoidCallback onStrokeEnd;
  final Function(canvas.CanvasStroke)? onStrokeComplete;
  final bool readOnly;

  const DrawingCanvas({
    super.key,
    required this.strokes,
    this.currentStroke,
    this.backgroundColor = Colors.white,
    required this.toolSettings,
    required this.onStrokeStart,
    required this.onStrokeUpdate,
    required this.onStrokeEnd,
    this.onStrokeComplete,
    this.readOnly = false,
  });

  @override
  State<DrawingCanvas> createState() => _DrawingCanvasState();
}

class _DrawingCanvasState extends State<DrawingCanvas> {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: widget.readOnly ? null : _onPanStart,
      onPanUpdate: widget.readOnly ? null : _onPanUpdate,
      onPanEnd: widget.readOnly ? null : _onPanEnd,
      child: Listener(
        onPointerDown: widget.readOnly ? null : _onPointerDown,
        onPointerMove: widget.readOnly ? null : _onPointerMove,
        onPointerUp: widget.readOnly ? null : _onPointerUp,
        child: RepaintBoundary(
          child: CustomPaint(
            painter: _CanvasPainter(
              strokes: widget.strokes,
              currentStroke: widget.currentStroke,
              backgroundColor: widget.backgroundColor,
            ),
            size: Size.infinite,
          ),
        ),
      ),
    );
  }

  void _onPointerDown(PointerDownEvent event) {
    // Use pointer event for better pressure/tilt data (Apple Pencil)
    if (event.kind == PointerDeviceKind.stylus || event.kind == PointerDeviceKind.invertedStylus) {
      HapticFeedback.selectionClick();
      final point = canvas.StrokePoint(
        x: event.localPosition.dx,
        y: event.localPosition.dy,
        pressure: event.pressure,
        tiltX: event.tilt,
        tiltY: event.tilt,
      );
      widget.onStrokeStart(point);
    }
  }

  void _onPointerMove(PointerMoveEvent event) {
    if (event.kind == PointerDeviceKind.stylus || event.kind == PointerDeviceKind.invertedStylus) {
      final point = canvas.StrokePoint(
        x: event.localPosition.dx,
        y: event.localPosition.dy,
        pressure: event.pressure,
        tiltX: event.tilt,
        tiltY: event.tilt,
      );
      widget.onStrokeUpdate(point);
    }
  }

  void _onPointerUp(PointerUpEvent event) {
    if (event.kind == PointerDeviceKind.stylus || event.kind == PointerDeviceKind.invertedStylus) {
      HapticFeedback.lightImpact();
      widget.onStrokeEnd();
    }
  }

  void _onPanStart(DragStartDetails details) {
    // Fallback for touch/mouse input
    HapticFeedback.selectionClick();
    final point = canvas.StrokePoint(
      x: details.localPosition.dx,
      y: details.localPosition.dy,
      pressure: 0.5, // Default pressure for touch
    );
    widget.onStrokeStart(point);
  }

  void _onPanUpdate(DragUpdateDetails details) {
    final point = canvas.StrokePoint(
      x: details.localPosition.dx,
      y: details.localPosition.dy,
      pressure: 0.5,
    );
    widget.onStrokeUpdate(point);
  }

  void _onPanEnd(DragEndDetails details) {
    HapticFeedback.lightImpact();
    widget.onStrokeEnd();
  }
}

/// Custom painter for rendering strokes
class _CanvasPainter extends CustomPainter {
  final List<canvas.CanvasStroke> strokes;
  final canvas.CanvasStroke? currentStroke;
  final Color backgroundColor;

  _CanvasPainter({
    required this.strokes,
    this.currentStroke,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvasWidget, Size size) {
    // Draw background
    canvasWidget.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = backgroundColor,
    );

    // Draw grid pattern (optional, for lined paper effect)
    _drawGridPattern(canvasWidget, size);

    // Draw all completed strokes
    for (final stroke in strokes) {
      _drawStroke(canvasWidget, stroke);
    }

    // Draw current stroke being drawn
    if (currentStroke != null) {
      _drawStroke(canvasWidget, currentStroke!);
    }
  }

  void _drawGridPattern(Canvas canvasWidget, Size size) {
    final paint = Paint()
      ..color = Colors.grey.withValues(alpha: 0.1)
      ..strokeWidth = 0.5;

    const spacing = 30.0;

    // Horizontal lines
    for (double y = spacing; y < size.height; y += spacing) {
      canvasWidget.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  void _drawStroke(Canvas canvasWidget, canvas.CanvasStroke stroke) {
    if (stroke.points.isEmpty) return;

    final paint = Paint()
      ..color = stroke.isEraser ? backgroundColor : stroke.color
      ..strokeCap = stroke.strokeCap
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.fill;

    // Convert stroke points to perfect_freehand format
    final inputPoints = stroke.points
        .map((p) => PointVector(p.x, p.y, p.pressure))
        .toList();

    // Get the outline points using perfect_freehand
    final outlinePoints = getStroke(
      inputPoints,
      options: StrokeOptions(
        size: stroke.strokeWidth,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        start: StrokeEndOptions.start(
          taperEnabled: true,
          cap: true,
        ),
        end: StrokeEndOptions.end(
          taperEnabled: true,
          cap: true,
        ),
        simulatePressure: stroke.points.every((p) => p.pressure == 0.5),
      ),
    );

    if (outlinePoints.isEmpty) return;

    // Create path from outline points
    final path = ui.Path();
    if (outlinePoints.isNotEmpty) {
      path.moveTo(outlinePoints[0].dx, outlinePoints[0].dy);
      for (int i = 1; i < outlinePoints.length; i++) {
        path.lineTo(outlinePoints[i].dx, outlinePoints[i].dy);
      }
      path.close();
    }

    canvasWidget.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _CanvasPainter oldDelegate) {
    return oldDelegate.strokes != strokes ||
        oldDelegate.currentStroke != currentStroke ||
        oldDelegate.backgroundColor != backgroundColor;
  }
}

/// Mini canvas preview widget
class CanvasPreview extends StatelessWidget {
  final List<canvas.CanvasStroke> strokes;
  final Color backgroundColor;
  final double width;
  final double height;
  final BorderRadius? borderRadius;

  const CanvasPreview({
    super.key,
    required this.strokes,
    this.backgroundColor = Colors.white,
    this.width = 100,
    this.height = 100,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.circular(8),
      child: SizedBox(
        width: width,
        height: height,
        child: CustomPaint(
          painter: _MiniCanvasPainter(
            strokes: strokes,
            backgroundColor: backgroundColor,
          ),
        ),
      ),
    );
  }
}

class _MiniCanvasPainter extends CustomPainter {
  final List<canvas.CanvasStroke> strokes;
  final Color backgroundColor;

  _MiniCanvasPainter({
    required this.strokes,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvasWidget, Size size) {
    canvasWidget.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = backgroundColor,
    );

    if (strokes.isEmpty) return;

    // Find bounds of all strokes
    double minX = double.infinity, minY = double.infinity;
    double maxX = double.negativeInfinity, maxY = double.negativeInfinity;

    for (final stroke in strokes) {
      for (final point in stroke.points) {
        minX = minX < point.x ? minX : point.x;
        minY = minY < point.y ? minY : point.y;
        maxX = maxX > point.x ? maxX : point.x;
        maxY = maxY > point.y ? maxY : point.y;
      }
    }

    final strokeWidth = maxX - minX;
    final strokeHeight = maxY - minY;

    if (strokeWidth <= 0 || strokeHeight <= 0) return;

    // Scale to fit
    final scale = (size.width * 0.8) / strokeWidth.clamp(1, double.infinity);
    final scaleY = (size.height * 0.8) / strokeHeight.clamp(1, double.infinity);
    final finalScale = scale < scaleY ? scale : scaleY;

    final offsetX = (size.width - strokeWidth * finalScale) / 2 - minX * finalScale;
    final offsetY = (size.height - strokeHeight * finalScale) / 2 - minY * finalScale;

    // Draw strokes scaled
    for (final stroke in strokes) {
      if (stroke.points.length < 2) continue;

      final paint = Paint()
        ..color = stroke.isEraser ? backgroundColor : stroke.color
        ..strokeWidth = (stroke.strokeWidth * finalScale).clamp(0.5, 3.0)
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;

      final path = ui.Path();
      path.moveTo(
        stroke.points[0].x * finalScale + offsetX,
        stroke.points[0].y * finalScale + offsetY,
      );

      for (int i = 1; i < stroke.points.length; i++) {
        path.lineTo(
          stroke.points[i].x * finalScale + offsetX,
          stroke.points[i].y * finalScale + offsetY,
        );
      }

      canvasWidget.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _MiniCanvasPainter oldDelegate) {
    return oldDelegate.strokes != strokes ||
        oldDelegate.backgroundColor != backgroundColor;
  }
}
