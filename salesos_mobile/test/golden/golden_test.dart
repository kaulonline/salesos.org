// IRIS Mobile - Golden (Visual Regression) Tests
//
// Golden tests capture screenshots and compare them against saved "golden" files.
// This helps catch unintended visual changes.
//
// Commands:
//   flutter test test/golden/               # Run golden tests (compare)
//   flutter test --update-goldens test/golden/  # Update golden files
//
// Note: Golden files are platform-specific. Generate them on the same platform
// where CI will run tests.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';

import 'package:salesos_mobile/shared/widgets/luxury_card.dart';

void main() {
  setUpAll(() async {
    // Load fonts for golden tests
    await loadAppFonts();
  });

  group('LuxuryCard Golden Tests', () {
    testGoldens('LuxuryCard variants - dark theme', (tester) async {
      final builder = GoldenBuilder.grid(
        columns: 3,
        widthToHeightRatio: 1.2,
      )
        ..addScenario(
          'Standard',
          const LuxuryCard(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Standard Card'),
            ),
          ),
        )
        ..addScenario(
          'Elevated',
          const LuxuryCard(
            variant: LuxuryCardVariant.elevated,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Elevated Card'),
            ),
          ),
        )
        ..addScenario(
          'Accent',
          const LuxuryCard(
            variant: LuxuryCardVariant.accent,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Accent Card'),
            ),
          ),
        )
        ..addScenario(
          'Premium',
          const LuxuryCard(
            variant: LuxuryCardVariant.premium,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Premium Card'),
            ),
          ),
        )
        ..addScenario(
          'Bordered',
          const LuxuryCard(
            variant: LuxuryCardVariant.bordered,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Bordered Card'),
            ),
          ),
        )
        ..addScenario(
          'Glassmorphic',
          const LuxuryCard(
            variant: LuxuryCardVariant.glassmorphic,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Glass Card'),
            ),
          ),
        );

      await tester.pumpWidgetBuilder(
        builder.build(),
        wrapper: materialAppWrapper(
          theme: ThemeData.dark(),
        ),
      );

      await screenMatchesGolden(
        tester,
        'luxury_card_variants_dark',
      );
    });

    testGoldens('LuxuryCard tiers - emerald theme', (tester) async {
      final builder = GoldenBuilder.grid(
        columns: 3,
        widthToHeightRatio: 1.2,
      )
        ..addScenario(
          'Gold',
          const LuxuryCard(
            tier: LuxuryTier.gold,
            variant: LuxuryCardVariant.accent,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Gold Tier'),
            ),
          ),
        )
        ..addScenario(
          'Platinum',
          const LuxuryCard(
            tier: LuxuryTier.platinum,
            variant: LuxuryCardVariant.accent,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Platinum Tier'),
            ),
          ),
        )
        ..addScenario(
          'Diamond',
          const LuxuryCard(
            tier: LuxuryTier.diamond,
            variant: LuxuryCardVariant.accent,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Diamond Tier'),
            ),
          ),
        )
        ..addScenario(
          'Royal',
          const LuxuryCard(
            tier: LuxuryTier.royal,
            variant: LuxuryCardVariant.accent,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Royal Tier'),
            ),
          ),
        )
        ..addScenario(
          'Emerald',
          const LuxuryCard(
            tier: LuxuryTier.emerald,
            variant: LuxuryCardVariant.accent,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Emerald Tier'),
            ),
          ),
        )
        ..addScenario(
          'Rose Gold',
          const LuxuryCard(
            tier: LuxuryTier.roseGold,
            variant: LuxuryCardVariant.accent,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Rose Gold Tier'),
            ),
          ),
        );

      await tester.pumpWidgetBuilder(
        builder.build(),
        wrapper: materialAppWrapper(
          theme: ThemeData.dark(),
        ),
      );

      await screenMatchesGolden(
        tester,
        'luxury_card_tiers',
      );
    });
  });

  group('Device Size Golden Tests', () {
    testGoldens('LuxuryCard on multiple devices', (tester) async {
      await tester.pumpWidgetBuilder(
        const Center(
          child: LuxuryCard(
            variant: LuxuryCardVariant.premium,
            tier: LuxuryTier.emerald,
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.star, color: LuxuryColors.champagneGold, size: 48),
                  SizedBox(height: 16),
                  Text(
                    'Premium Card',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text('Responsive test across devices'),
                ],
              ),
            ),
          ),
        ),
        wrapper: materialAppWrapper(
          theme: ThemeData.dark(),
        ),
      );

      await multiScreenGolden(
        tester,
        'luxury_card_responsive',
        devices: [
          Device.phone,
          Device.iphone11,
          Device.tabletPortrait,
          Device.tabletLandscape,
        ],
      );
    });
  });
}
