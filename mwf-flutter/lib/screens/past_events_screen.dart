import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/event.dart';
import '../services/events_service.dart';
import 'event_detail_screen.dart';

class PastEventsScreen extends StatefulWidget {
  final int groupId;
  final String groupName;

  const PastEventsScreen({
    super.key,
    required this.groupId,
    required this.groupName,
  });

  @override
  State<PastEventsScreen> createState() => _PastEventsScreenState();
}

class _PastEventsScreenState extends State<PastEventsScreen> {
  final EventsService _eventsService = EventsService();

  bool _isLoading = true;
  String? _error;
  List<Event> _events = [];

  @override
  void initState() {
    super.initState();
    _loadPastEvents();
  }

  Future<void> _loadPastEvents() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await _eventsService.getPastEvents(groupId: widget.groupId);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (result.success) {
          _events = result.events ?? [];
        } else {
          _error = result.error ?? 'Failed to load past events';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back_rounded),
          color: const Color(0xFF1E293B),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Past Events',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
            ),
            Text(
              widget.groupName,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: const Color(0xFFE2E8F0),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
            )
          : _error != null
              ? _buildErrorState()
              : _buildEventsList(),
    );
  }

  Widget _buildErrorState() {
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
              onPressed: _loadPastEvents,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
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

  Widget _buildEventsList() {
    if (_events.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.event_rounded,
                  size: 40,
                  color: Color(0xFF94A3B8),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'No past events yet',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Events will appear here after they\'ve ended',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPastEvents,
      color: const Color(0xFF7C3AED),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _events.length,
        itemBuilder: (context, index) => _buildEventCard(_events[index]),
      ),
    );
  }

  Widget _buildEventCard(Event event) {
    final eventDate = event.dateTime;
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final timeFormat = DateFormat('HH:mm');

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => EventDetailScreen(eventId: event.id),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            // Date badge
            Container(
              width: 60,
              height: 70,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    months[eventDate.month - 1],
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  Text(
                    '${eventDate.day}',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF475569),
                    ),
                  ),
                  Text(
                    '${eventDate.year}',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(width: 16),

            // Event details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    event.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 6),

                  // Time and location
                  Row(
                    children: [
                      Text(
                        timeFormat.format(eventDate),
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      if (event.location != null) ...[
                        const Text(
                          ' · ',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
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
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Attendance info and user status
                  Row(
                    children: [
                      Text(
                        '${event.attendeeCount} attended',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                      if (event.isGoing) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'You went',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF15803D),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 8),

            // Arrow
            Icon(
              Icons.chevron_right_rounded,
              color: Colors.grey.shade300,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
