/*
=======================================================================================================================================
API Route: update_order
=======================================================================================================================================
Method: POST
Purpose: Allows hosts/organisers to update another attendee's food order.
         - Only hosts or group organisers can use this endpoint
         - Can update any attendee's order regardless of cutoff
=======================================================================================================================================
Request Payload:
{
  "user_id": 123,                              // integer, required - the user whose order to update
  "food_order": "Roast beef, medium rare",     // string, optional (the food order)
  "dietary_notes": "Gluten free"               // string, optional (dietary requirements)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Order updated successfully",
  "order": {
    "user_id": 123,
    "food_order": "Roast beef, medium rare",
    "dietary_notes": "Gluten free"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_FOUND"
"FORBIDDEN"
"USER_NOT_ATTENDING"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/update-order', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id: targetUserId, food_order, dietary_notes } = req.body;
        const currentUserId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!targetUserId) {
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
        // Fetch event with group info and check permissions
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.group_id,
                gm.role AS current_user_role,
                EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_host
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
        // Check permissions: must be organiser OR event host
        // =======================================================================
        const isOrganiser = event.current_user_role === 'organiser';
        const isEventHost = event.is_host;

        if (!isOrganiser && !isEventHost) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only hosts or group organisers can update other attendees\' orders'
            });
        }

        // =======================================================================
        // Check if target user has an RSVP for this event
        // =======================================================================
        const rsvpResult = await query(
            'SELECT id FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
            [id, targetUserId]
        );

        if (rsvpResult.rows.length === 0) {
            return res.json({
                return_code: 'USER_NOT_ATTENDING',
                message: 'User has not RSVP\'d to this event'
            });
        }

        // =======================================================================
        // Update the food order (hosts can update regardless of cutoff)
        // =======================================================================
        const updateResult = await query(
            `UPDATE event_rsvp
             SET food_order = $1, dietary_notes = $2
             WHERE event_id = $3 AND user_id = $4
             RETURNING food_order, dietary_notes`,
            [food_order?.trim() || null, dietary_notes?.trim() || null, id, targetUserId]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: 'Order updated successfully',
            order: {
                user_id: parseInt(targetUserId, 10),
                food_order: updateResult.rows[0].food_order,
                dietary_notes: updateResult.rows[0].dietary_notes
            }
        });

    } catch (error) {
        console.error('Update order error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
