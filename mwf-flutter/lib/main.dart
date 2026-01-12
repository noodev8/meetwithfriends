import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';

void main() {
  runApp(const ProviderScope(child: MeetWithFriendsApp()));
}

class MeetWithFriendsApp extends ConsumerWidget {
  const MeetWithFriendsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Meet With Friends',
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
    );
  }
}
