/*
=======================================================================================================================================
API Route: add_host
=======================================================================================================================================
Method: POST
Purpose: Adds a host to an event. Only existing hosts or group organisers can add hosts.
         The new host must be an active member of the group.
=======================================================================================================================================
Request Payload:
{
  "user_id": 5                           // integer, required - the user to add as host
}

Success Response:
{
  "return_code": "SUCCESS",
  "host": {
    "user_id": 5,
    "name": "John Smith",
    "avatar_url": "https://...",
    "added_at": "2026-01-01T00:00:00.000Z"
  },
  "message": "Host added successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_FOUND"
"FORBIDDEN"
"NOT_GROUP_MEMBER"
"ALREADY_HOST"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/hosts/add', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const currentUserId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!user_id) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'user_id is required'
            });
        }

        // =======================================================================
        // Validate event ID
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Fetch event with group info and check current user's permissions
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.group_id,
                e.status,
                gm.role AS current_user_role,
                EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_current_user_host
             FROM event_list e
             LEFT JOIN group_member gm ON e.group_id = gm.group_id
                AND gm.user_id = $2
                AND gm.status = 'active'
             WHERE e.id = $1`,
            [id, currentUserId]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const event = eventResult.rows[0];

        // =======================================================================
        // Check permissions: must be an existing host OR group organiser
        // =======================================================================
        const isOrganiser = event.current_user_role === 'organiser';
        const isHost = event.is_current_user_host;

        if (!isOrganiser && !isHost) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only hosts or group organisers can add hosts'
            });
        }

        // =======================================================================
        // Check if target user is already a host
        // =======================================================================
        const existingHostResult = await query(
            'SELECT id FROM event_host WHERE event_id = $1 AND user_id = $2',
            [id, user_id]
        );

        if (existingHostResult.rows.length > 0) {
            return res.json({
                return_code: 'ALREADY_HOST',
                message: 'User is already a host for this event'
            });
        }

        // =======================================================================
        // Check if target user is an active group member
        // =======================================================================
        const memberResult = await query(
            `SELECT user_id FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
            [event.group_id, user_id]
        );

        if (memberResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_GROUP_MEMBER',
                message: 'User must be an active member of the group'
            });
        }

        // =======================================================================
        // Add the new host
        // =======================================================================
        await query(
            `INSERT INTO event_host (event_id, user_id, added_by)
             VALUES ($1, $2, $3)`,
            [id, user_id, currentUserId]
        );

        // =======================================================================
        // Fetch the new host's details for response
        // =======================================================================
        const hostResult = await query(
            `SELECT
                eh.user_id,
                u.name,
                u.avatar_url,
                eh.created_at AS added_at
             FROM event_host eh
             JOIN app_user u ON eh.user_id = u.id
             WHERE eh.event_id = $1 AND eh.user_id = $2`,
            [id, user_id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            host: hostResult.rows[0],
            message: 'Host added successfully'
        });

    } catch (error) {
        console.error('Add host error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
