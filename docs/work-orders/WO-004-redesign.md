# WO-004 — The redesign

Author: `project-manager` · Date: 2026-09-10 · Status: specified, not started
Supersedes: WO-003's held frontend items (W8, W10, W11-display, W13, W15, W17, W18, W20) and
WO-003 W16 (never built).
Source design: `docs/design/PHAT App.dc.html` (turn 3, direction 2a) · `docs/design/PHAT Colour Directions.dc.html`
Reads: `docs/coach-audit.md`, `docs/coach-audit-addendum.md`, `docs/decisions.md`,
`docs/specs/wo-003-session-screen.md`, `docs/specs/wo-003-train-weight.md`, `logic.js` @ `wo-003-advice`.

---

## Ask

Implement Chady's redesign: nine screens, five tabs, one exercise per screen, an editable plan, and
the nine WO-003 rule engines finally wired to a UI.

## Reading of it

The design is a **prototype of the visual output and the intended flow**, not a specification of
behaviour. Per its own `HANDOFF-README.md`: recreate the visual result, do not copy the internal
structure. Where the prototype's JS restates a rule that has already been ruled and built, the
**engine wins and the design contributes the slot, not the sentence**. Where the prototype introduces
a flow that does not exist yet (onboarding, Summary, Diet, Plans, Plan Editor, add/remove sets), that
is genuine new scope and is sized below.

Two files in the bundle need no budget at all:

- `docs/design/support.js` — the Claude Design canvas runtime (`<x-dc>`, `sc-if`, `sc-for`, `DCLogic`).
  It exists to render the prototype inside the design tool. Nothing in it ships.
- `docs/design/_ds/.../_ds_bundle.js` — 303 bytes, `"components":[]`. Zero components. Nothing to consume.

And one finding about the third: **`_ds/.../styles.css` is not the app's palette.** It is a light
Modernist ground (`--color-bg #f3f2f2`, accent `#ec3013`). Direction 2a deliberately replaced it with
graphite and signal amber (`#1c1b1a` / `#2a2827` / `#f0eeea` / `#f5b32b`). What carries over from the
design system is **structure, not colour**: Archivo 400/600/800, `--radius-*` = 0 everywhere, 2 px
rules between major sections, flush-left labels including inside wide buttons, the 4/8/12/16/24/32
spacing scale, and the `:focus-visible { outline: 2px solid <accent> }` rule. Its Lucide-icons
instruction does **not** carry over — no icon library, no CDN dependency; the design uses text glyphs.

**The standing diagnosis, stated once and then dropped.** This is the fourth tool built for a
programme with zero logged sessions, and a full visual rebuild before the first session is exactly the
pattern CLAUDE.md §8 asks me to name. The engine half of WO-003 is the part that would have changed
the advice he gets; it is done and it is invisible. The cheapest path to a logged session is W6+W7+W9
alone — the session screen on the new language — and the Plan Editor is the single item in this
design most likely to be done *instead of* training, which the design's own copy says out loud. That
is my recommendation on sequencing, not a refusal: everything he asked for is planned below.

---

## Constraint & backlog check

### Blocking P0s: none

B-01, B-02, B-03 and B-21 are closed (WO-001, merged and deployed). Nothing here is blocked by them —
but three of them are **structurally reopened by the prototype** and are called out in the conflict
table below. Building on top of the prototype's data handling would undo WO-001.

### CLAUDE.md §3 conflicts

| § | Constraint | Design's position | Ruling |
|---|---|---|---|
| 3.1 | No build step | Prototype is a `DCLogic` class over a canvas runtime | Not carried. Vanilla JS, `index.html` + `logic.js`, no framework. The nine screens become nine view functions in the existing idiom |
| 3.3 | Never lose a number | **Violated three ways** — see C-5, C-12, C-14 | Non-negotiable. All three fixed before the screens ship |
| 3.4 | Local dates, never UTC | Prototype's `iso()` is `toISOString().slice(0,10)` | Not carried. `PHAT.localDate` only. This is B-03 verbatim |
| 3.5 | kg, steps of 2.5 | Settings offers a **5 kg** option | **Ruled out** — see C-3 |
| 3.6 | Targets >= 44 px | Steppers 38 px, tabs ~32 px, editor controls 16–20 px | **Violated throughout.** W6 sets the floor before any screen is built |
| 3.8 | `main` always deploys | — | Branch `wo-004-redesign`, merge on QA pass |

### Backlog dependencies

- **Supersedes:** WO-003's held frontend items. They do not disappear; they are re-homed into W7–W13.
- **Carried forward, all still open:** B-37 (ghost at zero width), B-43 (44 px), B-13 (`maximum-scale=1`,
  labels, colour-alone, `aria-live`), B-44 (`Sept` vs `Sep`), B-36 (iOS keyboard vs the fixed dock),
  B-34 (Discard in the top corner), B-35 (`fmt()` locale), B-11 (chart spaced by index), B-14 (year),
  B-15 (duplicate SVG marker ids), B-19 (full re-render), B-31 (weekday labels), B-39, B-40.
- **Satisfied by this design if built as specified:** B-29 (diet targets displayed — the Diet tab),
  B-37 (the ghost hint moves to its own full-width row), B-33 (the Summary counts exercises properly).
- **Unblocked but not built here:** B-10 (plate math), B-05 (edit/delete a saved session). B-05's
  severity rises again: the Plan Editor makes history *reinterpretable* as well as uncorrectable.
- **Not in this work order:** WO-002 (B-04 + B-16, the backup round trip). The design's
  `exportJson` is an empty stub and Settings has no import. Called out in Needs from Chady.

---

## Conflicts

Fifteen. Six were spotted before this work order; nine were found in this pass. Each is ruled or escalated.

### C-1 · The FULL VOLUME toggle — **RULED, the toggle goes**

`docs/design/PHAT App.dc.html:376-379` ships an all-or-nothing checkbox. Its own helper text reads
*"reintroduce one movement per session if recovery holds"* — which is Rule V1, not a checkbox. The
design contradicts itself and the ruling is the tiebreak: coach-audit §5 rejected the checkbox
explicitly, `wo-003-train-weight.md` §0.1 requirement 1 says *"no checkbox, no toggle, no restore-all,
no settings screen that changes more than one exercise's inclusion at a time"*, and `PHAT.volumeTier`
already implements the gated per-session ramp with `acceptReintro` / `declineReintro` /
`rollbackReintro`. **The Volume section of Settings is deleted.** The tier's status lives on the Train
screen cycle line and the offer lives on the session screen. B-23.

### C-2 · Rest is per-day in the design, per-role in the ruling — **RULED, per-role**

Prototype sets `rest: 150 / 180 / 90` on the day object and prints `rest 2 min` from it. Rule R1
(coach-audit §6) is per exercise: power `hi<=8` ready 150 cap 180 · power `hi>8` ready 120 cap 180 ·
hyp `hi<=12` ready 90 cap 120 · hyp `hi>12` ready 60 cap 120 · speed ready 60 **hard cap 90**. The
day-level number is wrong for a cambered bar curl (150 where R1 says 120) and for a lateral raise
(90 where R1 says 60), and the design's hypertrophy days would give speed work 90 s of *ready* where
R1 makes 90 s the hard cap. **The `rest` field is dropped from the plan document.** R1 is computed.
Additional finding: **R1 has no engine.** It was WO-003 W18, a frontend item, and was held. It is now
backend work — W4.

### C-3 · The 5 kg increment option — **RULED, removed**

`PHAT.round2p5`, Rule P1's step and Rule G1's cap all assume the 2.5 kg grid, and CLAUDE.md §3.5
fixes it. More to the point: **the increment is the rule's, not a setting's.** P1 case 3's
2.5 %-per-rep constant and G1's derived step are coaching decisions signed off in `decisions.md`
(2026-09-09, Rule G1). A Settings control that overrides them lets a UI preference re-prescribe a
programme. Generalising every engine off the 2.5 grid touches nine rules and 134 tests for no benefit
to a lifter training on a 2.5 kg grid. **The Weight-increment section of Settings is deleted.** If he
wants 5 kg jumps on the big lifts, that is a coach-reviewed rule change in its own work order, not a
segmented control.

### C-4 · The prototype's verdict — **RULED, the engine's copy ships verbatim**

Prototype `verdict()` at lines 601–619 prints *"All sets hit the top of the range. Add 2.5 kg next
session."* The shipped engine implements P1, H1, Z1–Z3, G1, I2, S1 and DL1 with copy lifted character
for character from `coach-audit.md` and seven further calls ruled in `decisions.md`. **The prototype's
`verdict()` is discarded whole.** The design contributes the slot: a kicker + a body line, on a
surface with a 3 px amber left rule. The engine returns `{t, x, x2, rule}`; `x2` is Rule I2's
increment line and must render as a **second line**, never appended to the first (Decision 1 of the
seven-calls entry).

### C-5 · DATA IDENTITY (a) — day ids renumbered — **RULED, storage keeps `d1..d5`**

Design uses `d1, d2, d4, d5, d6`, skipping the rest day, so "Back & shoulders" moves from `d3` to
`d4` and "Lower hypertrophy" from `d4` to `d5`. Stored sessions carry `dayId`. Worse than the log:
**`logic.js` has these ids compiled in.** `REINTRO_ORDER` (line 2088) is keyed `d1..d5` and lists
`d3d`, `d3g`, `d4g`, `d4c`, `d5d`, `d5j`, `d5g`. `SPEED_SRC` (line 1898) is `{d3a:"d1a", d4a:"d2a",
d5a:"d1d"}`. `KEY_LIFTS` is `d1a / d1d / d2a / d2d`. The stored `reintro` counter is keyed by dayId.
Renumbering silently re-points the speed-work source lift and the accessory ramp onto the wrong days.

**Ruling: storage ids do not move.** `d1..d5` and `d1a..d5j` are opaque, stable and invisible. The
design's numbering is a *display* artefact of showing the rest day in the week; the correct expression
of that is B-31's weekday labels (Mon / Tue / Thu / Fri / Sat), not a renumbering. Zero migration,
zero risk, and the design's visual output is unchanged.

### C-6 · DATA IDENTITY (b) — name-derived exercise keys — **RULED, rejected outright**

Prototype `ex()` at line 451 keys exercises `slug(name) + ":" + kind`. Combined with the editor's
rename, **renaming an exercise orphans its entire history** — every engine reads history by exercise
id: `lastFor`, `stallReport`, `speedLoad`, `e1rmByDate`, `liftDays`, `painWindow`, `volumeTier`. The
design's own note (`line 368`: *"Trend keeps comparing whatever lift names you keep"*) acknowledges
the trade instead of solving it. It also means a typo is a data-loss event, and that two exercises
called "Skull crusher" on two different days share one history — which the prototype's own `KEYS`
array relies on for the trend and which is *wrong* for `lastFor` (the d1 skull crusher is 3×6–10
power-day work; the d5 one is 3×12–15).

**Ruling: identity is a stable opaque id, generated once, never derived from a name and never
rewritten by a rename.** The name is a display field. This is not negotiable and is not a preference:
CLAUDE.md §3.3 makes silent history loss a P0.

**But the design's *trend* requirement is real and is kept**, by a second, separate field: `lift` —
an explicit, user-editable "this is the same movement as" grouping used by the Trend tab and by
`SPEED_SRC`. Two ids, one lift. `lastFor` and every per-exercise rule keep using `id`; only the
cross-exercise trend uses `lift`. That gives the design what it wanted without letting a rename delete
anything.

**The log is empty today, so the migration is free right now.** That is a scheduling input: W2 goes
first regardless, but doing it now costs one function and doing it after six weeks of logging costs a
migration with a rollback plan.

### C-7 · The editable plan breaks every engine's assumptions — **PARTLY RULED, one item escalated**

A user-created exercise has no `k`, no `implement`, no `cut`. `k` decides which rule fires (P1 vs H1
vs the speed branch vs R1's rest row). `implement` drives Z2's load word (`bodyweight` vs `zero load`)
and I2's increment line. `cut` drives V1. The prototype's `addEx` hard-codes `("New exercise", 3, 8,
12, "hyp")` and a generic cue — a silent guess that determines what the app tells him to lift.

**Ruled:** `k` and `implement` are **required at creation** — the add-exercise flow asks, and there is
no path to an untyped exercise. There is already a test asserting no `PROGRAM` slot is untagged
(WO-003 W11); it extends to user plans. `cut` defaults to absent (not a cut accessory).

**Ruled:** the nine engines split into two classes.

- **Plan-agnostic** — `verdict` (P1/H1/Z1–Z3/G1/I2/S1/DL1), R1, W1/`calorieAdvice`. These need only
  `k, lo, hi, s, implement`, so they work on any plan.
- **Plan-specific** — SP1 (`SPEED_SRC`), V1 (`REINTRO_ORDER` + the weeks-1–4 block), ST1 and D1
  (`KEY_LIFTS`), and the cycle line (PHAT's 4-week structure). These are **programme data, not app
  data**, and move into the plan document. On a plan that does not declare them the feature **goes
  silent and says so** rather than guessing.

**Escalated to `strength-coach`:** the silence copy, and whether ST1's week-6 test may run at all on a
non-PHAT plan. The week-6 test asks a specific question about a specific programme. `strength-coach`
verified all 42 PROGRAM slots against the handoff brief; once the plan is editable that verification
no longer holds, and the app must stop claiming a programme it is not running.

### C-8 · Movement illustrations dropped to placeholders — **ESCALATED to Chady**

The current app has 15 hand-built SVG movement patterns (`PAT` / `POSES`, `index.html:374-442`) mapped
across all 42 slots, each with a coaching cue, rendered from two stick-figure poses plus an amber
direction arrow. The design replaces them with a 64 px box reading `FIG 3` and the note *"supply the
movement illustrations and they drop in here."* It does, however, upgrade the cues: **42 per-exercise
cues** against today's 15 per-pattern ones.

I am not ruling this. Losing working artwork for a placeholder is a regression, and the trade is his.
**Recommendation: keep the 15 patterns, recolour them to the 2a palette, and adopt the design's 42
per-exercise cues.** The artwork is cheap to port (two colour tokens and a stroke width), the cues are
a genuine improvement, and a user-created exercise falls back to no figure and no cue rather than a
wrong one. The alternative — placeholders now, real illustrations later — means shipping a screen
worse than today's on the app's one visual feature, and "later" has no owner.

### C-9 · The calorie decision reproduces B-06 exactly — **FOUND THIS PASS. RULED, engine wins**

Prototype `calDecision` computes from `bwAvgN(7)` = **the last 7 entries, not the last 7
dates** — B-06's first defect, verbatim — and then applies bands `>=0.2 && <=0.35 correct · >0.5 cut ·
<0.15 add`, which are the exact bands coach-audit §2 struck down. Rule W1 is: windows are the **local
date ranges** `[today-6..today]` and `[today-13..today-7]`, with a **minimum of 5 distinct dated
entries in each**, plus a 7-day cooldown after an acknowledged change; bands `>+0.50` cut ·
`+0.30..+0.50` no change · `+0.20..+0.30` on target · `+0.10..+0.20` no change · `<+0.10` add ·
`<-0.10` losing. It also violates `wo-003-train-weight.md` §0.1 requirements **6** (no kg/week number
when the rule says there is not enough data — the prototype prints one from two entries) and **7**
(the average must be labelled with the count of days it used — the prototype's label is a flat
"7-day average").

**Ruled:** `PHAT.calorieAdvice` and `PHAT.bwWindows` ship verbatim, including the insufficient-data
state and the `7-day average (6 of 7 days)` label. The prototype's inline arithmetic is discarded.

### C-10 · The week label is the wrong week — **FOUND THIS PASS. RULED**

Prototype `weekNo()` is calendar weeks from the first session, printed as `Week 5 · 12 sessions`. Every
gated rule in the app uses `PHAT.trainingWeeks` — calendar weeks containing >= 3 *training days*
(Decision, 2026-09-09). The Monday-start ruling is explicit that the two numbers can differ and that
**the screen must show both or the count looks broken**: `Week 5 by the calendar, week 3 of real
training. Reduced volume holds.` The design also puts a *second* programme-state line on the same
screen (`testCountdown`, the week-6 countdown), which `wo-003-train-weight.md` §0.1 requirement 4
forbids — exactly one programme-state line, one definition of "week".

**Ruled:** `PHAT.cycleLine` owns the single programme-state line, by the precedence table in
`wo-003-train-weight.md` §1.2. The week-6 countdown is folded into it or moved to the Trend tab, not
shown beside it.

### C-11 · The verdict gate is loosened by remove-set — **FOUND THIS PASS. RULED**

Prototype: `v.hasVerdict = !!vd && filled >= Math.min(e.s, st.sets.length)`. Remove two sets from a
3-set exercise and the verdict fires on one completed set — **B-24 reopened through a new door**, and
B-24 is the bug the coach called the cheapest correctness win in the app. `PHAT.verdict` already
returns `null` below `ex.s` completed sets and it must stay the only gate.

**Ruled:** the gate is `completedSets >= ex.s`, always, against the **prescription**, never against
the current row count. Removing sets does not buy a verdict. An exercise with fewer than `ex.s`
completed sets shows the deliberate-silence line (see C-15 and W5).

### C-12 · `− REMOVE` destroys typed data with no confirmation — **FOUND THIS PASS. P0-CLASS. RULED**

Prototype `removeSet`: `if (arr.length > 1) arr.pop()`. It pops the **last** set
unconditionally, including one holding a completed `120 × 5`, with no confirmation and no undo. That
is CLAUDE.md §3.3 and `wo-003-train-weight.md` §0.1 requirement 12. It is the same failure class as
B-02 and B-21, which WO-001 spent a whole work order closing.

**Ruled:** removing a set that contains **any** typed value in either field requires an explicit
confirmation naming what is being deleted, and the removal is undoable for the life of the session.
Removing a set that is entirely blank is silent and immediate. Additionally: the button removes the
**last blank set** by preference, not the last row, so the common case never touches data.

### C-13 · `DISCARD` in the top-right corner, no confirmation — **FOUND THIS PASS. RULED**

`docs/design/PHAT App.dc.html:121`. This is B-34 verbatim — the most destructive control in the app,
in a top corner, against CLAUDE.md §3.6. WO-001's W5 gave it a confirmation and a 44 px target; the
design's `v.discard` throws the draft away in one tap. The redesign is the moment B-34 was waiting
for: **Discard moves out of the header** into the session's own controls, keeps its confirmation, and
keeps a 44 px target.

### C-14 · The sample-data loader can destroy the real log — **FOUND THIS PASS. P0-CLASS. RULED**

`v.loadDemo` overwrites `sessions` and `bw` with 30 generated sessions and 42 bodyweight rows.
`v.startFresh` sets both to `[]`. `v.toggleDemo` sits in Settings labelled `SWITCH TO AN EMPTY LOG`,
one tap, no confirmation — **"delete all my history"** behind a data-source toggle. And once loaded,
demo sessions are byte-identical to real ones: nothing on disk distinguishes them, so a demo session
can drive a verdict, a stall report and a deload trigger.

**Ruled, three parts:**

1. Sample data lives in its own store key and is loaded into a clearly-labelled **demo mode**; the
   real log is never written and never read while demo mode is on.
2. Every sample-derived session carries a `demo: true` flag so it can never be mistaken for real data
   even if the stores were ever merged.
3. Leaving demo mode restores the real log untouched. There is no control anywhere in the app that
   empties the real log without a typed confirmation.

### C-15 · The session card has no note field — **FOUND THIS PASS. RULED**

The current card carries `<input class="note" placeholder="Note — RIR, form, pain, anything">`. The
design has no note field on any screen. That is not a cosmetic loss:

- It is the **only input to Rule S1**, the pain suppression rule — `PHAT.painFlag` reads the note, and
  a whole backlog item (B-26) and an unbuilt engine item (WO-003 W16) hang off it.
- `validateDraft` deliberately keeps a **notes-only entry** because a typed note is data
  (`decisions.md`, 2026-09-09). Dropping the field drops that data path.
- `wo-003-session-screen.md` §0.4 makes the note field the **last input on the card**, and the whole
  bottom-stack safety rule is defined relative to it.

**Ruled:** the note field returns, as the last input on the card, above the bottom stack. `ux-designer`
owns its expression in the new language — a collapsed one-line affordance is acceptable, absence is not.

---

## The "what a new visual design must still honour" audit

Both WO-003 specs open with this list. Every item, checked against the prototype.

### `wo-003-session-screen.md` §0.1 — non-negotiable behaviour

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Nothing appearing/resizing sits above an input on the card | **Honoured** | Verdict, extra-set note and rest dock all render below the set rows |
| 2 | The verdict slot never changes the card's height when a verdict arrives | **Violated** | `<sc-if value="{{ hasVerdict }}">` (line 156) — the block appears from nothing |
| 3 | Silence looks deliberate; the slot says so in words | **Violated** | No slot exists when silent. Absence reads as breakage |
| 4 | Rest timer never covers an input, never changes height, never calls `render()`, never in the save path | **Violated in two of four** | Never covers an input, fixed height. But it ticks by `setState` (full re-render, every second — B-19 collision) and counts down an interval instead of storing an absolute timestamp, so backgrounding loses it |
| 5 | The speed too-heavy flag never alters the logged weight | **N/A — absent** | The design has no speed flag; `exLast` prints a static sentence. Slot must be added (W7) |
| 6 | Advice and refusal are visually distinguishable | **Violated by omission** | The design has **no refusal state at all** — no blocked-save, no malformed-set error. WO-001's B-02 mechanism, the thing that stops a set vanishing, has nowhere to render |
| 7 | The pain notice has no dismiss and cannot be shortened | **N/A — absent** | No pain notice, no note field (C-15). Slot must be added |
| 8 | Every surface in that spec is read-only; it adds no tap targets | **N/A** | The rule scoped W3. The design deliberately adds many targets — and they must all clear 44 px, which they do not |
| 9 | The target line never wraps, truncates or shrinks | **Honoured structurally** | `exTarget` is `flex:none` beside the `h3`; the name wraps first. But the ` · per DB` unit suffix (B-22 / WO-003 W11) is missing and must be added |
| 10 | A rule that throws is caught per card | **Not addressed** | No error boundary in the prototype. Carry into W7 |

### §0.2 in both specs — accessibility

| Requirement | Verdict | Evidence |
|---|---|---|
| Body text >= 4.5 : 1 | **Mostly honoured, two failures** | The 2a palette is a real improvement: `.note` / `rgba(240,238,234,.55)` on `#1c1b1a` measures **5.4 : 1**, `.lbl` at `.5` measures **4.7 : 1**, amber `#f5b32b` on `#1c1b1a` is **9.2 : 1** and on `#2a2827` is **7.8 : 1**. **Fails:** inactive tab labels at `rgba(240,238,234,.42)` = **3.7 : 1** (line 25); and `.45` used as *text* for cut/skipped rows (`e.color`, `r.color`) = **4.5 : 1** at 11.5–12.5 px, marginal |
| Meaningful non-text >= 3 : 1 | **Violated** | The session progress pips at `rgba(240,238,234,.18)` measure **1.7 : 1** (line 124). They carry position, which is also in the header text, so the meaning survives — the contrast does not |
| Touch targets >= 44 px | **Violated throughout** | Stepper buttons **38 px wide** (line 32) — *worse than B-43's measured 40 px*. Tab bar ~32 px tall (line 25). Header text-buttons (`DISCARD`, `SETTINGS`, `SAVE`, `‹ BACK`) ~14 px tall. Plan-editor `−` / `+` **16 px**, `✕` **20 px**, day reorder arrows ~13 px. Rest `START` ~30 px. This is the single most widespread violation in the design |
| Nothing important in a top corner | **Violated** | `DISCARD` top-right (C-13, B-34), `SETTINGS` top-right, `SAVE` top-right in the editor |
| Never colour alone | **Mostly honoured** | Verdicts carry a word kicker (`Overload` / `Hold` / `Volume up`); deltas carry a sign. Segmented controls (`.seg button.on`) are fill-only and need `aria-pressed` plus a non-colour mark. Pips are colour-only but duplicated by the `1 / 7` header |
| Live regions, one persistent region outside the re-rendered view | **Not addressed** | Nothing in the design. `#bs-live` already exists and must be reused (B-39's analysis) |
| A per-second display is not a live region | **Not addressed** | Carry: announce transitions only, once each |
| `maximum-scale=1` must go; survive 200 % text | **Not addressed, and at risk** | Frame is a fixed 393 × 852 with `overflow:hidden` and `flex:none`. Fixed widths at 98 / 104 / 120 / 132 / 56 px will crowd out the flexible columns at 200 %. Must be re-authored fluid. B-13 is unfixed and `index.html:6` still carries `maximum-scale=1` |

### `wo-003-session-screen.md` §0.3 — the palette and B-37

| Item | Verdict |
|---|---|
| Design away from `--faint` on `--surface` (2.30 : 1) | **Honoured.** No pair in 2a is that bad; the nearest are `.42` and `.45` and both are fixable by one alpha step |
| Design away from `--red` on `--surface` (2.84 : 1) | **Honoured** — 2a is a mono-signal palette, no red |
| **B-37 — the set row must fit at 400 px with the ghost hint fully visible** | **HONOURED, and this is the design's best single fix.** The ghost moves to its own full-width row *below* the steppers (line 147), `justify-content:space-between`, sharing it with the `EXTRA` flag. The zero-width squeeze is structurally impossible in this layout |
| The ghost hint must meet 4.5 : 1 | **Honoured** — `.note` at 5.4 : 1 |

### `wo-003-session-screen.md` §0.4 — the layout invariant

Required order: name + target → prescription/volume hint → movement & cue (collapsed) → set rows →
**note field** → bottom stack (pain notice → speed flag → verdict slot).

**Partially honoured.** Name+target, `exLast` hint, collapsed movement & cue, set rows and
verdict-last are all in the right order. **Missing: the note field (C-15), the pain notice, the speed
flag.** And the add/remove set controls are new and sit *between* the set rows and the bottom stack —
acceptable, because they are controls rather than inputs, but they must be below every input on the card.

### `wo-003-train-weight.md` §0.1 — non-negotiable behaviour

| # | Requirement | Verdict |
|---|---|---|
| 1 | No single control may add more than one accessory | **Violated** — the FULL VOLUME checkbox (C-1) |
| 2 | A tier-hidden exercise with numbers in the draft still renders and still saves | **Violated** — `visExs()` filters by `includeCut` at both draft-build and render time, so flipping the toggle mid-session drops an exercise that already has numbers in it |
| 3 | A deload reduces the prescription, not the log | **N/A** — no deload anywhere in the design. Rule DL1 and `deloadCheck` have no UI |
| 4 | Exactly one programme-state line, exactly one definition of "week" | **Violated** — `weekLabel` (calendar weeks) plus `testCountdown`, two lines, and the wrong week (C-10) |
| 5 | Before training week 6 the word "deload" appears nowhere | **Honoured** (trivially — it never appears) |
| 6 | No kg/week number or calorie instruction when the rule says there is not enough data | **Violated** — advice fires from 2 entries (C-9) |
| 7 | The 7-day average is labelled with the count of days it used | **Violated** — flat `7-day average` |
| 8 | The calorie-change acknowledgement is hard to set, easy to clear | **N/A — absent.** `setCalChanged` / `clearCalChanged` have no UI |
| 9 | Every offer answerable without scrolling, buttons >= 44 px, never in a top corner | **N/A** (no offers exist) — the 44 px half is violated globally |
| 10 | The safe choice is the cheapest tap | **N/A** (no offers exist) |
| 11 | Ignoring an offer is not declining it | **N/A** (no offers exist) |
| 12 | Nothing destructive without undo or confirmation | **Violated four times** — `DISCARD` (C-13), `− REMOVE` (C-12), `SWITCH TO AN EMPTY LOG` (C-14), and the editor's `✕` delete-exercise |

### `wo-003-train-weight.md` §0.4 — information hierarchy

| Screen | The one question | Verdict |
|---|---|---|
| Train | *What do I do now* | **Honoured, and improved.** The amber next-session block with a full-width `START SESSION` is the strongest answer this app has had. Day list is one thumb below it. Export and storage notes are correctly buried in Settings |
| Weight | *Am I eating right* | **Honoured.** 7-day average at 54 px, then the calorie decision card, then the entry control. Chart correctly dropped below the fold |

---

## Work order

### Milestone 0 — settle identity and the rules before anything renders

**W1 · Adjudicate the design's programme and advice changes — owner: `strength-coach`**

Scope in: the design's plan differs from the coach-verified 42 slots and each difference changes which
rule fires or what the app says. Rule on each.

- **`k` reclassification.** The design marks 9 slots `hyp` that `PROGRAM` marks `power`: `d1c` rack
  chin, `d1f` seated DB shoulder press, `d1g` cambered bar curl, `d1h` skull crusher,
  `d2c` leg extension, `d2e` leg curl, `d2f` standing calf raise, `d2g` seated calf raise. `k` selects
  P1 vs H1 **and** R1's rest row. Which is correct?
- **Exercise alternates dropped.** `d2e` "Glute-ham raise or lying leg curl" → "Lying leg curl";
  `d3d` "DB row or shrug" → "DB row"; and `d1a` is "Bent-over row", which reopens B-28
  ("Bent-over or Pendlay row").
- **Extra sets.** With `+ Add set`, a 3×3–5 can be logged as four sets. Does P1's "all sets hit the top
  of the range" and `workingLoad`'s "min of the first `ex.s` completed sets" include set 4? Does H1's
  tonnage comparison? Rule both, in writing.
- **C-7's silence copy.** What the app says on a user-created plan where SP1, V1, ST1 and D1 have no
  programme data. And: may ST1's week-6 test run at all on a non-PHAT plan?
- **R1 confirmation** for W4: the table is unchanged, but confirm it is computed from the exercise, not
  the day, and confirm behaviour for a user-created exercise.
- **Diet tab numbers**: training 3,200 / 170 / 300 / 145 and rest 2,500 / 175 / 60 / 175, the protein
  check, and the design's carb-placement and calibration copy — approve or correct verbatim.

Scope out: any new rule. Any visual opinion.

Acceptance criteria:

- Every one of the 8 reclassified slots has a written ruling with a confidence tag, and the resulting
  `k` value for each is stated as a table an engineer can transcribe without interpretation.
- The extra-sets question is answered separately for P1 and for H1, each with a worked example using
  four sets on a 3 × 3–5 prescription.
- The C-7 silence copy is delivered as exact strings, and states which of SP1 / V1 / ST1 / D1 may run
  on an unrecognised plan and which may not.
- The Diet copy is returned either approved verbatim or corrected verbatim; no paraphrase.
- **Data criterion:** the ruling explicitly confirms that nothing here changes an exercise `id`, `s`,
  `lo`, `hi` or `cut` value in a way that would re-prescribe logged history, or names each change that
  does and what it costs.

Depends on: —

---

**W2 · Identity, the plan document, and the migration — owner: `backend-engineer`**

Scope in: the data model that everything else is built on.

- Schema **v4**. A plan is a document: `{planId, name, from, days:[{id, name, ex:[{id, n, s, lo, hi,
  k, implement, cut?, lift, cue?}]}]}`. `id` is stable, opaque, generated once, never derived from a
  name, never rewritten by a rename. `lift` is the explicit cross-exercise grouping (C-6) used by the
  Trend tab and by `SPEED_SRC`.
- A session gains `planId`. `dayId` and exercise ids keep their current values — `d1..d5`, `d1a..d5j`
  (C-5). No renumbering reaches storage.
- `PROGRAM` becomes the shipped PHAT plan document with `planId:"phat"`, `readOnly:true`, carrying all
  42 slots with their existing `implement` tags, plus the new `lift` and `cue` fields.
- Migration v3 → v4: additive, idempotent, no value rewritten, v1/v2/v3 all still accepted. It runs on
  its own version constant, not on `logVer < SCHEMA_VERSION` — the near-miss recorded in `decisions.md`
  (Schema 3) must not be repeated.
- Id generation for user-created exercises and days, collision-proof within a plan.
- `PHAT.renameExercise(plan, exId, name)` — a pure function proving a rename touches `n` and nothing else.

Scope out: the Plan Editor UI (W15). Plan-scoped rule metadata (W3). Supabase.

Acceptance criteria:

- **Data criterion 1 (the headline):** seed a v3 store with 6 sessions across all five days; migrate;
  every session's `dayId`, every entry key, every `w` and every `r` is byte-identical afterwards, and
  `PHAT.lastFor`, `PHAT.liftDays`, `PHAT.e1rmByDate` and `PHAT.speedLoad` return identical values
  before and after. Asserted on the serialized JSON, not on a summary.
- **Data criterion 2:** rename `d1a` from "Bent-over row" to "Pendlay row"; every session that logged
  `d1a` still resolves to it; `PHAT.lastFor(sessions,"d1a")` is unchanged; `stallReport` still names it.
  Then rename it back — the log is byte-identical to before either rename.
- **Data criterion 3:** the migration is idempotent — run it three times, the store is byte-identical
  after run 1, 2 and 3.
- Adding a user exercise to a copied plan cannot produce an id that collides with any existing id in
  that plan, asserted over 1,000 generated ids.
- No exercise in any plan document can exist without `k` and `implement`; a test asserts it over the
  shipped plan and over a plan built entirely from the editor's own add path.
- `PHAT.renameExercise` changes exactly one field; a test diffs the whole plan object.
- Two exercises named "Skull crusher" on two different days keep separate histories, and a test asserts
  `lastFor("d1h")` and `lastFor("d5i")` return different entries.

Depends on: — (runs in parallel with W1)

---

**W3 · Plan-scoped rule metadata and off-plan silence — owner: `backend-engineer`, copy from `strength-coach`**

Scope in: move the four programme-specific tables out of `logic.js`'s hard-coded constants and into the
plan document, and define what happens without them.

- `SPEED_SRC`, `REINTRO_ORDER`, `KEY_LIFTS` and the weeks-1–4 block become fields on the plan document.
  The shipped PHAT plan declares them with exactly today's values; a copied plan inherits them; an
  edited plan keeps whichever survive its edits; an empty plan declares none.
- Each of SP1, V1, ST1, D1 and `cycleLine` gains a defined **absent** state that returns a reason and
  W1's copy, never a guess. Fail silent, never fail confident.
- Edit-time reconciliation: deleting an exercise that a plan-scoped table references must not leave a
  dangling id. Define the rule (drop the reference, keep the rest) and prove it.

Scope out: the UI for any of these states (W7, W9). New rules.

Acceptance criteria:

- With the shipped PHAT plan, `speedLoad`, `volumeTier`, `stallReport`, `deloadCheck` and `cycleLine`
  return **identical output** to `wo-003-advice` HEAD for the full existing fixture set. The whole
  347-test suite passes unchanged before a single new test is added.
- On a plan built from empty with three exercises: none of the five throws, each returns its named
  absent state, and the returned copy is character-identical to W1's strings.
- Deleting `d1a` from a copy of PHAT: `SPEED_SRC` no longer references it, `speedLoad("d3a")` returns
  the absent state with a reason, and no other plan-scoped table is affected.
- No function in `logic.js` reads a hard-coded `"d1a"`-style literal outside the shipped plan document;
  a grep-based test asserts it.
- **Data criterion:** none of these functions writes anything. A test freezes the sessions array and
  the plan document and asserts no mutation after calling all five.

Depends on: W1 (copy, and the ST1-on-a-foreign-plan ruling), W2 (the document shape)

---

**W4 · Two missing engines: R1 rest, and S1's notice — owner: `backend-engineer`, rules from `strength-coach`**

Scope in: the two engines the session screen needs that were never built.

- **`PHAT.restTarget(ex)` → `{ready, cap, hard}`** implementing coach-audit §6's table from `ex.k` and
  `ex.hi`, plus **`PHAT.restText(ex, elapsedSeconds)`** returning the exact §6 copy for every state:
  counting, ready, past cap (power/hyp), past cap (speed), past 2× cap. Pure; takes elapsed seconds so
  the caller owns the clock and can compute it from an **absolute timestamp**.
- **`PHAT.painState(sessions, exId)`** — WO-003 W16, never built. Whether the most recent logged entry
  for that exercise carried a matching note, so the notice persists across sessions until a later
  session logs that exercise with no match. Reuses `PHAT.painWindow`; does not write a second window.

Scope out: rendering (W7). Any assessment, grading, substitution or severity judgement in S1's copy —
the rule is the refusal.

Acceptance criteria:

- Squat (`power`, `hi` 5): `restTarget` → `{ready:150, cap:180}`. At 72 s `restText` is
  `Rest 1:12 · go at 2:30`; at 150 s, `Ready.`; at 200 s, `3:20. You are past the rest window. Go.`
- Cambered bar curl (`power`, `hi` 10) → ready **120**, not 150. Lateral raise (`hyp`, `hi` 20) → ready
  **60**, cap 120. Row speed work at 130 s → `2:10. Too long for speed work. Go now or drop the weight.`
- Past 2× cap → `Rest over.` and the function reports the stopped state, so the caller can stop ticking.
- A user-created exercise with `k:"hyp"`, `hi:15` returns ready 60 / cap 120 with no special-casing.
- `painState`: note `left knee pain on set 2` with `120×5/5/5` on a 3 × 3–5 → the hold verdict plus,
  verbatim, `You logged pain on this. Not something this app can assess.` and `Holding the weight. If
  it is sharp, or it repeats, stop the exercise and see a physio or a doctor.` `no pain today, felt
  strong` produces the same notice (accepted false positive, on the record). `RIR 1, good bar path`
  produces none. A later session on that exercise with no match clears it; a session on a different
  exercise does not.
- The S1 output contains no substitute exercise, no stretch, no rep-range advice and no severity word,
  asserted against the exact fixed string with no interpolation.
- **Data criterion:** neither function reads or writes storage, and neither mutates its arguments —
  a frozen-input test.

Depends on: W1 (R1 confirmation and the user-created-exercise case)

---

**W5 · UX spec for the nine screens on the new language — owner: `ux-designer`**

Scope in: one spec, in the two-weights format the WO-003 specs established (Normative vs `[REF]`), for
onboarding, Train/Home, Session, Summary, Trend, Weight, Diet, Plans and Plan Editor. It must resolve,
concretely:

- Where the four missing slots go on the session card: **note field** (C-15), pain notice, speed flag,
  and a **verdict slot that is occupied before a verdict exists** (§0.1 #2 and #3), plus the exact
  deliberate-silence copy for the pre-`ex.s` state.
- Where the **refusal** state lives — blocked save, malformed set, storage failure — and how it is
  visually distinct from advice (§0.1 #6). The design has none; the app cannot ship without it.
- The V1 reintroduction offer and the D1 deload banner, both absent from the design, both with the
  `Not yet`-is-the-cheapest-tap rule and the ignoring-is-not-declining rule intact.
- The calorie-change acknowledgement (`setCalChanged` / `clearCalChanged`) on the Weight screen.
- Add-set / remove-set, including C-12's confirmation and undo, and the `EXTRA` marking.
- Discard's new home outside the header (C-13).
- Prefill vs ghost: the prototype **prefills** last session's weight into the input *and* shows the
  ghost hint. Prefill is a real ergonomic win and the number is on screen before it is saved. Rule it
  either way, but if prefilled, an untouched prefilled value must be visually distinguishable from a
  typed one until it is committed.
- The 44 px floor applied to every control the design introduces, with the pips and inactive tab
  labels raised above their contrast floors.
- Fluid layout: every fixed px width in the prototype re-authored to survive 400 px and 200 % text.

Scope out: writing CSS. Any coaching copy — that is W1's.

Acceptance criteria:

- Every screen has an explicit **empty**, **absent-data**, **error/refusal** and **populated** state.
  No screen has a state the spec does not name.
- Every string that is not from `coach-audit.md` is marked NEW and routed to `strength-coach` if it
  makes any claim about training.
- The spec opens with its own "what this must still honour" list, carrying forward both WO-003 lists
  plus every item this audit marked Violated.
- Every interactive element in the spec states a target size, and none is below 44 px.
- Contrast is stated as a measured ratio for every foreground/background pair used, not eyeballed.
- **Data criterion:** the spec names, for each screen, what is at risk if that screen throws mid-render,
  and requires that a thrown rule costs a card and never a number.

Depends on: W1, W2 (the Plan Editor cannot be specified without the document shape)

---

### Milestone 1 — the app logs a set on the new design

**W6 · Visual foundation and the accessibility floor — owner: `frontend-engineer` with `ux-designer`**

Scope in: the shell everything else renders into. 2a palette as `:root` tokens (`--bg #1c1b1a`,
`--surface #2a2827`, `--bone #f0eeea`, `--amber #f5b32b` plus the alpha steps, all named, no hex
outside `:root`). Archivo from the DS with a system fallback stack, 0 radius, 2 px section rules,
flush-left labels. Five-tab dock. And the carried-forward defects that are cheapest to kill here:
**B-13** (`maximum-scale=1` removed, labels on every input, accessible names on every glyph button,
one persistent `aria-live` region outside the re-rendered view), **B-43 / §3.6** (44 px floor),
**B-44 + B-35** (one month-name source of truth — `PHAT.dayMon`'s fixed table — routed through by both
formatters so `Sep` never renders as `Sept`), **B-14** (year in the date format past 12 months),
**B-15** (unique SVG marker ids), **B-36** (the fixed dock re-checked with a software keyboard up).

Scope out: any screen's content. Any rule.

Acceptance criteria:

- At a true 400 px viewport, no horizontal scrollbar on any of the nine screens, measured.
- At 200 % text zoom, no content is clipped or overlapped on any screen, measured.
- Every interactive element measures >= 44 × 44 px, measured on the **width** as well as the height —
  B-43 exists because only the height was ever checked. A test enumerates them.
- Every foreground/background pair used for text measures >= 4.5 : 1 and every meaning-carrying non-text
  element >= 3 : 1, listed with computed ratios. The session pips and the inactive tab labels are named
  explicitly and both pass.
- Greyscale the whole app: every state still reads from its words alone.
- `maximum-scale=1` is gone from `index.html:6`; pinch-zoom works on a real device.
- No date anywhere in the app renders `Sept`; a test asserts both formatters against the same table.
- One `aria-live` region exists, lives outside the re-rendered view, and a test asserts `render()` does
  not recreate it.
- **Data criterion:** this item touches no storage path. A test asserts `phat:v1:log`, `phat:v1:bw` and
  `phat:v1:draft` are byte-identical before and after loading the new shell.

Depends on: W5

---

**W7 · The session screen — owner: `frontend-engineer`**

The largest item and the only screen that logs a set. Scope in: one exercise per screen with pips and
prev/next; the set rows with the ghost hint on its own row (B-37); add/remove set with `EXTRA` marking
and C-12's confirmation+undo; the note field (C-15); the collapsed movement & cue; the bottom stack
(pain notice → speed flag → verdict slot, always occupied); the rest dock; Discard out of the header
with its confirmation (C-13); the V1 reintroduction offer.

**Every advice string comes from `logic.js`.** `PHAT.verdict` (with `deload`), `PHAT.speedLoad`,
`PHAT.speedTooHeavy`, `PHAT.speedFlagText`, `PHAT.painState`, `PHAT.restTarget`/`restText`,
`PHAT.volumeTier` and its `acceptReintro`/`declineReintro`. No sentence is assembled in the view.

Scope out: Summary (W8). The plan editor (W15). Fixing B-19 generally.

Acceptance criteria:

- **Data criterion 1 — the draft survives everything.** With three sets entered across two exercises
  and a note typed, reload the page: the draft is offered back with all three sets, both exercises,
  the note, **and the current exercise index** intact; declining it discards the draft and the log is
  unchanged. Then repeat with a hard tab kill instead of a reload.
- **Data criterion 2 — remove-set cannot eat a number.** Enter `120 × 5` in set 3 of 3, tap `− REMOVE`:
  a confirmation names the set and its numbers; cancelling leaves it untouched; confirming removes it
  and an undo restores it byte-identically. With set 3 blank, `− REMOVE` removes it silently and
  immediately. Asserted against `phat:v1:draft` on disk, not against the screen.
- **Data criterion 3 — the timer is never in the save path.** With the rest timer running, type
  continuously into a weight field for 10 s: `document.activeElement` is unchanged, the card's DOM node
  identity is unchanged, and the typed value is in `phat:v1:draft` within 400 ms of the last keystroke.
  Tapping Save writes the session with the timer running.
- The timer stores an **absolute timestamp**: background the tab for 3 minutes and return, the elapsed
  time matches the wall clock. Asserted against the clock, not a tick count.
- The verdict slot occupies the same height before and after a verdict arrives — measured `offsetHeight`
  of the card, identical. Below `ex.s` completed sets the slot shows the deliberate-silence line.
- The verdict gate is `completedSets >= ex.s` against the **prescription**: on a 3 × 3–5, remove two
  sets, complete the remaining one — **no verdict** (C-11).
- `100 / 100 / 95` at `5 / 5 / 5` on a 3 × 3–5 never recommends 102.5 kg (B-08).
- A `0 × 10` rack chin renders `Stay at bodyweight until all 2 sets reach 10 reps.` and no rule anywhere
  produces the string `0 kg` (B-32).
- Rule I2's increment line renders as a **second line**, never appended to the verdict sentence.
- A rule that throws is caught per card: the card renders, the sets are untouched, Save works. Forced
  with an injected throw in each of the six advice calls, one at a time.
- Adding a 4th set to a 3 × 3–5 marks it `EXTRA`, counts it in volume, and does **not** change the
  target line. P1/H1's treatment of it matches W1's ruling exactly.
- The V1 offer adds **one** accessory, `Not yet` is the closer tap, ignoring it re-offers next session,
  declining it starts a 7-day cooldown. An exercise the tier hides but that has numbers in the draft
  still renders and still saves.
- At 400 px the ghost hint is fully visible on every row, measured, at >= 4.5 : 1.
- Nothing that appears or resizes sits above an input.

Depends on: W2, W3, W4, W6

---

**W8 · The Summary screen and the save path — owner: `frontend-engineer` + `backend-engineer`**

Scope in: the between-session summary — sets, volume, extra sets, per-exercise verdict rows — and
`SAVE SESSION` as the single commit point.

Scope out: any new rule. The Trend tab.

Acceptance criteria:

- **Data criterion 1:** the summary is a **read** of the draft. Reaching it, leaving it and returning
  changes nothing on disk — `phat:v1:draft` is byte-identical throughout.
- **Data criterion 2:** if the draft contains a malformed set, Save is refused with the refusal state
  from W5, the offending set is named, **nothing is saved**, and the draft is untouched. This is B-02's
  guarantee and it must be reachable from this screen.
- **Data criterion 3:** on a successful save, the session appears in the log with every set including
  extras, the notes preserved byte-identically, and the draft is cleared only after the log write is
  confirmed. Kill the tab between the two and the draft is still there.
- The exercise count follows Decision 7: an exercise counts when it has >= 1 completed set; a notes-only
  entry is shown separately (`5 exercises · 1 note`), never hidden and never deleted (B-33).
- Per-exercise verdicts come from `PHAT.verdict`, verbatim, and an unlogged exercise reads as skipped
  rather than as a verdict.
- The volume figure includes extra sets and the target counts do not change.

Depends on: W7

---

**W9 · Train / Home and onboarding — owner: `frontend-engineer`**

Scope in: the next-session block with `START SESSION`, the day list with weekday labels (B-31), the
single programme-state line from `PHAT.cycleLine` (C-10), the D1 deload banner, the macro summary row,
and the first-run onboarding screen. The `LOAD SIX WEEKS OF SAMPLE DATA` control renders here but its
data path is W13.

Scope out: Settings (W13). The Diet tab (W12).

Acceptance criteria:

- Exactly **one** programme-state line, from `PHAT.cycleLine`, at all times. The week-6 countdown does
  not appear beside it.
- Where training weeks and calendar weeks differ, both numbers are shown:
  `Week 5 by the calendar, week 3 of real training. Reduced volume holds.`
- Before training week 6 the word "deload" appears nowhere in the app, asserted by a text search of the
  rendered DOM across every screen at `trainingWeeks` 0–5.
- The deload banner from `PHAT.deloadCheck` renders when it fires, is answerable without scrolling, its
  buttons are >= 44 px and not in a top corner, and `Not now` is the closer tap.
- The day list is reachable without scrolling on a 393 × 852 viewport; nothing above it pushes it off
  the first screenful.
- **Data criterion:** `START SESSION` on a day that already has an unsaved draft does not overwrite it —
  it offers the existing draft. Verified against `phat:v1:draft` on disk.
- Onboarding appears only when the log and the bodyweight store are both genuinely absent, never when a
  read *failed* — the two must not look the same (WO-001's `readRaw` distinction). With storage
  blocked, the storage notice wins over the onboarding screen (B-40's ordering rule).

Depends on: W2, W3, W6

---

### Milestone 2 — the remaining tabs

**W10 · Trend — owner: `frontend-engineer`**

Scope in: the week-6 test card from `PHAT.stallReport`, four per-lift sparklines with deltas, the
corrected lift labels (B-27: `DB press`, `SLDL`), the empty state.

Scope out: the combined multi-lift chart (see Needs from Chady). B-11 stays open unless picked up here.

Acceptance criteria:

- The week-6 test card is `PHAT.stallReport`'s output verbatim; nothing is recomputed in the view.
- Week 1 `100×3/3/3` → week 6 `100×5/5/5` produces **no** stall warning (B-07).
- Sparklines are grouped by `lift`, not by name, and a renamed exercise stays on its own line (C-6).
- Deltas carry a sign as well as a colour.
- The empty state names why it is empty and what unlocks it.
- Labels read `DB press` and `SLDL`, not `Bench` and `Deadlift` (B-27).
- At 200 % text the sparkline does not crowd the lift name out; the chart yields before the label does.
- **Data criterion:** this screen is read-only. A test asserts no storage key changes across a full
  render at every data volume from 0 to 200 sessions.

Depends on: W3, W6

---

**W11 · Weight — owner: `frontend-engineer`**

Scope in: the 7-day average with its **day count label**, the calorie decision from
`PHAT.calorieAdvice`, the entry stepper and log/update, the last-7 list, and the calorie-change
acknowledgement (`setCalChanged` / `clearCalChanged`). C-9 in full.

Acceptance criteria:

- The average is labelled with the days it used: `7-day average (6 of 7 days)`.
- 8 entries spread over 24 days shows **no** rate and **no** advice, with the insufficient-data copy
  (B-06's acceptance criterion, carried forward).
- Every band renders `PHAT.calorieAdvice`'s copy verbatim, including the trailing `Recheck in 7 days.`
  the WO-003 text truncated.
- The kg/week number is not coloured by whether it is good; the sentence is the carrier.
- The acknowledgement takes a confirmation to set and one tap to clear (§0.1 #8), and both are announced
  through the persistent live region.
- **Data criterion:** logging bodyweight twice on the same local calendar date updates one row and never
  creates two (B-03's guarantee). Verified at 23:59 and 00:01 local with the machine clock in a non-UTC
  zone.

Depends on: W6

---

**W12 · Diet — owner: `frontend-engineer`, copy signed off in W1**

Scope in: training/rest segmented targets, the four macro cells, the protein check, carb-placement and
calibration copy. Closes B-29.

Acceptance criteria:

- The numbers and every sentence match W1's returned copy character for character.
- The segmented control carries `aria-pressed` and a non-colour selected mark.
- The protein check's state persists across a reload and is never confused with a logged number — it is
  a checkbox, not data the engines read. A test asserts no engine reads it.
- **Data criterion:** toggling the protein check writes only its own key; `phat:v1:log`, `phat:v1:bw`
  and `phat:v1:draft` are byte-identical before and after.

Depends on: W1, W6

---

**W13 · Settings and the sample-data sandbox — owner: `frontend-engineer` + `release-engineer`**

Scope in: Settings with the Volume section **deleted** (C-1) and the Weight-increment section
**deleted** (C-3); rest-timer auto/manual; export; and the demo-mode sandbox from C-14.

Scope out: import (WO-002, B-04).

Acceptance criteria:

- Neither a volume toggle nor a weight-increment control exists anywhere in the DOM in any state; a test
  greps the rendered output of all nine screens.
- **Data criterion 1:** entering demo mode writes zero bytes to `phat:v1:log` and `phat:v1:bw`. Leaving
  demo mode restores them byte-identically. Asserted on the serialized JSON.
- **Data criterion 2:** every sample session carries `demo:true`, and a test asserts no engine is ever
  called with a mixed real+demo sessions array.
- **Data criterion 3:** no control in the app empties the real log without a **typed** confirmation. A
  test enumerates every button on every screen and asserts none of them reduces the log's length.
- Demo mode is visible on every screen while it is on, not just in Settings.
- Auto-start rest fires on **commit** (blur or stepper tap), never on keystroke — typing `1` of `12`
  does not start the timer.
- Export's success and failure are both visible states, and its failure does not look like success
  (B-16's analysis, even though the fallback itself is WO-002).

Depends on: W6, W7

---

### Milestone 3 — new capability

**W14 · Plans list — owner: `frontend-engineer`**

Scope in: the plans list, active-plan badge, duplicate, and `+ Build from empty`. Switching the active
plan.

Acceptance criteria:

- **Data criterion:** switching the active plan changes no logged session. Sessions logged under plan A
  still resolve their exercise names, still appear in Trend, and `lastFor` still finds them. Verified by
  logging under PHAT, switching to a copy, switching back, and diffing the log JSON.
- A session logged under a plan that is later deleted still renders with real names, never with raw ids
  and never blank. State what it renders and test it.
- Duplicating PHAT produces a plan whose ids are **new** and whose history is therefore separate, and
  the UI says so before the duplicate is created.
- The design's honest note ships verbatim: *"Editing the plan is the easiest thing in this app to do
  instead of training."*

Depends on: W2, W3, W6

---

**W15 · Plan Editor — owner: `frontend-engineer` + `backend-engineer`**

The largest new-scope item, and the one I would ship last. Scope in: rename plan, reorder days, rename
day, rename/delete exercises, change set counts, add exercises (with W1's required `k` and `implement`),
add days, build from empty.

Acceptance criteria:

- **Data criterion 1 (the headline):** rename every exercise in the plan, reorder every day, then open
  Trend and the session screen. Every logged session still resolves; `lastFor`, `stallReport`,
  `speedLoad`, `e1rmByDate` and `liftDays` return identical values to before the edits. Asserted by
  snapshotting all five before and after.
- **Data criterion 2:** deleting an exercise that has logged history requires a confirmation naming the
  number of sessions affected, is undoable, and **does not delete the history** — the sessions keep
  their entries and remain visible in Trend.
- **Data criterion 3:** an edit session that is abandoned mid-way (reload, kill) leaves the stored plan
  in its last saved state, never half-applied. The editor works on a copy and commits atomically.
- Every editor control is >= 44 px — the prototype's are 13–20 px and this is where the violation is
  worst.
- Adding an exercise requires `k` and `implement` and cannot produce an untyped exercise by any path.
- Deleting an exercise referenced by a plan-scoped table (W3) drops the reference cleanly and the
  affected rule goes to its named absent state, with W1's copy.
- Reordering days changes display order only; no `dayId` changes.

Depends on: W2, W3, W5, W14

---

### Always last

**W16 · QA — owner: `qa-engineer`**

Scope in: walk every acceptance criterion in W1–W15 at a true 400 px with the network off and at 200 %
text. Then attack it: the four destructive controls, the demo/real boundary, the rename/reorder paths,
the draft across reload and force-kill, storage full, storage blocked.

Acceptance criteria:

- Every criterion marked pass or fail with the **observed** behaviour, not a summary.
- The suite is green with **zero** expected failures — the two meta-tests stay in force.
- Every one of the 347 existing tests still passes, or each change is justified against a decision.
- New regression tests for: C-5/C-6 (identity), C-11 (verdict gate), C-12 (remove-set), C-14 (demo
  boundary), C-15 (the note field), and the 44 px and contrast floors.
- The manual checklist is extended with anything only a phone can answer — the fixed dock with the
  keyboard up (B-36) at minimum — and nothing is retired without citing what was observed.

Depends on: everything

**W17 · Release — owner: `release-engineer`**

Scope in: branch `wo-004-redesign`, merge on QA pass, deploy. And the thing that keeps biting: git-link
Vercel (E-2) so a multi-file release stops being a manual upload that can half-fail. This redesign will
touch all three files at once, and a partial upload is a black screen.

Acceptance criteria:

- Vercel deploys from `main` on push; verified by pushing a trivial change and observing the deploy.
- `/logic.js` fetches 200 with `application/javascript` and real content after the deploy.
- `/tests.html` is deployed and runnable from the phone.
- **Data criterion:** an export taken on the pre-redesign build imports cleanly on the post-redesign
  build, or — if WO-002's importer does not exist yet — the export file's shape is documented and a
  migration path is written down before the merge, not after.

Depends on: W16

---

## Sequence

```
W1 (coach) ─┐
            ├─> W3 (plan-scoped rules) ─┐
W2 (identity)┘                          │
     │                                  │
     ├─> W4 (R1 + S1 engines) ──────────┤
     │                                  │
     └─> W5 (UX spec) ──> W6 (foundation)┤
                                        │
                    ┌───────────────────┴──> W7 (session) ──> W8 (summary)
                    │                                    └──> W13 (settings/demo)
                    ├──> W9  (train + onboarding)
                    ├──> W10 (trend)          [parallel]
                    ├──> W11 (weight)         [parallel]
                    ├──> W12 (diet)           [parallel]
                    └──> W14 (plans) ──> W15 (plan editor)

                                   all ──> W16 (QA) ──> W17 (release)
```

**Parallel now:** W1 and W2. Different agents, different artefacts, no shared file.
**Then:** W3 and W4 (both backend, sequential in one agent) alongside W5 (ux).
**Then:** W6 alone — everything downstream renders into it.
**Then:** W7 is the critical path. W9, W10, W11, W12 are genuinely independent of each other and of W7
and can be dispatched together once W6 lands.
**Last:** W14 → W15, then W16 → W17.

**Milestones, and where to stop if time runs out.** M0 (W1–W5) is not optional — it is the identity
decision and it is free today and expensive in six weeks. M1 (W6–W9) is a **shippable app**: the new
design, the session screen, the summary, the home screen, with all nine engines wired. If nothing else
ships, that is the release. M2 (W10–W13) completes the tabs. M3 (W14–W15) is new capability and is the
first thing to cut.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **The rest timer re-renders the session view every second (B-19).** The prototype ticks by `setState`. In this app that is `innerHTML` on the whole view, once a second, while his thumb is in a weight field. The caret dies every second | **Highest.** This is the way to make the app worse while improving it | W7's data criterion 3 asserts `activeElement` and DOM node identity across 10 s of typing with the timer running. The timer gets one narrow `textContent` channel and is forbidden from calling `render()`. If that seam is not clean, the timer is cut — it is a comfort feature and it cannot cost a number |
| **Identity migration invalidates stored history.** Day renumbering or name-derived keys would orphan every logged session and silently re-point `SPEED_SRC` and `REINTRO_ORDER` | **Highest** | C-5 and C-6 rule both out. W2's three data criteria assert byte-identity on the serialized JSON. **The log is empty today — do W2 now** |
| **Migration needed:** v3 → v4 for the plan document and `planId` on sessions | High | W2. Additive, idempotent, gated on its own version constant — never on `logVer < SCHEMA_VERSION`, which is the near-miss already recorded under Schema 3 |
| **WO-002's importer now has a third schema to accept.** It was already obliged to take 2 and 3 | Medium | Recorded here and in the backlog against B-04: the importer must accept **2, 3 and 4** |
| **The Plan Editor makes the coach's verification void.** All 42 slots were checked against the brief. An editable plan means the app cannot assume it is running PHAT | High | W3's absent states and W1's silence copy. The app stops claiming a programme it is not running |
| **Nine screens is a rewrite of `index.html`, not an edit.** ~1,600 lines replaced by ~9 view functions in a session where B-19 is still open | High | Milestones. M1 is shippable on its own. `main` stays deployable; work on `wo-004-redesign` |
| **The 347-test suite is coupled to today's DOM.** Some frontend assertions will break on contact | Medium | W3's first criterion: the engine tests must pass **unchanged** before any new test is written. A broken engine test is a bug; a broken DOM test is a rewrite with a stated reason |
| **Losing the movement figures is invisible until he is in the gym** with an exercise he does not know | Medium | C-8, escalated. Recommendation on the record: keep the artwork, adopt the design's 42 cues |
| **Demo data leaks into real advice.** 30 fabricated sessions would drive a stall report and a deload trigger | High | C-14's three-part ruling. W13's data criteria 1 and 2 |
| **Five tabs at 393 px is 78 px each** with 9 px labels, currently ~32 px tall | Medium | W6's 44 px floor and 200 % zoom criteria. If five tabs cannot clear it, Diet folds back into Weight — flagged to Chady rather than silently shrunk |
| **B-05 (no edit or delete of a saved session) is now worse.** Nine engines read that history confidently, and the Plan Editor lets him reinterpret it | Medium | Not in scope here. Raised: it should be the next work order after this one, ahead of WO-002 |

---

## Needs from Chady

Six decisions. The first three change the work; the last three change the schedule.

1. **The movement illustrations (C-8).** Keep the 15 hand-built SVG patterns, recoloured to 2a, and
   adopt the design's 42 per-exercise cues? Or ship the labelled placeholders? **My recommendation:
   keep the artwork.** Losing a working feature for a placeholder with no owner for the replacement is
   a regression, and the port is cheap.
2. **Does the design's plan replace the programme?** It reclassifies 8 exercises from `power` to `hyp`
   — which changes which rule fires and which rest applies — and drops two exercise alternates
   ("Glute-ham raise or lying leg curl" → "Lying leg curl", "DB row or shrug" → "DB row"), while
   reopening B-28 ("Bent-over row" for "Bent-over or Pendlay row"). **My recommendation: no.** The
   prototype's plan is a mock-up, not a programme revision; keep the coach-verified 42 slots. But
   `strength-coach` adjudicates in W1 and the call is yours.
3. **Trend: four sparklines, or the combined multi-lift chart?** The design offers both and asks. **My
   recommendation: the four sparklines**, and keep B-11 (points spaced by index, not by date) open —
   the sparklines have the same defect and it matters more on a combined chart.
4. **Build the Plan Editor now (W14–W15), or defer it to WO-005?** It is the largest new-scope item,
   it forces W3's whole plan-scoped-rules design, and the design's own copy warns it is *"the easiest
   thing in this app to do instead of training."* **My recommendation: defer W15.** Ship M0+M1+M2.
   W2's identity work still happens now regardless — that is what makes the editor cheap later.
5. **Diet as a fifth tab, or a panel on the Weight screen?** B-29 specified a panel. Five tabs at
   393 px is 78 px each and the design's tabs are currently ~32 px tall against a 44 px floor. **My
   recommendation: the fifth tab**, and W6 proves it clears 44 px before W12 starts. If it cannot, it
   folds back into Weight.
6. **Does WO-002 (export/import round trip) come before or after this?** The design's `exportJson` is
   an empty stub and Settings has no import. Right now the log is empty so there is nothing to lose;
   after M1 ships there will be. **My recommendation: after M1, before M2.** The moment he logs his
   first real session, an export he cannot re-import is a decoration.

**Not a decision, but on the record.** M1 alone — W6, W7, W8, W9 — gives you the new design on the
only screen that logs a set, with all nine engines wired. Everything after it improves an app that is
already being used. Everything before it is required by it. If the choice is between finishing this
work order and logging six sessions, log the six sessions.

---

## Dispatch list (for the main session)

Dispatch 1 and 2 **together** — different agents, different files, no overlap.

1. **`strength-coach` → W1.** Adjudicate the design's programme and advice changes. Read
   `docs/design/PHAT App.dc.html` lines 456–506 (the plan) and 601–619 (the prototype's verdict), then
   `index.html:226-276` (`PROGRAM`, `KEY_LIFTS`) and `docs/coach-audit.md` §5–§7. Deliver: (a) a
   transcribable table giving the correct `k` for the 9 slots the design reclassifies from `power` to
   `hyp`; (b) rulings on the three dropped exercise alternates including B-28; (c) separate rulings for
   P1 and for H1 on whether a 4th "extra" set counts, each with a worked example; (d) exact silence copy
   for SP1, V1, ST1 and D1 on a user-created plan, and whether ST1's week-6 test may run on a non-PHAT
   plan at all; (e) confirmation that R1 is computed per exercise, not per day, plus the user-created-
   exercise case; (f) the Diet tab's numbers and copy, approved or corrected verbatim. Do not write
   code. Do not offer a visual opinion. Tag confidence on every claim.

2. **`backend-engineer` → W2.** Identity, the plan document and the v3 → v4 migration, on branch
   `wo-004-redesign`. Non-negotiable and already ruled: exercise ids are stable and opaque, never
   derived from a name and never rewritten by a rename (WO-004 C-6); stored `dayId` stays `d1..d5` and
   exercise ids stay `d1a..d5j` (C-5); a new `lift` field carries the cross-exercise trend grouping the
   design wanted. `logic.js` has `d1..d5` compiled into `REINTRO_ORDER` (line 2088), `SPEED_SRC` (line
   1898) and `KEY_LIFTS` — that is why renumbering is refused. Gate the migration on its own version
   constant, never on `logVer < SCHEMA_VERSION` (see `decisions.md`, "Schema 3"). The log is empty
   today, which is the only reason this is cheap; treat it as urgent. Meet all seven acceptance
   criteria in WO-004 W2, asserting on serialized JSON.

3. **`backend-engineer` → W3, then W4** (sequential, same agent). W3: move `SPEED_SRC`,
   `REINTRO_ORDER`, `KEY_LIFTS` and the weeks-1–4 block into the plan document and give SP1, V1, ST1,
   D1 and `cycleLine` a named absent state using W1's copy — fail silent, never fail confident. The
   full existing 347-test suite must pass unchanged before you add a test. W4: build the two engines
   that were never built — `PHAT.restTarget` / `restText` from coach-audit §6's table (per exercise,
   from `ex.k` and `ex.hi`, taking elapsed seconds so the caller owns an absolute timestamp) and
   `PHAT.painState` (WO-003 W16). Pure, DOM-free, callable from `file://`.

4. **`ux-designer` → W5.** One spec for nine screens, in the Normative / `[REF]` format of the two
   WO-003 specs. Four things the design is missing and cannot ship without: the **note field** (it is
   Rule S1's only input and `validateDraft` keeps notes-only entries), a **verdict slot that is
   occupied before a verdict exists** plus the deliberate-silence copy, a **refusal state** distinct
   from advice (the design has none, so B-02's blocked save has nowhere to render), and the **V1 offer
   / D1 banner / calorie acknowledgement**, all absent. Also rule prefill-vs-ghost, re-home Discard out
   of the top-right corner (B-34), and apply the 44 px floor to every control the design introduces —
   its steppers are 38 px wide, worse than B-43's measured 40. Read WO-004's audit table first; every
   row marked Violated is yours to resolve.

5. **`frontend-engineer` → W6.** The shell: 2a tokens in `:root`, Archivo, 0 radius, 2 px rules, the
   five-tab dock, and the accessibility floor — 44 px measured on **width** as well as height,
   >= 4.5 : 1 text and >= 3 : 1 meaningful non-text (the session pips at `.18` are 1.7 : 1 and the
   inactive tab labels at `.42` are 3.7 : 1 — both must pass), `maximum-scale=1` removed, one
   persistent `aria-live` region outside the re-rendered view, one month-name source so `Sep` never
   renders as `Sept` (B-44 + B-35). No screen content. Prove 400 px and 200 % zoom by measurement.

6. **`frontend-engineer` → W7.** The session screen. Every advice string comes from `logic.js` — do not
   assemble a sentence in the view, and discard the prototype's `verdict()` entirely. The gate is
   `completedSets >= ex.s` against the **prescription**, never `min(ex.s, sets.length)` (the prototype's
   version reopens B-24 through remove-set). `− REMOVE` may not destroy a typed number without a
   confirmation and an undo. The rest timer stores an absolute timestamp and updates through one narrow
   `textContent` channel that never calls `render()` — if that seam is not clean, cut the timer rather
   than the caret. Meet all data criteria in WO-004 W7 against `phat:v1:draft` on disk, not against the
   screen.

7. **`frontend-engineer` → W8** (after W7). Summary and the save path. The summary is a **read**;
   `SAVE SESSION` is the only commit. A malformed set refuses the save, names the set, saves nothing and
   leaves the draft untouched — B-02's guarantee, reachable from this screen.

8. **`frontend-engineer` → W9, W10, W11, W12** (dispatch together once W6 lands; they do not touch each
   other). W9 Train + onboarding: exactly one programme-state line from `PHAT.cycleLine`, both week
   numbers shown when they differ, no "deload" before training week 6, and onboarding must never appear
   because a storage *read failed*. W10 Trend: `stallReport` verbatim, four sparklines grouped by
   `lift`, labels `DB press` and `SLDL` (B-27). W11 Weight: `PHAT.calorieAdvice` verbatim with the
   `(6 of 7 days)` label and the insufficient-data state — the prototype's own band logic is B-06 and is
   discarded. W12 Diet: W1's approved copy, character for character.

9. **`frontend-engineer` + `release-engineer` → W13.** Settings with the Volume section and the
   Weight-increment section **deleted** — both were ruled against (WO-004 C-1, C-3) — plus the demo-mode
   sandbox: sample data lives in its own store, carries `demo:true`, never touches the real log, and no
   control anywhere empties the real log without a typed confirmation.

10. **`frontend-engineer` + `backend-engineer` → W14, then W15** — **only if Chady says build the Plan
    Editor now.** My recommendation is to defer W15 to WO-005; W2's identity work is what makes it
    cheap later, and it happens regardless.

11. **`qa-engineer` → W16.** Always last. Walk every criterion at a true 400 px with the network off and
    at 200 % text, then attack the four destructive controls, the demo/real boundary, the rename and
    reorder paths, and the draft across reload and force-kill. Zero expected failures; the two
    meta-tests stay in force.

12. **`release-engineer` → W17.** Merge on QA pass. Git-link Vercel first (E-2) — this release touches
    all three files at once and a partial manual upload is the black-screen failure mode.
