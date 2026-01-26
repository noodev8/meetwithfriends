/*
=======================================================================================================================================
API Route: calendar
=======================================================================================================================================
Method: GET
Purpose: Generates an ICS calendar file for an event. Used in email links to allow users to add events to their calendar.
         No authentication required since links are embedded in emails.
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter)

Success Response:
ICS file download (text/calendar content type)

Error Response:
{
  "return_code": "NOT_FOUND",
  "message": "Event not found"
}
=======================================================================================================================================
Return Codes:
"NOT_FOUND" - Event does not exist or is cancelled
"SERVER_ERROR" - Unexpected error
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const config = require('../../config/config');

/*
=======================================================================================================================================
Helper: formatICSDate
=======================================================================================================================================
Converts a JavaScript Date to ICS format (YYYYMMDDTHHMMSSZ)
ICS requires dates in UTC format
=======================================================================================================================================
*/
function formatICSDate(date) {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/*
=======================================================================================================================================
Helper: escapeICSText
=======================================================================================================================================
Escapes special characters for ICS format.
ICS requires escaping: backslash, semicolon, comma, and newlines
=======================================================================================================================================
*/
function escapeICSText(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/*
=======================================================================================================================================
Helper: generateICS
=======================================================================================================================================
Generates ICS file content for an event.
Assumes a 3-hour default duration if no end time is specified.
=======================================================================================================================================
*/
function generateICS(event) {
    const startDate = new Date(event.date_time);
    // Default event duration: 3 hours
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const now = new Date();

    // Build description with event details
    let description = event.description || '';
    if (event.group_name) {
        description = `Group: ${event.group_name}\\n\\n${description}`;
    }
    description += `\\n\\nView event: ${config.frontendUrl}/events/${event.id}`;

    // Generate unique ID for the calendar event
    const uid = `event-${event.id}@meetwithfriends.app`;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Meet With Friends//meetwithfriends.app//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDate(now)}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${escapeICSText(event.title)}`,
        `DESCRIPTION:${escapeICSText(description)}`,
        event.location ? `LOCATION:${escapeICSText(event.location)}` : null,
        `URL:${config.frontendUrl}/events/${event.id}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    return icsContent;
}

/*
=======================================================================================================================================
GET /api/events/:id/calendar.ics
=======================================================================================================================================
Returns an ICS file for the specified event.
No authentication required - links are embedded in emails.
=======================================================================================================================================
*/
router.get('/:id/calendar.ics', async (req, res) => {
    try {
        const { id } = req.params;

        // =======================================================================
        // Validate ID is a number
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Fetch event with group name
        // Only return published events (not cancelled)
        // =======================================================================
        const result = await query(
            `SELECT
                e.id,
                e.title,
                e.description,
                e.location,
                e.date_time,
                e.status,
                g.name AS group_name
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             WHERE e.id = $1`,
            [id]
        );

        // =======================================================================
        // Check if event exists
        // =======================================================================
        if (result.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const event = result.rows[0];

        // =======================================================================
        // Check if event is cancelled
        // =======================================================================
        if (event.status === 'cancelled') {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'This event has been cancelled'
            });
        }

        // =======================================================================
        // Generate ICS content
        // =======================================================================
        const icsContent = generateICS(event);

        // =======================================================================
        // Set headers for file download
        // =======================================================================
        const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const filename = `${safeTitle}.ics`;

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        return res.send(icsContent);

    } catch (error) {
        console.error('Calendar export error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
