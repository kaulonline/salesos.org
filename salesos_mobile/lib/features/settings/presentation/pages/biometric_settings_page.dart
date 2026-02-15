import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';

import '../../../../core/config/theme.dart';
import '../../../../core/services/biometric_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../auth/presentation/bloc/auth_provider.dart';

/// Page for managing biometric authentication settings
class BiometricSettingsPage extends ConsumerStatefulWidget {
  const BiometricSettingsPage({super.key});

  @override
  ConsumerState<BiometricSettingsPage> createState() => _BiometricSettingsPageState();
}

class _BiometricSettingsPageState extends ConsumerState<BiometricSettingsPage> {
  bool _isLoading = false;
  bool _biometricEnabled = false;
  List<BiometricType> _availableBiometrics = [];
  bool _deviceSupported = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadBiometricStatus();
  }

  Future<void> _loadBiometricStatus() async {
    setState(() => _isLoading = true);

    try {
      final biometricService = ref.read(biometricServiceProvider);

      final supported = await biometricService.isDeviceSupported();
      final available = await biometricService.getAvailableBiometrics();
      final enabled = await biometricService.isBiometricEnabled();

      setState(() {
        _deviceSupported = supported;
        _availableBiometrics = available;
        _biometricEnabled = enabled;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load biometric settings';
        _isLoading = false;
      });
    }
  }

  String get _biometricName {
    if (_availableBiometrics.contains(BiometricType.faceId)) {
      return 'Face ID';
    } else if (_availableBiometrics.contains(BiometricType.fingerprint)) {
      return 'Touch ID';
    }
    return 'Biometrics';
  }

  IconData get _biometricIcon {
    if (_availableBiometrics.contains(BiometricType.faceId)) {
      return Iconsax.scan;
    }
    return Iconsax.finger_scan;
  }

  Future<void> _toggleBiometric(bool enable) async {
    final biometricService = ref.read(biometricServiceProvider);

    if (enable) {
      // First authenticate to enable
      final authenticated = await biometricService.authenticate(
        reason: 'Authenticate to enable $_biometricName',
      );

      if (!authenticated) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$_biometricName authentication failed'),
              backgroundColor: LuxuryColors.errorRuby,
            ),
          );
        }
        return;
      }

      // Get user credentials to store for biometric login
      // We need to show a dialog to re-enter password
      final password = await _showPasswordDialog();
      if (password == null) return;

      final user = ref.read(currentUserProvider);
      if (user == null) return;

      // Verify password is correct
      try {
        final authRepo = ref.read(authRepositoryProvider);
        await authRepo.login(user.email, password);

        // Enable biometric with credentials
        await biometricService.enableBiometric(user.email, password);

        if (mounted) {
          setState(() => _biometricEnabled = true);
        }
        HapticFeedback.heavyImpact();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$_biometricName enabled successfully'),
              backgroundColor: LuxuryColors.rolexGreen,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Invalid password'),
              backgroundColor: LuxuryColors.errorRuby,
            ),
          );
        }
      }
    } else {
      // Disable biometric
      await biometricService.disableBiometric();
      if (mounted) {
        setState(() => _biometricEnabled = false);
      }
      HapticFeedback.lightImpact();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$_biometricName disabled'),
            backgroundColor: LuxuryColors.textMuted,
          ),
        );
      }
    }
  }

  Future<String?> _showPasswordDialog() async {
    final controller = TextEditingController();
    bool obscure = true;

    return showDialog<String>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final isDark = Theme.of(context).brightness == Brightness.dark;

            return AlertDialog(
              backgroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Text(
                'Enter Password',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Enter your password to enable $_biometricName login',
                    style: IrisTheme.bodySmall.copyWith(color: LuxuryColors.textMuted),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: controller,
                    obscureText: obscure,
                    decoration: InputDecoration(
                      hintText: 'Password',
                      prefixIcon: Icon(Iconsax.lock, color: LuxuryColors.textMuted),
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscure ? Iconsax.eye : Iconsax.eye_slash,
                          color: LuxuryColors.textMuted,
                        ),
                        onPressed: () => setDialogState(() => obscure = !obscure),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: LuxuryColors.rolexGreen.withValues(alpha: 0.3)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: LuxuryColors.rolexGreen),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Cancel',
                    style: IrisTheme.labelMedium.copyWith(color: LuxuryColors.textMuted),
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (controller.text.isNotEmpty) {
                      Navigator.pop(context, controller.text);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: LuxuryColors.rolexGreen,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    'Confirm',
                    style: IrisTheme.labelMedium.copyWith(color: Colors.white),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Iconsax.arrow_left,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Biometric Settings',
          style: IrisTheme.titleMedium.copyWith(
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: _isLoading
          ? Center(
              child: CircularProgressIndicator(color: LuxuryColors.rolexGreen),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Card
                  IrisCard(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _deviceSupported
                                ? LuxuryColors.rolexGreen.withValues(alpha: 0.1)
                                : LuxuryColors.textMuted.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _biometricIcon,
                            size: 40,
                            color: _deviceSupported
                                ? LuxuryColors.rolexGreen
                                : LuxuryColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _deviceSupported ? _biometricName : 'Not Available',
                          style: IrisTheme.titleMedium.copyWith(
                            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _deviceSupported
                              ? 'Use $_biometricName for quick and secure login'
                              : 'Your device does not support biometric authentication',
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ).animate().fadeIn().slideY(begin: 0.1),

                  const SizedBox(height: 24),

                  // Enable/Disable Toggle
                  if (_deviceSupported) ...[
                    Text(
                      'Quick Login',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    IrisCard(
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            _biometricIcon,
                            color: LuxuryColors.rolexGreen,
                            size: 22,
                          ),
                        ),
                        title: Text(
                          'Enable $_biometricName',
                          style: IrisTheme.bodyMedium.copyWith(
                            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: Text(
                          _biometricEnabled
                              ? 'Quick login is enabled'
                              : 'Login faster with $_biometricName',
                          style: IrisTheme.bodySmall.copyWith(
                            color: LuxuryColors.textMuted,
                          ),
                        ),
                        trailing: Switch(
                          value: _biometricEnabled,
                          onChanged: _toggleBiometric,
                          activeTrackColor: LuxuryColors.rolexGreen,
                          thumbColor: WidgetStateProperty.all(Colors.white),
                        ),
                      ),
                    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

                    const SizedBox(height: 24),

                    // Info Section
                    Text(
                      'How it works',
                      style: IrisTheme.titleSmall.copyWith(
                        color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    IrisCard(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _buildInfoRow(
                            icon: Iconsax.security_safe,
                            title: 'Secure Storage',
                            description: 'Your credentials are encrypted and stored securely on your device',
                            isDark: isDark,
                          ),
                          const Divider(height: 24),
                          _buildInfoRow(
                            icon: Iconsax.flash,
                            title: 'Quick Access',
                            description: 'Skip typing your password and login instantly',
                            isDark: isDark,
                          ),
                          const Divider(height: 24),
                          _buildInfoRow(
                            icon: Iconsax.shield_tick,
                            title: 'Privacy Protected',
                            description: 'Your biometric data never leaves your device',
                            isDark: isDark,
                          ),
                        ],
                      ),
                    ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),
                  ],

                  // Error Message
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: LuxuryColors.errorRuby.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: LuxuryColors.errorRuby.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Iconsax.warning_2, color: LuxuryColors.errorRuby),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: IrisTheme.bodySmall.copyWith(
                                color: LuxuryColors.errorRuby,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String description,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: LuxuryColors.jadePremium.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            size: 18,
            color: LuxuryColors.jadePremium,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: IrisTheme.bodyMedium.copyWith(
                  color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: IrisTheme.bodySmall.copyWith(
                  color: LuxuryColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
