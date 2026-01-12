/*
=======================================================================================================================================
API Route: my_events
=======================================================================================================================================
Method: GET
Purpose: Retrieves upcoming events from groups the authenticated user is a member of.
=======================================================================================================================================
Request Payload:
None (GET request)

Success Response:
{
  "return_code": "SUCCESS",
  "events": [
    {
      "id": 1,
      "group_id": 1,
      "group_name": "Brookfield Socials",
      "title": "Friday Dinner",
      "description": "Monthly dinner meetup",
      "location": "The Local Pub",
      "date_time": "2026-01-15T19:00:00.000Z",
      "capacity": 20,
      "status": "published",
      "attendee_count": 12,
      "waitlist_count": 3,
      "rsvp_status": "attending",        // "attending", "waitlist", or null
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.get('/my-events', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // =======================================================================
        // Fetch upcoming events from groups the user is an active member of
        // Includes user's RSVP status if they have one
        // =======================================================================
        const result = await query(
            `SELECT
                e.id,
                e.group_id,
                g.name AS group_name,
                g.image_url AS group_image_url,
                e.title,
                e.description,
                e.location,
                e.date_time,
                e.capacity,
                e.category,
                e.image_url,
                e.image_position,
                e.status,
                e.created_at,
                COUNT(r.id) FILTER (WHERE r.status = 'attending') AS attendee_count,
                COUNT(r.id) FILTER (WHERE r.status = 'waitlist') AS waitlist_count,
                user_rsvp.status AS rsvp_status
             FROM event_list e
             INNER JOIN group_list g ON e.group_id = g.id
             INNER JOIN group_member gm ON g.id = gm.group_id AND gm.user_id = $1 AND gm.status = 'active'
             LEFT JOIN event_rsvp r ON e.id = r.event_id
             LEFT JOIN event_rsvp user_rsvp ON e.id = user_rsvp.event_id AND user_rsvp.user_id = $1
             WHERE e.status = 'published'
               AND e.date_time > NOW()
             GROUP BY e.id, g.name, g.image_url, user_rsvp.status
             ORDER BY e.date_time ASC`,
            [userId]
        );

        // =======================================================================
        // Transform results to ensure counts are numbers
        // =======================================================================
        const events = result.rows.map(event => ({
            ...event,
            attendee_count: parseInt(event.attendee_count, 10) || 0,
            waitlist_count: parseInt(event.waitlist_count, 10) || 0
        }));

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            events
        });

    } catch (error) {
        console.error('My events error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
