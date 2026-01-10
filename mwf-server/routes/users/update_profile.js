/*
=======================================================================================================================================
API Route: update_profile
=======================================================================================================================================
Method: POST
Purpose: Updates the authenticated user's profile information (name, bio, avatar_url, contact details).
=======================================================================================================================================
Request Headers:
Authorization: Bearer <token>          // Required JWT token

Request Payload:
{
  "name": "John Smith",                // string, optional (min 1 char if provided)
  "bio": "Food enthusiast",            // string, optional (can be empty)
  "avatar_url": "https://...",         // string, optional (can be empty)
  "contact_mobile": "+61412345678",    // string, optional (can be empty)
  "contact_email": "contact@...",      // string, optional (can be empty)
  "show_mobile_to_guests": true,       // boolean, optional
  "show_email_to_guests": true         // boolean, optional
}

Success Response:
{
  "return_code": "SUCCESS",
  "user": {
    "id": 123,
    "name": "John Smith",
    "email": "user@example.com",
    "bio": "Food enthusiast",
    "avatar_url": "https://...",
    "contact_mobile": "+61412345678",
    "contact_email": "contact@...",
    "show_mobile_to_guests": true,
    "show_email_to_guests": true
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORIZED"
"INVALID_NAME"
"USER_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, bio, avatar_url, contact_mobile, contact_email, show_mobile_to_guests, show_email_to_guests } = req.body;

        // =======================================================================
        // Validate name if provided - must not be empty
        // =======================================================================
        if (name !== undefined && (!name || !name.trim())) {
            return res.json({
                return_code: 'INVALID_NAME',
                message: 'Name cannot be empty'
            });
        }

        // =======================================================================
        // Build dynamic update query based on provided fields
        // Only update fields that were actually sent in the request
        // =======================================================================
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name.trim());
            paramIndex++;
        }

        if (bio !== undefined) {
            updates.push(`bio = $${paramIndex}`);
            values.push(bio || null);  // Allow empty bio
            paramIndex++;
        }

        if (avatar_url !== undefined) {
            updates.push(`avatar_url = $${paramIndex}`);
            values.push(avatar_url || null);  // Allow empty avatar
            paramIndex++;
        }

        if (contact_mobile !== undefined) {
            updates.push(`contact_mobile = $${paramIndex}`);
            values.push(contact_mobile || null);
            paramIndex++;
        }

        if (contact_email !== undefined) {
            updates.push(`contact_email = $${paramIndex}`);
            values.push(contact_email || null);
            paramIndex++;
        }

        if (show_mobile_to_guests !== undefined) {
            updates.push(`show_mobile_to_guests = $${paramIndex}`);
            values.push(Boolean(show_mobile_to_guests));
            paramIndex++;
        }

        if (show_email_to_guests !== undefined) {
            updates.push(`show_email_to_guests = $${paramIndex}`);
            values.push(Boolean(show_email_to_guests));
            paramIndex++;
        }

        // If no fields to update, just return current profile
        if (updates.length === 0) {
            const result = await query(
                `SELECT id, name, email, bio, avatar_url, contact_mobile, contact_email, show_mobile_to_guests, show_email_to_guests
                 FROM app_user WHERE id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                return res.json({
                    return_code: 'USER_NOT_FOUND',
                    message: 'User not found'
                });
            }

            return res.json({
                return_code: 'SUCCESS',
                user: result.rows[0]
            });
        }

        // =======================================================================
        // Update user profile
        // =======================================================================
        values.push(userId);
        const updateQuery = `
            UPDATE app_user
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, name, email, bio, avatar_url, contact_mobile, contact_email, show_mobile_to_guests, show_email_to_guests
        `;

        const result = await query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.json({
                return_code: 'USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        // =======================================================================
        // Return success response with updated user data
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
