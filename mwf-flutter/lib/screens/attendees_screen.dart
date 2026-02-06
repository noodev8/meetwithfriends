import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/events_service.dart';
import '../widgets/bottom_nav_bar.dart';

enum AttendeeTab { going, waitlist, notGoing }
enum SortBy { rsvpTime, name }

class AttendeesScreen extends StatefulWidget {
  final int eventId;
  final String eventTitle;
  final bool waitlistEnabled;
  final bool canEdit;

  const AttendeesScreen({
    super.key,
    required this.eventId,
    required this.eventTitle,
    this.waitlistEnabled = true,
    this.canEdit = false,
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

  // Track which attendee action is loading
  int? _actionLoadingUserId;

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
          navigateToMainTab(context, index);
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
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          _buildTab(
            AttendeeTab.going,
            'Going',
            _attendingCount,
            const Color(0xFF10B981),
          ),
          if (_waitlistCount > 0 || widget.waitlistEnabled) ...[
            const SizedBox(width: 4),
            _buildTab(
              AttendeeTab.waitlist,
              'Waitlist',
              _waitlistCount,
              const Color(0xFFF59E0B),
            ),
          ],
          const SizedBox(width: 4),
          _buildTab(
            AttendeeTab.notGoing,
            'Not Going',
            _notGoingCount,
            const Color(0xFF64748B),
          ),
          const SizedBox(width: 4),
          _buildSortButton(),
        ],
      ),
    );
  }

  Widget _buildTab(AttendeeTab tab, String label, int count, Color activeColor) {
    final isActive = _activeTab == tab;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = tab),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isActive ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: Colors.black.withAlpha(15),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isActive ? activeColor : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                count.toString(),
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: isActive ? activeColor : const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSortButton() {
    return PopupMenuButton<SortBy>(
      initialValue: _sortBy,
      onSelected: (value) => setState(() => _sortBy = value),
      offset: const Offset(0, 40),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (context) => [
        PopupMenuItem(
          value: SortBy.rsvpTime,
          child: Row(
            children: [
              Icon(
                Icons.access_time_rounded,
                size: 18,
                color: _sortBy == SortBy.rsvpTime
                    ? const Color(0xFF7C3AED)
                    : const Color(0xFF64748B),
              ),
              const SizedBox(width: 10),
              Text(
                'RSVP time',
                style: TextStyle(
                  color: _sortBy == SortBy.rsvpTime
                      ? const Color(0xFF7C3AED)
                      : const Color(0xFF1E293B),
                  fontWeight: _sortBy == SortBy.rsvpTime
                      ? FontWeight.w600
                      : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem(
          value: SortBy.name,
          child: Row(
            children: [
              Icon(
                Icons.sort_by_alpha_rounded,
                size: 18,
                color: _sortBy == SortBy.name
                    ? const Color(0xFF7C3AED)
                    : const Color(0xFF64748B),
              ),
              const SizedBox(width: 10),
              Text(
                'Name',
                style: TextStyle(
                  color: _sortBy == SortBy.name
                      ? const Color(0xFF7C3AED)
                      : const Color(0xFF1E293B),
                  fontWeight:
                      _sortBy == SortBy.name ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(15),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: const Icon(
          Icons.sort_rounded,
          size: 20,
          color: Color(0xFF64748B),
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

          return Column(
              children: [
                // Avatar with badge (tappable for large popup)
                GestureDetector(
                  onTap: () => _showAvatarPopup(attendee),
                  child: Stack(
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
                // Role (only show if host or has guests)
                if (isHost || attendee.guestCount > 0)
                  Text(
                    isHost
                        ? 'Event Host'
                        : '+${attendee.guestCount} guest${attendee.guestCount > 1 ? 's' : ''}',
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
            );
        },
          ),
        );
      },
    );
  }

  void _showAvatarPopup(Attendee attendee) {
    final initial = attendee.name.isNotEmpty
        ? attendee.name[0].toUpperCase()
        : '?';

    // Determine status text and color based on current tab
    String statusText;
    Color statusColor;
    switch (_activeTab) {
      case AttendeeTab.going:
        statusText = 'Going';
        statusColor = const Color(0xFF10B981);
        break;
      case AttendeeTab.waitlist:
        statusText = attendee.waitlistPosition != null
            ? 'Waitlist #${attendee.waitlistPosition}'
            : 'Waitlist';
        statusColor = const Color(0xFFF59E0B);
        break;
      case AttendeeTab.notGoing:
        statusText = 'Not going';
        statusColor = const Color(0xFF64748B);
        break;
    }

    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 320),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Card with avatar, name, status, and actions
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(40),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Close button row
                    Align(
                      alignment: Alignment.topRight,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 8, right: 8),
                        child: IconButton(
                          onPressed: () => Navigator.of(dialogContext).pop(),
                          icon: const Icon(Icons.close_rounded),
                          color: const Color(0xFF94A3B8),
                          iconSize: 24,
                        ),
                      ),
                    ),

                    // Large avatar (tappable for full-screen view)
                    GestureDetector(
                      onTap: () => _showFullScreenAvatar(attendee),
                      child: Container(
                        width: 160,
                        height: 160,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: attendee.avatarUrl == null
                              ? const LinearGradient(
                                  colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                )
                              : null,
                          image: attendee.avatarUrl != null
                              ? DecorationImage(
                                  image: NetworkImage(attendee.avatarUrl!),
                                  fit: BoxFit.cover,
                                )
                              : null,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(25),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: attendee.avatarUrl == null
                            ? Center(
                                child: Text(
                                  initial,
                                  style: const TextStyle(
                                    fontSize: 64,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF6366F1),
                                  ),
                                ),
                              )
                            : null,
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Name
                    Text(
                      attendee.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 6),

                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withAlpha(25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ),

                    // Action buttons (only if canEdit and not "Not going" tab)
                    if (widget.canEdit && _activeTab != AttendeeTab.notGoing) ...[
                      const SizedBox(height: 20),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            // Move to waitlist (only for Going tab, if waitlist enabled)
                            if (_activeTab == AttendeeTab.going && widget.waitlistEnabled)
                              _buildActionButton(
                                label: 'Move to waitlist',
                                icon: Icons.schedule_rounded,
                                color: const Color(0xFFF59E0B),
                                onTap: () => _handleManageAttendee(attendee, 'demote'),
                                isLoading: _actionLoadingUserId == attendee.userId,
                              ),

                            // Move to going (only for Waitlist tab)
                            if (_activeTab == AttendeeTab.waitlist)
                              _buildActionButton(
                                label: 'Move to going',
                                icon: Icons.check_circle_rounded,
                                color: const Color(0xFF10B981),
                                onTap: () => _handleManageAttendee(attendee, 'promote'),
                                isLoading: _actionLoadingUserId == attendee.userId,
                              ),

                            if (_activeTab == AttendeeTab.going && widget.waitlistEnabled ||
                                _activeTab == AttendeeTab.waitlist)
                              const SizedBox(height: 10),

                            // Remove from event (always shown for Going/Waitlist)
                            _buildActionButton(
                              label: 'Remove from event',
                              icon: Icons.person_remove_rounded,
                              color: Colors.red,
                              onTap: () => _handleManageAttendee(attendee, 'remove'),
                              isLoading: _actionLoadingUserId == attendee.userId,
                            ),
                          ],
                        ),
                      ),
                    ] else
                      const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required bool isLoading,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: isLoading ? null : onTap,
        icon: isLoading
            ? SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: color,
                ),
              )
            : Icon(icon, size: 18),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color.withAlpha(25),
          foregroundColor: color,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  void _showFullScreenAvatar(Attendee attendee) {
    final initial = attendee.name.isNotEmpty
        ? attendee.name[0].toUpperCase()
        : '?';

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: Container(
            width: 280,
            height: 280,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: attendee.avatarUrl == null
                  ? const LinearGradient(
                      colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              image: attendee.avatarUrl != null
                  ? DecorationImage(
                      image: NetworkImage(attendee.avatarUrl!),
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
            child: attendee.avatarUrl == null
                ? Center(
                    child: Text(
                      initial,
                      style: const TextStyle(
                        fontSize: 100,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF6366F1),
                      ),
                    ),
                  )
                : null,
          ),
        ),
      ),
    );
  }

  Future<void> _handleManageAttendee(Attendee attendee, String action) async {
    final actionLabels = {
      'remove': 'remove from event',
      'demote': 'move to waitlist',
      'promote': 'move to going',
    };

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Confirm action',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1E293B),
          ),
        ),
        content: Text(
          'Are you sure you want to ${actionLabels[action]} ${attendee.name}?',
          style: const TextStyle(
            fontSize: 14,
            color: Color(0xFF64748B),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text(
              'Cancel',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: action == 'remove' ? Colors.red : const Color(0xFF7C3AED),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Confirm',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _actionLoadingUserId = attendee.userId);

    final result = await _eventsService.manageAttendee(
      widget.eventId,
      attendee.userId,
      action,
    );

    if (mounted) {
      setState(() => _actionLoadingUserId = null);

      if (result.success) {
        Navigator.of(context).pop(); // Close the modal
        _loadAttendees(); // Refresh the list
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.message ?? 'Attendee updated'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to update attendee'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    }
  }
}
