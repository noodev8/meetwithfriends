/*
=======================================================================================================================================
API Route: contact_organiser
=======================================================================================================================================
Method: POST
Purpose: Allows group members to send a message to the group organiser via email.
=======================================================================================================================================
Request Payload:
{
  "message": "Hello, I have a question..."   // string, required (10-1000 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Message sent to organiser"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_MESSAGE"
"NOT_FOUND"
"FORBIDDEN"
"RATE_LIMITED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { sendContactOrganiserEmail } = require('../../services/email');

// In-memory rate limiting (per user per group, max 3 messages per hour)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;

function checkRateLimit(userId, groupId) {
    const key = `${userId}-${groupId}`;
    const now = Date.now();
    const userLimits = rateLimitMap.get(key) || [];

    // Filter out old entries
    const recentAttempts = userLimits.filter(t => now - t < RATE_LIMIT_WINDOW);

    if (recentAttempts.length >= RATE_LIMIT_MAX) {
        return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    rateLimitMap.set(key, recentAttempts);
    return true;
}

router.post('/:id/contact-organiser', verifyToken, async (req, res) => {
    try {
        const groupId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const { message } = req.body;

        // =======================================================================
        // Validate message
        // =======================================================================
        if (!message || typeof message !== 'string') {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Message is required'
            });
        }

        const trimmedMessage = message.trim();
        if (trimmedMessage.length < 10 || trimmedMessage.length > 1000) {
            return res.json({
                return_code: 'INVALID_MESSAGE',
                message: 'Message must be between 10 and 1000 characters'
            });
        }

        // =======================================================================
        // Check if group exists
        // =======================================================================
        const groupResult = await query(
            'SELECT id, name FROM group_list WHERE id = $1',
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        const group = groupResult.rows[0];

        // =======================================================================
        // Check if user is an active member of the group
        // =======================================================================
        const memberResult = await query(
            `SELECT role FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
            [groupId, userId]
        );

        if (memberResult.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You must be a group member to contact the organiser'
            });
        }

        // =======================================================================
        // Check rate limit
        // =======================================================================
        if (!checkRateLimit(userId, groupId)) {
            return res.json({
                return_code: 'RATE_LIMITED',
                message: 'You can only send 3 messages per hour. Please try again later.'
            });
        }

        // =======================================================================
        // Get organiser email and sender name
        // =======================================================================
        const organiserResult = await query(
            `SELECT u.id, u.email, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.group_id = $1 AND gm.role = 'organiser' AND gm.status = 'active'`,
            [groupId]
        );

        if (organiserResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group organiser not found'
            });
        }

        const organiser = organiserResult.rows[0];

        const senderResult = await query(
            'SELECT name, email FROM app_user WHERE id = $1',
            [userId]
        );

        const sender = senderResult.rows[0];

        // =======================================================================
        // Send email to organiser
        // =======================================================================
        await sendContactOrganiserEmail(
            organiser.email,
            organiser.name,
            sender.name,
            sender.email,
            group,
            trimmedMessage
        );

        return res.json({
            return_code: 'SUCCESS',
            message: 'Message sent to organiser'
        });

    } catch (error) {
        console.error('Contact organiser error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
