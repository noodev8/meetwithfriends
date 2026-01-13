import 'package:flutter/material.dart';

class HomeScreen extends StatefulWidget {
  final String userName;
  final VoidCallback onViewAllEvents;
  final VoidCallback onViewAllGroups;

  const HomeScreen({
    super.key,
    required this.userName,
    required this.onViewAllEvents,
    required this.onViewAllGroups,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  // Mock data - will be replaced with API calls
  final List<Map<String, dynamic>> _upcomingEvents = [
    {
      'id': 1,
      'name': 'Corbet Arms',
      'groupName': 'Brookfield Socials',
      'date': 'Sat 17 Jan',
      'time': '18:00',
      'location': 'Corbet Arms',
      'going': 5,
      'total': 10,
      'isGoing': true,
      'gradient': [Color(0xFF667EEA), Color(0xFF764BA2)],
      'icon': Icons.restaurant_rounded,
    },
    {
      'id': 2,
      'name': 'Coffee Morning',
      'groupName': 'Brookfield Socials',
      'date': 'Thu 22 Jan',
      'time': '15:00',
      'location': 'Luv To Stay',
      'going': 1,
      'total': null,
      'isGoing': true,
      'gradient': [Color(0xFFF093FB), Color(0xFFF5576C)],
      'icon': Icons.coffee_rounded,
    },
    {
      'id': 3,
      'name': 'Umami Night',
      'groupName': 'Brookfield Socials',
      'date': 'Fri 30 Jan',
      'time': '19:30',
      'location': 'Umami Restaurant',
      'going': 1,
      'total': 6,
      'isGoing': false,
      'gradient': [Color(0xFF4FACFE), Color(0xFF00F2FE)],
      'icon': Icons.ramen_dining_rounded,
    },
  ];

  final List<Map<String, dynamic>> _groups = [
    {
      'id': 1,
      'name': 'Brookfield Socials',
      'members': 9,
      'role': 'Organiser',
      'initial': 'BS',
      'color': Color(0xFF10B981),
    },
  ];

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

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final firstName = widget.userName.split(' ').first;

    return SafeArea(
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello, $firstName!',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_upcomingEvents.length} upcoming events',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B).withOpacity(0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Upcoming Events Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Upcoming Events',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                          letterSpacing: -0.3,
                        ),
                      ),
                      GestureDetector(
                        onTap: widget.onViewAllEvents,
                        child: Row(
                          children: [
                            Text(
                              'View all',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF7C3AED).withOpacity(0.9),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(
                              Icons.arrow_forward_rounded,
                              size: 16,
                              color: const Color(0xFF7C3AED).withOpacity(0.9),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Event Cards
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final event = _upcomingEvents[index];
                    return _EventCard(
                      event: event,
                      delay: index * 100,
                    );
                  },
                  childCount: _upcomingEvents.length > 3 ? 3 : _upcomingEvents.length,
                ),
              ),

              // Your Groups Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 32, 20, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Your Groups',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                          letterSpacing: -0.3,
                        ),
                      ),
                      GestureDetector(
                        onTap: widget.onViewAllGroups,
                        child: Row(
                          children: [
                            Text(
                              'See all',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF7C3AED).withOpacity(0.9),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(
                              Icons.arrow_forward_rounded,
                              size: 16,
                              color: const Color(0xFF7C3AED).withOpacity(0.9),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Group Cards
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final group = _groups[index];
                    return _GroupCard(group: group);
                  },
                  childCount: _groups.length,
                ),
              ),

              // Bottom padding
              const SliverToBoxAdapter(
                child: SizedBox(height: 24),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final Map<String, dynamic> event;
  final int delay;

  const _EventCard({
    required this.event,
    required this.delay,
  });

  @override
  Widget build(BuildContext context) {
    final gradient = event['gradient'] as List<Color>;
    final isGoing = event['isGoing'] as bool;
    final going = event['going'] as int;
    final total = event['total'] as int?;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: GestureDetector(
        onTap: () {
          // Navigate to event detail
        },
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: gradient[0].withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: gradient,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  // Background pattern
                  Positioned(
                    right: -20,
                    top: -20,
                    child: Icon(
                      event['icon'] as IconData,
                      size: 120,
                      color: Colors.white.withOpacity(0.15),
                    ),
                  ),

                  // Content
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Top row: badge and attendance
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Attendance pill
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                total != null ? '$going/$total going' : '$going going',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ),

                            // Going badge
                            if (isGoing)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Text(
                                  'Going',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                          ],
                        ),

                        const SizedBox(height: 40),

                        // Group name
                        Text(
                          (event['groupName'] as String).toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white.withOpacity(0.85),
                            letterSpacing: 1.2,
                          ),
                        ),

                        const SizedBox(height: 4),

                        // Event name
                        Text(
                          event['name'] as String,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),

                        const SizedBox(height: 12),

                        // Date and location
                        Row(
                          children: [
                            Icon(
                              Icons.calendar_today_rounded,
                              size: 14,
                              color: Colors.white.withOpacity(0.9),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '${event['date']} · ${event['time']}',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Colors.white.withOpacity(0.9),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 6),

                        Row(
                          children: [
                            Icon(
                              Icons.location_on_rounded,
                              size: 14,
                              color: Colors.white.withOpacity(0.9),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              event['location'] as String,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Colors.white.withOpacity(0.9),
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
        ),
      ),
    );
  }
}

class _GroupCard extends StatelessWidget {
  final Map<String, dynamic> group;

  const _GroupCard({required this.group});

  @override
  Widget build(BuildContext context) {
    final color = group['color'] as Color;
    final role = group['role'] as String?;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: GestureDetector(
        onTap: () {
          // Navigate to group detail
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFFE2E8F0),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E293B).withOpacity(0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    group['initial'] as String,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 14),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            group['name'] as String,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1E293B),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (role != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF7C3AED).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              role.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF7C3AED),
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${group['members']} members',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),

              // Arrow
              Icon(
                Icons.chevron_right_rounded,
                color: const Color(0xFF94A3B8).withOpacity(0.8),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
