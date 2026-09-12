# WO-004 · W5 — UX spec: the nine screens on the new visual language

Author: `ux-designer` · Date: 2026-09-10 · Status: ready for `frontend-engineer`
**Amended 2026-09-11 (WO-005).** Three questions that blocked real fixes are ruled: the invisible
calorie hold (§7.5.1), the figures' pose convention (§11.2, §11.3, §11.5, §11.8) and the
advice-enclosure colour (§2.1.1). Every amendment is listed in **§17**, which is the section to read
if you only want what changed tonight.
Implements: WO-004 §W5 · Consumed by: W6 (foundation), W7 (session), W8 (summary), W9 (train +
onboarding), W10 (trend), W11 (weight), W12 (diet), W13 (settings + demo), W14 (plans), W15 (editor)
Reads: `docs/design/PHAT App.dc.html`, `docs/design/_ds/modernist-…/styles.css`,
`docs/specs/wo-003-session-screen.md`, `docs/specs/wo-003-train-weight.md`,
`docs/specs/WO-001-W4-draft-restore-and-blocked-save.md`, `docs/coach-audit.md`,
`docs/coach-audit-addendum.md`, `logic.js` @ `wo-004-redesign`.

**How to read this file.** Two weights, as in the WO-003 specs.

- **Normative** — states, copy, interaction rules, constraints, accessibility, measurements. This is
  the specification. It is what gets implemented and what QA asserts against.
- **`[REF]`** — anything describing the *prototype* or a reference implementation: pixel values,
  class names, ASCII sketches, arrangements I am recommending rather than requiring. Marked wherever
  it appears. It is discardable. **The visual direction is Chady's and is not under review here** —
  where I touch the look it is because a measurement or a state requires it, and I say which.

**Copy rules.**

- Strings in `code fences` that carry a rule ship **verbatim from `logic.js` / `docs/coach-audit.md`
  / `docs/coach-audit-addendum.md`**. I specify the slot, never the sentence. No sentence is
  assembled in a view.
- Strings marked **NEW** are mine. They are status, navigation or refusal copy. Any of them that
  makes a claim about training is routed to `strength-coach` — flagged individually in §12.
- Strings marked **W1** are `strength-coach`'s to return in WO-004 W1 and are **not written here**.
  Where one is missing the slot is specified and the screen's behaviour without it is stated.
- `{braces}` are substitutions, defined in §0.8.

---

# 0. What this design must still honour

## 0.1 Carried forward — `wo-003-session-screen.md` §0.1

Every row still binds. The right-hand column says where it is resolved for the new layout.

| # | Requirement | Resolved in |
|---|---|---|
| 1 | Nothing that appears, disappears or resizes sits above an input on the card | §0.6, §4.2 |
| 2 | The verdict slot never changes the card's height when a verdict arrives | §4.7 |
| 3 | Silence looks deliberate; the slot says so in words | §4.7 |
| 4 | The rest timer never covers an input, never changes height, never calls `render()`, never sits in the save path | §4.10 |
| 5 | The speed too-heavy flag never alters the logged weight | §4.9 |
| 6 | Advice and refusal are visually distinguishable | §2 |
| 7 | The pain notice has no dismiss and cannot be shortened | §4.8 |
| 8 | *(WO-003 scoped: added no tap targets)* — superseded: this design adds many, and every one is sized in §0.4 | §0.4 |
| 9 | The target line never wraps, truncates or shrinks | §4.3 |
| 10 | A rule that throws is caught per card | §0.7 |

## 0.2 Carried forward — `wo-003-train-weight.md` §0.1

| # | Requirement | Resolved in |
|---|---|---|
| 1 | No single control may add more than one accessory | §10.4 (Volume section deleted), §4.11 |
| 2 | A tier-hidden exercise with numbers in the draft still renders and still saves | §4.11 |
| 3 | A deload reduces the prescription, not the log | §4.4, §5.3 |
| 4 | Exactly one programme-state line, exactly one definition of "week" | §3.4 |
| 5 | Before training week 6 the word "deload" appears nowhere | §3.5 |
| 6 | No kg/week number or calorie instruction when the rule says there is not enough data | §7.3 |
| 7 | The 7-day average is labelled with the count of days it used | §7.2 |
| 8 | The calorie acknowledgement is hard to set, easy to clear | §7.5 |
| 9 | Every offer answerable without scrolling; buttons ≥ 44 px; never a top corner | §0.4, §3.5, §4.11 |
| 10 | The safe choice is the cheapest tap | §0.4, §2.4 |
| 11 | Ignoring an offer is not declining it | §4.11, §3.5 |
| 12 | Nothing destructive without undo or confirmation | §2.4 |

## 0.3 Every row WO-004's audit marked **Violated**, and where it dies

| Audit row | Violation | Resolution |
|---|---|---|
| session §0.1 #2 | Verdict block appears from nothing (`sc-if hasVerdict`) | §4.7 — slot occupied from first paint, fixed reserved height |
| session §0.1 #3 | No slot exists when silent | §4.7 — `WAITING` + the deliberate-silence line |
| session §0.1 #4 | Timer ticks by full re-render; counts an interval | §4.10 — absolute timestamp, one `textContent` channel |
| session §0.1 #5 | No speed flag slot | §4.9 |
| session §0.1 #6 | **No refusal state at all** | §2 — the whole flow |
| session §0.1 #7 | No pain notice, no note field | §4.6 (note), §4.8 (notice) |
| session §0.1 #9 | ` · per DB` suffix missing from the target line | §4.3 |
| session §0.1 #10 | No error boundary | §0.7 |
| a11y | Inactive tab labels 3.7 : 1 | §0.5 — alpha ≥ `.55`, size ≥ 11 px |
| a11y | Pips 1.7 : 1 | §0.5, §4.2 — form as well as value, and text carries the meaning |
| a11y | Targets below 44 px throughout (steppers 38, tabs ~32, header buttons ~14, editor 13–20) | §0.4 — full inventory, width **and** height |
| a11y | `DISCARD` / `SETTINGS` / `SAVE` in top corners | §0.4 (the top-corner rule), §4.12 (Discard's new home), §9.2 (editor Save) |
| a11y | Segmented controls fill-only, no `aria-pressed` | §0.4 |
| a11y | No live regions | §2.6 |
| a11y | Fixed 393 × 852 frame, fixed px widths, `overflow:hidden` | §0.6 |
| train §0.1 #1 | FULL VOLUME checkbox | §10.4 |
| train §0.1 #2 | `visExs()` drops a populated hidden exercise | §4.11 |
| train §0.1 #3 | No deload anywhere | §3.5, §4.4 |
| train §0.1 #4 | Two programme-state lines, wrong week | §3.4 |
| train §0.1 #6 | Advice from 2 entries | §7.3 |
| train §0.1 #7 | Flat `7-day average` label | §7.2 |
| train §0.1 #12 | Four destructive controls with no confirmation | §2.4 |
| C-11 | Verdict gate loosened by remove-set | §4.7 |
| C-12 | `− REMOVE` destroys typed data | §4.5 |
| C-13 | `DISCARD` top-right, one tap | §4.12 |
| C-14 | Sample loader can destroy the real log | §3 (demo mode), §10.5 |
| C-15 | No note field | §4.6 |

## 0.4 Touch targets — the 44 px floor, measured on **width** as well as height

**Rule.** Every interactive element measures **≥ 44 × 44 CSS px** of hit area, at a 400 px viewport
and at 200 % text. B-43 exists because only height was ever checked; the prototype's steppers are
**38 px wide**, which is worse than the 40 px already filed. Hit area may exceed the painted box
(padding, or a pseudo-element overlay) — the *painted* control may stay small if that is the look,
but the tappable rectangle may not.

**The top-corner rule, stated so it can be applied rather than argued.** A top corner is the hardest
place on the screen for a thumb. Therefore it may hold a control that is **neither destructive nor
frequent**. `SETTINGS` qualifies and stays. `DISCARD` does not and moves (§4.12). `SAVE` in the plan
editor does not — it is the commit and it moves (§9.2).

### 0.4.1 Control inventory — every interactive element in this spec

| # | Screen | Control | Min hit area | Notes |
|---|---|---|---|---|
| 1 | all | Tab (5 across) | 78 × 44 | 393 px ÷ 5 = 78.6 px wide. Label ≥ 11 px |
| 2 | all | Demo band `LEAVE` | 88 × 44 | §3 |
| 3 | onboarding | Bodyweight `−` / `+` | 48 × 48 | |
| 4 | onboarding | `START WITH AN EMPTY LOG` | full × 52 | primary |
| 5 | onboarding | `LOAD SIX WEEKS OF SAMPLE DATA` | full × 48 | |
| 6 | onboarding | `OR PICK ANOTHER PLAN` | full × 48 | |
| 7 | home | `SETTINGS` | 88 × 44 | top-right permitted, see above |
| 8 | home | `START SESSION` | full × 56 | the one thing this screen is for |
| 9 | home | Day row (×5) | full × 56 | |
| 10 | home | Deload `Start deload week` / `Not now` | full × 48 each, 12 px gap | `Not now` lowest |
| 11 | home | Draft-restore `Resume` / `Discard` | full × 52 / × 48 | WO-001 Flow 1 |
| 12 | session | Weight `−` / `+` | 44 × 48 each | §0.6 arithmetic |
| 13 | session | Reps `−` / `+` | 44 × 48 each | |
| 14 | session | Weight / reps input | ≥ 48 wide × 48 | 3 characters minimum |
| 15 | session | `MOVEMENT & CUE` disclosure | full × 44 | `.showfig` is 26 px today (B-43) |
| 16 | session | `+ ADD SET {n}` | ≥ 160 × 48 | |
| 17 | session | `− REMOVE SET {n}` | ≥ 132 × 48 | |
| 18 | session | Note field | full × 48 | |
| 19 | session | `← PREV` | 56 × 52 | |
| 20 | session | `NEXT — {ex}` / `FINISH SESSION` | flex × 52 | |
| 21 | session | `DISCARD SESSION` | full × 48 | last element in the scroll |
| 22 | session | Reintroduction `Add it` / `Not yet` | full × 48 each | `Not yet` lowest |
| 23 | session | Undo (toast) | ≥ 88 × 48 | |
| 24 | summary | `SAVE SESSION` | full × 56 | |
| 25 | summary | Refusal problem row | full × 48 | §2.2 |
| 26 | any | Confirmation sheet buttons | full × 48, safe one × 52 lowest | WO-001 §0.6 |
| 27 | weight | Bodyweight `−` / `+` | 48 × 48 | |
| 28 | weight | `LOG TODAY` / `UPDATE` | ≥ 132 × 48 | |
| 29 | weight | `I changed my calories today` | full × 48 | |
| 30 | weight | `I did not change anything` | full × 48 | |
| 31 | diet | Segment `TRAINING DAY` / `REST DAY` | ≥ 120 × 48 each | `aria-pressed`, non-colour mark |
| 32 | diet | Protein check | full × 56 | two-line label |
| 33 | trend | (none) | — | read-only screen |
| 34 | plans | Plan row | full × 64 | two-line |
| 35 | plans | `Build from empty` | full × 48 | **Amended WO-007:** demoted below stored plans, dashed (§9.9.7) |
| 36 | editor | Day row (expand) | full × 52 | |
| 37 | editor | Day `↑` / `↓` | 44 × 44 each | 13 px in the prototype |
| 38 | editor | Exercise name field | full × 48 | |
| 39 | editor | Sets `−` / `+` | 44 × 44 each | 16 px in the prototype |
| 40 | editor | Exercise `✕` remove | 44 × 44 | 20 px in the prototype |
| 41 | editor | `+ ADD EXERCISE` / `+ ADD DAY` | full × 48 | |
| 42 | editor | `SAVE PLAN` | full × 56 | bottom, not the header |
| 43 | editor | `‹ PLANS` | 88 × 44 | top-left, non-destructive |
| 44 | editor | `DISCARD CHANGES` | full × 48 | last in the scroll |
| 45 | settings | Rest segment `AUTO-START` / `MANUAL` | ≥ 120 × 48 each | |
| 46 | settings | `EXPORT EVERYTHING AS JSON` | full × 48 | |
| 47 | settings | Demo enter / leave | full × 48 | |
| 48 | editor | Exercise `Move to another day` | ≥ 132 × 44 | WO-007 §9.9.2. Own line under the control line; absent with one day |
| 49 | editor | Move sheet day row | full × 48 | §9.9.3. One per other day |
| 50 | editor | Move sheet `Not now` | full × 52 | Lowest, pinned |
| 51 | editor | Empty day `Delete this day` | full × 48 | §9.9.5. Present only at zero exercises |
| 52 | editor | Warn-once `Got it` | ≥ 88 × 44 | §9.9.6. Only once W1 fills the slot |
| 53 | plans | `Duplicate PHAT and rearrange it` | full × 56 | §9.9.7. Primary until a stored plan exists, then ghost |
| 54 | home | Owner row (`This log`) | full × 48 | WO-008 §18.2. Below the next-session block, never the header. Opens Settings at Backup |
| 55 | onboarding | `Sign in` | full × 48 | §18.4. Second action, under `START WITH AN EMPTY LOG` |
| 56 | first-run sign-in | `‹ Back` | 88 × 44 | §18.4. Top-left, non-destructive — permitted |
| 57 | first-run sign-in | Email / password fields, `Sign in`, `Create account` | full × 48 each | §18.4. The existing `vBackupBody` form, unchanged |
| 58 | first-run sign-in | `Start with an empty log` (escape) | full × 48 | §18.4. Present in every state of the form screen |
| 59 | first-run, signed in | `Restore {n} sessions` | full × 56 | §18.4 state C1. Primary |
| 60 | first-run, signed in | `Start with an empty log` / `Sign out` / `Try again` | full × 48 each | §18.4 states C1–C3 |

**Deleted rather than resized:** the FULL VOLUME toggle (C-1), the 2.5/5 KG segment (C-3), and
`SWITCH TO AN EMPTY LOG` (§2.4 — there is no control that empties the real log).

## 0.5 Contrast — measured for the 2a palette

Method: WCAG 2.x relative luminance; translucent foregrounds composited over their own background in
sRGB before measuring. Grounds are `--bg #1c1b1a` (L = 0.0112) and `--surface #2a2827` (L = 0.0216).

| Foreground | On `--bg` | On `--surface` | Verdict |
|---|---|---|---|
| `--bone #f0eeea` | **14.8 : 1** | **12.7 : 1** | Pass everywhere |
| `--amber #f5b32b` | **9.3 : 1** | **7.9 : 1** | Pass everywhere |
| `--bg` on `--amber` fill | **9.3 : 1** | — | Pass |
| bone `.55` | **5.3 : 1** | **4.9 : 1** | Pass as text |
| bone `.50` | **4.6 : 1** | **4.3 : 1** | **Pass on `--bg` only. Fails on `--surface`** |
| bone `.45` | 4.0 : 1 | 3.8 : 1 | Non-text only |
| bone `.42` | 3.7 : 1 | 3.5 : 1 | Non-text only |
| bone `.40` | 3.4 : 1 | 3.2 : 1 | Non-text only — the floor for a meaningful border |
| bone `.35` | 2.9 : 1 | 2.8 : 1 | **Fails both floors** |
| bone `.30` | 2.5 : 1 | 2.4 : 1 | Decorative only |
| bone `.22` | 1.9 : 1 | 1.8 : 1 | Decorative only |
| bone `.18` | **1.7 : 1** | 1.6 : 1 | Decorative only — the pips (B-59) |

**Three normative consequences.**

1. **`.55` is the minimum alpha for any text, on either ground.** The prototype's `.note` at `.55`
   is correct and is the model. The prototype's inactive tab label at `.42` (3.7 : 1) rises to
   `.55`, and its label size rises from 9 px to **≥ 11 px** — 9 px uppercase at 0.1 em tracking is
   not readable at arm's length whatever its ratio.
2. **`.50` is a `--bg`-only value.** The prototype's `.lbl` at `.50` measures 4.7 : 1 on `--bg` and
   **4.3 : 1 on `--surface`**, and `.lbl` is used inside surface cards — the verdict card, the rest
   dock, the diet cells. This is a second failure the audit did not catch because it measured the
   pair on `--bg`. On `--surface`, labels are `.55`.
3. **`.45` as text fails on both grounds.** The prototype uses it as *text* for cut and skipped rows
   (`e.color`, `r.color`) — those rise to `.55` (§9.4, §5.2). As a border it passes and may stay.

**The pips (B-59), resolved without flattening the hierarchy.** Raising `.18` to `.45` would make an
upcoming pip look like a completed one and destroy the state the strip exists to show. So:

- The progress meaning is carried **in text** — the header reads `{day} · {i} of {n}` and the
  accessible name is `Exercise {i} of {n}`. That is the accessible carrier.
- The pip strip is redundant graphics and is **`aria-hidden="true"`**.
- Any pip that is *painted* still distinguishes its three states by **form as well as value**:
  completed = filled bar ≥ 3 : 1 (`.45`); current = amber filled, double height; upcoming =
  **outline only**, 1 px rule ≥ 3 : 1 (`.45`) with an unfilled body. Nothing meaningful sits below
  3 : 1 and "not done yet" still reads as empty.

**Greyscale test, normative:** greyscale the whole app and every state still reads from its words and
its forms. Applies to verdicts, refusals, deltas, segment selection, demo mode, extra sets, skipped
rows and the pips.

## 0.6 Fluid layout — the frame is not a phone

The prototype is a fixed `393 × 852` frame with `overflow:hidden`, `flex:none` children and fixed
widths at `98 / 104 / 120 / 132 / 56 / 300` px. All of it is re-authored fluid.

| Rule | Binding form |
|---|---|
| Viewport | No horizontal scroll at **400 px**, measured. No fixed pixel width on any content column |
| Text zoom | No clipping or overlap at **200 %**, measured, on all ten screens |
| Fixed widths | Replaced by `min-width` + `flex`, or by a reflow. `max-width:300px` on the jump index is prototype scaffolding and does not ship |
| Reserved space | Every fixed or sticky element (tab dock, rest band, toast) contributes bottom padding to the scroll container, so **any input can be scrolled fully clear of all of them** (B-36) |
| `maximum-scale=1` | Removed from `index.html:6`. Pinch-zoom works |

**The set-row arithmetic, because this is where the 44 px floor bites.** At 400 px with 20 px side
padding the content box is 360 px. A row is: set number (14) + gap (8) + weight stepper + gap (8) +
reps stepper. Two 44 px buttons plus a 48 px input make a **136 px minimum stepper**, so the row
needs 14 + 8 + 136 + 8 + 136 = **302 px**. It fits at 400 px. It does **not** fit at 200 % text.

**Normative reflow:** when the two steppers cannot both hold two 44 px buttons and a ≥ 3-character
input on one line, the row breaks into **two full-width lines — weight above, reps below** — each
keeping its 44 px buttons. The ghost row (§4.4) stays below both. Nothing shrinks; the row grows
downward, which is allowed because the row is an input and everything below it is a control.

## 0.7 What is at risk if a screen throws — the data criterion, per screen

**Standing rule: a thrown rule costs a card and never a number.** Rendering never writes. Every
advice call is wrapped individually, and the set rows are built **before** and **outside** any
try block, so no rule can prevent an input from painting.

| Screen | At risk if it throws mid-render | Required behaviour |
|---|---|---|
| Onboarding | Nothing — no stores are written | Fall through to Home. Never clear a store on an error path |
| Home | The day list — the screen's only job | Fail **open**: day list renders even if `cycleLine`, `volumeTier`, `deloadCheck` and `calorieAdvice` all throw. Each line is caught separately; a thrown line renders nothing (§3.7) |
| Session | **The draft.** The highest-value object in the app | Six independent catches: `verdict`, `speedLoad`, `speedTooHeavy`/`speedFlagText`, `painState`, `restTarget`/`restText`, `volumeTier`. A throw renders that slot's silence state. Sets, note and Save unaffected. The draft write path never runs inside render |
| Summary | The commit | `SAVE SESSION` renders from the draft, not from the summary rows. Per-row catches. If the whole summary throws: `Could not build the summary. Your sets are safe.` **NEW** + `SAVE SESSION` + `‹ BACK` |
| Trend | Nothing — read-only | Per-card catch. A thrown `stallReport` costs the week-6 card, not the sparklines |
| Weight | Nothing on render; the entry write is separate | `calorieAdvice` throwing fails **silent on advice**: average with its count, nothing else (WO-003 train-weight §3.6) |
| Diet | Nothing — static targets plus one boolean | Per-cell catch |
| Plans | Nothing — read-only list | A plan that fails `validatePlan` renders its row with the badge `Cannot open` **NEW** and is not openable. It is never repaired and never dropped |
| Plan editor | The stored plan | The editor works on a **persisted working copy**; the stored plan is written only by `SAVE PLAN`. A throw mid-edit leaves both intact (§9.6) |
| Settings | The real log | No control on this screen writes to `phat:v1:log` or `phat:v1:bw` (§10) |

## 0.8 Substitution tokens

| Token | Definition | Example |
|---|---|---|
| `{ex}` | Exercise name, escaped | `Bent-over row` |
| `{day}` | Day name | `Upper power` |
| `{wd}` | Weekday label from the plan's `wd` (B-31) | `Mon` |
| `{i}` `{n}` | Position and count | `3` of `7` |
| `{s}` | `ex.s`, the prescribed set count | `3` |
| `{w}` `{r}` | A typed weight / rep count as displayed | `120` · `5` |
| `{p}` | Count of problems in a blocked save | `3` |
| `{token}` | The refusal token from WO-001 §2.2 | `no reps` |
| `{mmss}` | Elapsed rest, `m:ss` | `1:12` |
| `{rate}` | Signed, two decimals | `+0.25` |
| `{date}` | Local date through `PHAT.dayMon` — never `Intl` (B-44) | `16 Sep` |

Pluralisation is written out (`1 set` / `3 sets`). No `(s)`. The prototype's
`{n} set(s) beyond the prescription` does not ship.

---

# 1. The ten screens, and the one question each answers

| Screen | The one question | First readable at arm's length | One tap away | Buried |
|---|---|---|---|---|
| Onboarding | *What is this and how do I start* | `Nothing logged yet` | Sample data, another plan | Everything else |
| Home / Train | *What do I do now* | The next-session block and `START SESSION` | The day list, the deload banner | Settings, export, storage |
| Session | *What is this set* | The exercise name, the target, the set row | The figure and cue, the verdict | The plan, the history |
| Summary | *Is this what I did* | Sets · volume · extras | Per-exercise verdicts | — |
| Trend | *Is this working* | The week-6 test card | Four sparklines | The method |
| Weight | *Am I eating right* | The 7-day average with its day count | The calorie decision, the entry | The last-7 list |
| Diet | *What am I eating today* | Kcal and protein | Rest-day targets | Carb placement, calibration |
| Plans | *Which programme am I on* | The active plan | Duplicate, build from empty | Templates |
| Plan editor | *What is in this day* | The day list | An exercise's numbers | Add / delete |
| Settings | *Where is my data* | Export | Rest mode, sample data | — |

**Do not let two screens answer the same question.** The week-6 countdown is Trend's, not Home's
(§3.4). The diet targets are Diet's, not Weight's. The plan is Plans', not Session's.

---

# 2. FLOW — Refusal

```
Flow:   Refusal
Entry:  (a) SAVE SESSION with a malformed or incomplete set  (B-02, WO-001 Flow 2)
        (b) a storage write that fails
        (c) storage blocked at the browser level  (B-40)
        (d) an edit the data layer refuses  (validatePlan / editFail)
Exit:   Every problem fixed or cleared, then the action again.
```

**This flow exists because the design has none.** WO-001 spent an entire work order making the app
refuse to throw a number away, and the redesign gives that mechanism nowhere to render. The app
cannot ship without it.

## 2.1 Advice and refusal must not look alike

`wo-003-session-screen.md` §0.1 #6: if advice looks like a refusal, he learns the refusal signal
means nothing, and the next blocked save gets ignored. In a **mono-signal palette** — 2a has exactly
one accent — the usual answer (a second colour) is not available, and I am not adding one to
Chady's palette. So the distinction is carried by **form**, four ways at once:

| | Advice | Refusal |
|---|---|---|
| Enclosure | 3 px rule on the **left edge only** | **2 px border on all four sides** |
| Rule colour | **`--dim`, in every state, on every screen** (§2.1.1) | `--red-hi` |
| Glyph | none | a literal `!`, `aria-hidden` |
| Headline | the kicker (`VERDICT`, `WAITING`, `SPEED WORK`, `CALORIE DECISION`) | `Not saved.` / `Could not …` |
| Contents | text only | **tappable rows** — the only block in the app that has them |

Greyscale it and all four survive. If W6 wants a token for the refusal border, it must measure
**≥ 3 : 1** as a border and **≥ 4.5 : 1** if it is ever used as text — and it is never the sole
carrier, so the app is correct with or without it.

**Advice may never borrow the refusal treatment.** The one exception, unchanged from WO-003 §2.2
rule 6: the **pain notice** may use it, because there the app really is declining to do something.

### 2.1.1 The enclosure colour — ruled once, app-wide (WO-005)

**Ruled: the advice rule is `--dim`. Amber does not come back.** W11 shipped `--dim`; that is correct
and it is now the rule rather than an engineer's call at 3 a.m. `wo-003-train-weight.md` §3.8 and the
design prototype specify amber and are **superseded on this point**.

State it once, here, so no screen re-litigates it:

| | |
|---|---|
| Advice enclosure, everywhere | 3 px `--dim` left rule · kicker · no glyph · no border · **the same in every state of every block** |
| Refusal enclosure, everywhere | 2 px `--red-hi` on four sides · `!` · refusal headline |
| Amber | Reserved for **the live thing**: the primary action fill, the current pip, the target number, the figure's arrow, a selected segment, the focus ring. Never the enclosure of a paragraph |
| Changing this | An edit to this section, reviewed here. Not a decision a view makes |

Four reasons, in the order that decides it:

1. **§4.7 rule 6 already forbids it.** Status is never carried by colour, so one enclosure has to
   render `VERDICT` and `WAITING` identically. Whatever hue that enclosure wears, it wears while
   saying `Nothing to say until all 3 sets are in.` A colour that is present when there is nothing to
   say is by construction not a signal — it is decoration that has borrowed the accent.
2. **The palette has exactly one accent and it is already spent.** Amber means *here, now, act on
   this*. The sentence most often rendered inside this enclosure is `Change nothing.` Spending the
   accent on a static paragraph devalues it on every control that uses it to mean something.
3. **§3.8's normative content survives, and it was never the hue.** What that line required was "the
   same colour in all seven states — nothing on this screen is encoded in hue." `--dim` satisfies it
   completely. §3.8 is additionally marked `[REF]` against a build that no longer exists.
4. **Contrast does not decide it.** `--dim` is `--t70` — comfortably over the 3 : 1 non-text floor as
   a 3 px rule on both grounds; amber is 7.9 : 1. Both pass. This is a meaning decision, not a
   measurement one, which is why it is ruled rather than measured.

**Binding on:** the verdict slot in all four kickers (§4.7), the speed flag (§4.9), the pain notice
where it does *not* take the refusal treatment (§4.8), the reintroduction offer (§4.11), the deload
banner (§13.6), the calorie decision (§7.3), and export success (§10.4). One shape, one colour,
seven screens.

## 2.2 Blocked save — the screen

Save lives on Summary (§5). The refusal renders there, in the slot directly above `SAVE SESSION`.

```
[REF] layout

│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ ! Not saved. 3 sets need a fix.        ┃  │
│  ┃   Everything you typed is still here.  ┃  │
│  ┃  ┌──────────────────────────────────┐  ┃  │  each row 48 px
│  ┃  │ Bent-over row · set 2   7.5.0  › │  ┃  │
│  ┃  ├──────────────────────────────────┤  ┃  │
│  ┃  │ Flat DB press · set 1  no reps › │  ┃  │
│  ┃  ├──────────────────────────────────┤  ┃  │
│  ┃  │ Skull crusher · set 3 no weight› │  ┃  │
│  ┃  └──────────────────────────────────┘  ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│  [            SAVE SESSION             ]     │
```

**Copy — verbatim from WO-001 W4 §2.2, unchanged:**

| Element | String |
|---|---|
| Headline, 1 problem | `Not saved. 1 set needs a fix.` |
| Headline, ≥ 2 | `Not saved. {p} sets need a fix.` |
| Reassurance | `Everything you typed is still here.` |
| Row | `{ex} · set {i}` + `{token}` |
| Overflow after 5 rows | `and {x} more.` |

Tokens, unchanged: `7.5.0` (the literal offending string, ≤ 12 chars) · `no reps` · `no weight` ·
`0 reps` · `over 500` · `over 100`.

## 2.3 The problem that is new: **the offending row is on a screen he is not looking at**

WO-001's model put every card on one page. One exercise per screen breaks that: the row he must fix
may be four screens away, and a refusal pointing at something unreachable is the worst state in this
spec.

**Rules.**

1. **Tapping a problem row navigates.** It switches the session to that exercise's screen, scrolls
   the offending set row into the upper third of the viewport, focuses the offending input and
   **selects its contents** — one keystroke replaces `7.5.0`. Never `scrollTo(0,0)`.
2. **The row keeps its marks after the navigation** (WO-001 §2.4, unchanged): a rule on the set row,
   the ghost slot temporarily repurposed to `! {token}`, a thicker border on the offending field,
   and a `Clear this set` strip below the row (44 px).
3. **A fix bar rides the exercise screen for as long as the refusal is outstanding.** It renders at
   first paint of the screen he was sent to, directly under the header — a navigation, not an
   appearance, so §0.1 #1 is not violated. It is **fixed height and never disappears** while a
   refusal stands; only its text changes.

   | State | Left | Right |
   |---|---|---|
   | Problems remain | `{p} sets left to fix.` **NEW** | `BACK TO SAVE` **NEW**, 44 px |
   | All fixed | `Nothing left to fix.` *(WO-001, existing)* | `BACK TO SAVE` |

   It clears when he navigates out of the session or the save succeeds.
4. **`BACK TO SAVE` returns to Summary**, scrolled to the refusal block, with no scroll to top.
5. **A blocked save never changes a screen's data.** `phat:v1:draft` is byte-identical before and
   after a refused save.
6. **A hidden card with a problem is revealed** (WO-001 §2.9, carried forward): a tier-hidden
   exercise that holds a problem gets its own screen in the flow, carrying
   `Not in today's volume. It has numbers in it.` *(existing string)*.

## 2.4 Destructive actions — the register

One place, so nothing gets missed. **Preference order: undo > confirmation > neither.** Nothing in
this app is destructive with neither.

| # | Action | Treatment | Copy |
|---|---|---|---|
| 1 | Discard a session | **Confirmation** (WO-001 State 1F, unchanged) | `Discard {n} logged sets?` / `Keep it` / toast `Discarded.` |
| 2 | Remove a set holding typed values | **Confirmation + undo** | §4.5 |
| 3 | Remove a blank set | **Undo**, no confirmation | §4.5 |
| 4 | Start a different day over a draft | **Confirmation** (WO-001 State 1G case 2) | unchanged |
| 5 | Delete an exercise from a plan | **Confirmation + undo** | §9.5 |
| 6 | Discard plan edits | **Confirmation** | §9.6 |
| 7 | Enter demo mode | **Neither** — it writes nothing to the real log | §3 |
| 8 | Leave demo mode | **Neither** — it restores the real log | §3 |
| 9 | Empty the real log | **The control does not exist** | see below |

**Item 9, ruled.** `SWITCH TO AN EMPTY LOG` is deleted, not confirmed. Adding a typed confirmation
in front of it would satisfy WO-004 W13's criterion while leaving a "delete all my history" button
in a settings screen he reaches with a chalky thumb, for a use case that does not exist: he has one
log and he wants to keep it. Demo mode already gives him a clean slate to look at without touching
it. **There is no control anywhere in the app that reduces the length of `phat:v1:log` or
`phat:v1:bw`.** That is the strongest form of W13's data criterion 3 and it costs nothing.

**Undo, defined once.** An undo is a control in the toast, ≥ 88 × 48 px, live for the **whole
session or editing session** — not a 5-second timer, because he is out of breath and reading
something else. It restores the removed object byte-for-byte (`removeExercise` already returns it).
A second destructive action replaces the pending undo; the toast says which one it now undoes.

## 2.5 Other refusal states

| State | Copy | Shape |
|---|---|---|
| Storage write failed after validation passed | `Could not save. Your entries are still on screen — try again.` *(existing)* | Refusal enclosure, **no `!`, no rows** — WO-001 §2.10 requires it to be visually distinct from a blocked save |
| Discard write failed | `Could not discard. Nothing changed. Try again.` *(existing)* | Same |
| Draft read failed | `Could not read your saved session. Close the app and reopen it before starting a new day.` *(existing)* | Same, on Home, `role="alert"` |
| Storage blocked at the browser level | The store notice, **and it outranks the draft notice and the onboarding screen** (B-40) | Same, on Home |
| Draft write blocked (disk full) | Announced through the persistent live region only (B-39) — the autosave path may not call `render()` | live region |
| Plan edit refused by `validatePlan` / `editFail` | §9.7. A `reason` is a developer signal and **is never rendered** | Refusal enclosure |

## 2.6 A11y — refusal

- One persistent live region (`#bs-live` **[REF]**), outside the re-rendered view, created once at
  boot. `render()` must not recreate it — a recreated live region never announces.
- On a blocked save, focus moves to the refusal headline (`tabindex="-1"`); the next Tab lands on
  problem row 1. Focusing a non-input does not raise the keyboard.
- Problem rows are `<button>`. Accessible name: `{ex}, set {i}, {token}. Go to set.`
- `aria-live` goes on the persistent region only, never on the refusal block — two regions over one
  content produce double announcements.
- The `!` is `aria-hidden="true"` everywhere.
- Marked inputs get `aria-invalid="true"` and `aria-describedby` → the token span, which is **real
  text**, not a CSS pseudo-element.
- Advice never gets `aria-invalid`. The speed flag in particular marks a **valid** number (§4.9).

## 2.7 Out of scope

Auto-fixing anything. Saving the good sets and dropping the bad ones (ruled out, WO-001 Decision 3).
Editing a saved session (B-05). Import (WO-002).

---

# 3. FLOW — Demo mode

```
Flow:   Sample data
Entry:  Onboarding `LOAD SIX WEEKS OF SAMPLE DATA`, Trend's empty state, or Settings.
Exit:   `LEAVE` in the demo band, or Settings.
```

**Rules (C-14).**

1. Sample data lives in **its own store key**. The real log is never read and never written while
   demo mode is on.
2. Every sample session carries `demo: true`. No engine is ever called with a mixed array.
3. Leaving demo mode restores the real log untouched, byte-identically.
4. **Demo mode is visible on every screen while it is on**, not only in Settings.

**The band.** Full width, directly below the status area, above every screen header. Fixed height,
present from first paint of every screen, so it never shifts anything. It contributes to the scroll
container's top offset like any other reserved element.

| Element | String |
|---|---|
| Band label | `SAMPLE DATA — NOT YOUR LOG` **NEW** |
| Band control | `LEAVE` **NEW**, 88 × 44 |
| Settings body | `Sample data lets you see the trend and week-6 screens with something real in them.` *(design, verbatim)* |
| On leaving, toast | `Your log is back.` **NEW** |

**Copy rule:** while demo mode is on, no screen says "your" about a number it did not get from him.
Trend's `sessCount` reads `{n} sample sessions` **NEW**; Weight's reads `{n} sample entries` **NEW**.

**States**

| State | Present |
|---|---|
| Off | No band. Nothing anywhere refers to sample data except Settings and Trend's empty state |
| On | Band on all ten screens; sample counts; every engine reads the demo store |
| Entering with a real log present | Permitted, no confirmation — nothing is destroyed. Toast `Sample data loaded.` **NEW** |
| Error — the sample store fails to write | Demo mode does not start. Refusal: `Could not load the sample data. Nothing changed.` **NEW** |
| Offline | Identical. Sample data is generated locally |

---

# 4. SCREEN — Session

```
Flow:   Log a set
Entry:  START SESSION on Home, a day row on Home, or Resume from the draft-restore offer.
Exit:   FINISH SESSION → Summary · DISCARD SESSION → confirmation → Home.
```

This is the only screen that logs a set. Everything else improves an app that is already being used.

## 4.1 The layout invariant, restated for one-exercise-per-screen

```
ORDER IS NORMATIVE. Shapes and pixels are [REF].

  demo band (if on)                      ← §3, fixed height, never moves
  header:  {day} · {i} of {n}            ← no destructive control (§4.12)
  pip strip                              ← aria-hidden (§0.5)
  fix bar                                ← §2.3, only while a refusal stands
  reintroduction offer                   ← §4.11, only on the first exercise screen
  exercise name + target line            ← §4.3
  prescription / speed prescription      ← §4.3
  MOVEMENT & CUE (collapsed)             ← §4.13
  ─────────────────────────────────────────
  set rows                               ← THE INPUTS  (§4.4)
    each row: [num] [weight stepper] [reps stepper]
              ghost row: last {w} × {r}          |  EXTRA
  + ADD SET {n}     − REMOVE SET {n}     ← controls, below every set input (§4.5)
  note field                             ← THE LAST INPUT ON THE CARD (§4.6)
  ─────────────────────────────────────────
  BOTTOM STACK
    1. pain notice        (§4.8, conditional)
    2. speed flag         (§4.9, conditional)
    3. verdict slot       (§4.7, ALWAYS PRESENT)
  ─────────────────────────────────────────
  [← PREV]  [NEXT — {ex} →]
  DISCARD SESSION                        ← §4.12, last element in the scroll
  ─────────────────────────────────────────
  rest band  (sticky above the tab dock)  ← §4.10, space reserved, covers nothing
```

**No element that accepts input may sit below the bottom stack.** That rule is what makes this
screen safe. The add/remove controls sit between the set rows and the note field in the prototype;
here they sit **below every set input and above the note field** — they are controls, not inputs, and
they change the number of rows above them, which is exactly why they must not sit above one.

## 4.2 Header and progress

| Element | String | Notes |
|---|---|---|
| Header | `{day} · {i} of {n}` **NEW** (design: `UPPER POWER · 1 / 7`) | Accessible name `Exercise {i} of {n}` |
| Pips | — | `aria-hidden="true"`, three forms per §0.5 |

The prototype's `DISCARD` is gone from this header (§4.12). Nothing replaces it: the header is
information, not a control.

## 4.3 Name, target and prescription

| Element | Source | Rule |
|---|---|---|
| Name | `ex.n` | Wraps to a second line if it must |
| Target line | `{s} × {lo}–{hi}{unit}` — WO-003 §5.1, verbatim | **Never wraps, never truncates, never shrinks.** `{unit}` is ` · per DB` only for `implement:"db"` (B-22). The prototype omits it and it is required |
| Prescription, non-speed | `Last {w} × {r}, {w} × {r}. ` — see below | |
| Prescription, speed | `PHAT.speedLoad().text` **verbatim**, or its fallback | Replaces the prototype's static `Speed work — 65–70% …` sentence, which is B-12 |
| Deload | `PHAT.deloadEx` prescription drives `{s}`; the log is untouched | train-weight §2.4 |

**The prototype's `exLast` carries the rest time (`Rest 2 min`) from the day object. That is C-2 and
it is dropped.** Rest is per exercise and lives in the rest band, once (§4.10).

## 4.4 Set rows — **ghost, not prefill.** Ruled.

**The question.** The prototype prefills last session's weight into the input *and* shows the ghost
hint. Prefill is a real ergonomic win — 40 taps of `+` to reach 100 kg is not a design, it is a
punishment.

**The ruling: rows start empty. The ghost stays.** Three reasons, in order of weight.

1. **A prefilled number he does not change is indistinguishable from one he chose.** Nine engines
   read that history confidently and B-05 means he cannot correct it. The app's whole claim is that
   the numbers are his.
2. **Prefill converts "skipped" into "blocked".** The prototype prefills `w` and leaves `r` empty.
   That is exactly WO-001's `incomplete` classification — so every exercise he *skips* becomes a
   blocked save with a `no reps` token on a screen he never visited. The refusal flow would fire on
   the normal case of not doing an exercise.
3. It is not needed to get the ergonomics, because of the next rule.

**The seeding rule, which buys back the whole ergonomic win for one tap.** The **first `+` on an
empty weight field adopts last session's weight for that set index**; the second `+` steps from it.
Reps are never seeded.

- It reuses an established precedent — WO-001 §2.8: the first stepper tap on a malformed value
  normalises only and does **not** also step, because a field that jumps two states on one tap has
  silently changed a number.
- The number is on screen because **he tapped for it**. Provenance is intact.
- No history, or no set at that index → `+` gives `2.5` as today.
- `−` from empty stays empty (WO-001 §2.6 Route B, unchanged) — otherwise `−` would increase a value.
- Announced through the live region: `Weight now 100.` *(existing WO-001 string pattern)*.

If `frontend-engineer` finds the seed ambiguous in the hand, **the seed is the part that can be
cut** — the ghost is not.

**The ghost row (B-37 — the design's best fix, and it is kept).** Last session's numbers get their
own full-width row below the steppers, sharing it with the `EXTRA` flag. The zero-width squeeze is
structurally impossible in this layout. Ghost text is `.55` (5.3 : 1 on `--bg`), never `--faint`.

| Case | String |
|---|---|
| History for this set index | `Last {w} × {r}` *(design, `last 100 × 5`, sentence-cased)* **NEW** |
| No history for this index | `No prior set.` *(design)* **NEW** |
| Row beyond the prescription | `EXTRA` *(design)* — right-aligned in the same row |
| Row marked by a refusal | `! {token}` — the ghost is displaced for exactly as long as the row is broken (WO-001 §2.4) |

## 4.5 Add and remove a set

**Add.** `+ ADD SET {n}`. A row beyond `ex.s` is marked `EXTRA`, counts in volume, and **does not
change the target line**. One line renders below the controls, only when extras exist:

```
Set 4 is beyond the prescription. It counts in volume; the target does not change.   NEW
```

The prototype's always-on `Add sets freely…` line does not ship — a permanent instruction is a line
he reads every session and learns to ignore.

**Whether an extra set counts in P1's and H1's comparisons is `strength-coach`'s (WO-004 W1),
not mine.** `PHAT.verdict` already ignores sets beyond `ex.s` on both sides of a comparison; the
display above says "counts in volume", which is a display fact, not a rule. If W1 rules otherwise,
this line changes and nothing else does.

**Remove — C-12, ruled.** The prototype pops the last row unconditionally, including one holding a
completed `120 × 5`, with no confirmation and no undo.

1. **The control names its target.** Label: `− REMOVE SET {n}` **NEW**, where `{n}` is the row that
   would go. He can see what he is about to lose before he taps.
2. **It targets the last *blank* set by preference**, not the last row. The common case — added a
   row by mistake — never touches data.
3. **Blank target:** removed immediately, no confirmation. Toast `Set {n} removed.` **NEW** with
   `Undo`.
4. **Target holds any typed value in either field:** a confirmation, naming the numbers.

   | Element | String |
   |---|---|
   | Headline | `Remove set {n}?` **NEW** |
   | Body | `It holds {w} × {r}.` **NEW** — with `—` for an empty field |
   | Destructive | `Remove set {n}` **NEW** |
   | Safe, lowest | `Keep it` *(WO-001, existing)* |
   | Toast | `Set {n} removed.` **NEW** + `Undo` |

   Same guards as WO-001 §1F: safe button lowest and occupying the trigger's slot, destructive
   button inert for 300 ms, `Escape` and scrim cancel.
5. **Undo restores the row byte-identically**, including both raw strings, for the life of the
   session.
6. **The control is not rendered when one row remains.** An exercise is skipped by leaving it blank,
   not by removing its last row.
7. **Removing sets never buys a verdict** (§4.7).

## 4.6 The note field — C-15, restored

It is Rule S1's **only** input; `PHAT.painFlag` reads it; `validateDraft` deliberately preserves a
notes-only entry because a typed note is data; and `wo-003-session-screen.md` §0.4 defines the whole
bottom stack relative to it. The design has it on no screen.

| Rule | |
|---|---|
| Position | The **last input on the card**, below the add/remove controls, above the bottom stack |
| Placeholder | `Note — RIR, form, pain, anything` *(existing, unchanged — the app now does something with the answer)* |
| Label | A real `<label>`, visually the field's own kicker `NOTE`. B-13 |
| Collapsed form | Acceptable: a one-line field that grows to two or three on focus. **Growth is downward and below every input, so it is allowed.** Absence is not acceptable |
| Height | 48 px minimum, full width |
| Commit | `focusout`, or the existing 400 ms draft debounce, whichever is first. **Never per keystroke** — `painFlag` matches `\bpain\b`, so "painting" passes through a matching state (WO-003 §2.2 rule 3) |
| Persistence | In the draft, restored by WO-001 Flow 1, saved even with no completed sets |

## 4.7 The verdict slot — occupied before a verdict exists

**Rules (WO-003 §1.2, carried, plus the new-layout specifics).**

1. Present on every exercise screen from first paint, for every `ex.k`. Never removed, never
   collapsed.
2. Holds a **reminder** when the rule returns `null`, the **verdict** when it does not. Exactly one.
3. **Height does not change** when one replaces the other. The slot reserves at least a two-line
   body plus the kicker.
4. The verdict recomputes on **commit** — a stepper tap or a `focusout` of a set field — never on
   `input`.
5. **The gate is `completedSets >= ex.s` against the prescription, always** (C-11 / B-50).
   Removing sets does not buy a verdict.
6. Status is never carried by colour; the sentence carries it.

**The kicker slot — and a finding.** The prototype's kicker (`Overload` / `Hold` / `Volume up`) has
**no engine source**. `PHAT.verdict` returns `{t, x, x2, rule}` where `t` is a direction token —
`"up"`, `"down"` or `""` — not a word. Writing a kicker word in the view would be assembling a
sentence in the view, and worse: a second, shorter verdict that can disagree with the first.

**Ruled: the kicker says what the block is, not what it says.** Four fixed labels, all **NEW**:

| Condition | Kicker | Body |
|---|---|---|
| `verdict` returns `null`, `k` power or hyp | `WAITING` | `Nothing to say until all {s} sets are in.` **NEW** *(carried from WO-003 §1.3)* |
| `verdict` returns an object | `VERDICT` | `x` verbatim; `x2` as a **second line**, never appended (Decision 1 of the seven calls) |
| `k: "speed"` | `SPEED WORK` | `PHAT.speedLoad().instruction` verbatim, permanent, never gated |
| Deload active | `DELOAD WEEK` | `verdict`'s DL1 output verbatim |

`t` may drive a redundant `↑` / `↓` glyph beside the kicker, `aria-hidden`, never the sole carrier.

**Why a sentence and not reserved blank space:** the app used to print after set 1. It now prints
nothing for most of an exercise. One constant line, identical on every card, says *the app is
working and it is waiting*. It never changes while he fills the sets, so it is not something he
re-reads.

**A discrepancy for `backend-engineer`, not a ruling:** `PHAT.verdict` still contains
`Submaximal and fast. Do not grind these.` (rule `SP0`), which WO-003 §4.2 replaced with
`speedLoad().instruction`. The view calls `speedLoad` on a speed card and does not call `verdict`.
Whether `SP0` should still exist is theirs.

**States**

| State | What renders |
|---|---|
| Empty / partial | Reminder, unchanged. **No countdown** — a number that ticks down is a number he reads |
| Success | Verdict replaces the reminder in place. No scroll, no animation, no flash |
| Edited back below `{s}` | Reminder returns; the slot returns to its reserved height |
| Sets removed below `{s}` | Reminder. Never a verdict (C-11) |
| Error — the rule throws | Caught per card. Reminder renders. Sets, note and Save untouched |
| Offline | Identical |

**A11y:** no `aria-live` on the slot — it changes as a direct result of his own tap on the card he is
touching. Reading order is DOM order: sets → note → pain notice → flag → verdict.

## 4.8 The pain notice (Rule S1)

Position 1 in the bottom stack — below the note field (its trigger), above the verdict (which it
explains). Copy verbatim from audit §10, two paragraphs, no interpolation, **no dismiss, no
shortening, no severity word, no substitute, no stretch**:

```
You logged pain on this. Not something this app can assess.
Holding the weight. If it is sharp, or it repeats, stop the exercise and see a physio or a doctor.
```

Provenance line, when the source is history rather than the current note (WO-003 §2.3, **NEW**,
still pending coach review): `From your last session on this.`

Two sources — the current draft note on commit, and `PHAT.painState(sessions, exId)` — **one
element**. Not interactive. May use the refusal treatment (§2.1). Announced once on transition to
shown, verbatim, through the persistent region. Fails **towards showing** if `painState` throws and
the current note matches; otherwise renders nothing; never blocks the save.

**Dependency: `PHAT.painState` is WO-004 W4 and does not exist yet.** Until it does, the notice
renders from the current note only, and the provenance line never appears.

## 4.9 The speed flag (Rule SP1)

Position 2 in the bottom stack. `PHAT.speedFlagText(w, target)` verbatim:

```
110 kg is not speed work. Drop to 95 kg.
```

**It is advice, styled as advice** — left rule only, no `!`, no refusal enclosure. It never alters,
blocks, marks or clears the logged weight: the field still reads `110`, the draft on disk still
holds `110`, Save writes `110`. The flagged input gets **no** `aria-invalid` and **no**
`aria-describedby` pointing at the flag — it is a valid value and telling a screen reader otherwise
is a lie with consequences. One flag per card, naming the heaviest flagged weight. Evaluates on
commit, ungated (audit §7 calls it a live check).

## 4.10 The rest band (Rule R1)

**Rules (WO-003 §3.1, carried, with one placement reversal I am making explicitly).**

1. One timer for the whole app. Committing a set on another exercise restarts it with that
   exercise's thresholds.
2. Starts on a **reps** commit — a reps stepper tap, or `focusout` of a reps field with a non-empty
   value. Never a weight field, never a keystroke. Typing the `1` of `12` does not start it.
3. A commit on the row that started the running timer does not restart it.
4. **Absolute timestamp, never a tick count.** Elapsed is recomputed from the wall clock on every
   tick and on `visibilitychange`. Three minutes backgrounded comes back as three minutes.
5. Always present while a session is open, at constant size, with its space reserved.
6. Never covers an input. Absorbs taps and performs no action.
7. **Never calls `render()`.** One `textContent` write to one node. If that seam is not clean, the
   timer is cut — it is a comfort feature and it cannot cost a caret (B-61, B-19).
8. Never in the save path. Never persisted. No sound, no vibration, no notification.
9. Thresholds are **per exercise, from `ex.k` and `ex.hi`** (C-2). The prototype's per-day `rest`
   field is dropped from the plan document.

**Placement — reversing my own WO-003 §3.5 `[REF]`, and saying why.** That spec rejected "bottom bar
above the nav" because an element that *appears* there covers the row he just committed. Here the
band is **permanent from the moment the session opens**, and the scroll container reserves its
height, so it never appears and never covers anything. With one exercise per screen the bottom of
the viewport is also where his thumb already is. **Recommended: sticky above the tab dock.**
`[REF]`. Any placement satisfying rules 5–7 is correct.

**Display states** — all copy from `PHAT.restText`, verbatim (audit §6):

| # | Window | String |
|---|---|---|
| 0 | Idle, nothing committed yet | `Rest timer starts when you log a set.` **NEW** |
| 1 | `0 ≤ t < ready` | `Rest {mmss} · go at {ready}` |
| 2 | `ready ≤ t ≤ cap` | `Ready.` |
| 3 | past cap, power/hyp | `{mmss}. You are past the rest window. Go.` |
| 4 | past cap, speed | `{mmss}. Too long for speed work. Go now or drop the weight.` |
| 5 | `t ≥ 2 × cap` | `Rest over.` — and the count **stops** |

The elapsed time may be set larger than the tail in state 1, provided the rendered text reads exactly
`Rest 1:12 · go at 2:30` — no reordering, no line break between the parts. **In no state does the
element's height change.** Errors and negative elapsed render state 0, never `NaN:aN`.

**A11y:** not a live region. Three transitions announced once each per rest through the persistent
region — entering state 2, entering 3 or 4, entering 5. Not focusable.

**Dependency: `PHAT.restTarget` / `PHAT.restText` are WO-004 W4 and do not exist yet.** Without
them the band renders state 0 permanently. It does not compute a fallback from the day.

## 4.11 The reintroduction offer (Rule V1)

Absent from the design; the engine (`PHAT.volumeTier`) is built.

**Where:** at the top of the **first exercise screen** of a day, when `volumeTier().offer` is
non-null — the decision is about this session and the moment to make it is before he has lifted
anything. Not on Home. Not repeated on later screens.

**Constraints:** answerable without scrolling from where it appears; both buttons ≥ 44 px, neither
in a top corner; `Not yet` is the **lowest** and therefore the cheapest tap; inline content, never
an overlay, never a focus trap; scrolling past it is allowed.

**Copy — `volumeTier().offerLine` and audit §5, verbatim:**

| Element | String |
|---|---|
| Offer | `Add {ex} back to this session? Only if last week left you recovered and no lift went backwards.` |
| Accept / decline | `Add it` / `Not yet` |
| Accepted | `{ex} is back in. That is the only addition for 7 days.` |
| Declined | `Left out. Asked again next week.` |
| Suppressed by a pain note (S2b) | `blockedLine`, verbatim |

**Interactions:** `Add it` replaces the block **in place**; the exercise's screen is inserted into
the flow in programme order carrying `Back in from this session.` **NEW**; the app **does not
scroll** and **does not navigate**. `Not yet` replaces the block in place and stamps the cooldown.
**Ignoring is not declining** — scrolling past or saving with it unanswered stamps nothing and
re-offers next session.

**Hidden-but-populated (train-weight §0.1 #2, violated by the prototype's `visExs`):** an exercise
the tier hides that has numbers in the draft **still gets its screen, still renders its sets, still
saves**, carrying `Not in today's volume. It has numbers in it.` *(existing)*. The tier changes what
he is asked to do; it never changes what he has already logged.

## 4.12 Discard — B-34 / C-13, re-homed

The most destructive control in the app is currently in the top-right corner with **no confirmation
at all**, which is worse than the pre-redesign build. It moves.

| Rule | |
|---|---|
| Position | The **last element in the scroll**, on every screen of the session flow including Summary. Below every input, below the primary action, below `← PREV` / `NEXT` |
| Form | A full-width outline row, ≥ 48 px, styled as a row and not as a primary action |
| Label | `DISCARD SESSION` **NEW** (design: `DISCARD`) |
| Behaviour | Routes through WO-001 State 1F unchanged: `Discard {n} logged sets?` · `{day}, {date}. This cannot be undone.` · destructive above, `Keep it` lowest, 300 ms arm, toast `Discarded.` |
| Not in the header | Nothing destructive is reachable from a top corner |

Why the end of the scroll rather than a corner: it is used perhaps twice a year, it must be
reachable without leaving the session, and a deliberate scroll is the cheapest possible friction that
is not a second confirmation.

## 4.13 Movement and cue

Collapsed by default (`› MOVEMENT & CUE`), disclosure control **full width × 44 px** — `.showfig` is
26 px today (B-43). Expanded, it holds the figure and one cue sentence. Contents specified in §11.

**States:** figure and cue present → both. Cue but no figure → cue alone, no empty box. Neither (a
user-created exercise, or `d2e` / `d3d` whose alternates were dropped) → **the disclosure control is
not rendered at all.** No placeholder, no `FIG 3` box, no "supply the illustrations" note. An empty
frame in the gym is worse than no frame.

## 4.14 Session — full state table

| State | Present |
|---|---|
| Empty (fresh day) | All rows blank; ghosts from history or `No prior set.`; `WAITING` in the verdict slot; rest band state 0 |
| First-ever session | Same, with every ghost `No prior set.` |
| Partial | Some rows complete; `WAITING` |
| Populated | Verdict for exercises with `completedSets ≥ ex.s` |
| Absent data | Speed card with no source → `speedLoad`'s fallback text. Pain history unavailable → notice from the current note only |
| Refusal | Fix bar under the header; marked row; displaced ghost; `Clear this set` strip (§2.3) |
| Deload active | `{s}` reduced; a value typed into a row above the prescription **still renders and still saves**, carrying `Deload week. This set is above the prescription.` **NEW**; kicker `DELOAD WEEK` |
| Tier-hidden but populated | Screen renders with `Not in today's volume. It has numbers in it.` |
| Error | Per-slot catch, §0.7 |
| Offline | Identical. Nothing on this screen touches the network |
| Demo mode | Band present; the session is not writable to the real log |

---

# 5. SCREEN — Summary

```
Flow:   Finish and commit
Entry:  NEXT on the last exercise screen (labelled FINISH SESSION).
Exit:   SAVE SESSION → Home · ‹ BACK → the last exercise · DISCARD SESSION → confirmation.
```

## 5.1 Rules

1. **The summary is a read.** Reaching it, leaving it and returning changes nothing on disk.
   `phat:v1:draft` is byte-identical throughout.
2. **`SAVE SESSION` is the single commit point.** Nothing else in the flow writes to the log.
3. The draft is cleared **only after the log write is confirmed**. Kill the tab between the two and
   the draft is still there.
4. Per-exercise verdicts come from `PHAT.verdict`, verbatim. Nothing is recomputed in the view.
5. The exercise count follows Decision 7 (B-33): an exercise counts when it has ≥ 1 completed set;
   a notes-only entry is shown **separately**, never hidden and never deleted.

## 5.2 What is on it

| Block | Contents |
|---|---|
| Header | `Session complete` · `{date}` *(design)* |
| Headline | `{day}` |
| Counters | `Sets` · `Volume kg` · `Extra sets` — volume **includes** extras; the target counts do not change |
| Count line | `{n} exercises · {n} notes` **NEW** — the `1 note` form is `1 note` |
| Per exercise | `{ex}` · the logged sets · the verdict body verbatim |
| Unlogged exercise | `SKIPPED` **NEW** — a state, not a verdict, and **never rendered as one**. Text at `.55` (the prototype's `.45` fails, §0.5) |
| Refusal slot | §2.2, directly above Save |
| Commit | `SAVE SESSION` |
| Honest note | `Nothing is judged here. The verdicts are arithmetic on your own numbers.` *(design, verbatim)* |
| Discard | `DISCARD SESSION`, last (§4.12) |

## 5.3 States

| State | Present |
|---|---|
| Empty draft | `Nothing logged yet.` *(existing)*. Not a refusal — there is nothing to point at |
| Notes only | Saves. Counters read `0 sets`; the count line reads `0 exercises · 1 note` |
| Populated | As above |
| Refusal | §2.2. **Nothing is saved, the draft is untouched, the offending set is named** |
| Storage write failed | §2.5. The entries stay on screen |
| Success | Toast `Session saved.` *(existing)*, Home |
| Deload | Verdict rows carry DL1's copy verbatim |
| Error mid-render | §0.7 — Save survives the summary |
| Offline | Identical |

---

# 6. SCREEN — Trend

```
Flow:   Is this working
Entry:  Trend tab.
Exit:   None. Read-only.
```

| Block | Contents |
|---|---|
| Header | `Trend` · `{n} sessions` — `{n} sample sessions` in demo mode |
| Week-6 test card | `PHAT.stallReport` output **verbatim**. Nothing recomputed in the view |
| **Week-6 countdown** | **Lives here, not on Home** (C-10). It is Trend's question and it is the second programme-state line the Train screen is forbidden (train-weight §0.1 #4). Copy is `strength-coach`'s — the design's `In {n} days. It asks one question: …` is a **W1** string, not mine |
| Sparklines | Four, grouped by `lift` (C-6) — never by name. A renamed exercise stays on its own line |
| Labels | `DB press`, `SLDL` (B-27). Not `Bench`, not `Deadlift` |
| Deltas | Carry a **sign** as well as any colour |
| Method note | `If the bars aren't moving …` *(design)* — **W1**: it makes a training claim and is the coach's to approve or correct verbatim |

**Layout rules.** At 200 % text the sparkline yields before the lift name does — the chart shrinks or
drops below the label; the label never truncates. SVG marker ids are unique per instance (B-15).

**States**

| State | Present |
|---|---|
| Empty | `No sessions yet` + `Top sets appear here after the first logged session, and the week 6 test unlocks once there are two weeks to compare.` *(design, verbatim)* + `LOAD SAMPLE DATA TO PREVIEW THIS` |
| Below `trainingWeeks` 6 | No week-6 card at all. **No placeholder and no "on track" reassurance** — `stallReport.testable` false means the renderer shows nothing |
| Untested lifts | Named **separately** from stalled lifts. "I cannot tell" is not "you failed" |
| Populated | Card + four sparklines |
| One lift with no data | Its row renders with `no data`, never a flat line at zero |
| Error | Per-card catch. A thrown `stallReport` costs the card, not the sparklines |
| Offline | Identical |
| Demo | Band; `{n} sample sessions` |

**Data criterion:** read-only. No storage key changes across a full render at any data volume from 0
to 200 sessions.

**Not resolved here:** B-11, points spaced by index rather than by date. The sparklines inherit it. It
matters more on a combined chart, which is why the four sparklines are the right call for now.

---

# 7. SCREEN — Weight

```
Flow:   Bodyweight and the calorie decision
Entry:  Weight tab. Re-evaluated after every entry.
Exit:   None — a read-out plus one acknowledgement.
```

Everything in `wo-003-train-weight.md` Flow 3 binds unchanged. The design's own `calDecision` is
**B-06 verbatim** and is discarded whole (C-9).

## 7.1 Order

```
7-day average (with its day count)  ← the biggest thing on the screen
change vs last week, uncoloured
calorie decision card               ← PHAT.calorieAdvice, verbatim
  advice sentence   adv.text         ← the loudest line in the card
  sub-line          adv.subline
  hold note         adv.holdNote      ← only while a hold is on AND a band is showing (§7.5.1)
  set control                         ← only in tone "act"
  clear control                       ← whenever adv.holdUntil is set (§7.5.1)
entry stepper + LOG TODAY / UPDATE
last 7 entries
```

**The set control and the clear control can never both render.** `tone === "act"` and
`holdUntil !== null` are mutually exclusive in the engine: a hold plus an act band resolves to
`cooldown`, whose tone is `"hold"`. A screen offering both at once is a bug, not a state.

## 7.2 The average

| Row | Condition | Label |
|---|---|---|
| Average | Window B has ≥ 5 entries | `7-day average ({n} of 7 days)` — **the count is never omitted, not even at 7 of 7** |
| Change | A rate exists | `Change vs last week`, value `{rate} kg`, **uncoloured** |

The prototype's flat `7-day average` label does not ship (train-weight §0.1 #7).

## 7.3 The advice

Seven states and four not-enough-data states, all from `PHAT.calorieAdvice`, **verbatim**, including
the trailing `Recheck in 7 days.` the WO-003 criteria truncated. The prototype's bands
(`>=0.2 && <=0.35`, `>0.5`, `<0.15`) are the ones audit §2 struck down and do not ship.

**In states A, B, C: no rate, no change row, no calorie instruction, no acknowledgement control.**
8 entries over 24 days shows **no number and no advice** — that is the acceptance criterion and it is
the whole point: showing a number the app cannot justify is a UX failure before it is a maths
failure.

## 7.4 Entry

| Element | Rule |
|---|---|
| Label | Real `<label>`; steppers have accessible names (B-13) |
| Step | 0.1 kg |
| Button | `LOG TODAY` / `UPDATE` *(existing)* |
| Same-date | Logging twice on one local calendar date **updates one row** and never creates two (B-03) |
| Failure | The number stays on screen and the error line says the write failed. It must never both fail and look fine |

## 7.5 The calorie-change acknowledgement

Absent from the design; `setCalChanged` / `clearCalChanged` are built.

| Rule | |
|---|---|
| When | Only when `calorieAdvice().tone === "act"` — the three states that instruct a change |
| Where | Inside the advice block, directly under the instruction, answerable without scrolling |
| Set | `I changed my calories today` → a **modal confirmation** (`Changed your calories today?` / `This starts a 7-day hold. No new calorie advice until {date}.` / `Yes, changed today` / `Not yet` lowest / 300 ms arm) → toast `Recorded.` |
| Clear | `I did not change anything` — **one tap, no confirmation.** Clearing restores advice, so the cheap direction is the safe direction. **Renders whenever `adv.holdUntil` is set — not only in state `cooldown`** (§7.5.1) |
| Announced | Both, through the persistent region |

All strings **NEW**, from `wo-003-train-weight.md` §3.5, still pending coach sign-off.

### 7.5.1 The hold that nobody can see — ruled (WO-005)

```
Flow:   Disclosing and clearing an active calorie hold
Entry:  A hold is on disk (calChangedAt within 7 days) and the rate has since drifted into
        above / on-target / below, so PHAT.calorieAdvice returns that band, not state cooldown.
Exit:   The hold expires on its own, or he clears it.
```

**The defect, stated plainly.** State 7 does not outrank bands 2, 3 and 4 — correct, they instruct
nothing. But the clear control was keyed to `state === "cooldown"`, so in exactly those three bands
the hold rendered nothing and offered nothing while still suppressing the next add-or-cut
instruction. The screen whose one job is *am I eating right* was silently holding back the only
answer it exists to give. It self-heals in under seven days, so it is not data loss — it is a lie of
omission, and the app does not get to make those.

**Ruling, three parts.**

1. **The clear control renders if and only if `adv.holdUntil` is non-null.** Not `state`, not `tone`.
   `holdUntil` is the engine's own statement that a hold is live, and it is set in every band as well
   as in `cooldown` (`logic.js` sets `out.holdUntil` before the `tone === "act"` test).
2. **Exactly one hold disclosure is on screen whenever `adv.holdUntil` is non-null**, never two:
   - `state === "cooldown"` → `adv.text` already *is* the disclosure. Nothing is added.
   - any band → the new **hold note**, below the sub-line.
3. **The hold note is a state disclosure, not a second instruction.** It carries no imperative, no
   kcal number and no rate, so it cannot argue with the band sentence above it.

**Copy — ONE new sentence. `strength-coach` must sign this off before it ships (§7.5.2).**

```
You changed calories {ago}. Hold ends {date}.
```

`{ago}` is the engine's existing `agoWord` — `today` · `1 day ago` · `3 days ago`. `{date}` is
`PHAT.dayMon`, never `Intl` (B-44). Rendered:

```
You changed calories today. Hold ends 18 Sep.
You changed calories 1 day ago. Hold ends 17 Sep.
You changed calories 3 days ago. Hold ends 15 Sep.
```

**Why this sentence and not another.** It opens with the same clause as state 7
(`You changed calories 3 days ago.`) because it is the same fact, and he should recognise it as the
line he has seen before rather than read it as news. It then drops state 7's second clause
(`Hold until 15 Sep before changing again.`) because that clause is an instruction, and an
instruction under `Change nothing. Recheck in 7 days.` is a second voice on one card. `Hold ends
{date}` states when, and nothing else. `Hold` is not a new word to him: the confirmation he tapped
through to create this said `This starts a 7-day hold.`

**Hierarchy — where it sits, and what it must not outrank.**

```
[REF] the advice block during a hold, with a band showing

  7-DAY AVERAGE (6 OF 7 DAYS)                          ← still the biggest thing on the screen
  84.6 kg
  Change vs last week            +0.41 kg

│▌ CALORIE DECISION                                    kicker, --faint, 11 px
│▌ +0.41 kg per week. Above target, inside the         .lead, --bone, 14.5 px   ← the answer
│▌ margin. Change nothing. Recheck in 7 days.
│▌ Target: +0.2 to +0.3 kg per week. Averages          sub-line, --dim, 13 px
│▌ over 14 days.
│▌ You changed calories 3 days ago. Hold ends          hold note, --dim, 13 px  ← same rank as
│▌ 15 Sep.                                                                        the sub-line
│▌ ┌─────────────────────────────────────────┐
│▌ │        I did not change anything        │        ghostbtn, full × 48
│▌ └─────────────────────────────────────────┘
```

| Rank | Element | Why there |
|---|---|---|
| 1 | The 7-day average | Unchanged. It is the number he came for and the only one he is asked to trust |
| 2 | The band sentence, `adv.text` | The answer to the screen's question. Nothing below it may be louder, and the hold note is not |
| 3 | The sub-line | How the answer was computed |
| 4 | **The hold note** | Same size, weight and token as the sub-line — **never bolder, never `--bone`, never its own kicker, never its own rule.** It is footnote rank: true, needed, not the point |
| 5 | The clear control | Directly under the note it refers to, so the disclosure and its exit read as one thing |

**One enclosure, not two.** The hold note lives *inside* the existing advice block. A second rule, a
second kicker or a second card would read as a competing instruction, which is the failure this
ruling exists to avoid (§2.1).

**Interactions**

| Tap | What changes |
|---|---|
| `I did not change anything`, band showing | One tap, no confirmation. `calChangedAt` clears. Re-render: the hold note and the control are both gone; **the average, the change row, the band sentence and the sub-line are all identical to before.** Toast `Hold cleared.` Announced |
| `I did not change anything`, cooldown showing | Unchanged from §3.5: the hold sentence is replaced by the band sentence the hold was suppressing, and the set control returns in tone `act`. Toast `Hold cleared.` Announced |
| Nothing at all | The hold expires on its date. The note and the control disappear on the next render. No toast, no notice — he was never told it would end with a ceremony |

**On the band case, the honest note for the engineer:** clearing while a band is showing changes
almost nothing visible, and that is correct. Do not animate it, do not flash the advice block, do not
add a "calorie advice is back" line. The toast plus the disappearance of the control is the whole
feedback, because the whole effect is on a *future* instruction. Dressing it up would be the app
claiming credit for something it did not do yet.

**States**

| State | Present |
|---|---|
| No hold | No hold note, no clear control. `holdUntil` is null |
| Hold + band 2 / 3 / 4 | Band sentence · sub-line · hold note · clear control. **No set control** |
| Hold + band 1 / 5 / 6 | Engine returns `cooldown`: hold sentence · sub-line · clear control. **No hold note** (it would duplicate the sentence) and no set control |
| Hold + not-enough-data (A / B / C) | `holdUntil` is null in those states — the engine never reaches the cooldown test. So **no hold note and no clear control**, and the hold is unreachable until the windows fill. Deliberate: a screen that cannot compute a rate must not start explaining suppression rules |
| Hold + empty log | As above. Nothing |
| Clearing fails to write | The existing storage-failure line (§2.5). The hold note and the control both **stay**, because the hold is still on disk. Never both fail and look fine |
| Error — `calorieAdvice` throws | Fail silent on advice: the average with its count and nothing else, hold note included (`wo-003-train-weight.md` §3.6) |
| Offline | Identical |
| Demo | Identical. The hold is a real-log fact and demo mode does not write it |

**A11y**

- The clear control's accessible name is its visible label. Do not invent a longer one; instead
  `aria-describedby` points it at the hold note's element, so a screen reader reads
  `I did not change anything` followed by `You changed calories 3 days ago. Hold ends 15 Sep.` No new
  string is created to make that work.
- The hold note is plain text in DOM order between the sub-line and the control. No `aria-live` on
  it — `render()` recreates the block, and the block is already announced through the persistent
  region after an entry or a clear (`wo-003-train-weight.md` §3.7).
- **Focus.** Clearing removes the focused control. Focus moves to the advice block's container
  (`tabindex="-1"`), never to `<body>`. The toast is announced through the persistent region, so the
  announcement does not depend on where focus lands.
- Contrast: the hold note uses the sub-line's token and size. Alpha never below `.55` (§0.5) and, on
  `--surface`, never `.50`.

**Dependency — `backend-engineer`, and it is blocking.** The sentence must come from the engine as a
field, not be assembled in the view (§12.1: no sentence is assembled in a view, and `{ago}` needs
`agoWord`). Required: `PHAT.calorieAdvice` returns **`holdNote`**, a string that is non-empty
**exactly when `holdUntil` is non-null and `state !== "cooldown"`**, and `""` otherwise. Built from
the existing `agoWord` and `dayMon` helpers, no new formatting. That gives QA two assertions instead
of a judgement: `holdNote !== ""` implies `holdUntil !== null`, and `state === "cooldown"` implies
`holdNote === ""`.

**Out of scope.** Changing who outranks whom — state 7 still does not outrank bands 2, 3 and 4, and
this ruling exists *because* that is right. Any change to the 7-day length. A countdown ("4 days
left"), which is a number that ticks and therefore a number he reads (§4.7). A hold history. Letting
the hold be set from a band state — the set control still renders only in tone `act`.

### 7.5.2 Sign-off required — `strength-coach`

**`You changed calories {ago}. Hold ends {date}.` is NOT signed off and I am not signing it.** It
discloses an app state rather than prescribing anything, but it sits directly under a calorie band
sentence and it is the app's account of why a change instruction is being withheld — close enough to
a training claim that the coach rules on it, not me. It ships only with that sign-off; until then the
clear control still renders on `holdUntil` (that part is a defect fix and needs no copy) and the note
slot renders nothing.

**A related finding for the same review, not a change I am making:** the confirmation body already in
the build reads `This starts a 7-day hold. No new calorie advice until {date}.` In bands 2, 3 and 4
calorie advice **does** still render during a hold, so that promise is imprecise. It is invisible in a
modal and visible on the card, which is why I did not reuse its wording for the note. Whether it
should be tightened is the coach's call with the rest of §3.5's strings.

## 7.6 States

| State | Present |
|---|---|
| Empty | Entry control + `Same time, same conditions, every morning. The daily number is noise. The weekly average is the signal.` *(existing)*. No panel, no zeroes, no placeholder chart |
| Thin history | State A / B / C copy verbatim. Average may show with its count |
| Populated | Average · change row · one of states 1–6 · sub-line · control in tones "act" |
| Cooldown | State 7 · sub-line · `I did not change anything` |
| **Hold, band showing** | Band 2 / 3 / 4 · sub-line · **hold note** · `I did not change anything`. No set control (§7.5.1) |
| Error | Fail silent on advice; average only |
| Write failed | §2.5 |
| Offline | Identical |
| Demo | Band; `{n} sample entries` |

---

# 8. SCREEN — Diet

```
Flow:   Today's targets
Entry:  Diet tab.
Exit:   None. One persisted boolean.
```

Closes B-29. **Every number and every sentence on this screen is `strength-coach`'s (WO-004 W1) and
is not written here.** The design proposes training 3,200 / 170 / 300 / 145 and rest
2,500 / 175 / 60 / 175 plus carb-placement and calibration copy; W1 returns them approved or
corrected **verbatim**. I specify only the slots.

| Block | Slot |
|---|---|
| Segment | `TRAINING DAY` / `REST DAY` — ≥ 120 × 48 each, `aria-pressed`, and a **non-colour selected mark** (a leading `▪` or a 2 px underline). Fill alone is colour-alone |
| Four cells | Calories · Protein · Carbohydrate · Fat. Labels `.55` on `--surface` (the prototype's `.50` is 4.3 : 1, §0.5) |
| Protein check | 56 px row, two-line label, `aria-pressed`, mark `✓` / `○` **plus** the label text changing. Persists across a reload |
| Timing | `Carb placement` / `Rest-day watch item` — **W1** |
| Calibration | **W1**. The design's version restates the calorie protocol, which is Rule W1's; it must agree with `calorieAdvice` word for word or it is a second, disagreeing source of the same advice |

**The protein check is not data the engines read.** A test asserts no engine reads it, and toggling
it writes only its own key — `phat:v1:log`, `phat:v1:bw` and `phat:v1:draft` byte-identical before
and after.

**States:** empty is not reachable (the targets are static). Absent W1 copy → **the screen does not
ship**; it does not render the design's numbers as a placeholder, because a calorie target the coach
has not approved is exactly the class of thing this app is not allowed to display. Error → per-cell
catch. Offline → identical.

---

# 9. SCREENS — Plans and Plan Editor

The Plan Editor is in scope and is specified, not sketched. It is also the item most likely to be
done instead of training, which is why the design's own honest note ships verbatim.

## 9.1 Plans list

| Block | Contents |
|---|---|
| Rows | `{name}` · `{n} days · {n} exercises · {n} sessions logged` · badge `ACTIVE` |
| Read-only row | `PHAT` · `Layne Norton, unedited · read-only template` |
| Unsaved edits | Badge `UNSAVED CHANGES` **NEW** on any plan with a live working copy (§9.6) |
| Broken plan | Badge `Cannot open` **NEW**; the row does not open; the plan is never repaired and never dropped (§0.7) |
| Build | `+ BUILD FROM EMPTY` — `Name the days, add the lifts, set the ranges` *(design)* — **superseded by §9.9.7 (WO-007):** the primary is `Duplicate PHAT and rearrange it`; `Build from empty` is secondary, below the stored plans |
| Honest note | `Editing the plan is the easiest thing in this app to do instead of training. PHAT is already a good plan. The number that moves is sessions logged.` *(design, verbatim)* |

**Switching the active plan** changes no logged session. Sessions logged under plan A still resolve
their names, still appear in Trend, and `lastFor` still finds them. A session whose plan was deleted
renders with the name recorded at save time where one exists, and otherwise reads
`Exercise no longer in any plan` **NEW** — never a raw id, never blank.

**Duplicate — a conflict I am flagging rather than designing around.** WO-004 W14's acceptance
criterion says a duplicate gets **new ids and therefore separate history**, and that the UI says so
before the duplicate is created. `PHAT.copyPlan` as built **preserves ids on purpose**, with the
reason written into the source: re-minting them would orphan every logged set in exactly the way
C-6 exists to prevent. **The code is right and the criterion is wrong.** So the UI says the true
thing:

```
The copy keeps this plan's history. Both plans read and write the same exercise history.   NEW
```

`project-manager`: W14 criterion 3 needs restating. I am not shipping a sentence that contradicts the
data layer.

## 9.2 Editor — shape

```
  ‹ PLANS                                        ← top-left, non-destructive, 88 × 44
  plan name (editable field, 48 px)
  {from} · {n} days · edited {date}
  ─────────────────────────────────────
  day row  [↑ 44] [↓ 44] [name — expands, 52 px] [{n} ex · {n} sets]
     └ expanded:
         exercise row  [name field 48] [− 44] [{s} × {lo}–{hi}] [+ 44] [✕ 44]
         + ADD EXERCISE
  + ADD DAY
  ─────────────────────────────────────
  Editing the plan never rewrites logged history.        (design, verbatim)
  [ SAVE PLAN ]                                  ← bottom, full width, 56 px
  DISCARD CHANGES                                ← last in the scroll, 48 px
```

`SAVE` leaves the top-right corner: it is the commit, and a commit is not a corner control (§0.4).

## 9.3 The read-only plan

`renameExercise` and every other editor refuse a `readOnly` plan with reason `locked`. A screen full
of controls that refuse is worse than no controls. **Ruled: the shipped PHAT plan opens in a
read-only view — the editing controls are absent, not disabled** — with one action:

```
PHAT is read-only. Duplicate it to make changes.        NEW
[ DUPLICATE THIS PLAN ]                                 NEW, full × 48
```

## 9.4 Reading a day

| Element | Rule |
|---|---|
| Day order | `↑` / `↓`, 44 × 44 each. Reordering changes **display order only**; no `dayId` changes |
| Exercise target | `{s} × {lo}–{hi}` |
| Cut accessory | Marked `CUT` **NEW** in text, not by strike-through alone, at `.55` (the prototype's `.45` strike-through fails both the contrast floor and the colour-alone rule) |
| Reorder within a day | `PHAT.moveExercise` exists; if the editor exposes it, the same 44 px arrows |

## 9.5 Adding and deleting

**Add exercise — `k` and `implement` are required at creation (C-7).** There is no path to an
untyped exercise, because `k` selects which rule fires and which rest applies, and `implement` drives
Z2's load word and I2's increment line. A silent default decides what the app tells him to lift.

A form, not a row that appears pre-filled:

| Field | Control | Required |
|---|---|---|
| `Name` | text, 48 px | yes |
| `Sets` | stepper, 44 px buttons | yes |
| `Rep range` | two steppers, `lo` and `hi` | yes |
| `Type` | `POWER` / `HYPERTROPHY` / `SPEED`, ≥ 44 px each, `aria-pressed` | yes |
| `Implement` | `BARBELL` / `DUMBBELL` / `MACHINE` / `CABLE` / `BODYWEIGHT` | yes |
| `Same movement as` | optional picker over the plan's existing lifts — this is `lift`, the trend grouping (C-6). Omitted mints a new lift group | no |
| `Cue` | optional single line | no |

Helper line under Type and Implement, **NEW, routed to `strength-coach`** because it describes what
the rules do with the answer:

```
Type decides which rule reads this exercise and how long you rest. Implement decides how loads are described.
```

`ADD` is refused with the refusal treatment while any required field is empty; the refusal names the
field. No exercise is created until every required field is answered.

**Delete exercise — confirmation + undo.**

| Element | String |
|---|---|
| Headline | `Delete {ex} from this plan?` **NEW** |
| Body, with history | `{n} logged sessions keep their sets. This removes it from the plan only.` **NEW** |
| Body, no history | `Nothing has been logged against it.` **NEW** |
| Destructive | `Delete from plan` **NEW** |
| Safe, lowest | `Keep it` *(existing)* |
| Toast | `{ex} deleted.` **NEW** + `Undo` |

Undo restores the object `removeExercise` returned, byte-for-byte, at its original index.

**Deleting an exercise a plan-scoped table references** (`SPEED_SRC`, `REINTRO_ORDER`, `KEY_LIFTS`)
drops the reference cleanly and the affected rule goes to its named absent state with **W1's silence
copy**. That copy does not exist yet; until it does, the affected surface renders nothing rather than
a guess. **Fail silent, never fail confident.**

## 9.6 The working copy — how an abandoned edit ends

1. Every edit writes to a **persisted working copy** under its own key. The stored plan is written
   only by `SAVE PLAN`.
2. A reload, a kill or a navigation away returns to the editor with the edits intact, and the stored
   plan in its last saved state. Never half-applied.
3. Leaving via `‹ PLANS` with pending edits keeps the working copy and badges the plan row
   `UNSAVED CHANGES`. **No confirmation** — nothing is lost.
4. `DISCARD CHANGES` is a **confirmation**: `Discard your changes to {name}?` **NEW** /
   `The saved plan does not change.` **NEW** / `Discard changes` **NEW** / `Keep editing` **NEW**.
5. `SAVE PLAN` commits atomically. On failure: §2.5's refusal shape, the working copy intact.

## 9.7 Editor states

| State | Present |
|---|---|
| Empty plan (built from empty) | `No days yet.` **NEW** + `+ ADD DAY`. Not an error |
| Empty day | `No exercises yet.` **NEW** + `+ ADD EXERCISE` |
| Read-only | §9.3 |
| Editing | Working copy live, `UNSAVED CHANGES` visible in the header area |
| Edit refused | Refusal enclosure naming the field. **A `reason` from `logic.js` is a developer signal and is never rendered** |
| Save failed | §2.5 |
| Error mid-render | Neither store is written (§0.7) |
| Offline | Identical |

## 9.8 What the editor must never do

Rewrite an `id`. Rewrite a `lift` on a rename. Renumber a `dayId`. Delete history. Produce an
exercise without `k` and `implement`. Change the active plan as a side effect of an edit.

## 9.9 Re-split — the cross-day move and the way in (WO-007 W2, 2026-09-12)

Author: `ux-designer` · Implements: WO-007 §4 W2 · Consumed by: W4 (`frontend-engineer`), W5 (QA)
Depends on: W3's `PHAT.moveExerciseToDay` / `PHAT.removeDay` · W1 for every string marked
**[W1 slot]**, which is left empty here and is not mine to fill.

**Chady's ask:** *"I don't want to build from empty, I might want to use the same exercises from phat
but alternate them? maybe I want to do push / pull / legs."* Two things follow. The editor needs a
way to move an exercise to another day with its id intact, and the Plans list has to stop leading
with the route he said he does not want.

### 9.9.1 The recommendation — a per-exercise "Move to another day" sheet. Not drag, not a matrix.

**Ruled: the sheet.** Three candidates, one reason each is or is not the answer:

| Candidate | Verdict | Reason |
|---|---|---|
| **Per-exercise sheet** — tap a control on the row, pick a day from a list | **Ships** | Two taps per move, both on ≥ 44 px targets, both readable without decoding a glyph. It reuses `askSheet`'s enclosure, scrim and focus handling, so it inherits behaviour QA has already proven. Nothing in it survives a `render()` — the sheet lives in `#modal`, outside `#view` — so B-19 cannot touch it |
| Drag | Rejected | A drag is a held gesture. The editor re-renders `#view` by `innerHTML` on every edit (B-19), which destroys the dragged node mid-gesture; native mobile drag needs a library, which §3.1 forbids; and a chalky thumb on a 1 rem row is the wrong input for a gesture that has no cancel |
| Day-assignment matrix — every exercise listed once with a day selector | Second-best | It is the right answer if the row cannot hold another control. It can (§9.9.2), so the matrix costs a new screen for no gain. If W4 finds the row cannot make 44 px on every control at 200 %, the matrix is the fallback and §9.9.3's sheet becomes the selector on each matrix row — the rest of this section holds |

**The one number that decides the row layout.** At 400 px the content box is 368 px (`.pad` is
16 px a side). The existing control line is five 44 px buttons, the 88 px target button and five
8 px gaps: **348 px**. A seventh 44 px glyph is 400 px. It does not fit, and a lone glyph wrapped to
a second line reads as a rendering fault. So the new control is **not a glyph and not on that
line**.

### 9.9.2 The control on the row

```
Flow:   Move an exercise to another day
Entry:  Plan Editor, an editable plan with two or more days, an expanded day, any exercise row.
Exit:   The exercise is on the day he picked, last in that day's order, id byte-identical;
        or nothing changed.
```

```
[REF] the exercise row after this change — line 1 is the shipped row, untouched

┌ .peex ──────────────────────────────────────────────┐
│ [ Bent-over row                            ]  CUT   │  name field, 48 px (unchanged)
│ [↑] [↓] [−] [ 3 × 3–5 ] [+]                    [✕]  │  line 1, 348 px at 400 (unchanged)
│ [ Move to another day ]                             │  line 2, NEW, left-aligned, ≥ 132 × 44
└─────────────────────────────────────────────────────┘
```

| Rule | |
|---|---|
| Label | `Move to another day` **NEW**. A text button, not a glyph: this is the one control on the row that has no established symbol, and the visible label is the accessible name (`Move {ex} to another day`), which is what W4's criterion asks for |
| Size | ≥ 132 × 44 at 400 px; auto width to fit its text; **never truncates**. At 200 % it may take the full row width and wrap to two lines; min-height 44 holds |
| Position | Its own line, **below** line 1, left-aligned under `↑`/`↓`. Diagonally opposite `✕`, which stays at the right end of line 1 — the two controls that change *where* an exercise is are never adjacent |
| Form | Bordered like `.petgt` (`--line`, 2 px, zero radius), `--bone` text, transparent fill. Not amber — amber is the live thing, and this row is not it |
| Present when | The plan is editable **and** has ≥ 2 days |
| Absent when | One day (nothing to move to), or the read-only plan. **Absent, not disabled** (§9.3). With one day the `+ Add day` button is already the next thing on screen |
| Cost | Every exercise row grows by 52 px. Days are collapsed by default and he works one day at a time, so the scroll cost is one day's exercises, not the plan's |

Line 1 is not re-arranged. Every control on it keeps its position, so nothing he has learned moves
and B1 for the six existing controls is not re-opened.

### 9.9.3 The sheet

Opens in `#modal` on the tap. Same enclosure as `askSheet` (`.sheet`, scrim, `role="dialog"`,
`aria-modal`, heading focused on open). It is a **list variant**: one row per destination day, no
danger button, `Not now` last.

```
[REF]
┌──────────────────────────────────────────┐
│ Move Bent-over row                       │  h2, tabindex=-1, focused on open
│ Now on Upper power. Lands last on the    │  .det
│ day you pick.                            │
│ ┌──────────────────────────────────────┐ │
│ │ Lower power              7 exercises │ │  row, full × 48, <button>
│ ├──────────────────────────────────────┤ │
│ │ Pull                     5 exercises │ │
│ ├──────────────────────────────────────┤ │
│ │ Push                     0 exercises │ │
│ ├──────────────────────────────────────┤ │
│ │ Legs                     1 exercise  │ │
│ └──────────────────────────────────────┘ │
│ [               Not now               ]  │  full × 52, lowest, pinned
└──────────────────────────────────────────┘
```

| Rule | |
|---|---|
| Heading | `Move {ex}` **NEW** |
| Body | `Now on {day}. Lands last on the day you pick.` **NEW** — the current day is *marked* here and *not offered* below. Both of W2's asks, no disabled row |
| Rows | Every **other** day of the **working copy**, in the plan's day order. Left: `{day}`. Right: `{n} exercises` (`1 exercise` written out; `0 exercises` for an empty day — he can see what he is building, WO-007 W2). Counts come from the working copy, so unsaved moves are already in them |
| Row size | Full width × ≥ 48. Whole row is the `<button>` |
| Row text | Day name `--bone`, 1 rem, `overflow-wrap:anywhere`. Count `--dim` (7.0 : 1 on `--surface`); never `--faint` inside a sheet — §0.5 rule 2, the sheet ground is `--surface` |
| `Not now` | Full × 52, `.ghostbtn`, **last**. If the list overflows the sheet, the list scrolls and `Not now` stays pinned at the sheet's bottom edge — the safe tap is never below the fold |
| Cancel | `Not now`, scrim tap, `Escape`. Each closes with **no move** and returns focus to the row's `Move to another day` control (`cfg.back`) |
| Destination | **End of the destination day.** W3's default `toIndex`. The destination's order is his and a move never displaces anything in it; the moved row is then at a known place — the bottom — where `↑` puts it wherever he wants |
| Arm delay | None. No row in this sheet destroys anything |
| Mixed-role / speed-beside-source / duplicate-lift | **[W1 slot]** — if the coach rules *warn once*, see §9.9.6; if *refuse*, the refused day's row is **absent from the list**, not disabled, and the body gains the coach's sentence. Nothing here until W1 returns |

**Interactions, tap by tap.**

| # | Tap | What changes |
|---|---|---|
| 1 | `Move to another day` on Bent-over row (Upper power) | Sheet opens over the editor. Focus on `Move Bent-over row`. Editor behind is unchanged |
| 2 | `Pull · 5 exercises` | `PHAT.moveExerciseToDay(w, "d1a", "pull")` through `applyEdit` → `saveEdits()`. Sheet closes. Editor re-renders from the working copy: Bent-over row is gone from Upper power's list; Pull's collapsed day row reads `6 ex · {sets} sets`; Pull does **not** expand; scroll position is kept as for any other `applyEdit`. `UNSAVED CHANGES` is on. Toast `Bent-over row moved to Pull.` with `Undo` |
| 3 | `Undo` (toast, or the editor's persistent undo control) | `moveExerciseToDay` back to `from.dayId, from.index` — the index, not the end. Toast `Bent-over row is back on Upper power.` The working copy is byte-identical to before tap 2 (W3 D3) |
| — | `Not now` / scrim / `Escape` at step 2 | Sheet closes. Nothing written. Focus back on the trigger |

**Focus after a move.** The trigger no longer exists — the row left the day. Focus goes to the
`Move to another day` control of the row now occupying that index in the origin day; if the origin
day is shorter than that, its last row's; if the origin day is now empty, its `+ Add exercise`.
Never to `document.body`, never to the top of the page.

**Undo — ruled: needed, not noise.** Moving back by hand is two more taps *and lands the exercise
at the end of the origin day, not where it was*. Only undo restores `from.index`. And a list of
48 px rows picked with a chalky thumb is exactly where a wrong day gets tapped. So a move gets the
same undo as a delete: the toast control (§2.4, ≥ 88 × 48) and the editor's persistent undo
button in `.pebottom`. **One undo slot, latest action wins**, as `toastUndo` already works; the
persistent button's label says which action it now undoes: `Undo: put {ex} back` (delete,
existing) or `Undo: move {ex} back to {day}` **NEW** (move). A pending delete-undo displaced by a
move is not a loss — nothing leaves the stored plan until `SAVE PLAN`, and `DISCARD CHANGES`
restores all of it.

**States.**

| State | Present |
|---|---|
| Plan has one day | Control absent. No line says so |
| Read-only plan | Control absent (§9.3) |
| Sheet open | Editor inert under the scrim. Every other day listed with its count, current day named in the body only |
| Destination empty (`0 exercises`) | Listed like any other. After the move, that day's `No exercises yet.` is gone and its row reads `1 ex` |
| Origin now empty | `No exercises yet.` + `+ Add exercise` + **`Delete this day`** (§9.9.5) |
| Success | Row gone from origin, destination count up, toast + undo, `UNSAVED CHANGES` |
| Refused by `moveExerciseToDay` (`ok:false`) | Sheet **stays open**; `sheetErr` renders `Could not move that exercise.` *(existing string)* under the list; `Not now` closes it. `reason` is never rendered (§9.7). Working copy untouched |
| Working-copy write failed (W4 D10) | The existing `applyEdit` refusal, unchanged. On disk: pre-move or post-move, never a third document |
| Session in progress on this plan | The move is allowed in the working copy — WO-006 D10 blocks `SAVE PLAN`, not editing. Unchanged |
| Offline | Identical. Nothing here reads the network |

**A11y.**

- Trigger: `<button aria-label="Move {ex} to another day">` with visible text `Move to another
  day`. Visible label is a prefix of the name — WCAG 2.5.3 holds.
- Sheet: `role="dialog" aria-modal="true" aria-labelledby=` the `Move {ex}` heading. Heading
  `tabindex="-1"`, focused on open; first Tab lands on the first day row; `Not now` last in the
  Tab order. `Escape` cancels.
- Day rows are `<button>`; accessible name `{day}, {n} exercises` — the dialog heading supplies
  "move" so the row does not repeat it.
- Announcements through `#bs-live` only, via `toastUndo` → `announce()`: `{ex} moved to {day}.` and
  on undo `{ex} is back on {day}.` The toast node stays `aria-hidden` (§2.6). Nothing in the sheet is
  a live region.
- Greyscale: state is carried by the row's *absence* from the origin day, the destination's count
  and the toast sentence. No colour carries anything.
- Contrast: heading `--bone` 12.7 : 1 on `--surface`; body and counts `--dim` 7.0 : 1; row rule
  `--rule` 3.3 : 1 as a border only.

### 9.9.4 Adding the destination first

A PPL does not exist until he has made the days. The flow he will actually run is: `+ Add day`
three times, name them, then open each PHAT day and send its exercises out. The sheet does **not**
offer `+ New day` as a destination — that would fuse `addDay` and `moveExerciseToDay` into one tap
with one undo and one write, and neither W3's contract nor `toastUndo`'s single slot expresses that.
Out of scope, stated so W4 does not add it.

### 9.9.5 Deleting an emptied day — W4 needs the strings, so they are here

Not in W2's scope line; included so no sentence is invented in a view. W4's rule stands: the control
exists **only** on a day with zero exercises, absent otherwise, confirmed by one sheet, no undo
(nothing is lost).

| Element | String |
|---|---|
| Control, inside the expanded empty day, below `+ Add exercise` | `Delete this day` **NEW** — full × 48, `.ghostbtn`, never in the day header row |
| Headline | `Delete {day}?` **NEW** |
| Body | `It holds no exercises. Nothing is lost.` **NEW** |
| Destructive, 300 ms arm | `Delete day` **NEW** |
| Safe, lowest | `Keep it` *(existing)* |
| Toast | `{day} deleted.` **NEW** — no undo control |
| Refused (`removeDay` returns `ok:false`) | `Could not delete that day. Nothing changed.` **NEW**, in the sheet via `sheetErr` |

### 9.9.6 The warn-once slot — reserved for `strength-coach`, empty here

W1 questions 1, 3 and 4 may return *warn once* for a mixed-role day, speed work beside its source,
or two slots of one `lift` on a day. **No sentence about what a move means for the training is
written in this section.** What is specified is where such a sentence would render, so W4 has a
place and W1 has a shape:

| Rule | |
|---|---|
| Where | In `.pebottom`, directly above `SAVE PLAN`, in the **advice** enclosure (§2.1.1: 3 px `--dim` left rule, kicker, no `!`). Above the commit because the commit is where it matters; never in the sheet, which is a picker and not a reader |
| Kicker | **[W1 slot]** |
| Body | **[W1 slot]** — one or two sentences, verbatim from the coach, `{ex}` / `{day}` substitutions only |
| Dismiss | `Got it` **NEW**, ≥ 88 × 44, right-aligned inside the block. Dismissal is remembered **per plan per condition** in the working copy's metadata, never in `phat:v1:plans`, so it survives a reload but not a discard |
| Never | Blocks a move, blocks `SAVE PLAN`, re-renders after dismissal, or renders while the slot is empty |
| If W1 returns *refuse* instead | §9.9.3: the offending destination is absent from the sheet and the body carries the coach's sentence. This block is not used |
| If W1 returns *silent* | Nothing renders. No empty enclosure |

Likewise **[W1 slot]** for question 2 (the row's `Type` line after a move) and question 8 (a new
ABSENT line on the Plans screen). Both render in their existing places with no change in shape.

### 9.9.7 The Plans list — the way in (B-85)

```
Flow:   Start a plan of his own
Entry:  Plans tab.
Exit:   The editor, open on a copy of PHAT (primary) or on an empty plan (secondary).
```

**Ruled order.** Same skeleton as §9.1; two rows move and one changes clothes.

```
[REF]
  Plans · {n} plans
  ┌ PHAT ──────────────────────────────── ACTIVE ┐   1  the template, read-only, as today
  │ Layne Norton, unedited · read-only template │
  └─────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────┐   2  PRIMARY, full × 56
  │ Duplicate PHAT and rearrange it             │
  │ Same exercises, same history. Move them     │
  │ between days, rename the days.              │
  └─────────────────────────────────────────────┘
  ┌ Push / pull / legs ───────────── UNSAVED … ┐   3  stored plans, then unsaved-only ones
  │ 6 days · 42 exercises · 0 sessions logged   │
  └─────────────────────────────────────────────┘
  ┌ Build from empty ────────────────────────── ┐   4  SECONDARY, dashed, full × 48
  │ Name the days, add the lifts, set the ranges│
  └─────────────────────────────────────────────┘
  What {plan} does not declare                      5  ABSENT lines, unchanged
  One honest note                                   6  verbatim, unchanged
```

| Slot | Rule |
|---|---|
| 1 | Unchanged. The screen's question is *which programme am I on*; the active plan is the first readable thing, and on first run that is PHAT |
| 2 | **`Duplicate PHAT and rearrange it`** **NEW** with the sub-line `Same exercises, same history. Move them between days, rename the days.` **NEW**. Directly under the PHAT row because it is an action *on* PHAT. Tap → the existing duplicate sheet (`Duplicate PHAT?` · `The copy keeps this plan's history. Both plans read and write the same exercise history.` · `Duplicate` · `Not now`), then the existing path: the copy is stored, the editor opens on it, toast `Copied. This is {name}.` |
| 2, why the sheet stays | One tap would be nicer. But a duplicate is written to `phat:v1:plans` at once, and plan deletion is out (ruled 2026-09-12). A mis-tap on a one-tap primary creates a plan he cannot remove. The sheet is the cheapest guard that does not need a delete |
| 2, fill | **Primary (amber) while no stored plan exists.** Once one does, the same row renders as `.ghostbtn` in the same position — amber is reserved for the live thing, and after he has a plan of his own the live thing is that plan, not a second copy |
| 3 | Stored plans in store order, then unsaved-only working copies. Unchanged |
| 4 | **`Build from empty`** **NEW** *(was `+ Build from empty`)* with its existing sub-line `Name the days, add the lifts, set the ranges`. Below every plan he owns. Dashed border, full × 48, `--bone` title, `--dim` sub. Kept, not removed: he said "don't want", not "remove" (WO-007 §2). The `+` goes from both creation rows — the labels are verbs |
| 5, 6 | Unchanged. The honest note ships verbatim: `Editing the plan is the easiest thing in this app to do instead of training. PHAT is already a good plan. The number that moves is sessions logged.` |

**A first-time tap.** On a fresh install the first tappable thing after the PHAT row is slot 2. One
tap, one `Duplicate`, and he is in the editor on a copy of PHAT with 42 exercises, `speedSource`,
`keyLifts`, `cut` tiers and `derivedFrom` all intact — the route WO-007 §2 needs him on.

**States.**

| State | Present |
|---|---|
| No stored plans (first run) | PHAT · **primary** duplicate · Build from empty · ABSENT · note |
| One or more stored plans | PHAT · duplicate as ghost · plans · Build from empty · ABSENT · note |
| Demo store loaded | Duplicate refuses with `Sample data is loaded. Leave it before saving a plan.` *(existing)*. Build from empty is unaffected (it writes a working copy, not the store) |
| Plan store blocked (`S.blockWrites[PLANS]`) | Duplicate refuses with the existing store refusal. Row stays; refusal in the `S.err` slot at the top of the list, `role="alert"` |
| Broken active plan | `The active plan cannot be opened. PHAT runs until it is fixed or another plan is chosen.` *(existing)* above slot 1. Unchanged |
| Offline | Identical |

**A11y.** Slot 2 is a `<button>` with accessible name = its title; the sub-line is `aria-describedby`.
Slot 4 the same. Tab order is the visual order. No live region change: opening a sheet is his own
tap. Primary fill `--bg` on `--amber` 9.3 : 1; ghost `--bone` on `--bg` 14.8 : 1.

### 9.9.8 Strings — every new one, in one table

| String | Where | Owner | Status |
|---|---|---|---|
| `Move to another day` | Row control | UX | **NEW** |
| `Move {ex} to another day` | Row control `aria-label` | UX | **NEW** |
| `Move {ex}` | Sheet heading | UX | **NEW** |
| `Now on {day}. Lands last on the day you pick.` | Sheet body | UX | **NEW** |
| `{n} exercises` / `1 exercise` | Sheet row, right | UX | **NEW** (via `plural`) |
| `Not now` | Sheet, last | — | existing |
| `{ex} moved to {day}.` | Toast + `#bs-live`, with `Undo` | UX | **NEW** |
| `{ex} is back on {day}.` | Toast + `#bs-live` after undo | UX | **NEW** |
| `Undo: move {ex} back to {day}` | Persistent undo button, `.pebottom` | UX | **NEW** |
| `Could not move that exercise.` | Sheet refusal | — | existing |
| `Delete this day` | Empty day, below `+ Add exercise` | UX | **NEW** |
| `Delete {day}?` / `It holds no exercises. Nothing is lost.` / `Delete day` | Confirmation | UX | **NEW** |
| `{day} deleted.` | Toast | UX | **NEW** |
| `Could not delete that day. Nothing changed.` | Sheet refusal | UX | **NEW** |
| `Got it` | Warn-once dismiss | UX | **NEW** — renders only once W1 fills the slot |
| Warn-once kicker and body | `.pebottom` advice block | `strength-coach` | **[W1 slot]** — empty |
| Refuse sentence, if any | Sheet body | `strength-coach` | **[W1 slot]** — empty |
| Type line on a moved row | Row `.perange` | `strength-coach` | **[W1 slot]** — unchanged until ruled |
| Plans-screen ABSENT line for a re-split plan | Plans list slot 5 | `strength-coach` | **[W1 slot]** |
| `Duplicate PHAT and rearrange it` | Plans list slot 2 | UX | **NEW** — the string W6 greps the live `index.html` for |
| `Same exercises, same history. Move them between days, rename the days.` | Slot 2 sub-line | UX | **NEW** |
| `Build from empty` | Plans list slot 4 | UX | **changed** from `+ Build from empty` |
| `Name the days, add the lifts, set the ranges` | Slot 4 sub-line | — | existing |

Every `{ex}` and `{day}` passes through `esc()` (W4 B3). No string above makes a claim about
training; the ones that would are the empty slots.

### 9.9.9 Control inventory — rows added to §0.4.1

| # | Screen | Control | Min hit area | Notes |
|---|---|---|---|---|
| 48 | editor | Exercise `Move to another day` | ≥ 132 × 44 | Own line under line 1; absent with one day |
| 49 | editor | Move sheet day row | full × 48 | One per other day |
| 50 | editor | Move sheet `Not now` | full × 52 | Lowest, pinned |
| 51 | editor | Empty day `Delete this day` | full × 48 | Present only at zero exercises |
| 52 | editor | Warn-once `Got it` | ≥ 88 × 44 | Only once W1 fills the slot |
| 53 | plans | `Duplicate PHAT and rearrange it` | full × 56 | Primary until a stored plan exists, then ghost |
| 35 | plans | `Build from empty` | full × 48 | **Amended**: demoted below stored plans, dashed |

### 9.9.10 What I could not settle

1. **The three coach verdicts** (mixed roles, speed beside source, duplicate lift) and the `Type`
   line after a move. Slots reserved in §9.9.3 and §9.9.6; nothing written. `strength-coach`, W1.
2. **Whether a moved `cut` accessory keeps its place in the destination's reintroduction order.**
   Not a screen question, but the sheet's `{n} exercises` count and the day row's `{n} ex` count
   include cut accessories; if the coach's answer to W1 question 6 changes what a day "holds", W4
   should say so on the count. Default: count every exercise on the day.
3. **The single undo slot.** Ruled above as one slot, latest action. If QA finds a realistic path
   where a delete's undo is lost to a following move and that matters, the fix is a two-deep undo,
   which is a `toastUndo` change and not a screen change.
4. **A destination day named the same as another.** `addDay` permits it; the sheet would show two
   `Pull` rows distinguished only by count. Not fixed here — day names are his — but W4 should
   append the day's position (`Pull · 3rd`) only if two names collide. Left as a note, not a rule.
5. **200 % measurement of line 1.** It already wraps at 200 % today; that every wrapped control still
   measures ≥ 44 is W4 B1's to prove by `getBoundingClientRect`, not mine to assert from CSS.

### 9.9.11 Out of scope, deliberately

`+ New day` inside the sheet (§9.9.4). Moving an exercise between plans. Deleting a non-empty day.
Deleting a plan. A first-open hint in the editor telling him how to re-split — the control's label
is the hint, and a permanent instruction is a line he learns to ignore. Alternating A/B weekly
plans. A `wd` weekday map for added days. Any change to the Session, Train, Trend or Weight screens.

---

# 10. SCREENS — Onboarding and Settings

## 10.1 Onboarding

```
Flow:   First run
Entry:  Boot when the log store AND the bodyweight store are both GENUINELY absent.
Exit:   START WITH AN EMPTY LOG → Home · LOAD SIX WEEKS OF SAMPLE DATA → demo mode → Home.
```

**Rules.**

1. It appears only when both stores are genuinely absent — **never when a read failed**. The two must
   not look the same (WO-001's `readRaw` distinction). With storage blocked, the storage notice wins
   (B-40's ordering rule) and onboarding does not render.
2. **It writes exactly one key** (`onboarded`) and **clears nothing**. `START WITH AN EMPTY LOG` sets
   a flag; it is not an erase and cannot become one.
3. The plan block is informational. `OR PICK ANOTHER PLAN` navigates to Plans.

**Content.** The design's copy ships as written — it is the best statement of what this app is:

```
Nothing logged yet
This app has one job: make logging a set faster than a spreadsheet. It has no streaks, no badges and no encouragement. It shows you last session's numbers and gets out of the way.
```

**Two changes to the design's inputs.**

- **The `Height cm` field is deleted.** No engine reads height, no screen displays it, and every
  field on first run is a tax paid before the first set. If a future rule needs it, it asks then.
- **The bodyweight field stays, labelled for what it does**: `Today's weight` **NEW**, with
  `Logged as today's entry. Weigh daily — the trend is what the app reads.` **NEW**. It is optional;
  leaving it empty writes no entry.

**States:** absent stores → onboarding. Read failed → storage notice, no onboarding. Demo mode
entered → band + Home. Write of the flag fails → Home renders anyway and onboarding reappears next
boot; it never blocks. Offline → identical.

## 10.2 Settings — what is deleted

| Section | Ruling |
|---|---|
| **Volume — `FULL VOLUME`** | **Deleted** (C-1, B-23). Its own helper text describes Rule V1's per-session ramp, which is not a checkbox. The tier's status lives on Home's cycle line and the offer lives on the session screen |
| **Weight increment — 2.5 / 5 KG** | **Deleted** (C-3, B-58). The increment is the rule's, not a setting's |
| **`SWITCH TO AN EMPTY LOG`** | **Deleted** (§2.4 item 9) |

A test greps the rendered output of all ten screens and finds neither a volume toggle nor a weight
increment control in any state.

## 10.3 Settings — what remains

| Section | Contents |
|---|---|
| Rest timer | `AUTO-START` / `MANUAL`, ≥ 120 × 48, `aria-pressed`, non-colour mark. Helper: `Auto-start begins the countdown when a set's reps are entered.` **NEW** (the design says "the moment reps are entered"; the rule is **on commit**, never on keystroke, and the helper must say what actually happens) |
| Data | Demo enter / leave (§3) |
| Export | `EXPORT EVERYTHING AS JSON` |
| Storage note | `Your log lives on this device.` — see §10.4 |

## 10.4 Export — the promise has to match the product

The design's note reads *"Export monthly so nothing costs you the history"* and the app offers **no
way to restore**. That promise is false until WO-002 ships an importer, and a false safety claim is
worse than no claim.

**Ruled: until an importer exists, the copy states what export actually is.**

```
Your log lives on this device. Export writes a copy you can keep. This version cannot read one back in yet.   NEW
```

When WO-002 lands, this line is replaced by the design's and an `IMPORT` control appears beside
`EXPORT`. Not before.

**Export success and failure are both visible states, and failure never looks like success** (B-16):

| State | Copy |
|---|---|
| Success | `Exported {n} sessions and {n} weights.` **NEW** |
| Failure | `Could not export. Nothing changed on this device.` **NEW**, refusal shape |

## 10.5 Settings — states

| State | Present |
|---|---|
| Default | Rest mode, data, export, storage note |
| Demo on | Band; the data section's control reads `LEAVE SAMPLE DATA` **NEW** |
| Storage blocked | The store notice above everything, and export is refused with its failure copy |
| Error | Per-section catch; no section writes to the log |
| Offline | Identical |

---

# 11. Brief — the movement figures

Chady has ruled the design's placeholders and the current diagrams both out: *"diagrams are very bad,
we need better ones."* This is the brief someone can produce artwork against. **It does not design the
artwork.**

## 11.1 What a figure is for

One question, asked between sets by someone who is tired: **"what does this movement look like at the
top and at the bottom, and which way am I pushing?"** It is not an instruction manual, not a safety
notice and not a muscle diagram. If the figure cannot answer that in about one second at 64 px, it
has failed and the cue is doing all the work.

## 11.2 What every figure must communicate

Four things, in this order of importance:

1. **The body's position relative to a ground reference** — floor, bench, seat, bar, dip bars, prone
   pad, calf block. The ground reference is what makes a hinge legible as a hinge and not a squat.
2. **Which joints move.** A hinge shows a closed hip and a near-fixed knee; a squat shows both
   closing. This is the single most common thing a bad diagram loses.
3. **The direction of travel**, as one arrow drawn along the path of the working end — the bar, the
   handle, the dumbbell, or the body itself. It runs **ghost → solid** and points at the position he
   has to reach. **It is not a claim about which phase is the concentric** (§11.3, ruled WO-005): a
   64 px drawing should not be making that claim, and for five of the fifteen patterns it would put
   the emphasis on the pose nobody gets wrong.
4. **The implement and where it is held.** A bar across the back, a bar at arm's length, two
   dumbbells, a handle, nothing.

**What a figure must never carry:** text inside the frame, a rep count, a load, an arrow implying
speed, a face, muscle shading, or anything that reads as a safety claim. The cue is the only place
words appear.

## 11.3 The two poses — one convention, all fifteen

**Ruled 2026-09-11 (WO-005). The shipped convention is right; this section was wrong and is
rewritten. No figure is redrawn.**

What it used to say — START is "the lengthened / loaded position", FINISH is "the end of the
concentric", the FINISH pose is solid — contradicted §11.5, which gives `squat`, `hinge`, `hpush`,
`fly` and `dip` the descent. It also contradicted **itself in a single sentence**: the lengthened
position of a squat *is* the bottom, and the same clause called standing the start. An engineer
could not obey both halves, and the rebuild (`615c4e5`) correctly obeyed the one that was drawn
fifteen times.

**The start/finish vocabulary is deleted from this brief.** It described a rep phase, which is not
something a 64 px two-pose drawing can assert and not something this app needs to assert. What
replaces it is what the artwork already does:

| | |
|---|---|
| Two poses per figure | **SOLID** and **GHOST** |
| SOLID | **The pose the arrow points at** — the position he has to reach, the end the movement is judged on, and the one people get wrong. Named per pattern in §11.5 so nobody has to infer it |
| GHOST | The other end of the same rep |
| Which is solid | The arrowhead pose, always. All fifteen, without exception, so he learns it once |
| The arrow | Exactly one, ghost → solid, along the path of the **working end**, not the joint |
| Overlap | The two poses share a frame and a ground reference. They are the same figure at two moments, never two figures side by side |

**Why the arrowhead pose and not the end of the concentric.** The figure's job (§11.1, §11.8 test 2)
is *what does this look like where it matters*. On a squat, a hinge, a press, a fly and a dip that is
the bottom — depth, shin angle, elbow path, stretch, dip depth. Drawing the concentric end solid
would make those five resolve to a person standing still holding a bar, which is the least
informative pose in the pattern and makes the `squat`/`hinge` pair — the one §11.5 says must not look
alike — nearly indistinguishable, since everything that separates them lives in the bottom position.
The cost of the alternative is also real and concrete: re-authoring five of fifteen patterns and
re-running §11.8 against all of them, to end up with weaker figures.

**The per-pattern choice of which end is solid is coach-adjacent** where it is not obvious. The
fifteen already drawn are ruled as shipped. **A sixteenth pattern's solid end goes to
`strength-coach`** with the slot's cue, because "the one people get wrong" is a coaching judgement.

**The words `start` and `finish` stay out of the frame, and out of the disclosure label too —
ruled.** §11.2 forbids text inside the frame and the rebuild removed them correctly. The question
raised was whether `› MOVEMENT & CUE` should grow to carry the convention instead. It should not:

1. **The arrow already carries the whole relationship.** Two poses joined by one arrow read as one
   movement, and the arrow says which end is being pointed at. Faint-then-solid is not a convention
   he has to be taught; it is how a before/after is drawn.
2. **The label serves the audience that cannot see the figure.** The figure is `aria-hidden` (§11.6)
   and the cue is its accessible carrier. Adding a legend about ghost and solid poses to a 44 px
   control makes a screen reader announce a description of artwork it is deliberately not being
   shown.
3. **The words are what caused this contradiction.** Naming the poses re-imports the rep-phase claim
   §11.5 disagreed with for five patterns. Deleting the vocabulary removes the conflict rather than
   relocating it into a label.

This is a claim about legibility, so it is **verified, not asserted**: §11.8 test 7 exists to fail if
the convention is not self-evident without text.

## 11.4 Rendering — how it reads at 64 px on a dark ground

| Constraint | Value |
|---|---|
| Render size | Legible at **64 × 64 CSS px**, and again at 200 % text (128 px). Authored on one viewBox, scaled |
| Stroke | Effective **≥ 2.5 px at a 64 px render**. Round caps and joins. No fills, no hatching, no gradients |
| Complexity | **≤ 12 strokes** in the solid pose. If it needs more, the pattern is being over-described |
| Occupancy | The figure fills **≥ 80 %** of the frame's height. A small figure in a big box is unreadable at arm's length |
| Contrast | Solid pose `--bone` (12.7 : 1 on `--surface`). Ghost pose ≥ `.45` (3.8 : 1 — the 3 : 1 non-text floor, since the ghost carries meaning). Arrow `--amber` (7.9 : 1) |
| Greyscale | Solid and ghost must remain distinguishable in greyscale by **value and stroke weight**, not by hue |
| Ground reference | One rule or one simple form. It is scenery; it may sit at the non-text floor |

## 11.5 The fifteen patterns, and what each must show

Mapped across all 42 slots today by `PAT` (`index.html:374`). ~~The map is correct and is kept~~ —
**struck: B-64 found three wrong mappings and they are resolved there, not here.** Only the artwork
changes.

**Column headers renamed by the WO-005 ruling (§11.3); every cell below is unchanged and no figure is
redrawn.** `START (ghost)` → `GHOST`, `FINISH (solid)` → `SOLID`. Read `SOLID` as *the position to
reach*, and note that in every row it is already the pose the arrow points at — which is the whole
evidence that the shipped convention, not the old §11.3, is the one the table was written against.

| Pattern | Slots it serves | Ground | GHOST (the other end) | SOLID (the position to reach) | Arrow along |
|---|---|---|---|---|---|
| `squat` | d2a d2b d4a d4b d4c | floor | Standing, bar on the back | Bottom, hips below knee height, both joints closed | the bar, downward |
| `hinge` | d2d d4e | floor | Standing, bar at arm's length | Hips pushed back, shins near-vertical, bar against the legs | the bar, downward and back |
| `hpull` | d1a d3a d3c d3d | floor | Torso hinged, arms straight | Same torso angle, bar at the lower ribs | the bar, toward the body |
| `vpull` | d1b d1c d3b d3e | overhead bar | Full dead hang, arms straight | Chest toward the bar | the body, upward |
| `hpush` | d1d d5a d5b d5c d5h | bench | Arms extended over the chest | Elbows at ~45°, weight at chest level | the weight, downward |
| `fly` | d5d | bench | Arms extended over the chest | Wide, elbow angle unchanged, stretch | the weight, outward |
| `dip` | d1e | dip bars | Arms locked, slight forward lean | Upper arm at parallel | the body, downward |
| `vpush` | d1f d3f | seat with back | Weight at shoulder height | Arms extended overhead, ribs down | the weight, upward |
| `lat` | d3h | floor | Arms at the sides | Arms at shoulder height, elbows leading | one hand, outward and up |
| `uprow` | d3g | floor | Bar at arm's length | Bar at lower chest, elbows above the hands | the bar, upward |
| `curl` | d1g d5e d5f d5g | floor | Arms straight, elbows at the sides | Forearm vertical, **upper arm unmoved** | the hands, upward |
| `tri` | d1h d5i d5j | bench or standing | Forearm folded | Arm extended, **upper arm unmoved** | the hands, along the arc |
| `legext` | d2c d4d | seat | Knees bent, shin vertical | Knee extended, shin horizontal | the foot, forward |
| `legcurl` | d2e d4f d4g | prone pad | Legs straight, hips flat | Heels toward the glutes, **hips still flat** | the foot, upward |
| `calf` | d2f d2g d4h d4i | block | Heel below the block, full stretch | Full plantarflexion, heel high | the heel, upward |

**The pairs that must not look alike**, because these are the confusions a bad figure creates:
`squat`/`hinge` · `hpull`/`uprow` · `curl`/`tri` (identical geometry, opposite arrow — the *fixed
upper arm* is the shared point and must be visibly fixed in both) · `legext`/`legcurl`.

## 11.6 The build constraint — no CDN, no icon library, no build step

| Rule | |
|---|---|
| Format | **Inline SVG in the document.** Authored as coordinate data in a table, exactly as `POSES` is today, and rendered by a function |
| Forbidden | An icon library, a CDN font or sprite, an external `.svg` file, an `<img>`, a base64 raster, a webfont glyph |
| Why | The app is one file a phone opens directly from `file://` and from static hosting, offline, with nothing between the source and the screen (CLAUDE.md §3.1, §3.2) |
| Ids | Every `marker` / `defs` id is **unique per rendered instance** (B-15). Two open figures of the same pattern must not collide |
| Colour | Tokens only. No hex outside `:root` (CLAUDE.md §4) |
| A11y | The figure is **`aria-hidden="true"`** and the cue is the accessible carrier. A stick figure's honest text alternative *is* the cue, and two descriptions of one thing is noise |
| Fallback | A pattern with no artwork renders **nothing** — no box, no label, no `FIG 3`. §4.13 |

## 11.7 The cue text beside it

| Rule | |
|---|---|
| Count | One per exercise slot — 42, not 15. This is the design's genuine upgrade and it is adopted |
| Length | One sentence, **≤ 90 characters**, so it does not pass two lines at 200 % text |
| Voice | Imperative, second person, no hype, no emoji, no exclamation mark |
| Content | The single positional non-negotiable, or the single most common error. `Elbows pinned at the sides.` `Hips down, curl to the glutes.` |
| Forbidden | A rep range, a load, a tempo prescription, a safety claim, "if it hurts", a substitute exercise, an assessment |
| Relationship to the figure | The cue says what the figure cannot draw. It never restates the arrow |
| Missing | Two slots deliberately carry no cue — `d2e` and `d3d`, whose alternates the design dropped (B-28 / W1). They render no cue and no figure disclosure until W1 rules |
| Ownership | The 42 cues are **`strength-coach`'s to approve** — they are coaching instructions. The design's drafts are transcribed into `PHAT_PLAN` and are explicitly not signed off |

## 11.8 The acceptance test for the artwork

1. At **64 px**, in **greyscale**, at arm's length: a person who knows the movement names it.
2. Same conditions: a person who does not know it can copy the finish position.
3. Cover the cue: the figure still answers "which way am I pushing".
4. Cover the figure: the cue is still a complete, correct instruction.
5. Put `squat` and `hinge` side by side: nobody confuses them. Same for the other three pairs.
6. At 200 % text the figure and the cue both grow and neither clips.
7. **With no text anywhere — frame, label or cue — a person can say which of the two poses they are
   being told to reach.** Added by the WO-005 ruling (§11.3). It is the test that makes "the
   convention is self-evident after one exposure" a checkable claim instead of an assumption, and it
   is what would have to fail before the words `start` and `finish` come back anywhere near a figure.

If (1) and (2) fail, the figure does not ship. **A missing figure is a smaller loss than a wrong
one** — the cue survives alone, and §4.13 already specifies that state.

---

# 12. Strings — index, ownership and routing

## 12.1 Verbatim from the engines and the audit — I specify slots, never sentences

```
PHAT.verdict().x  and  .x2 (a SECOND LINE, never appended)
PHAT.speedLoad().text · .instruction
PHAT.speedFlagText()
PHAT.restText()            [W4 — not built yet]
PHAT.painState()           [W4 — not built yet]
PHAT.volumeTier().offerLine · .blockedLine · .statusLine
PHAT.deloadCheck().text · .x2
PHAT.deloadStatus().text · .endedLine
PHAT.cycleLine().text · .divergence · .explain
PHAT.calorieAdvice() — all eleven states, including "Recheck in 7 days."
PHAT.stallReport()
PHAT.rollbackLine()
You logged pain on this. Not something this app can assess.
Holding the weight. If it is sharp, or it repeats, stop the exercise and see a physio or a doctor.
Add {ex} back to this session? Only if last week left you recovered and no lift went backwards.
Add it / Not yet / Left out. Asked again next week.
Start deload week / Not now / Noted. Asked again after the next session.
7-day average ({n} of 7 days)
Target: +0.2 to +0.3 kg per week. Averages over 14 days.
```

## 12.2 Existing strings this spec relies on, unchanged

```
Note — RIR, form, pain, anything
Not in today's volume. It has numbers in it.
Not saved. 1 set needs a fix. / Not saved. {p} sets need a fix.
Everything you typed is still here.
and {x} more.
Clear this set
no reps / no weight / 0 reps / over 500 / over 100
Nothing left to fix. Tap Save session.
Weight now {v}. / Reps now {v}.
Discard {n} logged sets? / Keep it / Discarded.
Could not save. Your entries are still on screen — try again.
Could not discard. Nothing changed. Try again.
Could not read your saved session. Close the app and reopen it before starting a new day.
Session saved. / Nothing logged yet. / Log today / Update today / Weight logged.
Same time, same conditions, every morning. The daily number is noise. The weekly average is the signal.
```

## 12.3 From the design, adopted verbatim

```
Nothing logged yet
This app has one job: make logging a set faster than a spreadsheet. It has no streaks, no badges and no encouragement. It shows you last session's numbers and gets out of the way.
Sample data lets you see the trend and week-6 screens with something real in them.
No sessions yet
Top sets appear here after the first logged session, and the week 6 test unlocks once there are two weeks to compare.
Nothing is judged here. The verdicts are arithmetic on your own numbers.
Editing the plan is the easiest thing in this app to do instead of training. PHAT is already a good plan. The number that moves is sessions logged.
Editing the plan never rewrites logged history.
Your log lives on this device.
```

## 12.4 NEW — mine

**Status and navigation. No training claim. Coach review is a courtesy, not a gate.**

```
{day} · {i} of {n}
WAITING / VERDICT / SPEED WORK / DELOAD WEEK
Last 100 × 5
No prior set.
+ ADD SET {n}
− REMOVE SET {n}
Remove set {n}? / It holds {w} × {r}. / Remove set {n} / Set {n} removed. / Undo
DISCARD SESSION
{p} sets left to fix. / BACK TO SAVE
Could not build the summary. Your sets are safe.
{n} exercises · {n} notes
SKIPPED
{n} sessions logged / Nothing logged yet
SAMPLE DATA — NOT YOUR LOG / LEAVE / LEAVE SAMPLE DATA
Sample data loaded. / Your log is back.
Could not load the sample data. Nothing changed.
{n} sample sessions / {n} sample entries
Today's weight
Logged as today's entry. Weigh daily — the trend is what the app reads.
Exported {n} sessions and {n} weights.
Could not export. Nothing changed on this device.
Your log lives on this device. Export writes a copy you can keep. This version cannot read one back in yet.
UNSAVED CHANGES / Cannot open / CUT
PHAT is read-only. Duplicate it to make changes. / DUPLICATE THIS PLAN
The copy keeps this plan's history. Both plans read and write the same exercise history.
Exercise no longer in any plan
No days yet. / No exercises yet.
Delete {ex} from this plan? / {n} logged sessions keep their sets. This removes it from the plan only. / Nothing has been logged against it. / Delete from plan / {ex} deleted.
Discard your changes to {name}? / The saved plan does not change. / Discard changes / Keep editing
```

**NEW and carried from WO-003, still awaiting `strength-coach` (WO-003 W23 never ran):**

```
Nothing to say until all {s} sets are in.
Rest timer starts when you log a set.
From your last session on this.
Back in from this session.
Deload week. This set is above the prescription.
I changed my calories today / Changed your calories today? / This starts a 7-day hold. No new calorie advice until {date}. / Yes, changed today / Recorded. / I did not change anything / Hold cleared.
You changed calories {ago}. Hold ends {date}.        [WO-005, §7.5.1 — blocked on coach sign-off, §7.5.2]
End it early
Pick your day
A training week is a week with three or more logged sessions.
```

**NEW and routed to `strength-coach` because they make a claim about training:**

```
Set {n} is beyond the prescription. It counts in volume; the target does not change.
Type decides which rule reads this exercise and how long you rest. Implement decides how loads are described.
Auto-start begins the countdown when a set's reps are entered.
```

**Owned by `strength-coach` (WO-004 W1) and deliberately not written here:** the entire Diet screen,
the week-6 countdown line on Trend, Trend's "if the bars aren't moving" note, and the off-plan silence
copy for SP1 / V1 / ST1 / D1 / `cycleLine`.

**Everywhere: no emoji, no exclamation marks, no praise, no severity judgement, no number the app
cannot justify.**

---

# 13. Home / Train — the remaining detail

*(Kept last because most of it is already ruled; this section only closes what the audit left open.)*

## 13.1 Order

```
demo band (if on)
header:  {n} sessions logged                       SETTINGS
─────────────────────────────────────
storage notice / draft-restore offer / deload banner   ← §13.5 precedence
NEXT SESSION block  →  START SESSION                ← the answer to the screen's question
cycle line (+ divergence + explanation)             ← §13.4, exactly one
rollback line, when live
Or pick any day  →  five day rows with weekday labels
Today's macros  →  four cells
```

The day list **must be reachable without scrolling** on a 393 × 852 viewport. Nothing above it may
push it off the first screenful.

## 13.2 The next-session block

| Element | String |
|---|---|
| Kicker | `{n} days since this day` / `Never logged — start here` *(design)* |
| Name | `{day}` |
| Meta | `{n} exercises · {n} sets` **NEW** — the design's ` · rest 2 min` is dropped (C-2: rest is per exercise) |
| Action | `START SESSION` |

**`START SESSION` on a day that already has an unsaved draft does not overwrite it** — it offers the
existing draft (WO-001 Flow 1, State 1G).

## 13.3 The day list

`{wd} · {day}` with the weekday from the plan's `wd` (B-31: Mon / Tue / Thu / Fri / Sat) and the
right-hand `Never logged` / `Done today` / `{n} days ago`. **This, not renumbering the day ids, is
the correct expression of the rest day the design tried to encode** (C-5).

## 13.4 Exactly one programme-state line (C-10 / B-52)

`PHAT.cycleLine().text`, by the precedence table in `wo-003-train-weight.md` §1.2. Beneath it, and
only when the calendar week and the training week differ, `divergence` and `explain` — they are part
of the same block and are not a second state line:

```
Week 5 by the calendar, week 3 of real training. Reduced volume holds.
A training week is a week with three or more logged sessions.
```

**Deleted from Home:** the prototype's header `Week {n} · {n} sessions` (a *calendar* week beside a
*training* week — two numbers called "Week" on one screen) and the `Week 6 test` footer block
(`testCountdown`), which moves to Trend (§6). The header kicker becomes `{n} sessions logged`.

## 13.5 Precedence when several things want the top of the screen

Worst fact first (B-40):

1. Storage blocked / read failed — the refusal notice.
2. The draft-restore offer.
3. The deload banner.
4. The rollback line.

Never two of 1–3 at once. The rollback line sits under the cycle line and may coexist with any.

## 13.6 The deload banner (Rule D1)

Absent from the design. `PHAT.deloadCheck` is built.

Above the day list, without pushing it off the first screenful. Copy from `deloadCheck().text` and
`.x2` verbatim; T2 additionally renders V1's rollback line as a second paragraph. Buttons
`Start deload week` / `Not now`, ≥ 44 px, never in a top corner, **`Not now` lowest**. Declining does
not re-ask until a session has been saved. **Ignoring is not declining** — the banner stays; it is
about accumulated fatigue and does not expire on a scroll. During a deload the active line replaces
the cycle line and carries `End it early` **NEW** (one tap, no confirmation — it restores sets rather
than removing them, so the cheap direction is the safe direction).

**Before `trainingWeeks` 6 the word "deload" appears nowhere in the rendered DOM of any screen.**

## 13.7 Macros row

Four cells from the Diet screen's training/rest targets. **Same source as the Diet screen** — if the
two ever disagree, one of them is lying. Numbers are **W1's**.

## 13.8 Home states

| State | Present |
|---|---|
| First run | Onboarding (§10.1), not Home |
| No sessions | No cycle line. First-run copy: `Start here` / `Pick a day and log your first session. Every number you enter makes the next one easier.` *(existing)* |
| Populated | §13.1 |
| Draft outstanding | Restore offer (WO-001 Flow 1) |
| Deload triggered / active / declined / ended | §13.6 |
| Storage blocked | The notice outranks everything (B-40) |
| Error | Fail open — the day list renders even if every rule throws (§0.7) |
| Offline | Identical |
| Demo | Band; all counts and lines computed from the demo store only |

---

# 14. What the engineers need that does not exist yet

| # | Item | Owner | Blocking |
|---|---|---|---|
| 1 | `PHAT.restTarget` / `PHAT.restText` | backend (W4) | Yes — §4.10; without them the band is permanently idle |
| 2 | `PHAT.painState(sessions, exId)` | backend (W4) | Yes — §4.8 provenance |
| 3 | Off-plan silence copy for SP1 / V1 / ST1 / D1 / `cycleLine` | coach (W1) → backend (W3) | Yes — §9.5; today those surfaces render nothing |
| 4 | The Diet screen's numbers and every sentence on it | coach (W1) | **Yes — the screen does not ship without them** (§8) |
| 5 | The week-6 countdown line and Trend's method note | coach (W1) | Yes — §6 |
| 6 | Ruling on whether an extra set counts in P1 / H1 | coach (W1) | No — §4.5's display line changes, nothing else |
| 7 | The 42 cues, approved | coach (W1) | No — an unapproved cue renders nothing (§11.7) |
| 8 | One persistent `aria-live` region outside the re-rendered view | frontend (W6) | Yes — every announcement in this spec |
| 9 | Per-slot `try`/`catch` around every rule call | frontend (W7) | Yes — §0.7 |
| 10 | A `textContent`-only channel for the rest band | frontend (W7) | Yes — §4.10 rule 7; if it is not clean, **cut the timer** |
| 11 | Undo that outlives a toast timer, holding the removed object | frontend (W7, W15) | Yes — §2.4 |
| 12 | A persisted plan working copy under its own key | frontend + backend (W15) | Yes — §9.6 |
| 13 | `volumeTier` flagging hidden-but-populated exercises rather than omitting them | backend | Yes — §4.11; already in its criteria |
| 14 | Sample data in its own store with `demo:true` | frontend + release (W13) | Yes — §3 |
| 15 | `PHAT.calorieAdvice` returns `holdNote` — non-empty exactly when `holdUntil !== null && state !== "cooldown"` | backend | Yes — §7.5.1. The clear-control fix ships without it; the note does not |
| 16 | Sign-off on `You changed calories {ago}. Hold ends {date}.` | coach | Yes — §7.5.2. Until then the note slot renders nothing |

---

# 15. Findings for `project-manager`

1. **WO-004 W14 criterion 3 is wrong and `logic.js` is right.** The criterion says a duplicated plan
   gets new ids and separate history; `copyPlan` preserves ids on purpose, because re-minting them
   orphans every logged set. Restate the criterion; the UI ships the true sentence (§9.1).
2. **`PHAT.verdict` has no kicker string.** `t` is `"up"` / `"down"` / `""`. The design's kicker
   words have no engine source and a view-written kicker is a second verdict that can disagree with
   the first. Resolved as four fixed slot labels (§4.7).
3. **`.lbl` at alpha `.50` fails on `--surface`** (4.3 : 1), not only the two failures the audit
   named. It is used inside surface cards throughout. One alpha step (§0.5).
4. **`verdict()` still contains rule `SP0`'s `Submaximal and fast. Do not grind these.`**, which
   WO-003 §4.2 replaced. The view never calls it on a speed card. Backend's to resolve (§4.7).
5. **Export's promise is false until WO-002.** Copy changed to state what export actually is; the
   design's line returns when an importer exists (§10.4).
6. **`SWITCH TO AN EMPTY LOG` is deleted rather than confirmed** (§2.4). This satisfies W13's data
   criterion 3 in the strongest available form and removes a control with no use case.
7. **The prototype's prefill would turn every skipped exercise into a blocked save.** That, not
   purity, is why the ruling is ghost-not-prefill (§4.4).
8. **B-05 gets worse with this release, again.** Ten screens now read that history confidently and
   the Plan Editor lets him reinterpret it. Nothing here fixes it. It should be the next work order.

**Added 2026-09-11 (WO-005):**

9. **An active calorie hold could render nothing and be uncleavable** — worth a backlog id. The
    engine was right, the state ranking was right, and the *control* was keyed to the wrong field
    (`state === "cooldown"` instead of `holdUntil !== null`). Ruled in §7.5.1. Note the shape of it
    for the next screen: a control was gated on a **rendered state** rather than on the **fact** it
    acts upon, and the two diverged legitimately. Anywhere else a control is keyed to a state name,
    check it is not really keyed to a fact.
10. **This spec contradicted itself on the figures for a month and nobody could obey both halves**
    (§11.3 versus §11.5). The contradiction was *inside one sentence* of §11.3, which is why review
    missed it. Ruled in favour of the shipped artwork; no redraw. My error, recorded as mine.
11. **The advice enclosure was being decided per screen.** Ruled once in §2.1.1, app-wide, `--dim`.
    `wo-003-train-weight.md` §3.8's amber line is superseded and should be marked as such if that
    file is ever edited again — it is `[REF]` against a build that no longer exists.
12. **A promise in the build is imprecise:** `This starts a 7-day hold. No new calorie advice until
    {date}.` Calorie advice does still render in bands 2, 3 and 4 during a hold. Left open for
    `strength-coach` with the rest of §3.5's unsigned strings (§7.5.2). Not changed tonight.

## 16. Decisions that are not mine

Rest durations and the ready/cap table · every verdict, band, trigger and window · `REINTRO_ORDER`,
`KEY_LIFTS`, `SPEED_SRC` · what a good weekly gain is · how long a deload runs · the diet numbers ·
the 42 cues · whether an extra set counts · whether ST1 may run on a non-PHAT plan. All
`strength-coach`. Nothing above changes a number or a word of any of them.

The **visual direction** — palette, type, rules, zero radius, flush-left labels, one exercise per
screen, five tabs — is **Chady's**. Where this spec moves something, it is because a measurement
(44 px, a contrast ratio), a state (silence, refusal, empty) or a data-integrity rule required it,
and each such change says which.

---

# 17. Amendments — WO-005, 2026-09-11

Three questions blocked three real fixes. All three are ruled. **Nothing else in this file changed**,
and no copy was written beyond the one sentence in ruling 1.

| # | Question | Ruling | Where | Cost to implement |
|---|---|---|---|---|
| 1 | An active calorie hold can render nothing and be unclearable | The clear control keys off `adv.holdUntil`, never `state`. A new **hold note** discloses the hold when a band is showing. One new sentence, **coach sign-off required** | §7.1, §7.5, **§7.5.1**, §7.5.2, §7.6 | One condition changed in the view, one field added to `calorieAdvice` |
| 2 | §11.3 and §11.5 give opposite instructions on which pose is solid | **The shipped convention wins.** Solid = the pose the arrow points at = the position to reach. §11.3 was wrong *and self-contradictory* and is rewritten; start/finish vocabulary deleted; **no figure is redrawn**. The disclosure label does **not** grow to carry the convention; a new acceptance test proves it does not need to | §11.2(3), **§11.3**, §11.5 headers, §11.8(7) | Zero code, zero artwork. Spec only |
| 3 | Advice enclosure — amber rule or dim rule | **`--dim`, app-wide, in every state.** W11 was right. Amber stays reserved for the live thing. Stated once so no screen re-litigates it | **§2.1.1**, §2.1 table | Zero. The build already does this |

**What is still blocked, and on whom.**

| Item | Owner | Until then |
|---|---|---|
| `You changed calories {ago}. Hold ends {date}.` | `strength-coach` (§7.5.2) | The hold note slot renders nothing. **The clear-control fix ships anyway** — it is a defect fix that needs no new copy, and it is the half that stops the hold being unclearable |
| `PHAT.calorieAdvice().holdNote` | `backend-engineer` (§14 #15) | Same |
| `This starts a 7-day hold. No new calorie advice until {date}.` — imprecise in bands 2 / 3 / 4 | `strength-coach` (§15 #12) | Unchanged. Not a defect I am fixing by inventing a replacement tonight |

**Deliberately left open, per the stop condition.** Nothing else. Every question raised tonight was
answerable from this spec, `wo-003-train-weight.md`, `logic.js` and the handoff brief, except the one
sentence above, which is a sign-off and not a gap.

---

# 18. Two accounts — identity on screen, sign-in on first run, the ownership refusals (WO-008 W2, 2026-09-12)

Author: `ux-designer` · Implements: WO-008 §4 W2 · Consumed by: W5 (`frontend-engineer`), W4
(`backend-engineer`, for the `{owner}` fallback and the first-run push rule), W7 (QA) · Reads:
`index.html` `vHome` (1724), `vOnboard` (1861), `vSession` (2043), `authTap` (5508), `runBackup`
(5461), `restoreStart` (5567), `bkStatusLine` (5677), `vBackupBody` (5705), boot prefs load (5805).

**The uncomfortable answer first.** This section adds one row to Home, one line to the session header,
one line to Summary and one screen to first run, for a second account whose log will hold zero
sessions the day it exists — the same day the first one still does. It is specified in full because
B-88 is live and a name on the screen is the cheapest fix for a set landing in the wrong log. Nothing
here makes a set easier to log.

**What this section does not write.** Any sentence the Weight or Diet tab says to an account with no
profile. That is `strength-coach`'s (WO-008 W1, running in parallel). §18.7 specifies the *slot* and
the *placement* and leaves the sentence marked.

## 18.1 The two facts, and which one the screen names

There are two identities and the code conflates them:

| Fact | Source | Available offline | What it answers |
|---|---|---|---|
| **The owner** — the account that last backed up from, or restored onto, this device | `prefs.backup.user` (after W4: `{id, email}`; `null` if never backed up) | **Yes** — a stamp on disk | *Whose log is this* |
| **The signed-in account** | `S.sync.user` (module only; `null` until `sync.js` loads, and `loadSync` does not run offline) | **No** | *Where would a backup go right now* |

**Ruled: every identity line in the app names the owner, never the signed-in account.** The question
between sets is "whose log am I about to add a set to", and the answer is on disk. The signed-in
account is named only where it *differs* from the owner — that difference is the B-88 state, and it is
the one thing worth a sentence. Consequences:

1. The line renders identically with the network off, the module unloaded, and from `file://`. No
   spinner, no "loading", no state that waits on `sync.js`. `[Certain]` — the stamp is read at boot
   (`index.html:5813`).
2. Signed out is not an error. It is the same log, on the same device, not being copied anywhere.
   The line says that and nothing more.
3. A device that has never been backed up has no owner and the line says so as a fact, not a prompt.
   `Sign in` is one tap away in Settings; the line does not nag.
4. **Display names are out.** No field holds one, no screen asks for one, and first run adds no field
   (§10.1 rule 2 still binds). The email is the name. Emails are never uppercased by CSS — an email in
   small caps reads as a different string.

**The one state where the signed-in account is named** — owner `A`, signed in as `B` — is rendered
in the refusal shape (§2.1: four-sided border, `!`), because the app really is declining to do
something (back up). It is the only identity state that takes that shape. Signed out and never
backed up take **no enclosure at all**.

## 18.2 Home — the owner row

```
Flow:   Identity on Home
Entry:  Every paint of Home. No trigger.
Exit:   Tap → Settings, scrolled to the Backup section (heading focused). Nothing written.
```

**Placement.** Directly **below the next-session block and above the cycle line** — the first thing
after the answer to the screen's question, and the last thing before the programme state. Not the
header (`.hd` is inside the top 15 % and `{n} sessions logged` is already there). Not the bottom (the
macros strip is below the fold on shorter viewports). It is a full-width `<button>`, 48 px, no border,
no surface — a row, not a card. It is **not a programme-state line** and does not count against
§13.4's "exactly one"; a QA grep for programme-state lines must not match it.

**Budget.** 48 px of the day list's no-scroll budget at 393 × 852. By arithmetic (header 46 + block
175 + row 48 + cycle 50 + label 49 + five rows 280 + dock 52 ≈ 700) it fits with room. **W5 measures.**
If it does not fit, the row and the day list both stay above the fold and the frontend finds the
pixels elsewhere; neither is dropped.

```
[REF] layout, Home, populated, owner stamped, signed in as the owner or offline

│  12 SESSIONS LOGGED                        SETTINGS  │  ← unchanged header
│ ┌──────────────────────────────────────────────────┐ │
│ │ 3 DAYS SINCE THIS DAY                            │ │
│ │ Upper power                                      │ │  ← next-session block, unchanged
│ │ [           START SESSION                     ›] │ │
│ └──────────────────────────────────────────────────┘ │
│  THIS LOG                                            │  ← 18.2 owner row, 48 px, tappable
│  chady@b-script.com · last backup 3 days ago      ›  │
│  Week 3 of real training. Reduced volume holds.      │  ← cycle line, unchanged
│  OR PICK ANY DAY                                     │
```

**States and copy.** `{owner}` = `prefs.backup.user.email`, `{me}` = `S.sync.user.email`,
`{ago}` = `PHAT.agoText(prefs.backup.at)`. Kicker line first, then the row's main line.

| # | Owner stamp | Signed in (module) | Kicker | Main line | Shape |
|---|---|---|---|---|---|
| H1 | `A` | `A`, or unknown (offline / unloaded / loading / failed) | `This log` | `{owner} · last backup {ago}` | Plain row |
| H2 | `A` | none — module ready, signed out | `This log` | `{owner} · signed out · last backup {ago}` | Plain row |
| H3 | `A` | `B` | `This log` | `! Belongs to {owner}. Signed in as {me}. Nothing backs up.` | **Refusal** enclosure |
| H4 | none | `A` | `This log` | `On this device only. Backs up to {me} after the next save.` | Plain row |
| H5 | none | none / unknown | `This log` | `On this device only. Not backed up.` | Plain row |
| H6 | stamp present, `email` null (a pre-W4 stamp migrated offline) | any | `This log` | `Backed up {ago} by an account this phone has not seen sign in.` | Plain row |
| H7 | prefs unreadable | any | `This log` | `Could not read who this log belongs to.` | Plain row, no enclosure — it stops nothing |

Rules.

1. **Nothing waits.** H1 renders the moment Home paints, from the stamp. When `sync.js` arrives and
   `onSync` fires, the row is repainted **in place by id** (`paintWho()`, the `paintBackup()`
   pattern) — never `render()`. The row's height is fixed at 48 px in every state, so H1 → H3 does not
   move the cycle line or the day list under a thumb.
2. **H4 is transient by design.** With no stamp the first push claims the device (W4: `ownerId`
   null → ok). After that push lands, the stamp exists and the row reads H1. If the push fails, H4
   stands and Settings carries the failure; the row does not.
3. **H3 is the only enclosure.** It uses `.refuse` exactly as `bkStatusLine` does — 2 px border, the
   literal `!`, `aria-hidden` on the glyph. It has **no `role="alert"`**: the event was announced once
   through `announce()` when the refusal happened (§18.5); the row is the persistent state, and a
   persistent alert is read on every focus move.
4. **Demo mode:** the row is unchanged and names the real log's owner. The demo store never pushes
   (C-14) and the row never claims it does.
5. **Tap → Settings**, `S.sub="settings"`, then scroll so the `Backup` section rule is at the top of
   the viewport and move focus to it (`tabindex="-1"` on the section label). No input is focused —
   focusing the email field would raise the keyboard on a screen he opened to read.
6. **Overflow.** One line, `text-overflow: ellipsis`, the email first so the local part — the
   distinguishing part — is what survives truncation. The accessible name is the full text.
7. **`{ago}` is the stamp's `at`.** It is the last backup that *landed*, which is what "backed up"
   means; it is never the last attempt.

## 18.3 Session and Summary — the owner line

**Where I depart from the work order, and why.** WO-008 W2's criterion puts the session-screen
identity outside the top 15 % of the viewport. I disagree because that rule exists to keep *controls*
out of the grip zone (§0.4), and this line is not a control; on the session screen every pixel between
the header and the first set row is paid for by the set, and a 48 px row there is worse for the only
thing that matters than a 12 px line in the header. Here is what I do instead: the session line rides
the **header**, as text, and the identity is repeated at the **commit point** — Summary, directly
above `SAVE SESSION`, in the thumb zone, where the set actually joins a log. The risk is that the header
line is the least-read line on the session screen; that is acceptable because it is the second
reading of a fact Home showed one tap earlier and Summary repeats a third time. **PM to amend the
criterion for the session screen or overrule; W5 does not build a row between header and set.**

**Session header** (`.sesshead`). A second line under the kicker, before the pips, before the
`It saves under {date}` line when that renders. `.75rem`, `--dim`, not uppercased, one line, ellipsis.
It is static for the life of the paint: `onSync` does not repaint it (a mid-set repaint is B-19), and
a sign-in that happens during a session is reflected on Summary and on the next Home.

| # | State (as §18.2) | Session header line |
|---|---|---|
| S1 | H1 / H2 / H6 | `Log of {owner}` |
| S2 | H3 | `Log of {owner} · signed in as {me}` |
| S3 | H4 / H5 / H7 | `On this device only` |

**Summary** — one line directly above `SAVE SESSION`, same type as `.tiny` but `--dim`, present in
every state, never an enclosure (nothing on Summary may look like the blocked-save refusal except the
blocked-save refusal, §2.2):

| # | State | Line above `SAVE SESSION` |
|---|---|---|
| U1 | H1 | `Saves to this device. Backs up to {owner}.` |
| U2 | H2 | `Saves to this device. Backs up to {owner} when signed in.` |
| U3 | H3 | `Saves to this device. Belongs to {owner}, not to {me}. Will not back up.` |
| U4 | H4 | `Saves to this device. Backs up to {me}.` |
| U5 | H5 / H6 / H7 | `Saves to this device. Not backed up.` |

`SAVE SESSION` is never disabled by any of these. **Logging never waits on auth** (§3.2). The line
is a statement of where the number goes, not a gate on it.

## 18.4 First run — `Sign in` beside `Start with an empty log`

```
Flow:   Claim a fresh phone with an existing account
Entry:  Onboarding (§10.1) — both stores absent, no notice, not onboarded, no draft.
Exit:   Home, with `onboarded` written by exactly one of: START WITH AN EMPTY LOG, or a completed
        restore. Never by the sign-in itself.
```

**Screen A — onboarding, amended.** §10.1's content is unchanged. Under `START WITH AN EMPTY LOG`
(primary, 52) a second action, `Sign in` (ghost, 48). **Exactly two actions**; `LOAD SIX WEEKS OF
SAMPLE DATA` and `OR PICK ANOTHER PLAN` remain what they were (W13b / §10.1 rule 3) and are not
actions on the log. `Sign in` is shown in every network state — the next screen tells the truth about
the connection; hiding the button offline would make first run look different on the two phones for
no reason he can see. The optional `Today's weight` field is **not carried** to screen B; it is
optional, and a restore replaces the bodyweight store anyway. Nothing on screen A writes until a
button is tapped.

```
[REF] screen A, bottom

│  [          START WITH AN EMPTY LOG            ]   │  primary, 52
│  [                 SIGN IN                     ]   │  ghost, 48
```

**Screen B — first-run sign-in.** `S.sub="onboard-signin"`. Header: `‹ Back` top-left (88 × 44,
non-destructive, permitted by §0.4) and the kicker `First run`. Then a heading, then **the existing
`vBackupBody()` form verbatim** — its four module states (file, offline, loading, failed), its two
fields, `Sign in`, `Create account`, and its inline refusal block — painted into `#bk-body` so
`paintBackup()` works here unchanged (W5: `paintBackup` is gated on `S.sub==="settings"`; it gains
`"onboard-signin"`). Below the form, in every state, `Start with an empty log` (ghost, 48): the
escape is on the screen, not one Back away, because the offline case is the common one in a gym.

```
[REF] screen B

│  ‹ BACK                                  FIRST RUN │
│  Sign in to an account                             │  h1
│  Its backup can be put on this phone. Nothing is   │  .sub
│  written until you choose.                         │
│  EMAIL                                             │
│  [                                              ]  │  48
│  PASSWORD                                          │
│  [                                              ]  │  48
│  [ SIGN IN ]  [ CREATE ACCOUNT ]                   │  existing, 48 each, stacked full-width
│                                                    │
│  [          START WITH AN EMPTY LOG            ]   │  ghost, 48 — the escape, every state
```

| State | Form area shows | Notes |
|---|---|---|
| B-offline / file / failed | The module's existing sentence (`Backup needs a connection. None right now.` etc.) + ` Your log is on this device and saves as normal.` | No fields, no `Sign in`. The escape button is the way forward |
| B-loading | `Backup is loading.` | No spinner beyond the sentence |
| B-form | Fields + `Sign in` + `Create account` | Focus on the heading, not the field |
| B-busy | `Signing in.`, buttons disabled | Existing |
| B-refused | Existing `.refuse` with the module's message (`Email and password, both.` / wrong password / `New accounts are switched off.`) | Typed values preserved across the repaint (existing `paintBackup` rule) |
| `‹ Back` from any state | Screen A, unchanged | **Nothing written.** `onboarded` still false; no store key touched. The typed email and password are gone — they were never stored |

**Sign-in on first run does not schedule a push.** Today `authTap` calls `backupSoon("signin")` on
success. On a first-run device that is a push of an empty log to whichever account signed in — at best
a no-op, at worst B-76 with a different owner. **W5: on `S.sub==="onboard-signin"`, a successful
sign-in routes to screen C and schedules nothing.** The first push happens only after
`START WITH AN EMPTY LOG` (through the ordinary save path) or never (a restore stamps the device as
already backed up, `restoreApply` 5657). *Dependency on W4: `storeOwner` with `hasData:false` returns
ok, so nothing in the pure layer blocks this; the rule is the view's.*

**Screen C — signed in, choose.** Reached only from a successful sign-in on screen B. On arrival the
app **pulls once** (`Y.pull()` → `PHAT.restorePayload`, the first half of `restoreStart`) and
renders one of three states from the result. She is online by definition here — she just signed in.

| # | Pull result | Copy | Actions, top to bottom |
|---|---|---|---|
| C1 | ≥ 1 session, weight or plan | `Signed in as {me}.` / `{n} sessions and {m} weights are backed up under this account.` (`restoreCounts` form, plans named when present) | `Restore {n} sessions` **primary, 56** · `Sign out` ghost, 48 |
| C2 | Zero rows | `Signed in as {me}.` / `Nothing is backed up under this account yet.` | `Start with an empty log` **primary, 52** · `Sign out` ghost, 48 |
| C3 | Pull failed, or the payload was refused | `Signed in as {me}.` / `Could not read the backup. ` + the module's message, in the refusal enclosure | `Try again` ghost, 48 · `Start with an empty log` ghost, 48 · `Sign out` ghost, 48 |

Rules for C.

1. **C1 does not offer an empty log.** An account with rows and a device that would then push an
   empty log over them is a data-loss path on the server (B-76's shape). The honest choices are: bring
   the backup down, or leave. `Sign out` returns to screen A signed out, nothing written.
2. **`Restore {n} sessions` on C1 goes straight to `restoreApply`** — no `Restore from backup?` sheet.
   The device is empty (onboarding gates on both stores absent) so the sheet would be the one-tap
   variant, and screen C *is* that sheet: it names the counts and the account. `restoreApply` still
   re-reads disk (B-74) and refuses if anything has appeared. On success: `onboarded` is written,
   `S.sub=""`, Home renders with the owner row in H1 naming `{me}`; announced `Restored {counts}.`
   (existing). On failure: `restoreApply`'s existing `fail()` message renders on screen C in the
   refusal enclosure, actions as C3, `onboarded` still false.
3. **C2's `Start with an empty log`** is `finishOnboarding()` unchanged (one key). Home renders in H4;
   the stamp lands on the first save's push.
4. **C3's `Try again`** repeats the pull. `Start with an empty log` here is allowed — the app could not
   see rows, and refusing on a guess would strand her offline with a signed-in account and no log.
   The first push after that claims the device (H4 → H1) *only if* W4's `storeOwner` says ok, which
   with `hasData:false` it does. *Flagged for `backend-engineer`: if that first push can overwrite a
   server log that C3 failed to read, the push after a C3 → empty-log path must be a merge or a
   refusal, not a replace. Not mine to rule; the screen does not depend on the answer.*
5. **Back from C:** there is no `‹ Back` on C. The way out of a signed-in state is `Sign out`, and it
   is on every variant.

**Preserved across every path:** `phat:v1:log`, `bw`, `plans`, `draft` — absent before, absent after
anything but a completed restore or `START WITH AN EMPTY LOG`. `phat:auth` is `sync.js`'s key and is
written by a sign-in; that is choosing an account, which is what the work order permits.

## 18.5 The ownership refusals — B-88

**Rule (W4's):** a device's log belongs to the account that first backed it up. When the signed-in
account differs from the owner and the device holds data, the automatic push, the manual push and the
restore are each refused, nothing is written, `prefs.backup` is untouched.

**Three sentences, final.** Each names the owner, names what did **not** happen, and offers the one
way out. No override control. `{owner}` and `{me}` as §18.2.

| # | Trigger | Sentence |
|---|---|---|
| R-a | Automatic push after sign-in, or after any save, while signed in as `{me}` on a device owned by `{owner}` | `This device's log belongs to {owner}. Nothing was backed up to {me}. Sign in as {owner} to back it up.` |
| R-b | `BACK UP NOW` | `Not backed up. This device's log belongs to {owner}, not to {me}. Sign in as {owner} to back it up.` |
| R-c | `Restore from backup` | `Not restored. This device's log belongs to {owner}. The backup under {me} was not read and nothing on this device changed. Sign in as {owner} to restore.` |

**When the owner's email is unknown** (H6 — a stamp migrated with `email:null`): `{owner}` reads
`another account` and the way-out clause reads `Sign in as that account`. So R-b becomes
`Not backed up. This device's log belongs to another account, not to {me}. Sign in as that account to
back it up.` Same substitution in R-a and R-c. The app does not invent an address.

**Where each renders.**

| | Settings, `#bk-status` | `announce()` | Home owner row |
|---|---|---|---|
| R-a | `.refuse`, `role="alert"`, the sentence, then the stamp line (`Last backup {ago}.` — the owner's, which is the true last backup of this log) | Once, **assertive** — a write that did not land | H3 |
| R-b | Same | Once, assertive | H3 |
| R-c | Same. Renders **before** the pull and before any sheet: `restoreStart` asks `storeOwner` first | Once, assertive | H3 |

**Rules.**

1. The sentence is rendered once in `#bk-status` and said once through the live region. Never both
   with `aria-live` on the block (§2.6 — two regions over one content are read twice). `.refuse`
   already carries `role="alert"`; that is the one carrier in Settings.
2. **R-a fires once per sign-in, not once per save.** After the first refusal the automatic push is
   not re-attempted on every save while the same mismatched account is signed in — one alert per
   condition, not one per set. The manual button re-tries and re-refuses on demand. *W5 owns the
   latch; W4's `storeOwner` is pure and does not know about repeats.*
3. The stamp line under the refusal stays the owner's. `bkStatusLine` today prints `Never backed up.`
   when `b.user !== me` (5680) — under two accounts that sentence is **false** and is replaced by the
   owner's stamp: `Last backup {ago}, by {owner}.` A device that has been backed up has been backed
   up, whoever is looking.
4. `Sign out` remains enabled in this state. It is the way out.
5. **Nothing here disables logging.** The session screen, Summary and `SAVE SESSION` behave exactly
   as in H1.

## 18.6 Settings — the signed-in line, amended

`vBackupBody`'s `Signed in as {me}. Backs up after every saved session and weight.` is true only in H1
and H4. Amended by state:

| State | Line |
|---|---|
| H1 / H4 | unchanged |
| H3 | `Signed in as {me}. This device's log belongs to {owner}.` — then `#bk-status` carries R-a/R-b/R-c |
| H2 (signed out, stamped) | The signed-out form is unchanged; its first sentence becomes `Keeps a copy of your log off this phone. This one was last backed up {ago} by {owner}. Logging works the same signed in or out.` |
| H5 (signed out, never backed up) | Existing sentence, unchanged |

## 18.7 The ABSENT Weight / Diet slot — placement only `[W1 SLOT — strength-coach]`

The sentences are W1's and are **not written here**. What is ruled here is where the one absent line
goes and what does not render around it, per C7a ("once, in the place the feature would have
appeared").

| Screen | Where the absent line renders | What does not render in ABSENT |
|---|---|---|
| Weight | The calorie-decision slot (§7.3), same advice enclosure, same kicker | The calorie ladder; `I changed my calories today` and its hold controls (nothing to hold); the `+0.2 to +0.3` subline. **Whether the kg/week rate itself renders is W1 q2's** — the entry, the last-7 list and the 7-day average with its day count are measurements and stay |
| Diet | One advice enclosure where the targets grid would be | The `TRAINING DAY / REST DAY` segment, every target cell, the protein check, the calibration note — all are views of numbers that do not exist |
| Home macros strip | **Nothing.** The strip already renders only when `dietTargets().text.strip` is a non-empty string; ABSENT returns none and the strip is absent. Home does not repeat Diet's absent line — C7a says once, and Diet is the place | The strip |

For **Chady's account nothing changes** (W4 stamps the existing store `phat-brief`).

`[W1 SLOT — strength-coach: the literal `absentLine` for Weight and for Diet, in the C7a shape.
Until it is returned, both slots render nothing and no number.]`

## 18.8 Strings — every new one, in one table

`{owner}` · `{me}` · `{ago}` · `{n}` · `{m}` as above. All NEW, all status or refusal copy, no
training claim; coach review is a courtesy, not a gate.

```
This log
{owner} · last backup {ago}
{owner} · signed out · last backup {ago}
Belongs to {owner}. Signed in as {me}. Nothing backs up.
On this device only. Backs up to {me} after the next save.
On this device only. Not backed up.
Backed up {ago} by an account this phone has not seen sign in.
Could not read who this log belongs to.
Log of {owner}
Log of {owner} · signed in as {me}
On this device only
Saves to this device. Backs up to {owner}.
Saves to this device. Backs up to {owner} when signed in.
Saves to this device. Belongs to {owner}, not to {me}. Will not back up.
Saves to this device. Backs up to {me}.
Saves to this device. Not backed up.
Sign in
Sign in to an account
Its backup can be put on this phone. Nothing is written until you choose.
Signed in as {me}.
{n} sessions and {m} weights are backed up under this account.
Nothing is backed up under this account yet.
Could not read the backup.
Restore {n} sessions
Try again
This device's log belongs to {owner}. Nothing was backed up to {me}. Sign in as {owner} to back it up.
Not backed up. This device's log belongs to {owner}, not to {me}. Sign in as {owner} to back it up.
Not restored. This device's log belongs to {owner}. The backup under {me} was not read and nothing on this device changed. Sign in as {owner} to restore.
another account / Sign in as that account
Last backup {ago}, by {owner}.
Signed in as {me}. This device's log belongs to {owner}.
Keeps a copy of your log off this phone. This one was last backed up {ago} by {owner}. Logging works the same signed in or out.
```

Unchanged and relied on: `Signed out. Your log is still on this device.` · `Signed in.` ·
`Restored {counts}.` · `Backup needs a connection. None right now.` · `Backup does not run from a
file. Open the installed app.` · `Backup could not load. Close the app and open it again to retry.` ·
`Email and password, both.` · `New accounts are switched off.` · `Start with an empty log` ·
`Restore from backup` · `Back up now` · `Sign out` · `Create account`.

## 18.9 A11y

- **Owner row (Home):** a `<button>`, accessible name = its visible text in reading order
  (`This log, chady@b-script.com, last backup 3 days ago`). `aria-describedby` not needed. In H3 the
  `!` is `aria-hidden`; the words carry the refusal. No `role="alert"` on the row (§18.2 rule 3).
- **Session header line and Summary line:** plain text, in DOM order after the kicker / before
  `SAVE SESSION`. Not live regions.
- **Live announcements:** sign-in and sign-out use the existing `announce()` strings. Each refusal is
  announced **once, assertive**. Auth-state repaints of the owner row are silent — the row changed,
  nothing happened to him.
- **Screen B focus order:** `‹ Back` → heading (`tabindex="-1"`, receives focus on arrival) → Email →
  Password → `Sign in` → `Create account` → `Start with an empty log`. Screen C: heading → the
  actions top to bottom. Escape / `‹ Back` returns focus to `Sign in` on screen A (`closeSheet`'s
  `back` pattern).
- **Contrast:** kicker `.kick` at `--faint` (`.55`, 5.3 : 1 on `--bg`) at 11 px — the floor, met.
  Email at `--bone`. Sub-lines at `--dim` (`.70`). Session header line at `--dim`, `.75rem` (12 px).
  Nothing in this section sits on `--surface`, so the `.55` surface floor does not bite. The refusal
  border is `--red-hi`, ≥ 3 : 1, and is never the sole carrier — the sentence is.
- **Greyscale test:** H1, H2, H3, H5 each read from words alone. H3 additionally by the four-sided
  border and the `!`. `Sign in` and `Start with an empty log` are told apart by label and by
  fill-versus-outline, not by hue.
- **200 % text:** the owner row wraps to two lines *within* its 48 px minimum (it may grow; it may
  not shrink); the email keeps its ellipsis. Screen B and C stack every button full width.

## 18.10 Control inventory — rows added to §0.4.1

Rows 54–60, inserted into the table above. Every control ≥ 44 on both axes; the owner row and every
first-run action are full width.

## 18.11 What I could not settle

1. **The top-15 % criterion on the session screen.** I depart from it (§18.3) and say why. PM rules.
2. **The first push after a C3 → `Start with an empty log` path.** If `Y.push` replaces rather than
   merges, a device that could not read its account's backup and then pushes an empty log can erase
   the copy on the server. §18.4 rule 4 names it; `backend-engineer` rules whether that push must be a
   merge, a refusal, or is already safe. The screens do not change either way.
3. **`{owner}` with `email:null`.** H6 and the `another account` substitution exist only because a
   pre-W4 stamp can be migrated offline with no email to hand. If W4 can guarantee an email on every
   stamp (for instance by refusing to write a stamp without one, and back-filling on the next
   sign-in), H6 and the substitution are deleted. W4's call.
4. **R-a's once-per-sign-in latch.** Where it lives (a flag on `S.sync`) and what resets it (a
   sign-out, or the owner signing in) are W5's; I have only said that one alert per condition is the
   behaviour.
5. **Whether the owner row should also carry the sync state after W4** (`Backing up.` while a push
   runs). Not now: the row names a fact about the log, and a busy indicator is a fact about the
   network. It stays in Settings.
6. **Same phone (W6).** Nothing here designs a switcher. If §7 q1 comes back *same phone*, the owner
   row becomes the switch's entry point and gets a second pass; its placement and size already allow
   that.

## 18.12 Out of scope, deliberately

A display name or any profile field · seeing the other account's log · an override to re-claim a
device's log for a different account (B-88's note: not in this order) · any sentence on Weight or
Diet for an account with no profile (W1) · the diet editor (B-93) · per-user plans (already true;
plans are per store) · a sixth tab or any change to the tab dock · a sign-in prompt anywhere outside
first run and Settings.
