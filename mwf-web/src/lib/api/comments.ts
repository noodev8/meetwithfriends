/*
=======================================================================================================================================
Comments API Functions
=======================================================================================================================================
API client functions for event comments.
Following API-Rules: never throw on API errors, return structured objects.
=======================================================================================================================================
*/

import { apiGet, apiCall } from '../apiClient';
import { ApiResult } from '@/types';

// Comment with user details and permissions
export interface CommentWithDetails {
    id: number;
    event_id: number;
    user_id: number;
    user_name: string;
    user_avatar_url: string | null;
    content: string;
    created_at: string;
    can_delete: boolean;
}

// Comments response with membership info
export interface CommentsResponse {
    comments: CommentWithDetails[];
    comment_count: number;
    is_member: boolean;
}

/*
=======================================================================================================================================
getComments
=======================================================================================================================================
Fetches all comments for an event.
- Group members can see all comments
- Non-members only see comment count
=======================================================================================================================================
*/
export async function getComments(
    eventId: number,
    token?: string
): Promise<ApiResult<CommentsResponse>> {
    const response = await apiGet(`/api/comments/${eventId}`, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                comments: response.comments as unknown as CommentWithDetails[],
                comment_count: Number(response.comment_count) || 0,
                is_member: Boolean(response.is_member),
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to get comments',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
addComment
=======================================================================================================================================
Adds a comment to an event. Requires group membership.
=======================================================================================================================================
*/
export async function addComment(
    token: string,
    eventId: number,
    content: string
): Promise<ApiResult<CommentWithDetails>> {
    const response = await apiCall('/api/comments/add', { event_id: eventId, content }, token);

    if (response.return_code === 'SUCCESS' && response.comment) {
        // The new comment always has can_delete: true since user is the owner
        return {
            success: true,
            data: {
                ...(response.comment as unknown as CommentWithDetails),
                can_delete: true,
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to add comment',
        return_code: response.return_code,
    };
}

/*
=======================================================================================================================================
deleteComment
=======================================================================================================================================
Deletes a comment. Requires ownership or host/organiser role.
=======================================================================================================================================
*/
export async function deleteComment(
    token: string,
    commentId: number
): Promise<ApiResult<{ message: string }>> {
    const response = await apiCall('/api/comments/delete', { comment_id: commentId }, token);

    if (response.return_code === 'SUCCESS') {
        return {
            success: true,
            data: {
                message: (response.message as string) || 'Comment deleted',
            },
        };
    }

    return {
        success: false,
        error: (response.message as string) || 'Failed to delete comment',
        return_code: response.return_code,
    };
}
