/*
=======================================================================================================================================
API Route: contact_support
=======================================================================================================================================
Method: POST
Purpose: Allows users to send a support message via the contact form.
=======================================================================================================================================
Request Payload:
{
  "name": "John Smith",           // string, required (2-100 chars)
  "email": "user@example.com",    // string, required (valid email)
  "message": "Hello, I need help..."   // string, required (10-1000 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Your message has been sent. We'll respond within 24 hours."
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_EMAIL"
"INVALID_MESSAGE"
"RATE_LIMITED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { sendContactSupportEmail } = require('../../services/email');

// In-memory rate limiting (per email, max 3 messages per hour)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;

function checkRateLimit(email) {
    const key = email.toLowerCase();
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

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // =======================================================================
        // Validate name
        // =======================================================================
        if (!name || typeof name !== 'string') {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Name is required'
            });
        }

        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 100) {
            return res.json({
                return_code: 'INVALID_NAME',
                message: 'Name must be between 2 and 100 characters'
            });
        }

        // =======================================================================
        // Validate email
        // =======================================================================
        if (!email || typeof email !== 'string') {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Email is required'
            });
        }

        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
            return res.json({
                return_code: 'INVALID_EMAIL',
                message: 'Please enter a valid email address'
            });
        }

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
        // Check rate limit
        // =======================================================================
        if (!checkRateLimit(trimmedEmail)) {
            return res.json({
                return_code: 'RATE_LIMITED',
                message: 'You can only send 3 messages per hour. Please try again later.'
            });
        }

        // =======================================================================
        // Send email to support
        // =======================================================================
        const result = await sendContactSupportEmail(trimmedName, trimmedEmail, trimmedMessage);

        if (!result.success) {
            return res.json({
                return_code: 'SERVER_ERROR',
                message: 'Failed to send message. Please try again later.'
            });
        }

        return res.json({
            return_code: 'SUCCESS',
            message: "Your message has been sent. We'll respond within 24 hours."
        });

    } catch (error) {
        console.error('Contact support error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
