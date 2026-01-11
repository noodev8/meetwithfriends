# Meet With Friends - Outstanding Requirements

Prioritized list of incomplete features. Work through these with Claude.

---

## Phase 1: Foundation Gaps (High Priority)

### REQ-001: Privacy Policy Page
**Status:** Not Started
**Effort:** Small

Create the Privacy Policy page at `/privacy`. Help page already links to it.

**Acceptance Criteria:**
- Page exists at `/privacy` route
- Contains privacy policy content specific to MWF
- Responsive design matching site styling

**Notes:** Need business details from user (entity name, data practices, contact).

---

### REQ-002: Terms of Service Page
**Status:** Not Started
**Effort:** Small

Create the Terms of Service page at `/terms`. Help page already links to it.

**Acceptance Criteria:**
- Page exists at `/terms` route
- Contains ToS content specific to MWF
- Responsive design matching site styling

**Notes:** Need business rules/liability preferences from user.

---

### REQ-003: Broadcast Opt-Out Toggle
**Status:** Not Started
**Effort:** Medium

Add toggle to profile settings for users to opt out of broadcast emails.

**Requires:**
- Add `receive_broadcasts BOOLEAN DEFAULT TRUE` column to `app_user`
- Update `update_profile.js` backend to handle field
- Add toggle to profile page Contact Details section
- Update email service to check field before sending broadcasts

**Acceptance Criteria:**
- Toggle visible in profile settings
- Persists to database
- Email service respects the setting

---

### REQ-004: Direct Messaging - Member to Organiser
**Status:** Not Started
**Effort:** Medium

Allow group members to contact the group organiser via email.

**Requires:**
- "Contact Organiser" button on group page (visible to members)
- Modal with message textarea
- Backend endpoint `POST /api/groups/:id/contact-organiser`
- Rate limiting to prevent spam
- Email sent via Resend, logged to email_log

**Acceptance Criteria:**
- Button visible to group members
- Modal allows composing message
- Email delivered to organiser
- Rate limiting prevents abuse

---

### REQ-005: Direct Messaging - Guest to Host
**Status:** Not Started
**Effort:** Medium

Allow event attendees to contact the event host via email.

**Requires:**
- "Contact Host" button on event page (visible to attendees)
- Modal with message textarea
- Backend endpoint `POST /api/events/:id/contact-host`
- Rate limiting to prevent spam
- Email sent via Resend, logged to email_log

**Acceptance Criteria:**
- Button visible to event attendees
- Modal allows composing message
- Email delivered to host(s)
- Rate limiting prevents abuse

---

## Phase 2: Pre-Orders Frontend (Medium Priority)

### REQ-006: Pre-Order Submission UI (Attendee)
**Status:** Not Started (Backend exists)
**Effort:** Medium

Create UI for attendees to submit food orders.

**Backend already exists:** `POST /api/events/:id/submit-order`

**Requires:**
- Order form on event page when `preorders_enabled=true`
- Menu link display (if provided)
- Order textarea + dietary notes textarea
- Cutoff deadline display
- Read-only state after cutoff

**Acceptance Criteria:**
- Form visible on events with pre-orders enabled
- Submits to existing endpoint
- Respects cutoff deadline

---

### REQ-007: Pre-Order Host View
**Status:** Not Started
**Effort:** Small-Medium

Create UI for hosts to view all submitted orders.

**Requires:**
- Orders list on event management page
- Shows: attendee name, order details, dietary notes
- "Not ordered yet" indicators
- Copy-to-clipboard button for all orders

**Acceptance Criteria:**
- Hosts can see all orders
- Can identify who hasn't ordered
- Can copy formatted list to clipboard

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
| 001 | Privacy Policy | 1 | Small | Not Started |
| 002 | Terms of Service | 1 | Small | Not Started |
| 003 | Broadcast Opt-Out | 1 | Medium | Not Started |
| 004 | Member→Organiser Msg | 1 | Medium | Not Started |
| 005 | Guest→Host Msg | 1 | Medium | Not Started |
| 006 | Pre-Order Submit UI | 2 | Medium | Not Started |
| 007 | Pre-Order Host View | 2 | Small-Medium | Not Started |
| 008 | Event Form Pre-Order | 2 | Small | COMPLETE |
| 009 | Stripe Connect | 3 | Large | Blocked |
| 010 | Event Deposits | 3 | Large | Blocked |
| 011 | Last Login Tracking | 5 | Small | COMPLETE |
| 012 | Recurring Events | 5 | Large | Not Started |
| 013 | Event Templates | 5 | Medium | Not Started |

---

## Suggested Order

**Phase 1 gaps:**
1. REQ-003 - Broadcast Opt-Out Toggle
2. REQ-004/005 - Messaging features

**Complete Phase 2:**
3. REQ-006 - Pre-Order Submit UI
4. REQ-007 - Pre-Order Host View

**Legal pages when ready:**
- REQ-001/002 - Need your input on content
