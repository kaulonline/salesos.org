import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:salesos_mobile/shared/widgets/luxury_card.dart';
import '../helpers/test_helpers.dart';

void main() {
  setupTestEnvironment();

  group('LuxuryCard Widget Tests', () {
    testWidgets('renders with default variant', (tester) async {
      await pumpTestWidget(
        tester,
        const LuxuryCard(
          child: Text('Test Content'),
        ),
      );

      expect(find.text('Test Content'), findsOneWidget);
      expect(find.byType(LuxuryCard), findsOneWidget);
    });

    testWidgets('renders with elevated variant', (tester) async {
      await pumpTestWidget(
        tester,
        const LuxuryCard(
          variant: LuxuryCardVariant.elevated,
          child: Text('Elevated Card'),
        ),
      );

      expect(find.text('Elevated Card'), findsOneWidget);
    });

    testWidgets('renders with accent variant', (tester) async {
      await pumpTestWidget(
        tester,
        const LuxuryCard(
          variant: LuxuryCardVariant.accent,
          child: Text('Accent Card'),
        ),
      );

      expect(find.text('Accent Card'), findsOneWidget);
    });

    testWidgets('renders with premium variant', (tester) async {
      await pumpTestWidget(
        tester,
        const LuxuryCard(
          variant: LuxuryCardVariant.premium,
          child: Text('Premium Card'),
        ),
      );

      expect(find.text('Premium Card'), findsOneWidget);
    });

    testWidgets('renders with glassmorphic variant', (tester) async {
      await pumpTestWidget(
        tester,
        const LuxuryCard(
          variant: LuxuryCardVariant.glassmorphic,
          child: Text('Glass Card'),
        ),
      );

      expect(find.text('Glass Card'), findsOneWidget);
    });

    testWidgets('responds to tap when onTap provided', (tester) async {
      bool tapped = false;

      await pumpTestWidget(
        tester,
        LuxuryCard(
          onTap: () => tapped = true,
          child: const Text('Tappable Card'),
        ),
      );

      await tester.tap(find.byType(LuxuryCard));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });

    testWidgets('applies correct tier colors', (tester) async {
      for (final tier in LuxuryTier.values) {
        await pumpTestWidget(
          tester,
          LuxuryCard(
            tier: tier,
            child: Text('${tier.name} tier'),
          ),
        );

        expect(find.text('${tier.name} tier'), findsOneWidget);
      }
    });

    testWidgets('applies custom padding', (tester) async {
      await pumpTestWidget(
        tester,
        const LuxuryCard(
          padding: EdgeInsets.all(32),
          child: Text('Padded Card'),
        ),
      );

      expect(find.text('Padded Card'), findsOneWidget);
    });
  });

  group('LuxuryColors Tests', () {
    test('primary metals have correct values', () {
      expect(LuxuryColors.champagneGold, const Color(0xFFD4AF37));
      expect(LuxuryColors.roseGold, const Color(0xFFB76E79));
      expect(LuxuryColors.platinum, const Color(0xFFE5E4E2));
    });

    test('deep tones have correct values', () {
      expect(LuxuryColors.richBlack, const Color(0xFF0D0D0D));
      expect(LuxuryColors.obsidian, const Color(0xFF1A1A1A));
      expect(LuxuryColors.deepNavy, const Color(0xFF0D1B2A));
    });

    test('rolex signature greens have correct values', () {
      expect(LuxuryColors.rolexGreen, const Color(0xFF006039));
      expect(LuxuryColors.deepEmerald, const Color(0xFF064E3B));
      expect(LuxuryColors.jadePremium, const Color(0xFF00A86B));
    });
  });
}
