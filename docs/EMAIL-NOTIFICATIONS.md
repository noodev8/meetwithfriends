# Email Notifications - Priority List

Priority order (top = build first). Leaving out payments until Phase 3.

---

## Emails

| # | Email Subject | Recipient | Trigger |
|---|---------------|-----------|---------|
| 1 | Welcome to Meet With Friends | New user | User registers |
| 2 | New event in your group | Group members | Host creates event |
| 3 | RSVP confirmed | User | User RSVPs to event |
| 4 | Event reminder (24 hours before) | Attendees + Host | Scheduled (24h before event). Host version includes attendee summary. |
| 5 | You've been removed from an event | User | Host/organiser removes or demotes them |
| 6 | You've been moved from waitlist to attending | User | Host/organiser promotes them OR auto-promoted when spot opens |
| 7 | Event cancelled | Attendees | Host/organiser cancels event |
| 8 | New join request | Host/Organiser | User requests to join group |
| 9 | You have joined a group | User | Host/organiser manually approves join request (not auto-join) |

---

## No Email Needed (user already knows)

| Action | Why no email |
|--------|--------------|
| User cancels own RSVP | They did it themselves |
| User leaves group | They did it themselves |

---

## Technical Notes

- Daily limit: 100 emails (Resend free plan)
- Stop sending when limit hit, resume next day
- Password reset already implemented separately
