class Event {
  const Event({
    required this.id,
    required this.title,
    required this.groupId,
    required this.groupName,
    this.description,
    this.location,
    this.eventDate,
    this.eventTime,
    this.imageUrl,
    this.capacity,
    this.rsvpCount = 0,
    this.waitlistCount = 0,
    this.userRsvpStatus,
    this.hostId,
    this.hostName,
    this.createdAt,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as int,
      title: json['title'] as String,
      groupId: json['group_id'] as int,
      groupName: json['group_name'] as String? ?? '',
      description: json['description'] as String?,
      location: json['location'] as String?,
      eventDate: json['event_date'] != null
          ? DateTime.tryParse(json['event_date'] as String)
          : null,
      eventTime: json['event_time'] as String?,
      imageUrl: json['image_url'] as String?,
      capacity: json['capacity'] as int?,
      rsvpCount: json['rsvp_count'] as int? ?? 0,
      waitlistCount: json['waitlist_count'] as int? ?? 0,
      userRsvpStatus: json['user_rsvp_status'] as String?,
      hostId: json['host_id'] as int?,
      hostName: json['host_name'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  final int id;
  final String title;
  final int groupId;
  final String groupName;
  final String? description;
  final String? location;
  final DateTime? eventDate;
  final String? eventTime;
  final String? imageUrl;
  final int? capacity;
  final int rsvpCount;
  final int waitlistCount;
  final String? userRsvpStatus;
  final int? hostId;
  final String? hostName;
  final DateTime? createdAt;

  bool get isGoing => userRsvpStatus == 'going';
  bool get isWaitlisted => userRsvpStatus == 'waitlist';
  bool get isNotGoing => userRsvpStatus == 'not_going';
  bool get hasCapacity => capacity != null;
  bool get isFull => hasCapacity && rsvpCount >= capacity!;
  int get spotsRemaining => hasCapacity ? capacity! - rsvpCount : 0;

  String get formattedDate {
    if (eventDate == null) return 'TBD';
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final month = months[eventDate!.month - 1];
    return '$month ${eventDate!.day}, ${eventDate!.year}';
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'group_id': groupId,
      'group_name': groupName,
      'description': description,
      'location': location,
      'event_date': eventDate?.toIso8601String(),
      'event_time': eventTime,
      'image_url': imageUrl,
      'capacity': capacity,
      'rsvp_count': rsvpCount,
      'waitlist_count': waitlistCount,
      'user_rsvp_status': userRsvpStatus,
      'host_id': hostId,
      'host_name': hostName,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
