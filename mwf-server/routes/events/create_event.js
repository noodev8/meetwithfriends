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
  "description": "Join us...",           // string, optional
  "location": "The Beacon Hotel",        // string, optional
  "date_time": "2026-01-15T18:30:00Z",   // ISO datetime, required (must be in future)
  "capacity": 20                         // integer, optional (null = unlimited)
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
    "status": "published",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_DATE"
"NOT_FOUND"
"FORBIDDEN"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/create', verifyToken, async (req, res) => {
    try {
        const { group_id, title, description, location, date_time, capacity } = req.body;
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
        // Create the event
        // =======================================================================
        const result = await query(
            `INSERT INTO event_list (group_id, created_by, title, description, location, date_time, capacity)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, group_id, created_by, title, description, location, date_time, capacity, status, created_at`,
            [group_id, userId, title.trim(), description?.trim() || null, location?.trim() || null, eventDate, capacity || null]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            event: result.rows[0]
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
