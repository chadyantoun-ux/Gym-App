# WO-007 · Re-split: move exercises between days, keep the history

Author: `project-manager` · Date: 2026-09-12 · Base: `main @ 270e7e0` · Branch: `wo-007-resplit`
Status: **specified** — no code written. Blocked on W1 (coach) before any `logic.js` change.

---

## 1. Ask

Chady, verbatim: *"I don't like how the 'Plan' was created, I don't want to build from empty, I might
want to use the same exercises from phat but alternate them? maybe I want to do push / pull / legs
instead of shoulders with back and chest arms. please adjust."*

One sentence: **let him compose a different split out of PHAT's own 42 slots without losing any
exercise's history, and stop presenting "build from empty" as the way in.**

## 2. Reading of it

**The uncomfortable answer first.** The editor that shipped yesterday cannot do the one thing he
wants. It can duplicate PHAT (ids kept), rename anything, reorder exercises *within* a day and reorder
days — but it **cannot move an exercise from one day to another**. To get "Bent-over row" onto a
"Pull" day today he would delete it from Upper power and re-add it on Pull, and `addExercise` mints a
new id, so `lastFor`, Trend, the speed source, the key-lift list and the six-week check all lose it.
That is the B-46 bug arriving by the only door WO-006 left open. The alternative, build from empty,
is what he has just said he does not want, and it also produces a plan with no `derivedFrom`, no
`speedSource`, no `keyLifts`, no `cut` tier — four features ABSENT on day one.

**What he means by "push / pull / legs instead of shoulders with back and chest arms."** PHAT's
days 3–5 are *Back & shoulders*, *Lower hypertrophy*, *Chest & arms*. Two readings:

- **(A) Regroup the three hypertrophy days** into Push / Pull / Legs and keep the two power days.
  Five days, same weekly structure, `k` never crosses a day boundary except for the three speed
  slots. This is the reading his sentence most literally supports.
- **(B) A full Push / Pull / Legs** replacing all five days, so power and hypertrophy exercises
  share a day and a speed slot can land beside its source lift.

The mechanical work is identical — one primitive, *move exercise to day, id preserved* — so I am
building for both and **not stopping to ask**. What differs is the coaching: (A) is PHAT with its
hypertrophy days relabelled; (B) is a different programme wearing PHAT's slots. W1 puts both to
`strength-coach`. The app must be honest about whichever he builds.

**"Build from empty" is demoted, not deleted.** His words are a preference about his own route in,
not a request to remove a shipped, tested capability. Deleting it would be scope he did not ask for;
leaving it as the list's primary action would be ignoring him. Ruling: the Plans list leads with
*Duplicate PHAT and rearrange it*, and *Build from empty* becomes the secondary, lower action. If he
wants it gone, that is one line in "Needs from Chady" and one commit.

**Alternate them?** I read *"alternate them"* as "arrange them differently", not as A/B-week
rotation. If he means two alternating weekly plans, that is plan *scheduling*, a different feature,
and it is listed under Risks as out of scope.

## 3. Constraint & backlog check

- **§3.3 never lose a number — this is the whole item.** Every data criterion below is that
  constraint applied to the one operation that can silently re-key a history.
- **§3.1 / §3.2** — pure function in `logic.js`, a template in `index.html`. Nothing loaded, identical
  offline.
- **§3.6 44 px** — a fourth control on an exercise row at 400 px is where this will fail first. UX
  owns the placement (W2).
- **§7 the programme is not ours to invent.** A PPL out of PHAT's slots is a programme change. The
  coach rules on what the app may say about it and what it must refuse; the app never asserts the
  brief's authority over a split the brief did not see.
- **No open P0 blocks it.** B-01/02/03/21 closed. B-46/B-47 (identity) are what make this feasible
  at all: ids are opaque and never rewritten, so a move is a pointer change.
- **Backlog:** files **B-83** (the missing cross-day move — the gap), **B-84** (no way to delete an
  empty day), **B-85** (Plans list leads with build-from-empty), **B-86** (`phatProvenance` is blind
  to day membership — P1 candidate, coach to rule), **B-87** (`reintro` counter is per day; a moved
  `cut` accessory changes what a count means). B-75 and B-76 are adjacent and stay open. B-05 gets
  worse again (see Risks). D10 (WO-006) still binds: no plan save while a session is unfinished.
- **Answered questions I must not reopen (B-69 rule):** plan deletion is out (2026-09-12) — still out.
  D10 ships as stated — unchanged. Copy preserves ids — this item depends on it.

---

## 4. Work order

### W1 · Coaching rulings on a rearranged PHAT — owner: `strength-coach`

**Scope in:** the questions below, each needing a tagged `[Certain]`/`[Likely]`/`[Opinion]` answer
and, where copy is needed, the exact string. Touch no files; return rulings as text for the PM to
record. **Rule on reading (A) and reading (B) separately where they differ.**

The facts the questions rest on, so you do not have to re-derive them: `k` is a per-exercise routing
tag (K1) and **does not change when an exercise moves days** — it selects P1/H1/speed and the R1 rest
row. `speedSource` is `exId → exId` and `keyLifts` is a list of exIds, both day-agnostic and
untouched by a move. `reintroOrder` is keyed **by day** and reconciled at read time (a `cut` id the
day holds but the order does not name is appended in slot order). The stored `reintro` counter is a
**count per day** (`state.reintro[dayId]`). `phatProvenance` is `derivedFrom:"phat"` + four key lifts
present + their `s/lo/hi` unchanged, and **does not look at which day a lift is on**.

1. **Mixed-role days (reading B).** A "Pull" day holding `d1a` Bent-over row (`power`, 3×3–5, rest
   150/180) and `d3c` Seated cable row (`hyp`, 3×8–12, rest 90/120). P1 and H1 each run per
   exercise and R1 per exercise. Is that honest advice, or does mixing roles on one day invalidate
   the per-day rule the brief states ("Power days: pick a weight you could get one more rep with")?
   Must the editor refuse a move that mixes roles, warn once (K2's shape), or say nothing?
2. **The day heading no longer governs.** K1 ruled that `k` follows the day heading. After a move,
   the heading says "Push" and the slot says `power`. Does `k` stay as the slot's (my default — the
   history and rest row follow the exercise) or must the editor offer to re-tag on arrival? If it
   stays, what does the Type line on the row say so he is not misled?
3. **Speed work beside its source lift (reading B).** `d3a` Row speed work (65–70 % of `d1a`'s
   3–5RM) can land on the same day as `d1a`. SP1's arithmetic still runs. Is same-day speed work
   after (or before) the heavy lift a plan the app may compute a number for? Refuse, warn, or add a
   sentence to the speed card?
4. **Two slots of one `lift` on one day.** `d1h` and `d5i` are both `l_skull` (3×6–10 power and
   3×12–15 hyp). A move can put both on "Push". Refuse, warn, or nothing?
5. **`phatProvenance` and the six-week diagnosis (B-86).** Under reading (A) *and* (B), the four
   key lifts are present with `s/lo/hi` unchanged, so ST1 prints *"the split isn't the problem and
   neither is the diet"* — the brief's `[Certain]` — about a split the brief never assessed.
   **PM recommendation: provenance drops on any cross-day move, or any day deletion, and the
   generic C7b copy runs.** Confirm, or give the narrower test (e.g. drops only when a key lift's
   `dayId` changes, or only under reading B). State what reading (A) — power days intact,
   hypertrophy days regrouped — does to the `[Certain]`.
6. **The reintroduction ramp (B-87).** V1 reintroduces one `cut` accessory per session from week 5,
   in a coach-authored per-day order. When `d3g` (cut) moves from Back & shoulders to Pull: does its
   "back" status follow the exercise, follow the day's counter, or reset? Is your per-day order still
   meaningful on a day you did not compose, or does a moved accessory go **last** in its new day's
   order? Under reading (B) with six PPL days, is "one per session" still the rule?
7. **Frequency.** Under reading (B), `d1a` row might be trained twice a week (Pull ×2) or once.
   Does ST1's `>= 2 sessions per lift per block` threshold or D1's T1 "two consecutive sessions"
   change meaning when a lift's frequency changes? Answer, or confirm they are frequency-agnostic.
8. **What the Plans screen must say.** After a cross-day move, is there a line in the §8.4 ABSENT
   shape the plan carries — e.g. *"This plan moves PHAT's lifts across days. Advice per exercise
   still holds. The six-week diagnosis does not."* — and does it render once, on the Plans screen
   only, like the four existing ones?
9. **Your position, for Chady, not for the code.** Is a PPL built from PHAT's slots a reasonable
   programme for a 180 cm / 85 kg lifter bulking on 5 days a week, or is it the tool-instead-of-
   training pattern the brief warns about? One paragraph, tagged. He decides; you say.

**Scope out:** re-ruling K1, C7a, C7b, PE1, R1, X1. Any engine change.

**Acceptance:** nine numbered answers, tagged, with exact strings for any copy; an explicit
"refuse / warn once / silent" verdict for questions 1, 3 and 4; a yes/no plus the test for question
5; a yes/no plus the rule for question 6.

Depends on: —

---

### W2 · The move control and the Plans list order — owner: `ux-designer`

**Scope in:** two things.

**(i) The move control.** The design question: a per-exercise **"Move to day…" picker**, versus
**drag**, versus a **day-assignment view** (a screen listing every exercise with its day as a
selector). **One recommendation, and mine is the picker:** tap a control on the exercise row, a
bottom sheet lists the plan's other days as full-width rows (≥ 48 px each, the existing `askSheet`
pattern, `Not now` last), one tap moves it, the sheet closes, the exercise appears at the **end** of
the destination day, and a toast names what happened (`Bent-over row moved to Pull.`). Drag is
rejected on three grounds: chalky one-handed use, `innerHTML` re-render (B-19) killing drag state
mid-gesture, and no native mobile drag without a library (§3.1). A day-assignment view is the
second-best answer and is the right one if the picker cannot fit — say so if that is what you find.

Constraints you must design inside: every control on the exercise row ≥ 44 × 44 at 400 px and 200 %
text (B1); the row already carries up / down / delete glyphs, so a fourth may not fit — you may
move delete and move into a per-exercise sheet if that is the honest layout; nothing destructive in a
top corner; the picker must show the destination's current exercise count (`Pull · 5 exercises`) so he
can see what he is building. Undo: a move is reversible by moving back; state whether a `Undo` toast
is needed or is noise.

**(ii) The Plans list order (B-85).** Today: PHAT row → stored plans → `+ Build from empty` →
ABSENT lines → honest note. Ruling in §2: the primary way in is **Duplicate PHAT and rearrange**.
Specify the new order and copy of the list so that a first-time tap lands on a duplicate of PHAT,
`Build from empty` is present but secondary (ghost, below), and the honest note still ships verbatim.
Copy for the primary: one line, house voice. Also the copy for any "warn once" the coach returns in
W1 (questions 1, 3, 4), in K2's shape.

**Scope out:** the Session screen, Train, Trend. The read-only PHAT view (it has no controls).

**Acceptance:** a spec section appended to `docs/specs/wo-004-screens.md` as §9.9 with: the control's
placement and dimensions, the sheet's rows and copy, the toast string, the list order, every new
string in a table, and the 44 px inventory rows added for the new controls.

Depends on: W1 for the warn-once copy only; the control and list order can be specified in parallel.

---

### W3 · `moveExerciseToDay`, `removeDay`, provenance — owner: `backend-engineer`

**Scope in:** `logic.js` only, plus `tests.html` assertions.

1. **`PHAT.moveExerciseToDay(plan, exId, toDayId, toIndex?)` → `{ok, plan, from:{dayId,index},
   problems}`**, same contract as every editor: pure, a new plan comes back, `ok:false` returns the
   original untouched. Refused on `readOnly`, unknown exId, unknown dayId, same day (use
   `moveExercise`). The exercise object moves **byte-for-byte**: `id`, `n`, `s`, `lo`, `hi`, `k`,
   `implement`, `lift`, `cut`, `cue` all unchanged. Default `toIndex` is the end. `speedSource` and
   `keyLifts` untouched. `reintroOrder`: the id is removed from the origin day's declared list and
   handled on the destination per the coach's W1 answer to question 6 (default if the coach does not
   rule: appended last, and only if `cut:1`). Returns `from` so an undo is `moveExerciseToDay` back
   to `from.dayId, from.index` — assert that move-then-undo is the identity on the document bytes.
2. **`PHAT.removeDay(plan, dayId)` → `{ok, plan, removed, problems}`**, refused unless the day
   holds **zero** exercises (`reason:"nonempty"`), so no path removes a slot by removing its day.
   Drops `reintroOrder[dayId]` if present. Writes nothing to `state.reintro` — a stale counter for a
   gone day is inert (`accessoryTotals` iterates the plan's days).
3. **`phatProvenance` per the coach's W1 answer to question 5.** If the coach confirms the PM
   recommendation: provenance additionally requires each key lift's `dayId` to equal the shipped
   plan's, and the day set to be `d1..d5` unchanged. Pinned both ways: a rename keeps it, a move drops
   it.
4. **`validatePlan`** accepts a plan with an exercise moved and a day removed; a duplicate id after a
   move is impossible by construction and asserted.
5. If W1 returns a new Plans-screen line (question 8), it ships in the same ABSENT shape
   (`absent` / `absentLines` / `absentLine`) from one function, and `reason` is not overloaded.

**Scope out:** `index.html`. Any change to `speedLoad`, `stallReport`, `volumeTier`, `deloadCheck`
arithmetic. Any migration — `SCHEMA_VERSION` stays 5; the plan document shape does not change.

**Acceptance criteria — data (all binding, all QA-attackable):**

- **D1 (headline).** Seed three sessions under a PHAT copy. **Move every one of the 42 exercises to
  a different day** (including into two newly added days), remove the two days left empty, save.
  Snapshot `lastFor`, `stallReport`, `speedLoad`, `e1rmByDate`, `liftDays` for every exercise id
  before and after: **byte-identical**. Diff the stored plan: not one `id`, `lift`, `s`, `lo`, `hi`,
  `k`, `implement`, `cut` or `cue` changed; only `days[].ex` membership, `days[]` length and
  `reintroOrder` keys differ. `phat:v1:log` byte-identical.
- **D2.** `speedSource` and `keyLifts` are byte-identical after any sequence of moves. `speedLoad`
  for `d3a` returns the same `{kg, text}` whether `d1a` is on `d1` or on a day named "Pull".
- **D3.** `moveExerciseToDay` then `moveExerciseToDay` back to `from` yields a document
  byte-identical to the original, including `reintroOrder` key order.
- **D4.** `removeDay` on a day with one exercise is refused and the plan is untouched; on an empty
  day it succeeds; `validatePlan` passes after; no session, no draft, no `state` key is read or
  written.
- **D5.** `phatProvenance` after a cross-day move: whatever the coach rules, it is asserted in both
  directions (the move that drops it, the edit that keeps it), and `stallAdvice` on the moved plan
  prints the copy the ruling names — never the brief's `[Certain]` sentence on a plan the coach said
  is not PHAT.
- **D6.** Ten mutants injected against `moveExerciseToDay` (drop `cut`, drop `cue`, re-mint `id`,
  rewrite `lift`, forget the origin `reintroOrder` entry, allow same-day, allow `readOnly`, allow an
  unknown day, mutate the argument, move to index past the end) — all killed by the suite.

Depends on: W1 (question 5 and 6 answers). Can start on 1, 2 and 4 in parallel with W1 and finish
3 after.

---

### W4 · The editor: move control, empty-day delete, list order — owner: `frontend-engineer`

**Scope in:** `index.html` — the Plan Editor and Plans list, per W2's §9.9 spec and W3's API.

- The move control and sheet exactly as W2 specifies; the handler calls `PHAT.moveExerciseToDay`
  through the existing `applyEdit` path (working copy → `saveEdits()`), never `save(PLANS)`.
- A day with zero exercises shows a delete control (44 px, confirmed with one sheet, no undo needed
  because nothing is lost); a day with exercises shows none — the control is **absent, not
  disabled**, per §9.3's pattern.
- Plans list order per W2 (ii); `Build from empty` demoted; honest note verbatim.
- Any warn-once copy from W1/W2 rendered in K2's shape, once, dismissable, never blocking.
- Any new ABSENT line from W1 question 8 renders once, Plans screen only.
- `aria-label`s name the exercise and the destination (`Move Bent-over row to another day`); the
  toast routes through `#bs-live`.

**Scope out:** `logic.js`. `restoreApply`. `sync.js`, `sw.js`. Deleting a plan. Deleting a
non-empty day. Session, Train, Trend, Weight screens.

**Acceptance criteria — data:**

- **D7.** A move is applied to the working copy and persisted under the EDITS key; the stored plan
  is byte-identical until `SAVE PLAN`; `SAVE PLAN` after any number of moves and day deletions is
  **one** `save(PLANS, …)` call (count it), never two, never partial.
- **D8 (B-70's guard, D8/D9/D10 of WO-006 still hold).** Start Upper power, type `100 × 5` on
  Bent-over row, background. In the editor's working copy move Bent-over row to "Pull" and delete
  nothing. Resume: the `100 × 5` is on screen under Bent-over row and saves with the session. Then tap
  `SAVE PLAN` with the draft on disk: refused with `Finish or discard the session in progress
  first.`, working copy intact, draft byte-identical. Discard the session, save the plan: the session
  logged earlier still resolves Bent-over row's name, appears in Trend, is found by `lastFor`.
- **D9.** The working copy's key is never in `BACKED_UP`; zero requests carry it; a move offline
  succeeds with zero network activity.
- **D10.** Kill mid-move (throw from the storage adapter on `saveEdits`): the working copy on disk
  is either pre-move or post-move, never a third document; the editor reports the refusal; the stored
  plan is untouched.
- **D11.** With five moves and one day deletion unsaved: reload, force-kill and relaunch, navigate
  away and back — all three reopen the editor with all six edits and `UNSAVED CHANGES`.

**Acceptance criteria — behaviour:**

- **B1.** Every new control ≥ 44 × 44 at 400 px and 200 % text by `getBoundingClientRect`; the
  existing row controls stay ≥ 44 after the addition; zero exceptions across the editor.
- **B2.** The sheet lists every other day with its exercise count; the current day is not offered;
  `Not now` is last; a tap outside closes with no move.
- **B3.** Every user string (day name, exercise name) in the sheet, toast and `aria-label` passes
  through `esc()`.
- **B4.** No `reason` from `logic.js` is rendered (grep the templates).
- **B5.** `scripts/offline-check.mjs` passes; `file://` boot at 400 px with zero console errors;
  suite `N / N / 0`.

Depends on: W2 (spec), W3 (API).

---

### W5 · QA — owner: `qa-engineer`

**Scope in:** every criterion in W3 and W4 at 400 px, offline, 200 % text, observed behaviour per
criterion. Then four named attacks:

- **Attack A — the PPL.** From a PHAT copy, build reading (B): six days named Push/Pull/Legs ×2, every
  slot moved, the five PHAT days deleted. Save. Log one session on "Pull" holding `d1a`. Assert
  `lastFor("d1a")` returns that session; Trend shows one line for `l_row`; `speedLoad` for `d3a`
  reads the new session; `stallAdvice` prints the copy W1 question 5 rules, not the brief's.
- **Attack B — move under a draft.** D8 as written, plus the two-tab variant: tab A has a draft on
  disk, tab B moves the drafted exercise and saves — expected refused from disk (WO-006 D10).
- **Attack C — the empty-day guard.** Try to delete a day with one exercise via the DOM (remove the
  `disabled`, dispatch the click, call `PHAT.removeDay` directly): refused every route; the exercise
  and its history untouched.
- **Attack D — reintro after a move.** Seed week-5 state with `state.reintro.d3 = 1`. Move `d3g`
  (cut) to a new day. Assert the tier line, the cycle line and the offer follow the coach's W1
  question 6 ruling exactly and never print `N of 0` or a count larger than the day's cut list.

Suite `N / N / 0`; the two meta-tests in force; no criterion closed by deleting a test.

Depends on: W3, W4.

---

### W6 · Release — owner: `release-engineer`

Merge `wo-007-resplit` to `main` on QA pass. `sw.js` `VERSION` moves **only if** the file list or a
caching rule changes — the release-engineer decides from the header (2026-09-12 ruling), not this
order. Deploy per `docs/deploy.md`, verify with `scripts/verify-deploy.sh`, confirm the live
`index.html` contains the new primary-action string from W2 (ii).

Depends on: W5 pass.

---

## 5. Sequence

```
W1 coach ─────────────┐
W2 ux (control+list) ─┤  (parallel; W2's warn-once copy waits for W1)
W3 backend 1,2,4 ─────┤  (parallel; W3 item 3 waits for W1 q5, item 1's reintro rule for q6)
                      └─> W3 complete ─> W4 frontend ─> W5 QA ─> W6 release ─> PM close
```

W1, W2 and the coach-independent parts of W3 run **together**. W4 is the only writer on
`index.html` and starts only when W2's §9.9 and W3's API both exist. W5 runs against a commit, not a
moving tree (2026-09-10 rule). Nothing in this order touches the log store.

## 6. Risks

- **The standing one, said plainly: this is the second rebuild of the plan editor for a log with
  zero sessions in it.** Yesterday's hand-back line was "log Upper Power today; do not open the
  editor before the first session is logged." The first thing that happened was the editor was opened.
  **Recommendation: ship this after the first logged session, and log that session under PHAT as it
  stands.** The argument is not discipline, it is data: ids are preserved by every operation in this
  order, so a session logged under PHAT today follows Bent-over row onto a Pull day next week with
  nothing lost. Nothing he logs now is wasted by the re-split later. The reverse is not true: the
  coach's nine questions have to resolve before a rearranged plan can be advised on honestly, and
  that is days, not hours. **His call.** If he will not train until the split is PPL, this ships
  first and the honest note stays on the screen.
- **Advice at risk, not just data:** B-86. Without the provenance change the app would vouch for a
  split it never assessed, with the brief's `[Certain]`. That is why W3 item 3 cannot ship before W1
  answers question 5.
- **Data at risk:** `phat:v1:plans` (the working copy → save path, D7/D10), `phat:v1:draft` (D8).
  The log store gains no write path. **Migration: none.** `SCHEMA_VERSION` stays 5; the plan
  document gains no field; `removeDay` may drop a `reintroOrder` key, which every reader already
  tolerates.
- **B-76 applies here.** A second document's stale memory overwriting a saved plan on its next
  `saveEdits` is the same class; not fixed by this order, recoverable, listed.
- **B-05 gets worse a third time.** He can now rearrange a plan around a history he still cannot
  correct. Next work order, unchanged.
- **PE1:** a move changes no `s/lo/hi/k`, so no prescription epoch opens and the ghost stays. If
  the coach rules that a moved exercise re-tags `k` (question 2), that *is* an epoch, and W3 must
  say so in the test name.
- **Out of scope, filed:** alternating A/B weeks (plan scheduling), deleting a plan (still out),
  deleting a non-empty day, moving an exercise between plans, a 6-day `wd` weekday map for added days.

## 7. Needs from Chady

1. **Reading (A) or (B)?** Regroup the hypertrophy days and keep the two power days, or a full
   Push/Pull/Legs? The work is the same; the coaching answer differs and the coach will say which is
   the better programme. Default if unanswered: build the primitive, coach rules on both.
2. **Ship before or after the first logged session?** Recommendation: after, under PHAT as-is,
   because history follows the id. Default if unanswered: after.
3. **Keep `Build from empty` as a secondary action, or remove it?** Default: keep, demoted.
4. **"Alternate them"** — different arrangement (assumed), or two alternating weekly plans (a new
   item)? Default: arrangement.

## 8. What closes it

W1's nine tagged answers recorded in `docs/decisions.md`; W5's report with every criterion observed,
the four attacks written up, `N / N / 0`; W6's verify output; PM sets B-83/B-84/B-85 to done,
B-86/B-87 to whatever the coach ruled, and records the four answers above.

## 9. Dispatch list (for the main session)

**Dispatch exactly this, in this order. Steps 1–3 together; 4 after 1–3 report; 5 after 4; 6 after 5.**

1. `strength-coach` → **W1**, brief: *"Read WO-007 §4 W1. Nine questions about a PHAT copy whose
   exercises have been moved across days — `k` does not move with the exercise, `speedSource` and
   `keyLifts` are day-agnostic, `reintroOrder` and the reintro counter are per day, `phatProvenance`
   ignores day membership. Answer each, tagged, with refuse / warn-once / silent verdicts where asked
   and exact strings for any copy. Rule reading (A) and (B) separately where they differ. Question 9
   is your position for Chady, not for the code. Touch no files."*
2. `ux-designer` → **W2**, brief: *"Read WO-007 §4 W2. Specify the cross-day move control for the
   Plan Editor — PM recommends a per-exercise 'Move to day…' bottom sheet over drag or a
   day-assignment view; give one recommendation and the reason. Every control ≥ 44 × 44 at 400 px
   and 200 % on a row that already has up/down/delete. Then respecify the Plans list so 'Duplicate
   PHAT and rearrange' is the primary action and 'Build from empty' is secondary, honest note
   verbatim. Append as §9.9 of `docs/specs/wo-004-screens.md`. Warn-once copy waits for the coach."*
3. `backend-engineer` → **W3 items 1, 2, 4**, brief: *"Read WO-007 §4 W3. In `logic.js` add pure
   `PHAT.moveExerciseToDay(plan, exId, toDayId, toIndex?)` and `PHAT.removeDay(plan, dayId)` (empty
   days only) with the editor contract: new plan back, original untouched on `ok:false`, exercise
   object byte-identical, `speedSource`/`keyLifts` untouched, move-then-undo is the identity. Pin
   D1–D4 and D6 in `tests.html`. Do NOT touch `phatProvenance` or the reintro handling on the
   destination day until the coach's W1 answers to questions 5 and 6 arrive — then item 3 and D5.
   Named paths only when committing; branch `wo-007-resplit`."*
4. `frontend-engineer` → **W4**, brief: *"Read WO-007 §4 W4 and UX §9.9. Build the move control and
   sheet, the empty-day delete (absent, not disabled, on non-empty days), and the Plans list reorder,
   in `index.html` only, through `applyEdit`/`saveEdits`. D7–D11, B1–B5. You are the only writer on
   `index.html`."*
5. `qa-engineer` → **W5**, brief: *"Verify WO-007 W3 D1–D6 and W4 D7–D11, B1–B5 at 400 px offline
   and 200 %, against a named commit. Run Attacks A–D as written in §4 W5. Observed behaviour per
   criterion. `N / N / 0`, `offline-check.mjs` green. Do not close a criterion by deleting a test."*
6. `release-engineer` → **W6**, brief: *"On QA pass merge `wo-007-resplit` to `main`, decide the
   `sw.js` bump from its own header, deploy per `docs/deploy.md`, run `scripts/verify-deploy.sh`,
   confirm the live `index.html` carries W2's primary-action string. Report the verify output."*
7. `project-manager` → close per §8.
