/*
=======================================================================================================================================
API Route: cancel_event
=======================================================================================================================================
Method: POST
Purpose: Deletes an event and all related data. Only event hosts or group organisers can delete.
         Sends cancellation emails to attendees before deletion.
=======================================================================================================================================
Request Payload:
None (event ID from URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Event has been deleted",
  "group_id": 1
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { queueEventCancelledEmail } = require('../../services/email');

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
        // Fetch event with group info and host status to check permissions
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.group_id,
                e.status,
                e.title,
                e.location,
                e.date_time,
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
                message: 'Only hosts or group organisers can cancel this event'
            });
        }

        // =======================================================================
        // Get attendees BEFORE deleting (for cancellation emails)
        // =======================================================================
        const attendeesResult = await query(
            `SELECT u.email, u.name
             FROM event_rsvp er
             JOIN app_user u ON er.user_id = u.id
             WHERE er.event_id = $1
             AND er.status IN ('attending', 'waitlist')`,
            [id]
        );

        // =======================================================================
        // Create audit log entry
        // =======================================================================
        await query(
            'INSERT INTO audit_log (user_id, action) VALUES ($1, $2)',
            [userId, `Deleted event "${event.title}"`]
        );

        // =======================================================================
        // Delete the event (cascades to event_rsvp, event_host, event_comment)
        // =======================================================================
        await query('DELETE FROM event_list WHERE id = $1', [id]);

        // =======================================================================
        // Queue cancellation emails to all attendees and waitlist
        // =======================================================================
        for (const attendee of attendeesResult.rows) {
            queueEventCancelledEmail(attendee.email, attendee.name, event).catch(err => {
                console.error('Failed to queue event cancelled email:', err);
            });
        }

        return res.json({
            return_code: 'SUCCESS',
            message: 'Event has been deleted',
            group_id: event.group_id
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
