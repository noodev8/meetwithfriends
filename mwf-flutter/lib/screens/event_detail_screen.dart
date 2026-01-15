import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/events_service.dart';
import '../config/event_categories.dart';
import '../widgets/bottom_nav_bar.dart';
import 'attendees_screen.dart';

class EventDetailScreen extends StatefulWidget {
  final int eventId;
  final VoidCallback? onBack;

  const EventDetailScreen({
    super.key,
    required this.eventId,
    this.onBack,
  });

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  final EventsService _eventsService = EventsService();

  bool _isLoading = true;
  bool _rsvpLoading = false;
  String? _error;
  EventDetail? _event;
  RsvpStatus? _rsvp;
  List<EventHost> _hosts = [];
  bool _isGroupMember = false;
  bool _canEdit = false;

  @override
  void initState() {
    super.initState();
    _loadEvent();
  }

  Future<void> _loadEvent() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await _eventsService.getEvent(widget.eventId);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (result.success) {
          _event = result.event;
          _rsvp = result.rsvp;
          _hosts = result.hosts ?? [];
          _isGroupMember = result.isGroupMember;
          _canEdit = result.canEdit;
        } else {
          _error = result.error ?? 'Failed to load event';
        }
      });
    }
  }

  Future<void> _handleRsvp(String action) async {
    if (_event == null) return;

    setState(() => _rsvpLoading = true);

    final result = await _eventsService.rsvpEvent(_event!.id, action);

    if (mounted) {
      setState(() => _rsvpLoading = false);

      if (result.success) {
        // Update local RSVP state
        setState(() => _rsvp = result.rsvp);
        // Reload full event data to get updated counts
        _loadEvent();
      } else {
        // Show error snackbar
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to update RSVP'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    }
  }

  void _navigateToAttendees(EventDetail event, DateFormat dateFormat, DateFormat timeFormat) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AttendeesScreen(
          eventId: event.id,
          eventTitle: event.title,
          eventDate: '${dateFormat.format(event.dateTime)} at ${timeFormat.format(event.dateTime)}',
          eventLocation: event.location,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
            )
          : _error != null
              ? _buildErrorState()
              : _buildContent(),
      bottomNavigationBar: BottomNavBar(
        currentIndex: 1, // Events tab
        onTap: (index) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        },
      ),
    );
  }

  Widget _buildErrorState() {
    return SafeArea(
      child: Column(
        children: [
          _buildAppBar(),
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      '🎫',
                      style: TextStyle(fontSize: 64),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Event not found',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _error ?? 'This event may have been removed.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _loadEvent,
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
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(
            onPressed: widget.onBack ?? () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back_rounded),
            color: const Color(0xFF1E293B),
          ),
          if (_event != null) ...[
            Expanded(
              child: GestureDetector(
                onTap: () {
                  // TODO: Navigate to group
                },
                child: Text(
                  _event!.groupName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF7C3AED),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ] else
            const Spacer(),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final event = _event!;
    final categoryConfig = getCategoryConfig(event.category);
    final dateFormat = DateFormat('EEEE, d MMMM yyyy');
    final timeFormat = DateFormat('HH:mm');

    return SafeArea(
      bottom: false, // Let bottom nav handle safe area
      child: Column(
        children: [
          // App Bar
          _buildAppBar(),

          // Scrollable Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadEvent,
              color: const Color(0xFF7C3AED),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Hero Card
                        _buildHeroCard(event, categoryConfig, dateFormat, timeFormat),

                        // About Section
                    if (event.description != null && event.description!.isNotEmpty)
                      _buildAboutSection(event),

                    // Attendees Section
                    _buildAttendeesSection(event),

                    // RSVP Section (inline, not sticky)
                    if (!event.isPast && !event.isCancelled)
                      _buildRsvpSection(event),

                    const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroCard(
    EventDetail event,
    CategoryConfig categoryConfig,
    DateFormat dateFormat,
    DateFormat timeFormat,
  ) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
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
          // Gradient Header with Title
          Container(
            height: 140,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: categoryConfig.gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Stack(
              children: [
                // Large icon (background)
                Positioned(
                  right: 20,
                  top: 20,
                  child: Icon(
                    categoryConfig.icon,
                    size: 100,
                    color: Colors.white.withAlpha(50),
                  ),
                ),
                // Status badges
                if (event.isCancelled || event.isPast)
                  Positioned(
                    left: 16,
                    top: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: event.isCancelled
                            ? Colors.red.shade100
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        event.isCancelled ? 'Cancelled' : 'Past Event',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: event.isCancelled
                              ? Colors.red.shade700
                              : Colors.grey.shade700,
                        ),
                      ),
                    ),
                  ),
                // Title at bottom
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: 16,
                  child: Text(
                    event.title,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Event Info
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

                // Date & Time
                Row(
                  children: [
                    const Text('📅', style: TextStyle(fontSize: 18)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${dateFormat.format(event.dateTime)} • ${timeFormat.format(event.dateTime)}',
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF475569),
                        ),
                      ),
                    ),
                  ],
                ),

                // Location
                if (event.location != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Text('📍', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          event.location!,
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF475569),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],

                // Host
                const SizedBox(height: 16),
                _buildHostRow(),

                // Status badges and actions
                const SizedBox(height: 16),
                _buildStatusRow(event),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHostRow() {
    final host = _hosts.isNotEmpty ? _hosts[0] : null;
    final hostName = host?.name ?? _event!.creatorName;
    final hostAvatarUrl = host?.avatarUrl;
    final hostInitial = hostName.isNotEmpty ? hostName[0].toUpperCase() : '?';

    return Row(
      children: [
        // Host Avatar (tappable)
        GestureDetector(
          onTap: host != null ? () => _showHostAvatarPopup(host) : null,
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              gradient: hostAvatarUrl == null
                  ? const LinearGradient(
                      colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              borderRadius: BorderRadius.circular(16),
              image: hostAvatarUrl != null
                  ? DecorationImage(
                      image: NetworkImage(hostAvatarUrl),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: hostAvatarUrl == null
                ? Center(
                    child: Text(
                      hostInitial,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF6366F1),
                      ),
                    ),
                  )
                : null,
          ),
        ),
        const SizedBox(width: 10),
        Text(
          'Hosted by ',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade600,
          ),
        ),
        Text(
          hostName,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1E293B),
          ),
        ),
        if (_hosts.length > 1) ...[
          Text(
            ' +${_hosts.length - 1} other${_hosts.length > 2 ? 's' : ''}',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatusRow(EventDetail event) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        // RSVP Status
        if (_rsvp != null && _rsvp!.status != 'not_going' && !event.isPast && !event.isCancelled)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _rsvp!.isAttending
                  ? const Color(0xFFDCFCE7)
                  : const Color(0xFFFEF9C3),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _rsvp!.isAttending
                  ? "You're going"
                  : 'Waitlist #${_rsvp!.waitlistPosition}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _rsvp!.isAttending
                    ? const Color(0xFF166534)
                    : const Color(0xFF854D0E),
              ),
            ),
          ),

        // Edit button
        if (_canEdit && !event.isPast)
          GestureDetector(
            onTap: () {
              // TODO: Navigate to edit event
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.edit_outlined,
                    size: 16,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Edit',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildAboutSection(EventDetail event) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'About this event',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _stripHtmlTags(event.description ?? ''),
            style: const TextStyle(
              fontSize: 14,
              height: 1.6,
              color: Color(0xFF475569),
            ),
          ),
        ],
      ),
    );
  }

  String _stripHtmlTags(String htmlString) {
    return htmlString
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .trim();
  }

  Widget _buildAttendeesSection(EventDetail event) {
    final spotsText = event.capacity != null
        ? event.isFull
            ? 'Waitlist open'
            : '${event.spotsRemaining} spots left'
        : null;
    final dateFormat = DateFormat('EEE d MMM');
    final timeFormat = DateFormat('HH:mm');

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Attendees',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${event.attendeeCount} going',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF64748B),
                ),
              ),
              const Spacer(),
              if (_isGroupMember)
                GestureDetector(
                  onTap: () => _navigateToAttendees(event, dateFormat, timeFormat),
                  child: const Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF7C3AED),
                    ),
                  ),
                ),
              if (spotsText != null) ...[
                const Text(
                  ' • ',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                ),
                Text(
                  spotsText,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: event.isFull ? FontWeight.w600 : FontWeight.w400,
                    color: event.isFull
                        ? const Color(0xFFD97706)
                        : const Color(0xFF64748B),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),

          if (_isGroupMember && event.attendeeCount > 0)
            // Show host avatars as preview
            Row(
              children: [
                ..._hosts.take(4).map((host) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Column(
                        children: [
                          GestureDetector(
                            onTap: () => _showHostAvatarPopup(host),
                            child: Stack(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  gradient: host.avatarUrl == null
                                      ? const LinearGradient(
                                          colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                                        )
                                      : null,
                                  borderRadius: BorderRadius.circular(28),
                                  image: host.avatarUrl != null
                                      ? DecorationImage(
                                          image: NetworkImage(host.avatarUrl!),
                                          fit: BoxFit.cover,
                                        )
                                      : null,
                                ),
                                child: host.avatarUrl == null
                                    ? Center(
                                        child: Text(
                                          host.name.isNotEmpty
                                              ? host.name[0].toUpperCase()
                                              : '?',
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF6366F1),
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                              Positioned(
                                bottom: 0,
                                left: 0,
                                right: 0,
                                child: Center(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF6366F1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Host',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          ),
                          const SizedBox(height: 6),
                          SizedBox(
                            width: 60,
                            child: Text(
                              host.name.split(' ').first,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF1E293B),
                              ),
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    )),
                if (event.attendeeCount > _hosts.length)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Column(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: Center(
                            child: Text(
                              '+${event.attendeeCount - _hosts.length}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'more',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            )
          else if (!_isGroupMember)
            Column(
              children: [
                Text(
                  event.attendeeCount > 0
                      ? '${event.attendeeCount} going${spotsText != null ? ' • $spotsText' : ''}'
                      : 'No attendees yet',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Join this group to see who\'s attending',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            )
          else
            const Text(
              'No attendees yet. Be the first to RSVP!',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRsvpSection(EventDetail event) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: _buildRsvpContent(event),
    );
  }

  Widget _buildRsvpContent(EventDetail event) {
    // Not logged in - would need auth check, for now assume logged in if isGroupMember exists
    if (!_isGroupMember) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Join the group to RSVP',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // TODO: Navigate to group page
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Text(
                'View Group',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      );
    }

    // Already RSVP'd
    if (_rsvp != null && _rsvp!.status != 'not_going') {
      return Row(
        children: [
          // Status badge
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: _rsvp!.isAttending
                    ? const Color(0xFFDCFCE7)
                    : const Color(0xFFFEF9C3),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _rsvp!.isAttending
                      ? const Color(0xFFBBF7D0)
                      : const Color(0xFFFEF08A),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.check_circle_rounded,
                    size: 20,
                    color: _rsvp!.isAttending
                        ? const Color(0xFF166534)
                        : const Color(0xFF854D0E),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _rsvp!.isAttending
                        ? "You're going"
                        : 'Waitlist #${_rsvp!.waitlistPosition}',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: _rsvp!.isAttending
                          ? const Color(0xFF166534)
                          : const Color(0xFF854D0E),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Can't make it button
          TextButton(
            onPressed: _rsvpLoading ? null : () => _showCancelConfirmation(),
            child: _rsvpLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF64748B),
                    ),
                  )
                : Text(
                    "Can't make it",
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade600,
                    ),
                  ),
          ),
        ],
      );
    }

    // Not RSVP'd - show join button
    final buttonText = event.isFull ? 'Join Waitlist' : 'Count me in';

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '${event.attendeeCount} going',
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
            ),
            if (event.capacity != null) ...[
              const Text(
                ' • ',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF64748B),
                ),
              ),
              Text(
                event.isFull
                    ? 'Waitlist open'
                    : '${event.spotsRemaining} spots left',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: event.isFull ? FontWeight.w600 : FontWeight.w400,
                  color: event.isFull
                      ? const Color(0xFFD97706)
                      : const Color(0xFF64748B),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _rsvpLoading ? null : () => _handleRsvp('join'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
              disabledBackgroundColor: const Color(0xFF7C3AED).withValues(alpha: 0.6),
            ),
            child: _rsvpLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    buttonText,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  void _showHostAvatarPopup(EventHost host) {
    final initial = host.name.isNotEmpty ? host.name[0].toUpperCase() : '?';

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Large avatar
            Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(120),
                gradient: host.avatarUrl == null
                    ? const LinearGradient(
                        colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                image: host.avatarUrl != null
                    ? DecorationImage(
                        image: NetworkImage(host.avatarUrl!),
                        fit: BoxFit.cover,
                      )
                    : null,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(64),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: host.avatarUrl == null
                  ? Center(
                      child: Text(
                        initial,
                        style: const TextStyle(
                          fontSize: 96,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF6366F1),
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(height: 16),
            // Name
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                host.name,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCancelConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          'Cancel your RSVP?',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1E293B),
          ),
        ),
        content: const Text(
          "Are you sure you can't make it to this event?",
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF64748B),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Keep RSVP',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _handleRsvp('leave');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade500,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              elevation: 0,
            ),
            child: const Text(
              "Can't make it",
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
