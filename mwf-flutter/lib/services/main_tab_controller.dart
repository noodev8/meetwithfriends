import 'package:flutter/foundation.dart';

/// Simple singleton to coordinate tab switching from nested screens.
/// When a detail screen wants to navigate to a main tab, it sets the
/// desired index here and pops back. MainShell listens and switches tabs.
class MainTabController {
  // Singleton instance
  static final MainTabController _instance = MainTabController._internal();
  factory MainTabController() => _instance;
  MainTabController._internal();

  /// The tab index to switch to. Listened to by MainShell.
  final ValueNotifier<int> tabIndex = ValueNotifier<int>(0);

  /// Request navigation to a specific tab from a nested screen.
  /// Call this before popping back to MainShell.
  void switchToTab(int index) {
    tabIndex.value = index;
  }
}
