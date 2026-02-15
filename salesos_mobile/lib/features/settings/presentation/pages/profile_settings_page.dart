import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/config/theme.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/services/file_upload_service.dart';
import '../../../../shared/widgets/luxury_card.dart';
import '../../../../shared/widgets/iris_card.dart';
import '../../../../shared/widgets/iris_text_field.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../../../../core/providers/connectivity_provider.dart';
import '../../../auth/presentation/bloc/auth_provider.dart';
import '../../../auth/data/repositories/auth_repository.dart';

class ProfileSettingsPage extends ConsumerStatefulWidget {
  const ProfileSettingsPage({super.key});

  @override
  ConsumerState<ProfileSettingsPage> createState() => _ProfileSettingsPageState();
}

class _ProfileSettingsPageState extends ConsumerState<ProfileSettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _roleController = TextEditingController();
  bool _isLoading = false;
  bool _hasChanges = false;
  String? _avatarUrl;
  bool _isUploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  void _loadUserData() {
    final user = ref.read(currentUserProvider);
    if (user != null) {
      // Use name field (backend uses single name field)
      _nameController.text = user.name ?? user.fullName;
      _emailController.text = user.email;
      _roleController.text = user.role ?? '';
      // Construct full URL for avatar if it's a relative path
      if (user.avatarUrl != null && user.avatarUrl!.isNotEmpty) {
        _avatarUrl = user.avatarUrl!.startsWith('http')
            ? user.avatarUrl
            : '${AppConfig.apiBaseUrl}${user.avatarUrl}';
      } else {
        _avatarUrl = null;
      }
    }

    // Listen for changes
    _nameController.addListener(_onFieldChanged);
    _roleController.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    if (!_hasChanges) {
      setState(() => _hasChanges = true);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _roleController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    try {
      final authRepo = ref.read(authRepositoryProvider);
      await authRepo.updateProfile(name: _nameController.text.trim());

      // Refresh user data
      await ref.read(authProvider.notifier).checkAuth();

      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasChanges = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: IrisTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update profile: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: IrisTheme.error,
          ),
        );
      }
    }
  }

  Future<void> _uploadAvatar() async {
    if (_isUploadingAvatar) return;

    setState(() => _isUploadingAvatar = true);
    HapticFeedback.selectionClick();

    try {
      final fileUploadService = ref.read(fileUploadServiceProvider);
      final hasExistingAvatar = _avatarUrl != null && _avatarUrl!.isNotEmpty;

      final avatarUrl = await fileUploadService.pickCropAndUploadAvatar(
        context: context,
        ref: ref,
        hasExistingAvatar: hasExistingAvatar,
      );

      if (avatarUrl != null && mounted) {
        // Empty string means avatar was removed
        if (avatarUrl.isEmpty) {
          setState(() {
            _avatarUrl = null;
            _isUploadingAvatar = false;
          });

          // Refresh user data to sync with server
          await ref.read(authProvider.notifier).checkAuth();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Avatar removed successfully'),
                backgroundColor: IrisTheme.success,
              ),
            );
          }
        } else {
          // Construct full URL for display
          final fullAvatarUrl = avatarUrl.startsWith('http')
              ? avatarUrl
              : '${AppConfig.apiBaseUrl}$avatarUrl';

          setState(() {
            _avatarUrl = fullAvatarUrl;
            _isUploadingAvatar = false;
          });

          // Refresh user data to sync with server
          await ref.read(authProvider.notifier).checkAuth();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Avatar updated successfully'),
                backgroundColor: IrisTheme.success,
              ),
            );
          }
        }
      } else {
        if (mounted) {
          setState(() => _isUploadingAvatar = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update avatar: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: IrisTheme.error,
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: _uploadAvatar,
            ),
          ),
        );
      }
    }
  }

  Future<void> _showChangePasswordDialog() async {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isLoading = false;
    bool obscureCurrent = true;
    bool obscureNew = true;
    bool obscureConfirm = true;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Iconsax.key, color: LuxuryColors.jadePremium),
              const SizedBox(width: 12),
              Text(
                'Change Password',
                style: IrisTheme.titleMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                ),
              ),
            ],
          ),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: currentPasswordController,
                    obscureText: obscureCurrent,
                    decoration: InputDecoration(
                      labelText: 'Current Password',
                      labelStyle: TextStyle(color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscureCurrent ? Iconsax.eye_slash : Iconsax.eye,
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        onPressed: () => setDialogState(() => obscureCurrent = !obscureCurrent),
                      ),
                    ),
                    style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your current password';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: newPasswordController,
                    obscureText: obscureNew,
                    decoration: InputDecoration(
                      labelText: 'New Password',
                      labelStyle: TextStyle(color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscureNew ? Iconsax.eye_slash : Iconsax.eye,
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        onPressed: () => setDialogState(() => obscureNew = !obscureNew),
                      ),
                    ),
                    style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter a new password';
                      }
                      if (value.length < 8) {
                        return 'Password must be at least 8 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: confirmPasswordController,
                    obscureText: obscureConfirm,
                    decoration: InputDecoration(
                      labelText: 'Confirm New Password',
                      labelStyle: TextStyle(color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscureConfirm ? Iconsax.eye_slash : Iconsax.eye,
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        onPressed: () => setDialogState(() => obscureConfirm = !obscureConfirm),
                      ),
                    ),
                    style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                    validator: (value) {
                      if (value != newPasswordController.text) {
                        return 'Passwords do not match';
                      }
                      return null;
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(dialogContext),
              child: Text(
                'Cancel',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            ),
            TextButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;

                      setDialogState(() => isLoading = true);
                      HapticFeedback.lightImpact();

                      // Capture references before async gap
                      final messenger = ScaffoldMessenger.of(context);
                      final navigator = Navigator.of(dialogContext);

                      try {
                        final authRepo = ref.read(authRepositoryProvider);
                        await authRepo.changePassword(
                          currentPasswordController.text,
                          newPasswordController.text,
                        );

                        if (mounted) {
                          navigator.pop();
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Password changed successfully'),
                              backgroundColor: IrisTheme.success,
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(e.toString().replaceAll('Exception: ', '')),
                              backgroundColor: IrisTheme.error,
                            ),
                          );
                        }
                      }
                    },
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                      ),
                    )
                  : Text(
                      'Change Password',
                      style: IrisTheme.labelMedium.copyWith(
                        color: LuxuryColors.jadePremium,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );

    currentPasswordController.dispose();
    newPasswordController.dispose();
    confirmPasswordController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
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
          'Profile',
          style: IrisTheme.titleLarge.copyWith(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
        ),
        actions: [
          if (_hasChanges)
            TextButton(
              onPressed: _isLoading ? null : _saveProfile,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(LuxuryColors.jadePremium),
                      ),
                    )
                  : Text(
                      'Save',
                      style: IrisTheme.labelLarge.copyWith(
                        color: LuxuryColors.jadePremium,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Offline Banner
            OfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
              },
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Avatar Section with Luxury Gold Border
                      Center(
                        child: Column(
                          children: [
                            Stack(
                        children: [
                          // Luxury gold border container
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                colors: [
                                  LuxuryColors.champagneGold,
                                  LuxuryColors.warmGold,
                                  LuxuryColors.champagneGold.withValues(alpha: 0.8),
                                  LuxuryColors.warmGold,
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                stops: const [0.0, 0.3, 0.7, 1.0],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                                  blurRadius: 12,
                                  spreadRadius: 2,
                                ),
                                BoxShadow(
                                  color: LuxuryColors.warmGold.withValues(alpha: 0.2),
                                  blurRadius: 20,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                              ),
                              // Show avatar image if available, otherwise show initials
                              child: _avatarUrl != null && _avatarUrl!.isNotEmpty
                                  ? CircleAvatar(
                                      radius: 50,
                                      backgroundColor: LuxuryColors.deepEmerald,
                                      child: ClipOval(
                                        child: CachedNetworkImage(
                                          imageUrl: _avatarUrl!,
                                          width: 100,
                                          height: 100,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) => Center(
                                            child: Text(
                                              user?.initials ?? 'U',
                                              style: IrisTheme.headlineMedium.copyWith(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                          errorWidget: (context, url, error) => Center(
                                            child: Text(
                                              user?.initials ?? 'U',
                                              style: IrisTheme.headlineMedium.copyWith(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    )
                                  : CircleAvatar(
                                      radius: 50,
                                      backgroundColor: LuxuryColors.deepEmerald,
                                      child: Text(
                                        user?.initials ?? 'U',
                                        style: IrisTheme.headlineMedium.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                            ),
                          ),
                          // Upload progress overlay
                          if (_isUploadingAvatar)
                            Positioned.fill(
                              child: Container(
                                margin: const EdgeInsets.all(5),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Consumer(
                                    builder: (context, ref, child) {
                                      final progress = ref.watch(avatarUploadProgressProvider);
                                      return Stack(
                                        alignment: Alignment.center,
                                        children: [
                                          SizedBox(
                                            width: 60,
                                            height: 60,
                                            child: CircularProgressIndicator(
                                              value: progress.progress > 0 ? progress.progress : null,
                                              strokeWidth: 3,
                                              valueColor: const AlwaysStoppedAnimation<Color>(
                                                LuxuryColors.champagneGold,
                                              ),
                                              backgroundColor: Colors.white24,
                                            ),
                                          ),
                                          if (progress.progress > 0)
                                            Text(
                                              '${(progress.progress * 100).toInt()}%',
                                              style: IrisTheme.labelSmall.copyWith(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                        ],
                                      );
                                    },
                                  ),
                                ),
                              ),
                            ),
                          // Camera button with gold accent
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: _isUploadingAvatar ? null : _uploadAvatar,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  gradient: _isUploadingAvatar
                                      ? null
                                      : LinearGradient(
                                          colors: [
                                            LuxuryColors.champagneGold,
                                            LuxuryColors.warmGold,
                                          ],
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                        ),
                                  color: _isUploadingAvatar
                                      ? (isDark
                                          ? IrisTheme.darkSurfaceElevated
                                          : IrisTheme.lightSurfaceElevated)
                                          .withValues(alpha: 0.5)
                                      : null,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                                    width: 3,
                                  ),
                                  boxShadow: _isUploadingAvatar
                                      ? []
                                      : [
                                          BoxShadow(
                                            color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                ),
                                child: Icon(
                                  Iconsax.camera,
                                  size: 16,
                                  color: _isUploadingAvatar
                                      ? LuxuryColors.champagneGold.withValues(alpha: 0.5)
                                      : (isDark ? LuxuryColors.richBlack : Colors.white),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        user?.fullName ?? 'User',
                        style: IrisTheme.titleMedium.copyWith(
                          color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user?.email ?? '',
                        style: IrisTheme.bodySmall.copyWith(
                          color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9)),

                const SizedBox(height: 32),

                // Profile Information Section
                Text(
                  'Profile Information',
                  style: IrisTheme.titleSmall.copyWith(
                    color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 12),

                IrisCard(
                  child: Column(
                    children: [
                      IrisTextField(
                        label: 'Full Name',
                        hint: 'Enter your full name',
                        controller: _nameController,
                        prefixIcon: Iconsax.user,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      IrisTextField(
                        label: 'Email Address',
                        hint: 'Your email address',
                        controller: _emailController,
                        prefixIcon: Iconsax.sms,
                        keyboardType: TextInputType.emailAddress,
                        enabled: false, // Email cannot be changed
                      ),
                      const SizedBox(height: 16),
                      IrisTextField(
                        label: 'Role',
                        hint: 'Your role (read-only)',
                        controller: _roleController,
                        prefixIcon: Iconsax.briefcase,
                        enabled: false, // Role is set by admin
                      ),
                    ],
                  ),
                ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1),

                const SizedBox(height: 24),

                // Account Actions Section
                Text(
                  'Account',
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
                        icon: Iconsax.key,
                        title: 'Change Password',
                        onTap: () {
                          HapticFeedback.selectionClick();
                          _showChangePasswordDialog();
                        },
                      ),
                      _ActionItem(
                        icon: Iconsax.shield_tick,
                        title: 'Two-Factor Authentication',
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: IrisTheme.warning.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Off',
                            style: IrisTheme.labelSmall.copyWith(
                              color: IrisTheme.warning,
                            ),
                          ),
                        ),
                        onTap: () {
                          HapticFeedback.selectionClick();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Two-Factor Authentication coming soon'),
                              backgroundColor: IrisTheme.info,
                            ),
                          );
                        },
                      ),
                      _ActionItem(
                        icon: Iconsax.document_download,
                        title: 'Download My Data',
                        onTap: () {
                          HapticFeedback.selectionClick();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Data export coming soon'),
                              backgroundColor: IrisTheme.info,
                            ),
                          );
                        },
                        showDivider: false,
                      ),
                    ],
                  ),
                ).animate(delay: 150.ms).fadeIn().slideY(begin: 0.1),

                const SizedBox(height: 24),

                // Danger Zone
                Text(
                  'Danger Zone',
                  style: IrisTheme.titleSmall.copyWith(
                    color: IrisTheme.error,
                  ),
                ),
                const SizedBox(height: 12),

                IrisCard(
                  padding: EdgeInsets.zero,
                  child: _ActionItem(
                    icon: Iconsax.trash,
                    iconColor: IrisTheme.error,
                    title: 'Delete Account',
                    titleColor: IrisTheme.error,
                    onTap: () {
                      HapticFeedback.heavyImpact();
                      _showDeleteAccountDialog();
                    },
                    showDivider: false,
                  ),
                ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteAccountDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final passwordController = TextEditingController();
    final confirmationController = TextEditingController();
    final reasonController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isLoading = false;
    bool obscurePassword = true;
    const requiredPhrase = 'DELETE MY ACCOUNT';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: IrisTheme.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Iconsax.warning_2, color: IrisTheme.error, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Delete Account',
                  style: IrisTheme.titleMedium.copyWith(
                    color: IrisTheme.error,
                  ),
                ),
              ),
            ],
          ),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: IrisTheme.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: IrisTheme.error.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Iconsax.danger, size: 18, color: IrisTheme.error),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'This action cannot be undone. All your data will be permanently deleted.',
                            style: IrisTheme.bodySmall.copyWith(
                              color: IrisTheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Enter your password to confirm:',
                    style: IrisTheme.labelMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: passwordController,
                    obscureText: obscurePassword,
                    enabled: !isLoading,
                    decoration: InputDecoration(
                      hintText: 'Password',
                      hintStyle: TextStyle(color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                      prefixIcon: Icon(Iconsax.lock, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscurePassword ? Iconsax.eye_slash : Iconsax.eye,
                          color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                        ),
                        onPressed: () => setDialogState(() => obscurePassword = !obscurePassword),
                      ),
                    ),
                    style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your password';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Type "$requiredPhrase" to confirm:',
                    style: IrisTheme.labelMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: confirmationController,
                    enabled: !isLoading,
                    decoration: InputDecoration(
                      hintText: requiredPhrase,
                      hintStyle: TextStyle(color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                      prefixIcon: Icon(Iconsax.text, color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                    ),
                    style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                    textCapitalization: TextCapitalization.characters,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please type the confirmation phrase';
                      }
                      if (value.toUpperCase().trim() != requiredPhrase) {
                        return 'Please type exactly: $requiredPhrase';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Reason (optional):',
                    style: IrisTheme.labelMedium.copyWith(
                      color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: reasonController,
                    enabled: !isLoading,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'Tell us why you\'re leaving...',
                      hintStyle: TextStyle(color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
                    ),
                    style: TextStyle(color: isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(dialogContext),
              child: Text(
                'Cancel',
                style: IrisTheme.labelMedium.copyWith(
                  color: isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary,
                ),
              ),
            ),
            TextButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;

                      setDialogState(() => isLoading = true);
                      HapticFeedback.heavyImpact();

                      // Capture references before async gap
                      final messenger = ScaffoldMessenger.of(context);
                      final navigator = Navigator.of(dialogContext);
                      final router = GoRouter.of(context);

                      try {
                        final authRepo = ref.read(authRepositoryProvider);
                        await authRepo.requestAccountDeletion(
                          password: passwordController.text,
                          confirmationPhrase: confirmationController.text.toUpperCase().trim(),
                          reason: reasonController.text.isNotEmpty ? reasonController.text : null,
                        );

                        // Logout and navigate to login
                        await ref.read(authProvider.notifier).logout();

                        if (mounted) {
                          navigator.pop();
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Account deletion request submitted. Your account will be deleted within 30 days.'),
                              backgroundColor: IrisTheme.info,
                              duration: Duration(seconds: 5),
                            ),
                          );
                          router.go('/login');
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(e.toString().contains('incorrect') || e.toString().contains('password')
                                  ? 'Incorrect password. Please try again.'
                                  : e.toString().replaceAll('Exception: ', '')),
                              backgroundColor: IrisTheme.error,
                            ),
                          );
                        }
                      }
                    },
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(IrisTheme.error),
                      ),
                    )
                  : Text(
                      'Delete My Account',
                      style: IrisTheme.labelMedium.copyWith(
                        color: IrisTheme.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );

    // Clean up controllers when dialog is dismissed
    // Note: This runs after the dialog is built, not after it's dismissed
  }
}

class _ActionItem extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String title;
  final Color? titleColor;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showDivider;

  const _ActionItem({
    required this.icon,
    this.iconColor,
    required this.title,
    this.titleColor,
    this.trailing,
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
                Icon(
                  icon,
                  size: 20,
                  color: iconColor ?? (isDark ? IrisTheme.darkTextSecondary : IrisTheme.lightTextSecondary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: IrisTheme.bodyMedium.copyWith(
                      color: titleColor ?? (isDark ? IrisTheme.darkTextPrimary : IrisTheme.lightTextPrimary),
                    ),
                  ),
                ),
                trailing ??
                    Icon(
                      Iconsax.arrow_right_3,
                      size: 16,
                      color: isDark ? IrisTheme.darkTextTertiary : IrisTheme.lightTextTertiary,
                    ),
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 48,
            color: isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder,
          ),
      ],
    );
  }
}
