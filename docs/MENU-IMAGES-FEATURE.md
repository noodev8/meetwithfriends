# Menu Images Feature

## Overview

Enable hosts to upload menu images (photos of physical menus) that guests can view in-app while placing pre-orders. This solves the UX problem of users having to switch between the app and an external browser to reference the menu.

## Current State

| Layer | Field | Type | Behavior |
|-------|-------|------|----------|
| Database | `menu_link` | `TEXT` | Single URL string |
| Backend API | `menu_link` | string | Passed through |
| Web Frontend | `menuLink` | string | Single URL input |
| Flutter | `menuLink` | `String?` | Opens external browser |

## Proposed Changes

### 1. Database

Add new column to `event_list` table:

```sql
ALTER TABLE event_list ADD COLUMN menu_images TEXT[];
```

- PostgreSQL TEXT array for list of Cloudinary URLs
- NULL default maintains backward compatibility
- Existing events continue working unchanged

### 2. Backend API

**Files to modify:**
- `mwf-server/routes/events/create_event.js`
- `mwf-server/routes/events/update_event.js`
- `mwf-server/routes/events/get_event.js`

**Request payload addition:**
```json
{
  "menu_images": ["https://cloudinary.com/...", "https://cloudinary.com/..."]
}
```

**Validation:**
- Must be array if provided
- Each item should be valid URL string
- Maximum 10 images (reasonable limit)

### 3. Web Frontend

**Files to modify:**
- `mwf-web/src/app/groups/[id]/events/create/page.tsx`
- `mwf-web/src/app/events/[id]/edit/page.tsx`
- `mwf-web/src/app/events/[id]/page.tsx` (display)
- `mwf-web/src/components/ui/MenuImageUpload.tsx` (new component)

**Create/Edit Event UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Menu                                                    │
│                                                         │
│ Upload menu images                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │  img1  │ │  img2  │ │   +    │ │        │            │
│ │   ✕    │ │   ✕    │ │ Upload │ │        │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
│ Drag to reorder • Click ✕ to remove                    │
│                                                         │
│ ─────────────── or ───────────────                      │
│                                                         │
│ Link to online menu                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://restaurant.com/menu                         │ │
│ └─────────────────────────────────────────────────────┘ │
│ External link (opens in new tab)                        │
└─────────────────────────────────────────────────────────┘
```

**Event Detail Page (Web) - View Menu:**
- If `menu_images` exists: Show thumbnail gallery with lightbox viewer
- Else if `menu_link` exists: Show "View Menu" link (external)
- Else: Hide menu section

### 4. Flutter App

**Files to modify:**
- `lib/services/events_service.dart` - Add `menuImages` to models
- `lib/widgets/pre_order_bottom_sheet.dart` - In-app gallery trigger
- `lib/widgets/pre_order_section.dart` - Update button logic
- `lib/widgets/menu_gallery_viewer.dart` (NEW) - Full-screen gallery

**New dependency:**
```yaml
dependencies:
  photo_view: ^0.15.0
```

**Model changes:**
```dart
class EventDetail {
  // Existing
  final String? menuLink;

  // New
  final List<String>? menuImages;

  factory EventDetail.fromJson(Map<String, dynamic> json) {
    return EventDetail(
      // ...
      menuLink: json['menu_link'] as String?,
      menuImages: (json['menu_images'] as List<dynamic>?)
          ?.map((e) => e as String).toList(),
    );
  }
}
```

**Display logic:**
```dart
bool get hasMenuImages => menuImages?.isNotEmpty ?? false;
bool get hasMenuLink => menuLink?.isNotEmpty ?? false;
bool get hasMenu => hasMenuImages || hasMenuLink;

void _viewMenu() {
  if (hasMenuImages) {
    // Open in-app gallery (preferred)
    showMenuGallery(context, menuImages!);
  } else if (hasMenuLink) {
    // Fallback: external browser
    launchUrl(Uri.parse(menuLink!));
  }
}
```

## UX Design

### Flutter Pre-Order Flow

**Current:**
```
┌─────────────────────────────┐
│ Your Order                  │
│ ┌─────────────────────────┐ │
│ │ 📖 View the menu    ↗️  │ │  ← Opens EXTERNAL browser
│ └─────────────────────────┘ │
│ What would you like?        │
│ ┌─────────────────────────┐ │
│ │ [text input]            │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Proposed (with images):**
```
┌─────────────────────────────┐
│ Your Order                  │
│ ┌─────────────────────────┐ │
│ │ 📖 View Menu (2 pages)  │ │  ← Opens IN-APP gallery
│ └─────────────────────────┘ │
│ What would you like?        │
│ ┌─────────────────────────┐ │
│ │ [text input]            │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**In-App Gallery (full screen overlay):**
```
┌─────────────────────────────┐
│ ✕                    1 of 2 │
│                             │
│                             │
│      ┌───────────────┐      │
│      │               │      │
│      │  Menu Image   │      │
│      │  (zoomable)   │      │
│      │               │      │
│      └───────────────┘      │
│                             │
│          ● ○                │
│    (swipe for next)         │
└─────────────────────────────┘
```

**Features:**
- Pinch-to-zoom (essential for reading small menu text)
- Double-tap to zoom to readable size
- Swipe left/right between pages
- Page indicators (dots or "1 of 2")
- Tap anywhere or X to dismiss
- Returns to pre-order form instantly

### Web Event Detail Page

**Menu Section (when images exist):**
```
┌─────────────────────────────────────────┐
│ Menu                                    │
│ ┌─────────┐ ┌─────────┐                 │
│ │ thumb 1 │ │ thumb 2 │  ← Click to     │
│ └─────────┘ └─────────┘    open lightbox│
└─────────────────────────────────────────┘
```

## Priority Order

Images take precedence over link:

1. **If `menu_images` has items** → Show in-app gallery (Flutter) / lightbox (Web)
2. **Else if `menu_link` exists** → External browser link
3. **Else** → Hide menu option entirely

This allows hosts to provide both (images + link) but users see the better experience first.

## Migration Strategy

Fully backward compatible:

1. **Phase 1**: Database migration (add column, NULL default)
2. **Phase 2**: Backend API updates (accept/return menu_images)
3. **Phase 3**: Web create/edit pages (image uploader)
4. **Phase 4**: Web event detail (display gallery)
5. **Phase 5**: Flutter gallery viewer
6. **Phase 6**: Flutter create/edit (if needed later)

Existing events with only `menu_link` continue to work unchanged.

## File Change Summary

| Component | Files | Effort |
|-----------|-------|--------|
| Database | 1 migration script | Low |
| Backend | 3 route files | Low |
| Web - Upload | 3-4 files | Medium |
| Web - Display | 1-2 files | Low |
| Flutter - Display | 4-5 files | Medium |
| Flutter - Upload | Future phase | - |

## Testing Scenarios

1. **New event with menu images** - Upload 2 images, verify display
2. **New event with menu link only** - Verify external link works
3. **New event with both** - Verify images take precedence
4. **Edit event - add images** - Add images to existing link-only event
5. **Edit event - remove images** - Fall back to link
6. **No menu at all** - Verify menu button hidden
7. **Flutter gallery** - Test zoom, swipe, dismiss
8. **Web lightbox** - Test zoom, navigation, close

## Open Questions

1. **Maximum images?** Suggest 10 (covers multi-page menus)
2. **Image size limits?** Use Cloudinary transformations (auto quality, max 2000px)
3. **Drag reorder on web?** Nice to have, not essential for v1
4. **Rotation button in viewer?** Useful for photos taken at wrong orientation
