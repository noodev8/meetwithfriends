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
