# WO-012 — Decide once: the default unit, the per-exercise override, and every surface speaking it

Owner: `project-manager` · Filed: 2026-09-13 · Status: **closed 2026-09-13** — `main @ 4b144a0`, deployed and verified; closure record in §8. Two things in this file were corrected during the chain and are marked in place: the **precedence** in §0.1 (history now yields to a chosen default — the main session's ruling, on UX's disagreement) and the **D1 literal** in §4 (`Last 170 lb × 5` was a total on a card that takes plates — UX). Branch: `wo-012-default-unit` (merged)
Supersedes nothing; corrects WO-010's *initial state*. WO-010's shape (`w` kg, `ld` beside it,
schema 6) is untouched.

---

## 0. Ask

Chady, verbatim, 2026-09-13:

> "Didn't I ask to have a pound metric, and I need to decide if it's kilogram or pound. You're still
> giving me kilogram. You want me to do the conversion myself every time. I don't want to have a
> calculator in my hand every time I wanna do something."

And after the intake:

> "Even if I lift in lb or kilogram, I need the capability to change — maybe one exercise cannot be
> done with lb, and another one can be done in lb and so on. I would like to be able to change the
> unit by exercise."

**One sentence:** decide the unit once, in Settings; every card starts in it; a per-exercise choice
on the chip overrides it and is remembered the moment it is made; and every number the app shows or
tells him to load is in the unit that card is in.

## 0.1 Reading of it

**Why WO-010 misses, from the tree.** `cardMode` (`index.html` 2376) resolves the card's mode as:
the chip's choice this session → the draft's own `ld` → kg if a set was typed → `PHAT.loadModeFor`
(the last *logged* entry's first set with `ld`) → `{au: "kg"}`. Two consequences:

1. **Every card starts in kg the first time.** 42 slots, 42 first-time taps, and until each is done
   the row asks for kg — which is exactly the calculator he is describing.
2. **A choice that is not followed by a logged set is forgotten.** The chip writes `entry.mode` on
   the draft only; the only durable trace is `ld` on a saved set. Flip d3c to kg, log nothing that
   day, and d3c opens in kg-or-lb-by-history next time, not in what he chose.

And the display: every kg-direct set — his whole first session, 77 / 86 / 51 kg converted by hand at
the rack — renders its ghost as `Last 77 kg × 5` (`ghostText`, 2339, via `loadWord`), so even after
the chip is flipped he reads kg and converts again.

**The two-level rule, stated here so no owner rebuilds it as a side effect.**

| Level | Where it lives | What it is | When it changes |
|---|---|---|---|
| **1 · Default** | `prefs.gym.unit` = `"kg" \| "lb"`, absent = `"kg"` | Where every card starts before any per-exercise choice exists | Settings → Gym, *I lift in* |
| **2 · Override** | `prefs.gym.ex[exId]` = `{au, bar?, bu?}` | A deliberate per-exercise choice, persisted **the moment the chip's sheet applies it**, whether or not a set is ever logged in that mode | The card's chip; cleared by the sheet's *Use my default* |

Precedence on a card, top wins — **as filed** (superseded, kept for the record):
`entry.mode` (chip this session, on the draft) → the draft's own `ld` → kg if a kg-direct set is
already typed → **`prefs.gym.ex[id]` (override)** → **`PHAT.loadModeFor(prev)` (history, WO-010's
memory — kept as a tier so a WO-010-era choice is not lost)** → **default** (`prefs.gym.unit` plus the
bar rule below) → `{au: "kg"}`.

> **Amended 2026-09-13 at W2 — the ruling that shipped.** UX (§21.12 #1) disagreed: every set logged on a
> lb card carries `ld`, so with history above the default every *logged* card's mode comes from history
> and a later change in Settings moves only cards he has never logged — the segment would be a
> first-session-only control. The main session ruled for UX. **The default governs; history fires only
> while `prefs.gym.unit` is absent.** Precedence as built (`cardModeFor`, S47): session → draft `ld` →
> typed kg → override → **default (when `prefs.gym.unit` is present)** → **history (only while it is
> absent)** → `{au: "kg"}`. Principle: a default that a later change cannot reach is not a default. Cost:
> a WO-010-era bar choice on a device that then picks a default is one re-pick in the sheet, which
> writes it as an override. D3's "a never-touched card now opens in kg" becomes "every card without an
> override now opens in kg". Recorded in `docs/decisions.md`.

A chip tap writes **both** `entry.mode` (as today) **and** `prefs.gym.ex[id]`. History never writes
the override; only a tap does. Both stores are per device (B-113's ruling stands).

**Default bar for a lb-default card — ruled.** UX struck "default bar" in §10.6/§19.7 because
kg-first made it unreachable; that reason is gone. The rule: a card falling through to the default
with `unit: "lb"` starts with **the profile's first bar when the slot's `implement` is `bb`, and no
bar otherwise**. Reasoning, and it is a data-safety reasoning not a convenience: a lb card with no
bar on Bench means he types `135` and the app stores 61.2 kg when he lifted 81.2 — a wrong number
stored silently, which is the class of defect this project ranks first. A profile's first bar on a
dumbbell row is the mirror error, so the bar follows `bb` only. `implement` is the slot's label and
L2 already reads it for exactly this kind of word; this is not the per-implement *unit* split he
ruled out. No profile bar and `implement: "bb"` → no bar, and the chip says so (UX words). Chady can
overturn this with one sentence; it is one branch in `defaultMode`.

**Display follows the card's unit.** A kg-entered set on a lb card renders converted for display,
`w` untouched: `Last 125.5 lb × 5` on a card with the 20 kg bar (the *added* weight, in the card's unit —
see the D1 correction in §4), `Last 170 lb × 5` only on a card with no bar. The `= 60.8 kg` total on the row stays — he asked for it as the
label. The surfaces, enumerated so QA can tick them: the ghost hint; the stepper's step and its
aria-labels; the `+`-on-empty seed; the live region; the remove-set confirmation; the sheet's
*Last time:* line; the Summary's per-set line; the Trend lift rows' delta and endpoints; the verdict's
instruction for a kg-direct set (coach, W1). Bodyweight, Diet and the Weight screen are **not**
touched — the setting is *I lift in*, not *units*; bodyweight in lb is B-127, his word first.

**Rounding for display.** `displayLoad(w, unit)`: `unit === "kg"` returns `r1(w)` as today, byte
for byte. `unit === "lb"` returns `w / LB_KG` rounded to the nearest **0.5 lb** — the finest plate,
and 0.23 kg, coarser than the 0.1 kg stored so never claims precision the store lacks; coarser
still (1 lb) would print `112 lb` for a set he built as 112.5. The coach confirms or moves this in
W1; it is one constant.

**Nothing changes for a kg-default account.** `prefs.gym.unit` absent or `"kg"` with no overrides
= today's behaviour byte for byte: same DOM on a kg-direct card, same strings, same `phat:v1:*`
values. Diana and the 842 tests never see a difference unless a test sets the key.

## 0.2 Constraint & backlog check

- **CLAUDE.md §3.5** as amended on `11c44ff`: stored kg, entry unit free. This order changes
  *display* and *defaults*, storage stays `w` kg + `ld` components. No conflict. Bodyweight stays
  kg (§3.5's 0.1 kg step untouched).
- **§3.3 never lose a number.** `prefs.gym` gains two keys; `validateGymProfile` must accept them or
  the whole profile is refused at boot (`index.html` 7488 sets `S.gymBad` and empties the bars) —
  that is the one regression path in this order and it has its own criterion (D4).
- **§3.6 44 px.** The Settings segment and the sheet's new row.
- **No P0 open.** B-01/02/03 closed under WO-001; WO-011 closed at `bbcdac3`; `main` is
  `c167e6f`, suite 842 / 842 / 0.
- **Related open rows.** B-117 (does the gym have 2.5 lb plates — still unanswered; the ladder is
  unchanged here, so still open). B-118 (`.unit` caption 10 px → 11 px "on the next set-row
  change") — this is that change; **folded in, W4**. B-114 (`+ 0 lb` drop phrase) — not this order.
  B-111 (`Swapped`) — not this order. B-113 (profile per device) — the override inherits it.
- **Filed by this order:** B-125 (the ask), B-126 (the kg-direct verdict under lb display, coach),
  B-127 (bodyweight in lb — Chady's word before anything).

---

## 1. Work order

### W1 · One coaching question — owner: `strength-coach`

**Scope.** Rule one sentence and confirm one constant. Write the ruling as §21 of
`docs/coach-audit-addendum.md`, in the register of §18.

**The question, exact.** For a **kg-direct working set** (no `ld` — his first session, every set
logged before WO-010) on a card whose display unit is **lb**, what does the verdict print? Today:
`Go to 79.5 kg next session.` on the 2.5 kg grid (L1: the grid is the set's build, and a kg-direct
set has none). Options: (a) `Go to 79.5 kg next session (175 lb).` — kg grid, lb in brackets as a
reading aid; (b) `Go to 175 lb next session.` — converted, on the 5 lb ladder; (c) something else.
The load he will physically build is lb plates on a kg bar, and the app does not know from a
kg-direct set whether there was a bar. **One recommendation.** The PM's, to refine not replace: (a),
because the grid is the set's and a kg-direct set laddered in lb would print a load its own history
cannot show was buildable; the brackets stop the calculator; and the moment he logs the next set
through a lb card the set carries `ld` and L1's lb form takes over on its own. If you rule (b), rule
which grid and what happens to G1's percentage step.

Also: **confirm or move the 0.5 lb display rounding** in `displayLoad` (§0.1). And whether the
converted figure in the ghost (`Last 170 lb × 5` from `w: 77`) needs any marker that it is a
conversion, or whether the row's `= 77 kg` total is that marker. The PM says the total is enough.

**Acceptance criteria.**
- §21 carries the verdict sentence for the kg-direct-on-lb case as a literal, with the grid named,
  and at least three worked examples (77 kg, 86 kg, 51 kg — his actual numbers).
- The 0.5 lb rounding is confirmed or replaced with one constant and one sentence of reason.
- States explicitly that a lb-built set's verdict (L1 form, `Go to 83.5 kg next session — 20 kg bar
  + 140 lb.`) is unchanged.

**Depends on:** —

### W2 · Settings segment, chip states, sheet row, the rendering rule — owner: `ux-designer`

**Scope.** Spec as `docs/specs/wo-004-screens.md` §21, states-and-copy register, control inventory
rows in §0.4.1. Bound by §0.1 above.

1. **Settings → Gym, *I lift in*:** a two-option segment, `lb` / `kg`, ≥ 44 px each, above the bars
   list; one line of copy under it saying what it does and does not do (it is where every exercise
   starts; an exercise's own chip overrides it; bodyweight stays kg). Changing it never touches an
   override — say so in the copy or not, your call, but the behaviour is fixed.
2. **The chip must show which level it is on.** Two states at minimum: the default (`Weight in lb
   (your default)` or similar) and an override (`Weight in kg (set for this exercise)` or similar).
   Whether the history tier (`loadModeFor`, no override) reads as its own state or as the default —
   rule it. Budget the string at the chip's width; `Weight in lb + Barbell 20 kg` already exists.
3. **The sheet gains one row: *Use my default*** (clears the override; applies the default's mode
   with the bar rule). Visible only when an override exists, or always with the current one
   checked — rule it. The D9 confirmation (typed numbers, unit switched) applies to it exactly as to
   any other switch.
4. **The row caption on an lb-default card with no bar**: `LB`? `lb`? Today's `ld` mode prints
   `lb` / `+ lb`; a kg-direct card prints `kg`. Rule the caption for each of the three (kg-direct,
   lb no bar, lb + bar) and raise it to **11 px** (B-118, every row).
5. **The rendering rule, one sentence,** for every surface in §0.1: what a kg-entered set looks like
   on a lb card (ghost, Summary line, remove-set body, sheet's *Last time:*, Trend delta) and what a
   lb-entered set looks like on a kg card (the reverse — a cable stack he moved back to kg with lb
   history). The `= 60.8 kg` row total stays regardless.
6. **`+` on an empty field with a converted ghost:** does it seed the converted figure (`170`) or the
   step (`5`)? WO-010 §4.4 seeds only on a matching unit. PM's recommendation: **seed what the ghost
   shows** — the ghost and the seed must agree or he types the ghost by hand, which is the ask. Rule
   it and write the live-region string.

**Out:** the verdict sentence (W1), bodyweight, Diet, anything per implement beyond the bar rule.

**Acceptance criteria.**
- Every new string in one table with case grammar (default / override / history / no profile bar
  on a `bb` slot / prefs unreadable).
- Control inventory rows for the segment, the sheet row, and each chip state.
- The rendering rule is one sentence QA can apply to any surface without asking.
- Measured: the longest chip string fits at 400 px without wrapping; the segment is ≥ 44 px and
  thumb-reachable on the Settings screen at 393 × 852.

**Depends on:** — (parallel with W1)

### W3 · `displayLoad`, `defaultMode`, `validateGymProfile`, the verdict's lb form — owner: `backend-engineer`

**Scope.** `logic.js` only. Pure, exported on `window.PHAT`.

- `displayLoad(w, unit) -> string` per §0.1 (kg path byte-identical to `kg()`/`r1`; lb path nearest
  0.5 lb or W1's constant). Never `0 lb`/`0 kg` — Z2 holds: route zero through `loadWord`.
- `defaultMode(prefs, ex) -> {au, bar?, bu?}`: reads `prefs.gym.unit` (absent → `"kg"`) and applies
  the bar rule (`ex.implement === "bb"` and `prefs.gym.bars[0]` → that bar). Never throws; garbage
  → `{au: "kg"}`.
- `cardModeFor({entry, prefs, ex, prev}) -> {au, bar?, bu?, tier}`: the precedence in §0.1 as one
  pure function returning the mode **and which tier chose it** (`"session" | "draft" | "typed" |
  "override" | "history" | "default"`) so the chip's state (W2 #2) is a fact of the engine, not the
  view. `index.html`'s `cardMode` becomes a thin caller.
- `validateGymProfile` accepts `unit` (`"kg" | "lb"`, optional) and `ex` (object of exId →
  `{au, bar?, bu?}`, each validated like a mode; optional). An unknown exId is **kept**, not refused
  (a plan he deleted must not brick the profile). A malformed override refuses **that key only**,
  named, and the profile still loads — the profile must never be refused whole for one bad
  override (D4).
- The verdict: W1's literal for the kg-direct-on-lb case, threaded as a `unit` on the ctx every
  verdict site already receives (P1 up/hold/drop, H1, tooHeavy, SP1). With `unit` absent or `"kg"`,
  every string is byte-identical to today (D6).
- `LIMITS`, `LB_KG`, the ladder: untouched. No schema bump: `prefs` carries no version and the log
  does not change shape.

**Acceptance criteria.**
- `displayLoad(77, "lb") === "170 lb"`, `displayLoad(51, "lb") === "112.5 lb"`, `displayLoad(60.8,
  "kg") === "60.8 kg"` (or W1's constant, with the test moved).
- `cardModeFor` returns `tier: "override"` for `prefs.gym.ex.d3c = {au: "kg"}` with no draft;
  `"default"` for a card with nothing; `"history"` when only a WO-010 `ld` exists.
- `validateGymProfile({bars: [...], unit: "lb", ex: {d3c: {au: "kg"}}}).ok === true`;
  `{unit: "pounds"}` refused on `unit` by name; `{ex: {d3c: {au: "stone"}}}` refuses `ex.d3c` and
  `ok` is still true for the bars — the return shape says which keys to drop.
- Every existing test green; the suite count moves only by additions.

**Depends on:** W1 (the verdict literal). `displayLoad`/`defaultMode`/`cardModeFor`/validation can
start before W1 lands.

### W4 · Settings segment, chip, sheet, every surface — owner: `frontend-engineer`

**Scope.** `index.html`. Build W2 on W3.

- Settings → Gym: the segment writes `prefs.gym.unit` through `gymSave`'s path (`save(PREFS,
  prefsPayload())`, revert on failure as `gymSave` does today).
- The chip's sheet: applying a choice writes `entry.mode` **and** `prefs.gym.ex[id]` in the same
  handler; *Use my default* deletes `prefs.gym.ex[id]` and applies `defaultMode`. The `prefs` write
  is a `save()` with its own failure path — a failed prefs write never blocks the draft write, and
  the chip still reflects the session's choice (the draft is the source of truth mid-workout).
- `cardMode` → `PHAT.cardModeFor`; the chip's text from the returned tier per W2.
- Every surface in §0.1 through `PHAT.displayLoad(w, mode.au)`: `ghostText`, the stepper
  aria-labels, the `+` seed and live region (W2 #6), `removeSetAsk`'s body, the sheet's *Last
  time:*, `sumBody`'s per-set line, `liftRow`'s delta and endpoints. The `= 60.8 kg` total stays.
- `.unit` caption 11 px, every row (B-118).
- Boot: a profile with a refused override key drops that key, keeps the rest, logs one
  `console.warn`, never sets `S.gymBad` for it.

**Out:** any engine, any string not in W1/W2, bodyweight, Diet.

**Acceptance criteria.**
- D1–D8 below.
- At 400 px the row's height and steppers' x-positions are unchanged between kg-direct, lb no-bar
  and lb + bar (WO-010 W6's measurement, re-run).
- A kg-default device with no overrides renders the **same DOM as `main`** for the Session card, the
  Summary and Trend — diffed.
- Zero controls under 44 × 44 on Settings and in the sheet; every new control named.

**Depends on:** W2, W3.

### W5 · QA — owner: `qa-engineer`

**Scope.** `tests.html`: pin W3's functions; D1–D8 as tests where a browser can run them and as
observed items where only a phone can; the byte-identity diffs; the surface checklist. Run the
whole suite; fold any stale count.

**Acceptance criteria.**
- Every D criterion has a test or a cited observation.
- A checklist item per surface in §0.1, each ticked with the string observed on a lb-default
  device against his real session (`1789264514484`).
- Suite green; the tripwire in the backlog updated with the new count.

**Depends on:** W4.

### W6 · Release — owner: `release-engineer`

**Scope.** Merge `wo-012-default-unit` to `main` (`--no-ff`), deploy all files, byte-verify on
production, `sw.js` VERSION per its header rule (file list unchanged → no bump unless the header
rule says otherwise; record which). Remind Chady of the one-time page-close (B-122).

**Acceptance criteria.**
- Production `/logic.js` 200 `application/javascript` and carries `displayLoad`; `/index.html`
  carries the segment.
- `docs/deploy.md` run log entry.

**Depends on:** W5 pass.

---

## 2. Sequence

```
W1 coach  ─┐
           ├─→ W3 backend ─→ W4 frontend ─→ W5 QA ─→ W6 release
W2 ux     ─┘
```

W1 ∥ W2 today. W3 may start on `displayLoad`/`defaultMode`/`cardModeFor`/validation immediately and
takes W1's literal last. W4 needs W2's strings and W3's exports. W5 last, W6 on a pass. Main session
sets the branch `wo-012-default-unit` before the first dispatch (B-107's rule); nobody checks out.

## 3. Risks

- **The one regression path: `validateGymProfile`.** Today a refused profile empties the bars and
  sets `S.gymBad`. If the new keys are refused by an old validator — or a malformed override refuses
  the whole object — every card loses its bar list at boot. D4 is the guard. Nothing in
  `phat:v1:log` is at risk: no schema change, no migration, `w`/`ld` untouched.
- **A converted number seeded into `add`** (W2 #6) is a new number he did not type; `w` recomputes
  from it (77 → 170 lb → 77.1 kg). That is a new set, not an edit of the old — but it is why the seed
  is a UX ruling and why D2 says the *stored* prior is never touched.
- **The default bar on `bb`** stores a bar he did not confirm if he never looks at the chip. The chip
  is on every card and the row caption reads `+ lb`; if he wants "no bar ever by default", it is one
  branch. Flagged, not hedged.
- **Diana's phone** is a kg-default device with no overrides: byte-identical by D6. The setting is
  per device, so nothing crosses accounts.
- **`prefs` writes from the sheet during a workout** add one `save()` per chip tap. The draft write
  stays first and independent.

## 4. Data criteria, house style

- **D1 · His session is untouched.** Load the fixture holding `1789264514484`; set `prefs.gym.unit =
  "lb"`; open Train, Session, Summary, Trend. `JSON.stringify(phat:v1:log)` is byte-identical before
  and after; no set gains `ld`; the ghost on d1a reads ~~`Last 170 lb × 5`-style~~ **`Last 125.5 lb × 5`-style**
  (W1's rounding) with `w: 77` unchanged on disk.
  **Corrected by UX at W2 (§21):** `170 lb` is the *total* of a 77 kg set; under §0.1's bar rule d1a on a
  lb device opens with the 20 kg bar on it and the weight column is the *added* weight, so a seed of 170
  into that field stores 20 + 77.1 = 97.1 kg for a lift that was 77 — the silent-wrong-number class this
  order ranks first, produced by its own example. **Rule:** a number in the weight column is always in the
  column's terms — the added weight, in the card's unit. Observed by QA on his session: d1a reads
  `Last 44 lb total × 12` / `Last 44 lb × 12` / `Last 68.5 lb × 15` (the third set is 51 kg − 20 kg bar).
- **D2 · Display never writes.** Switching the default lb ↔ kg, and flipping any chip, with no set
  typed: `phat:v1:log`, `bw`, `draft`, `plans` byte-identical; only `phat:v1:prefs` changes.
- **D3 · The override is stored on the tap, not the log.** Flip d3c to kg via the chip, log nothing,
  close the session (discard the draft), reload: d3c opens in kg (`tier: "override"`) while every
  other card opens in lb (`tier: "default"`). Change the default to kg in Settings: d3c is
  unaffected; a never-touched card now opens in kg. *Use my default* on d3c: it follows the default
  from then on and `prefs.gym.ex.d3c` is gone.
- **D4 · A bad override never bricks the profile.** Hand-edit `prefs.gym.ex.d3c = {au: "stone"}`
  and reload: the bars list is intact, Settings shows *I lift in* correctly, d3c opens on the default,
  one `console.warn` names `ex.d3c`, and saving any Settings change drops the bad key and keeps the
  rest.
- **D5 · The draft survives a reload with the override in force.** Default lb, override d3c kg, type
  `60` on d3c set 1 and `135` on d1a set 1 (bar 20 kg), reload: the draft is offered back with d3c
  showing `60` in kg and d1a showing `135 lb` on the 20 kg bar, `= 81.2 kg`; declining discards it;
  `phat:v1:draft` is byte-identical across the reload.
- **D6 · kg default is today.** With `prefs.gym.unit` absent and no `ex`: the Session card, Summary
  and Trend DOM are identical to `main @ c167e6f` for the fixture session; every verdict string
  identical; `prefsPayload()` output identical.
- **D7 · A failed prefs write does not lose the choice for the workout.** Make `save(PREFS)` fail
  (quota stub); flip a chip; the card is in the chosen mode, the set logs in it, the session saves
  with the right `ld`; the override is simply not persisted and the app says so once.
- **D8 · The setting persists.** Set lb, kill the app, reopen: Settings reads lb and a fresh card
  opens in lb. Restore from backup and merge-on-open leave `prefs.gym.unit` as it was (prefs are not
  in the backup — B-113 — so nothing can overwrite it).

## 5. Needs from Chady

1. **Bodyweight in lb too?** The Weight screen and the diet rule (+0.2–0.3 kg/wk) stay kg under this
   order. If he weighs in lb, B-127 becomes an order of its own: the scale reading in lb, the rule's
   thresholds converted, the coach on the copy. One word.
2. **The default bar on barbell slots** (§0.1): his 20 kg barbell as the starting bar on every `bb`
   card in lb, or no bar ever until he picks one. Ruled *first profile bar on `bb`*; overturn with
   one sentence.
3. **B-117 is still open**: does the gym have 2.5 lb plates? The ladder shipped on `[Likely]` yes.
   Unchanged by this order, still one constant if wrong.

## 6. Backlog items filed by this order

B-125 (the ask: default + override + display), B-126 (the kg-direct verdict under lb display —
coach), B-127 (bodyweight in lb — Chady's word), B-118 folded in (W4).

## 7. Dispatch list (for the main session)

Branch first: `git checkout -b wo-012-default-unit` from `main @ c167e6f`, by the main session,
before any dispatch. Agents commit named paths only.

1. **`strength-coach` → W1.** Brief: read WO-012 §0.1 and W1, `docs/coach-audit-addendum.md` §18.
   Rule one sentence: the verdict for a kg-direct working set on a lb-display card — PM recommends
   `Go to 79.5 kg next session (175 lb).` on the kg grid; three worked examples at 77 / 86 / 51 kg;
   confirm or move 0.5 lb display rounding; state the L1 lb-build form is unchanged. Write §21 of
   the addendum. Commit `docs/coach-audit-addendum.md` only.
2. **`ux-designer` → W2** (parallel with 1). Brief: read WO-012 §0.1 and W2, `wo-004-screens.md`
   §10.6 and §19. Spec §21: the Settings *I lift in* segment (≥ 44 px), the chip's default / override
   states and words, the sheet's *Use my default* row, the row caption per mode at 11 px, the
   one-sentence rendering rule for a kg set on a lb card and the reverse, and the `+`-seed rule.
   Commit `docs/specs/wo-004-screens.md` only.
3. **`backend-engineer` → W3** (after 1; may start the non-verdict parts at once). Brief: read
   WO-012 §0.1 and W3, `logic.js` 120–160, 321–500 (`composeLoad`, `loadModeFor`,
   `validateGymProfile`), 4568–4660 (`loadWord`, `incrementLine`), the verdict sites at 5181–5263.
   Add `displayLoad`, `defaultMode`, `cardModeFor` (with `tier`), extend `validateGymProfile` with
   `unit` and `ex` (per-key refusal, never whole), thread `unit` into the verdict per §21. kg path
   byte-identical. Commit `logic.js` and its tests only.
4. **`frontend-engineer` → W4** (after 2 and 3). Brief: read WO-012 §0.1 and W4, spec §21,
   `index.html` `cardMode` (2376), `chipText` (2396), `ghostText` (~2320), `openLoadSheet` (5500),
   `removeSetAsk` (5455), `vGym` (2146), `sumBody` (~2770), `liftRow` (3010), boot at 7488. Wire
   the segment, the chip tiers, the sheet row writing `prefs.gym.ex` on tap, every surface through
   `PHAT.displayLoad`, caption 11 px. Commit `index.html` only.
5. **`qa-engineer` → W5** (after 4). Brief: WO-012 §4 D1–D8 as tests or cited observations; the
   `main` DOM diff for a kg-default device; the per-surface checklist against session
   `1789264514484` with `unit: "lb"`; suite green; update the tripwire. Commit `tests.html` and
   `docs/backlog.md` (tripwire line) only.
6. **`release-engineer` → W6** (after 5 passes). Brief: merge `--no-ff`, deploy all files,
   byte-verify, `sw.js` per header rule, `docs/deploy.md` run log, remind Chady of the one-time
   page close.
7. **`project-manager`** closes: statuses on B-125/B-126/B-118, decision recorded, §8 closure record.

---

## 8. Closure record — 2026-09-13

**Closed on `main @ 4b144a0`** (merge of `wo-012-default-unit`, `--no-ff`). Deployed by the main session: **60 files
byte-verified** on production; `/logic.js` 200 `application/javascript`, byte-identical to `git cat-file blob
4b144a0:logic.js`, carries `displayLoad`, `cardModeFor`, `LOAD_EQ`; `/index.html` carries *I lift in* and *Use my
default*. Live `sw.js` **`v6`, not bumped**: the file list is unchanged and no cached entry must be discarded. This is
the **first same-list deploy that relies on v6's refresh** (WO-011 P1) to carry the shell to his phone — whether the
next launch shows *I lift in* is the phone-only check; if it does not after one page close, the v6 rule is wrong and
that is a P1, not a reason to bump. Suite **905 / 905 / 0** at `4b144a0`.

### What shipped

| Item | Commit | Note |
|---|---|---|
| W1 coach §21 | `811ad29` | **Rule U1**: the lb reading in brackets on the *load token* (`Go to 79.5 kg (175.5 lb) next session.`), `displayLoad` of the same number — the PM's `(175 lb)` corrected to `(175.5 lb)`; report tokens stay kg; L1's lb-built form unchanged; 0.5 lb confirmed, ties down; no ghost marker. `speedFlagText` added to the site list. **Flagged, not fixed:** `d1b` 86 kg and `d1d` 81 kg do not read as the slot's load (§21.7 #2–#3) → B-131 |
| W2 UX §21 | `7486fa7` | The segment, the two-line chip, *Use my default*, the caption at 11 px, the rendering rule (a number in the weight column is always in the column's terms), the seed rule. **Found the order's D1 literal wrong** (`170 lb` is a total; a bar card ghosts `125.5 lb`). **Found `gymWrite` wiping the unit** on every bar save. **Disagreed with §0.1's precedence** — adopted |
| W3 engine | `d70438a` | `displayLoad` at 0.5 lb, `defaultMode` / `overrideMode` / `cardModeFor` with tiers, `validateGymProfile` per-key refusal, U1 in the verdicts, `priorInUnit`; S45; 865 / 865 / 0 |
| Coach §21.13 | `e94ac74` | **Rule EQ1** (`LOAD_EQ` 0.25 kg — the 0.1 kg drift of a converted seed reached H1.4d's `Volume down 0%` and T1's `1e-9`), **H1.4d on the printed percentage**, **Rule SD1** (the converted seed lands on the grid) |
| W3b engine | `fd24342` | `LOAD_EQ` at exactly four sites, `seedFor`, H1.4d on `p`; S46; 897 / 897 / 0. 284 spurious `0%` verdicts in 3,200 → 0; 580,608 kg-direct verdicts byte-identical |
| W4 frontend | `34f0a68` | The segment; the chip's two lines; override written on the tap; *Use my default*; **`gymWrite` fixed** (spreads the profile, `gymKeep`); every surface through `displayLoad`; caption 11 px (B-118) |
| W4b frontend | `1262e6a` | QA's three: `kg` pressed while the unit is absent (`gymShown`); `Last bar only × N` for a prior at the empty bar (view rule, pending UX's word — B-129); `.ghost min-width: 0` at 200 %; the chip's height reserved at 200 % |
| W5 QA | `3bbd90c` | **Pass.** S47; D1–D8 observed on his session `1789264514484` on a Playwright rig at 400 × 850 with CDN and Supabase blocked; the D6 DOM diff against `main @ 81fc0b8` byte-identical with `unit` absent; six attacks; nine mutants killed. Found: the two-tab stale `prefs` write (B-128), the unpressed segment and the 200 % overflow (both fixed in `1262e6a`), `44 lb total` illegible (B-129), `chipLevel` extraction asked (B-20). 905 / 905 / 0 |
| W6 release | `4b144a0` | Merge, upload, verification by the main session. No `docs/deploy.md` run-log entry: that file has no run-log section and no order has written one; the record is this section |

### Acceptance, by criterion

D1 observed (with the corrected literal); D2 observed (a chip tap writes `prefs` and `entry.mode`; no number in the
draft moves); D3 observed exactly (the override on the tap with nothing logged, across discard + reload; *Use my
default* removes the key and the empty map); D4 observed (`{au: "stone"}` dropped by name, bars and the good override
intact, no boot write); D5 observed (draft numbers and both `ld` byte-identical across a reload; only `savedAt` moves,
by the `pagehide` flush); D6 observed (`#excard .sets`, `#ldchip`, `#slot-verdict`, Summary, Trend, `phat:v1:prefs`
byte-identical to `main @ 81fc0b8`); D7 observed (prefs write stubbed to throw — one toast, the card holds the
choice, the session saves with the right `ld`); D8 observed (lb survives a context kill; prefs outside the backup and
the merge, pinned pure). W4's 44 px and the row-geometry re-run: pass. W3's kg path byte-identical: the 580,608
differential.

### Rulings that moved during the chain

1. **Precedence** — history yields to a chosen default (§0.1 amendment; decisions 2026-09-13).
2. **The D1 literal** — `Last 125.5 lb × 5` on a bar card (§4 D1 correction).
3. **`(175 lb)` → `(175.5 lb)`** — the bracket is `displayLoad` of the same number, ties down.
4. **Two coaching rules the order did not ask for** — EQ1 and SD1 — because the seed the order asked for stores
   ±0.1 kg and the engines compared at 0.01.

### Filed by the close

B-128 (two-tab `prefs` wipe, B-76's class, P3 with the cluster) · B-129 (`Last bar only`, UX's word, P3) · B-130
(coach prose `79.0` is `79` on screen, docs) · **B-131 (his `d1b` 86 kg and `d1d` 81 kg — the slot reads them as
something else; his one sentence, then B-05)** · `chipLevel` on B-20's list.

### Still Chady's

B-131 (what were 86 and 81) · B-127 (bodyweight in lb — which scale) · B-117 (2.5 lb plates; the 20 kg bar) ·
B-111 (`Swapped`) · B-116 (warm-ups — the PM's first question, still) · the phone: does the next launch show
*I lift in* (v6, same-list deploy). Logged sessions: one, in kg, by hand. The next session through a lb card retires
§21 slot by slot.
