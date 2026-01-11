/*
=======================================================================================================================================
API Route: regenerate_invite_code
=======================================================================================================================================
Method: POST
Purpose: Regenerates the invite code for an unlisted group. Only the group organiser can regenerate the code.
=======================================================================================================================================
Request Payload:
None (POST request with :id URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "invite_code": "A1B2C3D4"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

// Generate a random 8-character invite code
function generateInviteCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.post('/:id/regenerate-code', verifyToken, async (req, res) => {
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
                message: 'Only the group organiser can regenerate the invite code'
            });
        }

        // =======================================================================
        // Generate and save new invite code
        // =======================================================================
        const newInviteCode = generateInviteCode();

        await query(
            'UPDATE group_list SET invite_code = $1 WHERE id = $2',
            [newInviteCode, id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            invite_code: newInviteCode
        });

    } catch (error) {
        console.error('Regenerate invite code error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
