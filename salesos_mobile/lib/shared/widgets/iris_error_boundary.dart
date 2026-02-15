import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/theme.dart';
import '../../core/utils/exceptions.dart';
import '../../core/utils/haptics.dart';
import 'iris_button.dart';

/// Error types for better UX messaging
enum IrisErrorType {
  network,
  server,
  timeout,
  auth,
  permission,
  notFound,
  validation,
  unknown,
}

/// Enhanced error state widget with contextual messaging
class IrisErrorState extends StatelessWidget {
  final IrisErrorType type;
  final String? customTitle;
  final String? customMessage;
  final VoidCallback? onRetry;
  final VoidCallback? onSecondaryAction;
  final String? secondaryActionLabel;
  final bool compact;

  const IrisErrorState({
    super.key,
    this.type = IrisErrorType.unknown,
    this.customTitle,
    this.customMessage,
    this.onRetry,
    this.onSecondaryAction,
    this.secondaryActionLabel,
    this.compact = false,
  });

  /// Factory for network errors
  factory IrisErrorState.network({VoidCallback? onRetry}) {
    return IrisErrorState(
      type: IrisErrorType.network,
      onRetry: onRetry,
    );
  }

  /// Factory for server errors
  factory IrisErrorState.server({VoidCallback? onRetry}) {
    return IrisErrorState(
      type: IrisErrorType.server,
      onRetry: onRetry,
    );
  }

  /// Factory for timeout errors
  factory IrisErrorState.timeout({VoidCallback? onRetry}) {
    return IrisErrorState(
      type: IrisErrorType.timeout,
      onRetry: onRetry,
    );
  }

  /// Factory for auth errors
  factory IrisErrorState.auth({
    VoidCallback? onRetry,
    VoidCallback? onLogin,
  }) {
    return IrisErrorState(
      type: IrisErrorType.auth,
      onRetry: onRetry,
      onSecondaryAction: onLogin,
      secondaryActionLabel: 'Sign In',
    );
  }

  IconData get _icon {
    switch (type) {
      case IrisErrorType.network:
        return Iconsax.wifi_square;
      case IrisErrorType.server:
        return Iconsax.cloud_cross;
      case IrisErrorType.timeout:
        return Iconsax.timer;
      case IrisErrorType.auth:
        return Iconsax.lock;
      case IrisErrorType.permission:
        return Iconsax.shield_cross;
      case IrisErrorType.notFound:
        return Iconsax.search_status;
      case IrisErrorType.validation:
        return Iconsax.info_circle;
      case IrisErrorType.unknown:
        return Iconsax.warning_2;
    }
  }

  String get _title {
    if (customTitle != null) return customTitle!;
    switch (type) {
      case IrisErrorType.network:
        return 'No Connection';
      case IrisErrorType.server:
        return 'Server Error';
      case IrisErrorType.timeout:
        return 'Request Timed Out';
      case IrisErrorType.auth:
        return 'Session Expired';
      case IrisErrorType.permission:
        return 'Access Denied';
      case IrisErrorType.notFound:
        return 'Not Found';
      case IrisErrorType.validation:
        return 'Invalid Data';
      case IrisErrorType.unknown:
        return 'Something Went Wrong';
    }
  }

  String get _message {
    if (customMessage != null) return customMessage!;
    switch (type) {
      case IrisErrorType.network:
        return 'Check your internet connection and try again.';
      case IrisErrorType.server:
        return 'We\'re having trouble connecting. Please try again later.';
      case IrisErrorType.timeout:
        return 'The request is taking too long. Please try again.';
      case IrisErrorType.auth:
        return 'Please sign in again to continue.';
      case IrisErrorType.permission:
        return 'You don\'t have permission to access this.';
      case IrisErrorType.notFound:
        return 'The requested item could not be found.';
      case IrisErrorType.validation:
        return 'Please check your input and try again.';
      case IrisErrorType.unknown:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  Color get _iconColor {
    switch (type) {
      case IrisErrorType.network:
      case IrisErrorType.timeout:
        return IrisTheme.warning;
      case IrisErrorType.server:
      case IrisErrorType.unknown:
        return IrisTheme.error;
      case IrisErrorType.auth:
      case IrisErrorType.permission:
        return IrisTheme.info;
      case IrisErrorType.notFound:
      case IrisErrorType.validation:
        return IrisTheme.darkTextSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (compact) {
      return _buildCompact(context, isDark);
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animated error icon
            // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
            ExcludeSemantics(
              child: RepaintBoundary(
                child: Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: _iconColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _icon,
                    size: 44,
                    color: _iconColor,
                  ),
                )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .scale(
                      begin: const Offset(1, 1),
                      end: const Offset(1.05, 1.05),
                      duration: 1500.ms,
                    )
                    .animate()
                    .fadeIn(duration: 400.ms),
              ),
            ),

            const SizedBox(height: 24),

            // Title
            Text(
              _title,
              style: IrisTheme.titleLarge.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
              textAlign: TextAlign.center,
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.2),

            const SizedBox(height: 12),

            // Message
            Text(
              _message,
              style: IrisTheme.bodyMedium.copyWith(
                color: isDark
                    ? IrisTheme.darkTextSecondary
                    : IrisTheme.lightTextSecondary,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.2),

            const SizedBox(height: 32),

            // Action buttons
            if (onRetry != null)
              IrisButton(
                label: 'Try Again',
                onPressed: () {
                  IrisHaptics.lightTap();
                  onRetry?.call();
                },
                icon: Iconsax.refresh,
              ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.2),

            if (onSecondaryAction != null) ...[
              const SizedBox(height: 12),
              IrisButton(
                label: secondaryActionLabel ?? 'Go Back',
                onPressed: () {
                  IrisHaptics.lightTap();
                  onSecondaryAction?.call();
                },
                variant: IrisButtonVariant.ghost,
              ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.2),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCompact(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _iconColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _iconColor.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(_icon, size: 24, color: _iconColor),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _title,
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextPrimary
                        : IrisTheme.lightTextPrimary,
                  ),
                ),
                Text(
                  _message,
                  style: IrisTheme.bodySmall.copyWith(
                    color: isDark
                        ? IrisTheme.darkTextSecondary
                        : IrisTheme.lightTextSecondary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (onRetry != null)
            IconButton(
              onPressed: () {
                IrisHaptics.lightTap();
                onRetry?.call();
              },
              icon: const Icon(Iconsax.refresh, size: 20),
              color: _iconColor,
              constraints: const BoxConstraints(
                minWidth: 48,
                minHeight: 48,
              ),
            ),
        ],
      ),
    );
  }
}

/// Inline error banner for form validation
class IrisErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const IrisErrorBanner({
    super.key,
    required this.message,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: IrisTheme.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: IrisTheme.error.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Iconsax.warning_2,
            size: 20,
            color: IrisTheme.error,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark
                    ? IrisTheme.darkTextPrimary
                    : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
          if (onDismiss != null)
            GestureDetector(
              onTap: onDismiss,
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(
                  Iconsax.close_circle,
                  size: 18,
                  color: IrisTheme.error,
                ),
              ),
            ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: -0.2);
  }
}

// ============================================================================
// ERROR TYPE MAPPING UTILITIES
// ============================================================================

/// Extension to convert AppException to IrisErrorType
extension AppExceptionToIrisErrorType on Object? {
  /// Get the appropriate IrisErrorType for any error
  IrisErrorType toIrisErrorType() {
    if (this == null) return IrisErrorType.unknown;

    if (this is AppException) {
      final error = this as AppException;
      switch (error.category) {
        case ErrorCategory.network:
          if (error is TimeoutException) return IrisErrorType.timeout;
          return IrisErrorType.network;
        case ErrorCategory.server:
          return IrisErrorType.server;
        case ErrorCategory.auth:
          return IrisErrorType.auth;
        case ErrorCategory.validation:
          return IrisErrorType.validation;
        case ErrorCategory.client:
          if (error is NotFoundException) return IrisErrorType.notFound;
          if (error is ForbiddenException) return IrisErrorType.permission;
          return IrisErrorType.unknown;
        case ErrorCategory.rateLimit:
          return IrisErrorType.server;
        case ErrorCategory.unknown:
          return IrisErrorType.unknown;
      }
    }

    // Check for common error types
    final errorString = toString().toLowerCase();
    if (errorString.contains('network') || errorString.contains('connection')) {
      return IrisErrorType.network;
    }
    if (errorString.contains('timeout')) {
      return IrisErrorType.timeout;
    }
    if (errorString.contains('unauthorized') || errorString.contains('401')) {
      return IrisErrorType.auth;
    }
    if (errorString.contains('forbidden') || errorString.contains('403')) {
      return IrisErrorType.permission;
    }
    if (errorString.contains('not found') || errorString.contains('404')) {
      return IrisErrorType.notFound;
    }
    if (errorString.contains('500') || errorString.contains('server')) {
      return IrisErrorType.server;
    }

    return IrisErrorType.unknown;
  }

  /// Get user-friendly error message
  String toUserMessage() {
    if (this is AppException) {
      return (this as AppException).message;
    }
    return 'An unexpected error occurred';
  }
}

/// Factory to create IrisErrorState from any error
class IrisErrorStateFactory {
  /// Create an IrisErrorState from an error object
  static IrisErrorState fromError(
    Object? error, {
    VoidCallback? onRetry,
    String? customMessage,
    bool compact = false,
  }) {
    final errorType = error.toIrisErrorType();
    return IrisErrorState(
      type: errorType,
      customMessage: customMessage ?? (error is AppException ? error.message : null),
      onRetry: onRetry,
      compact: compact,
    );
  }

  /// Create error widget for AsyncValue.when() error handler
  /// Usage: error: (e, _) => IrisErrorStateFactory.forAsyncError(e, ref.invalidate(provider))
  static Widget forAsyncError(
    Object error,
    VoidCallback? onRetry, {
    bool compact = false,
  }) {
    return IrisErrorState(
      type: error.toIrisErrorType(),
      customMessage: error is AppException ? error.message : null,
      onRetry: onRetry,
      compact: compact,
    );
  }
}

/// Extension on AsyncValue for convenient error handling
extension AsyncValueErrorHandling<T> on AsyncValue<T> {
  /// Build widget with standardized error handling
  /// Example:
  /// ```dart
  /// asyncValue.whenWithError(
  ///   data: (data) => MyWidget(data),
  ///   loading: () => CircularProgressIndicator(),
  ///   onRetry: () => ref.invalidate(myProvider),
  /// )
  /// ```
  Widget whenWithError({
    required Widget Function(T data) data,
    required Widget Function() loading,
    VoidCallback? onRetry,
    bool compactError = false,
  }) {
    return when(
      data: data,
      loading: loading,
      error: (error, _) => IrisErrorStateFactory.forAsyncError(
        error,
        onRetry,
        compact: compactError,
      ),
    );
  }
}
