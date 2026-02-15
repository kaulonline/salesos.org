import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';
import 'luxury_card.dart';

/// Premium "License Required" locked state screen
///
/// Displays when user has no valid license, showing:
/// - Elegant lock visual with subtle animations
/// - Clear messaging (not alarming)
/// - Contact administrator and enter license key options
class LicenseLockedScreen extends StatefulWidget {
  final String message;
  final String adminEmail;
  final VoidCallback? onEnterLicenseKey;
  final VoidCallback? onLogout;
  final String? userName;

  const LicenseLockedScreen({
    super.key,
    this.message = 'No active enterprise license found. Please contact your organization administrator to obtain a license key.',
    this.adminEmail = 'support@salesos.org',
    this.onEnterLicenseKey,
    this.onLogout,
    this.userName,
  });

  @override
  State<LicenseLockedScreen> createState() => _LicenseLockedScreenState();
}

class _LicenseLockedScreenState extends State<LicenseLockedScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _launchEmail() async {
    final uri = Uri(
      scheme: 'mailto',
      path: widget.adminEmail,
      query: 'subject=License Request - SalesOS&body=Hello,%0A%0AI need access to SalesOS.%0A%0AUser: ${widget.userName ?? "Unknown"}%0A%0AThank you.',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: isDark ? LuxuryColors.richBlack : LuxuryColors.cream,
      body: Stack(
        children: [
          // Subtle background pattern
          _buildBackgroundPattern(isDark),

          // Main content
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: size.height - MediaQuery.of(context).padding.top,
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 60),

                      // Lock visual
                      _buildLockVisual(isDark)
                          .animate()
                          .fadeIn(duration: 600.ms)
                          .scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack),

                      const SizedBox(height: 48),

                      // Heading
                      _buildHeading(isDark)
                          .animate(delay: 200.ms)
                          .fadeIn()
                          .slideY(begin: 0.2),

                      const SizedBox(height: 16),

                      // Message
                      _buildMessage(isDark)
                          .animate(delay: 300.ms)
                          .fadeIn()
                          .slideY(begin: 0.2),

                      const SizedBox(height: 48),

                      // Action buttons
                      _buildActionButtons(isDark)
                          .animate(delay: 400.ms)
                          .fadeIn()
                          .slideY(begin: 0.2),

                      const SizedBox(height: 32),

                      // Secondary options
                      _buildSecondaryOptions(isDark)
                          .animate(delay: 500.ms)
                          .fadeIn(),

                      const SizedBox(height: 60),

                      // Branding
                      _buildBranding(isDark)
                          .animate(delay: 600.ms)
                          .fadeIn(),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackgroundPattern(bool isDark) {
    return Positioned.fill(
      child: CustomPaint(
        painter: _SubtleGridPainter(
          color: isDark
              ? Colors.white.withValues(alpha: 0.02)
              : Colors.black.withValues(alpha: 0.02),
        ),
      ),
    );
  }

  Widget _buildLockVisual(bool isDark) {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Container(
          width: 140,
          height: 140,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [
                      LuxuryColors.deepEmerald.withValues(alpha: 0.3),
                      LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                    ]
                  : [
                      LuxuryColors.rolexGreen.withValues(alpha: 0.1),
                      LuxuryColors.deepEmerald.withValues(alpha: 0.05),
                    ],
            ),
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.2 * _pulseAnimation.value),
                blurRadius: 40 * _pulseAnimation.value,
                spreadRadius: 10 * _pulseAnimation.value,
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Frosted glass effect ring
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDark
                        ? LuxuryColors.champagneGold.withValues(alpha: 0.3)
                        : LuxuryColors.rolexGreen.withValues(alpha: 0.3),
                    width: 1.5,
                  ),
                ),
              ),

              // Inner frosted container
              ClipOval(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.white.withValues(alpha: 0.7),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                        width: 1,
                      ),
                    ),
                    child: Icon(
                      Icons.lock_outline_rounded,
                      size: 44,
                      color: isDark
                          ? LuxuryColors.champagneGold
                          : LuxuryColors.rolexGreen,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeading(bool isDark) {
    return Column(
      children: [
        Text(
          'Enterprise License Required',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
            letterSpacing: -0.5,
            height: 1.2,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Container(
          width: 60,
          height: 3,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                isDark ? LuxuryColors.champagneGold : LuxuryColors.rolexGreen,
                isDark
                    ? LuxuryColors.champagneGold.withValues(alpha: 0.3)
                    : LuxuryColors.rolexGreen.withValues(alpha: 0.3),
              ],
            ),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ],
    );
  }

  Widget _buildMessage(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Text(
        widget.message,
        style: TextStyle(
          fontSize: 15,
          color: isDark
              ? LuxuryColors.textOnDark.withValues(alpha: 0.7)
              : LuxuryColors.textOnLight.withValues(alpha: 0.6),
          height: 1.6,
          letterSpacing: 0.1,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildActionButtons(bool isDark) {
    return Column(
      children: [
        // Primary: Contact Administrator
        _PremiumButton(
          label: 'Contact Administrator',
          icon: Icons.mail_outline_rounded,
          isPrimary: true,
          isDark: isDark,
          onTap: () {
            HapticFeedback.lightImpact();
            _launchEmail();
          },
        ),

        const SizedBox(height: 16),

        // Secondary: Enter License Key
        if (widget.onEnterLicenseKey != null)
          _PremiumButton(
            label: 'Enter License Key',
            icon: Icons.key_rounded,
            isPrimary: false,
            isDark: isDark,
            onTap: () {
              HapticFeedback.lightImpact();
              widget.onEnterLicenseKey?.call();
            },
          ),
      ],
    );
  }

  Widget _buildSecondaryOptions(bool isDark) {
    if (widget.onLogout == null) return const SizedBox.shrink();

    return TextButton(
      onPressed: () {
        HapticFeedback.lightImpact();
        widget.onLogout?.call();
      },
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
      child: Text(
        'Sign Out',
        style: TextStyle(
          fontSize: 14,
          color: isDark
              ? LuxuryColors.textOnDark.withValues(alpha: 0.5)
              : LuxuryColors.textOnLight.withValues(alpha: 0.5),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildBranding(bool isDark) {
    return Column(
      children: [
        // IRIS Logo mark
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LuxuryColors.emeraldGradient,
            boxShadow: [
              BoxShadow(
                color: LuxuryColors.rolexGreen.withValues(alpha: 0.2),
                blurRadius: 12,
                spreadRadius: 2,
              ),
            ],
          ),
          child: const Center(
            child: Text(
              'I',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                fontFamily: 'PlusJakartaSans',
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'SalesOS',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark
                ? LuxuryColors.textOnDark.withValues(alpha: 0.6)
                : LuxuryColors.textOnLight.withValues(alpha: 0.5),
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Enterprise AI Sales Platform',
          style: TextStyle(
            fontSize: 11,
            color: isDark
                ? LuxuryColors.textOnDark.withValues(alpha: 0.4)
                : LuxuryColors.textOnLight.withValues(alpha: 0.4),
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}

/// Premium button with luxury styling
class _PremiumButton extends StatefulWidget {
  final String label;
  final IconData icon;
  final bool isPrimary;
  final bool isDark;
  final VoidCallback onTap;

  const _PremiumButton({
    required this.label,
    required this.icon,
    required this.isPrimary,
    required this.isDark,
    required this.onTap,
  });

  @override
  State<_PremiumButton> createState() => _PremiumButtonState();
}

class _PremiumButtonState extends State<_PremiumButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final primaryColor = widget.isDark
        ? LuxuryColors.champagneGold
        : LuxuryColors.rolexGreen;

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        decoration: BoxDecoration(
          color: widget.isPrimary
              ? (_isPressed ? primaryColor.withValues(alpha: 0.9) : primaryColor)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: widget.isPrimary
              ? null
              : Border.all(
                  color: primaryColor.withValues(alpha: 0.4),
                  width: 1.5,
                ),
          boxShadow: widget.isPrimary
              ? [
                  BoxShadow(
                    color: primaryColor.withValues(alpha: _isPressed ? 0.2 : 0.3),
                    blurRadius: _isPressed ? 8 : 16,
                    offset: Offset(0, _isPressed ? 2 : 4),
                  ),
                ]
              : null,
        ),
        transform: _isPressed ? (Matrix4.identity()..setEntry(0, 0, 0.98)..setEntry(1, 1, 0.98)) : null,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              widget.icon,
              size: 20,
              color: widget.isPrimary
                  ? (widget.isDark ? LuxuryColors.richBlack : Colors.white)
                  : primaryColor,
            ),
            const SizedBox(width: 10),
            Text(
              widget.label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: widget.isPrimary
                    ? (widget.isDark ? LuxuryColors.richBlack : Colors.white)
                    : primaryColor,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Subtle grid pattern painter for background texture
class _SubtleGridPainter extends CustomPainter {
  final Color color;

  _SubtleGridPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 0.5;

    const spacing = 30.0;

    // Vertical lines
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    // Horizontal lines
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// License key entry dialog
class LicenseKeyEntryDialog extends StatefulWidget {
  final Function(String) onSubmit;

  const LicenseKeyEntryDialog({
    super.key,
    required this.onSubmit,
  });

  @override
  State<LicenseKeyEntryDialog> createState() => _LicenseKeyEntryDialogState();
}

class _LicenseKeyEntryDialogState extends State<LicenseKeyEntryDialog> {
  final _controller = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? LuxuryColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark
                ? LuxuryColors.champagneGold.withValues(alpha: 0.2)
                : LuxuryColors.rolexGreen.withValues(alpha: 0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 30,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Enter License Key',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Enter the license key provided by your administrator',
              style: TextStyle(
                fontSize: 13,
                color: isDark
                    ? LuxuryColors.textOnDark.withValues(alpha: 0.6)
                    : LuxuryColors.textOnLight.withValues(alpha: 0.6),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _controller,
              style: TextStyle(
                fontSize: 16,
                fontFamily: 'monospace',
                color: isDark ? LuxuryColors.textOnDark : LuxuryColors.textOnLight,
                letterSpacing: 2,
              ),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                hintText: 'XXXX-XXXX-XXXX-XXXX',
                hintStyle: TextStyle(
                  color: isDark
                      ? LuxuryColors.textOnDark.withValues(alpha: 0.3)
                      : LuxuryColors.textOnLight.withValues(alpha: 0.3),
                  letterSpacing: 2,
                ),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.black.withValues(alpha: 0.03),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark ? LuxuryColors.champagneGold : LuxuryColors.rolexGreen,
                    width: 1.5,
                  ),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              ),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: isDark
                            ? LuxuryColors.textOnDark.withValues(alpha: 0.6)
                            : LuxuryColors.textOnLight.withValues(alpha: 0.6),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading
                        ? null
                        : () {
                            if (_controller.text.isNotEmpty) {
                              setState(() => _isLoading = true);
                              widget.onSubmit(_controller.text);
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          isDark ? LuxuryColors.champagneGold : LuxuryColors.rolexGreen,
                      foregroundColor: isDark ? LuxuryColors.richBlack : Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: isDark ? LuxuryColors.richBlack : Colors.white,
                            ),
                          )
                        : const Text(
                            'Activate',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
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
