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
async function sendEmail(to, subject, html, emailType, relatedId = null) {
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
        const { data, error } = await resend.emails.send({
            from: `${config.email.fromName} <${config.email.from}>`,
            to: actualRecipient,
            subject: actualSubject,
            html: html
        });

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
            Hi ${userName},
        </p>
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
            Hi ${userName},
        </p>
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

module.exports = {
    sendEmail,
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
    sendNewCommentEmail
};
