import 'package:flutter/material.dart';
import '../models/group.dart';
import '../config/group_themes.dart';
import '../widgets/bottom_nav_bar.dart';
import 'group_dashboard_screen.dart';

class DiscoverGroupsScreen extends StatelessWidget {
  final List<Group> groups;

  const DiscoverGroupsScreen({
    super.key,
    required this.groups,
  });

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
        child: groups.isEmpty
            ? _buildEmptyState()
            : ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: groups.length,
                itemBuilder: (context, index) {
                  final group = groups[index];
                  return _DiscoverGroupCard(group: group);
                },
              ),
      ),
      bottomNavigationBar: BottomNavBar(
        currentIndex: -1,
        onTap: (index) {
          Navigator.of(context).popUntil((route) => route.isFirst);
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

class _DiscoverGroupCard extends StatelessWidget {
  final Group group;

  const _DiscoverGroupCard({required this.group});

  @override
  Widget build(BuildContext context) {
    final theme = getGroupTheme(group.themeColor);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => GroupDashboardScreen(groupId: group.id),
            ),
          );
        },
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
                    getGroupInitials(group.name),
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
                      group.name,
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
                          '${group.memberCount} members',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        if (group.upcomingEventCount > 0) ...[
                          const SizedBox(width: 12),
                          const Icon(
                            Icons.event_rounded,
                            size: 14,
                            color: Color(0xFF6366F1),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${group.upcomingEventCount} upcoming',
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

              // Arrow
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
}
