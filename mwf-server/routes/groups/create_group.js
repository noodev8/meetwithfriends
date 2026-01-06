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
  "join_policy": "approval"               // string, optional (default: "approval", options: "auto", "approval")
}

Success Response:
{
  "return_code": "SUCCESS",
  "group": {
    "id": 1,
    "name": "Brookfield Socials",
    "description": "A food-focused group",
    "image_url": "https://...",
    "join_policy": "approval",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_NAME"
"INVALID_JOIN_POLICY"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, description, image_url, join_policy } = req.body;
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
        // Create the group
        // =======================================================================
        const groupResult = await query(
            `INSERT INTO group_list (name, description, image_url, join_policy)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, description, image_url, join_policy, created_at`,
            [name.trim(), description || null, image_url || null, finalJoinPolicy]
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
