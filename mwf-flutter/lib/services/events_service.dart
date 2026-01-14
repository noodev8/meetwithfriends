import '../models/event.dart';
import 'api_service.dart';

class EventsService {
  final ApiService _api;

  EventsService({ApiService? api}) : _api = api ?? ApiService();

  /// Get a single event by ID with full details
  Future<EventDetailResult> getEvent(int eventId) async {
    final response = await _api.get('/events/$eventId');

    if (response['return_code'] == 'SUCCESS') {
      final eventJson = response['event'] as Map<String, dynamic>;
      final rsvpJson = response['rsvp'] as Map<String, dynamic>?;
      final hostsJson = response['hosts'] as List<dynamic>? ?? [];

      return EventDetailResult(
        success: true,
        event: EventDetail.fromJson(eventJson),
        rsvp: rsvpJson != null ? RsvpStatus.fromJson(rsvpJson) : null,
        hosts: hostsJson.map((h) => EventHost.fromJson(h as Map<String, dynamic>)).toList(),
        isGroupMember: response['is_group_member'] as bool? ?? false,
        canEdit: response['can_edit'] as bool? ?? false,
        isHost: response['is_host'] as bool? ?? false,
      );
    }

    return EventDetailResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load event',
    );
  }

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

  /// RSVP to an event (join or leave)
  Future<RsvpResult> rsvpEvent(int eventId, String action, {int guestCount = 0}) async {
    final response = await _api.post('/events/$eventId/rsvp', {
      'action': action,
      if (action == 'join') 'guest_count': guestCount,
    });

    if (response['return_code'] == 'SUCCESS') {
      final rsvpJson = response['rsvp'] as Map<String, dynamic>?;
      return RsvpResult(
        success: true,
        rsvp: rsvpJson != null ? RsvpStatus.fromJson(rsvpJson) : null,
        message: response['message'] as String?,
      );
    }

    return RsvpResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to update RSVP',
    );
  }

  /// Get attendees for an event
  Future<AttendeesResult> getAttendees(int eventId) async {
    final response = await _api.get('/events/$eventId/attendees');

    if (response['return_code'] == 'SUCCESS') {
      final attendingJson = response['attending'] as List<dynamic>? ?? [];
      final waitlistJson = response['waitlist'] as List<dynamic>? ?? [];
      final notGoingJson = response['not_going'] as List<dynamic>? ?? [];

      return AttendeesResult(
        success: true,
        isMember: response['is_member'] as bool? ?? false,
        attending: attendingJson.map((a) => Attendee.fromJson(a as Map<String, dynamic>)).toList(),
        waitlist: waitlistJson.map((a) => Attendee.fromJson(a as Map<String, dynamic>)).toList(),
        notGoing: notGoingJson.map((a) => Attendee.fromJson(a as Map<String, dynamic>)).toList(),
        attendingCount: response['attending_count'] as int? ?? 0,
        totalGuestCount: response['total_guest_count'] as int? ?? 0,
        waitlistCount: response['waitlist_count'] as int? ?? 0,
        notGoingCount: response['not_going_count'] as int? ?? 0,
      );
    }

    return AttendeesResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load attendees',
    );
  }

  /// Create a new event
  Future<CreateEventResult> createEvent({
    required int groupId,
    required String title,
    required DateTime dateTime,
    required String category,
    String? description,
    String? location,
    int? capacity,
    bool allowGuests = false,
    int maxGuestsPerRsvp = 1,
    bool preordersEnabled = false,
    String? menuLink,
    DateTime? preorderCutoff,
  }) async {
    final body = <String, dynamic>{
      'group_id': groupId,
      'title': title,
      'date_time': dateTime.toUtc().toIso8601String(),
      'category': category,
    };

    if (description != null && description.isNotEmpty) {
      body['description'] = description;
    }
    if (location != null && location.isNotEmpty) {
      body['location'] = location;
    }
    if (capacity != null) {
      body['capacity'] = capacity;
    }
    if (allowGuests) {
      body['allow_guests'] = true;
      body['max_guests_per_rsvp'] = maxGuestsPerRsvp;
    }
    if (preordersEnabled) {
      body['preorders_enabled'] = true;
      if (menuLink != null && menuLink.isNotEmpty) {
        body['menu_link'] = menuLink;
      }
      if (preorderCutoff != null) {
        body['preorder_cutoff'] = preorderCutoff.toUtc().toIso8601String();
      }
    }

    final response = await _api.post('/events/create', body);

    if (response['return_code'] == 'SUCCESS') {
      final eventData = response['event'] as Map<String, dynamic>?;
      if (eventData != null) {
        return CreateEventResult(
          success: true,
          event: Event.fromJson(eventData),
        );
      }
    }

    return CreateEventResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to create event',
    );
  }
}

class AttendeesResult {
  final bool success;
  final bool isMember;
  final List<Attendee> attending;
  final List<Attendee> waitlist;
  final List<Attendee> notGoing;
  final int attendingCount;
  final int totalGuestCount;
  final int waitlistCount;
  final int notGoingCount;
  final String? error;

  AttendeesResult({
    required this.success,
    this.isMember = false,
    this.attending = const [],
    this.waitlist = const [],
    this.notGoing = const [],
    this.attendingCount = 0,
    this.totalGuestCount = 0,
    this.waitlistCount = 0,
    this.notGoingCount = 0,
    this.error,
  });
}

class Attendee {
  final int userId;
  final String name;
  final String? avatarUrl;
  final int guestCount;
  final String? foodOrder;
  final String? dietaryNotes;
  final int? waitlistPosition;
  final DateTime rsvpAt;

  Attendee({
    required this.userId,
    required this.name,
    this.avatarUrl,
    this.guestCount = 0,
    this.foodOrder,
    this.dietaryNotes,
    this.waitlistPosition,
    required this.rsvpAt,
  });

  factory Attendee.fromJson(Map<String, dynamic> json) {
    return Attendee(
      userId: json['user_id'] as int,
      name: json['name'] as String,
      avatarUrl: json['avatar_url'] as String?,
      guestCount: json['guest_count'] as int? ?? 0,
      foodOrder: json['food_order'] as String?,
      dietaryNotes: json['dietary_notes'] as String?,
      waitlistPosition: json['waitlist_position'] as int?,
      rsvpAt: DateTime.parse(json['rsvp_at'] as String),
    );
  }
}

class RsvpResult {
  final bool success;
  final RsvpStatus? rsvp;
  final String? message;
  final String? error;

  RsvpResult({
    required this.success,
    this.rsvp,
    this.message,
    this.error,
  });
}

class EventsResult {
  final bool success;
  final List<Event>? events;
  final String? error;

  EventsResult({required this.success, this.events, this.error});
}

class EventDetailResult {
  final bool success;
  final EventDetail? event;
  final RsvpStatus? rsvp;
  final List<EventHost>? hosts;
  final bool isGroupMember;
  final bool canEdit;
  final bool isHost;
  final String? error;

  EventDetailResult({
    required this.success,
    this.event,
    this.rsvp,
    this.hosts,
    this.isGroupMember = false,
    this.canEdit = false,
    this.isHost = false,
    this.error,
  });
}

class EventDetail {
  final int id;
  final int groupId;
  final String groupName;
  final String? groupImageUrl;
  final int createdBy;
  final String creatorName;
  final String title;
  final String? description;
  final String? location;
  final DateTime dateTime;
  final int? capacity;
  final String? category;
  final String? imageUrl;
  final String? imagePosition;
  final bool allowGuests;
  final int maxGuestsPerRsvp;
  final bool preordersEnabled;
  final String? menuLink;
  final DateTime? preorderCutoff;
  final String status;
  final int attendeeCount;
  final int totalGuestCount;
  final int waitlistCount;
  final DateTime createdAt;

  EventDetail({
    required this.id,
    required this.groupId,
    required this.groupName,
    this.groupImageUrl,
    required this.createdBy,
    required this.creatorName,
    required this.title,
    this.description,
    this.location,
    required this.dateTime,
    this.capacity,
    this.category,
    this.imageUrl,
    this.imagePosition,
    required this.allowGuests,
    required this.maxGuestsPerRsvp,
    required this.preordersEnabled,
    this.menuLink,
    this.preorderCutoff,
    required this.status,
    required this.attendeeCount,
    required this.totalGuestCount,
    required this.waitlistCount,
    required this.createdAt,
  });

  factory EventDetail.fromJson(Map<String, dynamic> json) {
    return EventDetail(
      id: json['id'] as int,
      groupId: json['group_id'] as int,
      groupName: json['group_name'] as String,
      groupImageUrl: json['group_image_url'] as String?,
      createdBy: json['created_by'] as int,
      creatorName: json['creator_name'] as String? ?? 'Unknown',
      title: json['title'] as String,
      description: json['description'] as String?,
      location: json['location'] as String?,
      dateTime: DateTime.parse(json['date_time'] as String),
      capacity: json['capacity'] as int?,
      category: json['category'] as String?,
      imageUrl: json['image_url'] as String?,
      imagePosition: json['image_position'] as String?,
      allowGuests: json['allow_guests'] as bool? ?? false,
      maxGuestsPerRsvp: json['max_guests_per_rsvp'] as int? ?? 0,
      preordersEnabled: json['preorders_enabled'] as bool? ?? false,
      menuLink: json['menu_link'] as String?,
      preorderCutoff: json['preorder_cutoff'] != null
          ? DateTime.parse(json['preorder_cutoff'] as String)
          : null,
      status: json['status'] as String? ?? 'published',
      attendeeCount: json['attendee_count'] as int? ?? 0,
      totalGuestCount: json['total_guest_count'] as int? ?? 0,
      waitlistCount: json['waitlist_count'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  bool get isPast => dateTime.isBefore(DateTime.now());
  bool get isCancelled => status == 'cancelled';
  int get spotsRemaining => capacity != null ? capacity! - attendeeCount - totalGuestCount : -1;
  bool get isFull => capacity != null && spotsRemaining <= 0;
}

class RsvpStatus {
  final String status; // 'attending', 'waitlist', 'not_going'
  final int? waitlistPosition;
  final int guestCount;
  final String? foodOrder;
  final String? dietaryNotes;

  RsvpStatus({
    required this.status,
    this.waitlistPosition,
    required this.guestCount,
    this.foodOrder,
    this.dietaryNotes,
  });

  factory RsvpStatus.fromJson(Map<String, dynamic> json) {
    return RsvpStatus(
      status: json['status'] as String,
      waitlistPosition: json['waitlist_position'] as int?,
      guestCount: json['guest_count'] as int? ?? 0,
      foodOrder: json['food_order'] as String?,
      dietaryNotes: json['dietary_notes'] as String?,
    );
  }

  bool get isAttending => status == 'attending';
  bool get isWaitlisted => status == 'waitlist';
}

class EventHost {
  final int userId;
  final String name;
  final String? avatarUrl;

  EventHost({
    required this.userId,
    required this.name,
    this.avatarUrl,
  });

  factory EventHost.fromJson(Map<String, dynamic> json) {
    return EventHost(
      userId: json['user_id'] as int,
      name: json['name'] as String,
      avatarUrl: json['avatar_url'] as String?,
    );
  }
}

class CreateEventResult {
  final bool success;
  final Event? event;
  final String? error;

  CreateEventResult({required this.success, this.event, this.error});
}
