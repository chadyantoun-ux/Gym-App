# WO-003 · W4 — UX spec: the Train and Weight screens

Author: `ux-designer` · Date: 2026-09-09 · Status: ready for `frontend-engineer`
Implements: WO-003 §W4 · Consumed by: W8 (Weight tab), W15 (volume tier UI), W20 (deload UI)
Covers: B-23 (volume tier), B-18 (deload / cycle awareness), B-06 (bodyweight rate and calorie bands)

**How to read this file.** Chady is redesigning the app's visual language. So this spec is written in
two weights:

- **Normative** — states, copy, interaction rules, constraints, accessibility. These are the
  specification, they survive any redesign, and they are what gets implemented.
- **`[REF]`** — anything describing the *current* build: pixel values, existing class names, ASCII
  layouts, present colour tokens. Marked wherever it appears. A new design may discard all of it and
  still be correct, provided §0 holds.

Copy in `code fences` ships **verbatim** and comes from `docs/coach-audit.md` §2, §5 and §8. It may not
be softened, shortened, re-ordered or re-punctuated. Strings marked **NEW** are mine and need
`strength-coach`'s sign-off in W23. `{braces}` are substitutions, defined in §0.5.

---

## 0. What a new visual design must still honour

### 0.1 Non-negotiable behaviour

| # | Requirement | Why |
|---|---|---|
| 1 | **No single control may add more than one accessory.** There is no checkbox, no toggle, no "restore all", no settings screen that changes more than one exercise's inclusion at a time | This is the burial the ✂ block exists to prevent. Full PHAT volume from a low baseline buries a lifter in about three weeks |
| 2 | **An exercise the volume tier hides, but which has numbers in the current draft, still renders and still saves** | The tier may change what he is *asked* to do. It may never change what he has *already logged* |
| 3 | **A deload reduces the prescription, not the log.** Sets already typed above the deload's set count still render, still save, and are still reachable | Same rule, second mechanism |
| 4 | **There is always exactly one "where am I in the programme" line on the Train screen, and exactly one definition of "week"** | Two week numbers on one screen is the confusion this batch exists to remove |
| 5 | **Before training week 6, the word "deload" appears nowhere in the app** | A deload recommended to a man six sessions in teaches him to ignore the banner |
| 6 | **No screen shows a kilogram-per-week number, or a calorie instruction, when the rule says there is not enough data** | Showing a number the app cannot justify is a UX failure before it is a maths failure |
| 7 | **The 7-day average is always labelled with the count of days it actually used** | `7-day average (6 of 7 days)`. An average that hides its own sample size is a claim, not a measurement |
| 8 | **The calorie-change acknowledgement cannot be triggered by one accidental tap; clearing it can.** | Setting it silences advice for 7 days. Clearing it restores advice. The asymmetry is deliberate |
| 9 | **Every offer, banner and acknowledgement is answerable without scrolling from where it appears**, and its buttons are ≥ 44 px, never in a top corner | 90 seconds of rest, one thumb |
| 10 | **The safe or conservative choice is the cheapest tap** — closest to the thumb, and never the one a stray second tap lands on | `Not yet` must be easier to hit than `Add it` |
| 11 | **Ignoring an offer is not the same as declining it.** An unanswered offer is re-offered; a declined one waits 7 days | An offer he scrolled past must not silently cost him an accessory or silently stamp a cooldown |
| 12 | **Nothing on these two screens is destructive without an undo or a confirmation** | Standing rule |

### 0.2 Accessibility — hard requirements, in any design

| Requirement | Binding form |
|---|---|
| Contrast | Body text ≥ **4.5 : 1** on its own background; meaningful non-text ≥ **3 : 1** |
| Touch targets | ≥ **44 px** for every button in this file: `Add it`, `Not yet`, `Start deload week`, `Not now`, `End it early`, `I changed my calories today`, `Yes, changed today`, `I did not change anything` |
| Top corners | None of the above in a top corner |
| Never colour alone | The kg-per-week number is **not** coloured by whether it is good. The advice sentence is the carrier. Greyscale the screen and every state still reads |
| Live regions | Anything appearing without a navigation — the reintroduction result, the rollback notice, a deload state change, the new calorie advice after logging a weight — is announced through **one persistent region outside the re-rendered view**. No `aria-live` inside `#view` `[REF]`: `render()` recreates it, and a recreated live region never announces |
| Modal confirmations | Focus moves to the headline on open, is trapped, returns to the trigger on cancel. `Escape` and a scrim tap both cancel |
| Zoom | `maximum-scale=1` must go (B-13). Every layout here must survive text scaling to 200 % |

### 0.3 Evidence from the current palette — things to design *away* from

Measured, not assumed. Facts about today's tokens; a new palette should not reproduce them.

| Pair | Ratio | Status |
|---|---|---|
| `--faint` on `--surface` | **2.30 : 1** | Fails badly. `.tiny` uses it — including `Your log is saved on this device…` on the Train screen and the session date on Trend rows. Forbidden in every new element here |
| `--red` on `--surface` | **2.84 : 1** | Fails even the 3 : 1 non-text bar. The current Weight tab paints `Change vs last week` in it |
| `--red` on `--bg` | 3.17 : 1 | Non-text only |
| `--dim` on `--surface` | **4.36 : 1** | Marginal fail at 13 px — which is exactly how the current advice line and sub-line are set |
| `--dim` on `--bg` | 4.87 : 1 | Passes at 13 px |
| `--red-hi` on `--surface` | 4.64 : 1 | Passes |
| `--amber` on `--surface` | 8.51 : 1 | Passes |
| `--green` on `--surface` | 5.15 : 1 | Passes |
| `--bone` on `--surface` | 13.2 : 1 | Passes |

Correction to my WO-001 §0.7 table: `--red-hi` on `--bg` is **5.4 : 1**, not the 8.0 : 1 I recorded. It
still passes at every size used; do not quote 8.0 again.

**And the layout defect a redesign should kill, recorded here too because it is the highest-value fix
available: B-37.** At 400 px a set row measures **369 px inside a 366 px content box**, so the
last-session ghost text renders at zero width. It is also `--faint` on `--surface`. The best feature in
the app — the thing that removes remembering from the task — is invisible on the phone it was designed
for. Any new design must fit the set row at 400 px with the ghost hint visible and at ≥ 4.5 : 1.

### 0.4 Information hierarchy — what each screen answers

| Screen | The one question | First thing readable at arm's length | One tap away | Buried |
|---|---|---|---|---|
| Train | *What do I do now* | The five day buttons | The cycle line, the deload banner | Export, storage notice |
| Weight | *Am I eating right* | The 7-day average and the advice sentence | The acknowledgement, the confirmation | The chart, the target sub-line |

The Train screen is a day picker. Everything else on it is context for the tap he is about to make, and
none of it may push the day list off the first screenful.

### 0.5 Substitution tokens

| Token | Definition | Example |
|---|---|---|
| `{tw}` | `PHAT.trainingWeeks(...)` — calendar weeks containing ≥ 3 logged sessions | `3` |
| `{cw}` | Calendar weeks since the first logged session | `5` |
| `{ex}` | The offered / reintroduced / rolled-back exercise name | `Rack chin` |
| `{back}` / `{cuts}` | Accessories currently back in / total ✂ accessories | `4` / `9` |
| `{n}` | A count of sessions, days or entries | `6` |
| `{date}` | A local calendar date, day + month | `16 Sep` |
| `{rate}` | Signed, two decimals, always with an explicit sign | `+0.34` · `-0.05` · `+0.00` |

---

# FLOW 1 — The volume tier (Rule V1)

```
Flow:   Volume tier
Entry:  Train screen (the cycle line, always) and the session screen (the offer,
        on opening a day that has an eligible accessory).
Exit:   The offer is answered, ignored, or the session is saved.
```

## 1.1 What is being deleted, and what is not

The `Full volume` checkbox and its handler are **gone from the DOM in every state**. There is no
replacement toggle anywhere. The stored `includeCut` key stays on disk, byte-identical, and keeps being
exported (WO-003 Decision 6) — it simply stops being read.

`[REF]` the checkbox lives in a panel with `Export everything as JSON` and the storage note. That panel
keeps Export and the note; the checkbox row is removed and nothing replaces it in that position — the
tier's status moves to the cycle line at the top of the screen (§1.2).

## 1.2 The cycle line — one line, one definition of "week"

**Rule: the Train screen carries exactly one programme-state line at all times, chosen by precedence.**
Never two.

| # | Condition | Line |
|---|---|---|
| 1 | No sessions logged | *No line.* The existing first-run copy stands: headline `Start here`, sub `Pick a day and log your first session. Every number you enter makes the next one easier.` |
| 2 | `{tw}` is 0 but at least one session exists | `Reduced volume until you have logged four weeks of three or more sessions.` **NEW** |
| 3 | `1 ≤ {tw} ≤ 4` | `Week {tw} of 4 at reduced volume. The cut exercises come back from week 5.` |
| 4 | `{tw}` is 5 | `Week {tw} · {back} of {cuts} accessories back in.` |
| 4b | `{tw}` is 5 and every accessory is back | `Full volume. All {cuts} accessories are in.` |
| 5 | `{tw} ≥ 6` | `Week {tw} · full volume phase · {back} of {cuts} accessories back · last deload: {none \| {date}}` |
| 6 | A deload is active | The active deload line replaces this line — see §2.4 |

Rendered: `Week 3 of 4 at reduced volume. The cut exercises come back from week 5.` ·
`Week 5 · 0 of 9 accessories back in.` · `Full volume. All 9 accessories are in.` ·
`Week 7 · full volume phase · 4 of 9 accessories back · last deload: none`

Rows 3, 4, 4b are audit §5 verbatim. Row 5 is audit §8 verbatim. Row 2 is mine.

**Why row 5 replaces row 4 rather than joining it — a conflict I am resolving, see §4.1.** At week 7 the
two audit strings would print `Week 7 · 4 of 9 accessories back in.` immediately above
`Week 7 · full volume phase · 4 of 9 accessories back · last deload: none`. The second contains the
first. Printing both is the app repeating itself to a man who is trying to pick a day.

**The headline stops being a week number.** `[REF]` today `vTrain`'s `h1` renders `Week {weeksIn()}` —
a *calendar* week — which would sit directly above a cycle line carrying a *training* week. Two numbers
called "Week" on one screen. The headline becomes **`Pick your day` NEW**, the sub-line keeps the
session count (`12 sessions logged.`), and the cycle line owns every week number in the app. The
first-run headline `Start here` is unchanged.

## 1.3 Calendar weeks versus training weeks

A rule that gates on "week 5" means five weeks of ≥ 3 sessions. Without saying so, the app looks broken
to a man who has been training for five calendar weeks.

**Rule: whenever `{cw} ≠ {tw}`, the cycle line is followed by a divergence line and, beneath it, the
explanation.**

| Condition | Line |
|---|---|
| `{cw} ≠ {tw}` and `{tw} < 5` | `Week {cw} by the calendar, week {tw} of real training. Reduced volume holds.` *(audit §5, verbatim)* |
| `{cw} ≠ {tw}` and `{tw} ≥ 5` | `Week {cw} by the calendar, week {tw} of real training.` **NEW** |
| Both of the above | `A training week is a week with three or more logged sessions.` **NEW** |

Rendered: `Week 5 by the calendar, week 3 of real training. Reduced volume holds.` /
`A training week is a week with three or more logged sessions.`

The explanation line renders every time the divergence line does. It is one sentence, it is the answer
to the only question the divergence raises, and hiding it behind a tap would be hiding the reason.

## 1.4 The reintroduction offer

**Where it appears:** at the top of the session screen, above the first exercise card, when
`volumeTier().offer` is non-null. Not on the Train screen: the decision is about *this* session, and the
moment to make it is when he opens the day, before he has lifted anything.

**Constraints, not a layout:**
- Answerable **without scrolling** from the top of the session screen.
- Both buttons ≥ 44 px, neither in a top corner.
- `Not yet` is the cheapest tap: closest to the thumb, and positioned so that a stray second tap after
  `Add it` cannot land on `Add it` again.
- It is inline content, not an overlay. It never covers a card, never traps focus, and scrolling past it
  is allowed.

**Copy — audit §5, verbatim:**

| Element | String |
|---|---|
| Offer | `Add {ex} back to this session? Only if last week left you recovered and no lift went backwards.` |
| Accept | `Add it` |
| Decline | `Not yet` |
| Accepted | `{ex} is back in. That is the only addition for 7 days.` |
| Declined | `Left out. Asked again next week.` |

Rendered: `Add Rack chin back to this session? Only if last week left you recovered and no lift went
backwards.`

**Interactions:**

| Tap | What changes |
|---|---|
| `Add it` | The offer block is replaced **in place** by `{ex} is back in. That is the only addition for 7 days.` The exercise's card appears in programme order, carrying the marker line in §1.5. `reintro[dayId]` increments, `lastReintroDate[dayId]` is stamped. **The app does not scroll.** Announced through the persistent live region |
| `Not yet` | The offer block is replaced in place by `Left out. Asked again next week.` The date is stamped, the counter does not move. Announced |
| Scrolls past without answering | Nothing is stamped, nothing is incremented. The offer is shown again next time this day is opened. **Ignoring is not declining** |
| Saves the session with the offer unanswered | Same as above |
| Taps `Add it` twice | The offer block no longer exists after the first tap, so there is no second tap. If one arrives by another route it is a no-op: one accessory per day per 7 days is enforced in `volumeTier`, not in the UI |

## 1.5 The reintroduced card, and the hidden-but-populated card

| Case | Line on the card |
|---|---|
| Just reintroduced this session | `Back in from this session.` **NEW** |
| Hidden by the tier but the draft has numbers in it | `Not in today's volume. It has numbers in it.` *(existing string, unchanged)* |

The second is the §0.1 rule 2 case, and it is absolute: the card renders, the sets render, the note
renders, and `Save session` writes all of them. Reload mid-draft and they come back through the restore
offer. This is the same string WO-001 introduced for a card revealed by a blocked save; one string, two
triggers, one meaning.

## 1.6 Rollback

**Copy — audit §5, verbatim:** `Progress stalled. Pulling {ex} back out for now.`

| Rule | |
|---|---|
| Where | Train screen, directly under the cycle line |
| When it appears | When `rollbackReintro` has run and no session has been logged since |
| When it goes | After the next session is saved. The lower accessory count in the cycle line carries the fact from then on |
| Announced | Yes — it appears without a navigation |
| Dismissible | No. It disappears by itself, and it is a statement of what the app already did |
| Data | A rollback may never remove an exercise that has numbers in the current draft (§0.1 rule 2) |

**Dependency on `backend-engineer` (W14):** `rollbackReintro` must record what it pulled and when —
`state.lastRollback = {exId, name, date}` — or the UI cannot name the exercise or know when to stop
showing the line. W14 as written returns nothing.

## 1.7 States — Flow 1

| State | Present |
|---|---|
| Empty — no sessions | No cycle line, no offer. First-run copy only |
| Weeks 1–4 | Cycle line row 3. **No offer, no override, nowhere in the app** |
| `{tw}` 0 with sessions logged | Cycle line row 2 |
| Divergence | Cycle line + divergence line + explanation |
| Offer available | Offer block at the top of the session screen |
| Offer accepted | Confirmation in place; new card in programme order with its marker |
| Offer declined | Confirmation in place; nothing added |
| Offer ignored | Nothing stamped; re-offered next session of that day |
| All accessories back | Row 4b at week 5, or row 5's `9 of 9` from week 6. No offer block renders at all |
| Stall / rollback | Offer suppressed; rollback line under the cycle line |
| Deload active | Offer suppressed; accessories out; §2.4 |
| Error — `volumeTier` throws | Fail **open**: render the base exercises (no `cut:1`), no offer, no cycle line. Never render a partial day, never hide a populated card |
| Offline | Identical. Nothing here touches the network |

## 1.8 A11y — Flow 1

- Offer: a group labelled by its question; buttons in DOM order `Add it`, `Not yet` (visual order may
  differ per §0.1 rule 10; DOM order leads with the affirmative because neither is destructive).
- Accepted / declined / rollback are announced once through the persistent live region, verbatim.
- The cycle line is plain text and is **not** a live region — it changes on navigation and after a save.
- Every button ≥ 44 px, text ≥ 4.5 : 1, nothing colour-coded.

## 1.9 `[REF]` — the current build

Cycle line: 13.5 px `--bone` on `--bg`, directly under the sub-line, above the day buttons. Divergence
line 13 px `--dim` on `--bg` (4.87 : 1); explanation line the same, 4 px below. Offer block: a `.card`
at the top of `.pad`, question 14.5 px `--bone`, buttons reusing the existing sheet button stack
(`.ghostbtn`, `min-height:48px`, 12 px gap, full width, `Add it` above `Not yet`) with `color:var(--bone)`
rather than `--dim`, since 14 px `--dim` on `--surface` is 4.36 : 1 and fails. Marker line and the
volume hint reuse `.hint`, promoted to 13 px `--bone`.

## 1.10 Out of scope — Flow 1

Any control that changes more than one exercise. Editing `REINTRO_ORDER`. A screen listing which
accessories are in. Weekday labels on day buttons (B-31).

---

# FLOW 2 — The deload banner and cycle state (Rule D1)

```
Flow:   Deload
Entry:  Train screen, when PHAT.deloadCheck returns a trigger and trainingWeeks >= 6.
Exit:   Started, declined, ended, or ended early.
```

## 2.1 Rules

1. **A deload is always recommended, never imposed.** Nothing starts one automatically. Audit §8.
2. **There is no scheduled deload.** No calendar countdown, no "week 6 of 9" progress bar, no "deload
   due in 2 weeks". T3 is a backstop, not a schedule.
3. **Before `{tw} ≥ 6` the word "deload" appears nowhere in the DOM.** Not in the cycle line — which is
   why the cycle line itself starts at week 6 (§1.2) — not in a banner, not in a tooltip.
4. **The banner must be read before he picks a day**, because it changes what today's session is. So it
   renders above the day list, and it may not push the day list off the first screenful.
5. **`Not now` is the cheapest tap** (§0.1 rule 10).
6. **A deload changes the prescription, not the log** (§0.1 rule 3).
7. **He can always get out.** See §2.5.

## 2.2 Copy — audit §8, verbatim

| State | String |
|---|---|
| Trigger, T1 | `Two sessions where {ex} went backwards. Take a deload week: same weights, 2 sets, stop 2 reps short. Resume where you left off.` |
| Trigger, T2 | `deloadCheck.text` for the broad-stall case, **followed by** V1's rollback line as a second paragraph. Audit §8 example 3: "Both are correct and both should be stated" |
| Trigger, T3 | `Nine weeks straight. Take a deload week before something makes you.` |
| Buttons | `Start deload week` / `Not now` |
| Declined | `Noted. Asked again after the next session.` |
| Active | `Deload week, day {n}. Same weights, 2 sets, 2 reps short. Do not chase numbers this week.` |
| Ended | `Deload done. Back to full sets at your last working loads.` |
| Cycle line | `Week {tw} · full volume phase · {back} of {cuts} accessories back · last deload: {none \| {date}}` |

## 2.3 Interactions

| Tap | What changes |
|---|---|
| `Start deload week` | Banner is replaced by the active line. The cycle line is replaced by the active line for the duration (§1.2 row 6). Session screens render the deload prescription. Announced |
| `Not now` | Banner is replaced by `Noted. Asked again after the next session.` The check does not re-run until a session has been saved — declining must not re-ask on the next render |
| Ignores it | The banner stays. It is a recommendation about accumulated fatigue; it does not expire on a scroll |
| `End it early` **NEW** | Deload ends immediately. The ended line renders. See §2.5 |
| Deload reaches day 7 | Deload ends automatically. The ended line renders until the next session is saved |

## 2.4 During a deload

| Surface | Behaviour |
|---|---|
| Train screen | The active line replaces the cycle line. No reintroduction offers. No new trigger banner |
| Session screen | Cards render 2 sets. `cut:1` accessories are out. Speed work is unchanged |
| A card with a value typed into set 3+ | **Renders that row anyway**, with `Deload week. This set is above the prescription.` **NEW**. It saves. §0.1 rule 3 |
| Target line | Reflects the deload set count — see `wo-003-session-screen.md` §5.3 |
| Verdicts | Unchanged. `PHAT.verdict` gates on `ex.s`; whether that is the deload count or the full count is `backend-engineer`'s call and it must be one or the other consistently, never a mix |

## 2.5 The way out — an addition beyond W19/W20's listed states, argued

W19 and W20 list trigger, declined, active and ended. They do not list a way to end a deload early, and
the deload reduces every card to 2 sets. If he starts one, feels fine on day 2 and trains normally, the
app has no row for his third set. That is the app being wrong about his numbers again — the exact thing
this batch exists to stop.

**So: the active line carries one control, `End it early` NEW.** One tap, no confirmation — it restores
sets rather than removing them, so the cheap direction is the safe direction. Ending early shows the
ended line and stamps the deload's end date.

**Dependency on `backend-engineer` (W19):** an `endDeload(state, todayStr)` that stamps the end and is
idempotent. Without it the only exits are seven days or nothing.

## 2.6 States — Flow 2

| State | Present |
|---|---|
| Empty — `{tw} < 6` | **Nothing.** No banner, no cycle line, no deload language anywhere |
| No trigger, `{tw} ≥ 6` | Cycle line only |
| Triggered | Banner with two buttons, above the day list |
| Declined | Confirmation line; re-checked only after the next saved session |
| Active | Active line in place of the cycle line; deload prescription on session screens |
| Ended (day 7 or early) | Ended line, until the next session is saved. Then the cycle line returns, with `last deload: {date}` |
| Error — `deloadCheck` throws | Fail **silent**: no banner. A missed recommendation costs a week; a spurious one costs trust |
| Offline | Identical |

## 2.7 A11y — Flow 2

- Banner: a group labelled by its own text; buttons in DOM order `Start deload week`, `Not now`.
- Trigger, accepted, declined, active and ended states are each announced once through the persistent
  live region — all of them appear without a navigation.
- Buttons ≥ 44 px, not in a top corner, text ≥ 4.5 : 1.
- Nothing about the deload is signalled by colour.

## 2.8 `[REF]` — the current build

Banner above the day buttons, reusing `.warn.hi` (3 px `--red-hi` left rule on `--surface`) with 13.5 px
`--bone` body, buttons stacked full width, `Start deload week` above `Not now`, `min-height:48px`, 12 px
gap. Active line reuses the cycle line's position and type. `End it early` is a full-width `.ghostbtn`
below the active line with `color:var(--bone)`.

## 2.9 Out of scope — Flow 2

Scheduled deloads. A deload history screen. Any automatic start. Changing the deload's content — same
weights, 2 sets, 2 reps short of `hi`, accessories out, speed work unchanged (audit §8).

---

# FLOW 3 — The Weight tab (Rule W1)

```
Flow:   Bodyweight and the calorie decision
Entry:  Weight tab. Re-evaluated after every bodyweight entry.
Exit:   None. It is a read-out plus one acknowledgement.
```

## 3.1 Rules

1. **No rate, no advice, unless the windows are met.** Window B = the 7 local dates `[today-6..today]`;
   window A = `[today-13..today-7]`; both need ≥ 5 distinct dated entries. Otherwise the tab shows no
   kg-per-week number and no calorie instruction anywhere in the DOM.
2. **The average is labelled with its own sample size**, always.
3. **The rate number is never coloured by whether it is good.** The advice sentence is the carrier
   (§0.1, and it retires a `--red` at 2.84 : 1 that fails contrast today).
4. **The sub-line and the advice always agree**, because they come from the same function. Today the
   panel prints `Target: 0.2–0.3 kg per week` directly beneath logic that treats 0.34 as on target.
5. **The acknowledgement exists or the cooldown can never fire.** Without a stamp, the 7-day hold is
   unreachable and the app keeps telling him to change something he changed on Monday.
6. **Setting the acknowledgement takes two deliberate taps. Clearing it takes one.**
7. **Nothing on this tab writes to storage on render.**

## 3.2 The seven advice states — audit §2, verbatim

Shown only when §3.1 rule 1 is satisfied. `{rate}` is signed with two decimals: `+0.34`, `-0.05`,
`+0.00`.

| # | Condition | String |
|---|---|---|
| 1 | `rate > +0.50` | `Gaining too fast at {rate} kg per week. Cut 200 kcal from training days.` |
| 2 | `+0.30 < rate ≤ +0.50` | `{rate} kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.` |
| 3 | `+0.20 ≤ rate ≤ +0.30` | `{rate} kg per week. On target. Change nothing.` |
| 4 | `+0.10 ≤ rate < +0.20` | `{rate} kg per week. Below target but inside weekly noise. Change nothing. Recheck in 7 days.` |
| 5 | `-0.10 ≤ rate < +0.10` | `Flat at {rate} kg per week. Add 200 kcal to your training days.` |
| 6 | `rate < -0.10` | `Down {abs rate} kg this week. You are not bulking. Add 200 kcal to your training days.` |
| 7 | A change was acknowledged < 7 days ago | `You changed calories {n} days ago. Hold until {date} before changing again.` |

Rendered: `+0.25 kg per week. On target. Change nothing.` ·
`+0.41 kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.` ·
`Flat at +0.00 kg per week. Add 200 kcal to your training days.` ·
`Down 0.35 kg this week. You are not bulking. Add 200 kcal to your training days.` ·
`You changed calories 3 days ago. Hold until 16 Sep before changing again.`

State 7 **outranks 1, 5 and 6** — during a cooldown no add or cut instruction appears anywhere in the
output. It does not outrank 2, 3 and 4, which instruct nothing.

Two mechanical variants of state 7, because `0 days ago` and `1 days ago` both read as a bug —
**NEW, for coach review, wording otherwise untouched**:

```
You changed calories today. Hold until 16 Sep before changing again.
You changed calories 1 day ago. Hold until 16 Sep before changing again.
```

**Sub-line, audit §2 verbatim, under every state that shows a rate:**

```
Target: +0.2 to +0.3 kg per week. Averages over 14 days.
```

## 3.3 The not-enough-data states — audit §2, verbatim

| # | Condition | String |
|---|---|---|
| A | Fewer than 14 days of history | `Weigh daily. {n} more days before this becomes a calorie decision.` |
| B | 14 days of history, window **B** below 5 | `Not enough daily weights. {n} of the last 7 days logged; this needs 5.` |
| C | Window B fine, window **A** below 5 | `Not enough daily weights. {n} of those 7 days logged; this needs 5.` |
| D | No entries at all | Keep the current empty state — see below |

Rendered: `Weigh daily. 6 more days before this becomes a calorie decision.` ·
`Not enough daily weights. 3 of the last 7 days logged; this needs 5.` ·
`Not enough daily weights. 2 of those 7 days logged; this needs 5.`

B and C differ by one word (`the last` / `those`) because they describe different weeks. Both are in the
audit — B in the copy list, C in worked example 4 and in W7's headline criterion. Render exactly the one
that matches the failing window.

**In states A, B and C: no rate, no change row, no calorie instruction, and no acknowledgement
control.** The 7-day average may still show, with its count, when window B has ≥ 5 entries.

**State D, the true empty state.** Audit §2 says keep the current one. The current one is the tab's own
sub-line, and it earns its place because it says what to do:

```
Same time, same conditions, every morning. The daily number is noise. The weekly average is the signal.
```

With no entries: the entry control and that sentence. No panel, no zeroes, no placeholder chart.

## 3.4 The average and the change row

| Row | Condition | Label |
|---|---|---|
| 7-day average | Window B has ≥ 5 entries | `7-day average ({n} of 7 days)` |
| Change vs last week | A rate exists | `Change vs last week` — value `{rate} kg`, uncoloured |

Rendered: `7-day average (6 of 7 days)` · `7-day average (7 of 7 days)`.

**The count is never omitted, not even at 7 of 7.** A label that only admits its sample size when the
sample is thin is a label he learns to stop reading.

## 3.5 The calorie-change acknowledgement

**When it renders:** only in states 1, 5 and 6 — the three that contain an instruction to add or cut.
Acknowledging "I changed my intake" when the app told him to change nothing means nothing, and a control
that is always present is a control that gets tapped absently.

**Where:** in the advice block, directly under the instruction it refers to, answerable without
scrolling from where the advice is read.

**Copy — all NEW, for coach review:**

| Element | String |
|---|---|
| Control | `I changed my calories today` |
| Confirmation headline | `Changed your calories today?` |
| Confirmation body | `This starts a 7-day hold. No new calorie advice until {date}.` |
| Confirm | `Yes, changed today` |
| Cancel (cheapest tap, lowest) | `Not yet` |
| Toast | `Recorded.` |
| Clear control, during cooldown | `I did not change anything` |
| Clear toast | `Hold cleared.` |

**Interactions:**

| Tap | What changes |
|---|---|
| `I changed my calories today` | A modal confirmation opens. Nothing is stamped yet. Focus moves to the headline, is trapped, `Escape` and the scrim cancel. The destructive-direction button is inert for 300 ms after the sheet appears, and the cancel button occupies the slot the trigger occupied — the two-part double-tap guard already built in WO-001 |
| `Yes, changed today` | `calChangedAt` is stamped with today's local date. The panel re-renders into cooldown state 7. Toast `Recorded.` The advice sentence and the acknowledgement control are both gone. Announced |
| `Not yet` | Sheet closes, nothing stamped, focus returns to the trigger |
| Taps the control twice in one day | **There is no second tap** — after the first confirmation the control is not rendered, because the panel is in cooldown and cooldown never renders it. If a duplicate reaches the handler by another route it stamps the same date: idempotent, no visible change, no second toast |
| `I did not change anything` | One tap, no confirmation. `calChangedAt` clears, the advice returns, toast `Hold cleared.` Clearing restores advice, so the cheap direction is the safe direction (§0.1 rule 8) |

**Dependency on `backend-engineer` (W7):** a setter that stamps `PHAT.localDate()` **and a clearer that
removes it**. W7 specifies only the setter. Without the clearer, one absent-minded tap silences calorie
advice for a week with no way back — precisely the class of thing this app is not allowed to do.

## 3.6 States — Flow 3

| State | Present |
|---|---|
| Empty | State D. Entry control and the sub-line. No panel, no numbers |
| Loading | None. Everything is local and synchronous |
| Not enough history | State A. Average may show with its count; no rate, no advice, no control |
| Thin window | State B or C. Same |
| Success | Average with count · change row, uncoloured · one of states 1–6 · sub-line · the control in states 1, 5, 6 |
| Cooldown | Average · change row · state 7 · sub-line · `I did not change anything` |
| Error — `calorieAdvice` throws | Fail **silent on advice**: show the average with its count if it is computable, and nothing else. Never a partial or guessed instruction |
| Error — the bodyweight write fails | Existing behaviour: the number stays on screen and the error line says the write failed. It must never both fail and look fine |
| Offline | Identical. Nothing on this tab touches the network |

## 3.7 A11y — Flow 3

- The advice block is announced through the persistent live region after a bodyweight entry — it changes
  without a navigation. Do not put `aria-live` on it: `render()` recreates it.
- The bodyweight input needs a real label (B-13), as do the `−` / `+` steppers. This tab is where they
  are most obviously missing.
- Confirmation sheet: `role="dialog" aria-modal="true"`, labelled by its headline, focus trapped,
  returned to the trigger on cancel.
- Every button ≥ 44 px. Nothing in a top corner.
- The rate value is text, not a coloured token. No state on this tab is carried by colour.

## 3.8 `[REF]` — the current build

Delete `slice(-7)` / `slice(-14,-7)` and the `d>=.2&&d<=.35` band. Move the advice sentence and the
sub-line **out** of the `.panel` and onto the page background: 13 px `--dim` on `--surface` is 4.36 : 1
and fails, while on `--bg` it is 4.87 : 1 and passes. Advice 14.5 px `--bone`, sub-line 13 px `--dim` on
`--bg`, block marked with a 3 px `--amber` left rule **that is the same colour in all seven states** —
nothing on this screen is encoded in hue. `Change vs last week` value moves from
`color:${ok?"var(--green)":"var(--red)"}` to `--bone`. The acknowledgement is a full-width `.ghostbtn`
with `color:var(--bone)`, `min-height:48px`; the confirmation reuses the existing modal sheet
(Variant B, `--scrim`, 300 ms arm, safe action lowest). At 400 px the panel must not overflow
horizontally.

## 3.9 Out of scope — Flow 3

The diet targets panel (B-29) — the app still says "add 200 kcal to your training days" without ever
showing what the training-day target is, and that stays open. Creatine (D-6). Any change to bodyweight
entry itself. The chart's index-spacing bug (B-11). Macros, carb placement, the rest-day floor.

---

## 4. Conflicts I resolved, and one the PM should restate

### 4.1 Two "always on the Train screen" lines — resolved in this spec

Audit §5 says `Week 7 · 4 of 9 accessories back in.` is the Train screen status line, *always*. Audit §8
says `Week 7 · full volume phase · 4 of 9 accessories back · last deload: none` is permanent on the
Train screen. At week 7 both are true and the second contains the first.

**Resolved as §1.2: one slot, precedence by `{tw}`.** Weeks 1–4 get the reduced-volume line, week 5 gets
V1's status line, week 6 onward gets D1's cycle line, and a deload replaces all of them. Both engine
criteria still pass, because W14's and W19's criteria are assertions on the **returned values** of
`volumeTier` and `cycleLine`, not on the DOM.

**One DOM criterion now conflicts and should be restated by the PM.** W15 reads:

> At week 7 with 4 accessories back, the Train tab reads `Week 7 · 4 of 9 accessories back in.`

As specced, at week 7 the Train tab reads the cycle line instead. Proposed restatement:

> At `trainingWeeks === 5` with 0 accessories back, the Train tab reads
> `Week 5 · 0 of 9 accessories back in.` At `trainingWeeks === 7` with 4 accessories back it reads
> `Week 7 · full volume phase · 4 of 9 accessories back · last deload: none`, and the string
> `4 of 9 accessories back in.` appears nowhere.

There is no arrangement that satisfies both criteria literally and does not print two near-identical
`Week 7 ·` lines above the day list. I recommend the restatement rather than the repetition.

### 4.2 A truncated string in W7's criteria

W7's criterion quotes `+0.34 kg per week. Above target, inside the margin. Change nothing.` The audit's
own copy list (§2) ends that string with ` Recheck in 7 days.` WO-003 Decision 5 — "worked example wins"
— was written about a *number* (126 vs 125) and an *interpolated name*, not about dropping a sentence.

**Ruled: the audit §2 copy list is authoritative.** The rendered string is
`+0.34 kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.` W7's and W8's
criteria should be read as substring assertions, or restated. Same applies to state 4.

### 4.3 The Train headline

Changing `h1` from `Week {weeksIn()}` to `Pick your day` is a change to an existing element that W15
owns. It is deliberate (§1.2) and it is the only way to keep one definition of "week" on the screen.
Flagged rather than assumed.

---

## 5. What the engineers need that does not exist yet

| # | Item | Owner | Blocking? |
|---|---|---|---|
| 1 | `state.lastRollback = {exId, name, date}` recorded by `rollbackReintro` | backend (W14) | **Yes** — §1.6, the UI cannot name the exercise or time the notice |
| 2 | `endDeload(state, todayStr)`, idempotent | backend (W19) | **Yes** — §2.5, otherwise a deload traps him for 7 days |
| 3 | A clearer for `calChangedAt`, alongside W7's setter | backend (W7) | **Yes** — §3.5, otherwise one tap silences advice for a week with no way back |
| 4 | `calorieAdvice` exposing `aCount` and `bCount` for the `(6 of 7 days)` label | backend (W7) | Yes — §3.4 |
| 5 | Cooldown day-0 and day-1 copy variants | backend (W7) + coach (W23) | Yes — §3.2 |
| 6 | Both `{tw}` and `{cw}` available to `vTrain` | backend (W1) | Yes — §1.3 |
| 7 | `volumeTier` flagging hidden-but-populated exercises rather than omitting them | backend (W14) | **Yes** — §0.1 rule 2. Already in W14's criteria |
| 8 | One persistent live region outside the re-rendered view | frontend | Yes — §0.2 |
| 9 | Deload set count reaching the session view's target line and set rendering | backend + frontend (W19/W20) | Yes — §2.4 |

## 6. Decisions that are not mine

- **Every band boundary, every trigger, every window, `REINTRO_ORDER`, the deload's content, and the
  four key lifts.** All `strength-coach`, all ruled in audit §2, §5 and §8.
- **What a good weekly gain is, how long a deload runs, whether recovery is holding.** Not UX calls.
- **All eleven NEW strings in this file.** Listed in §7, marked, and for W23 sign-off. If any is
  rejected, the fallback is stated at its point of use — except `End it early`, whose absence leaves him
  unable to log a third set during a deload, which should be escalated rather than silently dropped.

## 7. Full string index

Verbatim from `docs/coach-audit.md`:

```
Week 3 of 4 at reduced volume. The cut exercises come back from week 5.
Week 5 by the calendar, week 3 of real training. Reduced volume holds.
Week 7 · 4 of 9 accessories back in.
Add Rack chin back to this session? Only if last week left you recovered and no lift went backwards.
Add it
Not yet
Rack chin is back in. That is the only addition for 7 days.
Left out. Asked again next week.
Full volume. All 9 accessories are in.
Progress stalled. Pulling Upright row back out for now.
Week 7 · full volume phase · 4 of 9 accessories back · last deload: none
Two sessions where Squat went backwards. Take a deload week: same weights, 2 sets, stop 2 reps short. Resume where you left off.
Nine weeks straight. Take a deload week before something makes you.
Start deload week
Not now
Noted. Asked again after the next session.
Deload week, day 3. Same weights, 2 sets, 2 reps short. Do not chase numbers this week.
Deload done. Back to full sets at your last working loads.
Gaining too fast at +0.62 kg per week. Cut 200 kcal from training days.
+0.41 kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.
+0.25 kg per week. On target. Change nothing.
+0.14 kg per week. Below target but inside weekly noise. Change nothing. Recheck in 7 days.
Flat at +0.04 kg per week. Add 200 kcal to your training days.
Down 0.35 kg this week. You are not bulking. Add 200 kcal to your training days.
You changed calories 3 days ago. Hold until 16 Sep before changing again.
Target: +0.2 to +0.3 kg per week. Averages over 14 days.
Weigh daily. 6 more days before this becomes a calorie decision.
Not enough daily weights. 3 of the last 7 days logged; this needs 5.
Not enough daily weights. 2 of those 7 days logged; this needs 5.
7-day average (6 of 7 days)
```

NEW, mine, for `strength-coach` sign-off in W23:

```
Pick your day
Reduced volume until you have logged four weeks of three or more sessions.
Week 9 by the calendar, week 6 of real training.
A training week is a week with three or more logged sessions.
Back in from this session.
End it early
Deload week. This set is above the prescription.
I changed my calories today
Changed your calories today?
This starts a 7-day hold. No new calorie advice until 16 Sep.
Yes, changed today
Recorded.
You changed calories today. Hold until 16 Sep before changing again.
You changed calories 1 day ago. Hold until 16 Sep before changing again.
I did not change anything
Hold cleared.
```

Unchanged existing strings this spec relies on: `Start here` ·
`Pick a day and log your first session. Every number you enter makes the next one easier.` ·
`Same time, same conditions, every morning. The daily number is noise. The weekly average is the signal.` ·
`Not in today's volume. It has numbers in it.` · `Export everything as JSON` · `Weight logged.` ·
`Log today` / `Update today`.

Deleted by this spec: the `Full volume` checkbox and its label —
`Adds the extra accessory work back in. Leave this off for the first four weeks.` — and the current
advice strings `On target. Change nothing.`, `Gaining too slowly. Add 200 kcal to your training days.`,
`Gaining too fast — that surplus is going to fat. Cut 200 kcal from training days.`,
`Two weeks of daily entries and this turns into a calorie decision instead of a guess.`,
`Target: 0.2–0.3 kg per week.`

No emoji. No exclamation marks. No praise. No number the app cannot justify.
