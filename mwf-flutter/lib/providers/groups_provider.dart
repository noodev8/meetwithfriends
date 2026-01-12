import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/models/group.dart';
import 'package:meetwithfriends/models/member.dart';
import 'package:meetwithfriends/services/groups_service.dart';

final myGroupsProvider = AsyncNotifierProvider<MyGroupsNotifier, List<Group>>(
  MyGroupsNotifier.new,
);

class MyGroupsNotifier extends AsyncNotifier<List<Group>> {
  @override
  Future<List<Group>> build() async {
    return _fetchGroups();
  }

  Future<List<Group>> _fetchGroups() async {
    final groupsService = ref.read(groupsServiceProvider);
    final response = await groupsService.getMyGroups();

    if (response.isSuccess && response.data != null) {
      return response.data!;
    }

    throw Exception(response.message ?? 'Failed to load groups');
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetchGroups);
  }
}

final groupDetailProvider = FutureProvider.family<Group?, int>((
  ref,
  groupId,
) async {
  final groupsService = ref.read(groupsServiceProvider);
  final response = await groupsService.getGroup(groupId);

  if (response.isSuccess && response.data != null) {
    return response.data;
  }

  return null;
});

final groupMembersProvider = FutureProvider.family<List<Member>, int>((
  ref,
  groupId,
) async {
  final groupsService = ref.read(groupsServiceProvider);
  final response = await groupsService.getMembers(groupId);

  if (response.isSuccess && response.data != null) {
    return response.data!;
  }

  return [];
});
