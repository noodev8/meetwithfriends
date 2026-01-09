/*
=======================================================================================================================================
API Route: list_events
=======================================================================================================================================
Method: GET
Purpose: Retrieves upcoming published events with their attendee counts and group info.
         If authenticated, also includes user's RSVP status for each event.
=======================================================================================================================================
Request Payload:
None (GET request)
Query params:
  - group_id: number (optional, filters events by group)

Success Response:
{
  "return_code": "SUCCESS",
  "events": [
    {
      "id": 1,
      "group_id": 1,
      "group_name": "Brookfield Socials",
      "created_by": 5,
      "title": "Mid Week Evening Meal",
      "description": "Join us for a relaxed evening meal",
      "location": "The Beacon Hotel, Copthorne",
      "date_time": "2026-01-15T18:30:00.000Z",
      "capacity": 20,
      "status": "published",
      "attendee_count": 12,
      "waitlist_count": 3,
      "rsvp_status": "attending",     // Only if authenticated: "attending", "waitlist", or null
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
const { optionalAuth } = require('../../middleware/auth');

router.get('/', optionalAuth, async (req, res) => {
    try {
        const { group_id } = req.query;
        const userId = req.user?.id || null;

        // =======================================================================
        // Build query with optional group filter and user RSVP status
        // =======================================================================
        const queryParams = [];
        let paramIndex = 1;

        let queryText = `
            SELECT
                e.id,
                e.group_id,
                g.name AS group_name,
                g.image_url AS group_image_url,
                e.created_by,
                e.title,
                e.description,
                e.location,
                e.date_time,
                e.capacity,
                e.image_url,
                e.image_position,
                e.allow_guests,
                e.max_guests_per_rsvp,
                e.status,
                e.created_at,
                COUNT(r.id) FILTER (WHERE r.status = 'attending') AS attendee_count,
                COALESCE(SUM(r.guest_count) FILTER (WHERE r.status = 'attending'), 0) AS total_guest_count,
                COUNT(r.id) FILTER (WHERE r.status = 'waitlist') AS waitlist_count`;

        // Include user's RSVP status if authenticated
        if (userId) {
            queryText += `,
                user_rsvp.status AS rsvp_status`;
        }

        queryText += `
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             LEFT JOIN event_rsvp r ON e.id = r.event_id`;

        // Join user's RSVP if authenticated
        if (userId) {
            queryParams.push(userId);
            queryText += `
             LEFT JOIN event_rsvp user_rsvp ON e.id = user_rsvp.event_id AND user_rsvp.user_id = $${paramIndex}`;
            paramIndex++;
        }

        queryText += `
             WHERE e.date_time >= NOW()`;

        // Add group filter if provided
        if (group_id && !isNaN(parseInt(group_id, 10))) {
            queryParams.push(parseInt(group_id, 10));
            queryText += ` AND e.group_id = $${paramIndex}`;
            paramIndex++;
        }

        queryText += `
             GROUP BY e.id, g.name, g.image_url`;

        if (userId) {
            queryText += `, user_rsvp.status`;
        }

        queryText += `
             ORDER BY e.date_time ASC`;

        const result = await query(queryText, queryParams);

        // =======================================================================
        // Transform results to ensure counts are numbers
        // =======================================================================
        const events = result.rows.map(event => ({
            ...event,
            attendee_count: parseInt(event.attendee_count, 10) || 0,
            total_guest_count: parseInt(event.total_guest_count, 10) || 0,
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
        console.error('List events error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
