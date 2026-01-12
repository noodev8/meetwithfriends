class Member {
  const Member({
    required this.userId,
    required this.displayName,
    this.email,
    this.imageUrl,
    this.role = 'member',
    this.joinedAt,
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      userId: json['user_id'] as int,
      displayName: json['display_name'] as String? ?? 'Unknown',
      email: json['email'] as String?,
      imageUrl: json['image_url'] as String?,
      role: json['role'] as String? ?? 'member',
      joinedAt: json['joined_at'] != null
          ? DateTime.tryParse(json['joined_at'] as String)
          : null,
    );
  }

  final int userId;
  final String displayName;
  final String? email;
  final String? imageUrl;
  final String role;
  final DateTime? joinedAt;

  bool get isOrganiser => role == 'organiser';
  bool get isHost => role == 'host';
  bool get isMember => role == 'member';
}
