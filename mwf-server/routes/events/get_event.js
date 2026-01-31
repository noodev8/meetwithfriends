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
    "image_url": "https://...",
    "image_position": "center",
    "allow_guests": true,
    "max_guests_per_rsvp": 2,
    "preorders_enabled": true,           // whether pre-orders are enabled
    "menu_link": "https://...",          // URL to menu (null if not set)
    "menu_images": ["https://..."],      // array of Cloudinary URLs for menu photos (null if not set)
    "preorder_cutoff": "2026-01-14T12:00:00.000Z",  // deadline for pre-orders (null if not set)
    "status": "published",
    "attendee_count": 12,
    "total_guest_count": 5,
    "waitlist_count": 3,
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "rsvp": {                              // null if not logged in or no RSVP
    "status": "attending",               // "attending" or "waitlist"
    "waitlist_position": null,           // position if on waitlist
    "guest_count": 2,                    // number of guests (0-5)
    "food_order": "Roast beef, medium",  // user's food order (null if not set)
    "dietary_notes": "Gluten free"       // dietary requirements (null if not set)
  },
  "is_group_member": true,               // false if not logged in or not a member
  "hosts": [                             // list of event hosts
    {
      "user_id": 5,
      "name": "John Smith",
      "avatar_url": "https://..."
    }
  ],
  "is_host": true,                       // true if current user is a host
  "can_manage_attendees": true,          // true if organiser or event host
  "can_edit": true                       // true if can manage AND event not cancelled
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
                e.category,
                e.image_url,
                e.image_position,
                e.allow_guests,
                e.max_guests_per_rsvp,
                e.preorders_enabled,
                e.menu_link,
                e.menu_images,
                e.preorder_cutoff,
                e.status,
                e.waitlist_enabled,
                e.created_at,
                COUNT(r.id) FILTER (WHERE r.status = 'attending') AS attendee_count,
                COALESCE(SUM(r.guest_count) FILTER (WHERE r.status = 'attending'), 0) AS total_guest_count,
                COUNT(r.id) FILTER (WHERE r.status = 'waitlist') AS waitlist_count
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             LEFT JOIN app_user u ON e.created_by = u.id
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
        // Transform result to ensure counts are numbers and handle deleted users
        // =======================================================================
        const event = {
            ...result.rows[0],
            creator_name: result.rows[0].creator_name || 'Deleted User',
            attendee_count: parseInt(result.rows[0].attendee_count, 10) || 0,
            total_guest_count: parseInt(result.rows[0].total_guest_count, 10) || 0,
            waitlist_count: parseInt(result.rows[0].waitlist_count, 10) || 0
        };

        // =======================================================================
        // Fetch hosts for this event
        // =======================================================================
        const hostsResult = await query(
            `SELECT
                eh.user_id,
                u.name,
                u.avatar_url
             FROM event_host eh
             JOIN app_user u ON eh.user_id = u.id
             WHERE eh.event_id = $1
             ORDER BY eh.created_at ASC`,
            [id]
        );
        const hosts = hostsResult.rows;

        // =======================================================================
        // Fetch user's RSVP status, group membership, and management permission if logged in
        // =======================================================================
        let rsvp = null;
        let isGroupMember = false;
        let isHost = false;
        let canManageAttendees = false;

        if (userId) {
            // Check RSVP, membership, and host status in parallel
            const [rsvpResult, membershipResult, hostResult] = await Promise.all([
                query(
                    `SELECT status, waitlist_position, guest_count, food_order, dietary_notes
                     FROM event_rsvp
                     WHERE event_id = $1 AND user_id = $2`,
                    [id, userId]
                ),
                query(
                    `SELECT role FROM group_member
                     WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                    [event.group_id, userId]
                ),
                query(
                    `SELECT id FROM event_host
                     WHERE event_id = $1 AND user_id = $2`,
                    [id, userId]
                )
            ]);

            if (rsvpResult.rows.length > 0) {
                rsvp = {
                    status: rsvpResult.rows[0].status,
                    waitlist_position: rsvpResult.rows[0].waitlist_position,
                    guest_count: rsvpResult.rows[0].guest_count || 0,
                    food_order: rsvpResult.rows[0].food_order || null,
                    dietary_notes: rsvpResult.rows[0].dietary_notes || null
                };
            }

            isGroupMember = membershipResult.rows.length > 0;
            isHost = hostResult.rows.length > 0;

            // Can manage/edit if organiser or event host
            const isOrganiser = membershipResult.rows[0]?.role === 'organiser';
            canManageAttendees = isOrganiser || isHost;

            // Update group last_visited_at for members (browsing shows interest)
            if (isGroupMember) {
                query(
                    'UPDATE group_member SET last_visited_at = NOW() WHERE group_id = $1 AND user_id = $2',
                    [event.group_id, userId]
                );
            }
        }

        // Can edit if can manage AND event not cancelled
        const canEdit = canManageAttendees && event.status !== 'cancelled';

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            event,
            rsvp,
            hosts,
            is_group_member: isGroupMember,
            is_host: isHost,
            can_manage_attendees: canManageAttendees,
            can_edit: canEdit
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
