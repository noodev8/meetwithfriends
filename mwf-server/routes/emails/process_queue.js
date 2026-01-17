/*
=======================================================================================================================================
API Route: process_queue
=======================================================================================================================================
Method: POST
Purpose: Process pending emails from the queue at rate-limited pace (1/second)
=======================================================================================================================================
Request Payload:
{
    "limit": 50  // Optional, max emails to process (default 50)
}

Success Response:
{
    "return_code": "SUCCESS",
    "processed": 10,
    "sent": 8,
    "failed": 2
}

=======================================================================================================================================
Return Codes:
"SUCCESS" - Queue processed
"UNAUTHORIZED" - Not logged in
"FORBIDDEN" - Not an admin/organiser
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { processEmailQueue, getQueueStats } = require('../../services/email');
const { verifyToken } = require('../../middleware/auth');
const { query } = require('../../database');

// =======================================================================
// POST /api/emails/process-queue - Process pending emails
// =======================================================================
router.post('/process-queue', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.body;

        // =======================================================================
        // Check if user is an organiser of any group (basic admin check)
        // =======================================================================
        const organiserCheck = await query(
            `SELECT 1 FROM group_member
             WHERE user_id = $1 AND role = 'organiser' AND status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (organiserCheck.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only organisers can process the email queue'
            });
        }

        // =======================================================================
        // Process the queue
        // =======================================================================
        const result = await processEmailQueue(Math.min(limit, 100)); // Cap at 100

        return res.json({
            return_code: 'SUCCESS',
            ...result
        });

    } catch (error) {
        console.error('Process queue error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'Failed to process email queue'
        });
    }
});

// =======================================================================
// GET /api/emails/queue-stats - Get queue statistics
// =======================================================================
router.get('/queue-stats', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user is an organiser
        const organiserCheck = await query(
            `SELECT 1 FROM group_member
             WHERE user_id = $1 AND role = 'organiser' AND status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (organiserCheck.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only organisers can view queue stats'
            });
        }

        const result = await getQueueStats();

        return res.json({
            return_code: 'SUCCESS',
            stats: result.stats
        });

    } catch (error) {
        console.error('Queue stats error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'Failed to get queue stats'
        });
    }
});

// =======================================================================
// GET /api/emails/queue - List pending emails (for review before processing)
// =======================================================================
router.get('/queue', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'pending', limit = 50 } = req.query;

        // Check if user is an organiser
        const organiserCheck = await query(
            `SELECT 1 FROM group_member
             WHERE user_id = $1 AND role = 'organiser' AND status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (organiserCheck.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only organisers can view the email queue'
            });
        }

        // Get emails from queue
        const result = await query(
            `SELECT id, email_type, recipient_email, recipient_name, subject,
                    status, attempts, created_at, scheduled_for, sent_at, error_message
             FROM email_queue
             WHERE status = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [status, Math.min(parseInt(limit, 10), 100)]
        );

        return res.json({
            return_code: 'SUCCESS',
            emails: result.rows
        });

    } catch (error) {
        console.error('List queue error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'Failed to list email queue'
        });
    }
});

// =======================================================================
// PATCH /api/emails/queue/:id - Update email status (cancel, retry)
// =======================================================================
router.patch('/queue/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const emailId = parseInt(req.params.id, 10);
        const { status } = req.body;

        // Validate status
        const allowedStatuses = ['pending', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.json({
                return_code: 'INVALID_STATUS',
                message: 'Status must be "pending" or "cancelled"'
            });
        }

        // Check if user is an organiser
        const organiserCheck = await query(
            `SELECT 1 FROM group_member
             WHERE user_id = $1 AND role = 'organiser' AND status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (organiserCheck.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only organisers can update email status'
            });
        }

        // Update the email status
        const result = await query(
            `UPDATE email_queue
             SET status = $1
             WHERE id = $2
             RETURNING id, status`,
            [status, emailId]
        );

        if (result.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Email not found'
            });
        }

        return res.json({
            return_code: 'SUCCESS',
            email: result.rows[0]
        });

    } catch (error) {
        console.error('Update email status error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'Failed to update email status'
        });
    }
});

// =======================================================================
// DELETE /api/emails/queue/cancel-all - Cancel all pending emails (emergency)
// =======================================================================
router.delete('/queue/cancel-all', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { email_type } = req.query; // Optional: cancel only specific type

        // Check if user is an organiser
        const organiserCheck = await query(
            `SELECT 1 FROM group_member
             WHERE user_id = $1 AND role = 'organiser' AND status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (organiserCheck.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only organisers can cancel emails'
            });
        }

        // Cancel pending emails
        let result;
        if (email_type) {
            result = await query(
                `UPDATE email_queue
                 SET status = 'cancelled'
                 WHERE status = 'pending' AND email_type = $1
                 RETURNING id`,
                [email_type]
            );
        } else {
            result = await query(
                `UPDATE email_queue
                 SET status = 'cancelled'
                 WHERE status = 'pending'
                 RETURNING id`
            );
        }

        return res.json({
            return_code: 'SUCCESS',
            cancelled: result.rows.length
        });

    } catch (error) {
        console.error('Cancel all error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'Failed to cancel emails'
        });
    }
});

module.exports = router;
