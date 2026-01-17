/*
=======================================================================================================================================
API Route: broadcast_message
=======================================================================================================================================
Method: POST
Purpose: Allows group organiser to send a broadcast message to all active members (who have broadcasts enabled).
=======================================================================================================================================
Request Payload:
{
  "message": "Hello everyone..."   // string, required (10-2000 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Broadcast sent to X members"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_MESSAGE"
"NOT_FOUND"
"FORBIDDEN"
"NO_RECIPIENTS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const { queueBroadcastEmail } = require('../../services/email');

router.post('/:id/broadcast', verifyToken, async (req, res) => {
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
        if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
            return res.json({
                return_code: 'INVALID_MESSAGE',
                message: 'Message must be between 10 and 2000 characters'
            });
        }

        // =======================================================================
        // Check if group exists and get group info
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
        // Check if user is the organiser
        // =======================================================================
        const memberResult = await query(
            `SELECT role FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
            [groupId, userId]
        );

        if (memberResult.rows.length === 0 || memberResult.rows[0].role !== 'organiser') {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only the group organiser can send broadcast messages'
            });
        }

        // =======================================================================
        // Get organiser name
        // =======================================================================
        const organiserResult = await query(
            'SELECT name FROM app_user WHERE id = $1',
            [userId]
        );
        const organiserName = organiserResult.rows[0].name;

        // =======================================================================
        // Get all active members who have broadcasts enabled (excluding organiser)
        // =======================================================================
        const recipientsResult = await query(
            `SELECT u.email, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.group_id = $1
               AND gm.status = 'active'
               AND gm.user_id != $2
               AND u.receive_broadcasts = true`,
            [groupId, userId]
        );

        let recipients = recipientsResult.rows;

        // Limit to 1 recipient when ALL recipients are @test.com (pure test mode)
        const allTestEmails = recipients.length > 0 &&
            recipients.every(r => r.email.toLowerCase().endsWith('@test.com'));
        if (allTestEmails) {
            recipients = recipients.slice(0, 1);
        }

        if (recipients.length === 0) {
            return res.json({
                return_code: 'NO_RECIPIENTS',
                message: 'No members have broadcasts enabled'
            });
        }

        // =======================================================================
        // Queue emails for all recipients
        // =======================================================================
        let queuedCount = 0;
        for (const recipient of recipients) {
            try {
                await queueBroadcastEmail(
                    recipient.email,
                    recipient.name,
                    organiserName,
                    group,
                    trimmedMessage
                );
                queuedCount++;
            } catch (err) {
                console.error(`Failed to queue broadcast to ${recipient.email}:`, err);
            }
        }

        return res.json({
            return_code: 'SUCCESS',
            message: `Broadcast queued for ${queuedCount} member${queuedCount !== 1 ? 's' : ''}`,
            queued: queuedCount
        });

    } catch (error) {
        console.error('Broadcast message error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
