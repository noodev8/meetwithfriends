/*
=======================================================================================================================================
API Route: get_profile
=======================================================================================================================================
Method: GET
Purpose: Retrieves the authenticated user's profile information.
=======================================================================================================================================
Request Headers:
Authorization: Bearer <token>          // Required JWT token

Success Response:
{
  "return_code": "SUCCESS",
  "user": {
    "id": 123,
    "name": "John Smith",
    "email": "user@example.com",
    "bio": "Food enthusiast",
    "avatar_url": "https://...",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORIZED"
"USER_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
    try {
        // =======================================================================
        // Get user ID from verified token
        // =======================================================================
        const userId = req.user.id;

        // =======================================================================
        // Fetch user profile from database
        // =======================================================================
        const result = await query(
            `SELECT id, name, email, bio, avatar_url, created_at
             FROM app_user
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            // This shouldn't happen with a valid token, but handle it gracefully
            return res.json({
                return_code: 'USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        // =======================================================================
        // Return success response with user data
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                avatar_url: user.avatar_url,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
