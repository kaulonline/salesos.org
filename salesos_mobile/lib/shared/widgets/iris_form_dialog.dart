import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'luxury_card.dart';
import 'iris_button.dart';

/// Form dialog mode - determines the appearance and behavior
enum IrisFormMode { create, edit, view }

/// A reusable form dialog component for CRUD operations
/// Provides consistent styling across all entity forms
class IrisFormDialog extends StatelessWidget {
  final String title;
  final IrisFormMode mode;
  final Widget child;
  final VoidCallback? onSave;
  final VoidCallback? onCancel;
  final VoidCallback? onDelete;
  final bool isLoading;
  final bool canDelete;
  final String? saveLabel;
  final String? cancelLabel;
  final GlobalKey<FormState>? formKey;

  const IrisFormDialog({
    super.key,
    required this.title,
    required this.child,
    this.mode = IrisFormMode.create,
    this.onSave,
    this.onCancel,
    this.onDelete,
    this.isLoading = false,
    this.canDelete = false,
    this.saveLabel,
    this.cancelLabel,
    this.formKey,
  });

  String get _defaultSaveLabel {
    switch (mode) {
      case IrisFormMode.create:
        return 'Create';
      case IrisFormMode.edit:
        return 'Save';
      case IrisFormMode.view:
        return 'Edit';
    }
  }

  IconData get _modeIcon {
    switch (mode) {
      case IrisFormMode.create:
        return Icons.add_rounded;
      case IrisFormMode.edit:
        return Icons.edit_rounded;
      case IrisFormMode.view:
        return Icons.visibility_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final screenSize = MediaQuery.of(context).size;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 40),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: 560,
          maxHeight: screenSize.height * 0.85 - bottomInset,
        ),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(
            color: isDark
                ? LuxuryColors.champagneGold.withValues(alpha: 0.12)
                : LuxuryColors.champagneGold.withValues(alpha: 0.2),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.5 : 0.15),
              blurRadius: 40,
              offset: const Offset(0, 16),
            ),
            if (!isDark)
              BoxShadow(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.06),
                blurRadius: 60,
                spreadRadius: -5,
              ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Premium Header with gradient accent
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: isDark
                        ? [
                            LuxuryColors.obsidian,
                            LuxuryColors.richBlack,
                          ]
                        : [
                            LuxuryColors.champagneGold.withValues(alpha: 0.03),
                            Colors.white,
                          ],
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 16, 20),
                  child: Row(
                    children: [
                      // Elegant icon container
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              LuxuryColors.jadePremium,
                              LuxuryColors.rolexGreen,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: LuxuryColors.rolexGreen.withValues(alpha: 0.35),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Icon(
                          _modeIcon,
                          size: 22,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                                letterSpacing: -0.3,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              mode == IrisFormMode.create
                                  ? 'Fill in the details below'
                                  : mode == IrisFormMode.edit
                                      ? 'Update the information'
                                      : 'Record details',
                              style: TextStyle(
                                fontSize: 13,
                                color: LuxuryColors.textMuted,
                                letterSpacing: 0.1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Close button with subtle hover effect
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(10),
                          onTap: () {
                            HapticFeedback.lightImpact();
                            if (onCancel != null) {
                              onCancel!();
                            } else {
                              Navigator.of(context).pop();
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.05)
                                  : Colors.black.withValues(alpha: 0.04),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.close_rounded,
                              size: 20,
                              color: LuxuryColors.textMuted,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Subtle divider
              Container(
                height: 1,
                margin: const EdgeInsets.symmetric(horizontal: 24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      isDark
                          ? LuxuryColors.champagneGold.withValues(alpha: 0.15)
                          : LuxuryColors.champagneGold.withValues(alpha: 0.25),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              // Form content with improved spacing
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
                  physics: const BouncingScrollPhysics(),
                  child: Form(
                    key: formKey,
                    child: child,
                  ),
                ),
              ),
              // Premium Actions Footer
              Container(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
                decoration: BoxDecoration(
                  color: isDark
                      ? LuxuryColors.obsidian.withValues(alpha: 0.8)
                      : LuxuryColors.champagneGold.withValues(alpha: 0.04),
                  border: Border(
                    top: BorderSide(
                      color: isDark
                          ? LuxuryColors.champagneGold.withValues(alpha: 0.08)
                          : LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    ),
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      // Delete button (if allowed)
                      if (canDelete && mode == IrisFormMode.edit && onDelete != null) ...[
                        IrisButton(
                          label: 'Delete',
                          onPressed: isLoading ? null : onDelete,
                          variant: IrisButtonVariant.danger,
                          icon: Icons.delete_outline,
                        ),
                        const SizedBox(width: 12),
                      ],
                      const Spacer(),
                      // Cancel button
                      IrisButton(
                        label: cancelLabel ?? 'Cancel',
                        onPressed: isLoading
                            ? null
                            : () {
                                HapticFeedback.lightImpact();
                                if (onCancel != null) {
                                  onCancel!();
                                } else {
                                  Navigator.of(context).pop();
                                }
                              },
                        variant: IrisButtonVariant.secondary,
                      ),
                      const SizedBox(width: 12),
                      // Save button
                      if (mode != IrisFormMode.view)
                        IrisButton(
                          label: saveLabel ?? _defaultSaveLabel,
                          onPressed: isLoading ? null : onSave,
                          variant: IrisButtonVariant.primary,
                          isLoading: isLoading,
                          icon: mode == IrisFormMode.create
                              ? Icons.add_rounded
                              : Icons.save_rounded,
                        ),
                    ],
                  ),
            ),
          ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 200.ms).scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1, 1),
          duration: 200.ms,
          curve: Curves.easeOut,
        );
  }

  /// Show the form dialog as a centered dialog
  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required Widget child,
    IrisFormMode mode = IrisFormMode.create,
    VoidCallback? onSave,
    VoidCallback? onCancel,
    VoidCallback? onDelete,
    bool isLoading = false,
    bool canDelete = false,
    String? saveLabel,
    String? cancelLabel,
    GlobalKey<FormState>? formKey,
    bool isDismissible = true,
  }) {
    HapticFeedback.mediumImpact();

    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: isDismissible && !isLoading,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: IrisFormDialog(
            title: title,
            mode: mode,
            onSave: onSave,
            onCancel: onCancel,
            onDelete: onDelete,
            isLoading: isLoading,
            canDelete: canDelete,
            saveLabel: saveLabel,
            cancelLabel: cancelLabel,
            formKey: formKey,
            child: child,
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

/// Delete confirmation dialog with luxury styling
class IrisDeleteConfirmation extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;
  final bool isLoading;

  const IrisDeleteConfirmation({
    super.key,
    required this.title,
    required this.message,
    this.onConfirm,
    this.onCancel,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.richBlack : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: LuxuryColors.errorRuby.withValues(alpha: 0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
              blurRadius: 30,
              offset: const Offset(0, 12),
            ),
            BoxShadow(
              color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
              blurRadius: 40,
              spreadRadius: -10,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Warning icon with glow
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      LuxuryColors.errorRuby.withValues(alpha: 0.15),
                      LuxuryColors.errorRuby.withValues(alpha: 0.08),
                    ],
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: LuxuryColors.errorRuby.withValues(alpha: 0.2),
                  ),
                ),
                child: Icon(
                  Icons.warning_rounded,
                  size: 36,
                  color: LuxuryColors.errorRuby,
                ),
              ),
              const SizedBox(height: 24),
              // Title - no uppercase
              Text(
                title,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? LuxuryColors.textOnDark
                      : LuxuryColors.textOnLight,
                  letterSpacing: -0.3,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              // Message
              Text(
                message,
                style: TextStyle(
                  fontSize: 14,
                  color: LuxuryColors.textMuted,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              // Actions
              Row(
                children: [
                  Expanded(
                    child: IrisButton(
                      label: 'Cancel',
                      onPressed: isLoading
                          ? null
                          : () {
                              HapticFeedback.lightImpact();
                              if (onCancel != null) {
                                onCancel!();
                              } else {
                                Navigator.of(context).pop(false);
                              }
                            },
                      variant: IrisButtonVariant.secondary,
                      isFullWidth: true,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: IrisButton(
                      label: 'Delete',
                      onPressed: isLoading
                          ? null
                          : () {
                              HapticFeedback.heavyImpact();
                              if (onConfirm != null) {
                                onConfirm!();
                              } else {
                                Navigator.of(context).pop(true);
                              }
                            },
                      variant: IrisButtonVariant.danger,
                      isLoading: isLoading,
                      isFullWidth: true,
                      icon: Icons.delete_forever_rounded,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Show the delete confirmation dialog
  static Future<bool> show({
    required BuildContext context,
    required String title,
    required String message,
    bool isLoading = false,
  }) async {
    HapticFeedback.mediumImpact();

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: !isLoading,
      builder: (context) => IrisDeleteConfirmation(
        title: title,
        message: message,
        isLoading: isLoading,
      ),
    );

    return result ?? false;
  }
}

/// A form field group with consistent styling
class IrisFormSection extends StatelessWidget {
  final String? title;
  final List<Widget> children;
  final EdgeInsets? padding;

  const IrisFormSection({
    super.key,
    this.title,
    required this.children,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (title != null) ...[
          Padding(
            padding: padding ?? EdgeInsets.zero,
            child: Row(
              children: [
                Container(
                  width: 3,
                  height: 18,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        LuxuryColors.jadePremium,
                        LuxuryColors.rolexGreen,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  title!,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? LuxuryColors.textPlatinum
                        : LuxuryColors.textOnLight,
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        Padding(
          padding: padding ?? EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (int i = 0; i < children.length; i++) ...[
                children[i],
                if (i < children.length - 1) const SizedBox(height: 16),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Two-column form field row for tablet layouts
class IrisFormRow extends StatelessWidget {
  final List<Widget> children;
  final double spacing;

  const IrisFormRow({
    super.key,
    required this.children,
    this.spacing = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (int i = 0; i < children.length; i++) ...[
          Expanded(child: children[i]),
          if (i < children.length - 1) SizedBox(width: spacing),
        ],
      ],
    );
  }
}
