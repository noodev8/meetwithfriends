/*
=======================================================================================================================================
API Route: list_events
=======================================================================================================================================
Method: GET
Purpose: Retrieves all upcoming published events with their attendee counts and group info. No authentication required.
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
      "created_by": 5,
      "title": "Mid Week Evening Meal",
      "description": "Join us for a relaxed evening meal",
      "location": "The Beacon Hotel, Copthorne",
      "date_time": "2026-01-15T18:30:00.000Z",
      "capacity": 20,
      "status": "published",
      "attendee_count": 12,
      "waitlist_count": 3,
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

router.get('/', async (req, res) => {
    try {
        // =======================================================================
        // Fetch all upcoming published events with attendee counts
        // =======================================================================
        // Only showing future events that are not cancelled
        // Including group name for display purposes
        // Counting attendees and waitlist separately
        const result = await query(
            `SELECT
                e.id,
                e.group_id,
                g.name AS group_name,
                e.created_by,
                e.title,
                e.description,
                e.location,
                e.date_time,
                e.capacity,
                e.status,
                e.created_at,
                COUNT(r.id) FILTER (WHERE r.status = 'attending') AS attendee_count,
                COUNT(r.id) FILTER (WHERE r.status = 'waitlist') AS waitlist_count
             FROM event e
             JOIN user_group g ON e.group_id = g.id
             LEFT JOIN event_rsvp r ON e.id = r.event_id
             WHERE e.status = 'published'
               AND e.date_time >= NOW()
             GROUP BY e.id, g.name
             ORDER BY e.date_time ASC`
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
        console.error('List events error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
