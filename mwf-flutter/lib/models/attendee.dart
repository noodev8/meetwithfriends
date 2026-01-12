class Attendee {
  const Attendee({
    required this.userId,
    required this.displayName,
    this.email,
    this.imageUrl,
    this.rsvpStatus = 'going',
    this.rsvpDate,
  });

  factory Attendee.fromJson(Map<String, dynamic> json) {
    return Attendee(
      userId: json['user_id'] as int,
      displayName: json['display_name'] as String? ?? 'Unknown',
      email: json['email'] as String?,
      imageUrl: json['image_url'] as String?,
      rsvpStatus: json['rsvp_status'] as String? ?? 'going',
      rsvpDate: json['rsvp_date'] != null
          ? DateTime.tryParse(json['rsvp_date'] as String)
          : null,
    );
  }

  final int userId;
  final String displayName;
  final String? email;
  final String? imageUrl;
  final String rsvpStatus;
  final DateTime? rsvpDate;

  bool get isGoing => rsvpStatus == 'going';
  bool get isWaitlisted => rsvpStatus == 'waitlist';
}
