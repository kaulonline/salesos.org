import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// OrientationManager restricts device orientation based on screen size.
/// - Phones (compact): Portrait only
/// - Tablets (medium+): All orientations allowed
///
/// This widget must wrap the app to properly detect device size on first build.
class OrientationManager extends StatefulWidget {
  final Widget child;

  const OrientationManager({super.key, required this.child});

  @override
  State<OrientationManager> createState() => _OrientationManagerState();
}

class _OrientationManagerState extends State<OrientationManager>
    with WidgetsBindingObserver {
  bool _hasSetOrientation = false;

  // Material Design 3 breakpoint for medium screens (tablets)
  static const double _tabletBreakpoint = 600.0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeMetrics() {
    super.didChangeMetrics();
    // Re-evaluate orientation when metrics change (e.g., device rotation)
    _updateOrientationIfNeeded();
  }

  void _updateOrientationIfNeeded() {
    if (!mounted) return;

    final view = WidgetsBinding.instance.platformDispatcher.views.first;
    final physicalSize = view.physicalSize;
    final devicePixelRatio = view.devicePixelRatio;

    // Calculate logical size (in dp)
    final logicalWidth = physicalSize.width / devicePixelRatio;
    final logicalHeight = physicalSize.height / devicePixelRatio;

    // Use the shorter dimension to determine device type
    // This ensures tablets in landscape are still detected as tablets
    final shortestSide =
        logicalWidth < logicalHeight ? logicalWidth : logicalHeight;

    final isTablet = shortestSide >= _tabletBreakpoint;

    if (isTablet) {
      // Tablets: Allow all orientations
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    } else {
      // Phones: Portrait only
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Set orientation on first build using post-frame callback
    if (!_hasSetOrientation) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _updateOrientationIfNeeded();
        _hasSetOrientation = true;
      });
    }

    return widget.child;
  }
}
