import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

/// Beautiful dark gradient background image from Pexels
/// Used throughout the app for a professional, cohesive dark mode experience
class AppBackground extends StatelessWidget {
  final Widget child;
  final bool enabled;
  final double opacity;

  /// Dark mode background image URL from Pexels
  static const String darkBackgroundUrl =
      'https://images.pexels.com/photos/1526/dark-blur-blurred-gradient.jpg?auto=compress&cs=tinysrgb&w=1920';

  const AppBackground({
    super.key,
    required this.child,
    this.enabled = true,
    this.opacity = 0.7,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Only show background image in dark mode when enabled
    if (!enabled || !isDark) {
      return Container(
        color: isDark ? const Color(0xFF0D0D12) : const Color(0xFFF8F9FA),
        child: child,
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        // Background image
        CachedNetworkImage(
          imageUrl: darkBackgroundUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            color: const Color(0xFF0D0D12),
          ),
          errorWidget: (context, url, error) => Container(
            color: const Color(0xFF0D0D12),
          ),
        ),
        // Semi-transparent overlay for better text readability
        Container(
          color: const Color(0xFF0D0D12).withValues(alpha: opacity),
        ),
        // Content
        child,
      ],
    );
  }
}

/// A scaffold with the app background built-in
/// Use this instead of regular Scaffold for pages that should have the background
class AppBackgroundScaffold extends StatelessWidget {
  final PreferredSizeWidget? appBar;
  final Widget? body;
  final Widget? floatingActionButton;
  final FloatingActionButtonLocation? floatingActionButtonLocation;
  final Widget? bottomNavigationBar;
  final Widget? drawer;
  final bool extendBodyBehindAppBar;
  final bool extendBody;
  final double backgroundOpacity;

  const AppBackgroundScaffold({
    super.key,
    this.appBar,
    this.body,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.bottomNavigationBar,
    this.drawer,
    this.extendBodyBehindAppBar = true,
    this.extendBody = false,
    this.backgroundOpacity = 0.7,
  });

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      opacity: backgroundOpacity,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: appBar,
        body: body,
        floatingActionButton: floatingActionButton,
        floatingActionButtonLocation: floatingActionButtonLocation,
        bottomNavigationBar: bottomNavigationBar,
        drawer: drawer,
        extendBodyBehindAppBar: extendBodyBehindAppBar,
        extendBody: extendBody,
      ),
    );
  }
}

/// Decoration box that uses the dark background image
/// Useful for containers, cards, or any decorated box
class DarkBackgroundDecoration extends StatelessWidget {
  final Widget child;
  final BorderRadius? borderRadius;
  final double opacity;

  const DarkBackgroundDecoration({
    super.key,
    required this.child,
    this.borderRadius,
    this.opacity = 0.6,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!isDark) {
      return Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FA),
          borderRadius: borderRadius,
        ),
        child: child,
      );
    }

    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          Positioned.fill(
            child: CachedNetworkImage(
              imageUrl: AppBackground.darkBackgroundUrl,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                color: const Color(0xFF0D0D12),
              ),
              errorWidget: (context, url, error) => Container(
                color: const Color(0xFF0D0D12),
              ),
            ),
          ),
          Positioned.fill(
            child: Container(
              color: const Color(0xFF0D0D12).withValues(alpha: opacity),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
