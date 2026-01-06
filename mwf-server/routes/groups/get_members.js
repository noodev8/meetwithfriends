/*
=======================================================================================================================================
API Route: get_members
=======================================================================================================================================
Method: GET
Purpose: Retrieves members of a group. Only organisers and hosts can see pending members.
         Regular members and non-members only see active members.
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter)
Query params:
  - status: "active" | "pending" | "all" (default: "active", "pending" and "all" require organiser/host role)

Success Response:
{
  "return_code": "SUCCESS",
  "members": [
    {
      "id": 1,                              // membership id
      "user_id": 123,
      "name": "Pete",
      "avatar_url": "https://...",
      "role": "member",
      "status": "active",
      "joined_at": "2026-01-01T00:00:00.000Z"
    }
  ]
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
const { query } = require('../../database');
const { optionalAuth } = require('../../middleware/auth');

router.get('/:id/members', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
        const userId = req.user?.id || null;

        // =======================================================================
        // Validate ID is a number
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
        // Check user's role in the group (if logged in)
        // =======================================================================
        let userRole = null;
        if (userId) {
            const memberResult = await query(
                `SELECT role FROM group_member
                 WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                [id, userId]
            );
            if (memberResult.rows.length > 0) {
                userRole = memberResult.rows[0].role;
            }
        }

        // =======================================================================
        // Determine which members to fetch based on requested status and permissions
        // =======================================================================
        const isOrganiserOrHost = userRole === 'organiser' || userRole === 'host';
        let statusFilter = 'active'; // Default to active members only

        if (status === 'pending' || status === 'all') {
            // Only organisers and hosts can view pending members
            if (!isOrganiserOrHost) {
                return res.json({
                    return_code: 'FORBIDDEN',
                    message: 'Only organisers and hosts can view pending members'
                });
            }
            statusFilter = status;
        }

        // =======================================================================
        // Build query based on status filter
        // =======================================================================
        let membersQuery;
        let queryParams = [id];

        if (statusFilter === 'all') {
            membersQuery = `
                SELECT
                    gm.id,
                    gm.user_id,
                    u.name,
                    u.avatar_url,
                    gm.role,
                    gm.status,
                    gm.joined_at
                FROM group_member gm
                JOIN app_user u ON gm.user_id = u.id
                WHERE gm.group_id = $1
                ORDER BY
                    CASE gm.status WHEN 'pending' THEN 0 ELSE 1 END,
                    CASE gm.role WHEN 'organiser' THEN 0 WHEN 'host' THEN 1 ELSE 2 END,
                    gm.joined_at ASC
            `;
        } else {
            membersQuery = `
                SELECT
                    gm.id,
                    gm.user_id,
                    u.name,
                    u.avatar_url,
                    gm.role,
                    gm.status,
                    gm.joined_at
                FROM group_member gm
                JOIN app_user u ON gm.user_id = u.id
                WHERE gm.group_id = $1 AND gm.status = $2
                ORDER BY
                    CASE gm.role WHEN 'organiser' THEN 0 WHEN 'host' THEN 1 ELSE 2 END,
                    gm.joined_at ASC
            `;
            queryParams.push(statusFilter);
        }

        const membersResult = await query(membersQuery, queryParams);

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            members: membersResult.rows
        });

    } catch (error) {
        console.error('Get members error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
