/*
=======================================================================================================================================
API Route: approve_member
=======================================================================================================================================
Method: POST
Purpose: Approves a pending member request. Only organisers and hosts can approve members.
=======================================================================================================================================
Request Payload:
{
  "membership_id": 1  // number, required - the group_member record id
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Member approved successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_FOUND"
"ALREADY_ACTIVE"
"FORBIDDEN"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/members/approve', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { membership_id } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!membership_id) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Membership ID is required'
            });
        }

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
        // Check if group exists
        // =======================================================================
        const groupResult = await query(
            'SELECT id FROM user_group WHERE id = $1',
            [id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if the current user is an organiser or host of this group
        // =======================================================================
        const userRoleResult = await query(
            `SELECT role FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
            [id, userId]
        );

        if (userRoleResult.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You are not a member of this group'
            });
        }

        const userRole = userRoleResult.rows[0].role;
        if (userRole !== 'organiser' && userRole !== 'host') {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only organisers and hosts can approve members'
            });
        }

        // =======================================================================
        // Check if the membership exists and belongs to this group
        // =======================================================================
        const membershipResult = await query(
            'SELECT id, status FROM group_member WHERE id = $1 AND group_id = $2',
            [membership_id, id]
        );

        if (membershipResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Membership request not found'
            });
        }

        // =======================================================================
        // Check if the member is actually pending
        // =======================================================================
        if (membershipResult.rows[0].status === 'active') {
            return res.json({
                return_code: 'ALREADY_ACTIVE',
                message: 'This member is already active'
            });
        }

        // =======================================================================
        // Approve the member by updating status to active
        // =======================================================================
        await query(
            `UPDATE group_member SET status = 'active', joined_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [membership_id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: 'Member approved successfully'
        });

    } catch (error) {
        console.error('Approve member error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
