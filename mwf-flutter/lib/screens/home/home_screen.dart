import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/event.dart';
import 'package:meetwithfriends/models/group.dart';
import 'package:meetwithfriends/providers/auth_provider.dart';
import 'package:meetwithfriends/providers/events_provider.dart';
import 'package:meetwithfriends/providers/groups_provider.dart';
import 'package:meetwithfriends/widgets/event_card.dart';
import 'package:meetwithfriends/widgets/group_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final eventsAsync = ref.watch(myEventsProvider);
    final groupsAsync = ref.watch(myGroupsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hello, ${user?.displayName ?? 'there'}!',
              style: AppTypography.h4,
            ),
          ],
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // Notifications - future feature
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(myEventsProvider.notifier).refresh();
          await ref.read(myGroupsProvider.notifier).refresh();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: AppSpacing.screenPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Upcoming Events Section
              _buildSectionHeader(
                context,
                title: 'Upcoming Events',
                onSeeAll: () => context.go(AppRoutes.events),
              ),
              const SizedBox(height: AppSpacing.sm),
              eventsAsync.when(
                data: (events) => _buildEventsList(context, events),
                loading: _buildLoadingState,
                error: (error, _) => _buildErrorState(error.toString()),
              ),
              const SizedBox(height: AppSpacing.xl),
              // My Groups Section
              _buildSectionHeader(
                context,
                title: 'My Groups',
                onSeeAll: () => context.go(AppRoutes.groups),
              ),
              const SizedBox(height: AppSpacing.sm),
              groupsAsync.when(
                data: (groups) => _buildGroupsList(context, groups),
                loading: _buildLoadingState,
                error: (error, _) => _buildErrorState(error.toString()),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required String title,
    VoidCallback? onSeeAll,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: AppTypography.h3),
        if (onSeeAll != null)
          TextButton(onPressed: onSeeAll, child: const Text('See all')),
      ],
    );
  }

  Widget _buildEventsList(BuildContext context, List<Event> events) {
    if (events.isEmpty) {
      return _buildEmptyState(
        icon: Icons.event,
        message: 'No upcoming events',
        description: 'Join a group to see events',
      );
    }

    // Show max 3 events on home screen
    final displayEvents = events.take(3).toList();
    return Column(
      children: displayEvents
          .map(
            (event) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: EventCard(
                event: event,
                onTap: () => context.push('${AppRoutes.events}/${event.id}'),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildGroupsList(BuildContext context, List<Group> groups) {
    if (groups.isEmpty) {
      return _buildEmptyState(
        icon: Icons.people,
        message: 'No groups yet',
        description: 'Join or create a group to get started',
      );
    }

    // Show max 3 groups on home screen
    final displayGroups = groups.take(3).toList();
    return Column(
      children: displayGroups
          .map(
            (group) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: GroupCard(
                group: group,
                onTap: () => context.push('${AppRoutes.groups}/${group.id}'),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildLoadingState() {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Center(child: CircularProgressIndicator()),
    );
  }

  Widget _buildErrorState(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 32),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Something went wrong',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String message,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Center(
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: AppSpacing.borderRadiusFull,
              ),
              child: Icon(icon, color: AppColors.textTertiary, size: 32),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(message, style: AppTypography.labelLarge),
            const SizedBox(height: AppSpacing.xs),
            Text(
              description,
              style: AppTypography.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
