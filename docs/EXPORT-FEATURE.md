# Export Feature Implementation Plan

## Overview

Add export functionality for hosts to share event data with venues. Consolidates existing clipboard feature with new PDF generation.

## Current State

- Guest List page (web) has "Copy to Clipboard" for guest names
- Guest List page is viewable by all attendees (transparency - guests can see what others ordered)
- No PDF generation
- No host-specific export UI

## Proposed UX

### Single "Export" Button

On event detail page (host/organiser view only), add an "Export" button that opens a modal/bottom sheet:

```
┌─────────────────────────────────────┐
│  Export                             │
├─────────────────────────────────────┤
│                                     │
│  📋  Copy Guest List                │
│      Names and RSVP status          │
│                                     │
│  📄  Download Pre-Orders (PDF)      │
│      Table of all orders            │
│      (only shown if pre-orders on)  │
│                                     │
└─────────────────────────────────────┘
```

### PDF Content

```
┌────────────────────────────────────────────┐
│  PRE-ORDER SUMMARY                         │
│                                            │
│  [Group Name]                              │
│  [Event Title]                             │
│  [Date & Time]                             │
│  [Location]                                │
├────────────────────────────────────────────┤
│                                            │
│  Guest            Order                    │
│  ─────────────────────────────────────     │
│  John Smith       Fish and chips please    │
│                                            │
│  Jane Doe         Beef burger, no bun      │
│                   Note: Gluten free        │
│                                            │
│  Bob Wilson       Fish & chips             │
│                                            │
│  (3 guests haven't ordered yet)            │
│                                            │
├────────────────────────────────────────────┤
│  8 guests confirmed · 5 orders submitted   │
│  Generated [date/time]                     │
│  meetwithfriends.com                       │
└────────────────────────────────────────────┘
```

## Technical Approach

### Backend

**New Endpoint:**
```
GET /events/:id/preorders/pdf
Authorization: Host or Organiser only
Response: application/pdf
```

**Technology:** `@react-pdf/renderer`
- Runs on Node.js
- React-like component API
- Clean, maintainable templates

**Data needed:**
- Event details (title, date, location, group name)
- RSVPs with food_order and dietary_notes
- Guest names

### Web Implementation

1. Add "Export" button to event detail page (host view)
2. On click, show modal with options
3. "Copy Guest List" - existing clipboard logic
4. "Download Pre-Orders" - fetch PDF from API, trigger download

### Flutter Implementation

1. Add "Export" button to event detail screen (host view)
2. On tap, show bottom sheet with options
3. "Copy Guest List" - copy to clipboard
4. "Download Pre-Orders" - fetch PDF, open share sheet or save

## Implementation Tasks

### Phase 1: Backend PDF Generation
- [ ] Install @react-pdf/renderer
- [ ] Create PDF template component
- [ ] Create GET /events/:id/preorders/pdf endpoint
- [ ] Add authorization (host/organiser only)
- [ ] Test PDF output

### Phase 2: Web UI
- [ ] Add Export button to event detail page
- [ ] Create ExportModal component
- [ ] Implement "Copy Guest List" option
- [ ] Implement "Download Pre-Orders" option
- [ ] Only show pre-orders option if preorders_enabled

### Phase 3: Flutter UI
- [ ] Add Export button to event detail screen
- [ ] Create export bottom sheet
- [ ] Implement "Copy Guest List" option
- [ ] Implement "Download Pre-Orders" option (share sheet)
- [ ] Only show pre-orders option if preordersEnabled

### Phase 4: Testing
- [ ] Keep Guest List page clipboard as-is (for all attendees)
- [ ] Test full flow on web and mobile
- [ ] Verify host-only visibility of Export button

## Future Enhancements (Not This Release)

- [ ] Email to venue directly from app
- [ ] Shareable link (venue views live data)
- [ ] Smart grouping of similar orders
- [ ] Include menu images in PDF
- [ ] Reminder to export when cutoff passes

## Questions Resolved

1. **Manual only** - No auto-send, host initiates export
2. **No online view yet** - PDF download only for now
3. **Free text orders** - No auto-summary, just table of orders
4. **Location**: Event detail page, single Export button

## Dependencies

- `@react-pdf/renderer` (backend)
- Existing auth middleware
- Existing RSVP data with food_order field
