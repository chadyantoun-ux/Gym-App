# WO-008 · Two users: a login, and a log each for Chady and Diana

Author: `project-manager` · Date: 2026-09-12 · Base: `main @ 270e7e0` (WO-007 in flight on
`wo-007-resplit` @ `c6c9b0d`) · Branch: `wo-008-two-users`, cut from `main` **after** WO-007 W4 lands
Status: **specified** — no code written. Blocked on §7 question 1 before any store key changes.

---

## 1. Ask

Chady, verbatim: *"Also, I want a log and page to users. One users for me and one users for Diana, my
wife."*

One sentence: **a login page, and a separate training history per account — one for Chady, one for
Diana.**

## 2. Reading of it

**The uncomfortable answer first, and it is the standing diagnosis.** This project has produced a
repo, a deploy, seven agents, a backup layer, a plan editor and a re-split work order for a
programme with **zero logged sessions**. A second user is the sixth tooling request before the first
set. Diana's log will also hold zero sessions the day it exists. I am saying so plainly because
CLAUDE.md §8 tells me to, and then planning it in full because that is his call.

**What already exists, so we do not build it twice.** There *is* a login: Settings → Backup carries
email + password, `Sign in` and `Create account` (`vBackupBody`, `index.html:5705`). Supabase Auth
handles accounts; RLS scopes every row to `auth.uid()`, verified from outside on 2026-09-11. So on the
**server**, two accounts already have two separate histories. What does not exist:

- Any sign of *who* is signed in outside Settings. Home says nothing. Two people, one app, no name on
  the screen is how a set lands in the wrong log.
- Any relationship between the **device's** stores and an **account**. `phat:v1:log`, `bw`, `draft`,
  `prefs`, `plans`, `planedit` are unkeyed. The phone is the person.
- Any notion of a *person* in the advice layer. The diet numbers, the calorie protocol and the
  bodyweight bands are Chady's, compiled into `logic.js`.

**"A page to users."** I read this as: a login screen, and after it, the app scoped to that login.
Not a user-management screen, not roles, not a shared view of each other's logs. If he wants to see
Diana's log from his phone, that is a new item (§6, out of scope).

**The question that decides the whole scope: same phone, or two phones?**

| | Two phones (each installs the app, each has an account) | One phone, two people |
|---|---|---|
| Server separation | Already true (RLS) — re-verify with two real accounts | Same |
| Local separation | Already true — the device is the person | **Does not exist.** Every store must be namespaced per user; the existing unkeyed stores need a migration; the draft path gains a switch |
| Auth | One `phat:auth` per phone — fine as built | Two sessions, or sign-out on every switch |
| Work | Identity on screen, first-run sign-in, the cross-account push gate, the advice gate | All of that **plus** a store migration (stop-condition class) and a profile switcher that cannot mix drafts |
| Risk to Chady's data | Low — no store moves | High — the migration touches every key the app has |

**Default if he does not answer: two phones.** It is the shape the app is built in, it moves no
stored byte, and it is what a couple with two phones will actually do. Same-phone is planned below as
W6, gated on his explicit answer, and is not dispatched by default.

## 3. Constraint & backlog check

**This ask contradicts a foundation, not a §3 hard constraint.** Flagged per CLAUDE.md §8.

- `CLAUDE.md:3` — *"One user: Chady."* `CLAUDE.md` §2 target stack — *"Auth: Supabase Auth, single
  user."* `docs/decisions.md` 2026-09-09 — *"No build step, ever (while this stays one user's app)."*
  Every judgement in the project is written against one person in a gym with chalky hands. Two users
  does not break §3, but it turns three written facts into questions, and CLAUDE.md must say so once he
  reaffirms (§7 item 4).
- **§7 the programme is not ours to invent — and it is *his*.** `handoff-brief.md` §1 is a 180 cm,
  85 kg male, bulking, five days a week, maintenance ~2,700 kcal. `DIET_TARGETS` (3,200 / 2,500 kcal),
  `DIET_WEEKLY` (2,700 maintenance), and `calorieAdvice`'s ladder (`You are not bulking. Add 200
  kcal`) are that person's numbers. **Every one of them is wrong for Diana unless she is also on PHAT
  and bulking, and the app has no way to know.** This is the first time the app would advise someone
  whose numbers it does not have. Backlog severity for wrong advice is P1; it is filed as B-90 and it
  is the coach's to rule before anything renders for a second account.
- **§3.3 never lose a number — the cross-account push (B-88).** `runBackup` pushes the device log to
  the signed-in account with no ownership check. Sign in as B on A's phone: A's sessions land in B's
  `sessions` table, and B's later Restore on her own phone brings A's sessions into her log, Trend and
  advice. No byte is destroyed, so it is contamination rather than loss — but "a session logged by one
  user never appears in the other's log" is criterion (d) of this order and it fails today. P1 now
  (both logs are empty), P0 the day either holds a session. **Built regardless of his answer.**
- **§3.7 secrets** — unchanged. Two accounts use the same publishable key behind the same RLS. Nothing
  here needs `service_role`.
- **§3.2 offline-first** — the identity line must render from local state (`prefs.backup.user` and the
  cached auth session), never from a network call. Signed-out and offline are both loggable states.
- **Sign-ups.** `supabase/README.md` §4 and `CLAUDE.md` §2 say: create Chady's account, then disable
  sign-ups. Two accounts means **two sign-ups before the lock**. Release owns the order (W3).
- **WO-007 in flight.** Coach, UX and backend are on `wo-007-resplit` touching `logic.js` and
  `index.html`. The one-writer rule on `index.html` (decisions 2026-09-11) stands: **WO-008 code waits
  for WO-007 W4 to land.** WO-008's non-code items (W1 coach, W2 UX, W3 release runbook) run now, in
  parallel, and touch nothing WO-007 touches.
- **B-76** (a stale document overwrites a restored log) is the write-side sibling of B-88 and gets
  worse with two accounts on one device. Not fixed here; named in §6.
- **E-3 follow-ups** already open: disable sign-ups, delete `test+e3@example.com`. Both fold into W3.

## 4. Work order

### W1 · What in the advice layer belongs to a person — owner: `strength-coach`

**Scope.** A written ruling, no code. Walk every engine that produces a sentence and classify it:
*history-relative* (safe for anyone with their own log), *programme-specific* (safe for anyone on the
plan), or *person-specific* (Chady's numbers). Then rule what the app may say to an account with no
profile. Out: designing a profile editor; per-user diet targets (B-93).

**The questions, exact.**

1. Classify each of these as history-relative / programme-specific / person-specific, with a
   confidence tag: P1, H1, G1, I2, Z1–Z3, X1, R1, SP1, V1 and the reintro ramp, ST1 measurement, ST1
   diagnosis (C7b), D1 T1–T3, DL1/E1/E2, S1 pain, W1 `calorieAdvice`, `bwWindows` (`BW_MIN = 5`,
   `BW_HISTORY = 14` — justified in the comment by "a 180 cm male"), `DIET_TARGETS`, `DIET_WEEKLY`,
   `dietTargets`, `cycleLine`.
2. For an account with **no profile**: what does the Weight tab show? The 7-day averages and the
   kg/week rate are measurements; the band and its instruction are advice. May the rate render without
   a band, or is the number itself a claim (the `+0.2 to +0.3` subline says what "good" is)? Give the
   literal copy for the ABSENT state in the C7a shape (`absent` / `absentLine`), for Weight and for Diet.
3. `calorieAdvice` on a person who is not bulking: is the honest output **silence** (no ladder at all)
   rather than a ladder with flipped signs or generic bands? I recommend silence — the app does not run
   a decision procedure it was not given — and want that confirmed or overturned.
4. P1's fixed 2.5 kg step and I2's "if 2.5 kg is not available" line on a lifter whose loads are a
   fraction of Chady's: a 2.5 kg jump on a 15 kg DB press is 17 %. Is the 2.5 kg grid (CLAUDE.md §3.5)
   still the right minimum, or does the power step need G1's percentage form for anyone? If the latter,
   that is a rule change in its own order, not this one — say which.
5. Is PHAT as shipped (`PHAT_PLAN`, `cut` weeks 1–4, speed at 65–70 %, the rest table) safe to hand to
   an adult the coach has never assessed, as a *programme* with no person attached? What single line,
   if any, must the first-run screen carry for a second account? The existing onboarding copy
   ("Two power days, three hypertrophy days") is programme-level and I believe survives.
6. What is the **minimum profile** that would make W1 and the Diet tab honest — goal
   (bulk / maintain / cut), a maintenance estimate, targets? That answer is filed under B-93 and not
   built here; the app only needs to know *whether* it has one.

**Acceptance criteria.**
- A table with one row per item in question 1, each tagged `[Certain]` / `[Likely]` / `[Opinion]`.
- Literal ABSENT copy for Weight and Diet, terse, no exclamation marks, in the C7a shape.
- A yes/no on question 3 with the reasoning, and a yes/no on whether question 4 opens a rule change.
- Nothing in the ruling contradicts `coach-audit-addendum.md` §8.6 or Rule W1 for **Chady's** account.

**Depends on:** —

### W2 · Identity on screen, sign-in on first run, and the two refusals — owner: `ux-designer`

**Scope.** A spec, no code. Four things: (1) where the signed-in identity lives on Home and on the
session screen — a person's name or email, thumb-reachable, not in a top corner, readable in one
glance between sets; and the **signed-out** state, which must not read as an error. (2) The first-run
screen offers **Sign in** beside `Start with an empty log`, so a second phone can be claimed by an
existing account before its first set — without adding a required field to first run (spec §10.1
still binds: onboarding writes one key). (3) The refusal copy when the device's log belongs to another
account (B-88): the push refusal, the restore refusal, and what the manual `BACK UP NOW` says. (4) The
ABSENT Weight/Diet placement from W1, rendered once and where. If §7 q1 comes back *same phone*, W2
extends to the profile switcher (W6) in a second pass — not now.

**Acceptance criteria.**
- Identity is visible on Home and on the session screen at 400 px without scrolling; ≥ 44 px if it is
  tappable; not in the top 15 % of the viewport.
- The signed-out state names the consequence and only that: the log is on this device and is not
  backed up. No "Sign in to continue"; logging never waits on auth (§3.2).
- First-run has exactly two actions, `Start with an empty log` and `Sign in`; taking `Sign in` and
  cancelling leaves first-run intact and writes nothing.
- Each refusal names the account that owns the device's log (email), names what did **not** happen,
  and offers the one honest way out (sign in as that account). No override control in this order.
- Copy voice per CLAUDE.md §4: terse, second person, no exclamation marks, numbers undressed.

**Depends on:** W1 for the ABSENT placement only; everything else can start now.

### W3 · Two accounts, then the lock — owner: `release-engineer`

**Scope.** A runbook plus the dashboard actions, in an order that cannot lock anyone out. Diana creates
her own account from the **live** app on **her** phone (Settings → Backup → `Create account` — sign-ups
are still enabled today). Chady creates his the same way on his. Only when both exist: disable
sign-ups (`Authentication → Providers → Email`), delete `test+e3@example.com` (cascade removes its
rows), and confirm `Create account` now says `New accounts are switched off.` Then re-verify RLS from
outside with the **two real accounts**: each account's JWT returns only its own rows on all five tables
and cannot insert a row under the other's `user_id`. Out: any code; any change to `sync.js`.

**Acceptance criteria.**
- Both accounts exist and each can sign in from its own phone before sign-ups are disabled.
- After the lock, `Create account` on the live app returns `New accounts are switched off.`;
  `test+e3@example.com` is gone and `select count(*)` under its former id is unreachable.
- RLS re-verification recorded in `supabase/README.md` §2 with the date and method: A's token reads
  0 of B's rows on `sessions`, `bodyweight`, `plans`, `user_state`, `conflicts`; an insert with
  `user_id = B` under A's token fails `42501`.
- No password, token or `service_role` key appears in any file, commit or transcript.

**Depends on:** — (needs Chady and Diana at their phones for the two sign-ups)

### W4 · Ownership of a device's stores, and the advice gate — owner: `backend-engineer`

**Scope.** Two pure decisions in `logic.js` plus their call sites in `index.html`, on branch
`wo-008-two-users` cut after WO-007 W4 lands.

(a) **`PHAT.storeOwner({ownerId, userId, hasData})` → `{ok, reason}`** where `ownerId` is
`prefs.backup.user` (the last account that pushed from or restored onto this device — the stamp that
already exists at `index.html:5486` / `:5659`), `userId` is the signed-in account, and `hasData` is
whether any of log / bw / plans is non-empty on **disk** (B-74's `storesOnDisk`, not `S`). Rule:
`ownerId` null → ok (first claim); `ownerId === userId` → ok; else **refuse**. Wire it into `runBackup`
(automatic and manual), `authTap`'s post-sign-in push, and `restoreStart` before the sheet. A refusal
writes nothing, sets `S.sync.last` with the owner's identity, and never touches `prefs.backup`.
The owner's email is needed for the copy: store `{id, email}` in `prefs.backup.user`, migrating the
existing string form in place — the only prefs change, additive.

(b) **A profile flag and the ABSENT gate.** Per W1: a field on the log store's meta (backed up in
`user_state.log_meta`, so it survives a restore onto a new phone and is per account, not per device),
`profile: {diet:"phat-brief"} | absent`. `dietTargets` and `calorieAdvice` return the C7a ABSENT shape
when absent. **The existing store is stamped `phat-brief` by the schema pass** — Chady's account must
not lose its diet screen on upgrade — and a fresh store is not. Schema bump per the version rules
(own `V_PROFILE` constant, never gated on `SCHEMA_VERSION`; WO-002's importer must accept it).

Out: profiles / namespaced stores (W6); any diet editor (B-93); `sync.js` changes.

**Acceptance criteria.**
- `storeOwner` pinned in `tests.html`: null owner → ok; same → ok; different with data → refuse;
  different with **no** data → ok (an empty device may be claimed by anyone — this is the second-phone
  case).
- Browser, two accounts, one device: sign in as A, log one session, back up. Sign out. Sign in as B.
  **No push happens**; Settings shows the refusal naming A's email; B's `sessions` table holds 0 rows;
  `phat:v1:log` is byte-identical before and after; `prefs.backup.user` still names A.
- Same device, signed in as B: `BACK UP NOW` refuses with the same sentence; `Restore from backup`
  refuses **before** the pull and before the `REPLACE` sheet; nothing under `phat:v1:recover:*` is
  written.
- A fresh device (no stores), signed in as B, `Restore from backup` proceeds and afterwards
  `prefs.backup.user` names B.
- After the schema pass, Chady's existing store reads `profile.diet === "phat-brief"` and the Diet tab
  and calorie advice render exactly as on `main @ 270e7e0`; a fresh store reads no `profile`, and
  `dietTargets` / `calorieAdvice` return `absent:true` with W1's literal lines. Pinned.
- A store that is one byte short of this schema still loads (v4/v5 → new, idempotent; re-running the
  pass over a migrated store changes nothing — asserted).
- No session, weight or plan is modified, reordered or dropped by the pass: byte-identical
  `sessions[]`, `entries[]`, `plans[]` before and after, asserted.

**Depends on:** W1 (the ABSENT literals and the profile field's meaning); WO-007 W4 landed (one
writer on `index.html`).

### W5 · The screens — owner: `frontend-engineer`

**Scope.** From W2's spec: the identity line on Home and the session screen (reads `S.sync.user`,
falls back to `prefs.backup.user` when the module has not loaded — offline must still show who owns
this log); `Sign in` on first run, routing to the existing form and back; the B-88 refusals rendered
through the existing `#bk-status` `.refuse` block and `announce()`; the ABSENT Weight/Diet lines. Out:
any new store key; the profile switcher (W6).

**Acceptance criteria.**
- With the network off and the sync module unloaded, Home shows the identity from `prefs.backup.user`
  (or the signed-out line); no console error, no spinner.
- First-run → `Sign in` → cancel: `phat:v1:prefs.onboarded` is still false, no other key written,
  first-run renders again.
- First-run → `Sign in` as Diana on a fresh phone → `Restore from backup` is offered; onboarding is
  marked done only after she chooses (restore or empty log), never by the sign-in.
- Refusal sentences match W2 verbatim; the `.refuse` block carries `role="alert"`; `announce()` says
  the same sentence once.
- 0 controls under 44 × 44 at 400 px and at 200 % text on every screen touched, measured by
  `getBoundingClientRect`.
- `phat:v1:draft` is byte-identical across every navigation added here (the W8 criterion-1 rule).

**Depends on:** W2, W4.

### W6 · (conditional) Two profiles on one phone — owner: `backend-engineer` + `frontend-engineer`

**Not dispatched unless §7 q1 answers "same phone."** Recorded now so the cost is visible.

**Shape, if built.** The existing unkeyed stores are profile 0 and **no byte moves** (the schema-4
principle: stamp, do not relocate). A second profile prefixes every store: `phat:v1:p:<pid>:log` and
so on for `bw`, `draft`, `prefs`, `plans`, `planedit`, `recover:*`. One pointer key, `phat:v1:profile`,
names the active profile; the storage adapter resolves keys through it at boot and **only** at boot —
switching profiles is a pointer write followed by a full reload, never an in-memory swap. `phat:auth`
becomes per profile (`sync.js` reads the pointer before `createClient`; it is loaded after boot so
this is safe). The switcher is a Settings control, 44 px, with the profile's identity; it is **refused
while a save or a restore is running**; it does **not** refuse on an open draft, because the draft
stays on its own profile's key and is offered back on switching back.

**Acceptance criteria (the ones that matter; the rest at dispatch).**
- With three typed sets in profile A's draft, switch to B: B's Train screen offers **no** draft;
  switch back to A: the draft is offered with all three sets intact; declining discards A's only.
- Profile B's log, bw, plans, prefs and recover keys are disjoint from A's by key prefix, asserted by
  enumerating `localStorage` after one session in each.
- A restore signed in as A writes only A's keys; `storeOwner` (W4) is evaluated against the **active
  profile's** `prefs.backup.user`.
- Export from A contains 0 of B's sessions; a restore into B contains 0 of A's.
- Signing out in B does not sign A out (separate auth keys).
- Zero writes to profile 0's keys by the migration; a v-current store with no pointer boots as
  profile 0 unchanged.

**Depends on:** §7 q1 = same phone; W4; its own coach/UX pass on the switch flow. Own QA gate.

### W7 · QA — owner: `qa-engineer`

**Scope.** Verify W4 and W5 against their criteria; run the two-account cross-user criteria below in
the browser against the live Supabase project with the two real accounts (after W3); fold the new
`tests.html` sections in; update the "Already proven" checklist with the evidence.

**The data criteria this order stands or falls on** (WO-006 style — each observed, not reasoned):
- **D1.** No account can read or write another's rows: A's token, five tables, 0 of B's rows; insert
  under B's `user_id` fails `42501`. (W3 records it; QA re-observes it from the app, not from SQL.)
- **D2.** A session logged under A never appears in B's log, Trend, stall report, verdict ghost or
  cycle line — on B's own phone after a restore, and on a shared device after a sign-in (B-88).
- **D3.** A restore never crosses accounts: restoring as B onto a device owned by A is refused before
  the pull; restoring as B onto an empty device brings only B's rows; `recover:*` is written only when
  a replace actually proceeds.
- **D4.** A refused push or restore leaves `phat:v1:log`, `bw`, `plans`, `draft`, `prefs.backup`
  byte-identical (read from disk, B-74 style).
- **D5.** Chady's existing store, migrated, renders Diet and calorie advice exactly as before; a fresh
  store renders the ABSENT lines and no number.
- **D6.** (W6 only) switching profiles leaves both drafts intact, observed with typed sets in each.
- **D7.** Sign-out on either phone leaves the local log and draft on that phone untouched.

**Acceptance criteria.** Every D-item above observed and cited; `tests.html` green with a count
recorded in the backlog tripwire; the ten-mutant standard on `storeOwner` and the profile gate.

**Depends on:** W3, W4, W5.

### W8 · Release — owner: `release-engineer`

**Scope.** Merge `wo-008-two-users` to `main` after W7 passes; `sw.js` version bump; deploy all files;
verify by fetching `/logic.js` and `/sync.js` (200, real content); offline cold load; **install on
Diana's phone** and run the phone-only checklist there too. Update `CLAUDE.md:3`, §2's auth line and
`supabase/README.md` §4 to two users — **only with Chady's authorisation** (§7 item 4).

**Acceptance criteria.**
- Live `/index.html`, `/logic.js`, `/sync.js`, `/sw.js` byte-match the merge commit.
- Both phones: cold load offline succeeds; each shows its own identity; a set logs with the network off.
- `CLAUDE.md` no longer says "One user" anywhere it is false.

**Depends on:** W7.

## 5. Sequence

```
now, parallel, no code:   W1 coach ∥ W2 ux ∥ W3 release (runbook; sign-ups need Chady + Diana)
after WO-007 W4 lands:    W4 backend  (needs W1)
then:                     W5 frontend (needs W2, W4)
then:                     W7 QA       (needs W3 done for the two-account items)
then:                     W8 release
conditional, its own gate: W6, only on "same phone"
```

**Why W4 waits for WO-007.** Both edit `index.html`; the one-writer rule (decisions 2026-09-11) is not
optional. If Chady wants WO-008 before WO-007, WO-007 W4 waits instead — one of them does.

**Why W1–W3 do not wait.** A ruling, a spec and a dashboard runbook touch no file WO-007 touches.

**PM recommendation on the record, same as WO-007's:** log one session under one account first. Every
item here preserves `phat:v1:log` byte for byte, so a session logged today by Chady is not lost to
anything in this order. The reverse is not true: B-90's coaching answer takes a day, and a second
account that gets Chady's diet advice in the meantime is a P1 by the backlog's own definition.

## 6. Risks

- **The standing one.** Sixth tool, zero sessions. Two logs of nothing.
- **B-88 is live today.** The throwaway account exists and sign-ups are on. Until W4 lands, signing
  into any second account on his phone copies his log up. Mitigation until then: do not sign into a
  second account on a phone with a log on it. Said in the runbook (W3).
- **The first advice to a person the app does not know.** Every rule in `logic.js` was signed off
  against one lifter. B-90 closes the diet/calorie half; W1 q4 may open a second (the 2.5 kg step).
  Until W1 answers, Diana's account should not read the Weight or Diet tab as instruction.
- **Migration.** W4(b) is a schema bump. Additive, stamp-only, own gate constant, but it is the fourth
  pass in the file and WO-002's importer now owes schema 2–6. A wrong gate re-fires an earlier pass —
  the exact trap recorded twice in `decisions.md`. Asserted in W4.
- **`prefs.backup.user` changes shape** (string → `{id, email}`). Every reader (`bkStatusLine`,
  `runBackup`, `restoreApply`, prefs load at `:5813`) must accept both. One missed reader makes
  "Never backed up" print for a device that has.
- **B-76 gets worse, not better.** Two accounts on one device is a second document with a different
  owner. W4's gate blocks the cross-account push; it does not fix the stale-memory overwrite. Still
  open, still first backend item on the store layer.
- **Same-phone (W6) is a different order in cost.** Every store key, the adapter, `sync.js`'s auth key,
  the boot sequence and the recover-copy naming all move. It gets its own QA gate and its own stop
  conditions. It is not a rider on W4.
- **Sign-up lock ordering.** Disable sign-ups before Diana's account exists and she is locked out;
  leave them on and a stranger can create an account in the project. W3 fixes the order.
- **Regression surface.** `runBackup`, `authTap`, `restoreStart` — the three E-3 paths WO-006 QA just
  closed B-73/B-74 in. The W4 criteria re-run those observations.
- **Out of scope, filed not built:** seeing each other's logs; per-user diet targets (B-93); a plan
  per user (already true — plans are per store); an override to re-claim a device's log for another
  account (B-88 note).

## 7. Needs from Chady

1. **Same phone or two phones?** Decides whether W6 exists. Default if unanswered: two phones.
2. **Is Diana on PHAT, and is she bulking?** If either is no, the app must say nothing about her diet
   until B-93 exists — W1 q3 assumes so. If both are yes, say so and W1 q3 becomes narrower.
3. **Confirm the ask against the conflict.** CLAUDE.md says one user; the diet layer is yours. This
   order proceeds on the reading in §2; say if the reading is wrong.
4. **Authorise the CLAUDE.md edit** (line 3, §2 auth row, §8's "one person") once the ask is reaffirmed.
   Nobody but you changes that file.
5. **Two sign-ups from two phones**, when W3's runbook says so — email and password typed by each of
   you, never sent to any agent.

## 8. What closes it

Both accounts exist and sign-ups are locked (W3); a session logged under one account is observed in
no screen of the other (D2); a cross-account push and restore are refused with the owner named (D3,
D4); Chady's Diet tab is unchanged and Diana's is honest about knowing nothing (D5); both phones cold
load offline showing their own identity (W8). B-88, B-89, B-90, B-92 closed; B-91 closed or explicitly
not built; B-93 filed.

## 9. Dispatch list (for the main session)

1. `strength-coach` → **W1**. Brief: *Read `logic.js` `calorieAdvice` (4193), `DIET_TARGETS` (6883),
   `DIET_WEEKLY`, `dietTargets` (7103), and `handoff-brief.md` §1–2. A second account (Diana) is being
   added and the app has no person on its data model. Answer WO-008 §4 W1's six questions exactly,
   with confidence tags; give literal ABSENT copy for Weight and Diet in the C7a shape. Do not change
   anything for Chady's account. Write the ruling as a new section of `docs/coach-audit-addendum.md`.*
2. `ux-designer` → **W2**. Brief: *WO-008 §4 W2. Spec, no code: identity on Home and the session screen
   (not top corners, ≥ 44 px if tappable, readable between sets); the signed-out state; `Sign in` as a
   second action on first run without adding a required field; the three refusal sentences for a
   device whose log belongs to another account (push, manual push, restore), naming the owner's email
   and the one way out. Read `vOnboard` (`index.html:1861`), `vBackupBody` (`:5705`), `bkStatusLine`.*
3. `release-engineer` → **W3**. Brief: *WO-008 §4 W3. Runbook only, then dashboard actions with Chady:
   Diana creates her account from the live app on her phone, Chady his; only then disable sign-ups and
   delete `test+e3@example.com`; re-verify RLS with the two real accounts and record it in
   `supabase/README.md` §2. Include the standing warning: until W4 lands, never sign into a second
   account on a phone that holds a log (B-88). No code, no `sync.js` change, no secrets in any file.*
4. **After WO-007 W4 lands and W1 is in:** `backend-engineer` → **W4**, branch `wo-008-two-users` from
   `main`. Brief: *WO-008 §4 W4. (a) `PHAT.storeOwner` pure + wired into `runBackup`, `authTap`,
   `restoreStart`; `prefs.backup.user` gains `{id,email}` with both shapes read. (b) The `profile`
   field on log meta, stamped `phat-brief` on the existing store by an own-gated pass, absent on a
   fresh one; `dietTargets`/`calorieAdvice` return C7a ABSENT with the coach's literals. Criteria in
   the order; every one pinned in `tests.html`. Commit named paths.*
5. `frontend-engineer` → **W5** after W2 and W4. Brief: *WO-008 §4 W5. Identity line (offline-safe,
   from `prefs.backup.user` when the module is absent), first-run `Sign in`, the refusals through
   `#bk-status` and `announce()`, the ABSENT lines. No new store key. Draft byte-identical across every
   navigation added. Measure 44 px at 400 px and 200 %.*
6. `qa-engineer` → **W7** after W3, W4, W5. Brief: *WO-008 §4 W7. Observe D1–D5 and D7 with the two real
   accounts against the live project; fold the `storeOwner` and profile tests in; ten mutants; update
   the checklist's evidence; record the suite count.*
7. `release-engineer` → **W8** after W7. Brief: *Merge, `sw.js` bump, deploy all files, byte-verify,
   offline cold load on both phones, install on Diana's phone. CLAUDE.md edits only with Chady's
   authorisation (§7 item 4).*
8. **Only if Chady answers "same phone":** back to `project-manager` to write W6 in full with its own
   gate, then `backend-engineer` + `frontend-engineer` + `qa-engineer`.
