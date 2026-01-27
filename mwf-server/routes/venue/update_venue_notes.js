/*
=======================================================================================================================================
API Route: update_venue_notes
=======================================================================================================================================
Method: PUT
Purpose: Allows venue to save internal notes for the event (e.g., table assignments, prep reminders).
         No authentication required - token validates access.
=======================================================================================================================================
Request Payload:
{
    "notes": "Table 5 reserved. Extra high chair needed."   // string, optional (can be empty to clear)
}

Success Response:
{
    "return_code": "SUCCESS",
    "notes": "Table 5 reserved. Extra high chair needed.",
    "updated_at": "2026-01-27T12:00:00Z"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"INVALID_TOKEN" - Token not found or malformed
"ACCESS_REVOKED" - Organiser revoked access
"EXPIRED_TOKEN" - Event was more than 24h ago
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');

router.put('/:token/notes', async (req, res) => {
    try {
        const { token } = req.params;
        const { notes } = req.body;

        // =======================================================================
        // Validate token exists
        // =======================================================================
        if (!token || token.length !== 64) {
            return res.json({
                return_code: 'INVALID_TOKEN',
                message: 'This venue link is invalid'
            });
        }

        // =======================================================================
        // Find the venue access token and check validity
        // =======================================================================
        const tokenResult = await query(
            `SELECT
                vat.id,
                vat.revoked_at,
                e.date_time
             FROM venue_access_token vat
             JOIN event_list e ON vat.event_id = e.id
             WHERE vat.token = $1`,
            [token]
        );

        // =======================================================================
        // Check if token exists
        // =======================================================================
        if (tokenResult.rows.length === 0) {
            return res.json({
                return_code: 'INVALID_TOKEN',
                message: 'This venue link is invalid or has expired'
            });
        }

        const tokenData = tokenResult.rows[0];

        // =======================================================================
        // Check if access was revoked
        // =======================================================================
        if (tokenData.revoked_at) {
            return res.json({
                return_code: 'ACCESS_REVOKED',
                message: 'Access to this event has been revoked by the organiser'
            });
        }

        // =======================================================================
        // Check if token has expired (24 hours after event date)
        // =======================================================================
        const eventDate = new Date(tokenData.date_time);
        const expiryDate = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now > expiryDate) {
            return res.json({
                return_code: 'EXPIRED_TOKEN',
                message: 'This venue link has expired (24 hours after the event)'
            });
        }

        // =======================================================================
        // Update the venue notes
        // Trim and limit notes to reasonable length (5000 chars)
        // =======================================================================
        const sanitizedNotes = notes ? notes.toString().trim().slice(0, 5000) : null;

        await query(
            `UPDATE venue_access_token
             SET notes = $1
             WHERE id = $2`,
            [sanitizedNotes, tokenData.id]
        );

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            notes: sanitizedNotes,
            updated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Update venue notes error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
