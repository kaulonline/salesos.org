import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/biometric_service.dart';
import '../../../../core/services/app_lifecycle_service.dart';
import '../../data/repositories/auth_repository.dart';
import '../bloc/auth_provider.dart';
import '../../../../shared/widgets/luxury_card.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  String _statusText = 'Initializing...';
  bool _showBiometricPrompt = false;
  bool _biometricFailed = false;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {

    // Delay for splash animation
    await Future.delayed(const Duration(milliseconds: 1500));

    if (!mounted) return;

    setState(() => _statusText = 'Checking authentication...');

    // Check if user has a valid token
    final authRepo = ref.read(authRepositoryProvider);
    final hasToken = await authRepo.isAuthenticated();

    if (!mounted) return;

    if (hasToken) {
      // User has stored token, check if biometric is enabled
      final biometricService = ref.read(biometricServiceProvider);
      final biometricEnabled = await biometricService.isBiometricEnabled();

      if (biometricEnabled) {
        setState(() {
          _showBiometricPrompt = true;
          _statusText = 'Authenticating...';
        });

        // Attempt biometric authentication
        await _authenticateWithBiometric();
      } else {
        // No biometric, try to validate token
        await _validateTokenAndNavigate();
      }
    } else {
      // No token, go to login
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        context.go(AppRoutes.login);
      }
    }
  }

  Future<void> _authenticateWithBiometric() async {
    final biometricService = ref.read(biometricServiceProvider);

    final authenticated = await biometricService.authenticate(
      reason: 'Sign in to SalesOS',
      biometricOnly: true,
    );

    if (!mounted) return;

    if (authenticated) {
      // Biometric success - get stored credentials and perform actual login
      setState(() => _statusText = 'Signing in...');

      final credentials = await biometricService.getStoredCredentials();

      if (credentials != null) {
        final email = credentials['email']!;
        final password = credentials['password']!;

        // Perform actual login with stored credentials - gets FRESH token
        await ref.read(authProvider.notifier).login(email, password);

        if (!mounted) return;

        final authState = ref.read(authProvider);
        if (authState.status == AuthStatus.authenticated) {
          HapticFeedback.mediumImpact();
          if (mounted) {
            context.go(AppRoutes.dashboard);
          }
          return;
        } else {
          // Login failed - password might have changed, go to login page
          if (mounted) {
            context.go(AppRoutes.login);
          }
          return;
        }
      }

      // No stored credentials - go to login page
      if (mounted) {
        context.go(AppRoutes.login);
      }
    } else {
      // Biometric failed, show option to use password
      setState(() {
        _biometricFailed = true;
        _statusText = 'Authentication required';
      });
    }
  }

  Future<void> _validateTokenAndNavigate() async {
    setState(() => _statusText = 'Loading your data...');

    try {
      // Try to get current user with stored token
      await ref.read(authProvider.notifier).checkAuth();

      if (!mounted) return;

      final authState = ref.read(authProvider);

      if (authState.status == AuthStatus.authenticated) {

        // Initialize device tracking and socket connection for returning users
        try {
          final lifecycleService = ref.read(appLifecycleServiceProvider);
          await lifecycleService.onUserLogin();
        } catch (e) {
          // Silently ignore
        }

        HapticFeedback.mediumImpact();
        if (mounted) {
          context.go(AppRoutes.dashboard);
        }
      } else {
        // DON'T clear biometric credentials - they should persist
        // The user just needs to re-enter password to refresh the token
        if (mounted) {
          context.go(AppRoutes.login);
        }
      }
    } catch (e) {
      // DON'T clear biometric credentials on error
      // Just go to login for manual re-authentication
      if (mounted) {
        context.go(AppRoutes.login);
      }
    }
  }

  void _retryBiometric() {
    HapticFeedback.lightImpact();
    setState(() {
      _biometricFailed = false;
      _statusText = 'Authenticating...';
    });
    _authenticateWithBiometric();
  }

  void _usePassword() {
    HapticFeedback.lightImpact();
    context.go(AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      body: Stack(
        children: [
          // Animated gradient background with gold accent
          _buildPremiumBackground(),

          SafeArea(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(flex: 2),

                  // Logo with gold glow effect
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      gradient: LuxuryColors.goldShimmer,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                          blurRadius: 30,
                          spreadRadius: -5,
                        ),
                        BoxShadow(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                          blurRadius: 50,
                          spreadRadius: -10,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      size: 60,
                      color: Colors.white,
                    ),
                  )
                      .animate()
                      .fadeIn(duration: 600.ms)
                      .scale(begin: const Offset(0.5, 0.5), curve: Curves.elasticOut),

                  const SizedBox(height: 32),

                  // App Name with gold accent
                  Text(
                    'SalesOS',
                    style: SalesOSTheme.displaySmall.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w300,
                      letterSpacing: 16,
                    ),
                  )
                      .animate(delay: 300.ms)
                      .fadeIn(duration: 500.ms)
                      .slideY(begin: 0.3, curve: Curves.easeOut),

                  const SizedBox(height: 8),

                  // Decorative line
                  Container(
                    width: 60,
                    height: 2,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          LuxuryColors.champagneGold,
                          Colors.transparent,
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                  ).animate(delay: 500.ms).fadeIn().scaleX(begin: 0),

                  const SizedBox(height: 12),

                  // Tagline with gold accent
                  Text(
                    'ENTERPRISE AI SALES PLATFORM',
                    style: SalesOSTheme.bodySmall.copyWith(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.8),
                      letterSpacing: 3,
                      fontWeight: FontWeight.w500,
                    ),
                  ).animate(delay: 600.ms).fadeIn(duration: 500.ms),

                  const Spacer(),

                  // Biometric prompt or loading
                  if (_showBiometricPrompt && _biometricFailed)
                    _buildBiometricFailedUI()
                  else if (_showBiometricPrompt)
                    _buildBiometricPromptUI()
                  else
                    _buildLoadingUI(),

                  const Spacer(),

                  // Bottom branding
                  _buildBottomBranding(),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumBackground() {
    return Stack(
      children: [
        // Base gradient
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                LuxuryColors.richBlack, // Near black
                Color(0xFF141414), // Dark charcoal
                Color(0xFF0A0A0A), // Deep black
              ],
            ),
          ),
        ),
        // Gold glow - top right
        Positioned(
          top: -100,
          right: -50,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  LuxuryColors.champagneGold.withValues(alpha: 0.15),
                  LuxuryColors.champagneGoldDark.withValues(alpha: 0.05),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
        // Gold glow - bottom left
        Positioned(
          bottom: -80,
          left: -60,
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  LuxuryColors.champagneGold.withValues(alpha: 0.1),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomBranding() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 20,
              height: 1,
              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            ),
            const SizedBox(width: 12),
            Icon(
              Icons.auto_awesome,
              size: 12,
              color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
            ),
            const SizedBox(width: 12),
            Container(
              width: 20,
              height: 1,
              color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'ENTERPRISE EDITION',
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w500,
            letterSpacing: 3,
            color: LuxuryColors.textMuted.withValues(alpha: 0.4),
          ),
        ),
      ],
    ).animate(delay: 1000.ms).fadeIn(duration: 600.ms);
  }

  Widget _buildLoadingUI() {
    return Column(
      children: [
        SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(
              LuxuryColors.champagneGold.withValues(alpha: 0.8),
            ),
          ),
        ).animate(delay: 800.ms).fadeIn(duration: 300.ms),
        const SizedBox(height: 16),
        Text(
          _statusText.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 2,
            color: LuxuryColors.textMuted.withValues(alpha: 0.6),
          ),
        ).animate(delay: 1000.ms).fadeIn(),
      ],
    );
  }

  Widget _buildBiometricPromptUI() {
    return FutureBuilder<List<BiometricType>>(
      future: ref.read(biometricServiceProvider).getAvailableBiometrics(),
      builder: (context, snapshot) {
        final biometrics = snapshot.data ?? [];
        final isFaceId = biometrics.contains(BiometricType.faceId);

        return Column(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Icon(
                isFaceId ? Iconsax.scan : Iconsax.finger_scan,
                size: 36,
                color: LuxuryColors.champagneGold,
              ),
            ).animate().fadeIn().scale(),
            const SizedBox(height: 20),
            Text(
              isFaceId ? 'Face ID' : 'Touch ID',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _statusText.toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                letterSpacing: 2,
                color: LuxuryColors.textMuted.withValues(alpha: 0.6),
              ),
            ),
          ],
        ).animate(delay: 800.ms).fadeIn();
      },
    );
  }

  Widget _buildBiometricFailedUI() {
    return FutureBuilder<List<BiometricType>>(
      future: ref.read(biometricServiceProvider).getAvailableBiometrics(),
      builder: (context, snapshot) {
        final biometrics = snapshot.data ?? [];
        final biometricName =
            ref.read(biometricServiceProvider).getBiometricName(biometrics);

        return Column(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.amber.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: const Icon(
                Iconsax.warning_2,
                size: 36,
                color: Colors.amber,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              '$biometricName Not Recognized',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 28),

            // Retry Button - Premium gold styled
            GestureDetector(
              onTap: _retryBiometric,
              child: Container(
                width: 220,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  gradient: LuxuryColors.goldShimmer,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                      blurRadius: 16,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Iconsax.refresh, size: 18, color: Colors.white),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        'Try $biometricName Again',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Use Password Button - subtle
            GestureDetector(
              onTap: _usePassword,
              child: Text(
                'USE PASSWORD INSTEAD',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 1.5,
                  color: LuxuryColors.textMuted.withValues(alpha: 0.6),
                ),
              ),
            ),
          ],
        ).animate().fadeIn();
      },
    );
  }
}
