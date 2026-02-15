import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/providers/connectivity_provider.dart';
import 'luxury_card.dart';

/// A premium-styled banner that displays when the device is offline.
/// Uses the Luxury Design System with gold/emerald accents.
class OfflineBanner extends ConsumerWidget {
  /// Optional callback when the retry button is tapped.
  final VoidCallback? onRetry;

  /// Whether to show a compact version of the banner.
  final bool compact;

  /// Whether the banner should be dismissible.
  final bool dismissible;

  const OfflineBanner({
    super.key,
    this.onRetry,
    this.compact = false,
    this.dismissible = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOffline = ref.watch(isOfflineProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!isOffline) {
      return const SizedBox.shrink();
    }

    return compact
        ? _CompactOfflineBanner(
            isDark: isDark,
            onRetry: onRetry,
            dismissible: dismissible,
          )
        : _FullOfflineBanner(
            isDark: isDark,
            onRetry: onRetry,
            dismissible: dismissible,
          );
  }
}

/// Compact version of the offline banner - a thin strip at the top.
class _CompactOfflineBanner extends StatelessWidget {
  final bool isDark;
  final VoidCallback? onRetry;
  final bool dismissible;

  const _CompactOfflineBanner({
    required this.isDark,
    this.onRetry,
    this.dismissible = false,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDark
                  ? [
                      LuxuryColors.warningAmber.withValues(alpha: 0.15),
                      LuxuryColors.champagneGold.withValues(alpha: 0.1),
                    ]
                  : [
                      LuxuryColors.warningAmber.withValues(alpha: 0.12),
                      LuxuryColors.champagneGold.withValues(alpha: 0.08),
                    ],
            ),
            border: Border(
              bottom: BorderSide(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
          ),
          child: SafeArea(
            bottom: false,
            child: Row(
              children: [
                // Animated warning icon
                // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
                ExcludeSemantics(
                  child: RepaintBoundary(
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: LuxuryColors.warningAmber.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Iconsax.wifi_square,
                        size: 16,
                        color: LuxuryColors.warningAmber,
                      ),
                    )
                        .animate(onPlay: (c) => c.repeat())
                        .shimmer(
                          duration: const Duration(seconds: 2),
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                        ),
                  ),
                ),
                const SizedBox(width: 12),
                // Message
                Expanded(
                  child: Text(
                    'No internet connection',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.3,
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                ),
                // Retry button
                if (onRetry != null)
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      onRetry!();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: LuxuryColors.champagneGold.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Iconsax.refresh,
                            size: 14,
                            color: LuxuryColors.champagneGold,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Retry',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                              color: LuxuryColors.champagneGold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: -1, end: 0, duration: 300.ms);
  }
}

/// Full version of the offline banner - a more prominent card-style banner.
class _FullOfflineBanner extends StatelessWidget {
  final bool isDark;
  final VoidCallback? onRetry;
  final bool dismissible;

  const _FullOfflineBanner({
    required this.isDark,
    this.onRetry,
    this.dismissible = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  LuxuryColors.obsidian,
                  LuxuryColors.obsidian.withValues(alpha: 0.95),
                ]
              : [
                  Colors.white,
                  LuxuryColors.cream.withValues(alpha: 0.5),
                ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: LuxuryColors.warningAmber.withValues(alpha: 0.4),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.warningAmber.withValues(alpha: 0.15),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Icon container with animated glow
            _AnimatedWarningIcon(),
            const SizedBox(width: 16),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'You\'re Offline',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                      color: isDark
                          ? LuxuryColors.textOnDark
                          : LuxuryColors.textOnLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Check your connection and try again',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: LuxuryColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            // Retry button
            if (onRetry != null) ...[
              const SizedBox(width: 12),
              _RetryButton(onTap: onRetry!),
            ],
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: -0.5, end: 0, duration: 300.ms);
  }
}

/// Animated warning icon with pulsing glow effect.
class _AnimatedWarningIcon extends StatefulWidget {
  @override
  State<_AnimatedWarningIcon> createState() => _AnimatedWarningIconState();
}

class _AnimatedWarningIconState extends State<_AnimatedWarningIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 0.2, end: 0.5).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glowAnimation,
      builder: (context, child) {
        return Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                LuxuryColors.warningAmber.withValues(alpha: 0.2),
                LuxuryColors.champagneGold.withValues(alpha: 0.15),
              ],
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: LuxuryColors.warningAmber.withValues(alpha: 0.3),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color:
                    LuxuryColors.warningAmber.withValues(alpha: _glowAnimation.value),
                blurRadius: 16,
                spreadRadius: -4,
              ),
            ],
          ),
          child: Icon(
            Iconsax.wifi_square,
            size: 24,
            color: LuxuryColors.warningAmber,
          ),
        );
      },
    );
  }
}

/// Premium styled retry button.
class _RetryButton extends StatefulWidget {
  final VoidCallback onTap;

  const _RetryButton({required this.onTap});

  @override
  State<_RetryButton> createState() => _RetryButtonState();
}

class _RetryButtonState extends State<_RetryButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: () {
        HapticFeedback.mediumImpact();
        widget.onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          gradient: LuxuryColors.goldShimmer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
            width: 1,
          ),
          boxShadow: _isPressed
              ? []
              : [
                  BoxShadow(
                    color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        transform: _isPressed
            ? Matrix4.diagonal3Values(0.95, 0.95, 1.0)
            : Matrix4.identity(),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Iconsax.refresh,
              size: 18,
              color: LuxuryColors.richBlack,
            ),
            const SizedBox(width: 8),
            Text(
              'Retry',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                color: LuxuryColors.richBlack,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A wrapper widget that shows the offline banner at the top of its child.
/// Automatically handles the safe area and positions the banner appropriately.
class OfflineBannerWrapper extends ConsumerWidget {
  final Widget child;
  final bool showCompact;
  final VoidCallback? onRetry;

  const OfflineBannerWrapper({
    super.key,
    required this.child,
    this.showCompact = true,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOffline = ref.watch(isOfflineProvider);

    return Column(
      children: [
        if (isOffline)
          OfflineBanner(
            compact: showCompact,
            onRetry: onRetry ??
                () async {
                  // Trigger a connectivity check
                  await ref.read(connectivityServiceProvider).checkConnectivity();
                },
          ),
        Expanded(child: child),
      ],
    );
  }
}

/// A positioned offline banner that floats at the top of a Stack.
/// Use this when you need more control over positioning.
class PositionedOfflineBanner extends ConsumerWidget {
  final bool compact;
  final VoidCallback? onRetry;
  final double? top;
  final double? left;
  final double? right;

  const PositionedOfflineBanner({
    super.key,
    this.compact = true,
    this.onRetry,
    this.top,
    this.left = 0,
    this.right = 0,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOffline = ref.watch(isOfflineProvider);

    if (!isOffline) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: top ?? MediaQuery.of(context).padding.top,
      left: left,
      right: right,
      child: OfflineBanner(
        compact: compact,
        onRetry: onRetry ??
            () async {
              await ref.read(connectivityServiceProvider).checkConnectivity();
            },
      ),
    );
  }
}

/// A small indicator dot that shows offline status.
/// Useful for placing in app bars or navigation elements.
class OfflineIndicator extends ConsumerWidget {
  final double size;
  final bool showPulse;

  const OfflineIndicator({
    super.key,
    this.size = 8,
    this.showPulse = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOffline = ref.watch(isOfflineProvider);

    if (!isOffline) {
      return const SizedBox.shrink();
    }

    Widget indicator = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: LuxuryColors.warningAmber,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.warningAmber.withValues(alpha: 0.5),
            blurRadius: 6,
            spreadRadius: 1,
          ),
        ],
      ),
    );

    if (showPulse) {
      // Wrap in ExcludeSemantics/RepaintBoundary to prevent semantics errors during animation
      indicator = ExcludeSemantics(
        child: RepaintBoundary(
          child: indicator
              .animate(onPlay: (c) => c.repeat())
              // ignore: deprecated_member_use
              .scale(
                begin: const Offset(1, 1),
                end: const Offset(1.3, 1.3),
                duration: const Duration(milliseconds: 800),
              )
              .then()
              // ignore: deprecated_member_use
              .scale(
                begin: const Offset(1.3, 1.3),
                end: const Offset(1, 1),
                duration: const Duration(milliseconds: 800),
              ),
        ),
      );
    }

    return indicator;
  }
}
