# WO-001 · P0 data loss — B-01, B-02, B-03

Author: `project-manager` · Date: 2026-09-09 · Status: specified, not dispatched
Covers: B-01 (draft lost on reload) · B-02 (malformed input silently deletes a set) · B-03 (UTC dates)
Rules on: B-04 (import) — **deferred to WO-002**, reasoning in §B-04 ruling.

---

## Ask

Close the three P0 data-integrity defects — unpersisted draft, silently dropped malformed sets, and
UTC calendar dates — before Supabase and before any further deployment work.

## Reading of it

Three defects that share one root cause: **the app treats a number as logged the moment it is on
screen, and nowhere else.** `S.draft` is memory-only, `done()` deletes anything it cannot coerce, and
`today()` stamps a day the user is not in. Fixing them well means introducing three things the app
does not have: a persisted draft, a validation layer that refuses rather than discards, and a
versioned store.

Assumptions I resolved rather than asking:

- **The store is empty.** CLAUDE.md §8 and the handoff brief both record zero logged sessions. The
  B-03 migration is therefore designed to be a safe no-op on empty data and a **non-destructive**
  marker on non-empty data. If Chady has real sessions on his phone, this still holds — see §Risks.
- **Chady is east of UTC** (Beirut, UTC+2/+3). UTC dates are therefore *behind* local dates, so a
  session logged before ~02:00–03:00 local is stamped with the previous day. Direction matters only
  for interpreting old rows; the fix does not depend on it.
- **`done()` also drops a legitimate 0 kg set** (`+s.w>0`). A rack chin logged as `0 × 10` vanishes on
  save. That is the same defect as B-02 and is in scope. Tracked as **B-21**.

## Constraint & backlog check

| Check | Result |
|---|---|
| CLAUDE.md §3.1 no build step | Respected. One new **classic** `<script src>` file, no bundler, no modules (ES modules fail over `file://`). See §Decision 1. |
| §3.2 offline-first | Respected. Draft persistence is local-only; nothing in this batch touches the network. |
| §3.3 never lose a number | This batch *is* §3.3. Every work item below carries a data-loss criterion. |
| §3.4 local dates | W1. |
| §3.5 kg / §3.6 44 px | Unchanged. New error affordances in W6 must meet 44 px. |
| §3.7 secrets | Not touched. |
| §3.8 `main` always deploys | W9. Note: repo is not git-linked to Vercel, so `main` green ≠ live green. |
| §7 hazard: `window.storage` vs `localStorage` are two stores | **Directly binding on W3.** The draft must go through the existing `save()`/`load()` adapter and nothing else. A synchronous `localStorage.setItem` shortcut for autosave — which is the obvious implementation — would write the draft to a store the rest of the app is not reading. Forbidden. |
| §7 hazard: `top` collided with `window.top` | Binding on W1/W3 naming. All new identifiers must be checked against browser globals before use. |
| Backlog | B-01, B-02, B-03 are the top three items and the stated first step in the Recommended Order. Nothing is in flight. B-19 (full re-render) is *not* being fixed here but constrains W5 — see §Risks. B-20 is partially in scope — see §Decision 2. |
| Concurrent work | `strength-coach` is auditing advice into `docs/coach-audit.md`. **No item in this batch touches `verdictFor`, the stall detector, bodyweight advice, `PROGRAM`, rest periods or percentages.** W2 changes what data reaches `verdictFor`, never its rules. |
| Blocking P0s | None. This *is* the blocking batch. E-3 (Supabase) stays blocked until this closes. |

---

## Decisions I am making so nobody re-litigates them mid-build

### Decision 1 — Pure logic moves to `logic.js`, a classic script

QA's harness cannot be a Node runner (Node is not installed) and it cannot reach into an IIFE inside
`index.html`. Loading `index.html` in an iframe from `tests.html` fails over `file://` (opaque
origin), and `fetch`-ing it fails too. The only mechanism that works both from `file://` and from
Vercel with no build step is a **classic** `<script src="logic.js">` loaded by both `index.html` and
`tests.html`, exposing one namespace.

Cost: two files instead of one, and manual Vercel deploys must now upload both. Mitigated by W9.
Alternative rejected: keep one file and give up automated tests — that breaks CLAUDE.md §5, which
requires a regression test per fix.

**Namespace: `window.PHAT`.** Checked against browser globals — no collision. Do not use `name`,
`status`, `origin`, `history`, `length`, `self`, `parent`, `top`, `event`, `external`, `location`,
`screen`, `closed`, `frames`, `open`, `find`, `stop`, `focus`, `blur`, `print`, `scroll` as top-level
identifiers in either file.

### Decision 2 — B-20 extraction is **partially** in scope, and the boundary is exact

**In scope:** only functions this batch creates or must change, moved to `logic.js` as pure functions
with explicit arguments, no DOM, no `S`:

`localDate`, `parseWeight`, `parseReps`, `classifySet`, `sanitizeNumericInput`, `validateEntry`,
`validateDraft`, `migrateStore`, `draftAge`.

**Out of scope:** decoupling `verdictFor` from `lastFor`/`S`, and moving `vol`, `topSet`, `weeksIn`,
`ago`, `fmt`. Reason: `strength-coach` is about to rewrite the innards of `verdictFor`, the stall
detector and the calorie thresholds (B-06/B-07/B-08). Extracting them now means extracting them
twice, and it would put this batch on a collision course with the concurrent audit. B-20 stays open
and gets closed in the coach's batch, where the extraction and the rule change happen in one pass.

`done()` stays in `index.html` but becomes a thin caller of `PHAT.validateEntry`.

### Decision 3 — Malformed input **blocks the save**; it never silently drops and never saves garbage

Three options existed: drop silently (today, the bug), save the raw string and flag it (poisons
`vol`/`topSet`, which coerce `NaN` to 0), or refuse to save and point at the offending row.

Refuse and point. It is safe **only because W5 lands first**: with the draft autosaved, a user who is
blocked while fixing a typo cannot lose anything if the phone dies. That ordering is not cosmetic —
blocking save without a persisted draft would create a *new* data-loss path.

### Decision 4 — Set classification, exactly

| State | Definition | Behaviour |
|---|---|---|
| `blank` | both `w` and `r` are `""` | Skipped on save, silently. Not data. |
| `complete` | `w` parses to a number `0 ≤ w ≤ 500` **and** `r` parses to an integer `1 ≤ r ≤ 100` | Saved. **`w === "0"` is valid** (bodyweight rack chin). Fixes B-21. |
| `incomplete` | exactly one field non-empty | Blocks save, named row |
| `malformed` | a non-empty field that fails to parse, or reps non-integer, or out of range | Blocks save, named row |

### Decision 5 — No date rewriting, ever

See W1. A `YYYY-MM-DD` string carries no offset; the original local date of a UTC-stamped row is
**unrecoverable**. Shifting every old date by one day would corrupt every row that was already
correct. The migration adds a version and a marker and touches no date.

### B-04 ruling — next batch (WO-002), not this one

B-04 is correctly labelled P0, and it is still deferred. Reasons, in order of weight:

1. **It is not an active loss path.** Nothing the app does destroys data because import is missing.
   B-01/02/03 each destroy data during normal use, today. Missing recovery is worse than nothing only
   once there is something to recover.
2. **It depends on decisions this batch makes.** The import validator is `PHAT.validateDraft` and
   `PHAT.validateEntry` with a different caller; the file format must carry the `schemaVersion` W1
   introduces and must declare the local-date basis W1 establishes. Building import first means
   writing the validator twice and then reconciling two copies.
3. **`docs/architecture.md` already requires it**: "reuse the export format from B-04 so import/
   restore and sync share one code path." That code path is being defined here.
4. **It needs its own UX decision** — merge vs replace, and what happens when an imported session
   collides with an existing one on the same date. That is a real design task, and this batch already
   carries one UX item. Adding a second dilutes both.

WO-002 opens with **B-04 + B-16** together: an export that some WebViews silently fail to download and
that cannot be re-imported is the same defect at both ends of one feature. Fix the round trip once.

---

## Work order

### W1 · Local calendar dates + versioned store + non-destructive migration — owner: `backend-engineer`

**Scope — in:** `PHAT.localDate(d = new Date())` returning `YYYY-MM-DD` from local components
(zero-padded). Replace every use of `today()` in `index.html` with it (`startDay`, bodyweight logging
and dedupe, `vWeight`'s `mine` lookup, `exportAll` filename). `PHAT.migrateStore(log, bw)` run once at
boot, before first render.

**Migration behaviour, exactly:**
- If both stores are absent or empty: write `schemaVersion: 2` into the log object on the next save.
  Change nothing else. No user-visible output.
- If data exists: add `schemaVersion: 2`, add `utcDatedBefore: "<the migration's local date>"` to the
  log object, and add `dateBasis: "utc"` to every existing session and bodyweight row. **Do not modify
  any `date` value.** Rows written after the migration carry no `dateBasis` (or `"local"`), so a future
  session can tell which rows may be off by one.
- If two bodyweight rows share a `date` after migration, keep the **last** in array order and drop the
  earlier — but only in that exact case, and record the drop in the returned `notes` array.
- Migration is idempotent: running it on an already-migrated store makes no changes and reports none.
- Migration must never throw. On any parse failure it returns the input unchanged with an error note,
  and boot proceeds with what loaded.

**Scope — out:** `fmt`/`ago` (already anchored at `T12:00:00` local, which is DST- and offset-safe —
leave them). Any date picker (B-17). Backdating.

**Acceptance criteria:**
- With the device clock set to 2026-01-15 **00:30 local** in a UTC+3 timezone, starting a session
  produces a draft dated `2026-01-15`. Before the fix it produced `2026-01-14`.
- Same test at **23:30 local** in a UTC−5 timezone produces the same-day local date, not tomorrow's.
- `PHAT.localDate(new Date(2026,0,5,0,0,0))` === `"2026-01-05"`; single-digit month and day are
  zero-padded.
- With an empty store, boot completes, the app renders, and no `dateBasis` key appears anywhere.
- **Data-loss criterion:** seed `localStorage` with a `phat:v1:log` containing 3 sessions and a
  `phat:v1:bw` with 10 rows, all written in the pre-fix format. Reload. All 3 sessions and all 10
  bodyweight rows are still present, every `date` string is byte-identical to what was seeded, and the
  trend chart renders the same points as before the fix.
- Running the migration twice in a row produces no second change and no duplicate keys.
- Logging bodyweight twice on the same local day still results in exactly one row for that day.

**Depends on:** — (creates `logic.js`)

---

### W2 · Set validation as pure functions — owner: `backend-engineer`

**Scope — in:** in `logic.js`:

- `PHAT.sanitizeNumericInput(currentValue, proposedValue, kind)` → string. `kind` is `"w"` or `"r"`.
  Strips anything that is not a digit or `.`; permits **at most one** `.`; for `"r"` permits no `.` at
  all; never silently reorders or reinterprets — if the proposed value cannot be made valid by
  stripping, it returns `currentValue` unchanged so the keystroke is simply rejected.
- `PHAT.parseWeight(str)` / `PHAT.parseReps(str)` → `{ok:true, value}` or
  `{ok:false, reason:"empty"|"malformed"|"range"}`.
- `PHAT.classifySet({w,r})` → `"blank" | "complete" | "incomplete" | "malformed"` per Decision 4.
- `PHAT.validateEntry(sets)` → `{sets:[{w:Number,r:Number}], problems:[{i, field, reason}]}`.
- `PHAT.validateDraft(draft)` → `{ok, entries, problems:[{exId, setIndex, field, reason}], setCount}`.

Rewire `done()` to call `validateEntry`, and `finish()` to call `validateDraft` and **return without
saving** when `ok` is false, leaving `S.draft` untouched and handing the problem list to the view.

**Scope — out:** all UI. W6 owns rendering the problems. No change to `verdictFor`, `vol` or `topSet`
beyond the fact that they now receive validated numbers.

**Acceptance criteria:**
- `classifySet({w:"7.5.0", r:"5"})` === `"malformed"`. `finish()` with that set present does **not**
  push a session, does **not** clear the draft, and returns a problem naming that exercise and set 1.
- `classifySet({w:"0", r:"10"})` === `"complete"` and the set survives a save with `w: 0` (B-21).
- `classifySet({w:"", r:""})` === `"blank"`; a session with 6 blank rows and 3 complete rows saves 3
  sets and reports no problem.
- `classifySet({w:"100", r:""})` === `"incomplete"` and blocks save.
- `parseReps("5.5")` → `{ok:false, reason:"malformed"}`; `parseReps("0")` → `{ok:false, reason:"range"}`;
  `parseWeight("501")` → `{ok:false, reason:"range"}`.
- `sanitizeNumericInput("7.5", "7.5.", "w")` === `"7.5"` (second dot rejected, value preserved).
  `sanitizeNumericInput("7", "7.", "r")` === `"7"`.
- **Data-loss criterion:** enter 3 valid sets and 1 set of `7.5.0 × 5`. Tap Save. Nothing is written to
  storage, all 4 rows are still on screen with their exact typed values including `7.5.0`, and the
  problem is named. Correct the bad row to `7.5` and tap Save: **all 4 sets** appear in the saved
  session.
- No code path in `finish()` can produce a saved set whose `w` or `r` is `NaN`, `null`, `undefined`,
  a string, or negative. Assert on the serialized JSON, not on the in-memory object.

**Depends on:** W1 (both write `logic.js`; W1 creates the file and the namespace)

---

### W3 · Draft persistence layer — owner: `backend-engineer`

**Scope — in:** key `phat:v1:draft`, written and read **only** through the existing `save()`/`load()`
adapter — never `localStorage` directly, never both stores (CLAUDE.md §7 hazard a).

- `saveDraft(draft, dayId)` / `loadDraft()` / `clearDraft()` in `index.html`, wrapping the adapter.
- Persisted shape: `{schemaVersion:2, dayId, date, entries, savedAt:<epoch ms>}`. `entries` holds the
  **raw strings** exactly as typed — a malformed `7.5.0` must survive a reload so the user can fix it
  rather than lose it.
- `PHAT.draftAge(draft, nowLocalDate)` → `{ageDays, sameDay:Boolean}` — pure, in `logic.js`.
- `clearDraft()` is called on successful `finish()` and on explicit Discard. **On nothing else.** A
  failed save must leave the draft on disk.
- A draft write must never throw into the caller; a failed draft write sets `S.err` and is retried on
  the next write.

**Scope — out:** the autosave triggers and the restore banner (W5). Multi-draft support — exactly one
draft exists at a time; starting a new day while a draft exists is W4/W5's problem, not the storage
layer's.

**Acceptance criteria:**
- After `saveDraft`, `load("phat:v1:draft")` returns an object whose `entries` deep-equal the input,
  including empty strings and malformed strings.
- In a build where `window.storage` is stubbed present, **zero** writes reach `localStorage` — assert
  by spying on `localStorage.setItem` and requiring 0 calls. In a build where it is absent, zero calls
  reach `window.storage`.
- **Data-loss criterion:** `finish()` fails (stub `save(LOG,…)` to return false). The draft key still
  exists on disk afterwards with all sets intact, and the on-screen sets are unchanged.
- `clearDraft()` removes the key; a subsequent `loadDraft()` returns `null` and boot renders the Train
  tab with no restore prompt.
- `draftAge` on a draft dated yesterday reports `{ageDays:1, sameDay:false}`.

**Depends on:** W1

---

### W4 · UX spec: draft restore, and being blocked by a bad number — owner: `ux-designer`

**Scope — in:** a written spec (copy + placement + states) for two flows, no code:

1. **Restore on boot.** Where the offer appears, what it says, what it shows about the draft (day
   name, date, how many sets are already in it, how long ago). What "Resume" and "Discard" do, and
   what confirmation Discard needs — Discard destroys logged numbers, so it is the one destructive
   action in this batch. What it says when the draft is from a previous day. What happens if the user
   ignores the banner and taps a different day.
2. **Blocked save.** How a malformed or incomplete row is marked, what the message says, how the user
   gets from the message to the offending row with one tap, and how they clear a row they do not want.
   Must work at 400 px with a thumb, ≥ 44 px targets, and must not rely on colour alone (B-13's
   principle, applied to new UI only — B-13 itself stays open).

Copy voice per CLAUDE.md §4: terse, second person, imperative, no hype, no emoji, no exclamation marks.

**Scope — out:** redesigning the session view. An autosave indicator — explicitly out, because it
would require a re-render mid-input (see §Risks). Any change to existing copy not on these two flows.

**Acceptance criteria:**
- Spec names every state with its exact copy string: no draft · same-day draft · older draft ·
  discard confirmation · one bad row · several bad rows across several exercises.
- Discard is not reachable by a single accidental tap and its confirmation states what will be lost,
  with a count ("Discard 7 logged sets?").
- Every interactive element in the spec is ≥ 44 px and reachable in the lower two-thirds of a 400 ×
  800 viewport.
- No message tells the user their data was lost, because after this batch it will not have been.
- Reviewable by `frontend-engineer` without asking a follow-up question.

**Depends on:** — (runs in parallel with W1–W3)

---

### W5 · Draft autosave + restore-on-boot wiring — owner: `frontend-engineer`

**Scope — in:**
- Call `saveDraft` from the `input` handler (weights, reps, notes) **debounced 400 ms**, and
  **immediately, undebounced** on: `+`/`−` stepper taps, input `blur`, `visibilitychange` → hidden,
  and `pagehide`.
- On boot, after migration, if a draft exists, render the restore offer per W4's spec before or
  alongside the Train tab. Resume sets `S.draft`/`S.dayId` and opens the session view. Discard calls
  `clearDraft()` after confirmation.
- `startDay()` must not silently overwrite an existing draft — behaviour per W4's spec.
- **Autosave must never call `render()`.** Full-`innerHTML` re-render mid-input destroys focus and
  caret (B-19). If any indicator is needed, it is a `textContent` write to one existing node.

**Scope — out:** fixing B-19 itself. Any rest timer, any sync. Editing saved sessions (B-05).

**Acceptance criteria:**
- **Data-loss criterion (the headline one):** start Day 1, enter three sets — `100×5`, `100×5`,
  `95×4` — and a note on one exercise. Do not save. Reload the page. The restore offer appears naming
  Day 1 and today's date; tapping Resume shows all three sets with those exact values and the note
  intact. Tapping Discard instead, and confirming, leaves no draft and the next reload shows no offer.
- Same test, but instead of reloading: background the tab (`visibilitychange` → hidden), then kill and
  reopen the browser. All three sets are offered back.
- Typing a weight and immediately killing the tab within 400 ms loses at most that one in-flight
  keystroke; every field that was blurred or stepped is intact.
- Typing continuously in a weight field for 10 seconds never moves the caret, never loses focus, and
  never re-renders the card. Verify by asserting `document.activeElement` is unchanged and the card's
  DOM node identity is unchanged.
- With `window.storage` stubbed present, autosave produces zero `localStorage` writes.
- Resuming a draft, then saving it, results in exactly one session in the log and no leftover draft.
- Draft from a previous day is offered back with its own date shown, not silently relabelled today.

**Depends on:** W3, W4

---

### W6 · Inline validation UI + blocked-save messaging — owner: `frontend-engineer`

**Scope — in:**
- Route the `input` handler through `PHAT.sanitizeNumericInput` so a second `.` cannot be typed into a
  weight and no `.` can be typed into reps, preserving caret position.
- On blocked save, render the problem list per W4's spec: mark each offending row, show the message,
  provide the one-tap route to the row, and provide a way to clear a row.
- `aria-live` on the blocked-save message. Status conveyed by text/icon as well as colour.
- The `+`/`−` steppers currently call `parseFloat("7.5.0")` → `7.5`, silently rewriting a value the
  user typed. Make that explicit: stepping a malformed field first normalises it visibly.

**Scope — out:** B-13 in general (`maximum-scale=1`, labels on all inputs, verdict colour). Only the
new UI must meet the bar.

**Acceptance criteria:**
- Typing `7.5.0` into a weight input is impossible: after the fourth keystroke the field reads `7.5`
  and the caret is where the user left it.
- **Paste is handled differently from typing, deliberately.** Pasting `7.5.0` into a weight field
  leaves the field reading `7.5.0` — the raw string is preserved and the save is blocked. Stripping a
  paste is the behaviour that silently changes a number (`7.5.0` → `750` or `7.5`), which is the bug.
  Only *keystrokes* are rejected; pastes are kept verbatim and validated.
- Typing `.` into a reps field is rejected: the field is unchanged and no character appears. Typing
  `5`, `.`, `5` in sequence therefore leaves `55`, visibly on screen, which the user can see and
  correct. Pasting `5.5` into reps leaves `5.5` and blocks the save as malformed.
- No keystroke or paste in either field may ever produce a *larger* number than the characters the
  user supplied. Assert specifically that `750` can never appear from `7.5.0` by any route.
- A session with one incomplete row (`100 × <blank>`) shows a message naming the exercise and set
  number, and Save does nothing until it is fixed or cleared.
- The blocked-save message is announced by a screen reader and is legible without colour.
- **Data-loss criterion:** with a blocked save on screen, reload the page. Every value, including any
  the user has not yet corrected, is offered back by the draft restore.
- Clearing a row empties both fields and the save proceeds, saving every other row.

**Depends on:** W2, W4, W5 (W5 first — blocking save is only safe once the draft is persisted)

---

### W7 · Test harness `tests.html` + regression suite — owner: `qa-engineer`

**Scope — in:** a browser page, no Node. `tests.html` loads `logic.js` via a classic `<script src>`,
runs assertions, and prints a pass/fail summary with counts and the name of every failure. Must open
by double-clicking the file (`file://`) with no server.

Cover, at minimum, one regression test per acceptance criterion in W1, W2 and W3, plus:
- `localDate` across midnight boundaries in at least three offsets (UTC−8, UTC, UTC+3), month and year
  rollovers, and a DST transition day.
- Every branch of `classifySet` and both parsers, including `""`, `"."`, `".."`, `"-5"`, `"1e3"`,
  `"7.5.0"`, `"0"`, `" 5 "`, `"٥"` (non-ASCII digit), `"Infinity"`.
- `migrateStore` idempotency, empty store, populated store, and a corrupt/truncated JSON store.
- `validateDraft` on a draft where every set is blank, and on a draft mixing all four classes.

Plus a written manual checklist for the things a page cannot assert: reload, phone lock, browser kill,
backgrounding, caret preservation, and the 400 px one-handed pass.

**Scope — out:** testing `verdictFor`, the stall detector or the calorie thresholds — those belong to
the coach's batch and their rules are about to change. Do not write tests that pin current behaviour
there; they will be deleted.

**Acceptance criteria:**
- `tests.html` opens from `file://` with no server and no network and reports a total, a pass count and
  a fail count.
- Reverting any one of the three fixes makes at least one named test fail — demonstrate this for all
  three by temporarily reverting each and pasting the failure name.
- Zero failures on the final build.
- The suite runs in under 2 seconds and needs no manual input to produce its summary.

**Depends on:** W1 for the file and namespace to exist; the harness scaffold can be written in parallel
against the function signatures fixed in this document.

---

### W8 · Verification pass — owner: `qa-engineer`

**Scope — in:** walk every acceptance criterion in W1–W6 on a real phone-sized viewport (400 px) with
the network off, plus the manual checklist from W7. Explicitly attempt to lose a number: kill the
browser mid-set, lock the phone mid-set, background for 10 minutes, fill the storage quota, and hit
Save with a malformed value. Report pass/fail per criterion, no interpretation.

**Acceptance criteria:**
- Every criterion in W1–W6 marked pass or fail with the observed behaviour, not a summary.
- At least one deliberate attempt per defect to reproduce the original bug, documented as failing to
  reproduce.
- Any criterion that cannot be tested is named as such rather than passed.

**Depends on:** W5, W6, W7

---

### W9 · Ship — owner: `release-engineer`

**Scope — in:** branch, merge to `main` once W8 is clean, and deploy. Because the Vercel project is
**not git-linked**, the deploy is a manual API call and now covers **two** files (`index.html` and
`logic.js`) — a partial upload ships an app that throws before first render, which is exactly the
black-screen failure mode in the handoff brief. Verify the live URL after deploying, not the build
status.

**Scope — out:** E-2 (installing the Vercel GitHub App), E-4 (PWA), token rotation — all separately
tracked. Recommend E-2 immediately after this batch; see §Needs from Chady.

**Acceptance criteria:**
- `main` contains both files and the site at `https://gym-app-psi-eight.vercel.app` serves both —
  confirmed by fetching `/logic.js` and getting a 200 with the expected content, not a 404 HTML page.
- Loading the live URL with the console open shows no errors and renders the Train tab.
- **Data-loss criterion:** on the live site, enter two sets, force-reload, and confirm the restore
  offer appears. Data written by the previous live build (if any) still loads.
- The deployed commit SHA is recorded, so a future session can tell what is actually live.

**Depends on:** W8

---

## Sequence

```
W1 (backend: dates + logic.js + migration)  ─┬─> W2 (backend: validation) ─┐
                                             └─> W3 (backend: draft store) ─┤
W4 (ux: both flows)  ───────────────────────────────────────────────────────┤
                                                                            ├─> W5 (fe: autosave+restore)
W7 scaffold (qa, parallel from the start) ──────────────────────────────────┘        │
                                                                                     v
                                                                              W6 (fe: validation UI)
                                                                                     │
                                                                        W7 suite ────┴──> W8 ──> W9
```

- **Parallel now:** W1, W4, and W7's scaffold. Three agents, no contention — W4 and W7 touch no file
  W1 touches.
- **W1 first among the backend items** because it creates `logic.js` and the `PHAT` namespace that W2
  and W3 both extend. W2 and W3 can then run in parallel if the main session dispatches them together,
  but they edit the same file — safer to run W3 then W2, or dispatch both to one `backend-engineer`
  invocation covering W1→W3→W2.
- **W5 strictly before W6.** Blocking a save is only safe once the draft survives the phone dying
  while the user fixes a typo. Reversing this order creates a new data-loss path.
- **W8 last before W9.** Nothing ships without it (CLAUDE.md §5).

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Autosave triggers a full `innerHTML` re-render (B-19) and eats the caret mid-set.** This is the single most likely way to make the app *worse* while fixing it. | High | W5 forbids `render()` on the autosave path; W5 has an explicit focus/DOM-identity criterion; W4 excludes an autosave indicator. |
| **Draft written to the wrong store.** The obvious autosave implementation is a synchronous `localStorage.setItem`; under the `window.storage` bridge that forks history invisibly. | High | W3 routes everything through the adapter; W3 and W5 both assert zero writes to the non-active store. |
| **Async native storage may not flush on `pagehide`.** The bridge is `await`-based; the browser may not wait. | Medium | Immediate write on blur and on stepper tap means the worst case is one in-flight keystroke, not a session. Criterion in W5 states this bound explicitly rather than pretending it is zero. |
| **Blocking save traps a user mid-workout.** A message with no obvious fix is worse than the bug. | Medium | W4 owns the one-tap route to the row and the clear-row affordance; W6 tests it. W5 lands first so nothing is at risk while he fixes it. |
| **Existing stored data.** Migration is the only place this batch can destroy history. | High if data exists | Decision 5: no date is rewritten. W1's data-loss criterion seeds a realistic store and asserts byte-identical dates after reload. If Chady has sessions on his phone, **export before installing this build** — see §Needs from Chady. |
| **Old UTC-stamped rows will read one day early forever.** Not corruption, but a permanent small inaccuracy in history. | Low | `dateBasis:"utc"` marks them so no future session mistakes them for local dates and no future migration double-shifts them. |
| **Two files on a manual deploy.** A partial upload is a black screen. | Medium | W9 asserts `/logic.js` returns 200 with expected content on the live URL. Strong argument for doing E-2 next. |
| **New top-level identifier collides with a browser global** (the `top` failure). | Low but catastrophic | Decision 1 fixes the namespace and lists the forbidden names; W7 catches it as a total suite failure. |
| **Collision with the concurrent coach audit.** | Low | No item touches `verdictFor`, the stall detector, bodyweight advice, `PROGRAM`, rest periods or percentages. W7 is forbidden from pinning current advice behaviour in tests. |
| **Scope creep into B-05/B-13/B-17/B-19/B-20.** Each is one small step from something in this batch. | Medium | Every work item has an explicit "out" list. They stay open. |

**Migration required:** yes, but non-destructive — add `schemaVersion: 2`, mark pre-existing rows
`dateBasis:"utc"`, dedupe same-date bodyweight rows only. **No date value is rewritten.**

---

## Needs from Chady

1. **Confirm the two-file split** (`index.html` + `logic.js`). It is the only way to get automated
   tests with no Node and no server. If you'd rather keep one file, say so and QA drops to a manual
   checklist — I'd take the split. **This belongs in `docs/decisions.md`; I have not written it.**
2. **Confirm the 0 kg ruling (B-21):** a set logged as `0 × 10` is real data and gets saved. Today it
   is silently deleted. I'm treating this as in scope for B-02.
3. **Confirm blocked-save over save-and-flag** (Decision 3). I recommend blocking; it is only safe
   because W5 ships first.
4. **Do you have real sessions or bodyweight rows on your phone right now?** If yes, export before
   installing this build. Every doc says zero sessions logged; I'm planning for that but the migration
   is the one irreversible step in this batch.
5. **E-2 (Vercel git-link) immediately after this batch?** You said deployment work comes after the
   P0s, and I'm honouring that — but this batch turns every deploy into a two-file manual upload where
   a partial upload is a black screen. It's the cheapest risk reduction available.

---

## Dispatch list (for the main session)

Dispatch 1, 2 and 3 together — they do not contend.

1. **`backend-engineer` → W1, then W3, then W2** (one invocation, in that order — all three edit
   `logic.js`).
   Brief: *Create `logic.js`, a classic script (no ES modules — must work from `file://`) exposing
   `window.PHAT`. Move/add only these pure functions, no DOM and no access to `S`: `localDate`,
   `parseWeight`, `parseReps`, `classifySet`, `sanitizeNumericInput`, `validateEntry`, `validateDraft`,
   `migrateStore`, `draftAge`. Load it from `index.html` with `<script src="logic.js">` before the main
   IIFE. Then: (W1) replace `today()` everywhere with `PHAT.localDate()`; add a boot migration that
   sets `schemaVersion: 2` and marks pre-existing rows `dateBasis:"utc"` and **never rewrites a date
   string**; (W3) persist the draft under `phat:v1:draft` through the existing `save()`/`load()`
   adapter only — never `localStorage` directly, never both stores; store raw typed strings; clear it
   only on successful save or explicit discard; (W2) make `finish()` refuse to save when any set is
   malformed or incomplete, leaving the draft untouched, and treat `0 × 10` as a valid set. Do not
   touch `verdictFor`, the stall detector, `PROGRAM`, rest periods or percentages — a coach audit is
   running concurrently. Full spec and acceptance criteria in
   `docs/work-orders/WO-001-p0-data-loss.md`.*

2. **`ux-designer` → W4.**
   Brief: *Spec two flows, copy and states only, no code. (1) On boot, offering an unfinished session
   back: what it says, what it shows (day, date, set count, age), what Resume and Discard do, what
   confirmation Discard needs given it destroys logged sets, and what happens for a draft from a
   previous day or when the user taps a different day instead. (2) A save blocked by a malformed or
   incomplete set: how the row is marked, what the message says, the one-tap route from message to
   row, and how to clear a row. 400 px, one-handed, ≥ 44 px, not colour-alone, `aria-live` on the
   message. Voice per CLAUDE.md §4 — terse, imperative, no emoji, no exclamation marks. Explicitly out:
   an autosave indicator, and any redesign of the session view. Criteria in
   `docs/work-orders/WO-001-p0-data-loss.md` §W4.*

3. **`qa-engineer` → W7 scaffold.**
   Brief: *Build `tests.html`: a browser page, no Node, no server, opens from `file://`, loads
   `logic.js` via a classic `<script src>`, prints total/pass/fail and names every failure. Write the
   suite against these signatures now, before the implementation lands: `PHAT.localDate(d)`,
   `parseWeight(str)`, `parseReps(str)`, `classifySet({w,r})`, `sanitizeNumericInput(cur, next, kind)`,
   `validateEntry(sets)`, `validateDraft(draft)`, `migrateStore(log, bw)`, `draftAge(draft, todayStr)`.
   Edge cases and expected results are listed in `docs/work-orders/WO-001-p0-data-loss.md` §W7. Do not
   write tests for `verdictFor`, the stall detector or the calorie thresholds — those rules are
   changing.*

4. **`frontend-engineer` → W5** (after 1 and 2 land).
   Brief: *Wire draft autosave and restore. Debounce 400 ms on `input`; write immediately on stepper
   tap, blur, `visibilitychange`→hidden and `pagehide`. On boot, after migration, offer any existing
   draft back per the UX spec; Resume restores it, Discard clears it after confirmation.
   **Autosave must never call `render()`** — the app re-renders whole views with `innerHTML` and would
   destroy the caret mid-set (B-19). Use the `saveDraft`/`loadDraft`/`clearDraft` helpers from W3; do
   not touch storage directly. Criteria in `docs/work-orders/WO-001-p0-data-loss.md` §W5.*

5. **`frontend-engineer` → W6** (after 4).
   Brief: *Make malformed input impossible to type and impossible to lose. Route the `input` handler
   through `PHAT.sanitizeNumericInput` so a weight can hold at most one `.` and reps hold none, with
   the caret preserved and never producing a larger number than the user typed. On a blocked save,
   mark each offending row, show an `aria-live` message naming exercise and set number, give a one-tap
   route to the row and a way to clear it. New UI only: ≥ 44 px, not colour-alone. Criteria in
   `docs/work-orders/WO-001-p0-data-loss.md` §W6.*

6. **`qa-engineer` → W7 suite completion + W8** (after 5).
   Brief: *Finish the regression suite so every acceptance criterion in W1–W3 has a test, then run the
   full manual pass at 400 px with the network off. Prove each of the three fixes: temporarily revert
   each one and paste the name of the test that fails. Then actively try to lose a number — kill the
   browser mid-set, lock the phone, background 10 minutes, fill the storage quota, save with a
   malformed value. Report pass/fail per criterion with observed behaviour, no interpretation.*

7. **`release-engineer` → W9** (only if 6 is clean).
   Brief: *Branch, merge to `main`, deploy. The Vercel project is not git-linked, so this is a manual
   API deploy and it now covers **two** files — `index.html` and `logic.js`. A partial upload ships a
   black screen. After deploying, verify the live site itself: fetch `/logic.js` and require a 200 with
   the expected content (not a 404 HTML page), load the app with the console open and confirm no errors,
   and confirm the draft-restore flow works on the live URL. Record the deployed commit SHA. Out of
   scope: installing the Vercel GitHub App (E-2), PWA (E-4), token rotation.*
