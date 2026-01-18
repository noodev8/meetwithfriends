/*
=======================================================================================================================================
API Route: register
=======================================================================================================================================
Method: POST
Purpose: Creates a new user account with email and password. Returns a JWT token upon success.
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com",         // string, required
  "password": "securepassword123",     // string, required, min 8 characters
  "name": "John Smith"                 // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "name": "John Smith",
    "email": "user@example.com"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_EMAIL"
"INVALID_PASSWORD" - Password must be at least 8 characters
"EMAIL_EXISTS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../../database');
const config = require('../../config/config');
const { sendWelcomeEmail } = require('../../services/email');
const { logAudit, AuditAction } = require('../../services/audit');

router.post('/', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!email || !password || !name) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Email, password, and name are required'
            });
        }

        // =======================================================================
        // Validate email format
        // =======================================================================
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.json({
                return_code: 'INVALID_EMAIL',
                message: 'Please provide a valid email address'
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
        // Check if email already exists
        // =======================================================================
        const existingUser = await query(
            'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.json({
                return_code: 'EMAIL_EXISTS',
                message: 'An account with this email already exists'
            });
        }

        // =======================================================================
        // Hash password
        // =======================================================================
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // =======================================================================
        // Create user
        // =======================================================================
        const result = await query(
            `INSERT INTO app_user (email, password_hash, name)
             VALUES ($1, $2, $3)
             RETURNING id, email, name`,
            [email.toLowerCase(), passwordHash, name]
        );

        const user = result.rows[0];

        // =======================================================================
        // Create audit log entry
        // =======================================================================
        await logAudit({
            action: AuditAction.USER_REGISTERED,
            userId: user.id,
            userName: user.name
        });

        // =======================================================================
        // Generate JWT token (only user_id per API-Rules)
        // =======================================================================
        const token = jwt.sign(
            { user_id: user.id },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        // =======================================================================
        // Send welcome email (async - don't wait)
        // =======================================================================
        sendWelcomeEmail(user.email, user.name).catch(err => {
            console.error('Failed to send welcome email:', err);
        });

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
