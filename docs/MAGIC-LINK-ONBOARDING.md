# Magic Link Onboarding System

## Overview

This document outlines the design for a frictionless onboarding system that allows MWF users to invite non-registered friends to groups and events via "magic links" distributed through WhatsApp, SMS, email, or any communication tool.

**Key Goals:**
- Zero-friction invitation experience
- Non-registered users can join with minimal steps
- Organisers control link creation and distribution
- Graceful handling of edge cases (expired events, profile requirements, etc.)

---

## User Stories

### Primary Scenarios

1. **Invite to Event (New User)**
   > "Andreas has invited you to The Corbet Arms dinner on Feb 15th"
   - User clicks link → sees event intro screen → creates account → auto-joins group → redirects to event page (user can then RSVP after reviewing details)

2. **Invite to Event (Existing User, Not in Group)**
   - User clicks link → recognizes logged-in user → auto-joins group → redirects to event page (user can then RSVP after reviewing details)

3. **Invite to Event (Existing User, Already in Group)**
   - User clicks link → redirects to event page (user can RSVP if not already attending)

4. **Invite to Group Only (New User)**
   > "Join the Friday Night Foodies group"
   - User clicks link → sees group intro screen → creates account → auto-joins group

5. **Invite to Group Only (Existing User)**
   - User clicks link → auto-joins group → redirects to group page

**Note:** Event invites do NOT auto-RSVP. Users should see who's attending, review the menu, check for deposits, etc. before committing. The invite grants access to view the event; the user decides whether to attend.

---

## Link Types

### 1. Event Invite Link
```
https://www.meetwithfriends.net/invite/e/{token}
```
- Auto-joins the event's parent group (if not member)
- Does NOT auto-RSVP - user reviews event details first, then decides to RSVP
- Most common use case

### 2. Group Invite Link
```
https://www.meetwithfriends.net/invite/g/{token}
```
- Auto-joins the group only
- No event RSVP

**Note:** Same URL works for web and app. Universal/App Links handle routing automatically.

---

## User Flows (Confirmed)

### Step 1: Token Validation (Common to Both Flows)

```
User clicks magic link
         │
         ▼
┌─────────────────────────────────────────┐
│  VALIDATE TOKEN                         │
│                                         │
│  1. Does token exist?        → No  → "Invalid link" screen
│  2. Is token expired?        → Yes → "Link expired" screen
│  3. Is token deactivated?    → Yes → "Link no longer active" screen
│  4. Has token reached max    → Yes → "Link reached its limit" screen
│     uses?                              │
└─────────────────────────────────────────┘
         │
         │ All checks pass
         ▼
┌─────────────────────────────────────────┐
│  BRANCH BY TOKEN TYPE                   │
│                                         │
│  token_type = 'group' → GROUP FLOW      │
│  token_type = 'event' → EVENT FLOW      │
└─────────────────────────────────────────┘
```

---

## GROUP FLOW

### G1: No Additional Validation
Groups are always "joinable" - no status checks needed.

### G2: Check Authentication
```
Is user logged in?
├── YES → Go to G4 (Intro screen - logged in)
└── NO  → Go to G3 (Intro screen - not logged in)
```

### G3: Intro Screen (Not Logged In)
```
┌─────────────────────────────────────────┐
│                                         │
│    Andreas has invited you to join      │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │  Friday Night Foodies           │  │
│    │  24 members                     │  │
│    │  "Monthly dinners at London's   │  │
│    │   best gastropubs"              │  │
│    └─────────────────────────────────┘  │
│                                         │
│    [Join Group]                         │
│                                         │
│    Already have an account? Log in      │
│                                         │
└─────────────────────────────────────────┘
```
**Actions:**
- "Join Group" → Go to G5 (Signup form)
- "Log in" → Store pending token in localStorage → Login → Return to G4

### G4: Intro Screen (Logged In)
```
┌─────────────────────────────────────────┐
│                                         │
│    Andreas has invited you to join      │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │  Friday Night Foodies           │  │
│    │  24 members                     │  │
│    │  "Monthly dinners at London's   │  │
│    │   best gastropubs"              │  │
│    └─────────────────────────────────┘  │
│                                         │
│    [Join Group]                         │
│                                         │
│    Not you? Log out                     │
│                                         │
└─────────────────────────────────────────┘
```
**Actions:**
- "Join Group" → Go to G6 (Process)

### G5: Signup Form
```
┌─────────────────────────────────────────┐
│  ← Back                                 │
│                                         │
│  Create your account                    │
│                                         │
│  [Name                              ]   │
│  [Email                             ]   │
│  [Password                          ]   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  + Add profile photo            │    │  ← ONLY shown if group
│  │    Required for this group      │    │    has require_profile_image=true
│  └─────────────────────────────────┘    │
│                                         │
│  [Create Account & Join]                │
│                                         │
└─────────────────────────────────────────┘
```
→ After signup, go to G6

### G6: Process Group Join
```
1. Already a member?
   ├── YES → Redirect to group page
   │         Toast: "You're already a member"
   └── NO  → Continue

2. Group requires profile photo AND user has none?
   ├── YES → Show photo upload screen (G6a) - REQUIRED, no skip
   └── NO  → Continue

3. Join group (status='active', bypasses approval policy)

4. Record token use, increment use_count

5. Redirect to group page
   Toast: "Welcome to Friday Night Foodies!"
```

### G6a: Photo Upload Screen (Required)
```
┌─────────────────────────────────────────┐
│                                         │
│    One more thing...                    │
│                                         │
│    Friday Night Foodies requires        │
│    members to have a profile photo      │
│                                         │
│         ┌───────────┐                   │
│         │    [+]    │                   │
│         │  Upload   │                   │
│         │  Photo    │                   │
│         └───────────┘                   │
│                                         │
│    [Continue]  ← disabled until photo   │
│                                         │
└─────────────────────────────────────────┘
```
- No skip option - photo is required
- Only shown if group has `require_profile_image = true`

---

## EVENT FLOW

### E1: Event-Specific Validation
```
┌─────────────────────────────────────────┐
│  EVENT VALIDATION                       │
│                                         │
│  1. Is event cancelled?  → Yes → "Event cancelled" screen
│  2. Is event in past?    → Yes → "Event already happened" screen
│                                   → Link to group page (user decides to join)
└─────────────────────────────────────────┘
```

### E2: Check Authentication
```
Is user logged in?
├── YES → Go to E4 (Intro screen - logged in)
└── NO  → Go to E3 (Intro screen - not logged in)
```

### E3: Intro Screen (Not Logged In)
```
┌─────────────────────────────────────────┐
│                                         │
│    Andreas has invited you to           │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │  Dinner at The Corbet Arms      │  │
│    │  Saturday, Feb 15 at 7:00 PM    │  │
│    │  The Corbet Arms, London        │  │
│    │  4 spots remaining              │  │
│    └─────────────────────────────────┘  │
│                                         │
│    [Let's take a look]                  │
│                                         │
│    Already have an account? Log in      │
│                                         │
└─────────────────────────────────────────┘
```
**Actions:**
- "Let's take a look" → Go to E5 (Signup form)
- "Log in" → Store pending token in localStorage → Login → Return to E4

### E4: Intro Screen (Logged In)
```
┌─────────────────────────────────────────┐
│                                         │
│    Andreas has invited you to           │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │  Dinner at The Corbet Arms      │  │
│    │  Saturday, Feb 15 at 7:00 PM    │  │
│    │  The Corbet Arms, London        │  │
│    │  4 spots remaining              │  │
│    └─────────────────────────────────┘  │
│                                         │
│    [Let's take a look]                  │
│                                         │
│    Not you? Log out                     │
│                                         │
└─────────────────────────────────────────┘
```
**Actions:**
- "Let's take a look" → Go to E6 (Process)

### E5: Signup Form
```
┌─────────────────────────────────────────┐
│  ← Back                                 │
│                                         │
│  Create your account                    │
│                                         │
│  [Name                              ]   │
│  [Email                             ]   │
│  [Password                          ]   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  + Add profile photo            │    │  ← ONLY shown if group
│  │    Required for this group      │    │    has require_profile_image=true
│  └─────────────────────────────────┘    │
│                                         │
│  [Create Account & View Event]          │
│                                         │
└─────────────────────────────────────────┘
```
→ After signup, go to E6

### E6: Process Event Join
```
1. Already a group member?
   ├── YES → Skip to step 3
   └── NO  → Continue

2. Group requires profile photo AND user has none?
   ├── YES → Show photo upload screen (E6a) - REQUIRED, no skip
   └── NO  → Join group (status='active', bypasses approval policy)

3. Record token use, increment use_count

4. Redirect to event page
   └── Toast: "Welcome! Review the event details and RSVP when you're ready."
```

**Note:** Event invites do NOT auto-RSVP. The user lands on the event page where they can:
- See who's attending
- Review the menu and any pre-order options
- Check for deposits or costs
- Read comments and discussion
- Make an informed decision to RSVP

### E6a: Photo Upload Screen (Required)
Same as G6a - required, no skip option.

---

## Error Screens

All error screens include an [×] close button to dismiss.

### Invalid/Expired/Deactivated Link
```
┌─────────────────────────────────────────┐
│                                    [×]  │
│                                         │
│    This invitation link is no longer    │
│    valid                                │
│                                         │
│    Ask the organiser for a new link.    │
│                                         │
│    [Browse Upcoming Events]             │
│                                         │
└─────────────────────────────────────────┘
```

### Link Reached Limit
```
┌─────────────────────────────────────────┐
│                                    [×]  │
│                                         │
│    This invitation link has reached     │
│    its limit                            │
│                                         │
│    Ask the organiser for a new link.    │
│                                         │
│    [Browse Upcoming Events]             │
│                                         │
└─────────────────────────────────────────┘
```

### Event Already Happened
```
┌─────────────────────────────────────────┐
│                                    [×]  │
│                                         │
│    This event has already happened      │
│                                         │
│    [View Group]                         │
│                                         │
└─────────────────────────────────────────┘
```
- Links to `/groups/{id}` - user can decide to join from there

### Event Cancelled
```
┌─────────────────────────────────────────┐
│                                    [×]  │
│                                         │
│    This event has been cancelled        │
│                                         │
│    [View Group]                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Edge Cases (Confirmed Decisions)

| Scenario | Decision |
|----------|----------|
| **Group requires profile photo** | Photo upload is REQUIRED (no skip). Only shown if group has flag set. |
| **Event at capacity** | Auto-add to waitlist. Show position immediately. |
| **Event in past** | Show "event already happened", link to group page. Do NOT auto-join. |
| **Event cancelled** | Show "event cancelled", link to group page. |
| **User already member/RSVP'd** | Silent success, redirect with toast confirmation. |
| **Multi-use tokens** | Default 50 uses. When limit reached, show friendly message. |
| **"Log in instead" clicked** | Store `pending_invite_token` in localStorage, restore after login. |
| **Approval-only group** | Magic links bypass approval - organiser implicitly pre-approved. |
| **Inviter loses permission** | Links remain valid until expiration (snapshot at creation time). |

---

## Database Schema (Option B - Columns on Existing Tables)

Add magic link columns directly to `group_list` and `event_list` tables.
Keep existing `group_list.invite_code` untouched to avoid breaking existing code.

### Add to `group_list` table:

```sql
ALTER TABLE group_list ADD COLUMN magic_link_token VARCHAR(64);
ALTER TABLE group_list ADD COLUMN magic_link_expires_at TIMESTAMP;
ALTER TABLE group_list ADD COLUMN magic_link_active BOOLEAN DEFAULT TRUE;
ALTER TABLE group_list ADD COLUMN magic_link_created_by INT REFERENCES app_user(id);
ALTER TABLE group_list ADD COLUMN magic_link_max_uses INT DEFAULT 50;
ALTER TABLE group_list ADD COLUMN magic_link_use_count INT DEFAULT 0;
ALTER TABLE group_list ADD COLUMN magic_link_inviter_name VARCHAR(255);

CREATE UNIQUE INDEX idx_group_magic_link_token
    ON group_list(magic_link_token)
    WHERE magic_link_token IS NOT NULL;
```

### Add to `event_list` table:

```sql
ALTER TABLE event_list ADD COLUMN magic_link_token VARCHAR(64);
ALTER TABLE event_list ADD COLUMN magic_link_expires_at TIMESTAMP;
ALTER TABLE event_list ADD COLUMN magic_link_active BOOLEAN DEFAULT TRUE;
ALTER TABLE event_list ADD COLUMN magic_link_created_by INT REFERENCES app_user(id);
ALTER TABLE event_list ADD COLUMN magic_link_max_uses INT DEFAULT 50;
ALTER TABLE event_list ADD COLUMN magic_link_use_count INT DEFAULT 0;
ALTER TABLE event_list ADD COLUMN magic_link_inviter_name VARCHAR(255);

CREATE UNIQUE INDEX idx_event_magic_link_token
    ON event_list(magic_link_token)
    WHERE magic_link_token IS NOT NULL;
```

### Notes:
- **No separate tracking table** - just increment `use_count`, don't track individual users
- **Keep `group_list.invite_code`** - existing functionality unchanged
- **One link per group/event** - simpler model, regenerate replaces old token

---

## API Endpoints

### Organiser Endpoints

#### 1. Get/Create Group Magic Link

```
POST /groups/:id/magic-link
Authorization: Bearer {token}
```

- If no link exists, generates one with defaults (50 uses, 365 days expiry)
- If link exists and is active, returns it
- Permission: Organiser or Host

**Response:**
```json
{
    "return_code": "SUCCESS",
    "magic_link": {
        "token": "a1b2c3d4e5f6...",
        "url": "https://www.meetwithfriends.net/invite/g/a1b2c3d4e5f6...",
        "expires_at": "2025-03-01T00:00:00Z",
        "is_active": true,
        "use_count": 12,
        "max_uses": 50
    }
}
```

**Return Codes:** `SUCCESS`, `UNAUTHORIZED`, `FORBIDDEN`, `GROUP_NOT_FOUND`

---

#### 2. Get/Create Event Magic Link

```
POST /events/:id/magic-link
Authorization: Bearer {token}
```

Same as group, but for events. Permission: Organiser or Event Host.

**Response:**
```json
{
    "return_code": "SUCCESS",
    "magic_link": {
        "token": "x7y8z9a0b1c2...",
        "url": "https://www.meetwithfriends.net/invite/e/x7y8z9a0b1c2...",
        "expires_at": "2025-03-01T00:00:00Z",
        "is_active": true,
        "use_count": 5,
        "max_uses": 50
    }
}
```

---

#### 3. Regenerate Magic Link

```
POST /groups/:id/magic-link/regenerate
POST /events/:id/magic-link/regenerate
Authorization: Bearer {token}
```

- Generates new token
- Resets use_count to 0
- Resets expires_at to 365 days from now
- Old token immediately invalid

**Response:**
```json
{
    "return_code": "SUCCESS",
    "magic_link": { ... }
}
```

---

#### 4. Disable/Enable Magic Link

```
POST /groups/:id/magic-link/disable
POST /groups/:id/magic-link/enable
POST /events/:id/magic-link/disable
POST /events/:id/magic-link/enable
Authorization: Bearer {token}
```

- **Disable:** Sets `is_active = false`
- **Enable:** Sets `is_active = true` AND resets `expires_at` to 365 days from now

**Response:**
```json
{
    "return_code": "SUCCESS",
    "is_active": true,
    "expires_at": "2027-01-28T00:00:00Z"
}
```

---

### Public/Invitee Endpoints

#### 5. Validate Invite Token

```
GET /invite/validate/:token
Authorization: Bearer {token}  // Optional - changes response
```

Looks up token in both `group_list` and `event_list` tables.

**Response (Valid, Not Logged In):**
```json
{
    "return_code": "SUCCESS",
    "valid": true,
    "type": "event",
    "invite": {
        "inviter_name": "Andreas",
        "group": {
            "id": 456,
            "name": "Friday Night Foodies",
            "icon": "utensils",
            "member_count": 24,
            "require_profile_image": false
        },
        "event": {
            "id": 123,
            "title": "Dinner at The Corbet Arms",
            "date_time": "2025-02-15T19:00:00Z",
            "location": "The Corbet Arms, London",
            "description": "Monthly dinner...",
            "spots_remaining": 4,
            "status": "active"
        }
    }
}
```

**Response (Valid, Logged In):**
```json
{
    "return_code": "SUCCESS",
    "valid": true,
    "type": "event",
    "user_status": {
        "is_group_member": false,
        "is_event_rsvp": false,
        "has_profile_image": true
    },
    "invite": { ... }
}
```

**Response (Group Invite - No Event):**
```json
{
    "return_code": "SUCCESS",
    "valid": true,
    "type": "group",
    "invite": {
        "inviter_name": "Andreas",
        "group": {
            "id": 456,
            "name": "Friday Night Foodies",
            "icon": "utensils",
            "member_count": 24,
            "require_profile_image": false,
            "description": "Monthly dinners at London's best gastropubs"
        },
        "event": null
    }
}
```

**Return Codes:**
- `SUCCESS` - Valid token
- `INVITE_NOT_FOUND` - Token doesn't exist
- `INVITE_EXPIRED` - Past expiration date
- `INVITE_LIMIT_REACHED` - Max uses exceeded
- `INVITE_DISABLED` - Manually disabled
- `EVENT_ENDED` - Event date has passed
- `EVENT_CANCELLED` - Event was cancelled

---

#### 6. Accept Invite (Logged In User)

```
POST /invite/accept/:token
Authorization: Bearer {token}  // Required
```

**Response:**
```json
{
    "return_code": "SUCCESS",
    "actions": {
        "joined_group": true,
        "rsvp_status": null  // Always null - event invites do NOT auto-RSVP
    },
    "redirect_to": "/events/123"  // or "/groups/456"
}
```

**Note:** For event invites, the user is added to the group (if not already a member) but is NOT automatically RSVPed. They land on the event page to review details and RSVP themselves.

**Return Codes:** `SUCCESS`, `INVITE_EXPIRED`, `PROFILE_IMAGE_REQUIRED`

---

#### 7. Accept Invite with Signup (New User)

```
POST /invite/accept-with-signup/:token
```

**Request:**
```json
{
    "name": "John Smith",
    "email": "john@example.com",
    "password": "securepassword123",
    "avatar_url": "https://..."  // Required if group has require_profile_image=true
}
```

**Response:**
```json
{
    "return_code": "SUCCESS",
    "token": "jwt_token_here",
    "user": {
        "id": 789,
        "name": "John Smith",
        "email": "john@example.com"
    },
    "actions": {
        "joined_group": true,
        "rsvp_status": null  // Always null - event invites do NOT auto-RSVP
    },
    "redirect_to": "/events/123"
}
```

**Note:** For event invites, the new user is added to the group but is NOT automatically RSVPed. They land on the event page to review details and RSVP themselves.

**Return Codes:** `SUCCESS`, `EMAIL_EXISTS`, `INVALID_EMAIL`, `WEAK_PASSWORD`, `INVITE_EXPIRED`, `PROFILE_IMAGE_REQUIRED`

**Handling `EMAIL_EXISTS`:**
- Show error message: "This email is already registered"
- Offer link to switch to login flow: "Log in instead"
- Preserve invite context so login completes the invite

**Photo Upload:**
- Uses existing Cloudinary upload integration
- Upload photo first, receive `avatar_url`, then include in request

---

## Frontend Routes

```
/invite/g/:token  →  Group invite page
/invite/e/:token  →  Event invite page
```

These routes handle the full invite flow (intro screen, signup form, processing).

---

## "Log In Instead" Flow

When a user clicks "Already have an account? Log in" on the intro screen:

```
1. Before redirect to /login:
   - Store in localStorage: pending_invite_token = "abc123"
   - Store in localStorage: pending_invite_type = "event" (or "group")

2. User logs in normally at /login

3. After successful login, in AuthContext or login handler:
   - Check if pending_invite_token exists in localStorage
   - If yes:
     a. Get the token and type
     b. Clear from localStorage
     c. Redirect to /invite/{type}/{token} to process the invite
   - If no:
     a. Normal redirect (dashboard or previous page)

4. The invite page detects user is now logged in
   - Shows the intro screen with "Accept Invitation" button
   - User clicks, invite is processed
   - Redirect to event/group page
```

This ensures users don't lose the invite context when they realize they already have an account.

---

## Organiser Experience (Confirmed)

### Permissions

| Role | Event Invite | Group Invite |
|------|--------------|--------------|
| Organiser | Yes | Yes |
| Host | Yes (their events) | Yes |
| Member | No | No |

### Entry Points

- **Event invite:** On the Event Page (visible to organiser and event host)
- **Group invite:** On the Group Page (visible to organiser and hosts)

---

### Event Page: Invite Section

When organiser or host views an event they manage:

```
┌─────────────────────────────────────────┐
│  Dinner at The Corbet Arms              │
│  Saturday, Feb 15 at 7:00 PM            │
│  ─────────────────────────────────────  │
│                                         │
│  [Edit Event]  [Manage RSVPs]           │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Invite People                          │
│                                         │
│  Share this link to invite people:      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ www.meetwithfriends.net/invite/  │  │
│  │ e/a1b2c3d4e5                     │  │
│  └───────────────────────────────────┘  │
│  Expires: Jan 2027                      │
│                                         │
│  [Copy]  [Regenerate]  [Disable]        │
│                                         │
└─────────────────────────────────────────┘
```

**Behavior:**
- Link is auto-generated with defaults (50 uses, 365 days expiry) when first accessed
- Expiry date shown below link so organiser knows when it expires
- **Copy:** Copies link to clipboard, shows toast "Link copied"
- **Regenerate:** Creates new token, resets use_count to 0, resets expiry to 365 days from now
- **Disable:** Deactivates link, shows disabled state
- **Enable:** Re-activates link, resets expiry to 365 days from now

---

### Group Page: Invite Section

When organiser or host views the group:

```
┌─────────────────────────────────────────┐
│  Friday Night Foodies                   │
│  24 members                             │
│  ─────────────────────────────────────  │
│                                         │
│  [Group Settings]                       │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Invite People                          │
│                                         │
│  Share this link to invite people:      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ www.meetwithfriends.net/invite/  │  │
│  │ g/x7y8z9a0b1                     │  │
│  └───────────────────────────────────┘  │
│  Expires: Jan 2027                      │
│                                         │
│  [Copy]  [Regenerate]  [Disable]        │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Upcoming Events                        │
│  ...                                    │
└─────────────────────────────────────────┘
```

---

### States

**Active Link:**
```
┌───────────────────────────────────┐
│ www.meetwithfriends.net/invite/  │
│ e/a1b2c3d4e5                     │
└───────────────────────────────────┘
Expires: Jan 2027
[Copy]  [Regenerate]  [Disable]
```

**Disabled Link:**
```
┌───────────────────────────────────┐
│ Invite link is disabled           │
└───────────────────────────────────┘
[Enable]
```

**Expired Link:**
```
┌───────────────────────────────────┐
│ Invite link has expired           │
└───────────────────────────────────┘
[Regenerate]
```

**No Link Yet (first time):**
```
┌───────────────────────────────────┐
│ No invite link created            │
└───────────────────────────────────┘
[Create Link]
```

---

### Regenerate Confirmation

```
┌─────────────────────────────────────────┐
│  Regenerate invite link?       [×]      │
│  ─────────────────────────────────────  │
│                                         │
│  The current link will stop working.    │
│  Anyone with the old link will see      │
│  "This link is no longer valid".        │
│                                         │
│  [Cancel]  [Regenerate]                 │
│                                         │
└─────────────────────────────────────────┘
```

---

### Disable Confirmation

```
┌─────────────────────────────────────────┐
│  Disable invite link?          [×]      │
│  ─────────────────────────────────────  │
│                                         │
│  Anyone who clicks this link will see   │
│  "This link is no longer active".       │
│                                         │
│  You can re-enable it later.            │
│                                         │
│  [Cancel]  [Disable]                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Flutter App & Deep Linking

### Current Setup

| Component | Configuration |
|-----------|---------------|
| **Domain** | `www.meetwithfriends.net` |
| **iOS** | Universal Links via `Runner.entitlements` + `apple-app-site-association` |
| **Android** | App Links via intent filters + `assetlinks.json` |
| **Flutter** | `app_links` package with custom `DeepLinkService` |
| **Current paths** | `/events/*`, `/groups/*` |
| **Navigation pattern** | Conditional rendering in `_buildHome()`, callback-based state |

### Magic Link URL Structure

Same URL for web and app:
```
https://www.meetwithfriends.net/invite/g/{token}  (group)
https://www.meetwithfriends.net/invite/e/{token}  (event)
```

**Behavior:**
- App installed → Opens in app
- App not installed → Opens in web browser
- Old app version (no `/invite/*` support) → Opens in web browser

---

### Architecture: Self-Contained InviteFlowScreen (Option B)

The current Flutter navigation uses conditional rendering in `_buildHome()` with an `AuthScreen` enum. Rather than extending this enum, we create a **separate invite flow** that sits above the auth/main split.

**Why this approach:**
- Invite flow is completely isolated from rest of app
- Handles both logged-in and logged-out users
- Manages its own sub-screens internally (intro, signup, photo, success)
- Easy to test in isolation
- Minimal changes to existing navigation code

#### State Changes in main.dart

```dart
class _MyAppState extends State<MyApp> {
  // Existing state
  bool _isLoading = true;
  bool _isLoggedIn = false;
  User? _user;
  AuthScreen _authScreen = AuthScreen.login;

  // NEW: Invite flow state
  String? _pendingInviteToken;
  String? _pendingInviteType;  // 'e' or 'g'
  bool _showInviteFlow = false;

  Widget _buildHome() {
    if (_isLoading) return const LoadingScaffold();

    // NEW: Check invite flow FIRST (takes priority)
    if (_showInviteFlow && _pendingInviteToken != null) {
      return InviteFlowScreen(
        token: _pendingInviteToken!,
        inviteType: _pendingInviteType!,
        isLoggedIn: _isLoggedIn,
        user: _user,
        onComplete: _onInviteComplete,
        onCancel: _onInviteCancel,
      );
    }

    // Existing logic
    if (_isLoggedIn && _user != null) {
      return MainShell(...);
    }

    // Auth screens
    switch (_authScreen) {
      case AuthScreen.login: ...
      case AuthScreen.register: ...
      case AuthScreen.forgotPassword: ...
    }
  }

  // NEW: Called by DeepLinkService when invite link detected
  void _onInviteLinkReceived(String token, String type) {
    setState(() {
      _pendingInviteToken = token;
      _pendingInviteType = type;
      _showInviteFlow = true;
    });
  }

  // NEW: Called when invite flow completes successfully
  void _onInviteComplete(User user, String redirectPath) {
    setState(() {
      _showInviteFlow = false;
      _pendingInviteToken = null;
      _pendingInviteType = null;
      _isLoggedIn = true;
      _user = user;
    });
    // Navigate to event/group after frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _deepLinkService.navigateTo(redirectPath);
    });
  }

  // NEW: Called when user cancels invite flow
  void _onInviteCancel() {
    setState(() {
      _showInviteFlow = false;
      _pendingInviteToken = null;
      _pendingInviteType = null;
    });
  }
}
```

#### DeepLinkService Changes

```dart
class DeepLinkService {
  // NEW: Callback to notify main.dart of invite links
  Function(String token, String type)? onInviteLinkReceived;

  void _handleUri(Uri uri) {
    final pathSegments = uri.pathSegments;
    if (pathSegments.isEmpty) return;

    // NEW: Handle /invite/e/:token or /invite/g/:token
    // This works even when NOT logged in
    if (pathSegments[0] == 'invite' && pathSegments.length >= 3) {
      final type = pathSegments[1];  // 'e' or 'g'
      final token = pathSegments[2];

      if ((type == 'e' || type == 'g') && onInviteLinkReceived != null) {
        onInviteLinkReceived!(token, type);
        return;
      }
    }

    // Other deep links require auth (existing behavior)
    if (!_isLoggedIn) return;

    final navigator = _navigatorKey?.currentState;
    if (navigator == null) return;

    // Handle /events/:id (existing)
    // Handle /groups/:id (existing)
  }
}
```

#### InviteFlowScreen Structure

**File:** `mwf-flutter/lib/screens/invite_flow_screen.dart`

```dart
class InviteFlowScreen extends StatefulWidget {
  final String token;
  final String inviteType;  // 'e' or 'g'
  final bool isLoggedIn;
  final User? user;
  final Function(User user, String redirectPath) onComplete;
  final VoidCallback onCancel;

  const InviteFlowScreen({
    required this.token,
    required this.inviteType,
    required this.isLoggedIn,
    this.user,
    required this.onComplete,
    required this.onCancel,
  });

  @override
  State<InviteFlowScreen> createState() => _InviteFlowScreenState();
}

enum InviteFlowStep {
  loading,        // Validating token
  intro,          // Show event/group preview
  signup,         // New user signup form
  login,          // Existing user login
  photoUpload,    // Required profile photo
  processing,     // Joining group/event
  error,          // Invalid/expired token
}

class _InviteFlowScreenState extends State<InviteFlowScreen> {
  InviteFlowStep _step = InviteFlowStep.loading;

  // Data from API
  InviteData? _inviteData;
  String? _errorMessage;

  // For signup flow
  User? _newUser;
  String? _authToken;

  @override
  void initState() {
    super.initState();
    _validateToken();
  }

  Future<void> _validateToken() async {
    final result = await InviteService.validate(widget.token);

    if (result.success) {
      setState(() {
        _inviteData = result.data;
        _step = InviteFlowStep.intro;
      });
    } else {
      setState(() {
        _errorMessage = result.message;
        _step = InviteFlowStep.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_step) {
      case InviteFlowStep.loading:
        return _buildLoading();
      case InviteFlowStep.intro:
        return _buildIntro();
      case InviteFlowStep.signup:
        return _buildSignup();
      case InviteFlowStep.login:
        return _buildLogin();
      case InviteFlowStep.photoUpload:
        return _buildPhotoUpload();
      case InviteFlowStep.processing:
        return _buildProcessing();
      case InviteFlowStep.error:
        return _buildError();
    }
  }

  Widget _buildIntro() {
    // Shows event/group card with:
    // - "Andreas has invited you to..."
    // - Event/group details
    // - [Accept Invitation] button
    // - If not logged in: "Already have an account? Log in"
    // - If logged in: "Not {name}? Log out"
  }

  Widget _buildSignup() {
    // Signup form with:
    // - Name, email, password fields
    // - Profile photo upload (if group requires)
    // - [Create Account & Join] button
    // - Back button to return to intro
  }

  Widget _buildLogin() {
    // Login form with:
    // - Email, password fields
    // - [Log In & Join] button
    // - Back button to return to intro
  }

  Widget _buildPhotoUpload() {
    // Photo upload screen (if group requires and user doesn't have one):
    // - "One more thing..."
    // - Photo picker
    // - [Continue] button (disabled until photo selected)
  }

  void _onAcceptTapped() {
    if (widget.isLoggedIn) {
      // Check if photo required
      if (_inviteData!.group.requireProfileImage && widget.user?.avatarUrl == null) {
        setState(() => _step = InviteFlowStep.photoUpload);
      } else {
        _processInvite();
      }
    } else {
      setState(() => _step = InviteFlowStep.signup);
    }
  }

  void _onLoginTapped() {
    setState(() => _step = InviteFlowStep.login);
  }

  Future<void> _processInvite() async {
    setState(() => _step = InviteFlowStep.processing);

    final result = await InviteService.accept(
      widget.token,
      authToken: _authToken ?? widget.user?.token,
    );

    if (result.success) {
      final redirectPath = widget.inviteType == 'e'
          ? '/events/${_inviteData!.event!.id}'
          : '/groups/${_inviteData!.group.id}';
      widget.onComplete(_newUser ?? widget.user!, redirectPath);
    } else {
      setState(() {
        _errorMessage = result.message;
        _step = InviteFlowStep.error;
      });
    }
  }
}
```

---

### Required Platform Changes

#### 1. Android Manifest
**File:** `mwf-flutter/android/app/src/main/AndroidManifest.xml`

Add new intent filter:
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="https"
          android:host="www.meetwithfriends.net"
          android:pathPrefix="/invite"/>
</intent-filter>
```

#### 2. Apple App Site Association
**File:** `mwf-web/public/.well-known/apple-app-site-association`

Add `/invite/*` to paths:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "43A5Y7KJMA.com.noodev8.meetwithfriends",
        "paths": [
          "/events/*",
          "/groups/*",
          "/invite/*"
        ]
      }
    ]
  }
}
```

---

### Flutter Flow Summary

```
Deep link clicked: www.meetwithfriends.net/invite/e/abc123
         │
         ▼
    App installed?
    ├── NO  → Opens in web browser (web handles it)
    └── YES → App opens
              │
              ▼
         DeepLinkService._handleUri()
              │
              ▼
         Path starts with /invite/?
         ├── NO  → Existing logic (requires auth)
         └── YES → Call onInviteLinkReceived(token, type)
                   │
                   ▼
              main.dart sets _showInviteFlow = true
                   │
                   ▼
              _buildHome() returns InviteFlowScreen
                   │
                   ▼
              InviteFlowScreen (self-contained):
              ├── loading: Validate token via API
              ├── intro: Show event/group preview + buttons
              ├── signup: New user creates account (if needed)
              ├── login: Existing user logs in (if needed)
              ├── photoUpload: Upload photo (if required)
              ├── processing: Join group/RSVP event
              ├── error: Show error message + cancel option
              └── success: Call onComplete → redirect to event/group
```

---

## Security Considerations

### Token Generation
- Use `crypto.randomBytes(32).toString('hex')` - 64 character hex string
- Cryptographically secure, non-guessable

### Token Expiration
- Default: 365 days from creation (1 year)
- Max uses: 50 (prevents unlimited sharing)
- Expiry date visible to organiser on group/event page
- Expired links show "Link expired" state with Regenerate option

### Abuse Prevention
- Organisers can disable links instantly
- Disabled links show friendly message
- Use count limits prevent runaway sharing

### Data Privacy
- Don't expose user emails in validation response
- Cache `inviter_name` at creation time (snapshot)

---

## Implementation Progress

Track progress for session continuity. Mark items ✅ when complete.

### Backend Organiser Endpoints (Lowest Risk)
- [x] `POST /groups/:id/magic-link` (get/create)
- [x] `POST /events/:id/magic-link` (get/create)
- [x] `POST /groups/:id/magic-link/regenerate`
- [x] `POST /events/:id/magic-link/regenerate`
- [x] `POST /groups/:id/magic-link/disable`
- [x] `POST /events/:id/magic-link/disable`
- [x] `POST /groups/:id/magic-link/enable`
- [x] `POST /events/:id/magic-link/enable`

### Backend Invitee Endpoints (Low Risk)
- [x] `GET /invite/validate/:token`
- [x] `POST /invite/accept/:token`
- [x] `POST /invite/accept-with-signup/:token`

### Web Organiser UI (Medium Risk)
- [ ] Event Page - "Invite People" section
- [ ] Group Page - "Invite People" section
- [ ] Confirmation modals (Regenerate, Disable)

### Web Invitee Pages (Medium Risk)
- [ ] `/invite/g/:token` page (group flow)
- [ ] `/invite/e/:token` page (event flow)
- [ ] Signup form with invite context
- [ ] Photo upload requirement screen
- [ ] "Log in instead" with localStorage preservation

### Flutter Platform Config (Medium-High Risk)
- [ ] Update `apple-app-site-association` - add `/invite/*`
- [ ] Update `AndroidManifest.xml` - add `/invite` intent filter

### Flutter App Code (Higher Risk)
- [ ] main.dart - add invite flow state
- [ ] DeepLinkService - handle `/invite/*` paths
- [ ] InviteFlowScreen - self-contained flow
- [ ] InviteService - API calls

---

## Implementation Phases

### Phase 1: Database + Backend Core
1. ✅ Add magic link columns to `group_list` and `event_list` tables (DONE - already in DB)
2. Implement `GET /invite/validate/:token` endpoint
3. Implement `POST /invite/accept/:token` endpoint (logged in user)
4. Implement `POST /invite/accept-with-signup/:token` endpoint (new user)

### Phase 2: Organiser Backend
1. Implement `POST /groups/:id/magic-link` (get/create)
2. Implement `POST /events/:id/magic-link` (get/create)
3. Implement regenerate endpoints
4. Implement disable/enable endpoints

### Phase 3: Invitee Frontend (Web)
1. Create `/invite/g/:token` page (group intro + flow)
2. Create `/invite/e/:token` page (event intro + flow)
3. Create signup form component with invite context
4. Handle photo upload requirement (interstitial screen)
5. Implement "Log in instead" flow with localStorage token preservation

### Phase 4: Organiser Frontend (Web)
1. Add "Invite People" section to Event Page
2. Add "Invite People" section to Group Page
3. Implement Copy, Regenerate, Disable buttons
4. Add confirmation modals for Regenerate and Disable

### Phase 5: Flutter App
1. **Platform config:**
   - Update `apple-app-site-association` - add `/invite/*` path
   - Update `AndroidManifest.xml` - add `/invite` intent filter
2. **main.dart changes:**
   - Add `_pendingInviteToken`, `_pendingInviteType`, `_showInviteFlow` state
   - Add `_onInviteLinkReceived()`, `_onInviteComplete()`, `_onInviteCancel()` callbacks
   - Update `_buildHome()` to check invite flow first
3. **DeepLinkService changes:**
   - Add `onInviteLinkReceived` callback
   - Detect `/invite/*` paths and call callback (no auth required)
4. **Create InviteFlowScreen:**
   - Self-contained screen with internal step management
   - Steps: loading → intro → signup/login → photoUpload → processing → success/error
   - Handles both logged-in and logged-out users
5. **Create InviteService:**
   - `validate(token)` - calls `GET /invite/validate/:token`
   - `accept(token, authToken)` - calls `POST /invite/accept/:token`
   - `acceptWithSignup(token, name, email, password, avatarUrl?)` - calls `POST /invite/accept-with-signup/:token`
6. **Sub-screens within InviteFlowScreen:**
   - Intro view (event/group card + buttons)
   - Signup form view
   - Login form view
   - Photo upload view
   - Error view

### Phase 6: Error States + Polish (All Platforms)
1. Error screens (invalid, expired, disabled, limit reached)
2. Event-specific errors (cancelled, already happened)
3. Success toasts and redirects
4. Loading states
5. Test deep link flows on iOS and Android

---

## Design Decisions (Confirmed)

1. **No named invites** - Links are distributed to groups (WhatsApp, etc.), not individuals
2. **No guest count on invite** - Keep flow simple, users can add guests later from event page
3. **Both group and event invites** - Support both use cases
4. **Keep existing `invite_code`** - New magic link columns added separately, don't break existing code
5. **No individual use tracking** - Just increment use_count, don't track who used each link
6. **One link per group/event** - Regenerate replaces old token
7. **Simple organiser UI** - Copy, Regenerate, Disable only. No link history or advanced options.
8. **Photo requirement enforced** - If group requires photo, no skip option
9. **Magic links bypass approval** - Organiser implicitly pre-approves invitees (for group membership)
10. **Same URL for web and app** - Universal/App Links handle routing automatically
11. **Invite deep links bypass auth** - `/invite/*` paths work without login, screen handles its own auth
12. **Old app graceful fallback** - Old apps don't have `/invite/*` in config, so links open in web browser
13. **Self-contained InviteFlowScreen (Flutter)** - Sits above auth/main split, manages own sub-screens internally
14. **Long token expiry (365 days)** - Reduces support burden; expiry visible to organiser on group/event page
15. **Enable resets expiry** - Re-enabling a disabled link resets expiry to 365 days from now
16. **Event invites do NOT auto-RSVP** - Users should review event details (attendees, menu, costs) before committing. The invite grants access to view the event; the user decides whether to attend. This respects user agency and is especially important for food events with deposits, menu pre-orders, or dietary considerations.

---

## Summary

This magic link system enables frictionless invitations while handling the complexity of:
- New vs existing users (signup flow vs auto-process)
- Group membership requirements (profile photo enforcement)
- Event invites grant access but do NOT auto-RSVP (user reviews details first)
- Token security and expiration (365 days, 50 uses default)
- Organiser control (Copy, Regenerate, Disable)
- Cross-platform support (Web + iOS + Android)

**Key Simplifications:**
- One link per group/event (no link history)
- Columns on existing tables (no separate invite_token table)
- No individual use tracking (just use_count)
- No sharing integrations (just copy to clipboard)
- Same URL for web and app (Universal/App Links handle routing)

**Flutter Architecture:**
- Self-contained `InviteFlowScreen` sits above auth/main split
- DeepLinkService calls callback for `/invite/*` paths (no auth required)
- Screen manages internal steps: loading → intro → signup/login → photo → processing
- Minimal changes to existing navigation code

**Implementation order:** Backend core → Organiser backend → Web invitee → Web organiser → Flutter app → Polish.
