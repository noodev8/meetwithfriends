import '../models/group.dart';
import 'api_service.dart';

class GroupsService {
  final ApiService _api;

  GroupsService({ApiService? api}) : _api = api ?? ApiService();

  /// Get a single group by ID with membership info
  Future<GroupDetailResult> getGroup(int groupId) async {
    final response = await _api.get('/groups/$groupId');

    if (response['return_code'] == 'SUCCESS') {
      final groupJson = response['group'] as Map<String, dynamic>;
      final membershipJson = response['membership'] as Map<String, dynamic>?;

      return GroupDetailResult(
        success: true,
        group: GroupDetail.fromJson(groupJson),
        membership: membershipJson != null
            ? GroupMembership.fromJson(membershipJson)
            : null,
      );
    }

    return GroupDetailResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load group',
    );
  }

  /// Get groups the current user belongs to
  Future<GroupsResult> getMyGroups() async {
    final response = await _api.get('/users/my-groups');

    if (response['return_code'] == 'SUCCESS') {
      final groupsList = response['groups'] as List<dynamic>? ?? [];
      final groups = groupsList
          .map((g) => Group.fromJson(g as Map<String, dynamic>))
          .toList();
      return GroupsResult(success: true, groups: groups);
    }

    return GroupsResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load groups',
    );
  }

  /// Get all public/listed groups (for discovery)
  Future<GroupsResult> discoverGroups() async {
    final response = await _api.get('/groups');

    if (response['return_code'] == 'SUCCESS') {
      final groupsList = response['groups'] as List<dynamic>? ?? [];
      final groups = groupsList
          .map((g) => Group.fromJson(g as Map<String, dynamic>))
          .toList();
      return GroupsResult(success: true, groups: groups);
    }

    return GroupsResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load groups',
    );
  }

  /// Create a new group
  Future<CreateGroupResult> createGroup({
    required String name,
    String? description,
    String themeColor = 'indigo',
    String joinPolicy = 'approval',
    String visibility = 'listed',
  }) async {
    final response = await _api.post('/groups/create', {
      'name': name,
      'description': description,
      'theme_color': themeColor,
      'join_policy': joinPolicy,
      'visibility': visibility,
    });

    if (response['return_code'] == 'SUCCESS') {
      final groupJson = response['group'] as Map<String, dynamic>;
      return CreateGroupResult(
        success: true,
        groupId: groupJson['id'] as int,
      );
    }

    return CreateGroupResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to create group',
    );
  }

  /// Update an existing group (organiser only)
  Future<UpdateGroupResult> updateGroup({
    required int groupId,
    String? name,
    String? description,
    String? themeColor,
    String? joinPolicy,
    String? visibility,
  }) async {
    final Map<String, dynamic> payload = {};
    if (name != null) payload['name'] = name;
    if (description != null) payload['description'] = description;
    if (themeColor != null) payload['theme_color'] = themeColor;
    if (joinPolicy != null) payload['join_policy'] = joinPolicy;
    if (visibility != null) payload['visibility'] = visibility;

    final response = await _api.post('/groups/$groupId/update', payload);

    if (response['return_code'] == 'SUCCESS') {
      return UpdateGroupResult(success: true);
    }

    return UpdateGroupResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to update group',
    );
  }

  /// Get group members with optional pagination and search
  Future<GroupMembersResult> getGroupMembers(
    int groupId, {
    String status = 'active',
    String? search,
    int limit = 20,
    int offset = 0,
  }) async {
    final queryParams = <String, String>{
      'status': status,
      'limit': limit.toString(),
      'offset': offset.toString(),
    };
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final queryString = queryParams.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');

    final response = await _api.get('/groups/$groupId/members?$queryString');

    if (response['return_code'] == 'SUCCESS') {
      final membersList = response['members'] as List<dynamic>? ?? [];
      final members = membersList
          .map((m) => GroupMember.fromJson(m as Map<String, dynamic>))
          .toList();

      return GroupMembersResult(
        success: true,
        members: members,
        totalCount: int.tryParse(response['total_count']?.toString() ?? '0') ?? 0,
        hasMore: response['has_more'] as bool? ?? false,
      );
    }

    return GroupMembersResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load members',
    );
  }

  /// Approve a pending member request (organiser/host only)
  Future<MemberActionResult> approveMember(int groupId, int membershipId) async {
    final response = await _api.post('/groups/$groupId/members/approve', {
      'membership_id': membershipId,
    });

    if (response['return_code'] == 'SUCCESS') {
      return MemberActionResult(success: true);
    }

    return MemberActionResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to approve member',
    );
  }

  /// Reject a pending member request (organiser/host only)
  Future<MemberActionResult> rejectMember(int groupId, int membershipId) async {
    final response = await _api.post('/groups/$groupId/members/reject', {
      'membership_id': membershipId,
    });

    if (response['return_code'] == 'SUCCESS') {
      return MemberActionResult(success: true);
    }

    return MemberActionResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to reject member',
    );
  }

  /// Leave a group (for active members, not organisers)
  Future<MemberActionResult> leaveGroup(int groupId) async {
    final response = await _api.post('/groups/$groupId/leave', {});

    if (response['return_code'] == 'SUCCESS') {
      return MemberActionResult(success: true);
    }

    return MemberActionResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to leave group',
    );
  }

  /// Remove a member from a group (organiser only)
  Future<MemberActionResult> removeMember(int groupId, int membershipId) async {
    final response = await _api.post('/groups/$groupId/members/remove', {
      'membership_id': membershipId,
    });

    if (response['return_code'] == 'SUCCESS') {
      return MemberActionResult(success: true);
    }

    return MemberActionResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to remove member',
    );
  }

  /// Assign a role to a member (organiser only)
  /// role can be 'host' or 'member'
  Future<MemberActionResult> assignRole(int groupId, int membershipId, String role) async {
    final response = await _api.post('/groups/$groupId/members/role', {
      'membership_id': membershipId,
      'role': role,
    });

    if (response['return_code'] == 'SUCCESS') {
      return MemberActionResult(success: true);
    }

    return MemberActionResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to update role',
    );
  }

  /// Join or request to join a group
  /// For open groups (join_policy: 'auto'), the user is immediately added as a member
  /// For approval-required groups, a pending request is created
  Future<JoinGroupResult> joinGroup(int groupId, {String? inviteCode}) async {
    final Map<String, dynamic> payload = {'group_id': groupId};
    if (inviteCode != null && inviteCode.isNotEmpty) {
      payload['invite_code'] = inviteCode;
    }

    final response = await _api.post('/groups/join', payload);

    if (response['return_code'] == 'SUCCESS') {
      return JoinGroupResult(
        success: true,
        status: response['status'] as String? ?? 'active',
        message: response['message'] as String?,
      );
    }

    // Handle specific error cases
    String errorMessage;
    switch (response['return_code']) {
      case 'ALREADY_MEMBER':
        errorMessage = 'You are already a member of this group';
        break;
      case 'ALREADY_PENDING':
        errorMessage = 'You already have a pending request to join this group';
        break;
      case 'NOT_FOUND':
        errorMessage = 'Group not found or invalid invite code';
        break;
      default:
        errorMessage = response['message'] as String? ?? 'Failed to join group';
    }

    return JoinGroupResult(
      success: false,
      error: errorMessage,
      returnCode: response['return_code'] as String?,
    );
  }

  /// Send a broadcast message to all group members (organiser only)
  Future<BroadcastResult> broadcastMessage(int groupId, String message) async {
    final response = await _api.post('/groups/$groupId/broadcast', {
      'message': message,
    });

    if (response['return_code'] == 'SUCCESS') {
      return BroadcastResult(
        success: true,
        message: response['message'] as String?,
        queuedCount: response['queued'] as int? ?? 0,
      );
    }

    return BroadcastResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to send broadcast',
    );
  }
}

class BroadcastResult {
  final bool success;
  final String? message;
  final int queuedCount;
  final String? error;

  BroadcastResult({
    required this.success,
    this.message,
    this.queuedCount = 0,
    this.error,
  });
}

class JoinGroupResult {
  final bool success;
  final String? status; // 'active' or 'pending'
  final String? message;
  final String? error;
  final String? returnCode;

  JoinGroupResult({
    required this.success,
    this.status,
    this.message,
    this.error,
    this.returnCode,
  });

  bool get isActive => status == 'active';
  bool get isPending => status == 'pending';
}

class MemberActionResult {
  final bool success;
  final String? error;

  MemberActionResult({required this.success, this.error});
}

class GroupMembersResult {
  final bool success;
  final List<GroupMember>? members;
  final int totalCount;
  final bool hasMore;
  final String? error;

  GroupMembersResult({
    required this.success,
    this.members,
    this.totalCount = 0,
    this.hasMore = false,
    this.error,
  });
}

class GroupMember {
  final int id;
  final int userId;
  final String name;
  final String? avatarUrl;
  final String role;
  final String status;
  final DateTime joinedAt;

  GroupMember({
    required this.id,
    required this.userId,
    required this.name,
    this.avatarUrl,
    required this.role,
    required this.status,
    required this.joinedAt,
  });

  factory GroupMember.fromJson(Map<String, dynamic> json) {
    return GroupMember(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      name: json['name'] as String,
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String? ?? 'member',
      status: json['status'] as String? ?? 'active',
      joinedAt: DateTime.parse(json['joined_at'] as String),
    );
  }

  bool get isOrganiser => role == 'organiser';
  bool get isHost => role == 'host';

  String get initials {
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }
}

class UpdateGroupResult {
  final bool success;
  final String? error;

  UpdateGroupResult({required this.success, this.error});
}

class CreateGroupResult {
  final bool success;
  final int? groupId;
  final String? error;

  CreateGroupResult({required this.success, this.groupId, this.error});
}

class GroupsResult {
  final bool success;
  final List<Group>? groups;
  final String? error;

  GroupsResult({required this.success, this.groups, this.error});
}

class GroupDetailResult {
  final bool success;
  final GroupDetail? group;
  final GroupMembership? membership;
  final String? error;

  GroupDetailResult({
    required this.success,
    this.group,
    this.membership,
    this.error,
  });
}

class GroupDetail {
  final int id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String? imagePosition;
  final String joinPolicy;
  final String visibility;
  final String? themeColor;
  final String? icon;
  final String? inviteCode;
  final int memberCount;
  final DateTime createdAt;

  GroupDetail({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    this.imagePosition,
    required this.joinPolicy,
    required this.visibility,
    this.themeColor,
    this.icon,
    this.inviteCode,
    required this.memberCount,
    required this.createdAt,
  });

  factory GroupDetail.fromJson(Map<String, dynamic> json) {
    return GroupDetail(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      imagePosition: json['image_position'] as String?,
      joinPolicy: json['join_policy'] as String? ?? 'approval',
      visibility: json['visibility'] as String? ?? 'listed',
      themeColor: json['theme_color'] as String?,
      icon: json['icon'] as String?,
      inviteCode: json['invite_code'] as String?,
      memberCount: int.tryParse(json['member_count']?.toString() ?? '0') ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  String get initials {
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }
}

class GroupMembership {
  final String? status; // 'active', 'pending', or null
  final String? role; // 'organiser', 'host', 'member', or null

  GroupMembership({this.status, this.role});

  factory GroupMembership.fromJson(Map<String, dynamic> json) {
    return GroupMembership(
      status: json['status'] as String?,
      role: json['role'] as String?,
    );
  }

  bool get isActive => status == 'active';
  bool get isPending => status == 'pending';
  bool get isOrganiser => isActive && role == 'organiser';
  bool get isHost => isActive && role == 'host';
  bool get canManageMembers => isActive && (role == 'organiser' || role == 'host');
}
