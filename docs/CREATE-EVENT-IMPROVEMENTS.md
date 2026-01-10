# Create Event Page Improvements

## Overview
Redesigning the Create Event page to be simpler for the common case while showcasing MWF's differentiating features (pre-orders, guest management) over Meetup.

**File:** `mwf-web/src/app/groups/[id]/events/create/page.tsx`

---

## Current Issues

### High Priority
1. **Form is too long** - Requires scrolling to see Create button even on large screens
2. **Pre-orders buried** - Key differentiator from Meetup is at the bottom, easy to miss
3. **Inconsistent checkbox styling** - "Allow guests" has card style, "Pre-orders" is plain checkbox

### Medium Priority
4. **Featured Image dominates** - Takes lots of space mid-form, most events won't use it
5. **Field order is off** - Image before Description feels unnatural
6. **No visual hierarchy** - Optional fields look as important as required ones

### Low Priority
7. **Date/Time UX** - Native pickers show raw browser defaults
8. **No preview** - Can't see what event will look like before creating
9. **Mobile loses tips** - All guidance hidden on mobile

---

## Proposed Structure

```
ESSENTIALS (always visible)
├── Event Title *
├── Date * | Time *
├── Location
└── Description

EVENT OPTIONS (expandable/collapsible)
├── Featured Image
├── Capacity & Waitlist
├── Guest Policy
└── Pre-orders

[Create Event] [Cancel]
```

---

## Implementation Sections

### Section 1: Essentials
**Status:** Complete

**Fields:**
- Event Title (required)
- Date and Time (required, side by side)
- Location (optional but commonly used)
- Description (optional, rich text)

**Changes made:**
- [x] Moved Description above Featured Image (natural flow: write first, add image later)
- [x] Added code comments to separate sections visually
- [x] Essentials now in their own card (Card 1)
- [x] Submit buttons (Create Event + Cancel) added to Card 1
- [x] Fixed auth timing bug that showed "Please log in" error on refresh

**Notes:**
- These should always be visible
- Keep tips sidebar for desktop
- Consider inline tips/icons for mobile

---

### Section 2: Event Options Accordion
**Status:** Complete

**Approach:**
- Collapsible section for advanced options
- Show summary of selected options when collapsed
- Consistent card-style for all toggle options

**Contains:**
- Featured Image upload
- Capacity (with waitlist explanation)
- Guest Policy (allow guests toggle + max per RSVP)
- Pre-orders (toggle + menu link + cutoff)

**Changes made:**
- [x] Created collapsible accordion with header "Event Options"
- [x] Collapsed by default - form is much shorter initially
- [x] Added chevron indicator that rotates on expand
- [x] Made pre-orders use same card-style checkbox as guests (consistent)
- [x] Removed old border-top separator from pre-orders
- [x] Moved Event Options to its own card (Card 2) - separate from essentials
- [ ] Consider: Show summary badges when collapsed (e.g., "Capacity: 20, Guests allowed")

---

### Section 3: Attendee Requests (formerly Pre-orders)
**Status:** Complete

**Goal:** Make this feel like a feature, not an afterthought

**Changes made:**
- [x] Moved out of Event Options accordion into its own Card 3
- [x] Highlighted design with warm amber/orange gradient background
- [x] Prominent icon (clipboard) in brand colors
- [x] Renamed to "Attendee Requests" - broader than just food pre-orders
- [x] Updated subtitle: "Collect orders, preferences, or details from attendees before the event"
- [x] Updated field labels: "Link" and "Cutoff" (more generic)
- [x] Updated helper text to mention menus, forms, or any link

**Fields:**
- Enable toggle
- Link (optional) - menu, form, or any URL
- Cutoff date/time (optional)

---

### Section 4: Mobile Experience
**Status:** Not started

**Issues:**
- Tips sidebar completely hidden
- Long form is worse on mobile

**Options:**
- Inline help icons/tooltips next to field labels
- Condensed tips at top of form
- Progressive disclosure even more important on mobile

---

### Section 5: Polish & UX
**Status:** In progress

**Items:**
- [x] Consistent checkbox/toggle styling (done in Section 2)
- [x] Time picker - dropdown + quick presets (Day: 12pm, 2pm, 3pm / Eve: 5pm, 6pm, 7pm)
- [ ] Date picker - kept native (works well, has calendar popup)
- [ ] Inline validation (parked)
- [ ] Preview functionality (future)
- [ ] Duplicate from previous event (future)

---

## Progress Log

| Date | Section | Changes Made |
|------|---------|--------------|
| 2026-01-10 | Section 1 | Reordered fields: Title → Date/Time → Location → Description. Moved Featured Image to Section 2. |
| 2026-01-10 | Section 2 | Created collapsible accordion for Event Options. Collapsed by default. Consistent checkbox styling. |
| 2026-01-10 | Section 1+2 | Split form into two cards: Card 1 (Essentials + Submit), Card 2 (Event Options). Fixed auth timing bug. |
| 2026-01-10 | Section 3 | Created Card 3 for Attendee Requests with highlighted design. Renamed from Pre-orders. Broadened wording. |
| 2026-01-10 | Section 5 | Added time picker with dropdown + quick presets (Day/Eve). Kept native date picker. |

---

## Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| Single page with collapsible sections (not wizard) | Speed for common case, power users need efficiency, most events are simple | 2026-01-10 |

---

## Open Questions

### Create Event Button Placement
**Options being considered:**

| Option | Pros | Cons |
|--------|------|------|
| A. After Description, before accordion | Quick create without scrolling | Unconventional placement |
| B. After accordion (current) | Traditional form flow | Requires scroll on long forms |
| C. Sticky at bottom of form | Always visible | Can feel intrusive |
| D. Sidebar under group info card | Visible on desktop, contextual | Mobile placement unclear |

**Decision:** TBD - will revisit after other sections complete
