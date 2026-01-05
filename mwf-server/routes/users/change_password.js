/*
=======================================================================================================================================
API Route: change_password
=======================================================================================================================================
Method: POST
Purpose: Changes the authenticated user's password. Requires current password for verification.
=======================================================================================================================================
Request Headers:
Authorization: Bearer <token>          // Required JWT token

Request Payload:
{
  "current_password": "oldPassword",   // string, required
  "new_password": "newPassword123"     // string, required (min 8 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Password changed successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORIZED"
"MISSING_FIELDS"
"INVALID_PASSWORD" - Current password is incorrect
"INVALID_NEW_PASSWORD" - New password doesn't meet requirements
"USER_NOT_FOUND"
"SERVER_ERROR"
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
        const { current_password, new_password } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!current_password || !new_password) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Current password and new password are required'
            });
        }

        // =======================================================================
        // Validate new password meets requirements (min 8 chars)
        // =======================================================================
        if (new_password.length < 8) {
            return res.json({
                return_code: 'INVALID_NEW_PASSWORD',
                message: 'New password must be at least 8 characters'
            });
        }

        // =======================================================================
        // Fetch user's current password hash
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
        // Verify current password
        // =======================================================================
        const passwordValid = await bcrypt.compare(current_password, user.password_hash);

        if (!passwordValid) {
            return res.json({
                return_code: 'INVALID_PASSWORD',
                message: 'Current password is incorrect'
            });
        }

        // =======================================================================
        // Hash new password and update in database
        // =======================================================================
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        await query(
            `UPDATE app_user SET password_hash = $1 WHERE id = $2`,
            [newPasswordHash, userId]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
