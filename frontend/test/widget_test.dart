import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:frontend/main.dart';
import 'package:frontend/core/network/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await ApiClient.init();
  });

  testWidgets('OneSociety App boots and displays login screen with phone authentication', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      const ProviderScope(
        child: OneSocietyApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('OneSociety'), findsWidgets);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Phone Number / Mobile'), findsOneWidget);
    expect(find.text('Quick Demo Login Credentials (Phone / Password):'), findsOneWidget);
    expect(find.text('President (9876543210)'), findsOneWidget);
    expect(find.text('Guard - Gate (9876543220)'), findsOneWidget);
  });

  testWidgets('Quick demo button populates mobile number field', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      const ProviderScope(
        child: OneSocietyApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Tap Guard demo button
    final guardBtn = find.text('Guard - Gate (9876543220)');
    expect(guardBtn, findsOneWidget);
    await tester.ensureVisible(guardBtn);
    await tester.tap(guardBtn);
    await tester.pumpAndSettle();

    // Verify phone field contains Guard's phone
    expect(find.text('9876543220'), findsOneWidget);
  });
}
