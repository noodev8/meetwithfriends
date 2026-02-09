import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:intl/intl.dart';
import '../models/comment.dart';
import '../services/events_service.dart';
import '../services/comments_service.dart';
import '../config/event_categories.dart';
import '../widgets/bottom_nav_bar.dart';
import 'invite_link_screen.dart';
import 'attendees_screen.dart';
import 'edit_event_screen.dart';
import 'manage_hosts_screen.dart';
import 'order_screen.dart';

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
  final CommentsService _commentsService = CommentsService();

  bool _isLoading = true;
  bool _rsvpLoading = false;
  String? _error;
  EventDetail? _event;
  RsvpStatus? _rsvp;
  List<EventHost> _hosts = [];

  bool _isGroupMember = false;
  bool _canEdit = false;
  bool _broadcastLoading = false;

  // Comments state
  List<Comment> _comments = [];
  int _commentCount = 0;
  bool _addingComment = false;
  int _visibleCommentCount = 3;
  final TextEditingController _commentController = TextEditingController();

  // Description expand/collapse state
  bool _isDescriptionExpanded = false;
  static const int _descriptionCharLimit = 200;

  // Responsive helpers
  bool _isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width >= 600;

  double _cardMargin(BuildContext context) =>
      _isTablet(context) ? 24.0 : 16.0;

  double _cardPadding(BuildContext context) =>
      _isTablet(context) ? 24.0 : 20.0;

  double _headerHeight(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final height = screenHeight * 0.18;
    return height.clamp(120.0, 180.0);
  }

  @override
  void initState() {
    super.initState();
    _loadEvent();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _loadEvent() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await _eventsService.getEvent(widget.eventId);

    if (mounted) {
      if (result.success) {
        // Also fetch comments for discussion section
        final commentsResult = await _commentsService.getComments(widget.eventId);

        setState(() {
          _isLoading = false;
          _event = result.event;
          _rsvp = result.rsvp;
          _hosts = result.hosts ?? [];
          _isGroupMember = result.isGroupMember;
          _canEdit = result.canEdit;
          if (commentsResult.success) {
            _comments = commentsResult.comments;
            _commentCount = commentsResult.commentCount;
          }
        });
      } else {
        setState(() {
          _isLoading = false;
          _error = result.error ?? 'Failed to load event';
        });
      }
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

  void _navigateToAttendees(EventDetail event) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AttendeesScreen(
          eventId: event.id,
          eventTitle: event.title,
          waitlistEnabled: event.waitlistEnabled,
          canEdit: _canEdit,
        ),
      ),
    );
  }

  Future<void> _navigateToEditEvent() async {
    if (_event == null) return;

    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => EditEventScreen(
          eventId: _event!.id,
          onEventUpdated: () {
            // Callback when event is updated
          },
        ),
      ),
    );

    // If the edit was successful, reload the event data
    if (result == true) {
      _loadEvent();
    }
  }

  Future<void> _navigateToManageHosts() async {
    if (_event == null) return;

    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => ManageHostsScreen(
          eventId: _event!.id,
          groupId: _event!.groupId,
          initialHosts: _hosts,
        ),
      ),
    );

    if (result == true) {
      _loadEvent();
    }
  }

  Future<void> _addComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty || _event == null) return;

    setState(() => _addingComment = true);

    final result = await _commentsService.addComment(_event!.id, content);

    if (mounted) {
      setState(() => _addingComment = false);

      if (result.success && result.comment != null) {
        setState(() {
          _comments.insert(0, result.comment!);
          _commentCount++;
          _commentController.clear();
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to add comment'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    }
  }

  Future<void> _deleteComment(Comment comment) async {
    final result = await _commentsService.deleteComment(comment.id);

    if (mounted) {
      if (result.success) {
        setState(() {
          _comments.removeWhere((c) => c.id == comment.id);
          _commentCount--;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to delete comment'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    }
  }

  void _confirmDeleteComment(Comment comment) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          'Delete comment?',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1E293B),
          ),
        ),
        content: const Text(
          'This action cannot be undone.',
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF64748B),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Cancel',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _deleteComment(comment);
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
              'Delete',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
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
          navigateToMainTab(context, index);
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
                    Icon(
                      Icons.event_busy_outlined,
                      size: 64,
                      color: Colors.grey.shade400,
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
              child: Text(
                _event!.groupName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF1E293B),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (_canEdit && !_event!.isPast)
              IconButton(
                onPressed: () => _navigateToEditEvent(),
                icon: const Icon(Icons.edit_outlined, size: 20),
                color: const Color(0xFF1E293B),
              ),
          ] else
            const Spacer(),
        ],
      ),
    );
  }

  bool get _showPreOrder =>
      _event != null &&
      _event!.preordersEnabled &&
      !_event!.isCancelled;

  Widget _buildContent() {
    final event = _event!;
    final categoryConfig = getCategoryConfig(event.category);
    final timeFormat = DateFormat('HH:mm');
    final margin = _cardMargin(context);

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
                    constraints: BoxConstraints(maxWidth: _isTablet(context) ? 700 : 600),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Hero Card
                        _buildHeroCard(event, categoryConfig, timeFormat),

                        // Pre-Order Banner — prominent, right below hero (matches web)
                        if (_showPreOrder)
                          _buildPreOrderBanner(event, margin),

                        // Attendees & Invite tiles (navigation actions together)
                        _buildAttendeesSection(event, margin),
                        if (_canEdit && !event.isPast && !event.isCancelled)
                          _buildInviteTile(event, margin),
                        if (_canEdit && !event.isPast && !event.isCancelled && event.broadcastSentAt == null)
                          _buildBroadcastTile(event, margin),

                        // Discussion Section (for group members)
                        if (_isGroupMember)
                          _buildDiscussionSection(event, margin),

                        // About Section
                        if (event.description != null && event.description!.isNotEmpty)
                          _buildAboutSection(event, margin),

                        // RSVP Section (inline, at bottom)
                        if (!event.isPast && !event.isCancelled)
                          _buildRsvpSection(event, margin),

                        SizedBox(height: _isTablet(context) ? 32 : 24),
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
    DateFormat timeFormat,
  ) {
    final margin = _cardMargin(context);
    final padding = _cardPadding(context);
    final headerHeight = _headerHeight(context);

    return Container(
      margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
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
            height: headerHeight,
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
                    size: headerHeight * 0.7,
                    color: Colors.white.withAlpha(50),
                  ),
                ),
                // Status badges
                if (event.isCancelled || event.isPast)
                  Positioned(
                    left: padding,
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
                // Title at bottom (max 2 lines with ellipsis)
                Positioned(
                  left: padding,
                  right: padding,
                  bottom: 16,
                  child: Text(
                    event.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      letterSpacing: -0.5,
                      height: 1.2,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Event Info — compact tile grid
          Padding(
            padding: EdgeInsets.fromLTRB(padding, padding, padding, padding / 2),
            child: Row(
              children: [
                Expanded(
                  child: _buildInfoTile(
                    icon: Icons.calendar_today_outlined,
                    label: DateFormat('EEE, d MMM').format(event.dateTime),
                    sublabel: timeFormat.format(event.dateTime),
                  ),
                ),
                if (event.location != null) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildInfoTile(
                      icon: Icons.location_on_outlined,
                      label: event.location!,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Manage Hosts row (hosts/organisers only, active events)
          if (_canEdit && !event.isPast && !event.isCancelled)
            Padding(
              padding: EdgeInsets.fromLTRB(padding, padding / 2, padding, padding / 2),
              child: GestureDetector(
                onTap: _navigateToManageHosts,
                behavior: HitTestBehavior.opaque,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.people_outline_rounded,
                        size: 16,
                        color: Color(0xFF64748B),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _hosts.isNotEmpty
                              ? 'Hosted by ${_hosts[0].name}${_hosts.length > 1 ? " +${_hosts.length - 1}" : ""}'
                              : 'Manage Hosts',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ),
                      const Text(
                        'Manage',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF7C3AED),
                        ),
                      ),
                      const SizedBox(width: 2),
                      const Icon(
                        Icons.chevron_right_rounded,
                        size: 16,
                        color: Color(0xFF7C3AED),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          SizedBox(height: padding / 2),
        ],
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String label,
    String? sublabel,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
          const SizedBox(height: 6),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
          if (sublabel != null) ...[
            const SizedBox(height: 2),
            Text(
              sublabel,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
          ],
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

  Widget _buildAboutSection(EventDetail event, double margin) {
    final padding = _cardPadding(context);
    final description = event.description ?? '';
    final plainText = _stripHtmlTags(description);
    final isLongDescription = plainText.length > _descriptionCharLimit;

    return Container(
      width: double.infinity,
      margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
      padding: EdgeInsets.all(padding),
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
          if (_isDescriptionExpanded || !isLongDescription)
            Html(
              data: description,
              style: {
                "body": Style(
                  fontSize: FontSize(14),
                  lineHeight: LineHeight(1.6),
                  color: const Color(0xFF475569),
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                ),
                "a": Style(
                  color: const Color(0xFF4F46E5),
                  textDecoration: TextDecoration.none,
                ),
                "ul": Style(
                  margin: Margins.only(top: 8, bottom: 8),
                ),
                "li": Style(
                  margin: Margins.only(bottom: 4),
                ),
              },
            )
          else
            Text(
              '${plainText.substring(0, _descriptionCharLimit)}...',
              style: const TextStyle(
                fontSize: 14,
                height: 1.6,
                color: Color(0xFF475569),
              ),
            ),
          if (isLongDescription)
            GestureDetector(
              onTap: () {
                setState(() {
                  _isDescriptionExpanded = !_isDescriptionExpanded;
                });
              },
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  _isDescriptionExpanded ? 'Show less' : 'Read more',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF4F46E5),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAttendeesSection(EventDetail event, double margin) {
    // Build subtitle text
    String subtitle;
    Color subtitleColor = const Color(0xFF94A3B8);
    if (!_isGroupMember) {
      subtitle = 'Join group to see attendees';
    } else if (event.attendeeCount == 0) {
      subtitle = 'Be the first to RSVP!';
    } else if (event.capacity != null && event.isFull) {
      subtitle = '${event.attendeeCount} going · ${event.waitlistEnabled ? 'Waitlist open' : 'Event full'}';
      subtitleColor = event.waitlistEnabled ? const Color(0xFFD97706) : const Color(0xFFEF4444);
    } else if (event.capacity != null) {
      subtitle = '${event.attendeeCount} going · ${event.spotsRemaining} spots left';
    } else {
      subtitle = '${event.attendeeCount} going';
    }

    return Container(
      margin: EdgeInsets.fromLTRB(margin, 0, margin, 16),
      child: GestureDetector(
        onTap: _isGroupMember
            ? () => _navigateToAttendees(event)
            : null,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F3FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _isGroupMember ? Icons.people_rounded : Icons.lock_outline,
                  size: 20,
                  color: _isGroupMember
                      ? const Color(0xFF7C3AED)
                      : const Color(0xFF94A3B8),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Attendees',
                      style: TextStyle(
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
              if (_isGroupMember)
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF94A3B8),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _navigateToOrder() async {
    if (_event == null) return;
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => OrderScreen(eventId: _event!.id),
      ),
    );
    if (result == true) {
      _loadEvent();
    }
  }

  Widget _buildPreOrderBanner(EventDetail event, double margin) {
    final isCutoffPassed = event.preorderCutoff != null &&
        DateTime.now().isAfter(event.preorderCutoff!);
    final hasOrder =
        _rsvp?.foodOrder != null && _rsvp!.foodOrder!.isNotEmpty;
    final isAttending = _rsvp != null && _rsvp!.status != 'not_going';

    // Not attending — neutral banner with View Menu link
    if (!isAttending) {
      return Container(
        margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _navigateToOrder,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0E7FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.restaurant_menu_rounded,
                        size: 20, color: Color(0xFF6366F1)),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Menu available for this event',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0E7FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'View Menu',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4338CA),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    if (isCutoffPassed) {
      if (hasOrder) {
        // Green card — order confirmed, deadline passed
        return Container(
          margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFECFDF5), Color(0xFFD1FAE5)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFA7F3D0)),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _navigateToOrder,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.check_rounded,
                          size: 22, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Order confirmed',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF065F46),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _rsvp!.foodOrder!,
                            style: const TextStyle(
                                fontSize: 12, color: Color(0xFF047857)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded,
                        color: Color(0xFF059669)),
                  ],
                ),
              ),
            ),
          ),
        );
      }

      // Muted slate card — deadline passed, no order
      return Container(
        margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _navigateToOrder,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.schedule_rounded,
                        size: 20, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order deadline passed',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF475569),
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'No order was submitted',
                          style: TextStyle(
                              fontSize: 12, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      color: Color(0xFF94A3B8)),
                ],
              ),
            ),
          ),
        ),
      );
    }

    if (hasOrder) {
      // Green confirmation card — order submitted, can edit
      return Container(
        margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFECFDF5), Color(0xFFD1FAE5)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFA7F3D0)),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _navigateToOrder,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.check_rounded,
                        size: 22, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Order submitted',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF065F46),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _rsvp!.foodOrder!,
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF047857)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: const Color(0xFFA7F3D0),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Edit',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF065F46),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // Red CTA card — no order yet, action needed
    return Container(
      margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFDC2626), Color(0xFFE11D48)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFDC2626).withAlpha(60),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _navigateToOrder,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(40),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.restaurant_menu_rounded,
                      size: 24, color: Colors.white),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "You haven't placed your pre-order yet",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: -0.2,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Tap to view menu & place your order',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFFE0E7FF),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(40),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.arrow_forward_rounded,
                      size: 20, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInviteTile(EventDetail event, double margin) {
    return Container(
      margin: EdgeInsets.fromLTRB(margin, 0, margin, 16),
      child: GestureDetector(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => InviteLinkScreen(
                type: 'event',
                id: event.id,
                name: event.title,
              ),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F3FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.person_add_rounded,
                  size: 20,
                  color: Color(0xFF7C3AED),
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Invite People',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Share a link to invite',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF94A3B8),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleBroadcast() async {
    if (_event == null) return;

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Broadcast event?',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        content: const Text(
          'This will email all group members about this event. This can only be done once.',
          style: TextStyle(fontSize: 14, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(
              'Not yet',
              style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'Broadcast',
              style: TextStyle(color: Color(0xFF7C3AED), fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _broadcastLoading = true);

    final result = await _eventsService.broadcastEvent(_event!.id);

    if (!mounted) return;

    setState(() => _broadcastLoading = false);

    if (result.success) {
      // Reload event to get updated broadcast_sent_at
      _loadEvent();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message ?? 'Event broadcast sent'),
          backgroundColor: const Color(0xFF7C3AED),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.error ?? 'Failed to broadcast'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildBroadcastTile(EventDetail event, double margin) {
    return Container(
      margin: EdgeInsets.fromLTRB(margin, 0, margin, 16),
      child: GestureDetector(
        onTap: _broadcastLoading ? null : _handleBroadcast,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F3FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.campaign_rounded,
                  size: 20,
                  color: Color(0xFF7C3AED),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Broadcast Event',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Email all group members about this event',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              if (_broadcastLoading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF7C3AED),
                  ),
                )
              else
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF94A3B8),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRsvpSection(EventDetail event, double margin) {
    return Padding(
      padding: EdgeInsets.fromLTRB(margin, 0, margin, margin),
      child: _buildRsvpContent(event),
    );
  }

  Widget _buildRsvpContent(EventDetail event) {
    // Non-member viewing the event
    if (!_isGroupMember) {
      return const Text(
        'Join the group to RSVP',
        style: TextStyle(
          fontSize: 14,
          color: Color(0xFF64748B),
        ),
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

    // Not RSVP'd - show join button or disabled states
    final isRsvpsClosed = event.rsvpsClosed;
    final isPreorderCutoffLocked = event.preordersEnabled &&
        event.preorderCutoff != null &&
        DateTime.now().isAfter(event.preorderCutoff!);
    final isFullNoWaitlist = event.isFull && !event.waitlistEnabled;
    final isDisabled = isRsvpsClosed || isPreorderCutoffLocked || isFullNoWaitlist;

    String buttonText;
    if (isRsvpsClosed) {
      buttonText = 'RSVPs Closed';
    } else if (isPreorderCutoffLocked) {
      buttonText = 'RSVPs Closed — Pre-orders Sent';
    } else if (isFullNoWaitlist) {
      buttonText = 'Event Full';
    } else if (event.isFull) {
      buttonText = 'Join Waitlist';
    } else {
      buttonText = 'Count me in';
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: isDisabled || _rsvpLoading ? null : () => _handleRsvp('join'),
            style: ElevatedButton.styleFrom(
              backgroundColor: isDisabled ? Colors.grey.shade400 : const Color(0xFF7C3AED),
              foregroundColor: Colors.white,
              disabledBackgroundColor: isDisabled ? Colors.grey.shade300 : const Color(0xFF7C3AED).withAlpha(153),
              disabledForegroundColor: isDisabled ? Colors.grey.shade500 : Colors.white.withAlpha(179),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
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

  Widget _buildDiscussionSection(EventDetail event, double margin) {
    final padding = _cardPadding(context);
    final canComment = _rsvp != null &&
        (_rsvp!.status == 'attending' || _rsvp!.status == 'waitlist') ||
        _canEdit; // hosts/organisers can always comment

    return Container(
      margin: EdgeInsets.fromLTRB(margin, 0, margin, margin),
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Text(
                'Discussion',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              if (_commentCount > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$_commentCount',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 16),

          // Add comment form (only for attendees/waitlist/hosts)
          if (canComment)
            _buildCommentForm()
          else if (_rsvp == null || _rsvp!.status == 'not_going')
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.chat_bubble_outline,
                    size: 20,
                    color: Color(0xFF94A3B8),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'RSVP to join the discussion',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Comments list
          if (_comments.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),
            const SizedBox(height: 16),
            ..._comments
                .take(_visibleCommentCount)
                .map((comment) => _buildCommentItem(comment)),
            if (_visibleCommentCount < _comments.length)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Center(
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _visibleCommentCount = (_visibleCommentCount + 10)
                            .clamp(0, _comments.length);
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      child: Text(
                        'Show more comments (${_comments.length - _visibleCommentCount} remaining)',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF4F46E5),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            if (_visibleCommentCount > 3)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Center(
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _visibleCommentCount = 3;
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      child: Text(
                        'Show less',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF4F46E5),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ] else if (canComment) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.forum_outlined,
                    size: 20,
                    color: Color(0xFF94A3B8),
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Be the first to comment',
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCommentForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        TextField(
          controller: _commentController,
          maxLength: 280,
          maxLines: 3,
          minLines: 1,
          decoration: InputDecoration(
            hintText: 'Add a comment...',
            hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFF7C3AED),
                width: 2,
              ),
            ),
            counterText: '',
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_commentController.text.length}/280',
              style: TextStyle(
                fontSize: 12,
                color: _commentController.text.length > 250
                    ? Colors.orange.shade700
                    : const Color(0xFF94A3B8),
              ),
            ),
            ElevatedButton(
              onPressed: _addingComment ||
                      _commentController.text.trim().isEmpty
                  ? null
                  : _addComment,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 10,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 0,
                disabledBackgroundColor:
                    const Color(0xFF7C3AED).withAlpha(100),
              ),
              child: _addingComment
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Post',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCommentItem(Comment comment) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: comment.userAvatarUrl == null
                  ? const LinearGradient(
                      colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
                    )
                  : null,
              borderRadius: BorderRadius.circular(18),
              image: comment.userAvatarUrl != null
                  ? DecorationImage(
                      image: NetworkImage(comment.userAvatarUrl!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: comment.userAvatarUrl == null
                ? Center(
                    child: Text(
                      comment.initials,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF6366F1),
                      ),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name and time
                Row(
                  children: [
                    Text(
                      comment.userName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      comment.relativeTime,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                    const Spacer(),
                    if (comment.canDelete)
                      GestureDetector(
                        onTap: () => _confirmDeleteComment(comment),
                        child: const Icon(
                          Icons.delete_outline,
                          size: 18,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                // Content
                Text(
                  comment.content,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: Color(0xFF475569),
                  ),
                ),
              ],
            ),
          ),
        ],
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
