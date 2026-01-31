/*
=======================================================================================================================================
API Route: add_comment
=======================================================================================================================================
Method: POST
Purpose: Adds a comment to an event. User must be attending, on waitlist, or be a host/organiser.
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
const { queueNewCommentEmail } = require('../../services/email');

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
        // Verify event exists and check user permissions
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.title,
                e.group_id,
                g.name AS group_name,
                er.status AS rsvp_status,
                gm.role AS member_role,
                EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_host
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             LEFT JOIN event_rsvp er ON e.id = er.event_id AND er.user_id = $2
             LEFT JOIN group_member gm ON e.group_id = gm.group_id AND gm.user_id = $2 AND gm.status = 'active'
             WHERE e.id = $1`,
            [event_id, userId]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'EVENT_NOT_FOUND',
                message: 'Event not found'
            });
        }

        const { rsvp_status, member_role, is_host } = eventResult.rows[0];

        // =======================================================================
        // Verify user can comment: any RSVP status (attending, waitlist, not_going), host, or organiser
        // =======================================================================
        const hasRsvp = rsvp_status === 'attending' || rsvp_status === 'waitlist' || rsvp_status === 'not_going';
        const isHostOrOrganiser = is_host || member_role === 'organiser';

        if (!hasRsvp && !isHostOrOrganiser) {
            return res.json({
                return_code: 'NOT_ATTENDING',
                message: 'You must have RSVPed to this event to comment'
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
        const event = eventResult.rows[0];

        // =======================================================================
        // Queue notification emails to all RSVPed users and hosts (except commenter)
        // =======================================================================
        const recipientsResult = await query(
            `SELECT DISTINCT u.email, u.name
             FROM app_user u
             WHERE u.id != $2
             AND (
                 u.id IN (SELECT er.user_id FROM event_rsvp er WHERE er.event_id = $1 AND er.status IN ('attending', 'waitlist', 'not_going'))
                 OR u.id IN (SELECT eh.user_id FROM event_host eh WHERE eh.event_id = $1)
             )`,
            [event_id, userId]
        );

        // Create group object for email queue
        const group = { id: event.group_id, name: event.group_name };

        // Queue digest emails for all recipients
        for (const recipient of recipientsResult.rows) {
            queueNewCommentEmail(
                recipient.email,
                recipient.name,
                event,
                group,
                userId
            ).catch(err => {
                console.error('Failed to queue comment digest:', err);
            });
        }

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
