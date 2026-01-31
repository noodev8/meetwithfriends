/*
=======================================================================================================================================
Email Service
=======================================================================================================================================
Handles sending emails via Resend API.
- Test mode: @test.com emails redirected to test inbox
- Daily limit: 100 emails (Resend free plan)
- Logging: All sends logged to email_log table
=======================================================================================================================================
*/

const { Resend } = require('resend');
const config = require('../config/config');
const { query } = require('../database');

// Initialize Resend client
const resend = new Resend(config.email.resendApiKey);

// Test mode redirect email
const TEST_REDIRECT_EMAIL = 'aandreou25@gmail.com';
const DAILY_LIMIT = 100;

/*
=======================================================================================================================================
checkDailyLimit
=======================================================================================================================================
Returns true if we can still send emails today (under 100 limit)
=======================================================================================================================================
*/
async function checkDailyLimit() {
    try {
        const result = await query(
            `SELECT COUNT(*) as count FROM email_log
             WHERE sent_at > NOW() - INTERVAL '1 day'
             AND status = 'sent'`
        );
        return parseInt(result.rows[0].count, 10) < DAILY_LIMIT;
    } catch (error) {
        console.error('Error checking daily limit:', error);
        return true; // Allow sending if we can't check (fail open)
    }
}

/*
=======================================================================================================================================
logEmail
=======================================================================================================================================
Log email to database for tracking and debugging
=======================================================================================================================================
*/
async function logEmail(recipientEmail, emailType, subject, status, relatedId = null, errorMessage = null) {
    try {
        await query(
            `INSERT INTO email_log (recipient_email, email_type, subject, status, related_id, error_message)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [recipientEmail, emailType, subject, status, relatedId, errorMessage]
        );
    } catch (error) {
        console.error('Error logging email:', error);
    }
}

/*
=======================================================================================================================================
sendEmail
=======================================================================================================================================
Core email sending function with test mode and daily limit handling
Optional fromName parameter allows customizing sender (e.g., group name instead of "Meet With Friends")
=======================================================================================================================================
*/
async function sendEmail(to, subject, html, emailType, relatedId = null, replyTo = null, text = null, fromName = null) {
    const isTestEmail = to.toLowerCase().endsWith('@test.com');

    // Check daily limit for real emails
    if (!isTestEmail) {
        const canSend = await checkDailyLimit();
        if (!canSend) {
            console.log(`Daily email limit reached. Skipping email to ${to}`);
            await logEmail(to, emailType, subject, 'limit_reached', relatedId);
            return { success: false, error: 'Daily limit reached' };
        }
    }

    // Handle test mode - redirect to test inbox
    let actualRecipient = to;
    let actualSubject = subject;

    if (isTestEmail) {
        actualRecipient = TEST_REDIRECT_EMAIL;
        actualSubject = `[TEST: ${to}] ${subject}`;
        await logEmail(to, emailType, subject, 'intercepted', relatedId);
    }

    // Handle override mode - redirect certain emails to a specific address for testing
    // Critical emails (welcome, password reset, RSVP) always go to real recipients
    const criticalEmailTypes = [
        'welcome',
        'password_reset',
        'rsvp_confirmed',
        'promoted_from_waitlist',
        'joined_group'
    ];
    const canOverride = config.email.overrideRecipient &&
                        !isTestEmail &&
                        !criticalEmailTypes.includes(emailType);
    if (canOverride) {
        actualRecipient = config.email.overrideRecipient;
        actualSubject = `[TO: ${to}] ${subject}`;
    }

    try {
        // Use custom fromName if provided, otherwise use default
        const senderName = fromName || config.email.fromName;
        const emailOptions = {
            from: `${senderName} <${config.email.from}>`,
            to: actualRecipient,
            subject: actualSubject,
        };

        // Support both HTML and plain text emails
        if (text) {
            emailOptions.text = text;
        }
        if (html) {
            emailOptions.html = html;
        }

        // Add reply-to header if provided (Resend accepts array format)
        if (replyTo) {
            emailOptions.reply_to = [replyTo];
        }

        const { data, error } = await resend.emails.send(emailOptions);

        if (error) {
            console.error('Resend error:', error);
            if (!isTestEmail) {
                await logEmail(to, emailType, subject, 'failed', relatedId, error.message);
            }
            return { success: false, error };
        }

        // Log successful send (only for real emails, test already logged as intercepted)
        if (!isTestEmail) {
            await logEmail(to, emailType, subject, 'sent', relatedId);
        }

        return { success: true, data };
    } catch (error) {
        console.error('Email send error:', error);
        if (!isTestEmail) {
            await logEmail(to, emailType, subject, 'failed', relatedId, error.message);
        }
        return { success: false, error };
    }
}

/*
=======================================================================================================================================
queueEmail
=======================================================================================================================================
Add email to queue for later processing (used for bulk sends)
Options: { groupId, eventId, groupName, replyTo, text, scheduledFor, senderId, senderName }
=======================================================================================================================================
*/
async function queueEmail(to, recipientName, subject, html, emailType, options = {}) {
    const { groupId = null, eventId = null, groupName = null, replyTo = null, text = null, scheduledFor = null, senderId = null, senderName = null } = options;
    try {
        await query(
            `INSERT INTO email_queue
             (recipient_email, recipient_name, subject, html_content, text_content, email_type,
              group_id, event_id, group_name, reply_to, scheduled_for, sender_id, sender_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, NOW()), $12, $13)`,
            [to, recipientName, subject, html, text, emailType, groupId, eventId, groupName, replyTo, scheduledFor, senderId, senderName]
        );
        return { success: true, queued: true };
    } catch (error) {
        console.error('Error queueing email:', error);
        return { success: false, error: error.message };
    }
}

/*
=======================================================================================================================================
processEmailQueue
=======================================================================================================================================
Process pending emails from queue at 1/second rate
Returns: { processed, sent, failed }
=======================================================================================================================================
*/
async function processEmailQueue(limit = 50) {
    const stats = { processed: 0, sent: 0, failed: 0, skipped: 0, cancelled: 0 };

    try {
        // Get pending emails that are scheduled for now or earlier
        const result = await query(
            `SELECT * FROM email_queue
             WHERE status = 'pending'
             AND scheduled_for <= NOW()
             AND attempts < max_attempts
             ORDER BY created_at ASC
             LIMIT $1`,
            [limit]
        );

        const emails = result.rows;

        for (const email of emails) {
            stats.processed++;

            // Skip @test.com emails - mark as skipped without sending
            if (email.recipient_email.toLowerCase().endsWith('@test.com')) {
                await query(
                    `UPDATE email_queue SET status = 'skipped', sent_at = NOW() WHERE id = $1`,
                    [email.id]
                );
                stats.skipped++;
                continue;
            }

            // Cancel event_reminder emails if the event has already passed
            if (email.email_type === 'event_reminder' && email.event_id) {
                const eventCheck = await query(
                    `SELECT 1 FROM event_list WHERE id = $1 AND date_time > NOW()`,
                    [email.event_id]
                );
                if (eventCheck.rows.length === 0) {
                    await query(
                        `UPDATE email_queue SET status = 'cancelled', error_message = 'Event has already passed' WHERE id = $1`,
                        [email.id]
                    );
                    stats.cancelled++;
                    continue;
                }
            }

            // Build comment_digest content at send time
            if (email.email_type === 'comment_digest' && email.event_id) {
                // Find the last sent_at for a comment_digest to this recipient for this event
                const lastSent = await query(
                    `SELECT sent_at FROM email_queue
                     WHERE recipient_email = $1
                     AND event_id = $2
                     AND email_type = 'comment_digest'
                     AND status = 'sent'
                     ORDER BY sent_at DESC
                     LIMIT 1`,
                    [email.recipient_email, email.event_id]
                );
                const bookmark = lastSent.rows.length > 0 ? lastSent.rows[0].sent_at : null;

                // Query all comments posted after the bookmark (including recipient's own for context)
                const since = bookmark || email.created_at;
                const commentsResult = await query(
                    `SELECT ec.content, u.name
                     FROM event_comment ec
                     JOIN app_user u ON ec.user_id = u.id
                     WHERE ec.event_id = $1
                     AND ec.created_at > $2
                     ORDER BY ec.created_at ASC`,
                    [email.event_id, since]
                );

                if (commentsResult.rows.length === 0) {
                    await query(
                        `UPDATE email_queue SET status = 'cancelled', error_message = 'No new comments found' WHERE id = $1`,
                        [email.id]
                    );
                    stats.cancelled++;
                    continue;
                }

                // Get event title
                const eventResult = await query(
                    `SELECT title FROM event_list WHERE id = $1`,
                    [email.event_id]
                );
                const eventTitle = eventResult.rows[0]?.title || 'an event';

                // Build digest HTML
                const { subject, html } = buildCommentDigestHtml(
                    eventTitle,
                    email.event_id,
                    commentsResult.rows,
                    commentsResult.rows.length
                );

                // Update the queue record with built content
                await query(
                    `UPDATE email_queue SET subject = $1, html_content = $2 WHERE id = $3`,
                    [subject, html, email.id]
                );
                email.subject = subject;
                email.html_content = html;
            }

            // Send the email (use group_name as sender if available)
            const sendResult = await sendEmail(
                email.recipient_email,
                email.subject,
                email.html_content,
                email.email_type,
                email.event_id || email.group_id,  // For logging
                email.reply_to,
                email.text_content,
                email.group_name  // Custom sender name
            );

            if (sendResult.success) {
                // Mark as sent
                await query(
                    `UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
                    [email.id]
                );
                stats.sent++;
            } else {
                // Increment attempts, mark as failed if max reached
                const newAttempts = email.attempts + 1;
                const newStatus = newAttempts >= email.max_attempts ? 'failed' : 'pending';

                await query(
                    `UPDATE email_queue
                     SET attempts = $1, status = $2, error_message = $3
                     WHERE id = $4`,
                    [newAttempts, newStatus, sendResult.error?.message || 'Unknown error', email.id]
                );
                stats.failed++;
            }

            // Wait 1 second between sends (rate limit: 1/second to be safe)
            if (stats.processed < emails.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return { success: true, ...stats };
    } catch (error) {
        console.error('Error processing email queue:', error);
        return { success: false, error: error.message, ...stats };
    }
}

/*
=======================================================================================================================================
getQueueStats
=======================================================================================================================================
Get current queue statistics
=======================================================================================================================================
*/
async function getQueueStats() {
    try {
        const result = await query(`
            SELECT
                status,
                COUNT(*) as count
            FROM email_queue
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY status
        `);

        const stats = { pending: 0, sent: 0, failed: 0, cancelled: 0, skipped: 0 };
        result.rows.forEach(row => {
            if (Object.hasOwn(stats, row.status)) {
                stats[row.status] = parseInt(row.count, 10);
            }
        });

        return { success: true, stats };
    } catch (error) {
        console.error('Error getting queue stats:', error);
        return { success: false, error: error.message };
    }
}

/*
=======================================================================================================================================
Email Templates
=======================================================================================================================================
*/

// Base email wrapper with prominent branding
function wrapEmail(content) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header with branding -->
            <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
                <a href="${config.frontendUrl}" style="text-decoration: none;">
                    <span style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">Meet With Friends</span>
                </a>
            </div>

            <!-- Main content -->
            <div style="padding: 30px 20px;">
                ${content}
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
                    <strong>Meet With Friends</strong> - Your group events platform
                </p>
                <p style="color: #999; font-size: 12px; margin: 0 0 15px 0;">
                    <a href="${config.frontendUrl}" style="color: #4f46e5; text-decoration: none;">Visit meetwithfriends.app</a>
                    &nbsp;|&nbsp;
                    <a href="${config.frontendUrl}/profile" style="color: #4f46e5; text-decoration: none;">Manage preferences</a>
                </p>
                <!-- App Store Badges -->
                <p style="margin: 0;">
                    <a href="https://play.google.com/store/apps/details?id=com.noodev8.meetwithfriends" style="display: inline-block; margin: 0 5px; vertical-align: middle;">
                        <img src="${config.frontendUrl}/images/google-play-badge.png" alt="Get it on Google Play" style="height: 45px;" />
                    </a>
                    <a href="https://apps.apple.com/gb/app/id6757886965" style="display: inline-block; margin: 0 5px; vertical-align: middle;">
                        <img src="${config.frontendUrl}/images/app-store-badge.png" alt="Download on the App Store" style="height: 45px;" />
                    </a>
                </p>
            </div>
        </div>
    `;
}

// CTA button helper (prominent action button)
function emailButton(url, text) {
    return `
        <p style="margin: 25px 0;">
            <a href="${url}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">${text}</a>
        </p>
    `;
}

// Simple text link helper (for secondary actions)
function emailLink(url, text) {
    return `
        <p style="margin: 20px 0;">
            <a href="${url}" style="color: #4f46e5; text-decoration: none;">${text}</a>
        </p>
    `;
}

// Calendar download link helper (for event emails)
function calendarLink(eventId) {
    const calendarUrl = `${config.backendUrl}/api/events/${eventId}/calendar.ics`;
    return `
        <p style="margin: 15px 0 25px 0;">
            <a href="${calendarUrl}" style="color: #4f46e5; text-decoration: none; font-size: 14px;">📅 Add to Calendar</a>
        </p>
    `;
}

/*
=======================================================================================================================================
buildCommentDigestHtml
=======================================================================================================================================
Builds a Meetup-style digest email showing up to 4 comments, with "and N more..." if exceeded.
Returns { subject, html } for use by processEmailQueue.
=======================================================================================================================================
*/
function buildCommentDigestHtml(eventTitle, eventId, comments, totalCount) {
    const MAX_SHOWN = 4;
    const shown = comments.slice(0, MAX_SHOWN);

    let commentsHtml = shown.map(c => {
        const truncated = c.content.length > 200
            ? c.content.substring(0, 200) + '...'
            : c.content;
        return `
            <div style="background-color: #f8f9fa; padding: 12px 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #4f46e5;">
                <p style="color: #333; font-size: 14px; margin: 0 0 4px 0;"><strong>${c.name}</strong></p>
                <p style="color: #666; font-size: 15px; font-style: italic; margin: 0;">"${truncated}"</p>
            </div>
        `;
    }).join('');

    if (totalCount > MAX_SHOWN) {
        const moreCount = totalCount - MAX_SHOWN;
        commentsHtml += `
            <p style="color: #999; font-size: 14px; margin: 10px 0;">
                and ${moreCount} more comment${moreCount !== 1 ? 's' : ''}...
            </p>
        `;
    }

    const subject = `${totalCount} new comment${totalCount !== 1 ? 's' : ''} in ${eventTitle}`;

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">${subject}</h2>
        ${commentsHtml}
        ${emailButton(config.frontendUrl + '/events/' + eventId, 'Read and reply to comments')}
    `);

    return { subject, html };
}

/*
=======================================================================================================================================
sendWelcomeEmail
=======================================================================================================================================
Sent when a new user registers
=======================================================================================================================================
*/
async function sendWelcomeEmail(email, userName) {
    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">Welcome to Meet With Friends!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Thanks for joining! You're now ready to discover groups and events near you.
        </p>
        <p style="color: #666; font-size: 16px;">
            Start by joining a group or browsing upcoming events.
        </p>
        ${emailButton(config.frontendUrl + '/your-events', 'Go to Your Events')}
    `);

    return sendEmail(email, 'Welcome to Meet With Friends', html, 'welcome');
}

/*
=======================================================================================================================================
sendRsvpConfirmedEmail
=======================================================================================================================================
Sent when a user RSVPs to an event
=======================================================================================================================================
*/
async function sendRsvpConfirmedEmail(email, userName, event, group) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">You're going!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Your RSVP for <strong>${event.title}</strong> has been confirmed.
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; margin: 0;">
                <strong>${event.title}</strong><br>
                <span style="color: #666;">${eventDate} at ${eventTime}</span>${event.location ? `<br><span style="color: #666;">${event.location}</span>` : ''}
            </p>
        </div>
        ${calendarLink(event.id)}
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    return sendEmail(email, `RSVP confirmed: ${event.title}`, html, 'rsvp_confirmed', event.id, null, null, group?.name);
}

/*
=======================================================================================================================================
sendRemovedFromEventEmail
=======================================================================================================================================
Sent when a host/organiser removes or demotes a user from an event
=======================================================================================================================================
*/
async function sendRemovedFromEventEmail(email, userName, event, reason, group) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const reasonText = reason === 'demoted'
        ? 'You have been moved to the waitlist.'
        : 'You have been removed from the event.';

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">Event Update</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            ${reasonText}
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
        </div>
        <p style="color: #666; font-size: 16px;">
            If you have any questions, please contact the event host.
        </p>
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    return sendEmail(email, `Update: ${event.title}`, html, 'removed_from_event', event.id, null, null, group?.name);
}

/*
=======================================================================================================================================
sendPromotedFromWaitlistEmail
=======================================================================================================================================
Sent when a user is promoted from waitlist to attending
=======================================================================================================================================
*/
async function sendPromotedFromWaitlistEmail(email, userName, event, group) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <h2 style="color: #2e7d32; margin-top: 0;">Good news - you're in!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            A spot has opened up and you've been moved from the waitlist to attending!
        </p>
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
        </div>
        ${calendarLink(event.id)}
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    return sendEmail(email, `You're in: ${event.title}`, html, 'promoted_from_waitlist', event.id, null, null, group?.name);
}

/*
=======================================================================================================================================
sendEventCancelledEmail
=======================================================================================================================================
Sent to all attendees when an event is cancelled
=======================================================================================================================================
*/
async function sendEventCancelledEmail(email, userName, event) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <h2 style="color: #d32f2f; margin-top: 0;">Event Cancelled</h2>
        <p style="color: #666; font-size: 16px;">
            Unfortunately, the following event has been cancelled:
        </p>
        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px; text-decoration: line-through;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
        </div>
        <p style="color: #666; font-size: 16px;">
            If you have any questions, please contact the event host.
        </p>
    `);

    return sendEmail(email, `Cancelled: ${event.title}`, html, 'event_cancelled', event.id);
}

/*
=======================================================================================================================================
sendNewJoinRequestEmail
=======================================================================================================================================
Sent to host/organiser when someone requests to join a group
=======================================================================================================================================
*/
async function sendNewJoinRequestEmail(email, hostName, requesterName, group) {
    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">New Join Request</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${hostName},
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${requesterName}</strong> has requested to join <strong>${group.name}</strong>.
        </p>
        ${emailButton(config.frontendUrl + '/groups/' + group.id + '/members', 'Review Request')}
    `);

    return sendEmail(email, `New join request: ${group.name}`, html, 'new_join_request', group.id, null, null, group.name);
}

/*
=======================================================================================================================================
sendJoinedGroupEmail
=======================================================================================================================================
Sent when a user's join request is approved by host/organiser
=======================================================================================================================================
*/
async function sendJoinedGroupEmail(email, userName, group) {
    const html = wrapEmail(`
        <h2 style="color: #2e7d32; margin-top: 0;">Welcome to ${group.name}!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Your request to join <strong>${group.name}</strong> has been approved.
        </p>
        <p style="color: #666; font-size: 16px;">
            You can now see all members, RSVP to events, and join discussions.
        </p>
        ${emailButton(config.frontendUrl + '/groups/' + group.id, 'View Group')}
    `);

    return sendEmail(email, `Welcome to ${group.name}`, html, 'joined_group', group.id, null, null, group.name);
}

/*
=======================================================================================================================================
sendNewEventEmail
=======================================================================================================================================
Sent to group members when a new event is created
=======================================================================================================================================
*/
async function sendNewEventEmail(email, userName, event, group, hostName) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <p style="color: #666; font-size: 16px; text-align: center; margin-top: 0;">
            <a href="${config.frontendUrl}/groups/${group.id}" style="color: #4f46e5; text-decoration: none; font-weight: bold; font-size: 18px;">${group.name}</a> scheduled a new event
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
            <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">
                Hosted by ${hostName}
            </p>
        </div>
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Event & RSVP')}
    `);

    // Subject: "Group Name: New event - Event Title" (truncate title if needed)
    const maxTitleLength = 40;
    const truncatedTitle = event.title.length > maxTitleLength
        ? event.title.substring(0, maxTitleLength - 3) + '...'
        : event.title;
    const subject = `${group.name}: New event - ${truncatedTitle}`;

    return sendEmail(email, subject, html, 'new_event', event.id);
}

/*
=======================================================================================================================================
sendEventReminderEmail
=======================================================================================================================================
Sent 24 hours before an event to attendees (and host with summary)
=======================================================================================================================================
*/
async function sendEventReminderEmail(email, userName, event, isHost = false, attendeeSummary = null) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    let summarySection = '';
    if (isHost && attendeeSummary) {
        summarySection = `
            <div style="background-color: #e8f5e9; padding: 12px 15px; border-radius: 6px; margin: 15px 0;">
                <p style="color: #2e7d32; font-size: 14px; margin: 0;">
                    <strong>Host Summary:</strong> ${attendeeSummary.attending} attending${attendeeSummary.waitlist > 0 ? `, ${attendeeSummary.waitlist} on waitlist` : ''}
                </p>
            </div>
        `;
    }

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">Event Tomorrow!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Just a reminder that you have an event coming up tomorrow:
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
        </div>
        ${summarySection}
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    const subject = isHost ? `Tomorrow: ${event.title} (${attendeeSummary?.attending || 0} attending)` : `Reminder: ${event.title} is tomorrow`;
    return sendEmail(email, subject, html, 'event_reminder', event.id);
}

/*
=======================================================================================================================================
sendPromotedToHostEmail
=======================================================================================================================================
Sent when an organiser promotes a member to host
=======================================================================================================================================
*/
async function sendPromotedToHostEmail(email, userName, group) {
    const html = wrapEmail(`
        <h2 style="color: #2e7d32; margin-top: 0;">You're now a host!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Great news! You've been promoted to <strong>host</strong> in <strong>${group.name}</strong>.
        </p>
        <p style="color: #666; font-size: 16px;">
            As a host, you can now:
        </p>
        <ul style="color: #666; font-size: 16px;">
            <li>Create and manage events</li>
            <li>Manage RSVPs and attendees</li>
            <li>Approve new member requests</li>
        </ul>
        ${emailButton(config.frontendUrl + '/groups/' + group.id, 'View Group')}
    `);

    return sendEmail(email, `You're now a host in ${group.name}`, html, 'promoted_to_host', group.id, null, null, group.name);
}

/*
=======================================================================================================================================
sendPasswordResetEmail (existing - kept for compatibility)
=======================================================================================================================================
Sends a password reset email with a link to reset the password.
=======================================================================================================================================
*/
async function sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #666; font-size: 16px;">
            You requested to reset your password for your Meet With Friends account.
        </p>
        <p style="color: #666; font-size: 16px;">
            Click the button below to set a new password. This link will expire in 1 hour.
        </p>
        ${emailButton(resetUrl, 'Reset Password')}
        <p style="color: #999; font-size: 14px;">
            If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a>
        </p>
    `);

    return sendEmail(email, 'Reset Your Password', html, 'password_reset');
}

/*
=======================================================================================================================================
sendNewRsvpEmail
=======================================================================================================================================
Sent to event host when a member RSVPs to their event
=======================================================================================================================================
*/
async function sendNewRsvpEmail(email, hostName, memberName, event, group, attendeeCount) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const capacityText = event.capacity
        ? `${attendeeCount} / ${event.capacity} spots filled`
        : `${attendeeCount} attending`;

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">New RSVP for ${event.title}</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${hostName},
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${memberName}</strong> is going to your event.
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; margin: 0 0 10px 0;">
                <strong>${event.title}</strong>
            </p>
            <p style="color: #666; font-size: 14px; margin: 0;">
                ${eventDate} at ${eventTime}
            </p>
            <p style="color: #4f46e5; font-size: 14px; margin: 10px 0 0 0;">
                ${capacityText}
            </p>
        </div>
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    return sendEmail(email, `New RSVP: ${memberName} is going to ${event.title}`, html, 'new_rsvp', event.id, null, null, group.name);
}

/*
=======================================================================================================================================
sendNewMemberEmail
=======================================================================================================================================
Sent to organiser when a new member joins their group (auto-join or after approval)
=======================================================================================================================================
*/
async function sendNewMemberEmail(email, organiserName, newMemberName, group, totalMembers) {
    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">New member in ${group.name}!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${organiserName},
        </p>
        <p style="color: #666; font-size: 16px;">
            1 new member joined your group. You now have ${totalMembers} member${totalMembers !== 1 ? 's' : ''}!
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #4f46e5; font-size: 16px; font-weight: bold; margin: 0;">
                ${newMemberName}
            </p>
        </div>
        ${emailButton(config.frontendUrl + '/groups/' + group.id + '/members', 'View Members')}
    `);

    return sendEmail(email, `New member joined ${group.name}`, html, 'new_member', group.id);
}

/*
=======================================================================================================================================
sendNewCommentEmail
=======================================================================================================================================
Sent to attendees and waitlist when someone posts a comment on the event
=======================================================================================================================================
*/
async function sendNewCommentEmail(email, userName, event, commenterName, commentContent) {
    // Truncate comment if too long
    const maxLength = 200;
    const truncatedComment = commentContent.length > maxLength
        ? commentContent.substring(0, maxLength) + '...'
        : commentContent;

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">New comment on ${event.title}</h2>
        <p style="color: #666; font-size: 16px;">
            <strong>${commenterName}</strong> commented:
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4f46e5;">
            <p style="color: #666; font-size: 16px; font-style: italic; margin: 0;">
                "${truncatedComment}"
            </p>
        </div>
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Conversation')}
    `);

    return sendEmail(email, `New comment on ${event.title}`, html, 'new_comment', event.id);
}

/*
=======================================================================================================================================
sendContactOrganiserEmail
=======================================================================================================================================
Sent to group organiser when a member contacts them via the group page.
Plain text format with sender email visible for easy reply.
=======================================================================================================================================
*/
async function sendContactOrganiserEmail(email, organiserName, senderName, senderEmail, group, message) {
    const text = `Hi ${organiserName},

You've received a message from ${senderName} regarding ${group.name}.

From: ${senderName}
Email: ${senderEmail}

Message:
${message}

---
View group: ${config.frontendUrl}/groups/${group.id}

Note: You cannot reply directly to this email. Copy the email address above to send them a message.`;

    return sendEmail(email, `Message from ${senderName} about ${group.name}`, null, 'contact_organiser', group.id, senderEmail, text);
}

/*
=======================================================================================================================================
sendContactHostEmail
=======================================================================================================================================
Sent to event host(s) when an attendee contacts them via the event page.
Plain text format with sender email visible for easy reply.
=======================================================================================================================================
*/
async function sendContactHostEmail(email, hostName, senderName, senderEmail, event, message) {
    const text = `Hi ${hostName},

You've received a message from ${senderName} regarding ${event.title}.

From: ${senderName}
Email: ${senderEmail}

Message:
${message}

---
View event: ${config.frontendUrl}/events/${event.id}

Note: You cannot reply directly to this email. Copy the email address above to send them a message.`;

    return sendEmail(email, `Message from ${senderName} about ${event.title}`, null, 'contact_host', event.id, senderEmail, text);
}

/*
=======================================================================================================================================
sendContactSupportEmail
=======================================================================================================================================
Sent to support when someone submits the contact form
=======================================================================================================================================
*/
async function sendContactSupportEmail(senderName, senderEmail, message) {
    // Plain text email for support - no fancy formatting
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <p>From: ${senderName} (${senderEmail})</p>
            <p>Message:</p>
            <p style="white-space: pre-wrap;">${message}</p>
        </div>
    `;

    return sendEmail('noodev8@gmail.com', `Support: ${senderName}`, html, 'contact_support', null, senderEmail);
}

/*
=======================================================================================================================================
sendBroadcastEmail
=======================================================================================================================================
Sent to group members when the organiser sends a broadcast message.
Plain text, no reply-to (one-way communication).
=======================================================================================================================================
*/
async function sendBroadcastEmail(email, memberName, organiserName, group, message) {
    const text = `Hi ${memberName},

${organiserName} sent a message to all members of ${group.name}:

${message}

---
View group: ${config.frontendUrl}/groups/${group.id}

You received this because you're a member of ${group.name}. To stop receiving broadcasts, update your preferences in your profile settings.`;

    return sendEmail(email, `Message from ${group.name}`, null, 'broadcast', group.id, null, text);
}

/*
=======================================================================================================================================
QUEUE VERSIONS - For bulk sends that need rate limiting
=======================================================================================================================================
*/

/*
=======================================================================================================================================
queueNewEventEmail
=======================================================================================================================================
Queue new event notification for later processing
=======================================================================================================================================
*/
async function queueNewEventEmail(email, userName, event, group, hostName) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <p style="color: #666; font-size: 16px; text-align: center; margin-top: 0;">
            <a href="${config.frontendUrl}/groups/${group.id}" style="color: #4f46e5; text-decoration: none; font-weight: bold; font-size: 18px;">${group.name}</a> scheduled a new event
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
            <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">
                Hosted by ${hostName}
            </p>
        </div>
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Event & RSVP')}
    `);

    // Subject: "New event - Event Title" (sender shows as group name)
    const maxTitleLength = 50;
    const truncatedTitle = event.title.length > maxTitleLength
        ? event.title.substring(0, maxTitleLength - 3) + '...'
        : event.title;
    const subject = `New event - ${truncatedTitle}`;

    return queueEmail(email, userName, subject, html, 'new_event', {
        groupId: group.id,
        eventId: event.id,
        groupName: group.name
    });
}

/*
=======================================================================================================================================
queueEventCancelledEmail
=======================================================================================================================================
Queue event cancelled notification for later processing
=======================================================================================================================================
*/
async function queueEventCancelledEmail(email, userName, event, group) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <h2 style="color: #d32f2f; margin-top: 0;">Event Cancelled</h2>
        <p style="color: #666; font-size: 16px;">
            Unfortunately, the following event has been cancelled:
        </p>
        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px; text-decoration: line-through;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
        </div>
        <p style="color: #666; font-size: 16px;">
            If you have any questions, please contact the event host.
        </p>
    `);

    return queueEmail(email, userName, `Cancelled: ${event.title}`, html, 'event_cancelled', {
        groupId: group.id,
        eventId: event.id,
        groupName: group.name
    });
}

/*
=======================================================================================================================================
queueBroadcastEmail
=======================================================================================================================================
Queue broadcast message for later processing
=======================================================================================================================================
*/
async function queueBroadcastEmail(email, memberName, organiserName, group, message) {
    // Auto-link URLs in the message
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const linkedMessage = message.replace(urlRegex, '<a href="$1" style="color: #4f46e5;">$1</a>');

    // Convert newlines to <br> for HTML
    const htmlMessage = linkedMessage.replace(/\n/g, '<br>');

    const html = wrapEmail(`
        <p style="color: #666; font-size: 16px; margin-top: 0;">
            Hi ${memberName},
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${organiserName}</strong> sent a message to all members of <a href="${config.frontendUrl}/groups/${group.id}" style="color: #4f46e5; text-decoration: none;">${group.name}</a>:
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            <p style="color: #333; font-size: 16px; margin: 0; line-height: 1.6;">
                ${htmlMessage}
            </p>
        </div>
        ${emailButton(config.frontendUrl + '/groups/' + group.id, 'View Group')}
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
            You received this because you're a member of ${group.name}. To stop receiving broadcasts, update your preferences in your profile settings.
        </p>
    `);

    const text = `Hi ${memberName},

${organiserName} sent a message to all members of ${group.name}:

${message}

---
View group: ${config.frontendUrl}/groups/${group.id}

You received this because you're a member of ${group.name}. To stop receiving broadcasts, update your preferences in your profile settings.`;

    return queueEmail(email, memberName, `Message from ${organiserName}`, html, 'broadcast', {
        groupId: group.id,
        groupName: group.name,
        text: text
    });
}

/*
=======================================================================================================================================
queueEventReminderEmail
=======================================================================================================================================
Queue event reminder for later processing
=======================================================================================================================================
*/
async function queueEventReminderEmail(email, userName, event, group, isHost = false, attendeeSummary = null, foodOrder = null) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    let summarySection = '';
    if (isHost && attendeeSummary) {
        summarySection = `
            <div style="background-color: #e8f5e9; padding: 12px 15px; border-radius: 6px; margin: 15px 0;">
                <p style="color: #2e7d32; font-size: 14px; margin: 0;">
                    <strong>Host Summary:</strong> ${attendeeSummary.attending} attending${attendeeSummary.waitlist > 0 ? `, ${attendeeSummary.waitlist} on waitlist` : ''}
                </p>
            </div>
        `;
    }

    let foodOrderSection = '';
    if (foodOrder) {
        foodOrderSection = `
            <div style="background-color: #fff3e0; padding: 12px 15px; border-radius: 6px; margin: 15px 0;">
                <p style="color: #e65100; font-size: 14px; margin: 0;">
                    <strong>Your Pre-order:</strong> ${foodOrder}
                </p>
            </div>
        `;
    }

    const html = wrapEmail(`
        <h2 style="color: #333; margin-top: 0;">Event Tomorrow!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Just a reminder that you have an event coming up tomorrow:
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">${event.title}</h3>
            <p style="color: #666; font-size: 15px; margin: 0;">
                ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
            </p>
        </div>
        ${summarySection}
        ${foodOrderSection}
        ${emailButton(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    const subject = isHost ? `Tomorrow: ${event.title} (${attendeeSummary?.attending || 0} attending)` : `Reminder: ${event.title} is tomorrow`;
    return queueEmail(email, userName, subject, html, 'event_reminder', {
        groupId: group.id,
        eventId: event.id,
        groupName: group.name
    });
}

/*
=======================================================================================================================================
queueNewCommentEmail
=======================================================================================================================================
Ensures a digest email is pending for this recipient + event.
If one already exists, does nothing (the existing digest will pick up all new comments at send time).
If not, queues a comment_digest record scheduled for NOW() + configured digest window (default 15 min).
No HTML is stored — content is built at send time by processEmailQueue.
=======================================================================================================================================
*/
async function queueNewCommentEmail(email, userName, event, group, commenterId) {
    // Check if a pending comment_digest already exists for this recipient + event
    const pendingCheck = await query(
        `SELECT 1 FROM email_queue
         WHERE recipient_email = $1
         AND event_id = $2
         AND email_type = 'comment_digest'
         AND status = 'pending'
         LIMIT 1`,
        [email, event.id]
    );

    if (pendingCheck.rows.length > 0) {
        return { success: true, digestPending: true };
    }

    // Insert a digest queue record with no HTML (built at send time)
    const digestMinutes = config.email.commentDigestMinutes;
    const scheduledFor = `NOW() + INTERVAL '${digestMinutes} minutes'`;

    try {
        await query(
            `INSERT INTO email_queue
             (recipient_email, recipient_name, subject, html_content, email_type,
              group_id, event_id, group_name, scheduled_for, sender_id)
             VALUES ($1, $2, '', NULL, 'comment_digest', $3, $4, $5, ${scheduledFor}, $6)`,
            [email, userName, group.id, event.id, group.name, commenterId]
        );
        return { success: true, queued: true };
    } catch (error) {
        console.error('Error queueing comment digest:', error);
        return { success: false, error: error.message };
    }
}

/*
=======================================================================================================================================
notifyOrganisersOfNewMember
=======================================================================================================================================
Fetches organisers and sends sendNewMemberEmail to each. Used by magic link accept routes
where the organiser notification is not part of the join flow.
=======================================================================================================================================
*/
async function notifyOrganisersOfNewMember(groupId, userId) {
    try {
        const groupResult = await query('SELECT id, name FROM group_list WHERE id = $1', [groupId]);
        if (groupResult.rows.length === 0) return;
        const group = groupResult.rows[0];

        const userResult = await query('SELECT name FROM app_user WHERE id = $1', [userId]);
        const memberName = userResult.rows[0]?.name || 'A user';

        const organisersResult = await query(
            `SELECT u.email, u.name
             FROM group_member gm
             JOIN app_user u ON gm.user_id = u.id
             WHERE gm.group_id = $1
             AND gm.status = 'active'
             AND gm.role = 'organiser'`,
            [groupId]
        );

        const countResult = await query(
            `SELECT COUNT(*) as count FROM group_member WHERE group_id = $1 AND status = 'active'`,
            [groupId]
        );
        const totalMembers = parseInt(countResult.rows[0].count, 10);

        organisersResult.rows.forEach(organiser => {
            sendNewMemberEmail(organiser.email, organiser.name, memberName, group, totalMembers).catch(err => {
                console.error('Failed to send new member email:', err);
            });
        });
    } catch (err) {
        console.error('Failed to notify organisers of new member:', err);
    }
}

module.exports = {
    // Core functions
    sendEmail,
    queueEmail,
    processEmailQueue,
    getQueueStats,
    // Immediate send functions (single recipient)
    sendWelcomeEmail,
    sendRsvpConfirmedEmail,
    sendRemovedFromEventEmail,
    sendPromotedFromWaitlistEmail,
    sendEventCancelledEmail,
    sendNewJoinRequestEmail,
    sendJoinedGroupEmail,
    sendNewEventEmail,
    sendEventReminderEmail,
    sendPasswordResetEmail,
    sendPromotedToHostEmail,
    sendNewMemberEmail,
    notifyOrganisersOfNewMember,
    sendNewRsvpEmail,
    sendNewCommentEmail,
    sendContactOrganiserEmail,
    sendContactHostEmail,
    sendContactSupportEmail,
    sendBroadcastEmail,
    // Queue functions (bulk sends)
    queueNewEventEmail,
    queueEventCancelledEmail,
    queueBroadcastEmail,
    queueEventReminderEmail,
    queueNewCommentEmail
};
