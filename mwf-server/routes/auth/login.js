/*
=======================================================================================================================================
API Route: login
=======================================================================================================================================
Method: POST
Purpose: Authenticates a user using their email and password. Returns a JWT token upon success.
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com",         // string, required
  "password": "securepassword123"      // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "name": "John Smith",
    "email": "user@example.com",
    "bio": "Food enthusiast",
    "avatar_url": "https://..."
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_CREDENTIALS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../../database');
const config = require('../../config/config');

router.post('/', async (req, res) => {
    try {
        const { email, password } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!email || !password) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Email and password are required'
            });
        }

        // =======================================================================
        // Find user by email
        // =======================================================================
        const result = await query(
            `SELECT id, email, password_hash, name, bio, avatar_url
             FROM app_user
             WHERE LOWER(email) = LOWER($1)`,
            [email]
        );

        if (result.rows.length === 0) {
            // User not found - use generic message to avoid revealing which emails exist
            return res.json({
                return_code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // =======================================================================
        // Verify password
        // =======================================================================
        const passwordValid = await bcrypt.compare(password, user.password_hash);

        if (!passwordValid) {
            return res.json({
                return_code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        // =======================================================================
        // Update last login timestamp
        // =======================================================================
        await query(
            'UPDATE app_user SET last_login_at = NOW() WHERE id = $1',
            [user.id]
        );

        // =======================================================================
        // Generate JWT token (only user_id per API-Rules)
        // =======================================================================
        const token = jwt.sign(
            { user_id: user.id },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                avatar_url: user.avatar_url
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
