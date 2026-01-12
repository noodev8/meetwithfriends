class Group {
  const Group({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    this.visibility = 'public',
    this.memberCount = 0,
    this.upcomingEventCount = 0,
    this.role,
    this.createdAt,
    this.organiserId,
    this.organiserName,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      visibility: json['visibility'] as String? ?? 'public',
      memberCount: json['member_count'] as int? ?? 0,
      upcomingEventCount: json['upcoming_event_count'] as int? ?? 0,
      role: json['role'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      organiserId: json['organiser_id'] as int?,
      organiserName: json['organiser_name'] as String?,
    );
  }

  final int id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String visibility;
  final int memberCount;
  final int upcomingEventCount;
  final String? role;
  final DateTime? createdAt;
  final int? organiserId;
  final String? organiserName;

  bool get isOrganiser => role == 'organiser';
  bool get isHost => role == 'host';
  bool get isMember => role == 'member';
  bool get isPublic => visibility == 'public';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'image_url': imageUrl,
      'visibility': visibility,
      'member_count': memberCount,
      'upcoming_event_count': upcomingEventCount,
      'role': role,
      'created_at': createdAt?.toIso8601String(),
      'organiser_id': organiserId,
      'organiser_name': organiserName,
    };
  }
}
