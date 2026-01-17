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
=======================================================================================================================================
*/
async function sendEmail(to, subject, html, emailType, relatedId = null, replyTo = null, text = null) {
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

    try {
        const emailOptions = {
            from: `${config.email.fromName} <${config.email.from}>`,
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
=======================================================================================================================================
*/
async function queueEmail(to, subject, html, emailType, relatedId = null, replyTo = null, text = null, scheduledFor = null) {
    try {
        await query(
            `INSERT INTO email_queue
             (recipient_email, subject, html_content, text_content, email_type, related_id, reply_to, scheduled_for)
             VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))`,
            [to, subject, html, text, emailType, relatedId, replyTo, scheduledFor]
        );
        return { success: true, queued: true };
    } catch (error) {
        console.error('Error queueing email:', error);
        return { success: false, error: error.message };
    }
}

/*
=======================================================================================================================================
queueEmailWithName
=======================================================================================================================================
Queue email with recipient name (for display purposes)
=======================================================================================================================================
*/
async function queueEmailWithName(to, recipientName, subject, html, emailType, relatedId = null, replyTo = null, text = null) {
    try {
        await query(
            `INSERT INTO email_queue
             (recipient_email, recipient_name, subject, html_content, text_content, email_type, related_id, reply_to)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [to, recipientName, subject, html, text, emailType, relatedId, replyTo]
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
    const stats = { processed: 0, sent: 0, failed: 0, skipped: 0 };

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

            // Send the email
            const sendResult = await sendEmail(
                email.recipient_email,
                email.subject,
                email.html_content,
                email.email_type,
                email.related_id,
                email.reply_to,
                email.text_content
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
            if (stats.hasOwnProperty(row.status)) {
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

// Base email wrapper
function wrapEmail(content) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${content}
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                Meet With Friends<br>
                <a href="${config.frontendUrl}" style="color: #666;">Visit our website</a>
            </p>
        </div>
    `;
}

// Simple text link helper
function emailLink(url, text) {
    return `
        <p style="margin: 20px 0;">
            <a href="${url}" style="color: #4f46e5;">${text}</a>
        </p>
    `;
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
        <h2 style="color: #333;">Welcome to Meet With Friends!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Thanks for joining! You're now ready to discover groups and events near you.
        </p>
        <p style="color: #666; font-size: 16px;">
            Start by joining a group or browsing upcoming events.
        </p>
        ${emailLink(config.frontendUrl + '/dashboard', 'Go to Dashboard')}
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
async function sendRsvpConfirmedEmail(email, userName, event) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <h2 style="color: #333;">You're going!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Your RSVP for <strong>${event.title}</strong> has been confirmed.
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    return sendEmail(email, `RSVP confirmed: ${event.title}`, html, 'rsvp_confirmed', event.id);
}

/*
=======================================================================================================================================
sendRemovedFromEventEmail
=======================================================================================================================================
Sent when a host/organiser removes or demotes a user from an event
=======================================================================================================================================
*/
async function sendRemovedFromEventEmail(email, userName, event, reason) {
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
        <h2 style="color: #333;">Event Update</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            ${reasonText}
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        <p style="color: #666; font-size: 16px;">
            If you have any questions, please contact the event host.
        </p>
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    return sendEmail(email, `Update: ${event.title}`, html, 'removed_from_event', event.id);
}

/*
=======================================================================================================================================
sendPromotedFromWaitlistEmail
=======================================================================================================================================
Sent when a user is promoted from waitlist to attending
=======================================================================================================================================
*/
async function sendPromotedFromWaitlistEmail(email, userName, event) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <h2 style="color: #333;">Good news - you're in!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            A spot has opened up and you've been moved from the waitlist to attending!
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    return sendEmail(email, `You're in: ${event.title}`, html, 'promoted_from_waitlist', event.id);
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
        <h2 style="color: #333;">Event Cancelled</h2>
        <p style="color: #666; font-size: 16px;">
            Unfortunately, the following event has been cancelled:
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
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
        <h2 style="color: #333;">New Join Request</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${hostName},
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${requesterName}</strong> has requested to join <strong>${group.name}</strong>.
        </p>
        ${emailLink(config.frontendUrl + '/groups/' + group.id + '/members', 'Review Request')}
    `);

    return sendEmail(email, `New join request: ${group.name}`, html, 'new_join_request', group.id);
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
        <h2 style="color: #333;">Welcome to ${group.name}!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Your request to join <strong>${group.name}</strong> has been approved.
        </p>
        <p style="color: #666; font-size: 16px;">
            You can now see all members, RSVP to events, and join discussions.
        </p>
        ${emailLink(config.frontendUrl + '/groups/' + group.id, 'View Group')}
    `);

    return sendEmail(email, `Welcome to ${group.name}`, html, 'joined_group', group.id);
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
        <h2 style="color: #333;">New Event in ${group.name}</h2>
        <p style="color: #666; font-size: 16px;">
            <strong>${hostName}</strong> has created a new event:
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event & RSVP')}
    `);

    return sendEmail(email, `New event: ${event.title}`, html, 'new_event', event.id);
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
            <p style="color: #666; font-size: 16px;">
                <strong>Attendee Summary:</strong> ${attendeeSummary.attending} attending${attendeeSummary.waitlist > 0 ? `, ${attendeeSummary.waitlist} on waitlist` : ''}
            </p>
        `;
    }

    const html = wrapEmail(`
        <h2 style="color: #333;">Event Tomorrow!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Just a reminder that you have an event coming up tomorrow:
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        ${summarySection}
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    const subject = isHost ? `Tomorrow: ${event.title} (${attendeeSummary?.attending || 0} attending)` : `Reminder: ${event.title} is tomorrow`;
    return sendEmail(email, subject, html, 'event_reminder', event.id);
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
        <h2 style="color: #333;">Reset Your Password</h2>
        <p style="color: #666; font-size: 16px;">
            You requested to reset your password for your Meet With Friends account.
        </p>
        <p style="color: #666; font-size: 16px;">
            Click the link below to set a new password. This link will expire in 1 hour.
        </p>
        ${emailLink(resetUrl, 'Reset Password')}
        <p style="color: #999; font-size: 14px;">
            If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #999; font-size: 12px;">
            If the link doesn't work, copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #666;">${resetUrl}</a>
        </p>
    `);

    return sendEmail(email, 'Reset Your Password', html, 'password_reset');
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
        <h2 style="color: #333;">New comment on ${event.title}</h2>
        <p style="color: #666; font-size: 16px;">
            <strong>${commenterName}</strong> commented:
        </p>
        <p style="color: #666; font-size: 16px; font-style: italic;">
            "${truncatedComment}"
        </p>
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Conversation')}
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
        <h2 style="color: #333;">New Event in ${group.name}</h2>
        <p style="color: #666; font-size: 16px;">
            <strong>${hostName}</strong> has created a new event:
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event & RSVP')}
    `);

    return queueEmailWithName(email, userName, `New event: ${event.title}`, html, 'new_event', event.id);
}

/*
=======================================================================================================================================
queueEventCancelledEmail
=======================================================================================================================================
Queue event cancelled notification for later processing
=======================================================================================================================================
*/
async function queueEventCancelledEmail(email, userName, event) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    const html = wrapEmail(`
        <h2 style="color: #333;">Event Cancelled</h2>
        <p style="color: #666; font-size: 16px;">
            Unfortunately, the following event has been cancelled:
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        <p style="color: #666; font-size: 16px;">
            If you have any questions, please contact the event host.
        </p>
    `);

    return queueEmailWithName(email, userName, `Cancelled: ${event.title}`, html, 'event_cancelled', event.id);
}

/*
=======================================================================================================================================
queueBroadcastEmail
=======================================================================================================================================
Queue broadcast message for later processing
=======================================================================================================================================
*/
async function queueBroadcastEmail(email, memberName, organiserName, group, message) {
    const text = `Hi ${memberName},

${organiserName} sent a message to all members of ${group.name}:

${message}

---
View group: ${config.frontendUrl}/groups/${group.id}

You received this because you're a member of ${group.name}. To stop receiving broadcasts, update your preferences in your profile settings.`;

    return queueEmailWithName(email, memberName, `Message from ${group.name}`, null, 'broadcast', group.id, null, text);
}

/*
=======================================================================================================================================
queueEventReminderEmail
=======================================================================================================================================
Queue event reminder for later processing
=======================================================================================================================================
*/
async function queueEventReminderEmail(email, userName, event, isHost = false, attendeeSummary = null) {
    const eventDate = new Date(event.date_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const eventTime = new Date(event.date_time).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    let summarySection = '';
    if (isHost && attendeeSummary) {
        summarySection = `
            <p style="color: #666; font-size: 16px;">
                <strong>Attendee Summary:</strong> ${attendeeSummary.attending} attending${attendeeSummary.waitlist > 0 ? `, ${attendeeSummary.waitlist} on waitlist` : ''}
            </p>
        `;
    }

    const html = wrapEmail(`
        <h2 style="color: #333;">Event Tomorrow!</h2>
        <p style="color: #666; font-size: 16px;">
            Hi ${userName},
        </p>
        <p style="color: #666; font-size: 16px;">
            Just a reminder that you have an event coming up tomorrow:
        </p>
        <p style="color: #666; font-size: 16px;">
            <strong>${event.title}</strong><br>
            ${eventDate} at ${eventTime}${event.location ? `<br>${event.location}` : ''}
        </p>
        ${summarySection}
        ${emailLink(config.frontendUrl + '/events/' + event.id, 'View Event')}
    `);

    const subject = isHost ? `Tomorrow: ${event.title} (${attendeeSummary?.attending || 0} attending)` : `Reminder: ${event.title} is tomorrow`;
    return queueEmailWithName(email, userName, subject, html, 'event_reminder', event.id);
}

module.exports = {
    // Core functions
    sendEmail,
    queueEmail,
    queueEmailWithName,
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
    sendNewCommentEmail,
    sendContactOrganiserEmail,
    sendContactHostEmail,
    sendContactSupportEmail,
    sendBroadcastEmail,
    // Queue functions (bulk sends)
    queueNewEventEmail,
    queueEventCancelledEmail,
    queueBroadcastEmail,
    queueEventReminderEmail
};
