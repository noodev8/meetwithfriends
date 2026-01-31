import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/user.dart';
import '../services/main_tab_controller.dart';
import 'home_screen.dart';
import 'events_screen.dart';
import 'groups_screen.dart';
import 'profile_screen.dart';

class MainShell extends StatefulWidget {
  final User user;
  final VoidCallback onLogout;
  final Function(User) onUserUpdated;

  const MainShell({
    super.key,
    required this.user,
    required this.onLogout,
    required this.onUserUpdated,
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  final _tabController = MainTabController();
  final _eventsScreenKey = GlobalKey<EventsScreenState>();

  @override
  void initState() {
    super.initState();
    // Listen for tab change requests from nested screens
    _tabController.tabIndex.addListener(_onTabChangeRequested);
  }

  @override
  void dispose() {
    _tabController.tabIndex.removeListener(_onTabChangeRequested);
    super.dispose();
  }

  void _onTabChangeRequested() {
    final newIndex = _tabController.tabIndex.value;
    if (newIndex != _currentIndex) {
      setState(() => _currentIndex = newIndex);
    }
  }

  /// Switch tab and keep the controller in sync so nested screens
  /// can always navigate back to the correct tab via ValueNotifier.
  void _switchTab(int index) {
    setState(() => _currentIndex = index);
    // Sync the controller so the ValueNotifier always reflects the
    // current tab – prevents stale values when nested screens call
    // switchToTab with the same index later.
    _tabController.tabIndex.value = index;
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFFAFAFC),
        body: IndexedStack(
          index: _currentIndex,
          children: [
            HomeScreen(
              user: widget.user,
              onViewAllEvents: () {
                _eventsScreenKey.currentState?.setFilter(EventFilter.all);
                _switchTab(1);
              },
              onViewEventsGoing: () {
                _eventsScreenKey.currentState?.setFilter(EventFilter.going);
                _switchTab(1);
              },
              onViewAllGroups: () => _switchTab(2),
              onViewProfile: () => _switchTab(3),
            ),
            EventsScreen(key: _eventsScreenKey, onBackToHome: () => _switchTab(0)),
            GroupsScreen(onBackToHome: () => _switchTab(0)),
            ProfileScreen(
              user: widget.user,
              onLogout: widget.onLogout,
              onUserUpdated: widget.onUserUpdated,
            ),
          ],
        ),
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E293B).withValues(alpha: 0.06),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(0, Icons.home_rounded, 'Home'),
                  _buildNavItem(1, Icons.calendar_month_rounded, 'Events'),
                  _buildNavItem(2, Icons.people_rounded, 'Groups'),
                  _buildNavItem(3, Icons.person_rounded, 'Profile'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;

    return GestureDetector(
      onTap: () => _switchTab(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: isSelected ? 20 : 16,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF7C3AED).withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 24,
              color: isSelected
                  ? const Color(0xFF7C3AED)
                  : const Color(0xFF94A3B8),
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF7C3AED),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
