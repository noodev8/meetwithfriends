import 'package:flutter/material.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Mock data - will be replaced with API calls
  final List<Map<String, dynamic>> _allEvents = [
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
    },
    {
      'id': 4,
      'name': 'Pizza Night',
      'groupName': 'Brookfield Socials',
      'date': 'Sat 7 Feb',
      'time': '19:00',
      'location': 'Pizza Express',
      'going': 3,
      'total': 8,
      'isGoing': false,
      'gradient': [Color(0xFFFA709A), Color(0xFFFEE140)],
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final goingEvents = _allEvents.where((e) => e['isGoing'] == true).toList();
    final upcomingEvents = _allEvents;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
            child: const Text(
              'Events',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1E293B),
                letterSpacing: -0.5,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Tab bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E293B).withOpacity(0.08),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              indicatorPadding: const EdgeInsets.all(4),
              dividerColor: Colors.transparent,
              labelColor: const Color(0xFF1E293B),
              unselectedLabelColor: const Color(0xFF64748B),
              labelStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              unselectedLabelStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              tabs: [
                Tab(text: 'Upcoming (${upcomingEvents.length})'),
                Tab(text: 'Going (${goingEvents.length})'),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildEventsList(upcomingEvents),
                _buildEventsList(goingEvents),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventsList(List<Map<String, dynamic>> events) {
    if (events.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.event_busy_rounded,
              size: 64,
              color: const Color(0xFF94A3B8).withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            const Text(
              'No events yet',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        return _CompactEventCard(event: event);
      },
    );
  }
}

class _CompactEventCard extends StatelessWidget {
  final Map<String, dynamic> event;

  const _CompactEventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final gradient = event['gradient'] as List<Color>;
    final isGoing = event['isGoing'] as bool;
    final going = event['going'] as int;
    final total = event['total'] as int?;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () {
          // Navigate to event detail
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
              // Color indicator
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: gradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    event['date'].toString().split(' ')[1],
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 14),

              // Event info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            event['name'] as String,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1E293B),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isGoing)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'GOING',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF10B981),
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${event['date']} · ${event['time']}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on_rounded,
                          size: 12,
                          color: const Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          event['location'] as String,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          total != null ? '$going/$total' : '$going going',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
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
    );
  }
}
