import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/event.dart';
import 'package:meetwithfriends/models/group.dart';
import 'package:meetwithfriends/providers/events_provider.dart';
import 'package:meetwithfriends/providers/groups_provider.dart';
import 'package:meetwithfriends/services/groups_service.dart';
import 'package:meetwithfriends/widgets/contact_message_sheet.dart';
import 'package:meetwithfriends/widgets/event_card.dart';

class GroupDetailScreen extends ConsumerWidget {
  const GroupDetailScreen({required this.groupId, super.key});

  final int groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupAsync = ref.watch(groupDetailProvider(groupId));
    final eventsAsync = ref.watch(groupEventsProvider(groupId));

    return Scaffold(
      body: groupAsync.when(
        data: (group) {
          if (group == null) {
            return _buildNotFoundState(context);
          }
          return _buildContent(context, ref, group, eventsAsync);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _buildErrorState(context, error.toString()),
      ),
      floatingActionButton: groupAsync.whenOrNull(
        data: (group) {
          if (group == null) return null;
          if (!group.isOrganiser && !group.isHost) return null;
          return FloatingActionButton.extended(
            onPressed: () => context.push(
              '${AppRoutes.groups}/$groupId/events/new',
            ),
            icon: const Icon(Icons.add),
            label: const Text('New Event'),
          );
        },
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    Group group,
    AsyncValue<List<Event>> eventsAsync,
  ) {
    return CustomScrollView(
      slivers: [
        // App bar with image
        _buildSliverAppBar(context, group),
        // Content
        SliverToBoxAdapter(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppSpacing.md),
                // Group info
                _buildGroupInfo(group),
                const SizedBox(height: AppSpacing.lg),
                // Stats
                _buildStats(context, group),
                const SizedBox(height: AppSpacing.xl),
                // Upcoming events
                const Text('Upcoming Events', style: AppTypography.h4),
                const SizedBox(height: AppSpacing.md),
              ],
            ),
          ),
        ),
        // Events list
        eventsAsync.when(
          data: _buildEventsList,
          loading: () => const SliverToBoxAdapter(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(AppSpacing.xl),
                child: CircularProgressIndicator(),
              ),
            ),
          ),
          error: (error, _) => SliverToBoxAdapter(
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: Text(
                'Failed to load events',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ),
        ),
        // Past Events link
        SliverToBoxAdapter(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: TextButton.icon(
              onPressed: () => context.push(
                '${AppRoutes.groups}/$groupId/past-events',
              ),
              icon: const Icon(Icons.history, size: 18),
              label: const Text('View past events'),
            ),
          ),
        ),
        // Contact Organiser section
        SliverToBoxAdapter(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: _buildContactOrganiserSection(context, ref, group),
          ),
        ),
        // Bottom padding
        const SliverToBoxAdapter(
          child: SizedBox(height: AppSpacing.xl),
        ),
      ],
    );
  }

  Widget _buildSliverAppBar(BuildContext context, Group group) {
    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          group.name,
          style: AppTypography.h4.copyWith(color: Colors.white),
        ),
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (group.imageUrl != null && group.imageUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: group.imageUrl!,
                fit: BoxFit.cover,
                placeholder: (_, __) => _buildPlaceholderBackground(),
                errorWidget: (_, __, ___) => _buildPlaceholderBackground(),
              )
            else
              _buildPlaceholderBackground(),
            // Gradient overlay for text readability
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black54],
                ),
              ),
            ),
          ],
        ),
      ),
      leading: IconButton(
        icon: const CircleAvatar(
          backgroundColor: Colors.black26,
          child: Icon(Icons.arrow_back, color: Colors.white),
        ),
        onPressed: () => context.pop(),
      ),
      actions: [
        if (group.isOrganiser || group.isHost)
          IconButton(
            icon: const CircleAvatar(
              backgroundColor: Colors.black26,
              child: Icon(Icons.edit, color: Colors.white, size: 20),
            ),
            onPressed: () {
              // Navigate to edit group - future feature
            },
          ),
      ],
    );
  }

  Widget _buildPlaceholderBackground() {
    return const ColoredBox(
      color: AppColors.primary,
      child: Center(
        child: Icon(Icons.people, color: Colors.white54, size: 64),
      ),
    );
  }

  Widget _buildGroupInfo(Group group) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (group.isOrganiser || group.isHost) ...[
          _buildRoleBadge(group.isOrganiser),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (group.description != null && group.description!.isNotEmpty)
          Text(
            group.description!,
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
      ],
    );
  }

  Widget _buildRoleBadge(bool isOrganiser) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
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

  Widget _buildStats(BuildContext context, Group group) {
    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: () => context.push(
              '${AppRoutes.groups}/$groupId/members',
            ),
            borderRadius: AppSpacing.borderRadiusMd,
            child: _buildStatCard(
              icon: Icons.people_outline,
              value: group.memberCount.toString(),
              label: 'Members',
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: _buildStatCard(
            icon: Icons.event_outlined,
            value: group.upcomingEventCount.toString(),
            label: 'Upcoming',
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 28),
            const SizedBox(height: AppSpacing.xs),
            Text(value, style: AppTypography.h3),
            Text(
              label,
              style: AppTypography.caption,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventsList(List<Event> events) {
    if (events.isEmpty) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: AppSpacing.screenPadding,
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.xl),
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: AppSpacing.borderRadiusMd,
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.event_outlined,
                  color: AppColors.textTertiary,
                  size: 40,
                ),
                const SizedBox(height: AppSpacing.sm),
                const Text(
                  'No upcoming events',
                  style: AppTypography.labelLarge,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Check back later for new events',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: EventCard(
                event: events[index],
                onTap: () {
                  context.push(
                    '${AppRoutes.events}/${events[index].id}',
                  );
                },
              ),
            );
          },
          childCount: events.length,
        ),
      ),
    );
  }

  Widget _buildContactOrganiserSection(
    BuildContext context,
    WidgetRef ref,
    Group group,
  ) {
    // Don't show if user is organiser
    if (group.isOrganiser) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            const CircleAvatar(
              radius: 20,
              backgroundColor: AppColors.surfaceVariant,
              child: Icon(
                Icons.person,
                color: AppColors.textTertiary,
                size: 24,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Organiser', style: AppTypography.labelMedium),
                  Text(
                    group.organiserName ?? 'Unknown',
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            TextButton.icon(
              onPressed: () => _showContactOrganiserSheet(context, ref, group),
              icon: const Icon(Icons.mail_outline, size: 18),
              label: const Text('Contact'),
            ),
          ],
        ),
      ),
    );
  }

  void _showContactOrganiserSheet(
    BuildContext context,
    WidgetRef ref,
    Group group,
  ) {
    ContactMessageSheet.show(
      context: context,
      recipientType: 'Organiser',
      recipientName: group.organiserName ?? 'Organiser',
      onSend: (message) async {
        final groupsService = ref.read(groupsServiceProvider);
        final response = await groupsService.contactOrganiser(
          groupId: group.id,
          message: message,
        );

        if (!response.isSuccess && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to send message'),
              backgroundColor: AppColors.error,
            ),
          );
        }

        return response.isSuccess;
      },
    );
  }

  Widget _buildNotFoundState(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.search_off,
              color: AppColors.textTertiary,
              size: 64,
            ),
            const SizedBox(height: AppSpacing.lg),
            const Text(
              'Group not found',
              style: AppTypography.h4,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'This group may have been deleted or you '
              "don't have access to it",
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 64),
            const SizedBox(height: AppSpacing.lg),
            const Text(
              'Something went wrong',
              style: AppTypography.h4,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Failed to load group details',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }
}
