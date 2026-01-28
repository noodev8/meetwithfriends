/*
=======================================================================================================================================
API Route: group_magic_link
=======================================================================================================================================
Method: POST (multiple endpoints)
Purpose: Manages magic invite links for groups. Allows organisers and hosts to create, regenerate, disable, and enable
         magic links that allow non-members to join the group directly.
=======================================================================================================================================

POST /api/groups/:id/magic-link
- Gets existing magic link or creates one if none exists
- Permission: Organiser or Host

POST /api/groups/:id/magic-link/regenerate
- Generates a new token, invalidates the old one, resets use count and expiry
- Permission: Organiser or Host

POST /api/groups/:id/magic-link/disable
- Disables the current magic link (sets is_active = false)
- Permission: Organiser or Host

POST /api/groups/:id/magic-link/enable
- Re-enables the magic link and resets expiry to 365 days from now
- Permission: Organiser or Host

=======================================================================================================================================
Success Response (get/create, regenerate):
{
  "return_code": "SUCCESS",
  "magic_link": {
    "token": "a1b2c3d4e5f6...",
    "url": "https://www.meetwithfriends.net/invite/g/a1b2c3d4e5f6...",
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
"NOT_FOUND" - Group does not exist
"FORBIDDEN" - User is not organiser or host
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
const MAGIC_LINK_EXPIRY_DAYS = 365;
const MAGIC_LINK_MAX_USES = 50;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.meetwithfriends.net';

// =======================================================================
// Helper: Generate a cryptographically secure 64-character hex token
// =======================================================================
function generateMagicToken() {
    return crypto.randomBytes(32).toString('hex');
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
// Helper: Check if user is organiser or host of the group
// Returns { allowed: boolean, role: string|null }
// =======================================================================
async function checkGroupPermission(groupId, userId) {
    const result = await query(
        `SELECT role FROM group_member
         WHERE group_id = $1 AND user_id = $2 AND status = 'active'
         AND role IN ('organiser', 'host')`,
        [groupId, userId]
    );

    if (result.rows.length === 0) {
        return { allowed: false, role: null };
    }

    return { allowed: true, role: result.rows[0].role };
}

// =======================================================================
// Helper: Format magic link response object
// =======================================================================
function formatMagicLinkResponse(group) {
    return {
        token: group.magic_link_token,
        url: `${FRONTEND_URL}/invite/g/${group.magic_link_token}`,
        expires_at: group.magic_link_expires_at,
        is_active: group.magic_link_active,
        use_count: group.magic_link_use_count,
        max_uses: group.magic_link_max_uses
    };
}

// =======================================================================
// POST /api/groups/:id/magic-link
// Get existing magic link or create a new one
// =======================================================================
router.post('/:id/magic-link', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate group ID is a number
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if group exists and get current magic link data
        // =======================================================================
        const groupResult = await query(
            `SELECT id, name, magic_link_token, magic_link_expires_at, magic_link_active,
                    magic_link_use_count, magic_link_max_uses, magic_link_inviter_name
             FROM group_list WHERE id = $1`,
            [id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if user has permission (organiser or host)
        // =======================================================================
        const permission = await checkGroupPermission(id, userId);
        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and hosts can manage invite links'
            });
        }

        const group = groupResult.rows[0];

        // =======================================================================
        // If magic link already exists and is active, return it
        // =======================================================================
        if (group.magic_link_token && group.magic_link_active) {
            return res.json({
                return_code: 'SUCCESS',
                magic_link: formatMagicLinkResponse(group)
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
            `UPDATE group_list SET
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
        console.error('Get/create group magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// POST /api/groups/:id/magic-link/regenerate
// Generate a new token, invalidate the old one
// =======================================================================
router.post('/:id/magic-link/regenerate', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate group ID
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if group exists
        // =======================================================================
        const groupResult = await query(
            'SELECT id FROM group_list WHERE id = $1',
            [id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if user has permission (organiser or host)
        // =======================================================================
        const permission = await checkGroupPermission(id, userId);
        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and hosts can regenerate invite links'
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
            `UPDATE group_list SET
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
        console.error('Regenerate group magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// POST /api/groups/:id/magic-link/disable
// Disable the current magic link
// =======================================================================
router.post('/:id/magic-link/disable', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate group ID
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if group exists and has a magic link
        // =======================================================================
        const groupResult = await query(
            'SELECT id, magic_link_token FROM group_list WHERE id = $1',
            [id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        if (!groupResult.rows[0].magic_link_token) {
            return res.json({
                return_code: 'NO_LINK_EXISTS',
                message: 'No magic link exists for this group'
            });
        }

        // =======================================================================
        // Check if user has permission (organiser or host)
        // =======================================================================
        const permission = await checkGroupPermission(id, userId);
        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and hosts can disable invite links'
            });
        }

        // =======================================================================
        // Disable the magic link
        // =======================================================================
        await query(
            'UPDATE group_list SET magic_link_active = false WHERE id = $1',
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
        console.error('Disable group magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// POST /api/groups/:id/magic-link/enable
// Re-enable the magic link and reset expiry to 365 days
// =======================================================================
router.post('/:id/magic-link/enable', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate group ID
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if group exists and has a magic link
        // =======================================================================
        const groupResult = await query(
            'SELECT id, magic_link_token FROM group_list WHERE id = $1',
            [id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        if (!groupResult.rows[0].magic_link_token) {
            return res.json({
                return_code: 'NO_LINK_EXISTS',
                message: 'No magic link exists for this group'
            });
        }

        // =======================================================================
        // Check if user has permission (organiser or host)
        // =======================================================================
        const permission = await checkGroupPermission(id, userId);
        if (!permission.allowed) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only group organisers and hosts can enable invite links'
            });
        }

        // =======================================================================
        // Enable the magic link and reset expiry to 365 days from now
        // =======================================================================
        const expiresAt = calculateExpiryDate();

        await query(
            `UPDATE group_list SET
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
        console.error('Enable group magic link error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
