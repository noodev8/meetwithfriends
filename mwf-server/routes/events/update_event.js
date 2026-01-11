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
  "description": "Updated description",    // string, optional (HTML allowed)
  "location": "New Location",              // string, optional
  "date_time": "2026-02-15T19:00:00Z",    // string (ISO 8601), optional, must be in future
  "capacity": 25,                          // number, optional, null for unlimited
  "image_url": "https://...",              // string, optional (Cloudinary URL)
  "image_position": "top",                 // string, optional (top/center/bottom)
  "allow_guests": true,                    // boolean, optional
  "max_guests_per_rsvp": 2,                // integer 1-5, optional
  "preorders_enabled": true,               // boolean, optional
  "menu_link": "https://...",              // string, optional (URL to menu)
  "preorder_cutoff": "2026-02-14T12:00:00Z"  // ISO datetime, optional (deadline for pre-orders)
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
"INVALID_CUTOFF"
"EVENT_CANCELLED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { sendPromotedFromWaitlistEmail } = require('../../services/email');

router.post('/:id/update', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, location, date_time, capacity, image_url, image_position, allow_guests, max_guests_per_rsvp, preorders_enabled, menu_link, preorder_cutoff } = req.body;
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
        // Fetch event with group info and host status to check permissions
        // Also get date_time for preorder_cutoff validation
        // =======================================================================
        const eventResult = await query(
            `SELECT
                e.id,
                e.group_id,
                e.status,
                e.date_time,
                gm.role AS current_user_role,
                EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_host
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
        // Check permissions: must be organiser OR event host
        // =======================================================================
        const isOrganiser = event.current_user_role === 'organiser';
        const isEventHost = event.is_host;

        if (!isOrganiser && !isEventHost) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only hosts or group organisers can edit this event'
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
        // Validate preorder_cutoff if provided
        // Must be a valid date and before the event date
        // =======================================================================
        if (preorder_cutoff !== undefined && preorder_cutoff !== null) {
            const cutoffDate = new Date(preorder_cutoff);
            if (isNaN(cutoffDate.getTime())) {
                return res.json({
                    return_code: 'INVALID_CUTOFF',
                    message: 'Invalid pre-order cutoff date format'
                });
            }
            // Use new date_time if provided, otherwise use existing event date
            const eventDateToCompare = date_time ? new Date(date_time) : new Date(event.date_time);
            if (cutoffDate >= eventDateToCompare) {
                return res.json({
                    return_code: 'INVALID_CUTOFF',
                    message: 'Pre-order cutoff must be before the event date'
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

        if (image_url !== undefined) {
            updates.push(`image_url = $${paramCount++}`);
            values.push(image_url?.trim() || null);
        }

        if (image_position !== undefined) {
            updates.push(`image_position = $${paramCount++}`);
            values.push(image_position || 'center');
        }

        if (allow_guests !== undefined) {
            updates.push(`allow_guests = $${paramCount++}`);
            values.push(Boolean(allow_guests));
        }

        if (max_guests_per_rsvp !== undefined) {
            updates.push(`max_guests_per_rsvp = $${paramCount++}`);
            // Clamp to 1-5 range
            values.push(Math.min(Math.max(parseInt(max_guests_per_rsvp, 10) || 1, 1), 5));
        }

        if (preorders_enabled !== undefined) {
            updates.push(`preorders_enabled = $${paramCount++}`);
            values.push(Boolean(preorders_enabled));
        }

        if (menu_link !== undefined) {
            updates.push(`menu_link = $${paramCount++}`);
            values.push(menu_link?.trim() || null);
        }

        if (preorder_cutoff !== undefined) {
            updates.push(`preorder_cutoff = $${paramCount++}`);
            values.push(preorder_cutoff ? new Date(preorder_cutoff).toISOString() : null);
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

        const updatedEvent = updateResult.rows[0];

        // =======================================================================
        // Promote waitlisted people if capacity increased
        // =======================================================================
        if (capacity !== undefined) {
            const newCapacity = updatedEvent.capacity;

            // Only process if there's a capacity (not unlimited)
            if (newCapacity !== null) {
                // Get current attendee count including guests
                const attendeeCountResult = await query(
                    `SELECT COALESCE(SUM(1 + guest_count), 0) AS total_spots_used
                     FROM event_rsvp
                     WHERE event_id = $1 AND status = 'attending'`,
                    [id]
                );
                let spotsUsed = parseInt(attendeeCountResult.rows[0].total_spots_used, 10);

                // Get waitlisted people in order
                const waitlistResult = await query(
                    `SELECT er.id, er.user_id, er.guest_count, u.name, u.email
                     FROM event_rsvp er
                     JOIN app_user u ON er.user_id = u.id
                     WHERE er.event_id = $1 AND er.status = 'waitlist'
                     ORDER BY er.waitlist_position ASC`,
                    [id]
                );

                const promotedUsers = [];

                // Promote people while there's room
                for (const waitlistPerson of waitlistResult.rows) {
                    const spotsNeeded = 1 + (waitlistPerson.guest_count || 0);

                    if (spotsUsed + spotsNeeded <= newCapacity) {
                        // Promote this person
                        await query(
                            `UPDATE event_rsvp
                             SET status = 'attending', waitlist_position = NULL
                             WHERE id = $1`,
                            [waitlistPerson.id]
                        );

                        spotsUsed += spotsNeeded;
                        promotedUsers.push({
                            email: waitlistPerson.email,
                            name: waitlistPerson.name
                        });
                    } else {
                        // No more room, stop promoting
                        break;
                    }
                }

                // Reorder remaining waitlist positions
                if (promotedUsers.length > 0) {
                    await query(
                        `UPDATE event_rsvp
                         SET waitlist_position = sub.new_position
                         FROM (
                             SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position) AS new_position
                             FROM event_rsvp
                             WHERE event_id = $1 AND status = 'waitlist'
                         ) sub
                         WHERE event_rsvp.id = sub.id`,
                        [id]
                    );

                    // Send promotion emails (async - don't wait)
                    promotedUsers.forEach(user => {
                        sendPromotedFromWaitlistEmail(user.email, user.name, updatedEvent).catch(err => {
                            console.error('Failed to send waitlist promotion email:', err);
                        });
                    });
                }
            }
        }

        return res.json({
            return_code: 'SUCCESS',
            event: updatedEvent
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
