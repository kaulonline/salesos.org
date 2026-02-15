import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/providers/auth_mode_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';

class AuthModePage extends ConsumerWidget {
  const AuthModePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentMode = ref.watch(authModeProvider);

    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),

              // Logo
              Center(
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: LuxuryColors.goldShimmer,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                        blurRadius: 30,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.auto_awesome,
                    size: 50,
                    color: Colors.white,
                  ),
                ).animate().fadeIn().scale(
                      begin: const Offset(0.8, 0.8),
                      curve: Curves.elasticOut,
                    ),
              ),
              const SizedBox(height: 32),

              // Enterprise badge
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: LuxuryColors.champagneGold.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Iconsax.building_4, size: 14, color: LuxuryColors.champagneGold),
                      const SizedBox(width: 6),
                      Text(
                        'FOR BUSINESS USE ONLY',
                        style: SalesOSTheme.labelSmall.copyWith(
                          color: LuxuryColors.champagneGold,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ).animate(delay: 150.ms).fadeIn(),
              const SizedBox(height: 16),

              // Title
              Center(
                child: Text(
                  'Choose Your CRM',
                  style: SalesOSTheme.headlineMedium.copyWith(
                    color: SalesOSTheme.darkTextPrimary,
                  ),
                ),
              ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.2),
              const SizedBox(height: 8),

              // Subtitle
              Center(
                child: Text(
                  'Select how your organization manages CRM data',
                  style: SalesOSTheme.bodyMedium.copyWith(
                    color: SalesOSTheme.darkTextSecondary,
                  ),
                ),
              ).animate(delay: 300.ms).fadeIn(),

              const Spacer(),

              // Mode Cards
              _AuthModeCard(
                mode: AuthMode.local,
                isSelected: currentMode == AuthMode.local,
                icon: Iconsax.data,
                title: 'SalesOS Local',
                description: 'Standalone CRM with SalesOS database. For organizations not using Salesforce.',
                features: const [
                  'Full AI assistant capabilities',
                  'Secure cloud storage',
                  'Team collaboration',
                ],
                onTap: () async {
                  HapticFeedback.selectionClick();
                  await ref.read(authModeProvider.notifier).setMode(AuthMode.local);
                  if (context.mounted) {
                    context.go(AppRoutes.login);
                  }
                },
              ).animate(delay: 400.ms).fadeIn().slideX(begin: -0.1),

              const SizedBox(height: 16),

              _AuthModeCard(
                mode: AuthMode.salesforce,
                isSelected: currentMode == AuthMode.salesforce,
                icon: Iconsax.cloud,
                title: 'Salesforce CRM',
                description: 'Connect to your organization\'s Salesforce instance for seamless integration.',
                features: const [
                  'Salesforce SSO login',
                  'Real-time data sync',
                  'Enterprise security',
                ],
                onTap: () async {
                  HapticFeedback.selectionClick();
                  await ref.read(authModeProvider.notifier).setMode(AuthMode.salesforce);
                  if (context.mounted) {
                    context.go(AppRoutes.login);
                  }
                },
              ).animate(delay: 500.ms).fadeIn().slideX(begin: 0.1),

              const Spacer(flex: 2),

              // Skip for now
              Center(
                child: TextButton(
                  onPressed: () => context.go(AppRoutes.login),
                  child: Text(
                    'Continue with current selection',
                    style: SalesOSTheme.labelMedium.copyWith(
                      color: SalesOSTheme.darkTextSecondary,
                    ),
                  ),
                ),
              ).animate(delay: 600.ms).fadeIn(),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthModeCard extends StatelessWidget {
  final AuthMode mode;
  final bool isSelected;
  final IconData icon;
  final String title;
  final String description;
  final List<String> features;
  final VoidCallback onTap;

  const _AuthModeCard({
    required this.mode,
    required this.isSelected,
    required this.icon,
    required this.title,
    required this.description,
    required this.features,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected
              ? LuxuryColors.champagneGold.withValues(alpha: 0.1)
              : SalesOSTheme.darkSurfaceElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? LuxuryColors.champagneGold : SalesOSTheme.darkBorder,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                        : SalesOSTheme.darkSurface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    icon,
                    color: isSelected ? LuxuryColors.champagneGold : SalesOSTheme.darkTextSecondary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: SalesOSTheme.titleMedium.copyWith(
                          color: isSelected
                              ? LuxuryColors.champagneGold
                              : SalesOSTheme.darkTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        description,
                        style: SalesOSTheme.bodySmall.copyWith(
                          color: SalesOSTheme.darkTextSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: LuxuryColors.champagneGold,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: features.map((feature) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: SalesOSTheme.darkSurface,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Iconsax.tick_circle,
                        size: 12,
                        color: isSelected ? SalesOSTheme.success : SalesOSTheme.darkTextTertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        feature,
                        style: SalesOSTheme.labelSmall.copyWith(
                          color: SalesOSTheme.darkTextSecondary,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
