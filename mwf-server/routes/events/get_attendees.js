/*
=======================================================================================================================================
API Route: get_attendees
=======================================================================================================================================
Method: GET
Purpose: Retrieves attendees and waitlist for an event.
         - Group members see full attendee list with profiles
         - Non-members only see counts (privacy protection)
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter)

Success Response (for members):
{
  "return_code": "SUCCESS",
  "is_member": true,
  "attending": [
    {
      "user_id": 5,
      "name": "John Smith",
      "avatar_url": "https://...",
      "rsvp_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "waitlist": [
    {
      "user_id": 8,
      "name": "Jane Doe",
      "avatar_url": null,
      "waitlist_position": 1,
      "rsvp_at": "2026-01-02T00:00:00.000Z"
    }
  ],
  "attending_count": 1,
  "waitlist_count": 1
}

Success Response (for non-members):
{
  "return_code": "SUCCESS",
  "is_member": false,
  "attending": [],
  "waitlist": [],
  "attending_count": 1,
  "waitlist_count": 1
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { optionalAuth } = require('../../middleware/auth');

router.get('/:id/attendees', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || null;

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
        // Check if event exists and get group_id
        // =======================================================================
        const eventResult = await query(
            'SELECT id, group_id FROM event_list WHERE id = $1',
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const groupId = eventResult.rows[0].group_id;

        // =======================================================================
        // Check if user is a member of the group
        // =======================================================================
        let isMember = false;

        if (userId) {
            const membershipResult = await query(
                `SELECT id FROM group_member
                 WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                [groupId, userId]
            );
            isMember = membershipResult.rows.length > 0;
        }

        // =======================================================================
        // Fetch all RSVPs with user info in single query
        // =======================================================================
        const rsvpResult = await query(
            `SELECT
                r.user_id,
                u.name,
                u.avatar_url,
                r.status,
                r.waitlist_position,
                r.created_at AS rsvp_at
             FROM event_rsvp r
             JOIN app_user u ON r.user_id = u.id
             WHERE r.event_id = $1
             ORDER BY
                CASE r.status WHEN 'attending' THEN 0 ELSE 1 END,
                r.waitlist_position ASC NULLS LAST,
                r.created_at ASC`,
            [id]
        );

        // =======================================================================
        // Split into attending and waitlist
        // =======================================================================
        const attending = [];
        const waitlist = [];

        for (const row of rsvpResult.rows) {
            const person = {
                user_id: row.user_id,
                name: row.name,
                avatar_url: row.avatar_url,
                rsvp_at: row.rsvp_at
            };

            if (row.status === 'attending') {
                attending.push(person);
            } else {
                waitlist.push({
                    ...person,
                    waitlist_position: row.waitlist_position
                });
            }
        }

        // =======================================================================
        // Return response based on membership
        // - Members get full list
        // - Non-members only get counts
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            is_member: isMember,
            attending: isMember ? attending : [],
            waitlist: isMember ? waitlist : [],
            attending_count: attending.length,
            waitlist_count: waitlist.length
        });

    } catch (error) {
        console.error('Get attendees error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
