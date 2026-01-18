import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/event.dart';
import '../services/groups_service.dart';
import '../services/events_service.dart';
import '../config/event_categories.dart';
import '../config/group_themes.dart';
import '../widgets/bottom_nav_bar.dart';
import 'event_detail_screen.dart';
import 'create_event_screen.dart';
import 'edit_group_screen.dart';
import 'group_members_screen.dart';
import 'past_events_screen.dart';
import 'group_events_screen.dart';

class GroupDashboardScreen extends StatefulWidget {
  final int groupId;
  final VoidCallback? onBack;
  final String? backLabel;

  const GroupDashboardScreen({
    super.key,
    required this.groupId,
    this.onBack,
    this.backLabel,
  });

  @override
  State<GroupDashboardScreen> createState() => _GroupDashboardScreenState();
}

class _GroupDashboardScreenState extends State<GroupDashboardScreen> {
  final GroupsService _groupsService = GroupsService();
  final EventsService _eventsService = EventsService();

  bool _isLoading = true;
  String? _error;
  GroupDetail? _group;
  GroupMembership? _membership;
  List<Event> _events = [];
  List<GroupMember> _members = [];
  List<GroupMember> _pendingMembers = [];
  int? _processingMemberId;
  bool _isLeaving = false;
  bool _isJoining = false;

  @override
  void initState() {
    super.initState();
    _loadGroup();
  }

  Future<void> _loadGroup() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Load group and events in parallel
    final results = await Future.wait([
      _groupsService.getGroup(widget.groupId),
      _eventsService.getUpcomingEvents(groupId: widget.groupId),
    ]);

    final groupResult = results[0] as GroupDetailResult;
    final eventsResult = results[1] as EventsResult;

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (groupResult.success) {
          _group = groupResult.group;
          _membership = groupResult.membership;
          _events = eventsResult.events ?? [];
        } else {
          _error = groupResult.error ?? 'Failed to load group';
        }
      });

      // Load members if user is an active member
      if (groupResult.success && groupResult.membership?.isActive == true) {
        _loadMembers();
      }

      // Load pending members if user can manage members (organiser/host)
      if (groupResult.success && groupResult.membership?.canManageMembers == true) {
        _loadPendingMembers();
      }
    }
  }

  Future<void> _loadPendingMembers() async {
    final result = await _groupsService.getGroupMembers(
      widget.groupId,
      status: 'pending',
      limit: 50, // Get more pending members
    );

    if (mounted && result.success) {
      setState(() {
        _pendingMembers = result.members ?? [];
      });
    }
  }

  Future<void> _loadMembers() async {
    final result = await _groupsService.getGroupMembers(
      widget.groupId,
      limit: 12, // Just need preview
    );

    if (mounted && result.success) {
      setState(() {
        _members = result.members ?? [];
      });
    }
  }

  Future<void> _handleApproveMember(GroupMember member) async {
    setState(() => _processingMemberId = member.id);

    final result = await _groupsService.approveMember(widget.groupId, member.id);

    if (mounted) {
      setState(() => _processingMemberId = null);

      if (result.success) {
        // Remove from pending list and refresh members
        setState(() {
          _pendingMembers.removeWhere((m) => m.id == member.id);
        });
        _loadMembers();
        _loadGroup(); // Refresh member count

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${member.name} has been approved'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to approve member'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleRejectMember(GroupMember member) async {
    setState(() => _processingMemberId = member.id);

    final result = await _groupsService.rejectMember(widget.groupId, member.id);

    if (mounted) {
      setState(() => _processingMemberId = null);

      if (result.success) {
        // Remove from pending list
        setState(() {
          _pendingMembers.removeWhere((m) => m.id == member.id);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${member.name} has been declined'),
            backgroundColor: const Color(0xFF64748B),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to decline member'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showLeaveConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Leave ${_group?.name}?',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1E293B),
          ),
        ),
        content: const Text(
          "You'll lose access to events and discussions. You can rejoin later if the group allows it.",
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF64748B),
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Cancel',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _handleLeaveGroup();
            },
            child: const Text(
              'Leave',
              style: TextStyle(
                color: Color(0xFFEF4444),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLeaveGroup() async {
    setState(() => _isLeaving = true);

    final result = await _groupsService.leaveGroup(widget.groupId);

    if (mounted) {
      setState(() => _isLeaving = false);

      if (result.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('You have left ${_group?.name}'),
            backgroundColor: const Color(0xFF64748B),
          ),
        );
        // Navigate back to groups list
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to leave group'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleJoinGroup() async {
    if (_group == null) return;

    setState(() => _isJoining = true);

    final result = await _groupsService.joinGroup(_group!.id);

    if (mounted) {
      setState(() => _isJoining = false);

      if (result.success) {
        // Update local membership state
        setState(() {
          _membership = GroupMembership(
            status: result.status,
            role: 'member',
          );
        });

        // Show success message
        final message = result.isPending
            ? 'Your request to join has been submitted'
            : 'You have joined ${_group!.name}';

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: result.isPending
                ? const Color(0xFFF59E0B)
                : const Color(0xFF10B981),
          ),
        );

        // If joined successfully (not pending), reload to get full member data
        if (result.isActive) {
          _loadGroup();
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Failed to join group'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  GroupTheme get _theme => getGroupTheme(_group?.themeColor);

  void _showBroadcastDialog() {
    final messageController = TextEditingController();
    bool sending = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.campaign_rounded,
                  color: Color(0xFF6366F1),
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Broadcast Message',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
          content: SizedBox(
            width: MediaQuery.of(context).size.width * 0.8,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Send a message to all group members who have broadcasts enabled.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: messageController,
                  maxLines: 5,
                  maxLength: 2000,
                  decoration: InputDecoration(
                    hintText: 'Type your message here...',
                    hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
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
                      borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
                    ),
                    contentPadding: const EdgeInsets.all(16),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Minimum 10 characters. URLs will be clickable in the email.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: sending ? null : () => Navigator.of(context).pop(),
              child: const Text(
                'Cancel',
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: sending
                  ? null
                  : () async {
                      final message = messageController.text.trim();
                      if (message.length < 10) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Message must be at least 10 characters'),
                            backgroundColor: Colors.orange,
                          ),
                        );
                        return;
                      }

                      setDialogState(() => sending = true);

                      final result = await _groupsService.broadcastMessage(
                        widget.groupId,
                        message,
                      );

                      if (!context.mounted) return;

                      Navigator.of(context).pop();

                      if (result.success) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Message Sent'),
                            backgroundColor: Color(0xFF10B981),
                          ),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(result.error ?? 'Failed to send broadcast'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 0,
              ),
              child: sending
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Send',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F7FA),
        body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
            )
          : _error != null
              ? _buildErrorState()
              : _buildContent(),
        bottomNavigationBar: BottomNavBar(
          currentIndex: 2, // Groups tab
          onTap: (index) {
            // Pop back to main shell - it will show the selected tab
            Navigator.of(context).popUntil((route) => route.isFirst);
          },
        ),
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
                      onPressed: _loadGroup,
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 20, 16),
      child: Row(
        children: [
          GestureDetector(
            onTap: widget.onBack ?? () => Navigator.of(context).pop(),
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.arrow_back_rounded,
                    color: Color(0xFF1E293B),
                  ),
                  if (widget.backLabel != null) ...[
                    const SizedBox(width: 4),
                    Text(
                      widget.backLabel!,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final group = _group!;
    final membership = _membership;
    final isOrganiser = membership?.isOrganiser ?? false;
    final canManageMembers = membership?.canManageMembers ?? false;

    return Stack(
      children: [
        SafeArea(
          bottom: false,
          child: RefreshIndicator(
            onRefresh: _loadGroup,
            color: const Color(0xFF7C3AED),
            child: CustomScrollView(
              slivers: [
                // App Bar
                SliverToBoxAdapter(child: _buildAppBar()),

                // Constrained content for tablets
                SliverToBoxAdapter(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 600),
                      child: Column(
                        children: [
                          // Hero Section (includes role badge)
                          _buildHeroSection(group, isOrganiser, canManageMembers),

                          // Join card (only for non-members)
                          if (membership == null)
                            _buildJoinCard(group),

                          // Pending join request indicator
                          if (membership?.isPending == true)
                            _buildPendingIndicator(),

                          // Pending Requests Section (only for organisers/hosts)
                          if (canManageMembers && _pendingMembers.isNotEmpty)
                            _buildPendingRequestsSection(),

                          // Members Section (always show, but content varies by membership)
                          _buildMembersSection(group, membership?.isActive == true),

                          // About Section
                          if (group.description != null && group.description!.isNotEmpty)
                            _buildAboutSection(group),

                          // Upcoming Events Section
                          _buildUpcomingEventsSection(),

                          // Bottom actions section
                          _buildBottomActions(group, canManageMembers, isOrganiser, membership?.isActive == true),

                          // Leave group link (for active members who are not organisers)
                          if (membership?.isActive == true && !isOrganiser)
                            _buildLeaveGroupLink(),

                          // Bottom padding
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomActions(GroupDetail group, bool canManageMembers, bool isOrganiser, bool isActiveMember) {
    if (!canManageMembers) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => CreateEventScreen(
                groupId: group.id,
                groupName: group.name,
                canCreateEvents: _membership?.canManageMembers ?? false,
                onEventCreated: () {
                  _loadGroup();
                },
              ),
            ),
          );
        },
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: _theme.gradient,
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: _theme.gradient[0].withAlpha(80),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_rounded, color: Colors.white, size: 22),
              SizedBox(width: 8),
              Text(
                'Create Event',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPendingIndicator() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCD34D)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withAlpha(30),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.schedule_rounded,
              size: 18,
              color: Color(0xFFD97706),
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Request Pending',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF92400E),
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Waiting for organiser approval',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFFB45309),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroSection(
    GroupDetail group,
    bool isOrganiser,
    bool canManageMembers,
  ) {
    final membership = _membership;
    final roleLabel = membership?.isOrganiser == true
        ? 'Organiser'
        : membership?.role == 'host'
            ? 'Host'
            : membership?.isActive == true
                ? 'Member'
                : null;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        children: [
          // Compact hero card with initials and info
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: _theme.gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: _theme.gradient[0].withAlpha(60),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                // Initials circle
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(40),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Center(
                    child: Text(
                      getGroupInitials(group.name),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Group info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.people_rounded,
                            size: 14,
                            color: Colors.white.withAlpha(200),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${group.memberCount} ${group.memberCount == 1 ? 'member' : 'members'}',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Colors.white.withAlpha(200),
                            ),
                          ),
                        ],
                      ),
                      // Role badge
                      if (roleLabel != null) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            roleLabel,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: _theme.gradient[0],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Broadcast and Settings buttons for organisers - in separate row below
          if (isOrganiser) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                // Broadcast button
                Expanded(
                  child: GestureDetector(
                    onTap: _showBroadcastDialog,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _theme.gradient[0].withAlpha(25),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _theme.gradient[0].withAlpha(40),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.campaign_rounded,
                            size: 18,
                            color: _theme.gradient[0],
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Broadcast',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _theme.gradient[0],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Settings button
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => EditGroupScreen(
                            groupId: _group!.id,
                            initialName: _group!.name,
                            initialDescription: _group!.description,
                            initialThemeColor: _group!.themeColor ?? 'indigo',
                            initialJoinPolicy: _group!.joinPolicy,
                            initialVisibility: _group!.visibility,
                            onGroupUpdated: _loadGroup,
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _theme.gradient[0].withAlpha(25),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _theme.gradient[0].withAlpha(40),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.settings_rounded,
                            size: 18,
                            color: _theme.gradient[0],
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Settings',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _theme.gradient[0],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildJoinCard(GroupDetail group) {
    final isOpenGroup = group.joinPolicy == 'auto';
    final buttonText = isOpenGroup ? 'Join Group' : 'Request to Join';
    final subtitleText = isOpenGroup
        ? 'Anyone can join this group'
        : 'Your request will be reviewed by an organiser';

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
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
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: _theme.gradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.group_add_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Join this group',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitleText,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isJoining ? null : _handleJoinGroup,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
                disabledBackgroundColor: const Color(0xFF7C3AED).withAlpha(153),
              ),
              child: _isJoining
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      buttonText,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingRequestsSection() {
    const int previewLimit = 3;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF2FF), // indigo-50
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFC7D2FE)), // indigo-200
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 20,
                color: Color(0xFF6366F1),
              ),
              const SizedBox(width: 8),
              const Text(
                'Pending Requests',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFC7D2FE),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_pendingMembers.length}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF4338CA),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Pending member cards (show up to previewLimit)
          ..._pendingMembers.take(previewLimit).map((member) => _buildPendingMemberCard(member)),

          // "View all" link if more than previewLimit
          if (_pendingMembers.length > previewLimit)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Center(
                child: GestureDetector(
                  onTap: () {
                    // Navigate to members screen with pending tab
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => GroupMembersScreen(
                          groupId: _group!.id,
                          groupName: _group!.name,
                        ),
                      ),
                    );
                  },
                  child: Text(
                    'View all ${_pendingMembers.length} requests',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF6366F1),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPendingMemberCard(GroupMember member) {
    final isProcessing = _processingMemberId == member.id;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: member.avatarUrl == null
                  ? const LinearGradient(
                      colors: [Color(0xFF818CF8), Color(0xFFA78BFA)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              image: member.avatarUrl != null
                  ? DecorationImage(
                      image: NetworkImage(member.avatarUrl!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: member.avatarUrl == null
                ? Center(
                    child: Text(
                      member.initials,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  )
                : null,
          ),

          const SizedBox(width: 12),

          // Name
          Expanded(
            child: Text(
              member.name,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),

          const SizedBox(width: 8),

          // Action buttons
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Approve button
              GestureDetector(
                onTap: isProcessing ? null : () => _handleApproveMember(member),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: isProcessing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Approve',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),

              const SizedBox(width: 8),

              // Decline button
              GestureDetector(
                onTap: isProcessing ? null : () => _handleRejectMember(member),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Decline',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF475569),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMembersSection(GroupDetail group, bool isMember) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with title and "See all" link (only for members)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text(
                    'Members',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${group.memberCount}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
              if (isMember)
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => GroupMembersScreen(
                          groupId: group.id,
                          groupName: group.name,
                        ),
                      ),
                    );
                  },
                  child: const Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF7C3AED),
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 16),

          // Content varies based on membership
          if (!isMember)
            // Non-member: show message to join
            const Text(
              'Join the group to see members',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF94A3B8),
              ),
            )
          else if (_members.isEmpty)
            // Member but still loading
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Loading members...',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ),
            )
          else
            // Member: show avatar grid
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ..._members.take(12).map((member) => _buildMemberAvatar(member)),
                if (group.memberCount > 12)
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Center(
                      child: Text(
                        '+${group.memberCount - 12}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildMemberAvatar(GroupMember member) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: member.avatarUrl == null
            ? const LinearGradient(
                colors: [Color(0xFF818CF8), Color(0xFFA78BFA)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        image: member.avatarUrl != null
            ? DecorationImage(
                image: NetworkImage(member.avatarUrl!),
                fit: BoxFit.cover,
              )
            : null,
      ),
      child: member.avatarUrl == null
          ? Center(
              child: Text(
                member.initials,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildAboutSection(GroupDetail group) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
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
            'About',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _stripHtmlTags(group.description ?? ''),
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

  Widget _buildUpcomingEventsSection() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Upcoming Events${_events.isNotEmpty ? ' (${_events.length})' : ''}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              if (_events.length > 3)
                GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => GroupEventsScreen(
                          groupId: widget.groupId,
                          groupName: _group?.name ?? '',
                        ),
                      ),
                    );
                  },
                  child: const Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF7C3AED),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (_events.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.event_rounded,
                      size: 48,
                      color: Colors.grey.shade300,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'No upcoming events',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Check back later for new events',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            // Show up to 3 events
            ...(_events.take(3).map((event) => _buildEventCard(event))),

          // View past events link
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () => _navigateToPastEvents(),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history_rounded,
                    size: 16,
                    color: Colors.grey.shade500,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'View past events',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade600,
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

  void _navigateToPastEvents() {
    if (_group == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => PastEventsScreen(
          groupId: _group!.id,
          groupName: _group!.name,
        ),
      ),
    );
  }

  Widget _buildEventCard(Event event) {
    final categoryConfig = getCategoryConfig(event.category);
    final gradient = categoryConfig.gradient;
    final dateFormat = DateFormat('EEE d MMM');
    final timeFormat = DateFormat('HH:mm');

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => EventDetailScreen(eventId: event.id),
            ),
          );
        },
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: gradient[0].withAlpha(60),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
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
                  // Background icon
                  Positioned(
                    right: -15,
                    top: -15,
                    child: Icon(
                      categoryConfig.icon,
                      size: 100,
                      color: Colors.white.withAlpha(30),
                    ),
                  ),

                  // Content
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Top row: attendance and status
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withAlpha(40),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                event.capacity != null
                                    ? '${event.attendeeCount}/${event.capacity} going'
                                    : '${event.attendeeCount} going',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            // Status badges
                            if (event.isGoing)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Text(
                                  'Going',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              )
                            else if (event.isWaitlisted)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF8B5CF6),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Text(
                                  'Waitlist',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              )
                            else if (event.isFull && !event.isCancelled)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Text(
                                  'Waitlist',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // Event name
                        Text(
                          event.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),

                        const SizedBox(height: 10),

                        // Date and location
                        Row(
                          children: [
                            Icon(
                              Icons.calendar_today_rounded,
                              size: 13,
                              color: Colors.white.withAlpha(220),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              '${dateFormat.format(event.dateTime)} · ${timeFormat.format(event.dateTime)}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: Colors.white.withAlpha(220),
                              ),
                            ),
                          ],
                        ),

                        if (event.location != null) ...[
                          const SizedBox(height: 5),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on_rounded,
                                size: 13,
                                color: Colors.white.withAlpha(220),
                              ),
                              const SizedBox(width: 5),
                              Expanded(
                                child: Text(
                                  event.location!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: Colors.white.withAlpha(220),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
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

  Widget _buildLeaveGroupLink() {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Center(
        child: GestureDetector(
          onTap: _isLeaving ? null : _showLeaveConfirmation,
          child: _isLeaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF94A3B8),
                  ),
                )
              : const Text(
                  'Leave group',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF94A3B8),
                  ),
                ),
        ),
      ),
    );
  }
}
