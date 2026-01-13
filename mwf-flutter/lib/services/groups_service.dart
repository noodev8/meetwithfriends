import '../models/group.dart';
import 'api_service.dart';

class GroupsService {
  final ApiService _api;

  GroupsService({ApiService? api}) : _api = api ?? ApiService();

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
}

class GroupsResult {
  final bool success;
  final List<Group>? groups;
  final String? error;

  GroupsResult({required this.success, this.groups, this.error});
}
