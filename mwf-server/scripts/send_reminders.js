/*
=======================================================================================================================================
Script: send_reminders
=======================================================================================================================================
Purpose: Queues event reminder emails 24 hours before events.
Usage: Run manually or via cron job (e.g., daily at 9am)

   node scripts/send_reminders.js

This script:
1. Finds events starting in the next 24-26 hours (gives a 2-hour window)
2. Queues reminder emails to all attendees
3. Hosts receive a version with attendee summary
4. Run process_email_queue.js after to actually send the emails
=======================================================================================================================================
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query, pool } = require('../database');
const { queueEventReminderEmail } = require('../services/email');

// Time window: events starting between 24 and 26 hours from now
const HOURS_BEFORE_MIN = 24;
const HOURS_BEFORE_MAX = 26;

async function sendReminders() {
    console.log('Starting event reminder job...');
    console.log(`Looking for events between ${HOURS_BEFORE_MIN} and ${HOURS_BEFORE_MAX} hours from now`);

    try {
        // =======================================================================
        // Find events in the reminder window (with group info)
        // =======================================================================
        const eventsResult = await query(
            `SELECT
                e.id,
                e.title,
                e.location,
                e.date_time,
                e.group_id,
                g.name AS group_name
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             WHERE e.status = 'published'
             AND e.date_time > NOW() + INTERVAL '${HOURS_BEFORE_MIN} hours'
             AND e.date_time <= NOW() + INTERVAL '${HOURS_BEFORE_MAX} hours'`
        );

        console.log(`Found ${eventsResult.rows.length} events to queue reminders for`);

        if (eventsResult.rows.length === 0) {
            console.log('No events to remind about. Done.');
            return;
        }

        let totalEmailsQueued = 0;

        // =======================================================================
        // Process each event
        // =======================================================================
        for (const event of eventsResult.rows) {
            console.log(`\nProcessing event: ${event.title} (ID: ${event.id})`);

            // Create group object for email queue
            const group = { id: event.group_id, name: event.group_name };

            // Get attendee counts for host summary
            const countsResult = await query(
                `SELECT
                    COUNT(*) FILTER (WHERE status = 'attending') as attending,
                    COUNT(*) FILTER (WHERE status = 'waitlist') as waitlist
                 FROM event_rsvp
                 WHERE event_id = $1`,
                [event.id]
            );

            const attendeeSummary = {
                attending: parseInt(countsResult.rows[0].attending, 10),
                waitlist: parseInt(countsResult.rows[0].waitlist, 10)
            };

            // Get all event hosts
            const hostsResult = await query(
                'SELECT user_id FROM event_host WHERE event_id = $1',
                [event.id]
            );
            const hostUserIds = hostsResult.rows.map(h => h.user_id);

            // Get all attendees with their user info
            const attendeesResult = await query(
                `SELECT u.id, u.email, u.name, er.status
                 FROM event_rsvp er
                 JOIN app_user u ON er.user_id = u.id
                 WHERE er.event_id = $1
                 AND er.status IN ('attending', 'waitlist')`,
                [event.id]
            );

            console.log(`  - ${attendeesResult.rows.length} attendees to notify`);

            // Queue emails for each attendee
            for (const attendee of attendeesResult.rows) {
                const isHost = hostUserIds.includes(attendee.id);

                try {
                    await queueEventReminderEmail(
                        attendee.email,
                        attendee.name,
                        event,
                        group,
                        isHost,
                        isHost ? attendeeSummary : null
                    );
                    totalEmailsQueued++;
                    console.log(`  - Queued for ${attendee.email}${isHost ? ' (host)' : ''}`);
                } catch (err) {
                    console.error(`  - Failed to queue for ${attendee.email}:`, err.message);
                }
            }
        }

        console.log(`\n=== Reminder job complete ===`);
        console.log(`Total emails queued: ${totalEmailsQueued}`);
        console.log(`\nRun 'node scripts/process_email_queue.js' to send the queued emails.`);

    } catch (error) {
        console.error('Error in reminder job:', error);
        throw error;
    } finally {
        // Close the database connection pool
        await pool.end();
    }
}

// Run the script
sendReminders()
    .then(() => {
        console.log('Script finished successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Script failed:', err);
        process.exit(1);
    });
