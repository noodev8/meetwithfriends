# Pre-Order Feature (Future Phase)

This document outlines the pre-order feature planned for a future phase of MWF. This is a simplified, host-facing approach - not the full restaurant integration described in the long-term vision.

## Overview

Allow hosts to share a menu link and collect food orders from attendees before an event. Orders are free text (not structured menu items) with optional dietary notes.

## Use Case

**Example: Sunday pub meal at The Corbet Arms**

1. Host creates event, adds menu link (pub's online menu or PDF)
2. Host sets pre-order cutoff (e.g., Friday 6pm for Sunday lunch)
3. Attendees RSVP and view the menu link
4. Attendees enter their order: "Roast beef, medium rare, extra yorkies"
5. Attendees add dietary notes if needed: "Gluten free - please check gravy"
6. Host exports/views all orders before cutoff
7. Host sends combined order to venue (phone, email, or in person)

## Schema Changes

Four columns across two existing tables:

```sql
-- Add to event_list
ALTER TABLE event_list ADD COLUMN menu_link TEXT;
ALTER TABLE event_list ADD COLUMN preorder_cutoff TIMESTAMP;

-- Add to event_rsvp
ALTER TABLE event_rsvp ADD COLUMN food_order TEXT;
ALTER TABLE event_rsvp ADD COLUMN dietary_notes TEXT;
```

### Column Details

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| event_list | menu_link | TEXT | URL to menu (restaurant website, PDF, image) |
| event_list | preorder_cutoff | TIMESTAMP | Deadline for submitting orders (null = no deadline) |
| event_rsvp | food_order | TEXT | Free text order from attendee |
| event_rsvp | dietary_notes | TEXT | Allergies, dietary requirements, special requests |

## UI Components

### Host: Event Creation/Edit
- Menu link field (URL input)
- Pre-order cutoff date/time picker
- Toggle: "Require pre-orders for this event" (optional future enhancement)

### Host: Event Management
- View all orders in a list
- Export orders (copy to clipboard, or simple text format for emailing to venue)
- See who hasn't ordered yet (if cutoff approaching)

### Attendee: Event Page
- "View Menu" button (opens menu_link in new tab)
- "Your Order" section (appears after RSVP)
- Text area for food order
- Text area for dietary notes
- Visual indicator if cutoff has passed (read-only after cutoff)

### Attendee: Your Events Page
- Show "Order submitted" or "Order needed" status
- Quick link to add/edit order before cutoff

## API Endpoints

### Existing endpoints to modify:
- `POST /api/events/create_event` - Accept menu_link, preorder_cutoff
- `POST /api/events/update_event` - Accept menu_link, preorder_cutoff
- `GET /api/events/get_event` - Return menu_link, preorder_cutoff, user's order

### New endpoints:
- `POST /api/events/submit_order` - Submit/update food_order and dietary_notes
- `GET /api/events/get_orders` - Host only: get all orders for an event

## Business Rules

1. **Order timing**: Orders can be submitted/edited anytime before cutoff (or anytime if no cutoff set)
2. **Order after cutoff**: Read-only - attendee can see their order but not edit
3. **RSVP cancellation**: Order is retained but marked as cancelled (host sees it struck through)
4. **Waitlist**: Waitlisted attendees can submit orders (optimistic - they might get promoted)
5. **No order required**: Pre-orders are always optional unless host explicitly requires them (future enhancement)

## Design Decisions

### Why free text instead of structured menu?
- Menus change frequently - no maintenance burden
- Works with any venue (even those without online menus)
- Handles special requests naturally ("no onions", "extra sauce")
- Simpler to build, simpler to use
- Host knows their venue - structured data not needed

### Why URL for menu instead of upload?
- Most restaurants have menus online already
- No storage/hosting costs
- Always up to date (links to source)
- Host can still link to a Cloudinary-uploaded image if needed

### Relationship to GroupBook
GroupBook is a separate, venue-facing tool that remains independent. It has its own schema:
- `app_user` (venue accounts)
- `event` (venue's bookings)
- `guest` (attendees with orders)

MWF's pre-order feature is simpler and host-facing. The two may integrate in the future (host sends order to venue's GroupBook) but for now they are separate tools.

## Out of Scope (For This Phase)

- Structured menu builder
- Price tracking / payment integration with orders
- Automatic sending to venue
- Venue confirmations
- Order modifications after submission (host-managed externally)
- Split bill integration (separate SplitDine tool)

## Implementation Priority

This is Phase 2, to be built immediately after Phase 1 (MVP) is stable.

Payments & Deposits (Stripe Connect) has been moved to Phase 3 - pre-orders provide immediate value without payment complexity.

## Migration Notes

When adding columns:
- All existing events will have NULL for menu_link and preorder_cutoff (no pre-orders)
- All existing RSVPs will have NULL for food_order and dietary_notes
- No data migration needed - new columns are optional
