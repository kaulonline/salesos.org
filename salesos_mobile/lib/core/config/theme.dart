import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// SalesOS Design System - Brand-Aligned Theme Configuration
/// Brand Palette: #EAD07D (Gold), #1A1A1A (Dark), #F2F1EA (Background)
/// Typography: Plus Jakarta Sans (headings) + Inter (body)
/// Matches website: warm beige, gold accent, dark buttons, white cards
class SalesOSTheme {
  SalesOSTheme._();

  // ============================================================
  // BRAND COLORS - SalesOS Website-Aligned Palette
  // ============================================================

  // Gold Collection - Primary brand accent (matches website #EAD07D)
  static const Color luxuryGold = Color(0xFFEAD07D);
  static const Color luxuryGoldLight = Color(0xFFF0E5B8);
  static const Color luxuryRoseGold = Color(0xFFB76E79);

  // Platinum Collection
  static const Color luxuryPlatinum = Color(0xFFE5E4E2);
  static const Color luxurySilver = Color(0xFFD4D4D8);

  // Diamond/Crystal
  static const Color luxuryDiamond = Color(0xFFF5F5F5);
  static const Color luxuryPearl = Color(0xFFF8F6F0);

  // Legacy emerald aliases — now remap to gold for brand alignment
  static const Color luxuryEmerald = Color(0xFFEAD07D);
  static const Color luxuryJade = Color(0xFFEAD07D);

  // Deep backgrounds
  static const Color luxuryObsidian = Color(0xFF1A1A1A);
  static const Color luxuryOnyx = Color(0xFF121212);
  static const Color luxuryNavy = Color(0xFF0D1B2A);
  static const Color luxuryRoyalNavy = Color(0xFF1A1F3D);

  // Premium gradients
  static const LinearGradient luxuryGoldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [luxuryGoldLight, luxuryGold, Color(0xFFD4B85C)],
  );

  static const LinearGradient luxuryPlatinumGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [luxuryDiamond, luxuryPlatinum, luxurySilver],
  );

  // Legacy gradient aliases — remap to gold gradient
  static const LinearGradient luxuryEmeraldGradient = luxuryGoldGradient;

  static const LinearGradient luxuryRoyalGradient = luxuryGoldGradient;

  // ============================================================
  // TYPOGRAPHY - Dual Font System
  // Plus Jakarta Sans: headings, display, titles, hero, numeric
  // Inter: body, labels, captions
  // ============================================================

  /// Heading font — Plus Jakarta Sans (display, headline, title, hero, numeric, overline)
  static const String fontFamilyHeading = 'PlusJakartaSans';

  /// Body font — Inter (body, label, caption)
  static const String fontFamilyBody = 'Inter';

  /// Legacy alias — defaults to heading font for backward compat
  static const String fontFamily = fontFamilyHeading;

  /// Font Weights
  static const FontWeight weightThin = FontWeight.w100;
  static const FontWeight weightExtraLight = FontWeight.w200;
  static const FontWeight weightLight = FontWeight.w300;       // Inter-Light
  static const FontWeight weightRegular = FontWeight.w400;     // Both fonts
  static const FontWeight weightMedium = FontWeight.w500;      // Both fonts
  static const FontWeight weightSemiBold = FontWeight.w600;    // Both fonts
  static const FontWeight weightBold = FontWeight.w700;        // Both fonts
  static const FontWeight weightExtraBold = FontWeight.w800;   // PlusJakartaSans-ExtraBold
  static const FontWeight weightBlack = FontWeight.w900;

  /// Typography Scale:
  /// - Display/Headlines/Titles: Plus Jakarta Sans
  /// - Body/Labels/Captions: Inter
  /// - Hero/Numeric: Plus Jakarta Sans

  // Brand Colors - SalesOS Primary Palette
  static const Color salesOSGold = Color(0xFFEAD07D);      // Gold accent - primary brand
  static const Color salesOSGoldLight = Color(0xFFF0E5B8); // Light gold tint
  static const Color salesOSGoldDark = Color(0xFFD4B85C);  // Dark gold accent
  static const Color salesOSDark = Color(0xFF1A1A1A);      // Dark primary
  static const Color salesOSBlack = Color(0xFF0D0D0D);     // Near black
  static const Color salesOSBg = Color(0xFFF2F1EA);        // Warm beige background
  static const Color salesOSTextMuted = Color(0xFF666666); // Muted text
  static const Color salesOSSuccess = Color(0xFF93C01F);   // Success green

  // Legacy color names (for backward compatibility during migration)
  static const Color irisGold = salesOSGold;
  static const Color irisGoldLight = salesOSGoldLight;
  static const Color irisGoldDark = salesOSGoldDark;
  static const Color irisBrown = salesOSDark;
  static const Color irisBlack = salesOSBlack;

  // Semantic Colors — aligned to website
  static const Color success = Color(0xFF93C01F);        // Website success green
  static const Color successLight = Color(0xFFB0D94F);
  static const Color warning = Color(0xFFF59E0B);        // Standard amber
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color error = Color(0xFFEF4444);          // Standard red-500
  static const Color errorLight = Color(0xFFF87171);
  static const Color info = Color(0xFF3B82F6);           // Standard blue
  static const Color infoLight = Color(0xFF60A5FA);

  // Dark Theme Colors
  static const Color darkBackground = Color(0xFF0D0D0D); // Brand near-black
  static const Color darkSurface = Color(0xFF1C1C1E);
  static const Color darkSurfaceElevated = Color(0xFF2C2C2E);
  static const Color darkSurfaceHigh = Color(0xFF3A3A3C);
  static const Color darkBorder = Color(0xFF38383A);
  static const Color darkTextPrimary = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFF8E8E93);
  static const Color darkTextTertiary = Color(0xFF636366);

  // Light Theme Colors — aligned to website warm beige palette
  static const Color lightBackground = Color(0xFFF2F1EA);     // Website bg
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceElevated = Color(0xFFF8F8F6); // Website surface hover
  static const Color lightBorder = Color(0xFFE5E5EA);
  static const Color lightTextPrimary = Color(0xFF1A1A1A);     // Website heading color
  static const Color lightTextSecondary = Color(0xFF666666);   // Website body text
  static const Color lightTextTertiary = Color(0xFF999999);    // Website muted text

  // Pipeline Stage Colors - Brand-aligned
  static const Color stageProspecting = Color(0xFFE8B99A);  // Light tan
  static const Color stageQualified = Color(0xFFD99C79);    // Warm tan
  static const Color stageProposal = Color(0xFFBF7154);     // Terracotta
  static const Color stageNegotiation = Color(0xFF8B4D3B);  // Medium brown
  static const Color stageClosedWon = Color(0xFF93C01F);    // Website success green
  static const Color stageClosedLost = Color(0xFFEF4444);   // Red for lost

  // Visual Accent Colors - For UI variety and status differentiation
  // Inspired by modern CRM designs for better scanability
  static const Color accentBlueLight = Color(0xFF5B9BD5);   // Soft blue
  static const Color accentBlueDark = Color(0xFF2B5797);    // Deep blue
  static const Color accentYellow = Color(0xFFF4D03F);      // Bright yellow
  static const Color accentYellowDark = Color(0xFFD4AC0D);  // Deep yellow
  static const Color accentTealLight = Color(0xFF48C9B0);   // Soft teal
  static const Color accentTealDark = Color(0xFF17A589);    // Deep teal

  // Card Background Colors - For color-coded deal/opportunity cards
  static const Color cardBlue = Color(0xFF3B82F6);          // Blue card
  static const Color cardYellow = Color(0xFFFDE047);        // Yellow card
  static const Color cardTeal = Color(0xFF2DD4BF);          // Teal card
  static const Color cardDark = Color(0xFF1E293B);          // Dark card

  // Gradients - Modern accent gradients for UI elements
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [irisGold, irisGoldLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [darkSurface, darkBackground],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Premium brand gradient for headers and CTAs
  static const LinearGradient goldGradient = LinearGradient(
    colors: [irisGoldLight, irisGold, irisGoldDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Brand accent gradients - all using brand palette
  static const LinearGradient accentPrimary = LinearGradient(
    colors: [irisGold, irisGoldDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentLight = LinearGradient(
    colors: [irisGoldLight, irisGold],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentDark = LinearGradient(
    colors: [irisGoldDark, irisBrown],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentDeep = LinearGradient(
    colors: [irisBrown, irisBlack],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Legacy aliases for compatibility (all map to brand gradients)
  static const LinearGradient accentPurple = accentDark;
  static const LinearGradient accentBlue = accentPrimary;
  static const LinearGradient accentTeal = accentLight;
  static const LinearGradient accentPink = accentPrimary;
  static const LinearGradient accentOrange = accentPrimary;

  // Semantic gradients - using brand colors
  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF93C01F), Color(0xFFB0D94F)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warningGradient = LinearGradient(
    colors: [irisGold, irisGoldDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient errorGradient = LinearGradient(
    colors: [irisGoldDark, irisBrown],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Dark card gradient with subtle accent
  static const LinearGradient darkCardGradient = LinearGradient(
    colors: [Color(0xFF1E1E20), Color(0xFF16161A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Light card gradient
  static const LinearGradient lightCardGradient = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFF8F9FA)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Glass effect gradient overlay (for glassmorphism effects)
  static LinearGradient glassGradient(bool isDark) => LinearGradient(
    colors: isDark
      ? [Colors.white.withValues(alpha: 0.1), Colors.white.withValues(alpha: 0.05)]
      : [Colors.white.withValues(alpha: 0.8), Colors.white.withValues(alpha: 0.6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Gradient border helper
  static BoxDecoration gradientBorder({
    required LinearGradient gradient,
    double borderWidth = 2,
    double borderRadius = 16,
    Color? fillColor,
  }) {
    return BoxDecoration(
      gradient: gradient,
      borderRadius: BorderRadius.circular(borderRadius),
    );
  }

  // Gradient icon container
  static BoxDecoration gradientIconBox({
    required LinearGradient gradient,
    double borderRadius = 12,
  }) {
    return BoxDecoration(
      gradient: gradient,
      borderRadius: BorderRadius.circular(borderRadius),
      boxShadow: [
        BoxShadow(
          color: gradient.colors.first.withValues(alpha: 0.3),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  // Spacing Scale
  static const double spacing2 = 2.0;
  static const double spacing4 = 4.0;
  static const double spacing6 = 6.0;
  static const double spacing8 = 8.0;
  static const double spacing12 = 12.0;
  static const double spacing16 = 16.0;
  static const double spacing20 = 20.0;
  static const double spacing24 = 24.0;
  static const double spacing32 = 32.0;
  static const double spacing40 = 40.0;
  static const double spacing48 = 48.0;
  static const double spacing56 = 56.0;
  static const double spacing64 = 64.0;

  // Border Radius
  static const double radiusSm = 4.0;
  static const double radiusMd = 8.0;
  static const double radiusLg = 12.0;
  static const double radiusXl = 16.0;
  static const double radius2xl = 20.0;
  static const double radius3xl = 24.0;
  static const double radiusFull = 999.0;

  // Shadows
  static List<BoxShadow> get shadowSm => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get shadowMd => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.1),
          blurRadius: 8,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get shadowLg => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.15),
          blurRadius: 16,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get glowGold => [
        BoxShadow(
          color: irisGold.withValues(alpha: 0.3),
          blurRadius: 20,
          spreadRadius: 2,
        ),
      ];

  // ============================================================
  // TEXT STYLES - Dual font system (PlusJakartaSans + Inter)
  // Auto-adjusted weights based on typography role
  // ============================================================

  // --------------- DISPLAY TEXT ---------------
  // Large decorative text — Plus Jakarta Sans

  static TextStyle get displayLarge => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 57,
        fontWeight: weightRegular,
        letterSpacing: -0.25,
        height: 1.12,
        decoration: TextDecoration.none,
      );

  static TextStyle get displayMedium => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 45,
        fontWeight: weightRegular,
        letterSpacing: -0.15,
        height: 1.16,
        decoration: TextDecoration.none,
      );

  static TextStyle get displaySmall => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 36,
        fontWeight: weightRegular,
        height: 1.22,
        decoration: TextDecoration.none,
      );

  // --------------- HEADLINES ---------------
  // Section headers — Plus Jakarta Sans

  static TextStyle get headlineLarge => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 32,
        fontWeight: weightBold,
        height: 1.25,
        decoration: TextDecoration.none,
      );

  static TextStyle get headlineMedium => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 28,
        fontWeight: weightSemiBold,
        height: 1.29,
        decoration: TextDecoration.none,
      );

  static TextStyle get headlineSmall => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 24,
        fontWeight: weightSemiBold,
        height: 1.33,
        decoration: TextDecoration.none,
      );

  // --------------- TITLES ---------------
  // Card titles, list item titles — Plus Jakarta Sans

  static TextStyle get titleLarge => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 22,
        fontWeight: weightSemiBold,
        height: 1.27,
        decoration: TextDecoration.none,
      );

  static TextStyle get titleMedium => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 16,
        fontWeight: weightSemiBold,
        letterSpacing: 0.15,
        height: 1.5,
        decoration: TextDecoration.none,
      );

  static TextStyle get titleSmall => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 14,
        fontWeight: weightSemiBold,
        letterSpacing: 0.1,
        height: 1.43,
        decoration: TextDecoration.none,
      );

  // --------------- BODY TEXT ---------------
  // Reading content — Inter

  static TextStyle get bodyLarge => const TextStyle(
        fontFamily: fontFamilyBody,
        fontSize: 16,
        fontWeight: weightRegular,
        letterSpacing: 0.5,
        height: 1.5,
        decoration: TextDecoration.none,
      );

  static TextStyle get bodyMedium => const TextStyle(
        fontFamily: fontFamilyBody,
        fontSize: 14,
        fontWeight: weightRegular,
        letterSpacing: 0.25,
        height: 1.43,
        decoration: TextDecoration.none,
      );

  static TextStyle get bodySmall => const TextStyle(
        fontFamily: fontFamilyBody,
        fontSize: 12,
        fontWeight: weightRegular,
        letterSpacing: 0.4,
        height: 1.33,
        decoration: TextDecoration.none,
      );

  // --------------- LABELS ---------------
  // Buttons, tabs, chips — Inter

  static TextStyle get labelLarge => const TextStyle(
        fontFamily: fontFamilyBody,
        fontSize: 14,
        fontWeight: weightMedium,
        letterSpacing: 0.1,
        height: 1.43,
        decoration: TextDecoration.none,
      );

  static TextStyle get labelMedium => const TextStyle(
        fontFamily: fontFamilyBody,
        fontSize: 12,
        fontWeight: weightMedium,
        letterSpacing: 0.5,
        height: 1.33,
        decoration: TextDecoration.none,
      );

  static TextStyle get labelSmall => const TextStyle(
        fontFamily: fontFamilyBody,
        fontSize: 11,
        fontWeight: weightMedium,
        letterSpacing: 0.5,
        height: 1.45,
        decoration: TextDecoration.none,
      );

  // --------------- SPECIAL STYLES ---------------

  /// Hero text — Plus Jakarta Sans ExtraBold
  static TextStyle get heroText => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 40,
        fontWeight: weightExtraBold,
        letterSpacing: -0.5,
        height: 1.2,
      );

  /// Caption text — Inter Light
  static TextStyle get caption => const TextStyle(
        fontFamily: fontFamilyBody,
        fontSize: 10,
        fontWeight: weightLight,
        letterSpacing: 0.4,
        height: 1.4,
      );

  /// Overline text — Plus Jakarta Sans SemiBold
  static TextStyle get overline => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 10,
        fontWeight: weightSemiBold,
        letterSpacing: 1.5,
        height: 1.6,
      );

  /// Numeric display — Plus Jakarta Sans Bold
  static TextStyle get numericLarge => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 48,
        fontWeight: weightBold,
        letterSpacing: -1.0,
        height: 1.1,
      );

  static TextStyle get numericMedium => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 32,
        fontWeight: weightBold,
        letterSpacing: -0.5,
        height: 1.15,
      );

  static TextStyle get numericSmall => const TextStyle(
        fontFamily: fontFamilyHeading,
        fontSize: 20,
        fontWeight: weightSemiBold,
        height: 1.2,
      );

  // --------------- HELPER METHODS ---------------

  /// Create a custom text style (defaults to heading font)
  static TextStyle custom({
    required double fontSize,
    FontWeight fontWeight = weightRegular,
    double? letterSpacing,
    double? height,
    Color? color,
    FontStyle fontStyle = FontStyle.normal,
    String? fontFamily,
  }) {
    return TextStyle(
      fontFamily: fontFamily ?? fontFamilyHeading,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
      color: color,
      fontStyle: fontStyle,
    );
  }

  /// Get scaled text style for tablet (larger screens)
  /// Applies a scale factor for better readability on iPads
  static TextStyle scaled(TextStyle style, {double scaleFactor = 1.1}) {
    return style.copyWith(
      fontSize: (style.fontSize ?? 14) * scaleFactor,
    );
  }

  // Dark Theme — dark bg with gold accent (no green anywhere)
  static ThemeData get darkTheme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: darkBackground,
        colorScheme: const ColorScheme.dark(
          primary: salesOSGold,
          onPrimary: darkBackground,
          secondary: salesOSGoldLight,
          onSecondary: darkBackground,
          surface: darkSurface,
          onSurface: darkTextPrimary,
          error: error,
          onError: Colors.white,
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: darkBackground,
          foregroundColor: darkTextPrimary,
          elevation: 0,
          centerTitle: false,
          systemOverlayStyle: SystemUiOverlayStyle.light,
          titleTextStyle: titleLarge.copyWith(color: darkTextPrimary),
        ),
        cardTheme: CardThemeData(
          color: darkSurface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusLg),
            side: const BorderSide(color: darkBorder, width: 1),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: darkSurface,
          selectedItemColor: salesOSGold,
          unselectedItemColor: darkTextSecondary,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: salesOSGold,
          foregroundColor: darkBackground,
          elevation: 2,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: darkSurfaceElevated,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusXl),
            borderSide: const BorderSide(color: darkBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusXl),
            borderSide: const BorderSide(color: darkBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusXl),
            borderSide: const BorderSide(color: salesOSGold, width: 1),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: spacing16,
            vertical: spacing12,
          ),
          hintStyle: bodyMedium.copyWith(color: darkTextTertiary),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: salesOSGold,
            foregroundColor: darkBackground,
            elevation: 0,
            padding: const EdgeInsets.symmetric(
              horizontal: spacing24,
              vertical: spacing12,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusFull),
            ),
            textStyle: labelLarge.copyWith(fontWeight: weightMedium),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: salesOSGold,
            textStyle: labelLarge,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: salesOSGold,
            side: const BorderSide(color: salesOSGold),
            padding: const EdgeInsets.symmetric(
              horizontal: spacing24,
              vertical: spacing12,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusFull),
            ),
            textStyle: labelLarge,
          ),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: darkSurfaceElevated,
          selectedColor: salesOSGold.withValues(alpha: 0.2),
          labelStyle: labelMedium.copyWith(color: darkTextPrimary),
          secondaryLabelStyle: labelMedium.copyWith(color: salesOSGold),
          padding: const EdgeInsets.symmetric(horizontal: spacing12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusFull),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: darkBorder,
          thickness: 1,
          space: 1,
        ),
        textTheme: TextTheme(
          displayLarge: displayLarge.copyWith(color: darkTextPrimary),
          displayMedium: displayMedium.copyWith(color: darkTextPrimary),
          displaySmall: displaySmall.copyWith(color: darkTextPrimary),
          headlineLarge: headlineLarge.copyWith(color: darkTextPrimary),
          headlineMedium: headlineMedium.copyWith(color: darkTextPrimary),
          headlineSmall: headlineSmall.copyWith(color: darkTextPrimary),
          titleLarge: titleLarge.copyWith(color: darkTextPrimary),
          titleMedium: titleMedium.copyWith(color: darkTextPrimary),
          titleSmall: titleSmall.copyWith(color: darkTextPrimary),
          bodyLarge: bodyLarge.copyWith(color: darkTextPrimary),
          bodyMedium: bodyMedium.copyWith(color: darkTextSecondary),
          bodySmall: bodySmall.copyWith(color: darkTextTertiary),
          labelLarge: labelLarge.copyWith(color: darkTextPrimary),
          labelMedium: labelMedium.copyWith(color: darkTextSecondary),
          labelSmall: labelSmall.copyWith(color: darkTextTertiary),
        ),
      );

  // Light Theme — matches website: warm beige bg, white cards, gold accent, dark buttons
  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: lightBackground,
        colorScheme: const ColorScheme.light(
          primary: salesOSDark,           // Dark primary buttons
          onPrimary: Colors.white,
          secondary: salesOSGold,         // Gold accent
          onSecondary: salesOSDark,
          surface: lightSurface,
          onSurface: lightTextPrimary,
          error: error,
          onError: Colors.white,
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: lightBackground,
          foregroundColor: lightTextPrimary,
          elevation: 0,
          centerTitle: false,
          systemOverlayStyle: SystemUiOverlayStyle.dark,
          titleTextStyle: titleLarge.copyWith(color: lightTextPrimary),
        ),
        cardTheme: CardThemeData(
          color: lightSurface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius3xl),  // 24px like website
            side: BorderSide(color: Colors.black.withValues(alpha: 0.05), width: 1),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: lightSurface,
          selectedItemColor: salesOSDark,
          unselectedItemColor: lightTextTertiary,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: salesOSDark,
          foregroundColor: Colors.white,
          elevation: 2,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: lightSurfaceElevated,     // #F8F8F6
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusXl),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusXl),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusXl),
            borderSide: const BorderSide(color: salesOSGold, width: 1),  // Gold focus ring
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: spacing16,
            vertical: spacing12,
          ),
          hintStyle: bodyMedium.copyWith(color: lightTextTertiary),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: salesOSDark,        // Dark #1A1A1A like website
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(
              horizontal: spacing24,
              vertical: spacing12,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusFull),  // Rounded-full like website
            ),
            textStyle: labelLarge.copyWith(fontWeight: weightMedium),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: salesOSGold,
            textStyle: labelLarge,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: lightTextSecondary,
            side: BorderSide(color: Colors.black.withValues(alpha: 0.1)),
            padding: const EdgeInsets.symmetric(
              horizontal: spacing24,
              vertical: spacing12,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusFull),
            ),
            textStyle: labelLarge.copyWith(fontWeight: weightMedium),
          ),
        ),
        textTheme: TextTheme(
          displayLarge: displayLarge.copyWith(color: lightTextPrimary),
          displayMedium: displayMedium.copyWith(color: lightTextPrimary),
          displaySmall: displaySmall.copyWith(color: lightTextPrimary),
          headlineLarge: headlineLarge.copyWith(color: lightTextPrimary),
          headlineMedium: headlineMedium.copyWith(color: lightTextPrimary),
          headlineSmall: headlineSmall.copyWith(color: lightTextPrimary),
          titleLarge: titleLarge.copyWith(color: lightTextPrimary),
          titleMedium: titleMedium.copyWith(color: lightTextPrimary),
          titleSmall: titleSmall.copyWith(color: lightTextPrimary),
          bodyLarge: bodyLarge.copyWith(color: lightTextPrimary),
          bodyMedium: bodyMedium.copyWith(color: lightTextSecondary),
          bodySmall: bodySmall.copyWith(color: lightTextTertiary),
          labelLarge: labelLarge.copyWith(color: lightTextPrimary),
          labelMedium: labelMedium.copyWith(color: lightTextSecondary),
          labelSmall: labelSmall.copyWith(color: lightTextTertiary),
        ),
      );
}


// Backward compatibility alias
@Deprecated("Use SalesOSTheme instead")
typedef IrisTheme = SalesOSTheme;

