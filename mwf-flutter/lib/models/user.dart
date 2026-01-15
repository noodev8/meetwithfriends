class User {
  final int id;
  final String name;
  final String email;
  final String? bio;
  final String? avatarUrl;
  final String? contactMobile;
  final String? contactEmail;
  final bool showMobileToGuests;
  final bool showEmailToGuests;
  final bool receiveBroadcasts;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.bio,
    this.avatarUrl,
    this.contactMobile,
    this.contactEmail,
    this.showMobileToGuests = false,
    this.showEmailToGuests = false,
    this.receiveBroadcasts = true,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      bio: json['bio'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      contactMobile: json['contact_mobile'] as String?,
      contactEmail: json['contact_email'] as String?,
      showMobileToGuests: json['show_mobile_to_guests'] as bool? ?? false,
      showEmailToGuests: json['show_email_to_guests'] as bool? ?? false,
      receiveBroadcasts: json['receive_broadcasts'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'bio': bio,
      'avatar_url': avatarUrl,
      'contact_mobile': contactMobile,
      'contact_email': contactEmail,
      'show_mobile_to_guests': showMobileToGuests,
      'show_email_to_guests': showEmailToGuests,
      'receive_broadcasts': receiveBroadcasts,
    };
  }

  /// Get display initials (first letter of each word, max 2)
  String get initials {
    final words = name.split(' ').where((w) => w.isNotEmpty).toList();
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'U';
  }

  /// Create a copy with updated fields
  User copyWith({
    int? id,
    String? name,
    String? email,
    String? bio,
    String? avatarUrl,
    String? contactMobile,
    String? contactEmail,
    bool? showMobileToGuests,
    bool? showEmailToGuests,
    bool? receiveBroadcasts,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      bio: bio ?? this.bio,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      contactMobile: contactMobile ?? this.contactMobile,
      contactEmail: contactEmail ?? this.contactEmail,
      showMobileToGuests: showMobileToGuests ?? this.showMobileToGuests,
      showEmailToGuests: showEmailToGuests ?? this.showEmailToGuests,
      receiveBroadcasts: receiveBroadcasts ?? this.receiveBroadcasts,
    );
  }
}
