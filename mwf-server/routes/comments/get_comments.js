/*
=======================================================================================================================================
API Route: get_comments
=======================================================================================================================================
Method: GET
Purpose: Retrieves all comments for an event.
         - Group members can see all comments
         - Non-members see comment count only (privacy protection)
=======================================================================================================================================
Request Payload:
None (GET request with :event_id URL parameter)

Success Response (for members):
{
  "return_code": "SUCCESS",
  "is_member": true,
  "comments": [
    {
      "id": 1,
      "event_id": 1,
      "user_id": 5,
      "user_name": "John Smith",
      "user_avatar_url": "https://...",
      "content": "Looking forward to it!",
      "created_at": "2026-01-07T10:30:00.000Z",
      "can_delete": true
    }
  ],
  "comment_count": 1
}

Success Response (for non-members):
{
  "return_code": "SUCCESS",
  "is_member": false,
  "comments": [],
  "comment_count": 1
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"EVENT_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { optionalAuth } = require('../../middleware/auth');

router.get('/:event_id', optionalAuth, async (req, res) => {
    try {
        const { event_id } = req.params;
        const userId = req.user?.id || null;

        // =======================================================================
        // Validate event_id is a number
        // =======================================================================
        if (!event_id || isNaN(parseInt(event_id, 10))) {
            return res.json({
                return_code: 'EVENT_NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Verify event exists and get group_id
        // =======================================================================
        const eventResult = await query(
            `SELECT id, group_id FROM event_list WHERE id = $1`,
            [event_id]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'EVENT_NOT_FOUND',
                message: 'Event not found'
            });
        }

        const groupId = eventResult.rows[0].group_id;

        // =======================================================================
        // Check if current user is a member (and their role for delete permissions)
        // =======================================================================
        let isMember = false;
        let isHostOrOrganiser = false;

        if (userId) {
            const membershipResult = await query(
                `SELECT role FROM group_member
                 WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                [groupId, userId]
            );

            if (membershipResult.rows.length > 0) {
                isMember = true;
                const role = membershipResult.rows[0].role;
                isHostOrOrganiser = role === 'organiser' || role === 'host';
            }
        }

        // =======================================================================
        // Fetch all comments for the event with user info
        // Uses JOIN to avoid N+1 queries
        // =======================================================================
        const commentsResult = await query(
            `SELECT
                c.id,
                c.event_id,
                c.user_id,
                u.name AS user_name,
                u.avatar_url AS user_avatar_url,
                c.content,
                c.created_at
             FROM event_comment c
             JOIN app_user u ON c.user_id = u.id
             WHERE c.event_id = $1
             ORDER BY c.created_at DESC`,
            [event_id]
        );

        const commentCount = commentsResult.rows.length;

        // =======================================================================
        // Return response based on membership
        // - Members get full comment list
        // - Non-members only get count
        // =======================================================================
        if (isMember) {
            // Add can_delete flag to each comment
            const comments = commentsResult.rows.map(comment => ({
                ...comment,
                can_delete: comment.user_id === userId || isHostOrOrganiser
            }));

            return res.json({
                return_code: 'SUCCESS',
                is_member: true,
                comments,
                comment_count: commentCount
            });
        } else {
            return res.json({
                return_code: 'SUCCESS',
                is_member: false,
                comments: [],
                comment_count: commentCount
            });
        }

    } catch (error) {
        console.error('Get comments error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
