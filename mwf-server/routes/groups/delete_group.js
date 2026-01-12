/*
=======================================================================================================================================
API Route: delete_group
=======================================================================================================================================
Method: POST
Purpose: Permanently deletes a group and all associated data. Only the group organiser can delete a group.
=======================================================================================================================================
Request Headers:
Authorization: Bearer <token>          // Required JWT token

Request Payload:
None (group ID from URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Group deleted successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN" - User is not the group organiser
"SERVER_ERROR"
=======================================================================================================================================
Notes:
- This action is irreversible
- Cascade deletes: all events, RSVPs, comments, and group memberships
- An audit log entry is created before deletion
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { withTransaction } = require('../../utils/transaction');

router.post('/:id/delete', verifyToken, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        // =======================================================================
        // Validate group ID
        // =======================================================================
        if (!groupId || isNaN(groupId)) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Fetch group and verify user is the organiser
        // =======================================================================
        const groupResult = await query(
            `SELECT g.id, g.name
             FROM group_list g
             INNER JOIN group_member gm ON g.id = gm.group_id
             WHERE g.id = $1 AND gm.user_id = $2 AND gm.role = 'organiser' AND gm.status = 'active'`,
            [groupId, userId]
        );

        if (groupResult.rows.length === 0) {
            // Check if group exists at all
            const exists = await query('SELECT id FROM group_list WHERE id = $1', [groupId]);
            if (exists.rows.length === 0) {
                return res.json({
                    return_code: 'NOT_FOUND',
                    message: 'Group not found'
                });
            }
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only the group organiser can delete a group'
            });
        }

        const group = groupResult.rows[0];

        // =======================================================================
        // Delete group and all associated data in a transaction
        // Order: comments -> RSVPs -> events -> members -> audit log -> group
        // =======================================================================
        await withTransaction(async (client) => {
            // Get all event IDs in this group for cascade deletion
            const eventsResult = await client.query(
                'SELECT id FROM event_list WHERE group_id = $1',
                [groupId]
            );
            const eventIds = eventsResult.rows.map(e => e.id);

            // Delete comments on group events
            if (eventIds.length > 0) {
                await client.query(
                    'DELETE FROM event_comment WHERE event_id = ANY($1)',
                    [eventIds]
                );

                // Delete RSVPs for group events
                await client.query(
                    'DELETE FROM event_rsvp WHERE event_id = ANY($1)',
                    [eventIds]
                );

                // Delete events
                await client.query(
                    'DELETE FROM event_list WHERE group_id = $1',
                    [groupId]
                );
            }

            // Delete group members
            await client.query(
                'DELETE FROM group_member WHERE group_id = $1',
                [groupId]
            );

            // Create audit log entry
            await client.query(
                'INSERT INTO audit_log (user_id, action) VALUES ($1, $2)',
                [userId, `Deleted group "${group.name}"`]
            );

            // Delete the group
            await client.query(
                'DELETE FROM group_list WHERE id = $1',
                [groupId]
            );
        });

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: 'Group deleted successfully'
        });

    } catch (error) {
        console.error('Delete group error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
