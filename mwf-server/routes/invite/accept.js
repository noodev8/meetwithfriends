/*
=======================================================================================================================================
API Route: accept_invite
=======================================================================================================================================
Method: POST
Purpose: Accepts a magic invite for a logged-in user. Joins the group and/or RSVPs to the event.
         - For group invites: joins the group (bypasses approval policy)
         - For event invites: joins the group (if not member) AND RSVPs to the event
         Magic links bypass approval policy - the organiser implicitly pre-approved invitees.
=======================================================================================================================================
Request: POST /api/invite/accept/:token
Authorization: Bearer {token} (required)

Request Payload: None

Success Response:
{
  "return_code": "SUCCESS",
  "actions": {
    "joined_group": true,         // false if already member
    "rsvp_status": "attending"    // "attending", "waitlist", or null (for group invites)
  },
  "redirect_to": "/events/123"    // or "/groups/456" for group invites
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"INVITE_NOT_FOUND"
"INVITE_EXPIRED"
"INVITE_LIMIT_REACHED"
"INVITE_DISABLED"
"EVENT_ENDED"
"EVENT_CANCELLED"
"PROFILE_IMAGE_REQUIRED" - Group requires profile image and user doesn't have one
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { withTransaction } = require('../../utils/transaction');
const { verifyToken } = require('../../middleware/auth');
const { notifyOrganisersOfNewMember } = require('../../services/email');

router.post('/:token', verifyToken, async (req, res) => {
    try {
        const { token } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate token format
        // =======================================================================
        if (!token || token.length !== 16 || !/^[a-f0-9]+$/i.test(token)) {
            return res.json({
                return_code: 'INVITE_NOT_FOUND',
                message: 'Invalid invitation link'
            });
        }

        // =======================================================================
        // Use transaction for atomic operations
        // =======================================================================
        const result = await withTransaction(async (client) => {
            // ===================================================================
            // Look up token in group_list first
            // ===================================================================
            const groupResult = await client.query(
                `SELECT
                    g.id, g.name, g.require_profile_image, g.all_members_host,
                    g.magic_link_token, g.magic_link_expires_at, g.magic_link_active,
                    g.magic_link_use_count, g.magic_link_max_uses
                 FROM group_list g
                 WHERE g.magic_link_token = $1
                 FOR UPDATE`,
                [token]
            );

            // ===================================================================
            // Process as GROUP invite
            // ===================================================================
            if (groupResult.rows.length > 0) {
                const group = groupResult.rows[0];

                // Validate link status
                const validation = validateMagicLink(group);
                if (!validation.valid) {
                    return validation;
                }

                // Check if user has profile image (if required)
                if (group.require_profile_image) {
                    const userResult = await client.query(
                        'SELECT avatar_url FROM app_user WHERE id = $1',
                        [userId]
                    );
                    const avatarUrl = userResult.rows[0]?.avatar_url;
                    if (!avatarUrl || avatarUrl.trim() === '') {
                        return {
                            return_code: 'PROFILE_IMAGE_REQUIRED',
                            message: 'This group requires members to have a profile image'
                        };
                    }
                }

                // Check if already a member
                const memberResult = await client.query(
                    'SELECT status FROM group_member WHERE group_id = $1 AND user_id = $2',
                    [group.id, userId]
                );

                const groupRole = group.all_members_host ? 'host' : 'member';

                let joinedGroup = false;
                if (memberResult.rows.length === 0) {
                    // Not a member - join with 'active' status (bypasses approval)
                    await client.query(
                        `INSERT INTO group_member (group_id, user_id, role, status)
                         VALUES ($1, $2, $3, 'active')`,
                        [group.id, userId, groupRole]
                    );
                    joinedGroup = true;
                } else if (memberResult.rows[0].status === 'pending') {
                    // Was pending - upgrade to active
                    await client.query(
                        `UPDATE group_member SET status = 'active', role = $3 WHERE group_id = $1 AND user_id = $2`,
                        [group.id, userId, groupRole]
                    );
                    joinedGroup = true;
                }
                // If already active, joinedGroup stays false

                // Increment use count
                await client.query(
                    'UPDATE group_list SET magic_link_use_count = magic_link_use_count + 1 WHERE id = $1',
                    [group.id]
                );

                return {
                    return_code: 'SUCCESS',
                    actions: {
                        joined_group: joinedGroup,
                        rsvp_status: null
                    },
                    redirect_to: `/groups/${group.id}`,
                    _groupId: joinedGroup ? group.id : null
                };
            }

            // ===================================================================
            // Look up token in event_list
            // ===================================================================
            const eventResult = await client.query(
                `SELECT
                    e.id, e.title, e.date_time, e.status, e.capacity, e.group_id,
                    e.magic_link_token, e.magic_link_expires_at, e.magic_link_active,
                    e.magic_link_use_count, e.magic_link_max_uses,
                    g.require_profile_image, g.all_members_host
                 FROM event_list e
                 JOIN group_list g ON e.group_id = g.id
                 WHERE e.magic_link_token = $1
                 FOR UPDATE OF e`,
                [token]
            );

            if (eventResult.rows.length === 0) {
                return {
                    return_code: 'INVITE_NOT_FOUND',
                    message: 'Invalid invitation link'
                };
            }

            // ===================================================================
            // Process as EVENT invite
            // ===================================================================
            const event = eventResult.rows[0];

            // Validate link status
            const validation = validateMagicLink(event);
            if (!validation.valid) {
                return validation;
            }

            // Check if event is cancelled
            if (event.status === 'cancelled') {
                return {
                    return_code: 'EVENT_CANCELLED',
                    message: 'This event has been cancelled',
                    group_id: event.group_id
                };
            }

            // Check if event has already happened
            if (new Date(event.date_time) < new Date()) {
                return {
                    return_code: 'EVENT_ENDED',
                    message: 'This event has already happened',
                    group_id: event.group_id
                };
            }

            // Check if user has profile image (if required)
            if (event.require_profile_image) {
                const userResult = await client.query(
                    'SELECT avatar_url FROM app_user WHERE id = $1',
                    [userId]
                );
                const avatarUrl = userResult.rows[0]?.avatar_url;
                if (!avatarUrl || avatarUrl.trim() === '') {
                    return {
                        return_code: 'PROFILE_IMAGE_REQUIRED',
                        message: 'This group requires members to have a profile image'
                    };
                }
            }

            // ===================================================================
            // Step 1: Join group if not already a member
            // ===================================================================
            const memberResult = await client.query(
                'SELECT status FROM group_member WHERE group_id = $1 AND user_id = $2',
                [event.group_id, userId]
            );

            const eventGroupRole = event.all_members_host ? 'host' : 'member';

            let joinedGroup = false;
            if (memberResult.rows.length === 0) {
                await client.query(
                    `INSERT INTO group_member (group_id, user_id, role, status)
                     VALUES ($1, $2, $3, 'active')`,
                    [event.group_id, userId, eventGroupRole]
                );
                joinedGroup = true;
            } else if (memberResult.rows[0].status === 'pending') {
                await client.query(
                    `UPDATE group_member SET status = 'active', role = $3 WHERE group_id = $1 AND user_id = $2`,
                    [event.group_id, userId, eventGroupRole]
                );
                joinedGroup = true;
            }

            // ===================================================================
            // Step 2: RSVP to event
            // ===================================================================
            // Check if already RSVPed
            const rsvpResult = await client.query(
                'SELECT status, waitlist_position FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
                [event.id, userId]
            );

            let rsvpStatus;
            if (rsvpResult.rows.length > 0) {
                const existingStatus = rsvpResult.rows[0].status;
                if (existingStatus === 'attending' || existingStatus === 'waitlist') {
                    // Already RSVPed - return current status
                    rsvpStatus = existingStatus;
                } else if (existingStatus === 'not_going') {
                    // Rejoin - delete old record and create new
                    await client.query(
                        'DELETE FROM event_rsvp WHERE event_id = $1 AND user_id = $2',
                        [event.id, userId]
                    );
                    rsvpStatus = await createRsvp(client, event, userId);
                }
            } else {
                // New RSVP
                rsvpStatus = await createRsvp(client, event, userId);
            }

            // Increment use count
            await client.query(
                'UPDATE event_list SET magic_link_use_count = magic_link_use_count + 1 WHERE id = $1',
                [event.id]
            );

            return {
                return_code: 'SUCCESS',
                actions: {
                    joined_group: joinedGroup,
                    rsvp_status: rsvpStatus
                },
                redirect_to: `/events/${event.id}`,
                _groupId: joinedGroup ? event.group_id : null
            };
        });

        // Notify organisers if a new member joined via magic link
        if (result._groupId) {
            notifyOrganisersOfNewMember(result._groupId, userId).catch(err => {
                console.error('Failed to notify organisers:', err);
            });
        }
        delete result._groupId;

        return res.json(result);

    } catch (error) {
        console.error('Accept invite error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// Helper: Validate magic link status (active, not expired, not at limit)
// =======================================================================
function validateMagicLink(record) {
    if (!record.magic_link_active) {
        return {
            valid: false,
            return_code: 'INVITE_DISABLED',
            message: 'This invitation link is no longer active'
        };
    }

    if (record.magic_link_expires_at && new Date(record.magic_link_expires_at) < new Date()) {
        return {
            valid: false,
            return_code: 'INVITE_EXPIRED',
            message: 'This invitation link has expired'
        };
    }

    if (record.magic_link_max_uses && record.magic_link_use_count >= record.magic_link_max_uses) {
        return {
            valid: false,
            return_code: 'INVITE_LIMIT_REACHED',
            message: 'This invitation link has reached its limit'
        };
    }

    return { valid: true };
}

// =======================================================================
// Helper: Create RSVP (attending or waitlist based on capacity)
// =======================================================================
async function createRsvp(client, event, userId) {
    // Get current attendance count
    const countResult = await client.query(
        `SELECT
            COUNT(*) AS attendee_count,
            COALESCE(SUM(guest_count), 0) AS total_guests
         FROM event_rsvp
         WHERE event_id = $1 AND status = 'attending'`,
        [event.id]
    );
    const attendeeCount = parseInt(countResult.rows[0].attendee_count, 10) || 0;
    const totalGuests = parseInt(countResult.rows[0].total_guests, 10) || 0;
    const totalSpotsTaken = attendeeCount + totalGuests;

    // Check if there's capacity (invites don't include guests)
    const hasCapacity = event.capacity === null || (totalSpotsTaken + 1) <= event.capacity;

    if (hasCapacity) {
        await client.query(
            `INSERT INTO event_rsvp (event_id, user_id, status, guest_count)
             VALUES ($1, $2, 'attending', 0)`,
            [event.id, userId]
        );
        return 'attending';
    } else {
        // Add to waitlist
        const maxPosResult = await client.query(
            `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_pos
             FROM event_rsvp
             WHERE event_id = $1 AND status = 'waitlist'`,
            [event.id]
        );
        const nextPosition = maxPosResult.rows[0].next_pos;

        await client.query(
            `INSERT INTO event_rsvp (event_id, user_id, status, waitlist_position, guest_count)
             VALUES ($1, $2, 'waitlist', $3, 0)`,
            [event.id, userId, nextPosition]
        );
        return 'waitlist';
    }
}

module.exports = router;
