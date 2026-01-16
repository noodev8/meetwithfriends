import '../models/comment.dart';
import 'api_service.dart';

class CommentsService {
  final ApiService _api;

  CommentsService({ApiService? api}) : _api = api ?? ApiService();

  /// Get comments for an event
  /// Returns comments list for members, or just count for non-members
  Future<CommentsResult> getComments(int eventId) async {
    final response = await _api.get('/comments/$eventId');

    if (response['return_code'] == 'SUCCESS') {
      final isMember = response['is_member'] as bool? ?? false;
      final commentCount = response['comment_count'] as int? ?? 0;

      List<Comment> comments = [];
      if (isMember) {
        final commentsList = response['comments'] as List<dynamic>? ?? [];
        comments = commentsList
            .map((c) => Comment.fromJson(c as Map<String, dynamic>))
            .toList();
      }

      return CommentsResult(
        success: true,
        isMember: isMember,
        comments: comments,
        commentCount: commentCount,
      );
    }

    return CommentsResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to load comments',
    );
  }

  /// Add a comment to an event
  /// User must be attending, on waitlist, or be host/organiser
  Future<AddCommentResult> addComment(int eventId, String content) async {
    final response = await _api.post('/comments/add', {
      'event_id': eventId,
      'content': content,
    });

    if (response['return_code'] == 'SUCCESS') {
      final commentJson = response['comment'] as Map<String, dynamic>;
      // Add can_delete = true since user just created this comment
      commentJson['can_delete'] = true;

      return AddCommentResult(
        success: true,
        comment: Comment.fromJson(commentJson),
      );
    }

    // Handle specific error cases
    String errorMessage;
    switch (response['return_code']) {
      case 'CONTENT_TOO_LONG':
        errorMessage = 'Comment is too long (max 280 characters)';
        break;
      case 'NOT_ATTENDING':
        errorMessage = 'You must RSVP to join the discussion';
        break;
      case 'EVENT_NOT_FOUND':
        errorMessage = 'Event not found';
        break;
      default:
        errorMessage = response['message'] as String? ?? 'Failed to add comment';
    }

    return AddCommentResult(
      success: false,
      error: errorMessage,
    );
  }

  /// Delete a comment
  /// User must be comment owner or host/organiser
  Future<DeleteCommentResult> deleteComment(int commentId) async {
    final response = await _api.post('/comments/delete', {
      'comment_id': commentId,
    });

    if (response['return_code'] == 'SUCCESS') {
      return DeleteCommentResult(success: true);
    }

    return DeleteCommentResult(
      success: false,
      error: response['message'] as String? ?? 'Failed to delete comment',
    );
  }
}

class CommentsResult {
  final bool success;
  final bool isMember;
  final List<Comment> comments;
  final int commentCount;
  final String? error;

  CommentsResult({
    required this.success,
    this.isMember = false,
    this.comments = const [],
    this.commentCount = 0,
    this.error,
  });
}

class AddCommentResult {
  final bool success;
  final Comment? comment;
  final String? error;

  AddCommentResult({
    required this.success,
    this.comment,
    this.error,
  });
}

class DeleteCommentResult {
  final bool success;
  final String? error;

  DeleteCommentResult({
    required this.success,
    this.error,
  });
}
