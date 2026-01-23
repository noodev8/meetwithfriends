# Email Implementation Plan

Reference: [EMAIL-LIST.md](./EMAIL-LIST.md)

---

## Technical Setup

- [x] Email service wrapper (`services/email.js` - extended)
- [x] Daily send counter (stop at 100 for free plan)
- [x] Email log table for tracking sends
- [x] Test mode intercept (see below)

### Test Mode

When sending emails, check if recipient ends with `@test.com`:
- Intercept the email
- Send only 1 email to `aandreou25@gmail.com` instead
- Include original recipient in subject line for clarity, e.g. "[TEST: john@test.com] Welcome to Meet With Friends"
- Log with status `'intercepted'` (doesn't count toward daily limit)

---

## Phase A: Instant Triggers (Easy) ✅ Complete

These fire immediately when an action happens in existing endpoints.

| # | Email | Endpoint Modified | Status |
|---|-------|-------------------|--------|
| 1 | Welcome to Meet With Friends | `auth/register.js` | ✅ |
| 3 | RSVP confirmed | `events/rsvp.js` | ✅ |
| 3b | New RSVP (to host) | `events/rsvp.js` | ✅ |
| 5 | You've been removed from an event | `events/manage_attendee.js` | ✅ |
| 6 | You've been moved from waitlist to attending | `events/manage_attendee.js` + `events/rsvp.js` (auto-promote) | ✅ |
| 7 | Event cancelled | `events/cancel_event.js` | ✅ |
| 8 | New join request | `groups/join_group.js` | ✅ |
| 9 | You have joined a group | `groups/approve_member.js` | ✅ |

---

## Phase B: Broadcast Triggers (Medium) ✅ Complete

These send to multiple recipients. Need to handle the 100/day limit.

| # | Email | Endpoint Modified | Status |
|---|-------|-------------------|--------|
| 2 | New event in your group | `events/create_event.js` | ✅ |
| 10 | New comment on event | `comments/add_comment.js` | ✅ |

### Email #10: New Comment
- **Recipients:** All attendees + waitlist, except the person who posted the comment
- **Content:** Show commenter name, comment text (truncated to 200 chars), link to event page
- **Note:** Could generate many emails for active discussions - consider batching or rate limiting per event

---

## Phase C: Scheduled Triggers (Later) ✅ Complete

These need a scheduled job. Run manually first, then cron.

| # | Email | Implementation | Status |
|---|-------|----------------|--------|
| 4 | Event reminder (24h before) | `scripts/send_reminders.js` | ✅ |

To run manually:
```bash
cd mwf-server
node scripts/send_reminders.js
```

---

## Email Templates

| Template | Fields Used |
|----------|-------------|
| Welcome | user.name |
| RSVP confirmed | user.name, event.title, event.date_time, event.location |
| New RSVP (to host) | host.name, member.name, event.title, event.date_time, attendee_count, capacity |
| Removed from event | user.name, event.title, reason (waitlist/removed) |
| Moved to attending | user.name, event.title, event.date_time, event.location |
| Event cancelled | user.name, event.title, event.date_time |
| New join request | host.name, requester.name, group.name |
| Joined group | user.name, group.name |
| New event | user.name, event.title, event.date_time, event.location, group.name |
| Event reminder | user.name, event.title, event.date_time, event.location, attendee_summary (for host) |
| New comment | user.name, event.title, commenter.name, comment.content, link to event |

---

## Database Table Required

```sql
CREATE TABLE email_log (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent',
    related_id INTEGER,
    error_message TEXT
);

CREATE INDEX idx_email_log_sent_at ON email_log(sent_at);
```

---

## Progress Log

| Date | Change |
|------|--------|
| 2026-01-10 | Initial implementation complete - all 9 email types implemented |
| 2026-01-10 | Added email #10: New comment notification to attendees + waitlist |
| 2026-01-23 | Added email #3b: New RSVP notification to event host |

---

## Future Enhancements

### Email Priority/Ranking System (Low Priority)

**Problem:** Broadcast emails (new event, new comment) go to all group members, wasting credits on inactive users who likely won't engage.

**Solution:** Implement activity-based email ranking to prioritize active users.

**Criteria for "active" user:**
- Last login within X days (e.g., 30 days)
- Last group visit within X days
- Has RSVP'd to an event in the past X days
- Has commented recently

**Implementation ideas:**
1. Add `last_login_at` and `last_group_visit_at` to track activity (see PROJECT_FOUNDATION.md)
2. Create helper function `isActiveUser(userId, groupId)` that checks activity thresholds
3. Filter broadcast recipients to only active users
4. Consider tiered approach: always email hosts/organisers, then active members only

**Affected emails:**
- #2: New event in your group
- #10: New comment on event (already limited to attendees/waitlist)

**Dependencies:**
- Requires user activity tracking to be implemented first
