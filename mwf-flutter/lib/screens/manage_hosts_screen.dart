import 'package:flutter/material.dart';
import '../services/events_service.dart';
import '../services/groups_service.dart';

class ManageHostsScreen extends StatefulWidget {
  final int eventId;
  final int groupId;
  final List<EventHost> initialHosts;

  const ManageHostsScreen({
    super.key,
    required this.eventId,
    required this.groupId,
    required this.initialHosts,
  });

  @override
  State<ManageHostsScreen> createState() => _ManageHostsScreenState();
}

class _ManageHostsScreenState extends State<ManageHostsScreen> {
  final EventsService _eventsService = EventsService();
  final GroupsService _groupsService = GroupsService();

  late List<EventHost> _hosts;
  bool _hostsChanged = false;

  // Member search state
  List<GroupMember> _members = [];
  bool _hasMore = false;
  bool _loading = false;
  bool _hasSearched = false;
  String _searchQuery = '';
  int _offset = 0;
  final TextEditingController _searchController = TextEditingController();

  // Action loading states
  int? _addingUserId;
  int? _removingUserId;
  String? _errorMessage;

  static const int _pageSize = 20;

  @override
  void initState() {
    super.initState();
    _hosts = List.from(widget.initialHosts);
    _loadInitialMembers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialMembers() async {
    setState(() => _loading = true);

    final result = await _groupsService.getGroupMembers(
      widget.groupId,
      limit: _pageSize,
      offset: 0,
    );

    if (mounted) {
      setState(() {
        _loading = false;
        _hasSearched = true;
        if (result.success && result.members != null) {
          _members = result.members!;
          _hasMore = result.hasMore;
          _offset = _pageSize;
        }
      });
    }
  }

  Future<void> _handleSearch() async {
    final query = _searchController.text.trim();
    setState(() {
      _loading = true;
      _searchQuery = query;
      _errorMessage = null;
    });

    final result = await _groupsService.getGroupMembers(
      widget.groupId,
      search: query.isNotEmpty ? query : null,
      limit: _pageSize,
      offset: 0,
    );

    if (mounted) {
      setState(() {
        _loading = false;
        _hasSearched = true;
        if (result.success && result.members != null) {
          _members = result.members!;
          _hasMore = result.hasMore;
          _offset = _pageSize;
        }
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loading) return;

    setState(() => _loading = true);

    final result = await _groupsService.getGroupMembers(
      widget.groupId,
      search: _searchQuery.isNotEmpty ? _searchQuery : null,
      limit: _pageSize,
      offset: _offset,
    );

    if (mounted) {
      setState(() {
        _loading = false;
        if (result.success && result.members != null) {
          _members.addAll(result.members!);
          _hasMore = result.hasMore;
          _offset += _pageSize;
        }
      });
    }
  }

  Future<void> _addHost(GroupMember member) async {
    setState(() {
      _addingUserId = member.userId;
      _errorMessage = null;
    });

    final result = await _eventsService.addHost(widget.eventId, member.userId);

    if (mounted) {
      setState(() {
        _addingUserId = null;
        if (result.success) {
          final newHost = result.host ?? EventHost(
            userId: member.userId,
            name: member.name,
            avatarUrl: member.avatarUrl,
          );
          _hosts.add(newHost);
          _hostsChanged = true;
        } else {
          if (result.returnCode == 'ALREADY_HOST') {
            _errorMessage = '${member.name} is already a host.';
          } else {
            _errorMessage = result.error ?? 'Failed to add host';
          }
        }
      });
    }
  }

  Future<void> _removeHost(EventHost host) async {
    setState(() {
      _removingUserId = host.userId;
      _errorMessage = null;
    });

    final result = await _eventsService.removeHost(widget.eventId, host.userId);

    if (mounted) {
      setState(() {
        _removingUserId = null;
        if (result.success) {
          _hosts.removeWhere((h) => h.userId == host.userId);
          _hostsChanged = true;
        } else {
          if (result.returnCode == 'LAST_HOST') {
            _errorMessage = 'Add another host first before removing this one.';
          } else {
            _errorMessage = result.error ?? 'Failed to remove host';
          }
        }
      });
    }
  }

  bool _isHost(int userId) => _hosts.any((h) => h.userId == userId);

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop && _hostsChanged) {
          // Result already set via Navigator.pop
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F7FA),
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            onPressed: () => Navigator.of(context).pop(_hostsChanged),
            icon: const Icon(Icons.arrow_back_rounded),
            color: const Color(0xFF1E293B),
          ),
          title: const Text(
            'Manage Hosts',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(
              color: const Color(0xFFE2E8F0),
              height: 1,
            ),
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Error message
                  if (_errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.red.shade700,
                        ),
                      ),
                    ),

                  // Current Hosts Section
                  Text(
                    'CURRENT HOSTS (${_hosts.length})',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._hosts.map((host) => _buildHostTile(host)),

                  // Divider
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Divider(color: Color(0xFFE2E8F0)),
                  ),

                  // Add Host Section
                  const Text(
                    'ADD HOST',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Search field
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Search group members...',
                            hintStyle: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 14,
                            ),
                            filled: true,
                            fillColor: Colors.white,
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
                          ),
                          onSubmitted: (_) => _handleSearch(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _loading ? null : _handleSearch,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7C3AED),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'Search',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Member results
                  if (_hasSearched) ...[
                    if (_members.isEmpty && !_loading)
                      Container(
                        padding: const EdgeInsets.all(24),
                        alignment: Alignment.center,
                        child: const Text(
                          'No members found',
                          style: TextStyle(
                            fontSize: 14,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ..._members.map((member) => _buildMemberTile(member)),
                    if (_hasMore)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Center(
                          child: TextButton(
                            onPressed: _loading ? null : _loadMore,
                            child: Text(
                              _loading ? 'Loading...' : 'Load More',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF7C3AED),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],

                  if (_loading && _members.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF7C3AED),
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

  Widget _buildHostTile(EventHost host) {
    final isRemoving = _removingUserId == host.userId;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          _buildAvatar(host.name, host.avatarUrl, 40),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              host.name,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (_hosts.length > 1)
            GestureDetector(
              onTap: isRemoving ? null : () => _removeHost(host),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: isRemoving
                    ? SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.red.shade400,
                        ),
                      )
                    : Icon(
                        Icons.close_rounded,
                        size: 16,
                        color: Colors.red.shade600,
                      ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMemberTile(GroupMember member) {
    final memberIsHost = _isHost(member.userId);
    final isAdding = _addingUserId == member.userId;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          _buildAvatar(member.name, member.avatarUrl, 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  member.role[0].toUpperCase() + member.role.substring(1),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: member.isOrganiser
                        ? const Color(0xFF4F46E5)
                        : member.isHost
                            ? const Color(0xFF7C3AED)
                            : const Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
          if (memberIsHost)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Host',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF4F46E5),
                ),
              ),
            )
          else
            GestureDetector(
              onTap: isAdding ? null : () => _addHost(member),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: isAdding
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Add',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAvatar(String name, String? avatarUrl, double size) {
    if (avatarUrl != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(size / 2),
          image: DecorationImage(
            image: NetworkImage(avatarUrl),
            fit: BoxFit.cover,
          ),
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE0E7FF), Color(0xFFEDE9FE)],
        ),
        borderRadius: BorderRadius.circular(size / 2),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: TextStyle(
            fontSize: size * 0.36,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF6366F1),
          ),
        ),
      ),
    );
  }
}
