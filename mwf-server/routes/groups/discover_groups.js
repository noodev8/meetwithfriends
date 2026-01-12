/*
=======================================================================================================================================
API Route: discover_groups
=======================================================================================================================================
Method: GET
Purpose: Retrieves listed groups that the authenticated user is NOT already a member of. Used for the "Discover Groups" dashboard section.
=======================================================================================================================================
Request Payload:
None (GET request)

Success Response:
{
  "return_code": "SUCCESS",
  "groups": [
    {
      "id": 1,
      "name": "Brookfield Socials",
      "description": "A food-focused social group",
      "image_url": "https://...",
      "join_policy": "approval",
      "member_count": 42,
      "upcoming_event_count": 3,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // =======================================================================
        // Fetch listed groups that the user is NOT a member of
        // Includes member count and upcoming event count
        // =======================================================================
        const result = await query(
            `SELECT
                g.id,
                g.name,
                g.description,
                g.image_url,
                g.image_position,
                g.join_policy,
                g.theme_color,
                g.icon,
                g.created_at,
                COUNT(DISTINCT gm.id) FILTER (WHERE gm.status = 'active') AS member_count,
                COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'published' AND e.date_time > NOW()) AS upcoming_event_count
             FROM group_list g
             LEFT JOIN group_member gm ON g.id = gm.group_id
             LEFT JOIN event_list e ON g.id = e.group_id
             WHERE g.visibility = 'listed'
               AND g.id NOT IN (
                   SELECT group_id FROM group_member WHERE user_id = $1
               )
             GROUP BY g.id
             ORDER BY g.created_at DESC`,
            [userId]
        );

        // =======================================================================
        // Transform results to ensure counts are numbers
        // =======================================================================
        const groups = result.rows.map(group => ({
            ...group,
            member_count: parseInt(group.member_count, 10) || 0,
            upcoming_event_count: parseInt(group.upcoming_event_count, 10) || 0
        }));

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            groups
        });

    } catch (error) {
        console.error('Discover groups error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
