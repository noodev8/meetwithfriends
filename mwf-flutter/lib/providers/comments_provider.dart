import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/services/comments_service.dart';

final eventCommentsProvider =
    FutureProvider.family<CommentsResult, int>((ref, eventId) async {
  final commentsService = ref.read(commentsServiceProvider);
  final response = await commentsService.getComments(eventId);

  if (response.isSuccess && response.data != null) {
    return response.data!;
  }

  return const CommentsResult(
    comments: [],
    commentCount: 0,
    isMember: false,
  );
});
