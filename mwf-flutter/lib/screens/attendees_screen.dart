import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:convert';
import '../services/events_service.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../widgets/bottom_nav_bar.dart';

enum AttendeeTab { going, waitlist, notGoing }
enum SortBy { rsvpTime, name }

class AttendeesScreen extends StatefulWidget {
  final int eventId;
  final String eventTitle;
  final String? eventDate;
  final String? eventLocation;
  final String? groupName;
  final String? hostName;
  final bool preordersEnabled;

  const AttendeesScreen({
    super.key,
    required this.eventId,
    required this.eventTitle,
    this.eventDate,
    this.eventLocation,
    this.groupName,
    this.hostName,
    this.preordersEnabled = false,
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  widget.eventTitle,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              if (widget.preordersEnabled) ...[
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: _showOrdersSummary,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFCD34D)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.restaurant_menu_rounded,
                          size: 16,
                          color: Color(0xFF92400E),
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Orders',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF92400E),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
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
          color: isActive ? activeColor.withValues(alpha: 0.15) : const Color(0xFFF1F5F9),
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
          final hasOrder = attendee.foodOrder != null && attendee.foodOrder!.isNotEmpty;
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
                    // Order indicator (top right)
                    if (widget.preordersEnabled && _activeTab == AttendeeTab.going && hasOrder)
                      Positioned(
                        top: -2,
                        right: -2,
                        child: Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                            color: Color(0xFF22C55E),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.restaurant_menu_rounded,
                            size: 12,
                            color: Colors.white,
                          ),
                        ),
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
    final rsvpFormat = DateFormat('d MMM yyyy, HH:mm');
    final hasOrder = attendee.foodOrder != null && attendee.foodOrder!.isNotEmpty;

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Large avatar
            Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(100),
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
                          fontSize: 80,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF6366F1),
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(height: 16),
            // Name, RSVP time, and Order info
            Container(
              constraints: const BoxConstraints(maxWidth: 300),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  Text(
                    attendee.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    rsvpFormat.format(attendee.rsvpAt),
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  // Show order if preorders enabled
                  if (widget.preordersEnabled && _activeTab == AttendeeTab.going) ...[
                    const Divider(height: 24),
                    if (hasOrder) ...[
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.restaurant_menu_rounded,
                            size: 16,
                            color: Color(0xFFF59E0B),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              attendee.foodOrder!,
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF1E293B),
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (attendee.dietaryNotes != null && attendee.dietaryNotes!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.info_outline_rounded,
                              size: 16,
                              color: Color(0xFF7C3AED),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                attendee.dietaryNotes!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF7C3AED),
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ] else
                      const Text(
                        'No order submitted',
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF94A3B8),
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showOrdersSummary() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _OrdersSummarySheet(
        eventId: widget.eventId,
        eventTitle: widget.eventTitle,
        groupName: widget.groupName,
        hostName: widget.hostName,
        eventDate: widget.eventDate,
        eventLocation: widget.eventLocation,
        attendees: _attending,
      ),
    );
  }
}

class _OrdersSummarySheet extends StatefulWidget {
  final int eventId;
  final String eventTitle;
  final String? groupName;
  final String? hostName;
  final String? eventDate;
  final String? eventLocation;
  final List<Attendee> attendees;

  const _OrdersSummarySheet({
    required this.eventId,
    required this.eventTitle,
    this.groupName,
    this.hostName,
    this.eventDate,
    this.eventLocation,
    required this.attendees,
  });

  @override
  State<_OrdersSummarySheet> createState() => _OrdersSummarySheetState();
}

class _OrdersSummarySheetState extends State<_OrdersSummarySheet> {
  bool _copied = false;
  bool _downloading = false;

  Future<void> _downloadPDF() async {
    setState(() => _downloading = true);

    try {
      final token = await AuthService().getToken();
      if (token == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please log in to download PDF'),
              backgroundColor: Colors.red,
            ),
          );
        }
        setState(() => _downloading = false);
        return;
      }

      final response = await http.get(
        Uri.parse('${ApiService.baseUrl}/events/${widget.eventId}/preorders/pdf'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (!mounted) return;
      setState(() => _downloading = false);

      final contentType = response.headers['content-type'] ?? '';
      if (contentType.contains('application/json')) {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data['message'] ?? 'Failed to generate PDF'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      final tempDir = await getTemporaryDirectory();
      final fileName = 'preorders-${widget.eventTitle.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')}.pdf';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done) {
        await Share.shareXFiles(
          [XFile(file.path)],
          subject: '${widget.eventTitle} - Pre-Orders',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _downloading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download PDF: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _generateOrderText() {
    final lines = <String>[];

    // Header with group name, host, and event details
    if (widget.groupName != null) {
      lines.add(widget.groupName!);
    }
    if (widget.hostName != null) {
      lines.add('Host: ${widget.hostName}');
    }
    lines.add(widget.eventTitle);
    if (widget.eventDate != null) {
      lines.add(widget.eventDate!);
    }
    if (widget.eventLocation != null) {
      lines.add(widget.eventLocation!);
    }
    lines.add('');
    lines.add('--- Orders (${widget.attendees.length} guests) ---');
    lines.add('');

    for (final person in widget.attendees) {
      lines.add(person.name);
      if (person.foodOrder != null && person.foodOrder!.isNotEmpty) {
        lines.add(person.foodOrder!);
        if (person.dietaryNotes != null && person.dietaryNotes!.isNotEmpty) {
          lines.add('Notes: ${person.dietaryNotes}');
        }
      } else {
        lines.add('No order submitted');
      }
      lines.add('');
    }

    lines.add('---');
    lines.add('Powered by meetwithfriends.net');

    return lines.join('\n').trim();
  }

  Future<void> _copyToClipboard() async {
    final text = _generateOrderText();
    await Clipboard.setData(ClipboardData(text: text));
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _copied = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.restaurant_menu_rounded,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Orders',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: const Color(0xFF64748B),
                ),
              ],
            ),
          ),

          // Orders list
          Flexible(
            child: widget.attendees.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'No attendees yet',
                      style: TextStyle(
                        fontSize: 15,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.all(20),
                    itemCount: widget.attendees.length,
                    separatorBuilder: (context, index) => const Divider(height: 24),
                    itemBuilder: (context, index) {
                      final person = widget.attendees[index];
                      final hasOrder = person.foodOrder != null && person.foodOrder!.isNotEmpty;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            person.name,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                          const SizedBox(height: 4),
                          if (hasOrder) ...[
                            Text(
                              person.foodOrder!,
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF475569),
                                height: 1.4,
                              ),
                            ),
                            if (person.dietaryNotes != null && person.dietaryNotes!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Notes: ${person.dietaryNotes}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF7C3AED),
                                    height: 1.4,
                                  ),
                                ),
                              ),
                          ] else
                            const Text(
                              'No order submitted',
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF94A3B8),
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                        ],
                      );
                    },
                  ),
          ),

          // Footer with action buttons
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  // Copy button
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _copyToClipboard,
                      icon: Icon(
                        _copied ? Icons.check_rounded : Icons.copy_rounded,
                        size: 18,
                      ),
                      label: Text(_copied ? 'Copied!' : 'Copy'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _copied ? const Color(0xFF22C55E) : const Color(0xFF7C3AED),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Download PDF button
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _downloading ? null : _downloadPDF,
                      icon: _downloading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.picture_as_pdf_rounded, size: 18),
                      label: Text(_downloading ? 'Loading...' : 'PDF'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF64748B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
