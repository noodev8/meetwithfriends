/*
=======================================================================================================================================
API Route: create_event
=======================================================================================================================================
Method: POST
Purpose: Creates a new event within a group. Only organisers and hosts can create events.
=======================================================================================================================================
Request Payload:
{
  "group_id": 1,                         // integer, required
  "title": "Evening Meal",               // string, required (max 200 chars)
  "description": "Join us...",           // string, optional (HTML allowed)
  "location": "The Beacon Hotel",        // string, optional
  "date_time": "2026-01-15T18:30:00Z",   // ISO datetime, required (must be in future)
  "capacity": 20,                        // integer, optional (null = unlimited)
  "image_url": "https://...",            // string, optional (Cloudinary URL)
  "image_position": "center",            // string, optional (top/center/bottom, default: center)
  "allow_guests": true,                  // boolean, optional (default: false)
  "max_guests_per_rsvp": 2,              // integer 1-5, optional (default: 1, only used if allow_guests is true)
  "preorders_enabled": true,              // boolean, optional (default: false)
  "menu_link": "https://...",            // string, optional (URL to menu)
  "preorder_cutoff": "2026-01-14T12:00:00Z"  // ISO datetime, optional (deadline for pre-orders, requires preorders_enabled)
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 1,
    "group_id": 1,
    "created_by": 5,
    "title": "Evening Meal",
    "description": "Join us...",
    "location": "The Beacon Hotel",
    "date_time": "2026-01-15T18:30:00.000Z",
    "capacity": 20,
    "image_url": "https://...",
    "image_position": "center",
    "allow_guests": true,
    "max_guests_per_rsvp": 2,
    "preorders_enabled": true,
    "menu_link": "https://...",
    "preorder_cutoff": "2026-01-14T12:00:00.000Z",
    "status": "published",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_DATE"
"INVALID_CUTOFF"
"NOT_FOUND"
"FORBIDDEN"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { withTransaction } = require('../../utils/transaction');
const { verifyToken } = require('../../middleware/auth');
const { sendNewEventEmail } = require('../../services/email');

router.post('/create', verifyToken, async (req, res) => {
    try {
        const { group_id, title, description, location, date_time, capacity, image_url, image_position, allow_guests, max_guests_per_rsvp, preorders_enabled, menu_link, preorder_cutoff } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!group_id || !title || !date_time) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'group_id, title, and date_time are required'
            });
        }

        // =======================================================================
        // Validate title length
        // =======================================================================
        if (title.length > 200) {
            return res.json({
                return_code: 'INVALID_TITLE',
                message: 'Title must be 200 characters or less'
            });
        }

        // =======================================================================
        // Validate date_time is in the future
        // =======================================================================
        const eventDate = new Date(date_time);
        if (isNaN(eventDate.getTime())) {
            return res.json({
                return_code: 'INVALID_DATE',
                message: 'Invalid date format'
            });
        }
        if (eventDate <= new Date()) {
            return res.json({
                return_code: 'INVALID_DATE',
                message: 'Event date must be in the future'
            });
        }

        // =======================================================================
        // Validate capacity if provided
        // =======================================================================
        if (capacity !== undefined && capacity !== null) {
            if (!Number.isInteger(capacity) || capacity < 1) {
                return res.json({
                    return_code: 'INVALID_CAPACITY',
                    message: 'Capacity must be a positive integer'
                });
            }
        }

        // =======================================================================
        // Validate preorder_cutoff if preorders are enabled
        // Must be a valid date and should be before the event date
        // =======================================================================
        let cutoffDate = null;
        if (preorders_enabled && preorder_cutoff) {
            cutoffDate = new Date(preorder_cutoff);
            if (isNaN(cutoffDate.getTime())) {
                return res.json({
                    return_code: 'INVALID_CUTOFF',
                    message: 'Invalid pre-order cutoff date format'
                });
            }
            if (cutoffDate >= eventDate) {
                return res.json({
                    return_code: 'INVALID_CUTOFF',
                    message: 'Pre-order cutoff must be before the event date'
                });
            }
        }

        // =======================================================================
        // Check if group exists and user has permission (organiser or host)
        // Single query to verify both group existence and user's role
        // =======================================================================
        const permissionResult = await query(
            `SELECT gm.role
             FROM group_list g
             JOIN group_member gm ON g.id = gm.group_id
             WHERE g.id = $1
               AND gm.user_id = $2
               AND gm.status = 'active'
               AND gm.role IN ('organiser', 'host')`,
            [group_id, userId]
        );

        if (permissionResult.rows.length === 0) {
            // Check if group exists to give appropriate error
            const groupExists = await query(
                'SELECT id FROM group_list WHERE id = $1',
                [group_id]
            );

            if (groupExists.rows.length === 0) {
                return res.json({
                    return_code: 'NOT_FOUND',
                    message: 'Group not found'
                });
            }

            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only organisers and hosts can create events'
            });
        }

        // =======================================================================
        // Create the event and add creator as first host (atomic transaction)
        // =======================================================================
        // Validate max_guests_per_rsvp if provided
        const finalMaxGuests = max_guests_per_rsvp ? Math.min(Math.max(parseInt(max_guests_per_rsvp, 10), 1), 5) : 1;

        const result = await withTransaction(async (client) => {
            // Create the event
            const eventResult = await client.query(
                `INSERT INTO event_list (group_id, created_by, title, description, location, date_time, capacity, image_url, image_position, allow_guests, max_guests_per_rsvp, preorders_enabled, menu_link, preorder_cutoff)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 RETURNING id, group_id, created_by, title, description, location, date_time, capacity, image_url, image_position, allow_guests, max_guests_per_rsvp, preorders_enabled, menu_link, preorder_cutoff, status, created_at`,
                [group_id, userId, title.trim(), description?.trim() || null, location?.trim() || null, eventDate, capacity || null, image_url?.trim() || null, image_position || 'center', allow_guests || false, finalMaxGuests, preorders_enabled || false, menu_link?.trim() || null, cutoffDate]
            );

            const newEvent = eventResult.rows[0];

            // Add creator as the first host
            await client.query(
                `INSERT INTO event_host (event_id, user_id, added_by)
                 VALUES ($1, $2, $2)`,
                [newEvent.id, userId]
            );

            // Auto-RSVP creator as attending
            await client.query(
                `INSERT INTO event_rsvp (event_id, user_id, status, guest_count)
                 VALUES ($1, $2, 'attending', 0)`,
                [newEvent.id, userId]
            );

            return newEvent;
        });

        // =======================================================================
        // Send email notification to all group members (except creator)
        // =======================================================================
        // Get group name
        const groupResult = await query('SELECT id, name FROM group_list WHERE id = $1', [group_id]);
        const group = groupResult.rows[0];

        // Get all active group members except the event creator
        const membersResult = await query(
            `SELECT u.email, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.group_id = $1
             AND gm.status = 'active'
             AND gm.user_id != $2`,
            [group_id, userId]
        );

        // Send emails to each member (async - don't wait)
        membersResult.rows.forEach(member => {
            sendNewEventEmail(member.email, member.name, result, group).catch(err => {
                console.error('Failed to send new event email:', err);
            });
        });

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            event: result
        });

    } catch (error) {
        console.error('Create event error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
