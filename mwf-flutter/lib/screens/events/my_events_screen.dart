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

class MyEventsScreen extends ConsumerWidget {
  const MyEventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(myEventsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Events', style: AppTypography.h4),
        centerTitle: false,
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(myEventsProvider.notifier).refresh(),
        child: eventsAsync.when(
          data: (events) => _buildEventsList(context, events),
          loading: () => const ListSkeleton(itemBuilder: EventCardSkeleton.new),
          error: (error, _) => ErrorStates.loadFailed(
            item: 'events',
            onRetry: () => ref.invalidate(myEventsProvider),
          ),
        ),
      ),
    );
  }

  Widget _buildEventsList(BuildContext context, List<Event> events) {
    if (events.isEmpty) {
      return EmptyStates.noEvents(
        onCreateEvent: () => context.go(AppRoutes.groups),
      );
    }

    return ListView.builder(
      padding: AppSpacing.screenPadding,
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: EventCard(
            event: event,
            onTap: () => context.push('${AppRoutes.events}/${event.id}'),
          ),
        );
      },
    );
  }
}
