import 'package:flutter_test/flutter_test.dart';
import 'package:avraffle/main.dart';

void main() {
  testWidgets('Raffle smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const AVRaffleApp());
    expect(find.text('AV-Raffle System'), findsOneWidget);
  });
}
