# WO-003 · The advice batch — the app stops lying about his numbers

Author: `project-manager` · Date: 2026-09-09 · Status: specified, not dispatched
Covers: B-30, B-17 (sorting half), B-24, B-08, B-25, B-06, B-07, B-22, B-12, B-23, B-26, B-09, B-18
Folds in: B-32 · B-20 (remaining half) · B-33 (remaining half) · B-38 · B-27 · B-28 · B-41 · B-42
Source of rules: `docs/coach-audit.md` — **ruled, not proposed.** Nothing here invents coaching.
Source of programme: `docs/context/handoff-brief.md` via CLAUDE.md §7.

---

## Ask

Implement the eleven rulings in `docs/coach-audit.md`, in the sequence it recommends, so the app stops
giving advice that contradicts his own protocol.

## Reading of it

WO-001 stopped the app losing numbers. This batch stops it misreading them. Four outputs are wrong
**today, on correct data**, and he will act on all four:

| What it does today | What that costs |
|---|---|
| Cuts 200 kcal at +0.35 to +0.5 kg/wk | Tells a bulking lifter to eat less inside the band his brief says to leave alone |
| Scores 100×3/3/3 → 100×5/5/5 as a stall | Accuses him of under-eating or half-repping while he does exactly what the app instructed |
| Recommends +2.5 kg off `topSet` | Adds load off a weight he hit once and missed twice |
| Prints a verdict after set 1 of 3 | `Volume down 66%` mid-exercise, read as an instruction about the set he is about to do |
| Stores "pain" and recommends more weight | Solicits a medical signal and discards it |

Assumptions I resolved rather than asking:

- **This ships as one release.** Every item below sits behind one QA pass and one deploy. So an item
  landing before another is an *ordering* question inside the batch, not an exposure question — with
  the exceptions in §Ordering hazards, which create new defects regardless.
- **The store is still empty.** CLAUDE.md §8 and `docs/decisions.md` both record zero logged sessions.
  Every migration below is therefore a no-op in practice; it is written to be safe anyway, because
  that is the whole point.
- **The coach's rules are the specification.** Where a worked example and a copy line disagree, the
  worked example wins and I say so in §Decisions. Engineers do not resolve coaching ambiguity — they
  raise it to `strength-coach` (W2).
- **"The eleven items in the sequence the audit recommends"** means the audit's own ordering list at
  the foot of its PROPOSED BACKLOG CHANGES, renumbered to the backlog's authoritative IDs. One
  deviation, argued in §Ordering hazards H4.

## Constraint & backlog check

| Check | Result |
|---|---|
| §3.1 no build step | Respected. No new runtime files. All logic goes into the existing `logic.js` classic script. |
| §3.2 offline-first | Every rule here is a pure function of already-local data. Nothing in it touches the network. |
| §3.3 never lose a number | **Binding in an unusual way.** This batch adds no write path, but it adds two things that can destroy data by accident: a per-second rest timer that could re-render mid-input (§H5), and a volume tier that hides exercises (§H6). Both carry explicit criteria. |
| §3.4 local dates | `trainingWeeks` and every window in ST1/SP1/D1 are computed from `YYYY-MM-DD` local strings via `PHAT.localDate`. No `Date` arithmetic that crosses UTC. |
| §3.5 kg / 2.5 kg steps | `round2p5` is the batch's only rounding helper. Bodyweight stays 0.1 kg. |
| §3.6 44 px, nothing in the top corners | Binding on four new interactive surfaces: reintro offer, deload banner, calorie-change acknowledgement, rest timer. `Discard` is already wrong there (B-34) and stays out of scope. |
| §3.7 secrets | Not touched. |
| §3.8 `main` always deploys | W24. Vercel is still not git-linked, so a deploy is a manual three-file upload. |
| §7 hazard: two stores | Binding on W1, W7, W14, W19 — all four add persisted state. Everything goes through `save()`/`load()`. |
| §7 hazard: `top` / browser globals | Binding on every new name. New helpers live under `PHAT.*`, not as top-level identifiers. |
| Blocking P0s | **None.** B-01, B-02, B-03 and B-21 are closed by WO-001 and deployed. This batch is unblocked. |
| B-04 / B-16 (WO-002) | Not in flight. **Conflict noted:** this batch bumps `schemaVersion` to 3 (Decision 6). WO-002's importer must accept 2 **and** 3. A risk, not a blocker. |
| B-19 (full re-render) | Not fixed here. W18 needs a **narrow** render-free update seam and gets exactly that, no more. B-19 stays open. |
| B-05 (edit/delete a session) | Not in scope. Consequence in §Risks: every rule here reads history he still cannot correct. |
| B-10 (plate math) | Stays blocked. W11 unblocks it by deciding the dumbbell unit; building it is a later batch. |
| B-29 (diet targets panel) | Out. The audit's D-5 is real, but this batch already carries the calorie *decision*; adding the panel dilutes the QA pass. Stays open. |
| B-31 (weekday labels) | Out. Cheap, unrelated, stays open. |

---

## Decisions I am making so nobody re-litigates them mid-build

### Decision 1 — B-38 rides along, in W1

One type check in `buildSession`, in a file this batch rewrites heavily, with the failing test already
written and already asserting the *correct* behaviour. Fixing it turns `148 / 147 / 1` into a suite
with **zero named failures**, which matters more than the defect does: "expect exactly one failure" is
a rule a tired session applies from memory, and it is exactly how a second, real failure gets waved
through. The tripwire should be `0`, not `1`.

### Decision 2 — B-20's second half closes here, and "one pass" means one pass

`vol`, `topSet`, `lastFor` and `verdictFor` are **not** extracted first and changed second. W5 creates
the pure seam and the gating rule together; W6 fills it with P1 and H1. No engineer writes a test that
pins current advice behaviour — WO-001 §W7 forbade it and it still holds. After this batch, **every
rule in the audit must be callable as `PHAT.<fn>(args)` from `tests.html` on a `file://` page.** A rule
that still needs the DOM to run is a W5 failure, not an accepted cost.

### Decision 3 — the verdict engine takes one context object, from its first line of code

`PHAT.verdict(ctx)` where `ctx = {ex, sets, prev, note, todayStr, painFlag, …}`. Not a growing argument
list. Reason: S1 (pain), V1 (deload downgrade) and R1 all add inputs to the same function at different
points in this batch, and three signature changes to the app's most advice-critical function is three
chances to drop an argument silently.

### Decision 4 — `round2p5(x)` is defined once, in `logic.js`, and ties go **downward**

Per the audit. `round2p5(70.875) === 70`, `(94.5) === 95`, `(71.25) === 70`, `(102.5) === 102.5`.
Every rule that prints a kg number uses it. No rule prints an unrounded kg.

### Decision 5 — where the audit's copy and its worked example disagree, the worked example wins

Two live instances:

- The P1 copy line reads `Go to 126 kg`; the worked example computes `→ round2.5 → 125 kg`. **125 renders.**
- SP1's fallback copy names `Bent-over row`; B-28 renames that exercise. The string interpolates the
  exercise's current `n`, so it renders `Log a heavy triple on Bent-over / Pendlay row and this becomes
  a number.` QA fails this against the interpolated string, not the audit's literal.

### Decision 6 — `schemaVersion: 3`, additive only, and `includeCut` stays on disk

V1, the calorie cooldown and D1 each add persisted state. The migration adds, with defaults:
`reintro: {}`, `lastReintroDate: {}`, `calChangedAt: null`, `deload: null`. It **rewrites nothing**, is
idempotent, and still accepts a version-2 store — WO-001 Decision 5 applies unchanged.

`S.includeCut` stops being read. The stored `includeCut` key is **left in place, byte-identical**, and
`exportAll` keeps exporting it. Deleting a key the user's data already contains is a data loss with a
tidy justification, and there is no version of this project where that is worth it.

### Decision 7 — B-33: an exercise is an exercise when it has at least one completed set

`vTrend`'s count reads completed-set entries only. A notes-only entry is **not hidden and not deleted** —
the session row surfaces it separately. Default copy, which `ux-designer` may improve but not remove:
`7 Sep · 5 exercises · 1 note`. The note stays in storage and stays visible. This closes B-33.

### Decision 8 — B-41 and B-42 are restated here, correctly, and closed

Both were work-order overreach in WO-001, not code defects. On the record:

- **B-41, restated:** *"On an abrupt kill, the field currently under the thumb may be absent from the
  persisted draft for up to 400 ms after its last keystroke. Every field that has been blurred, stepped,
  or left is on disk."* That is what the code guarantees. **Plus:** W18 is already editing the input
  commit path, so it also flushes the draft on the **first** keystroke into an empty field, which
  removes the from-empty case at a cost of one extra write per field. Criterion in W18.
- **B-42, restated:** *"`750` can never be **saved** — it exceeds the 500 kg limit and the save is
  blocked. It can appear on screen through deliberate deletion (`7.5.0` → backspace twice), because
  deletions pass through verbatim by design; trapping the user inside a value he cannot edit out of
  would be the worse bug."* **No code change.**

### Decision 9 — what this batch does NOT close

B-05, B-10, B-11, B-13, B-14, B-15, B-16, B-17's date-picker half, B-19 (beyond one narrow seam),
B-29, B-31, B-34, B-35, B-36, B-37, B-39, B-40. All stay open at their current severity. Named here so
nobody reads "the advice batch" as "the everything batch".

---

## Work order

### W1 · Session ordering, `trainingWeeks`, and B-38 — owner: `backend-engineer`

**Scope — in:** `logic.js`.

- `PHAT.sortSessions(sessions)` → a **new** array sorted by `date` ascending, ties broken by existing
  array order (stable). Never mutates the input.
- Boot sorts once, after migration, before first render. `save(LOG, …)` writes sorted order.
- `PHAT.trainingWeeks(sessions, todayStr)` → integer. Counts **local calendar weeks containing ≥ 3
  logged sessions**, Monday-start, from the first logged session to `todayStr`. Returns 0 on an empty
  log. This replaces `weeksIn()` for every gated rule. `weeksIn()` may survive for the Train-tab
  headline only if `ux-designer` wants a calendar number, and if it does, the two are labelled
  differently — see V1's `Week 5 by the calendar, week 3 of real training.`
- `PHAT.lastFor(sessions, exId)` → the last entry containing a **completed set** (`r > 0`), scanning a
  sorted array backwards. **Note the change:** today's `lastFor` requires `+x.w>0`, so a bodyweight
  rack chin never becomes anyone's "last session" and reads `First time logged` forever. That is a
  B-32 sibling and it is fixed here.
- `buildSession` returns `null` when `dayId` is not a non-empty string (B-38).
- `schemaVersion: 3` migration per Decision 6.

**Scope — out:** a date picker, backdating, or any way to log a day other than today — B-17's other
half stays open. Any rule that *consumes* `trainingWeeks`.

**Acceptance criteria:**

- `sortSessions` on dates `["2026-03-01","2026-01-05","2026-02-10"]` returns them ascending; the input
  array is deep-equal to what it was before the call.
- Two sessions on the same date keep their original relative order.
- `trainingWeeks` over 5 consecutive weeks of 5 sessions each = 5. With weeks 2 and 4 holding 2 sessions
  each, the same span = 3.
- `trainingWeeks([], todayStr)` === 0. One session ever = 0 — a single session is not a training week.
- `lastFor(sessions, "d1c")` returns the entry for a rack chin logged `0 × 10`, not `null`.
- `buildSession(d, 0, "2026-01-15", 1)` === `null`; likewise `12`, `true`, `{}`. The named B-38 test in
  `tests.html` passes without being edited.
- Migration on a v2 store adds `reintro`, `lastReintroDate`, `calChangedAt`, `deload`, sets
  `schemaVersion: 3`; a second run reports no change.
- **Data-loss criterion:** seed `phat:v1:log` with 3 sessions (one deliberately out of date order) and
  `phat:v1:bw` with 10 rows. Boot. All 3 sessions and all 10 rows are present, every `date` and every
  `{w,r}` is byte-identical to what was seeded, `includeCut` is still present with its seeded value, and
  the only differences in the serialized log are array order plus the four added keys.

**Depends on:** —

---

### W2 · Four rulings the audit left open — owner: `strength-coach`

**Scope — in:** a short addendum at `docs/coach-audit-addendum.md`. Rules and copy only, no code.
Do **not** edit `docs/coach-audit.md` or `docs/decisions.md`.

1. **B-32 — the 0 kg set inside P1 and H1.** Rule P1 defines *completed* as `w > 0 AND r > 0`. Applied
   literally that drops a bodyweight rack chin from the verdict input and re-creates B-21 one layer up,
   which the backlog explicitly forbids. Rule on the completeness test (my recommendation: `r > 0` and
   `w` a valid number ≥ 0) and on the exact copy when the working load is 0 — `Stay at 0 kg until all 3
   sets reach 10 reps` is not acceptable output.
2. **B-32's sibling — hypertrophy tonnage at 0 kg.** `d3b Rack chin` is `k:"hyp"`, 3 × 8–12. Tonnage is
   0 against a previous 0, so H1 case 4 reads `Volume matched` forever. Rule on the comparison for a
   0 kg hypertrophy exercise (total reps is the obvious candidate) and its copy.
3. **Implement tags on `PROGRAM`.** Per-DB display (D-3), P1's `If 2.5 kg is not available…` line and
   SP1's per-DB read all need to know what each exercise is loaded with. Produce the tag for all 42
   slots from `{bb, db, machine, cable, bodyweight}`, and state which tags get the increment line.
4. **How far the S1 pain flag reaches.** The audit suppresses P1 cases 3–4 and H1 case 2. Rule on
   whether it also suppresses SP1's prescribed number and V1's reintroduction offer.

**Scope — out:** re-opening anything already ruled. Rewriting P1/H1/ST1/W1/V1/R1/SP1/D1/S1. Anything
about the diet beyond the adjustment trigger (audit §12).

**Acceptance criteria:**

- Each of the four has a rule, at least one worked example, and exact output copy where copy is involved,
  in the audit's own format.
- Every ruling carries a confidence tag: `[Certain]` / `[Likely]` / `[Guessing]` / `[Convention]` / `[Opinion]`.
- The 42 implement tags are listed by exercise id, with no slot left untagged.
- Reviewable by `backend-engineer` without a follow-up question.
- Nothing contradicts `docs/coach-audit.md`; if it must, it says so explicitly and says why.

**Depends on:** — (parallel with W1)

---

### W3 · UX spec: the session screen — owner: `ux-designer`

**Scope — in:** one spec at `docs/specs/wo-003-session-screen.md`. Copy, placement and states, no code.

1. **The verdict slot when there is no verdict.** Every rule now renders nothing below `ex.s` completed
   sets. Specify what the slot does — collapses, holds height, shows a target reminder — such that the
   card does not jump under his thumb as he fills the third set.
2. **The pain notice (S1).** Placement relative to the note field and the verdict, and how it persists
   across sessions until a later log of that exercise carries no matching note. The copy is fixed by the
   audit and may not be softened, shortened or re-worded.
3. **The rest timer (R1).** Where it lives so it is legible one-handed and never covers an input, all
   five display states, and what happens when two exercises' timers could be running. It must never
   block or delay a save.
4. **The speed card (SP1).** The prescribed load, the band, the rest line, the "not speed work" flag,
   and the no-data fallback.
5. **The target line with the dumbbell unit (B-22).** `3 × 3–5 · per DB`.

**Scope — out:** redesigning the session view. Moving `Discard` (B-34). B-13 in general. B-37's ghost
text — it stays open, which means the last-session hint may be invisible at 400 px; do not spec anything
that depends on it being readable.

**Acceptance criteria:**

- Every state has its exact string. No placeholder text and no "something like".
- Every interactive element ≥ 44 px, in the lower two-thirds of a 400 × 800 viewport, none in a top corner.
- Status is never conveyed by colour alone.
- The S1 copy is reproduced verbatim from audit §10.
- For each of the five surfaces the spec states what it does when the underlying rule returns nothing.
- A `frontend-engineer` can build it without asking a follow-up question.

**Depends on:** — (parallel with W1)

---

### W4 · UX spec: the Train and Weight screens — owner: `ux-designer`

**Scope — in:** one spec at `docs/specs/wo-003-train-weight.md`.

1. **The volume tier (V1)** replacing the `Full volume` checkbox: the weeks 1–4 line, the always-on
   status line, the reintroduction offer with `Add it` / `Not yet`, the accepted / declined / all-back /
   rollback states, and the calendar-vs-training-weeks line.
2. **The deload banner (D1):** trigger, declined, active, ended, and the permanent cycle line.
3. **The Weight tab (Rule W1):** all seven advice states, the three not-enough-data states, the
   `7-day average (6 of 7 days)` label, the replaced sub-line, and **the calorie-change
   acknowledgement** — one control that stamps "I changed my intake today", without which the audit's
   7-day cooldown can never fire. Specify what it says, where it sits, and what confirms it.

**Scope — out:** the diet targets panel (B-29). Creatine (D-6). Any change to bodyweight *entry*.

**Acceptance criteria:**

- All copy is verbatim from audit §2, §5 and §8 where the audit specifies it; anything new is in
  CLAUDE.md §4 voice — terse, second person, imperative, no hype, no emoji, no exclamation marks.
- The checkbox is gone from the spec entirely; no state in the spec restores nine accessories in one tap.
- Every offer and banner button ≥ 44 px, none in a top corner.
- The acknowledgement control cannot be triggered by a single accidental tap, and the spec says what
  happens if he taps it twice in one day.
- No state in the spec shows a kg-per-week number when the rule says there is not enough data.

**Depends on:** — (parallel with W1)

---

### W5 · Verdict seam + the mid-exercise gate (B-24, B-20, S1 hook) — owner: `backend-engineer`

**Scope — in:** `logic.js`. Create the pure surface, with the gate as its first rule.

- `PHAT.vol(sets)`, `PHAT.round2p5(x)`, `PHAT.workingLoad(sets, n)`, `PHAT.e1rm(w, r)`.
- `PHAT.painFlag(note)` → boolean, the audit's regex exactly:
  `/\b(pain|hurt|hurts|injur\w*|sharp|pinch\w*|tweak\w*|strain\w*)\b/i`.
- `PHAT.verdict(ctx)` → `{t, x}` or `null`, per Decision 3. Its only rule in this item: **return `null`
  unless completed sets ≥ `ex.s`.** Existing power/hyp/speed text moves across unchanged for now and is
  replaced in W6 — no test is written against it.
- `index.html`: `paintVerdict` calls `PHAT.verdict`, passing `prev` from `PHAT.lastFor(S.sessions, id)`.
  `verdictFor`, `lastFor`, `vol` and `topSet` are gone from `index.html`.

**Scope — out:** any rule change. P1, H1, and S1's copy and cross-session persistence are W6/W16.

**Acceptance criteria:**

- With `ex.s === 3` and one completed set, `PHAT.verdict` returns `null`; with two, `null`; with three,
  a `{t, x}`. Specifically: `60 × 10` alone on a 3 × 8–12 exercise produces **no** text, and in
  particular never the string `Volume down 66%`.
- Typing into set 1 of a 3-set exercise leaves `.verdict` with an empty `textContent` at every keystroke.
- `PHAT.painFlag("left knee pain on set 2")` is `true`; `"no pain today"` is `true` (accepted false
  positive, audit §10); `"RIR 1, good bar path"` is `false`; `"painting"` is `false`; `""` is `false`.
- `PHAT.round2p5(70.875)` === 70, `(94.5)` === 95, `(71.25)` === 70, `(102.5)` === 102.5.
- `verdictFor`, `lastFor`, `vol` and `topSet` are no longer defined anywhere in `index.html`.
- Every function above is callable from `tests.html` over `file://` with no DOM present.
- **Data-loss criterion:** `PHAT.verdict` does not mutate `ctx.sets`, `ctx.prev` or `ctx.note` —
  deep-equal before and after — and performs no storage read or write. Asserted by spying on
  `save`/`load` and requiring 0 calls.

**Depends on:** W1

---

### W6 · P1 power progression, H1 hypertrophy, and B-32 — owner: `backend-engineer`

**Scope — in:** the power and hypertrophy branches of `PHAT.verdict`, per audit §3 and §9 and W2's
ruling. Including S1's suppression of P1 cases 3–4 and H1 case 2 via `ctx.painFlag`, which exists from
W5 — see §H4.

**Scope — out:** the S1 notice copy and its persistence across sessions (W16/W17). The speed branch (W12).

**Acceptance criteria** — Squat `{s:3, lo:3, hi:5, k:"power"}` unless stated:

- `100×5, 100×5, 100×5` → `Top of range on all 3 sets. Go to 102.5 kg next session.`
- **`100×5, 100×5, 95×5` → `Sets not matched: 100 / 100 / 95 kg. Repeat 100 kg until all 3 sets reach 5
  reps.` and the string `102.5` does not appear in the output.**
- `100×5, 100×5, 100×4` → `Stay at 100 kg until all 3 sets reach 5 reps.`
- `100×2, 90×4, 90×5` → `2 reps at 100 kg. Below the range. Drop to 95 kg next session.` (case 1 beats
  case 2, deliberately).
- SLDL `{s:3, lo:5, hi:8}` at `120×8 ×3` → next load 122.5. At `120×10 ×3` → `10 reps at 120 kg on every
  set. Too light. Go to 125 kg.` (Decision 5: 125, not 126.)
- Two completed sets of a 3-set exercise → `null`.
- Any of the increasing outcomes above, with the note `left knee pain on set 2` → the hold outcome
  instead. No output containing an increased load survives a pain flag.
- **B-32:** rack chin `{s:2, lo:6, hi:10, k:"power"}` at `0×10, 0×9` → the copy ruled in W2. The output
  does not contain the substring `0 kg`.
- **H1:** `30×20 ×3` on a 3 × 8–12 → `All sets above 12. Go to 42.5 kg next session.` (case 2 before case 4).
- **H1 boundary:** `60×12 ×3` on 8–12 → falls through to the tonnage comparison, not "too light".
- **H1:** `60×10, 60×10, 60×9` against a previous `57.5×10 ×3` → `Volume up 1% — 1,740 kg against 1,725 kg.`
- **H1:** no previous entry → `First time logged. This becomes your baseline.`
- **Data-loss criterion:** for every case above, the input `sets` array is deep-equal before and after,
  and the underlying stored session (seeded in `phat:v1:log`) is byte-identical after the verdict runs.
  In particular a stored `{w:0, r:10}` set is still `{w:0, r:10}`.

**Depends on:** W2, W5

---

### W7 · Rule W1 — bodyweight rate and calorie decision engine — owner: `backend-engineer`

**Scope — in:** `logic.js`, per audit §2.

- `PHAT.bwWindows(entries, todayStr)` → `{a, b, aCount, bCount, meanA, meanB, rate}`, with window
  B = `[today-6 .. today]` and window A = `[today-13 .. today-7]`, by **local calendar date**.
- `PHAT.calorieAdvice(entries, todayStr, calChangedAt)` → `{state, rate, text, subline, tone}` covering
  all seven advice states, the cooldown, and the three not-enough-data states.
- `calChangedAt` persisted per Decision 6, plus a setter that stamps `PHAT.localDate()`.

**Scope — out:** rendering (W8). Anything about macros, carb placement or the rest-day floor.

**Acceptance criteria** — all against `PHAT.calorieAdvice`:

- **The headline: 8 entries spread over 24 days** → the state is not-enough-data, `rate` is `null`, the
  text is `Not enough daily weights. 2 of those 7 days logged; this needs 5.`, and no field of the
  returned object contains a kg-per-week number.
- Daily for 14 days, mean A 85.00, mean B 85.25 → `+0.25 kg per week. On target. Change nothing.`
- rate `+0.34` → `+0.34 kg per week. Above target, inside the margin. Change nothing.` and the output
  contains neither `Cut` nor `cut 200`.
- Boundary: rate exactly `+0.50` → above-target copy. `+0.51` → `Gaining too fast at +0.51 kg per week.
  Cut 200 kcal from training days.`
- Boundary: `+0.20` → on target. `+0.10` → below target, no change. `+0.09` → add 200.
- rate `0.00` → `Flat at +0.00 kg per week. Add 200 kcal to your training days.`
- rate `−0.35` → `Down 0.35 kg this week. You are not bulking. Add 200 kcal to your training days.`
- `calChangedAt` 3 days ago → cooldown state, and no add or cut instruction anywhere in the output.
- Fewer than 14 days of history → `Weigh daily. 6 more days before this becomes a calorie decision.`
- Window B holds 3 entries → `Not enough daily weights. 3 of the last 7 days logged; this needs 5.`
- `subline` is `Target: +0.2 to +0.3 kg per week. Averages over 14 days.` in every state that shows a rate.
- **Data-loss criterion:** the entries array is deep-equal before and after; `calorieAdvice` performs no
  storage write; stamping `calChangedAt` adds one key and leaves every bodyweight row byte-identical.

**Depends on:** W1, W2

---

### W8 · Weight tab rendering — owner: `frontend-engineer`

**Scope — in:** `vWeight` renders `PHAT.calorieAdvice`'s output per W4's spec. The `slice(-7)` /
`slice(-14,-7)` entry-count logic and the `d>=.2&&d<=.35` band are deleted. The average row label
becomes `7-day average (6 of 7 days)`. The acknowledgement control is wired.

**Scope — out:** the chart (B-11 stays open). The diet panel (B-29). Bodyweight entry itself.

**Acceptance criteria:**

- Seed 8 bodyweight rows spread over 24 days. The Weight tab shows **no** kg-per-week figure and **no**
  calorie instruction anywhere in the rendered DOM — assert that neither `kg per week` nor `200 kcal`
  appears — and shows the not-enough-data line instead.
- Seed 14 days of daily rows giving rate `+0.34`. The tab renders `Above target, inside the margin.` and
  the words `Cut 200 kcal` appear nowhere.
- The sub-line reads `Target: +0.2 to +0.3 kg per week. Averages over 14 days.` — it can no longer
  contradict the logic above it, because both read the same function.
- The acknowledgement control is ≥ 44 px, not in a top corner, and after using it the panel shows the
  cooldown copy with the correct future date.
- At 400 px the panel does not overflow horizontally.
- **Data-loss criterion:** logging bodyweight still writes exactly one row per local day, every
  pre-existing row survives the render unchanged, and rendering the tab writes nothing to storage.

**Depends on:** W4, W7

---

### W9 · Rule ST1 — stall detection — owner: `backend-engineer`

**Scope — in:** `logic.js`, per audit §4.
`PHAT.stallReport(sessions, todayStr, keyLifts)` → `{stalled:[names], untested:[names], testable:Boolean}`.
Epley `w * (1 + r/30)`; sets with `r > 8` excluded; recent block `[today-20 .. today]`, prior block
`[today-41 .. today-21]`; minimum `trainingWeeks >= 6` **and** ≥ 2 sessions of that lift in each block;
progress when `max(recent) >= max(prior) * 1.025`.

**Scope — out:** rendering (W10). Changing which four lifts are tested, the week-6 timing, or the
warning's wording — all settled (audit §12).

**Acceptance criteria:**

- **The headline: Row week 1 `100×3/3/3`, Row week 6 `100×5/5/5`**, with the block minimums met and
  `trainingWeeks >= 6` → `stalled` is `[]`. e1RM 110.0 → 116.7, ratio 1.061.
- True stall: prior best `100×5/5/4` (116.67), recent best `100×5/5/5` (116.67), ratio 1.000 → `stalled`
  contains `Row`.
- Boundary: prior best `100×5` (116.67), recent best `102.5×5` (119.58), ratio 1.02500 → not stalled.
- Regression: prior best `110×5`, recent best `100×5` → stalled. (Today's `Math.max` over all history
  scores this as progress forever.)
- A set of `100×12` contributes no e1RM; a lift whose only recent sets are above 8 reps lands in
  `untested`, not in `stalled`.
- `trainingWeeks === 5` → `testable` is `false` and both lists are empty.
- Squat logged 5 times, SLDL twice with both in the recent block → Squat tested, `untested` contains `SLDL`.
- **Data-loss criterion:** `stallReport` does not mutate `sessions` (deep-equal before and after) and
  performs no storage access.

**Depends on:** W1, W5

---

### W10 · Trend tab — stall rendering, lift labels, exercise count — owner: `frontend-engineer`

**Scope — in:**

- `vTrend` renders `PHAT.stallReport` instead of the inline `topSet` comparison, with the audit's four
  not-enough-data states, including **rendering nothing at all** before week 6.
- **B-27:** `KEY_LIFTS` labels become `DB press` (d1d) and `SLDL` (d2d). Chart legend, warning copy and
  the untested copy all read the new names.
- **B-28:** `d1a` becomes `Bent-over / Pendlay row`.
- **B-33 / Decision 7:** the session row counts entries with ≥ 1 completed set, and surfaces notes-only
  entries separately rather than hiding or dropping them.

**Why B-27 and B-28 ride here:** ST1's and SP1's copy names these lifts. Shipping the new copy against
the old labels prints `Deadlift` for a stiff-leg deadlift, in a warning about whether his programme is
working. The rename is one line and it is a prerequisite for the copy, not a tidy-up.

**Scope — out:** the chart's index-spacing bug (B-11). `fmt()`'s missing year (B-14). Locale pinning (B-35).

**Acceptance criteria:**

- With `trainingWeeks === 5` the Trend tab contains no warning block and no "on track" reassurance —
  assert the warning element is absent from the DOM, not merely hidden.
- With the week-1 `100×3/3/3` → week-6 `100×5/5/5` seed, no warning renders.
- With the true-stall seed the warning renders and its body matches the brief's wording character for
  character, from `Week 7 and no progress on` through `give it three weeks.`
- The legend reads `Row`, `DB press`, `Squat`, `SLDL`. The strings `Bench` and `Deadlift` appear nowhere
  in the rendered Trend tab.
- A session of 5 exercises with sets plus 1 notes-only entry renders `5 exercises · 1 note`, not
  `6 exercises`.
- **Data-loss criterion:** that notes-only entry is still present in `phat:v1:log` with its note text
  after the Trend tab renders, and is still reachable. The count changes; the data does not.

**Depends on:** W9

---

### W11 · Dumbbell unit and implement tags (B-22) — owner: `backend-engineer` → `frontend-engineer`

**Scope — in:**

- `PROGRAM` gains an implement tag per exercise, from W2's list. Data only, no behaviour.
- The session card's target line shows the unit for dumbbell exercises: `3 × 3–5 · per DB`.

**Scope — out:** plate math (B-10) — still open, now unblocked. Renaming any exercise other than B-28's.

**Acceptance criteria:**

- All 42 slots carry a tag, and a test asserts no exercise in `PROGRAM` is untagged, so a future added
  exercise fails loudly instead of silently defaulting.
- `d1d Flat DB press` renders `3 × 3–5 · per DB`. `d2a Squat` renders `3 × 3–5` with no unit suffix.
- The tag list matches W2's addendum exactly — a test compares them id by id.
- At 400 px the target line does not wrap onto a second line for the longest tagged exercise.
- **Data-loss criterion:** adding the tag changes no `id`, `s`, `lo`, `hi`, `k` or `cut` value. A test
  asserts all 42 slots' existing fields against a frozen snapshot, so a fat-fingered edit to a rep range
  during this pass fails a named test rather than silently re-prescribing his programme.

**Depends on:** W2, W3

---

### W12 · Rule SP1 — speed-work load — owner: `backend-engineer`

**Scope — in:** `logic.js`, per audit §7. `PHAT.speedLoad(sessions, exId, todayStr)` →
`{target, lo, hi, source:{w, r, date}}` or `{target:null, reason}`.
`SPEED_SRC = {d3a:"d1a", d4a:"d2a", d5a:"d1d"}`. R = the heaviest completed set on the source exercise
in the last 28 days with reps in `[3,5]`; widen to 56; else no number.
`PHAT.speedTooHeavy(w, R)` → `w > R * 0.75`. Recomputed every session, never cached.

**Scope — out:** rendering (W13).

**Acceptance criteria:**

- Source `d1a` `100 × 5` twelve days ago → `target` 67.5, band 65–70.
- Two candidates in window, `105 × 3` and `100 × 5` → R = 105, `target` 70 (105 × 0.675 = 70.875 → 70.0).
- The source's only recent set is `90 × 8` → `target` is `null` with a reason; nothing in 28 or 56 days.
- Squat source `140 × 4` nineteen days ago → `target` 95. `speedTooHeavy(110, 140)` is `true` (110 > 105);
  `speedTooHeavy(105, 140)` is `false`.
- `d5a` reads its source per dumbbell: source `35 × 4` → `target` 22.5.
- A source set 29 days old is excluded from the 28-day window and included in the 56-day one.
- **Data-loss criterion:** `speedLoad` does not mutate `sessions` and writes nothing. `speedTooHeavy`
  returning `true` never alters, blocks or removes the logged weight — W13 asserts that end to end.

**Depends on:** W1, W11

---

### W13 · Speed card rendering — owner: `frontend-engineer`

**Scope — in:** the speed card renders `PHAT.speedLoad` per W3's spec, replacing the static
`65–70% of your power-day top set. Rest 60–90 seconds.` hint and the `Submaximal and fast. Do not grind
these.` verdict.

**Acceptance criteria:**

- With a `100 kg × 5` row twelve days ago, the `d3a` card reads
  `67.5 kg. 65–70% of your 100 kg triple. Rest 60–90 s. Fast, never grinding.`
- With no qualifying source set, the card reads `Log a heavy triple on Bent-over / Pendlay row and this
  becomes a number. Until then: 65–70% of a weight you could triple.` (Decision 5 — interpolated name.)
- The instruction line reads `If a rep slows down, the set is over. Cut the weight, not the sets.`
- Entering `110` on the squat speed card with R = 140 shows `110 kg is not speed work. Drop to 95 kg.`
- **Data-loss criterion (the one that matters):** after that flag appears, the field still reads `110`,
  the draft on disk still holds `110`, and tapping Save writes a session containing `{w:110, …}`.
  Assert on the serialized JSON. The flag is advice; it does not touch the number.
- The percentage text never appears without a computed kg unless the no-data fallback is showing.

**Depends on:** W3, W12

---

### W14 · Rule V1 — volume tier engine — owner: `backend-engineer`

**Scope — in:** `logic.js` plus persisted state, per audit §5.
`PHAT.volumeTier(dayId, sessions, state, todayStr, stallReport, deloadState)` →
`{exerciseIds, offer:{exId, name}|null, statusLine, tierLine}`. `REINTRO_ORDER` per the audit.
Weeks 1–4: no `cut:1` exercise, no override anywhere. Week 5+: base plus the first `reintro[dayId]` of
that day's order. The offer is gated on `trainingWeeks >= 5`, an unexhausted counter,
`lastReintroDate[dayId]` null or ≥ 7 days ago, **no stall**, and no active deload.
`PHAT.rollbackReintro(state)` decrements every day by 1, floor 0.

**Scope — out:** rendering (W15). The deload half of the interaction (W19).

**Acceptance criteria:**

- `trainingWeeks === 3`, `d2` → 6 exercise ids, `d2c Leg extension` absent, `offer` is `null`.
- `trainingWeeks === 5`, `d5`, no stall, counter 0 → `offer` names `Incline cable fly`, the head of d5's
  REINTRO_ORDER.
- Accepting increments that day's counter to 1 and stamps the date; calling again the same day for the
  same `dayId` returns `offer: null`; 7 days later it returns the next one.
- Accepting on `d1` on Monday does not suppress `d3`'s offer on Wednesday — the counters are per day.
- Declining stamps the date and returns `offer: null` for 7 days without incrementing.
- 5 calendar weeks where weeks 2 and 4 hold 2 sessions each → `trainingWeeks === 3` → no offer, and
  `tierLine` is `Week 5 by the calendar, week 3 of real training. Reduced volume holds.`
- `stallReport.stalled` non-empty → `offer` is `null`, and `rollbackReintro` takes `reintro.d1` from 1 to 0.
- All counters at their day's cut count → `statusLine` is `Full volume. All 9 accessories are in.`
- **Data-loss criterion:** `volumeTier` never omits an exercise id that the current draft has a non-blank
  value in — a hidden-but-populated exercise is returned flagged, not dropped. And no path in this item
  touches the stored `includeCut` key.

**Depends on:** W1, W9

---

### W15 · Volume tier UI — owner: `frontend-engineer`

**Scope — in:** the `Full volume` checkbox and its handler are deleted. `vTrain` renders the tier line
and status line; `vSession` filters from `PHAT.volumeTier` and renders the offer per W4's spec.

**Acceptance criteria:**

- `#cut` does not exist in the DOM in any state, and no single control adds more than one accessory.
- At `trainingWeeks === 3` the Train tab reads `Week 3 of 4 at reduced volume. The cut exercises come
  back from week 5.` and Lower power renders 6 cards.
- At week 7 with 4 accessories back, the Train tab reads `Week 7 · 4 of 9 accessories back in.`
- The offer renders `Add Rack chin back to this session? Only if last week left you recovered and no lift
  went backwards.` with `Add it` / `Not yet`, both ≥ 44 px, neither in a top corner.
- Accepting shows `Rack chin is back in. That is the only addition for 7 days.`; declining shows
  `Left out. Asked again next week.`
- Rollback shows `Progress stalled. Pulling Upright row back out for now.`
- **Data-loss criterion:** with three sets typed into a `cut:1` exercise the tier would hide, the card
  still renders with `Not in today's volume. It has numbers in it.`, and saving writes all three sets.
  Reload mid-draft and they are offered back. The tier may change what he is *asked* to do; it may never
  change what he has *already logged*.

**Depends on:** W4, W14

---

### W16 · Rule S1 — pain flag copy and persistence — owner: `backend-engineer`

**Scope — in:** the notice's cross-session behaviour. `PHAT.painState(sessions, exId)` → whether the most
recent logged entry for that exercise carried a matching note, so the notice shows every session until a
later session logs that exercise with no match. `PHAT.verdict` already suppresses increases from W5/W6;
this item adds the notice to the returned object plus W2's ruling on SP1 and V1 reach.

**Scope — out:** any assessment, grading, substitution, stretch, rep-range or work-around. The rule is
the refusal (audit §10). No engineer adds a word to that string.

**Acceptance criteria:**

- Note `left knee pain on set 2` with `120×5/5/5` on a 3 × 3–5 → the hold verdict plus, verbatim:
  `You logged pain on this. Not something this app can assess.` / `Holding the weight. If it is sharp, or
  it repeats, stop the exercise and see a physio or a doctor.`
- `no pain today, felt strong` produces the same notice. Accepted false positive, on the record.
- `RIR 1, good bar path` produces no notice and the normal verdict.
- A later session logging that exercise with no matching note clears the notice; a session on a
  *different* exercise does not.
- The output contains no substitute exercise, no stretch, no rep-range advice and no severity judgement —
  asserted against the exact fixed string, with no interpolation.
- **Data-loss criterion:** the note text is never modified, truncated or cleared by the flag. Seed a note,
  trigger the notice, save, reload: the note reads byte-identically.

**Depends on:** W2, W6

---

### W17 · Pain notice rendering — owner: `frontend-engineer`

**Scope — in:** render the notice per W3's spec, on the card, every session, until cleared.

**Acceptance criteria:**

- The notice is legible at 400 px with no horizontal scroll and is not conveyed by colour alone.
- It is announced through the existing `#bs-live` region — the render-free channel established by B-39's
  analysis — not by a fresh `render()` call.
- Typing in the note field does not re-render the card: `document.activeElement` and the card's DOM node
  identity are unchanged across 10 seconds of typing.
- **Data-loss criterion:** with the notice showing, the note and all sets on that card save correctly and
  survive a reload through the draft restore.

**Depends on:** W3, W16

---

### W18 · Rule R1 — rest timer, on a render-free seam — owner: `frontend-engineer`

**Scope — in:** the timer per audit §6, plus the **narrow** seam it needs:

- A single update path that writes `textContent` to one existing node on an interval and **never calls
  `render()`**. That is the whole seam. B-19 stays open; this does not fix it.
- An absolute start timestamp, never a tick count, so backgrounding does not lose it.
- Starts when a set's reps field is **committed** (blur or stepper tap), not on keystroke.
- The table: power `hi<=8` ready 150 s cap 180; power `hi>8` ready 120 cap 180; hyp `hi<=12` ready 90 cap
  120; hyp `hi>12` ready 60 cap 120; speed ready 60, hard cap 90.
- **B-41 ride-along:** flush the draft on the first keystroke into an empty field, in addition to the
  existing 400 ms debounce.

**Scope — out:** fixing B-19 generally. Any other timer, any sound, any vibration, any notification.

**Acceptance criteria:**

- Squat (`power`, `hi` 5): the display reads `Rest 1:12 · go at 2:30` at 72 s and `Ready.` at 150 s.
- Lateral raise (`hyp`, `hi` 20): ready at 60 s, amber past 120 s.
- Row speed work at 130 s: `2:10. Too long for speed work. Go now or drop the weight.`
- Past 2× cap the display reads `Rest over.` and stops counting.
- Background the tab for 3 minutes and return: the displayed elapsed time matches the wall clock, not a
  paused count. Assert against the wall clock, not against a tick count.
- **Data-loss criterion 1:** with the timer running, type continuously into a weight field for 10 s.
  `document.activeElement` is unchanged, the card's DOM node identity is unchanged, and the typed value
  is present in `phat:v1:draft` within 400 ms of the last keystroke.
- **Data-loss criterion 2:** with the timer running, tapping Save writes the session. The timer is never
  in the save path and cannot delay or block it.
- **B-41:** the first character typed into a previously empty weight field is present in `phat:v1:draft`
  before 400 ms have elapsed.

**Depends on:** W3, W15

---

### W19 · Rule D1 — deload triggers and cycle state — owner: `backend-engineer`

**Scope — in:** `logic.js`, per audit §8.
`PHAT.deloadCheck(sessions, todayStr, stallReport, deloadState)` → `{trigger:"T1"|"T2"|"T3"|null, text}`.
T1: two **consecutive** sessions on one key lift failing to reach `lo` on all prescribed sets at a load
previously completed for the full prescription. T2: ST1 stalled on ≥ 2 of the 4 key lifts. T3: 9
consecutive training weeks with no deload. Deload state persisted per Decision 6; content is same weights,
2 sets, stop 2 reps short of `hi`, accessories out, speed work unchanged.
`PHAT.cycleLine(...)` → the permanent Train-screen string.

**Scope — out:** any scheduled or calendar deload — ruled out in audit §8. Auto-starting a deload: it is
always recommended, never imposed.

**Acceptance criteria:**

- `trainingWeeks === 5` → `trigger` is `null` for all three, and `cycleLine` contains no deload language.
- One bad squat session (3 reps where 5 was done) → `null`. One bad day is a bad day.
- Squat `120×5/5/5` completed, then `120×2/2/2`, then `120×3/2/2` → `T1`, text `Two sessions where Squat
  went backwards. Take a deload week: same weights, 2 sets, stop 2 reps short. Resume where you left off.`
- ST1 stalled on Row and DB press at week 9 → `T2`, and the output states **both** the deload
  recommendation and V1's accessory rollback.
- `trainingWeeks` exactly 9, no deload taken, no other trigger → `T3`, `Nine weeks straight. Take a deload
  week before something makes you.`
- Two missed sessions then one weaker session → `null`. Not two consecutive failures; absence is not fatigue.
- Declining sets the state so the check re-runs after the next session, not immediately.
- `cycleLine` renders `Week 7 · full volume phase · 4 of 9 accessories back · last deload: none`.
- **Data-loss criterion:** `deloadCheck` does not mutate `sessions`. Starting, declining or ending a deload
  writes only the deload state key — every session, set, note and bodyweight row is byte-identical before
  and after, asserted on the serialized log.

**Depends on:** W1, W9, W14

---

### W20 · Deload banner and cycle line — owner: `frontend-engineer`

**Scope — in:** the banner and the permanent cycle line on the Train screen, per W4's spec.

**Acceptance criteria:**

- Before `trainingWeeks >= 6`, only the cycle line renders. The word `deload` appears nowhere else in the DOM.
- The trigger banner shows `Start deload week` / `Not now`, both ≥ 44 px, neither in a top corner.
- Declining shows `Noted. Asked again after the next session.`
- During a deload, day 3 reads `Deload week, day 3. Same weights, 2 sets, 2 reps short. Do not chase
  numbers this week.` and the session screen renders 2 sets per exercise with accessories out.
- Ending shows `Deload done. Back to full sets at your last working loads.`
- **Data-loss criterion:** a deload reducing a card to 2 sets does not discard values already typed into
  set 3 of the current draft — they remain reachable and they save. A deload changes the prescription,
  not the log.

**Depends on:** W4, W19

---

### W21 · Regression suite — owner: `qa-engineer`

**Scope — in:** extend `tests.html`.

- **One named test per worked example in the audit** — 43 of them across §2, §3, §4, §5, §6, §7, §8, §9,
  §10 — plus the not-enough-data state of each of the nine rules, plus W1's ordering and `trainingWeeks`,
  plus `painFlag`'s regex, plus W2's four rulings.
- Rewrite the **B-32 KNOWN-BAD** test to assert the ruled output. It must not be deleted, and it must not
  be closed by dropping the 0 kg set — it asserts that the set is still stored *and* that the copy is right.
- The **B-38** test passes unedited.
- Update the S8 notes-only test's trailing comment: the `vTrend` count is fixed (Decision 7), so the
  comment predicting the wrong count is now wrong itself.
- Every new test names its rule (`P1`, `ST1`, `W1`…) and its backlog ID.

**Scope — out:** testing anything through the DOM — the harness stays `file://`-openable with no server.
Anything W22 covers by hand.

**Acceptance criteria:**

- **Expected suite shape after this batch: zero failures and zero KNOWN-BADs.** Today's `148 / 147 / 1`
  becomes `N / N / 0`. I expect `N >= 236` — 43 worked examples, plus nine not-enough-data states, plus
  the ordering, `trainingWeeks`, regex and tagging tests, on top of today's 148. The exact number is
  recorded in `tests.html` and in `docs/backlog.md` so it becomes the next session's tripwire.
- Any test that must remain red is a **newly recorded** KNOWN-BAD with a backlog ID and a named owner,
  argued in the QA report. "One expected failure" is never carried forward implicitly again.
- Reverting any one of P1, H1, ST1, Rule W1, SP1, V1, S1, R1 or D1 makes at least one **named** test fail.
  Demonstrate for all nine and paste the failure names.
- Every rule is reachable as `PHAT.<fn>` with no DOM. A rule that needs a browser is reported as a
  W5/B-20 failure, not worked around.
- The suite still opens by double-clicking the file, with no server and no network. If the 2-second budget
  must rise, it rises in the test itself with a comment saying why — never silently.

**Depends on:** W6, W7, W9, W12, W14, W16, W19. The scaffold can start against the signatures fixed in
this document from day one.

---

### W22 · Verification pass — owner: `qa-engineer`

**Scope — in:** walk every acceptance criterion in W1–W20 at 400 px with the network off. Then actively
try to make the app give wrong advice and to lose a number: enter one set of three and look for a verdict;
log `100/100/95` and look for `102.5`; seed 8 bodyweights over 24 days and look for a calorie instruction;
seed week 1 `3/3/3` → week 6 `5/5/5` and look for a stall warning; type a note containing `pain` and look
for an increase; run the rest timer while typing and check focus, caret and the draft on disk; hide a
populated `cut:1` exercise with the volume tier and save.

**Acceptance criteria:**

- Every criterion in W1–W20 marked pass or fail with the **observed** behaviour, not a summary.
- The four headline wrong outputs in §Reading of it are each attempted and documented as failing to reproduce.
- Any criterion that cannot be tested is named as untestable rather than passed. WO-001's record shows
  what happens otherwise.
- Any criterion that turns out to overstate what the code guarantees is **restated in the report** with
  the honest version and raised as a backlog item — the B-41/B-42 lesson applied while it is still cheap.

**Depends on:** W21

---

### W23 · Coaching sign-off on the shipped copy — owner: `strength-coach`

**Scope — in:** read the rendered strings for all nine rules as a lifter would, not as code. Confirm the
app now says what the brief says. Flag any string that is technically compliant and still misleading.

**Scope — out:** re-opening rules. New rules. Anything not on screen.

**Acceptance criteria:**

- Explicit pass or fail per rule, on the rendered copy.
- Confirms in one line each: the calorie band no longer cuts inside +0.3 to +0.5; the stall detector no
  longer fires on rep progress at a fixed load; no verdict recommends a load he did not complete for the
  full prescription; no verdict appears before the prescription is complete; a logged pain note stops
  every load increase.
- Any fail names the exact string and its exact replacement.

**Depends on:** W22

---

### W24 · Ship — owner: `release-engineer`

**Scope — in:** branch, merge to `main` once W22 and W23 are clean, deploy **all three files**
(`index.html`, `logic.js`, `tests.html`). The Vercel project is still not git-linked, so this is a manual
API deploy and a partial upload is the black-screen failure mode. Verify the live site, not the build
status. Record the deployed commit SHA.

**Scope — out:** E-2 (installing the Vercel GitHub App), E-4 (PWA), token rotation.

**Acceptance criteria:**

- `main` contains all three files; `/logic.js` returns 200 with `application/javascript` and real content
  on the live URL; `/tests.html` loads and reports `N / N / 0`.
- The live app renders the Train tab with no console errors.
- **Data-loss criterion:** on the live site, enter two sets, force-reload, and confirm the restore offer
  appears with both sets. Any data written by the previous live build still loads and still renders.
- If the deploy cannot proceed (see §Needs from Chady), the batch stops at a green `main` and says so.
  It does not ship half the files.

**Depends on:** W22, W23

---

## Sequence

```
W1 (order + trainingWeeks + B-38) ─┐
W2 (coach: 4 rulings)              ├─> W5 (verdict seam + gate B-24)
W3 (ux: session screen)            │        │
W4 (ux: train + weight)            │        ├─> W6  (P1 + H1 + B-32) ──> W16 (S1) ──> W17 (S1 UI)
                                   │        │
                                   ├────────┼─> W7  (bw engine) ──────> W8  (Weight tab)
                                   │        │
                                   │        └─> W9  (ST1) ───────────> W10 (Trend tab)
                                   │                 │
                                   ├─> W11 (DB unit) ┼─> W12 (SP1) ──> W13 (speed card)
                                   │                 │
                                   │                 └─> W14 (V1 engine) ─> W15 (V1 UI) ─> W18 (rest timer)
                                   │                              │
                                   └──────────────────────────────┴─> W19 (D1) ─> W20 (D1 UI)

              all of the above ──> W21 (suite) ──> W22 (QA) ──> W23 (coach) ──> W24 (ship)
```

- **Parallel from the start — dispatch these four together:** W1 (backend), W2 (coach), W3 + W4 (ux),
  W21's scaffold (qa). They contend on nothing; the UX and QA items touch no file W1 touches.
- **Parallel later:** once W5 lands, four backend chains are independent of each other until W14 —
  verdicts (W6→W16), bodyweight (W7), stall (W9), and unit→speed (W11→W12). Their frontend followers
  (W8, W10, W13, W17) are independent too.
- **The only true serialisation** is V1 → R1 → D1, because each reads the previous one's output or its
  render seam.
- **Strictly serial and non-negotiable:** W1 → W5 → W6 · W9 → W14 → W19 · W22 → W23 → W24.

---

## Ordering hazards — where landing X before Y creates a NEW defect

WO-001's lesson: naming these costs nothing, and one of them cost real rework.

**H1 · W1 before every week-gated rule.** `weeksIn()` reads `S.sessions[0].date` on an array that is
never sorted (audit D-9). If V1, ST1 or D1 land first they gate on a wrong week number. Concretely: V1
could unlock accessories in week 2 — the exact burial the brief's four-week ✂ block exists to prevent —
and D1's T3 backstop could fire at week 2. Today's checkbox at least requires a deliberate tap. Landing
V1 first would make the app **worse than it is now**.

**H2 · W5 before W6.** P1's new copy is specific and confident (`2 reps at 100 kg. Below the range. Drop
to 95 kg next session.`). Without B-24's gate it fires after set 1 of 3, telling him to drop the weight
mid-exercise. Today's ungated verdict is at least vague. Landing P1 before the gate makes a wrong output
more actionable, which is worse than a wrong output he ignores.

**H3 · W2 before W6.** Audit §3 defines *completed* as `w > 0 AND r > 0`. Applied literally that removes
the 0 kg rack chin from the verdict input and re-creates B-21 at the advice layer — which the backlog
explicitly forbids ("Do not close it by dropping the set again"). The ruling must exist before the code
does. Same hazard in `lastFor`, fixed in W1.

**H4 · The one deviation from the audit's sequence: the S1 *mechanism* moves earlier.** The audit
sequences S1 (B-26) after V1. I am moving `PHAT.painFlag` and the `ctx.painFlag` suppression into W5/W6
and leaving only the notice copy and its cross-session persistence in W16/W17. Reason: there must never
be a build in which the app confidently recommends a load increase and has no suppression for a logged
pain note. Cost: nothing — the regex is four lines and the hook is one branch. The audit's *rule* is
unchanged; only the order of two files' worth of work moves.

**H5 · W18 must not exist before a render-free update seam.** The app re-renders whole views with
`innerHTML` (B-19). A per-second timer that calls `render()` destroys focus and caret mid-set and can
race the 400 ms autosave debounce. That is a **data-loss** regression introduced by a comfort feature.
W18 builds one narrow `textContent` channel and is forbidden from calling `render()`. If that seam cannot
be built cleanly, R1 does not ship in this batch — it is the most deferrable item in it.

**H6 · W11 before W12.** Audit §7 example 5 is explicit: "If D-3 is not fixed first, this rule cannot
ship." SP1 computes a kg figure he will load onto a rack. Deriving it from a pair weight and printing it
against a per-dumbbell rack is a wrong number, in kg, under load.

**H7 · W9 before W14 and W19.** V1's offer gate and rollback both read ST1's output; D1's T2 *is* ST1's
output. Shipping V1 first means either an ungated offer (burial) or a rollback that never fires.

**H8 · W14 before W15's checkbox deletion.** Deleting `S.includeCut` from the read path before
`volumeTier` exists leaves nothing deciding which exercises render. The tier engine lands first, the
checkbox dies second, and the stored key never dies (Decision 6).

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **A rule is implemented correctly and coached wrongly.** This batch's entire value is coaching correctness, and QA cannot detect it. | High | Every rule comes from `docs/coach-audit.md` with worked examples; the four gaps go to W2; W23 signs off the rendered copy, not the code. No engineer resolves a coaching ambiguity — they escalate. |
| **The verdict engine is rewritten in one pass and something regresses silently.** | High | Decision 2 forbids pinning current behaviour in tests, and W21 requires each of the nine rules to have a named test that fails when reverted. Nine revert-and-observe demonstrations, not a green summary. |
| **The rest timer eats the caret mid-set (B-19).** The single most likely way to make the app *worse* while improving it. | High | §H5. W18's two data-loss criteria assert `activeElement`, DOM node identity, and the draft's contents on disk while the timer runs. If the seam is not clean, drop R1 from the batch. |
| **The volume tier hides an exercise he has already logged numbers into.** | High | W14 returns hidden-but-populated exercises flagged rather than omitted; W15's data-loss criterion is exactly this case, end to end through a reload. |
| **`schemaVersion: 3` collides with WO-002's importer**, which is the next batch and consumes the export format. | Medium | Decision 6 is additive only and accepts v2. **Hand-off recorded:** WO-002's importer must accept 2 **and** 3. Named in §Needs and in the backlog against B-04. |
| **Rows marked `dateBasis:"utc"` may be one day off, and every window here is date-based.** A one-day shift can move a session across a week boundary and change `trainingWeeks`. | Low today | The store is empty. WO-001 Decision 5 stands: no date is rewritten. Named so a future session holding real pre-WO-001 rows knows why a week count looks odd. |
| **Every rule reads history he still cannot correct (B-05).** One fat-fingered `140` permanently distorts P1, ST1 and D1 — and this batch makes the app act on that history far more confidently. | Medium | Not fixed here. **B-05's severity rises because of this batch**, and the backlog now says so. It is the strongest candidate for the batch after WO-002. |
| **PROGRAM is edited during W11's tagging pass and a rep range changes by accident.** | Medium | W11's data-loss criterion freezes all 42 slots' existing fields in a snapshot test. A stray edit fails a named test instead of silently re-prescribing his programme. |
| **The batch is large and QA lands last.** | Medium | The four independent chains after W5 mean partial progress is coherent — but nothing ships without W22, and W22 is one pass over the whole batch. **If the batch must be cut, cut from the end:** R1 (W18) then D1 (W19/W20). Neither is a wrong-advice fix; both are additions. |
| **A new identifier collides with a browser global** (the `top` failure). | Low, catastrophic | Everything new lives under `PHAT.*`. `topSet` is being deleted rather than renamed — check the replacement name too. |
| **Scope creep into B-05, B-10, B-11, B-13, B-19, B-29, B-31.** Each is one step from something here. | Medium | Decision 9 lists them by ID as explicitly not closed. Every W item has an "out" list. |

**Migration required:** yes — `schemaVersion: 3`, additive keys with defaults, no value rewritten, still
accepts v2, idempotent. `includeCut` stays on disk and stops being read.

**Data at risk:** nothing, if the criteria are met. The two real exposures are the volume tier hiding a
populated exercise (W14/W15) and the rest timer re-rendering mid-input (W18). Both are named above and
both carry explicit criteria.

---

## Needs from Chady

**Nothing until W24, and only conditionally then.** Every ruling this batch needs is a coaching or
engineering call that `strength-coach` and I hold, not his. Specifically these are *not* being escalated:
the 0 kg verdict copy, the implement tags, how far the pain flag reaches, the exercise-count rule, the
`schemaVersion` bump, keeping `includeCut` on disk, and the one sequence deviation (§H4). All decided
above or delegated to W2.

The one thing that genuinely cannot be settled inside this batch:

1. **The Vercel deploy at W24.** `docs/decisions.md` records that the deploy token was pasted into a chat
   transcript and must be rotated, and that the Vercel GitHub App is still not installed on the repo. If
   the token has been rotated, `release-engineer` cannot publish and the batch stops at a green `main`
   with `tests.html` at `N / N / 0`. That is a clean stopping point — the work is done, only the publish
   is blocked. Two ways to unblock it, and **I recommend the second**: paste a fresh token, or install the
   Vercel GitHub App on `chadyantoun-ux/Gym-App` (E-2), which ends manual three-file uploads permanently.
   Either way, everything up to and including `main` runs without him.

Two things I am telling him rather than asking:

2. **WO-002's importer will have to accept `schemaVersion` 2 and 3.** Recorded in the backlog against B-04.
3. **B-05 (no edit or delete of a saved session) matters more after this batch than before it.** Nine
   rules now read his history and act on it. One mistyped `140` he cannot correct will distort the stall
   detector, the progression recommendation and the deload trigger for weeks. Not in this batch; first in
   the queue behind WO-002.

And the standing diagnosis, unchanged and still true: this batch makes the advice correct, and the app
still has **zero logged sessions** in it. The measure of WO-003 is not a green suite. It is one logged
Upper Power session where the verdict at the bottom of the card is right.

---

## Dispatch list (for the main session)

**Round 1 — dispatch 1, 2, 3 and 4 together. They contend on nothing.**

1. **`backend-engineer` → W1.**
   Brief: *In `logic.js`, add `PHAT.sortSessions(sessions)` (new array, stable, never mutates),
   `PHAT.trainingWeeks(sessions, todayStr)` counting only local Monday-start calendar weeks that contain
   **≥ 3 logged sessions**, and `PHAT.lastFor(sessions, exId)` returning the last entry with a completed
   set (`r > 0`, **not** `w > 0` — a 0 kg rack chin must count). Sort the log at boot after migration and
   keep it sorted on save. Fix B-38: `buildSession` returns `null` when `dayId` is not a non-empty string;
   the existing failing test must pass unedited. Bump to `schemaVersion: 3` with an additive migration
   adding `reintro:{}`, `lastReintroDate:{}`, `calChangedAt:null`, `deload:null`, rewriting no existing
   value, still accepting a v2 store, idempotent. Leave the stored `includeCut` key exactly where it is.
   Criteria in `docs/work-orders/WO-003-advice.md` §W1.*

2. **`strength-coach` → W2.**
   Brief: *Write `docs/coach-audit-addendum.md` — rules and copy only, no code — and do not edit
   `docs/coach-audit.md` or `docs/decisions.md`. Four questions your audit did not reach. (1) Rule P1
   defines "completed" as `w > 0 AND r > 0`, which drops a 0 kg bodyweight set and re-creates B-21 one
   layer up; rule on the completeness test and on the exact copy when the working load is 0 — `Stay at
   0 kg until all 3 sets reach 10 reps` is not acceptable output. (2) `d3b Rack chin` is `k:"hyp"`, so
   H1's tonnage comparison is 0 against 0 forever; rule on the comparison and its copy for a 0 kg
   hypertrophy exercise. (3) Tag all 42 `PROGRAM` slots by implement (`bb`/`db`/`machine`/`cable`/
   `bodyweight`) and say which tags get P1's "if 2.5 kg is not available" line — this unblocks per-dumbbell
   display and SP1. (4) Does the S1 pain flag also suppress SP1's prescribed number and V1's
   reintroduction offer? Worked examples and confidence tags in your usual format. Criteria in
   `docs/work-orders/WO-003-advice.md` §W2.*

3. **`ux-designer` → W3 and W4** (one invocation, two spec files).
   Brief: *Two specs, copy and states only, no code.
   `docs/specs/wo-003-session-screen.md`: the verdict slot when a rule returns nothing — every verdict is
   now gated on completed sets ≥ prescribed sets, and the card must not jump under his thumb; the pain
   notice, whose copy is fixed in `docs/coach-audit.md` §10 and may not be softened; the rest timer's five
   display states, placed so it never covers an input and never blocks a save; the speed card (computed
   kg, band, rest, the "not speed work" flag, the no-data fallback); and the target line carrying the
   dumbbell unit (`3 × 3–5 · per DB`).
   `docs/specs/wo-003-train-weight.md`: the volume tier replacing the `Full volume` checkbox — weeks 1–4
   line, always-on status line, the one-accessory offer with `Add it`/`Not yet`, accepted/declined/
   all-back/rollback, and the calendar-vs-training-weeks line; the deload banner and permanent cycle line;
   and the Weight tab's seven advice states, three not-enough-data states, the `7-day average (6 of 7
   days)` label, and a control to acknowledge "I changed my intake today" without which the 7-day cooldown
   can never fire. All copy that `docs/coach-audit.md` §2/§5/§6/§7/§8/§10 specifies is verbatim. 400 px,
   one-handed, ≥ 44 px, nothing in a top corner, never colour alone. Criteria in
   `docs/work-orders/WO-003-advice.md` §W3 and §W4.*

4. **`qa-engineer` → W21 scaffold.**
   Brief: *Extend `tests.html` against the signatures fixed in `docs/work-orders/WO-003-advice.md`, before
   the implementations land: `sortSessions`, `trainingWeeks`, `lastFor`, `round2p5`, `e1rm`, `painFlag`,
   `verdict(ctx)`, `bwWindows`, `calorieAdvice`, `stallReport`, `speedLoad`, `speedTooHeavy`, `volumeTier`,
   `rollbackReintro`, `painState`, `deloadCheck`, `cycleLine`. Write one named test per worked example in
   `docs/coach-audit.md` — there are 43, in §2, §3, §4, §5, §6, §7, §8, §9, §10 — plus each rule's
   not-enough-data state. Do **not** write any test that pins current advice behaviour; those rules are
   being replaced. Target shape after the batch is `N / N / 0` with `N >= 236`, and no carried-forward
   expected failure. Criteria in §W21.*

**Round 2 — after W1 and W2 land.**

5. **`backend-engineer` → W5, then W6** (one invocation, in that order — same file, and W6 fills the seam
   W5 creates).
   Brief: *W5: create the pure verdict seam in `logic.js` — `PHAT.vol`, `PHAT.round2p5` (nearest 2.5, ties
   downward), `PHAT.workingLoad`, `PHAT.e1rm`, `PHAT.painFlag(note)` using the audit's regex exactly, and
   `PHAT.verdict(ctx)` taking one context object. Its only rule in W5: **return `null` unless completed
   sets ≥ `ex.s`** — that is B-24, and one set of three must produce no text at all. Delete `verdictFor`,
   `lastFor`, `vol` and `topSet` from `index.html`; `paintVerdict` becomes a caller. W6: fill in Rule P1
   (audit §3) and Rule H1 (audit §9) plus `strength-coach`'s B-32 addendum. `100/100/95` at 5/5/5 must
   never produce `102.5`; two completed sets of three must produce nothing; a note matching `painFlag`
   must downgrade every increase to a hold. Every function must be callable from `tests.html` with no DOM.
   Criteria in `docs/work-orders/WO-003-advice.md` §W5 and §W6.*

**Round 3 — four independent chains. Dispatch 6, 7, 8 and 9 together.**

6. **`backend-engineer` → W7, then `frontend-engineer` → W8.**
   Brief (backend): *Implement Rule W1 from `docs/coach-audit.md` §2 as `PHAT.bwWindows` and
   `PHAT.calorieAdvice`. Windows are 7 **local calendar dates**, not 7 entries: B = `[today-6..today]`,
   A = `[today-13..today-7]`, minimum 5 dated entries in each. Bands: `> +0.50` cut 200 · `+0.30..+0.50`
   no change · `+0.20..+0.30` on target · `+0.10..+0.20` no change · `< +0.10` add 200, with the losing
   variant below `−0.10`, plus a 7-day cooldown off `calChangedAt`. Copy strings verbatim from the audit.
   The headline case: 8 entries over 24 days returns no rate and no advice.*
   Brief (frontend): *Render it per the UX spec; delete `slice(-7)`/`slice(-14,-7)` and the `0.2–0.35`
   band; label the average `7-day average (6 of 7 days)`; wire the acknowledgement control. Criteria in
   §W7 and §W8.*

7. **`backend-engineer` → W9, then `frontend-engineer` → W10.**
   Brief (backend): *Implement Rule ST1 from `docs/coach-audit.md` §4 as `PHAT.stallReport`. Epley
   `w*(1+r/30)`, sets above 8 reps excluded, recent block `[today-20..today]` against prior
   `[today-41..today-21]`, minimum `trainingWeeks >= 6` and 2 sessions per block per lift, progress at
   `>= prior * 1.025`. The headline: week 1 `100×3/3/3` → week 6 `100×5/5/5` must return **no** stall.*
   Brief (frontend): *Render `stallReport` in `vTrend` with all four not-enough-data states, including
   rendering nothing at all before week 6. Rename `KEY_LIFTS` `Bench`→`DB press` and `Deadlift`→`SLDL`
   (B-27) and `d1a`→`Bent-over / Pendlay row` (B-28) — the new copy names these lifts, so the labels ride
   along. Fix the session-row exercise count to entries with ≥ 1 completed set, surfacing a notes-only
   entry separately (`5 exercises · 1 note`) and never deleting the note (B-33). Criteria in §W9, §W10.*

8. **`backend-engineer` → W11 (data), `frontend-engineer` → W11 (display), then `backend-engineer` → W12,
   then `frontend-engineer` → W13.**
   Brief: *Tag all 42 `PROGRAM` slots with the implement from `strength-coach`'s addendum — data only, and
   a snapshot test must prove no `s`/`lo`/`hi`/`k`/`cut` value changed in the pass. Show the unit in the
   target line for dumbbell exercises (`3 × 3–5 · per DB`) — this is B-22, and SP1 cannot ship without it.
   Then implement Rule SP1 (`docs/coach-audit.md` §7) as `PHAT.speedLoad`: `SPEED_SRC = {d3a:"d1a",
   d4a:"d2a", d5a:"d1d"}`, R = heaviest completed set at 3–5 reps within 28 days, widening to 56, else no
   number and the fallback copy; `round2p5(R*0.675)`, band `R*0.65..R*0.70`, never cached;
   `speedTooHeavy(w,R)` when `w > R*0.75`. Then render it. The flag is advice only: a flagged weight stays
   in the field, stays in the draft, and saves. Criteria in §W11, §W12, §W13.*

9. **`backend-engineer` → W16, then `frontend-engineer` → W17.**
   Brief: *W5/W6 already suppress load increases on a pain note. W16 adds `PHAT.painState(sessions, exId)`
   so the notice shows every session until a later session logs that exercise with no matching note, plus
   whatever `strength-coach` ruled about SP1 and V1 reach. The copy is the fixed string in
   `docs/coach-audit.md` §10 — no interpolation, no softening, no substitute exercise, no stretch, no
   severity judgement. W17 renders it per the UX spec, announced through the existing `#bs-live` region
   rather than by a `render()` call. The note text is never modified. Criteria in §W16, §W17.*

**Round 4 — serial. V1, then the timer, then D1.**

10. **`backend-engineer` → W14, then `frontend-engineer` → W15.**
    Brief: *Implement Rule V1 (`docs/coach-audit.md` §5) as `PHAT.volumeTier(...)` plus `REINTRO_ORDER`.
    Weeks 1–4: no `cut:1` exercise and no override anywhere. Week 5+: base plus the first `reintro[dayId]`
    of that day's order, offered **one per session**, gated on `trainingWeeks >= 5`, 7 days since that
    day's last offer, no stall, no active deload. `rollbackReintro` on a stall. Then delete the `Full
    volume` checkbox and its handler and render the tier, status line and offer per the UX spec. **Two
    things must not happen:** no single control may add more than one accessory, and an exercise the tier
    hides must still render — flagged — if the current draft has numbers in it, and must still save. The
    stored `includeCut` key stays on disk untouched. Criteria in §W14, §W15.*

11. **`frontend-engineer` → W18.**
    Brief: *Implement Rule R1 (`docs/coach-audit.md` §6) — power `hi<=8` ready 150 s cap 180; power `hi>8`
    ready 120 cap 180; hyp `hi<=12` ready 90 cap 120; hyp `hi>12` ready 60 cap 120; speed ready 60 hard
    cap 90; amber past cap; `Rest over.` past 2× cap. Store an **absolute timestamp**, never a tick count,
    and start on a committed reps field (blur or stepper tap), not on keystroke. **The timer must never
    call `render()`** — build one narrow `textContent` update channel; the app re-renders whole views with
    `innerHTML` and would eat the caret mid-set (B-19, which stays open). It must never block or delay a
    save. Ride-along (B-41): also flush the draft on the **first** keystroke into an empty field, alongside
    the existing 400 ms debounce. If the render-free seam cannot be built cleanly, stop and report — R1 is
    the most deferrable item in this batch. Criteria in §W18.*

12. **`backend-engineer` → W19, then `frontend-engineer` → W20.**
    Brief: *Implement Rule D1 (`docs/coach-audit.md` §8) as `PHAT.deloadCheck` and `PHAT.cycleLine`. There
    is **no scheduled deload** — it is autoregulated and always recommended, never imposed. T1: two
    consecutive sessions on one key lift failing `lo` on all sets at a previously completed load. T2: ST1
    stalled on ≥ 2 of 4. T3: 9 consecutive training weeks with no deload. Deload content is same weights,
    2 sets, 2 reps short of `hi`, accessories out, speed work unchanged. Then render the banner and the
    permanent cycle line per the UX spec. Before `trainingWeeks >= 6` the word "deload" appears nowhere.
    Criteria in §W19, §W20.*

**Round 5 — verification and ship.**

13. **`qa-engineer` → W21 completion, then W22.**
    Brief: *Finish the suite so every worked example in `docs/coach-audit.md` and every acceptance
    criterion in W1–W20 has a named test. Rewrite the B-32 KNOWN-BAD test to assert the ruled output — it
    must still prove the 0 kg set is stored, and it must not be closed by dropping the set. The B-38 test
    passes unedited. Update the S8 notes-only test's stale comment about the `vTrend` count. Then prove
    each of the nine rules by reverting it and pasting the name of the test that fails. Then run the manual
    pass at 400 px with the network off and actively try to make the app give wrong advice: one set of
    three; 100/100/95; 8 bodyweights over 24 days; week 1 3/3/3 → week 6 5/5/5; a note containing "pain";
    the timer running while typing; a populated `cut:1` exercise hidden by the tier. Report pass/fail per
    criterion with observed behaviour, no interpretation. Expected shape: `N / N / 0`, `N >= 236`, zero
    carried-forward failures. If any criterion in this work order overstates what the code guarantees,
    restate it in your report and raise it as a backlog item — that is the B-41/B-42 lesson, and it is
    cheaper now than later.*

14. **`strength-coach` → W23** (only if 13 is clean).
    Brief: *Read the shipped strings, not the code. Confirm per rule: the calorie band no longer cuts
    inside +0.3 to +0.5; the stall detector no longer fires on rep progress at a fixed load; no verdict
    recommends a load he did not complete for the full prescription; no verdict appears before the
    prescription is complete; a logged pain note stops every load increase. Any fail names the exact
    string and its exact replacement. Criteria in §W23.*

15. **`release-engineer` → W24** (only if 13 and 14 are clean).
    Brief: *Branch, merge to `main`, deploy **all three** files — `index.html`, `logic.js`, `tests.html`.
    The Vercel project is still not git-linked, so this is a manual API deploy and a partial upload is a
    black screen. Verify the live site itself: fetch `/logic.js` and require a 200 with
    `application/javascript` and real content, load `/tests.html` and confirm `N / N / 0`, load the app
    with the console open, and confirm the draft-restore flow on the live URL. Record the deployed commit
    SHA. `docs/decisions.md` records that the deploy token was pasted into a transcript and must be
    rotated — if it no longer works, **stop at a green `main` and say so**; do not ship a partial upload.
    Out of scope: installing the Vercel GitHub App (E-2), PWA (E-4), token rotation itself.*
