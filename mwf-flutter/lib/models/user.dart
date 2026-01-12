class User {
  const User({
    required this.id,
    required this.email,
    required this.displayName,
    this.firstName,
    this.lastName,
    this.profileImageUrl,
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      email: json['email'] as String,
      displayName: json['display_name'] as String? ?? '',
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
      profileImageUrl: json['profile_image_url'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  final int id;
  final String email;
  final String displayName;
  final String? firstName;
  final String? lastName;
  final String? profileImageUrl;
  final DateTime? createdAt;

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    if (firstName != null) return firstName!;
    if (lastName != null) return lastName!;
    return displayName;
  }

  String get initials {
    final name = fullName;
    if (name.isEmpty) return '?';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'display_name': displayName,
      'first_name': firstName,
      'last_name': lastName,
      'profile_image_url': profileImageUrl,
      'created_at': createdAt?.toIso8601String(),
    };
  }

  User copyWith({
    int? id,
    String? email,
    String? displayName,
    String? firstName,
    String? lastName,
    String? profileImageUrl,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
