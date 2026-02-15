import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../core/config/routes.dart';
import '../../core/providers/connectivity_provider.dart';
import '../../core/utils/responsive.dart';
import 'app_background.dart';
import 'luxury_card.dart';
import 'offline_banner.dart';

/// Navigation destination model
class NavDestination {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String route;

  const NavDestination({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.route,
  });
}

/// List of navigation destinations
const _destinations = [
  NavDestination(
    icon: Iconsax.home_2,
    activeIcon: Iconsax.home_25,
    label: 'Home',
    route: '/dashboard',
  ),
  NavDestination(
    icon: Iconsax.dollar_circle,
    activeIcon: Iconsax.dollar_circle,
    label: 'Deals',
    route: '/deals',
  ),
  NavDestination(
    icon: Iconsax.task_square,
    activeIcon: Iconsax.task_square5,
    label: 'Tasks',
    route: '/tasks',
  ),
  NavDestination(
    icon: Iconsax.menu_1,
    activeIcon: Iconsax.menu_15,
    label: 'More',
    route: '/settings',
  ),
];

/// Adaptive scaffold that switches between bottom nav (phones) and floating dock (tablets)
class AdaptiveScaffold extends ConsumerStatefulWidget {
  final Widget child;

  const AdaptiveScaffold({super.key, required this.child});

  @override
  ConsumerState<AdaptiveScaffold> createState() => _AdaptiveScaffoldState();
}

class _AdaptiveScaffoldState extends ConsumerState<AdaptiveScaffold> {
  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/dashboard')) {
      return 0;
    }
    if (location.startsWith('/deals')) {
      return 1;
    }
    if (location.startsWith('/tasks')) {
      return 2;
    }
    if (location.startsWith('/settings') ||
        location.startsWith('/contacts') ||
        location.startsWith('/leads')) {
      return 3;
    }
    return 0;
  }

  void _onDestinationSelected(int index, BuildContext context) {
    HapticFeedback.lightImpact();
    context.go(_destinations[index].route);
  }

  void _openAiChat(BuildContext context) {
    HapticFeedback.mediumImpact();
    context.push(AppRoutes.aiChat);
  }

  @override
  Widget build(BuildContext context) {
    final useSideNav = Responsive.shouldUseSideNavigation(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedIndex = _calculateSelectedIndex(context);

    if (useSideNav) {
      return _buildTabletLayout(context, isDark, selectedIndex);
    } else {
      return _buildPhoneLayout(context, isDark, selectedIndex);
    }
  }

  /// Phone layout with floating bottom navigation
  Widget _buildPhoneLayout(
    BuildContext context,
    bool isDark,
    int selectedIndex,
  ) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            widget.child,
            // Offline banner positioned at the top
            PositionedOfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
              },
            ),
            // Offline indicator in top-right corner (app bar style)
            Positioned(
              top: MediaQuery.of(context).padding.top + 12,
              right: 16,
              child: const OfflineIndicator(size: 10, showPulse: true),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: MediaQuery.of(context).padding.bottom + 16,
              child: _FloatingBottomNav(
                selectedIndex: selectedIndex,
                isDark: isDark,
                onDestinationSelected: (index) =>
                    _onDestinationSelected(index, context),
                onAiChatTap: () => _openAiChat(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Tablet layout with floating vertical dock (premium design)
  Widget _buildTabletLayout(
    BuildContext context,
    bool isDark,
    int selectedIndex,
  ) {
    // Dock area width = dock (72) + padding on both sides (16 + 16) = 104px
    const dockWidth = 72.0;
    const dockPadding = 16.0;
    const dockAreaWidth = dockWidth + (dockPadding * 2);

    // Background color matching the app background
    final dockBgColor = isDark
        ? const Color(0xFF0D0D12)
        : const Color(0xFFF8F9FA);

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            Row(
              children: [
                // Left dock area with solid background
                Container(
                  width: dockAreaWidth,
                  color: dockBgColor,
                  child: SafeArea(
                    right: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: dockPadding,
                        vertical: 16,
                      ),
                      child: _FloatingVerticalDock(
                        selectedIndex: selectedIndex,
                        isDark: isDark,
                        onDestinationSelected: (index) =>
                            _onDestinationSelected(index, context),
                        onAiChatTap: () => _openAiChat(context),
                      ),
                    ),
                  ),
                ),
                // Main content area
                Expanded(child: widget.child),
              ],
            ),
            // Offline banner positioned at the top (spans full width on tablets)
            PositionedOfflineBanner(
              compact: true,
              onRetry: () async {
                await ref.read(connectivityServiceProvider).checkConnectivity();
              },
            ),
            // Offline indicator in top-right corner (app bar style)
            Positioned(
              top: MediaQuery.of(context).padding.top + 12,
              right: 16,
              child: const OfflineIndicator(size: 10, showPulse: true),
            ),
          ],
        ),
      ),
    );
  }
}

/// Floating vertical navigation dock for tablets - Premium design
class _FloatingVerticalDock extends StatelessWidget {
  final int selectedIndex;
  final bool isDark;
  final ValueChanged<int> onDestinationSelected;
  final VoidCallback onAiChatTap;

  const _FloatingVerticalDock({
    required this.selectedIndex,
    required this.isDark,
    required this.onDestinationSelected,
    required this.onAiChatTap,
  });

  // Match the app background color exactly - fully opaque
  static const Color _darkBgColor = Color(0xFF0D0D12);
  static const Color _lightBgColor = Color(0xFFF8F9FA);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      decoration: BoxDecoration(
        // Solid opaque background - matches app background exactly
        color: isDark ? _darkBgColor : _lightBgColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark
              ? LuxuryColors.champagneGold.withValues(alpha: 0.3)
              : LuxuryColors.champagneGold.withValues(alpha: 0.2),
          width: 1,
        ),
        boxShadow: [
          // Subtle shadow for depth
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
            blurRadius: 16,
            offset: const Offset(2, 0),
          ),
        ],
      ),
      child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
            child: Column(
              mainAxisSize: MainAxisSize.max,
              children: [
                // Logo at top with offline indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _DockLogo(isDark: isDark),
                    const SizedBox(width: 4),
                    const OfflineIndicator(size: 10, showPulse: true),
                  ],
                ),
                const SizedBox(height: 24),
                // Top divider
                _DockDivider(),
                const SizedBox(height: 20),
                // Navigation items - centered in available space
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: _destinations.asMap().entries.map((entry) {
                      final index = entry.key;
                      final dest = entry.value;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: _DockNavItem(
                          icon: dest.icon,
                          activeIcon: dest.activeIcon,
                          label: dest.label,
                          isSelected: selectedIndex == index,
                          isDark: isDark,
                          onTap: () => onDestinationSelected(index),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                // Bottom divider
                _DockDivider(),
                const SizedBox(height: 20),
                // AI Chat button at bottom
                _DockAiChatButton(onTap: onAiChatTap),
              ],
            ),
          ),
    );
  }
}

/// Dock divider - subtle gradient line
class _DockDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 1,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.transparent,
            LuxuryColors.champagneGold.withValues(alpha: 0.4),
            Colors.transparent,
          ],
        ),
      ),
    );
  }
}

/// Dock logo - compact luxury branding
class _DockLogo extends StatelessWidget {
  final bool isDark;

  const _DockLogo({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        gradient: LuxuryColors.goldShimmer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.35),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: const Icon(Icons.auto_awesome, color: Colors.white, size: 22),
    );
  }
}

/// Dock navigation item
class _DockNavItem extends StatefulWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _DockNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  State<_DockNavItem> createState() => _DockNavItemState();
}

class _DockNavItemState extends State<_DockNavItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: Tooltip(
        message: widget.label,
        preferBelow: false,
        verticalOffset: 0,
        margin: const EdgeInsets.only(left: 80),
        decoration: BoxDecoration(
          color: widget.isDark
              ? LuxuryColors.obsidian.withValues(alpha: 0.95)
              : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: LuxuryColors.champagneGold.withValues(alpha: 0.3),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 8,
            ),
          ],
        ),
        textStyle: TextStyle(
          color: widget.isDark ? Colors.white : Colors.black,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
        ),
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
                  ? LuxuryColors.champagneGold.withValues(alpha: 0.18)
                  : (_isHovered
                        ? (widget.isDark
                              ? Colors.white.withValues(alpha: 0.08)
                              : Colors.black.withValues(alpha: 0.05))
                        : Colors.transparent),
              borderRadius: BorderRadius.circular(16),
              border: widget.isSelected
                  ? Border.all(
                      color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
                      width: 1.5,
                    )
                  : null,
            ),
            child: Icon(
              widget.isSelected ? widget.activeIcon : widget.icon,
              size: 24,
              color: widget.isSelected
                  ? LuxuryColors.champagneGold
                  : (_isHovered
                        ? (widget.isDark
                              ? LuxuryColors.textOnDark
                              : LuxuryColors.textOnLight)
                        : LuxuryColors.textMuted),
            ),
          ),
        ),
      ),
    );
  }
}

/// Dock AI Chat button - premium champagne gold
class _DockAiChatButton extends StatefulWidget {
  final VoidCallback onTap;

  const _DockAiChatButton({required this.onTap});

  @override
  State<_DockAiChatButton> createState() => _DockAiChatButtonState();
}

class _DockAiChatButtonState extends State<_DockAiChatButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: Tooltip(
        message: 'SalesOS AI Chat',
        preferBelow: false,
        verticalOffset: 0,
        margin: const EdgeInsets.only(left: 80),
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
              gradient: LuxuryColors.goldShimmer,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: LuxuryColors.champagneGold.withValues(
                  alpha: _isHovered ? 0.6 : 0.4,
                ),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: LuxuryColors.champagneGold.withValues(
                    alpha: _isHovered ? 0.5 : 0.3,
                  ),
                  blurRadius: _isHovered ? 20 : 12,
                  spreadRadius: _isHovered ? 0 : -2,
                ),
              ],
            ),
            child: const Icon(
              Iconsax.message_text_1,
              size: 24,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

/// Floating bottom navigation for phones (existing design)
class _FloatingBottomNav extends StatelessWidget {
  final int selectedIndex;
  final bool isDark;
  final ValueChanged<int> onDestinationSelected;
  final VoidCallback onAiChatTap;

  const _FloatingBottomNav({
    required this.selectedIndex,
    required this.isDark,
    required this.onDestinationSelected,
    required this.onAiChatTap,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: isDark
                ? LuxuryColors.obsidian.withValues(alpha: 0.85)
                : Colors.white.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: isDark
                  ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                  : LuxuryColors.champagneGold.withValues(alpha: 0.15),
              width: 1,
            ),
            boxShadow: [
              // Primary shadow
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
              // Subtle gold glow
              BoxShadow(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.1),
                blurRadius: 20,
                spreadRadius: -5,
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                // Home
                _BottomNavItem(
                  icon: _destinations[0].icon,
                  activeIcon: _destinations[0].activeIcon,
                  label: _destinations[0].label,
                  isSelected: selectedIndex == 0,
                  isDark: isDark,
                  onTap: () => onDestinationSelected(0),
                ),
                // Deals
                _BottomNavItem(
                  icon: _destinations[1].icon,
                  activeIcon: _destinations[1].activeIcon,
                  label: _destinations[1].label,
                  isSelected: selectedIndex == 1,
                  isDark: isDark,
                  onTap: () => onDestinationSelected(1),
                ),
                // AI Chat (center button)
                _AiChatButton(onTap: onAiChatTap),
                // Tasks
                _BottomNavItem(
                  icon: _destinations[2].icon,
                  activeIcon: _destinations[2].activeIcon,
                  label: _destinations[2].label,
                  isSelected: selectedIndex == 2,
                  isDark: isDark,
                  onTap: () => onDestinationSelected(2),
                ),
                // More
                _BottomNavItem(
                  icon: _destinations[3].icon,
                  activeIcon: _destinations[3].activeIcon,
                  label: _destinations[3].label,
                  isSelected: selectedIndex == 3,
                  isDark: isDark,
                  onTap: () => onDestinationSelected(3),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Individual bottom nav item
class _BottomNavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _BottomNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label tab',
      selected: isSelected,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  isSelected ? activeIcon : icon,
                  key: ValueKey(isSelected),
                  size: 24,
                  color: isSelected
                      ? LuxuryColors.champagneGold
                      : (isDark
                            ? LuxuryColors.textMuted
                            : LuxuryColors.coolGray),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  letterSpacing: 0.5,
                  color: isSelected
                      ? LuxuryColors.champagneGold
                      : (isDark
                            ? LuxuryColors.textMuted
                            : LuxuryColors.coolGray),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// AI Chat center button - Luxury styled
class _AiChatButton extends StatelessWidget {
  final VoidCallback onTap;

  const _AiChatButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Open SalesOS AI Chat',
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: LuxuryColors.goldShimmer,
            shape: BoxShape.circle,
            border: Border.all(
              color: LuxuryColors.champagneGold.withValues(alpha: 0.5),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.champagneGold.withValues(alpha: 0.4),
                blurRadius: 16,
                spreadRadius: 0,
              ),
            ],
          ),
          child: Icon(
            Iconsax.message_text_1,
            color: LuxuryColors.richBlack,
            size: 26,
          ),
        ),
      ),
    );
  }
}

