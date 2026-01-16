class Comment {
  final int id;
  final int eventId;
  final int userId;
  final String userName;
  final String? userAvatarUrl;
  final String content;
  final DateTime createdAt;
  final bool canDelete;

  Comment({
    required this.id,
    required this.eventId,
    required this.userId,
    required this.userName,
    this.userAvatarUrl,
    required this.content,
    required this.createdAt,
    required this.canDelete,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] as int,
      eventId: json['event_id'] as int,
      userId: json['user_id'] as int,
      userName: json['user_name'] as String,
      userAvatarUrl: json['user_avatar_url'] as String?,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      canDelete: json['can_delete'] as bool? ?? false,
    );
  }

  String get initials {
    final words = userName.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return userName.substring(0, userName.length >= 2 ? 2 : 1).toUpperCase();
  }

  String get relativeTime {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      // Format as "D Mon" or "D Mon YYYY" if different year
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final month = months[createdAt.month - 1];
      if (createdAt.year == now.year) {
        return '${createdAt.day} $month';
      } else {
        return '${createdAt.day} $month ${createdAt.year}';
      }
    }
  }
}
