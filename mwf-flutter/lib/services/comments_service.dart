import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/constants/api_constants.dart';
import 'package:meetwithfriends/models/api_response.dart';
import 'package:meetwithfriends/models/comment.dart';
import 'package:meetwithfriends/services/api_service.dart';

final commentsServiceProvider = Provider<CommentsService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return CommentsService(apiService: apiService);
});

class CommentsResult {
  const CommentsResult({
    required this.comments,
    required this.commentCount,
    required this.isMember,
  });

  final List<Comment> comments;
  final int commentCount;
  final bool isMember;
}

class CommentsService {
  CommentsService({required ApiService apiService}) : _apiService = apiService;

  final ApiService _apiService;

  Future<ApiResponse<CommentsResult>> getComments(int eventId) async {
    final response = await _apiService.get<Map<String, dynamic>>(
      ApiConstants.eventComments(eventId),
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final commentsJson = response.data!['comments'] as List<dynamic>?;
      final commentCount = response.data!['comment_count'] as int? ?? 0;
      final isMember = response.data!['is_member'] as bool? ?? false;

      final comments = commentsJson != null
          ? commentsJson
              .map((c) => Comment.fromJson(c as Map<String, dynamic>))
              .toList()
          : <Comment>[];

      return ApiResponse.success(
        data: CommentsResult(
          comments: comments,
          commentCount: commentCount,
          isMember: isMember,
        ),
      );
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to load comments',
    );
  }

  Future<ApiResponse<Comment>> addComment({
    required int eventId,
    required String content,
  }) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      ApiConstants.comments,
      data: {
        'event_id': eventId,
        'content': content,
      },
      fromJson: (json) => json,
    );

    if (response.isSuccess && response.data != null) {
      final commentJson = response.data!['comment'] as Map<String, dynamic>?;
      if (commentJson != null) {
        return ApiResponse.success(data: Comment.fromJson(commentJson));
      }
    }

    return ApiResponse.error(
      response.returnCode,
      message: response.message ?? 'Failed to add comment',
    );
  }

  Future<ApiResponse<void>> deleteComment(int commentId) async {
    return _apiService.delete(ApiConstants.deleteComment(commentId));
  }
}
