/*
=======================================================================================================================================
API Route: get_hosts
=======================================================================================================================================
Method: GET
Purpose: Retrieves the list of hosts for an event. Anyone can view hosts.
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter)

Success Response:
{
  "return_code": "SUCCESS",
  "hosts": [
    {
      "user_id": 5,
      "name": "John Smith",
      "avatar_url": "https://...",
      "added_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');

router.get('/:id/hosts', async (req, res) => {
    try {
        const { id } = req.params;

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
        // Check if event exists
        // =======================================================================
        const eventResult = await query(
            'SELECT id FROM event_list WHERE id = $1',
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Fetch hosts with user info
        // =======================================================================
        const hostsResult = await query(
            `SELECT
                eh.user_id,
                u.name,
                u.avatar_url,
                eh.created_at AS added_at
             FROM event_host eh
             JOIN app_user u ON eh.user_id = u.id
             WHERE eh.event_id = $1
             ORDER BY eh.created_at ASC`,
            [id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            hosts: hostsResult.rows
        });

    } catch (error) {
        console.error('Get hosts error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
