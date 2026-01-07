/*
=======================================================================================================================================
API Route: update_event
=======================================================================================================================================
Method: POST
Purpose: Updates an existing event. Only the event creator or group organiser can edit.
=======================================================================================================================================
Request Payload:
{
  "title": "Updated Event Title",          // string, optional (1-200 chars)
  "description": "Updated description",    // string, optional
  "location": "New Location",              // string, optional
  "date_time": "2026-02-15T19:00:00Z",    // string (ISO 8601), optional, must be in future
  "capacity": 25                           // number, optional, null for unlimited
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 1,
    "title": "Updated Event Title",
    ...
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"INVALID_TITLE"
"INVALID_DATE"
"INVALID_CAPACITY"
"EVENT_CANCELLED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/update', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, location, date_time, capacity } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate event ID
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Fetch event with group info to check permissions
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.group_id,
                e.created_by,
                e.status,
                gm.role AS current_user_role
             FROM event_list e
             LEFT JOIN group_member gm ON e.group_id = gm.group_id
                AND gm.user_id = $2
                AND gm.status = 'active'
             WHERE e.id = $1`,
            [id, userId]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const event = eventResult.rows[0];

        // =======================================================================
        // Check permissions: must be organiser OR event creator
        // =======================================================================
        const isOrganiser = event.current_user_role === 'organiser';
        const isEventCreator = event.created_by === userId;

        if (!isOrganiser && !isEventCreator) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only the organiser or event creator can edit this event'
            });
        }

        // =======================================================================
        // Check event is not cancelled
        // =======================================================================
        if (event.status === 'cancelled') {
            return res.json({
                return_code: 'EVENT_CANCELLED',
                message: 'Cannot edit a cancelled event'
            });
        }

        // =======================================================================
        // Validate fields if provided
        // =======================================================================
        if (title !== undefined) {
            if (!title.trim() || title.trim().length > 200) {
                return res.json({
                    return_code: 'INVALID_TITLE',
                    message: 'Title must be between 1 and 200 characters'
                });
            }
        }

        if (date_time !== undefined) {
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
        }

        if (capacity !== undefined && capacity !== null) {
            if (!Number.isInteger(capacity) || capacity < 1) {
                return res.json({
                    return_code: 'INVALID_CAPACITY',
                    message: 'Capacity must be a positive integer or null'
                });
            }
        }

        // =======================================================================
        // Build update query dynamically
        // =======================================================================
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (title !== undefined) {
            updates.push(`title = $${paramCount++}`);
            values.push(title.trim());
        }

        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description.trim() || null);
        }

        if (location !== undefined) {
            updates.push(`location = $${paramCount++}`);
            values.push(location.trim() || null);
        }

        if (date_time !== undefined) {
            updates.push(`date_time = $${paramCount++}`);
            values.push(new Date(date_time).toISOString());
        }

        if (capacity !== undefined) {
            updates.push(`capacity = $${paramCount++}`);
            values.push(capacity);
        }

        // Always update updated_at
        updates.push(`updated_at = NOW()`);

        // If no fields to update
        if (updates.length === 1) {
            // Only updated_at, fetch and return current event
            const currentEvent = await query(
                'SELECT * FROM event_list WHERE id = $1',
                [id]
            );
            return res.json({
                return_code: 'SUCCESS',
                event: currentEvent.rows[0]
            });
        }

        // Add event ID as last parameter
        values.push(id);

        // =======================================================================
        // Execute update
        // =======================================================================
        const updateResult = await query(
            `UPDATE event_list
             SET ${updates.join(', ')}
             WHERE id = $${paramCount}
             RETURNING *`,
            values
        );

        return res.json({
            return_code: 'SUCCESS',
            event: updateResult.rows[0]
        });

    } catch (error) {
        console.error('Update event error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
