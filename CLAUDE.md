# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meet With Friends (MWF) is a group event management platform for food-focused social events. It handles deposits, menu pre-orders, and centralized payments. The project is a Meetup replacement with a three-phase vision: basic event management → payments/deposits → restaurant marketplace.

## Commands

### mwf-server (Backend - Port 3018)
```bash
cd mwf-server
npm run dev      # Start with nodemon (hot reload)
npm run start    # Production start
npm run lint     # ESLint
```

### mwf-web (Frontend - Port 3000)
```bash
cd mwf-web
npm run dev      # Next.js dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

### Monorepo Structure
```
meetwithfriends/
├── docs/                 # PROJECT_FOUNDATION.md, API-RULES.md, DB-Schema.sql
├── mwf-server/           # Node.js + Express backend
└── mwf-web/              # Next.js frontend
```

### Backend (mwf-server)
- **Express.js** with route-per-file pattern
- **PostgreSQL** direct queries (no ORM) via `database.js` pool
- **JWT auth** with only user_id in token - fetch other data from DB
- Routes: `/routes/{auth,users,groups,events,comments}/`
- Middleware: `verifyToken` (required auth), `optionalAuth` (optional auth)
- Services: `services/email.js` (Resend integration)

### Frontend (mwf-web)
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- Auth state via `context/AuthContext.tsx` (localStorage persistence)
- API client: `lib/apiClient.ts` with `apiCall()` and `apiGet()`

## Critical API Conventions (from API-RULES.md)

### Backend Response Pattern
**Always return HTTP 200** with `return_code` field:
```javascript
// Success
return res.json({ return_code: 'SUCCESS', user: {...} });

// Error (still HTTP 200!)
return res.json({ return_code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
```

Standard return codes: `SUCCESS`, `MISSING_FIELDS`, `INVALID_*`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `SERVER_ERROR`

### Frontend API Client Pattern
**Never throw on API errors** - return structured objects:
```typescript
if (response.return_code === 'SUCCESS') {
    return { success: true, data: response.user as unknown as User };
}
return { success: false, error: (response.message as string) || 'Failed' };
```

### Backend File Headers
Every route file must include structured header documentation with Method, Purpose, Request Payload, Success Response, and Return Codes.

## Database

- **PostgreSQL** with tables: `app_user`, `password_reset_token`, `user_group`, `group_member`, `event`, `event_rsvp`, `event_comment`
- Schema in `/docs/DB-Schema.sql`
- Use `user_group` (not `group`) to avoid PostgreSQL reserved word
- Use `app_user` (not `user`) per project convention

## Role Hierarchy

```
Organiser (owns group, connects Stripe)
    └── Host (creates/manages events)
            └── Member (RSVPs, comments)
```

## External Services

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| Resend | Password reset emails | `mwf-server/.env` (RESEND_API_KEY) |
| Cloudinary | Image uploads | `mwf-web/next.config.js` |
| Stripe Connect | Payments (Phase 2) | Not yet implemented |

## Code Quality Rules

- **Never disable ESLint rules** (e.g., `// eslint-disable-next-line`) without explicit user confirmation. Fix the underlying issue instead.

## Environment Variables

### mwf-server/.env
```
PORT=3018
CORS_ORIGIN=http://localhost:3000
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET, JWT_EXPIRES_IN
RESEND_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME, FRONTEND_URL
```

### mwf-web/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:3018
```
