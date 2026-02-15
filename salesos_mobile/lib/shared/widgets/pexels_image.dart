import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/services/pexels_service.dart';

/// Reusable Pexels Image Widget
/// Fetches and displays professional stock images from Pexels API
class PexelsImage extends ConsumerWidget {
  final String query;
  final BoxFit fit;
  final double? width;
  final double? height;
  final int photoIndex;
  final Widget? placeholder;
  final Widget? errorWidget;
  final BorderRadius? borderRadius;
  final Gradient? overlayGradient;

  const PexelsImage({
    super.key,
    required this.query,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.photoIndex = 0,
    this.placeholder,
    this.errorWidget,
    this.borderRadius,
    this.overlayGradient,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final photosAsync = ref.watch(customImageSearchProvider(query));

    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: SizedBox(
        width: width,
        height: height,
        child: photosAsync.when(
          data: (photos) {
            if (photos.isEmpty || photoIndex >= photos.length) {
              return errorWidget ?? _buildFallback(isDark);
            }
            final photo = photos[photoIndex];
            return Stack(
              fit: StackFit.expand,
              children: [
                CachedNetworkImage(
                  imageUrl: _getOptimalUrl(photo),
                  fit: fit,
                  placeholder: (context, url) => placeholder ?? _buildPlaceholder(isDark, photo.avgColor),
                  errorWidget: (context, url, error) => errorWidget ?? _buildFallback(isDark),
                ),
                if (overlayGradient != null)
                  Container(
                    decoration: BoxDecoration(gradient: overlayGradient),
                  ),
              ],
            );
          },
          loading: () => placeholder ?? _buildPlaceholder(isDark, null),
          error: (error, _) => errorWidget ?? _buildFallback(isDark),
        ),
      ),
    );
  }

  String _getOptimalUrl(PexelsPhoto photo) {
    if (width != null) {
      if (width! <= 280) return photo.src.tiny;
      if (width! <= 350) return photo.src.small;
      if (width! <= 940) return photo.src.medium;
      if (width! <= 1200) return photo.src.landscape;
      return photo.src.large;
    }
    return photo.src.landscape;
  }

  Widget _buildPlaceholder(bool isDark, String? avgColor) {
    Color bgColor;
    if (avgColor != null && avgColor.startsWith('#')) {
      try {
        bgColor = Color(int.parse(avgColor.substring(1), radix: 16) + 0xFF000000);
      } catch (_) {
        bgColor = isDark ? const Color(0xFF1A1A1F) : const Color(0xFFE8E8E8);
      }
    } else {
      bgColor = isDark ? const Color(0xFF1A1A1F) : const Color(0xFFE8E8E8);
    }
    return Container(
      color: bgColor,
      child: Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(
              isDark ? Colors.white24 : Colors.black12,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFallback(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [const Color(0xFF1A1A1F), const Color(0xFF0D0D12)]
              : [const Color(0xFFE8E8E8), const Color(0xFFF8F9FA)],
        ),
      ),
    );
  }
}

/// Hero image with text overlay - great for page headers
class PexelsHeroImage extends ConsumerWidget {
  final String query;
  final double height;
  final String? title;
  final String? subtitle;
  final Widget? badge;
  final VoidCallback? onBack;
  final List<Widget>? actions;

  const PexelsHeroImage({
    super.key,
    required this.query,
    this.height = 220,
    this.title,
    this.subtitle,
    this.badge,
    this.onBack,
    this.actions,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final photosAsync = ref.watch(customImageSearchProvider(query));

    return SizedBox(
      height: height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background image
          photosAsync.when(
            data: (photos) {
              if (photos.isEmpty) return _buildFallback(isDark);
              final photo = photos.first;
              return CachedNetworkImage(
                imageUrl: photo.src.landscape,
                fit: BoxFit.cover,
                placeholder: (context, url) => _buildPlaceholder(isDark, photo.avgColor),
                errorWidget: (context, url, error) => _buildFallback(isDark),
              );
            },
            loading: () => _buildPlaceholder(isDark, null),
            error: (error, _) => _buildFallback(isDark),
          ),

          // Gradient overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [
                        Colors.black.withValues(alpha: 0.3),
                        Colors.black.withValues(alpha: 0.7),
                        const Color(0xFF0D0D12),
                      ]
                    : [
                        Colors.white.withValues(alpha: 0.1),
                        Colors.white.withValues(alpha: 0.6),
                        const Color(0xFFF8F9FA),
                      ],
                stops: const [0.0, 0.6, 1.0],
              ),
            ),
          ),

          // Content
          Positioned(
            left: 20,
            right: 20,
            bottom: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (badge != null) ...[
                  badge!,
                  const SizedBox(height: 12),
                ],
                if (title != null)
                  Text(
                    title!,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF1A1A1F),
                      letterSpacing: -0.5,
                      height: 1.1,
                    ),
                  ),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.6)
                          : const Color(0xFF6B7280),
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Back button
          if (onBack != null)
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 8,
              child: Container(
                decoration: BoxDecoration(
                  color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.7),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: Icon(
                    Icons.arrow_back,
                    color: isDark ? Colors.white70 : Colors.black87,
                    size: 20,
                  ),
                  onPressed: onBack,
                ),
              ),
            ),

          // Actions
          if (actions != null && actions!.isNotEmpty)
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              right: 8,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: actions!.map((action) {
                  return Container(
                    margin: const EdgeInsets.only(left: 8),
                    decoration: BoxDecoration(
                      color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.7),
                      shape: BoxShape.circle,
                    ),
                    child: action,
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder(bool isDark, String? avgColor) {
    Color bgColor;
    if (avgColor != null && avgColor.startsWith('#')) {
      try {
        bgColor = Color(int.parse(avgColor.substring(1), radix: 16) + 0xFF000000);
      } catch (_) {
        bgColor = isDark ? const Color(0xFF1A1A1F) : const Color(0xFFE8E8E8);
      }
    } else {
      bgColor = isDark ? const Color(0xFF1A1A1F) : const Color(0xFFE8E8E8);
    }
    return Container(color: bgColor);
  }

  Widget _buildFallback(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [const Color(0xFF1A1A1F), const Color(0xFF0D0D12)]
              : [const Color(0xFFE8E8E8), const Color(0xFFF8F9FA)],
        ),
      ),
    );
  }
}

/// Card with Pexels background - great for feature cards
class PexelsCard extends ConsumerWidget {
  final String query;
  final double? height;
  final Widget child;
  final BorderRadius? borderRadius;
  final EdgeInsets? padding;
  final VoidCallback? onTap;
  final double overlayOpacity;

  const PexelsCard({
    super.key,
    required this.query,
    required this.child,
    this.height,
    this.borderRadius,
    this.padding,
    this.onTap,
    this.overlayOpacity = 0.6,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final photosAsync = ref.watch(customImageSearchProvider(query));
    final radius = borderRadius ?? BorderRadius.circular(12);

    return ClipRRect(
      borderRadius: radius,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Container(
            height: height,
            decoration: BoxDecoration(
              borderRadius: radius,
              color: isDark ? const Color(0xFF1A1A1F) : Colors.white,
            ),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Background image
                photosAsync.when(
                  data: (photos) {
                    if (photos.isEmpty) return const SizedBox.shrink();
                    return CachedNetworkImage(
                      imageUrl: photos.first.src.medium,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => const SizedBox.shrink(),
                      errorWidget: (context, url, error) => const SizedBox.shrink(),
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (error, _) => const SizedBox.shrink(),
                ),

                // Dark overlay
                Container(
                  decoration: BoxDecoration(
                    color: (isDark ? Colors.black : Colors.white)
                        .withValues(alpha: overlayOpacity),
                  ),
                ),

                // Content
                Padding(
                  padding: padding ?? const EdgeInsets.all(16),
                  child: child,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
