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

  testWidgets('OneSociety App boots and displays clean role profiles without raw phone numbers', (WidgetTester tester) async {
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
    expect(find.text('Choose Role'), findsOneWidget);
    expect(find.text('Custom Sign-In'), findsOneWidget);

    // Verify clean roles without raw phone strings
    expect(find.text('Resident'), findsOneWidget);
    expect(find.text('Rahul Sharma • Flat A-101'), findsOneWidget);
    expect(find.text('Society President'), findsOneWidget);
    expect(find.text('Gate Security Guard'), findsOneWidget);
    expect(find.text('Service Provider'), findsOneWidget);
    expect(find.text('Society Supplier'), findsOneWidget);
  });

  testWidgets('App renders on compact mobile phone screen (360x640) with zero RenderFlex overflow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      const ProviderScope(
        child: OneSocietyApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('OneSociety'), findsWidgets);
    expect(find.text('Choose Role'), findsOneWidget);

    // Switch to Custom Sign-In tab
    await tester.tap(find.text('Custom Sign-In'));
    await tester.pumpAndSettle();

    expect(find.text('Mobile Number or Email'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });
}
