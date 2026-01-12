/*
=======================================================================================================================================
API Route: get_group
=======================================================================================================================================
Method: GET
Purpose: Retrieves a single group by ID with member count. Uses optional auth to include user's membership status.
         For unlisted groups, requires ?code=XXXXXXXX query param unless user is a member.
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter, optional ?code query param for unlisted groups)

Success Response:
{
  "return_code": "SUCCESS",
  "group": {
    "id": 1,
    "name": "Brookfield Socials",
    "description": "A food-focused social group",
    "image_url": "https://...",
    "image_position": "center",
    "join_policy": "approval",
    "visibility": "listed",
    "invite_code": "A1B2C3D4",       // Only included for organisers
    "member_count": 42,
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "membership": {                    // Only included if user is logged in
    "status": "active",              // "active", "pending", or null if not a member
    "role": "organiser"              // "organiser", "host", "member", or null
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"                          // Also returned for unlisted groups with missing/invalid code
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { optionalAuth } = require('../../middleware/auth');

router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { code } = req.query;
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
        // Fetch group with member count
        // =======================================================================
        const result = await query(
            `SELECT
                g.id,
                g.name,
                g.description,
                g.image_url,
                g.image_position,
                g.join_policy,
                g.visibility,
                g.invite_code,
                g.theme_color,
                g.icon,
                g.created_at,
                COUNT(gm.id) FILTER (WHERE gm.status = 'active') AS member_count
             FROM group_list g
             LEFT JOIN group_member gm ON g.id = gm.group_id
             WHERE g.id = $1
             GROUP BY g.id`,
            [id]
        );

        // =======================================================================
        // Check if group exists
        // =======================================================================
        if (result.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Transform result to ensure member_count is a number
        // =======================================================================
        const group = {
            ...result.rows[0],
            member_count: parseInt(result.rows[0].member_count, 10) || 0
        };

        // =======================================================================
        // Get user's membership status if logged in
        // =======================================================================
        let membership = null;

        if (userId) {
            const memberResult = await query(
                `SELECT status, role FROM group_member
                 WHERE group_id = $1 AND user_id = $2`,
                [id, userId]
            );

            if (memberResult.rows.length > 0) {
                membership = {
                    status: memberResult.rows[0].status,
                    role: memberResult.rows[0].role
                };

                // Update last_visited_at for active members
                if (memberResult.rows[0].status === 'active') {
                    await query(
                        'UPDATE group_member SET last_visited_at = NOW() WHERE group_id = $1 AND user_id = $2',
                        [id, userId]
                    );
                }
            }
        }

        // =======================================================================
        // Unlisted groups: accessible by direct URL but not shown in public listings
        // (Similar to YouTube unlisted - anyone with link can view)
        // =======================================================================

        // =======================================================================
        // Build response - only include invite_code for organisers
        // =======================================================================
        const isOrganiser = membership && membership.role === 'organiser';
        const responseGroup = { ...group };

        if (!isOrganiser) {
            delete responseGroup.invite_code;
        }

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            group: responseGroup,
            membership
        });

    } catch (error) {
        console.error('Get group error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
