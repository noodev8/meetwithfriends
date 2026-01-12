import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/models/attendee.dart';
import 'package:meetwithfriends/models/event.dart';
import 'package:meetwithfriends/services/events_service.dart';

final myEventsProvider = AsyncNotifierProvider<MyEventsNotifier, List<Event>>(
  MyEventsNotifier.new,
);

class MyEventsNotifier extends AsyncNotifier<List<Event>> {
  @override
  Future<List<Event>> build() async {
    return _fetchEvents();
  }

  Future<List<Event>> _fetchEvents() async {
    final eventsService = ref.read(eventsServiceProvider);
    final response = await eventsService.getMyEvents();

    if (response.isSuccess && response.data != null) {
      return response.data!;
    }

    throw Exception(response.message ?? 'Failed to load events');
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetchEvents);
  }
}

final eventDetailProvider = FutureProvider.family<Event?, int>((
  ref,
  eventId,
) async {
  final eventsService = ref.read(eventsServiceProvider);
  final response = await eventsService.getEvent(eventId);

  if (response.isSuccess && response.data != null) {
    return response.data;
  }

  return null;
});

final groupEventsProvider = FutureProvider.family<List<Event>, int>((
  ref,
  groupId,
) async {
  final eventsService = ref.read(eventsServiceProvider);
  final response = await eventsService.getGroupEvents(groupId);

  if (response.isSuccess && response.data != null) {
    return response.data!;
  }

  return [];
});

final eventAttendeesProvider = FutureProvider.family<List<Attendee>, int>((
  ref,
  eventId,
) async {
  final eventsService = ref.read(eventsServiceProvider);
  final response = await eventsService.getAttendees(eventId);

  if (response.isSuccess && response.data != null) {
    return response.data!;
  }

  return [];
});

final pastEventsProvider = FutureProvider.family<List<Event>, int>((
  ref,
  groupId,
) async {
  final eventsService = ref.read(eventsServiceProvider);
  final response = await eventsService.getPastEvents(groupId);

  if (response.isSuccess && response.data != null) {
    return response.data!;
  }

  return [];
});
