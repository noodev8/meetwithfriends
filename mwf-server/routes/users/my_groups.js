/*
=======================================================================================================================================
API Route: my_groups
=======================================================================================================================================
Method: GET
Purpose: Retrieves all groups the authenticated user belongs to, with their role in each group.
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
      "visibility": "listed",
      "member_count": 42,
      "upcoming_event_count": 3,
      "role": "organiser",
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

router.get('/my-groups', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // =======================================================================
        // Fetch all groups the user is an active member of, with their role
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
                g.visibility,
                g.created_at,
                gm.role,
                COUNT(DISTINCT all_members.id) FILTER (WHERE all_members.status = 'active') AS member_count,
                COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'published' AND e.date_time > NOW()) AS upcoming_event_count
             FROM group_list g
             INNER JOIN group_member gm ON g.id = gm.group_id AND gm.user_id = $1 AND gm.status = 'active'
             LEFT JOIN group_member all_members ON g.id = all_members.group_id
             LEFT JOIN event_list e ON g.id = e.group_id
             GROUP BY g.id, gm.role
             ORDER BY g.name ASC`,
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
        console.error('My groups error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
