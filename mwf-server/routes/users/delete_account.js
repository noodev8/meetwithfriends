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
- User data is deleted (cascades: RSVPs, comments, group memberships, event host entries)
- Events created by the user will remain but show "Deleted User" as creator
- Groups where user is the only organiser will remain but lose their organiser
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { logAudit, AuditAction, anonymizeUserAuditLogs } = require('../../services/audit');

// =======================================================================
// Configure Cloudinary with credentials from environment
// =======================================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// =======================================================================
// Helper: Extract public_id from Cloudinary URL
// =======================================================================
function extractPublicId(url) {
    try {
        const regex = /\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[a-zA-Z]+$/;
        const match = url.match(regex);
        if (match && match[1]) return match[1];

        const simpleRegex = /\/upload\/(?:[^/]+\/)*([^/]+\/[^.]+)\.[a-zA-Z]+$/;
        const simpleMatch = url.match(simpleRegex);
        if (simpleMatch && simpleMatch[1]) return simpleMatch[1];

        return null;
    } catch {
        return null;
    }
}

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
        // Fetch user's password hash and avatar URL
        // =======================================================================
        const result = await query(
            `SELECT id, password_hash, avatar_url FROM app_user WHERE id = $1`,
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
        // Delete avatar from Cloudinary if exists
        // We don't fail the whole operation if Cloudinary delete fails
        // =======================================================================
        if (user.avatar_url) {
            try {
                const publicId = extractPublicId(user.avatar_url);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (cloudinaryError) {
                console.error('Failed to delete avatar from Cloudinary:', cloudinaryError);
                // Continue with account deletion even if Cloudinary delete fails
            }
        }

        // =======================================================================
        // Anonymize existing audit log entries for privacy
        // =======================================================================
        await anonymizeUserAuditLogs(userId);

        // =======================================================================
        // Create audit log entry (user ID only, no name for privacy)
        // =======================================================================
        await logAudit({
            action: AuditAction.USER_DELETED,
            userId
        });

        // =======================================================================
        // Delete user account
        // Foreign key cascades will clean up:
        // - password_reset_token (CASCADE)
        // - group_member (CASCADE)
        // - event_rsvp (CASCADE)
        // - event_comment (CASCADE)
        // - event_host (CASCADE)
        // Foreign keys set to NULL:
        // - event_list.created_by (SET NULL) - events remain, creator shows as deleted
        // - event_host.added_by (SET NULL) - host records remain
        // - audit_log.user_id (SET NULL) - audit entries remain but anonymized
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
