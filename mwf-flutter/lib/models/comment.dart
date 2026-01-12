class Comment {
  const Comment({
    required this.id,
    required this.eventId,
    required this.userId,
    required this.userName,
    required this.content,
    required this.createdAt,
    this.userAvatarUrl,
    this.canDelete = false,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] as int,
      eventId: json['event_id'] as int,
      userId: json['user_id'] as int,
      userName: json['user_name'] as String? ?? 'Unknown',
      userAvatarUrl: json['user_avatar_url'] as String?,
      content: json['content'] as String,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      canDelete: json['can_delete'] as bool? ?? false,
    );
  }

  final int id;
  final int eventId;
  final int userId;
  final String userName;
  final String? userAvatarUrl;
  final String content;
  final DateTime createdAt;
  final bool canDelete;

  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inDays > 365) {
      final years = (difference.inDays / 365).floor();
      return '${years}y ago';
    } else if (difference.inDays > 30) {
      final months = (difference.inDays / 30).floor();
      return '${months}mo ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'event_id': eventId,
      'user_id': userId,
      'user_name': userName,
      'user_avatar_url': userAvatarUrl,
      'content': content,
      'created_at': createdAt.toIso8601String(),
      'can_delete': canDelete,
    };
  }
}
