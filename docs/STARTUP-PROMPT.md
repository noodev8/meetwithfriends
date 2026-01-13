# Startup Prompt: Flutter App Build with Ralph Loop

## Context

We've completed a comprehensive planning phase for building the Meet With Friends Flutter mobile app. All documentation is ready:

- **Full Plan:** `docs/FLUTTER-PLAN.md` (1,200+ lines covering screens, design, APIs, UX)
- **Ralph Prompt:** `docs/RALPH-FLUTTER-PROMPT.md` (iteration instructions)
- **Progress Tracker:** `mwf-flutter/BUILD-PROGRESS.md` (tracks what's done)

## Technical Decisions Made

| Decision | Choice |
|----------|--------|
| State Management | Riverpod |
| HTTP Client | Dio |
| Linting | very_good_analysis (strict, zero warnings) |
| Bundle ID | com.noodev8.meetwithfriends |
| Project Location | mwf-flutter/ |

## Key Rules

1. **Never disable lint rules** - try to fix properly (at least 3 attempts)
2. **If lint issue unresolvable:** Leave it, document in BUILD-PROGRESS.md, continue building
3. Run `flutter analyze` after every significant change
4. Update BUILD-PROGRESS.md after each completed item
5. Placeholder app icon for now - user will provide later

## Start Ralph Loop

Run this command to start the autonomous build (ALL PHASES):

```
/ralph-loop "Follow the instructions in docs/RALPH-FLUTTER-PROMPT.md to build the Flutter app. Check mwf-flutter/BUILD-PROGRESS.md for current state. Build the next incomplete item, run flutter analyze, update progress, and continue." --completion-promise "FLUTTER APP COMPLETE" --max-iterations 80
```

**Max iterations:** 80 (enough for all phases)

**Completion signal:** When ALL phases are done, I'll output `<promise>FLUTTER APP COMPLETE</promise>`

## What Will Be Built

### Phase 0: Setup
- Flutter project, dependencies, design system, folder structure

### Phase 1: Foundation
- API service, auth, navigation shell
- Screens: Splash, Welcome, Login, Register, Home, My Events, My Groups, Profile, Group Detail, Event Detail, Attendees

### Phase 2: Feature Parity
- Forgot/Reset Password, Create/Edit Group, Create/Edit Event
- Group Members, Past Events, Comments, Pre-orders, Contact messaging

### Phase 3: Polish
- Loading states, empty states, error handling, animations

## Lint Issue Policy

- **Priority:** Always try to fix lint issues properly (at least 3 attempts)
- **If unresolvable:** Leave the issue (don't ignore it), document in BUILD-PROGRESS.md, continue building
- **User reviews:** Documented issues when they return

## When You Return

Check `mwf-flutter/BUILD-PROGRESS.md` for:
- [x] Completed items
- [ ] Remaining items
- Blockers / Questions section for any issues needing your input

---

**Copy the /ralph-loop command above and paste it after restarting Claude Code.**

---
