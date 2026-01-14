/*
=======================================================================================================================================
API Route: get_members
=======================================================================================================================================
Method: GET
Purpose: Retrieves members of a group with pagination and search support.
         Only group members can view the member list.
         Only organisers and hosts can see pending members.
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter)
Query params:
  - status: "active" | "pending" | "all" (default: "active", "pending" and "all" require organiser/host role)
  - search: string (optional, filters members by name, case-insensitive partial match)
  - limit: number (optional, default: 20, max: 100)
  - offset: number (optional, default: 0)

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
  ],
  "total_count": 150,                       // total matching members (for pagination)
  "has_more": true                          // whether more results exist
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"UNAUTHORIZED" - User must be logged in to view members
"FORBIDDEN" - User must be a member of the group to view members / Only organisers/hosts can view pending
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
        const { status, search } = req.query;
        const userId = req.user?.id || null;

        // =======================================================================
        // Parse pagination params with defaults and limits
        // =======================================================================
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

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
        // Only group members can view the member list
        // Non-members cannot see who is in the group (privacy protection)
        // =======================================================================
        if (!userId) {
            return res.json({
                return_code: 'UNAUTHORIZED',
                message: 'You must be logged in to view group members'
            });
        }

        if (!userRole) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You must be a member of this group to view the member list'
            });
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
        // Build query based on status filter and search
        // =======================================================================
        let queryParams = [id];
        let paramIndex = 2;

        // Build WHERE clause conditions
        let whereConditions = ['gm.group_id = $1'];

        // Add status filter
        if (statusFilter !== 'all') {
            whereConditions.push(`gm.status = $${paramIndex}`);
            queryParams.push(statusFilter);
            paramIndex++;
        }

        // Add search filter (case-insensitive partial match on name)
        if (search && search.trim()) {
            whereConditions.push(`u.name ILIKE $${paramIndex}`);
            queryParams.push(`%${search.trim()}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Build ORDER BY clause
        const orderByClause = statusFilter === 'all'
            ? `ORDER BY
                CASE gm.status WHEN 'pending' THEN 0 ELSE 1 END,
                CASE gm.role WHEN 'organiser' THEN 0 WHEN 'host' THEN 1 ELSE 2 END,
                u.name ASC`
            : `ORDER BY
                CASE gm.role WHEN 'organiser' THEN 0 WHEN 'host' THEN 1 ELSE 2 END,
                u.name ASC`;

        // =======================================================================
        // Get total count for pagination
        // =======================================================================
        const countQuery = `
            SELECT COUNT(*) as total
            FROM group_member gm
            JOIN app_user u ON gm.user_id = u.id
            WHERE ${whereClause}
        `;
        const countResult = await query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].total, 10);

        // =======================================================================
        // Get paginated members
        // =======================================================================
        const membersQuery = `
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
            WHERE ${whereClause}
            ${orderByClause}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        queryParams.push(limit, offset);

        const membersResult = await query(membersQuery, queryParams);

        // =======================================================================
        // Return success response with pagination info
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            members: membersResult.rows,
            total_count: totalCount,
            has_more: offset + membersResult.rows.length < totalCount
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
