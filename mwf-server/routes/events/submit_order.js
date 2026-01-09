/*
=======================================================================================================================================
API Route: submit_order
=======================================================================================================================================
Method: POST
Purpose: Allows an attendee to submit or update their food order for an event.
         - User must have an active RSVP (attending or waitlist)
         - Cannot submit after preorder_cutoff (if set)
=======================================================================================================================================
Request Payload:
{
  "food_order": "Roast beef, medium rare",    // string, optional (the food order)
  "dietary_notes": "Gluten free"               // string, optional (dietary requirements)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Order submitted successfully",
  "order": {
    "food_order": "Roast beef, medium rare",
    "dietary_notes": "Gluten free"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"NO_RSVP"
"CUTOFF_PASSED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/submit-order', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { food_order, dietary_notes } = req.body;
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
        // Fetch event to check preorder_cutoff
        // =======================================================================
        const eventResult = await query(
            'SELECT id, preorder_cutoff FROM event_list WHERE id = $1',
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
        // Check if preorder cutoff has passed
        // =======================================================================
        if (event.preorder_cutoff && new Date(event.preorder_cutoff) < new Date()) {
            return res.json({
                return_code: 'CUTOFF_PASSED',
                message: 'Pre-order deadline has passed'
            });
        }

        // =======================================================================
        // Check if user has an RSVP for this event
        // =======================================================================
        const rsvpResult = await query(
            'SELECT id FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (rsvpResult.rows.length === 0) {
            return res.json({
                return_code: 'NO_RSVP',
                message: 'You must RSVP to submit a food order'
            });
        }

        // =======================================================================
        // Update the food order
        // =======================================================================
        const updateResult = await query(
            `UPDATE event_rsvp
             SET food_order = $1, dietary_notes = $2
             WHERE event_id = $3 AND user_id = $4
             RETURNING food_order, dietary_notes`,
            [food_order?.trim() || null, dietary_notes?.trim() || null, id, userId]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: 'Order submitted successfully',
            order: {
                food_order: updateResult.rows[0].food_order,
                dietary_notes: updateResult.rows[0].dietary_notes
            }
        });

    } catch (error) {
        console.error('Submit order error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
