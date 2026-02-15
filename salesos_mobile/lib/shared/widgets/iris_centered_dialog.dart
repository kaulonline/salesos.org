import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/config/theme.dart';
import 'luxury_card.dart';

/// A premium centered dialog component with luxury styling
/// Replaces bottom sheets with properly centered, non-cut-off modals
class IrisCenteredDialog extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final Widget child;
  final Widget? header;
  final Widget? footer;
  final VoidCallback? onClose;
  final double maxWidth;
  final double maxHeightFactor;
  final bool showCloseButton;
  final bool enableBackdropBlur;
  final EdgeInsets contentPadding;
  final IconData? titleIcon;
  final Color? titleIconColor;

  const IrisCenteredDialog({
    super.key,
    this.title,
    this.subtitle,
    required this.child,
    this.header,
    this.footer,
    this.onClose,
    this.maxWidth = 500,
    this.maxHeightFactor = 0.85,
    this.showCloseButton = true,
    this.enableBackdropBlur = true,
    this.contentPadding = const EdgeInsets.all(24),
    this.titleIcon,
    this.titleIconColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenSize = MediaQuery.of(context).size;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: maxWidth,
          maxHeight: screenSize.height * maxHeightFactor - bottomInset,
        ),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
            // Gold ambient glow
            BoxShadow(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.08),
              blurRadius: 40,
              spreadRadius: -10,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Custom header or default title header
              if (header != null)
                header!
              else if (title != null)
                _buildDefaultHeader(context, isDark),

              // Scrollable content
              Flexible(
                child: SingleChildScrollView(
                  padding: contentPadding,
                  physics: const BouncingScrollPhysics(),
                  child: child,
                ),
              ),

              // Footer
              if (footer != null)
                Container(
                  decoration: BoxDecoration(
                    color: isDark
                        ? LuxuryColors.obsidian
                        : LuxuryColors.champagneGold.withValues(alpha: 0.05),
                    border: Border(
                      top: BorderSide(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
                      ),
                    ),
                  ),
                  child: SafeArea(
                    top: false,
                    child: footer!,
                  ),
                ),
            ],
          ),
        ),
      ).animate().fadeIn(duration: 200.ms).scale(
            begin: const Offset(0.95, 0.95),
            end: const Offset(1, 1),
            duration: 200.ms,
            curve: Curves.easeOut,
          ),
    );
  }

  Widget _buildDefaultHeader(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 16, 16),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
          ),
        ),
      ),
      child: Row(
        children: [
          if (titleIcon != null) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                gradient: LuxuryColors.emeraldGradient,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: (titleIconColor ?? LuxuryColors.rolexGreen)
                        .withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(
                titleIcon,
                size: 20,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title!,
                  style: IrisTheme.titleMedium.copyWith(
                    color: isDark
                        ? LuxuryColors.textOnDark
                        : LuxuryColors.textOnLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: IrisTheme.labelSmall.copyWith(
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (showCloseButton)
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                if (onClose != null) {
                  onClose!();
                } else {
                  Navigator.of(context).pop();
                }
              },
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.05)
                      : Colors.black.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.close_rounded,
                  size: 20,
                  color: LuxuryColors.textMuted,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Show the centered dialog
  static Future<T?> show<T>({
    required BuildContext context,
    required Widget child,
    String? title,
    String? subtitle,
    Widget? header,
    Widget? footer,
    VoidCallback? onClose,
    double maxWidth = 500,
    double maxHeightFactor = 0.85,
    bool showCloseButton = true,
    bool enableBackdropBlur = true,
    bool barrierDismissible = true,
    EdgeInsets contentPadding = const EdgeInsets.all(24),
    IconData? titleIcon,
    Color? titleIconColor,
  }) {
    HapticFeedback.mediumImpact();

    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) {
        return enableBackdropBlur
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                child: IrisCenteredDialog(
                  title: title,
                  subtitle: subtitle,
                  header: header,
                  footer: footer,
                  onClose: onClose,
                  maxWidth: maxWidth,
                  maxHeightFactor: maxHeightFactor,
                  showCloseButton: showCloseButton,
                  enableBackdropBlur: enableBackdropBlur,
                  contentPadding: contentPadding,
                  titleIcon: titleIcon,
                  titleIconColor: titleIconColor,
                  child: child,
                ),
              )
            : IrisCenteredDialog(
                title: title,
                subtitle: subtitle,
                header: header,
                footer: footer,
                onClose: onClose,
                maxWidth: maxWidth,
                maxHeightFactor: maxHeightFactor,
                showCloseButton: showCloseButton,
                enableBackdropBlur: enableBackdropBlur,
                contentPadding: contentPadding,
                titleIcon: titleIcon,
                titleIconColor: titleIconColor,
                child: child,
              );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }
}

/// A scrollable centered dialog with loading and error states
class IrisScrollableCenteredDialog extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final Widget child;
  final Widget? header;
  final Widget? footer;
  final VoidCallback? onClose;
  final double maxWidth;
  final double maxHeightFactor;
  final bool showCloseButton;
  final bool isLoading;
  final String? loadingMessage;
  final String? errorMessage;
  final VoidCallback? onRetry;
  final IconData? titleIcon;
  final Color? titleIconColor;

  const IrisScrollableCenteredDialog({
    super.key,
    this.title,
    this.subtitle,
    required this.child,
    this.header,
    this.footer,
    this.onClose,
    this.maxWidth = 500,
    this.maxHeightFactor = 0.85,
    this.showCloseButton = true,
    this.isLoading = false,
    this.loadingMessage,
    this.errorMessage,
    this.onRetry,
    this.titleIcon,
    this.titleIconColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget content;
    if (isLoading) {
      content = _buildLoadingState(isDark);
    } else if (errorMessage != null) {
      content = _buildErrorState(isDark);
    } else {
      content = child;
    }

    return IrisCenteredDialog(
      title: title,
      subtitle: subtitle,
      header: header,
      footer: footer,
      onClose: onClose,
      maxWidth: maxWidth,
      maxHeightFactor: maxHeightFactor,
      showCloseButton: showCloseButton,
      titleIcon: titleIcon,
      titleIconColor: titleIconColor,
      child: content,
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LuxuryColors.emeraldGradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2.5,
              ),
            ),
          )
              .animate(onPlay: (c) => c.repeat())
              .shimmer(duration: 1500.ms, color: Colors.white30),
          const SizedBox(height: 24),
          Text(
            loadingMessage ?? 'Loading...',
            style: IrisTheme.bodyMedium.copyWith(
              color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: IrisTheme.error.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.error_outline_rounded,
              size: 32,
              color: IrisTheme.error,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            errorMessage!,
            style: IrisTheme.bodyMedium.copyWith(
              color: LuxuryColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 20),
            TextButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                onRetry!();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
              style: TextButton.styleFrom(
                foregroundColor: LuxuryColors.rolexGreen,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Show the scrollable centered dialog
  static Future<T?> show<T>({
    required BuildContext context,
    required Widget child,
    String? title,
    String? subtitle,
    Widget? header,
    Widget? footer,
    VoidCallback? onClose,
    double maxWidth = 500,
    double maxHeightFactor = 0.85,
    bool showCloseButton = true,
    bool barrierDismissible = true,
    bool isLoading = false,
    String? loadingMessage,
    String? errorMessage,
    VoidCallback? onRetry,
    IconData? titleIcon,
    Color? titleIconColor,
  }) {
    return IrisCenteredDialog.show<T>(
      context: context,
      title: title,
      subtitle: subtitle,
      header: header,
      footer: footer,
      onClose: onClose,
      maxWidth: maxWidth,
      maxHeightFactor: maxHeightFactor,
      showCloseButton: showCloseButton,
      barrierDismissible: barrierDismissible,
      titleIcon: titleIcon,
      titleIconColor: titleIconColor,
      child: isLoading
          ? IrisScrollableCenteredDialog(
              isLoading: true,
              loadingMessage: loadingMessage,
              child: child,
            )
          : errorMessage != null
              ? IrisScrollableCenteredDialog(
                  errorMessage: errorMessage,
                  onRetry: onRetry,
                  child: child,
                )
              : child,
    );
  }
}
