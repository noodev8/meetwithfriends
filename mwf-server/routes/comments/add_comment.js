/*
=======================================================================================================================================
API Route: add_comment
=======================================================================================================================================
Method: POST
Purpose: Adds a comment to an event. User must be an active member of the group the event belongs to.
=======================================================================================================================================
Request Payload:
{
  "event_id": 1,                       // integer, required - ID of the event
  "content": "Looking forward to it!"  // string, required - Comment text (max 2000 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "comment": {
    "id": 1,
    "event_id": 1,
    "user_id": 5,
    "user_name": "John Smith",
    "user_avatar_url": "https://...",
    "content": "Looking forward to it!",
    "created_at": "2026-01-07T10:30:00.000Z"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"CONTENT_TOO_LONG"
"EVENT_NOT_FOUND"
"NOT_GROUP_MEMBER"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

// Maximum comment length
const MAX_COMMENT_LENGTH = 280;

router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { event_id, content } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!event_id || !content) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Event ID and content are required'
            });
        }

        // =======================================================================
        // Validate content length
        // =======================================================================
        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Comment content cannot be empty'
            });
        }

        if (trimmedContent.length > MAX_COMMENT_LENGTH) {
            return res.json({
                return_code: 'CONTENT_TOO_LONG',
                message: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`
            });
        }

        // =======================================================================
        // Fetch event to get group_id and verify it exists
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
        // Verify user is an active member of the group
        // =======================================================================
        const membershipResult = await query(
            `SELECT id FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
            [groupId, userId]
        );

        if (membershipResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_GROUP_MEMBER',
                message: 'You must be a group member to comment'
            });
        }

        // =======================================================================
        // Insert the comment
        // =======================================================================
        const insertResult = await query(
            `INSERT INTO event_comment (event_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, event_id, user_id, content, created_at`,
            [event_id, userId, trimmedContent]
        );

        const newComment = insertResult.rows[0];

        // =======================================================================
        // Fetch user details to include in response
        // =======================================================================
        const userResult = await query(
            `SELECT name, avatar_url FROM app_user WHERE id = $1`,
            [userId]
        );

        const user = userResult.rows[0];

        // =======================================================================
        // Return success with the new comment
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            comment: {
                id: newComment.id,
                event_id: newComment.event_id,
                user_id: newComment.user_id,
                user_name: user.name,
                user_avatar_url: user.avatar_url,
                content: newComment.content,
                created_at: newComment.created_at
            }
        });

    } catch (error) {
        console.error('Add comment error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
