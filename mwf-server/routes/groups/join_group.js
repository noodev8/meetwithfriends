/*
=======================================================================================================================================
API Route: join_group
=======================================================================================================================================
Method: POST
Purpose: Request to join a group. Behavior depends on group's join_policy:
         - "auto": User is added immediately as active member
         - "approval": User is added as pending, awaiting approval
         For unlisted groups, requires invite_code.
=======================================================================================================================================
Request Payload:
{
  "group_id": 1,         // number, required
  "invite_code": "ABC123" // string, required for unlisted groups
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
"NOT_FOUND"                  // Also returned for unlisted groups with missing/invalid code
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
const { sendNewJoinRequestEmail, sendNewMemberEmail } = require('../../services/email');

router.post('/', verifyToken, async (req, res) => {
    try {
        const { group_id, invite_code } = req.body;
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
        // Check if group exists and get join_policy, visibility, invite_code
        // =======================================================================
        const groupResult = await query(
            'SELECT id, name, join_policy, visibility, invite_code FROM group_list WHERE id = $1',
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
        // For unlisted groups, require valid invite code
        // =======================================================================
        if (group.visibility === 'unlisted') {
            if (!invite_code || invite_code.toUpperCase() !== group.invite_code) {
                return res.json({
                    return_code: 'NOT_FOUND',
                    message: 'Group not found'
                });
            }
        }

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
        // Send email to organisers
        // =======================================================================
        // Get user's name for email
        const userResult = await query('SELECT name FROM app_user WHERE id = $1', [userId]);
        const memberName = userResult.rows[0]?.name || 'A user';

        // Get organisers
        const organisersResult = await query(
            `SELECT u.email, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.group_id = $1
             AND gm.status = 'active'
             AND gm.role = 'organiser'`,
            [group_id]
        );

        if (newStatus === 'pending') {
            // Send join request email to each organiser
            organisersResult.rows.forEach(organiser => {
                sendNewJoinRequestEmail(organiser.email, organiser.name, memberName, group).catch(err => {
                    console.error('Failed to send join request email:', err);
                });
            });
        } else {
            // Auto-join: Send new member email to organisers
            // Get total member count
            const countResult = await query(
                `SELECT COUNT(*) as count FROM group_member WHERE group_id = $1 AND status = 'active'`,
                [group_id]
            );
            const totalMembers = parseInt(countResult.rows[0].count, 10);

            organisersResult.rows.forEach(organiser => {
                sendNewMemberEmail(organiser.email, organiser.name, memberName, group, totalMembers).catch(err => {
                    console.error('Failed to send new member email:', err);
                });
            });
        }

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
