# WO-003 · W3 — UX spec: the session screen

Author: `ux-designer` · Date: 2026-09-09 · Status: ready for `frontend-engineer`
Implements: WO-003 §W3 · Consumed by: W11 (target line), W13 (speed card), W17 (pain notice), W18 (rest timer)
Covers: B-24 (verdict gate), B-26 (pain), B-09 (rest timer), B-12 (speed load), B-22 (dumbbell unit)

**How to read this file.** Chady is redesigning the app's visual language. So this spec is written in
two weights:

- **Normative** — states, copy, interaction rules, constraints, accessibility. These are the
  specification. They are true in any visual language and they are what gets implemented.
- **`[REF]`** — anything describing the *current* build: pixel values, existing class names, ASCII
  layouts, the present colour tokens. Marked wherever it appears. It is a reference implementation, not
  a requirement. A new design may discard all of it and still be correct, provided §0 holds.

Copy in `code fences` ships **verbatim** and is lifted character for character from
`docs/coach-audit.md`. It may not be softened, shortened, re-ordered or re-punctuated. Strings marked
**NEW** are mine and need `strength-coach`'s sign-off in W23. `{braces}` are substitutions, defined in
§0.5.

---

## 0. What a new visual design must still honour

Check a redesign against this list. If it passes, nothing below breaks.

### 0.1 Non-negotiable behaviour

| # | Requirement | Why |
|---|---|---|
| 1 | **Nothing that appears, disappears or changes size may sit above an input on the card.** Verdicts, pain notices and flags all belong *after* the last input, so their reflow can only push the next card down | The app is about to start printing more text, more often, mid-set. A card that grows while his thumb is on `+` is worse than the advice it prints |
| 2 | **The verdict slot never changes the card's height when a verdict arrives.** It is occupied before the verdict exists and occupied after | Same reason. This is the single most likely way to make the app worse while improving it |
| 3 | **Silence has to look deliberate.** When a rule returns nothing, the slot says so in words. It is never a blank gap | Today the app prints after set 1. From this release it prints nothing for most of an exercise. Absence reads as breakage to a man out of breath |
| 4 | **The rest timer never covers an input, never changes height, never calls `render()`, and is never in the save path** | It is a comfort feature that can cost a number. That trade is not available |
| 5 | **The speed too-heavy flag never alters, blocks, marks or clears the logged weight.** It is advice next to a valid number | The flag is the app's opinion. The number is his |
| 6 | **Advice and refusal must be visually distinguishable, and advice must never borrow the refusal styling** | If advice looks like a refusal, he learns the refusal signal means nothing, and the next blocked save gets ignored |
| 7 | **The pain notice has no dismiss control and cannot be shortened, softened or annotated** | It is a refusal to assess, not a message |
| 8 | **Every surface in this file is read-only.** This spec adds no tap targets | Nothing to mis-tap mid-set |
| 9 | **The target line never wraps, never truncates, never shrinks.** If something must give, the exercise name wraps | It is a kilogram prescription and a unit. A truncated `3 × 6–10 · per…` is unreadable |
| 10 | **A rule that throws is caught per card.** The card still renders, the sets are untouched, the save still works | A broken rule may never cost a number |

### 0.2 Accessibility — hard requirements, in any design

| Requirement | Binding form |
|---|---|
| Contrast | All body text ≥ **4.5 : 1** against its own background; any non-text element carrying meaning ≥ **3 : 1**. Measured, not eyeballed |
| Touch targets | ≥ **44 px** on any interactive element. This spec adds none; the rule still binds anything a redesign adds |
| Top corners | Nothing important or interactive in a top corner |
| Never colour alone | Every state is carried by its words. Greyscale the screen and every state above must still read |
| Live regions | Anything appearing without a navigation is announced through **one persistent region that lives outside the re-rendered view**. No `aria-live` attribute inside `#view` `[REF]`, because `render()` recreates it and a recreated live region never announces |
| Timer | A per-second display is **not** a live region. Announce transitions only, once each |
| Zoom | `maximum-scale=1` must go (B-13). Every layout here must survive text scaling to 200 % |

### 0.3 Evidence from the current palette — things to design *away* from

Measured, not assumed. These are facts about the palette in `index.html` today; a new palette should not
reproduce them.

| Pair | Ratio | Status |
|---|---|---|
| `--faint` on `--surface` | **2.30 : 1** | Fails badly. It is the colour of the ghost text and of `.tiny`. Forbidden in every new element in this spec |
| `--red` on `--surface` | **2.84 : 1** | Fails even the 3 : 1 non-text bar. Cannot carry an error on a card |
| `--red` on `--bg` | 3.17 : 1 | Non-text only. Never 13 px text |
| `--dim` on `--surface` | **4.36 : 1** | Marginal fail at 13 px. Only usable at ≥ 14 px semibold |
| `--dim` on `--bg` | 4.87 : 1 | Passes at 13 px |
| `--red-hi` on `--surface` | 4.64 : 1 | Passes. Added in WO-001 for exactly this reason |
| `--amber` on `--surface` | 8.51 : 1 | Passes |
| `--green` on `--surface` | 5.15 : 1 | Passes |
| `--bone` on `--surface` | 13.2 : 1 | Passes |

Correction to my own WO-001 §0.7 table, so nobody inherits a wrong number: I recorded `--red-hi` on
`--bg` as 8.0 : 1. Recomputing gives **5.4 : 1**. It still passes AA at every size used, so no decision
changes — but the 8.0 figure should not be quoted again.

**And the layout defect a redesign is the natural moment to kill: B-37.** At 400 px a `.setrow`
measures **369 px inside a 366 px content box**, so the last-session ghost text — the best feature in
the app, the thing that removes remembering from the task — renders at zero width and is invisible on
the phone it was designed for. It is also `--faint` on `--surface` at 2.30 : 1, so on the rare screen
where it does fit, it is the least legible text in the app.

Two requirements for any new design, and they are the highest-value thing on this page:

- **The set row must fit its container at 400 px with the ghost hint fully visible.**
- **The ghost hint must meet 4.5 : 1.**

Nothing in this spec depends on the ghost being readable — W3 forbids that — but a redesign that fixes
it improves the app more than every rule in WO-003 combined.

### 0.4 The one layout invariant

```
CARD, top to bottom. The ORDER is normative. The shapes are [REF].

  name + target line                          ← §5
  prescription / volume hint                  ← §4
  movement & cue (collapsed)
  set rows          ← THE INPUTS
  note field        ← THE LAST INPUT ON THE CARD
  ─────────────────────────────────────────
  BOTTOM STACK — everything this spec adds:
    1. pain notice          (§2, conditional)
    2. speed too-heavy flag (§4, conditional)
    3. verdict slot         (§1, always present)
```

**No element that accepts input may sit below the bottom stack.** That rule is what makes the whole
spec safe. The only element outside the card is the rest timer (§3).

### 0.5 Substitution tokens

| Token | Definition | Example |
|---|---|---|
| `{ex}` | Exercise name from `PROGRAM`, escaped | `Bent-over / Pendlay row` |
| `{s}` | `ex.s`, the prescribed set count | `3` |
| `{mmss}` | Elapsed rest, `m:ss`, no leading zero on minutes | `1:12` · `0:44` · `12:03` |
| `{ready}` | The ready threshold, same format | `2:30` |
| `{w}` | A logged weight, no trailing zeros | `110` |
| `{target}` | `PHAT.speedLoad().target` | `95` |
| `{R}` | `speedLoad().source.w` | `100` |
| `{unit}` | The implement suffix from W2's tags, or nothing | ` · per DB` |

---

# FLOW 1 — The verdict slot

```
Flow:   Verdict slot
Entry:  Every card on the session screen, at first paint and after every committed set.
Exit:   None. The slot is a permanent part of the card.
```

## 1.1 What is being fixed

`paintVerdict` runs on every keystroke and the verdict element is hidden until it has text. After W5 a
verdict only exists once completed sets ≥ `ex.s`. So on the third set's last keystroke, a card that has
been one height for the whole exercise becomes taller, and everything below it jumps — while his thumb
is on a stepper he may still want to press.

## 1.2 Rules

1. **The slot is present on every card from first paint, for every `ex.k`.** It is never removed and
   never collapsed to zero.
2. **It holds a reminder when the rule returns `null`, and the verdict when it does not.** Exactly one
   of the two is visible at any moment.
3. **Its height must not change when the verdict replaces the reminder.** The slot reserves at least
   the height of a two-line verdict. A three-line verdict may grow it; per §0.4 that can only push the
   next card down, never an input.
4. **The reminder text is a sibling of the verdict node, not its content.** W5's criterion — "typing
   into set 1 leaves `.verdict` with an empty `textContent` at every keystroke" — holds literally, and
   QA should keep asserting it against the verdict node, not the slot. `[REF]` for the node names; the
   rule is: *the empty-verdict assertion must stay assertable.*
5. **The verdict recomputes on commit, never on `input`.** Commit = a stepper tap, or `focusout` of a
   set field. Typing `12` passes through `1`, and `1` on a 3–5 exercise produces
   `1 rep at 100 kg. Below the range. Drop to 95 kg next session.` — a confident wrong instruction that
   flashes on screen and can be half-read. Same event that starts the rest timer (§3.3).
6. **Status is never carried by colour.** The sentences already say `Go to 102.5 kg` and
   `Drop to 95 kg`. Any colour used is redundant.

## 1.3 Copy

| Condition | String |
|---|---|
| `ex.k` `power` or `hyp`, verdict `null` | `Nothing to say until all {s} sets are in.` **NEW** |
| `ex.k` `speed` | See §4.4 — the slot holds SP1's permanent instruction instead |
| Verdict returned | The string from `PHAT.verdict(ctx)`, rendered as-is. Owned by audit §3 / §9 |

Rendered: `Nothing to say until all 3 sets are in.` · `Nothing to say until all 2 sets are in.`

Why a sentence and not reserved blank space: the app used to print something after set 1. From this
release it prints nothing for most of the exercise. One constant line, identical on every card, says
*the app is working and it is waiting*. Because the string never changes while he fills the sets, it is
not something he has to keep re-reading.

## 1.4 States

| State | What renders |
|---|---|
| Empty — nothing logged | Reminder |
| Partial — fewer than `{s}` completed sets | Reminder, unchanged. **No countdown** — a number that ticks down is a number he reads |
| Success — verdict returned | Verdict, replacing the reminder in place, no scroll, no animation, no flash |
| Verdict changes after an edit | Text swaps in place |
| A completed set is cleared back below `{s}` | Reminder returns; the slot returns to its reserved height |
| Error — the rule throws | **Caught per card.** Reminder renders. Nothing surfaced to the user, nothing blocked, sets and note untouched, Save still works |
| Offline | Identical. Nothing here touches the network |

## 1.5 A11y

- No `aria-live` on the slot or the verdict. It changes as a direct result of his own tap, on the card
  he is touching; announcing a 15-word sentence after every stepper press is noise.
- Reading order is DOM order: sets → note → pain notice → flag → verdict. That is also the order of
  importance for someone who cannot see the card.
- Verdict text ≥ 4.5 : 1. No colour-only status.

## 1.6 `[REF]` — the current build

Slot `min-height:56px` (two lines of 13 px / 1.45 plus the existing 9 px padding). Verdict text 13 px
`--bone` on `--bg` (16.4 : 1); reminder 13 px `--dim` on `--bg` (4.87 : 1). Left rule 3 px: `--green`
for an increase, `--red-hi` for a decrease or a mismatch, `--dim` for hold / matched / baseline —
**never `--red`**. Delete `.verdict.up{color}` and `.verdict.down{color}`: that is status by colour
alone in a red that fails contrast, and removing them closes a B-13 item for the cost of two CSS rules.

## 1.7 Out of scope

Any change to set rows, steppers, ghost slot or note field. An expandable "why" behind a verdict.
B-37 — nothing above depends on the ghost rendering.

---

# FLOW 2 — The pain notice (Rule S1)

```
Flow:   Pain notice
Entry:  Two sources, one element:
        (a) the current draft's note for this exercise matches PHAT.painFlag, on commit;
        (b) PHAT.painState(sessions, exId) is true — the last logged entry for that
            exercise carried a matching note.
Exit:   Only by logging that exercise in a later session with no matching note.
        There is no dismiss control.
```

## 2.1 Copy — verbatim, audit §10

```
You logged pain on this. Not something this app can assess.
Holding the weight. If it is sharp, or it repeats, stop the exercise and see a physio or a doctor.
```

Two paragraphs, that order, that punctuation, no interpolation. **No engineer and no future revision of
this spec adds a word to it** — no severity wording, no substitute exercise, no stretch, no rep-range
suggestion, no "if it persists", no link, no icon that implies a grade. The rule *is* the refusal.

## 2.2 Rules

1. **It renders below the note field.** The trigger is him typing in that field; a notice above it would
   push the field he is typing into downward, mid-word, with the caret in it.
2. **It renders above the verdict**, because it explains why the verdict says *hold* when the numbers
   say *add*.
3. **It evaluates on commit, never per keystroke.** `painFlag` matches `\bpain\b`, so typing "painting"
   passes through a matching state at `pain` and out of it at `paint`. Per-keystroke evaluation flashes
   a four-line medical refusal on and off under his caret. Commit = `focusout` of the note, or the
   existing 400 ms draft-save debounce, whichever comes first.
4. **Exactly one instance ever renders.** Two sources, one element.
5. **It is not interactive.** Not a button, not a link, not collapsible, not dismissible.
6. **It must be distinguishable from advice** and may use the refusal treatment — this is the one place
   in this spec where a refusal signal is correct: the app is declining to do something.
7. **Nothing about it depends on colour.** Greyscale it and the words still say what they say.

## 2.3 Sources, and the state he will not understand

| `painState` (history) | Current note matches | Notice | Provenance line |
|---|---|---|---|
| false | false | hidden | — |
| false | true | shown | none |
| true | false | shown | shown |
| true | true | shown | none |

Row 3 is the confusing one: he opens Thursday's session, has typed nothing, and a medical refusal is
already on the rack chin card. **NEW, for coach review** — one meta line, visibly *not* part of the
fixed string, rendered above it:

```
From your last session on this.
```

If `strength-coach` rejects it in W23, render nothing extra and the fixed string stands alone. It is a
provenance label, not a softening, and it is never merged into the audit's two sentences.

## 2.4 Interactions

| Action | Result |
|---|---|
| Types a matching word, leaves the field | Notice appears in the bottom stack. Announced verbatim through the persistent live region. Focus and the card's DOM node identity unchanged |
| Deletes the word, leaves the field | If `painState` is false the notice goes and the verdict re-evaluates without suppression. If `painState` is true it stays |
| Taps the notice | Nothing happens |
| Saves the session | The notice persists into the next session of that exercise via `painState` |
| Logs that exercise next session with a clean note | Notice does not render |

## 2.5 States

| State | Present |
|---|---|
| Empty | No match, no history → nothing renders, no reserved space |
| Success | Notice + the suppressed verdict (the hold copy) |
| False positive (`no pain today, felt strong`) | Notice shows. Accepted and on the record in audit §10. He can clear it by editing the note before saving |
| Error — `painFlag` / `painState` throws | Caught. **Fail towards showing the notice** if `painState` threw and the current note matches; otherwise render nothing. Never block the save |
| Offline | Identical |

## 2.6 A11y

- Marked up as a note landmark; both sentences as separate paragraphs.
- Announced **once**, on transition to shown, through the persistent live region, verbatim. Not
  re-announced on re-render, and never announced by a fresh `render()` call (W17).
- Any warning glyph is decorative and hidden from assistive tech; the sentence carries the meaning.
- Text ≥ 4.5 : 1 on its background.

## 2.7 `[REF]` — the current build

3 px `--red-hi` left rule, 12 px padding-left, on `--surface`. A literal `!` in `--red-hi`,
`aria-hidden="true"`. Both sentences 13 px `--bone` (13.2 : 1), line-height 1.5, 6 px between
paragraphs. Provenance line 12.5 px `--bone`. Announced through `#bs-live`.

## 2.8 Out of scope

Any pain history screen, severity scale or "how bad" prompt. Changing the note placeholder — it says
`Note — RIR, form, pain, anything` and it should, because the app now does something with the answer.

---

# FLOW 3 — The rest timer (Rule R1)

```
Flow:   Rest timer
Entry:  Present from the moment a session opens, in its idle state.
        Starts counting when a reps field is committed. No start button exists.
Exit:   Session saved or discarded.
```

## 3.1 Rules

1. **One timer for the whole app.** There is no per-card timer and no way to have two running.
   Committing a set on another exercise restarts the single timer with that exercise's thresholds. The
   previous rest is gone, which is correct — he has started working again.
2. **It starts without a deliberate tap:** a **reps** field commit — a stepper tap on a reps stepper, or
   `focusout` of a reps input with a non-empty value. Never a weight field. Never a keystroke.
3. **A commit on the set row that started the running timer does not restart it.** Only a commit on a
   *different* row does. Without this rule, correcting a rep count 40 seconds into rest silently resets
   his rest to zero — the app being wrong about his numbers in a new place.
4. **It stores an absolute timestamp, never a tick count.** Elapsed is recomputed from the wall clock on
   every tick and on `visibilitychange`. Lock the phone for three minutes and it comes back showing
   three minutes.
5. **It is always present while a session is open, at a constant size.** An element that appears is an
   element that shifts or covers something. Constant presence is the only arrangement with zero layout
   risk. Its idle state carries copy (§3.2 state 0), so constant presence costs nothing.
6. **It never covers an input.** Whatever space it occupies is reserved in the layout, not overlaid on
   content.
7. **It absorbs taps and performs no action.** A transparent status band that lets a tap through onto
   the card underneath is an accidental stepper press.
8. **It never calls `render()`.** One text write to one node, on an interval. That is the whole seam.
9. **It is never in the save path.** Save does not stop, read or await it. Stopping happens after the
   write returns.
10. **It never persists.** Timer state is in memory only — not in the draft, not in the log. A lost
    timer costs nothing.
11. **No sound, no vibration, no notification.** His phone is on a bench next to other people.
12. **No controls.** No start, no stop, no reset, no skip. A stop button is a tap he has to remember.

A progress bar was considered and rejected: it doubles the per-second DOM writes on the app's most
dangerous seam (B-19), and the string already carries the number.

## 3.2 The six display states

Thresholds from audit §6, keyed on `ex.k` and `ex.hi` of the exercise whose set was committed:

| `k` | `hi` | ready | cap | 2× cap |
|---|---|---|---|---|
| power | ≤ 8 | 150 s | 180 s | 360 s |
| power | > 8 | 120 s | 180 s | 360 s |
| hyp | ≤ 12 | 90 s | 120 s | 240 s |
| hyp | > 12 | 60 s | 120 s | 240 s |
| speed | — | 60 s | 90 s (hard) | 180 s |

| # | Window | String |
|---|---|---|
| 0 | Idle — no set committed yet this session | `Rest timer starts when you log a set.` **NEW** |
| 1 | `0 ≤ t < ready` | `Rest {mmss} · go at {ready}` |
| 2 | `ready ≤ t ≤ cap` | `Ready.` |
| 3 | `cap < t < 2× cap`, power or hyp | `{mmss}. You are past the rest window. Go.` |
| 4 | `cap < t < 2× cap`, speed | `{mmss}. Too long for speed work. Go now or drop the weight.` |
| 5 | `t ≥ 2× cap` | `Rest over.` — and the count **stops** |

States 1–5 verbatim from audit §6. State 0 is mine.

Checks against W18's criteria: squat (`power`, `hi` 5) at 72 s → `Rest 1:12 · go at 2:30`; at 150 s →
`Ready.`; row speed work at 130 s → `2:10. Too long for speed work. Go now or drop the weight.`; squat
at 360 s → `Rest over.`

**Emphasis requirement, not a type spec:** the elapsed time is the glanceable part. In state 1 the clock
may be set larger than the tail, **provided the rendered text still reads exactly
`Rest 1:12 · go at 2:30`** — no reordering, no extra whitespace, no line break between the two parts.
States 3 and 4 are long enough to wrap and must be set at one size; a mixed-size wrap is unreadable at
arm's length. **In no state may the element's height change.**

**Colour is never the carrier:** state 2 says `Ready.`, state 3 says `Go.`, state 5 says `Rest over.`
Any colour used is redundant.

## 3.3 States

| State | Present |
|---|---|
| Empty / first run | State 0, from the moment the session opens |
| Running | States 1–5 |
| Success | Not applicable — the timer has no success state, only `Ready.` |
| Error — no thresholds for an exercise | State 0. Never `NaN:aN`, never a blank |
| Clock moved backwards (negative elapsed) | State 0. Not an error, no message |
| Session saved or discarded | Timer removed with the session view, and its reserved space with it |
| Offline | Identical |

## 3.4 A11y

- **Not a live region.** A per-second update is unusable through a screen reader, and a status role with
  `aria-live="off"` is a contradiction the engineer should not write.
- Three transitions are announced **once each per rest**, through the persistent live region: entering
  state 2 (`Ready.`), entering state 3 or 4 (the full string), entering state 5 (`Rest over.`). A
  restart re-arms all three.
- Not focusable. Focus order on the session screen is unchanged by this flow.
- Text ≥ 4.5 : 1 in every state, including the amber past-cap state.
- Device hazard to retest: the bottom nav is already `position:fixed` and untested with a software
  keyboard up (B-36). Any fixed element inherits that risk; it belongs in the same real-device test.

## 3.5 `[REF]` — the current build

A 44 px strip fixed to the top edge of the viewport, full width, with `#view` carrying a matching 44 px
top padding while a draft is open, so it covers nothing. The node lives **outside `#view`**, created
once at boot, exactly like `#bs-live` — a re-render never destroys it and never restarts it. Visible on
every tab while a session is open, so the rest clock follows him to Trend. Text wraps to at most two
lines inside the fixed 44 px. State 0 and 5 `--dim` at 14 px semibold; state 1 `Rest {mmss}` 17 px mono
`--bone` with the tail 13.5 px `--dim`; state 2 17 px semibold `--green` (5.15 : 1); states 3–4 13 px
`--amber` (8.51 : 1).

Placements rejected, with reasons a redesign should not re-litigate:

| Placement | Why not |
|---|---|
| Inside the card, under the set rows | Sits above inputs, appears and disappears, moves the row he is filling. Violates §0.4 |
| Bottom bar above the nav | Fixed, so on appearing it covers the bottom of the viewport — very likely the row he just committed or the `Save session` button |
| Floating pill | Same overlap, smaller area, worse legibility |
| Only visible while running | Anything that appears shifts or covers something |

## 3.6 Out of scope

Auto-advance to the next set or exercise. Any per-exercise override of the rest table or UI to edit it —
those numbers are `strength-coach`'s (audit §6). Sound, vibration, notifications, wake lock, background
execution.

---

# FLOW 4 — The speed card (Rule SP1)

```
Flow:   Speed card
Entry:  Opening d3 / d4 / d5. The speed exercise is always the first card on the day.
Exit:   None. It behaves like any other card.
```

## 4.1 Rules

1. **The prescribed load is a kilogram number, shown before the first set.** It sits with the card head,
   above the inputs, because it is a prescription — he reads it before he loads the bar, not after.
2. **The percentage never appears without a computed kg**, except inside the no-data fallback, where the
   absence of a number *is* the message.
3. **No guessing.** No source set at 3–5 reps within 28 days, widening to 56 → the fallback. Never
   inferred from a 10-rep set, never fallen back to `topSet`.
4. **The too-heavy flag is advice, and must be styled as advice, never as a refusal** (§0.1 rule 6).
5. **The flag is ungated**, deliberately, unlike every other verdict in this batch: audit §7 calls it a
   *live check*, and its entire value is telling him to drop the weight before sets 2–6 rather than
   after. It still evaluates on commit, never per keystroke.
6. **One flag per card**, naming the heaviest flagged weight. Six rows of `110` produce one line.
7. **The flag touches nothing.** Assert all four: the field still reads `110`; the draft on disk still
   holds `110` within 400 ms; `Save session` writes `{w:110, …}`; the flag never clears, disables,
   re-steps or rewrites the value.
8. **The SP1 instruction line is permanent** — present from first paint, never gated, never replaced.

## 4.2 Copy

**The prescription** (audit §7, verbatim; WO-003 Decision 5 applied to the fallback, so `{ex}`
interpolates the *source* exercise's current name and renders `Bent-over / Pendlay row` after B-28):

| Case | String |
|---|---|
| `speedLoad().target` is a number | `{target} kg. 65–70% of your {R} kg triple. Rest 60–90 s. Fast, never grinding.` |
| `target` is `null` | `Log a heavy triple on {ex} and this becomes a number. Until then: 65–70% of a weight you could triple.` |

**The flag** (audit §7, verbatim), bottom stack position 2:

```
110 kg is not speed work. Drop to 95 kg.
```

**The instruction** (audit §7, verbatim), permanently in the verdict slot, replacing the old
`Submaximal and fast. Do not grind these.`:

```
If a rep slows down, the set is over. Cut the weight, not the sets.
```

## 4.3 The verdict slot on a speed card

The slot from §1 holds the instruction line above, always, from first paint, never gated on set count,
never replaced. There is no other speed verdict — `PHAT.verdict` returning anything for a `k:"speed"`
exercise is a bug, and the slot renders this line regardless.

## 4.4 States

| State | What renders |
|---|---|
| Empty — no source history at all | Fallback prescription · no flag · instruction |
| Source logged but never at 3–5 reps within 56 days | Fallback prescription. Not a guess off a 10-rep set |
| Success | Computed prescription · no flag · instruction |
| Flagged | Computed prescription · flag · instruction · **the number untouched** |
| Error — `speedLoad` throws | Caught. Fallback prescription. No flag. Nothing blocked |
| `target` computed but `R` missing | Impossible by construction; if it happens, render the fallback |
| Offline | Identical |

## 4.5 A11y

- Prescription: a plain paragraph, no live region — present at first paint, changes only between
  sessions.
- Flag: announced **once** on appearance through the persistent live region, verbatim.
- The flagged input gets **no** `aria-invalid` and **no** `aria-describedby` pointing at the flag. It is
  a valid value; telling a screen reader otherwise is a lie with consequences.
- Text ≥ 4.5 : 1; the flag's rule (or whatever marks it) ≥ 3 : 1 and redundant with the words.

## 4.6 `[REF]` — the current build

Prescription replaces the existing `.hint` in place, promoted from 12.5 px `--dim` to 13.5 px `--bone`
on `--surface`, line-height 1.5, because it is the one line on the card that is a kilogram number he is
about to load. Flag: 3 px `--amber` left rule, 12 px padding-left, 13 px `--bone`, **no** `!` glyph and
**no** `--red-hi` — that treatment means "the app will not take this", and the app is taking it.

## 4.7 Out of scope

Plate math (B-10) — `95 kg` is still a number he translates at the rack; unblocked by W11, not built.
Warm-ups, ramps, set-by-set prescriptions. Changing `SPEED_SRC`, the 28/56-day windows or the 0.75 flag
threshold — audit §7, not mine.

---

# FLOW 5 — The target line and the dumbbell unit (B-22)

```
Flow:   Target line
Entry:  Every card head, every session, first paint.
Exit:   None.
```

## 5.1 Copy

| Case | String | Example |
|---|---|---|
| Range | `{s} × {lo}–{hi}{unit}` | `3 × 3–5 · per DB` |
| Fixed reps | `{s} × {lo}{unit}` | `6 × 3` |

`{unit}` is ` · per DB` when W2's implement tag is `db`, and **empty for every other tag**. Format from
audit §1 D-3, verbatim, including the spaces around `·` and the en dash in `3–5`.

Rendered: `3 × 3–5 · per DB` (d1d Flat DB press) · `3 × 3–5` (d2a Squat) · `6 × 3 · per DB` (d5a).

**Dependency, blocking:** the tag list is `strength-coach`'s in W2. If W2 assigns a display token to
another tag — `bodyweight`, say — it renders in the same slot under the same rules. I do not invent one.

## 5.2 The measurement problem, and the ruling

`[REF] measurement:` at 400 px the card head has 334 px of content. `3 × 6–10 · per DB` is 17 mono
characters ≈ 133 px, leaving ≈ 189 px for the name at 16 px semibold — about 21 characters.
`Seated DB shoulder press` is 24 and `Flat DB press — speed work` is 26.

**Normative ruling: the target line never wraps, never truncates and never shrinks. If something must
give, the exercise name wraps to a second line.** No ellipsis on either. A truncated `3 × 6–10 · per…`
is a prescription he cannot read; a name on two lines is a slightly taller card head, above any input.

This satisfies W11's criterion as written — *the target line* does not wrap — and states plainly which
element gives way, which the criterion does not.

## 5.3 States

| State | Present |
|---|---|
| Untagged exercise (a future addition) | No suffix. W11's test fails loudly on an untagged slot; the UI degrades to today's behaviour rather than printing `undefined` |
| `lo === hi` | `6 × 3`, no en dash |
| Deload week | The set count reflects the deload prescription — see `docs/specs/wo-003-train-weight.md` §3 |
| Offline | Identical |

## 5.4 A11y

- Real text, not a CSS pseudo-element — pseudo-element text is unreliable to assistive tech and cannot
  be copied.
- The card head reads `Flat DB press, 3 × 3–5 · per DB`. Do not substitute `x` or `-` for `×` and `–` in
  the visible string.
- ≥ 4.5 : 1 at whatever size it is set.

## 5.5 Why nine characters matter

The app has never said whether a dumbbell number is one bell or the pair. Until it does, the Trend line
for `DB press` cannot be read, SP1 computes a percentage of an unknown quantity (audit §7 example 5:
"if D-3 is not fixed first, this rule cannot ship"), and plate math cannot start.

---

## 6. What each surface does when its rule returns nothing

Required by W3's acceptance criteria, in one place.

| Surface | Rule returns nothing | Rendered |
|---|---|---|
| Verdict slot | `PHAT.verdict` → `null` | `Nothing to say until all {s} sets are in.` Same slot, same reserved height |
| Pain notice | `painFlag` false and `painState` false | Nothing. No reserved space, no placeholder |
| Rest timer | No set committed yet | `Rest timer starts when you log a set.` The element itself never disappears |
| Speed prescription | `speedLoad().target` → `null` | `Log a heavy triple on {ex} and this becomes a number. Until then: 65–70% of a weight you could triple.` |
| Speed flag | Not flagged, or no `R` | Nothing |
| Target line | No implement tag | `{s} × {lo}–{hi}` with no suffix |

## 7. Touch targets and thumb zone

**This spec adds no interactive elements.** Every surface above is read-only. So the "≥ 44 px, lower
two-thirds, never a top corner" criterion is met by having nothing to place — with one deliberate
exception argued in §3.1 rule 7: the rest timer absorbs taps without acting. Wherever a redesign puts
it, it must be full width or otherwise clearly not a corner control, and it must carry no action.

## 8. What `frontend-engineer` needs that does not exist yet

| # | Item | Owner | Blocking? |
|---|---|---|---|
| 1 | A verdict slot that is occupied before the verdict exists, with the empty-verdict assertion still assertable | frontend (W5/W17) | Yes — §1.2 |
| 2 | Remove colour-only verdict status | frontend | Yes — §1.2 rule 6, closes a B-13 item |
| 3 | Verdict recomputed on commit, not on `input` | frontend (W17/W18) | Yes — §1.2 rule 5 |
| 4 | `PHAT.painState(sessions, exId)` | backend (W16) | Yes — §2.3 |
| 5 | A timer element that survives `render()` and reserves its own space | frontend (W18) | Yes — §3.1 |
| 6 | Per-exercise `{ready, cap}` from the §3.2 table | frontend (W18) | Yes |
| 7 | "Same set row does not restart the timer" | frontend (W18) | Yes — §3.1 rule 3 |
| 8 | `PHAT.speedLoad` exposing `source.w` for `{R}` and the source exercise id for `{ex}` | backend (W12) | Yes — §4.2 |
| 9 | Implement tags on all 42 slots | coach (W2) → backend (W11) | Yes — §5.1 |
| 10 | Per-card `try`/`catch` around every rule call | frontend | Yes — §1.4, §2.5, §4.4 |
| 11 | One persistent live region outside the re-rendered view, used for every announcement in this spec | frontend | Yes — §0.2 |

## 9. Decisions that are not mine

- **Rest durations, the ready/cap table, the 0.75 flag threshold, the 28/56-day windows, the pain regex,
  and every gated verdict string.** All `strength-coach`, all ruled in audit §3, §6, §7, §9, §10.
  Nothing above changes a number or a word of them.
- **`From your last session on this.`** (§2.3) — my addition next to a block the audit fixed. If the
  coach says no, it does not ship and the fixed string stands alone.
- **`Nothing to say until all {s} sets are in.`** (§1.3) and **`Rest timer starts when you log a set.`**
  (§3.2) — status copy, not advice, but they sit next to advice. Coach review in W23.

## 10. Out of scope

Redesigning the session view; moving `Discard` out of the top-right corner (B-34). B-13 at large:
`maximum-scale=1`, input labels, `−`/`+` accessible names — only the new surfaces above meet the bar,
and §0.3's measurements are handed to B-13 as evidence. B-37 — flagged in §0.3 as the highest-value fix
for a redesign, but nothing here depends on it. B-19, the full re-render — §1.2, §2.2 and §3.1 all avoid
it; none of them fixes it. Editing or deleting a saved set (B-05) — every rule on this screen reads
history he cannot correct, and this batch makes that history more consequential, not less.

## 11. Full string index

```
Nothing to say until all 3 sets are in.                                        NEW
Rest timer starts when you log a set.                                          NEW
From your last session on this.                                                NEW
You logged pain on this. Not something this app can assess.
Holding the weight. If it is sharp, or it repeats, stop the exercise and see a physio or a doctor.
Rest 1:12 · go at 2:30
Ready.
3:20. You are past the rest window. Go.
1:38. Too long for speed work. Go now or drop the weight.
Rest over.
67.5 kg. 65–70% of your 100 kg triple. Rest 60–90 s. Fast, never grinding.
Log a heavy triple on Bent-over / Pendlay row and this becomes a number. Until then: 65–70% of a weight you could triple.
110 kg is not speed work. Drop to 95 kg.
If a rep slows down, the set is over. Cut the weight, not the sets.
3 × 3–5 · per DB
```

Verdict strings rendered here but owned by audit §3 and §9, listed so QA has them in one place:
`Top of range on all 3 sets. Go to 102.5 kg next session.` ·
`Stay at 100 kg until all 3 sets reach 5 reps.` ·
`Sets not matched: 100 / 100 / 95 kg. Repeat 100 kg until all 3 sets reach 5 reps.` ·
`2 reps at 100 kg. Below the range. Drop to 95 kg next session.` ·
`7 reps at 100 kg on every set. Too light. Go to 105 kg.` ·
`If 2.5 kg is not available, add reps up to 7 first, then jump.` ·
`6 reps at 40 kg. Below the 8–12 range. Drop to 37.5 kg.` ·
`All sets above 12. Go to 42.5 kg next session.` ·
`First time logged. This becomes your baseline.` ·
`Volume up 6% — 1,240 kg against 1,170 kg.` ·
`Volume down 8%. Add a rep or 2.5 kg next time.`

Unchanged existing strings this spec relies on: `Not in today's volume. It has numbers in it.` ·
`Note — RIR, form, pain, anything` · `Session saved.`

No emoji. No exclamation marks. No praise. No severity judgement.
