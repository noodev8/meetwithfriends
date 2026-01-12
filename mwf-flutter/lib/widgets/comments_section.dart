import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetwithfriends/core/theme/theme.dart';
import 'package:meetwithfriends/models/comment.dart';
import 'package:meetwithfriends/providers/comments_provider.dart';
import 'package:meetwithfriends/services/comments_service.dart';

class CommentsSection extends ConsumerStatefulWidget {
  const CommentsSection({
    required this.eventId,
    required this.canComment,
    super.key,
  });

  final int eventId;
  final bool canComment;

  @override
  ConsumerState<CommentsSection> createState() => _CommentsSectionState();
}

class _CommentsSectionState extends ConsumerState<CommentsSection> {
  final _commentController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _submitComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;

    setState(() => _isSubmitting = true);

    final commentsService = ref.read(commentsServiceProvider);
    final response = await commentsService.addComment(
      eventId: widget.eventId,
      content: content,
    );

    setState(() => _isSubmitting = false);

    if (response.isSuccess) {
      _commentController.clear();
      _focusNode.unfocus();
      ref.invalidate(eventCommentsProvider(widget.eventId));
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response.message ?? 'Failed to add comment'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _deleteComment(int commentId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Comment'),
        content: const Text('Are you sure you want to delete this comment?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final commentsService = ref.read(commentsServiceProvider);
    final response = await commentsService.deleteComment(commentId);

    if (response.isSuccess) {
      ref.invalidate(eventCommentsProvider(widget.eventId));
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response.message ?? 'Failed to delete comment'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final commentsAsync = ref.watch(eventCommentsProvider(widget.eventId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Discussion', style: AppTypography.h4),
            commentsAsync.when(
              data: (result) => Text(
                '${result.commentCount} '
                'comment${result.commentCount == 1 ? '' : 's'}',
                style: AppTypography.caption,
              ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),

        // Comment input (if user can comment)
        if (widget.canComment) ...[
          _buildCommentInput(),
          const SizedBox(height: AppSpacing.md),
        ],

        // Comments list
        commentsAsync.when(
          data: _buildCommentsList,
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(AppSpacing.lg),
              child: CircularProgressIndicator(),
            ),
          ),
          error: (error, _) => Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Text(
              'Failed to load comments',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCommentInput() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: TextField(
            controller: _commentController,
            focusNode: _focusNode,
            maxLines: 3,
            minLines: 1,
            maxLength: 280,
            decoration: const InputDecoration(
              hintText: 'Add a comment...',
              counterText: '',
            ),
            textCapitalization: TextCapitalization.sentences,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        IconButton(
          onPressed: _isSubmitting ? null : _submitComment,
          icon: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.send),
          color: AppColors.primary,
        ),
      ],
    );
  }

  Widget _buildCommentsList(CommentsResult result) {
    if (!result.isMember) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: const BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: AppSpacing.borderRadiusMd,
        ),
        child: Text(
          'Join the group to see comments',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      );
    }

    if (result.comments.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: const BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: AppSpacing.borderRadiusMd,
        ),
        child: Column(
          children: [
            const Icon(
              Icons.chat_bubble_outline,
              color: AppColors.textTertiary,
              size: 32,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'No comments yet',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            if (widget.canComment) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Be the first to comment!',
                style: AppTypography.caption.copyWith(
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: result.comments.length,
      separatorBuilder: (_, __) => const Divider(height: AppSpacing.lg),
      itemBuilder: (context, index) {
        return _buildCommentItem(result.comments[index]);
      },
    );
  }

  Widget _buildCommentItem(Comment comment) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Avatar
        CircleAvatar(
          radius: 18,
          backgroundColor: AppColors.surfaceVariant,
          backgroundImage: comment.userAvatarUrl != null
              ? CachedNetworkImageProvider(comment.userAvatarUrl!)
              : null,
          child: comment.userAvatarUrl == null
              ? Text(
                  comment.userName.isNotEmpty
                      ? comment.userName[0].toUpperCase()
                      : '?',
                  style: AppTypography.labelMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                )
              : null,
        ),
        const SizedBox(width: AppSpacing.sm),

        // Content
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    comment.userName,
                    style: AppTypography.labelMedium,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    comment.timeAgo,
                    style: AppTypography.caption.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                  const Spacer(),
                  if (comment.canDelete)
                    IconButton(
                      onPressed: () => _deleteComment(comment.id),
                      icon: const Icon(Icons.delete_outline, size: 18),
                      color: AppColors.textTertiary,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      visualDensity: VisualDensity.compact,
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                comment.content,
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
