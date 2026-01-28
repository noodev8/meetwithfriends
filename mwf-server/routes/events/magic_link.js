/*
=======================================================================================================================================
API Route: event_magic_link
=======================================================================================================================================
Method: POST (multiple endpoints)
Purpose: Manages magic invite links for events. Allows organisers and event hosts to create, regenerate, disable, and enable
         magic links that allow non-members to join the group and RSVP to the event directly.
=======================================================================================================================================

POST /api/events/:id/magic-link
- Gets existing magic link or creates one if none exists
- Permission: Group Organiser or Event Host

POST /api/events/:id/magic-link/regenerate
- Generates a new token, invalidates the old one, resets use count and expiry
- Permission: Group Organiser or Event Host

POST /api/events/:id/magic-link/disable
- Disables the current magic link (sets is_active = false)
- Permission: Group Organiser or Event Host

POST /api/events/:id/magic-link/enable
- Re-enables the magic link and resets expiry to 365 days from now
- Permission: Group Organiser or Event Host

=======================================================================================================================================
Success Response (get/create, regenerate):
{
  "return_code": "SUCCESS",
  "magic_link": {
    "token": "x7y8z9a0b1c2...",
    "url": "https://www.meetwithfriends.net/invite/e/x7y8z9a0b1c2...",
    "expires_at": "2027-01-28T00:00:00.000Z",
    "is_active": true,
    "use_count": 0,
    "max_uses": 50
  }
}

Success Response (disable/enable):
{
  "return_code": "SUCCESS",
  "is_active": true,
  "expires_at": "2027-01-28T00:00:00.000Z"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND" - Event does not exist
"FORBIDDEN" - User is not group organiser or event host
"NO_LINK_EXISTS" - Trying to disable/enable when no link exists
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

// =======================================================================
// Configuration
// =======================================================================
const MAGIC_LINK_EXPIRY_DAYS = 30;
const MAGIC_LINK_MAX_USES = 50;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.meetwithfriends.net';

// =======================================================================
// Helper: Generate a cryptographically secure 16-character hex token
// =======================================================================
function generateMagicToken() {
    return crypto.randomBytes(8).toString('hex');
}

// =======================================================================
// Helper: Calculate expiry date (365 days from now)
// =======================================================================
function calculateExpiryDate() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + MAGIC_LINK_EXPIRY_DAYS);
    return expiry;
}

// =======================================================================
// Helper: Check if user is group organiser or event host
// Returns { allowed: boolean, isOrganiser: boolean, isHost: boolean }
// =======================================================================
async function checkEventPermission(eventId, userId) {
    // First get the event and check group membership + host status in one query
    const result = await query(
        `SELECT
            e.id,
            e.group_id,
            gm.role AS group_role,
            EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_event_host
         FROM event_list e
         LEFT JOIN group_member gm ON e.group_id = gm.group_id
            AND gm.user_id = $2
            AND gm.status = 'active'
         WHERE e.id = $1`,
        [eventId, userId]
    );

    if (result.rows.length === 0) {
        return { exists: false, allowed: false, isOrganiser: false, isHost: false };
    }

    const row = result.rows[0];
    const isOrganiser = row.group_role === 'organiser';
    const isHost = row.is_event_host;

    return {
        exists: true,
        allowed: isOrganiser || isHost,
        isOrganiser,
        isHost,
        groupId: row.group_id
    };
}

// =======================================================================
// Helper: Format magic link response object
// =======================================================================
function formatMagicLinkResponse(event) {
    return {
        token: event.magic_link_token,
        url: `${FRONTEND_URL}/invite/e/${event.magic_link_token}`,
        expires_at: event.magic_link_expires_at,
        is_active: event.magic_link_active,
        use_count: event.magic_link_use_count,
        max_uses: event.magic_link_max_uses
    };
}

// =======================================================================
// POST /api/events/:id/magic-link
// Get existing magic link or create a new one
// =======================================================================
router.post('/:id/magic-link', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate event ID is a number
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Check if user has permission (group organiser or event host)
        // =======================================================================
        const permission = await checkEventPermission(id, userId);

        if (!permission.exists) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and event hosts can manage invite links'
            });
        }

        // =======================================================================
        // Get current magic link data
        // =======================================================================
        const eventResult = await query(
            `SELECT id, title, magic_link_token, magic_link_expires_at, magic_link_active,
                    magic_link_use_count, magic_link_max_uses, magic_link_inviter_name
             FROM event_list WHERE id = $1`,
            [id]
        );

        const event = eventResult.rows[0];

        // =======================================================================
        // If magic link already exists, return it (even if disabled)
        // =======================================================================
        if (event.magic_link_token) {
            return res.json({
                return_code: 'SUCCESS',
                magic_link: formatMagicLinkResponse(event)
            });
        }

        // =======================================================================
        // Get inviter's name to cache in the link
        // =======================================================================
        const userResult = await query(
            'SELECT name FROM app_user WHERE id = $1',
            [userId]
        );
        const inviterName = userResult.rows[0]?.name || 'Someone';

        // =======================================================================
        // Generate new magic link
        // =======================================================================
        const newToken = generateMagicToken();
        const expiresAt = calculateExpiryDate();

        const updateResult = await query(
            `UPDATE event_list SET
                magic_link_token = $1,
                magic_link_expires_at = $2,
                magic_link_active = true,
                magic_link_created_by = $3,
                magic_link_max_uses = $4,
                magic_link_use_count = 0,
                magic_link_inviter_name = $5
             WHERE id = $6
             RETURNING magic_link_token, magic_link_expires_at, magic_link_active,
                       magic_link_use_count, magic_link_max_uses`,
            [newToken, expiresAt, userId, MAGIC_LINK_MAX_USES, inviterName, id]
        );

        // =======================================================================
        // Return success response with the new magic link
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            magic_link: formatMagicLinkResponse(updateResult.rows[0])
        });

    } catch (error) {
        console.error('Get/create event magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// POST /api/events/:id/magic-link/regenerate
// Generate a new token, invalidate the old one
// =======================================================================
router.post('/:id/magic-link/regenerate', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
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
        // Check if user has permission (group organiser or event host)
        // =======================================================================
        const permission = await checkEventPermission(id, userId);

        if (!permission.exists) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and event hosts can regenerate invite links'
            });
        }

        // =======================================================================
        // Get inviter's name to cache in the link
        // =======================================================================
        const userResult = await query(
            'SELECT name FROM app_user WHERE id = $1',
            [userId]
        );
        const inviterName = userResult.rows[0]?.name || 'Someone';

        // =======================================================================
        // Generate new token and reset all counters
        // =======================================================================
        const newToken = generateMagicToken();
        const expiresAt = calculateExpiryDate();

        const updateResult = await query(
            `UPDATE event_list SET
                magic_link_token = $1,
                magic_link_expires_at = $2,
                magic_link_active = true,
                magic_link_created_by = $3,
                magic_link_max_uses = $4,
                magic_link_use_count = 0,
                magic_link_inviter_name = $5
             WHERE id = $6
             RETURNING magic_link_token, magic_link_expires_at, magic_link_active,
                       magic_link_use_count, magic_link_max_uses`,
            [newToken, expiresAt, userId, MAGIC_LINK_MAX_USES, inviterName, id]
        );

        // =======================================================================
        // Return success response with the new magic link
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            magic_link: formatMagicLinkResponse(updateResult.rows[0])
        });

    } catch (error) {
        console.error('Regenerate event magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// POST /api/events/:id/magic-link/disable
// Disable the current magic link
// =======================================================================
router.post('/:id/magic-link/disable', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
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
        // Check if user has permission (group organiser or event host)
        // =======================================================================
        const permission = await checkEventPermission(id, userId);

        if (!permission.exists) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and event hosts can disable invite links'
            });
        }

        // =======================================================================
        // Check if magic link exists
        // =======================================================================
        const eventResult = await query(
            'SELECT magic_link_token FROM event_list WHERE id = $1',
            [id]
        );

        if (!eventResult.rows[0].magic_link_token) {
            return res.json({
                return_code: 'NO_LINK_EXISTS',
                message: 'No magic link exists for this event'
            });
        }

        // =======================================================================
        // Disable the magic link
        // =======================================================================
        await query(
            'UPDATE event_list SET magic_link_active = false WHERE id = $1',
            [id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            is_active: false,
            expires_at: null
        });

    } catch (error) {
        console.error('Disable event magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// POST /api/events/:id/magic-link/enable
// Re-enable the magic link and reset expiry to 365 days
// =======================================================================
router.post('/:id/magic-link/enable', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
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
        // Check if user has permission (group organiser or event host)
        // =======================================================================
        const permission = await checkEventPermission(id, userId);

        if (!permission.exists) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and event hosts can enable invite links'
            });
        }

        // =======================================================================
        // Check if magic link exists
        // =======================================================================
        const eventResult = await query(
            'SELECT magic_link_token FROM event_list WHERE id = $1',
            [id]
        );

        if (!eventResult.rows[0].magic_link_token) {
            return res.json({
                return_code: 'NO_LINK_EXISTS',
                message: 'No magic link exists for this event'
            });
        }

        // =======================================================================
        // Enable the magic link and reset expiry to 365 days from now
        // =======================================================================
        const expiresAt = calculateExpiryDate();

        await query(
            `UPDATE event_list SET
                magic_link_active = true,
                magic_link_expires_at = $1
             WHERE id = $2`,
            [expiresAt, id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            is_active: true,
            expires_at: expiresAt
        });

    } catch (error) {
        console.error('Enable event magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
