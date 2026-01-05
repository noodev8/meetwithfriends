/*
=======================================================================================================================================
API Route: delete_account
=======================================================================================================================================
Method: POST
Purpose: Permanently deletes the authenticated user's account. Requires password confirmation.
=======================================================================================================================================
Request Headers:
Authorization: Bearer <token>          // Required JWT token

Request Payload:
{
  "password": "currentPassword"        // string, required - for confirmation
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Account deleted successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORIZED"
"MISSING_FIELDS"
"INVALID_PASSWORD" - Password confirmation failed
"USER_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
Notes:
- This action is irreversible
- All user data will be deleted (cascades to related tables via foreign keys)
- Groups where user is the only organiser will remain but lose their organiser
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;

        // =======================================================================
        // Validate required field - password is required for confirmation
        // =======================================================================
        if (!password) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Password is required to confirm account deletion'
            });
        }

        // =======================================================================
        // Fetch user's password hash
        // =======================================================================
        const result = await query(
            `SELECT id, password_hash FROM app_user WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                return_code: 'USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        // =======================================================================
        // Verify password before deletion
        // =======================================================================
        const passwordValid = await bcrypt.compare(password, user.password_hash);

        if (!passwordValid) {
            return res.json({
                return_code: 'INVALID_PASSWORD',
                message: 'Incorrect password'
            });
        }

        // =======================================================================
        // Delete user account
        // Foreign key cascades will clean up:
        // - password_reset_token
        // - group_member
        // - event_rsvp
        // - event_comment
        // =======================================================================
        await query(
            `DELETE FROM app_user WHERE id = $1`,
            [userId]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
