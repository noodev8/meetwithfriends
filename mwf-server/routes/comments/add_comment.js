/*
=======================================================================================================================================
API Route: add_comment
=======================================================================================================================================
Method: POST
Purpose: Adds a comment to an event. User must be attending or on the waitlist for the event.
=======================================================================================================================================
Request Payload:
{
  "event_id": 1,                       // integer, required - ID of the event
  "content": "Looking forward to it!"  // string, required - Comment text (max 280 chars)
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
"NOT_ATTENDING"
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
        // Verify event exists and user is attending or on waitlist
        // =======================================================================
        const eventResult = await query(
            `SELECT e.id, er.status AS rsvp_status
             FROM event_list e
             LEFT JOIN event_rsvp er ON e.id = er.event_id AND er.user_id = $2
             WHERE e.id = $1`,
            [event_id, userId]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'EVENT_NOT_FOUND',
                message: 'Event not found'
            });
        }

        const rsvpStatus = eventResult.rows[0].rsvp_status;

        // =======================================================================
        // Verify user is attending or on waitlist
        // =======================================================================
        if (rsvpStatus !== 'attending' && rsvpStatus !== 'waitlist') {
            return res.json({
                return_code: 'NOT_ATTENDING',
                message: 'You must be attending or on the waitlist to comment'
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
