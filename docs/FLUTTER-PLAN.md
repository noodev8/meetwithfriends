# Flutter Mobile App Planning Document
## Meet With Friends - Mobile Application Strategy

**Version:** 1.0
**Date:** January 2026
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Goals](#project-goals)
3. [Screen Inventory & Porting Plan](#screen-inventory--porting-plan)
4. [Navigation Architecture](#navigation-architecture)
5. [Visual Design System](#visual-design-system)
6. [User Experience Design](#user-experience-design)
7. [Mobile-Specific Considerations](#mobile-specific-considerations)
8. [API Integration Strategy](#api-integration-strategy)
9. [Gaps & Prerequisites](#gaps--prerequisites)
10. [Implementation Phases](#implementation-phases)
11. [Time Estimate](#time-estimate)
12. [Appendix: Wireframe Specifications](#appendix-wireframe-specifications)

---

## Executive Summary

Meet With Friends (MWF) is expanding from a responsive web application to native mobile apps via Flutter. This document outlines the complete strategy for porting the existing 23 web screens to Flutter while maintaining brand consistency and leveraging mobile-native capabilities.

**Key Objectives:**
- Full feature parity with web application (Phase 1 features)
- Native mobile experience with bottom navigation
- Consistent brand identity across platforms
- Optimized for target demographic (40+ age group)
- Foundation for future mobile-exclusive features (push notifications, etc.)

**Scope:**
- iOS and Android applications via single Flutter codebase
- All existing web functionality
- No new backend development required for initial release

---

## Project Goals

### Primary Goals

1. **Platform Availability** - Presence on App Store and Google Play Store
2. **Native Experience** - Smooth, responsive UI with platform-appropriate gestures
3. **Brand Consistency** - Identical visual identity to web application
4. **Accessibility** - Large touch targets and readable text for 40+ demographic
5. **Offline Resilience** - Graceful handling of connectivity issues

### Secondary Goals

1. **Future-Ready Architecture** - Structured for push notifications, deep linking
2. **Performance** - Fast load times, smooth animations, minimal battery drain
3. **Maintainability** - Clean code structure for long-term development

### Non-Goals (Phase 1)

- Push notifications (future phase)
- Offline mode with data sync
- Biometric authentication
- Deep linking from external sources
- In-app payments (awaiting Stripe integration)

---

## Screen Inventory & Porting Plan

### Overview

The web application contains **23 screens** across 4 domains. Each screen maps to a Flutter screen with mobile-optimized layout.

### Authentication Domain (5 Screens)

| Web Screen | Flutter Screen | Priority | Notes |
|------------|----------------|----------|-------|
| Landing Page `/` | `SplashScreen` → `WelcomeScreen` | P0 | Splash animation, then marketing welcome |
| Login `/login` | `LoginScreen` | P0 | Single-column form, biometric hook for future |
| Register `/register` | `RegisterScreen` | P0 | Multi-step or single form with validation |
| Forgot Password `/forgot-password` | `ForgotPasswordScreen` | P1 | Email input with success state |
| Reset Password `/reset-password` | `ResetPasswordScreen` | P1 | Deep link entry point (future) |

**Mobile Adaptations:**
- Welcome screen replaces web landing page; streamlined for app context
- Login/Register use full-screen forms with keyboard handling
- Social login buttons reserved for future (Google, Apple Sign-In)

### Dashboard & Navigation (2 Screens)

| Web Screen | Flutter Screen | Priority | Notes |
|------------|----------------|----------|-------|
| Dashboard `/dashboard` | `HomeScreen` (Tab 1) | P0 | Primary landing after auth |
| Your Events `/your-events` | `MyEventsScreen` (Tab 2) | P0 | Events user is attending |

**Mobile Adaptations:**
- Dashboard becomes "Home" tab in bottom navigation
- Sections scroll vertically with pull-to-refresh
- Floating Action Button for quick "Create Event" access

### Groups Domain (7 Screens)

| Web Screen | Flutter Screen | Priority | Notes |
|------------|----------------|----------|-------|
| All Groups `/groups` | `DiscoverGroupsScreen` | P1 | Search and browse public groups |
| My Groups `/my-groups` | `MyGroupsScreen` (Tab 3) | P0 | Part of bottom nav |
| Create Group `/groups/create` | `CreateGroupScreen` | P1 | Full-screen form flow |
| Group Detail `/groups/[id]` | `GroupDetailScreen` | P0 | Header + tabs pattern |
| Edit Group `/groups/[id]/edit` | `EditGroupScreen` | P1 | Settings-style form |
| Group Members `/groups/[id]/members` | `GroupMembersScreen` | P1 | Searchable list with actions |
| Past Events `/groups/[id]/past-events` | `PastEventsScreen` | P2 | Paginated event list |

**Mobile Adaptations:**
- Group Detail uses sticky header with hero image
- Members screen uses swipe actions for organiser controls
- Create/Edit use progressive disclosure for optional fields

### Events Domain (5 Screens)

| Web Screen | Flutter Screen | Priority | Notes |
|------------|----------------|----------|-------|
| Event Detail `/events/[id]` | `EventDetailScreen` | P0 | Core screen with RSVP bottom bar |
| Create Event `/groups/[id]/events/create` | `CreateEventScreen` | P0 | Multi-section form |
| Edit Event `/events/[id]/edit` | `EditEventScreen` | P1 | Pre-populated form |
| Attendees `/events/[id]/attendees` | `AttendeesScreen` | P0 | Tabbed list (Going/Waitlist/Not Going) |
| Events Redirect `/events` | N/A | - | Not needed in mobile context |

**Mobile Adaptations:**
- Event Detail has persistent bottom RSVP bar
- Attendees screen uses segment control for tabs
- Create Event breaks into logical sections with "Next" flow

### Profile Domain (1 Screen)

| Web Screen | Flutter Screen | Priority | Notes |
|------------|----------------|----------|-------|
| Profile `/profile` | `ProfileScreen` (Tab 4) | P0 | Settings-style grouped sections |

**Mobile Adaptations:**
- Avatar editing opens native image picker
- Sections use list tiles with chevrons
- Danger zone requires swipe-to-confirm or long-press

### Additional Mobile Screens (Not in Web)

| Screen | Purpose | Priority |
|--------|---------|----------|
| `SplashScreen` | App loading, auth check | P0 |
| `ImagePickerSheet` | Camera/Gallery selection | P0 |
| `NotificationsScreen` | Push notification settings (future) | P3 |
| `AboutScreen` | App version, legal links | P2 |

**Note:** No onboarding flow required. Users go straight to Welcome/Login screen after splash.

---

## Navigation Architecture

### Bottom Navigation Bar (Primary)

The mobile app uses a **4-tab bottom navigation** as the primary navigation pattern:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              [Screen Content]                   │
│                                                 │
├─────────────────────────────────────────────────┤
│  🏠 Home    📅 Events    👥 Groups    👤 Profile │
└─────────────────────────────────────────────────┘
```

**Tab Definitions:**

| Tab | Icon | Label | Default Screen | Badge |
|-----|------|-------|----------------|-------|
| 1 | Home (filled) | Home | `HomeScreen` | None |
| 2 | Calendar | Events | `MyEventsScreen` | Pending RSVPs count |
| 3 | Users/People | Groups | `MyGroupsScreen` | Pending approvals count |
| 4 | Person circle | Profile | `ProfileScreen` | None |

### Navigation Hierarchy

```
App Launch
├── SplashScreen (auth check)
│   ├── → WelcomeScreen (if not authenticated)
│   │   ├── LoginScreen
│   │   │   └── ForgotPasswordScreen
│   │   └── RegisterScreen
│   └── → MainShell (if authenticated)
│       ├── Tab 1: Home
│       │   ├── GroupDetailScreen (push)
│       │   │   ├── GroupMembersScreen
│       │   │   ├── EditGroupScreen
│       │   │   ├── PastEventsScreen
│       │   │   └── EventDetailScreen
│       │   │       ├── AttendeesScreen
│       │   │       ├── EditEventScreen
│       │   │       └── CreateEventScreen (duplicate)
│       │   ├── EventDetailScreen (push)
│       │   └── CreateEventScreen (modal/push)
│       ├── Tab 2: My Events
│       │   └── EventDetailScreen (push)
│       ├── Tab 3: My Groups
│       │   ├── GroupDetailScreen (push)
│       │   ├── CreateGroupScreen (modal/push)
│       │   └── DiscoverGroupsScreen (push)
│       └── Tab 4: Profile
│           ├── EditProfileSheet (modal)
│           ├── ChangePasswordScreen (push)
│           └── AboutScreen (push)
```

### Navigation Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Push** | Drilling into content | Home → Group → Event |
| **Modal (full screen)** | Creating/editing content | Create Event, Create Group |
| **Bottom Sheet** | Quick actions, selections | RSVP options, image picker |
| **Dialog** | Confirmations | Leave group, Cancel RSVP |
| **Tab Switch** | Top-level navigation | Bottom navigation tabs |

### Screen Transition Animations

| Transition | Style | Duration |
|------------|-------|----------|
| Push | Slide from right | 300ms |
| Pop | Slide to right | 300ms |
| Modal | Slide from bottom | 350ms |
| Tab switch | Fade | 200ms |
| Bottom sheet | Slide from bottom | 250ms |

---

## Visual Design System

### Brand Colors

Maintain exact brand colors from web application:

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Primary (Indigo)** | `#4F46E5` | CTAs, active states, links |
| **Primary Dark** | `#4338CA` | Pressed states |
| **Secondary (Violet)** | `#7C3AED` | Gradients, accents |
| **Accent (Purple)** | `#A855F7` | Tertiary highlights |
| **Background** | `#FFFFFF` | Screen backgrounds |
| **Surface** | `#F8FAFC` | Cards on colored backgrounds |
| **Text Primary** | `#1E293B` | Headings, body text |
| **Text Secondary** | `#475569` | Descriptions, hints |
| **Text Tertiary** | `#94A3B8` | Placeholders, disabled |
| **Border** | `#E2E8F0` | Dividers, card borders |
| **Success** | `#15803D` | Going status, confirmations |
| **Warning** | `#B45309` | Waitlist, cautions |
| **Error** | `#B91C1C` | Errors, cancelled |

### Gradient Specifications

| Gradient | Start | End | Usage |
|----------|-------|-----|-------|
| **Primary CTA** | `#4F46E5` | `#7C3AED` | Buttons, FAB |
| **Hero** | `#4F46E5` | `#7C3AED` → `#A855F7` | Welcome screen hero |
| **Card Accent** | `#6366F1` | `#8B5CF6` | Featured event cards |

### Typography

Using **Inter** font family (Google Fonts) to match web:

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **Display Large** | 32sp | Bold (700) | 1.2 | Welcome headlines |
| **Display Medium** | 28sp | Bold (700) | 1.2 | Screen titles |
| **Headline** | 24sp | Bold (700) | 1.3 | Section headers |
| **Title Large** | 20sp | SemiBold (600) | 1.3 | Card titles, group names |
| **Title Medium** | 18sp | SemiBold (600) | 1.4 | Event titles |
| **Body Large** | 16sp | Regular (400) | 1.5 | Primary body text |
| **Body Medium** | 14sp | Regular (400) | 1.5 | Secondary text |
| **Label Large** | 14sp | Medium (500) | 1.4 | Button text |
| **Label Medium** | 12sp | Medium (500) | 1.4 | Badges, chips |
| **Caption** | 12sp | Regular (400) | 1.4 | Timestamps, hints |

### Spacing System

Using 4px base unit (matching Tailwind's default):

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon padding, tight spacing |
| `sm` | 8px | Between related elements |
| `md` | 12px | Card internal padding |
| `lg` | 16px | Section spacing, standard padding |
| `xl` | 24px | Screen padding horizontal |
| `2xl` | 32px | Section gaps |
| `3xl` | 48px | Major section separators |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Small chips |
| `sm` | 8px | Buttons, inputs |
| `md` | 12px | Cards, containers |
| `lg` | 16px | Large cards, modals |
| `xl` | 24px | Hero images |
| `full` | 9999px | Avatars, pills |

### Elevation & Shadows

| Level | Usage | Shadow Spec |
|-------|-------|-------------|
| **0** | Flat elements | None |
| **1** | Cards, list items | `0 1px 3px rgba(0,0,0,0.1)` |
| **2** | Raised buttons, FAB | `0 4px 6px rgba(0,0,0,0.1)` |
| **3** | Dropdowns, modals | `0 10px 15px rgba(0,0,0,0.1)` |
| **4** | Navigation bars | `0 -2px 10px rgba(0,0,0,0.05)` |

### Component Specifications

#### Primary Button
- Background: Primary gradient (left to right)
- Text: White, Label Large (14sp, Medium)
- Padding: 16px horizontal, 14px vertical
- Corner radius: 8px (rectangular) or 9999px (pill)
- Min height: 48px (touch target)
- Shadow: Level 2
- Pressed: 5% darker, scale 0.98
- Disabled: 50% opacity

#### Secondary Button
- Background: White
- Border: 1px `#E2E8F0`
- Text: `#475569`, Label Large
- Same dimensions as primary
- Hover/Pressed: Background `#F8FAFC`

#### Text Input
- Background: White
- Border: 1px `#CBD5E1` (default), `#4F46E5` (focused)
- Corner radius: 8px
- Padding: 16px horizontal, 14px vertical
- Min height: 52px
- Label: Above field, `#334155`, 14sp Medium
- Error state: Border `#B91C1C`, helper text below

#### Card
- Background: White
- Border: 1px `#F1F5F9`
- Corner radius: 16px
- Padding: 16px
- Shadow: Level 1
- Pressed: Shadow Level 2, slight scale up

#### Avatar
- Circular (corner radius full)
- Sizes: 32px (small), 40px (medium), 56px (large), 80px (profile)
- Fallback: Gradient background with initials
- Border: 2px white ring when grouped

#### Badge/Chip
- Background: Color at 10% opacity
- Text: Color at 100%
- Padding: 6px 12px
- Corner radius: 9999px (pill)
- Font: Label Medium (12sp)

#### Bottom Navigation Bar
- Background: White
- Height: 64px (plus safe area)
- Shadow: Level 4 (top shadow)
- Active: Primary color icon + label
- Inactive: `#64748B` icon + label
- Label: 12sp

---

## User Experience Design

### Design Principles

#### 1. Accessibility First
- **Touch targets**: Minimum 48x48px for all interactive elements
- **Text size**: Body text minimum 14sp, critical info 16sp+
- **Contrast**: WCAG AA compliance (4.5:1 for text)
- **Spacing**: Generous whitespace for visual clarity

#### 2. Thumb-Friendly Layout
- Primary actions in bottom third of screen
- Avoid top corners for critical controls
- Swipe gestures for common actions
- Pull-to-refresh everywhere

#### 3. Progressive Disclosure
- Show essential info first
- "Show more" for details
- Collapsible sections for forms
- Step-by-step flows for complex tasks

#### 4. Immediate Feedback
- Optimistic UI updates
- Loading indicators for all async actions
- Success/error states clearly communicated
- Haptic feedback for confirmations

### Key User Flows

#### Flow 1: RSVP to Event

```
Home Screen
    │
    ▼
Event Card (tap)
    │
    ▼
Event Detail Screen
    │ [Sticky bottom bar shows: "Going" | "Can't Go"]
    ▼
Tap "Going" button
    │
    ▼ [Bottom sheet slides up]
Guest Selection Sheet
    │ "How many guests are you bringing?"
    │ [0] [1] [2] [3] [4]
    │
    ▼
Tap guest count
    │
    ▼ [Sheet dismisses, optimistic update]
Success Toast: "You're going to [Event Name]!"
    │
    ▼
RSVP bar updates to show: "Going ✓" with edit option
```

#### Flow 2: Create Event

```
Any Screen with FAB
    │
    ▼
Tap FAB (+)
    │
    ▼ [Full-screen modal]
Step 1: Select Group
    │ [List of groups where user is host/organiser]
    │
    ▼
Step 2: Event Essentials
    │ Title (required)
    │ Date picker (required)
    │ Time picker (required)
    │ Location (optional)
    │
    ▼
Step 3: Details (optional, expandable)
    │ Description (rich text)
    │ Cover image
    │ Capacity
    │ Guest settings
    │ Pre-order settings
    │
    ▼
Review & Create
    │ Summary of all entered data
    │ [Create Event] button
    │
    ▼
Success → Navigate to Event Detail
```

#### Flow 3: Join Group

```
Discover Groups / Group Link
    │
    ▼
Group Detail Screen
    │ [Hero image, group info]
    │ [Join Button] or [Request to Join]
    │
    ▼
Tap Join/Request button
    │
    ├── Auto-approve group:
    │   └── Success Toast: "You've joined [Group Name]!"
    │       └── Button changes to "Member"
    │
    └── Approval-required group:
        └── Success Toast: "Request sent to organiser"
            └── Button changes to "Pending"
```

### Empty States

Each list screen needs thoughtful empty states:

| Screen | Empty State Message | Action |
|--------|---------------------|--------|
| Home (no events) | "No upcoming events in your groups. Check back soon or create one!" | [Create Event] |
| My Events | "You haven't RSVP'd to any events yet. Browse events in your groups." | [View Groups] |
| My Groups | "You haven't joined any groups yet. Discover groups to join." | [Discover Groups] |
| Group Events | "No upcoming events in this group." | [Create Event] (if host) |
| Attendees | "No one has RSVP'd yet. Be the first!" | [RSVP] |

### Loading States

| State | Indicator |
|-------|-----------|
| Initial screen load | Skeleton screens (shimmer effect) |
| Pull to refresh | Platform-native refresh indicator |
| Button action | Button shows spinner, disabled |
| List pagination | "Loading more..." at bottom |
| Image loading | Placeholder gradient → fade in |

### Error Handling

| Error Type | UI Treatment |
|------------|--------------|
| Network error | Snackbar with retry action |
| Auth expired | Redirect to login with message |
| Not found | Full-screen error with back option |
| Permission denied | Toast with explanation |
| Validation error | Inline field errors |
| Server error | Generic error screen with retry |

---

## Mobile-Specific Considerations

### Platform Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| Navigation | iOS-style back gesture | Android back button |
| Modals | Drag to dismiss | Back button dismiss |
| Refresh | Custom bounce | Material indicator |
| Dates | iOS date picker wheel | Material date picker |
| Camera | iOS permissions dialog | Android permissions |
| Sharing | iOS share sheet | Android share intent |

### Native Integrations

| Feature | Implementation | Priority |
|---------|----------------|----------|
| Camera/Gallery | `image_picker` package | P0 |
| Share | `share_plus` package | P1 |
| URL Launch | `url_launcher` package | P0 |
| Maps | Open in native maps app | P1 |
| Calendar | Add to calendar intent | P2 |
| Contacts | Share group invite | P3 |

### Performance Targets

| Metric | Target |
|--------|--------|
| Cold start time | < 3 seconds |
| Screen transition | < 300ms |
| API response handling | < 100ms |
| Image load (cached) | < 200ms |
| List scroll | 60 fps |
| Memory usage | < 150MB |
| App size | < 50MB |

### Gesture Support

| Gesture | Action |
|---------|--------|
| Pull down | Refresh current view |
| Swipe left (list item) | Quick actions (remove, edit) |
| Swipe right (list item) | Alternative action |
| Long press | Context menu |
| Pinch | Image zoom (event/group photos) |
| Double tap | Like/quick action |

---

## API Integration Strategy

### Architecture Overview

The Flutter app will communicate directly with the existing MWF backend API (same as web). No new backend work is required for Phase 1.

```
┌─────────────────────────────────────────────────┐
│              Flutter Mobile App                  │
│         (iOS & Android from one codebase)       │
└─────────────────────────────────────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │   MWF Backend   │
            │   (Existing)    │
            └─────────────────┘
```

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State Management** | Riverpod | Clean async handling for API calls, built-in loading/error states, good balance of structure without excessive boilerplate |
| **HTTP Client** | Dio | Interceptors for auth headers, better error handling than http package |
| **Secure Storage** | flutter_secure_storage | JWT token storage |
| **Image Caching** | cached_network_image | Automatic disk caching for Cloudinary images |
| **Linting** | very_good_analysis | Strict linting rules, enforces best practices |

### Code Quality Standards

**Zero Tolerance Policy:** The Flutter app follows the same code quality philosophy as the web project.

#### Linting Rules
- **Package:** `very_good_analysis` (strict ruleset)
- **Policy:** Zero warnings, zero errors
- **CRITICAL:** Never disable lint rules (e.g., `// ignore:`, `// ignore_for_file:`) without explicit user confirmation. Fix the underlying issue instead.

#### Quality Commands (Windows)

```powershell
# Run from mwf-flutter directory

# Lint check - must pass with 0 issues
flutter analyze

# Format check - ensures consistent code style
dart format --set-exit-if-changed .

# Format and fix
dart format .

# Build Android (debug)
flutter build apk --debug

# Build Android (release)
flutter build apk --release

# Build iOS (requires macOS for final build, but checks code on Windows)
flutter build ios --no-codesign

# Run all tests
flutter test
```

#### Pre-Commit Checklist

Before every commit:
1. `flutter analyze` - 0 issues
2. `dart format --set-exit-if-changed .` - passes
3. `flutter test` - all tests pass
4. App builds without errors

#### analysis_options.yaml

```yaml
include: package:very_good_analysis/analysis_options.yaml

linter:
  rules:
    # Only add rule overrides here with justification
    # NEVER disable rules without explicit approval

analyzer:
  errors:
    # Treat all warnings as errors
    missing_required_param: error
    missing_return: error
  exclude:
    - "**/*.g.dart"      # Generated files
    - "**/*.freezed.dart" # Generated files
```

### API Domains & Endpoints Summary

| Domain | Endpoints | Key Operations |
|--------|-----------|----------------|
| **Auth** | 4 | Login, Register, Password reset |
| **Users** | 7 | Profile CRUD, My groups/events |
| **Groups** | 14 | CRUD, Members, Join/Leave |
| **Events** | 15 | CRUD, RSVP, Attendees, Orders |
| **Comments** | 3 | Add, Delete, List |
| **Total** | **43** | |

### Authentication Strategy

1. **Token Storage**: Secure storage (`flutter_secure_storage`)
2. **Token Refresh**: No refresh token currently (re-login on expiry)
3. **Auth State**: Global provider/bloc accessible app-wide
4. **401 Handling**: Redirect to login, clear stored token

### Response Handling Pattern

All endpoints return HTTP 200 with `return_code` field:

| Return Code | Action |
|-------------|--------|
| `SUCCESS` | Process data, update UI |
| `UNAUTHORIZED` | Redirect to login |
| `FORBIDDEN` | Show permission error |
| `NOT_FOUND` | Show not found state |
| `*_INVALID` | Show validation errors |
| `SERVER_ERROR` | Show generic error, log |

### Caching Strategy

| Data Type | Cache Duration | Strategy |
|-----------|----------------|----------|
| User profile | Session | Memory |
| Group list | 5 minutes | Memory + refresh |
| Event list | 2 minutes | Memory + refresh |
| Event detail | 1 minute | Memory + refresh |
| Attendees | 30 seconds | Memory + refresh |
| Comments | 30 seconds | Memory + refresh |
| Images | Persistent | Disk cache |

---

## Gaps & Prerequisites

### Identified Gaps

#### 1. Backend Gaps

| Gap | Description | Action Required |
|-----|-------------|-----------------|
| **Push Notification Infrastructure** | No endpoints for device token registration | Create `/api/users/register-device` endpoint (Phase 2) |
| **Deep Link Handling** | No universal link support configured | Configure web server for app links (Phase 2) |
| **App Version Check** | No minimum version enforcement | Create `/api/app/version` endpoint (Phase 2) |

#### 2. Asset Gaps

| Gap | Description | Action Required |
|-----|-------------|-----------------|
| **App Icon** | No mobile app icon assets | Create 1024x1024 icon + all required sizes |
| **Splash Screen** | No splash/launch screen assets | Create branded splash screen assets |
| **Store Assets** | No App Store/Play Store screenshots | Create after MVP screens are built |
| **Store Listing** | No descriptions, keywords | Write copy for store listings |

#### 3. Design Gaps

| Gap | Description | Action Required |
|-----|-------------|-----------------|
| **Mobile Wireframes** | No approved mobile-specific layouts | Create wireframes before development |
| **Animation Specs** | No defined micro-interactions | Define key animation behaviors |
| **Icon Set** | Web uses Heroicons, need Flutter equivalent | Use Flutter Heroicons package or similar |

**Note:** No onboarding flow required - users go straight to Welcome/Login.

#### 4. Infrastructure Gaps

| Gap | Description | Action Required |
|-----|-------------|-----------------|
| **CI/CD Pipeline** | No mobile build automation | Set up Codemagic/Fastlane |
| **Beta Distribution** | TestFlight/Play Console may need new app entry | Configure for MWF app specifically |
| **Analytics** | No mobile analytics integration | Integrate Firebase Analytics or similar |
| **Crash Reporting** | No crash reporting setup | Integrate Sentry or Crashlytics |
| **API Base URL Config** | Need environment-specific URLs | Configure for dev/staging/prod |

**Note:** Developer accounts (Apple & Google) are already active with existing Flutter apps published.

### Prerequisites Checklist

Before starting Flutter development:

- [ ] **App Icon designed and exported** - Owner to provide later; use placeholder for now
- [x] **Splash screen** - Build with placeholder icon + "Meet With Friends" text; update when icon ready
- [x] **Mobile wireframes approved** (see Appendix)
- [x] **Apple Developer Account** active (already set up)
- [x] **Google Play Developer Account** active (already set up)
- [x] **Bundle identifier:** `com.noodev8.meetwithfriends`
- [ ] **API base URL** for production confirmed (dev: localhost:3018)
- [x] **Privacy Policy URL** (already exists on web)
- [x] **Terms of Service URL** (already exists on web)

### Project Structure

```
meetwithfriends/
├── docs/                 # Documentation
├── mwf-server/           # Node.js + Express backend
├── mwf-web/              # Next.js frontend
└── mwf-flutter/          # Flutter mobile app (NEW)
```

---

## Implementation Phases

### Phase 1: Foundation (Core MVP)
**Goal:** Basic functional app with all core screens

**Screens:**
- Splash, Welcome, Login, Register
- Home (Dashboard), My Events, My Groups, Profile
- Group Detail, Event Detail
- Attendees list

**Features:**
- Authentication flow
- View groups and events
- RSVP to events
- View attendees
- Basic profile management

**Deliverable:** Internal testing build

---

### Phase 2: Full Feature Parity
**Goal:** All web features available on mobile

**Screens:**
- Forgot/Reset Password
- Create/Edit Group
- Create/Edit Event
- Group Members management
- Past Events

**Features:**
- Group creation and management
- Event creation and management
- Member management (approve, remove, roles)
- Food pre-orders
- Comments/Discussion
- Contact organiser/host

**Deliverable:** Beta testing build

---

### Phase 3: Polish & Launch
**Goal:** Production-ready with native enhancements

**Features:**
- Pull-to-refresh everywhere
- Skeleton loading screens
- Error boundaries and offline states
- Share functionality
- Add to calendar
- Image zoom/gallery
- Animations and micro-interactions

**Tasks:**
- Performance optimization
- Accessibility audit
- Store listing preparation
- Beta testing period
- Bug fixes

**Deliverable:** App Store and Play Store submission

---

### Phase 4: Mobile-First Features (Post-Launch)
**Goal:** Features that benefit from mobile platform

**Features:**
- Push notifications
- Deep linking
- Biometric authentication
- Location-based features
- Camera integration improvements
- Widget support

---

## Time Estimate

### Assumptions
- 1 experienced Flutter developer
- Design assets provided upfront
- No major scope changes
- Backend API fully functional

### Detailed Breakdown

| Phase | Screens/Features | Estimated Effort |
|-------|------------------|------------------|
| **Project Setup** | | |
| Flutter project initialization | - | 2 days |
| Design system implementation | - | 3 days |
| API client & auth setup | - | 3 days |
| Navigation structure | - | 2 days |
| **Phase 1: Foundation** | | |
| Auth screens (4) | Splash, Welcome, Login, Register | 4 days |
| Home screen (Dashboard) | With sections, cards | 3 days |
| My Events screen | List with filters | 2 days |
| My Groups screen | List with role badges | 2 days |
| Profile screen | Settings sections | 2 days |
| Group Detail screen | Hero, tabs, actions | 3 days |
| Event Detail screen | Full detail, RSVP bar | 4 days |
| Attendees screen | Tabs, list, actions | 2 days |
| **Phase 2: Feature Parity** | | |
| Password reset flow (2) | Forgot, Reset | 2 days |
| Create/Edit Group (2) | Forms, image upload | 4 days |
| Create/Edit Event (2) | Multi-section forms | 5 days |
| Group Members screen | Search, pagination, actions | 3 days |
| Past Events screen | Paginated list | 1 day |
| Comments/Discussion | Add, delete, list | 2 days |
| Food pre-orders | Submit, view orders | 2 days |
| Contact messaging | Organiser, Host | 1 day |
| **Phase 3: Polish** | | |
| Loading & empty states | All screens | 3 days |
| Error handling | All screens | 2 days |
| Animations | Transitions, micro-interactions | 3 days |
| Testing & bug fixes | - | 5 days |
| Store preparation | Assets, listings | 2 days |
| **Buffer** | Unknowns, revisions | 5 days |

### Total Estimate Summary

| Category | Duration |
|----------|----------|
| Setup & Foundation | 10 days |
| Phase 1 (Core) | 22 days |
| Phase 2 (Full Features) | 20 days |
| Phase 3 (Polish) | 15 days |
| Buffer | 5 days |
| **Total** | **72 working days** |

### Timeline Options

| Team Size | Calendar Duration |
|-----------|-------------------|
| 1 developer | ~14-16 weeks |
| 2 developers | ~8-10 weeks |
| 1 dev + 1 designer (parallel) | ~12-14 weeks |

### Risk Factors

| Risk | Impact | Mitigation |
|------|--------|------------|
| Design changes mid-development | +2-4 weeks | Approve wireframes before coding |
| API changes needed | +1-2 weeks | Freeze API for mobile launch |
| Store review delays | +1-2 weeks | Submit early, prepare for feedback |
| Device compatibility issues | +1 week | Test on multiple devices early |
| Complex animations | +1-2 weeks | Scope animations to essential only |

---

## Appendix: Wireframe Specifications

### Home Screen (Dashboard) - Mobile Layout

```
┌─────────────────────────────────────┐
│ ◀ MeetFriends              🔔  ⚙️  │  <- App bar
├─────────────────────────────────────┤
│                                     │
│  Good morning, [Name]! 👋           │  <- Greeting
│                                     │
│  ┌─ Upcoming Events ─────────────┐  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  [Event Image]          │  │  │
│  │  │  Event Title            │  │  │
│  │  │  📅 Jan 15 • 7:00 PM    │  │  │
│  │  │  📍 Restaurant Name     │  │  │
│  │  │  👥 8 going             │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  [Event Card 2]         │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Your Groups ───── [See All >]┐  │
│  │                               │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐│  │
│  │  │Group │  │Group │  │Group ││  │  <- Horizontal scroll
│  │  │  1   │  │  2   │  │  3   ││  │
│  │  └──────┘  └──────┘  └──────┘│  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Discover Groups ─────────────┐  │
│  │  [Group suggestions...]       │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│  🏠     📅      👥      👤         │  <- Bottom nav
│ Home  Events  Groups  Profile      │
└─────────────────────────────────────┘
        │
        └── FAB (+) floating bottom right for quick create
```

### Event Detail Screen - Mobile Layout

```
┌─────────────────────────────────────┐
│ ◀                           ⋮      │  <- Transparent over image
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │      [Hero Event Image]         ││
│  │                                 ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  Dinner at The Italian Place        │  <- Title
│  ─────────────────────────────────  │
│  📅 Saturday, Jan 15, 2026          │
│  🕖 7:00 PM                         │
│  📍 123 Main Street, London         │  <- Tappable for maps
│                                     │
│  ┌─ Hosts ───────────────────────┐  │
│  │  (👤)(👤) John D. & Mary S.   │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ About ───────────────────────┐  │
│  │  Join us for an evening of    │  │
│  │  great Italian food and       │  │
│  │  conversation...              │  │
│  │  [Show more]                  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Attendees (12) ──── [See All]┐  │
│  │  (👤)(👤)(👤)(👤) +8 more    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Discussion (5) ──────────────┐  │
│  │  Latest comment preview...    │  │
│  │  [View all comments]          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Pre-order ───────────────────┐  │  <- Only if enabled
│  │  Submit your food order       │  │
│  │  [Submit Order →]             │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌────────────────┐ │  <- Sticky RSVP bar
│  │  Can't Go   │ │   Going  ✓     │ │
│  └─────────────┘ └────────────────┘ │
└─────────────────────────────────────┘
```

### Group Detail Screen - Mobile Layout

```
┌─────────────────────────────────────┐
│ ◀                      ⋮ Share     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │      [Hero Group Image]         ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  London Foodies Club                │  <- Group name
│  👥 137 members                     │
│                                     │
│  ┌────────────────────────────────┐ │  <- Action button
│  │        [Join Group]            │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─ About ───────────────────────┐  │
│  │  We're a group of food lovers │  │
│  │  exploring London's best...   │  │
│  │  [Show more]                  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Upcoming Events ─────────────┐  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  [Event Card]           │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  [Event Card]           │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  │  [View past events →]         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Members ─────────── [See All]┐  │
│  │  (👤)(👤)(👤)(👤)(👤) +132    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Organiser ───────────────────┐  │
│  │  (👤) John Doe               │  │
│  │  [Contact Organiser]          │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│  🏠     📅      👥      👤         │
└─────────────────────────────────────┘
```

### My Groups Screen - Mobile Layout

```
┌─────────────────────────────────────┐
│          My Groups           +      │  <- + to create group
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ 🔍 Search groups...             ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─ Groups I Organise ───────────┐  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ [Img] Group Name        │  │  │
│  │  │       👥 42 • ⭐ Organiser│  │  │
│  │  │       🔔 3 pending      │  │  │  <- Pending badge
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Groups I'm In ───────────────┐  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ [Img] Another Group     │  │  │
│  │  │       👥 89 • Member    │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ [Img] Third Group       │  │  │
│  │  │       👥 24 • 🎯 Host   │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌────────────────────────────────┐ │
│  │   [Discover More Groups →]    │ │
│  └────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  🏠     📅      👥      👤         │
└─────────────────────────────────────┘
```

### Profile Screen - Mobile Layout

```
┌─────────────────────────────────────┐
│            Profile                  │
├─────────────────────────────────────┤
│                                     │
│         ┌───────────┐               │
│         │   (👤)    │               │  <- Tappable to change
│         │   80px    │               │
│         └───────────┘               │
│          John Doe                   │
│       john@email.com                │
│                                     │
│  ────────────────────────────────── │
│                                     │
│  ┌─ Account ─────────────────────┐  │
│  │                               │  │
│  │  Edit Profile               > │  │
│  │  ─────────────────────────── │  │
│  │  Change Password            > │  │
│  │  ─────────────────────────── │  │
│  │  Contact Details            > │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Preferences ─────────────────┐  │
│  │                               │  │
│  │  Receive Broadcasts     [ON] │  │
│  │  ─────────────────────────── │  │
│  │  Show Mobile to Guests [OFF] │  │
│  │  ─────────────────────────── │  │
│  │  Show Email to Guests  [OFF] │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ About ───────────────────────┐  │
│  │                               │  │
│  │  Help & Support             > │  │
│  │  ─────────────────────────── │  │
│  │  Privacy Policy             > │  │
│  │  ─────────────────────────── │  │
│  │  Terms of Service           > │  │
│  │  ─────────────────────────── │  │
│  │  App Version: 1.0.0           │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌────────────────────────────────┐ │
│  │         [Sign Out]            │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │      [Delete Account]         │ │  <- Red text
│  └────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  🏠     📅      👥      👤         │
└─────────────────────────────────────┘
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Planning Team | Initial document |

---

**End of Document**
