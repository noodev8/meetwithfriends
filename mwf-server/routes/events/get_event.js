/*
=======================================================================================================================================
API Route: get_event
=======================================================================================================================================
Method: GET
Purpose: Retrieves a single event by ID with attendee count and group info. No authentication required.
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
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

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

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
        // Fetch event with group info and attendee counts
        // =======================================================================
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
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             LEFT JOIN event_rsvp r ON e.id = r.event_id
             WHERE e.id = $1
             GROUP BY e.id, g.name`,
            [id]
        );

        // =======================================================================
        // Check if event exists
        // =======================================================================
        if (result.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Transform result to ensure counts are numbers
        // =======================================================================
        const event = {
            ...result.rows[0],
            attendee_count: parseInt(result.rows[0].attendee_count, 10) || 0,
            waitlist_count: parseInt(result.rows[0].waitlist_count, 10) || 0
        };

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            event
        });

    } catch (error) {
        console.error('Get event error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
