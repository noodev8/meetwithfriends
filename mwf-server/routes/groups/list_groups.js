/*
=======================================================================================================================================
API Route: list_groups
=======================================================================================================================================
Method: GET
Purpose: Retrieves all groups with their member counts. No authentication required - public listing.
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

router.get('/', async (req, res) => {
    try {
        // =======================================================================
        // Fetch all groups with member counts
        // =======================================================================
        // Using a LEFT JOIN to count active members for each group
        // Groups with no members will show member_count of 0
        const result = await query(
            `SELECT
                g.id,
                g.name,
                g.description,
                g.image_url,
                g.join_policy,
                g.created_at,
                COUNT(gm.id) FILTER (WHERE gm.status = 'active') AS member_count
             FROM group_list g
             LEFT JOIN group_member gm ON g.id = gm.group_id
             GROUP BY g.id
             ORDER BY g.created_at DESC`
        );

        // =======================================================================
        // Transform results to ensure member_count is a number
        // =======================================================================
        const groups = result.rows.map(group => ({
            ...group,
            member_count: parseInt(group.member_count, 10) || 0
        }));

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            groups
        });

    } catch (error) {
        console.error('List groups error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
