/*
=======================================================================================================================================
API Route: restore_event
=======================================================================================================================================
Method: POST
Purpose: Restores a cancelled event. Only event hosts or group organisers can restore.
         Restored events return to 'published' status and can accept RSVPs again.
=======================================================================================================================================
Request Payload:
None (event ID from URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Event has been restored"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"NOT_CANCELLED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/restore', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

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
        // Fetch event with group info and host status to check permissions
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.group_id,
                e.status,
                gm.role AS current_user_role,
                EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_host
             FROM event_list e
             LEFT JOIN group_member gm ON e.group_id = gm.group_id
                AND gm.user_id = $2
                AND gm.status = 'active'
             WHERE e.id = $1`,
            [id, userId]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const event = eventResult.rows[0];

        // =======================================================================
        // Check permissions: must be organiser OR event host
        // =======================================================================
        const isOrganiser = event.current_user_role === 'organiser';
        const isEventHost = event.is_host;

        if (!isOrganiser && !isEventHost) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only hosts or group organisers can restore this event'
            });
        }

        // =======================================================================
        // Check event is actually cancelled
        // =======================================================================
        if (event.status !== 'cancelled') {
            return res.json({
                return_code: 'NOT_CANCELLED',
                message: 'This event is not cancelled'
            });
        }

        // =======================================================================
        // Restore the event
        // =======================================================================
        await query(
            `UPDATE event_list
             SET status = 'published', updated_at = NOW()
             WHERE id = $1`,
            [id]
        );

        return res.json({
            return_code: 'SUCCESS',
            message: 'Event has been restored'
        });

    } catch (error) {
        console.error('Restore event error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
