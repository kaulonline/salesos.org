import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../bloc/auth_provider.dart';

/// Background image URL for auth screens
const String _authBackgroundUrl =
    'https://images.pexels.com/photos/4744852/pexels-photo-4744852.jpeg?auto=compress&cs=tinysrgb&w=1920';

class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _emailSent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleResetRequest() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    final success = await ref
        .read(authProvider.notifier)
        .requestPasswordReset(_emailController.text.trim());

    if (!mounted) return;

    setState(() {
      _isLoading = false;
      _emailSent = success;
    });

    if (success) {
      HapticFeedback.heavyImpact();
    } else {
      final error = ref.read(authProvider).error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error ?? 'Failed to send reset email'),
          backgroundColor: SalesOSTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Background image
        CachedNetworkImage(
          imageUrl: _authBackgroundUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(color: LuxuryColors.richBlack),
          errorWidget: (context, url, error) => Container(color: LuxuryColors.richBlack),
        ),
        // Dark overlay
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withValues(alpha: 0.5),
                Colors.black.withValues(alpha: 0.7),
                Colors.black.withValues(alpha: 0.85),
              ],
            ),
          ),
        ),
        // Content
        Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios, color: SalesOSTheme.darkTextPrimary),
              onPressed: () => context.pop(),
            ),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: _emailSent ? _buildSuccessState() : _buildRequestForm(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRequestForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 40),
          // Icon
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LuxuryColors.goldShimmer,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(
                Iconsax.key,
                size: 40,
                color: Colors.white,
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
              'Forgot Password?',
              style: SalesOSTheme.headlineMedium.copyWith(
                color: SalesOSTheme.darkTextPrimary,
              ),
            ),
          ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.2),
          const SizedBox(height: 12),

          // Description
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                "No worries! Enter your email and we'll send you a link to reset your password.",
                textAlign: TextAlign.center,
                style: SalesOSTheme.bodyMedium.copyWith(
                  color: SalesOSTheme.darkTextSecondary,
                  height: 1.5,
                ),
              ),
            ),
          ).animate(delay: 150.ms).fadeIn(),

          const SizedBox(height: 40),

          // Email Field
          IrisTextField(
            label: 'Email Address',
            hint: 'Enter your email',
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            prefixIcon: Iconsax.sms,
            onSubmitted: (_) => _handleResetRequest(),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter your email';
              }
              if (!value.contains('@') || !value.contains('.')) {
                return 'Please enter a valid email';
              }
              return null;
            },
          ).animate(delay: 200.ms).fadeIn().slideX(begin: -0.1),

          const SizedBox(height: 32),

          // Submit Button
          IrisButton(
            label: 'Send Reset Link',
            onPressed: _handleResetRequest,
            isLoading: _isLoading,
            isFullWidth: true,
            size: IrisButtonSize.large,
          ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.2),

          const SizedBox(height: 24),

          // Back to Login
          Center(
            child: TextButton.icon(
              onPressed: () => context.go(AppRoutes.login),
              icon: const Icon(
                Icons.arrow_back,
                size: 18,
                color: SalesOSTheme.darkTextSecondary,
              ),
              label: Text(
                'Back to Sign In',
                style: SalesOSTheme.labelMedium.copyWith(
                  color: SalesOSTheme.darkTextSecondary,
                ),
              ),
            ),
          ).animate(delay: 300.ms).fadeIn(),
        ],
      ),
    );
  }

  Widget _buildSuccessState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 60),
        // Success Icon
        Center(
          child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: SalesOSTheme.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Iconsax.tick_circle5,
              size: 50,
              color: SalesOSTheme.success,
            ),
          ).animate().fadeIn().scale(
                begin: const Offset(0.5, 0.5),
                curve: Curves.elasticOut,
              ),
        ),
        const SizedBox(height: 32),

        // Title
        Center(
          child: Text(
            'Check Your Email',
            style: SalesOSTheme.headlineMedium.copyWith(
              color: SalesOSTheme.darkTextPrimary,
            ),
          ),
        ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.2),
        const SizedBox(height: 12),

        // Description
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              "We've sent a password reset link to:",
              textAlign: TextAlign.center,
              style: SalesOSTheme.bodyMedium.copyWith(
                color: SalesOSTheme.darkTextSecondary,
              ),
            ),
          ),
        ).animate(delay: 250.ms).fadeIn(),
        const SizedBox(height: 8),

        // Email Display
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
              ),
            ),
            child: Text(
              _emailController.text,
              style: SalesOSTheme.titleSmall.copyWith(
                color: LuxuryColors.champagneGold,
              ),
            ),
          ),
        ).animate(delay: 300.ms).fadeIn(),

        const SizedBox(height: 24),

        // Instructions
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              "Click the link in your email to create a new password. The link will expire in 1 hour.",
              textAlign: TextAlign.center,
              style: SalesOSTheme.bodySmall.copyWith(
                color: SalesOSTheme.darkTextTertiary,
                height: 1.5,
              ),
            ),
          ),
        ).animate(delay: 350.ms).fadeIn(),

        const SizedBox(height: 40),

        // Open Email Button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: IrisButton(
            label: 'Open Email App',
            onPressed: () async {
              HapticFeedback.lightImpact();
              // Try to open the default email app
              final emailUri = Uri(scheme: 'mailto');
              try {
                if (await canLaunchUrl(emailUri)) {
                  await launchUrl(emailUri);
                } else {
                  // Fallback: try opening Gmail app on Android or Mail on iOS
                  final gmailUri = Uri.parse('googlegmail://');
                  if (await canLaunchUrl(gmailUri)) {
                    await launchUrl(gmailUri);
                  }
                }
              } catch (e) {
                // Silently fail - user can manually open their email
                debugPrint('Could not open email app: $e');
              }
            },
            variant: IrisButtonVariant.outline,
            isFullWidth: true,
          ),
        ).animate(delay: 400.ms).fadeIn(),

        const SizedBox(height: 16),

        // Resend Link
        Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  "Didn't receive the email? ",
                  style: SalesOSTheme.bodySmall.copyWith(
                    color: SalesOSTheme.darkTextSecondary,
                  ),
                ),
              ),
              TextButton(
                onPressed: () {
                  setState(() => _emailSent = false);
                },
                child: Text(
                  'Resend',
                  style: SalesOSTheme.labelMedium.copyWith(
                    color: LuxuryColors.champagneGold,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ).animate(delay: 450.ms).fadeIn(),

        const SizedBox(height: 24),

        // Back to Login
        Center(
          child: TextButton.icon(
            onPressed: () => context.go(AppRoutes.login),
            icon: const Icon(
              Icons.arrow_back,
              size: 18,
              color: SalesOSTheme.darkTextSecondary,
            ),
            label: Text(
              'Back to Sign In',
              style: SalesOSTheme.labelMedium.copyWith(
                color: SalesOSTheme.darkTextSecondary,
              ),
            ),
          ),
        ).animate(delay: 500.ms).fadeIn(),
      ],
    );
  }
}
