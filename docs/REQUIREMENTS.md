# Meet With Friends - Outstanding Requirements

Prioritized list of incomplete features. Work through these with Claude.

---

## Phase 1: Foundation Gaps (High Priority)

### REQ-001: Privacy Policy Page
**Status:** COMPLETE
**Effort:** Small

Create the Privacy Policy page at `/privacy`. Help page already links to it.

**Implementation:**
- Page at `/privacy` with full privacy policy
- Covers: data collection, third parties (Cloudinary, Resend, Stripe), retention, GDPR rights
- Operated by Noodev8 Ltd, contact noodev8@gmail.com

---

### REQ-002: Terms of Service Page
**Status:** COMPLETE
**Effort:** Small

Create the Terms of Service page at `/terms`. Help page already links to it.

**Implementation:**
- Page at `/terms` with full terms of service
- Covers: acceptable use, platform disclaimer, liability, account termination
- UK jurisdiction, Noodev8 Ltd

---

### REQ-003: Broadcast Opt-Out Toggle
**Status:** COMPLETE
**Effort:** Medium

Add toggle to profile settings for users to opt out of broadcast emails.

**Implementation:**
- Added `receive_broadcasts BOOLEAN DEFAULT TRUE` column to `app_user`
- Updated `update_profile.js` to handle the field
- Added toggle in profile page under "Email Preferences"
- Updated `create_event.js` to filter out users with `receive_broadcasts = false` when sending new event notifications

---

### REQ-004: Direct Messaging - Member to Organiser
**Status:** COMPLETE
**Effort:** Medium

Allow group members to contact the group organiser via email.

**Implementation:**
- "Contact" button in Organiser Card on group page (visible to active members, not organiser)
- Modal with message textarea (10-1000 chars)
- Backend endpoint `POST /api/groups/:id/contact-organiser`
- Rate limiting: 3 messages per hour per user per group (in-memory)
- Email sent via Resend with `sendContactOrganiserEmail`, includes reply-to sender's email
- Logged to email_log with type 'contact_organiser'

---

### REQ-005: Direct Messaging - Guest to Host
**Status:** COMPLETE
**Effort:** Medium

Allow event attendees to contact the event host via email.

**Implementation:**
- "Contact" button next to host info in event hero (visible to attendees/waitlist)
- Modal with message textarea (10-1000 chars)
- Backend endpoint `POST /api/events/:id/contact-host`
- Rate limiting: 3 messages per hour per user per event (in-memory)
- Email sent to ALL hosts via Resend with `sendContactHostEmail`, includes reply-to sender's email
- Logged to email_log with type 'contact_host'

---

## Phase 2: Pre-Orders Frontend (Medium Priority)

### REQ-006: Pre-Order Submission UI (Attendee)
**Status:** COMPLETE
**Effort:** Medium

Create UI for attendees to submit food orders.

**Implementation:**
- Pre-order section on event page when `preorders_enabled=true` and user has RSVP'd
- Shows menu link if provided
- Order textarea + dietary notes textarea in modal
- "Add Order" / "Edit Order" button
- Submits via `POST /api/events/:id/submit-order`
- Displays current order inline when submitted

---

### REQ-007: Pre-Order Host View
**Status:** COMPLETE
**Effort:** Small-Medium

Create UI for hosts to view all submitted orders.

**Implementation:** Already implemented on event management/attendees page.

---

### REQ-008: Event Form Pre-Order Fields
**Status:** COMPLETE
**Effort:** Small

Add pre-order configuration to event create/edit forms.

**Implementation:** Both create and edit forms have:
- Toggle for enabling pre-orders
- Menu link URL input
- Pre-order cutoff date/time picker with preset buttons

---

## Phase 3: Payments (Future)

### REQ-009: Stripe Connect Integration
**Status:** Not Started
**Effort:** Large
**Blocked:** Needs Stripe account setup

Allow group organisers to connect Stripe for receiving payments.

**Requires:**
- Stripe Connect OAuth flow
- `stripe_account` table (group_id, stripe_account_id, connected_at)
- Connection status in group settings

---

### REQ-010: Event Deposits
**Status:** Not Started
**Effort:** Large
**Blocked:** Depends on REQ-009

Allow hosts to require deposits for event attendance.

**Requires:**
- Deposit amount field on event creation
- Payment required to confirm RSVP
- Stripe Checkout integration
- Payment status tracking
- Refund handling

---

## Phase 5: Polish (Lower Priority)

### REQ-011: Last Login & Group Visit Tracking
**Status:** COMPLETE
**Effort:** Small

Track user activity for analytics and email targeting.

**Implementation:**
- Added `last_login_at TIMESTAMP WITH TIME ZONE` column to `app_user`
- Updated login route to set `last_login_at = NOW()` on success
- Added `last_visited_at TIMESTAMP WITH TIME ZONE` column to `group_member`
- Updated `get_group.js` to set `last_visited_at = NOW()` when member views group
- Updated `get_event.js` to set `last_visited_at = NOW()` when member views event
- No UI display - used internally for queries like filtering inactive users/members

---

### REQ-012: Recurring Events
**Status:** Not Started
**Effort:** Large

Allow hosts to create recurring events.

**Requires:**
- Recurrence fields: `recurrence_rule`, `parent_event_id`
- Pattern selector (none, weekly, biweekly, monthly)
- Generate future event instances
- Edit single vs all future instances

---

### REQ-013: Event Templates
**Status:** Not Started
**Effort:** Medium

Allow hosts to save and reuse event configurations.

**Requires:**
- `event_template` table (group_id, name, template_data JSON)
- "Save as Template" button on events
- Template list in group settings
- "Create from Template" option

---

## Summary

| REQ | Name | Phase | Effort | Status |
|-----|------|-------|--------|--------|
| 001 | Privacy Policy | 1 | Small | COMPLETE |
| 002 | Terms of Service | 1 | Small | COMPLETE |
| 003 | Broadcast Opt-Out | 1 | Medium | COMPLETE |
| 004 | Member→Organiser Msg | 1 | Medium | COMPLETE |
| 005 | Guest→Host Msg | 1 | Medium | COMPLETE |
| 006 | Pre-Order Submit UI | 2 | Medium | COMPLETE |
| 007 | Pre-Order Host View | 2 | Small-Medium | COMPLETE |
| 008 | Event Form Pre-Order | 2 | Small | COMPLETE |
| 009 | Stripe Connect | 3 | Large | Blocked |
| 010 | Event Deposits | 3 | Large | Blocked |
| 011 | Last Login Tracking | 5 | Small | COMPLETE |
| 012 | Recurring Events | 5 | Large | Not Started |
| 013 | Event Templates | 5 | Medium | Not Started |

---

## Suggested Order

**Phase 1:** COMPLETE
**Phase 2:** COMPLETE

**Phase 3:** Blocked (needs Stripe account setup)

**Phase 5 (when ready):**
1. REQ-012 - Recurring Events (Large)
2. REQ-013 - Event Templates (Medium)
