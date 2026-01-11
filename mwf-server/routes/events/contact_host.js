/*
=======================================================================================================================================
API Route: contact_host
=======================================================================================================================================
Method: POST
Purpose: Allows event attendees to send a message to the event host(s) via email.
=======================================================================================================================================
Request Payload:
{
  "message": "Hello, I have a question..."   // string, required (10-1000 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Message sent to host(s)"
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
const { sendContactHostEmail } = require('../../services/email');

// In-memory rate limiting (per user per event, max 3 messages per hour)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;

function checkRateLimit(userId, eventId) {
    const key = `${userId}-${eventId}`;
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

router.post('/:id/contact-host', verifyToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id, 10);
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
        // Check if event exists and get details
        // =======================================================================
        const eventResult = await query(
            `SELECT e.id, e.title, e.group_id, g.name as group_name
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             WHERE e.id = $1`,
            [eventId]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const event = eventResult.rows[0];

        // =======================================================================
        // Check if user is an attendee or on waitlist
        // =======================================================================
        const rsvpResult = await query(
            `SELECT status FROM event_rsvp
             WHERE event_id = $1 AND user_id = $2 AND status IN ('attending', 'waitlist')`,
            [eventId, userId]
        );

        if (rsvpResult.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You must be attending or on the waitlist to contact hosts'
            });
        }

        // =======================================================================
        // Check rate limit
        // =======================================================================
        if (!checkRateLimit(userId, eventId)) {
            return res.json({
                return_code: 'RATE_LIMITED',
                message: 'You can only send 3 messages per hour. Please try again later.'
            });
        }

        // =======================================================================
        // Get all hosts for this event
        // =======================================================================
        const hostsResult = await query(
            `SELECT u.id, u.email, u.name
             FROM event_host eh
             JOIN app_user u ON eh.user_id = u.id
             WHERE eh.event_id = $1`,
            [eventId]
        );

        if (hostsResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'No hosts found for this event'
            });
        }

        const hosts = hostsResult.rows;

        // Get sender info
        const senderResult = await query(
            'SELECT name, email FROM app_user WHERE id = $1',
            [userId]
        );

        const sender = senderResult.rows[0];

        // =======================================================================
        // Send email to all hosts
        // =======================================================================
        for (const host of hosts) {
            await sendContactHostEmail(
                host.email,
                host.name,
                sender.name,
                sender.email,
                event,
                trimmedMessage
            );
        }

        return res.json({
            return_code: 'SUCCESS',
            message: hosts.length === 1 ? 'Message sent to host' : 'Message sent to hosts'
        });

    } catch (error) {
        console.error('Contact host error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
