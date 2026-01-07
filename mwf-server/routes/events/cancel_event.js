/*
=======================================================================================================================================
API Route: cancel_event
=======================================================================================================================================
Method: POST
Purpose: Cancels an event. Only the event creator or group organiser can cancel.
         Cancelled events remain visible but cannot accept new RSVPs.
=======================================================================================================================================
Request Payload:
None (event ID from URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Event has been cancelled"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"ALREADY_CANCELLED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/cancel', verifyToken, async (req, res) => {
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
        // Fetch event with group info to check permissions
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.group_id,
                e.created_by,
                e.status,
                gm.role AS current_user_role
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
        // Check permissions: must be organiser OR event creator
        // =======================================================================
        const isOrganiser = event.current_user_role === 'organiser';
        const isEventCreator = event.created_by === userId;

        if (!isOrganiser && !isEventCreator) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only the organiser or event creator can cancel this event'
            });
        }

        // =======================================================================
        // Check event is not already cancelled
        // =======================================================================
        if (event.status === 'cancelled') {
            return res.json({
                return_code: 'ALREADY_CANCELLED',
                message: 'This event is already cancelled'
            });
        }

        // =======================================================================
        // Cancel the event
        // =======================================================================
        await query(
            `UPDATE event_list
             SET status = 'cancelled', updated_at = NOW()
             WHERE id = $1`,
            [id]
        );

        return res.json({
            return_code: 'SUCCESS',
            message: 'Event has been cancelled'
        });

    } catch (error) {
        console.error('Cancel event error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
