/*
=======================================================================================================================================
API Route: venue_access
=======================================================================================================================================
Methods: GET, POST, DELETE
Purpose: Allows event hosts/organisers to manage venue access tokens for their events.
         - GET: Check if venue access exists
         - POST: Generate a new venue access token
         - DELETE: Revoke venue access
=======================================================================================================================================
GET /api/events/:id/venue-access
Returns current venue access status for the event.

Success Response (has access):
{
    "return_code": "SUCCESS",
    "has_access": true,
    "venue_url": "https://meetwithfriends.com/venue/abc123...",
    "created_at": "2026-01-25T10:00:00Z"
}

Success Response (no access):
{
    "return_code": "SUCCESS",
    "has_access": false
}
=======================================================================================================================================
POST /api/events/:id/venue-access
Generates a new venue access token. Returns existing token if one already exists.

Success Response:
{
    "return_code": "SUCCESS",
    "venue_url": "https://meetwithfriends.com/venue/abc123...",
    "token": "abc123...",
    "created_at": "2026-01-27T10:00:00Z",
    "existing": false
}
=======================================================================================================================================
DELETE /api/events/:id/venue-access
Revokes venue access by setting revoked_at timestamp.

Success Response:
{
    "return_code": "SUCCESS",
    "message": "Venue access revoked"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORIZED" - Not logged in
"FORBIDDEN" - Not an organiser or host of this event
"NOT_FOUND" - Event not found
"NO_ACCESS_EXISTS" - Trying to revoke when no access exists
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

// =======================================================================
// Helper: Check if user can manage venue access (organiser or event host)
// =======================================================================
async function canManageVenueAccess(eventId, userId) {
    // Get event and check if user is organiser of the group or host of the event
    const result = await query(
        `SELECT
            e.id,
            e.group_id,
            gm.role AS group_role,
            eh.id AS host_id
         FROM event_list e
         LEFT JOIN group_member gm ON e.group_id = gm.group_id
            AND gm.user_id = $2
            AND gm.status = 'active'
         LEFT JOIN event_host eh ON e.id = eh.event_id
            AND eh.user_id = $2
         WHERE e.id = $1`,
        [eventId, userId]
    );

    if (result.rows.length === 0) {
        return { exists: false, canManage: false };
    }

    const row = result.rows[0];
    const isOrganiser = row.group_role === 'organiser';
    const isHost = row.host_id !== null;

    return {
        exists: true,
        canManage: isOrganiser || isHost
    };
}

// =======================================================================
// GET /api/events/:id/venue-access - Check venue access status
// =======================================================================
router.get('/:id/venue-access', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Validate event ID
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // Check permissions
        const { exists, canManage } = await canManageVenueAccess(id, userId);

        if (!exists) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        if (!canManage) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You do not have permission to manage venue access for this event'
            });
        }

        // Check for existing active token
        const tokenResult = await query(
            `SELECT token, created_at
             FROM venue_access_token
             WHERE event_id = $1 AND revoked_at IS NULL`,
            [id]
        );

        if (tokenResult.rows.length === 0) {
            return res.json({
                return_code: 'SUCCESS',
                has_access: false
            });
        }

        const token = tokenResult.rows[0];
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        return res.json({
            return_code: 'SUCCESS',
            has_access: true,
            venue_url: `${frontendUrl}/venue/${token.token}`,
            created_at: token.created_at
        });

    } catch (error) {
        console.error('Get venue access error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// POST /api/events/:id/venue-access - Generate venue access token
// =======================================================================
router.post('/:id/venue-access', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Validate event ID
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // Check permissions
        const { exists, canManage } = await canManageVenueAccess(id, userId);

        if (!exists) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        if (!canManage) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You do not have permission to manage venue access for this event'
            });
        }

        // Check for existing active token
        const existingResult = await query(
            `SELECT token, created_at
             FROM venue_access_token
             WHERE event_id = $1 AND revoked_at IS NULL`,
            [id]
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Return existing token if one exists
        if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0];
            return res.json({
                return_code: 'SUCCESS',
                venue_url: `${frontendUrl}/venue/${existing.token}`,
                token: existing.token,
                created_at: existing.created_at,
                existing: true
            });
        }

        // Generate new 64-character token
        const token = crypto.randomBytes(32).toString('hex');

        // Insert new token
        const insertResult = await query(
            `INSERT INTO venue_access_token (event_id, token, created_by)
             VALUES ($1, $2, $3)
             RETURNING created_at`,
            [id, token, userId]
        );

        return res.json({
            return_code: 'SUCCESS',
            venue_url: `${frontendUrl}/venue/${token}`,
            token: token,
            created_at: insertResult.rows[0].created_at,
            existing: false
        });

    } catch (error) {
        console.error('Generate venue access error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// DELETE /api/events/:id/venue-access - Revoke venue access
// =======================================================================
router.delete('/:id/venue-access', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Validate event ID
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // Check permissions
        const { exists, canManage } = await canManageVenueAccess(id, userId);

        if (!exists) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        if (!canManage) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You do not have permission to manage venue access for this event'
            });
        }

        // Revoke the token by setting revoked_at
        const result = await query(
            `UPDATE venue_access_token
             SET revoked_at = NOW()
             WHERE event_id = $1 AND revoked_at IS NULL
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.json({
                return_code: 'NO_ACCESS_EXISTS',
                message: 'No active venue access exists for this event'
            });
        }

        return res.json({
            return_code: 'SUCCESS',
            message: 'Venue access revoked'
        });

    } catch (error) {
        console.error('Revoke venue access error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
