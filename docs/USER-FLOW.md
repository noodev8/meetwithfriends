# Meet With Friends - User Flow Design

Defines the ideal navigation and user experience across web and Flutter apps.

---

## Core Principle

**Primary focus: "What am I going to?"**

Every user's first question when opening the app is: "What events have I committed to?" Everything else is secondary.

---

## Primary Screen: My Events

The default landing view for all logged-in users. Shows events the user has committed to.

### Content Hierarchy

#### 1. Attending (Primary)
- Events where user RSVP status = `attending`
- Sorted chronologically (soonest first)
- Past events automatically hidden (stay accessible via Group Dashboard)
- **Full list OK** - user has manually accepted each, won't grow indefinitely
- **Host badge** - events where user is a host show a badge/indicator (no separate section)

#### 2. Waitlist (Secondary)
- Events where user RSVP status = `waitlist`
- Separate section below Attending
- Collapsible or visually distinct
- Shows position in queue if available

#### 3. Empty State
When user has no upcoming events:
- Friendly message: "No upcoming events"
- CTA: "See what's happening in your groups" → links to Explore

### Event Card Information
Each event card should show:
- Event title
- Date & time (formatted nicely)
- Location (if set)
- Group name (clickable to group)
- Category icon/badge
- **Host badge** (if user is hosting this event)

### Host Quick Access
Hosts need to quickly find their event for urgent communication (e.g., broadcast message).
- Host badge on event card makes it visually distinct
- Tapping event → event page with host controls
- From event → can access group for broadcast

---

## Navigation Structure

### Flutter (Mobile)

**Bottom Navigation Bar (4 tabs):**

| Tab | Screen | Content |
|-----|--------|---------|
| **Home** | My Events | Full list of Attending + Waitlist |
| **Explore** | Explore | New events (limited) + Discover groups |
| **Groups** | My Groups | Groups I belong to |
| **Profile** | Profile | Settings & account |

*Note: "Home" label is standard UX, content is My Events.*

### Web (Desktop/Tablet)

**Sidebar Navigation:**

| Item | Screen | Content |
|------|--------|---------|
| **My Events** | /your-events | Full list of Attending + Waitlist |
| **Explore** | /explore | New events (limited) + Discover groups |
| **My Groups** | /my-groups | Groups I belong to |
| **Profile** | /profile | Settings (or header dropdown) |

---

## Explore Screen

Combines discovery of new events and new groups in one place.

### Section 1: New Events in My Groups
- Events from groups I belong to where I haven't RSVP'd
- **Limited list** (e.g., 6-10 events max)
- "See all" link → dedicated page with full list
- Sorted by date (soonest first)
- Excludes events I've already responded to

### Section 2: Discover Groups
- Browse groups to join
- Same prominence for new and established users
- Listed groups only (not unlisted)
- Search/filter capability

---

## List Length Guidelines

| List | Limit | Notes |
|------|-------|-------|
| My Events (Attending) | **Full list** | User accepted each manually, self-limiting |
| My Events (Waitlist) | **Full list** | Same as above |
| Explore: New Events | **6-10 max** | "See all" links to dedicated page |
| Explore: Discover Groups | **Paginated** | Load more / infinite scroll |
| My Groups | **Full list** | Unlikely to be excessive |

---

## User Scenarios

### New User (No Groups)
1. Opens app → Empty "My Events" screen
2. Empty state prompts: "Join a group to see events"
3. CTA leads to Explore → Discover Groups section
4. After joining a group → sees that group's events in Explore
5. RSVPs to event → appears in My Events

### Returning User (Has Events)
1. Opens app → Sees "My Events" with upcoming commitments
2. Host badge visible on events they're hosting
3. At a glance knows schedule
4. Can tap Explore to find more events

### Returning User (No Upcoming Events)
1. Opens app → Empty "My Events" screen
2. Empty state: "No upcoming events"
3. CTA: "See what's happening" → Explore
4. Finds and RSVPs to events

### Host Needing Urgent Access
1. Opens app → Sees their hosted event with badge in My Events
2. Taps event → Event page with host controls
3. Can message attendees or access group for broadcast
4. **Fast path**: 2 taps from app open to event management

---

## Past Events

- **Not shown** on My Events screen (only upcoming)
- **Accessible via Group Dashboard** → group's event history
- Each group maintains its own event archive

---

## Decisions Log

| Question | Decision |
|----------|----------|
| Separate "Events I'm Hosting" section? | **No** - badge on event card is sufficient |
| Discover prominence for new vs established? | **Same** - equal prominence for all users |
| Combine new events + discover groups? | **Yes** - single Explore screen |
| Show past events on My Events? | **No** - access via Group Dashboard |
| Limit lists on landing? | **Yes** for Explore, **No** for My Events |

---

## API Requirements

### Existing APIs

| Screen | Endpoint | Returns |
|--------|----------|---------|
| Home (My Events) | `GET /api/users/my-rsvps` | Events where user RSVP = attending/waitlist |
| Explore: Discover | `GET /api/groups/discover` | Groups user is NOT a member of |
| Groups | `GET /api/users/my-groups` | User's groups with role |
| All Events (from groups) | `GET /api/users/my-events` | All events from user's groups |

### API Changes Required

#### 1. Add `is_host` to my-rsvps (HIGH)
**File:** `mwf-server/routes/users/my_rsvps.js`
**Effort:** Small (5 mins)

Add host indicator to each event in response:
```json
{
  "is_host": true
}
```

**SQL change:** Add EXISTS subquery:
```sql
EXISTS(SELECT 1 FROM event_host eh WHERE eh.event_id = e.id AND eh.user_id = $1) AS is_host
```

**Enables:** Host badge on Home screen event cards.

---

#### 2. Add `?unresponded=true` filter to my-events (MEDIUM)
**File:** `mwf-server/routes/users/my_events.js`
**Effort:** Small (10 mins)

Add optional query parameter to filter events where user has NO RSVP.

**Current:** Returns all upcoming events from user's groups (with rsvp_status which may be null, attending, or waitlist)

**Change:** When `?unresponded=true`, only return events where `rsvp_status IS NULL`

**SQL change:** Add conditional WHERE clause:
```sql
-- When unresponded=true:
AND user_rsvp.status IS NULL
```

**Enables:** Explore screen "New Events in My Groups" section.

---

### API Summary

| Change | File | Effort | Enables |
|--------|------|--------|---------|
| Add `is_host` field | `my_rsvps.js` | 5 mins | Host badge on Home |
| Add `?unresponded=true` | `my_events.js` | 10 mins | Explore new events |

**Total API work:** ~15 minutes

---

## Implementation Status

| Feature | Web | Flutter | API | Priority |
|---------|-----|---------|-----|----------|
| My Events as primary screen | Partial | Partial | Ready | HIGH |
| Host badge on events | No | No | **Needs `is_host`** | HIGH |
| Explore screen (combined) | No | No | Needs filter | MEDIUM |
| Empty states with CTAs | Basic | Basic | N/A | MEDIUM |
| Waitlist section | ? | ? | Ready | LOW |

---

## Next Steps

1. **API: Add `is_host` to my-rsvps** - enables host badge
2. **API: Add `?unresponded=true` to my-events** - enables Explore new events
3. **Flutter: Update Home tab** - make it My Events focused
4. **Flutter: Rename "Events" tab to "Home"** - keep standard label
5. **Both: Add host badge** to event cards
6. **Both: Create Explore screen** - new events + discover groups
7. **Both: Update empty states** with proper CTAs

---

*Last updated: Jan 2026*
