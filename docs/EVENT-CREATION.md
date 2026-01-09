# Event Creation - Feature Specification

This document tracks the event creation page as a mini-project. It covers the data model, UI design, and staged implementation plan.

---

## Final Feature Decisions

### Create Event Form

| Field | Required | Status | Notes |
|-------|----------|--------|-------|
| Title | Yes | Have it | Max 200 chars |
| Date | Yes | Have it | Min: tomorrow |
| Start Time | Yes | Have it | |
| Location | No | Have it | Free text |
| Description | No | **UPGRADE** | Rich text (bold, links, lists) |
| Capacity | No | Have it | Null = unlimited, waitlist when full |
| Featured Image | No | **NEW** | Cloudinary upload |
| Co-hosts | No | **NEW** | Add hosts from group members |
| +1 Guests | No | **NEW** | Allow members to bring guests |
| Menu Link | No | **NEW (Phase 2)** | Link to restaurant menu |
| Pre-order Cutoff | No | **NEW (Phase 2)** | Deadline for food orders |

### Parked (Future Phases)

| Feature | Phase | Notes |
|---------|-------|-------|
| Event Fee | Phase 3 | Stripe integration required |

### Dropped Features

| Feature | Reason |
|---------|--------|
| Event Type | Unnecessary - pre-order fields are just optional |
| End Time / Duration | Keep it simple |
| Location Type toggle | In-person/Online complexity not needed |
| Online Link | Dropped with location type |
| Recent Venues | Nice-to-have, not essential |
| RSVP Deadline | Adds complexity, low value |
| Recurring Events | Phase 5 if ever |
| Save as Draft | Complexity, not essential |
| Duplicate Event | Nice-to-have, later |
| Preview | Form is short enough to review |
| Generate with AI | Complexity, not essential |
| Topics/Tags | Discovery platform feature, not for MWF |
| Speaker Section | Not relevant |

---

## Database Changes

### Stage 1: Image & Guest Settings
```sql
ALTER TABLE event_list ADD COLUMN image_url TEXT;
ALTER TABLE event_list ADD COLUMN allow_guests BOOLEAN DEFAULT false;
ALTER TABLE event_list ADD COLUMN max_guests_per_rsvp INTEGER DEFAULT 1;
```

### Stage 2: Co-hosts
```sql
-- New table for multiple hosts per event
CREATE TABLE event_host (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES event_list(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);
```

### Stage 3: Pre-orders (Phase 2)
```sql
ALTER TABLE event_list ADD COLUMN menu_link TEXT;
ALTER TABLE event_list ADD COLUMN preorder_cutoff TIMESTAMP;
ALTER TABLE event_rsvp ADD COLUMN food_order TEXT;
ALTER TABLE event_rsvp ADD COLUMN dietary_notes TEXT;
```

---

## UI Layout

### Single Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to [Group Name]                                      │
│                                                             │
│ Create Event                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ BASICS                                                  │ │
│ │                                                         │ │
│ │ Event Title *                                           │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Friday Evening Dinner                               │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ┌──────────────────────────┐  ┌───────────────────────┐ │ │
│ │ │ Date *                   │  │ Time *                │ │ │
│ │ │ Sat, 18 Jan 2026         │  │ 18:30                 │ │ │
│ │ └──────────────────────────┘  └───────────────────────┘ │ │
│ │                                                         │ │
│ │ Location                                                │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ The Beacon Hotel, Copthorne                         │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DETAILS                                                 │ │
│ │                                                         │ │
│ │ Featured Image                                          │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │                                                     │ │ │
│ │ │     [+] Click to upload or drag image here          │ │ │
│ │ │                                                     │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ Description                                             │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ B  🔗  •                                            │ │ │
│ │ ├─────────────────────────────────────────────────────┤ │ │
│ │ │ Join us for a relaxed evening meal at The Beacon.   │ │ │
│ │ │                                                     │ │ │
│ │ │ **What to expect:**                                 │ │ │
│ │ │ • Great food and good company                       │ │ │
│ │ │ • View the menu (link)                              │ │ │
│ │ │                                                     │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ATTENDANCE                                              │ │
│ │                                                         │ │
│ │ Capacity                                                │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ 20                                                  │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ Leave empty for unlimited. Waitlist used when full.     │ │
│ │                                                         │ │
│ │ ☐ Allow members to bring guests                         │ │
│ │                                                         │ │
│ │   How many guests per member?                           │ │
│ │   ┌─────────────────────────────────────────────────┐   │ │
│ │   │ 1                                           ▼   │   │ │
│ │   └─────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CO-HOSTS                                                │ │
│ │                                                         │ │
│ │ Co-hosts can edit this event and manage attendees.      │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ 🔍 Search group members...                          │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ (No co-hosts added)                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PRE-ORDERS                                   [Phase 2]  │ │
│ │                                                         │ │
│ │ Share a menu and collect food orders from attendees.    │ │
│ │                                                         │ │
│ │ Menu Link                                               │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ https://thebeacon.co.uk/menu                        │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ Pre-order Cutoff                                        │ │
│ │ ┌──────────────────────────┐  ┌───────────────────────┐ │ │
│ │ │ Fri, 17 Jan 2026         │  │ 12:00                 │ │ │
│ │ └──────────────────────────┘  └───────────────────────┘ │ │
│ │ Orders will be locked after this time.                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────┐  ┌──────────┐            │
│  │       Create Event           │  │  Cancel  │            │
│  └──────────────────────────────┘  └──────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Stages

### Stage 1: Featured Image & Rich Text Description

**Goal:** Add visual appeal and better formatting to events

**Database:**
```sql
ALTER TABLE event_list ADD COLUMN image_url TEXT;
-- Description column already exists, will now store HTML instead of plain text
```

**Tasks - Featured Image:**
- [ ] Add `image_url` column to database
- [ ] Update `create_event` API to accept `image_url`
- [ ] Update `update_event` API to accept `image_url`
- [ ] Update `get_event` API to return `image_url`
- [ ] Add Cloudinary upload widget to create form
- [ ] Add Cloudinary upload widget to edit form
- [ ] Display image on event page (hero/header)
- [ ] Display image on event cards (dashboard, group page)

**Tasks - Rich Text Description:**
- [ ] Install TipTap editor library (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`)
- [ ] Create RichTextEditor component with minimal toolbar (Bold, Link, Bullet List)
- [ ] Replace textarea with RichTextEditor on create form
- [ ] Replace textarea with RichTextEditor on edit form
- [ ] Install DOMPurify for HTML sanitization
- [ ] Render HTML description safely on event page
- [ ] Migrate any existing plain text descriptions (add `<p>` tags around paragraphs)

---

### Stage 2: +1 Guests

**Goal:** Allow members to bring non-member guests

**Database:**
```sql
ALTER TABLE event_list ADD COLUMN allow_guests BOOLEAN DEFAULT false;
ALTER TABLE event_list ADD COLUMN max_guests_per_rsvp INTEGER DEFAULT 1;
ALTER TABLE event_rsvp ADD COLUMN guest_count INTEGER DEFAULT 0;
```

**Tasks:**
- [ ] Add columns to database
- [ ] Update `create_event` API
- [ ] Update `update_event` API
- [ ] Update `get_event` API
- [ ] Add "Allow guests" checkbox to form
- [ ] Add "Max guests per member" dropdown (shows when checked)
- [ ] Update RSVP flow to ask "How many guests?"
- [ ] Update attendee count logic (members + guests)
- [ ] Update capacity/waitlist logic to account for guests
- [ ] Display guest counts on attendee list

---

### Stage 3: Co-hosts

**Goal:** Multiple people can manage an event

**Database:**
```sql
CREATE TABLE event_host (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES event_list(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);
```

**Tasks:**
- [ ] Create `event_host` table
- [ ] Update `create_event` API to accept co-host IDs
- [ ] Update `update_event` API to manage co-hosts
- [ ] Update `get_event` API to return co-hosts
- [ ] Create API to add/remove co-hosts
- [ ] Add co-host picker to create form (search group members)
- [ ] Add co-host management to edit form
- [ ] Update permission checks (co-hosts can edit/manage)
- [ ] Display co-hosts on event page

---

### Stage 4: Pre-orders (Phase 2)

**Goal:** Collect food orders for restaurant events

See [PREORDER-FEATURE.md](./PREORDER-FEATURE.md) for full specification.

**Database:**
```sql
ALTER TABLE event_list ADD COLUMN menu_link TEXT;
ALTER TABLE event_list ADD COLUMN preorder_cutoff TIMESTAMP;
ALTER TABLE event_rsvp ADD COLUMN food_order TEXT;
ALTER TABLE event_rsvp ADD COLUMN dietary_notes TEXT;
```

**Tasks:**
- [ ] Add columns to database
- [ ] Update event APIs
- [ ] Add Pre-orders section to create/edit form
- [ ] Create order submission UI for attendees
- [ ] Create order viewing/export for hosts
- [ ] Enforce cutoff deadline
- [ ] See PREORDER-FEATURE.md for complete task list

---

## Section Summary

| Section | Fields | Stage |
|---------|--------|-------|
| **Basics** | Title*, Date*, Time*, Location | Have it |
| **Details** | Featured Image, Rich Text Description | Stage 1 |
| **Attendance** | Capacity, Allow Guests, Max Guests | Stage 2 |
| **Co-hosts** | Member picker | Stage 3 |
| **Pre-orders** | Menu Link, Cutoff | Stage 4 (Phase 2) |

---

## Related Documents

- [PREORDER-FEATURE.md](./PREORDER-FEATURE.md) - Full pre-order specification
- [PROJECT_FOUNDATION.md](./PROJECT_FOUNDATION.md) - Overall project phases

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-09 | Initial document created from Meetup analysis |
| 2026-01-09 | Simplified based on feature decisions - removed Event Type, End Time, Location Type, RSVP Deadline, and other complexity |
| 2026-01-09 | Added Rich Text Description (bold, links, lists) to Stage 1 |
