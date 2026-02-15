import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../core/providers/providers.dart';
import '../../core/services/crm_data_service.dart';

/// A toggle widget to switch between IRIS Local and Salesforce CRM modes
class CrmModeToggle extends ConsumerWidget {
  /// Whether to show labels below the toggle
  final bool showLabels;

  /// Whether to show in compact mode (smaller size)
  final bool compact;

  /// Callback when mode changes
  final Function(AuthMode)? onModeChanged;

  const CrmModeToggle({
    super.key,
    this.showLabels = true,
    this.compact = false,
    this.onModeChanged,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentMode = ref.watch(authModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final toggleWidth = compact ? 160.0 : 200.0;
    final toggleHeight = compact ? 44.0 : 52.0;
    final iconSize = compact ? 24.0 : 32.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: toggleWidth,
          height: toggleHeight,
          decoration: BoxDecoration(
            color: isDark
                ? IrisTheme.darkSurface
                : IrisTheme.lightSurface,
            borderRadius: BorderRadius.circular(toggleHeight / 2),
            border: Border.all(
              color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Animated indicator
              AnimatedAlign(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOutCubic,
                alignment: currentMode == AuthMode.local
                    ? Alignment.centerLeft
                    : Alignment.centerRight,
                child: Container(
                  width: toggleWidth / 2 - 4,
                  height: toggleHeight - 8,
                  margin: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: currentMode == AuthMode.salesforce
                        ? const Color(0xFF00A1E0) // Salesforce blue
                        : LuxuryColors.champagneGold,
                    borderRadius: BorderRadius.circular((toggleHeight - 8) / 2),
                    boxShadow: [
                      BoxShadow(
                        color: (currentMode == AuthMode.salesforce
                                ? const Color(0xFF00A1E0)
                                : LuxuryColors.champagneGold)
                            .withValues(alpha: 0.4),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                ),
              ),
              // Toggle buttons
              Row(
                children: [
                  // IRIS Local button
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _switchMode(ref, AuthMode.local),
                      behavior: HitTestBehavior.opaque,
                      child: Center(
                        child: _buildLogo(
                          'assets/icons/iris_logo.svg',
                          iconSize,
                          currentMode == AuthMode.local,
                          LuxuryColors.champagneGold,
                        ),
                      ),
                    ),
                  ),
                  // Salesforce button
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _switchMode(ref, AuthMode.salesforce),
                      behavior: HitTestBehavior.opaque,
                      child: Center(
                        child: _buildLogo(
                          'assets/icons/salesforce_logo.svg',
                          iconSize,
                          currentMode == AuthMode.salesforce,
                          const Color(0xFF00A1E0),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (showLabels) ...[
          const SizedBox(height: 8),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: Text(
              currentMode == AuthMode.local ? 'SalesOS Local' : 'Salesforce',
              key: ValueKey(currentMode),
              style: (compact ? IrisTheme.labelSmall : IrisTheme.labelMedium).copyWith(
                color: currentMode == AuthMode.salesforce
                    ? const Color(0xFF00A1E0)
                    : LuxuryColors.champagneGold,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLogo(String assetPath, double size, bool isActive, Color activeColor) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      child: SvgPicture.asset(
        assetPath,
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(
          isActive ? Colors.white : Colors.grey.shade400,
          BlendMode.srcIn,
        ),
      ),
    );
  }

  Future<void> _switchMode(WidgetRef ref, AuthMode mode) async {
    final currentMode = ref.read(authModeProvider);
    if (currentMode != mode) {
      HapticFeedback.mediumImpact();
      await ref.read(authModeProvider.notifier).setMode(mode);
      // Invalidate all CRM providers to force fresh data fetch
      ref.invalidate(crmLeadsProvider);
      ref.invalidate(crmContactsProvider);
      ref.invalidate(crmAccountsProvider);
      ref.invalidate(crmOpportunitiesProvider);
      ref.invalidate(crmTasksProvider);
      ref.invalidate(crmActivitiesProvider);
      ref.invalidate(crmPipelineStatsProvider);
      ref.invalidate(crmDashboardMetricsProvider);
      ref.invalidate(crmSalesTrendProvider);
      onModeChanged?.call(mode);
    }
  }
}

/// A larger card-style CRM mode selector with more details
class CrmModeSelector extends ConsumerWidget {
  /// Callback when mode changes
  final Function(AuthMode)? onModeChanged;

  const CrmModeSelector({super.key, this.onModeChanged});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentMode = ref.watch(authModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CRM Data Source',
          style: IrisTheme.titleSmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            // IRIS Local option
            Expanded(
              child: _CrmModeCard(
                mode: AuthMode.local,
                isSelected: currentMode == AuthMode.local,
                logoPath: 'assets/icons/iris_logo.svg',
                title: 'SalesOS Local',
                subtitle: 'Standalone database',
                color: LuxuryColors.champagneGold,
                onTap: () => _switchMode(ref, AuthMode.local),
              ),
            ),
            const SizedBox(width: 12),
            // Salesforce option
            Expanded(
              child: _CrmModeCard(
                mode: AuthMode.salesforce,
                isSelected: currentMode == AuthMode.salesforce,
                logoPath: 'assets/icons/salesforce_logo.svg',
                title: 'Salesforce',
                subtitle: 'Cloud CRM',
                color: const Color(0xFF00A1E0),
                onTap: () => _switchMode(ref, AuthMode.salesforce),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _switchMode(WidgetRef ref, AuthMode mode) async {
    final currentMode = ref.read(authModeProvider);
    if (currentMode != mode) {
      HapticFeedback.mediumImpact();
      await ref.read(authModeProvider.notifier).setMode(mode);
      // Invalidate all CRM providers to force fresh data fetch
      ref.invalidate(crmLeadsProvider);
      ref.invalidate(crmContactsProvider);
      ref.invalidate(crmAccountsProvider);
      ref.invalidate(crmOpportunitiesProvider);
      ref.invalidate(crmTasksProvider);
      ref.invalidate(crmActivitiesProvider);
      ref.invalidate(crmPipelineStatsProvider);
      ref.invalidate(crmDashboardMetricsProvider);
      ref.invalidate(crmSalesTrendProvider);
      onModeChanged?.call(mode);
    }
  }
}

class _CrmModeCard extends StatelessWidget {
  final AuthMode mode;
  final bool isSelected;
  final String logoPath;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _CrmModeCard({
    required this.mode,
    required this.isSelected,
    required this.logoPath,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.1)
              : (isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? color : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            // Logo container
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: isSelected
                    ? color.withValues(alpha: 0.15)
                    : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder).withValues(alpha: 0.5),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: SvgPicture.asset(
                  logoPath,
                  width: 32,
                  height: 32,
                  colorFilter: ColorFilter.mode(
                    isSelected ? color : (isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                    BlendMode.srcIn,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Title
            Text(
              title,
              style: IrisTheme.titleSmall.copyWith(
                color: isSelected
                    ? color
                    : (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            // Subtitle
            Text(
              subtitle,
              style: IrisTheme.labelSmall.copyWith(
                color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 8),
            // Checkmark indicator
            AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: isSelected ? 1 : 0,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  size: 14,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A compact indicator showing the current CRM mode with logo
class CrmModeIndicator extends ConsumerWidget {
  /// Size of the indicator
  final double size;

  /// Whether to show the label
  final bool showLabel;

  const CrmModeIndicator({
    super.key,
    this.size = 32,
    this.showLabel = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentMode = ref.watch(authModeProvider);

    final color = currentMode == AuthMode.salesforce
        ? const Color(0xFF00A1E0)
        : LuxuryColors.champagneGold;
    final logoPath = currentMode == AuthMode.salesforce
        ? 'assets/icons/salesforce_logo.svg'
        : 'assets/icons/iris_logo.svg';
    final label = currentMode == AuthMode.salesforce ? 'Salesforce' : 'SalesOS Local';

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(size / 4),
          ),
          child: Center(
            child: SvgPicture.asset(
              logoPath,
              width: size * 0.6,
              height: size * 0.6,
              colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
            ),
          ),
        ),
        if (showLabel) ...[
          const SizedBox(width: 8),
          Text(
            label,
            style: IrisTheme.labelMedium.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ],
    );
  }
}
