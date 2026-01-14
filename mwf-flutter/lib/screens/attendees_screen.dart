import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/events_service.dart';
import '../widgets/bottom_nav_bar.dart';

enum AttendeeTab { going, waitlist, notGoing }
enum SortBy { rsvpTime, name }

class AttendeesScreen extends StatefulWidget {
  final int eventId;
  final String eventTitle;
  final String? eventDate;
  final String? eventLocation;

  const AttendeesScreen({
    super.key,
    required this.eventId,
    required this.eventTitle,
    this.eventDate,
    this.eventLocation,
  });

  @override
  State<AttendeesScreen> createState() => _AttendeesScreenState();
}

class _AttendeesScreenState extends State<AttendeesScreen> {
  final EventsService _eventsService = EventsService();

  bool _isLoading = true;
  String? _error;
  bool _isMember = false;
  List<Attendee> _attending = [];
  List<Attendee> _waitlist = [];
  List<Attendee> _notGoing = [];
  int _attendingCount = 0;
  int _waitlistCount = 0;
  int _notGoingCount = 0;

  AttendeeTab _activeTab = AttendeeTab.going;
  SortBy _sortBy = SortBy.rsvpTime;

  // For event hosts lookup (simplified - in production would come from API)
  final Set<int> _hostIds = {};

  @override
  void initState() {
    super.initState();
    _loadAttendees();
  }

  Future<void> _loadAttendees() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await _eventsService.getAttendees(widget.eventId);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (result.success) {
          _isMember = result.isMember;
          _attending = result.attending;
          _waitlist = result.waitlist;
          _notGoing = result.notGoing;
          _attendingCount = result.attendingCount;
          _waitlistCount = result.waitlistCount;
          _notGoingCount = result.notGoingCount;
        } else {
          _error = result.error ?? 'Failed to load attendees';
        }
      });
    }
  }

  List<Attendee> get _currentList {
    List<Attendee> list;
    switch (_activeTab) {
      case AttendeeTab.going:
        list = _attending;
        break;
      case AttendeeTab.waitlist:
        list = _waitlist;
        break;
      case AttendeeTab.notGoing:
        list = _notGoing;
        break;
    }

    // Sort
    final sorted = List<Attendee>.from(list);
    if (_sortBy == SortBy.name) {
      sorted.sort((a, b) => a.name.compareTo(b.name));
    } else {
      sorted.sort((a, b) => a.rsvpAt.compareTo(b.rsvpAt));
    }
    return sorted;
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
        currentIndex: 1,
        onTap: (index) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        },
      ),
    );
  }

  Widget _buildErrorState() {
    return SafeArea(
      bottom: false,
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
                    const Text('👥', style: TextStyle(fontSize: 64)),
                    const SizedBox(height: 16),
                    Text(
                      _error ?? 'Failed to load attendees',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 16,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _loadAttendees,
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
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back_rounded),
            color: const Color(0xFF1E293B),
          ),
          const SizedBox(width: 4),
          const Expanded(
            child: Text(
              'Back to event',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Color(0xFF7C3AED),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (!_isMember) {
      return _buildNonMemberState();
    }

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          _buildAppBar(),
          _buildHeader(),
          _buildTabs(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadAttendees,
              color: const Color(0xFF7C3AED),
              child: _currentList.isEmpty
                  ? _buildEmptyState()
                  : _buildAttendeeGrid(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNonMemberState() {
    return SafeArea(
      bottom: false,
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
                    const Text('👥', style: TextStyle(fontSize: 64)),
                    const SizedBox(height: 16),
                    const Text(
                      'Members only',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Join this group to see who's attending.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
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
                      child: const Text('Back to event'),
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

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.eventTitle,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E293B),
              letterSpacing: -0.5,
            ),
          ),
          if (widget.eventDate != null || widget.eventLocation != null) ...[
            const SizedBox(height: 4),
            Text(
              [widget.eventDate, widget.eventLocation]
                  .where((s) => s != null)
                  .join(' • '),
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildTab(
                    AttendeeTab.going,
                    'Going ($_attendingCount)',
                    const Color(0xFF10B981),
                  ),
                  const SizedBox(width: 8),
                  _buildTab(
                    AttendeeTab.waitlist,
                    'Waitlist ($_waitlistCount)',
                    const Color(0xFFF59E0B),
                  ),
                  const SizedBox(width: 8),
                  _buildTab(
                    AttendeeTab.notGoing,
                    'Not Going ($_notGoingCount)',
                    const Color(0xFF64748B),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          _buildSortDropdown(),
        ],
      ),
    );
  }

  Widget _buildTab(AttendeeTab tab, String label, Color activeColor) {
    final isActive = _activeTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? activeColor.withOpacity(0.15) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isActive ? activeColor : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildSortDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<SortBy>(
          value: _sortBy,
          isDense: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20),
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: Color(0xFF1E293B),
          ),
          items: const [
            DropdownMenuItem(
              value: SortBy.rsvpTime,
              child: Text('RSVP time'),
            ),
            DropdownMenuItem(
              value: SortBy.name,
              child: Text('Name'),
            ),
          ],
          onChanged: (value) {
            if (value != null) {
              setState(() => _sortBy = value);
            }
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    String emoji;
    String message;
    switch (_activeTab) {
      case AttendeeTab.going:
        emoji = '👥';
        message = 'No one is going yet';
        break;
      case AttendeeTab.waitlist:
        emoji = '⏳';
        message = 'No one on the waitlist';
        break;
      case AttendeeTab.notGoing:
        emoji = '👋';
        message = 'No one has cancelled';
        break;
    }

    return ListView(
      children: [
        const SizedBox(height: 60),
        Center(
          child: Column(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              Text(
                message,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAttendeeGrid() {
    final rsvpFormat = DateFormat('d MMM, HH:mm');

    return LayoutBuilder(
      builder: (context, constraints) {
        // Responsive columns: 2 on small phones, 3 on phones, 4 on tablets, 5 on large tablets
        int crossAxisCount;
        if (constraints.maxWidth < 360) {
          crossAxisCount = 2;
        } else if (constraints.maxWidth < 600) {
          crossAxisCount = 3;
        } else if (constraints.maxWidth < 900) {
          crossAxisCount = 4;
        } else {
          crossAxisCount = 5;
        }

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: GridView.builder(
            padding: const EdgeInsets.all(20),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              childAspectRatio: 0.7,
              crossAxisSpacing: 16,
              mainAxisSpacing: 20,
            ),
            itemCount: _currentList.length,
        itemBuilder: (context, index) {
          final attendee = _currentList[index];
          final isHost = _hostIds.contains(attendee.userId);
          final initial = attendee.name.isNotEmpty
              ? attendee.name[0].toUpperCase()
              : '?';

          return GestureDetector(
            onTap: () => _showAttendeeModal(attendee),
            child: Column(
              children: [
                // Avatar with badge
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    // Avatar
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        image: attendee.avatarUrl != null
                            ? DecorationImage(
                                image: NetworkImage(attendee.avatarUrl!),
                                fit: BoxFit.cover,
                              )
                            : null,
                      ),
                      child: attendee.avatarUrl == null
                          ? Center(
                              child: Text(
                                initial,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF6366F1),
                                ),
                              ),
                            )
                          : null,
                    ),
                    // Host badge
                    if (isHost)
                      Positioned(
                        bottom: -4,
                        left: 0,
                        right: 0,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
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
                    // Waitlist position
                    if (_activeTab == AttendeeTab.waitlist &&
                        attendee.waitlistPosition != null)
                      Positioned(
                        bottom: -4,
                        left: 0,
                        right: 0,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '#${attendee.waitlistPosition}',
                              style: const TextStyle(
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
                const SizedBox(height: 8),
                // Name
                Text(
                  attendee.name.split(' ').first,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                  ),
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                ),
                // Role
                Text(
                  isHost
                      ? 'Event Host'
                      : attendee.guestCount > 0
                          ? '+${attendee.guestCount} guest${attendee.guestCount > 1 ? 's' : ''}'
                          : 'Member',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                  ),
                  textAlign: TextAlign.center,
                ),
                // RSVP time
                Text(
                  rsvpFormat.format(attendee.rsvpAt),
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF94A3B8),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        },
          ),
        );
      },
    );
  }

  void _showAttendeeModal(Attendee attendee) {
    final initial = attendee.name.isNotEmpty
        ? attendee.name[0].toUpperCase()
        : '?';
    final rsvpFormat = DateFormat('d MMM yyyy, HH:mm');

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Large avatar
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                      ),
                      image: attendee.avatarUrl != null
                          ? DecorationImage(
                              image: NetworkImage(attendee.avatarUrl!),
                              fit: BoxFit.cover,
                            )
                          : null,
                    ),
                    child: attendee.avatarUrl == null
                        ? Center(
                            child: Text(
                              initial,
                              style: const TextStyle(
                                fontSize: 40,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF6366F1),
                              ),
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(height: 16),
                  // Name
                  Text(
                    attendee.name,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Status
                  Text(
                    _activeTab == AttendeeTab.going
                        ? 'Going'
                        : _activeTab == AttendeeTab.waitlist
                            ? 'Waitlist'
                            : 'Not going',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // RSVP time
                  Text(
                    'RSVP: ${rsvpFormat.format(attendee.rsvpAt)}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  if (attendee.guestCount > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      '+${attendee.guestCount} guest${attendee.guestCount > 1 ? 's' : ''}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  // Close button
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        backgroundColor: const Color(0xFFF1F5F9),
                      ),
                      child: const Text(
                        'Close',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
