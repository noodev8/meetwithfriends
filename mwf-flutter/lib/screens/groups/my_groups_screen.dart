import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/group.dart';
import 'package:meetwithfriends/providers/groups_provider.dart';
import 'package:meetwithfriends/widgets/empty_state.dart';
import 'package:meetwithfriends/widgets/error_state.dart';
import 'package:meetwithfriends/widgets/group_card.dart';
import 'package:meetwithfriends/widgets/skeleton.dart';

class MyGroupsScreen extends ConsumerWidget {
  const MyGroupsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupsAsync = ref.watch(myGroupsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Groups', style: AppTypography.h4),
        centerTitle: false,
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(myGroupsProvider.notifier).refresh(),
        child: groupsAsync.when(
          data: (groups) => _buildGroupsList(context, groups),
          loading: () => const ListSkeleton(itemBuilder: GroupCardSkeleton.new),
          error: (error, _) => ErrorStates.loadFailed(
            item: 'groups',
            onRetry: () => ref.invalidate(myGroupsProvider),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('${AppRoutes.groups}/new'),
        icon: const Icon(Icons.add),
        label: const Text('New Group'),
      ),
    );
  }

  Widget _buildGroupsList(BuildContext context, List<Group> groups) {
    if (groups.isEmpty) {
      return EmptyStates.noGroups(
        onJoinGroup: () => context.push('${AppRoutes.groups}/new'),
      );
    }

    return ListView.builder(
      padding: AppSpacing.screenPadding,
      itemCount: groups.length,
      itemBuilder: (context, index) {
        final group = groups[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: GroupCard(
            group: group,
            onTap: () => context.push('${AppRoutes.groups}/${group.id}'),
          ),
        );
      },
    );
  }
}
