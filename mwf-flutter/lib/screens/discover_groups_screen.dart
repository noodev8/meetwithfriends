import 'package:flutter/material.dart';
import '../models/group.dart';
import '../config/group_themes.dart';
import '../services/groups_service.dart';
import '../widgets/bottom_nav_bar.dart';
import 'group_dashboard_screen.dart';

class DiscoverGroupsScreen extends StatefulWidget {
  final List<Group> groups;

  const DiscoverGroupsScreen({
    super.key,
    required this.groups,
  });

  @override
  State<DiscoverGroupsScreen> createState() => _DiscoverGroupsScreenState();
}

class _DiscoverGroupsScreenState extends State<DiscoverGroupsScreen> {
  late List<Group> _groups;

  @override
  void initState() {
    super.initState();
    _groups = List.from(widget.groups);
  }

  void _onGroupJoined(int groupId) {
    setState(() {
      _groups.removeWhere((g) => g.id == groupId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF1E293B)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Discover Groups',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1E293B),
          ),
        ),
        centerTitle: false,
      ),
      body: SafeArea(
        child: _groups.isEmpty
            ? _buildEmptyState()
            : ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: _groups.length,
                itemBuilder: (context, index) {
                  final group = _groups[index];
                  return _DiscoverGroupCard(
                    group: group,
                    onJoined: () => _onGroupJoined(group.id),
                  );
                },
              ),
      ),
      bottomNavigationBar: BottomNavBar(
        currentIndex: -1,
        onTap: (index) {
          navigateToMainTab(context, index);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off_rounded,
              size: 64,
              color: Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            const Text(
              'No groups to discover',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'All available groups are already in your list',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DiscoverGroupCard extends StatefulWidget {
  final Group group;
  final VoidCallback? onJoined;

  const _DiscoverGroupCard({required this.group, this.onJoined});

  @override
  State<_DiscoverGroupCard> createState() => _DiscoverGroupCardState();
}

class _DiscoverGroupCardState extends State<_DiscoverGroupCard> {
  final GroupsService _groupsService = GroupsService();
  bool _isJoining = false;

  Future<void> _joinGroup() async {
    setState(() => _isJoining = true);

    final result = await _groupsService.joinGroup(widget.group.id);

    if (!mounted) return;

    setState(() => _isJoining = false);

    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.isPending
                ? 'Request sent! Waiting for approval.'
                : 'Welcome to ${widget.group.name}!',
          ),
          backgroundColor: result.isPending
              ? const Color(0xFFF59E0B)
              : const Color(0xFF10B981),
        ),
      );

      widget.onJoined?.call();

      if (result.isActive) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => GroupDashboardScreen(
              groupId: widget.group.id,
              backLabel: 'Discover',
            ),
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.error ?? 'Failed to join group'),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = getGroupTheme(widget.group.themeColor);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
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
        child: Row(
          children: [
            // Avatar
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: theme.bgColor.withAlpha(38),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  getGroupInitials(widget.group.name),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: theme.bgColor,
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
                  Text(
                    widget.group.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.people_outline_rounded,
                        size: 14,
                        color: Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${widget.group.memberCount} members',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      if (widget.group.upcomingEventCount > 0) ...[
                        const SizedBox(width: 12),
                        const Icon(
                          Icons.event_rounded,
                          size: 14,
                          color: Color(0xFF6366F1),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${widget.group.upcomingEventCount} upcoming',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF6366F1),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 12),

            // Join button
            SizedBox(
              height: 36,
              child: ElevatedButton(
                onPressed: _isJoining ? null : _joinGroup,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                child: _isJoining
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Join',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
