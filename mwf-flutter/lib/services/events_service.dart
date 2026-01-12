import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/constants/api_constants.dart';
import 'package:meetwithfriends/models/api_response.dart';
import 'package:meetwithfriends/models/attendee.dart';
import 'package:meetwithfriends/models/event.dart';
import 'package:meetwithfriends/services/api_service.dart';

final eventsServiceProvider = Provider<EventsService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return EventsService(apiService: apiService);
});

class EventsService {
  EventsService({required ApiService apiService}) : _apiService = apiService;

  final ApiService _apiService;

  Future<ApiResponse<List<Event>>> getMyEvents() async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.myEvents,
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final eventsJson = response.data!['events'] as List<dynamic>?;
      if (eventsJson != null) {
        final events = eventsJson
            .map((e) => Event.fromJson(e as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(data: events);
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load events',
    );
  }

  Future<ApiResponse<Event>> getEvent(int id) async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.eventById(id),
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final eventJson = response.data!['event'] as Map<String, dynamic>?;
      if (eventJson != null) {
        return ApiResponse.success(data: Event.fromJson(eventJson));
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load event',
    );
  }

  Future<ApiResponse<List<Event>>> getGroupEvents(int groupId) async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.groupEvents(groupId),
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final eventsJson = response.data!['events'] as List<dynamic>?;
      if (eventsJson != null) {
        final events = eventsJson
            .map((e) => Event.fromJson(e as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(data: events);
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load events',
    );
  }

  Future<ApiResponse<void>> rsvp(int eventId, String status) async {
    return _apiService.post(
      ApiConstants.eventRsvp(eventId),
      data: {'status': status},
    );
  }

  Future<ApiResponse<List<Attendee>>> getAttendees(int eventId) async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.eventAttendees(eventId),
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final attendeesJson = response.data!['attendees'] as List<dynamic>?;
      if (attendeesJson != null) {
        final attendees = attendeesJson
            .map((e) => Attendee.fromJson(e as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(data: attendees);
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load attendees',
    );
  }

  Future<ApiResponse<Event>> createEvent({
    required int groupId,
    required String title,
    String? description,
    String? location,
    DateTime? eventDate,
    String? eventTime,
    int? capacity,
  }) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      ApiConstants.events,
      data: {
        'group_id': groupId,
        'title': title,
        if (description != null) 'description': description,
        if (location != null) 'location': location,
        if (eventDate != null)
          'event_date': eventDate.toIso8601String().split('T').first,
        if (eventTime != null) 'event_time': eventTime,
        if (capacity != null) 'capacity': capacity,
      },
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final eventJson = response.data!['event'] as Map<String, dynamic>?;
      if (eventJson != null) {
        return ApiResponse.success(data: Event.fromJson(eventJson));
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to create event',
    );
  }

  Future<ApiResponse<Event>> updateEvent({
    required int id,
    String? title,
    String? description,
    String? location,
    DateTime? eventDate,
    String? eventTime,
    int? capacity,
  }) async {
    final response = await _apiService.put<Map<String, dynamic>>(
      ApiConstants.eventById(id),
      data: {
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (location != null) 'location': location,
        if (eventDate != null)
          'event_date': eventDate.toIso8601String().split('T').first,
        if (eventTime != null) 'event_time': eventTime,
        if (capacity != null) 'capacity': capacity,
      },
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final eventJson = response.data!['event'] as Map<String, dynamic>?;
      if (eventJson != null) {
        return ApiResponse.success(data: Event.fromJson(eventJson));
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to update event',
    );
  }

  Future<ApiResponse<List<Event>>> getPastEvents(int groupId) async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.groupPastEvents(groupId),
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final eventsJson = response.data!['events'] as List<dynamic>?;
      if (eventsJson != null) {
        final events = eventsJson
            .map((e) => Event.fromJson(e as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(data: events);
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load past events',
    );
  }

  Future<ApiResponse<void>> contactHost({
    required int eventId,
    required String message,
  }) async {
    return _apiService.post(
      ApiConstants.eventContactHost(eventId),
      data: {'message': message},
    );
  }

  Future<ApiResponse<void>> submitOrder({
    required int eventId,
    String? foodOrder,
    String? dietaryNotes,
  }) async {
    return _apiService.post(
      ApiConstants.eventSubmitOrder(eventId),
      data: {
        if (foodOrder != null) 'food_order': foodOrder,
        if (dietaryNotes != null) 'dietary_notes': dietaryNotes,
      },
    );
  }
}
