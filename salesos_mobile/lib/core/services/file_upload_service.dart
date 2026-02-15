import 'dart:io';
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../config/theme.dart';
import '../network/api_client.dart';
import '../../shared/widgets/luxury_card.dart';

/// Upload progress state
class UploadProgress {
  final double progress;
  final bool isComplete;
  final bool hasError;
  final String? errorMessage;
  final String? resultUrl;

  const UploadProgress({
    this.progress = 0,
    this.isComplete = false,
    this.hasError = false,
    this.errorMessage,
    this.resultUrl,
  });

  factory UploadProgress.initial() => const UploadProgress();

  factory UploadProgress.uploading(double progress) => UploadProgress(
        progress: progress,
        isComplete: false,
        hasError: false,
      );

  factory UploadProgress.complete(String url) => UploadProgress(
        progress: 1.0,
        isComplete: true,
        hasError: false,
        resultUrl: url,
      );

  factory UploadProgress.error(String message) => UploadProgress(
        progress: 0,
        isComplete: false,
        hasError: true,
        errorMessage: message,
      );
}

/// Image source selection or action
enum AvatarImageSource {
  camera,
  gallery,
  remove,
}

/// Provider for the file upload service
final fileUploadServiceProvider = Provider<FileUploadService>((ref) {
  return FileUploadService(ref.watch(apiClientProvider));
});

/// Notifier for avatar upload progress
class AvatarUploadProgressNotifier extends Notifier<UploadProgress> {
  @override
  UploadProgress build() => UploadProgress.initial();

  void setProgress(UploadProgress progress) => state = progress;
  void reset() => state = UploadProgress.initial();
}

/// Provider for avatar upload progress
final avatarUploadProgressProvider =
    NotifierProvider<AvatarUploadProgressNotifier, UploadProgress>(
  AvatarUploadProgressNotifier.new,
);

/// Service for handling file uploads (avatars, documents, etc.)
class FileUploadService {
  final ApiClient _apiClient;
  final ImagePicker _imagePicker = ImagePicker();

  FileUploadService(this._apiClient);

  /// Show a centered dialog to select image source
  Future<AvatarImageSource?> showImageSourceDialog(
    BuildContext context, {
    bool showRemoveOption = false,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    HapticFeedback.mediumImpact();
    return showGeneralDialog<AvatarImageSource>(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, animation, secondaryAnimation) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 400),
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title row with close button
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Profile Photo',
                            style: IrisTheme.titleMedium.copyWith(
                              color: isDark
                                  ? IrisTheme.darkTextPrimary
                                  : IrisTheme.lightTextPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.pop(ctx),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : Colors.black.withValues(alpha: 0.05),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.close,
                              size: 18,
                              color: isDark ? Colors.white70 : Colors.black54,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Select how you would like to update your profile photo',
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDark
                            ? IrisTheme.darkTextSecondary
                            : IrisTheme.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Camera option
                    _ImageSourceOption(
                      icon: Icons.camera_alt_rounded,
                      title: 'Take Photo',
                      subtitle: 'Use your camera to take a new photo',
                      onTap: () => Navigator.pop(ctx, AvatarImageSource.camera),
                      isDark: isDark,
                    ),
                    const SizedBox(height: 12),

                    // Gallery option
                    _ImageSourceOption(
                      icon: Icons.photo_library_rounded,
                      title: 'Choose from Gallery',
                      subtitle: 'Select an existing photo from your device',
                      onTap: () => Navigator.pop(ctx, AvatarImageSource.gallery),
                      isDark: isDark,
                    ),

                    // Remove option (only shown if user has an avatar)
                    if (showRemoveOption) ...[
                      const SizedBox(height: 12),
                      _ImageSourceOption(
                        icon: Icons.delete_outline_rounded,
                        title: 'Remove Photo',
                        subtitle: 'Delete your current profile photo',
                        onTap: () => Navigator.pop(ctx, AvatarImageSource.remove),
                        isDark: isDark,
                        isDestructive: true,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  /// Pick an image from the specified source
  Future<File?> pickImage(AvatarImageSource source) async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: source == AvatarImageSource.camera
            ? ImageSource.camera
            : ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
        preferredCameraDevice: CameraDevice.front,
      );

      if (pickedFile == null) return null;
      return File(pickedFile.path);
    } catch (e) {
      throw Exception('Failed to pick image: $e');
    }
  }

  /// Crop the image to a square for avatar use
  Future<File?> cropImageForAvatar(
    File imageFile, {
    required BuildContext context,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    try {
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: imageFile.path,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        compressQuality: 85,
        maxWidth: 512,
        maxHeight: 512,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Photo',
            toolbarColor: isDark ? IrisTheme.darkSurface : IrisTheme.lightSurface,
            toolbarWidgetColor: LuxuryColors.jadePremium,
            backgroundColor: isDark ? IrisTheme.darkBackground : IrisTheme.lightBackground,
            activeControlsWidgetColor: LuxuryColors.jadePremium,
            dimmedLayerColor: Colors.black54,
            cropFrameColor: LuxuryColors.jadePremium,
            cropGridColor: LuxuryColors.jadePremium.withValues(alpha: 0.5),
            cropFrameStrokeWidth: 3,
            showCropGrid: true,
            lockAspectRatio: true,
            hideBottomControls: false,
            initAspectRatio: CropAspectRatioPreset.square,
          ),
          IOSUiSettings(
            title: 'Crop Photo',
            doneButtonTitle: 'Done',
            cancelButtonTitle: 'Cancel',
            aspectRatioLockEnabled: true,
            resetAspectRatioEnabled: false,
            aspectRatioPickerButtonHidden: true,
            rotateButtonsHidden: false,
            rotateClockwiseButtonHidden: true,
          ),
        ],
      );

      if (croppedFile == null) return null;
      return File(croppedFile.path);
    } catch (e) {
      throw Exception('Failed to crop image: $e');
    }
  }

  /// Upload an avatar image to the server
  Future<String> uploadAvatar(
    File file, {
    void Function(double progress)? onProgress,
  }) async {
    try {
      final response = await _apiClient.uploadFile<Map<String, dynamic>>(
        '/users/me/avatar',
        filePath: file.path,
        fieldName: 'file',
        onSendProgress: (sent, total) {
          if (onProgress != null && total > 0) {
            onProgress(sent / total);
          }
        },
      );

      final data = response.data;
      if (data == null || data['avatarUrl'] == null) {
        throw Exception('Invalid response from server');
      }

      return data['avatarUrl'] as String;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) {
        final message = e.response?.data?['message'] ?? 'Invalid file';
        throw Exception(message);
      }
      throw Exception('Failed to upload avatar: ${e.message}');
    } catch (e) {
      throw Exception('Failed to upload avatar: $e');
    }
  }

  /// Delete the current avatar
  Future<void> deleteAvatar() async {
    try {
      await _apiClient.delete('/users/me/avatar');
    } on DioException catch (e) {
      throw Exception('Failed to delete avatar: ${e.message}');
    }
  }

  /// Complete avatar upload flow: pick, crop, and upload
  /// Returns the new avatar URL, or empty string if removed, or null if cancelled
  Future<String?> pickCropAndUploadAvatar({
    required BuildContext context,
    required WidgetRef ref,
    bool hasExistingAvatar = false,
  }) async {
    // Reset progress
    ref.read(avatarUploadProgressProvider.notifier).reset();

    // Show source selection dialog
    final source = await showImageSourceDialog(
      context,
      showRemoveOption: hasExistingAvatar,
    );
    if (source == null) return null;

    // Handle remove action
    if (source == AvatarImageSource.remove) {
      try {
        await deleteAvatar();
        ref.read(avatarUploadProgressProvider.notifier).setProgress(
            UploadProgress.complete(''));
        return ''; // Return empty string to indicate removal
      } catch (e) {
        ref.read(avatarUploadProgressProvider.notifier).setProgress(
            UploadProgress.error(e.toString().replaceAll('Exception: ', '')));
        return null;
      }
    }

    try {
      // Pick image
      final pickedFile = await pickImage(source);
      if (pickedFile == null) return null;

      // Crop image
      if (!context.mounted) return null;
      final croppedFile = await cropImageForAvatar(pickedFile, context: context);
      if (croppedFile == null) return null;

      // Upload image with progress tracking
      final avatarUrl = await uploadAvatar(
        croppedFile,
        onProgress: (progress) {
          ref.read(avatarUploadProgressProvider.notifier).setProgress(
              UploadProgress.uploading(progress));
        },
      );

      // Mark as complete
      ref.read(avatarUploadProgressProvider.notifier).setProgress(
          UploadProgress.complete(avatarUrl));

      return avatarUrl;
    } catch (e) {
      ref.read(avatarUploadProgressProvider.notifier).setProgress(
          UploadProgress.error(e.toString().replaceAll('Exception: ', '')));
      return null;
    }
  }
}

/// Image source option widget
class _ImageSourceOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDark;
  final bool isDestructive;

  const _ImageSourceOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.isDark,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor = isDestructive ? IrisTheme.error : LuxuryColors.jadePremium;
    final secondaryAccent = isDestructive ? IrisTheme.error : LuxuryColors.rolexGreen;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark
                ? IrisTheme.darkSurfaceElevated
                : IrisTheme.lightSurfaceElevated,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDestructive
                  ? IrisTheme.error.withValues(alpha: 0.3)
                  : (isDark ? IrisTheme.darkBorder : IrisTheme.lightBorder),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      accentColor.withValues(alpha: 0.2),
                      secondaryAccent.withValues(alpha: 0.1),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: accentColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: IrisTheme.bodyMedium.copyWith(
                        color: isDestructive
                            ? IrisTheme.error
                            : (isDark
                                ? IrisTheme.darkTextPrimary
                                : IrisTheme.lightTextPrimary),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: IrisTheme.bodySmall.copyWith(
                        color: isDestructive
                            ? IrisTheme.error.withValues(alpha: 0.7)
                            : (isDark
                                ? IrisTheme.darkTextSecondary
                                : IrisTheme.lightTextSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: isDestructive
                    ? IrisTheme.error.withValues(alpha: 0.5)
                    : (isDark
                        ? IrisTheme.darkTextTertiary
                        : IrisTheme.lightTextTertiary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
