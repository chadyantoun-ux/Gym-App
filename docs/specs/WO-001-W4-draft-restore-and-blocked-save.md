# WO-001 · W4 — UX spec: draft restore, and being blocked by a bad number

Author: `ux-designer` · Date: 2026-09-09 · Status: ready for `frontend-engineer`
Implements: WO-001 §W4 · Consumed by: W5 (restore wiring), W6 (validation UI)
Covers: B-01 (restore offer), B-02 / B-21 (blocked save)

Copy in this document is **final**. Strings in `code fences` ship verbatim. `{braces}` are
substitutions and every one of them is defined in §0.3. Nothing here is a suggestion to reword.

---

## 0. Ground rules that bind both flows

### 0.1 The stance

Chady is standing at a rack, 90 seconds into rest, out of breath, one thumb. Both flows exist
because the app now refuses to throw a number away. Both must read as *the app holding on to his
work*, never as the app arguing with him.

Two consequences, and they are not negotiable:

1. **No message states or implies that data was lost.** After this batch nothing is lost, so any
   copy suggesting otherwise is a false statement. The word "lost" does not appear in any string in
   this document.
2. **Every screen that blocks him tells him the next tap.** A refusal with no visible next action is
   worse than the bug it replaces.

### 0.2 Physical constraints applied to every element below

| Rule | Applied as |
|---|---|
| 400 px viewport | Content width 368 px inside the existing `.pad` (16 px each side) |
| Touch target ≥ 44 px | Every new button: `min-height:48px`. Message rows: `min-height:48px` |
| Thumb zone | Every new decision button sits in a bottom-anchored sheet. Nothing in this spec requires a tap above y=420 on a 400 × 800 viewport |
| Never colour alone | Every red thing carries a text token or a `!` glyph. Greyscale the screen and it still reads |
| `aria-live` | On anything that appears without a navigation. Specified per state below |

### 0.3 Substitution tokens — defined once, used everywhere

| Token | Definition | Example |
|---|---|---|
| `{day}` | `PROGRAM.find(x=>x.id===draft.dayId).name` | `Upper power` |
| `{date}` | Draft ≤ 6 days old: weekday + day + month. Older: day + month. Always anchored `T12:00:00` local, as `fmt()` already does | `Tuesday, 7 Sep` / `7 Sep` |
| `{n}` | **Filled sets** in the draft: sets where `w` **or** `r` is non-empty. Counts `complete`, `incomplete` and `malformed`. Excludes `blank`. **Counts exercises hidden by the Full volume toggle** | `7` |
| `{age}` | See §0.4 | `saved 14 minutes ago` |
| `{ex}` | Exercise name, `esc()`d | `Bent-over row` |
| `{i}` | Set number, 1-based | `2` |
| `{raw}` | The offending typed string, `esc()`d, truncated to 12 chars with `…` | `7.5.0` |
| `{p}` | Count of problems in a blocked save | `3` |

**`{n}` is computed once and is the same number in the offer, in the discard confirmation, and in
the start-a-different-day confirmation.** If those three ever disagree the user stops trusting the
count, which is the only thing making the confirmation meaningful. One function, three callers.

Pluralisation: `{n} set` when `{n} === 1`, else `{n} sets`. Same for `{p}`. No "(s)".

### 0.4 `{age}` — exact string table

Computed **once at boot** from `draft.savedAt` and `PHAT.draftAge()`. Never ticks. No timer, no
re-render.

| Condition | String |
|---|---|
| Same local date, < 1 min | `saved just now` |
| Same local date, 1–59 min | `saved 1 minute ago` / `saved 14 minutes ago` |
| Same local date, 1–23 h | `saved 1 hour ago` / `saved 3 hours ago` |
| Same local date, ≥ 24 h (clock skew) | `saved earlier today` |
| `ageDays === 1` | `saved yesterday` |
| `ageDays ≥ 2` | `saved 2 days ago` |
| `ageDays < 0` (clock moved backwards) | `saved {date}` |

Rule: **if the draft's local date is not today, the day-based string always wins**, even if the
draft is only twenty minutes old. A draft written at 23:50 and reopened at 00:10 says
`saved yesterday`, because the calendar day is what decides which session those numbers belong to.

### 0.5 Two sheet variants — build once, use five times

Both are bottom-anchored panels, full bleed to the screen edges, `border-radius:14px 14px 0 0`,
`background:var(--surface)`, `border-top:1px solid var(--line)`, `padding:18px 16px 16px`.

**Variant A — Offer sheet (non-modal).**
Sits directly above `nav`. Does **not** block the page. The Train tab keeps its bottom padding
increased by the sheet's height so the last day button is never covered. Nav tabs stay tappable.

**Variant B — Confirm sheet (modal).**
`role="dialog" aria-modal="true" aria-labelledby="<headline id>"`. Covers the nav. Backed by a
scrim. Focus moves to the headline (`tabindex="-1"`) on open, is trapped inside, and returns to the
trigger on cancel. `Escape` cancels. Tapping the scrim cancels.

**New `:root` token required:** `--scrim: rgba(20,16,14,.78)`. Per CLAUDE.md §4 no hex may be
hardcoded outside `:root`.

### 0.6 Button roles and their placement — read this before laying anything out

In every sheet, **the safe action sits lowest**, closest to the thumb. The destructive action sits
above it. This inverts the usual "primary at the bottom" habit on purpose: the cheapest tap on a
phone must be the one that cannot hurt.

| Role | Style | Height |
|---|---|---|
| Safe / continue | `.primary` (amber fill, `--bg` text) | 52 px |
| Destructive | `.ghostbtn` with `border-color:var(--red-hi)` and `color:var(--red-hi)` | 48 px |
| Neutral secondary | `.ghostbtn` as today | 48 px |

Gap between any two sheet buttons: **12 px minimum**.

### 0.7 Contrast — measured, not assumed

I computed these against the existing `:root` tokens. Two of them fail and one of the failures is
load-bearing for this spec.

| Pair | Ratio | AA at the size used | Verdict |
|---|---|---|---|
| `--bone` on `--surface` | 13.2 : 1 | pass | Use for all new headlines and all marker labels |
| `--dim` on `--bg` | 4.87 : 1 | pass at 13 px | OK |
| `--dim` on `--surface` | **4.36 : 1** | **fail** at 13 px (needs 4.5) | Marginal. New body copy on `--surface` must be ≥ 14 px **and** semibold, or move to `--bone` |
| `--faint` on `--surface` | **2.30 : 1** | **fail** badly | **Forbidden in any new element in this spec** |
| `--red` on `--surface` | **2.84 : 1** | **fail** (text and 3:1 non-text) | Forbidden as text or as a border on a card |
| `--red` on `--bg` | 3.17 : 1 | passes 3:1 non-text only | OK as a bar/rule on `--bg`, never as 13 px text |
| `--amber` on `--surface` | 8.68 : 1 | pass | OK |

**New `:root` token required:** `--red-hi:#C96A5C` — 4.64 : 1 on `--surface`, 8.0 : 1 on `--bg`.
All error *text* and all error *borders* in this spec use `--red-hi`. `--red` stays for fills and
for bars drawn on `--bg`.

Two pre-existing failures found while measuring, **not fixed here** — they belong to B-13, and I am
recording them so B-13 has numbers instead of an opinion:

- `vSession`'s error line `<p style="color:var(--red);font-size:13px">` renders 13 px `--red` on
  `--bg` = 3.17 : 1. Fails AA. (This spec routes the new messages away from it.)
- The ghost text of last session's numbers is `--faint` on `--surface` = 2.30 : 1. That is the best
  feature in the app and it is the least legible text in the app. Worth its own line in B-13.

### 0.8 Naming hazard — CLAUDE.md §7

`confirm`, `open`, `close`, `status`, `name`, `length`, `history` are Window members. Do not
introduce top-level identifiers with those names; that class of collision is what produced the
black screen recorded in the handoff brief. Suggested safe names: `askSheet()`, `offerSheet()`,
element ids prefixed `dr-` (draft restore) and `bs-` (blocked save).

---

# FLOW 1 — Offering an unfinished session back on boot

```
Flow:   Draft restore
Entry:  App boot (cold start, reload, return from background kill) when loadDraft() returns a draft.
        Also re-entered when the user returns to the Train tab having navigated away from the offer.
```

## 1.1 Screens and states

### State 1A — No draft (the common case)

Train tab renders exactly as it does today. **No sheet. No message. No "no draft" state.**

Absence is the correct communication here. An empty state earns its place when there is something
the user should do; there is nothing to do about a draft that does not exist.

---

### State 1B — Boot in progress

`loadDraft()` is async. The Train tab **must not render before the draft check resolves** — a Train
tab that paints and is then covered by a sheet is a layout jump under a thumb that is already
moving. Render once, with the sheet already in place.

If boot exceeds 600 ms, render a single centred line, 14 px, `--dim` on `--bg`:

```
Loading.
```

No spinner. No skeleton. Under 600 ms show nothing but the background — that is what the app does
today and it is fine.

---

### State 1C — Same-day draft — the primary state

```
┌────────────────────────────────────────────┐  ← Train tab, unchanged, scrolls
│  Week 3                                    │
│  4 sessions logged. Pick today's day.      │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Upper power            2 days ago  › │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Lower power            4 days ago  › │  │
│  └──────────────────────────────────────┘  │
│                (…day list continues…)      │
├════════════════════════════════════════════┤  ← offer sheet, pinned above nav
│  UNFINISHED SESSION                        │  11px · 0.08em tracking · --dim
│  Upper power · 9 Sep                       │  17px · 600 · --bone
│  7 sets logged · saved 14 minutes ago      │  13px · --dim
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │              Resume                  │  │  .primary · 52px
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │              Discard                 │  │  .ghostbtn · 48px · neutral, NOT red
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│   Train   │   Trend   │   Weight           │  nav, still tappable
└────────────────────────────────────────────┘
```

**Copy — exact:**

| Element | String |
|---|---|
| Eyebrow | `UNFINISHED SESSION` |
| Title | `{day} · {date}` |
| Detail | `{n} sets logged · {age}` |
| Detail, `{n} === 0` | `Nothing entered yet · {age}` |
| Primary | `Resume` |
| Secondary | `Discard` |

Note what the title does **not** say: no "Welcome back", no "You have an unfinished session from
earlier". He can read `Upper power · 9 Sep` in under a second from arm's length and that is the
whole job.

**Why `Discard` is styled neutral here, not red:** on this sheet `Discard` destroys nothing — it
opens a confirmation. Red on a button that is safe to press teaches him to ignore red. The red
appears in State 1F, on the button that actually acts.

---

### State 1D — Draft from a previous day

Same layout. Two differences, both load-bearing.

**Copy — exact:**

| Element | String |
|---|---|
| Eyebrow | `UNFINISHED SESSION` |
| Title | `{day} · {date}` |
| Detail | `{n} sets logged · {age}` |
| **Warning line** (new, only in this state) | `It saves under {date}, not today.` |
| Primary | `Resume` |
| Secondary | `Discard` |

The warning line sits between the detail and the buttons. 13 px, `--bone`, with a `!` glyph and a
2 px `--red-hi` left rule, 8 px padding-left. `--bone` text, not red text — see §0.7.

Rendered, the Thursday-morning-with-Tuesday's-session case reads:

```
│  UNFINISHED SESSION                        │
│  Upper power · Tuesday, 7 Sep              │
│  7 sets logged · saved 2 days ago          │
│  ┃ ! It saves under Tuesday, 7 Sep,        │
│  ┃   not today.                            │
│                                            │
│  [           Resume            ]           │
│  [           Discard           ]           │
```

This is the single most important sentence in Flow 1. Resuming keeps the draft's own date — that is
correct, those sets were performed on Tuesday — but it creates a real trap: he resumes Tuesday, adds
Thursday's sets on top, and Thursday's work is stamped Tuesday. The line tells him before he taps,
not after. It also satisfies W5's criterion that an old draft is "offered back with its own date
shown, not silently relabelled today."

**Explicitly not done:** no offer to re-date the draft to today. Backdating and date-picking is B-17,
and inventing a half-version of it here would produce a second date-handling code path three weeks
after W1 finished consolidating the first one.

---

### State 1E — Draft with an unrecognised `dayId`

`PROGRAM.find()` returns undefined. Resuming would throw inside `vSession` before first paint —
the exact black-screen failure mode in the handoff brief. So Resume is not offered.

| Element | String |
|---|---|
| Eyebrow | `UNFINISHED SESSION` |
| Title | `Saved {date}` |
| Detail | `{n} sets logged. This app version cannot open it.` |
| Only button | `Discard` |

`Discard` still routes through the confirmation in State 1F. He can also ignore the sheet and train
— tapping any day button goes straight to State 1G's confirmation.

---

### State 1F — Discard confirmation (modal, Variant B)

Reached from: `Discard` on the offer sheet · `Discard` in the session-view header (§1.5).

```
┌────────────────────────────────────────────┐
│                                            │
│            (scrim, --scrim)                │
│                                            │
├════════════════════════════════════════════┤
│  Discard 7 logged sets?                    │  17px · 600 · --bone · tabindex="-1"
│  Upper power, 9 Sep. This cannot be undone.│  13px · --dim on --surface → 14px/600
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │        Discard 7 logged sets         │  │  destructive · --red-hi border+text
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │              Keep it                 │  │  .primary · 52px · BOTTOM
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Copy — exact:**

| Case | Headline | Body |
|---|---|---|
| `{n} ≥ 2` | `Discard {n} logged sets?` | `{day}, {date}. This cannot be undone.` |
| `{n} === 1` | `Discard 1 logged set?` | `{day}, {date}. This cannot be undone.` |
| `{n} === 0` | `Discard this session?` | `{day}, {date}. Nothing is logged in it yet.` |
| Unknown `dayId` | `Discard {n} logged sets?` | `Saved {date}. This cannot be undone.` |

| Button | String |
|---|---|
| Destructive | `Discard {n} logged sets` / `Discard 1 logged set` / `Discard this session` |
| Safe | `Keep it` |

"This cannot be undone" describes a choice he is about to make, not something the app did. It does
not violate the no-data-loss rule.

**The double-tap guard — build both halves:**

1. **The safe button occupies the slot the trigger occupied.** On the offer sheet, `Discard` is the
   lower of two buttons. In this confirmation, `Keep it` is the lower of two buttons, at
   approximately the same y. A stray second tap therefore lands on `Keep it` and returns him to the
   offer. It cannot land on the destructive button.
2. **The destructive button ignores pointer events for 300 ms after the sheet appears.** Not
   disabled (no greyed-out state, no changed appearance) — it simply does not fire. This costs a
   deliberate user nothing and stops a fast double-tap.

Together these are what "not reachable in one accidental tap" means in practice.

**Interactions:**

| Tap | Result |
|---|---|
| `Keep it` | Sheet closes. Offer sheet returns exactly as it was. Focus returns to `Discard`. Draft untouched on disk. |
| Scrim | Same as `Keep it`. |
| `Escape` | Same as `Keep it`. |
| Destructive | `clearDraft()`. Sheet and offer both close. Train tab re-renders with no sheet. Toast fires. |

**Toast after discard:** `Discarded.`

One word. Not "Session discarded successfully". He knows what he did.

**Failure:** if `clearDraft()` fails, keep both sheets open, keep the draft, and render this line
above the buttons, 13 px `--bone` with a `--red-hi` left rule:

```
Could not discard. Nothing changed. Try again.
```

---

### State 1G — He ignores the offer and taps a day button

Two distinct cases. The distinction matters because one of them is not a conflict at all.

**Case 1 — he taps the same day the draft is for.**

No prompt. Treat it as `Resume`: open the session view with his numbers in it.

This is the right call because it is not destructive, it matches what he almost certainly meant, and
he sees his own numbers on the very next screen so nothing is hidden from him. The alternative —
silently blanking a day that has 7 sets in it — is the bug this whole work order exists to kill.

Toast on arrival: `Resumed your unfinished session.`

**Case 2 — he taps a different day.** Modal confirm, Variant B.

```
├════════════════════════════════════════════┤
│  Start Lower power?                        │  17px · 600 · --bone
│  Upper power from 9 Sep is unfinished —    │  13px
│  7 logged sets. Starting a new day         │
│  discards it.                              │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   Discard 7 sets, start Lower power  │  │  destructive
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │      Open Upper power instead        │  │  .primary · BOTTOM
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Copy — exact.** `{newday}` is the day he tapped.

| Element | String |
|---|---|
| Headline | `Start {newday}?` |
| Body | `{day} from {date} is unfinished — {n} logged sets. Starting a new day discards it.` |
| Body, `{n} === 0` | `{day} from {date} is unfinished, with nothing logged in it. Starting a new day discards it.` |
| Destructive | `Discard {n} sets, start {newday}` |
| Safe | `Open {day} instead` |

If `{newday}` is long ("Lower hypertrophy", "Back & shoulders") the destructive label wraps to two
lines. That is acceptable and the button grows; do not truncate the day name and do not shrink the
type.

The safe button being `Open {day} instead` rather than `Cancel` is deliberate: the most useful
outcome of a mis-tap is landing in the session he actually has work in, not landing back on a list
he has to re-parse while out of breath.

Same 300 ms guard, same safe-button-lowest rule.

| Tap | Result |
|---|---|
| Safe | Sheet closes, session view opens on the **draft's** day with the draft loaded. |
| Destructive | `clearDraft()`, then `startDay(newday)`. Session view opens empty on the new day. Toast: `Discarded.` |
| Scrim / Escape | Sheet closes, back to the Train tab with the offer sheet still showing. Nothing started, nothing discarded. |

---

### State 1H — He navigates to Trend or Weight

The offer sheet is a Train-tab element. Switching tabs hides it; the draft is untouched. Returning
to Train shows it again, with `{age}` **recomputed** at that moment.

This is the "Not now" affordance without spending a third button on it. He has one decision to make
on this sheet and two ways to make it; a third neutral button on a bottom sheet during rest is
decision cost that buys nothing.

---

### State 1I — Draft read failed

`loadDraft()` today cannot distinguish "no draft" from "the read threw" — `load()` catches and
returns `null`. That gap is dangerous *because* of this flow: a failed read shows no offer, he
starts a new day, and `startDay()` overwrites a draft that was actually there.

**Dependency on `backend-engineer` (W3):** `loadDraft()` should return a distinguishable failure,
e.g. `{error:true}` versus `null`. If it does, render a non-modal notice bar at the **bottom** of
the Train tab, above the nav, 13 px `--bone` on `--surface` with a `--red-hi` left rule and
`role="alert"`:

```
Could not read your saved session. Close the app and reopen it before starting a new day.
```

If W3 does not make the distinction, this state falls back to State 1A and the risk stands. Flag it
to the PM rather than working around it — this is exactly the kind of silent overwrite path the
batch exists to close.

---

## 1.2 Interactions — tap by tap

| # | Tap | Immediate change |
|---|---|---|
| 1 | App opens, draft exists | Train tab and offer sheet paint together. Focus is not moved. No announcement — the sheet is present at first paint, so it is not a live change |
| 2 | `Resume` | Session view opens. All fields carry the raw stored strings, malformed values included. Draft stays on disk untouched. Scroll at top |
| 3 | `Discard` | Confirm sheet + scrim animate up. Focus moves to the headline. Offer sheet stays rendered underneath |
| 4 | `Keep it` | Confirm and scrim removed. Focus returns to `Discard`. Nothing else changed |
| 5 | Destructive | Confirm, scrim and offer all removed. Train tab re-renders without the sheet, bottom padding returns to normal. Toast `Discarded.` |
| 6 | Any day button, draft's own day | Session view opens with the draft. Toast `Resumed your unfinished session.` |
| 7 | Any day button, different day | Confirm sheet per 1G Case 2 |
| 8 | Nav tab | Sheet hides with the tab. Draft untouched |

## 1.3 A11y — Flow 1

- Offer sheet: `<section aria-labelledby="dr-title">`. Not a dialog — it does not trap focus and the
  page behind it stays usable.
- Present at first paint, so **no `aria-live` on the offer sheet**. Announcing a region that was
  never absent is noise.
- Confirm sheet: `role="dialog" aria-modal="true" aria-labelledby="dr-confirm-title"`. Focus to the
  headline on open, trapped, returned to the trigger on close.
- **Focus order in the offer sheet: `Resume`, then `Discard`.** Safe first in DOM order even though
  safe is lowest visually. Tab order should not lead with a destructive action.
- Toast container needs `role="status" aria-live="polite"`. It has none today. Strictly B-13, but
  `Discarded.` and `Resumed your unfinished session.` are both new messages that appear without a
  navigation, so this spec depends on it.
- The `!` glyph in the previous-day warning: wrap in `<span aria-hidden="true">` — the sentence
  after it already carries the meaning, and a screen reader saying "exclamation mark" is noise.
- Contrast: warning and error text is `--bone` with a `--red-hi` rule. Never `--red` text, never
  `--faint`, anywhere in this sheet (§0.7).

## 1.4 States summary — Flow 1

| State | Present |
|---|---|
| Empty | No draft → nothing rendered. Correct and intentional |
| Loading | `Loading.` after 600 ms only |
| Success | Resume → session view with every typed string intact, including malformed ones |
| Error — read failed | State 1I, dependent on W3 |
| Error — discard write failed | `Could not discard. Nothing changed. Try again.` |
| Offline | Identical. Nothing in this flow touches the network |

## 1.5 The existing `Discard` link in the session header

Currently `S.draft=null; render();` on a single tap, in the **top-right corner** — which CLAUDE.md
§3.6 explicitly forbids for anything important, and which is now more destructive than it was,
because it will also clear persisted storage.

**In scope for this batch:**

- It routes through the State 1F confirmation. Same sheet, same copy, same `{n}`.
- Its touch target reaches 44 px via padding plus compensating negative margin. Visual position and
  appearance unchanged.

**Out of scope, flagged for the PM:** moving it out of the top-right corner. That is a session-view
layout change and W4 excludes redesigning the session view. Recommend a backlog item; the
confirmation makes it survivable in the meantime, not correct.

## 1.6 Out of scope — Flow 1

- **Undo instead of confirm.** My standing preference is undo over confirmation, and I am not
  applying it here. Undo would mean holding the discarded draft in memory after `clearDraft()`,
  which contradicts W3's rule that `clearDraft()` removes the key and nothing else keeps a copy.
  Recommend it for WO-002 alongside B-04's restore work, where the "hold a copy" machinery already
  has to exist.
- Multiple simultaneous drafts. W3 fixes one draft; this spec assumes it.
- Re-dating a draft to today (B-17).
- Any autosave indicator (B-19).
- A draft whose day already has a saved session for the same date. It resumes and saves normally,
  producing two sessions on one date. That is B-05/B-17 territory and is not made worse here.

---

# FLOW 2 — A save blocked by a malformed or incomplete set

```
Flow:   Blocked save
Entry:  Tap "Save session" in the session view when PHAT.validateDraft() returns ok:false.
Exit:   Every problem fixed or cleared, then "Save session" again.
```

## 2.1 The two cases, and why they read differently

| Case | Example | What it means | What he needs |
|---|---|---|---|
| **Malformed** | Weight pasted as `7.5.0`; reps pasted as `5.5` | A value the app cannot read. Almost always a paste, since W6 makes it untypeable | To see the offending characters and retype |
| **Incomplete** | `100 × <blank>` | A set he started and abandoned — walked away, changed weight, cut it short | To either finish it or delete it |

Both block. The copy must not treat them the same: one is "this is unreadable", the other is "this
is unfinished". Telling an abandoned set it is "invalid" is the app being obtuse about something the
user did on purpose.

## 2.2 Screen — blocked save, one problem

The message renders in the slot the existing `S.err` line occupies: directly above `Save session`,
at the bottom of the scroll — which is also the thumb zone. He tapped a button there; the answer
appears there.

```
│  ┌──────────────────────────────────────┐  │
│  │ Skull crusher                 3 × 6–10│ │
│  │  1  [− 40 +] × [− 10 +]        40×10 │  │
│  │  2  [− 40 +] × [−  9 +]         40×9 │  │
│  │  3  [− 40 +] × [−   +]         40×10 │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┃ ! Not saved. 1 set needs a fix.         │  15px · 600 · --bone
│  ┃   Everything you typed is still here.   │  13px · --dim on --bg (4.87:1, passes)
│  ┃  ┌────────────────────────────────────┐ │
│  ┃  │ Skull crusher · set 3   no reps  › │ │  48px, tappable
│  ┃  └────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │            Save session              │  │
│  └──────────────────────────────────────┘  │
```

The block has a 3 px `--red-hi` left rule against `--bg` and 12 px left padding. The `!` is a
literal character, not an icon font, not a colour.

**Copy — exact:**

| Element | String |
|---|---|
| Headline, 1 problem | `Not saved. 1 set needs a fix.` |
| Headline, ≥ 2 problems | `Not saved. {p} sets need a fix.` |
| Reassurance line | `Everything you typed is still here.` |
| Problem row | `{ex} · set {i}` + right-hand token |

**Right-hand tokens** — one per problem, mono 12.5 px, `--bone`:

| `reason` / field | Token |
|---|---|
| malformed weight | `{raw}` — the literal offending string, e.g. `7.5.0` |
| malformed reps | `{raw}` — e.g. `5.5` |
| weight out of range | `over 500` |
| reps out of range | `0 reps` / `over 100` |
| incomplete, reps empty | `no reps` |
| incomplete, weight empty | `no weight` |

The token is the whole point of the design. He does not read a sentence; he sees `7.5.0` and knows
instantly it was the paste, or he sees `no reps` and knows instantly it was the set he abandoned.
It is also the non-colour carrier of the error state.

`Not saved.` leads because it is the fact he most needs and the one he will fear. `Everything you
typed is still here.` immediately follows because that is the difference between this app and the
one that ate his set last month. Both sentences are true, neither is praise, and neither says
anything was lost.

## 2.3 Screen — several problems across several exercises

```
│  ┃ ! Not saved. 3 sets need a fix.         │
│  ┃   Everything you typed is still here.   │
│  ┃  ┌────────────────────────────────────┐ │
│  ┃  │ Bent-over row · set 2    7.5.0   › │ │
│  ┃  ├────────────────────────────────────┤ │
│  ┃  │ Flat DB press · set 1    no reps › │ │
│  ┃  ├────────────────────────────────────┤ │
│  ┃  │ Skull crusher · set 3   no weight› │ │
│  ┃  └────────────────────────────────────┘ │
```

Rows are ordered by their position in the session, top to bottom — the same order he will walk
through them. Not grouped by error type.

**Overflow:** show at most 5 rows, then a plain line, 13 px `--dim`:

```
and 4 more.
```

Not a link. The remaining rows are marked in the cards and surface in the list as the first five are
cleared. Five 48 px rows plus a headline plus the Save button already fills the thumb zone at 400 ×
800; a sixth would push Save off screen, which is the worst possible outcome of an error message.

## 2.4 Marking the offending row inside the card

No new row layout. The row is already 358 px of content in a 368 px space; there is no room for
another control in it. Two marks and one inserted strip:

```
   before:   3  [− 40 +] × [−   +]         40×10
   after:  ┃ 3  [− 40 +] × [−   +]      ! no reps
           ┃    [        Clear this set        ]
```

1. **A 3 px `--red-hi` left rule** on the `.setrow`, with 8 px padding-left. Against `--surface`
   this needs `--red-hi`, not `--red` — see §0.7.
2. **The ghost slot is temporarily repurposed** to `! {token}`, 12.5 px mono, `--bone`. Last
   session's numbers return the moment the row is valid again. This is the only place in the app
   where the ghost is displaced and it is displaced for exactly as long as the row is broken.
3. **The offending `.stepper` gets `border-color:var(--red-hi); border-width:2px`** so he can see
   *which* of the two fields is the problem without reading the token.
4. **A `Clear this set` strip is inserted below the row**, full row width, 44 px, `.ghostbtn`
   styling, appearing only on marked rows and only after a blocked save.

Greyscale test: the left rule is still a rule, the `!` is still an `!`, the token still says
`no reps`, and the thicker stepper border is still thicker. Nothing depends on hue.

**Displacing the ghost text is a real cost** — that ghost is the best thing in the app. I am
accepting it because a broken row is the one moment when "what did you do last time" is less useful
than "what is wrong right now", and because the alternative is a fourth element in a row that is
already overflowing at 400 px.

## 2.5 The route from message to row — one tap

Tapping a problem row:

1. Scrolls the offending exercise card so the marked `.setrow` sits about **one third down the
   viewport** — high enough that the software keyboard cannot cover it, low enough to reach.
2. Focuses the offending input **and selects its contents**. On a malformed value this means one
   keystroke replaces `7.5.0` entirely. On a blank field the selection is empty and the keyboard
   opens ready.
3. Leaves every mark in place. Marks clear only when the row becomes valid or blank.

No animation beyond the scroll. No highlight flash — he is looking at a rule and a token, not a
pulse he has to catch.

**`render()` currently ends with `window.scrollTo(0,0)`.** On a blocked save that would throw him to
the top of a ten-exercise page. Requirement stated behaviourally so the engineer can pick the
mechanism: **after a blocked save the message is visible without scrolling, and after tapping a
problem row the target row is visible without scrolling.** Neither action may scroll to the top.

## 2.6 Clearing a row he does not want

Two routes. Build both — they serve different moments.

**Route A — `Clear this set`, the explicit one.** Tap the inserted strip.

- Both fields become `""`. The set becomes `blank` and is skipped on save.
- The mark, the strip and the token all disappear. The last-session ghost returns.
- The problem row leaves the message. `{p}` decrements. The headline updates.
- No confirmation. This clears one abandoned set, it is instantly reversible by retyping, and a
  confirmation on every cleanup tap would be the app nagging.

**Route B — step down past the floor, the implicit one.** This closes a trap the batch would
otherwise create, described in §2.7.

| Field | Value | `−` produces |
|---|---|---|
| Weight | `2.5` | `0` — valid, a rack chin (B-21) |
| Weight | `0` | `""` — empty |
| Weight | `""` | `""` — no change |
| Reps | `2` | `1` |
| Reps | `1` | `""` — **skips 0 entirely** |
| Reps | `""` | `""` — no change |

`+` from empty gives `2.5` for weight and `1` for reps, as today. A 0 kg set is still reachable:
empty → `+` → `2.5` → `−` → `0`. And now reversible: `0` → `−` → empty.

## 2.7 The trap this closes — raise it with the PM

**W2 makes `parseReps("0")` return `{ok:false, reason:"range"}`, which is correct: zero reps is not
a set. But `0` is exactly where the `−` stepper bottoms out today** (`Math.max(0, …)`). Stepping
reps down to zero is the most natural way to undo an accidental entry, and after W2 it silently
becomes a blocked save.

Before this batch that was harmless — `done()` filtered `+s.r>0` out. After it, a habitual gesture
produces a refusal. That would be the app getting *worse* at the exact interaction it is trying to
protect.

Route B above is the fix and it belongs in W6's stepper work. It is a behaviour change to an
existing control, so it needs the PM's acknowledgement rather than my assumption.

## 2.8 Stepping a malformed field

W6 requires that stepping a malformed value normalises it visibly. Exact behaviour:

- **First tap on `+` or `−` normalises only.** `7.5.0` becomes `7.5`. The value does **not** also
  step. A field that jumps from `7.5.0` to `10` on one tap has silently changed a number, which is
  the class of bug this batch exists to kill.
- The second tap steps normally.
- The change is visible in the field, so no on-screen message. For screen readers the field is not
  focused, so announce via the polite live region: `Weight now 7.5.` / `Reps now 5.`
- If the row was marked and normalising makes it valid, the mark clears and the problem leaves the
  message in the same frame.

## 2.9 Offending set on an exercise hidden by the Full volume toggle

`startDay()` creates draft entries for **every** exercise in the day; `vSession()` renders only
those passing the `includeCut` filter. So a set can exist in the draft on a card that is not on
screen — and after this batch it can block a save from a row he cannot see or reach. A refusal
pointing at something invisible is the worst state in this whole spec.

**Required behaviour:** on a blocked save, any exercise with a problem is rendered even if the Full
volume toggle would hide it. The card carries one extra hint line under its head, 12.5 px `--dim`:

```
Not in today's volume. It has numbers in it.
```

He can then clear the rows, or leave them and they save. `includeCut` is **not** changed — that is
his programme setting and the app does not get to flip it.

**Scope flag for the PM:** revealing a hidden card is not in W6's written scope. I am specifying it
because without it a blocked save can be unresolvable. It is small — a filter condition — and it is
not a redesign. If the PM would rather not take it, the fallback is worse and should be named as
such: the save stays blocked with no reachable row.

Related and **not** fixed here: a *valid* set on a hidden card is saved without ever being visible.
Same root cause, no blocking consequence. Worth a backlog line.

## 2.10 Success and other exits

| Event | What happens |
|---|---|
| Last problem fixed or cleared | Message block is removed entirely. No "all good" state, no green tick. Live region announces `Nothing left to fix. Tap Save session.` |
| Problems remain after a fix | Message stays, `{p}` decrements, that row leaves the list, next overflow row appears if any. Live region announces `2 sets left to fix.` |
| `Save session` with a clean draft | Existing behaviour. Session saved, draft cleared, toast `Session saved.` |
| `Save session` with an entirely blank draft | Existing behaviour, existing string: `Nothing logged yet.` Not a blocked-save state — nothing to point at |
| Storage write fails after validation passes | Existing string in the existing slot: `Could not save. Your entries are still on screen — try again.` It must render in a **visually different shape** from the blocked-save block — no `!`, no problem rows — so the two are never confused. Draft stays on disk per W3. Its colour must move off 13 px `--red` (3.17 : 1, fails); use `--bone` with a `--red-hi` rule, matching everything else in this spec |
| Reload while blocked | Every value, corrected or not, comes back via Flow 1. The message itself does **not** persist — it is the result of a tap, and it reappears on the next Save |
| Offline | No difference whatsoever. Nothing in this flow touches the network |

## 2.11 A11y — Flow 2

- The message block is `<div id="bs-msg" role="group" aria-labelledby="bs-head">`, with the headline
  `<h2 id="bs-head" tabindex="-1">`.
- **On blocked save, move focus to the headline.** This announces the message without an assertive
  interruption, and the next Tab lands on the first problem row — which makes the one-tap route work
  for keyboard and switch users too. Focusing a non-input does not raise the software keyboard.
- A separate polite region carries the running count and the stepper normalisations:
  `<p id="bs-live" role="status" aria-live="polite" class="sr-only">`. Strings: `2 sets left to
  fix.` · `Nothing left to fix. Tap Save session.` · `Weight now 7.5.`
- Do **not** put `aria-live` on the message block itself. Two live regions covering the same content
  produces double announcements.
- Problem rows are `<button>`, not divs. Accessible name: `{ex}, set {i}, {token}. Go to set.`
- Marked set rows: the offending input gets `aria-invalid="true"` and
  `aria-describedby` pointing at the token span. The token span is real text, not
  `content:` in CSS — pseudo-element text is unreliable to assistive tech and uncopyable.
- The `!` glyph is `aria-hidden="true"` everywhere. The token beside it carries the meaning.
- `Clear this set` accessible name: `Clear {ex} set {i}.` "Clear this set" alone is ambiguous out of
  context in a list of buttons.
- Focus order after a blocked save: headline → problem row 1..n → (page content) → `Save session`.
  Natural DOM order gives this; do not add `tabindex` values above 0.
- Contrast: headline `--bone` on `--bg` (16.4 : 1). Reassurance line `--dim` on `--bg` (4.87 : 1,
  passes). Tokens `--bone`. Rules `--red-hi`. No `--faint`, no `--red` text anywhere in this block.
- The `−`/`+` buttons still have no accessible name (B-13). Not fixed here, but every stepper this
  spec asks a user to operate is one they cannot identify by ear. Worth pulling B-13's stepper
  labels forward — it is a two-attribute change.

## 2.12 Out of scope — Flow 2

- Auto-fixing anything. The app never rewrites a number he typed except on an explicit stepper tap,
  and then visibly (§2.8).
- Saving valid sets and flagging the bad ones. Ruled out in WO-001 Decision 3; not re-litigated here.
- Editing or deleting a set in an already-saved session (B-05).
- Any change to the session view's layout, card structure, verdict block or ghost text outside a
  marked row.
- An autosave indicator (B-19).
- B-13 at large: `maximum-scale=1`, input labels, stepper names, verdict colour. Only the new UI in
  this spec meets the bar. The measurements in §0.7 are handed to B-13 as evidence.

---

## 3. What `frontend-engineer` needs that does not exist yet

| # | Item | Owner | Blocking? |
|---|---|---|---|
| 1 | `:root` token `--red-hi:#C96A5C` | frontend (W6) | Yes — every error mark in this spec |
| 2 | `:root` token `--scrim: rgba(20,16,14,.78)` | frontend (W5) | Yes — modal confirmations |
| 3 | `role="status" aria-live="polite"` on the existing toast | frontend (W5) | Yes — `Discarded.` and `Resumed…` |
| 4 | A `{date}` formatter with weekday, anchored `T12:00:00` | frontend (W5) | Yes — States 1C/1D |
| 5 | `{age}` string builder per §0.4, from `savedAt` + `PHAT.draftAge()` | frontend (W5) | Yes |
| 6 | One `{n}` function used by all three call sites | frontend (W5) | Yes — §0.3 |
| 7 | `loadDraft()` distinguishing read failure from absence | **backend (W3)** | No — degrades to State 1A, with the overwrite risk in §1.1 State 1I |
| 8 | Stepper floor behaviour per §2.6 Route B | frontend (W6) | **Yes — see §2.7.** Ships without it and a habitual gesture becomes a blocked save |
| 9 | Reveal a hidden card that has a problem (§2.9) | frontend (W6) | **Yes** — otherwise a blocked save can be unresolvable. Scope flag raised |
| 10 | No `scrollTo(0,0)` on the blocked-save path (§2.5) | frontend (W6) | Yes |

## 4. Decisions that are not mine

Nothing in this spec sets training advice. The two places it comes close, and who owns them:

- **Whether a 0 kg set is legitimate.** Assumed yes throughout, per WO-001 Decision 4 and B-21. That
  is `strength-coach`'s call, already made.
- **Whether a set with reps and no weight is meaningful** (bodyweight dips, rack chins logged as
  `— × 10`). This spec treats it as `incomplete` and blocks it, per WO-001 Decision 4. If the coach
  rules that a blank weight should mean "bodyweight" rather than "unfinished", the `no weight` token
  and one row of Decision 4's table both change. **Raise it; do not assume.**

## 5. Full string index

Every string this spec ships, for QA and for review.

```
Loading.
UNFINISHED SESSION
{day} · {date}
{n} sets logged · {age}
Nothing entered yet · {age}
It saves under {date}, not today.
Saved {date}
{n} sets logged. This app version cannot open it.
Resume
Discard
Discard {n} logged sets?
Discard 1 logged set?
Discard this session?
{day}, {date}. This cannot be undone.
{day}, {date}. Nothing is logged in it yet.
Discard {n} logged sets
Discard 1 logged set
Discard this session
Keep it
Discarded.
Could not discard. Nothing changed. Try again.
Resumed your unfinished session.
Start {newday}?
{day} from {date} is unfinished — {n} logged sets. Starting a new day discards it.
{day} from {date} is unfinished, with nothing logged in it. Starting a new day discards it.
Discard {n} sets, start {newday}
Open {day} instead
Could not read your saved session. Close the app and reopen it before starting a new day.
Not saved. 1 set needs a fix.
Not saved. {p} sets need a fix.
Everything you typed is still here.
{ex} · set {i}
no reps
no weight
0 reps
over 500
over 100
and {x} more.
Clear this set
Not in today's volume. It has numbers in it.
2 sets left to fix.
Nothing left to fix. Tap Save session.
Weight now {v}.
Reps now {v}.
{ex}, set {i}, {token}. Go to set.
Clear {ex} set {i}.
```

Unchanged existing strings this spec relies on: `Session saved.` · `Nothing logged yet.` ·
`Could not save. Your entries are still on screen — try again.`

No emoji. No exclamation marks. No praise. No word "lost".
