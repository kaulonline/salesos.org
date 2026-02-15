import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:salesos_mobile/app.dart';

import 'helpers/test_helpers.dart';

void main() {
  setupTestEnvironment();

  testWidgets('App loads successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: SalesOSApp(),
      ),
    );

    // Pump enough time to let animations and timers settle
    await tester.pump(const Duration(seconds: 2));
    await tester.pump(const Duration(seconds: 2));

    // Basic smoke test - app should render without crashing
    expect(find.byType(SalesOSApp), findsOneWidget);
  });
}
