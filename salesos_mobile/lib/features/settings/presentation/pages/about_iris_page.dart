import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/app_content_service.dart';

class AboutIrisPage extends ConsumerWidget {
  const AboutIrisPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final versionAsync = ref.watch(appVersionProvider);

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? Colors.white : Colors.black87,
            size: 20,
          ),
          onPressed: () {
            HapticFeedback.lightImpact();
            context.pop();
          },
        ),
        title: Text(
          'About SalesOS',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Logo
            _buildLogo().animate().fadeIn().scale(begin: const Offset(0.9, 0.9)),

            const SizedBox(height: 24),

            // App name and tagline
            Text(
              companyInfo.name,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : Colors.black87,
                letterSpacing: -0.5,
              ),
            ).animate(delay: 100.ms).fadeIn(),

            const SizedBox(height: 4),

            Text(
              companyInfo.tagline,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white60 : Colors.black54,
              ),
            ).animate(delay: 150.ms).fadeIn(),

            const SizedBox(height: 32),

            // Version info
            versionAsync.when(
              data: (version) => _buildVersionInfo(isDark, version),
              loading: () => const SizedBox(height: 60),
              error: (e, s) => const SizedBox.shrink(),
            ),

            const SizedBox(height: 32),

            // Links section
            _buildLinksSection(context, isDark),

            const SizedBox(height: 32),

            // Copyright
            Text(
              companyInfo.copyright,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white38 : Colors.black38,
              ),
              textAlign: TextAlign.center,
            ).animate(delay: 400.ms).fadeIn(),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [LuxuryColors.rolexGreen, LuxuryColors.deepEmerald],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: const Center(
        child: Text(
          'S',
          style: TextStyle(
            fontSize: 36,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            fontFamily: 'PlusJakartaSans',
          ),
        ),
      ),
    );
  }

  Widget _buildVersionInfo(bool isDark, AppVersionInfo version) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          _buildInfoRow('Version', version.version, isDark),
          const Divider(height: 20),
          _buildInfoRow('Build', version.buildNumber, isDark),
        ],
      ),
    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1);
  }

  Widget _buildInfoRow(String label, String value, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.white60 : Colors.black54,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _buildLinksSection(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildLinkTile(
          context,
          isDark,
          icon: Iconsax.document_text,
          title: 'Terms of Service',
          onTap: () => context.push(AppRoutes.termsOfService),
        ).animate(delay: 250.ms).fadeIn().slideX(begin: 0.05),

        _buildLinkTile(
          context,
          isDark,
          icon: Iconsax.shield_tick,
          title: 'Privacy Policy',
          onTap: () => context.push(AppRoutes.privacySecurity),
        ).animate(delay: 300.ms).fadeIn().slideX(begin: 0.05),

        _buildLinkTile(
          context,
          isDark,
          icon: Iconsax.code,
          title: 'Open Source Licenses',
          onTap: () => context.push(AppRoutes.ossLicenses),
        ).animate(delay: 350.ms).fadeIn().slideX(begin: 0.05),

        _buildLinkTile(
          context,
          isDark,
          icon: Iconsax.global,
          title: 'Website',
          subtitle: companyInfo.website,
          onTap: () => _launchUrl(companyInfo.website),
        ).animate(delay: 400.ms).fadeIn().slideX(begin: 0.05),
      ],
    );
  }

  Widget _buildLinkTile(
    BuildContext context,
    bool isDark, {
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: LuxuryColors.rolexGreen,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white54 : Colors.black45,
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 14,
              color: isDark ? Colors.white30 : Colors.black26,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
