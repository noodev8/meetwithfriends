/*
=======================================================================================================================================
API Route: remove_host
=======================================================================================================================================
Method: POST
Purpose: Removes a host from an event. Hosts can step down (remove themselves) or group organisers
         can remove any host. Cannot remove the last host - at least one host must remain.
=======================================================================================================================================
Request Payload:
{
  "user_id": 5                           // integer, required - the host to remove
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Host removed successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_FOUND"
"FORBIDDEN"
"NOT_HOST"
"LAST_HOST"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { withTransaction } = require('../../utils/transaction');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/hosts/remove', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const currentUserId = req.user.id;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!user_id) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'user_id is required'
            });
        }

        // =======================================================================
        // Validate event ID
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Use transaction for atomic check and delete
        // =======================================================================
        const result = await withTransaction(async (client) => {
            // ===================================================================
            // Fetch event with group info and check current user's permissions
            // ===================================================================
            const eventResult = await client.query(
                `SELECT
                    e.id,
                    e.group_id,
                    gm.role AS current_user_role,
                    EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $2) AS is_current_user_host
                 FROM event_list e
                 LEFT JOIN group_member gm ON e.group_id = gm.group_id
                    AND gm.user_id = $2
                    AND gm.status = 'active'
                 WHERE e.id = $1`,
                [id, currentUserId]
            );

            if (eventResult.rows.length === 0) {
                return {
                    return_code: 'NOT_FOUND',
                    message: 'Event not found'
                };
            }

            const event = eventResult.rows[0];

            // ===================================================================
            // Check if target user is actually a host
            // ===================================================================
            const targetHostResult = await client.query(
                'SELECT id FROM event_host WHERE event_id = $1 AND user_id = $2',
                [id, user_id]
            );

            if (targetHostResult.rows.length === 0) {
                return {
                    return_code: 'NOT_HOST',
                    message: 'User is not a host for this event'
                };
            }

            // ===================================================================
            // Check permissions:
            // - User can remove themselves (step down) if they are a host
            // - Group organisers can remove any host
            // - Other hosts cannot remove each other (only step down themselves)
            // ===================================================================
            const isOrganiser = event.current_user_role === 'organiser';
            const isRemovingSelf = parseInt(user_id, 10) === currentUserId;
            const isCurrentUserHost = event.is_current_user_host;

            if (!isOrganiser && !isRemovingSelf) {
                return {
                    return_code: 'FORBIDDEN',
                    message: 'Only group organisers can remove other hosts'
                };
            }

            // If stepping down, verify they are actually a host
            if (isRemovingSelf && !isCurrentUserHost) {
                return {
                    return_code: 'FORBIDDEN',
                    message: 'You are not a host for this event'
                };
            }

            // ===================================================================
            // Check if this is the last host - cannot remove
            // ===================================================================
            const hostCountResult = await client.query(
                'SELECT COUNT(*) AS count FROM event_host WHERE event_id = $1',
                [id]
            );

            if (parseInt(hostCountResult.rows[0].count, 10) <= 1) {
                return {
                    return_code: 'LAST_HOST',
                    message: 'Cannot remove the last host. Add another host first.'
                };
            }

            // ===================================================================
            // Remove the host
            // ===================================================================
            await client.query(
                'DELETE FROM event_host WHERE event_id = $1 AND user_id = $2',
                [id, user_id]
            );

            return {
                return_code: 'SUCCESS',
                message: isRemovingSelf ? 'You have stepped down as host' : 'Host removed successfully'
            };
        });

        return res.json(result);

    } catch (error) {
        console.error('Remove host error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
