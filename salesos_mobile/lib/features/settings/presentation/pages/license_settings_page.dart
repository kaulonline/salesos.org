import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/theme.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../core/services/license_service.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/iris_button.dart';

/// URLs for license-related pages
class _LicenseUrls {
  static const String enterprise = 'https://salesos.org/enterprise';
  static const String licenseAgreement = 'https://salesos.org/terms';
  static const String support = 'https://salesos.org/support';
}

class LicenseSettingsPage extends ConsumerStatefulWidget {
  const LicenseSettingsPage({super.key});

  @override
  ConsumerState<LicenseSettingsPage> createState() => _LicenseSettingsPageState();
}

class _LicenseSettingsPageState extends ConsumerState<LicenseSettingsPage> {
  final _licenseKeyController = TextEditingController();
  bool _isActivating = false;
  String? _error;

  @override
  void dispose() {
    _licenseKeyController.dispose();
    super.dispose();
  }

  /// Open a URL in the system browser
  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not open $url'),
              backgroundColor: IrisTheme.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to open URL: ${e.toString()}'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  Future<void> _activateLicense() async {
    final licenseKey = _licenseKeyController.text.trim();
    if (licenseKey.isEmpty) {
      setState(() => _error = 'Please enter a license key');
      return;
    }

    setState(() {
      _isActivating = true;
      _error = null;
    });
    HapticFeedback.lightImpact();

    try {
      final service = ref.read(licenseServiceProvider);
      await service.activateLicense(licenseKey);

      // Refresh license data
      ref.invalidate(currentLicenseProvider);

      if (mounted) {
        setState(() => _isActivating = false);
        _licenseKeyController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('License activated successfully!'),
            backgroundColor: IrisTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isActivating = false;
          _error = 'Failed to activate license. Please check your key and try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final licenseAsync = ref.watch(currentLicenseProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Enterprise License',
          style: IrisTheme.titleLarge.copyWith(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              licenseAsync.when(
                data: (license) => license != null
                    ? _buildActiveLicenseSection(license)
                    : _buildNoLicenseSection(),
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                    ),
                  ),
                ),
                error: (e, _) => _buildNoLicenseSection(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoLicenseSection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Enterprise info banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: LuxuryColors.rolexGreen.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Icon(Iconsax.building_4, color: LuxuryColors.jadePremium, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'SalesOS is licensed to organizations. Contact your administrator to obtain a license key.',
                  style: IrisTheme.bodySmall.copyWith(
                    color: LuxuryColors.jadePremium,
                  ),
                ),
              ),
            ],
          ),
        ).animate().fadeIn(),

        const SizedBox(height: 20),

        // No license message
        IrisCard(
          child: Column(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: IrisTheme.warning.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Iconsax.key,
                  size: 30,
                  color: IrisTheme.warning,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'No Active License',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter the license key provided by your organization administrator.',
                textAlign: TextAlign.center,
                style: IrisTheme.bodySmall.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            ],
          ),
        ).animate(delay: 50.ms).fadeIn().slideY(begin: 0.1),

        const SizedBox(height: 24),

        // License activation form
        Text(
          'Activate Enterprise License',
          style: IrisTheme.titleSmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 12),

        IrisCard(
          child: Column(
            children: [
              IrisTextField(
                label: 'License Key',
                hint: 'XXXX-XXXX-XXXX-XXXX',
                controller: _licenseKeyController,
                prefixIcon: Iconsax.key,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: IrisTheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Iconsax.warning_2, color: IrisTheme.error, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: IrisTheme.bodySmall.copyWith(color: IrisTheme.error),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              IrisButton(
                label: 'Activate License',
                onPressed: _activateLicense,
                isLoading: _isActivating,
                isFullWidth: true,
              ),
              const SizedBox(height: 12),
              Text(
                'Your administrator will provide you with a license key.',
                textAlign: TextAlign.center,
                style: IrisTheme.labelSmall.copyWith(
                  color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                ),
              ),
            ],
          ),
        ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

        const SizedBox(height: 24),

        // Contact admin option
        IrisCard(
          onTap: () {
            HapticFeedback.selectionClick();
            _openUrl(_LicenseUrls.enterprise);
          },
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Iconsax.building_4, color: LuxuryColors.jadePremium, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Enterprise Licensing Info',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                      ),
                    ),
                    Text(
                      'Learn about organization licenses',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Iconsax.arrow_right_3, size: 16, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
            ],
          ),
        ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),
      ],
    );
  }

  Widget _buildActiveLicenseSection(UserLicense license) {
    final dateFormat = DateFormat('MMM d, yyyy');
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Current Plan Card
        Text(
          'Current Plan',
          style: IrisTheme.titleSmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 12),

        IrisCard(
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: IrisTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Iconsax.medal_star,
                      color: Colors.black,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              license.licenseType.name,
                              style: IrisTheme.titleMedium.copyWith(
                                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            _buildStatusBadge(license.status),
                          ],
                        ),
                        Text(
                          license.licenseType.tier,
                          style: IrisTheme.bodySmall.copyWith(
                            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Divider(color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
              const SizedBox(height: 16),

              // License Details
              _buildDetailRow(
                icon: Iconsax.calendar,
                label: 'Valid Until',
                value: dateFormat.format(license.endDate),
              ),
              const SizedBox(height: 12),
              _buildDetailRow(
                icon: Iconsax.key,
                label: 'License Key',
                value: license.maskedLicenseKey,
              ),
              if (license.isTrial) ...[
                const SizedBox(height: 12),
                _buildDetailRow(
                  icon: Iconsax.timer_1,
                  label: 'Trial Period',
                  value: '${license.daysUntilExpiration} days remaining',
                  valueColor: IrisTheme.warning,
                ),
              ],
              if (license.autoRenew) ...[
                const SizedBox(height: 12),
                _buildDetailRow(
                  icon: Iconsax.refresh,
                  label: 'Auto-Renew',
                  value: 'Enabled',
                  valueColor: IrisTheme.success,
                ),
              ],
            ],
          ),
        ).animate().fadeIn().slideY(begin: 0.1),

        const SizedBox(height: 24),

        // Active Features Card
        Text(
          'Active Features (${license.enabledFeaturesCount})',
          style: IrisTheme.titleSmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 12),

        IrisCard(
          child: license.entitlements.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      'No features available for this license.',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                  ),
                )
              : Column(
                  children: license.entitlements
                      .where((e) => e.isEnabled)
                      .map((entitlement) => _buildFeatureItem(entitlement, isDark))
                      .toList(),
                ),
        ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

        const SizedBox(height: 24),

        // License Actions
        Text(
          'License Actions',
          style: IrisTheme.titleSmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 12),

        IrisCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _ActionItem(
                icon: Iconsax.refresh,
                title: 'Refresh License',
                onTap: () {
                  HapticFeedback.selectionClick();
                  ref.invalidate(currentLicenseProvider);
                },
              ),
              _ActionItem(
                icon: Iconsax.document_text,
                title: 'View License Agreement',
                onTap: () {
                  HapticFeedback.selectionClick();
                  _openUrl(_LicenseUrls.licenseAgreement);
                },
              ),
              _ActionItem(
                icon: Iconsax.headphone,
                title: 'Contact Support',
                onTap: () {
                  HapticFeedback.selectionClick();
                  _openUrl(_LicenseUrls.support);
                },
                showDivider: false,
              ),
            ],
          ),
        ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),

        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildStatusBadge(LicenseStatus status) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    Color color;
    String text;

    switch (status) {
      case LicenseStatus.active:
        color = IrisTheme.success;
        text = 'ACTIVE';
        break;
      case LicenseStatus.trial:
        color = IrisTheme.warning;
        text = 'TRIAL';
        break;
      case LicenseStatus.expired:
        color = IrisTheme.error;
        text = 'EXPIRED';
        break;
      case LicenseStatus.suspended:
        color = IrisTheme.error;
        text = 'SUSPENDED';
        break;
      case LicenseStatus.cancelled:
        color = isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary;
        text = 'CANCELLED';
        break;
      case LicenseStatus.pending:
        color = IrisTheme.warning;
        text = 'PENDING';
        break;
      default:
        color = isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary;
        text = 'UNKNOWN';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: IrisTheme.labelSmall.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 10,
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      children: [
        Icon(icon, size: 18, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
        const SizedBox(width: 12),
        Text(
          label,
          style: IrisTheme.bodySmall.copyWith(
            color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: IrisTheme.bodySmall.copyWith(
            color: valueColor ?? (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildFeatureItem(LicenseEntitlement entitlement, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: IrisTheme.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Iconsax.tick_circle,
              size: 14,
              color: IrisTheme.success,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              entitlement.feature.name,
              style: IrisTheme.bodySmall.copyWith(
                color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              entitlement.feature.category,
              style: IrisTheme.labelSmall.copyWith(
                color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback? onTap;
  final bool showDivider;

  const _ActionItem({
    required this.icon,
    required this.title,
    this.onTap,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, size: 20, color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                    ),
                  ),
                ),
                Icon(Iconsax.arrow_right_3, size: 16, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(height: 1, indent: 48, color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
      ],
    );
  }
}
