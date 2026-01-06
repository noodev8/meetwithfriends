# Meet With Friends - Project Foundation

## Vision Statement
A group event management platform that simplifies hosting social gatherings by handling RSVPs, deposits, and coordination - removing friction for both hosts and guests. Works for any type of group: dining clubs, coffee meetups, hobby groups, and more.

## Strategic Intent
**Short-term:** Replace Meetup for existing groups with a focused, noise-free experience.
**Medium-term:** Add deposits and pre-orders to solve the no-show problem (especially for restaurant bookings).
**Long-term:** Build a three-sided marketplace connecting Guests, Hosts, and Restaurants.

## The Bigger Vision (Future)
The restaurant group-booking experience is broken:

| Today (Disjointed) | Future (Meet With Friends) |
|--------------------|----------------------------|
| Host calls restaurant to book | Restaurant lists availability for groups |
| Host chases deposits via bank transfer | Deposits collected automatically at RSVP |
| Host collects menu choices via WhatsApp | Guests select from menu in-app |
| Host emails PDF pre-order to restaurant | Restaurant sees pre-order in real-time |
| Restaurant doesn't know who's actually coming | Restaurant has confirmed, paid attendees |
| Day-of chaos: who paid? who ordered what? | Everyone has clarity before arrival |

### Possible Future Features (Not in scope now)
- Restaurant profiles on platform
- Restaurants create "bookable slots" for groups
- Direct booking from Host to Restaurant
- Pre-order flows straight to restaurant's kitchen system
- Restaurant-initiated events ("Thai night - 20 seats available")
- Review/rating system for group-friendly restaurants
- Commission model: platform takes % of group bookings

### Why Not Build This Now?
1. Restaurants won't join until you have groups using the platform
2. You need to prove the Host/Guest side works first
3. The restaurant integration is complex (POS systems, availability, etc.)
4. Crawl → Walk → Run

### The Path
```
Phase 1-3: Host ↔ Guest (you are here)
Phase 4+:  Host ↔ Restaurant (manual, email-based)
Future:    Guest ↔ Host ↔ Restaurant (integrated marketplace)
```

**Build the demand side first. Supply (restaurants) will follow.**

## Problem Statement
Meetup works for basic event coordination but falls short for groups requiring:
- Deposit collection to reduce no-shows (especially for restaurant bookings)
- Menu pre-ordering for restaurant coordination
- Centralized payment handling
- Simpler interface for less tech-savvy users
- A focused experience without the noise of a discovery platform

## Target Users

### Role Hierarchy
```
Organiser (Group Owner)
    └── Host (Assigned by Organiser)
            └── Member (Guest)
```

### Organiser
- Creates and owns the group
- Sets group rules (auto-join vs approval required)
- Connects Stripe account for the group (one per group)
- Can assign Host role to members
- Full admin access to group, events, payments
- Pays the platform subscription

### Host
- Assigned by Organiser from existing members
- Creates and manages events
- Sets event rules (deposits, deadlines, capacity, menu)
- Uses Organiser's Stripe account for payments
- Sends pre-orders to restaurants
- Cannot change group settings or billing

### Member (Guest)
- Browses groups/events before registering
- Requests to join groups (auto-approved or pending based on group settings)
- RSVPs to events and pays deposits
- Selects menu choices
- Views other attendees and member directory

## Core Differentiators from Meetup
1. **Not a discovery platform** - Focused on managing existing communities
2. **Payment-first** - Deposits required before confirming attendance
3. **Pre-order system** - Menu selection and restaurant coordination
4. **Simplified UX** - Targeting older, less tech-savvy users

## Business Model
- Free for guests
- Monthly subscription for hosts/organizers
- Current benchmark: 137 members @ £6.39/year (~£875/year revenue potential)

## Tech Stack
- **Web Frontend:** Next.js
- **Mobile App:** Flutter
- **Backend:** Node.js
- **Database:** PostgreSQL

## Timeline
Target: 8 months maximum (phased delivery)

---

# Feature Phases (Draft)

## Phase 1: Foundation (MVP)
*Goal: Replace basic Meetup functionality for existing groups*
*Value proposition: "Bring your group together. The simple way to organise group events."*

### Accounts & Profiles
- [ ] User accounts (email/password)
- [ ] User profiles (name, bio, profile picture)
- [ ] Browse without registration (events visible, attendee COUNT only for non-members)
- [ ] Registration required to join group or RSVP

### Groups
- [ ] Create group
- [ ] Group settings (name, description, image)
- [ ] Join group (auto-approve or manual approval - organiser's choice)
- [ ] Member directory (see who's in the group)
- [ ] Assign Host role to members
- [ ] Remove member from group (host/organiser)

### Events
- [ ] Create event (title, date, time, location, description, capacity)
- [ ] Event RSVP (Attending / cancel RSVP)
- [ ] View attendee list
- [ ] Edit/cancel event
- [ ] Waitlist when capacity reached
- [ ] Auto-promote from waitlist when spot opens
- [ ] Host can remove RSVP

### Communication
- [ ] Discussion section on event page (event-level only, not group-level)
- [ ] Flat comments (chronological, no threading)
- [ ] Any group member can post/reply
- [ ] Visible to anyone (including non-members browsing)
- [ ] Basic moderation (host/organiser can delete comments)

## Phase 2: Payments & Deposits
*Goal: Core differentiator - deposit handling*

- [ ] Stripe Connect integration
- [ ] Organiser connects Stripe account
- [ ] Deposit requirement per event
- [ ] Payment collection from guests
- [ ] Refund handling
- [ ] Payment status visibility

## Phase 3: Menu & Pre-orders
*Goal: Restaurant coordination*

- [ ] Menu creation per event
- [ ] Guest menu selection
- [ ] Pre-order summary generation
- [ ] Email pre-order to restaurant
- [ ] Dietary requirements/notes

## Phase 4: Multi-Group & Monetization
*Goal: Platform scaling*

- [ ] Multiple groups per organiser
- [ ] Host subscription billing
- [ ] Group privacy settings

## Phase 5: Polish & Advanced
*Goal: Quality of life improvements*

- [ ] Notifications (email, push)
- [ ] Advanced waitlist management (manual reorder, bulk actions)
- [ ] Recurring events
- [ ] Event templates
- [ ] Attendance history/stats
- [ ] Mobile app (Flutter)

---

# Data Model

## MVP Entities

```
┌─────────────────┐
│    app_user     │
├─────────────────┤
│ id              │  PK
│ email           │  UNIQUE
│ password_hash   │
│ name            │
│ bio             │
│ avatar_url      │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│   user_group    │
├─────────────────┤
│ id              │  PK
│ name            │
│ description     │
│ image_url       │
│ join_policy     │  (auto/approval)
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│  group_member   │
├─────────────────┤
│ id              │  PK
│ group_id        │  FK → user_group
│ user_id         │  FK → app_user
│ role            │  (organiser/host/member)
│ status          │  (active/pending)
│ joined_at       │
└─────────────────┘

┌─────────────────┐
│     event       │
├─────────────────┤
│ id              │  PK
│ group_id        │  FK → user_group
│ created_by      │  FK → app_user
│ title           │
│ description     │
│ location        │
│ date_time       │
│ capacity        │
│ status          │  (published/cancelled)
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│   event_rsvp    │
├─────────────────┤
│ id              │  PK
│ event_id        │  FK → event
│ user_id         │  FK → app_user
│ status          │  (attending/waitlist)
│ waitlist_position│  (null if attending)
│ created_at      │
└─────────────────┘

┌─────────────────┐
│  event_comment  │
├─────────────────┤
│ id              │  PK
│ event_id        │  FK → event
│ user_id         │  FK → app_user
│ content         │
│ created_at      │
└─────────────────┘
```

## Phase 2 Additions (Payments)

```
┌─────────────────┐
│ stripe_account  │
├─────────────────┤
│ id              │  PK
│ group_id        │  FK → user_group (UNIQUE)
│ stripe_acc_id   │
│ connected_at    │
└─────────────────┘

┌─────────────────┐
│    payment      │
├─────────────────┤
│ id              │  PK
│ event_rsvp_id   │  FK → event_rsvp
│ amount_pence    │
│ status          │  (pending/completed/refunded)
│ stripe_payment_id│
│ created_at      │
│ refunded_at     │
└─────────────────┘
```

## Key Relationships
- app_user ↔ user_group: Many-to-many via group_member
- user_group → event: One-to-many
- event ↔ app_user: Many-to-many via event_rsvp
- event → event_comment: One-to-many
- user_group → stripe_account: One-to-one (Phase 2)
- event_rsvp → payment: One-to-one (Phase 2)

---

# User Journeys (MVP)

## Journey 1: New Member Joins Group and RSVPs
```
1. Person receives direct link to group (from organiser, Meetup cross-post, etc.)
2. Browses group page - sees description, upcoming events
3. Clicks event - sees details, attendee COUNT (not names), comments
4. Wants to RSVP → prompted to register/login
5. Creates account (email/password, no verification)
6. Returns to group → clicks "Join Group"
7. If auto-approve: immediately a member
   If manual: request sent, waits for organiser approval
8. Once member: RSVPs to event
9. Appears on attendee list
10. Can post comments on event
```

## Journey 2: Host Creates Event
```
1. Host logs in
2. Goes to their group
3. Clicks "Create Event"
4. Fills in: title, date, time, location (free text), description, capacity
5. Publishes immediately (no draft state)
6. Event appears on group page
7. Host can edit details later if needed
```

## Journey 3: Organiser Sets Up Group
```
1. Organiser creates account
2. Creates new group (name, description, image)
3. Sets join policy (auto-approve or manual)
4. (Phase 2: Connects Stripe account)
5. Shares group link with potential members
6. Approves join requests (if manual approval)
7. Assigns Host role to trusted members
```

## Journey 4: Host Manages Attendance
```
1. Host views event attendee list
2. Sees who has RSVP'd
3. (Phase 2: Sees who has paid deposit)
4. Can remove RSVP if needed
5. Posts updates in event comments
```

## Journey 5: Member Cancels RSVP
```
1. Member goes to event they RSVP'd to
2. Clicks "Cancel RSVP" (or changes to "Not Attending")
3. Removed from attendee list
4. (Phase 2: Refund handled per host policy)
```

---

# Open Questions

## Answered
- ~~Payment processor~~ → Stripe Connect
- ~~Refund policy~~ → Organiser decides
- ~~Payment flow~~ → Money to organiser's Stripe, platform takes fee
- ~~Multiple groups~~ → Yes, multi-host platform
- ~~Pricing model~~ → Subscription + transaction fee, free tier, details TBD
- ~~Registration trigger~~ → At "Join Group"
- ~~Deposit vs full payment~~ → Host decides per event
- ~~No-show handling~~ → Host decides
- ~~Cancellation~~ → Host decides
- ~~Web-first or mobile-first~~ → Web-first, Flutter follows

## All Answered
- ~~Guest accounts~~ → One account, multiple groups
- ~~Profile visibility~~ → Members only. Non-members see attendee count, not profiles.
- ~~Payment deadline~~ → Payment at RSVP time (if required). Host sets whether payment needed per event.
- ~~Menu source~~ → Host uploads image (Cloudinary). Better menu builder in future phase.
- ~~Pre-order format~~ → Free text for MVP. Better formatting later.
- ~~Payment to restaurant~~ → Separate. Host pays restaurant outside platform.
- ~~Offline needs~~ → None. Always online.
- ~~Data migration~~ → Manual load to database. Not a platform feature. One-time migration.

---

# Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-04 | Project initiated | Document created |
| 2026-01-04 | Web-first, mobile follows | Build solid API/backend with Next.js, Flutter app comes after core is stable |
| 2026-01-04 | Registration at "Join Group" | Users can browse events/attendees freely, must register to join a group |
| 2026-01-04 | Multi-host platform | Designed for multiple groups/hosts from day one, not single-tenant |
| 2026-01-04 | Flexible payment model | Host decides per event: deposit only, partial, or full payment upfront |
| 2026-01-04 | Payment flow: Stripe Connect | Organiser connects Stripe, money held there, platform takes % fee. No platform-held funds. |
| 2026-01-04 | No PWA | Will build proper Flutter app after web app is stable |
| 2026-01-04 | Role hierarchy defined | Organiser → Host → Member (not flat structure) |
| 2026-01-04 | One Stripe per group | Organiser connects Stripe, hosts use it for events |
| 2026-01-04 | Group join settings | Organiser chooses: auto-approve or manual approval |
| 2026-01-04 | MVP without payments | Phase 1 matches Meetup basics. Payments/menus in Phase 2. Run parallel with Meetup initially. |
| 2026-01-04 | MVP value proposition | "Bring your group together. The simple way to organise group events." |
| 2026-01-04 | Discussion section | Event-level only, flat comments, visible to anyone, members can post |
| 2026-01-04 | Platform philosophy | Platform is a tool, not a rule-maker. Organisers own all policies. |
| 2026-01-04 | Refund policy | Organiser decides for their group. Host can refund anytime without member request. |
| 2026-01-04 | No-show policy | Up to organiser/host. Platform doesn't restrict or enforce. |
| 2026-01-04 | Cancellation policy | Up to organiser/host for both event cancellations and member cancellations. |
| 2026-01-04 | Business model | Subscription + transaction fee. Free tier for starting out. Details TBD. |
| 2026-01-04 | Member fees | Organisers can charge members whatever they want. Platform doesn't dictate. |
| 2026-01-04 | One account, multiple groups | Users can join multiple groups with single account |
| 2026-01-04 | Profile visibility | Members only. Non-members see attendee counts only. |
| 2026-01-04 | Payment timing | At RSVP time if host requires payment for event |
| 2026-01-04 | Menu approach (MVP) | Host uploads image (Cloudinary). Free text pre-orders. Better builder later. |
| 2026-01-04 | Restaurant payment | Outside platform. Host handles separately. |
| 2026-01-04 | Always online | No offline requirements |
| 2026-01-04 | Data migration | Manual database load. Not a platform feature. |
| 2026-01-04 | Group discovery | Direct link only. No platform search. Cross-post from Meetup during transition. |
| 2026-01-04 | Authentication | Email/password only for MVP. No social login. |
| 2026-01-04 | Email verification | None. Reduce barriers. Host can remove bad actors. |
| 2026-01-04 | Event drafts | No drafts. Create and publish, or cancel. |
| 2026-01-04 | Event editing | Yes - date, description, capacity, cancel all editable after publish. |
| 2026-01-04 | Location field | Free text for MVP. No maps integration. |
| 2026-01-04 | RSVP states | Attending or cancel. No explicit "Not Going" option. |
| 2026-01-04 | Capacity handling | Waitlist when full. Auto-promote when spot opens. |
| 2026-01-04 | Waitlist payments | Phase 2: Waitlist members pay deposit, refunded if not promoted. |
| 2026-01-04 | Host RSVP control | Host can remove any RSVP. |
| 2026-01-04 | Data model approved | 6 MVP tables: app_user, user_group, group_member, event, event_rsvp, event_comment |
| 2026-01-04 | User table naming | Use app_user (project convention) |
| 2026-01-04 | Folder structure | Monorepo: /docs, /mwf-server, /mwf-web, /mwf-flutter |
| 2026-01-04 | CSS framework | Tailwind CSS |
| 2026-01-04 | Ports | Backend port in .env (user provides), frontend localhost:3000 |
| 2026-01-04 | Password hashing | bcrypt |
| 2026-01-04 | Image uploads | Cloudinary direct from frontend |
| 2026-01-04 | Email service | Resend |
| 2026-01-04 | Attendee visibility | Non-members see count only. Members see full attendee list. |
| 2026-01-04 | Password management | Full suite: forgot password, reset, change password, delete account |
| 2026-01-04 | Logout approach | Client-side only (delete token). No server-side logout endpoint. |
| 2026-01-04 | Group table naming | Use user_group (avoid PostgreSQL reserved word) |
| 2026-01-04 | Decision to build | Proceeding with full platform build. Deposits are the forcing function for migration. |
| 2026-01-06 | Broader positioning | Platform not limited to food groups. Works for any community: dining, coffee, hobbies. Restaurant marketplace remains long-term vision but messaging is generic. |
| 2026-01-04 | Strategic intent | Short-term: Replace Meetup. Medium-term: Deposits/pre-orders. Long-term: Restaurant group-booking business. |
| 2026-01-04 | Migration strategy | Staged approach: soft launch → dual running → deposits force move → full migration |
| 2026-01-04 | Long-term vision | Three-sided marketplace: Guests ↔ Hosts ↔ Restaurants. Build demand (hosts/guests) first. |

---

# Technical Architecture

## Folder Structure

```
meetwithfriends/
├── docs/
│   ├── PROJECT_FOUNDATION.md
│   ├── API-Rules.md
│   └── DB-Setup.sql
│
├── mwf-server/                     # Backend (Node.js + Express)
│   ├── config/
│   │   └── config.js              # JWT secret, env vars
│   ├── middleware/
│   │   └── auth.js                # verifyToken, optionalAuth
│   ├── routes/
│   │   ├── auth/
│   │   │   ├── register.js
│   │   │   ├── login.js
│   │   │   ├── forgot_password.js
│   │   │   └── reset_password.js
│   │   ├── users/
│   │   │   ├── get_profile.js
│   │   │   ├── update_profile.js
│   │   │   ├── my_groups.js
│   │   │   ├── change_password.js
│   │   │   └── delete_account.js
│   │   ├── groups/
│   │   │   ├── create_group.js
│   │   │   ├── get_group.js
│   │   │   ├── get_members.js
│   │   │   ├── pending_members.js
│   │   │   ├── join_group.js
│   │   │   ├── approve_member.js
│   │   │   ├── reject_member.js
│   │   │   ├── remove_member.js
│   │   │   └── assign_role.js
│   │   ├── events/
│   │   │   ├── create_event.js
│   │   │   ├── get_event.js
│   │   │   ├── update_event.js
│   │   │   ├── cancel_event.js
│   │   │   ├── rsvp.js
│   │   │   ├── cancel_rsvp.js
│   │   │   └── remove_rsvp.js
│   │   └── comments/
│   │       ├── add_comment.js
│   │       └── delete_comment.js
│   ├── utils/
│   │   └── transaction.js         # withTransaction wrapper
│   ├── database.js                # PostgreSQL pool
│   ├── server.js                  # Express app entry point
│   ├── package.json
│   └── .env                       # PORT, DB credentials, JWT_SECRET
│
├── mwf-web/                        # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── page.tsx           # Landing/home
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── groups/
│   │   │   │   └── [groupId]/
│   │   │   │       ├── page.tsx   # Group detail
│   │   │   │       └── events/
│   │   │   │           └── [eventId]/
│   │   │   │               └── page.tsx
│   │   │   └── profile/
│   │   ├── components/
│   │   │   ├── ui/                # Buttons, inputs, cards
│   │   │   ├── layout/            # Header, footer, nav
│   │   │   └── features/          # EventCard, MemberList, etc.
│   │   ├── lib/
│   │   │   ├── api/               # API client functions
│   │   │   │   ├── auth.ts
│   │   │   │   ├── groups.ts
│   │   │   │   ├── events.ts
│   │   │   │   └── comments.ts
│   │   │   └── apiClient.ts       # Base fetch wrapper
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # User auth state
│   │   └── types/
│   │       └── index.ts           # TypeScript interfaces
│   ├── package.json
│   └── .env.local                 # NEXT_PUBLIC_API_URL
│
└── mwf-flutter/                    # Mobile (Phase 5)
    └── (later)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Mobile | Flutter (Phase 5) |
| Database | PostgreSQL (direct, no ORM) |
| Auth | JWT (jsonwebtoken), bcrypt for passwords |
| Images | Cloudinary (direct upload from frontend) |
| Email | Resend |
| Dev environment | Windows |
| API testing | Postman |

## API Design (per API-Rules.md)

- Always return HTTP 200 with `return_code`
- JWT stores only user ID
- Middleware: `verifyToken`, `optionalAuth`
- One file per endpoint with header documentation
- Frontend API client never throws on API errors

## Ports

| Service | Port |
|---------|------|
| mwf-server | 3018 |
| mwf-web | 3000 |

## API Endpoints (MVP)

### Auth
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/auth/register | POST | none | Create account |
| /api/auth/login | POST | none | Login, get JWT |
| /api/auth/forgot_password | POST | none | Send password reset email |
| /api/auth/reset_password | POST | none | Reset password with token |

### Users
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/users/get_profile | GET | optionalAuth | Get user profile |
| /api/users/update_profile | POST | verifyToken | Update own profile |
| /api/users/my_groups | GET | verifyToken | List groups user belongs to |
| /api/users/change_password | POST | verifyToken | Change own password |
| /api/users/delete_account | POST | verifyToken | Delete own account and data |

### Groups
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/groups/create_group | POST | verifyToken | Create new group |
| /api/groups/get_group | GET | optionalAuth | Get group details + events |
| /api/groups/get_members | GET | verifyToken (member) | List all members of group |
| /api/groups/pending_members | GET | verifyToken (host+) | List pending join requests |
| /api/groups/join_group | POST | verifyToken | Request to join |
| /api/groups/approve_member | POST | verifyToken (host+) | Approve pending member |
| /api/groups/reject_member | POST | verifyToken (host+) | Reject pending member |
| /api/groups/remove_member | POST | verifyToken (host+) | Remove member from group |
| /api/groups/assign_role | POST | verifyToken (organiser) | Promote member to host |

### Events
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/events/create_event | POST | verifyToken (host+) | Create event |
| /api/events/get_event | GET | optionalAuth | Get event + attendees + comments |
| /api/events/update_event | POST | verifyToken (host+) | Edit event details |
| /api/events/cancel_event | POST | verifyToken (host+) | Cancel event |
| /api/events/rsvp | POST | verifyToken (member) | RSVP to event |
| /api/events/cancel_rsvp | POST | verifyToken (member) | Cancel own RSVP |
| /api/events/remove_rsvp | POST | verifyToken (host+) | Remove someone's RSVP |

### Comments
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/comments/add_comment | POST | verifyToken (member) | Add comment to event |
| /api/comments/delete_comment | POST | verifyToken (host+ or owner) | Delete comment |

## External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| Cloudinary | Profile pics, group images | Direct upload from mwf-web, URL stored in DB |
| Resend | Email notifications (Phase 2+) | Called from mwf-server |
| Stripe Connect | Payments (Phase 2) | Called from mwf-server |

---

# Next Steps

## Completed This Session
- [x] Defined vision and problem statement
- [x] Established role hierarchy (Organiser → Host → Member)
- [x] Defined MVP scope (no payments)
- [x] Answered all open questions
- [x] Documented user journeys
- [x] Created data model
- [x] Defined technical architecture

---

# Migration Strategy

## The Friction Problem
- 137 members comfortable on Meetup
- Older demographic, change-resistant
- No immediate benefit for them (Phase 1 = Meetup equivalent)
- Risk of losing casual members during transition

## The Forcing Function: Deposits
Once Phase 2 is live, deposits become your migration lever:
- "To attend this restaurant event, book and pay here"
- Members MUST use the platform to get a seat
- No chasing, no bank transfers - it just works
- The benefit becomes obvious

## Recommended Approach: Staged Migration

### Stage 1: Soft Launch (During MVP build)
- Keep running Meetup as normal
- Invite 10-15 trusted/tech-friendly members as beta testers
- Get feedback, fix issues, build confidence

### Stage 2: Dual Running (MVP complete)
- Post events on both Meetup AND Meet With Friends
- Meetup post says: "Full details and RSVP at [link]"
- Let members choose - no pressure
- Track who uses which

### Stage 3: Deposits Force the Move (Phase 2)
- Restaurant events requiring deposits: MWF only
- "Pay £10 deposit to confirm your spot"
- Can't do this on Meetup - natural migration
- Casual coffee mornings can stay on Meetup if needed

### Stage 4: Full Migration
- Once 80%+ are on MWF, sunset Meetup
- Final push for stragglers: "We're moving fully on [date]"
- Accept some loss (5-10% drop-off is normal)

## Softening the Friction

| Concern | How to Address |
|---------|----------------|
| "Another account?" | Simple email/password, takes 30 seconds |
| "Why change?" | "One place for our meals. Book, pay, pick your food - all here." |
| "I like Meetup" | "So did we, but we need deposits to stop no-shows. Meetup can't do that." |
| "Too complicated" | Clean, simple design. Test with older members first. |
| "What if I don't?" | For deposit events: you can't attend. Natural consequence. |

## The Pitch to Members
> "We're launching a new home for our group. It's simpler than Meetup - just us, just our events. Soon you'll be able to pay deposits online instead of bank transfers. For restaurant nights, you'll even be able to choose your food in advance. Give it a try at [link]."

## Success Metrics
- Stage 1: 10+ beta testers actively using, no critical bugs
- Stage 2: 50%+ RSVPs happening on MWF
- Stage 3: All deposit events on MWF, 80%+ members migrated
- Stage 4: Meetup sunset, <10% member loss

---

# Ready for Next Session
1. **Database setup** - Run DB-Setup.sql in pgAdmin
2. **Project scaffolding** - Initialize mwf-server and mwf-web
3. **Start building** - Auth endpoints first, then groups

