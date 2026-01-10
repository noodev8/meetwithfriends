# Email Notifications Reference

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
| 10 | New comment on event | Attendees + Waitlist (except commenter) | User posts a comment. Shows latest comment with link to conversation. |

---

## No Email Sent

| Action | Reason |
|--------|--------|
| User cancels own RSVP | They did it themselves |
| User leaves group | They did it themselves |
| User auto-joins group | They just clicked join and saw it work |
| Password reset | Separate system (already built) |
