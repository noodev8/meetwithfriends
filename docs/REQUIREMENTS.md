# Meet With Friends - Requirements Tracker

Single source of truth for feature status. See PROJECT_FOUNDATION.md for vision/architecture.

---

## Active Requirements

_No active requirements - check Backlog for upcoming work._

---

## Backlog

_No items in backlog._

---

## Completed

<details>
<summary>REQ-019: User Flow - Events & Groups Navigation</summary>

**Completed:** Jan 2026
**Effort:** Medium

Restructured user flow with dashboard-style home page.

**Flutter:**
- Dashboard home with My Events, My Groups, Discover sections
- My Events shows RSVP'd events (attending/waitlisted)
- My Groups shows groups user is member of
- Consistent back button navigation with contextual labels (Home, My Groups, Discover)
- Status bar visibility fixed across all screens
- Removed redundant Cancel buttons (back arrow suffices)
- Replaced floating action buttons with CTA buttons
- Only show Organiser/Host badges (not Member)

**Web:**
- Added Events menu item to sidebar navigation
- Dashboard → Events → Groups → Discover flow
</details>

<details>
<summary>REQ-018: Broadcast Message to Group Members</summary>

**Completed:** Jan 2026
**Effort:** Medium

Allow organisers to send broadcast emails to all group members.

- Broadcast button on Flutter and Web group pages
- Modal with message input (10-2000 chars)
- Uses email queue for rate limiting
- Respects user's `receive_broadcasts` preference
- Auto-links URLs in broadcast emails
- Group name shows as email sender
</details>

<details>
<summary>REQ-014: Email Queue System</summary>

**Completed:** Jan 2026
**Effort:** Medium

Email queue to respect Resend rate limits (1/second).

- `email_queue` table with status tracking (pending, sent, failed, cancelled, skipped)
- `queueEmail()` function for bulk sends
- `processEmailQueue()` sends at 1/second rate
- `@test.com` emails marked as 'skipped' (not sent)
- CLI script: `node scripts/process_email_queue.js`
- Auto-cleanup of non-sent emails older than 14 days
- Group name as email sender (like Meetup)
- Branded email templates with header/footer

**Queued senders:**
- New event notifications
- Event cancelled notifications
- Event reminders
- Broadcast messages
- Comment notifications
</details>

<details>
<summary>REQ-015: Menu Image Upload (Flutter)</summary>

**Completed:** Jan 2026
**Effort:** Small

Allow hosts to upload menu images for pre-orders in Flutter app.

- Camera/gallery image picker
- Upload to server via multipart form
- Display in pre-order section
</details>

<details>
<summary>REQ-016: Pre-Order Export (PDF + Clipboard)</summary>

**Completed:** Jan 2026
**Effort:** Medium

Export pre-orders for venue bookings from Attendees screen.

- PDF generation with React-PDF (server-side)
- Clipboard copy with formatted text
- Available on both Web and Flutter
- Includes host name and "Powered by meetwithfriends.net" branding
</details>

<details>
<summary>REQ-017: Custom Pre-Order Cutoff Dates</summary>

**Completed:** Jan 2026
**Effort:** Small

Allow hosts to set custom cutoff dates for pre-orders.

- Date/time picker for cutoff
- Preset buttons: 1 day, 2 days, 1 week before event
</details>

<details>
<summary>REQ-013: Group Visibility (Unlisted Groups)</summary>

**Completed:** Phase 5
**Effort:** Medium

Allow group organisers to make groups unlisted (invite-only).

- `invite_code` column for 8-char random hex code
- `visibility` column: "listed" or "unlisted"
- Unlisted groups require `?code=XXXXXXXX` URL param
- Regenerate code option for organisers
</details>

<details>
<summary>REQ-012: Duplicate Event</summary>

**Completed:** Phase 5
**Effort:** Small

Allow hosts to duplicate an existing event.

- "Duplicate" button on event page
- Pre-fills create form with event settings
- Does NOT copy: date/time, RSVPs, comments, hosts
</details>

<details>
<summary>REQ-011: Last Login & Group Visit Tracking</summary>

**Completed:** Phase 5
**Effort:** Small

Track user activity for analytics and email targeting.

- `last_login_at` on `app_user`
- `last_visited_at` on `group_member`
- Updated on login/group view/event view
</details>

<details>
<summary>REQ-008: Event Form Pre-Order Fields</summary>

**Completed:** Phase 2
**Effort:** Small

Add pre-order configuration to event create/edit forms.

- Toggle for enabling pre-orders
- Menu link URL input
- Pre-order cutoff date/time picker
</details>

<details>
<summary>REQ-007: Pre-Order Host View</summary>

**Completed:** Phase 2
**Effort:** Small-Medium

UI for hosts to view all submitted orders on attendees page.
</details>

<details>
<summary>REQ-006: Pre-Order Submission UI</summary>

**Completed:** Phase 2
**Effort:** Medium

UI for attendees to submit food orders.

- Pre-order section when enabled and user has RSVP'd
- Order textarea + dietary notes in modal
- Displays current order inline
</details>

<details>
<summary>REQ-005: Direct Messaging - Guest to Host</summary>

**Completed:** Phase 1
**Effort:** Medium

Allow event attendees to contact the event host via email.

- "Contact" button next to host info
- Rate limiting: 3 messages/hour/user/event
- Email sent to ALL hosts with reply-to sender
</details>

<details>
<summary>REQ-004: Direct Messaging - Member to Organiser</summary>

**Completed:** Phase 1
**Effort:** Medium

Allow group members to contact the group organiser via email.

- "Contact" button in Organiser Card
- Rate limiting: 3 messages/hour/user/group
- Email sent with reply-to sender
</details>

<details>
<summary>REQ-003: Broadcast Opt-Out Toggle</summary>

**Completed:** Phase 1
**Effort:** Medium

Toggle in profile settings for users to opt out of broadcast emails.

- `receive_broadcasts` column on `app_user`
- Filtered in event notification sends
</details>

<details>
<summary>REQ-002: Terms of Service Page</summary>

**Completed:** Phase 1
**Effort:** Small

Terms of Service page at `/terms`.
</details>

<details>
<summary>REQ-001: Privacy Policy Page</summary>

**Completed:** Phase 1
**Effort:** Small

Privacy Policy page at `/privacy`.
</details>
