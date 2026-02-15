import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/salesforce_service.dart';
import '../../../../core/providers/providers.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../../../shared/widgets/luxury_card.dart';

class SalesforceLoginPage extends ConsumerStatefulWidget {
  const SalesforceLoginPage({super.key});

  @override
  ConsumerState<SalesforceLoginPage> createState() => _SalesforceLoginPageState();
}

class _SalesforceLoginPageState extends ConsumerState<SalesforceLoginPage> {
  bool _isLoading = false;
  bool _isCheckingStatus = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkConnectionStatus();
  }

  Future<void> _checkConnectionStatus() async {
    setState(() => _isCheckingStatus = true);

    try {
      final service = ref.read(salesforceServiceProvider);
      final status = await service.getConnectionStatus();

      if (mounted) {
        setState(() {
          _isCheckingStatus = false;
        });

        // If already connected, go to dashboard
        if (status.isConnected) {
          context.go(AppRoutes.dashboard);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCheckingStatus = false;
          _error = 'Failed to check connection status';
        });
      }
    }
  }

  Future<void> _handleSalesforceLogin() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    HapticFeedback.lightImpact();

    try {
      final service = ref.read(salesforceServiceProvider);

      // Check if Salesforce is enabled
      final isEnabled = await service.isEnabled();
      if (!isEnabled) {
        setState(() {
          _error = 'Salesforce integration is not enabled. Please contact your administrator.';
          _isLoading = false;
        });
        return;
      }

      // Get OAuth URL
      final authUrl = await service.getAuthUrl();
      if (authUrl == null) {
        setState(() {
          _error = 'Failed to get Salesforce authorization URL';
          _isLoading = false;
        });
        return;
      }

      // Open in browser
      final uri = Uri.parse(authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );

        // Show waiting message
        if (mounted) {
          _showWaitingDialog();
        }
      } else {
        setState(() {
          _error = 'Could not open Salesforce login page';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'An error occurred: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  void _showWaitingDialog() {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => AlertDialog(
        backgroundColor: LuxuryColors.obsidian,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Iconsax.cloud, color: LuxuryColors.champagneGold),
            const SizedBox(width: 12),
            Text(
              'Connecting...',
              style: IrisTheme.titleMedium.copyWith(
                color: IrisTheme.darkTextPrimary,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Complete the login in your browser. Once connected, return to the app.',
              style: IrisTheme.bodyMedium.copyWith(
                color: IrisTheme.darkTextSecondary,
              ),
            ),
            const SizedBox(height: 24),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.champagneGold),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _checkConnectionStatus();
            },
            child: Text(
              'Check Connection',
              style: IrisTheme.labelMedium.copyWith(
                color: LuxuryColors.champagneGold,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _isLoading = false);
            },
            child: Text(
              'Cancel',
              style: IrisTheme.labelMedium.copyWith(
                color: IrisTheme.darkTextSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _switchToLocalMode() async {
    HapticFeedback.lightImpact();
    await ref.read(authModeProvider.notifier).setMode(AuthMode.local);
    if (mounted) {
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isCheckingStatus) {
      return Scaffold(
        backgroundColor: LuxuryColors.richBlack,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.champagneGold),
              ),
              const SizedBox(height: 24),
              Text(
                'Checking connection...',
                style: IrisTheme.bodyMedium.copyWith(
                  color: IrisTheme.darkTextSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: IrisTheme.darkTextPrimary),
          onPressed: () => context.go(AppRoutes.authMode),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),

              // Salesforce Logo/Icon
              Center(
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: LuxuryColors.salesforceBlue.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Iconsax.cloud,
                    size: 50,
                    color: LuxuryColors.salesforceBlue,
                  ),
                ).animate().fadeIn().scale(
                      begin: const Offset(0.8, 0.8),
                      curve: Curves.elasticOut,
                    ),
              ),
              const SizedBox(height: 32),

              // Title
              Center(
                child: Text(
                  'Connect to Salesforce',
                  style: IrisTheme.headlineMedium.copyWith(
                    color: IrisTheme.darkTextPrimary,
                  ),
                ),
              ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.2),
              const SizedBox(height: 12),

              // Description
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    'Sign in with your Salesforce account to sync your CRM data with SalesOS.',
                    textAlign: TextAlign.center,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: IrisTheme.darkTextSecondary,
                      height: 1.5,
                    ),
                  ),
                ),
              ).animate(delay: 150.ms).fadeIn(),

              const SizedBox(height: 40),

              // Features List
              _buildFeatureItem(
                icon: Iconsax.profile_2user,
                title: 'Sync Contacts & Leads',
                description: 'Access your Salesforce contacts and leads',
                delay: 200,
              ),
              _buildFeatureItem(
                icon: Iconsax.chart_21,
                title: 'Opportunities',
                description: 'Track deals and opportunities in real-time',
                delay: 250,
              ),
              _buildFeatureItem(
                icon: Iconsax.activity,
                title: 'Activities & Tasks',
                description: 'Log calls, emails, and meetings automatically',
                delay: 300,
              ),
              _buildFeatureItem(
                icon: Iconsax.security_safe,
                title: 'Secure OAuth 2.0',
                description: 'Your credentials stay with Salesforce',
                delay: 350,
              ),

              const SizedBox(height: 32),

              // Error Message
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: IrisTheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: IrisTheme.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Iconsax.warning_2, color: IrisTheme.error, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _error!,
                          style: IrisTheme.bodySmall.copyWith(color: IrisTheme.error),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Connect Button
              IrisButton(
                label: 'Connect with Salesforce',
                onPressed: _handleSalesforceLogin,
                isLoading: _isLoading,
                isFullWidth: true,
                size: IrisButtonSize.large,
              ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.2),

              const SizedBox(height: 24),

              // Switch to Local Mode
              Center(
                child: TextButton.icon(
                  onPressed: _switchToLocalMode,
                  icon: const Icon(
                    Iconsax.data,
                    size: 18,
                    color: IrisTheme.darkTextSecondary,
                  ),
                  label: Text(
                    'Use SalesOS Local instead',
                    style: IrisTheme.labelMedium.copyWith(
                      color: IrisTheme.darkTextSecondary,
                    ),
                  ),
                ),
              ).animate(delay: 450.ms).fadeIn(),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required String title,
    required String description,
    required int delay,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: IrisTheme.darkSurfaceElevated,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: LuxuryColors.champagneGold, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: IrisTheme.titleSmall.copyWith(
                    color: IrisTheme.darkTextPrimary,
                  ),
                ),
                Text(
                  description,
                  style: IrisTheme.bodySmall.copyWith(
                    color: IrisTheme.darkTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate(delay: Duration(milliseconds: delay)).fadeIn().slideX(begin: -0.1);
  }
}
