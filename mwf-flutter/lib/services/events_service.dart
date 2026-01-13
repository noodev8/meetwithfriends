import '../models/event.dart';
import 'api_service.dart';

class EventsService {
  final ApiService _api;

  EventsService({ApiService? api}) : _api = api ?? ApiService();

  /// Get upcoming events from user's groups
  Future<EventsResult> getMyEvents() async {
    final response = await _api.get('/users/my-events');

    if (response['return_code'] == 'SUCCESS') {
      final eventsList = response['events'] as List<dynamic>? ?? [];
      final events = eventsList
          .map((e) => Event.fromJson(e as Map<String, dynamic>))
          .toList();
      return EventsResult(success: true, events: events);
    }

    return EventsResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load events',
    );
  }

  /// Get all upcoming events (optionally filtered by group)
  Future<EventsResult> getUpcomingEvents({int? groupId}) async {
    String path = '/events';
    if (groupId != null) {
      path += '?group_id=$groupId';
    }

    final response = await _api.get(path);

    if (response['return_code'] == 'SUCCESS') {
      final eventsList = response['events'] as List<dynamic>? ?? [];
      final events = eventsList
          .map((e) => Event.fromJson(e as Map<String, dynamic>))
          .toList();
      return EventsResult(success: true, events: events);
    }

    return EventsResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load events',
    );
  }

  /// Get past events
  Future<EventsResult> getPastEvents({int? groupId, int? limit}) async {
    String path = '/events?past=true';
    if (groupId != null) {
      path += '&group_id=$groupId';
    }
    if (limit != null) {
      path += '&limit=$limit';
    }

    final response = await _api.get(path);

    if (response['return_code'] == 'SUCCESS') {
      final eventsList = response['events'] as List<dynamic>? ?? [];
      final events = eventsList
          .map((e) => Event.fromJson(e as Map<String, dynamic>))
          .toList();
      return EventsResult(success: true, events: events);
    }

    return EventsResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load events',
    );
  }
}

class EventsResult {
  final bool success;
  final List<Event>? events;
  final String? error;

  EventsResult({required this.success, this.events, this.error});
}
