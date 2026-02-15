import 'dart:io';
import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';

/// Platform detection utilities
class IrisPlatform {
  IrisPlatform._();

  static bool get isIOS => Platform.isIOS;
  static bool get isAndroid => Platform.isAndroid;
  static bool get isMobile => isIOS || isAndroid;

  /// Returns platform-appropriate widget
  static T adaptive<T>({required T ios, required T android}) {
    return isIOS ? ios : android;
  }
}

/// Platform-adaptive app bar
/// iOS: Large title with blur, Android: Material 3 app bar
class IrisAdaptiveAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final bool largeTitle;

  const IrisAdaptiveAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.showBackButton = true,
    this.onBackPressed,
    this.largeTitle = false,
  });

  @override
  Size get preferredSize => Size.fromHeight(largeTitle ? 96 : 56);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (IrisPlatform.isIOS) {
      return _buildIOSAppBar(context, isDark);
    }
    return _buildAndroidAppBar(context, isDark);
  }

  Widget _buildIOSAppBar(BuildContext context, bool isDark) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: (isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground)
                .withValues(alpha: 0.8),
            border: Border(
              bottom: BorderSide(
                color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
                width: 0.5,
              ),
            ),
          ),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  if (showBackButton && Navigator.canPop(context))
                    GestureDetector(
                      onTap: onBackPressed ?? () => Navigator.pop(context),
                      child: const Padding(
                        padding: EdgeInsets.all(8),
                        child: Icon(
                          CupertinoIcons.back,
                          color: LuxuryColors.champagneGold,
                          size: 24,
                        ),
                      ),
                    )
                  else ?leading,
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      title,
                      style: IrisTheme.titleLarge.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextPrimary
                            : IrisTheme.lightTextPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (actions != null) ...actions!,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAndroidAppBar(BuildContext context, bool isDark) {
    return AppBar(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      elevation: 0,
      scrolledUnderElevation: 1,
      leading: showBackButton && Navigator.canPop(context)
          ? IconButton(
              onPressed: onBackPressed ?? () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back),
            )
          : leading,
      title: Text(
        title,
        style: IrisTheme.titleLarge.copyWith(
          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
        ),
      ),
      actions: actions,
    );
  }
}

/// Platform-adaptive dialog
class IrisAdaptiveDialog {
  /// Show platform-appropriate alert dialog
  static Future<bool?> showAlert({
    required BuildContext context,
    required String title,
    required String message,
    String? confirmLabel,
    String? cancelLabel,
    bool isDestructive = false,
  }) {
    if (IrisPlatform.isIOS) {
      return showCupertinoDialog<bool>(
        context: context,
        builder: (context) => CupertinoAlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.pop(context, false),
              child: Text(cancelLabel ?? 'Cancel'),
            ),
            CupertinoDialogAction(
              isDestructiveAction: isDestructive,
              onPressed: () => Navigator.pop(context, true),
              child: Text(confirmLabel ?? 'OK'),
            ),
          ],
        ),
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          title,
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
          ),
        ),
        content: Text(
          message,
          style: IrisTheme.bodyMedium.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(cancelLabel ?? 'Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              confirmLabel ?? 'OK',
              style: TextStyle(
                color: isDestructive ? IrisTheme.error : LuxuryColors.champagneGold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Show platform-appropriate action sheet
  static Future<T?> showActionSheet<T>({
    required BuildContext context,
    required String title,
    String? message,
    required List<IrisActionSheetAction<T>> actions,
    IrisActionSheetAction<T>? cancelAction,
  }) {
    if (IrisPlatform.isIOS) {
      return showCupertinoModalPopup<T>(
        context: context,
        builder: (context) => CupertinoActionSheet(
          title: Text(title),
          message: message != null ? Text(message) : null,
          actions: actions
              .map((action) => CupertinoActionSheetAction(
                    isDestructiveAction: action.isDestructive,
                    onPressed: () => Navigator.pop(context, action.value),
                    child: Text(action.label),
                  ))
              .toList(),
          cancelButton: cancelAction != null
              ? CupertinoActionSheetAction(
                  isDefaultAction: true,
                  onPressed: () => Navigator.pop(context, cancelAction.value),
                  child: Text(cancelAction.label),
                )
              : null,
        ),
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 400),
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: IrisTheme.titleMedium.copyWith(
                                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(ctx),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.1)
                                    : Colors.black.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                Icons.close,
                                size: 18,
                                color: isDark ? Colors.white70 : Colors.black54,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (message != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          message,
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      ...actions.map((action) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: action.icon != null
                                ? Icon(
                                    action.icon,
                                    color: action.isDestructive
                                        ? IrisTheme.error
                                        : (isDark
                                            ? IrisTheme.darkTextPrimary
                                            : IrisTheme.lightTextPrimary),
                                  )
                                : null,
                            title: Text(
                              action.label,
                              style: IrisTheme.bodyMedium.copyWith(
                                color: action.isDestructive
                                    ? IrisTheme.error
                                    : (isDark
                                        ? IrisTheme.darkTextPrimary
                                        : IrisTheme.lightTextPrimary),
                              ),
                            ),
                            onTap: () => Navigator.pop(ctx, action.value),
                          )),
                    ],
                  ),
                ),
              ),
            ),
          ),
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

/// Action for action sheets
class IrisActionSheetAction<T> {
  final String label;
  final T value;
  final IconData? icon;
  final bool isDestructive;

  const IrisActionSheetAction({
    required this.label,
    required this.value,
    this.icon,
    this.isDestructive = false,
  });
}

/// Platform-adaptive refresh indicator
class IrisAdaptiveRefresh extends StatelessWidget {
  final Widget child;
  final Future<void> Function() onRefresh;

  const IrisAdaptiveRefresh({
    super.key,
    required this.child,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (IrisPlatform.isIOS) {
      return CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          CupertinoSliverRefreshControl(
            onRefresh: onRefresh,
          ),
          SliverToBoxAdapter(child: child),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: LuxuryColors.champagneGold,
      child: child,
    );
  }
}

/// Platform-adaptive loading indicator
class IrisAdaptiveLoader extends StatelessWidget {
  final double size;
  final Color? color;

  const IrisAdaptiveLoader({
    super.key,
    this.size = 24,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? LuxuryColors.champagneGold;

    if (IrisPlatform.isIOS) {
      return CupertinoActivityIndicator(
        radius: size / 2,
        color: effectiveColor,
      );
    }

    return SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        valueColor: AlwaysStoppedAnimation<Color>(effectiveColor),
      ),
    );
  }
}
