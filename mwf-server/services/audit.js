/*
=======================================================================================================================================
Audit Service
=======================================================================================================================================
Logs important actions to the audit_log table for accountability and debugging.
- All fields except id and created_at are nullable
- Captures user names at time of action (denormalized for historical accuracy)

Usage:
    const { logAudit, AuditAction } = require('../../services/audit');

    await logAudit({
        action: AuditAction.HOST_REMOVED,
        userId: actorId,
        userName: actorName,
        targetUserId: removedUserId,
        targetUserName: removedUserName,
        eventId: 123,
        groupId: 456,
        details: 'Optional context',
        client: client  // Optional - pass transaction client if inside withTransaction
    });

Available actions:
    USER_REGISTERED, USER_DELETED
    GROUP_CREATED, GROUP_DELETED, GROUP_UPDATED
    MEMBER_JOINED, MEMBER_REMOVED, MEMBER_LEFT, MEMBER_APPROVED, MEMBER_REJECTED
    HOST_PROMOTED, HOST_DEMOTED, ORGANISER_TRANSFERRED
    EVENT_CREATED, EVENT_DELETED, EVENT_UPDATED, EVENT_CANCELLED
    EVENT_HOST_ADDED, EVENT_HOST_REMOVED
=======================================================================================================================================
*/

const { query } = require('../database');

/*
=======================================================================================================================================
Action Types
=======================================================================================================================================
Standardized action codes for consistency
=======================================================================================================================================
*/
const AuditAction = {
    // User actions
    USER_REGISTERED: 'USER_REGISTERED',
    USER_DELETED: 'USER_DELETED',

    // Group actions
    GROUP_CREATED: 'GROUP_CREATED',
    GROUP_DELETED: 'GROUP_DELETED',
    GROUP_UPDATED: 'GROUP_UPDATED',

    // Group membership actions
    MEMBER_JOINED: 'MEMBER_JOINED',
    MEMBER_REMOVED: 'MEMBER_REMOVED',
    MEMBER_LEFT: 'MEMBER_LEFT',
    MEMBER_APPROVED: 'MEMBER_APPROVED',
    MEMBER_REJECTED: 'MEMBER_REJECTED',

    // Role changes
    HOST_PROMOTED: 'HOST_PROMOTED',
    HOST_DEMOTED: 'HOST_DEMOTED',
    ORGANISER_TRANSFERRED: 'ORGANISER_TRANSFERRED',

    // Event actions
    EVENT_CREATED: 'EVENT_CREATED',
    EVENT_DELETED: 'EVENT_DELETED',
    EVENT_UPDATED: 'EVENT_UPDATED',
    EVENT_CANCELLED: 'EVENT_CANCELLED',

    // Event host actions
    EVENT_HOST_ADDED: 'EVENT_HOST_ADDED',
    EVENT_HOST_REMOVED: 'EVENT_HOST_REMOVED'
};

/*
=======================================================================================================================================
logAudit
=======================================================================================================================================
Log an action to the audit_log table

Parameters:
  - action:         (required) Action code from AuditAction
  - userId:         (optional) ID of user performing the action
  - userName:       (optional) Name of user performing the action
  - targetUserId:   (optional) ID of user the action is performed on
  - targetUserName: (optional) Name of user the action is performed on
  - groupId:        (optional) ID of related group
  - eventId:        (optional) ID of related event
  - details:        (optional) Additional context
  - client:         (optional) Transaction client for use within withTransaction

Returns: true on success, false on failure (never throws - audit should not break main flow)
=======================================================================================================================================
*/
async function logAudit({
    action,
    userId = null,
    userName = null,
    targetUserId = null,
    targetUserName = null,
    groupId = null,
    eventId = null,
    details = null,
    client = null
}) {
    try {
        const sql = `INSERT INTO audit_log
             (user_id, user_name, action, target_user_id, target_user_name, group_id, event_id, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        const params = [userId, userName, action, targetUserId, targetUserName, groupId, eventId, details];

        if (client) {
            await client.query(sql, params);
        } else {
            await query(sql, params);
        }
        return true;
    } catch (error) {
        console.error('Failed to write audit log:', error);
        return false;
    }
}

/*
=======================================================================================================================================
anonymizeUserAuditLogs
=======================================================================================================================================
Removes personal details (names) from audit logs for a deleted user. Called during account deletion for privacy compliance.
Sets user_name to NULL where user_id matches, and target_user_name to NULL where target_user_id matches.
The user IDs are preserved so we can still see that "user 123 did X" but not their name.

Parameters:
  - userId: (required) ID of user being deleted

Returns: true on success, false on failure
=======================================================================================================================================
*/
async function anonymizeUserAuditLogs(userId) {
    try {
        // Null out user_name where this user was the actor
        await query(
            'UPDATE audit_log SET user_name = NULL WHERE user_id = $1',
            [userId]
        );

        // Null out target_user_name where this user was the target
        await query(
            'UPDATE audit_log SET target_user_name = NULL WHERE target_user_id = $1',
            [userId]
        );

        return true;
    } catch (error) {
        console.error('Failed to anonymize audit logs:', error);
        return false;
    }
}

module.exports = {
    AuditAction,
    logAudit,
    anonymizeUserAuditLogs
};
