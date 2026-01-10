# Email Implementation Plan

Reference: [EMAIL-LIST.md](./EMAIL-LIST.md)

---

## Technical Setup

- [ ] Email service wrapper (`services/email.js` - extend existing)
- [ ] Daily send counter (stop at 100 for free plan)
- [ ] Email log table for tracking sends
- [ ] Test mode intercept (see below)

### Test Mode

When sending emails, check if recipient ends with `@test.com`:
- Intercept the email
- Send only 1 email to `aandreou25@gmail.com` instead
- Include original recipient in subject line for clarity, e.g. "[TEST: john@test.com] Welcome to Meet With Friends"

This allows testing with dummy users without spamming real addresses.

---

## Phase A: Instant Triggers (Easy)

These fire immediately when an action happens in existing endpoints.

| # | Email | Endpoint to Modify | Status |
|---|-------|-------------------|--------|
| 1 | Welcome to Meet With Friends | `auth/register.js` | [ ] |
| 3 | RSVP confirmed | `events/rsvp.js` | [ ] |
| 5 | You've been removed from an event | `events/manage_attendee.js` | [ ] |
| 6 | You've been moved from waitlist to attending | `events/manage_attendee.js` + auto-promote logic | [ ] |
| 7 | Event cancelled | `events/update_event.js` (cancel) | [ ] |
| 8 | New join request | `groups/join_group.js` | [ ] |
| 9 | You have joined a group | `groups/approve_member.js` | [ ] |

---

## Phase B: Broadcast Triggers (Medium)

These send to multiple recipients. Need to handle the 100/day limit.

| # | Email | Endpoint to Modify | Status |
|---|-------|-------------------|--------|
| 2 | New event in your group | `events/create_event.js` | [ ] |

---

## Phase C: Scheduled Triggers (Later)

These need a scheduled job. Run manually first, then cron.

| # | Email | Implementation | Status |
|---|-------|----------------|--------|
| 4 | Event reminder (24h before) | Script to find events starting in 24h | [ ] |

---

## Email Templates

| Template | Fields Needed |
|----------|---------------|
| Welcome | user.name |
| RSVP confirmed | user.name, event.title, event.date, event.location |
| Removed from event | user.name, event.title, reason (waitlist/removed) |
| Moved to attending | user.name, event.title, event.date, event.location |
| Event cancelled | user.name, event.title, event.date |
| New join request | requester.name, group.name |
| Joined group | user.name, group.name |
| New event | user.name, event.title, event.date, event.location, group.name |
| Event reminder | user.name, event.title, event.date, event.location, attendee_summary (for host) |

---

## Progress Log

| Date | Change |
|------|--------|
| | |
