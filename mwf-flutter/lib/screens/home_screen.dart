import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/event_categories.dart';
import '../models/event.dart';
import '../models/user.dart';
import '../services/events_service.dart';
import '../services/groups_service.dart';
import 'create_group_screen.dart';
import 'discover_groups_screen.dart';
import 'event_detail_screen.dart';


class HomeScreen extends StatefulWidget {
  final User user;
  final VoidCallback onViewAllEvents;
  final VoidCallback onViewEventsGoing;
  final VoidCallback onViewAllGroups;
  final VoidCallback onViewProfile;

  const HomeScreen({
    super.key,
    required this.user,
    required this.onViewAllEvents,
    required this.onViewEventsGoing,
    required this.onViewAllGroups,
    required this.onViewProfile,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  final EventsService _eventsService = EventsService();
  final GroupsService _groupsService = GroupsService();

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  bool _isLoading = true;
  String? _error;
  int _totalEventCount = 0;
  int _groupCount = 0;
  bool _hasGroups = false;
  Event? _nextEvent;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutCubic),
      ),
    );

    _loadData();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final results = await Future.wait([
      _eventsService.getMyEvents(),
      _groupsService.getMyGroups(),
    ]);

    final eventsResult = results[0] as EventsResult;
    final groupsResult = results[1] as GroupsResult;

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (eventsResult.success && groupsResult.success) {
          final events = eventsResult.events ?? [];
          final groups = groupsResult.groups ?? [];
          _totalEventCount = events.length;
          final goingEvents = events.where((e) => e.isGoing || e.isWaitlisted).toList();
          _groupCount = groups.length;
          _hasGroups = groups.isNotEmpty;

          // Find next upcoming event the user is going to
          final now = DateTime.now();
          final upcoming = goingEvents
              .where((e) => e.dateTime.isAfter(now) && !e.isCancelled)
              .toList()
            ..sort((a, b) => a.dateTime.compareTo(b.dateTime));
          _nextEvent = upcoming.isNotEmpty ? upcoming.first : null;

          _animationController.forward();
        } else {
          _error = eventsResult.error ?? groupsResult.error ?? 'Failed to load data';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final firstName = widget.user.name.split(' ').first;
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          color: Color(0xFF7C3AED),
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline_rounded,
                size: 64,
                color: Colors.red.shade300,
              ),
              const SizedBox(height: 16),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 16,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loadData,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // New user empty state - no groups yet
    if (!_hasGroups) {
      return _buildNewUserEmptyState(firstName);
    }

    return SafeArea(
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: RefreshIndicator(
            onRefresh: _loadData,
            color: const Color(0xFF7C3AED),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 800),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Greeting with avatar
                        Row(
                          children: [
                            GestureDetector(
                              onTap: widget.onViewProfile,
                              child: Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: const Color(0xFF7C3AED).withAlpha(80),
                                    width: 2.5,
                                  ),
                                ),
                                child: ClipOval(
                                  child: widget.user.avatarUrl != null && widget.user.avatarUrl!.isNotEmpty
                                      ? Image.network(
                                          widget.user.avatarUrl!,
                                          width: 47,
                                          height: 47,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => _buildInitialsAvatar(),
                                        )
                                      : _buildInitialsAvatar(),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '$greeting,',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                  Text(
                                    firstName,
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF1E293B),
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 28),

                        // Stat tiles
                        Row(
                          children: [
                            Expanded(
                              child: _StatTile(
                                icon: Icons.event_rounded,
                                iconColor: const Color(0xFF7C3AED),
                                iconBgColor: const Color(0xFFF5F3FF),
                                title: 'Events',
                                subtitle: _totalEventCount == 0
                                    ? 'No upcoming'
                                    : '$_totalEventCount upcoming',
                                subtitleColor: const Color(0xFF64748B),
                                onTap: widget.onViewAllEvents,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _StatTile(
                                icon: Icons.people_rounded,
                                iconColor: const Color(0xFF7C3AED),
                                iconBgColor: const Color(0xFFF5F3FF),
                                title: 'Groups',
                                subtitle: '$_groupCount active',
                                subtitleColor: const Color(0xFF64748B),
                                onTap: widget.onViewAllGroups,
                              ),
                            ),
                          ],
                        ),

                        // Next Up section
                        if (_nextEvent != null) ...[
                          const SizedBox(height: 28),
                          _buildNextUpSection(_nextEvent!),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _relativeDate(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final eventDay = DateTime(dateTime.year, dateTime.month, dateTime.day);
    final diff = eventDay.difference(today).inDays;

    if (diff == 0) return 'TODAY';
    if (diff == 1) return 'TOMORROW';
    if (diff < 7) return DateFormat('EEEE').format(dateTime).toUpperCase();
    return DateFormat('MMM d').format(dateTime).toUpperCase();
  }

  Widget _buildNextUpSection(Event event) {
    final catConfig = getCategoryConfig(event.category);
    final relDate = _relativeDate(event.dateTime);
    final time = DateFormat('HH:mm').format(event.dateTime);
    final capacityText = event.capacity != null
        ? '${event.attendeeCount}/${event.capacity}'
        : '${event.attendeeCount}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Next Up',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1E293B),
              ),
            ),
            const Spacer(),
            GestureDetector(
              onTap: widget.onViewEventsGoing,
              child: const Row(
                children: [
                  Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF7C3AED),
                    ),
                  ),
                  SizedBox(width: 2),
                  Icon(
                    Icons.arrow_forward_rounded,
                    size: 16,
                    color: Color(0xFF7C3AED),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => EventDetailScreen(eventId: event.id),
              ),
            ).then((_) => _loadData());
          },
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1E293B).withAlpha(10),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Gradient header strip
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: catConfig.gradient),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Date label + attendee count
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: relDate == 'TODAY' || relDate == 'TOMORROW'
                                  ? const Color(0xFF7C3AED).withAlpha(20)
                                  : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '$relDate  ·  $time',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: relDate == 'TODAY' || relDate == 'TOMORROW'
                                    ? const Color(0xFF7C3AED)
                                    : const Color(0xFF64748B),
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Icon(
                            Icons.people_rounded,
                            size: 14,
                            color: const Color(0xFF64748B),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$capacityText going',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // Event title
                      Text(
                        event.title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E293B),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (event.location != null && event.location!.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(
                              Icons.location_on_outlined,
                              size: 14,
                              color: const Color(0xFF94A3B8),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                event.location!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF64748B),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 8),
                      // Group name
                      Row(
                        children: [
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: catConfig.gradient.first.withAlpha(30),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Icon(
                              catConfig.icon,
                              size: 12,
                              color: catConfig.gradient.first,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              event.groupName,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF94A3B8),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInitialsAvatar() {
    return Container(
      width: 47,
      height: 47,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF7C3AED)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          widget.user.initials,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildNewUserEmptyState(String firstName) {
    return SafeArea(
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: RefreshIndicator(
            onRefresh: _loadData,
            color: const Color(0xFF7C3AED),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 600),
                  child: Column(
                    children: [
                      const SizedBox(height: 40),

                      // Welcome icon
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFFEEF2FF),
                              const Color(0xFFF5F3FF),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Center(
                          child: Text(
                            '👋',
                            style: TextStyle(fontSize: 40),
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Welcome message
                      Text(
                        'Welcome, $firstName!',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                          letterSpacing: -0.5,
                        ),
                      ),

                      const SizedBox(height: 8),

                      const Text(
                        'Create a group to start organizing events, or browse existing ones.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          color: Color(0xFF64748B),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Create Group button
                      Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF6366F1), Color(0xFF7C3AED)],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF7C3AED).withAlpha(77),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) => const CreateGroupScreen(),
                              ),
                            ).then((_) => _loadData());
                          },
                          icon: const Icon(Icons.add_rounded, size: 20),
                          label: const Text(
                            'Create a Group',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            foregroundColor: Colors.white,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Browse groups link
                      TextButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => const DiscoverGroupsScreen(),
                            ),
                          ).then((_) => _loadData());
                        },
                        icon: const Icon(Icons.explore_outlined, size: 18),
                        label: const Text('Browse groups'),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF64748B),
                        ),
                      ),

                      const SizedBox(height: 32),

                      // How it works section
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.info_outline_rounded,
                                  size: 20,
                                  color: const Color(0xFF6366F1),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'How it works',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1E293B),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            _buildHowItWorksStep(
                              '1',
                              'Join or create a group',
                              'For your dinner club, hiking crew, or any regular meetup',
                            ),
                            const SizedBox(height: 12),
                            _buildHowItWorksStep(
                              '2',
                              'Invite your people',
                              'Share the link and they can join instantly',
                            ),
                            const SizedBox(height: 12),
                            _buildHowItWorksStep(
                              '3',
                              'Plan events together',
                              'Create events, collect RSVPs, and actually meet up',
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHowItWorksStep(String number, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: const Color(0xFFEEF2FF),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF6366F1),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final String title;
  final String subtitle;
  final Color subtitleColor;
  final VoidCallback onTap;

  const _StatTile({
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.title,
    required this.subtitle,
    required this.subtitleColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E293B).withAlpha(10),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconBgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: subtitleColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
