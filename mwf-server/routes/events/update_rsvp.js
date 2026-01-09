/*
=======================================================================================================================================
API Route: update_rsvp
=======================================================================================================================================
Method: POST
Purpose: Updates an existing RSVP's guest count. Only the RSVP owner can update.
         Cannot increase guests if it would exceed event capacity.
=======================================================================================================================================
Request Payload:
{
  "guest_count": 2                       // integer 0-5, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "rsvp": {
    "status": "attending",
    "waitlist_position": null,
    "guest_count": 2
  },
  "message": "Guest count updated"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_GUEST_COUNT"
"NOT_FOUND"
"NOT_RSVP"
"GUESTS_NOT_ALLOWED"
"CAPACITY_EXCEEDED"
"EVENT_CANCELLED"
"EVENT_PAST"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { withTransaction } = require('../../utils/transaction');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/rsvp/update', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { guest_count } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (guest_count === undefined || guest_count === null) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'guest_count is required'
            });
        }

        const requestedGuests = parseInt(guest_count, 10);
        if (isNaN(requestedGuests) || requestedGuests < 0 || requestedGuests > 5) {
            return res.json({
                return_code: 'INVALID_GUEST_COUNT',
                message: 'Guest count must be between 0 and 5'
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
        // Use transaction for atomic operations
        // =======================================================================
        const result = await withTransaction(async (client) => {
            // ===================================================================
            // Lock event row and get details
            // ===================================================================
            const eventResult = await client.query(
                `SELECT id, capacity, status, date_time, allow_guests, max_guests_per_rsvp
                 FROM event_list
                 WHERE id = $1
                 FOR UPDATE`,
                [id]
            );

            if (eventResult.rows.length === 0) {
                return {
                    return_code: 'NOT_FOUND',
                    message: 'Event not found'
                };
            }

            const event = eventResult.rows[0];

            // ===================================================================
            // Check event status
            // ===================================================================
            if (event.status === 'cancelled') {
                return {
                    return_code: 'EVENT_CANCELLED',
                    message: 'This event has been cancelled'
                };
            }

            if (new Date(event.date_time) <= new Date()) {
                return {
                    return_code: 'EVENT_PAST',
                    message: 'This event has already started'
                };
            }

            // ===================================================================
            // Check if guests are allowed
            // ===================================================================
            if (!event.allow_guests && requestedGuests > 0) {
                return {
                    return_code: 'GUESTS_NOT_ALLOWED',
                    message: 'This event does not allow guests'
                };
            }

            // ===================================================================
            // Validate guest count against event max
            // ===================================================================
            if (requestedGuests > event.max_guests_per_rsvp) {
                return {
                    return_code: 'INVALID_GUEST_COUNT',
                    message: `Guest count cannot exceed ${event.max_guests_per_rsvp}`
                };
            }

            // ===================================================================
            // Get user's current RSVP
            // ===================================================================
            const rsvpResult = await client.query(
                'SELECT id, status, waitlist_position, guest_count FROM event_rsvp WHERE event_id = $1 AND user_id = $2 FOR UPDATE',
                [id, userId]
            );

            if (rsvpResult.rows.length === 0) {
                return {
                    return_code: 'NOT_RSVP',
                    message: 'You have not RSVP\'d to this event'
                };
            }

            const currentRsvp = rsvpResult.rows[0];
            const currentGuestCount = currentRsvp.guest_count || 0;

            // ===================================================================
            // If increasing guests and attending, check capacity
            // ===================================================================
            if (currentRsvp.status === 'attending' && requestedGuests > currentGuestCount && event.capacity !== null) {
                const countResult = await client.query(
                    `SELECT
                        COUNT(*) AS attendee_count,
                        COALESCE(SUM(guest_count), 0) AS total_guests
                     FROM event_rsvp
                     WHERE event_id = $1 AND status = 'attending'`,
                    [id]
                );

                const attendeeCount = parseInt(countResult.rows[0].attendee_count, 10) || 0;
                const totalGuests = parseInt(countResult.rows[0].total_guests, 10) || 0;
                const currentSpotsTaken = attendeeCount + totalGuests;

                const additionalGuests = requestedGuests - currentGuestCount;
                if (currentSpotsTaken + additionalGuests > event.capacity) {
                    return {
                        return_code: 'CAPACITY_EXCEEDED',
                        message: 'Not enough capacity for additional guests'
                    };
                }
            }

            // ===================================================================
            // Update guest count
            // ===================================================================
            await client.query(
                'UPDATE event_rsvp SET guest_count = $1 WHERE id = $2',
                [requestedGuests, currentRsvp.id]
            );

            return {
                return_code: 'SUCCESS',
                rsvp: {
                    status: currentRsvp.status,
                    waitlist_position: currentRsvp.waitlist_position,
                    guest_count: requestedGuests
                },
                message: 'Guest count updated'
            };
        });

        return res.json(result);

    } catch (error) {
        console.error('Update RSVP error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
