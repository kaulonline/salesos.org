import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:salesos_mobile/app.dart';

void main() {
  testWidgets('App loads successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: IrisApp(),
      ),
    );

    // Pump only once to render initial frame (don't use pumpAndSettle
    // as it will wait for timers that never complete)
    await tester.pump();

    // Basic smoke test - app should render without crashing
    expect(find.byType(IrisApp), findsOneWidget);

    // Allow pending timers to be ignored in test cleanup
    // This is necessary because the app starts background services
    await tester.pump(const Duration(milliseconds: 100));
  });
}
