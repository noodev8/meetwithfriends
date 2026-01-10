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

## Final Structure

```
ESSENTIALS CARD (always visible)
├── Event Title *
├── Date * | Time *
├── Location
└── Description

OPTIONS SECTION (individual collapsible cards with status hints)
├── Featured Image · None/Added
├── Capacity · Unlimited/X spots
├── Guests · Not allowed/Up to X per member
└── Attendee Requests · Off/Enabled

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
- [x] Fixed auth timing bug that showed "Please log in" error on refresh
- [x] Submit buttons moved to bottom of form (after Options section)

**Notes:**
- These should always be visible
- Keep tips sidebar for desktop
- Consider inline tips/icons for mobile

---

### Section 2: Options Section
**Status:** Complete

**Approach:**
- "Options" subtitle with individual collapsible cards
- Each card shows status hint when collapsed (e.g., "Capacity · Unlimited")
- All cards collapsed by default for shortest initial form
- Equal visual weight to all options (no special highlighting)

**Contains (4 individual collapsible cards):**
1. Featured Image · None/Added
2. Capacity · Unlimited/X spots
3. Guests · Not allowed/Up to X per member
4. Attendee Requests · Off/Enabled

**Changes made:**
- [x] Added "Options" section subtitle (uppercase, tracking-wide)
- [x] Split accordion into 4 individual collapsible cards
- [x] All collapsed by default - form is very short initially
- [x] Status hints visible when collapsed (e.g., "Capacity · Unlimited")
- [x] Each card has icon + title + status hint in header
- [x] Consistent styling across all option cards (no amber accents)
- [x] Chevron indicator rotates on expand/collapse
- [x] Moved Create Event button to bottom of form

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
| 2026-01-10 | Section 2 | **Major restructure**: Split into 4 individual collapsible cards with status hints. All collapsed by default. Removed amber accents. Moved Create button to bottom. |

---

## Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| Single page with collapsible sections (not wizard) | Speed for common case, power users need efficiency, most events are simple | 2026-01-10 |

---

## Resolved Questions

### Create Event Button Placement
**Decision:** Option B - After all options at the bottom of the form

**Rationale:** With all options collapsed by default, the form is short enough that the Create button is visible without scrolling. Users scan through the options, expand what they need, then click Create at the bottom. Traditional form flow.
