/*
=======================================================================================================================================
API Route: assign_role
=======================================================================================================================================
Method: POST
Purpose: Assigns a role to a group member. Only the group organiser can assign roles.
         Can promote member → host or demote host → member.
         Cannot change the organiser role (there must always be exactly one organiser).
=======================================================================================================================================
Request Payload:
{
  "membership_id": 123,                 // integer, required - the group_member record ID
  "role": "host"                        // string, required - 'host' or 'member'
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Role updated successfully",
  "member": {
    "id": 123,
    "user_id": 5,
    "name": "John Smith",
    "role": "host"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_ROLE"
"NOT_FOUND"
"FORBIDDEN"
"CANNOT_CHANGE_ORGANISER"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

// Valid roles that can be assigned (organiser cannot be assigned)
const ASSIGNABLE_ROLES = ['host', 'member'];

router.post('/:id/members/role', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { membership_id, role } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!membership_id || !role) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'membership_id and role are required'
            });
        }

        // =======================================================================
        // Validate role is assignable
        // =======================================================================
        if (!ASSIGNABLE_ROLES.includes(role)) {
            return res.json({
                return_code: 'INVALID_ROLE',
                message: 'Role must be either "host" or "member"'
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
                message: 'Only the group organiser can assign roles'
            });
        }

        // =======================================================================
        // Get the membership record to be updated
        // =======================================================================
        const membershipResult = await query(
            `SELECT gm.id, gm.user_id, gm.role, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.id = $1 AND gm.group_id = $2 AND gm.status = 'active'`,
            [membership_id, id]
        );

        if (membershipResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Member not found in this group'
            });
        }

        const member = membershipResult.rows[0];

        // =======================================================================
        // Prevent changing organiser role
        // =======================================================================
        if (member.role === 'organiser') {
            return res.json({
                return_code: 'CANNOT_CHANGE_ORGANISER',
                message: 'Cannot change the organiser role. Transfer ownership instead.'
            });
        }

        // =======================================================================
        // Update the member's role
        // =======================================================================
        await query(
            'UPDATE group_member SET role = $1 WHERE id = $2',
            [role, membership_id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: `${member.name} is now a ${role}`,
            member: {
                id: member.id,
                user_id: member.user_id,
                name: member.name,
                role: role
            }
        });

    } catch (error) {
        console.error('Assign role error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
