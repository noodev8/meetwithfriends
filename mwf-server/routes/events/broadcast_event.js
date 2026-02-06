/*
=======================================================================================================================================
API Route: broadcast_event
=======================================================================================================================================
Method: POST
Purpose: Broadcasts event notification emails to all active group members. Only hosts and organisers can broadcast.
         Can only be called once per event (checked via broadcast_sent_at timestamp).
=======================================================================================================================================
Request Payload:
None (event ID from URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Event broadcast to 15 group members",
  "queued_count": 15
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"ALREADY_BROADCAST"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { queueNewEventEmail } = require('../../services/email');

router.post('/:id/broadcast', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate ID is a number
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Fetch event and check it exists and hasn't been broadcast yet
        // =======================================================================
        const eventResult = await query(
            `SELECT e.id, e.group_id, e.title, e.status, e.broadcast_sent_at, e.created_by,
                    g.name as group_name
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             WHERE e.id = $1`,
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const event = eventResult.rows[0];

        // =======================================================================
        // Check if already broadcast
        // =======================================================================
        if (event.broadcast_sent_at) {
            return res.json({
                return_code: 'ALREADY_BROADCAST',
                message: 'This event has already been broadcast'
            });
        }

        // =======================================================================
        // Check permission - must be organiser or host of the event
        // =======================================================================
        const [memberResult, hostResult] = await Promise.all([
            query(
                `SELECT role FROM group_member
                 WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                [event.group_id, userId]
            ),
            query(
                `SELECT id FROM event_host
                 WHERE event_id = $1 AND user_id = $2`,
                [id, userId]
            )
        ]);

        const isOrganiser = memberResult.rows[0]?.role === 'organiser';
        const isHost = hostResult.rows.length > 0;

        if (!isOrganiser && !isHost) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only hosts and organisers can broadcast events'
            });
        }

        // =======================================================================
        // Get host name for email
        // =======================================================================
        const creatorResult = await query('SELECT name FROM app_user WHERE id = $1', [userId]);
        const hostName = creatorResult.rows[0]?.name || 'Someone';

        // =======================================================================
        // Get all active group members (excluding the broadcaster) who accept broadcasts
        // =======================================================================
        const membersResult = await query(
            `SELECT u.email, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.group_id = $1
             AND gm.status = 'active'
             AND gm.user_id != $2
             AND u.receive_broadcasts != false`,
            [event.group_id, userId]
        );

        // =======================================================================
        // Queue emails for each member
        // =======================================================================
        const group = { id: event.group_id, name: event.group_name };
        for (const member of membersResult.rows) {
            queueNewEventEmail(member.email, member.name, event, group, hostName).catch(err => {
                console.error('Failed to queue broadcast email:', err);
            });
        }

        // =======================================================================
        // Mark event as broadcast
        // =======================================================================
        await query(
            'UPDATE event_list SET broadcast_sent_at = NOW() WHERE id = $1',
            [id]
        );

        return res.json({
            return_code: 'SUCCESS',
            message: `Event broadcast to ${membersResult.rows.length} group members`,
            queued_count: membersResult.rows.length
        });

    } catch (error) {
        console.error('Broadcast event error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
