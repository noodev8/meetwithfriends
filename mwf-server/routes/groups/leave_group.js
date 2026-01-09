/*
=======================================================================================================================================
API Route: leave_group
=======================================================================================================================================
Method: POST
Purpose: Allows a member to voluntarily leave a group. Organisers cannot leave (must transfer ownership or delete group).
=======================================================================================================================================
Request Payload:
None required - uses group ID from URL params and user ID from auth token.

Success Response:
{
  "return_code": "SUCCESS",
  "message": "You have left the group"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"NOT_A_MEMBER"
"ORGANISER_CANNOT_LEAVE"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/leave', verifyToken, async (req, res) => {
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
        // Check if group exists
        // =======================================================================
        const groupResult = await query(
            'SELECT id, name FROM group_list WHERE id = $1',
            [id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        const group = groupResult.rows[0];

        // =======================================================================
        // Check if user is a member of this group
        // =======================================================================
        const membershipResult = await query(
            `SELECT id, role, status FROM group_member
             WHERE group_id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (membershipResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_A_MEMBER',
                message: 'You are not a member of this group'
            });
        }

        const membership = membershipResult.rows[0];

        // =======================================================================
        // Prevent organiser from leaving (must transfer ownership or delete group)
        // =======================================================================
        if (membership.role === 'organiser') {
            return res.json({
                return_code: 'ORGANISER_CANNOT_LEAVE',
                message: 'As the organiser, you cannot leave the group. Transfer ownership to another member or delete the group instead.'
            });
        }

        // =======================================================================
        // Delete the membership record
        // =======================================================================
        await query(
            'DELETE FROM group_member WHERE id = $1',
            [membership.id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: `You have left ${group.name}`
        });

    } catch (error) {
        console.error('Leave group error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
