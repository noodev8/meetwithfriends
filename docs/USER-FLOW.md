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

**Single chronological list** combining Attending + Waitlist events.

- Events sorted by date (soonest first)
- Past events automatically hidden (accessible via Group Dashboard)
- **Full list OK** - user has manually accepted each, won't grow indefinitely
- **Status badges** distinguish Going vs Waitlist (with queue position)
- **Host badge** - events where user is a host show amber badge

**Why combined?** Users want to see "what have I committed to" - both Going and Waitlist are commitments. A waitlisted event tomorrow matters more than an attending event next month.

### Empty State
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

All API changes have been implemented.

| Change | File | Status |
|--------|------|--------|
| `is_host` field | `my_rsvps.js` | ✅ Done |
| `?unresponded=true` filter | `my_events.js` | ✅ Done |

---

## Implementation Status

| Feature | Web | Flutter | API | Priority |
|---------|-----|---------|-----|----------|
| My Events as primary screen | In Progress | Partial | ✅ Ready | HIGH |
| Host badge on events | In Progress | No | ✅ Ready | HIGH |
| Explore screen (combined) | Pending | No | ✅ Ready | MEDIUM |
| Empty states with CTAs | Basic | Basic | N/A | MEDIUM |
| Combined list (no separate waitlist) | In Progress | No | ✅ Ready | HIGH |

---

## Next Steps

### Web (In Progress)
1. ✅ API: `is_host` field added to my-rsvps
2. ✅ API: `?unresponded=true` filter added to my-events
3. 🔄 Add host badge to EventCard component (amber `#F59E0B`)
4. 🔄 Restructure `/your-events` to use `getMyRsvps()` (committed events only)
5. 🔄 Update navigation: "Events" → "My Events", add "Explore"
6. ⏳ Create `/explore` page (new events + discover groups)
7. ⏳ Update empty states with CTAs to Explore

### Flutter (Pending)
1. Add host badge to event cards
2. Update Home screen to show combined Attending + Waitlist
3. Create Explore tab (rename current "Events" tab)

---

## Decisions Log

| Question | Decision |
|----------|----------|
| Separate "Events I'm Hosting" section? | **No** - badge on event card is sufficient |
| Discover prominence for new vs established? | **Same** - equal prominence for all users |
| Combine new events + discover groups? | **Yes** - single Explore screen |
| Show past events on My Events? | **No** - access via Group Dashboard |
| Limit lists on landing? | **Yes** for Explore, **No** for My Events |
| Separate Attending vs Waitlist sections? | **No** - single chronological list with status badges |

---

*Last updated: Jan 2026*
