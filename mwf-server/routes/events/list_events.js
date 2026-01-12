/*
=======================================================================================================================================
API Route: list_events
=======================================================================================================================================
Method: GET
Purpose: Retrieves events with their attendee counts and group info.
         By default returns upcoming events. Use past=true for past events.
         If authenticated, also includes user's RSVP status for each event.
=======================================================================================================================================
Request Payload:
None (GET request)
Query params:
  - group_id: number (optional, filters events by group)
  - past: boolean (optional, if true returns past events instead of upcoming)
  - limit: number (optional, for pagination, default unlimited for upcoming, 10 for past)
  - offset: number (optional, for pagination)

Success Response:
{
  "return_code": "SUCCESS",
  "events": [...],
  "has_more": true  // Only included when using limit/offset
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
        const { group_id, past, limit, offset } = req.query;
        const userId = req.user?.id || null;
        const isPast = past === 'true';
        const queryLimit = limit ? parseInt(limit, 10) : (isPast ? 10 : null);
        const queryOffset = offset ? parseInt(offset, 10) : 0;

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
                e.category,
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

        // Filter by past or upcoming
        if (isPast) {
            queryText += `
             WHERE e.date_time < NOW()`;
        } else {
            queryText += `
             WHERE e.date_time >= NOW()`;
        }

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

        // Order: upcoming ASC (soonest first), past DESC (most recent first)
        queryText += `
             ORDER BY e.date_time ${isPast ? 'DESC' : 'ASC'}`;

        // Add pagination if limit specified
        if (queryLimit) {
            queryParams.push(queryLimit + 1); // Fetch one extra to check if there's more
            queryText += ` LIMIT $${paramIndex}`;
            paramIndex++;

            if (queryOffset > 0) {
                queryParams.push(queryOffset);
                queryText += ` OFFSET $${paramIndex}`;
                paramIndex++;
            }
        }

        const result = await query(queryText, queryParams);

        // =======================================================================
        // Transform results to ensure counts are numbers
        // =======================================================================
        let events = result.rows.map(event => ({
            ...event,
            attendee_count: parseInt(event.attendee_count, 10) || 0,
            total_guest_count: parseInt(event.total_guest_count, 10) || 0,
            waitlist_count: parseInt(event.waitlist_count, 10) || 0
        }));

        // =======================================================================
        // Check if there are more results (for pagination)
        // =======================================================================
        let hasMore = false;
        if (queryLimit && events.length > queryLimit) {
            hasMore = true;
            events = events.slice(0, queryLimit); // Remove the extra item
        }

        // =======================================================================
        // Return success response
        // =======================================================================
        const response = {
            return_code: 'SUCCESS',
            events
        };

        if (queryLimit) {
            response.has_more = hasMore;
        }

        return res.json(response);

    } catch (error) {
        console.error('List events error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
