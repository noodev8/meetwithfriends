/*
=======================================================================================================================================
API Route: validate_invite
=======================================================================================================================================
Method: GET
Purpose: Validates a magic invite token and returns information about the group/event.
         Works for both logged-in and anonymous users. If logged in, includes user's membership status.
         Looks up token in both group_list and event_list tables.
=======================================================================================================================================
Request: GET /api/invite/validate/:token
Authorization: Bearer {token} (optional - changes response)

Success Response (Valid Token - Not Logged In):
{
  "return_code": "SUCCESS",
  "valid": true,
  "type": "event",  // or "group"
  "invite": {
    "inviter_name": "Andreas",
    "group": {
      "id": 456,
      "name": "Friday Night Foodies",
      "icon": "utensils",
      "member_count": 24,
      "require_profile_image": false,
      "description": "Monthly dinners..."
    },
    "event": {                           // null for group invites
      "id": 123,
      "title": "Dinner at The Corbet Arms",
      "date_time": "2025-02-15T19:00:00Z",
      "location": "The Corbet Arms, London",
      "description": "Monthly dinner...",
      "spots_remaining": 4,              // null if unlimited capacity
      "status": "active"
    }
  }
}

Success Response (Valid Token - Logged In):
{
  "return_code": "SUCCESS",
  "valid": true,
  "type": "event",
  "user_status": {
    "is_group_member": false,
    "is_event_rsvp": false,
    "has_profile_image": true
  },
  "invite": { ... }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"INVITE_NOT_FOUND" - Token doesn't exist
"INVITE_EXPIRED" - Past expiration date
"INVITE_LIMIT_REACHED" - Max uses exceeded
"INVITE_DISABLED" - Manually disabled
"EVENT_ENDED" - Event date has passed (event invites only)
"EVENT_CANCELLED" - Event was cancelled (event invites only)
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { optionalAuth } = require('../../middleware/auth');

router.get('/:token', optionalAuth, async (req, res) => {
    try {
        const { token } = req.params;
        const userId = req.user?.id || null;

        // =======================================================================
        // Validate token format (should be 16-char hex)
        // =======================================================================
        if (!token || token.length !== 16 || !/^[a-f0-9]+$/i.test(token)) {
            return res.json({
                return_code: 'INVITE_NOT_FOUND',
                valid: false,
                message: 'Invalid invitation link'
            });
        }

        // =======================================================================
        // Look up token in group_list first
        // =======================================================================
        const groupResult = await query(
            `SELECT
                g.id, g.name, g.icon, g.description, g.require_profile_image,
                g.magic_link_token, g.magic_link_expires_at, g.magic_link_active,
                g.magic_link_use_count, g.magic_link_max_uses, g.magic_link_inviter_name,
                COUNT(gm.id) FILTER (WHERE gm.status = 'active') AS member_count
             FROM group_list g
             LEFT JOIN group_member gm ON g.id = gm.group_id
             WHERE g.magic_link_token = $1
             GROUP BY g.id`,
            [token]
        );

        // =======================================================================
        // If found in group_list, process as group invite
        // =======================================================================
        if (groupResult.rows.length > 0) {
            const group = groupResult.rows[0];

            // Check if link is disabled
            if (!group.magic_link_active) {
                return res.json({
                    return_code: 'INVITE_DISABLED',
                    valid: false,
                    message: 'This invitation link is no longer active'
                });
            }

            // Check if link has expired
            if (group.magic_link_expires_at && new Date(group.magic_link_expires_at) < new Date()) {
                return res.json({
                    return_code: 'INVITE_EXPIRED',
                    valid: false,
                    message: 'This invitation link has expired'
                });
            }

            // Check if link has reached max uses
            if (group.magic_link_max_uses && group.magic_link_use_count >= group.magic_link_max_uses) {
                return res.json({
                    return_code: 'INVITE_LIMIT_REACHED',
                    valid: false,
                    message: 'This invitation link has reached its limit'
                });
            }

            // Build response
            const response = {
                return_code: 'SUCCESS',
                valid: true,
                type: 'group',
                invite: {
                    inviter_name: group.magic_link_inviter_name || 'Someone',
                    group: {
                        id: group.id,
                        name: group.name,
                        icon: group.icon,
                        member_count: parseInt(group.member_count, 10) || 0,
                        require_profile_image: group.require_profile_image,
                        description: group.description
                    },
                    event: null
                }
            };

            // If user is logged in, add their status
            if (userId) {
                const userStatusResult = await query(
                    `SELECT
                        EXISTS(SELECT 1 FROM group_member WHERE group_id = $1 AND user_id = $2 AND status = 'active') AS is_group_member,
                        u.avatar_url IS NOT NULL AND u.avatar_url != '' AS has_profile_image
                     FROM app_user u
                     WHERE u.id = $2`,
                    [group.id, userId]
                );

                if (userStatusResult.rows.length > 0) {
                    response.user_status = {
                        is_group_member: userStatusResult.rows[0].is_group_member,
                        is_event_rsvp: false,
                        has_profile_image: userStatusResult.rows[0].has_profile_image
                    };
                }
            }

            return res.json(response);
        }

        // =======================================================================
        // Look up token in event_list
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id, e.title, e.date_time, e.location, e.description, e.capacity, e.status,
                e.group_id, e.magic_link_token, e.magic_link_expires_at, e.magic_link_active,
                e.magic_link_use_count, e.magic_link_max_uses, e.magic_link_inviter_name,
                g.name AS group_name, g.icon AS group_icon, g.require_profile_image, g.description AS group_description,
                COUNT(gm.id) FILTER (WHERE gm.status = 'active') AS member_count,
                COUNT(er.id) FILTER (WHERE er.status = 'attending') AS attendee_count,
                COALESCE(SUM(er.guest_count) FILTER (WHERE er.status = 'attending'), 0) AS guest_count
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             LEFT JOIN group_member gm ON g.id = gm.group_id
             LEFT JOIN event_rsvp er ON e.id = er.event_id
             WHERE e.magic_link_token = $1
             GROUP BY e.id, g.id`,
            [token]
        );

        // =======================================================================
        // If not found anywhere, return not found
        // =======================================================================
        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'INVITE_NOT_FOUND',
                valid: false,
                message: 'Invalid invitation link'
            });
        }

        // =======================================================================
        // Process as event invite
        // =======================================================================
        const event = eventResult.rows[0];

        // Check if link is disabled
        if (!event.magic_link_active) {
            return res.json({
                return_code: 'INVITE_DISABLED',
                valid: false,
                message: 'This invitation link is no longer active'
            });
        }

        // Check if link has expired
        if (event.magic_link_expires_at && new Date(event.magic_link_expires_at) < new Date()) {
            return res.json({
                return_code: 'INVITE_EXPIRED',
                valid: false,
                message: 'This invitation link has expired'
            });
        }

        // Check if link has reached max uses
        if (event.magic_link_max_uses && event.magic_link_use_count >= event.magic_link_max_uses) {
            return res.json({
                return_code: 'INVITE_LIMIT_REACHED',
                valid: false,
                message: 'This invitation link has reached its limit'
            });
        }

        // Check if event is cancelled
        if (event.status === 'cancelled') {
            return res.json({
                return_code: 'EVENT_CANCELLED',
                valid: false,
                message: 'This event has been cancelled',
                group_id: event.group_id
            });
        }

        // Check if event has already happened
        if (new Date(event.date_time) < new Date()) {
            return res.json({
                return_code: 'EVENT_ENDED',
                valid: false,
                message: 'This event has already happened',
                group_id: event.group_id
            });
        }

        // Calculate spots remaining
        const attendeeCount = parseInt(event.attendee_count, 10) || 0;
        const guestCount = parseInt(event.guest_count, 10) || 0;
        const totalSpotsTaken = attendeeCount + guestCount;
        const spotsRemaining = event.capacity ? Math.max(0, event.capacity - totalSpotsTaken) : null;

        // Build response
        const response = {
            return_code: 'SUCCESS',
            valid: true,
            type: 'event',
            invite: {
                inviter_name: event.magic_link_inviter_name || 'Someone',
                group: {
                    id: event.group_id,
                    name: event.group_name,
                    icon: event.group_icon,
                    member_count: parseInt(event.member_count, 10) || 0,
                    require_profile_image: event.require_profile_image,
                    description: event.group_description
                },
                event: {
                    id: event.id,
                    title: event.title,
                    date_time: event.date_time,
                    location: event.location,
                    description: event.description,
                    spots_remaining: spotsRemaining,
                    status: event.status
                }
            }
        };

        // If user is logged in, add their status
        if (userId) {
            const userStatusResult = await query(
                `SELECT
                    EXISTS(SELECT 1 FROM group_member WHERE group_id = $1 AND user_id = $3 AND status = 'active') AS is_group_member,
                    EXISTS(SELECT 1 FROM event_rsvp WHERE event_id = $2 AND user_id = $3 AND status IN ('attending', 'waitlist')) AS is_event_rsvp,
                    u.avatar_url IS NOT NULL AND u.avatar_url != '' AS has_profile_image
                 FROM app_user u
                 WHERE u.id = $3`,
                [event.group_id, event.id, userId]
            );

            if (userStatusResult.rows.length > 0) {
                response.user_status = {
                    is_group_member: userStatusResult.rows[0].is_group_member,
                    is_event_rsvp: userStatusResult.rows[0].is_event_rsvp,
                    has_profile_image: userStatusResult.rows[0].has_profile_image
                };
            }
        }

        return res.json(response);

    } catch (error) {
        console.error('Validate invite error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
