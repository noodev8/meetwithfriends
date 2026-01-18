/*
=======================================================================================================================================
API Route: create_group
=======================================================================================================================================
Method: POST
Purpose: Creates a new group. The authenticated user becomes the organiser automatically.
=======================================================================================================================================
Request Payload:
{
  "name": "Brookfield Socials",           // string, required (max 100 chars)
  "description": "A food-focused group",  // string, optional
  "image_url": "https://...",             // string, optional (max 500 chars)
  "image_position": "center",             // string, optional (default: "center", options: "top", "center", "bottom")
  "join_policy": "approval",              // string, optional (default: "approval", options: "auto", "approval")
  "visibility": "listed"                  // string, optional (default: "listed", options: "listed", "unlisted")
}

Success Response:
{
  "return_code": "SUCCESS",
  "group": {
    "id": 1,
    "name": "Brookfield Socials",
    "description": "A food-focused group",
    "image_url": "https://...",
    "image_position": "center",
    "join_policy": "approval",
    "visibility": "listed",
    "invite_code": "A1B2C3D4",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_NAME"
"DUPLICATE_NAME"
"INVALID_JOIN_POLICY"
"INVALID_VISIBILITY"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { logAudit, AuditAction } = require('../../services/audit');

// Generate a random 8-character invite code
function generateInviteCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, description, image_url, image_position, join_policy, visibility, theme_color, icon } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!name || name.trim() === '') {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Group name is required'
            });
        }

        // =======================================================================
        // Validate name length
        // =======================================================================
        if (name.length > 100) {
            return res.json({
                return_code: 'INVALID_NAME',
                message: 'Group name must be 100 characters or less'
            });
        }

        // =======================================================================
        // Check for duplicate group name
        // =======================================================================
        const duplicateCheck = await query(
            'SELECT id FROM group_list WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.json({
                return_code: 'DUPLICATE_NAME',
                message: 'A group with this name already exists'
            });
        }

        // =======================================================================
        // Validate join_policy if provided
        // =======================================================================
        const validPolicies = ['auto', 'approval'];
        const finalJoinPolicy = join_policy || 'approval';

        if (!validPolicies.includes(finalJoinPolicy)) {
            return res.json({
                return_code: 'INVALID_JOIN_POLICY',
                message: 'Join policy must be either "auto" or "approval"'
            });
        }

        // =======================================================================
        // Validate visibility if provided
        // =======================================================================
        const validVisibilities = ['listed', 'unlisted'];
        const finalVisibility = visibility || 'listed';

        if (!validVisibilities.includes(finalVisibility)) {
            return res.json({
                return_code: 'INVALID_VISIBILITY',
                message: 'Visibility must be either "listed" or "unlisted"'
            });
        }

        // =======================================================================
        // Validate theme_color if provided
        // =======================================================================
        const validThemeColors = ['indigo', 'emerald', 'rose', 'amber', 'cyan', 'violet'];
        const finalThemeColor = theme_color || 'indigo';

        if (!validThemeColors.includes(finalThemeColor)) {
            return res.json({
                return_code: 'INVALID_THEME_COLOR',
                message: 'Invalid theme color'
            });
        }

        // =======================================================================
        // Create the group with invite code
        // =======================================================================
        const inviteCode = generateInviteCode();
        const groupResult = await query(
            `INSERT INTO group_list (name, description, image_url, image_position, join_policy, visibility, invite_code, theme_color, icon)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, name, description, image_url, image_position, join_policy, visibility, invite_code, theme_color, icon, created_at`,
            [name.trim(), description || null, image_url || null, image_position || 'center', finalJoinPolicy, finalVisibility, inviteCode, finalThemeColor, icon || null]
        );

        const group = groupResult.rows[0];

        // =======================================================================
        // Add the creator as an organiser (active status)
        // =======================================================================
        await query(
            `INSERT INTO group_member (group_id, user_id, role, status)
             VALUES ($1, $2, 'organiser', 'active')`,
            [group.id, userId]
        );

        // =======================================================================
        // Create audit log entry
        // =======================================================================
        const userResult = await query('SELECT name FROM app_user WHERE id = $1', [userId]);
        const userName = userResult.rows[0]?.name || null;

        await logAudit({
            action: AuditAction.GROUP_CREATED,
            userId,
            userName,
            groupId: group.id,
            details: group.name
        });

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            group
        });

    } catch (error) {
        console.error('Create group error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
