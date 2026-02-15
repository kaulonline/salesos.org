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
import '../../../../shared/widgets/luxury_card.dart';
import '../bloc/auth_provider.dart';

/// Background image URL - same as login screen for consistency
const String _loginBackgroundUrl =
    'https://images.pexels.com/photos/13551578/pexels-photo-13551578.jpeg?auto=compress&cs=tinysrgb&w=1920';

class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _companyController = TextEditingController();
  final _organizationCodeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  bool _acceptedTerms = false;
  int _currentStep = 0;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _companyController.dispose();
    _organizationCodeController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_acceptedTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please accept the Terms of Service'),
          backgroundColor: SalesOSTheme.error,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    await ref.read(authProvider.notifier).register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          company: _companyController.text.trim().isNotEmpty
              ? _companyController.text.trim()
              : null,
          organizationCode: _organizationCodeController.text.trim().isNotEmpty
              ? _organizationCodeController.text.trim()
              : null,
        );

    if (!mounted) return;

    setState(() => _isLoading = false);

    final authState = ref.read(authProvider);
    if (authState.status == AuthStatus.authenticated) {
      HapticFeedback.heavyImpact();
      context.go(AppRoutes.dashboard);
    } else if (authState.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authState.error!),
          backgroundColor: SalesOSTheme.error,
        ),
      );
    }
  }

  void _nextStep() {
    if (_currentStep == 0) {
      // Validate name fields
      if (_firstNameController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter your first name'),
            backgroundColor: SalesOSTheme.error,
          ),
        );
        return;
      }
      if (_lastNameController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter your last name'),
            backgroundColor: SalesOSTheme.error,
          ),
        );
        return;
      }
      // Validate company (required for enterprise)
      if (_companyController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter your company name'),
            backgroundColor: SalesOSTheme.error,
          ),
        );
        return;
      }
      // Validate organization code (required for enterprise)
      if (_organizationCodeController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter your organization code'),
            backgroundColor: SalesOSTheme.error,
          ),
        );
        return;
      }
      if (_organizationCodeController.text.trim().length < 6) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Organization code must be at least 6 characters'),
            backgroundColor: SalesOSTheme.error,
          ),
        );
        return;
      }
    } else if (_currentStep == 1) {
      // Validate email
      if (_emailController.text.trim().isEmpty ||
          !_emailController.text.contains('@')) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid business email'),
            backgroundColor: SalesOSTheme.error,
          ),
        );
        return;
      }
    }

    HapticFeedback.lightImpact();
    setState(() => _currentStep++);
  }

  void _previousStep() {
    HapticFeedback.lightImpact();
    setState(() => _currentStep--);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    // Responsive: max width for form on tablets/large screens
    final isLargeScreen = size.width > 600;
    final maxFormWidth = isLargeScreen ? 480.0 : double.infinity;
    final horizontalPadding = isLargeScreen ? 40.0 : 24.0;

    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      body: Stack(
        children: [
          // Animated gradient background (same as login)
          _buildAnimatedBackground(size),

          // Main content
          SafeArea(
            child: Column(
              children: [
                // App bar with back button
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          Icons.arrow_back_ios,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                        onPressed: () {
                          if (_currentStep > 0) {
                            _previousStep();
                          } else {
                            context.pop();
                          }
                        },
                      ),
                    ],
                  ),
                ),
                // Scrollable form content
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: maxFormWidth),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const SizedBox(height: 8),

                              // Header with logo
                              _buildHeader(),

                              const SizedBox(height: 24),

                              // Progress Indicator
                              Row(
                                children: List.generate(3, (index) {
                                  return Expanded(
                                    child: Container(
                                      height: 4,
                                      margin: EdgeInsets.only(right: index < 2 ? 8 : 0),
                                      decoration: BoxDecoration(
                                        color: index <= _currentStep
                                            ? LuxuryColors.champagneGold
                                            : Colors.white.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    ),
                                  );
                                }),
                              ).animate(delay: 200.ms).fadeIn(),

                              const SizedBox(height: 24),

                              // Glass Form Card with Step Content
                              _buildGlassFormCard(),

                              const SizedBox(height: 24),

                              // Navigation Button
                              _buildNavigationButton(),

                              const SizedBox(height: 16),

                              // Login Link
                              _buildLoginLink(),

                              const SizedBox(height: 24),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
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
        // Pexels background image (same as login)
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

  Widget _buildHeader() {
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
          width: 70,
          height: 70,
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
                blurRadius: 25,
                spreadRadius: 3,
              ),
            ],
          ),
          child: const Icon(
            Icons.person_add_outlined,
            size: 32,
            color: Colors.white,
          ),
        ).animate().fadeIn(duration: 800.ms).scale(
              begin: const Offset(0.5, 0.5),
              curve: Curves.elasticOut,
              duration: 1000.ms,
            ),

        const SizedBox(height: 20),

        // Title with gradient
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Colors.white, Color(0xFFE5E5E5)],
          ).createShader(bounds),
          child: Text(
            'Create Account',
            style: SalesOSTheme.headlineMedium.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ),
        ).animate(delay: 300.ms).fadeIn().slideY(begin: 0.3),

        const SizedBox(height: 8),

        Text(
          'Step ${_currentStep + 1} of 3',
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
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _buildStepContent(),
          ),
        ),
      ),
    ).animate(delay: 400.ms).fadeIn(duration: 800.ms).slideY(begin: 0.1, curve: Curves.easeOutQuart);
  }

  Widget _buildNavigationButton() {
    return GestureDetector(
      onTap: _isLoading ? null : (_currentStep < 2 ? _nextStep : _handleRegister),
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
                      _currentStep < 2 ? 'CONTINUE' : 'CREATE ACCOUNT',
                      style: SalesOSTheme.labelLarge.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Icon(
                      _currentStep < 2 ? Iconsax.arrow_right_3 : Iconsax.tick_circle,
                      color: Colors.white,
                      size: 20,
                    ),
                  ],
                ),
        ),
      ),
    ).animate(delay: 500.ms).fadeIn().slideY(begin: 0.2);
  }

  Widget _buildLoginLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(
            'Already have an account? ',
            style: SalesOSTheme.bodyMedium.copyWith(
              color: Colors.white.withValues(alpha: 0.5),
            ),
          ),
        ),
        GestureDetector(
          onTap: () => context.go(AppRoutes.login),
          child: Text(
            'Sign In',
            style: SalesOSTheme.labelMedium.copyWith(
              color: LuxuryColors.champagneGold,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    ).animate(delay: 600.ms).fadeIn();
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildNameStep();
      case 1:
        return _buildEmailStep();
      case 2:
        return _buildPasswordStep();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildNameStep() {
    return Column(
      key: const ValueKey('step_name'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Enterprise notice banner
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: LuxuryColors.champagneGold.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Iconsax.building_4, color: LuxuryColors.champagneGold, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'SalesOS is for business use only. Contact your administrator for your organization code.',
                  style: SalesOSTheme.bodySmall.copyWith(
                    color: LuxuryColors.champagneGold,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _buildGlassTextField(
          controller: _firstNameController,
          label: 'First Name',
          hint: 'Enter your first name',
          icon: Iconsax.user,
          textInputAction: TextInputAction.next,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter your first name';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        _buildGlassTextField(
          controller: _lastNameController,
          label: 'Last Name',
          hint: 'Enter your last name',
          icon: Iconsax.user,
          textInputAction: TextInputAction.next,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter your last name';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        _buildGlassTextField(
          controller: _companyController,
          label: 'Company Name',
          hint: 'Enter your company name',
          icon: Iconsax.building,
          textInputAction: TextInputAction.next,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter your company name';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        _buildGlassTextField(
          controller: _organizationCodeController,
          label: 'Organization Code',
          hint: 'Enter the code from your administrator',
          icon: Iconsax.key,
          textInputAction: TextInputAction.done,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter your organization code';
            }
            if (value.length < 6) {
              return 'Organization code must be at least 6 characters';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildEmailStep() {
    return Column(
      key: const ValueKey('step_email'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          "Enter your business email",
          style: SalesOSTheme.titleMedium.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          "Use your work email address to sign in to SalesOS",
          style: SalesOSTheme.bodySmall.copyWith(
            color: Colors.white.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 20),
        _buildGlassTextField(
          controller: _emailController,
          label: 'Business Email Address',
          hint: 'name@company.com',
          icon: Iconsax.sms,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter your business email';
            }
            if (!value.contains('@') || !value.contains('.')) {
              return 'Please enter a valid business email';
            }
            return null;
          },
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF5B8DEF).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF5B8DEF).withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Icon(Iconsax.info_circle, color: const Color(0xFF5B8DEF), size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  "Your organization administrator will be notified of your registration request",
                  style: SalesOSTheme.bodySmall.copyWith(
                    color: const Color(0xFF5B8DEF),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordStep() {
    return Column(
      key: const ValueKey('step_password'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Create a password',
          style: SalesOSTheme.titleMedium.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Make it strong and memorable',
          style: SalesOSTheme.bodySmall.copyWith(
            color: Colors.white.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 20),
        _buildGlassTextField(
          controller: _passwordController,
          label: 'Password',
          hint: 'Create a password',
          icon: Iconsax.lock,
          obscureText: true,
          textInputAction: TextInputAction.next,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter a password';
            }
            if (value.length < 8) {
              return 'Password must be at least 8 characters';
            }
            if (!value.contains(RegExp(r'[A-Z]'))) {
              return 'Password must contain an uppercase letter';
            }
            if (!value.contains(RegExp(r'[0-9]'))) {
              return 'Password must contain a number';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        _buildGlassTextField(
          controller: _confirmPasswordController,
          label: 'Confirm Password',
          hint: 'Confirm your password',
          icon: Iconsax.lock_1,
          obscureText: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _handleRegister(),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please confirm your password';
            }
            if (value != _passwordController.text) {
              return 'Passwords do not match';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),

        // Password Requirements
        _buildPasswordRequirements(),

        const SizedBox(height: 16),

        // Terms Checkbox
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            setState(() => _acceptedTerms = !_acceptedTerms);
          },
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: _acceptedTerms
                      ? LuxuryColors.champagneGold
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: _acceptedTerms
                        ? LuxuryColors.champagneGold
                        : Colors.white.withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
                child: _acceptedTerms
                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    text: 'I agree to the ',
                    style: SalesOSTheme.bodySmall.copyWith(
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                    children: [
                      TextSpan(
                        text: 'Terms of Service',
                        style: SalesOSTheme.bodySmall.copyWith(
                          color: LuxuryColors.champagneGold,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const TextSpan(text: ' and '),
                      TextSpan(
                        text: 'Privacy Policy',
                        style: SalesOSTheme.bodySmall.copyWith(
                          color: LuxuryColors.champagneGold,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordRequirements() {
    final password = _passwordController.text;
    final requirements = [
      {'label': 'At least 8 characters', 'met': password.length >= 8},
      {'label': 'One uppercase letter', 'met': password.contains(RegExp(r'[A-Z]'))},
      {'label': 'One number', 'met': password.contains(RegExp(r'[0-9]'))},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: requirements.map((req) {
        final met = req['met'] as bool;
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            children: [
              Icon(
                met ? Iconsax.tick_circle5 : Iconsax.tick_circle,
                size: 14,
                color: met ? LuxuryColors.champagneGold : Colors.white.withValues(alpha: 0.4),
              ),
              const SizedBox(width: 8),
              Text(
                req['label'] as String,
                style: SalesOSTheme.labelSmall.copyWith(
                  color: met ? LuxuryColors.champagneGold : Colors.white.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  /// Glass morphism text field - matching login page style
  Widget _buildGlassTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
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
            textInputAction: textInputAction,
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
}
