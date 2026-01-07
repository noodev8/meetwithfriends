/*
=======================================================================================================================================
API Route: rsvp
=======================================================================================================================================
Method: POST
Purpose: RSVP to an event (join or leave). Handles capacity limits and waitlist management.
         When joining: if capacity available → attending, else → waitlist with position
         When leaving: if was attending and waitlist exists → promote first waitlist person
=======================================================================================================================================
Request Payload:
{
  "action": "join" | "leave"             // string, required
}

Success Response (join - attending):
{
  "return_code": "SUCCESS",
  "rsvp": {
    "status": "attending",
    "waitlist_position": null
  },
  "message": "You're going to this event"
}

Success Response (join - waitlist):
{
  "return_code": "SUCCESS",
  "rsvp": {
    "status": "waitlist",
    "waitlist_position": 3
  },
  "message": "You've been added to the waitlist (position 3)"
}

Success Response (leave):
{
  "return_code": "SUCCESS",
  "rsvp": null,
  "message": "You've cancelled your RSVP"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_ACTION"
"NOT_FOUND"
"NOT_GROUP_MEMBER"
"EVENT_CANCELLED"
"EVENT_PAST"
"ALREADY_RSVP"
"NOT_RSVP"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { withTransaction } = require('../../utils/transaction');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/rsvp', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!action) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'action is required'
            });
        }

        if (action !== 'join' && action !== 'leave') {
            return res.json({
                return_code: 'INVALID_ACTION',
                message: 'action must be "join" or "leave"'
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
        // Use transaction for atomic RSVP operations
        // =======================================================================
        const result = await withTransaction(async (client) => {
            // ===================================================================
            // Lock event row for update (separate from count query)
            // ===================================================================
            const eventResult = await client.query(
                `SELECT id, group_id, capacity, status, date_time
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
            // Get current attendee count (separate query)
            // ===================================================================
            const countResult = await client.query(
                `SELECT COUNT(*) AS attendee_count
                 FROM event_rsvp
                 WHERE event_id = $1 AND status = 'attending'`,
                [id]
            );
            const attendeeCount = parseInt(countResult.rows[0].attendee_count, 10) || 0;

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
            // Check user is an active member of the group
            // ===================================================================
            const membershipResult = await client.query(
                `SELECT id FROM group_member
                 WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                [event.group_id, userId]
            );

            if (membershipResult.rows.length === 0) {
                return {
                    return_code: 'NOT_GROUP_MEMBER',
                    message: 'You must be a member of this group to RSVP'
                };
            }

            // ===================================================================
            // Check user's current RSVP status
            // ===================================================================
            const existingRsvp = await client.query(
                'SELECT id, status, waitlist_position FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
                [id, userId]
            );

            // ===================================================================
            // Handle JOIN action
            // ===================================================================
            if (action === 'join') {
                if (existingRsvp.rows.length > 0) {
                    return {
                        return_code: 'ALREADY_RSVP',
                        message: 'You have already RSVP\'d to this event',
                        rsvp: {
                            status: existingRsvp.rows[0].status,
                            waitlist_position: existingRsvp.rows[0].waitlist_position
                        }
                    };
                }

                // Determine if user gets a spot or goes to waitlist
                const hasCapacity = event.capacity === null || attendeeCount < event.capacity;

                if (hasCapacity) {
                    // Add as attending
                    await client.query(
                        `INSERT INTO event_rsvp (event_id, user_id, status)
                         VALUES ($1, $2, 'attending')`,
                        [id, userId]
                    );

                    return {
                        return_code: 'SUCCESS',
                        rsvp: { status: 'attending', waitlist_position: null },
                        message: "You're going to this event"
                    };
                } else {
                    // Add to waitlist - get next position
                    const maxPosResult = await client.query(
                        `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_pos
                         FROM event_rsvp
                         WHERE event_id = $1 AND status = 'waitlist'`,
                        [id]
                    );
                    const nextPosition = maxPosResult.rows[0].next_pos;

                    await client.query(
                        `INSERT INTO event_rsvp (event_id, user_id, status, waitlist_position)
                         VALUES ($1, $2, 'waitlist', $3)`,
                        [id, userId, nextPosition]
                    );

                    return {
                        return_code: 'SUCCESS',
                        rsvp: { status: 'waitlist', waitlist_position: nextPosition },
                        message: `You've been added to the waitlist (position ${nextPosition})`
                    };
                }
            }

            // ===================================================================
            // Handle LEAVE action
            // ===================================================================
            if (action === 'leave') {
                if (existingRsvp.rows.length === 0) {
                    return {
                        return_code: 'NOT_RSVP',
                        message: 'You have not RSVP\'d to this event'
                    };
                }

                const wasAttending = existingRsvp.rows[0].status === 'attending';
                const wasWaitlistPosition = existingRsvp.rows[0].waitlist_position;

                // Delete the RSVP
                await client.query(
                    'DELETE FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
                    [id, userId]
                );

                // If was attending and there's a waitlist, promote first person
                if (wasAttending) {
                    const firstWaitlist = await client.query(
                        `SELECT id, user_id
                         FROM event_rsvp
                         WHERE event_id = $1 AND status = 'waitlist'
                         ORDER BY waitlist_position ASC
                         LIMIT 1`,
                        [id]
                    );

                    if (firstWaitlist.rows.length > 0) {
                        // Promote to attending
                        await client.query(
                            `UPDATE event_rsvp
                             SET status = 'attending', waitlist_position = NULL
                             WHERE id = $1`,
                            [firstWaitlist.rows[0].id]
                        );

                        // Reorder remaining waitlist positions
                        await client.query(
                            `UPDATE event_rsvp
                             SET waitlist_position = waitlist_position - 1
                             WHERE event_id = $1 AND status = 'waitlist'`,
                            [id]
                        );
                    }
                } else if (wasWaitlistPosition) {
                    // Was on waitlist - reorder positions for those behind
                    await client.query(
                        `UPDATE event_rsvp
                         SET waitlist_position = waitlist_position - 1
                         WHERE event_id = $1 AND status = 'waitlist' AND waitlist_position > $2`,
                        [id, wasWaitlistPosition]
                    );
                }

                return {
                    return_code: 'SUCCESS',
                    rsvp: null,
                    message: "You've cancelled your RSVP"
                };
            }
        });

        // =======================================================================
        // Return the result from transaction
        // =======================================================================
        return res.json(result);

    } catch (error) {
        console.error('RSVP error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
