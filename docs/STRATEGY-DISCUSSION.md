# Meet With Friends — Strategy & Positioning Discussion

> A living document. We work through one topic at a time. Each section has **my position**, the **reasoning**, and **open questions** for you. Add your responses inline under each question — we'll iterate over days/weeks, not in one sitting.

**Status:** Discussion settled enough to build. Founder ready to build the full refactor, then test on "Greek at the Gates."
**Started:** 2026-06-12
**Current topic:** Awaiting go-ahead to build. Build plan blocks are at the bottom of this doc.

---

## Session Handoff Summary — read this first

**What MWF is becoming:** Not "a smaller Meetup." A **light, no-pressure way to float an idea to friends across the chats they already use, track who's keen, and turn that into a structured invite** — without creating a group or forcing anyone to register. It rides on top of WhatsApp; it doesn't replace it.

**One-line positioning:** *The link you drop into your group chat to ask "is this something you'd want to do?" — then track responses and turn them into a real plan. No new group, no new chat.*

**The gap (Topics 1–3):** Consolidating a guest list scattered across several chats/DMs into one headcount, without forcing everyone into a new shared group. WhatsApp polls can't (single-group); a new group is the thing the founder refuses; Meetup is strangers/clubs. Closest real competitors are Partiful / Luma / Evite (party / semi-public), *not* Meetup.

**The wedge (Topic 5, RESOLVED):** the *light ask itself*. "Would you be into this? No worries if not" is lighter than replying in chat — which dissolves the real blocker (the host's social cost of pushing an app — it beat the app twice in field tests). Food pre-orders are the *multiplier* that makes MWF un-substitutable when a venue needs them.

**Resolved decisions:**
- Event-first via an auto **"temp group"** (group-first under the hood → reuses existing code). Temp groups can be *kept* → become reusable circles (covers both one-off and recurring).
- **Guest-checkout** response: name → Keen / Maybe / Can't, no account required; optional account nudge after.
- **3 response states**, low-pressure: show **Keen + Maybe** (momentum); **declines + silence stay private**; anyone can change their answer.
- **Date-optional** proposals ("sometime soon") that pin a date at firm-up.
- Lifecycle: **Floating → Gathering → Firm-up → Outcome** (happening / not / confirm-by). App generates **paste-able WhatsApp text** for the ask.

**Codebase reality:** It's a **refactor, not a rebuild** (~3–4 days full; ~1–2 for the test slice). Magic links + accept-with-signup already exist but stop one step short of frictionless (require a password; don't auto-RSVP). File-level scope in Topic 4; execution blocks at the bottom.

**Current state:** Ready to build. Founder enjoys building and intends to build the full refactor, then test on **"Greek at the Gates"** — a real upcoming meal (June 2026) he genuinely needs this for (the strongest validation signal we have).

**The one discipline that decides everything:** when someone asks "can I come?" in a chat, **send the link — don't cave to "YES."** That reflex beat the app twice; the test is meaningless if it wins again.

**Honest viability read:** Strong as *a tool the founder needs and will use* (Bar B). Unproven but plausible as *something others adopt* — Gates is the first real data point. Weak as *a business* unless the venue/money side is cracked later; do **not** build it as a business bet.

**Parked, not forgotten:** Q5 — *business (Bar A)* vs *beloved tool (Bar B)*? Unanswered; it defines "success" and gates any monetisation. Name/brand (Topic 6) + business model (Topic 7) still open; neither blocks the Gates test.

---

## How we'll use this doc

Proposed running order (we can reorder anytime):

1. **Marketing & positioning** — is the gap real, and where exactly is it? ← *we are here*
2. **The target user & the job-to-be-done** — who is this for, and what painful moment do we kill?
3. **The competitive map** — Meetup, WhatsApp, Facebook, *and the ones you haven't mentioned* (Partiful, Luma, Evite).
4. **The one product decision that defines everything** — event-first vs. group-first, and guest registration vs. none.
5. **The wedge** — what we do that nobody in the middle does (food pre-orders, deposits, "who's actually coming").
6. **Name & brand** — is "Meet With Friends" the right name for the repositioned product?
7. **Business model** — who pays, for what, when.
8. **Rebuild vs. refactor** — honest assessment of what the current codebase keeps.
9. **Go-to-market** — your first 10 real events, starting with the meal you're organising right now.

---

## Topic 1 — Is there a gap between Meetup and WhatsApp?

### Short answer
**Yes — but it isn't empty, and Meet With Friends is currently standing on the wrong side of it.**

Two separate claims there. Let me defend both, because they point at different work.

### Claim A — The gap is real

The three tools you named each fail the *known-friends-plus-acquaintances meal* in a specific, structural way:

| Tool | What it's for | Why it fails *your* meal |
|------|---------------|--------------------------|
| **Meetup** | Discovery. Strangers find a *group*, then attend its events. | You don't want strangers, and you don't want a permanent club. You want *these 9 specific people, this once*. Meetup's whole model is the opposite: join group → browse events. |
| **WhatsApp** | Conversation between known people. | No structure. "Who's in?" produces a 47-message thread. Headcount lives in your head. No record of food choices. No way to nudge the undecided without nagging everyone. |
| **Facebook Events** | Broadcast + images to a loose crowd. | "Interested / Going" is commitment theatre. 30 "Going", 8 show up. No real headcount, no logistics, semi-public. |

The shared failure: **none of them turn a fuzzy "who's in?" into a clean, trackable headcount + logistics sheet without forcing everyone into a heavyweight commitment** (a Meetup group, a noisy chat, or a meaningless RSVP).

So the job-to-be-done is narrow and real:
> *"I have a specific list of people. I want to invite them to one real-world thing, see exactly who's actually coming, collect what they need (food order, dietary notes, maybe a deposit), and not run the whole thing through a chat thread that buries every useful answer."*

That job is underserved. Good.

### Claim B — The gap is not empty (the part you didn't mention)

Three products already live in "the middle," and we have to be honest about them or we'll mis-position:

| Product | Position | Strength | Gap it leaves |
|---------|----------|----------|---------------|
| **Partiful** | Private events for *friends*. No group needed. Link → RSVP, often no account for guests. Young, fun aesthetic. | Nailed the frictionless event-first invite. This is the breakout in this space. | Built for *parties*, not logistics. No food pre-orders, no deposits, no restaurant coordination, weak for *recurring* groups. |
| **Luma (lu.ma)** | Polished event pages, RSVP, calendar, recurring series. | Beautiful, low-friction, handles recurring. | Skews professional/semi-public (meetups, communities, launches). Not "me and 8 friends getting dinner." |
| **Evite / Paperless Post** | Digital invitations. | Mass-market, known brands. | Card-first, not logistics-first. Tracking and coordination are thin. |

So the accurate statement isn't *"there's an empty gap between Meetup and WhatsApp."* It's:

> **The gap is occupied by party-invite apps. The genuinely empty corner is: a private friend group that meets *repeatedly* in the real world and needs *real logistics* — headcount, food orders, money — every time.**

Partiful owns *private + fun + one-off*. Luma owns *structured + semi-public + recurring*. **Nobody owns *private + recurring + logistics-heavy* — the supper club, the curry crew, the eight-of-us-who-eat-out-monthly.** That is a real, defensible, narrow position.

### Claim C — MWF is currently on the wrong side of its own gap

This is the uncomfortable part, and it's why it's hard to sell.

The product you've built is **group-first**, exactly like Meetup:
- You must create a **group**.
- People must **join** it and **become members**.
- Members must **register** an account to RSVP.
- Only *then* do events happen inside the group.

That is the Meetup model with fewer users. When you pitch it to a friend, you're effectively saying *"leave Meetup for a smaller Meetup"* — and they're right not to bother. Meanwhile the thing you actually want (invite specific people to one meal, no club, no signup for guests) is the **WhatsApp/Partiful side** — and the current architecture fights you on it.

The two instincts in your message are exactly right and they're the whole repositioning:
1. **"Create an event without an official group and members."** → Go event-first. The group becomes optional.
2. **"Guests shouldn't need to register; the host does."** → This is the single highest-leverage decision in the entire product. It's the difference between "smaller Meetup" and "WhatsApp-thread killer."

### The positioning map I'm working from

```
              STRUCTURED / TRACKED
                      ▲
         Luma ●       │       ● Eventbrite
   (recurring,        │        (ticketed,
    semi-public)      │         strangers)
                      │
   ┌──────────────────┼──────────────────┐
   │   THE EMPTY      │                   │
   │   CORNER  ◄──────┼─── MWF should be  │
   │  private +       │      here         │  ● Meetup
   │  recurring +     │                   │  (groups of
   │  logistics       │   MWF is          │   strangers)
   └──────────────────┼── actually ~here ─┘
                      │   (group-first,
        Partiful ●    │    register-to-RSVP)
       (private,      │
        fun, one-off) │
                      │
   WhatsApp ●         │        ● Facebook Events
   (private chat)     │      (loose, public-ish)
                      ▼
              UNSTRUCTURED / CHAT
  ◄── KNOWN PEOPLE              STRANGERS ──►
```

The move is down-and-left: away from Meetup's group-of-strangers model, toward *invited people*, while keeping the structure/tracking that WhatsApp and Partiful lack.

### What this means (preview of later topics — not deciding yet)

- The **"group"** stops being a mandatory club and becomes either (a) optional, or (b) reframed as a lightweight reusable *circle / contact list* you can spin an event from. Event-first, group-optional.
- **Guests RSVP from a link** — name + tap, magic-link identity, no password. *The host is the only required account.* (You already have magic links and accept-with-signup half-built — this is closer than it looks.)
- The **wedge** is the logistics nobody else does for friends: who's actually coming (with a real number), food pre-orders, dietary notes, and eventually the deposit that makes "Going" mean something.

### Open questions for you

> Answer inline — these steer Topic 2.

**Q1.** When you picture the *winning* version of MWF, is it fundamentally **(a)** one-off events you spin up and throw away, **(b)** a recurring friend group that meets often, or **(c)** both with one as the priority? Your WhatsApp pain suggests recurring; your "even a one-off event" line suggests one-off. Which hurts more *today*?
*Your answer:*
Both. We chat in Whatsap but I dont want to keep creating whatsapp groups. I want to send a link in whatsapp to join the event and manage it from tha single place.


**Q2.** Of Partiful / Luma / Evite — have you used any of them? Does "private + recurring + real logistics" feel like a corner *you'd personally* want, or am I over-indexing on the food-coordination angle?
*Your answer:*
Ive not used them. Im thinking to keep this closed in for food only. It could be a walk or a coffee meet.


**Q3.** The "no guest registration" decision has a real cost: without accounts, identity is fuzzy (is this the same "Dave" as last time?), and you lose the member directory, persistent profiles, and easy re-invites. Are you willing to trade those away for frictionless guest RSVP — or do you want a **middle path** (guests RSVP instantly via link, and are *optionally, gently* nudged to claim a lightweight account later)?
*Your answer:*
Agree. We should nudge them to an account. Or enforce an account. I did this with my friends and they created an account no problem. Simply because they wanted to join the event. After that, it will be easier for them. Plus it will increase the value of the tool if we have registered users. Just want it to be as frictionless as possible.


**Q4.** Gut check on the wedge: is the thing that makes MWF worth switching to the **food pre-order / "who eats what"** coordination, the **deposit / "Going actually means going"** enforcement, or the plain **clean headcount**? Rank them. (This decides what we lead the marketing with.)
*Your answer:*
Im not sure. I want to investigate if there is a market and that I should spend time on it or move to another project.

---

### Topic 1 — Resolved: synthesis of your answers

Three things got much clearer:

1. **MWF rides on top of WhatsApp — it doesn't replace it.** (Q1) Your model: *"I don't want to keep creating WhatsApp groups. I want to send a link into WhatsApp and manage it from one place."* The chat stays where it is; MWF is the structured event-link you paste in. This is a big deal — it means **distribution is solved** (you post into chats that already exist; no discovery, no app-store fight, no network effect to bootstrap) and the pitch softens from "switch platforms" to "use this link instead of asking 'who's in?'".
2. **Scope = food-centred casual get-togethers.** (Q2) A meal, a coffee, a walk. Food at the centre. This keeps us cleanly distinct from Partiful (parties) and Luma (professional).
3. **Account creation happens at the moment of joining, motivated by the event.** (Q3) Your own friends did it without complaint because they wanted in. Frictionless, but a real (lightweight) account — which compounds value over time.

**New one-line positioning (draft):**
> *Meet With Friends is the event link you drop into your group chat to turn "who's in?" into a clean headcount and a sorted meal — without starting a new group or a new chat.*

**The reframe that explains why it's been hard to sell:** you've been pitching *platform replacement* ("leave Meetup / leave WhatsApp"). That's a migration story, and migrations are a brutal sell. The real product is a *lightweight tool that lives inside the chat you already use*. Same code, completely different pitch.

---

## Topic 2 — Is there a market, and how do we prove it *without building more*?

This is the question from your Q4, and it's the right one to answer before another month of work.

### The honest risk: painkiller or vitamin?

We have to name the real competitor. **It was never Meetup.** For casual friend meals, the incumbent is:

> **"WhatsApp + a poll"** — or a Google Form, or WhatsApp's own native **Events** feature (which they keep expanding).

That is *good enough* for most meals. So the test isn't "does a gap exist" — gaps always exist. The test is: **is MWF enough better than a poll-in-the-chat that people bother tapping out of WhatsApp, and that you reach for it again next time?** If yes, it's a painkiller and worth building. If it's merely "a bit tidier," it's a vitamin — nice, unsold, and you should know that *before* investing more.

I'm not going to pretend I know the answer. Consumer event tools are notoriously "loved but low-value" (even Partiful, VC-funded and popular, struggles to monetise). The good news: **you can get real evidence in two weeks for near-zero cost, because the current app can already run the test.**

### Define your bar *first* (so the test can't lie to you)

Before measuring, decide what "there's a market" has to mean for *you*. Your own earlier figure — ~137 members at ~£6.39/year ≈ £875/year — is **hobby-tier, not business-tier**. So:

- **Bar A — Business:** you want meaningful revenue / something fundable. Then "a market" must show willingness to pay or a path to thousands of hosts. High bar.
- **Bar B — Beloved tool:** you want something you and your circles genuinely love using, maybe modest side income. Then "a market" just means strong repeat use and organic pull.

These demand *different evidence*. Pick the bar before you run the test, or you'll rationalise whatever happens. (This is Q5 below.)

### The validation plan — run your live meal through the current app

**No rebuilding.** The group-first architecture is awkward, but we treat it as scaffolding and test the *experience* that matters: link-in-chat → tap → in.

**Setup (one-time, ~5 min):**
1. Create one group in the current app — call it your friend circle's name. Ignore the group-first awkwardness; it's just a container.
2. Create the real meal you're organising now as an event: date, place, and — if it's a sit-down meal — a menu photo/link, pre-orders on, and a pre-order cutoff. (For a coffee/walk, skip pre-orders; it's just a headcount.)
3. Generate the **event magic link**.

**The test:**
4. Drop the link into the existing WhatsApp chat with a short, human message: *"Sorting [meal] for [date]. Tap to say you're in (and pick food): [link]"*
5. **Make the link the only way to RSVP.** Don't also run "who's in?" in the chat — that defeats the test. Soft fallback: after ~48h, you may chase stragglers individually, but **log who needed chasing** — that's data, not failure.
6. Run **2–3 events** this way over 2–3 weeks, not one. One event is noise.

**Measure (targets set in advance):**

| Signal | What good looks like | Why it matters |
|--------|----------------------|----------------|
| **Guest activation** | ≥ ~75% of people who meant to come actually RSVP'd via the link with little nagging | The core friction test |
| **Account drop-off** | Near-zero people blocked/annoyed by making an account | Validates the Q3 bet |
| **Host effort** | You spent *noticeably less* time/mess than the last WhatsApp meal | The whole point |
| **Output quality** | You got a clean headcount + food orders you could hand straight to the venue | The logistics wedge |
| **Pull (the big one)** | Someone, unprompted, says *"this is good — can I use it for my thing?"* or *"let's do this again"* | The only signal that really counts |
| **Your own want** | You reach for it next time *without forcing yourself* | If the founder doesn't, no one will |

**Decision rule:**
- **Strong pull** (people liked it, you saved real effort, someone wanted it for their *own* event) → green light to invest in the event-first rebuild.
- **Lukewarm** ("worked, but why not just use the chat?", you had to push) → it's a vitamin. Either find a sharper wedge (Q4 still open) or shelve it with a clear conscience.
- **Mixed** → run two more events before deciding.

### What to explicitly NOT do yet

- **Don't** rebuild event-first / strip the group model yet. Prove the pull first.
- **Don't** touch deposits/Stripe. That's a Bar-A feature; don't build it to answer a Bar-B question.
- **Don't** polish UI. The test is about the *job*, not the pixels.

### Open questions for you

**Q5.** Which bar are you actually aiming for — **A (a business)** or **B (a beloved tool / side income)**? Be honest; it sets the whole success threshold.
*Your answer:*

**Q6.** Are you comfortable with the logistics *scaling with the event type* — i.e. a coffee/walk is just a headcount, a sit-down meal adds pre-orders/dietary/cutoff, and (later, maybe) a booked restaurant adds a deposit? Or does that variability feel like it dilutes the product?
*Your answer:*

**Q7.** Will you run your live meal (and 1–2 more) through the current app this way in the next 2–3 weeks, accepting the group-first awkwardness as scaffolding? If yes, I'll write you a one-page **test script + a friction-logging sheet** so the evidence is clean.
*Your answer:*

---

### Topic 2 — Field evidence (you'd already run it)

Three real events, before we even wrote the test plan:

| Event | What happened | Signal |
|-------|---------------|--------|
| **Meal with friends** | Ran on MWF, friends registered and joined without complaint | Guest onboarding is *not* the blocker (confirms Q3) |
| **Yak & Yeti** | 2 attendees on MWF. A friend — *already registered, past user* — asked to join via Meetup chat; host replied "YES" in chat rather than route him to the app | **The key data point.** The blocker is the **host's social cost**, not the guest's friction |
| **Greek at the Gates** (incoming) | Gathering "subtle interest" across *separate* WhatsApp groups + individual DMs; reluctant to push the app "for a simple question" | The real-world scenario the product must win — and it's a *fragmented, multi-chat* list |

**Two findings:**

1. **The blocker is the host, not the guest.** When the founder — the most motivated host imaginable — defaults to "YES" in chat rather than route an *already-registered* friend through the app, the app's value isn't yet beating the host's social cost of deploying it. Fix the host's cost or nothing else matters.
2. **Value is N-and-fragmentation dependent.** Yak & Yeti had 2 attendees — at that size WhatsApp always wins; the mess is trivial. Testing on tiny meals will always read "mixed." The pain (and the value) lives at the larger gathering pulled from *several different circles*.

---

## Topic 3 — The real gap (sharper than "between Meetup and WhatsApp")

> **Consolidating a guest list that's scattered across several separate chats and DMs into one headcount — without forcing everyone into a new shared group.**

This is the job Greek at the Gates actually needs done. Why nothing you use can do it:

| Option | Why it fails the fragmented list |
|--------|----------------------------------|
| **WhatsApp poll** | Lives inside *one* group. Your people span multiple groups + DMs with no common group. A poll can't reach across them. |
| **New WhatsApp group** | The thing you explicitly refuse to keep doing — *and* socially awkward when mixing close friends with acquaintances who needn't be grouped together. |
| **WhatsApp native Events** | Same single-group limitation. |
| **Meetup** | Strangers / standing club. Wrong shape entirely. |
| **MWF link** | **Group-agnostic: one link, one consolidated list, regardless of which chat or DM each person lives in.** WhatsApp structurally cannot do this. ← *the gap* |

So the food pre-orders are a **secondary** layer. The core magic is **cross-chat consolidation without a new group**. Value scales with *number of people × how scattered across circles they are*:

- 2-person dinner, one chat → **no pain, MWF pointless.** (This was Yak & Yeti.)
- 10-person meal from three different friend circles → **real pain, real value.** (This is the sweet spot — and roughly Greek at the Gates.)

**Sharpened positioning:**
> *One link, one list — even when your people are spread across three different chats. No new group, no new chat.*

### The actual blocker: the host's social cost

The product must make the host's ask feel **lighter** than answering in chat, not heavier. Today it's heavier (find group → join → register → RSVP), so the host caves to "YES." Everything below is aimed at this one number.

### "MWF Lite" — the simpler product, concretely

| Step | Current (heavy) | Lite (attacks host cost) |
|------|-----------------|--------------------------|
| Create | Make/own a group, then an event inside it | Title + date + place → **Create**. No group. ~20 sec |
| Share | Group or event magic link | One event link, paste into any/all chats + DMs |
| Guest responds | Open group → join → register → RSVP | Tap link → **"I'm in"** → *first name only*. No account, no password, no email gate |
| Soft interest | (no equivalent) | Optional **"Maybe / interested"** tap — matches the real subtle-interest phase |
| Logistics | Always present | **Optional layers** per event: food pre-order, dietary, cutoff, capacity, deposit |
| Account | Gate to participate | **Reward**, nudged after joining ("save details, get reminders"). Never a gate |

The test of success: when a friend asks "can I come?", the host forwards **one link**, the friend taps "I'm in" + types a name — **lighter than the Meetup exchange that made the host cave.** If that's true, the host deploys it instead of saying "YES" in chat.

### Next step — isolate the one risky assumption *before* building

The current-app tests have told us what they can: the heavy version doesn't get deployed even by you. The next real test needs the *light* version — but before building it, we can cheaply test the single assumption everything rests on:

> **Will your scattered friends actually tap one link and respond at all** — across separate chats, with no shared group?

Two ways to find out, using **Greek at the Gates** as the live case:

- **Option A — Zero-build behavioural proxy.** Stand up the lightest possible "one link, name only, works across all chats" — even a plain shared link (a simple form / poll-link) — and drop it across your separate WhatsApp groups + DMs as the *only* way to say you're in. If people happily respond, the cross-chat-link behaviour works and MWF Lite is worth building. If they *won't* even tap a simple link, no amount of MWF polish fixes it — and that's a cheap, honest no-go. *(Limitation: doesn't test MWF's specific food/account value — only the core behaviour.)*
- **Option B — Build MWF Lite first**, then test on Greek at the Gates for real. Bigger commitment, but the magic-link + accept-with-signup plumbing already exists, so it's a focused refactor, not a rebuild.

### Open questions for you

**Q8.** Does the **cross-chat consolidation without a new group** framing land as *the* gap — or does it feel like I've over-rotated, and the real value to you is still the food pre-orders?
*Your answer:*
Food pe-orders is a massive bonus. If the venue needs pre-orders, the MWF app wins hands down.

**Q9.** Greek at the Gates: are you willing to make it a deliberate test — pick the **one link as the only RSVP route** and resist caving to "YES" in chat — so we get a clean read? (Even Option A would do it.)
*Your answer:*
I am, but I woant to positin MWF a bit better. Not have a common group but a temp group. And maybe introduce a "maybe" or "unsure" or "no response" alongside "YES" so they dont feel pressured. More like, Might this interest you? If not, dont worry.

**Q10.** Gun to head: **Option A (cheap proxy test first)** or **Option B (build MWF Lite, then test)**? A protects your time if the behaviour itself doesn't hold; B is faster to the real thing if you already believe it will.
*Your answer:*
I love building. And I would be more confident testing the lite version which evolves with our discussino then using MWF as it is. It depends how big the change, but if it is in days or a week, then no problem.

---

### Topic 3 — Resolved: decisions from Q8–Q10

- **Q8 — food is the multiplier, not the headline.** Cross-chat consolidation is the gap; **food pre-orders are what make MWF un-substitutable** when a venue needs them ("MWF wins hands down"). Marketing leads with consolidation, closes with pre-orders.
- **Q10 — Option B chosen: build "MWF Lite."** Founder prefers testing a Lite version that evolves with this discussion over testing the current heavy app. **Condition: tight scope (days, not months), then run the real Greek at the Gates test the moment it's usable.** Discipline guard: "I love building" must not become "build until perfect, never ship the test."

### Two product refinements (from Q9) — now part of the model

**1. The "temp group" — event-first to the user, group-first under the hood.**
Instead of removing the group model, a host creating an event auto-spins a **disposable, event-scoped group** behind the scenes (host = organiser). The host never sees a "create group" step.
- *Why it's the cheapest path:* reuses the existing group / event / rsvp / magic-link infrastructure — it's a flow + UI change, not a data-model rip-out.
- *Emergent bonus (answers Q1 "both"):* a temp group is a **one-off by default**, but if the same crowd recurs, the host can **keep** it → it becomes a reusable circle. One mechanism serves both one-off and recurring.

**2. Soft, low-pressure RSVP states.**
Replace the binary with three + silent no-response:
- **"I'm in"** — committed (the only state that counts toward a venue headcount / pre-order / deposit)
- **"Maybe"** — interested / might come (pipeline signal for the soft-interest phase, e.g. Greek at the Gates right now)
- **"Can't this time"** — graceful decline
- *(no response)* — implicit
Tone matters: *"Might this interest you? No worries if not."* A low-pressure ask is easier for the host to drop into three separate chats — which directly lowers the host's social cost (the real blocker from Topic 2).

---

## Topic 4 — MWF Lite: scope & build plan

> Decision: **build it** (Option B), scoped to days. Estimate below is grounded in a read of the actual codebase (RSVP flow, magic-link/accept-with-signup, event/group creation, RSVP schema, auth model).

### Verdict: ~3–4 days. It's a refactor, not a rebuild.

The temp-group approach pays off — almost everything is reused.

| Change | Reused (already exists) | What changes | Effort |
|--------|-------------------------|--------------|--------|
| **1. Event-first (temp group)** | `create_group` logic, organiser/host roles, creator auto-RSVP on event create | New "create event standalone" path: one transaction → hidden group → event → auto-RSVP host. No DB change. | **~1 day** |
| **2. Name+email RSVP from link** | Magic-link validation; `accept_with_signup` *already* creates account + joins group | Make password **optional**; **auto-RSVP** on event-invite accept (today it joins but forces a separate RSVP) | **~1 day** |
| **3. Soft 3-state RSVP** | Capacity/waitlist math already only counts `attending` (status-agnostic) | Add `'maybe'` to `event_rsvp.status` CHECK (1 line); handle in `rsvp.js`; 3-button UI | **~2–3 days** |

**Two findings worth noting:**
- The invite flow stops *one step short* of frictionless today: a magic-link guest can create an account + join the group, but it **requires a password** and then makes them **RSVP separately**. "Tap link → name+email → you're in" is literally those two small changes.
- **"Maybe" is safe.** Capacity only ever counts `attending`, so a "Maybe" can't corrupt headcount or waitlist math — it's a pure pipeline signal. Low risk.

### The one real decision: how the lightweight account works

Auth is currently email+password (bcrypt), no passwordless path. For frictionless guest signup we need a policy. Options:

| Option | Flow | Trade-off |
|--------|------|-----------|
| **A — Passwordless + set-later (recommended)** | name + email → account created with no password → JWT issued immediately → "set your password" email (reuses existing `reset_password` flow) | Most frictionless; safe (account claimable only via that inbox); nearly free to build |
| B — Auto-generated password, emailed | system makes a password and emails it | Works, but clunky / spammy feel |
| C — Inline optional password | optional password field; skip = passwordless | One extra (skippable) field; minor friction |

**Recommendation: A.** Require **email** (it's the account key *and* enables reminders — still a single tap-through). Reuse `reset_password` for the set-password email.

### Build order (proposed)

1. **#2 first** (frictionless join) + **#3** (soft states) — these make the *guest-facing* Greek at the Gates test valid.
2. **#1 last** (event-first host flow) — polishes the *host* side; for the first test you can create the event in a throwaway group and work around it.

### Lifecycle note
**Don't delete temp groups.** Keeping them gives free event history *and* the "promote to reusable circle" path for recurring crowds (answers Q1's "both"). A temp group is just an unlisted group named after the event.

### Non-negotiables for this build
- Stays a **refactor** — reuse existing group/event/rsvp/magic-link code via the temp-group trick.
- **No Stripe / deposits** this pass (Bar-A feature; don't build it to answer a Bar-B question).
- Ship the moment it runs **one real event end-to-end**, then test on Greek at the Gates — don't gold-plate.

### Open questions for you

**Q11.** Account policy — go with **A (passwordless + set-later, email required)**? If you'd rather not require email at all (pure name-only, no account, no reminders, fuzzy identity), say so — but it trades away the registered-user value you said you wanted.
*Your answer:*
Lets think about this and a GUEST option as though they were buying something online. No had design yet. Dont let it take your time just yet.

**Q12.** Green light to start building #2 + #3 now, or do you want to settle anything else in the discussion first (name/brand, business model) before touching code?
*Your answer:*
Not yet. I want to work on the changes in smaller blocks. We will continue disucssing knowing that the code and design idea is now in place. I will give the go ahead and work with you on the specifics. Not there yet.
---

*Build is scoped and parked. Founder wants to keep discussing; will green-light in smaller blocks. Q11 (account policy) deferred — explore a **guest-checkout** model (respond as guest, optional account after, like buying online). No design yet.*

---

## Topic 5 — The wedge, resolved: low-pressure interest-gauging

> This came from the founder mid-design and it resolves Q4. The wedge is **not** headcount, food, or deposits — those are downstream. The wedge is **the lightest possible ask: "Is this something you might want to do?"** — floated across scattered chats, tracked, and politely nudged.

### Why this is the answer (not just nice framing)

1. **It solves the host's-social-cost blocker (Topic 2).** The founder caved to "YES" twice because the app's ask felt *heavier* than replying in chat. *"Would you be into this? No worries if not"* is *lighter* than replying. The friction is flipped — this is something a host will actually send into three different chats without feeling they're imposing.
2. **It's the real meaning of "extend WhatsApp, don't replace it."** WhatsApp is good at the *middle* (chatting), bad at the two *ends* — floating an idea (buried) and firming it up (chaos). So **MWF brackets the conversation:** float (MWF) → chat (WhatsApp) → firm up + logistics (MWF). The talking stays where it always happens.
3. **It reframes the first-class object** from *"an event you RSVP to"* into *"a proposal that grows up into an event."* Lifecycle: **floated → interest gathered → politely nudged → firmed up → logistics (headcount / food).** One object, evolving. Matches how friend meals actually start ("anyone fancy Greek soon?").
4. **Polite-reminder-with-summary is the single most demonstrable win over WhatsApp.** Chasing non-responders in WhatsApp = DM everyone (tedious) or re-post to the group (noise everyone resents). MWF nudges *only* non-responders, *privately*, *with the live picture*: *"5 keen for Greek on the 20th — fancy joining?"* A poll cannot do this.

### Differentiation holds even vs. WhatsApp's own poll
A WhatsApp poll is stuck in one group, can't nudge only non-responders, doesn't convert into logistics, and scrolls away. MWF's interest-gauge is a **persistent, cross-chat, nudge-able, convertible** poll. That's meaningfully more.

### The lifecycle (one evolving object)
```
IDEA (floated)  →  GATHERING  →  FIRM-UP  →  EVENT (logistics)
"might you       interest      "locking it    headcount,
 fancy this?"    tracked +      for Thurs —    food pre-orders,
 no pressure     nudged         who's in?"     dietary, (deposit)
   │                │              │              │
   └─ MWF ──────────┘   └─ WhatsApp does the chat in between ─┘
```

### Two design tensions to resolve (open)

**Q13 — Transparency vs. pressure.** Visible responses create momentum (social proof) but can create the very pressure we're avoiding. Proposed resolution: show who's **keen** (momentum), keep **declines + silence soft/private**, let anyone change their answer freely (interest ≠ commitment). Agree, or do you want it fully host-only-private?
*Your answer:*

**Q14 — The firm-up moment ("graveyard of maybes" risk).** Pure interest-gauging can stay too soft — a pile of warm maybes, nobody commits. What triggers conversion from "12 keen" to "8 confirmed for Thursday"? Host decides manually? A threshold ("when 6 are keen")? A date deadline? This is where headcount/pre-orders earn their place.
*Your answer:*

**Q15 — Date-optional proposals.** Real floating often has *no fixed date yet* ("fancy Greek sometime soon?"), and the date gets pinned once interest exists. The current model requires a firm future date on every event. Should a *proposal* be allowed to exist with no date (or a soft "this/next week"), and only acquire a locked date at firm-up? This is the biggest divergence from today's data model — and the most WhatsApp-like behaviour.
*Your answer:*

### Status
- **Q4 (the wedge): RESOLVED** → low-pressure interest-gauging across scattered chats, converting to logistics.
- Build plan (Topic 4) still stands; the interest-gauge mostly rides on the **3-state RSVP (#3)** plus reminder tooling that largely exists — *but Q15 (date-optional proposals) could add a small schema/UX piece. Flagged, not yet scoped.*

---

### Topic 5 — Resolved: the lifecycle is now fully specified

**Q13 — Transparency:** keep it no-pressure. **Show Keen (and Maybe)** for momentum; **declines and silence stay private.** Anyone can change their answer.
**Q14 — Firm-up:** an easy, mostly-automatic flow. When the host firms up, **notify the Maybes/Keens with concrete detail** — confirmed date, who's coming, and a *"need to know by"* date.
**Q15 — Date-optional:** **yes** — *"sometime soon"* is a feature, not a gap. It puts the feeler out before a date exists. The date gets pinned at firm-up.

### The full model (destination)

**Response states (from the invitee):**
| State | Visible? | Counts toward headcount? |
|-------|----------|--------------------------|
| **Keen / "I'm in"** | Yes (momentum) | Yes |
| **Maybe** | Yes (momentum) | No — pipeline only |
| **Can't this time** | **No** (private) | No |
| **No response** | **No** (private) | No |

**Proposal lifecycle (host side):**
```
FLOATING  →  GATHERING  →  FIRM-UP  →  OUTCOME
"Greek,      interest      lock date +   • Happening (here's the detail + who's in)
 sometime    tracked,      "confirm by   • Not happening (called off, gracefully)
 soon?"      nudgeable     Friday"       • then logistics: headcount, food pre-orders
```

**Host comms — the polite, low-effort wins (the actual product surface):**
- **Paste-able WhatsApp text**, generated by the app for the light ask. Keeps every send light *and* consistent — protects the wedge.
- **Nudge** to Maybes/non-responders: private, with the live summary + firmed details.
- **Outcome message:** happened / didn't happen / "we have a date, confirm by X." Closes the loop so nothing is left hanging.

### Minimum testable slice — Greek at the Gates

> Discipline: the design is now rich enough that the new risk is **re-bloat**. For the first real test, build the thinnest slice and do everything else **by hand**.

| BUILD (thin slice) | Do BY HAND for the first test |
|--------------------|-------------------------------|
| Date-optional proposal ("Greek, sometime soon") | Nudging Maybes → message them personally |
| One light shareable link + paste-able WhatsApp text | Firm-up / "confirm by Friday" → message them |
| Guest response: name → **Keen / Maybe / Can't** (no account — pure guest-checkout) | Outcome ("we're on / it's off") → message them |
| Show Keen + Maybe tally to all; host sees consolidated cross-chat list | Food pre-orders → skip unless the venue needs it |

**Why this is ~1–2 days, not 4:** drop accounts entirely (fuzzy identity is fine for one ~12-person test), drop every auto-notification (host sends them personally — *more* human anyway), drop pre-orders. This slice answers the **only** question that matters: *will scattered friends tap a light link and respond?* Everything else gets built **after** that comes back yes.

### Status
- **Topic 5 RESOLVED.** Lifecycle fully specified. Founder is energised and the concept reads as genuinely useful + testable.
- **Parked, not forgotten:** Q5 (Bar A *business* vs Bar B *beloved tool*) still unanswered — settle it before any monetisation work. Name/brand (Topic 6) and business model (Topic 7) still open but **do not block the Greek test**.
- **Next build block (when green-lit):** the minimum testable slice above, not the full 3–4 day plan.

---

## Build Plan — execution blocks (ready on go-ahead)

> Sequenced into small, independently-shippable blocks (founder builds incrementally). **★ = needed for the Greek at the Gates test**; the rest can follow after, or be done by hand for the first test. Effort tags from the Topic 4 codebase scope.

**Block 1 ★ — Date-optional proposal.** Allow a proposal to exist with no firm date or a soft "sometime soon." Schema: make event date nullable *or* add `date_status` ('soft' | 'fixed'); UI for the soft state. Smallest meaningful first step. *(Small.)*

**Block 2 ★ — Event-first creation (temp group).** New "create proposal" path that auto-creates a hidden event-scoped group (host = organiser) in one transaction, reusing `create_group` logic. Host never sees a group step. *(Topic 4 scope #1, ~1 day.)*

**Block 3 ★ — Light guest response.** Magic link → enter name → **Keen / Maybe / Can't**. Guest-checkout, no account. Show Keen + Maybe tally; declines + silence private; responder can change their answer. DB: add `'maybe'` to the `event_rsvp.status` CHECK. *(Topic 4 scope #2 + #3 — the core.)*

**Block 4 ★ — Host consolidated view.** Host sees every response in one list regardless of which chat it came from — the cross-chat consolidation payoff. Adapt the existing attendee list for the new states + guest responders. *(Small.)*

**Block 5 ★ — Paste-able WhatsApp text.** App generates the light-ask copy + link for the host to paste into any chat. Tiny, high-leverage — keeps the ask light *and* consistent. *(Trivial.)*

**— Test-ready after Block 5. Run Greek at the Gates. Hold the discipline: send the link, don't cave to "YES." —**

**Block 6 — Firm-up + outcome.** Lock date + "confirm by" deadline; nudge Maybes/non-responders with the live summary; outcome message (happening / not / confirm-by). Can be **manual** for the first test. Reminder/broadcast tooling partly exists already. *(Medium.)*

**Block 7 — Logistics layer.** Wire the existing food pre-orders / dietary / cutoff into the firmed event when a venue needs them. Mostly already built. *(Small — wiring.)*

**Open decision before Block 3:** account policy — **pure guest** (lightest, best for the test) vs **guest-checkout with optional account after**. Default to pure-guest for the test unless decided otherwise (ties to parked Q11; founder wanted to think of it like online guest checkout).

---

*Next: founder gives the go-ahead, then we start at Block 1 and build up to the test-ready slice (Blocks 1–5). The discipline that decides everything stays the same: at Greek at the Gates, send the link — don't cave to "YES."*
