/*
=======================================================================================================================================
API Route: manage_attendee
=======================================================================================================================================
Method: POST
Purpose: Allows organisers and event hosts to manage attendees - remove, demote to waitlist, or promote from waitlist.
=======================================================================================================================================
Request Payload:
{
  "user_id": 123,                        // number, required - the user to manage
  "action": "remove" | "demote" | "promote"  // string, required
}

Success Response (remove):
{
  "return_code": "SUCCESS",
  "message": "Attendee removed from event"
}

Success Response (demote):
{
  "return_code": "SUCCESS",
  "message": "Attendee moved to waitlist"
}

Success Response (promote):
{
  "return_code": "SUCCESS",
  "message": "Attendee promoted from waitlist"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_ACTION"
"NOT_FOUND"
"FORBIDDEN"
"USER_NOT_ATTENDING"
"USER_NOT_ON_WAITLIST"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { withTransaction } = require('../../utils/transaction');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/manage-attendee', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id: targetUserId, action } = req.body;
        const currentUserId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!targetUserId || !action) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'user_id and action are required'
            });
        }

        if (!['remove', 'demote', 'promote'].includes(action)) {
            return res.json({
                return_code: 'INVALID_ACTION',
                message: 'action must be "remove", "demote", or "promote"'
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
            // Fetch event with group_id and host status - check permissions in one query
            // ===================================================================
            const eventResult = await client.query(
                `SELECT
                    e.id,
                    e.group_id,
                    e.capacity,
                    gm.role AS current_user_role,
                    EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_host
                 FROM event_list e
                 LEFT JOIN group_member gm ON e.group_id = gm.group_id
                    AND gm.user_id = $2
                    AND gm.status = 'active'
                 WHERE e.id = $1
                 FOR UPDATE OF e`,
                [id, currentUserId]
            );

            if (eventResult.rows.length === 0) {
                return {
                    return_code: 'NOT_FOUND',
                    message: 'Event not found'
                };
            }

            const event = eventResult.rows[0];

            // ===================================================================
            // Check permissions: must be organiser OR event host
            // ===================================================================
            const isOrganiser = event.current_user_role === 'organiser';
            const isEventHost = event.is_host;

            if (!isOrganiser && !isEventHost) {
                return {
                    return_code: 'FORBIDDEN',
                    message: 'Only hosts or group organisers can manage attendees'
                };
            }

            // ===================================================================
            // Get target user's current RSVP status
            // ===================================================================
            const rsvpResult = await client.query(
                `SELECT id, status, waitlist_position
                 FROM event_rsvp
                 WHERE event_id = $1 AND user_id = $2`,
                [id, targetUserId]
            );

            if (rsvpResult.rows.length === 0) {
                return {
                    return_code: 'NOT_FOUND',
                    message: 'User has not RSVP\'d to this event'
                };
            }

            const targetRsvp = rsvpResult.rows[0];

            // ===================================================================
            // Handle REMOVE action
            // ===================================================================
            if (action === 'remove') {
                const wasAttending = targetRsvp.status === 'attending';
                const wasWaitlistPosition = targetRsvp.waitlist_position;

                // Delete the RSVP
                await client.query(
                    'DELETE FROM event_rsvp WHERE id = $1',
                    [targetRsvp.id]
                );

                // If was attending, promote first waitlist person
                if (wasAttending) {
                    const firstWaitlist = await client.query(
                        `SELECT id FROM event_rsvp
                         WHERE event_id = $1 AND status = 'waitlist'
                         ORDER BY waitlist_position ASC
                         LIMIT 1`,
                        [id]
                    );

                    if (firstWaitlist.rows.length > 0) {
                        await client.query(
                            `UPDATE event_rsvp
                             SET status = 'attending', waitlist_position = NULL
                             WHERE id = $1`,
                            [firstWaitlist.rows[0].id]
                        );

                        // Reorder remaining waitlist
                        await client.query(
                            `UPDATE event_rsvp
                             SET waitlist_position = waitlist_position - 1
                             WHERE event_id = $1 AND status = 'waitlist'`,
                            [id]
                        );
                    }
                } else if (wasWaitlistPosition) {
                    // Was on waitlist - reorder positions
                    await client.query(
                        `UPDATE event_rsvp
                         SET waitlist_position = waitlist_position - 1
                         WHERE event_id = $1 AND status = 'waitlist' AND waitlist_position > $2`,
                        [id, wasWaitlistPosition]
                    );
                }

                return {
                    return_code: 'SUCCESS',
                    message: 'Attendee removed from event'
                };
            }

            // ===================================================================
            // Handle DEMOTE action (attending → waitlist)
            // ===================================================================
            if (action === 'demote') {
                if (targetRsvp.status !== 'attending') {
                    return {
                        return_code: 'USER_NOT_ATTENDING',
                        message: 'User is not currently attending'
                    };
                }

                // Get next waitlist position
                const maxPosResult = await client.query(
                    `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_pos
                     FROM event_rsvp
                     WHERE event_id = $1 AND status = 'waitlist'`,
                    [id]
                );
                const nextPosition = maxPosResult.rows[0].next_pos;

                // Move to waitlist
                await client.query(
                    `UPDATE event_rsvp
                     SET status = 'waitlist', waitlist_position = $2
                     WHERE id = $1`,
                    [targetRsvp.id, nextPosition]
                );

                // Promote first waitlist person to fill the spot
                const firstWaitlist = await client.query(
                    `SELECT id FROM event_rsvp
                     WHERE event_id = $1 AND status = 'waitlist' AND id != $2
                     ORDER BY waitlist_position ASC
                     LIMIT 1`,
                    [id, targetRsvp.id]
                );

                if (firstWaitlist.rows.length > 0) {
                    await client.query(
                        `UPDATE event_rsvp
                         SET status = 'attending', waitlist_position = NULL
                         WHERE id = $1`,
                        [firstWaitlist.rows[0].id]
                    );

                    // Reorder remaining waitlist (excluding the demoted user who's now last)
                    await client.query(
                        `UPDATE event_rsvp
                         SET waitlist_position = waitlist_position - 1
                         WHERE event_id = $1 AND status = 'waitlist'`,
                        [id]
                    );
                }

                return {
                    return_code: 'SUCCESS',
                    message: 'Attendee moved to waitlist'
                };
            }

            // ===================================================================
            // Handle PROMOTE action (waitlist → attending)
            // ===================================================================
            if (action === 'promote') {
                if (targetRsvp.status !== 'waitlist') {
                    return {
                        return_code: 'USER_NOT_ON_WAITLIST',
                        message: 'User is not on the waitlist'
                    };
                }

                const promotedPosition = targetRsvp.waitlist_position;

                // Promote to attending (even if at capacity - admin override)
                await client.query(
                    `UPDATE event_rsvp
                     SET status = 'attending', waitlist_position = NULL
                     WHERE id = $1`,
                    [targetRsvp.id]
                );

                // Reorder waitlist positions
                await client.query(
                    `UPDATE event_rsvp
                     SET waitlist_position = waitlist_position - 1
                     WHERE event_id = $1 AND status = 'waitlist' AND waitlist_position > $2`,
                    [id, promotedPosition]
                );

                return {
                    return_code: 'SUCCESS',
                    message: 'Attendee promoted from waitlist'
                };
            }
        });

        // =======================================================================
        // Return the result from transaction
        // =======================================================================
        return res.json(result);

    } catch (error) {
        console.error('Manage attendee error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
