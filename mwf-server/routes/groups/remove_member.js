/*
=======================================================================================================================================
API Route: remove_member
=======================================================================================================================================
Method: POST
Purpose: Removes a member from a group. Only the group organiser can remove members.
         Organisers cannot remove themselves (must transfer ownership or delete group).
=======================================================================================================================================
Request Payload:
{
  "membership_id": 123                    // integer, required - the group_member record ID to remove
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Member removed from group"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_FOUND"
"FORBIDDEN"
"CANNOT_REMOVE_SELF"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/members/remove', verifyToken, async (req, res) => {
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
                message: 'membership_id is required'
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
        // Check if current user is the organiser of this group
        // =======================================================================
        const organiserCheck = await query(
            `SELECT id FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND role = 'organiser' AND status = 'active'`,
            [id, userId]
        );

        if (organiserCheck.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only the group organiser can remove members'
            });
        }

        // =======================================================================
        // Get the membership record to be removed
        // =======================================================================
        const membershipResult = await query(
            `SELECT gm.id, gm.user_id, gm.role, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.id = $1 AND gm.group_id = $2`,
            [membership_id, id]
        );

        if (membershipResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Member not found in this group'
            });
        }

        const memberToRemove = membershipResult.rows[0];

        // =======================================================================
        // Prevent organiser from removing themselves
        // =======================================================================
        if (memberToRemove.user_id === userId) {
            return res.json({
                return_code: 'CANNOT_REMOVE_SELF',
                message: 'You cannot remove yourself from the group. Transfer ownership or delete the group instead.'
            });
        }

        // =======================================================================
        // Delete the membership record
        // =======================================================================
        await query(
            'DELETE FROM group_member WHERE id = $1',
            [membership_id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: `${memberToRemove.name} has been removed from the group`
        });

    } catch (error) {
        console.error('Remove member error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
