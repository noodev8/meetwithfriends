class Event {
  final int id;
  final int groupId;
  final String groupName;
  final String? groupImageUrl;
  final String title;
  final String? description;
  final String? location;
  final DateTime dateTime;
  final int? capacity;
  final String? category;
  final String? imageUrl;
  final String status;
  final bool waitlistEnabled;
  final int attendeeCount;
  final int waitlistCount;
  final String? rsvpStatus; // 'attending', 'waitlist', or null
  final bool isHost; // Whether current user is a host of this event
  final int? waitlistPosition; // Position in waitlist if applicable

  Event({
    required this.id,
    required this.groupId,
    required this.groupName,
    this.groupImageUrl,
    required this.title,
    this.description,
    this.location,
    required this.dateTime,
    this.capacity,
    this.category,
    this.imageUrl,
    required this.status,
    this.waitlistEnabled = true,
    required this.attendeeCount,
    required this.waitlistCount,
    this.rsvpStatus,
    this.isHost = false,
    this.waitlistPosition,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as int,
      groupId: json['group_id'] as int,
      groupName: json['group_name'] as String,
      groupImageUrl: json['group_image_url'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      location: json['location'] as String?,
      dateTime: DateTime.parse(json['date_time'] as String),
      capacity: json['capacity'] as int?,
      category: json['category'] as String?,
      imageUrl: json['image_url'] as String?,
      status: json['status'] as String? ?? 'published',
      waitlistEnabled: json['waitlist_enabled'] as bool? ?? true,
      attendeeCount: json['attendee_count'] as int? ?? 0,
      waitlistCount: json['waitlist_count'] as int? ?? 0,
      rsvpStatus: json['rsvp_status'] as String?,
      isHost: json['is_host'] as bool? ?? false,
      waitlistPosition: json['waitlist_position'] as int?,
    );
  }

  bool get isGoing => rsvpStatus == 'attending';
  bool get isWaitlisted => rsvpStatus == 'waitlist';
  bool get isFull => capacity != null && attendeeCount >= capacity!;
  bool get isCancelled => status == 'cancelled';
}
