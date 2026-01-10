/*
=======================================================================================================================================
API Route: rsvp
=======================================================================================================================================
Method: POST
Purpose: RSVP to an event (join or leave). Handles capacity limits and waitlist management.
         When joining: if capacity available → attending, else → waitlist with position
         When leaving: if was attending and waitlist exists → promote first waitlist person
         Capacity includes guests: each RSVP takes up (1 + guest_count) spots
=======================================================================================================================================
Request Payload:
{
  "action": "join" | "leave",            // string, required
  "guest_count": 2                       // integer 0-5, optional (only for join, requires event allow_guests)
}

Success Response (join - attending):
{
  "return_code": "SUCCESS",
  "rsvp": {
    "status": "attending",
    "waitlist_position": null,
    "guest_count": 2
  },
  "message": "You're going to this event"
}

Success Response (join - waitlist):
{
  "return_code": "SUCCESS",
  "rsvp": {
    "status": "waitlist",
    "waitlist_position": 3,
    "guest_count": 0
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
"INVALID_GUEST_COUNT"
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
const { query } = require('../../database');
const { sendRsvpConfirmedEmail, sendPromotedFromWaitlistEmail } = require('../../services/email');

router.post('/:id/rsvp', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, guest_count } = req.body;
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
                `SELECT id, group_id, capacity, status, date_time, allow_guests, max_guests_per_rsvp, title, location
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
            // Get current attendee count and total spots taken (including guests)
            // ===================================================================
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
            const totalSpotsTaken = attendeeCount + totalGuests;

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
                'SELECT id, status, waitlist_position, guest_count FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
                [id, userId]
            );

            // ===================================================================
            // Handle JOIN action
            // ===================================================================
            if (action === 'join') {
                // Allow rejoining if status is 'not_going', otherwise error
                if (existingRsvp.rows.length > 0 && existingRsvp.rows[0].status !== 'not_going') {
                    return {
                        return_code: 'ALREADY_RSVP',
                        message: 'You have already RSVP\'d to this event',
                        rsvp: {
                            status: existingRsvp.rows[0].status,
                            waitlist_position: existingRsvp.rows[0].waitlist_position,
                            guest_count: existingRsvp.rows[0].guest_count || 0
                        }
                    };
                }

                // If rejoining from not_going, delete old record first (will be recreated below)
                if (existingRsvp.rows.length > 0 && existingRsvp.rows[0].status === 'not_going') {
                    await client.query(
                        'DELETE FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
                        [id, userId]
                    );
                }

                // Validate and determine guest count
                let finalGuestCount = 0;
                if (event.allow_guests && guest_count !== undefined && guest_count !== null) {
                    const requestedGuests = parseInt(guest_count, 10);
                    if (isNaN(requestedGuests) || requestedGuests < 0 || requestedGuests > event.max_guests_per_rsvp) {
                        return {
                            return_code: 'INVALID_GUEST_COUNT',
                            message: `Guest count must be between 0 and ${event.max_guests_per_rsvp}`
                        };
                    }
                    finalGuestCount = requestedGuests;
                } else if (!event.allow_guests && guest_count && parseInt(guest_count, 10) > 0) {
                    return {
                        return_code: 'INVALID_GUEST_COUNT',
                        message: 'This event does not allow guests'
                    };
                }

                // Determine if user (+ guests) gets a spot or goes to waitlist
                // Spots needed = 1 (for the member) + guests
                const spotsNeeded = 1 + finalGuestCount;
                const hasCapacity = event.capacity === null || (totalSpotsTaken + spotsNeeded) <= event.capacity;

                if (hasCapacity) {
                    // Add as attending with guests
                    await client.query(
                        `INSERT INTO event_rsvp (event_id, user_id, status, guest_count)
                         VALUES ($1, $2, 'attending', $3)`,
                        [id, userId, finalGuestCount]
                    );

                    return {
                        return_code: 'SUCCESS',
                        rsvp: { status: 'attending', waitlist_position: null, guest_count: finalGuestCount },
                        message: "You're going to this event",
                        _emailData: { type: 'rsvp_confirmed', userId, event }
                    };
                } else {
                    // Add to waitlist - get next position (no guests on waitlist)
                    const maxPosResult = await client.query(
                        `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_pos
                         FROM event_rsvp
                         WHERE event_id = $1 AND status = 'waitlist'`,
                        [id]
                    );
                    const nextPosition = maxPosResult.rows[0].next_pos;

                    await client.query(
                        `INSERT INTO event_rsvp (event_id, user_id, status, waitlist_position, guest_count)
                         VALUES ($1, $2, 'waitlist', $3, 0)`,
                        [id, userId, nextPosition]
                    );

                    return {
                        return_code: 'SUCCESS',
                        rsvp: { status: 'waitlist', waitlist_position: nextPosition, guest_count: 0 },
                        message: `You've been added to the waitlist (position ${nextPosition})`
                    };
                }
            }

            // ===================================================================
            // Handle LEAVE action
            // ===================================================================
            if (action === 'leave') {
                if (existingRsvp.rows.length === 0 || existingRsvp.rows[0].status === 'not_going') {
                    return {
                        return_code: 'NOT_RSVP',
                        message: 'You have not RSVP\'d to this event'
                    };
                }

                const wasAttending = existingRsvp.rows[0].status === 'attending';
                const wasWaitlistPosition = existingRsvp.rows[0].waitlist_position;

                // Update to not_going status (keep record for history, update timestamp)
                await client.query(
                    `UPDATE event_rsvp
                     SET status = 'not_going', waitlist_position = NULL, guest_count = 0, created_at = NOW()
                     WHERE event_id = $1 AND user_id = $2`,
                    [id, userId]
                );

                // If was attending and there's a waitlist, promote first person
                let promotedUserId = null;
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
                        promotedUserId = firstWaitlist.rows[0].user_id;

                        // Promote to attending (update timestamp to reflect promotion time)
                        await client.query(
                            `UPDATE event_rsvp
                             SET status = 'attending', waitlist_position = NULL, created_at = NOW()
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
                    message: "You've cancelled your RSVP",
                    _emailData: promotedUserId ? { type: 'promoted', promotedUserId, event } : null
                };
            }
        });

        // =======================================================================
        // Send emails after successful transaction
        // =======================================================================
        if (result.return_code === 'SUCCESS' && result._emailData) {
            const emailData = result._emailData;

            if (emailData.type === 'rsvp_confirmed') {
                // Get user details and send RSVP confirmation
                const userResult = await query('SELECT name, email FROM app_user WHERE id = $1', [emailData.userId]);
                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];
                    sendRsvpConfirmedEmail(user.email, user.name, emailData.event).catch(err => {
                        console.error('Failed to send RSVP confirmation email:', err);
                    });
                }
            } else if (emailData.type === 'promoted') {
                // Get promoted user details and send promotion email
                const userResult = await query('SELECT name, email FROM app_user WHERE id = $1', [emailData.promotedUserId]);
                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];
                    sendPromotedFromWaitlistEmail(user.email, user.name, emailData.event).catch(err => {
                        console.error('Failed to send waitlist promotion email:', err);
                    });
                }
            }

            // Remove internal email data before sending response
            delete result._emailData;
        }

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
