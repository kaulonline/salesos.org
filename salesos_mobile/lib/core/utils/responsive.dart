import 'package:flutter/material.dart';

/// Material Design 3 responsive breakpoints
/// Reference: https://m3.material.io/foundations/layout/applying-layout
enum ScreenSize { compact, medium, expanded, large, extraLarge }

/// Device form factor for adaptive layouts
enum DeviceFormFactor { phone, tablet, desktop }

/// Responsive utilities following Material Design 3 guidelines
class Responsive {
  Responsive._();

  // Material 3 Breakpoints (in dp)
  static const double compactMax = 599;
  static const double mediumMin = 600;
  static const double mediumMax = 839;
  static const double expandedMin = 840;
  static const double expandedMax = 1199;
  static const double largeMin = 1200;
  static const double largeMax = 1599;
  static const double extraLargeMin = 1600;

  /// Get current screen size category
  static ScreenSize getScreenSize(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width <= compactMax) return ScreenSize.compact;
    if (width <= mediumMax) return ScreenSize.medium;
    if (width <= expandedMax) return ScreenSize.expanded;
    if (width <= largeMax) return ScreenSize.large;
    return ScreenSize.extraLarge;
  }

  /// Check if device is phone-sized (compact)
  static bool isCompact(BuildContext context) =>
      getScreenSize(context) == ScreenSize.compact;

  /// Check if device is tablet-sized (medium/expanded)
  static bool isTablet(BuildContext context) {
    final size = getScreenSize(context);
    return size == ScreenSize.medium || size == ScreenSize.expanded;
  }

  /// Check if device is desktop-sized (large/extraLarge)
  static bool isDesktop(BuildContext context) {
    final size = getScreenSize(context);
    return size == ScreenSize.large || size == ScreenSize.extraLarge;
  }

  /// Get recommended content padding based on screen size
  static EdgeInsets getContentPadding(BuildContext context) {
    final size = getScreenSize(context);
    switch (size) {
      case ScreenSize.compact:
        return const EdgeInsets.symmetric(horizontal: 16);
      case ScreenSize.medium:
        return const EdgeInsets.symmetric(horizontal: 24);
      case ScreenSize.expanded:
        return const EdgeInsets.symmetric(horizontal: 24);
      case ScreenSize.large:
        return const EdgeInsets.symmetric(horizontal: 32);
      case ScreenSize.extraLarge:
        return const EdgeInsets.symmetric(horizontal: 40);
    }
  }

  /// Get recommended number of grid columns
  static int getGridColumns(BuildContext context) {
    final size = getScreenSize(context);
    switch (size) {
      case ScreenSize.compact:
        return 4;
      case ScreenSize.medium:
        return 8;
      case ScreenSize.expanded:
      case ScreenSize.large:
      case ScreenSize.extraLarge:
        return 12;
    }
  }

  /// Get responsive value based on screen size
  static T value<T>(
    BuildContext context, {
    required T compact,
    T? medium,
    T? expanded,
    T? large,
  }) {
    final size = getScreenSize(context);
    switch (size) {
      case ScreenSize.compact:
        return compact;
      case ScreenSize.medium:
        return medium ?? compact;
      case ScreenSize.expanded:
        return expanded ?? medium ?? compact;
      case ScreenSize.large:
      case ScreenSize.extraLarge:
        return large ?? expanded ?? medium ?? compact;
    }
  }

  // ============================================
  // iPad Adaptive Design Utilities
  // ============================================

  /// Check if device is in landscape orientation
  static bool isLandscape(BuildContext context) =>
      MediaQuery.orientationOf(context) == Orientation.landscape;

  /// Check if device is in portrait orientation
  static bool isPortrait(BuildContext context) =>
      MediaQuery.orientationOf(context) == Orientation.portrait;

  /// Get device form factor (phone, tablet, desktop)
  static DeviceFormFactor getFormFactor(BuildContext context) {
    final size = getScreenSize(context);
    switch (size) {
      case ScreenSize.compact:
        return DeviceFormFactor.phone;
      case ScreenSize.medium:
      case ScreenSize.expanded:
        return DeviceFormFactor.tablet;
      case ScreenSize.large:
      case ScreenSize.extraLarge:
        return DeviceFormFactor.desktop;
    }
  }

  /// Check if side navigation (NavigationRail) should be used
  /// Returns true for medium+ screens (tablets and larger)
  static bool shouldUseSideNavigation(BuildContext context) {
    final size = getScreenSize(context);
    return size != ScreenSize.compact;
  }

  /// Get maximum content width to prevent content from stretching too wide
  /// Returns null if no constraint needed (on smaller screens)
  static double? getMaxContentWidth(BuildContext context) {
    final size = getScreenSize(context);
    switch (size) {
      case ScreenSize.compact:
      case ScreenSize.medium:
        return null; // No constraint
      case ScreenSize.expanded:
        return 900; // Constrain on large tablets
      case ScreenSize.large:
        return 1200; // Constrain on desktop
      case ScreenSize.extraLarge:
        return 1400; // Constrain on ultra-wide
    }
  }

  /// Get the shortest side of the screen (useful for determining device type)
  static double getShortestSide(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return size.width < size.height ? size.width : size.height;
  }

  /// Get master-detail split ratio based on screen size and orientation
  /// Returns (masterFlex, detailFlex) for use with Expanded widgets
  static (int, int) getMasterDetailRatio(BuildContext context) {
    final size = getScreenSize(context);
    final landscape = isLandscape(context);

    switch (size) {
      case ScreenSize.compact:
        return (1, 0); // Full width master, no detail
      case ScreenSize.medium:
        return landscape ? (35, 65) : (1, 0); // Split in landscape, full in portrait
      case ScreenSize.expanded:
      case ScreenSize.large:
      case ScreenSize.extraLarge:
        return (35, 65); // 35/65 split as per user preference
    }
  }

  /// Check if master-detail split view should be shown
  static bool shouldShowSplitView(BuildContext context) {
    final size = getScreenSize(context);
    final landscape = isLandscape(context);

    switch (size) {
      case ScreenSize.compact:
        return false;
      case ScreenSize.medium:
        return landscape; // Split only in landscape for medium
      case ScreenSize.expanded:
      case ScreenSize.large:
      case ScreenSize.extraLarge:
        return true; // Always split on larger screens
    }
  }

  /// Get NavigationRail width based on expanded state and screen size
  static double getNavigationRailWidth(BuildContext context, {required bool expanded}) {
    if (expanded) {
      return 256; // Expanded with labels
    }
    return 80; // Collapsed icons only
  }

  /// Check if NavigationRail should auto-expand based on screen size/orientation
  static bool shouldAutoExpandNavigationRail(BuildContext context) {
    final size = getScreenSize(context);
    final landscape = isLandscape(context);

    // Auto-expand in landscape on expanded+ screens
    return landscape && (size == ScreenSize.expanded ||
           size == ScreenSize.large ||
           size == ScreenSize.extraLarge);
  }
}

/// Responsive builder widget
class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext, ScreenSize) builder;

  const ResponsiveBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return builder(context, Responsive.getScreenSize(context));
      },
    );
  }
}

/// Widget that shows different children based on screen size
class ResponsiveLayout extends StatelessWidget {
  final Widget compact;
  final Widget? medium;
  final Widget? expanded;
  final Widget? large;

  const ResponsiveLayout({
    super.key,
    required this.compact,
    this.medium,
    this.expanded,
    this.large,
  });

  @override
  Widget build(BuildContext context) {
    final size = Responsive.getScreenSize(context);
    switch (size) {
      case ScreenSize.compact:
        return compact;
      case ScreenSize.medium:
        return medium ?? compact;
      case ScreenSize.expanded:
        return expanded ?? medium ?? compact;
      case ScreenSize.large:
      case ScreenSize.extraLarge:
        return large ?? expanded ?? medium ?? compact;
    }
  }
}
