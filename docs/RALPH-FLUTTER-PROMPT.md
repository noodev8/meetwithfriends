# Ralph Loop: Flutter App Build

## Your Mission

Build the Meet With Friends Flutter mobile app following the plan in `docs/FLUTTER-PLAN.md`.

## Current Phase

Check `mwf-flutter/BUILD-PROGRESS.md` to see what's completed and what's next. If the file doesn't exist, start with Project Setup.

## Build Order

### Phase 0: Project Setup
1. Create Flutter project in `mwf-flutter/` with bundle ID `com.noodev8.meetwithfriends`
2. Set up `pubspec.yaml` with all dependencies (riverpod, dio, flutter_secure_storage, cached_network_image, etc.)
3. Set up `analysis_options.yaml` with `very_good_analysis`
4. Create design system (colors, typography, spacing, theme)
5. Create basic folder structure (lib/screens, lib/widgets, lib/services, lib/providers, lib/models)
6. Run `flutter analyze` - must pass with 0 issues

### Phase 1: Foundation (Core MVP)
1. API service layer (Dio client, auth interceptor, response handling)
2. Auth providers (login, register, token storage, auth state)
3. Navigation shell with bottom nav (4 tabs)
4. Splash screen (placeholder icon + "Meet With Friends" text)
5. Welcome screen (unauthenticated landing)
6. Login screen
7. Register screen
8. Home screen (dashboard)
9. My Events screen
10. My Groups screen
11. Profile screen
12. Group Detail screen
13. Event Detail screen
14. Attendees screen

### Phase 2: Feature Parity
15. Forgot/Reset Password screens
16. Create Group screen
17. Edit Group screen
18. Create Event screen
19. Edit Event screen
20. Group Members screen
21. Past Events screen
22. Comments/Discussion
23. Food pre-orders
24. Contact messaging

## Quality Rules - CRITICAL

1. **Run `flutter analyze` after every significant change**
2. **Run `dart format .`** to keep code formatted
3. **NEVER use `// ignore:` or `// ignore_for_file:`** - your utmost priority is to fix issues properly
4. **If you encounter a lint error you genuinely cannot resolve:**
   - Try at least 3 different approaches to fix it properly
   - If still unresolved, leave the issue in the code (do NOT ignore it)
   - Document it in BUILD-PROGRESS.md under "Blockers / Questions for User" with:
     - File and line number
     - The lint error message
     - What you tried
   - Continue building other features - don't let one issue block everything
   - User will review and resolve when they return

## Progress Tracking

Update `mwf-flutter/BUILD-PROGRESS.md` after completing each item:
- Mark completed items with [x]
- Note any blockers or questions
- Log each iteration's work

## API Reference

- Base URL: `http://localhost:3018` (configurable)
- All endpoints return HTTP 200 with `return_code` field
- Auth: JWT token in `Authorization: Bearer {token}` header
- See `docs/FLUTTER-PLAN.md` for full endpoint list

## Design Reference

- Primary color: `#4F46E5` (Indigo)
- Secondary color: `#7C3AED` (Violet)
- Font: Inter
- See `docs/FLUTTER-PLAN.md` for complete design system

## Completion Signals

Output these when each phase is complete:

**Phase 0 (Setup):** `<promise>PHASE 0 COMPLETE</promise>`
**Phase 1 (Foundation):** `<promise>PHASE 1 COMPLETE</promise>`
**Phase 2 (Feature Parity):** `<promise>PHASE 2 COMPLETE</promise>`
**Phase 3 (Polish):** `<promise>PHASE 3 COMPLETE</promise>`

When ALL phases are complete:

```
<promise>FLUTTER APP COMPLETE</promise>
```

Note: Unresolved lint issues don't block completion - document them and continue.

## Each Iteration

1. Check BUILD-PROGRESS.md for current state
2. Pick the next incomplete item
3. Implement it fully
4. Run `flutter analyze` and `dart format .`
5. Update BUILD-PROGRESS.md
6. Commit if appropriate
7. Continue to next item or signal completion
