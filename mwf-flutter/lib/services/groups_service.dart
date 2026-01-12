import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/constants/api_constants.dart';
import 'package:meetwithfriends/models/api_response.dart';
import 'package:meetwithfriends/models/group.dart';
import 'package:meetwithfriends/models/member.dart';
import 'package:meetwithfriends/services/api_service.dart';

final groupsServiceProvider = Provider<GroupsService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return GroupsService(apiService: apiService);
});

class GroupsService {
  GroupsService({required ApiService apiService}) : _apiService = apiService;

  final ApiService _apiService;

  Future<ApiResponse<List<Group>>> getMyGroups() async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.myGroups,
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final groupsJson = response.data!['groups'] as List<dynamic>?;
      if (groupsJson != null) {
        final groups = groupsJson
            .map((g) => Group.fromJson(g as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(data: groups);
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load groups',
    );
  }

  Future<ApiResponse<Group>> getGroup(int id) async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.groupById(id),
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final groupJson = response.data!['group'] as Map<String, dynamic>?;
      if (groupJson != null) {
        return ApiResponse.success(data: Group.fromJson(groupJson));
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load group',
    );
  }

  Future<ApiResponse<void>> joinGroup(int id, {String? inviteCode}) async {
    return _apiService.post(
      ApiConstants.joinGroup(id),
      data: inviteCode != null ? {'invite_code': inviteCode} : null,
    );
  }

  Future<ApiResponse<void>> leaveGroup(int id) async {
    return _apiService.post(ApiConstants.leaveGroup(id));
  }

  Future<ApiResponse<Group>> createGroup({
    required String name,
    String? description,
    String visibility = 'public',
  }) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      ApiConstants.groups,
      data: {
        'name': name,
        if (description != null) 'description': description,
        'visibility': visibility,
      },
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final groupJson = response.data!['group'] as Map<String, dynamic>?;
      if (groupJson != null) {
        return ApiResponse.success(data: Group.fromJson(groupJson));
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to create group',
    );
  }

  Future<ApiResponse<Group>> updateGroup({
    required int id,
    String? name,
    String? description,
    String? visibility,
  }) async {
    final response = await _apiService.put<Map<String, dynamic>>(
      ApiConstants.groupById(id),
      data: {
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        if (visibility != null) 'visibility': visibility,
      },
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final groupJson = response.data!['group'] as Map<String, dynamic>?;
      if (groupJson != null) {
        return ApiResponse.success(data: Group.fromJson(groupJson));
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to update group',
    );
  }

  Future<ApiResponse<List<Member>>> getMembers(int groupId) async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.groupMembers(groupId),
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final membersJson = response.data!['members'] as List<dynamic>?;
      if (membersJson != null) {
        final members = membersJson
            .map((m) => Member.fromJson(m as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(data: members);
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load members',
    );
  }

  Future<ApiResponse<void>> contactOrganiser({
    required int groupId,
    required String message,
  }) async {
    return _apiService.post(
      ApiConstants.groupContactOrganiser(groupId),
      data: {'message': message},
    );
  }
}
