import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetwithfriends/core/router/app_router.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/event.dart';
import 'package:meetwithfriends/providers/events_provider.dart';
import 'package:meetwithfriends/widgets/empty_state.dart';
import 'package:meetwithfriends/widgets/error_state.dart';
import 'package:meetwithfriends/widgets/event_card.dart';
import 'package:meetwithfriends/widgets/skeleton.dart';

class PastEventsScreen extends ConsumerWidget {
  const PastEventsScreen({required this.groupId, super.key});

  final int groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(pastEventsProvider(groupId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Past Events'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(pastEventsProvider(groupId));
        },
        child: eventsAsync.when(
          data: (events) => _buildEventsList(context, events),
          loading: () => const ListSkeleton(itemBuilder: EventCardSkeleton.new),
          error: (error, _) => ErrorStates.loadFailed(
            item: 'past events',
            onRetry: () => ref.invalidate(pastEventsProvider(groupId)),
          ),
        ),
      ),
    );
  }

  Widget _buildEventsList(BuildContext context, List<Event> events) {
    if (events.isEmpty) {
      return EmptyStates.noPastEvents();
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: events.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: EventCard(
            event: events[index],
            onTap: () {
              context.push('${AppRoutes.events}/${events[index].id}');
            },
          ),
        );
      },
    );
  }
}
