/*
=======================================================================================================================================
API Route: get_venue_dashboard
=======================================================================================================================================
Method: GET
Purpose: Retrieves event details, guest list, and pre-orders for a venue using a magic link token.
         No authentication required - token validates access.
=======================================================================================================================================
Request Payload:
None (GET request with :token URL parameter)

Success Response:
{
    "return_code": "SUCCESS",
    "event": {
        "id": 1,
        "title": "Friday Dinner at Luigi's",
        "date_time": "2026-02-01T19:00:00Z",
        "location": "Luigi's Restaurant, 123 Main St",
        "description": "Monthly dinner meetup"
    },
    "group": {
        "name": "Downtown Foodies",
        "description": "A group of food enthusiasts..."
    },
    "organiser": {
        "name": "John Smith",
        "email": "john@example.com",
        "mobile": "0412 345 678"
    },
    "guests": [
        {
            "name": "Jane Doe",
            "food_order": "Margherita Pizza, Caesar Salad",
            "dietary_notes": "Vegetarian",
            "guest_count": 1,
            "rsvp_date": "2026-01-20T15:00:00Z"
        }
    ],
    "summary": {
        "total_attendees": 5,
        "with_preorders": 3,
        "with_dietary_notes": 1
    },
    "venue_notes": "Table 5 reserved, extra chairs needed"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"INVALID_TOKEN" - Token not found or malformed
"ACCESS_REVOKED" - Organiser revoked access
"EXPIRED_TOKEN" - Event was more than 24h ago
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');

router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // =======================================================================
        // Validate token exists
        // =======================================================================
        if (!token || token.length !== 64) {
            return res.json({
                return_code: 'INVALID_TOKEN',
                message: 'This venue link is invalid'
            });
        }

        // =======================================================================
        // Find the venue access token and join with event data
        // =======================================================================
        const tokenResult = await query(
            `SELECT
                vat.id AS token_id,
                vat.event_id,
                vat.created_at AS token_created_at,
                vat.revoked_at,
                vat.notes AS venue_notes,
                e.title,
                e.description,
                e.location,
                e.date_time,
                e.status,
                g.id AS group_id,
                g.name AS group_name,
                g.description AS group_description
             FROM venue_access_token vat
             JOIN event_list e ON vat.event_id = e.id
             JOIN group_list g ON e.group_id = g.id
             WHERE vat.token = $1`,
            [token]
        );

        // =======================================================================
        // Check if token exists
        // =======================================================================
        if (tokenResult.rows.length === 0) {
            return res.json({
                return_code: 'INVALID_TOKEN',
                message: 'This venue link is invalid or has expired'
            });
        }

        const tokenData = tokenResult.rows[0];

        // =======================================================================
        // Check if access was revoked
        // =======================================================================
        if (tokenData.revoked_at) {
            return res.json({
                return_code: 'ACCESS_REVOKED',
                message: 'Access to this event has been revoked by the organiser'
            });
        }

        // =======================================================================
        // Check if token has expired (24 hours after event date)
        // =======================================================================
        const eventDate = new Date(tokenData.date_time);
        const expiryDate = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now > expiryDate) {
            return res.json({
                return_code: 'EXPIRED_TOKEN',
                message: 'This venue link has expired (24 hours after the event)'
            });
        }

        // =======================================================================
        // Get the group organiser's contact details
        // =======================================================================
        const organiserResult = await query(
            `SELECT
                u.name,
                u.contact_email,
                u.contact_mobile
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.group_id = $1
               AND gm.role = 'organiser'
               AND gm.status = 'active'
             LIMIT 1`,
            [tokenData.group_id]
        );

        const organiser = organiserResult.rows[0] ? {
            name: organiserResult.rows[0].name,
            email: organiserResult.rows[0].contact_email || null,
            mobile: organiserResult.rows[0].contact_mobile || null
        } : null;

        // =======================================================================
        // Get all attending guests with their pre-orders
        // =======================================================================
        const guestsResult = await query(
            `SELECT
                u.name,
                r.food_order,
                r.dietary_notes,
                r.guest_count,
                r.created_at AS rsvp_date
             FROM event_rsvp r
             JOIN app_user u ON r.user_id = u.id
             WHERE r.event_id = $1
               AND r.status = 'attending'
             ORDER BY r.created_at ASC`,
            [tokenData.event_id]
        );

        const guests = guestsResult.rows.map(row => ({
            name: row.name,
            food_order: row.food_order || null,
            dietary_notes: row.dietary_notes || null,
            guest_count: row.guest_count || 0,
            rsvp_date: row.rsvp_date
        }));

        // =======================================================================
        // Calculate summary statistics
        // =======================================================================
        const totalAttendees = guests.reduce((sum, g) => sum + 1 + g.guest_count, 0);
        const withPreorders = guests.filter(g => g.food_order).length;
        const withDietaryNotes = guests.filter(g => g.dietary_notes).length;

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            event: {
                id: tokenData.event_id,
                title: tokenData.title,
                date_time: tokenData.date_time,
                location: tokenData.location,
                description: tokenData.description,
                status: tokenData.status
            },
            group: {
                name: tokenData.group_name,
                description: tokenData.group_description
            },
            organiser,
            guests,
            summary: {
                total_attendees: totalAttendees,
                with_preorders: withPreorders,
                with_dietary_notes: withDietaryNotes
            },
            venue_notes: tokenData.venue_notes || null
        });

    } catch (error) {
        console.error('Get venue dashboard error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
