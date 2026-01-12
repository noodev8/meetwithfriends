import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meetwithfriends/main.dart';

void main() {
  testWidgets('App renders splash screen initially', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: MeetWithFriendsApp()));

    // Should show splash screen initially
    expect(find.text('Meet With Friends'), findsOneWidget);
  });
}
