/*
=======================================================================================================================================
Script: send_reminders
=======================================================================================================================================
Purpose: Queues event reminder emails for events happening within the next 48 hours.
Usage: Run manually or via cron job (e.g., daily at 9am)

   node scripts/send_reminders.js

This script:
1. Finds events in the next 48 hours that haven't had reminders sent yet (checks email_log)
2. Queues reminder emails to confirmed attendees only (status='attending')
3. Respects user's receive_broadcasts preference
4. Includes food pre-order if user has one
5. Hosts receive a version with attendee summary
6. Run process_email_queue.js after to actually send the emails
=======================================================================================================================================
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query, pool } = require('../database');
const { queueEventReminderEmail } = require('../services/email');

// Time window: events in the next 48 hours (allows for late scheduler runs)
const HOURS_AHEAD = 48;

async function sendReminders() {
    console.log('Starting event reminder job...');
    console.log(`Looking for events in the next ${HOURS_AHEAD} hours that haven't been reminded yet`);

    try {
        // =======================================================================
        // Find events in the next 48 hours that haven't had reminders sent yet
        // Uses email_log to check if reminder was already sent (handles late scheduler runs)
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
               AND e.date_time > NOW()
               AND e.date_time <= NOW() + INTERVAL '${HOURS_AHEAD} hours'
               AND NOT EXISTS (
                   SELECT 1 FROM email_log
                   WHERE email_type = 'event_reminder'
                     AND related_id = e.id
               )`
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

            // Get confirmed attendees who have broadcasts enabled, with their food pre-order
            const attendeesResult = await query(
                `SELECT u.id, u.email, u.name, er.food_order, er.dietary_notes
                 FROM event_rsvp er
                 JOIN app_user u ON er.user_id = u.id
                 WHERE er.event_id = $1
                   AND er.status = 'attending'
                   AND u.receive_broadcasts = true`,
                [event.id]
            );

            console.log(`  - ${attendeesResult.rows.length} confirmed attendees to notify (with broadcasts enabled)`);

            // Queue emails for each attendee
            for (const attendee of attendeesResult.rows) {
                const isHost = hostUserIds.includes(attendee.id);
                const foodOrder = attendee.food_order || null;

                try {
                    await queueEventReminderEmail(
                        attendee.email,
                        attendee.name,
                        event,
                        group,
                        isHost,
                        attendeeSummary,
                        foodOrder
                    );
                    totalEmailsQueued++;
                    const extras = [
                        isHost ? 'host' : null,
                        foodOrder ? 'has pre-order' : null
                    ].filter(Boolean).join(', ');
                    console.log(`  - Queued for ${attendee.email}${extras ? ` (${extras})` : ''}`);
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
