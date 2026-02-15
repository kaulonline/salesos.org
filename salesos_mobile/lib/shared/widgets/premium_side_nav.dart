import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'luxury_card.dart';

/// Premium side navigation with glassmorphism and gold gradient
/// Brand-aligned SalesOS design system
class PremiumSideNav extends StatefulWidget {
  final int selectedIndex;
  final List<PremiumNavItem> items;
  final ValueChanged<int> onItemSelected;
  final VoidCallback? onLogoTap;
  final VoidCallback? onAiChatTap;
  final Widget? footer;
  final String? userName;
  final String? userInitials;
  final String? userAvatarUrl;

  const PremiumSideNav({
    super.key,
    required this.selectedIndex,
    required this.items,
    required this.onItemSelected,
    this.onLogoTap,
    this.onAiChatTap,
    this.footer,
    this.userName,
    this.userInitials,
    this.userAvatarUrl,
  });

  @override
  State<PremiumSideNav> createState() => _PremiumSideNavState();
}

class _PremiumSideNavState extends State<PremiumSideNav>
    with SingleTickerProviderStateMixin {
  late AnimationController _glowController;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: 280,
      decoration: BoxDecoration(
        // Premium gradient background
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF111111), // Deep dark
                  const Color(0xFF0D0D0D), // Near black
                  const Color(0xFF0A0A0A), // Darkest
                ]
              : [
                  const Color(0xFFF8F8F6), // Light surface
                  const Color(0xFFF2F1EA), // Warm beige
                  const Color(0xFFEDE9DB), // Light warm
                ],
        ),
      ),
      child: Stack(
        children: [
          // Animated gradient glow overlay
          AnimatedBuilder(
            animation: _glowController,
            builder: (context, child) {
              return Positioned(
                top: -100 + (_glowController.value * 50),
                right: -50,
                child: Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        LuxuryColors.rolexGreen.withValues(
                          alpha: 0.15 + (_glowController.value * 0.1),
                        ),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              );
            },
          ),

          // Second animated glow
          AnimatedBuilder(
            animation: _glowController,
            builder: (context, child) {
              return Positioned(
                bottom: -80 + (_glowController.value * 30),
                left: -60,
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        LuxuryColors.jadePremium.withValues(
                          alpha: 0.1 + (_glowController.value * 0.08),
                        ),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              );
            },
          ),

          // Main content
          ClipRRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: SafeArea(
                child: Column(
                  children: [
                    const SizedBox(height: 24),

                    // Logo section
                    _PremiumLogo(
                      isDark: isDark,
                      onTap: widget.onLogoTap,
                    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2),

                    const SizedBox(height: 32),

                    // Divider with glow
                    _GlowDivider(isDark: isDark),

                    const SizedBox(height: 24),

                    // Navigation items
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          children: widget.items.asMap().entries.map((entry) {
                            final index = entry.key;
                            final item = entry.value;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _PremiumNavItemWidget(
                                item: item,
                                isSelected: widget.selectedIndex == index,
                                isDark: isDark,
                                onTap: () => widget.onItemSelected(index),
                              ).animate(delay: Duration(milliseconds: 100 * index))
                                  .fadeIn(duration: 300.ms)
                                  .slideX(begin: -0.1),
                            );
                          }).toList(),
                        ),
                      ),
                    ),

                    // AI Chat button
                    if (widget.onAiChatTap != null) ...[
                      _GlowDivider(isDark: isDark),
                      const SizedBox(height: 20),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _PremiumAiChatButton(
                          isDark: isDark,
                          onTap: widget.onAiChatTap!,
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // User profile section
                    if (widget.userName != null || widget.userInitials != null)
                      _UserProfileSection(
                        isDark: isDark,
                        userName: widget.userName,
                        userInitials: widget.userInitials,
                        avatarUrl: widget.userAvatarUrl,
                      ),

                    // Footer
                    if (widget.footer != null) widget.footer!,

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),

          // Right edge gradient line
          Positioned(
            right: 0,
            top: 0,
            bottom: 0,
            child: Container(
              width: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                    LuxuryColors.jadePremium.withValues(alpha: 0.3),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.3, 0.7, 1.0],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Premium logo with animated glow
class _PremiumLogo extends StatelessWidget {
  final bool isDark;
  final VoidCallback? onTap;

  const _PremiumLogo({required this.isDark, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          children: [
            // Logo icon with premium styling
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: LuxuryColors.emeraldGradient,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                    blurRadius: 20,
                    spreadRadius: -2,
                  ),
                  BoxShadow(
                    color: LuxuryColors.jadePremium.withValues(alpha: 0.2),
                    blurRadius: 30,
                    spreadRadius: -5,
                  ),
                ],
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: Colors.white,
                size: 26,
              ),
            ),
            const SizedBox(width: 16),
            // Brand text
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SalesOS',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 4,
                    color: isDark ? Colors.white : LuxuryColors.richBlack,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'SALES ASSISTANT',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 2,
                    color: LuxuryColors.rolexGreen,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Glowing divider
class _GlowDivider extends StatelessWidget {
  final bool isDark;

  const _GlowDivider({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      height: 1,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.transparent,
            LuxuryColors.rolexGreen.withValues(alpha: 0.5),
            LuxuryColors.jadePremium.withValues(alpha: 0.3),
            Colors.transparent,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.rolexGreen.withValues(alpha: 0.3),
            blurRadius: 8,
          ),
        ],
      ),
    );
  }
}

/// Premium navigation item widget
class _PremiumNavItemWidget extends StatefulWidget {
  final PremiumNavItem item;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _PremiumNavItemWidget({
    required this.item,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  State<_PremiumNavItemWidget> createState() => _PremiumNavItemWidgetState();
}

class _PremiumNavItemWidgetState extends State<_PremiumNavItemWidget> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          widget.onTap();
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            // Glassmorphic background for selected/hovered
            color: widget.isSelected
                ? LuxuryColors.rolexGreen.withValues(alpha: 0.15)
                : (_isHovered
                    ? (widget.isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.03))
                    : Colors.transparent),
            borderRadius: BorderRadius.circular(14),
            border: widget.isSelected
                ? Border.all(
                    color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                    width: 1,
                  )
                : null,
            boxShadow: widget.isSelected
                ? [
                    BoxShadow(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                      blurRadius: 12,
                      spreadRadius: -2,
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              // Icon with glow effect when selected
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: widget.isSelected
                      ? LuxuryColors.rolexGreen.withValues(alpha: 0.2)
                      : (_isHovered
                          ? (widget.isDark
                              ? Colors.white.withValues(alpha: 0.08)
                              : Colors.black.withValues(alpha: 0.05))
                          : Colors.transparent),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  widget.isSelected
                      ? widget.item.activeIcon
                      : widget.item.icon,
                  size: 22,
                  color: widget.isSelected
                      ? LuxuryColors.rolexGreen
                      : (_isHovered
                          ? (widget.isDark
                              ? Colors.white
                              : LuxuryColors.richBlack)
                          : LuxuryColors.textMuted),
                ),
              ),
              const SizedBox(width: 14),
              // Label
              Expanded(
                child: Text(
                  widget.item.label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight:
                        widget.isSelected ? FontWeight.w600 : FontWeight.w500,
                    letterSpacing: 0.3,
                    color: widget.isSelected
                        ? (widget.isDark ? Colors.white : LuxuryColors.richBlack)
                        : (_isHovered
                            ? (widget.isDark
                                ? Colors.white.withValues(alpha: 0.9)
                                : LuxuryColors.richBlack)
                            : LuxuryColors.textMuted),
                  ),
                ),
              ),
              // Badge if present
              if (widget.item.badge != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: LuxuryColors.rolexGreen,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    widget.item.badge!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              // Chevron for selected
              if (widget.isSelected)
                Icon(
                  Iconsax.arrow_right_3,
                  size: 16,
                  color: LuxuryColors.rolexGreen.withValues(alpha: 0.7),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Premium AI Chat button
class _PremiumAiChatButton extends StatefulWidget {
  final bool isDark;
  final VoidCallback onTap;

  const _PremiumAiChatButton({
    required this.isDark,
    required this.onTap,
  });

  @override
  State<_PremiumAiChatButton> createState() => _PremiumAiChatButtonState();
}

class _PremiumAiChatButtonState extends State<_PremiumAiChatButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.mediumImpact();
          widget.onTap();
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                LuxuryColors.rolexGreen,
                LuxuryColors.deepEmerald,
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: LuxuryColors.jadePremium.withValues(
                alpha: _isHovered ? 0.6 : 0.3,
              ),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.rolexGreen.withValues(
                  alpha: _isHovered ? 0.5 : 0.3,
                ),
                blurRadius: _isHovered ? 24 : 16,
                spreadRadius: _isHovered ? 0 : -4,
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Iconsax.message_text_1,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'SalesOS AI',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Ask anything',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Icon(
                Iconsax.arrow_right_3,
                size: 18,
                color: Colors.white.withValues(alpha: 0.7),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// User profile section
class _UserProfileSection extends StatelessWidget {
  final bool isDark;
  final String? userName;
  final String? userInitials;
  final String? avatarUrl;

  const _UserProfileSection({
    required this.isDark,
    this.userName,
    this.userInitials,
    this.avatarUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: LuxuryColors.emeraldGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: avatarUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(
                      imageUrl: avatarUrl!,
                      fit: BoxFit.cover,
                      width: 40,
                      height: 40,
                      placeholder: (context, url) => Center(
                        child: Text(
                          userInitials ?? 'U',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => Center(
                        child: Text(
                          userInitials ?? 'U',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  )
                : Center(
                    child: Text(
                      userInitials ?? 'U',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
          ),
          const SizedBox(width: 12),
          // User info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  userName ?? 'User',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : LuxuryColors.richBlack,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'Premium Account',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: LuxuryColors.rolexGreen,
                  ),
                ),
              ],
            ),
          ),
          // Settings icon
          Icon(
            Iconsax.setting_2,
            size: 20,
            color: LuxuryColors.textMuted,
          ),
        ],
      ),
    );
  }
}

/// Navigation item model
class PremiumNavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String? badge;
  final String route;

  const PremiumNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.badge,
    required this.route,
  });
}

/// Compact premium side nav for narrower layouts
class CompactPremiumSideNav extends StatelessWidget {
  final int selectedIndex;
  final List<PremiumNavItem> items;
  final ValueChanged<int> onItemSelected;
  final VoidCallback? onLogoTap;
  final VoidCallback? onAiChatTap;

  const CompactPremiumSideNav({
    super.key,
    required this.selectedIndex,
    required this.items,
    required this.onItemSelected,
    this.onLogoTap,
    this.onAiChatTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: 80,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark
              ? [
                  const Color(0xFF111111),
                  const Color(0xFF0A0A0A),
                ]
              : [
                  const Color(0xFFF8F8F6),
                  const Color(0xFFEDE9DB),
                ],
        ),
      ),
      child: Stack(
        children: [
          // Glow effect
          Positioned(
            top: 50,
            left: -30,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Content
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 20),
                // Compact logo
                GestureDetector(
                  onTap: onLogoTap,
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: LuxuryColors.emeraldGradient,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                          blurRadius: 16,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),

                const SizedBox(height: 24),
                _GlowDivider(isDark: isDark),
                const SizedBox(height: 20),

                // Nav items
                Expanded(
                  child: Column(
                    children: items.asMap().entries.map((entry) {
                      final index = entry.key;
                      final item = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _CompactNavItem(
                          item: item,
                          isSelected: selectedIndex == index,
                          isDark: isDark,
                          onTap: () => onItemSelected(index),
                        ),
                      );
                    }).toList(),
                  ),
                ),

                _GlowDivider(isDark: isDark),
                const SizedBox(height: 20),

                // AI Chat button
                if (onAiChatTap != null)
                  _CompactAiButton(isDark: isDark, onTap: onAiChatTap!),

                const SizedBox(height: 20),
              ],
            ),
          ),

          // Right edge glow
          Positioned(
            right: 0,
            top: 0,
            bottom: 0,
            child: Container(
              width: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    LuxuryColors.rolexGreen.withValues(alpha: 0.4),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CompactNavItem extends StatefulWidget {
  final PremiumNavItem item;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _CompactNavItem({
    required this.item,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  State<_CompactNavItem> createState() => _CompactNavItemState();
}

class _CompactNavItemState extends State<_CompactNavItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: Tooltip(
        message: widget.item.label,
        preferBelow: false,
        child: GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            widget.onTap();
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: widget.isSelected
                  ? LuxuryColors.rolexGreen.withValues(alpha: 0.18)
                  : (_isHovered
                      ? (widget.isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.05))
                      : Colors.transparent),
              borderRadius: BorderRadius.circular(14),
              border: widget.isSelected
                  ? Border.all(
                      color: LuxuryColors.rolexGreen.withValues(alpha: 0.5),
                      width: 1.5,
                    )
                  : null,
              boxShadow: widget.isSelected
                  ? [
                      BoxShadow(
                        color: LuxuryColors.rolexGreen.withValues(alpha: 0.25),
                        blurRadius: 12,
                      ),
                    ]
                  : null,
            ),
            child: Icon(
              widget.isSelected ? widget.item.activeIcon : widget.item.icon,
              size: 24,
              color: widget.isSelected
                  ? LuxuryColors.rolexGreen
                  : (_isHovered
                      ? (widget.isDark ? Colors.white : LuxuryColors.richBlack)
                      : LuxuryColors.textMuted),
            ),
          ),
        ),
      ),
    );
  }
}

class _CompactAiButton extends StatefulWidget {
  final bool isDark;
  final VoidCallback onTap;

  const _CompactAiButton({required this.isDark, required this.onTap});

  @override
  State<_CompactAiButton> createState() => _CompactAiButtonState();
}

class _CompactAiButtonState extends State<_CompactAiButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: Tooltip(
        message: 'SalesOS AI Chat',
        preferBelow: false,
        child: GestureDetector(
          onTap: () {
            HapticFeedback.mediumImpact();
            widget.onTap();
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: LuxuryColors.emeraldGradient,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: LuxuryColors.jadePremium.withValues(
                  alpha: _isHovered ? 0.6 : 0.3,
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.rolexGreen.withValues(
                    alpha: _isHovered ? 0.5 : 0.35,
                  ),
                  blurRadius: _isHovered ? 20 : 12,
                ),
              ],
            ),
            child: const Icon(
              Iconsax.message_text_1,
              color: Colors.white,
              size: 24,
            ),
          ),
        ),
      ),
    );
  }
}
