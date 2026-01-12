import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/member.dart';
import 'package:meetwithfriends/providers/groups_provider.dart';
import 'package:meetwithfriends/widgets/empty_state.dart';
import 'package:meetwithfriends/widgets/error_state.dart';
import 'package:meetwithfriends/widgets/skeleton.dart';

class GroupMembersScreen extends ConsumerWidget {
  const GroupMembersScreen({required this.groupId, super.key});

  final int groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(groupMembersProvider(groupId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Members', style: AppTypography.h4),
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(groupMembersProvider(groupId));
        },
        child: membersAsync.when(
          data: (members) => _buildContent(context, members),
          loading: () => const ListSkeleton(
            itemBuilder: MemberItemSkeleton.new,
          ),
          error: (error, _) => ErrorStates.loadFailed(
            item: 'members',
            onRetry: () => ref.invalidate(groupMembersProvider(groupId)),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<Member> members) {
    if (members.isEmpty) {
      return EmptyStates.noMembers();
    }

    // Group members by role
    final organisers = members.where((m) => m.isOrganiser).toList();
    final hosts = members.where((m) => m.isHost).toList();
    final regularMembers = members.where((m) => m.isMember).toList();

    return ListView(
      padding: AppSpacing.screenPadding,
      children: [
        if (organisers.isNotEmpty) ...[
          _buildSectionHeader('Organisers', organisers.length),
          const SizedBox(height: AppSpacing.sm),
          ...organisers.map(_buildMemberItem),
        ],
        if (hosts.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          _buildSectionHeader('Hosts', hosts.length),
          const SizedBox(height: AppSpacing.sm),
          ...hosts.map(_buildMemberItem),
        ],
        if (regularMembers.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          _buildSectionHeader('Members', regularMembers.length),
          const SizedBox(height: AppSpacing.sm),
          ...regularMembers.map(_buildMemberItem),
        ],
        const SizedBox(height: AppSpacing.lg),
      ],
    );
  }

  Widget _buildSectionHeader(String title, int count) {
    return Row(
      children: [
        Text(title, style: AppTypography.h4),
        const SizedBox(width: AppSpacing.sm),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm,
            vertical: 2,
          ),
          decoration: const BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: AppSpacing.borderRadiusSm,
          ),
          child: Text(
            count.toString(),
            style: AppTypography.labelSmall,
          ),
        ),
      ],
    );
  }

  Widget _buildMemberItem(Member member) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Card(
        child: ListTile(
          leading: _buildAvatar(member),
          title: Text(
            member.displayName,
            style: AppTypography.bodyLarge,
          ),
          subtitle: member.email != null
              ? Text(
                  member.email!,
                  style: AppTypography.bodySmall,
                )
              : null,
          trailing: _buildRoleBadge(member),
        ),
      ),
    );
  }

  Widget _buildAvatar(Member member) {
    if (member.imageUrl != null && member.imageUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 20,
        backgroundImage: CachedNetworkImageProvider(member.imageUrl!),
      );
    }

    return CircleAvatar(
      radius: 20,
      backgroundColor: AppColors.surfaceVariant,
      child: Text(
        _getInitials(member.displayName),
        style: AppTypography.labelMedium.copyWith(
          color: AppColors.textSecondary,
        ),
      ),
    );
  }

  Widget? _buildRoleBadge(Member member) {
    if (member.isMember) return null;

    final isOrganiser = member.isOrganiser;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: isOrganiser
            ? AppColors.secondary.withValues(alpha: 0.1)
            : AppColors.primary.withValues(alpha: 0.1),
        borderRadius: AppSpacing.borderRadiusSm,
      ),
      child: Text(
        isOrganiser ? 'Organiser' : 'Host',
        style: AppTypography.labelSmall.copyWith(
          color: isOrganiser ? AppColors.secondary : AppColors.primary,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}
