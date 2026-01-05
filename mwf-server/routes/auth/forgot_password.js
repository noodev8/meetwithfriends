/*
=======================================================================================================================================
API Route: forgot_password
=======================================================================================================================================
Method: POST
Purpose: Sends a password reset email to the user. Creates a reset token valid for 1 hour.
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com"          // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "If an account exists with this email, a reset link has been sent"
}
=======================================================================================================================================
Return Codes:
"SUCCESS" - Always returns success to avoid revealing which emails exist
"MISSING_FIELDS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../../database');

router.post('/', async (req, res) => {
    try {
        const { email } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!email) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Email is required'
            });
        }

        // =======================================================================
        // Find user by email
        // =======================================================================
        const result = await query(
            'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        // Always return success to avoid revealing which emails exist
        if (result.rows.length === 0) {
            return res.json({
                return_code: 'SUCCESS',
                message: 'If an account exists with this email, a reset link has been sent'
            });
        }

        const user = result.rows[0];

        // =======================================================================
        // Generate reset token
        // =======================================================================
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // =======================================================================
        // Store reset token
        // =======================================================================
        await query(
            `INSERT INTO password_reset_token (user_id, token, expires_at)
             VALUES ($1, $2, $3)`,
            [user.id, token, expiresAt]
        );

        // =======================================================================
        // TODO: Send email via Resend
        // For now, log the token (remove in production)
        // =======================================================================
        console.log(`Password reset token for ${email}: ${token}`);

        return res.json({
            return_code: 'SUCCESS',
            message: 'If an account exists with this email, a reset link has been sent'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
