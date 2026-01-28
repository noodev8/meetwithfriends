/*
=======================================================================================================================================
API Route: accept_invite_with_signup
=======================================================================================================================================
Method: POST
Purpose: Creates a new user account AND accepts a magic invite in one step.
         - Creates the user account
         - Joins the group (bypasses approval policy)
         - For event invites: also RSVPs to the event
         - Returns JWT token for immediate login
=======================================================================================================================================
Request: POST /api/invite/accept-with-signup/:token

Request Payload:
{
  "name": "John Smith",                    // string, required
  "email": "john@example.com",             // string, required
  "password": "securepassword123",         // string, required, min 8 characters
  "avatar_url": "https://..."              // string, optional (required if group has require_profile_image=true)
}

Success Response:
{
  "return_code": "SUCCESS",
  "token": "jwt_token_here",
  "user": {
    "id": 789,
    "name": "John Smith",
    "email": "john@example.com"
  },
  "actions": {
    "joined_group": true,
    "rsvp_status": "attending"            // "attending", "waitlist", or null
  },
  "redirect_to": "/events/123"            // or "/groups/456"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_EMAIL"
"INVALID_PASSWORD" - Password must be at least 8 characters
"EMAIL_EXISTS" - An account with this email already exists
"INVITE_NOT_FOUND"
"INVITE_EXPIRED"
"INVITE_LIMIT_REACHED"
"INVITE_DISABLED"
"EVENT_ENDED"
"EVENT_CANCELLED"
"PROFILE_IMAGE_REQUIRED" - Group requires profile image but avatar_url not provided
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { withTransaction } = require('../../utils/transaction');
const config = require('../../config/config');
const { sendWelcomeEmail } = require('../../services/email');
const { logAudit, AuditAction } = require('../../services/audit');

router.post('/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { name, email, password, avatar_url } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!name || !email || !password) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Name, email, and password are required'
            });
        }

        // =======================================================================
        // Validate email format
        // =======================================================================
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.json({
                return_code: 'INVALID_EMAIL',
                message: 'Please provide a valid email address'
            });
        }

        // =======================================================================
        // Validate password length
        // =======================================================================
        if (password.length < 8) {
            return res.json({
                return_code: 'INVALID_PASSWORD',
                message: 'Password must be at least 8 characters'
            });
        }

        // =======================================================================
        // Validate token format
        // =======================================================================
        if (!token || token.length !== 16 || !/^[a-f0-9]+$/i.test(token)) {
            return res.json({
                return_code: 'INVITE_NOT_FOUND',
                message: 'Invalid invitation link'
            });
        }

        // =======================================================================
        // Use transaction for atomic operations
        // =======================================================================
        const result = await withTransaction(async (client) => {
            // ===================================================================
            // Check if email already exists
            // ===================================================================
            const existingUser = await client.query(
                'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return {
                    return_code: 'EMAIL_EXISTS',
                    message: 'An account with this email already exists'
                };
            }

            // ===================================================================
            // Look up token in group_list first
            // ===================================================================
            const groupResult = await client.query(
                `SELECT
                    g.id, g.name, g.require_profile_image,
                    g.magic_link_token, g.magic_link_expires_at, g.magic_link_active,
                    g.magic_link_use_count, g.magic_link_max_uses
                 FROM group_list g
                 WHERE g.magic_link_token = $1
                 FOR UPDATE`,
                [token]
            );

            // ===================================================================
            // Process as GROUP invite
            // ===================================================================
            if (groupResult.rows.length > 0) {
                const group = groupResult.rows[0];

                // Validate link status
                const validation = validateMagicLink(group);
                if (!validation.valid) {
                    return validation;
                }

                // Check if profile image is required
                if (group.require_profile_image) {
                    if (!avatar_url || avatar_url.trim() === '') {
                        return {
                            return_code: 'PROFILE_IMAGE_REQUIRED',
                            message: 'This group requires members to have a profile image'
                        };
                    }
                }

                // Create user
                const user = await createUser(client, { name, email, password, avatar_url });

                // Join group
                await client.query(
                    `INSERT INTO group_member (group_id, user_id, role, status)
                     VALUES ($1, $2, 'member', 'active')`,
                    [group.id, user.id]
                );

                // Increment use count
                await client.query(
                    'UPDATE group_list SET magic_link_use_count = magic_link_use_count + 1 WHERE id = $1',
                    [group.id]
                );

                return {
                    return_code: 'SUCCESS',
                    user,
                    actions: {
                        joined_group: true,
                        rsvp_status: null
                    },
                    redirect_to: `/groups/${group.id}`
                };
            }

            // ===================================================================
            // Look up token in event_list
            // ===================================================================
            const eventResult = await client.query(
                `SELECT
                    e.id, e.title, e.date_time, e.status, e.capacity, e.group_id,
                    e.magic_link_token, e.magic_link_expires_at, e.magic_link_active,
                    e.magic_link_use_count, e.magic_link_max_uses,
                    g.require_profile_image
                 FROM event_list e
                 JOIN group_list g ON e.group_id = g.id
                 WHERE e.magic_link_token = $1
                 FOR UPDATE OF e`,
                [token]
            );

            if (eventResult.rows.length === 0) {
                return {
                    return_code: 'INVITE_NOT_FOUND',
                    message: 'Invalid invitation link'
                };
            }

            // ===================================================================
            // Process as EVENT invite
            // ===================================================================
            const event = eventResult.rows[0];

            // Validate link status
            const validation = validateMagicLink(event);
            if (!validation.valid) {
                return validation;
            }

            // Check if event is cancelled
            if (event.status === 'cancelled') {
                return {
                    return_code: 'EVENT_CANCELLED',
                    message: 'This event has been cancelled',
                    group_id: event.group_id
                };
            }

            // Check if event has already happened
            if (new Date(event.date_time) < new Date()) {
                return {
                    return_code: 'EVENT_ENDED',
                    message: 'This event has already happened',
                    group_id: event.group_id
                };
            }

            // Check if profile image is required
            if (event.require_profile_image) {
                if (!avatar_url || avatar_url.trim() === '') {
                    return {
                        return_code: 'PROFILE_IMAGE_REQUIRED',
                        message: 'This group requires members to have a profile image'
                    };
                }
            }

            // Create user
            const user = await createUser(client, { name, email, password, avatar_url });

            // Join group
            await client.query(
                `INSERT INTO group_member (group_id, user_id, role, status)
                 VALUES ($1, $2, 'member', 'active')`,
                [event.group_id, user.id]
            );

            // RSVP to event
            const rsvpStatus = await createRsvp(client, event, user.id);

            // Increment use count
            await client.query(
                'UPDATE event_list SET magic_link_use_count = magic_link_use_count + 1 WHERE id = $1',
                [event.id]
            );

            return {
                return_code: 'SUCCESS',
                user,
                actions: {
                    joined_group: true,
                    rsvp_status: rsvpStatus
                },
                redirect_to: `/events/${event.id}`
            };
        });

        // =======================================================================
        // If not successful, return the error result
        // =======================================================================
        if (result.return_code !== 'SUCCESS') {
            return res.json(result);
        }

        // =======================================================================
        // Generate JWT token
        // =======================================================================
        const jwtToken = jwt.sign(
            { user_id: result.user.id },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        // =======================================================================
        // Create audit log entry (async - don't wait)
        // =======================================================================
        logAudit({
            action: AuditAction.USER_REGISTERED,
            userId: result.user.id,
            userName: result.user.name
        }).catch(err => {
            console.error('Failed to log audit:', err);
        });

        // =======================================================================
        // Send welcome email (async - don't wait)
        // =======================================================================
        sendWelcomeEmail(result.user.email, result.user.name).catch(err => {
            console.error('Failed to send welcome email:', err);
        });

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            token: jwtToken,
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email
            },
            actions: result.actions,
            redirect_to: result.redirect_to
        });

    } catch (error) {
        console.error('Accept invite with signup error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

// =======================================================================
// Helper: Validate magic link status
// =======================================================================
function validateMagicLink(record) {
    if (!record.magic_link_active) {
        return {
            valid: false,
            return_code: 'INVITE_DISABLED',
            message: 'This invitation link is no longer active'
        };
    }

    if (record.magic_link_expires_at && new Date(record.magic_link_expires_at) < new Date()) {
        return {
            valid: false,
            return_code: 'INVITE_EXPIRED',
            message: 'This invitation link has expired'
        };
    }

    if (record.magic_link_max_uses && record.magic_link_use_count >= record.magic_link_max_uses) {
        return {
            valid: false,
            return_code: 'INVITE_LIMIT_REACHED',
            message: 'This invitation link has reached its limit'
        };
    }

    return { valid: true };
}

// =======================================================================
// Helper: Create user account
// =======================================================================
async function createUser(client, { name, email, password, avatar_url }) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await client.query(
        `INSERT INTO app_user (email, password_hash, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name`,
        [email.toLowerCase(), passwordHash, name, avatar_url || null]
    );

    return result.rows[0];
}

// =======================================================================
// Helper: Create RSVP (attending or waitlist based on capacity)
// =======================================================================
async function createRsvp(client, event, userId) {
    const countResult = await client.query(
        `SELECT
            COUNT(*) AS attendee_count,
            COALESCE(SUM(guest_count), 0) AS total_guests
         FROM event_rsvp
         WHERE event_id = $1 AND status = 'attending'`,
        [event.id]
    );
    const attendeeCount = parseInt(countResult.rows[0].attendee_count, 10) || 0;
    const totalGuests = parseInt(countResult.rows[0].total_guests, 10) || 0;
    const totalSpotsTaken = attendeeCount + totalGuests;

    const hasCapacity = event.capacity === null || (totalSpotsTaken + 1) <= event.capacity;

    if (hasCapacity) {
        await client.query(
            `INSERT INTO event_rsvp (event_id, user_id, status, guest_count)
             VALUES ($1, $2, 'attending', 0)`,
            [event.id, userId]
        );
        return 'attending';
    } else {
        const maxPosResult = await client.query(
            `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_pos
             FROM event_rsvp
             WHERE event_id = $1 AND status = 'waitlist'`,
            [event.id]
        );
        const nextPosition = maxPosResult.rows[0].next_pos;

        await client.query(
            `INSERT INTO event_rsvp (event_id, user_id, status, waitlist_position, guest_count)
             VALUES ($1, $2, 'waitlist', $3, 0)`,
            [event.id, userId, nextPosition]
        );
        return 'waitlist';
    }
}

module.exports = router;
