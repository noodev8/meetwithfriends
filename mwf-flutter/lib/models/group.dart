class Group {
  final int id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String joinPolicy;
  final String visibility;
  final String? themeColor;
  final String? icon;
  final bool requireProfileImage;
  final String role; // 'organiser', 'host', 'member'
  final int memberCount;
  final int upcomingEventCount;
  final DateTime createdAt;

  Group({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    required this.joinPolicy,
    required this.visibility,
    this.themeColor,
    this.icon,
    this.requireProfileImage = false,
    required this.role,
    required this.memberCount,
    required this.upcomingEventCount,
    required this.createdAt,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      joinPolicy: json['join_policy'] as String? ?? 'approval',
      visibility: json['visibility'] as String? ?? 'listed',
      themeColor: json['theme_color'] as String?,
      icon: json['icon'] as String?,
      requireProfileImage: json['require_profile_image'] as bool? ?? false,
      role: json['role'] as String? ?? 'member',
      memberCount: json['member_count'] as int? ?? 0,
      upcomingEventCount: json['upcoming_event_count'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// Get display initial (first 2 letters of words)
  String get initials {
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }

  bool get isOrganiser => role.toLowerCase() == 'organiser';
  bool get isHost => role.toLowerCase() == 'host';
}
