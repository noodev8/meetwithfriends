/*
=======================================================================================================================================
API Route: reset_password
=======================================================================================================================================
Method: POST
Purpose: Resets user password using a valid reset token.
=======================================================================================================================================
Request Payload:
{
  "token": "abc123...",                // string, required - reset token from email
  "password": "newpassword123"         // string, required, min 8 characters
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Password has been reset successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_TOKEN" - Token is invalid, expired, or already used
"INVALID_PASSWORD" - Password must be at least 8 characters
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../../database');
const { withTransaction } = require('../../utils/transaction');

router.post('/', async (req, res) => {
    try {
        const { token, password } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!token || !password) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Token and password are required'
            });
        }

        // =======================================================================
        // Validate password length
        // =======================================================================
        if (password.length < 8) {
            return res.json({
                return_code: 'INVALID_PASSWORD',
                message: 'Password must be at least 8 characters'
            });
        }

        // =======================================================================
        // Find valid reset token
        // =======================================================================
        const tokenResult = await query(
            `SELECT id, user_id
             FROM password_reset_token
             WHERE token = $1
               AND expires_at > NOW()
               AND used_at IS NULL`,
            [token]
        );

        if (tokenResult.rows.length === 0) {
            return res.json({
                return_code: 'INVALID_TOKEN',
                message: 'Invalid or expired reset token'
            });
        }

        const resetToken = tokenResult.rows[0];

        // =======================================================================
        // Hash new password and update user
        // =======================================================================
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await withTransaction(async (client) => {
            // Update user password
            await client.query(
                'UPDATE app_user SET password_hash = $1 WHERE id = $2',
                [passwordHash, resetToken.user_id]
            );

            // Mark token as used
            await client.query(
                'UPDATE password_reset_token SET used_at = NOW() WHERE id = $1',
                [resetToken.id]
            );
        });

        return res.json({
            return_code: 'SUCCESS',
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
