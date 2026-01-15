# Event Screen Redesign Considerations

This document captures design considerations for the Flutter event detail screen (`mwf-flutter/lib/screens/event_detail_screen.dart`).

---

## 1. Header Responsiveness

### Current State
- Fixed height of 140px
- Event title positioned at bottom of gradient
- Title can wrap but no overflow protection

### Problem
- `event_list.title` allows up to 200 characters (VARCHAR 200)
- Long titles could overflow beyond header bounds
- Fixed 140px doesn't scale across device sizes (phone vs tablet)

### Proposed Solution

**Title truncation:**
- Limit to 2 lines maximum
- Use `TextOverflow.ellipsis` for overflow
- Rationale: Header is a visual showcase, not a text dump. 2 lines is sufficient for scannability.

**Responsive height:**
- Use percentage of screen height (~18%) instead of fixed pixels
- Apply min/max constraints: ~120px min, ~180px max
- Example: `MediaQuery.of(context).size.height * 0.18`

**Why not flexible height based on content?**
- Unpredictable layout - long titles push content down
- Inconsistent experience between events
- Breaks visual rhythm of the screen

---

## 2. Visual Design Analysis

*Based on screenshot review (January 2026)*

### What's Working

- **Gradient hero** creates visual interest and establishes brand color
- **Card-based layout** provides clear content separation
- **Host avatar with badge** is clear and tappable
- **"You're going" pill** is satisfying feedback

### Issues to Address

**Information Density Below the Gradient**
The area below the gradient is cramped with competing elements at similar visual weight:
- Calendar emoji + date
- Pin emoji + location
- Avatar + "Hosted by"
- Status pill + Edit

Everything fights for attention. There's no clear visual hierarchy.

**Emoji Icons Feel Cheap**
The refined gradient header clashes with casual emojis (📅 📍). They cheapen the aesthetic. Consider custom icons or a consistent icon set.

**"About this event" Card is Floating**
- Doesn't span full width like other cards
- Feels orphaned and disconnected
- Excessive internal whitespace for tiny content

**Attendees Section**
- Only showing 1 avatar + "+4" is stingy - screen width can fit 4-5 avatars
- "See all • 5 spots left" - the dot separator creates confusion about whether these are related
- Host badge at avatar bottom feels cramped

**Confusing Title/Location**
Event title and location can be the same (e.g., "Corbet Arms"), creating cognitive friction. Consider how to differentiate when venue = event name.

**"Edit" Looks Like Dead Text**
No visual affordance that it's tappable. Should feel like a button or link.

**Overall: Safe but Forgettable**
The gradient does the heavy lifting. Everything else is competent but generic. No memorable moments below the fold.

### Design Opportunities

| Area | Current | Opportunity |
|------|---------|-------------|
| Icons | Emojis | Custom/consistent icon set |
| Info layout | Stacked list | Group related info, add breathing room |
| Attendees | 1 avatar + "+4" | Show 4-5 avatars in a row |
| About card | Floating narrow | Full-width or integrate differently |
| Edit action | Plain text | Subtle button styling |
| Visual rhythm | Uneven spacing | Consistent 16/24px system |

---

## 3. Icon Replacement

### Current State
Using emoji icons (📅 📍) which clash with the refined gradient header aesthetic.

### Available Resources (No External Dependencies Needed)

| Source | Access | Already Enabled |
|--------|--------|-----------------|
| **Material Icons** | `Icons.xxx` | `uses-material-design: true` |
| **Cupertino Icons** | `CupertinoIcons.xxx` | `cupertino_icons: ^1.0.8` |

### Suggested Replacements

| Current | Material Icon Option |
|---------|---------------------|
| 📅 | `Icons.calendar_today_outlined` or `Icons.event_outlined` |
| 📍 | `Icons.location_on_outlined` or `Icons.place_outlined` |

### Optional External Packages (If More Variety Needed)

- `lucide_icons` - clean, modern style
- `phosphor_flutter` - good variety, multiple weights
- `heroicons_flutter` - matches Heroicons if used on web

### Recommendation

Material Icons are solid and already available. The key is **consistency** - use icons throughout instead of mixing with emojis. Style them with appropriate size and color to match the UI.

---

## 4. Overall Responsive Design

### Current State
- Fixed pixel values used throughout (140px header, 56px avatars, etc.)
- Attendees section shows only 1 avatar + "+N" regardless of screen width
- Cards use fixed margins (16px) on all devices
- No tablet-specific layouts

### Screen Size Considerations

| Element | Phone | Tablet | Approach |
|---------|-------|--------|----------|
| Header height | ~120px | ~180px | % of screen with min/max |
| Card margins | 16px | 24-32px | Scale with breakpoint |
| Attendees shown | 4-5 avatars | 6-8 avatars | Based on available width |
| Content max-width | Full width | 600-700px centered | Prevent overly wide cards |
| Info layout | Stacked | Could be side-by-side | Consider 2-column on tablet |

### Breakpoint Strategy

Suggested breakpoints (matching CLAUDE.md patterns):
- **Small phone**: < 360px
- **Phone**: 360-600px
- **Tablet**: 600-900px
- **Large tablet**: > 900px

### Specific Recommendations

**Attendees Section:**
- Calculate visible avatars based on container width
- Formula: `(containerWidth - padding) / (avatarSize + spacing)`
- Show as many as fit, with "+N" for remainder

**Cards:**
- Apply `maxWidth` constraint on larger screens (already done: 600px)
- Increase horizontal padding on tablets

**Spacing System:**
- Use consistent 8px grid (8, 16, 24, 32)
- Scale up one step on tablet (16 → 24, 24 → 32)

**Hero Card on Tablet:**
- Could show more info in the gradient area
- Or keep current layout but with better proportions

### Flutter Implementation Notes

```
// Example responsive value
final screenWidth = MediaQuery.of(context).size.width;
final isTablet = screenWidth >= 600;
final cardMargin = isTablet ? 24.0 : 16.0;
final avatarsToShow = ((screenWidth - 72) / 72).floor().clamp(3, 8);
```

---

## 5. Other Considerations

*Space for additional notes...*

---

## Implementation Notes

When implementing these changes, consider:
- Testing with maximum length titles (200 chars)
- Testing across device sizes (small phone, large phone, tablet)
- Ensuring the gradient icon doesn't clash with wrapped title text

---

*Last updated: January 2026*
