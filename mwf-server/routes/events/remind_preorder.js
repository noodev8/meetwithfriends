/*
=======================================================================================================================================
API Route: remind_preorder
=======================================================================================================================================
Method: POST
Purpose: Sends pre-order reminder emails to attending members who haven't placed their food order yet.
         Only hosts and organisers can send reminders. Can be sent multiple times.
=======================================================================================================================================
Request Payload:
None (event ID from URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Reminder sent to 5 attendees",
  "queued_count": 5
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"NO_RECIPIENTS"
"INVALID_STATE"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { queuePreorderReminderEmail } = require('../../services/email');

router.post('/:id/remind-preorder', verifyToken, async (req, res) => {
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
        // Fetch event with group info
        // =======================================================================
        const eventResult = await query(
            `SELECT e.id, e.group_id, e.title, e.status, e.date_time, e.location,
                    e.preorders_enabled, e.preorder_cutoff,
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
        // Guard: event must not be cancelled
        // =======================================================================
        if (event.status === 'cancelled') {
            return res.json({
                return_code: 'INVALID_STATE',
                message: 'Cannot send reminders for a cancelled event'
            });
        }

        // =======================================================================
        // Guard: event must not be in the past
        // =======================================================================
        if (new Date(event.date_time) < new Date()) {
            return res.json({
                return_code: 'INVALID_STATE',
                message: 'Cannot send reminders for a past event'
            });
        }

        // =======================================================================
        // Guard: preorders must be enabled
        // =======================================================================
        if (!event.preorders_enabled) {
            return res.json({
                return_code: 'INVALID_STATE',
                message: 'Pre-orders are not enabled for this event'
            });
        }

        // =======================================================================
        // Guard: cutoff must not have passed
        // =======================================================================
        if (event.preorder_cutoff && new Date(event.preorder_cutoff) < new Date()) {
            return res.json({
                return_code: 'INVALID_STATE',
                message: 'The pre-order cutoff has passed'
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
                message: 'Only hosts and organisers can send pre-order reminders'
            });
        }

        // =======================================================================
        // Get sender's name for email
        // =======================================================================
        const senderResult = await query('SELECT name FROM app_user WHERE id = $1', [userId]);
        const hostName = senderResult.rows[0]?.name || 'Someone';

        // =======================================================================
        // Fetch attending members who haven't placed a food order
        // =======================================================================
        const recipientsResult = await query(
            `SELECT u.email, u.name
             FROM event_rsvp er
             JOIN app_user u ON er.user_id = u.id
             WHERE er.event_id = $1
             AND er.status = 'attending'
             AND (er.food_order IS NULL OR er.food_order = '')
             AND u.receive_broadcasts != false`,
            [id]
        );

        if (recipientsResult.rows.length === 0) {
            return res.json({
                return_code: 'NO_RECIPIENTS',
                message: 'All attendees have already placed their orders'
            });
        }

        // =======================================================================
        // Queue emails for each recipient (skips those with a pending reminder)
        // =======================================================================
        const group = { id: event.group_id, name: event.group_name };
        for (const recipient of recipientsResult.rows) {
            queuePreorderReminderEmail(recipient.email, recipient.name, event, group, hostName).catch(err => {
                console.error('Failed to queue pre-order reminder email:', err);
            });
        }

        return res.json({
            return_code: 'SUCCESS',
            message: `Reminder sent to ${recipientsResult.rows.length} attendee${recipientsResult.rows.length === 1 ? '' : 's'}`,
            queued_count: recipientsResult.rows.length
        });

    } catch (error) {
        console.error('Pre-order reminder error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
