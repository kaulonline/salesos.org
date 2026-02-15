import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/routes.dart';
import '../../../../shared/widgets/iris_button.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../data/repositories/auth_repository.dart';

class ResetPasswordPage extends ConsumerStatefulWidget {
  final String token;

  const ResetPasswordPage({super.key, required this.token});

  @override
  ConsumerState<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends ConsumerState<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  bool _resetSuccess = false;
  String? _error;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleResetPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });
    HapticFeedback.lightImpact();

    try {
      await ref.read(authRepositoryProvider).resetPassword(
            widget.token,
            _passwordController.text,
          );

      if (mounted) {
        setState(() {
          _isLoading = false;
          _resetSuccess = true;
        });
        HapticFeedback.heavyImpact();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_error ?? 'Failed to reset password'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LuxuryColors.richBlack,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: !_resetSuccess
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios,
                    color: IrisTheme.darkTextPrimary),
                onPressed: () => context.go(AppRoutes.login),
              )
            : null,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: _resetSuccess ? _buildSuccessState() : _buildResetForm(),
        ),
      ),
    );
  }

  Widget _buildResetForm() {
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
                gradient: IrisTheme.primaryGradient,
                shape: BoxShape.circle,
                boxShadow: IrisTheme.glowGold,
              ),
              child: const Icon(
                Iconsax.lock_1,
                size: 40,
                color: Colors.black,
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
              'Create New Password',
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
                'Your new password must be different from previously used passwords.',
                textAlign: TextAlign.center,
                style: IrisTheme.bodyMedium.copyWith(
                  color: IrisTheme.darkTextSecondary,
                  height: 1.5,
                ),
              ),
            ),
          ).animate(delay: 150.ms).fadeIn(),

          const SizedBox(height: 40),

          // Password Field
          IrisTextField(
            label: 'New Password',
            hint: 'Enter new password',
            controller: _passwordController,
            obscureText: true,
            textInputAction: TextInputAction.next,
            prefixIcon: Iconsax.lock,
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
          ).animate(delay: 200.ms).fadeIn().slideX(begin: -0.1),

          const SizedBox(height: 20),

          // Confirm Password Field
          IrisTextField(
            label: 'Confirm New Password',
            hint: 'Confirm new password',
            controller: _confirmPasswordController,
            obscureText: true,
            textInputAction: TextInputAction.done,
            prefixIcon: Iconsax.lock_1,
            onSubmitted: (_) => _handleResetPassword(),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please confirm your password';
              }
              if (value != _passwordController.text) {
                return 'Passwords do not match';
              }
              return null;
            },
          ).animate(delay: 250.ms).fadeIn().slideX(begin: -0.1),

          const SizedBox(height: 20),

          // Password Requirements
          _buildPasswordRequirements().animate(delay: 300.ms).fadeIn(),

          const SizedBox(height: 32),

          // Submit Button
          IrisButton(
            label: 'Reset Password',
            onPressed: _handleResetPassword,
            isLoading: _isLoading,
            isFullWidth: true,
            size: IrisButtonSize.large,
          ).animate(delay: 350.ms).fadeIn().slideY(begin: 0.2),
        ],
      ),
    );
  }

  Widget _buildSuccessState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 80),
        // Success Icon
        Center(
          child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: IrisTheme.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Iconsax.tick_circle5,
              size: 50,
              color: IrisTheme.success,
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
            'Password Reset!',
            style: IrisTheme.headlineMedium.copyWith(
              color: IrisTheme.darkTextPrimary,
            ),
          ),
        ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.2),
        const SizedBox(height: 12),

        // Description
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Your password has been successfully reset. You can now sign in with your new password.',
              textAlign: TextAlign.center,
              style: IrisTheme.bodyMedium.copyWith(
                color: IrisTheme.darkTextSecondary,
                height: 1.5,
              ),
            ),
          ),
        ).animate(delay: 250.ms).fadeIn(),

        const SizedBox(height: 48),

        // Sign In Button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: IrisButton(
            label: 'Sign In',
            onPressed: () => context.go(AppRoutes.login),
            isFullWidth: true,
            size: IrisButtonSize.large,
          ),
        ).animate(delay: 350.ms).fadeIn().slideY(begin: 0.2),
      ],
    );
  }

  Widget _buildPasswordRequirements() {
    final password = _passwordController.text;
    final requirements = [
      {'label': 'At least 8 characters', 'met': password.length >= 8},
      {
        'label': 'One uppercase letter',
        'met': password.contains(RegExp(r'[A-Z]'))
      },
      {'label': 'One number', 'met': password.contains(RegExp(r'[0-9]'))},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: requirements.map((req) {
        final met = req['met'] as bool;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Icon(
                met ? Iconsax.tick_circle5 : Iconsax.tick_circle,
                size: 16,
                color: met ? IrisTheme.success : IrisTheme.darkTextTertiary,
              ),
              const SizedBox(width: 8),
              Text(
                req['label'] as String,
                style: IrisTheme.bodySmall.copyWith(
                  color: met ? IrisTheme.success : IrisTheme.darkTextTertiary,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
