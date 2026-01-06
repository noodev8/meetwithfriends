/*
=======================================================================================================================================
API Route: join_group
=======================================================================================================================================
Method: POST
Purpose: Request to join a group. Behavior depends on group's join_policy:
         - "auto": User is added immediately as active member
         - "approval": User is added as pending, awaiting approval
=======================================================================================================================================
Request Payload:
{
  "group_id": 1  // number, required
}

Success Response (auto-approved):
{
  "return_code": "SUCCESS",
  "status": "active",
  "message": "You have joined the group"
}

Success Response (pending approval):
{
  "return_code": "SUCCESS",
  "status": "pending",
  "message": "Your join request has been submitted"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_FOUND"
"ALREADY_MEMBER"
"ALREADY_PENDING"
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
        const { group_id } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!group_id) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Group ID is required'
            });
        }

        // =======================================================================
        // Check if group exists and get join_policy
        // =======================================================================
        const groupResult = await query(
            'SELECT id, join_policy FROM group_list WHERE id = $1',
            [group_id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        const group = groupResult.rows[0];

        // =======================================================================
        // Check if user is already a member or has pending request
        // =======================================================================
        const memberResult = await query(
            'SELECT status FROM group_member WHERE group_id = $1 AND user_id = $2',
            [group_id, userId]
        );

        if (memberResult.rows.length > 0) {
            const existingStatus = memberResult.rows[0].status;

            if (existingStatus === 'active') {
                return res.json({
                    return_code: 'ALREADY_MEMBER',
                    message: 'You are already a member of this group'
                });
            }

            if (existingStatus === 'pending') {
                return res.json({
                    return_code: 'ALREADY_PENDING',
                    message: 'You already have a pending join request'
                });
            }
        }

        // =======================================================================
        // Add user to group based on join_policy
        // =======================================================================
        const newStatus = group.join_policy === 'auto' ? 'active' : 'pending';

        await query(
            `INSERT INTO group_member (group_id, user_id, role, status)
             VALUES ($1, $2, 'member', $3)`,
            [group_id, userId, newStatus]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        const message = newStatus === 'active'
            ? 'You have joined the group'
            : 'Your join request has been submitted';

        return res.json({
            return_code: 'SUCCESS',
            status: newStatus,
            message
        });

    } catch (error) {
        console.error('Join group error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
