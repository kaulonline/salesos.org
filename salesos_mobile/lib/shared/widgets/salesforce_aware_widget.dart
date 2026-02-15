import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/providers/auth_mode_provider.dart';
import '../../core/utils/salesforce_feature_support.dart';
import 'luxury_card.dart';

/// A widget that shows different content based on feature availability.
///
/// When the feature is not available in the current mode (e.g., Salesforce mode),
/// it shows a placeholder with an appropriate message instead of the child widget.
class SalesforceAwareWidget extends ConsumerWidget {
  /// The feature to check for availability
  final CrmFeature feature;

  /// The widget to show when the feature is available
  final Widget child;

  /// Optional custom placeholder widget when feature is unavailable
  final Widget? placeholder;

  /// Optional custom message to show when unavailable
  final String? unavailableMessage;

  /// Whether to show a compact placeholder (just N/A text)
  final bool compact;

  /// Whether to show an icon with the unavailable message
  final bool showIcon;

  const SalesforceAwareWidget({
    super.key,
    required this.feature,
    required this.child,
    this.placeholder,
    this.unavailableMessage,
    this.compact = false,
    this.showIcon = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authMode = ref.watch(authModeProvider);
    final isAvailable = SalesforceFeatureSupport.isFeatureAvailable(feature, authMode);

    if (isAvailable) {
      return child;
    }

    // Show placeholder for unavailable feature
    if (placeholder != null) {
      return placeholder!;
    }

    if (compact) {
      return _CompactUnavailablePlaceholder(
        message: unavailableMessage,
        showIcon: showIcon,
      );
    }

    return _UnavailablePlaceholder(
      feature: feature,
      message: unavailableMessage,
      showIcon: showIcon,
    );
  }
}

/// A widget that conditionally shows content only in local mode.
/// Shows nothing in Salesforce mode.
class LocalOnlyWidget extends ConsumerWidget {
  final Widget child;
  final Widget? salesforcePlaceholder;

  const LocalOnlyWidget({
    super.key,
    required this.child,
    this.salesforcePlaceholder,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authMode = ref.watch(authModeProvider);

    if (authMode == AuthMode.local) {
      return child;
    }

    return salesforcePlaceholder ?? const SizedBox.shrink();
  }
}

/// A button that is disabled in Salesforce mode for local-only features
class SalesforceAwareButton extends ConsumerWidget {
  final CrmFeature feature;
  final VoidCallback? onPressed;
  final Widget child;
  final ButtonStyle? style;

  const SalesforceAwareButton({
    super.key,
    required this.feature,
    required this.onPressed,
    required this.child,
    this.style,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authMode = ref.watch(authModeProvider);
    final isAvailable = SalesforceFeatureSupport.isFeatureAvailable(feature, authMode);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: isAvailable ? '' : SalesforceFeatureSupport.getUnavailableMessage(feature),
      child: ElevatedButton(
        onPressed: isAvailable ? onPressed : null,
        style: style ?? ElevatedButton.styleFrom(
          backgroundColor: isAvailable
              ? null
              : (isDark ? Colors.grey.shade800 : Colors.grey.shade300),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            child,
            if (!isAvailable) ...[
              const SizedBox(width: 8),
              Icon(
                Iconsax.cloud_cross,
                size: 16,
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Compact placeholder for unavailable features (inline use)
class _CompactUnavailablePlaceholder extends StatelessWidget {
  final String? message;
  final bool showIcon;

  const _CompactUnavailablePlaceholder({
    this.message,
    this.showIcon = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.grey.shade800.withValues(alpha: 0.5)
            : Colors.grey.shade200,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark
              ? Colors.grey.shade700
              : Colors.grey.shade300,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(
              Iconsax.cloud_cross,
              size: 16,
              color: LuxuryColors.textMuted,
            ),
            const SizedBox(width: 8),
          ],
          Text(
            message ?? 'N/A',
            style: TextStyle(
              fontSize: 13,
              color: LuxuryColors.textMuted,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}

/// Full placeholder for unavailable features (card use)
class _UnavailablePlaceholder extends StatelessWidget {
  final CrmFeature feature;
  final String? message;
  final bool showIcon;

  const _UnavailablePlaceholder({
    required this.feature,
    this.message,
    this.showIcon = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final displayMessage = message ?? SalesforceFeatureSupport.getUnavailableMessage(feature);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? LuxuryColors.obsidian.withValues(alpha: 0.5)
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.grey.shade800
              : Colors.grey.shade300,
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (showIcon) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.grey.shade800
                    : Colors.grey.shade200,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Iconsax.cloud_cross,
                size: 32,
                color: LuxuryColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
          ],
          Text(
            'Not Available',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark
                  ? LuxuryColors.textOnDark
                  : LuxuryColors.textOnLight,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            displayMessage,
            style: TextStyle(
              fontSize: 13,
              color: LuxuryColors.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: LuxuryColors.infoCobalt.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: LuxuryColors.infoCobalt.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Iconsax.info_circle,
                  size: 14,
                  color: LuxuryColors.infoCobalt,
                ),
                const SizedBox(width: 6),
                Text(
                  'Salesforce Mode Active',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: LuxuryColors.infoCobalt,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A section header that indicates Salesforce-only data
class SalesforceDataIndicator extends ConsumerWidget {
  final String? entityName;

  const SalesforceDataIndicator({
    super.key,
    this.entityName,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authMode = ref.watch(authModeProvider);

    if (authMode != AuthMode.salesforce) {
      return const SizedBox.shrink();
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF00A1E0).withValues(alpha: isDark ? 0.2 : 0.1),
            const Color(0xFF00A1E0).withValues(alpha: isDark ? 0.1 : 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: const Color(0xFF00A1E0).withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            'assets/icons/salesforce_cloud.png',
            width: 18,
            height: 18,
            errorBuilder: (context, error, stackTrace) => Icon(
              Iconsax.cloud,
              size: 18,
              color: const Color(0xFF00A1E0),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            entityName != null
                ? '$entityName from Salesforce'
                : 'Data from Salesforce',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF00A1E0),
            ),
          ),
        ],
      ),
    );
  }
}

/// Empty state specifically for when Salesforce data is empty
class SalesforceEmptyState extends ConsumerWidget {
  final String entityName;
  final String? message;
  final VoidCallback? onRefresh;

  const SalesforceEmptyState({
    super.key,
    required this.entityName,
    this.message,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authMode = ref.watch(authModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final displayMessage = authMode == AuthMode.salesforce
        ? message ?? 'No $entityName found in your Salesforce org'
        : message ?? 'No $entityName found';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark
                    ? LuxuryColors.obsidian
                    : Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                authMode == AuthMode.salesforce
                    ? Iconsax.cloud
                    : Iconsax.document,
                size: 40,
                color: LuxuryColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              displayMessage,
              style: TextStyle(
                fontSize: 15,
                color: LuxuryColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            if (authMode == AuthMode.salesforce) ...[
              const SizedBox(height: 8),
              Text(
                'Connected to Salesforce',
                style: TextStyle(
                  fontSize: 12,
                  color: const Color(0xFF00A1E0),
                ),
              ),
            ],
            if (onRefresh != null) ...[
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Iconsax.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
