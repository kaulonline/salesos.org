import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'luxury_card.dart';

/// Premium Dashboard Header - SalesOS luxury header
/// Features animated gradient mesh, glassmorphism, and refined typography
class PremiumDashboardHeader extends StatefulWidget {
  final String greeting;
  final String userName;
  final String? userInitials;
  final String? userAvatarUrl;
  final int alertsCount;
  final VoidCallback? onSearchTap;
  final VoidCallback? onCameraTap;
  final VoidCallback? onEditTap;
  final VoidCallback? onNotificationsTap;
  final VoidCallback? onProfileTap;
  final Widget? dataSourceIndicator;
  final Widget? editModeButton;
  final EdgeInsetsGeometry? margin;

  const PremiumDashboardHeader({
    super.key,
    required this.greeting,
    required this.userName,
    this.userInitials,
    this.userAvatarUrl,
    this.alertsCount = 0,
    this.onSearchTap,
    this.onCameraTap,
    this.onEditTap,
    this.onNotificationsTap,
    this.onProfileTap,
    this.dataSourceIndicator,
    this.editModeButton,
    this.margin,
  });

  @override
  State<PremiumDashboardHeader> createState() => _PremiumDashboardHeaderState();
}

class _PremiumDashboardHeaderState extends State<PremiumDashboardHeader>
    with TickerProviderStateMixin {
  late AnimationController _shimmerController;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: widget.margin ?? const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Animated gradient background
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _shimmerController,
                builder: (context, child) {
                  return CustomPaint(
                    painter: _LuxuryGradientPainter(
                      animation: _shimmerController.value,
                      isDark: isDark,
                    ),
                  );
                },
              ),
            ),

            // Glassmorphic overlay
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: isDark
                        ? [
                            Colors.white.withValues(alpha: 0.05),
                            Colors.white.withValues(alpha: 0.02),
                          ]
                        : [
                            Colors.white.withValues(alpha: 0.7),
                            Colors.white.withValues(alpha: 0.4),
                          ],
                  ),
                ),
              ),
            ),

            // Decorative accent line at top
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 3,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      LuxuryColors.champagneGold.withValues(alpha: 0),
                      LuxuryColors.champagneGold,
                      LuxuryColors.champagneGold,
                      LuxuryColors.champagneGold.withValues(alpha: 0),
                    ],
                    stops: const [0.0, 0.3, 0.7, 1.0],
                  ),
                ),
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Greeting with animated underline
                            Row(
                              children: [
                                AnimatedBuilder(
                                  animation: _pulseController,
                                  builder: (context, child) {
                                    return Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: LuxuryColors.champagneGold,
                                        boxShadow: [
                                          BoxShadow(
                                            color: LuxuryColors.champagneGold
                                                .withValues(alpha: 0.3 + _pulseController.value * 0.3),
                                            blurRadius: 8 + _pulseController.value * 4,
                                            spreadRadius: _pulseController.value * 2,
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  widget.greeting.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 2.5,
                                    color: LuxuryColors.champagneGold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            // User name with elegant typography
                            Text(
                              widget.userName,
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w300,
                                letterSpacing: -0.5,
                                height: 1.1,
                                color: isDark
                                    ? LuxuryColors.textOnDark
                                    : LuxuryColors.textOnLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Action buttons row
                      Row(
                        children: [
                          _AnimatedIconButton(
                            icon: Iconsax.search_normal,
                            onTap: widget.onSearchTap,
                          ),
                          const SizedBox(width: 8),
                          _AnimatedIconButton(
                            icon: Iconsax.camera,
                            onTap: widget.onCameraTap,
                          ),
                          if (widget.editModeButton != null) ...[
                            const SizedBox(width: 8),
                            widget.editModeButton!,
                          ],
                          const SizedBox(width: 8),
                          _AnimatedIconButton(
                            icon: Iconsax.notification,
                            badge: widget.alertsCount,
                            onTap: widget.onNotificationsTap,
                          ),
                          const SizedBox(width: 12),
                          // Premium avatar
                          _PremiumAvatar(
                            initials: widget.userInitials ?? 'U',
                            avatarUrl: widget.userAvatarUrl,
                            onTap: widget.onProfileTap,
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (widget.dataSourceIndicator != null) ...[
                    const SizedBox(height: 16),
                    widget.dataSourceIndicator!,
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1, curve: Curves.easeOutCubic);
  }
}

/// Animated icon button with hover/tap effects
class _AnimatedIconButton extends StatefulWidget {
  final IconData icon;
  final int? badge;
  final VoidCallback? onTap;

  const _AnimatedIconButton({
    required this.icon,
    this.badge,
    this.onTap,
  });

  @override
  State<_AnimatedIconButton> createState() => _AnimatedIconButtonState();
}

class _AnimatedIconButtonState extends State<_AnimatedIconButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.92).animate(
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        HapticFeedback.lightImpact();
        widget.onTap?.call();
      },
      onTapCancel: () => _controller.reverse(),
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Stack(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : Colors.white.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark
                          ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                          : LuxuryColors.champagneGold.withValues(alpha: 0.15),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Icon(
                    widget.icon,
                    size: 18,
                    color: isDark
                        ? LuxuryColors.textOnDark.withValues(alpha: 0.85)
                        : LuxuryColors.textOnLight.withValues(alpha: 0.75),
                  ),
                ),
                if (widget.badge != null && widget.badge! > 0)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            LuxuryColors.champagneGold,
                            LuxuryColors.champagneGold,
                          ],
                        ),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isDark ? LuxuryColors.richBlack : Colors.white,
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                            blurRadius: 6,
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          widget.badge! > 9 ? '9+' : widget.badge.toString(),
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Premium avatar with animated ring
class _PremiumAvatar extends StatefulWidget {
  final String initials;
  final String? avatarUrl;
  final VoidCallback? onTap;

  const _PremiumAvatar({
    required this.initials,
    this.avatarUrl,
    this.onTap,
  });

  @override
  State<_PremiumAvatar> createState() => _PremiumAvatarState();
}

class _PremiumAvatarState extends State<_PremiumAvatar>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _imageError = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat();
  }

  @override
  void didUpdateWidget(_PremiumAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Reset error state if avatar URL changes
    if (oldWidget.avatarUrl != widget.avatarUrl) {
      setState(() {
        _imageError = false;
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasValidAvatar = widget.avatarUrl != null &&
                           widget.avatarUrl!.isNotEmpty &&
                           !_imageError;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        widget.onTap?.call();
      },
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: SweepGradient(
                startAngle: _controller.value * 2 * math.pi,
                colors: [
                  LuxuryColors.champagneGold,
                  LuxuryColors.champagneGold,
                  LuxuryColors.champagneGold,
                  LuxuryColors.champagneGold,
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
                  blurRadius: 12,
                  spreadRadius: -2,
                ),
              ],
            ),
            padding: const EdgeInsets.all(2),
            child: hasValidAvatar
                ? ClipOval(
                    child: Image.network(
                      widget.avatarUrl!,
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        // Mark error and show initials fallback
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (mounted && !_imageError) {
                            setState(() => _imageError = true);
                          }
                        });
                        return _buildInitialsFallback(isDark);
                      },
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return _buildInitialsFallback(isDark);
                      },
                    ),
                  )
                : _buildInitialsFallback(isDark),
          );
        },
      ),
    );
  }

  Widget _buildInitialsFallback(bool isDark) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            LuxuryColors.champagneGold,
            LuxuryColors.champagneGoldDark,
          ],
        ),
      ),
      child: Center(
        child: Text(
          widget.initials,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
            color: isDark ? LuxuryColors.richBlack : Colors.white,
          ),
        ),
      ),
    );
  }
}

/// Custom painter for animated luxury gradient background
class _LuxuryGradientPainter extends CustomPainter {
  final double animation;
  final bool isDark;

  _LuxuryGradientPainter({
    required this.animation,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(0, 0, size.width, size.height);

    // Base gradient
    final basePaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: isDark
            ? [
                const Color(0xFF0D0D0D),
                const Color(0xFF1A1A1A),
                const Color(0xFF0D1B2A),
              ]
            : [
                const Color(0xFFFAFAFA),
                const Color(0xFFF5F5F5),
                const Color(0xFFEEEEEE),
              ],
      ).createShader(rect);
    canvas.drawRect(rect, basePaint);

    // Animated accent blob 1
    final blob1Center = Offset(
      size.width * (0.2 + 0.1 * math.sin(animation * 2 * math.pi)),
      size.height * (0.3 + 0.15 * math.cos(animation * 2 * math.pi)),
    );
    final blob1Paint = Paint()
      ..shader = RadialGradient(
        center: Alignment.center,
        radius: 1.0,
        colors: [
          LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.15 : 0.08),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: blob1Center, radius: size.width * 0.4));
    canvas.drawCircle(blob1Center, size.width * 0.4, blob1Paint);

    // Animated accent blob 2
    final blob2Center = Offset(
      size.width * (0.8 - 0.1 * math.cos(animation * 2 * math.pi + 1)),
      size.height * (0.7 - 0.1 * math.sin(animation * 2 * math.pi + 1)),
    );
    final blob2Paint = Paint()
      ..shader = RadialGradient(
        center: Alignment.center,
        radius: 1.0,
        colors: [
          LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.1 : 0.06),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: blob2Center, radius: size.width * 0.35));
    canvas.drawCircle(blob2Center, size.width * 0.35, blob2Paint);

    // Subtle emerald accent
    final blob3Center = Offset(
      size.width * (0.5 + 0.15 * math.sin(animation * 2 * math.pi + 2)),
      size.height * 0.5,
    );
    final blob3Paint = Paint()
      ..shader = RadialGradient(
        center: Alignment.center,
        radius: 1.0,
        colors: [
          LuxuryColors.champagneGold.withValues(alpha: isDark ? 0.08 : 0.04),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: blob3Center, radius: size.width * 0.3));
    canvas.drawCircle(blob3Center, size.width * 0.3, blob3Paint);
  }

  @override
  bool shouldRepaint(covariant _LuxuryGradientPainter oldDelegate) {
    return oldDelegate.animation != animation || oldDelegate.isDark != isDark;
  }
}

/// Compact phone version of the premium header
class PremiumDashboardHeaderCompact extends StatelessWidget {
  final String greeting;
  final String userName;
  final String? userInitials;
  final String? userAvatarUrl;
  final int alertsCount;
  final VoidCallback? onSearchTap;
  final VoidCallback? onCameraTap;
  final VoidCallback? onNotificationsTap;
  final VoidCallback? onProfileTap;
  final Widget? editModeButton;

  const PremiumDashboardHeaderCompact({
    super.key,
    required this.greeting,
    required this.userName,
    this.userInitials,
    this.userAvatarUrl,
    this.alertsCount = 0,
    this.onSearchTap,
    this.onCameraTap,
    this.onNotificationsTap,
    this.onProfileTap,
    this.editModeButton,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: LuxuryColors.champagneGold,
                        boxShadow: [
                          BoxShadow(
                            color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      greeting.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 2.0,
                        color: LuxuryColors.champagneGold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  userName,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w300,
                    letterSpacing: -0.3,
                    color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              _CompactIconButton(icon: Iconsax.search_normal, onTap: onSearchTap),
              const SizedBox(width: 6),
              _CompactIconButton(icon: Iconsax.camera, onTap: onCameraTap),
              if (editModeButton != null) ...[
                const SizedBox(width: 6),
                editModeButton!,
              ],
              const SizedBox(width: 6),
              _CompactIconButton(
                icon: Iconsax.notification,
                badge: alertsCount,
                onTap: onNotificationsTap,
              ),
              const SizedBox(width: 10),
              _CompactAvatar(
                initials: userInitials ?? 'U',
                avatarUrl: userAvatarUrl,
                onTap: onProfileTap,
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 350.ms);
  }
}

class _CompactIconButton extends StatelessWidget {
  final IconData icon;
  final int? badge;
  final VoidCallback? onTap;

  const _CompactIconButton({
    required this.icon,
    this.badge,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Stack(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 18,
              color: isDark
                  ? LuxuryColors.textOnDark.withValues(alpha: 0.8)
                  : LuxuryColors.textOnLight.withValues(alpha: 0.7),
            ),
          ),
          if (badge != null && badge! > 0)
            Positioned(
              right: 0,
              top: 0,
              child: Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: LuxuryColors.champagneGold,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDark ? LuxuryColors.richBlack : Colors.white,
                    width: 1.5,
                  ),
                ),
                child: Center(
                  child: Text(
                    badge! > 9 ? '9+' : badge.toString(),
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Compact avatar with image support for phone header
class _CompactAvatar extends StatefulWidget {
  final String initials;
  final String? avatarUrl;
  final VoidCallback? onTap;

  const _CompactAvatar({
    required this.initials,
    this.avatarUrl,
    this.onTap,
  });

  @override
  State<_CompactAvatar> createState() => _CompactAvatarState();
}

class _CompactAvatarState extends State<_CompactAvatar> {
  bool _imageError = false;

  @override
  void didUpdateWidget(_CompactAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.avatarUrl != widget.avatarUrl) {
      setState(() => _imageError = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasValidAvatar = widget.avatarUrl != null &&
                           widget.avatarUrl!.isNotEmpty &&
                           !_imageError;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        widget.onTap?.call();
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.25),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipOval(
          child: hasValidAvatar
              ? Image.network(
                  widget.avatarUrl!,
                  width: 36,
                  height: 36,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted && !_imageError) {
                        setState(() => _imageError = true);
                      }
                    });
                    return _buildInitialsFallback(isDark);
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return _buildInitialsFallback(isDark);
                  },
                )
              : _buildInitialsFallback(isDark),
        ),
      ),
    );
  }

  Widget _buildInitialsFallback(bool isDark) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LuxuryColors.champagneGold, LuxuryColors.champagneGoldDark],
        ),
      ),
      child: Center(
        child: Text(
          widget.initials,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
