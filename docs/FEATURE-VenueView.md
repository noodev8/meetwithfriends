# Feature: Venue View

**Status:** Draft
**Created:** 2026-01-27
**Author:** Claude (AI Assistant)

## Overview

A venue-facing page that allows restaurants/venues to view guest lists and menu pre-orders for events at their establishment. Access is granted via a magic link (unique URL) that organizers share with the venue.

## User Decisions

| Question | Decision |
|----------|----------|
| Should venues see guest names? | Yes - full guest names visible |
| How long should links remain valid? | 24 hours after event date |
| Real-time updates needed? | No - refresh-on-load is sufficient |
| Can organizers revoke access? | Yes |

## User Flow

### Organizer Flow
1. Organizer creates/edits an event
2. Clicks "Generate Venue Link" button on event management page
3. System generates unique token and displays shareable URL
4. Organizer copies link and shares with venue (email, text, etc.)
5. Organizer can revoke access at any time via "Revoke Venue Access" button

### Venue Flow
1. Venue receives link from organizer (e.g., `https://mwf.com/venue/abc123xyz`)
2. Opens link in browser - no login required
3. Sees read-only dashboard with:
   - Event name, date/time, location
   - Group name
   - Total guest count (attendees + their guests)
   - Guest list table with names, food orders, dietary notes
   - Section to add/edit venue notes
4. Can refresh page to see updated RSVPs
5. Link expires 24 hours after event date

## Database Changes

### Existing Tables (No Changes Needed)

**`event_list`** - Already has all event details
- `title`, `date_time`, `location`, `description`
- `preorders_enabled`, `preorder_cutoff`, `menu_link`, `menu_images`

**`event_rsvp`** - Already has guest pre-orders
- `food_order` - menu selections
- `dietary_notes` - allergies/restrictions
- `guest_count` - additional guests
- Links to `app_user` for guest names

**`app_user`** - Guest names via `name` field

### New Table: `venue_access_token`

```sql
CREATE TABLE public.venue_access_token (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES event_list(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_by INTEGER NOT NULL REFERENCES app_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT  -- Venue's internal notes (single text field for simplicity)
);

CREATE INDEX idx_venue_access_token_token ON venue_access_token(token);
CREATE INDEX idx_venue_access_token_event_id ON venue_access_token(event_id);
```

**Design Notes:**
- One token per event (can regenerate if needed)
- `revoked_at` - if set, token is invalid
- `notes` - simple text field for venue notes (avoids need for separate table)
- Token is 64-char random string (cryptographically secure)

## API Endpoints

### 1. Generate Venue Access Token

```
POST /api/events/:eventId/venue-access
Authorization: Required (must be event host/organiser)

Response (Success):
{
    "return_code": "SUCCESS",
    "venue_url": "https://meetwithfriends.com/venue/abc123...",
    "token": "abc123...",
    "created_at": "2026-01-27T10:00:00Z"
}

Response (Already Exists):
{
    "return_code": "SUCCESS",
    "venue_url": "https://meetwithfriends.com/venue/abc123...",
    "token": "abc123...",
    "created_at": "2026-01-25T10:00:00Z",
    "existing": true
}

Return Codes: SUCCESS, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, SERVER_ERROR
```

### 2. Revoke Venue Access

```
DELETE /api/events/:eventId/venue-access
Authorization: Required (must be event host/organiser)

Response:
{
    "return_code": "SUCCESS",
    "message": "Venue access revoked"
}

Return Codes: SUCCESS, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, SERVER_ERROR
```

### 3. Get Venue Access Status (for organizer UI)

```
GET /api/events/:eventId/venue-access
Authorization: Required (must be event host/organiser)

Response (Active):
{
    "return_code": "SUCCESS",
    "has_access": true,
    "venue_url": "https://meetwithfriends.com/venue/abc123...",
    "created_at": "2026-01-25T10:00:00Z"
}

Response (No Access):
{
    "return_code": "SUCCESS",
    "has_access": false
}

Return Codes: SUCCESS, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, SERVER_ERROR
```

### 4. Get Venue Dashboard (Public - Token Auth)

```
GET /api/venue/:token
Authorization: None (token in URL)

Response (Success):
{
    "return_code": "SUCCESS",
    "event": {
        "id": 1,
        "title": "Friday Dinner at Luigi's",
        "date_time": "2026-02-01T19:00:00Z",
        "location": "Luigi's Restaurant, 123 Main St",
        "description": "Monthly dinner meetup",
        "preorder_cutoff": "2026-01-30T12:00:00Z",  // null if not set
        "status": "published"
    },
    "group": {
        "name": "Downtown Foodies",
        "description": "A group of food enthusiasts exploring Sydney's best restaurants"
    },
    "organiser": {
        "name": "John Smith",
        "email": "john@example.com",      // from contact_email
        "mobile": "0412 345 678"          // from contact_mobile
    },
    "guests": [
        {
            "name": "John Smith",
            "food_order": "Margherita Pizza, Caesar Salad",
            "dietary_notes": "Vegetarian",
            "guest_count": 1,
            "rsvp_date": "2026-01-20T15:00:00Z"
        },
        {
            "name": "Jane Doe",
            "food_order": "Spaghetti Carbonara",
            "dietary_notes": null,
            "guest_count": 0,
            "rsvp_date": "2026-01-21T10:00:00Z"
        }
    ],
    "summary": {
        "total_attendees": 5,  // includes guest_count
        "with_preorders": 3,
        "with_dietary_notes": 1
    },
    "venue_notes": "Table 5 reserved, extra chairs needed"
}

Response (Invalid/Expired):
{
    "return_code": "INVALID_TOKEN",
    "message": "This venue link is invalid or has expired"
}

Response (Revoked):
{
    "return_code": "ACCESS_REVOKED",
    "message": "Access to this event has been revoked by the organizer"
}

Return Codes: SUCCESS, INVALID_TOKEN, ACCESS_REVOKED, EXPIRED_TOKEN
```

### 5. Update Venue Notes

```
PUT /api/venue/:token/notes
Authorization: None (token in URL)
Content-Type: application/json

Request:
{
    "notes": "Table 5 reserved. Extra high chair needed for party of 3."
}

Response:
{
    "return_code": "SUCCESS",
    "notes": "Table 5 reserved. Extra high chair needed for party of 3.",
    "updated_at": "2026-01-27T12:00:00Z"
}

Return Codes: SUCCESS, INVALID_TOKEN, ACCESS_REVOKED, EXPIRED_TOKEN, SERVER_ERROR
```

## Frontend Pages

### 1. Venue Dashboard Page

**Route:** `/venue/[token]`
**Auth:** None (public page, token validates access)

**Components:**
- **Status banner** (see below)
- Event header (title, date/time, location)
- Group name badge
- Organiser contact (name, email, mobile)
- Summary stats (total guests, preorders count, dietary notes count)
- Guest table with columns: Name, Food Order, Dietary Notes, +Guests
- Venue notes textarea (auto-saves on blur or after 2s of no typing)
- "Last updated" timestamp with manual refresh button
- Print buttons (Introduction leaflet, Thank You leaflet)

**Status Banner Logic:**

The venue needs to know whether the guest list is final or still changing.

| Scenario | Banner Style | Message |
|----------|--------------|---------|
| Has cutoff, before cutoff | Warning (amber) | "Pre-orders close [cutoff date]. Guest list may change until then." |
| Has cutoff, after cutoff | Success (green) | "Pre-orders closed. This is the final guest list." |
| No cutoff, before event | Info (blue) | "RSVPs open until [event date]. Guest list may change." |
| Event day or after | Success (green) | "Final guest list." |

Example banner:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⏳ PRE-ORDERS CLOSE: Thu 30 Jan 2026, 12:00 PM                 │
│  Guest list may change until then.                              │
└─────────────────────────────────────────────────────────────────┘
```

**UI States:**
- Loading: Skeleton loader
- Valid token: Full dashboard with status banner
- Invalid/expired token: Error message with explanation
- Revoked: "Access revoked" message

### 2. Organizer Venue Access Controls

**Location:** Event edit/manage page (existing)

**New Section: "Venue Access"**
- If no token exists: "Generate Venue Link" button
- If token exists:
  - Display shareable URL with copy button
  - "Revoke Access" button (with confirmation dialog)
  - Created date display

## Security Considerations

1. **Token Generation:** Use `crypto.randomBytes(32).toString('hex')` for 64-char tokens
2. **Token Expiry:** Check `event.date_time + 24 hours` on every request
3. **Revocation:** Check `revoked_at IS NULL` on every request
4. **Rate Limiting:** Consider rate limiting the public endpoint (future)
5. **No PII Leakage:** Only show guest names, food orders, dietary notes - no emails/phones

## Migration Script

```sql
-- Migration: Add venue_access_token table
-- Run this in production before deploying the feature

CREATE TABLE public.venue_access_token (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES public.event_list(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_by INTEGER NOT NULL REFERENCES public.app_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX idx_venue_access_token_token ON public.venue_access_token(token);
CREATE INDEX idx_venue_access_token_event_id ON public.venue_access_token(event_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_access_token TO meetwithfriends_user;
GRANT USAGE, SELECT ON SEQUENCE public.venue_access_token_id_seq TO meetwithfriends_user;
```

## File Changes Summary

### Backend (mwf-server)

| File | Action | Description |
|------|--------|-------------|
| `routes/venue/index.js` | Create | New route file for venue endpoints |
| `routes/events/venue-access.js` | Create | Endpoints for organizer to manage venue access |
| `routes/events/index.js` | Modify | Mount venue-access routes |

### Frontend (mwf-web)

| File | Action | Description |
|------|--------|-------------|
| `app/venue/[token]/page.tsx` | Create | Venue dashboard page |
| `app/venue/[token]/intro/page.tsx` | Create | Introduction leaflet (print-friendly) |
| `app/venue/[token]/thankyou/page.tsx` | Create | Thank you leaflet (print-friendly) |
| `components/venue/VenueDashboard.tsx` | Create | Main dashboard component |
| `components/venue/GuestTable.tsx` | Create | Guest list table component |
| `components/venue/VenueNotes.tsx` | Create | Auto-saving notes textarea |
| `components/venue/IntroLeaflet.tsx` | Create | Introduction leaflet layout |
| `components/venue/ThankYouLeaflet.tsx` | Create | Thank you leaflet layout |
| `components/events/VenueAccessSection.tsx` | Create | Organizer controls for venue access |
| `lib/apiClient.ts` | Modify | Add venue API functions |

## Open Questions

1. Should we allow multiple active tokens per event? (Current design: No, one at a time)
2. Should venues be able to download/export the guest list as CSV? (Future enhancement)
3. Should there be email notifications to organizer when venue views the page? (Probably not needed)

## Venue Leaflets

Two printable/shareable documents to build professional relationships with venues.

### 1. Introduction Leaflet (Pre-Event)

**Purpose:** Share with venue when making a booking to establish credibility and professionalism.

**Access:** Button on venue dashboard + organizer can access from event page

**Content:**

```
┌─────────────────────────────────────────────────────────┐
│  [MWF Logo]                                             │
│                                                         │
│  BOOKING CONFIRMATION                                   │
│  ─────────────────────                                  │
│                                                         │
│  Group: Downtown Foodies                                │
│  Organizer: John Smith                                  │
│  Contact: john@email.com | 0412 345 678                 │
│                                                         │
│  EVENT DETAILS                                          │
│  ─────────────────────                                  │
│  Date: Friday, February 1st 2026                        │
│  Time: 7:00 PM                                          │
│  Expected Guests: 12                                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ABOUT OUR GROUP                                        │
│                                                         │
│  [Group description from database]                      │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ABOUT MEET WITH FRIENDS                                │
│                                                         │
│  We use Meet With Friends to organize our events.       │
│  This means:                                            │
│                                                         │
│  ✓ Confirmed guest count before arrival                 │
│  ✓ Pre-orders submitted in advance (if enabled)        │
│  ✓ Dietary requirements clearly communicated            │
│  ✓ Single point of contact for coordination             │
│                                                         │
│  You can view our guest list and pre-orders at:         │
│  [Venue Dashboard Link]                                 │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Powered by MeetWithFriends.com                         │
└─────────────────────────────────────────────────────────┘
```

**Data Required:**
- Group name, description
- Organizer name, contact email, contact mobile (if show_email_to_guests / show_mobile_to_guests enabled)
- Event title, date/time, expected guest count
- Venue dashboard URL

### 2. Thank You Leaflet (Post-Event)

**Purpose:** Leave with venue after the meal to encourage reviews and promote MWF.

**Access:** Button on venue dashboard (appears after event date)

**Content:**

```
┌─────────────────────────────────────────────────────────┐
│  [MWF Logo]                                             │
│                                                         │
│  THANK YOU!                                             │
│  ─────────────────────                                  │
│                                                         │
│  On behalf of Downtown Foodies, thank you for           │
│  hosting our event on February 1st, 2026.               │
│                                                         │
│  We had a wonderful time and appreciated your           │
│  hospitality and service.                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ⭐⭐⭐⭐⭐                                             │
│                                                         │
│  We'll be leaving you a 5-star review on Google         │
│  and recommending you to our members.                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PARTNER WITH US                                        │
│                                                         │
│  Meet With Friends connects restaurants with            │
│  organized social groups looking for great venues.      │
│                                                         │
│  If you'd like to be featured to our community:         │
│                                                         │
│  → Visit: meetwithfriends.com/venues                    │
│  → Email: venues@meetwithfriends.com                    │
│                                                         │
│  [QR Code to MWF website]                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  We hope to see you again soon!                         │
│  - The Downtown Foodies                                 │
└─────────────────────────────────────────────────────────┘
```

**Data Required:**
- Group name
- Event date
- MWF branding/links

### Leaflet Implementation

**Format:** Print-friendly web pages with `@media print` CSS

**Routes:**
- `/venue/[token]/intro` - Introduction leaflet
- `/venue/[token]/thankyou` - Thank you leaflet

**Features:**
- "Print" button triggers `window.print()`
- "Download PDF" button (future - use browser print-to-PDF for now)
- Clean, minimal design optimized for A4/Letter printing
- Works in both color and black & white

**UI on Venue Dashboard:**
- Two buttons: "Print Introduction" and "Print Thank You"
- Thank You button could be highlighted/prominent after event date passes

#### Leaflet Decisions

| Question | Decision |
|----------|----------|
| Organizer contact on intro leaflet | Always show (ignore privacy settings - this is for venue coordination) |
| QR code destination | Dedicated venue page (TBD - placeholder for now) |
| Customizable thank you message | No - keep it standard |
| Branding | Match landing page (see below) |

### Branding Guidelines (from Landing Page)

**Logo:**
- Text: "Meet With Friends"
- Font: `font-display text-xl font-bold text-slate-800`
- Icon: `/icon.png` (32x32 rounded logo)

**Colors:**
- Primary CTA: `bg-gradient-to-r from-rose-500 to-orange-400`
- Secondary accent: `indigo-600`
- Text: `slate-800` (headings), `slate-600` (body), `slate-500` (muted)
- Background: `slate-50` (light sections), `white`

**Style:**
- Warm, editorial feel
- Rounded corners: `rounded-full` (buttons), `rounded-2xl` (cards)
- Subtle shadows and gradients
- Clean, professional appearance

---

## Future Enhancements (Out of Scope)

- Venue accounts with persistent login
- Two-way messaging between venue and organizer
- Venue confirmation/acknowledgment of booking
- CSV export of guest list
- Customizable leaflet templates
- Venue partnership/listing program

---

## Approval Checklist

- [ ] Database schema approved
- [ ] API design approved
- [ ] UI/UX flow approved
- [ ] Security considerations reviewed
- [ ] Ready for implementation
