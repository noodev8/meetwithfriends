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
  Future<EventsResult> getMyEvents({bool? unresponded, int? limit}) async {
    String path = '/users/my-events';
    final params = <String>[];
    if (unresponded == true) params.add('unresponded=true');
    if (limit != null) params.add('limit=$limit');
    if (params.isNotEmpty) path += '?${params.join('&')}';

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

  /// Get events user has RSVP'd to (attending or waitlist)
  /// Used for the Home screen "My Events" list
  Future<EventsResult> getMyRsvps() async {
    final response = await _api.get('/users/my-rsvps');

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

  /// Submit or update a pre-order for an event
  Future<SubmitOrderResult> submitOrder(int eventId, {String? foodOrder, String? dietaryNotes}) async {
    final response = await _api.post('/events/$eventId/submit-order', {
      'food_order': foodOrder ?? '',
      'dietary_notes': dietaryNotes ?? '',
    });

    if (response['return_code'] == 'SUCCESS') {
      final orderJson = response['order'] as Map<String, dynamic>?;
      return SubmitOrderResult(
        success: true,
        foodOrder: orderJson?['food_order'] as String?,
        dietaryNotes: orderJson?['dietary_notes'] as String?,
      );
    }

    return SubmitOrderResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to save order',
    );
  }

  /// Update another user's pre-order (hosts/organisers only)
  Future<UpdateOrderResult> updateOrder(
    int eventId,
    int userId, {
    String? foodOrder,
    String? dietaryNotes,
  }) async {
    final response = await _api.post('/events/$eventId/update-order', {
      'user_id': userId,
      'food_order': foodOrder ?? '',
      'dietary_notes': dietaryNotes ?? '',
    });

    if (response['return_code'] == 'SUCCESS') {
      final orderJson = response['order'] as Map<String, dynamic>?;
      return UpdateOrderResult(
        success: true,
        userId: orderJson?['user_id'] as int?,
        foodOrder: orderJson?['food_order'] as String?,
        dietaryNotes: orderJson?['dietary_notes'] as String?,
      );
    }

    return UpdateOrderResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to update order',
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

  /// Manage an attendee - remove, demote to waitlist, or promote to going
  /// action: 'remove' | 'demote' | 'promote'
  Future<ManageAttendeeResult> manageAttendee(
    int eventId,
    int userId,
    String action,
  ) async {
    final response = await _api.post('/events/$eventId/manage-attendee', {
      'user_id': userId,
      'action': action,
    });

    if (response['return_code'] == 'SUCCESS') {
      return ManageAttendeeResult(
        success: true,
        message: response['message'] as String?,
      );
    }

    return ManageAttendeeResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to manage attendee',
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
    List<String>? menuImages,
    DateTime? preorderCutoff,
    bool? waitlistEnabled,
    bool broadcast = false,
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
      if (menuImages != null && menuImages.isNotEmpty) {
        body['menu_images'] = menuImages;
      }
      if (menuLink != null && menuLink.isNotEmpty) {
        body['menu_link'] = menuLink;
      }
      if (preorderCutoff != null) {
        body['preorder_cutoff'] = preorderCutoff.toUtc().toIso8601String();
      }
    }
    if (waitlistEnabled != null && capacity != null) {
      body['waitlist_enabled'] = waitlistEnabled;
    }
    if (broadcast) {
      body['broadcast'] = true;
    }

    final response = await _api.post('/events/create', body);

    if (response['return_code'] == 'SUCCESS') {
      final eventData = response['event'] as Map<String, dynamic>?;
      if (eventData != null) {
        // Only extract the ID - the response doesn't include group_name etc.
        // that Event.fromJson expects. Caller should navigate by ID.
        final eventId = eventData['id'] as int?;
        if (eventId != null) {
          return CreateEventResult(
            success: true,
            eventId: eventId,
          );
        }
      }
    }

    return CreateEventResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to create event',
    );
  }

  /// Update an existing event
  Future<UpdateEventResult> updateEvent({
    required int eventId,
    String? title,
    String? description,
    String? location,
    DateTime? dateTime,
    int? capacity,
    bool? capacityUnlimited, // Set to true to explicitly set capacity to null (unlimited)
    String? category,
    bool? preordersEnabled,
    String? menuLink,
    List<String>? menuImages,
    bool? menuImagesCleared, // Set to true to clear menu images
    DateTime? preorderCutoff,
    bool? preorderCutoffCleared, // Set to true to clear preorder cutoff
    bool? waitlistEnabled,
    bool? rsvpsClosed,
  }) async {
    final body = <String, dynamic>{};

    if (title != null && title.isNotEmpty) {
      body['title'] = title;
    }
    if (description != null) {
      body['description'] = description;
    }
    if (location != null) {
      body['location'] = location;
    }
    if (dateTime != null) {
      body['date_time'] = dateTime.toUtc().toIso8601String();
    }
    if (capacityUnlimited == true) {
      body['capacity'] = null;
    } else if (capacity != null) {
      body['capacity'] = capacity;
    }
    if (category != null && category.isNotEmpty) {
      body['category'] = category;
    }
    if (preordersEnabled != null) {
      body['preorders_enabled'] = preordersEnabled;
    }
    if (menuImagesCleared == true) {
      body['menu_images'] = null;
    } else if (menuImages != null) {
      body['menu_images'] = menuImages.isNotEmpty ? menuImages : null;
    }
    if (menuLink != null) {
      body['menu_link'] = menuLink.isNotEmpty ? menuLink : null;
    }
    if (preorderCutoffCleared == true) {
      body['preorder_cutoff'] = null;
    } else if (preorderCutoff != null) {
      body['preorder_cutoff'] = preorderCutoff.toUtc().toIso8601String();
    }
    if (waitlistEnabled != null) {
      body['waitlist_enabled'] = waitlistEnabled;
    }
    if (rsvpsClosed != null) {
      body['rsvps_closed'] = rsvpsClosed;
    }

    final response = await _api.post('/events/$eventId/update', body);

    if (response['return_code'] == 'SUCCESS') {
      return UpdateEventResult(success: true);
    }

    return UpdateEventResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to update event',
    );
  }

  /// Get or create magic invite link for an event
  Future<MagicLinkResult> getOrCreateMagicLink(int eventId) async {
    final response = await _api.post('/events/$eventId/magic-link', {});

    if (response['return_code'] == 'SUCCESS') {
      final linkJson = response['magic_link'] as Map<String, dynamic>;
      return MagicLinkResult(
        success: true,
        magicLink: MagicLink.fromJson(linkJson),
      );
    }

    return MagicLinkResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to get invite link',
    );
  }

  /// Regenerate magic invite link (invalidates old link)
  Future<MagicLinkResult> regenerateMagicLink(int eventId) async {
    final response = await _api.post('/events/$eventId/magic-link/regenerate', {});

    if (response['return_code'] == 'SUCCESS') {
      final linkJson = response['magic_link'] as Map<String, dynamic>;
      return MagicLinkResult(
        success: true,
        magicLink: MagicLink.fromJson(linkJson),
      );
    }

    return MagicLinkResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to regenerate invite link',
    );
  }

  /// Add a host to an event
  Future<AddHostResult> addHost(int eventId, int userId) async {
    final response = await _api.post('/events/$eventId/hosts/add', {
      'user_id': userId,
    });

    if (response['return_code'] == 'SUCCESS') {
      final hostJson = response['host'] as Map<String, dynamic>?;
      return AddHostResult(
        success: true,
        host: hostJson != null ? EventHost.fromJson(hostJson) : null,
        message: response['message'] as String?,
      );
    }

    return AddHostResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to add host',
      returnCode: response['return_code'] as String?,
    );
  }

  /// Remove a host from an event
  Future<RemoveHostResult> removeHost(int eventId, int userId) async {
    final response = await _api.post('/events/$eventId/hosts/remove', {
      'user_id': userId,
    });

    if (response['return_code'] == 'SUCCESS') {
      return RemoveHostResult(
        success: true,
        message: response['message'] as String?,
      );
    }

    return RemoveHostResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to remove host',
      returnCode: response['return_code'] as String?,
    );
  }

  /// Disable magic invite link
  Future<MagicLinkActionResult> disableMagicLink(int eventId) async {
    final response = await _api.post('/events/$eventId/magic-link/disable', {});

    if (response['return_code'] == 'SUCCESS') {
      return MagicLinkActionResult(
        success: true,
        isActive: response['is_active'] as bool? ?? false,
      );
    }

    return MagicLinkActionResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to disable invite link',
    );
  }

  /// Enable magic invite link
  Future<MagicLinkActionResult> enableMagicLink(int eventId) async {
    final response = await _api.post('/events/$eventId/magic-link/enable', {});

    if (response['return_code'] == 'SUCCESS') {
      return MagicLinkActionResult(
        success: true,
        isActive: response['is_active'] as bool? ?? true,
        expiresAt: response['expires_at'] != null
            ? DateTime.parse(response['expires_at'] as String)
            : null,
      );
    }

    return MagicLinkActionResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to enable invite link',
    );
  }

  /// Broadcast event notification emails to all group members
  Future<BroadcastResult> broadcastEvent(int eventId) async {
    final response = await _api.post('/events/$eventId/broadcast', {});

    if (response['return_code'] == 'SUCCESS') {
      return BroadcastResult(
        success: true,
        message: response['message'] as String?,
        queuedCount: response['queued_count'] as int? ?? 0,
      );
    }

    return BroadcastResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to broadcast event',
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
  final List<String>? menuImages;
  final DateTime? preorderCutoff;
  final bool waitlistEnabled;
  final bool rsvpsClosed;
  final DateTime? broadcastSentAt;
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
    this.menuImages,
    this.preorderCutoff,
    this.waitlistEnabled = true,
    this.rsvpsClosed = false,
    this.broadcastSentAt,
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
      menuImages: (json['menu_images'] as List<dynamic>?)
          ?.map((e) => e as String).toList(),
      preorderCutoff: json['preorder_cutoff'] != null
          ? DateTime.parse(json['preorder_cutoff'] as String)
          : null,
      waitlistEnabled: json['waitlist_enabled'] as bool? ?? true,
      rsvpsClosed: json['rsvps_closed'] as bool? ?? false,
      broadcastSentAt: json['broadcast_sent_at'] != null
          ? DateTime.parse(json['broadcast_sent_at'] as String)
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

  // Menu helpers
  bool get hasMenuImages => menuImages != null && menuImages!.isNotEmpty;
  bool get hasMenuLink => menuLink != null && menuLink!.isNotEmpty;
  bool get hasMenu => hasMenuImages || hasMenuLink;
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
  final int? eventId;
  final String? error;

  CreateEventResult({required this.success, this.eventId, this.error});
}

class UpdateEventResult {
  final bool success;
  final String? error;

  UpdateEventResult({required this.success, this.error});
}

class SubmitOrderResult {
  final bool success;
  final String? foodOrder;
  final String? dietaryNotes;
  final String? error;

  SubmitOrderResult({required this.success, this.foodOrder, this.dietaryNotes, this.error});
}

class UpdateOrderResult {
  final bool success;
  final int? userId;
  final String? foodOrder;
  final String? dietaryNotes;
  final String? error;

  UpdateOrderResult({
    required this.success,
    this.userId,
    this.foodOrder,
    this.dietaryNotes,
    this.error,
  });
}

class MagicLink {
  final String token;
  final String url;
  final DateTime expiresAt;
  final bool isActive;
  final int useCount;
  final int maxUses;

  MagicLink({
    required this.token,
    required this.url,
    required this.expiresAt,
    required this.isActive,
    required this.useCount,
    required this.maxUses,
  });

  factory MagicLink.fromJson(Map<String, dynamic> json) {
    return MagicLink(
      token: json['token'] as String,
      url: json['url'] as String,
      expiresAt: DateTime.parse(json['expires_at'] as String),
      isActive: json['is_active'] as bool? ?? true,
      useCount: json['use_count'] as int? ?? 0,
      maxUses: json['max_uses'] as int? ?? 50,
    );
  }

  bool get isExpired => expiresAt.isBefore(DateTime.now());
}

class MagicLinkResult {
  final bool success;
  final MagicLink? magicLink;
  final String? error;

  MagicLinkResult({required this.success, this.magicLink, this.error});
}

class MagicLinkActionResult {
  final bool success;
  final bool? isActive;
  final DateTime? expiresAt;
  final String? error;

  MagicLinkActionResult({
    required this.success,
    this.isActive,
    this.expiresAt,
    this.error,
  });
}

class AddHostResult {
  final bool success;
  final EventHost? host;
  final String? message;
  final String? error;
  final String? returnCode;

  AddHostResult({
    required this.success,
    this.host,
    this.message,
    this.error,
    this.returnCode,
  });
}

class RemoveHostResult {
  final bool success;
  final String? message;
  final String? error;
  final String? returnCode;

  RemoveHostResult({
    required this.success,
    this.message,
    this.error,
    this.returnCode,
  });
}

class ManageAttendeeResult {
  final bool success;
  final String? message;
  final String? error;

  ManageAttendeeResult({
    required this.success,
    this.message,
    this.error,
  });
}

class BroadcastResult {
  final bool success;
  final String? message;
  final int queuedCount;
  final String? error;

  BroadcastResult({
    required this.success,
    this.message,
    this.queuedCount = 0,
    this.error,
  });
}
