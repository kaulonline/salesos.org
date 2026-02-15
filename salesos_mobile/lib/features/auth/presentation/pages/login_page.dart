import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../core/services/biometric_service.dart';
import '../../../../core/providers/providers.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../bloc/auth_provider.dart';

/// Background image URL for login screen - Premium luxury aesthetic
const String _loginBackgroundUrl =
    'https://images.pexels.com/photos/13551578/pexels-photo-13551578.jpeg?auto=compress&cs=tinysrgb&w=1920';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  String _biometricName = 'Biometrics';
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _checkBiometricAvailability();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _checkBiometricAvailability() async {
    final biometricService = ref.read(biometricServiceProvider);

    final canCheck = await biometricService.canCheckBiometrics();
    final isEnabled = await biometricService.isBiometricEnabled();
    final biometrics = await biometricService.getAvailableBiometrics();

    if (mounted) {
      setState(() {
        _biometricAvailable = canCheck && biometrics.isNotEmpty;
        _biometricEnabled = isEnabled;
        _biometricName = biometricService.getBiometricName(biometrics);
      });
    }
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    await ref.read(authProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (!mounted) return;

    setState(() => _isLoading = false);

    final authState = ref.read(authProvider);
    if (authState.status == AuthStatus.authenticated) {
      if (_biometricAvailable && !_biometricEnabled) {
        // Offer to enable biometrics for first time
        await _offerBiometricSetup();
      } else if (_biometricAvailable && _biometricEnabled) {
        // Biometrics already enabled - update stored password silently
        // (in case user changed password elsewhere)
        final biometricService = ref.read(biometricServiceProvider);
        await biometricService.updateStoredPassword(_passwordController.text);
      }

      HapticFeedback.heavyImpact();
      if (mounted) {
        context.go(AppRoutes.dashboard);
      }
    } else if (authState.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authState.error!),
          backgroundColor: SalesOSTheme.error,
        ),
      );
    }
  }

  Future<void> _offerBiometricSetup() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => _GlassDialog(
        icon: _biometricName == 'Face ID' ? Iconsax.scan : Iconsax.finger_scan,
        title: 'Enable $_biometricName?',
        message:
            'Sign in faster next time using $_biometricName instead of your password.',
        confirmText: 'Enable',
        cancelText: 'Not Now',
      ),
    );

    if (result == true && mounted) {
      final biometricService = ref.read(biometricServiceProvider);
      final authenticated = await biometricService.authenticate(
        reason: 'Verify your identity to enable $_biometricName',
      );

      if (authenticated) {
        // Store credentials (email + password) for biometric re-authentication
        // Password is encrypted by Flutter Secure Storage
        await biometricService.enableBiometric(
          _emailController.text.trim(),
          _passwordController.text,
        );

        if (mounted) {
          setState(() => _biometricEnabled = true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$_biometricName enabled successfully'),
              backgroundColor: SalesOSTheme.success,
            ),
          );
        }
      }
    }
  }

  Future<void> _handleBiometricLogin() async {
    HapticFeedback.lightImpact();
    setState(() => _isLoading = true);

    final biometricService = ref.read(biometricServiceProvider);
    final authenticated = await biometricService.authenticate(
      reason: 'Sign in to SalesOS',
      biometricOnly: true,
    );

    if (!mounted) return;

    if (authenticated) {
      // Get stored credentials (email + password)
      final credentials = await biometricService.getStoredCredentials();

      if (credentials != null) {
        final email = credentials['email']!;
        final password = credentials['password']!;

        // Perform actual login with stored credentials - this gets a FRESH token
        await ref.read(authProvider.notifier).login(email, password);

        if (!mounted) return;

        final authState = ref.read(authProvider);
        if (authState.status == AuthStatus.authenticated) {
          HapticFeedback.heavyImpact();
          if (mounted) {
            context.go(AppRoutes.dashboard);
          }
          return;
        } else if (authState.error != null) {
          // Login failed - password might have changed
          setState(() {
            _isLoading = false;
            _emailController.text = email;
          });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Login failed: ${authState.error}'),
                backgroundColor: SalesOSTheme.error,
              ),
            );
          }
          return;
        }
      }

      // No stored credentials - shouldn't happen but handle gracefully
      setState(() => _isLoading = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please set up biometric login again.'),
            backgroundColor: SalesOSTheme.warning,
          ),
        );
      }
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    // Responsive: max width for form on tablets/large screens
    final isLargeScreen = size.width > 600;
    final maxFormWidth = isLargeScreen ? 450.0 : double.infinity;
    final horizontalPadding = isLargeScreen ? 40.0 : 24.0;

    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      body: Stack(
        children: [
          // Animated gradient background
          _buildAnimatedBackground(size),

          // Main content
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Container(
                constraints: BoxConstraints(
                  minHeight: size.height -
                      MediaQuery.of(context).padding.vertical,
                ),
                padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxFormWidth),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 16),

                          // Auth Mode Toggle - Inline CRM selector
                          Center(child: _buildAuthModeToggle()),

                          SizedBox(height: size.height * 0.06),

                          // Logo & Branding
                          _buildLogoSection(),

                          SizedBox(height: size.height * 0.05),

                          // Glass Card with Form
                          _buildGlassFormCard(),

                          const SizedBox(height: 24),

                          // Biometric Login (if available)
                          if (_biometricAvailable && _biometricEnabled)
                            _buildBiometricSection(),

                          const SizedBox(height: 32),

                          // Sign Up Link
                          _buildSignUpLink(),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedBackground(Size size) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Pexels background image
        CachedNetworkImage(
          imageUrl: _loginBackgroundUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            color: const Color(0xFF0A0A0F),
          ),
          errorWidget: (context, url, error) => Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF0A0A0F),
                  Color(0xFF12121A),
                  Color(0xFF0D0D14),
                ],
              ),
            ),
          ),
        ),

        // Dark overlay for text readability
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withValues(alpha: 0.4),
                Colors.black.withValues(alpha: 0.6),
                Colors.black.withValues(alpha: 0.8),
              ],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        ),

        // Subtle vignette effect
        Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.center,
              radius: 1.2,
              colors: [
                Colors.transparent,
                Colors.black.withValues(alpha: 0.4),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAuthModeToggle() {
    final authMode = ref.watch(authModeProvider);
    final isLocalMode = authMode == AuthMode.local;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Label above toggle
        Text(
          'Select your CRM',
          style: SalesOSTheme.labelSmall.copyWith(
            color: Colors.white.withValues(alpha: 0.5),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // SalesOS CRM option
                  _buildToggleOption(
                    icon: Iconsax.box,
                    label: 'SalesOS CRM',
                    isSelected: isLocalMode,
                    onTap: () async {
                      HapticFeedback.selectionClick();
                      await ref.read(authModeProvider.notifier).setMode(AuthMode.local);
                    },
                  ),
                  const SizedBox(width: 4),
                  // Salesforce CRM option
                  _buildToggleOption(
                    icon: Iconsax.cloud,
                    label: 'Salesforce',
                    isSelected: !isLocalMode,
                    onTap: () async {
                      HapticFeedback.selectionClick();
                      await ref.read(authModeProvider.notifier).setMode(AuthMode.salesforce);
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 600.ms).slideY(begin: -0.2);
  }

  Widget _buildToggleOption({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    LuxuryColors.champagneGold,
                    LuxuryColors.champagneGold,
                  ],
                )
              : null,
          color: isSelected ? null : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected
                  ? Colors.white
                  : Colors.white.withValues(alpha: 0.5),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: SalesOSTheme.labelSmall.copyWith(
                color: isSelected
                    ? Colors.white
                    : Colors.white.withValues(alpha: 0.6),
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoSection() {
    return Column(
      children: [
        // Enterprise badge
        Container(
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
                'ENTERPRISE',
                style: SalesOSTheme.labelSmall.copyWith(
                  color: LuxuryColors.champagneGold,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 600.ms),

        const SizedBox(height: 20),

        // Glowing Logo - Champagne Gold
        Container(
          width: 90,
          height: 90,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LuxuryColors.goldShimmer,
            border: Border.all(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                blurRadius: 30,
                spreadRadius: 5,
              ),
              BoxShadow(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                blurRadius: 60,
                spreadRadius: 10,
              ),
            ],
          ),
          child: const Icon(
            Icons.auto_awesome,
            size: 44,
            color: Colors.white,
          ),
        )
            .animate()
            .fadeIn(duration: 800.ms)
            .scale(
              begin: const Offset(0.5, 0.5),
              curve: Curves.elasticOut,
              duration: 1000.ms,
            )
            .shimmer(
              delay: 1500.ms,
              duration: 2000.ms,
              color: Colors.white.withValues(alpha: 0.3),
            ),

        const SizedBox(height: 28),

        // Title with gradient
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [
              Colors.white,
              Color(0xFFE5E5E5),
            ],
          ).createShader(bounds),
          child: Text(
            'Welcome Back',
            style: SalesOSTheme.headlineLarge.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ),
        ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.3),

        const SizedBox(height: 10),

        Text(
          'Sign in with your business account',
          style: SalesOSTheme.bodyMedium.copyWith(
            color: Colors.white.withValues(alpha: 0.6),
            letterSpacing: 0.2,
          ),
        ).animate(delay: 500.ms).fadeIn(),
      ],
    );
  }

  Widget _buildGlassFormCard() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.1),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 30,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Email Field
              _buildGlassTextField(
                controller: _emailController,
                label: 'Email',
                hint: 'Enter your email',
                icon: Iconsax.sms,
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 20),

              // Password Field
              _buildGlassTextField(
                controller: _passwordController,
                label: 'Password',
                hint: 'Enter your password',
                icon: Iconsax.lock,
                obscureText: _obscurePassword,
                suffixIcon: GestureDetector(
                  onTap: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                  child: Icon(
                    _obscurePassword ? Iconsax.eye_slash : Iconsax.eye,
                    color: Colors.white.withValues(alpha: 0.5),
                    size: 20,
                  ),
                ),
                onSubmitted: (_) => _handleLogin(),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your password';
                  }
                  if (value.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 12),

              // Forgot Password
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => context.push(AppRoutes.forgotPassword),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Forgot password?',
                    style: SalesOSTheme.labelMedium.copyWith(
                      color: LuxuryColors.champagneGold,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Sign In Button with glow
              _buildGlowingButton(),
            ],
          ),
        ),
      ),
    )
        .animate(delay: 600.ms)
        .fadeIn(duration: 800.ms)
        .slideY(begin: 0.1, curve: Curves.easeOutQuart);
  }

  Widget _buildGlassTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    Function(String)? onSubmitted,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: SalesOSTheme.labelMedium.copyWith(
            color: Colors.white.withValues(alpha: 0.8),
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: obscureText,
            style: SalesOSTheme.bodyMedium.copyWith(
              color: Colors.white,
            ),
            onFieldSubmitted: onSubmitted,
            validator: validator,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: SalesOSTheme.bodyMedium.copyWith(
                color: Colors.white.withValues(alpha: 0.3),
              ),
              prefixIcon: Icon(
                icon,
                color: Colors.white.withValues(alpha: 0.5),
                size: 20,
              ),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
              errorStyle: SalesOSTheme.labelSmall.copyWith(
                color: const Color(0xFFFF6B6B),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGlowingButton() {
    // Wrap in RepaintBoundary to isolate shimmer animation repaints
    // and prevent semantics parent data dirty errors
    // Note: We keep Semantics accessible since this is a functional button
    return RepaintBoundary(
      child: Semantics(
        label: 'Sign in button',
        button: true,
        child: GestureDetector(
          onTap: _isLoading ? null : _handleLogin,
          child: Container(
            width: double.infinity,
            height: 56,
            decoration: BoxDecoration(
              gradient: LuxuryColors.goldShimmer,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Center(
              child: _isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'SIGN IN',
                          style: SalesOSTheme.labelLarge.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Icon(
                          Iconsax.arrow_right_3,
                          color: Colors.white,
                          size: 20,
                        ),
                      ],
                    ),
            ),
          )
              .animate(
                onPlay: (controller) => controller.repeat(reverse: true),
              )
              .shimmer(
                delay: 2000.ms,
                duration: 2500.ms,
                color: Colors.white.withValues(alpha: 0.2),
              ),
        ),
      ),
    );
  }

  Widget _buildBiometricSection() {
    final isFaceId = _biometricName == 'Face ID';

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Container(
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      Colors.white.withValues(alpha: 0.2),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'or continue with',
                style: SalesOSTheme.labelSmall.copyWith(
                  color: Colors.white.withValues(alpha: 0.5),
                ),
              ),
            ),
            Expanded(
              child: Container(
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.white.withValues(alpha: 0.2),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        GestureDetector(
          onTap: _isLoading ? null : _handleBiometricLogin,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.15),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isFaceId ? Iconsax.scan : Iconsax.finger_scan,
                      color: LuxuryColors.champagneGold,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _biometricName,
                      style: SalesOSTheme.labelLarge.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    ).animate(delay: 800.ms).fadeIn();
  }

  Widget _buildSignUpLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(
            "Don't have an account? ",
            style: SalesOSTheme.bodyMedium.copyWith(
              color: Colors.white.withValues(alpha: 0.5),
            ),
          ),
        ),
        GestureDetector(
          onTap: () => context.push(AppRoutes.register),
          child: Text(
            'Sign Up',
            style: SalesOSTheme.labelMedium.copyWith(
              color: LuxuryColors.champagneGold,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    ).animate(delay: 1000.ms).fadeIn();
  }
}

// ============================================
// SUPPORTING WIDGETS
// ============================================

/// Glass morphism dialog
class _GlassDialog extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String confirmText;
  final String cancelText;

  const _GlassDialog({
    required this.icon,
    required this.title,
    required this.message,
    required this.confirmText,
    required this.cancelText,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.15),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: LuxuryColors.champagneGold, size: 28),
                ),
                const SizedBox(height: 20),
                Text(
                  title,
                  style: SalesOSTheme.titleMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: SalesOSTheme.bodyMedium.copyWith(
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: Text(
                          cancelText,
                          style: SalesOSTheme.labelMedium.copyWith(
                            color: Colors.white.withValues(alpha: 0.6),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LuxuryColors.goldShimmer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: Text(
                            confirmText,
                            style: SalesOSTheme.labelMedium.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
