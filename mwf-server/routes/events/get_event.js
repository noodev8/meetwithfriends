/*
=======================================================================================================================================
API Route: get_event
=======================================================================================================================================
Method: GET
Purpose: Retrieves a single event by ID with attendee count, group info, and user's RSVP status if logged in.
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
    "creator_name": "John Smith",
    "title": "Mid Week Evening Meal",
    "description": "Join us for a relaxed evening meal",
    "location": "The Beacon Hotel, Copthorne",
    "date_time": "2026-01-15T18:30:00.000Z",
    "capacity": 20,
    "status": "published",
    "attendee_count": 12,
    "waitlist_count": 3,
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "rsvp": {                              // null if not logged in or no RSVP
    "status": "attending",               // "attending" or "waitlist"
    "waitlist_position": null            // position if on waitlist
  },
  "is_group_member": true,               // false if not logged in or not a member
  "can_manage_attendees": true           // true if organiser or event creator
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

router.get('/:id', optionalAuth, async (req, res) => {
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
        // Fetch event with group info, creator name, and attendee counts
        // Single query with JOINs to avoid multiple database hits
        // =======================================================================
        const result = await query(
            `SELECT
                e.id,
                e.group_id,
                g.name AS group_name,
                e.created_by,
                u.name AS creator_name,
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
             JOIN app_user u ON e.created_by = u.id
             LEFT JOIN event_rsvp r ON e.id = r.event_id
             WHERE e.id = $1
             GROUP BY e.id, g.name, u.name`,
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
        // Fetch user's RSVP status, group membership, and management permission if logged in
        // =======================================================================
        let rsvp = null;
        let isGroupMember = false;
        let canManageAttendees = false;

        if (userId) {
            // Check RSVP and membership in parallel
            const [rsvpResult, membershipResult] = await Promise.all([
                query(
                    `SELECT status, waitlist_position
                     FROM event_rsvp
                     WHERE event_id = $1 AND user_id = $2`,
                    [id, userId]
                ),
                query(
                    `SELECT role FROM group_member
                     WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                    [event.group_id, userId]
                )
            ]);

            if (rsvpResult.rows.length > 0) {
                rsvp = {
                    status: rsvpResult.rows[0].status,
                    waitlist_position: rsvpResult.rows[0].waitlist_position
                };
            }

            isGroupMember = membershipResult.rows.length > 0;

            // Can manage if organiser or event creator
            const isOrganiser = membershipResult.rows[0]?.role === 'organiser';
            const isEventCreator = event.created_by === userId;
            canManageAttendees = isOrganiser || isEventCreator;
        }

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            event,
            rsvp,
            is_group_member: isGroupMember,
            can_manage_attendees: canManageAttendees
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
