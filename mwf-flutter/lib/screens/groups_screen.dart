import 'package:flutter/material.dart';

class GroupsScreen extends StatelessWidget {
  const GroupsScreen({super.key});

  // Mock data - will be replaced with API calls
  static final List<Map<String, dynamic>> _groups = [
    {
      'id': 1,
      'name': 'Brookfield Socials',
      'members': 9,
      'role': 'Organiser',
      'initial': 'BS',
      'color': Color(0xFF10B981),
      'upcomingEvents': 3,
    },
    {
      'id': 2,
      'name': 'Friday Night Dinners',
      'members': 12,
      'role': 'Member',
      'initial': 'FN',
      'color': Color(0xFF6366F1),
      'upcomingEvents': 1,
    },
    {
      'id': 3,
      'name': 'Coffee Lovers Club',
      'members': 5,
      'role': 'Host',
      'initial': 'CL',
      'color': Color(0xFFF59E0B),
      'upcomingEvents': 0,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Groups',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                    letterSpacing: -0.5,
                  ),
                ),
                // New Group button
                GestureDetector(
                  onTap: () {
                    // Create new group
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF10B981), Color(0xFF059669)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981).withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(
                          Icons.add_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'New Group',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Subtitle
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              '${_groups.length} groups',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF64748B).withOpacity(0.9),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Groups list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _groups.length,
              itemBuilder: (context, index) {
                final group = _groups[index];
                return _GroupDetailCard(group: group);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _GroupDetailCard extends StatelessWidget {
  final Map<String, dynamic> group;

  const _GroupDetailCard({required this.group});

  @override
  Widget build(BuildContext context) {
    final color = group['color'] as Color;
    final role = group['role'] as String;
    final upcomingEvents = group['upcomingEvents'] as int;

    Color roleColor;
    switch (role.toLowerCase()) {
      case 'organiser':
        roleColor = const Color(0xFF7C3AED);
        break;
      case 'host':
        roleColor = const Color(0xFFF59E0B);
        break;
      default:
        roleColor = const Color(0xFF64748B);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () {
          // Navigate to group detail
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
              // Avatar
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    group['initial'] as String,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: color,
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
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            group['name'] as String,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1E293B),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: roleColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            role.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: roleColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.people_outline_rounded,
                          size: 14,
                          color: const Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${group['members']} members',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.event_rounded,
                          size: 14,
                          color: const Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          upcomingEvents == 0
                              ? 'No events'
                              : '$upcomingEvents upcoming',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: upcomingEvents > 0
                                ? const Color(0xFF10B981)
                                : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Arrow
              Icon(
                Icons.chevron_right_rounded,
                color: const Color(0xFF94A3B8).withOpacity(0.8),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
