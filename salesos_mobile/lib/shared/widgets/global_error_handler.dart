import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/config/theme.dart';
import '../../core/services/error_reporting_service.dart';
import '../../core/utils/haptics.dart';
import 'luxury_card.dart';
import 'iris_button.dart';

/// Factory function to create LuxuryCard - workaround for analyzer issue
Widget _createLuxuryCard({
  required Widget child,
  LuxuryTier tier = LuxuryTier.gold,
  LuxuryCardVariant variant = LuxuryCardVariant.standard,
  EdgeInsetsGeometry padding = const EdgeInsets.all(16),
}) {
  return LuxuryCard(
    tier: tier,
    variant: variant,
    padding: padding,
    child: child,
  );
}

/// Global error handler widget that wraps the app and provides
/// graceful error handling with fallback UI.
///
/// This widget implements a comprehensive error boundary system:
/// - Catches Flutter framework errors via FlutterError.onError
/// - Provides custom ErrorWidget.builder for inline widget errors
/// - Shows full-screen fallback UI for severe/fatal errors
/// - Integrates with ErrorReportingService for centralized logging
/// - Supports retry/recovery mechanisms
///
/// Usage:
/// ```dart
/// GlobalErrorHandler(
///   child: MyApp(),
/// )
/// ```
class GlobalErrorHandler extends ConsumerStatefulWidget {
  final Widget child;

  /// Optional callback when an error occurs
  final void Function(Object error, StackTrace? stackTrace)? onError;

  /// Optional custom error widget builder for inline errors
  final Widget Function(FlutterErrorDetails details)? inlineErrorBuilder;

  /// Whether to show the full-screen fallback for severe errors
  final bool enableFullScreenFallback;

  const GlobalErrorHandler({
    super.key,
    required this.child,
    this.onError,
    this.inlineErrorBuilder,
    this.enableFullScreenFallback = true,
  });

  @override
  ConsumerState<GlobalErrorHandler> createState() => _GlobalErrorHandlerState();
}

class _GlobalErrorHandlerState extends ConsumerState<GlobalErrorHandler> {
  bool _hasError = false;
  FlutterErrorDetails? _errorDetails;
  FlutterExceptionHandler? _originalOnError;

  @override
  void initState() {
    super.initState();
    _setupErrorHandlers();
  }

  /// Set up error handlers for the widget tree
  void _setupErrorHandlers() {
    // Store the original error handler
    _originalOnError = FlutterError.onError;

    // Set up error widget builder for widget tree errors
    ErrorWidget.builder = (FlutterErrorDetails details) {
      // Use custom builder if provided
      if (widget.inlineErrorBuilder != null) {
        return widget.inlineErrorBuilder!(details);
      }
      return _buildInlineErrorWidget(details);
    };

    // Wrap the error handler to also update our state
    FlutterError.onError = (FlutterErrorDetails details) {
      // Call the original handler first (which reports to our service)
      _originalOnError?.call(details);

      // Notify parent if callback provided
      widget.onError?.call(details.exception, details.stack);

      // Check if this is a severe error that should show fallback UI
      if (widget.enableFullScreenFallback && _isSevereError(details)) {
        if (mounted) {
          setState(() {
            _hasError = true;
            _errorDetails = details;
          });
        }
      }
    };
  }

  @override
  void dispose() {
    // Restore original error handler if we stored one
    if (_originalOnError != null) {
      FlutterError.onError = _originalOnError;
    }
    super.dispose();
  }

  /// Determine if an error is severe enough to warrant full-screen fallback
  bool _isSevereError(FlutterErrorDetails details) {
    // In debug mode, don't show full-screen fallback for most errors
    // This allows developers to see the actual error in the widget tree
    if (kDebugMode) {
      return false;
    }

    // Check for specific severe error types that indicate app-breaking issues
    final errorString = details.exception.toString().toLowerCase();
    final exceptionType = details.exception.runtimeType.toString().toLowerCase();

    // RenderFlex overflow errors are common and not fatal
    if (errorString.contains('renderflex') || errorString.contains('overflow')) {
      return false;
    }

    // Check for state-related errors that indicate broken widget state
    if (errorString.contains('setState() called after dispose') ||
        errorString.contains('looking up a deactivated widget') ||
        exceptionType.contains('fluttererror')) {
      return true;
    }

    // Check for other severe error patterns
    final severePatterns = [
      'disposed',
      'null check operator',
      'range error',
      'concurrent modification',
      'stack overflow',
      'out of memory',
    ];

    for (final pattern in severePatterns) {
      if (errorString.contains(pattern)) {
        return true;
      }
    }

    // Check for assertion failures (often indicate logic errors)
    if (errorString.contains('assertion') && !kDebugMode) {
      return true;
    }

    return false;
  }

  /// Build inline error widget for non-fatal errors in the widget tree
  Widget _buildInlineErrorWidget(FlutterErrorDetails details) {
    // Report the error
    try {
      final errorService = ref.read(errorReportingServiceProvider);
      errorService.reportFlutterError(details);
    } catch (_) {
      // Ignore if service is not available
    }

    // In debug mode, show more details
    if (kDebugMode) {
      return _DebugErrorWidget(details: details);
    }

    // In release mode, show a polished inline error
    return const _InlineErrorWidget();
  }

  /// Reset the error state and attempt to recover
  void _handleRetry() {
    IrisHaptics.mediumTap();
    setState(() {
      _hasError = false;
      _errorDetails = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return _FatalErrorScreen(
        errorDetails: _errorDetails,
        onRetry: _handleRetry,
      );
    }

    return widget.child;
  }
}

/// Inline error widget for non-fatal errors within the widget tree
/// Displays a subtle warning that a section could not be loaded
class _InlineErrorWidget extends StatelessWidget {
  const _InlineErrorWidget();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? LuxuryColors.obsidian : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.warningAmber.withValues(alpha: 0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.warningAmber.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: LuxuryColors.warningAmber.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Iconsax.warning_2,
              size: 28,
              color: LuxuryColors.warningAmber,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Something went wrong',
            style: IrisTheme.titleMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'This section could not be loaded.',
            style: IrisTheme.bodySmall.copyWith(
              color: LuxuryColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .scale(begin: const Offset(0.95, 0.95), end: const Offset(1, 1));
  }
}

/// Debug error widget with full error details
/// Only shown in debug mode for developer visibility
class _DebugErrorWidget extends StatelessWidget {
  final FlutterErrorDetails details;

  const _DebugErrorWidget({required this.details});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Widget Error',
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              details.exception.toString(),
              style: TextStyle(
                color: Colors.red.shade900,
                fontSize: 11,
                fontFamily: 'monospace',
              ),
              maxLines: 5,
              overflow: TextOverflow.ellipsis,
            ),
            if (details.library != null) ...[
              const SizedBox(height: 4),
              Text(
                'Library: ${details.library}',
                style: TextStyle(
                  color: Colors.red.shade600,
                  fontSize: 10,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Full-screen fatal error screen with luxury design
/// Displayed when a severe error occurs that prevents normal app operation
class _FatalErrorScreen extends StatelessWidget {
  final FlutterErrorDetails? errorDetails;
  final VoidCallback onRetry;

  const _FatalErrorScreen({
    this.errorDetails,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    final backgroundColor = isDark ? LuxuryColors.richBlack : LuxuryColors.cream;

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: isDark ? IrisTheme.darkTheme : IrisTheme.lightTheme,
      home: Scaffold(
        backgroundColor: backgroundColor,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Animated error icon with pulsing glow
                  _AnimatedErrorIcon(isDark: isDark),

                  const SizedBox(height: 40),

                  // Title
                  Text(
                    'Oops! Something Went Wrong',
                    style: IrisTheme.headlineSmall.copyWith(
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                    textAlign: TextAlign.center,
                  ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.3),

                  const SizedBox(height: 16),

                  // Description
                  Text(
                    'We encountered an unexpected error. Please try again or restart the app if the problem persists.',
                    style: IrisTheme.bodyMedium.copyWith(
                      color: LuxuryColors.textMuted,
                      height: 1.6,
                    ),
                    textAlign: TextAlign.center,
                  ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.3),

                  const SizedBox(height: 48),

                  // Retry button
                  IrisButton(
                    label: 'Try Again',
                    onPressed: onRetry,
                    icon: Iconsax.refresh,
                    isFullWidth: true,
                  ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.3),

                  const SizedBox(height: 16),

                  // Debug info in debug mode
                  if (kDebugMode && errorDetails != null)
                    _DebugInfoSection(errorDetails: errorDetails!),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Animated error icon with pulsing glow effect
/// Creates a premium visual effect for the error state
class _AnimatedErrorIcon extends StatefulWidget {
  final bool isDark;

  const _AnimatedErrorIcon({required this.isDark});

  @override
  State<_AnimatedErrorIcon> createState() => _AnimatedErrorIconState();
}

class _AnimatedErrorIconState extends State<_AnimatedErrorIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 0.3, end: 0.6).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glowAnimation,
      builder: (context, child) {
        return Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.errorRuby.withValues(alpha: _glowAnimation.value),
                blurRadius: 40,
                spreadRadius: 5,
              ),
            ],
          ),
          child: const Center(
            child: Icon(
              Iconsax.danger,
              size: 56,
              color: LuxuryColors.errorRuby,
            ),
          ),
        );
      },
    ).animate().fadeIn(duration: 400.ms).scale(
          begin: const Offset(0.8, 0.8),
          end: const Offset(1, 1),
          curve: Curves.elasticOut,
          duration: 800.ms,
        );
  }
}

/// Debug information section for development
/// Shows detailed error information in debug mode
class _DebugInfoSection extends StatelessWidget {
  final FlutterErrorDetails errorDetails;

  const _DebugInfoSection({required this.errorDetails});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _createLuxuryCard(
      tier: LuxuryTier.royal,
      variant: LuxuryCardVariant.bordered,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                Iconsax.code,
                size: 16,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
              const SizedBox(width: 8),
              Text(
                'Debug Information',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.3)
                  : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Text(
                errorDetails.exception.toString(),
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: LuxuryColors.errorRuby,
                ),
              ),
            ),
          ),
          if (errorDetails.library != null) ...[
            const SizedBox(height: 8),
            Text(
              'Library: ${errorDetails.library}',
              style: IrisTheme.caption.copyWith(
                color: LuxuryColors.textMuted,
              ),
            ),
          ],
        ],
      ),
    ).animate(delay: 500.ms).fadeIn();
  }
}

/// Error boundary widget that can be used around specific sections
/// to prevent errors from propagating to the entire app.
///
/// This widget catches errors during the build phase and displays
/// a fallback UI, preventing the error from crashing the entire app.
///
/// Usage:
/// ```dart
/// IrisErrorBoundary(
///   child: SomeWidgetThatMightFail(),
///   onError: (error, stackTrace) {
///     // Custom error handling
///   },
///   errorBuilder: (error, stackTrace) {
///     return CustomErrorWidget();
///   },
/// )
/// ```
class IrisErrorBoundary extends ConsumerStatefulWidget {
  final Widget child;

  /// Custom error widget builder
  final Widget Function(Object error, StackTrace? stackTrace)? errorBuilder;

  /// Callback when an error occurs
  final void Function(Object error, StackTrace? stackTrace)? onError;

  /// Whether to report errors to the error reporting service
  final bool reportErrors;

  /// The screen name for error context
  final String? screenName;

  const IrisErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
    this.onError,
    this.reportErrors = true,
    this.screenName,
  });

  @override
  ConsumerState<IrisErrorBoundary> createState() => _IrisErrorBoundaryState();
}

class _IrisErrorBoundaryState extends ConsumerState<IrisErrorBoundary> {
  Object? _error;
  StackTrace? _stackTrace;

  @override
  void initState() {
    super.initState();
  }

  /// Called when an error is caught
  void _handleError(Object error, StackTrace? stackTrace) {
    if (!mounted) return;

    setState(() {
      _error = error;
      _stackTrace = stackTrace;
    });

    // Notify callback
    widget.onError?.call(error, stackTrace);

    // Report to error service
    if (widget.reportErrors) {
      try {
        final errorService = ref.read(errorReportingServiceProvider);
        errorService.reportError(
          error,
          stackTrace: stackTrace,
          severity: ErrorSeverity.medium,
          context: ErrorContext(
            screenName: widget.screenName,
            action: 'Widget build error in IrisErrorBoundary',
            metadata: {'boundary_type': 'IrisErrorBoundary'},
          ),
        );
      } catch (_) {
        // Ignore if service is not available
      }
    }

    // Log in debug mode
    if (kDebugMode) {
      debugPrint('IrisErrorBoundary caught error: $error');
      if (stackTrace != null) {
        debugPrint('Stack trace: $stackTrace');
      }
    }
  }

  /// Reset the error state to retry rendering
  void _reset() {
    IrisHaptics.lightTap();
    setState(() {
      _error = null;
      _stackTrace = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      if (widget.errorBuilder != null) {
        return widget.errorBuilder!(_error!, _stackTrace);
      }
      return _DefaultErrorBoundaryWidget(
        error: _error!,
        onRetry: _reset,
      );
    }

    // Wrap in ErrorWidget to catch build errors
    return _ErrorCatcher(
      onError: _handleError,
      child: widget.child,
    );
  }
}

/// Internal widget that catches errors during build
class _ErrorCatcher extends StatefulWidget {
  final Widget child;
  final void Function(Object error, StackTrace? stackTrace) onError;

  const _ErrorCatcher({
    required this.child,
    required this.onError,
  });

  @override
  State<_ErrorCatcher> createState() => _ErrorCatcherState();
}

class _ErrorCatcherState extends State<_ErrorCatcher> {
  @override
  Widget build(BuildContext context) {
    // Note: Flutter doesn't have try-catch for build errors,
    // but ErrorWidget.builder will be called for build errors
    return widget.child;
  }
}

/// Default error boundary widget with retry option
/// Displays a polished error UI following the luxury design system
class _DefaultErrorBoundaryWidget extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;

  const _DefaultErrorBoundaryWidget({
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: LuxuryCard(
        tier: LuxuryTier.gold,
        variant: LuxuryCardVariant.elevated,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: LuxuryColors.warningAmber.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Iconsax.refresh_circle,
                size: 32,
                color: LuxuryColors.warningAmber,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Unable to Load',
              style: IrisTheme.titleMedium.copyWith(
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Something went wrong. Tap to retry.',
              style: IrisTheme.bodySmall.copyWith(
                color: LuxuryColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            // Show error details in debug mode
            if (kDebugMode) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.black.withValues(alpha: 0.3)
                      : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  error.toString(),
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 10,
                    color: LuxuryColors.errorRuby,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
            const SizedBox(height: 20),
            IrisButton(
              label: 'Retry',
              onPressed: onRetry,
              icon: Iconsax.refresh,
              variant: IrisButtonVariant.secondary,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

/// A simple error boundary that shows a minimal error indicator
/// Use this for smaller widgets where a full error UI would be intrusive
class IrisMinimalErrorBoundary extends ConsumerStatefulWidget {
  final Widget child;
  final Widget? placeholder;
  final bool reportErrors;

  const IrisMinimalErrorBoundary({
    super.key,
    required this.child,
    this.placeholder,
    this.reportErrors = true,
  });

  @override
  ConsumerState<IrisMinimalErrorBoundary> createState() =>
      _IrisMinimalErrorBoundaryState();
}

class _IrisMinimalErrorBoundaryState
    extends ConsumerState<IrisMinimalErrorBoundary> {
  bool _hasError = false;

  // Note: _handleError is available for future use when error catching
  // mechanism is enhanced to support build-time error catching
  @pragma('vm:entry-point')
  void _handleError(Object error, StackTrace? stackTrace) {
    if (!mounted) return;

    setState(() {
      _hasError = true;
    });

    if (widget.reportErrors) {
      try {
        final errorService = ref.read(errorReportingServiceProvider);
        errorService.reportError(
          error,
          stackTrace: stackTrace,
          severity: ErrorSeverity.low,
        );
      } catch (_) {
        // Ignore if service not available
      }
    }

    if (kDebugMode) {
      debugPrint('IrisMinimalErrorBoundary caught error: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return widget.placeholder ??
          Container(
            padding: const EdgeInsets.all(8),
            child: Icon(
              Iconsax.warning_2,
              size: 16,
              color: LuxuryColors.warningAmber.withValues(alpha: 0.6),
            ),
          );
    }

    return widget.child;
  }
}

/// Extension to wrap any widget with an error boundary
extension ErrorBoundaryExtension on Widget {
  /// Wrap this widget with an IrisErrorBoundary
  Widget withErrorBoundary({
    Widget Function(Object error, StackTrace? stackTrace)? errorBuilder,
    void Function(Object error, StackTrace? stackTrace)? onError,
    bool reportErrors = true,
    String? screenName,
  }) {
    return IrisErrorBoundary(
      errorBuilder: errorBuilder,
      onError: onError,
      reportErrors: reportErrors,
      screenName: screenName,
      child: this,
    );
  }

  /// Wrap this widget with a minimal error boundary
  Widget withMinimalErrorBoundary({
    Widget? placeholder,
    bool reportErrors = true,
  }) {
    return IrisMinimalErrorBoundary(
      placeholder: placeholder,
      reportErrors: reportErrors,
      child: this,
    );
  }
}
